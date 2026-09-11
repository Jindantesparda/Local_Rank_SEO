import fs from 'fs';
import path from 'path';
import { CompetitorRecord, CompetitorResult } from '../src/types';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const COMPETITORS_FILE = path.join(DATA_DIR, 'competitors.json');

type CompetitorMap = Record<string, CompetitorRecord>;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readMap(): CompetitorMap {
  try {
    return JSON.parse(fs.readFileSync(COMPETITORS_FILE, 'utf8')) as CompetitorMap;
  } catch {
    return {};
  }
}

function writeMap(map: CompetitorMap) {
  ensureDataDir();
  fs.writeFileSync(COMPETITORS_FILE, JSON.stringify(map, null, 2));
}

function key(userId: string, businessId: string): string {
  return `${userId}::${businessId}`;
}

export function getCompetitorRecord(
  userId: string,
  businessId: string
): CompetitorRecord {
  const record = readMap()[key(userId, businessId)];
  return record || { urls: [], results: [], updatedAt: '' };
}

export function saveCompetitorRecord(
  userId: string,
  businessId: string,
  patch: Partial<Pick<CompetitorRecord, 'urls' | 'results'>>
): CompetitorRecord {
  const map = readMap();
  const k = key(userId, businessId);
  const existing = map[k] || { urls: [], results: [], updatedAt: '' };
  const next: CompetitorRecord = {
    urls: patch.urls !== undefined ? patch.urls : existing.urls,
    results: patch.results !== undefined ? patch.results : existing.results,
    updatedAt: new Date().toISOString(),
  };
  map[k] = next;
  writeMap(map);
  return next;
}

export function removeCompetitorData(userId: string) {
  const map = readMap();
  let changed = false;
  Object.keys(map).forEach((k) => {
    if (k.startsWith(`${userId}::`)) {
      delete map[k];
      changed = true;
    }
  });
  if (changed) writeMap(map);
}

export type { CompetitorResult };
