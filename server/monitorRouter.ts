import { Router, Request, Response } from 'express';
import { getSessionUser } from './auth';
import { getWorkspace } from './workspaceStore';
import { getPlan } from './plans';
import { frequencyDaysFor, nextDueAt, runMonitoringPass, monitoringEnabled } from './monitor';
import { getBusinessState, getUserWindow } from './monitorStore';

/**
 * Automated monitoring status, exposed to the app so the UI can show real
 * "last checked" / "next check due" values instead of promises.
 *
 *   GET  /api/monitor/status  → per-business last check + next due + allowance
 *   POST /api/monitor/run     → check now (subject to the plan's allowance)
 */
export function createMonitorRouter(): Router {
  const router = Router();

  router.get('/status', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const plan = getPlan(user.subscription?.plan || 'free');
    const workspace = getWorkspace(user.id);
    const window = getUserWindow(user.id);

    return res.json({
      enabled: monitoringEnabled(),
      plan: plan.id,
      frequencyDays: frequencyDaysFor(user),
      frequencyLabel: plan.limits.monitoringFrequency,
      monthlyAllowance: plan.limits.monthlyAudits,
      usedThisPeriod: window?.count || 0,
      periodStart: window?.periodStart || null,
      businesses: (workspace?.businesses || []).map((b) => {
        const state = getBusinessState(user.id, b.id);
        return {
          businessId: b.id,
          name: b.name,
          lastCheckedAt: state?.lastCheckedAt || null,
          lastScore: state?.lastScore ?? null,
          checks: state?.checks || 0,
          lastError: state?.lastError || null,
          nextDueAt: nextDueAt(user, b.id),
        };
      }),
    });
  });

  router.post('/run', async (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const plan = getPlan(user.subscription?.plan || 'free');
    if (plan.limits.monitoringFrequency === 'one-time') {
      return res.status(403).json({
        error: 'Automated monitoring is part of the Growth and Agency plans.',
        upgradeTo: 'pro',
      });
    }

    try {
      const results = await runMonitoringPass(user.id);
      return res.json({ results });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Monitoring run failed.';
      console.error('[monitor] manual run failed:', message);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
