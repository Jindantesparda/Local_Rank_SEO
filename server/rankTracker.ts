import { Business } from '../src/types';
import {
  fetchKeywordPosition,
  fetchKeywordPositions,
  isSearchConsoleConfigured,
  KeywordPosition,
} from './searchConsole';
import { getConnection, recordFetch } from './searchConsoleStore';
import {
  getRankingRecord,
  recordSnapshot,
  RankSnapshot,
  TrackedKeyword,
} from './rankStore';

/**
 * Keyword rank tracking.
 *
 * Positions come from **Google Search Console**, which reports the average
 * position Google actually ranked the site at. Earlier versions used the
 * Custom Search JSON API, which is closed to new customers and discontinued on
 * 1 January 2027, and which cannot be used for whole-web search by a new
 * project at all.
 *
 * Consequences worth being explicit about, because they change what a position
 * means here:
 *   - it is an AVERAGE over a window, not a point-in-time SERP rank
 *   - only queries the site already received impressions for are available
 *   - data lags by roughly 2-3 days
 *   - it is the client's OWN site — competitors cannot come from Search Console
 *
 * Honesty rules, unchanged from before:
 *   - a failed lookup stores an `error` snapshot, never a fake position
 *   - "no impressions for this query" is a distinct outcome from "ranked badly"
 *   - a drop is only reported when there are two real positions to compare
 */

/** Search Console reporting window, in days. */
const WINDOW_DAYS = 28;

export interface RankCheckResult {
  keyword: string;
  position: number | null;
  clicks: number;
  impressions: number;
  error?: string;
}

/** Is rank tracking usable for this business right now? */
export async function rankSourceStatus(
  userId: string,
  businessId: string
): Promise<{
  configured: boolean;
  connected: boolean;
  siteUrl: string | null;
}> {
  const connection = await getConnection(userId, businessId);
  return {
    configured: isSearchConsoleConfigured(),
    connected: connection !== null,
    siteUrl: connection?.siteUrl ?? null,
  };
}

export async function checkKeyword(
  userId: string,
  businessId: string,
  keyword: string
): Promise<RankCheckResult> {
  const connection = await getConnection(userId, businessId);
  if (!connection) {
    return {
      keyword,
      position: null,
      clicks: 0,
      impressions: 0,
      error: 'Search Console is not connected for this business.',
    };
  }

  try {
    const result = await fetchKeywordPosition(connection.siteUrl, keyword, WINDOW_DAYS);
    if (!result) {
      return {
        keyword,
        position: null,
        clicks: 0,
        impressions: 0,
        error: `No Search Console impressions for this query in the last ${WINDOW_DAYS} days, so Google has no position to report yet.`,
      };
    }
    return {
      keyword,
      position: result.position,
      clicks: result.clicks,
      impressions: result.impressions,
    };
  } catch (err) {
    return {
      keyword,
      position: null,
      clicks: 0,
      impressions: 0,
      error: err instanceof Error ? err.message : 'Rank check failed.',
    };
  }
}

export interface RankMovement {
  keyword: string;
  previous: number | null;
  current: number | null;
  /** Positive numbers mean the position got worse (dropped down the page). */
  change: number | null;
  dropped: boolean;
  /** True when the site left the tracked results entirely. */
  fellOut: boolean;
}

function lastRealPosition(history: RankSnapshot[]): number | null | undefined {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const snap = history[i];
    if (!snap.error) return snap.position;
  }
  return undefined;
}

/** Compare the two most recent successful snapshots for a keyword. */
export function detectMovement(keyword: TrackedKeyword): RankMovement | null {
  const real = keyword.history.filter((s) => !s.error);
  if (real.length < 2) return null;

  const previous = real[real.length - 2].position;
  const current = real[real.length - 1].position;

  if (previous === current) {
    return { keyword: keyword.keyword, previous, current, change: 0, dropped: false, fellOut: false };
  }

  // Left the results entirely.
  if (previous !== null && current === null) {
    return {
      keyword: keyword.keyword,
      previous,
      current,
      change: null,
      dropped: true,
      fellOut: true,
    };
  }

  // Entered the results — an improvement, not a drop.
  if (previous === null && current !== null) {
    return {
      keyword: keyword.keyword,
      previous,
      current,
      change: null,
      dropped: false,
      fellOut: false,
    };
  }

  if (previous === null || current === null) return null;

  // Rounded to one decimal: these are Search Console averages, and float
  // subtraction otherwise surfaces as 5.499999999999999 in the UI.
  const change = Math.round((current - previous) * 10) / 10;
  // Only call it a drop when it moved down by 3 or more places. Search Console
  // positions are averages, so small movement is noise.
  return {
    keyword: keyword.keyword,
    previous,
    current,
    change,
    dropped: change >= 3,
    fellOut: false,
  };
}

/**
 * Re-check every tracked keyword for one business, storing a snapshot each time.
 *
 * One API call covers all keywords (Search Console OR-s the filters), so this
 * does not scale linearly with the number of tracked keywords.
 */
export async function refreshTrackedKeywords(
  userId: string,
  business: Business
): Promise<{ checked: number; alerts: RankMovement[]; errors: number }> {
  const record = await getRankingRecord(userId, business.id);
  if (record.keywords.length === 0) return { checked: 0, alerts: [], errors: 0 };

  const connection = await getConnection(userId, business.id);
  if (!connection) {
    return { checked: 0, alerts: [], errors: 0 };
  }

  const keywords = record.keywords.map((k) => k.keyword);
  const previousByKeyword = new Map(keywords.map((k) => [k.toLowerCase(), record.keywords.find(
    (kw) => kw.keyword.toLowerCase() === k.toLowerCase()
  )]));

  let positions: Map<string, KeywordPosition>;
  try {
    positions = await fetchKeywordPositions(connection.siteUrl, keywords, WINDOW_DAYS);
    await recordFetch(userId, business.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Rank check failed.';
    await recordFetch(userId, business.id, message);

    // Record the failure against every keyword so the gap is explainable and
    // the history shows a reason rather than a phantom drop.
    for (const keyword of keywords) {
      await recordSnapshot(userId, business.id, keyword, {
        checkedAt: new Date().toISOString(),
        position: null,
        resultsCount: 0,
        error: message,
      });
    }
    return { checked: keywords.length, alerts: [], errors: keywords.length };
  }

  const alerts: RankMovement[] = [];
  let errors = 0;

  for (const keyword of keywords) {
    const result = positions.get(keyword.toLowerCase());

    if (!result) {
      errors += 1;
      await recordSnapshot(userId, business.id, keyword, {
        checkedAt: new Date().toISOString(),
        position: null,
        resultsCount: 0,
        error: `No Search Console impressions for this query in the last ${WINDOW_DAYS} days.`,
      });
      continue;
    }

    const previousHistory = previousByKeyword.get(keyword.toLowerCase())?.history || [];
    const previousPosition = lastRealPosition(previousHistory);

    await recordSnapshot(userId, business.id, keyword, {
      checkedAt: new Date().toISOString(),
      position: Math.round(result.position * 10) / 10,
      resultsCount: result.impressions,
      clicks: result.clicks,
      impressions: result.impressions,
      source: 'search-console',
    });

    if (previousPosition === undefined) continue;

    if (previousPosition !== null && result.position - previousPosition >= 3) {
      alerts.push({
        keyword,
        previous: previousPosition,
        current: Math.round(result.position * 10) / 10,
        change: Math.round((result.position - previousPosition) * 10) / 10,
        dropped: true,
        fellOut: false,
      });
    }
  }

  return { checked: keywords.length, alerts, errors };
}

/** Compact trend for the UI: oldest → newest, gaps removed. */
export function positionTrend(keyword: TrackedKeyword, limit = 12): number[] {
  return keyword.history
    .filter((s) => !s.error && s.position !== null)
    .slice(-limit)
    .map((s) => s.position as number);
}
