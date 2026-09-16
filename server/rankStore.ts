import { docDelete, docDeleteByUser, docGet, docPut, tx } from './db';

/**
 * Tracked keywords and their recorded positions.
 *
 * Positions are only ever real figures from the data source. If a check cannot
 * run (no credentials, no impressions for the query, quota gone) that is
 * recorded with a reason — never silently treated as a drop.
 *
 * Mutations run inside a transaction, and transaction callbacks await because
 * the storage layer is asynchronous now that the database is hosted.
 * Transactions are ambient: a nested call joins the outer transaction rather
 * than opening a second one, which libSQL does not allow.
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

/** Max tracked keywords per business — keeps the query count sane. */
export const MAX_TRACKED_KEYWORDS = 5;

function key(userId: string, businessId: string): string {
  return `${userId}::${businessId}`;
}

export function normaliseKeyword(keyword: string): string {
  return keyword.trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function getRankingRecord(
  userId: string,
  businessId: string
): Promise<RankingRecord> {
  return (
    (await docGet<RankingRecord>(NS, key(userId, businessId))) || { keywords: [], updatedAt: '' }
  );
}

async function save(userId: string, businessId: string, record: RankingRecord): Promise<void> {
  record.updatedAt = new Date().toISOString();
  await docPut(NS, key(userId, businessId), userId, record);
}

export async function trackKeyword(
  userId: string,
  businessId: string,
  keyword: string
): Promise<{ ok: boolean; error?: string }> {
  return await tx(async () => {
    const record = await getRankingRecord(userId, businessId);
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
    await save(userId, businessId, record);
    return { ok: true };
  });
}

export async function untrackKeyword(
  userId: string,
  businessId: string,
  keyword: string
): Promise<boolean> {
  return await tx(async () => {
    const record = await getRankingRecord(userId, businessId);
    const before = record.keywords.length;
    record.keywords = record.keywords.filter(
      (kw) => normaliseKeyword(kw.keyword) !== normaliseKeyword(keyword)
    );
    if (record.keywords.length === before) return false;

    await save(userId, businessId, record);
    return true;
  });
}

/** Append a snapshot to a keyword's history, trimming the oldest entries. */
export async function recordSnapshot(
  userId: string,
  businessId: string,
  keyword: string,
  snapshot: RankSnapshot
): Promise<void> {
  await tx(async () => {
    const record = await getRankingRecord(userId, businessId);
    const target = record.keywords.find(
      (kw) => normaliseKeyword(kw.keyword) === normaliseKeyword(keyword)
    );
    if (!target) return;

    target.history = [...target.history, snapshot].slice(-MAX_HISTORY);
    target.lastCheckedAt = snapshot.checkedAt;
    await save(userId, businessId, record);
  });
}

export async function removeRankingData(userId: string): Promise<void> {
  await docDeleteByUser(userId);
}

export async function removeKeywordRecord(userId: string, businessId: string): Promise<boolean> {
  return await docDelete(NS, key(userId, businessId));
}
