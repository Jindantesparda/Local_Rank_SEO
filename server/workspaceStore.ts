import { AuditResult, Business } from '../src/types';
import { docDeleteByUser, docGet, docPut } from './db';

/**
 * Per-user workspace (businesses + audits) for cross-device sync.
 * Stored as one document row per user; see server/db.ts for the schema.
 */

export interface WorkspaceRecord {
  businesses: Business[];
  audits: AuditResult[];
  activeBusinessId: string;
  updatedAt: string;
}

export async function getWorkspace(userId: string): Promise<WorkspaceRecord | null>  {
  return docGet<WorkspaceRecord>('workspace', userId);
}

export async function saveWorkspace(
  userId: string,
  data: { businesses: Business[]; audits: AuditResult[]; activeBusinessId: string }
): Promise<WorkspaceRecord>  {
  const record: WorkspaceRecord = {
    businesses: data.businesses,
    audits: data.audits,
    activeBusinessId: data.activeBusinessId,
    updatedAt: new Date().toISOString(),
  };
  await docPut('workspace', userId, userId, record);
  return record;
}

export async function removeWorkspace(userId: string) {
  await docDeleteByUser(userId);
}
