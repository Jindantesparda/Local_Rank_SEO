import { Business } from '../src/types';
import { fetchSerp, serpConfigured, toDomain } from './competitors';
import {
  getRankingRecord,
  recordSnapshot,
  RankSnapshot,
  TrackedKeyword,
} from './rankStore';

/**
 * Keyword rank tracking.
 *
 * The search API returns the results for a query; we record where the client's
 * domain appears. Snapshots accumulate so movement can be compared over time —
 * which is what makes a rank-drop alert possible at all.
 *
 * Honesty rules baked in here:
 *   - a failed check stores an `error` snapshot, never a fake position
 *   - not appearing in the results is stored as `position: null` and is
 *     reported as "not in the top 10", not as a drop to last place
 *   - a drop is only reported when we have two real positions to compare
 */

export interface RankCheckResult {
  keyword: string;
  position: number | null;
  resultsCount: number;
  error?: string;
}

export async function checkKeyword(
  business: Business,
  keyword: string
): Promise<RankCheckResult> {
  if (!serpConfigured()) {
    return {
      keyword,
      position: null,
      resultsCount: 0,
      error: 'Search API is not configured on this server.',
    };
  }

  try {
    const serp = await fetchSerp(keyword, toDomain(business.website));
    return {
      keyword,
      position: serp.yourPosition,
      resultsCount: serp.results.length,
    };
  } catch (err) {
    return {
      keyword,
      position: null,
      resultsCount: 0,
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

  const change = current - previous;
  // Only call it a drop when it moved down by 3 or more places; small
  // day-to-day jitter is normal and not worth an email.
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
 * Returns the movements that are worth telling the user about.
 */
export async function refreshTrackedKeywords(
  userId: string,
  business: Business
): Promise<{ checked: number; alerts: RankMovement[]; errors: number }> {
  const record = getRankingRecord(userId, business.id);
  if (record.keywords.length === 0) return { checked: 0, alerts: [], errors: 0 };

  const alerts: RankMovement[] = [];
  let checked = 0;
  let errors = 0;

  for (const tracked of record.keywords) {
    const result = await checkKeyword(business, tracked.keyword);
    checked += 1;
    if (result.error) errors += 1;

    // Snapshot the state *before* writing, so we can compare after.
    const previousHistory = tracked.history;

    recordSnapshot(userId, business.id, tracked.keyword, {
      checkedAt: new Date().toISOString(),
      position: result.position,
      resultsCount: result.resultsCount,
      error: result.error,
    });

    // Decide whether this particular check is alert-worthy.
    const previousPosition = lastRealPosition(previousHistory);
    if (!result.error && previousPosition !== undefined) {
      if (previousPosition !== null && result.position === null) {
        alerts.push({
          keyword: tracked.keyword,
          previous: previousPosition,
          current: null,
          change: null,
          dropped: true,
          fellOut: true,
        });
      } else if (
        previousPosition !== null &&
        result.position !== null &&
        result.position - previousPosition >= 3
      ) {
        alerts.push({
          keyword: tracked.keyword,
          previous: previousPosition,
          current: result.position,
          change: result.position - previousPosition,
          dropped: true,
          fellOut: false,
        });
      }
    }

    // One query at a time, so we never burst through the daily quota.
    await new Promise((r) => setTimeout(r, 600));
  }

  return { checked, alerts, errors };
}

/** Compact trend for the UI: oldest → newest, gaps removed. */
export function positionTrend(keyword: TrackedKeyword, limit = 12): number[] {
  return keyword.history
    .filter((s) => !s.error && s.position !== null)
    .slice(-limit)
    .map((s) => s.position as number);
}
