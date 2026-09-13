import { docDeleteByUser, docDelete, docGet, docPut, tx } from './db';

/**
 * Tracked keywords and their recorded positions.
 *
 * Positions are only ever real results returned by the search API. If a check
 * cannot run (no credentials, quota gone, site not found in the top results)
 * that is recorded as `position: null` with a reason — never silently treated
 * as a drop.
 *
 * Every mutation runs inside a transaction, so a keyword refresh that awaits a
 * network call between reading and writing cannot lose a concurrent update.
 */

const NS = 'rankings' as const;

/** How many snapshots to keep per keyword (one per scheduled check). */
const MAX_HISTORY = 60;

export interface RankSnapshot {
  checkedAt: string;
  /**
   * Search Console reports an average position over the window, so this can be
   * fractional (e.g. 4.3). Null means no position was available.
   */
  position: number | null;
  /**
   * Impressions for the query in the reporting window. Kept in the field the
   * old SERP provider used for result count, so stored history stays readable.
   */
  resultsCount: number;
  /** Clicks from Search Console, when the source provides them. */
  clicks?: number;
  /** Impressions from Search Console, when the source provides them. */
  impressions?: number;
  /** Which data source produced this snapshot. */
  source?: 'search-console';
  /** Set when the check itself failed, so the gap is explainable. */
  error?: string;
}

export interface TrackedKeyword {
  keyword: string;
  createdAt: string;
  lastCheckedAt?: string;
  history: RankSnapshot[];
}

export interface RankingRecord {
  keywords: TrackedKeyword[];
  updatedAt: string;
}

/** Max tracked keywords per business — keeps the daily query count sane. */
export const MAX_TRACKED_KEYWORDS = 5;

function key(userId: string, businessId: string): string {
  return `${userId}::${businessId}`;
}

export function normaliseKeyword(keyword: string): string {
  return keyword.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function getRankingRecord(userId: string, businessId: string): RankingRecord {
  return docGet<RankingRecord>(NS, key(userId, businessId)) || { keywords: [], updatedAt: '' };
}

function save(userId: string, businessId: string, record: RankingRecord) {
  record.updatedAt = new Date().toISOString();
  docPut(NS, key(userId, businessId), userId, record);
}

export function trackKeyword(
  userId: string,
  businessId: string,
  keyword: string
): { ok: boolean; error?: string } {
  return tx(() => {
    const record = getRankingRecord(userId, businessId);
    const clean = keyword.trim().replace(/\s+/g, ' ');

    if (!clean) return { ok: false, error: 'Keyword cannot be empty.' };
    if (clean.length > 120) return { ok: false, error: 'That keyword is too long.' };

    const exists = record.keywords.some(
      (kw) => normaliseKeyword(kw.keyword) === normaliseKeyword(clean)
    );
    if (exists) return { ok: false, error: 'That keyword is already being tracked.' };
    if (record.keywords.length >= MAX_TRACKED_KEYWORDS) {
      return {
        ok: false,
        error: `You can track up to ${MAX_TRACKED_KEYWORDS} keywords per business. Remove one first.`,
      };
    }

    record.keywords.push({ keyword: clean, createdAt: new Date().toISOString(), history: [] });
    save(userId, businessId, record);
    return { ok: true };
  });
}

export function untrackKeyword(userId: string, businessId: string, keyword: string): boolean {
  return tx(() => {
    const record = getRankingRecord(userId, businessId);
    const before = record.keywords.length;
    record.keywords = record.keywords.filter(
      (kw) => normaliseKeyword(kw.keyword) !== normaliseKeyword(keyword)
    );
    if (record.keywords.length === before) return false;

    save(userId, businessId, record);
    return true;
  });
}

/** Append a snapshot to a keyword's history, trimming the oldest entries. */
export function recordSnapshot(
  userId: string,
  businessId: string,
  keyword: string,
  snapshot: RankSnapshot
) {
  tx(() => {
    const record = getRankingRecord(userId, businessId);
    const target = record.keywords.find(
      (kw) => normaliseKeyword(kw.keyword) === normaliseKeyword(keyword)
    );
    if (!target) return;

    target.history = [...target.history, snapshot].slice(-MAX_HISTORY);
    target.lastCheckedAt = snapshot.checkedAt;
    save(userId, businessId, record);
  });
}

export function removeRankingData(userId: string) {
  docDeleteByUser(userId);
}

export function removeKeywordRecord(userId: string, businessId: string) {
  docDelete(NS, key(userId, businessId));
}
