import { SearchConsoleConnection } from '../src/types';
import { docDeleteByUser, docDelete, docGet, docPut } from './db';

/**
 * The Search Console property connected to each business.
 *
 * Only the property string is stored — the Google credential lives in the
 * server environment and is never held per user, exactly like the GA4 client.
 */

const NS = 'searchconsole' as const;

function key(userId: string, businessId: string): string {
  return `${userId}::${businessId}`;
}

export function getConnection(userId: string, businessId: string): SearchConsoleConnection | null {
  return docGet<SearchConsoleConnection>(NS, key(userId, businessId));
}

export function isConnected(userId: string, businessId: string): boolean {
  return getConnection(userId, businessId) !== null;
}

export function connect(userId: string, businessId: string, siteUrl: string) {
  const existing = getConnection(userId, businessId);
  docPut(NS, key(userId, businessId), userId, {
    siteUrl,
    connectedAt: existing?.connectedAt || new Date().toISOString(),
    lastFetchedAt: existing?.lastFetchedAt,
    lastError: undefined,
  } satisfies SearchConsoleConnection);
}

export function recordFetch(userId: string, businessId: string, error?: string) {
  const existing = getConnection(userId, businessId);
  if (!existing) return;
  docPut(NS, key(userId, businessId), userId, {
    ...existing,
    lastFetchedAt: error ? existing.lastFetchedAt : new Date().toISOString(),
    lastError: error,
  } satisfies SearchConsoleConnection);
}

export function disconnect(userId: string, businessId: string) {
  docDelete(NS, key(userId, businessId));
}

export function removeSearchConsoleData(userId: string) {
  docDeleteByUser(userId);
}
