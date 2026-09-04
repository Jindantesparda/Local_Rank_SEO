import fs from 'fs';
import path from 'path';
import { AuditResult, Business } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const WORKSPACES_FILE = path.join(DATA_DIR, 'workspaces.json');

export interface WorkspaceRecord {
  businesses: Business[];
  audits: AuditResult[];
  activeBusinessId: string;
  updatedAt: string;
}

type WorkspaceMap = Record<string, WorkspaceRecord>;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readWorkspaces(): WorkspaceMap {
  try {
    const raw = fs.readFileSync(WORKSPACES_FILE, 'utf8');
    return JSON.parse(raw) as WorkspaceMap;
  } catch {
    return {};
  }
}

function writeWorkspaces(map: WorkspaceMap) {
  ensureDataDir();
  fs.writeFileSync(WORKSPACES_FILE, JSON.stringify(map, null, 2));
}

export function getWorkspace(userId: string): WorkspaceRecord | null {
  const map = readWorkspaces();
  return map[userId] || null;
}

export function saveWorkspace(
  userId: string,
  data: { businesses: Business[]; audits: AuditResult[]; activeBusinessId: string }
): WorkspaceRecord {
  const map = readWorkspaces();
  const record: WorkspaceRecord = {
    businesses: data.businesses,
    audits: data.audits,
    activeBusinessId: data.activeBusinessId,
    updatedAt: new Date().toISOString(),
  };
  map[userId] = record;
  writeWorkspaces(map);
  return record;
}

export function removeWorkspace(userId: string) {
  const map = readWorkspaces();
  if (map[userId]) {
    delete map[userId];
    writeWorkspaces(map);
  }
}
