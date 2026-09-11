import { AnalyticsSummary } from './ga4';
import { docDeleteByUser, docDelete, docGet, docPut } from './db';

/**
 * Per-business analytics connection.
 *
 * Only the property ID is stored — the Google credential itself lives in the
 * server environment, never in the database and never from a user.
 */

const NS = 'analytics' as const;

export interface AnalyticsRecord {
  propertyId: string;
  connectedAt: string;
  lastFetchedAt?: string;
  lastError?: string;
  /** Last successful summary, cached so the UI has something to show. */
  lastSummary?: AnalyticsSummary;
}

function key(userId: string, businessId: string): string {
  return `${userId}::${businessId}`;
}

export function getAnalyticsRecord(userId: string, businessId: string): AnalyticsRecord | null {
  return docGet<AnalyticsRecord>(NS, key(userId, businessId));
}

export function connectAnalytics(userId: string, businessId: string, propertyId: string) {
  const existing = getAnalyticsRecord(userId, businessId);
  docPut(NS, key(userId, businessId), userId, {
    propertyId,
    connectedAt: existing?.connectedAt || new Date().toISOString(),
    lastFetchedAt: existing?.lastFetchedAt,
    lastError: undefined,
    lastSummary: existing?.lastSummary,
  });
}

export function saveSummary(userId: string, businessId: string, summary: AnalyticsSummary) {
  const existing = getAnalyticsRecord(userId, businessId);
  if (!existing) return;
  docPut(NS, key(userId, businessId), userId, {
    ...existing,
    lastFetchedAt: summary.fetchedAt,
    lastError: undefined,
    lastSummary: summary,
  });
}

export function saveError(userId: string, businessId: string, message: string) {
  const existing = getAnalyticsRecord(userId, businessId);
  if (!existing) return;
  docPut(NS, key(userId, businessId), userId, { ...existing, lastError: message });
}

export function disconnectAnalytics(userId: string, businessId: string) {
  docDelete(NS, key(userId, businessId));
}

export function removeAnalyticsData(userId: string) {
  docDeleteByUser(userId);
}
