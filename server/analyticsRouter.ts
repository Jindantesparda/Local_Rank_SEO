import { Router, Request, Response } from 'express';
import { getSessionUser } from './auth';
import { getWorkspace } from './workspaceStore';
import {
  isAnalyticsConfigured,
  serviceAccountEmail,
  fetchAnalyticsSummary,
  verifyProperty,
} from './ga4';
import {
  connectAnalytics,
  disconnectAnalytics,
  getAnalyticsRecord,
  saveError,
  saveSummary,
} from './analyticsStore';
import { deriveMeasuredDropOff } from './measuredDropoff';

/**
 * Google Analytics 4 connection + measured visitor behaviour.
 *
 *   GET    /api/analytics/config           → is the server set up, and which
 *                                            address to grant access to
 *   GET    /api/analytics/:businessId      → measured summary + drop-off signals
 *   PUT    /api/analytics/:businessId      → connect a property ID (verified first)
 *   DELETE /api/analytics/:businessId      → disconnect
 *
 * The Google credential lives only in the server environment. Users supply a
 * numeric property ID and nothing else.
 */
export function createAnalyticsRouter(): Router {
  const router = Router();

  async function requireUser(req: Request, res: Response) {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return null;
    }
    return user;
  }

  async function requireBusiness(req: Request, res: Response, businessId: string) {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return null;
    }
    const workspace = await getWorkspace(user.id);
    const business = workspace?.businesses.find((b) => b.id === businessId);
    if (!business) {
      res.status(404).json({ error: 'Business not found.' });
      return null;
    }
    return { user, business };
  }

  router.get('/config', async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    return res.json({
      configured: isAnalyticsConfigured(),
      serviceAccountEmail: serviceAccountEmail(),
    });
  });

  router.get('/:businessId', async (req: Request, res: Response) => {
    const ctx = await requireBusiness(req, res, req.params.businessId);
    if (!ctx) return;

    if (!isAnalyticsConfigured()) {
      return res.json({ connected: false, configured: false });
    }

    const record = await getAnalyticsRecord(ctx.user.id, ctx.business.id);
    if (!record) {
      return res.json({ connected: false, configured: true });
    }

    const refresh = req.query.refresh === '1';
    const stale =
      !record.lastSummary ||
      Date.now() - new Date(record.lastFetchedAt || 0).getTime() > 15 * 60 * 1000;

    if (refresh || stale) {
      try {
        const summary = await fetchAnalyticsSummary(record.propertyId, 28);
        await saveSummary(ctx.user.id, ctx.business.id, summary);
        return res.json({
          connected: true,
          configured: true,
          propertyId: record.propertyId,
          summary,
          measured: deriveMeasuredDropOff(summary),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not reach Google Analytics.';
        await saveError(ctx.user.id, ctx.business.id, message);

        // Fall back to the last good numbers rather than showing an error page.
        if (record.lastSummary) {
          return res.json({
            connected: true,
            configured: true,
            propertyId: record.propertyId,
            summary: record.lastSummary,
            measured: deriveMeasuredDropOff(record.lastSummary),
            stale: true,
            warning: message,
          });
        }

        return res.status(502).json({ connected: true, configured: true, error: message });
      }
    }

    const summary = record.lastSummary!;
    return res.json({
      connected: true,
      configured: true,
      propertyId: record.propertyId,
      summary,
      measured: deriveMeasuredDropOff(summary),
    });
  });

  router.put('/:businessId', async (req: Request, res: Response) => {
    const ctx = await requireBusiness(req, res, req.params.businessId);
    if (!ctx) return;

    if (!isAnalyticsConfigured()) {
      return res.status(503).json({
        error:
          'This server has no Google Analytics credential configured yet. Ask the operator to set GA4_SERVICE_ACCOUNT_JSON.',
      });
    }

    const propertyId = String((req.body as { propertyId?: string }).propertyId || '')
      .trim()
      .replace(/^properties\//, '');

    if (!/^\d{4,15}$/.test(propertyId)) {
      return res.status(400).json({
        error:
          'That does not look like a GA4 property ID. It is the number in Admin → Property settings (it is all digits).',
      });
    }

    try {
      await verifyProperty(propertyId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not verify that property.';
      return res.status(400).json({ error: message });
    }

    await connectAnalytics(ctx.user.id, ctx.business.id, propertyId);

    try {
      const summary = await fetchAnalyticsSummary(propertyId, 28);
      await saveSummary(ctx.user.id, ctx.business.id, summary);
      return res.json({
        connected: true,
        propertyId,
        summary,
        measured: deriveMeasuredDropOff(summary),
      });
    } catch {
      // Connected successfully; the first report fetch can wait.
      return res.json({ connected: true, propertyId });
    }
  });

  router.delete('/:businessId', async (req: Request, res: Response) => {
    const ctx = await requireBusiness(req, res, req.params.businessId);
    if (!ctx) return;

    await disconnectAnalytics(ctx.user.id, ctx.business.id);
    return res.json({ connected: false });
  });

  return router;
}
