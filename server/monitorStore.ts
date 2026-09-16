import { docDeleteByUser, docGet, docPut } from './db';

/**
 * Scheduling state for automated monitoring.
 *
 * Two kinds of row:
 *   `monitor` / `${userId}::${businessId}`   → per-business check state
 *   `monitor` / `window::${userId}`          → the rolling 30-day allowance
 */

const NS = 'monitor' as const;

export interface BusinessMonitorState {
  lastCheckedAt: string;
  lastScore: number;
  checks: number;
  lastError?: string;
}

export interface UserMonitorWindow {
  /** Rolling 30-day window of automatically-triggered checks. */
  periodStart: string;
  count: number;
}

export function businessKey(userId: string, businessId: string): string {
  return `${userId}::${businessId}`;
}

function windowKey(userId: string): string {
  return `window::${userId}`;
}

export async function getBusinessState(
  userId: string,
  businessId: string
): Promise<BusinessMonitorState | null> {
  return docGet<BusinessMonitorState>(NS, businessKey(userId, businessId));
}

export async function recordCheck(
  userId: string,
  businessId: string,
  patch: { score?: number; error?: string }
): Promise<void> {
  const key = businessKey(userId, businessId);
  const previous = await docGet<BusinessMonitorState>(NS, key);

  const next: BusinessMonitorState = {
    lastCheckedAt: new Date().toISOString(),
    lastScore: patch.score ?? previous?.lastScore ?? 0,
    checks: (previous?.checks || 0) + 1,
    lastError: patch.error,
  };

  await docPut(NS, key, userId, next);
}

/** Returns true when the user is still inside their plan's monthly allowance. */
export async function consumeUserSlot(userId: string, monthlyAllowance: number): Promise<boolean> {
  const key = windowKey(userId);
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const existing = await docGet<UserMonitorWindow>(NS, key);

  if (!existing || now - new Date(existing.periodStart).getTime() > THIRTY_DAYS) {
    await docPut(NS, key, userId, { periodStart: new Date(now).toISOString(), count: 1 });
    return true;
  }

  if (existing.count >= monthlyAllowance) {
    return false;
  }

  await docPut(NS, key, userId, {
    periodStart: existing.periodStart,
    count: existing.count + 1,
  });
  return true;
}

export async function getUserWindow(userId: string): Promise<UserMonitorWindow | null> {
  return docGet<UserMonitorWindow>(NS, windowKey(userId));
}

export async function removeMonitorData(userId: string): Promise<void> {
  await docDeleteByUser(userId);
}
