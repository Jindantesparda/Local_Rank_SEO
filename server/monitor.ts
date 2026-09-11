import { AuditHistoryEntry, AuditResult, User } from '../src/types';
import { getPlan } from './plans';
import { runAudit, AuditError } from './auditPipeline';
import { getWorkspace, saveWorkspace } from './workspaceStore';
import { listUsers } from './auth';
import {
  consumeUserSlot,
  getBusinessState,
  getUserWindow,
  recordCheck,
} from './monitorStore';
import { appBaseUrl, sendEmail, scoreDropEmail, rankDropEmail } from './email';
import { refreshTrackedKeywords } from './rankTracker';
import { serpConfigured } from './competitors';

/**
 * Automated monitoring.
 *
 * A real scheduler: every MONITOR_INTERVAL_MINUTES it walks the stored
 * workspaces, and re-runs the audit for any business whose plan allows
 * monitoring and whose last check is older than that plan's frequency.
 *
 *   free    one-time  → never
 *   pro     weekly    → every 7 days
 *   agency  automated → every 1 day
 *
 * Scheduled runs also respect the plan's monthly audit allowance, so a paid
 * plan cannot be drained faster than its stated limit.
 *
 * Caveat worth knowing: this is an in-process timer. It runs while the server
 * is up. On a host that sleeps idle instances you also need an external cron
 * hitting POST /api/monitor/run — the README documents that.
 */

const FREQUENCY_DAYS: Record<string, number> = {
  'one-time': 0,
  weekly: 7,
  automated: 1,
};

export function frequencyDaysFor(user: User): number {
  const plan = getPlan(user.subscription?.plan || 'free');
  return FREQUENCY_DAYS[plan.limits.monitoringFrequency] ?? 0;
}

export function monitoringEnabled(): boolean {
  return process.env.MONITORING_ENABLED !== 'false';
}

function isDue(user: User, businessId: string): boolean {
  const days = frequencyDaysFor(user);
  if (days <= 0) return false;

  const state = getBusinessState(user.id, businessId);
  if (!state) return true;

  const age = Date.now() - new Date(state.lastCheckedAt).getTime();
  return age >= days * 24 * 60 * 60 * 1000;
}

/** Next due time for a business, or null when the plan has no monitoring. */
export function nextDueAt(user: User, businessId: string): string | null {
  const days = frequencyDaysFor(user);
  if (days <= 0) return null;

  const state = getBusinessState(user.id, businessId);
  if (!state) return new Date().toISOString();

  return new Date(new Date(state.lastCheckedAt).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function buildHistoryEntry(previous: AuditResult, current: AuditResult): AuditHistoryEntry {
  const prevNonGood = previous.issues.filter((i) => i.severity !== 'good');
  const currNonGood = current.issues.filter((i) => i.severity !== 'good');
  const prevTitles = new Set(prevNonGood.map((i) => i.title.toLowerCase()));
  const currTitles = new Set(currNonGood.map((i) => i.title.toLowerCase()));

  const fixedItems = prevNonGood
    .filter((i) => !currTitles.has(i.title.toLowerCase()))
    .map((i) => i.title);
  const newIssues = currNonGood
    .filter((i) => !prevTitles.has(i.title.toLowerCase()))
    .map((i) => i.title);

  return {
    date: new Date().toLocaleDateString(),
    score: previous.overallScore,
    scoreDiff: current.overallScore - previous.overallScore,
    fixedCount: fixedItems.length,
    fixedItems: fixedItems.slice(0, 3),
    newIssuesCount: newIssues.length,
    newPagesCount: Math.max(0, current.pagesAnalyzed - previous.pagesAnalyzed),
    nextPriorities: current.topPriorities.slice(0, 3).map((i) => i.title),
  };
}

export interface MonitoringResult {
  userId: string;
  businessId: string;
  businessName: string;
  status: 'checked' | 'skipped' | 'error';
  previousScore?: number;
  newScore?: number;
  detail?: string;
}

/**
 * Run a pass. When `onlyUserId` is given, only that user's businesses are
 * considered (used by the manual "check now" endpoint).
 */
export async function runMonitoringPass(onlyUserId?: string): Promise<MonitoringResult[]> {
  const results: MonitoringResult[] = [];
  if (!monitoringEnabled()) return results;

  const users = listUsers();

  for (const user of users) {
    if (onlyUserId && user.id !== onlyUserId) continue;

    const days = frequencyDaysFor(user);
    if (days <= 0) continue;

    const workspace = getWorkspace(user.id);
    if (!workspace || workspace.businesses.length === 0) continue;

    const plan = getPlan(user.subscription?.plan || 'free');

    for (const business of workspace.businesses) {
      if (!isDue(user, business.id)) continue;

      if (!consumeUserSlot(user.id, plan.limits.monthlyAudits)) {
        results.push({
          userId: user.id,
          businessId: business.id,
          businessName: business.name,
          status: 'skipped',
          detail: 'Monthly audit allowance for this plan is used up.',
        });
        continue;
      }

      const existing = workspace.audits.find((a) => a.businessId === business.id);

      try {
        const fresh = await runAudit(business, {
          maxPages: Math.min(plan.limits.crawlDepth, 10),
          useAi: false,
        });

        if (existing) {
          fresh.auditHistory = [buildHistoryEntry(existing, fresh), ...(existing.auditHistory || [])];
        }

        const nextAudits = existing
          ? workspace.audits.map((a) => (a.businessId === business.id ? fresh : a))
          : [...workspace.audits, fresh];

        saveWorkspace(user.id, {
          businesses: workspace.businesses,
          audits: nextAudits,
          activeBusinessId: workspace.activeBusinessId,
        });

        recordCheck(user.id, business.id, { score: fresh.overallScore });

        results.push({
          userId: user.id,
          businessId: business.id,
          businessName: business.name,
          status: 'checked',
          previousScore: existing?.overallScore,
          newScore: fresh.overallScore,
        });

        console.log(
          `[monitor] ${business.name} (${user.email}): ${existing?.overallScore ?? '—'} → ${fresh.overallScore}`
        );

        // Only email when the score actually moved, and only to paid plans.
        const moved = existing && existing.overallScore !== fresh.overallScore;
        if (moved && plan.limits.websitesMonitored > 0) {
          const template = scoreDropEmail(
            business.name,
            fresh.overallScore,
            existing.overallScore,
            `${appBaseUrl()}/`
          );
          await sendEmail({ to: user.email, ...template });
        }

        // Re-check any tracked keywords as part of the same scheduled pass, and
        // alert on real drops (only when the search API is configured).
        if (serpConfigured()) {
          try {
            const rank = await refreshTrackedKeywords(user.id, business);
            if (rank.alerts.length > 0) {
              console.log(
                `[monitor] ${business.name}: ${rank.alerts.length} keyword drop(s)`
              );
              await sendEmail({
                to: user.email,
                ...rankDropEmail(business.name, rank.alerts, `${appBaseUrl()}/`),
              });
            }
          } catch (rankErr) {
            console.warn('[monitor] rank check failed:', rankErr);
          }
        }
      } catch (err) {
        const message =
          err instanceof AuditError ? err.message : err instanceof Error ? err.message : 'Check failed';
        recordCheck(user.id, business.id, { error: message });
        console.warn(`[monitor] ${business.name} failed: ${message}`);
        results.push({
          userId: user.id,
          businessId: business.id,
          businessName: business.name,
          status: 'error',
          detail: message,
        });
      }

      // Be gentle with the sites we check.
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return results;
}

let timer: NodeJS.Timeout | null = null;

export function startMonitoring() {
  if (!monitoringEnabled()) {
    console.log('[monitor] disabled (MONITORING_ENABLED=false)');
    return;
  }
  if (timer) return;

  const intervalMinutes = Math.max(1, Number(process.env.MONITOR_INTERVAL_MINUTES) || 15);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(
    `[monitor] scheduled checks enabled — running every ${intervalMinutes} minute${
      intervalMinutes === 1 ? '' : 's'
    }`
  );

  timer = setInterval(() => {
    runMonitoringPass()
      .then((results) => {
        const checked = results.filter((r) => r.status === 'checked').length;
        if (checked > 0) console.log(`[monitor] pass complete — ${checked} site(s) re-checked`);
      })
      .catch((err) => console.error('[monitor] pass failed:', err));
  }, intervalMs);

  // Do not hold the process open just for the timer.
  if (typeof timer.unref === 'function') timer.unref();
}

export function stopMonitoring() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export { getUserWindow };
