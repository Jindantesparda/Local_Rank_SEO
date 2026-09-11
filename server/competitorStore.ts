import { CompetitorResult } from '../src/types';
import { docDeleteByUser, docGet, docPut } from './db';

/**
 * Saved competitor URLs + their last comparison results, per business.
 * Key is `${userId}::${businessId}` — the same shape as the old JSON map, so
 * nothing that reads it had to change.
 */

export interface CompetitorRecord {
  urls: string[];
  results: CompetitorResult[];
  updatedAt: string;
}

const NS = 'competitors' as const;

function key(userId: string, businessId: string): string {
  return `${userId}::${businessId}`;
}

export function getCompetitorRecord(userId: string, businessId: string): CompetitorRecord {
  return (
    docGet<CompetitorRecord>(NS, key(userId, businessId)) || {
      urls: [],
      results: [],
      updatedAt: '',
    }
  );
}

export function saveCompetitorRecord(
  userId: string,
  businessId: string,
  patch: Partial<Pick<CompetitorRecord, 'urls' | 'results'>>
): CompetitorRecord {
  const existing = getCompetitorRecord(userId, businessId);
  const record: CompetitorRecord = {
    urls: patch.urls !== undefined ? patch.urls : existing.urls,
    results: patch.results !== undefined ? patch.results : existing.results,
    updatedAt: new Date().toISOString(),
  };
  docPut(NS, key(userId, businessId), userId, record);
  return record;
}

export function removeCompetitorData(userId: string) {
  docDeleteByUser(userId);
}
