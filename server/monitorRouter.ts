import { Router, Request, Response } from 'express';
import { getSessionUser } from './auth';
import { getWorkspace } from './workspaceStore';
import { getPlan } from './plans';
import { frequencyDaysFor, nextDueAt, runMonitoringPass, monitoringEnabled } from './monitor';
import { getBusinessState, getUserWindow } from './monitorStore';
import { isServiceRequest, serviceTokenConfigured, serviceTokenHint } from './serviceToken';

/**
 * Automated monitoring status, exposed to the app so the UI can show real
 * "last checked" / "next check due" values instead of promises.
 *
 *   GET  /api/monitor/status  → per-business last check + next due + allowance
 *   POST /api/monitor/run     → check now (subject to the plan's allowance)
 */
export async function createMonitorRouter(): Promise<Router> {
  const router = Router();

  router.get('/status', async (req: Request, res: Response) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const plan = getPlan(user.subscription?.plan || 'free');
    const workspace = await getWorkspace(user.id);
    const window = await getUserWindow(user.id);

    return res.json({
      enabled: monitoringEnabled(),
      plan: plan.id,
      frequencyDays: frequencyDaysFor(user),
      frequencyLabel: plan.limits.monitoringFrequency,
      monthlyAllowance: plan.limits.monthlyAudits,
      usedThisPeriod: window?.count || 0,
      periodStart: window?.periodStart || null,
      businesses: (workspace?.businesses || []).map(async (b) => {
        const state = await getBusinessState(user.id, b.id);
        return {
          businessId: b.id,
          name: b.name,
          lastCheckedAt: state?.lastCheckedAt || null,
          lastScore: state?.lastScore ?? null,
          checks: state?.checks || 0,
          lastError: state?.lastError || null,
          nextDueAt: await nextDueAt(user, b.id),
        };
      }),
    });
  });

  router.post('/run', async (req: Request, res: Response) => {
    /*
      Two ways in:

      - the monitoring cron, presenting MONITOR_TOKEN. It runs a pass for every
        eligible user, because no particular user is signed in. This exists so
        the cron does not depend on a session token that expires every 30 days —
        which used to make scheduled monitoring stop silently after a month.
      - a signed-in user pressing "Check now", which runs a pass for just them.
    */
    if (isServiceRequest(req)) {
      try {
        const results = await runMonitoringPass();
        console.log(`[monitor] service pass completed for ${results.length} business(es)`);
        return res.json({ trigger: 'service', results });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Monitoring run failed.';
        console.error('[monitor] service pass failed:', message);
        return res.status(500).json({ error: message });
      }
    }

    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Not authenticated.',
        // Distinguishes "your token expired" from "this endpoint is broken".
        serviceTokenConfigured: serviceTokenConfigured(),
        hint: serviceTokenConfigured() ? undefined : serviceTokenHint(),
      });
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
      return res.json({ trigger: 'user', results });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Monitoring run failed.';
      console.error('[monitor] manual run failed:', message);
      return res.status(500).json({ error: message });
    }
  });

  /**
   * Whether unattended monitoring is configured. Unauthenticated on purpose —
   * it reveals nothing secret and lets the cron (and you) tell the difference
   * between "nothing was due" and "the token is missing".
   */
  router.get('/service-token', (_req: Request, res: Response) => {
    res.json({
      configured: serviceTokenConfigured(),
      scheduledMonitoringEnabled: monitoringEnabled(),
      hint: serviceTokenConfigured() ? undefined : serviceTokenHint(),
    });
  });

  return router;
}
