import { Router, Request, Response } from 'express';
import { AuditResult, Business } from '../src/types';
import { getSessionUser } from './auth';
import { getWorkspace } from './workspaceStore';
import { getCompetitorRecord } from './competitorStore';
import { buildReportData, renderReportHtml, ReportData } from './reports';
import { getPlan } from './plans';

/**
 * Client-facing report routes.
 *
 * "Generate reports" is an Agency plan feature, so it is gated here on the
 * server (not just hidden in the UI).
 *
 *   GET /api/reports/:businessId         → structured JSON
 *   GET /api/reports/:businessId/view     → printable HTML (new tab → Save as PDF)
 *   GET /api/reports/:businessId/download → HTML as a file download
 */
export function createReportsRouter(): Router {
  const router = Router();

  type Ctx = { report: ReportData } | { status: number; error: string; upgradeTo?: string };

  async function loadContext(req: Request, businessId: string): Promise<Ctx> {
    const user = await getSessionUser(req);
    if (!user) {
      return { status: 401, error: 'Not authenticated.' };
    }

    const plan = getPlan(user.subscription?.plan || 'free');
    if (!plan.limits.clientReports) {
      return {
        status: 403,
        error:
          'Report generation is part of the Agency plan. Upgrade to generate and share client-ready reports.',
        upgradeTo: 'agency',
      };
    }

    const workspace = await getWorkspace(user.id);
    const business: Business | undefined = workspace?.businesses.find((b) => b.id === businessId);
    if (!business) {
      return { status: 404, error: 'Business not found.' };
    }

    const audit: AuditResult | undefined = workspace?.audits.find(
      (a) => a.businessId === businessId
    );
    if (!audit) {
      return { status: 400, error: 'Run an audit for this business first.' };
    }

    const competitorRecord = await getCompetitorRecord(user.id, businessId);
    const history = (audit.auditHistory || []).map((h) => ({
      date: h.date,
      score: h.score,
      scoreDiff: h.scoreDiff,
    }));

    return {
      report: buildReportData(user, business, audit, competitorRecord?.results || [], history),
    };
  }

  router.get('/:businessId', (req: Request, res: Response) => {
    const ctx = loadContext(req, req.params.businessId);
    if ('report' in ctx) {
      return res.json({ report: ctx.report });
    }
    const { status, error, upgradeTo } = ctx;
    return res.status(status).json(upgradeTo ? { error, upgradeTo } : { error });
  });

  function sendHtml(req: Request, res: Response) {
    const ctx = loadContext(req, req.params.businessId);

    if ('report' in ctx) {
      const html = renderReportHtml(ctx.report);
      if (req.path.endsWith('/download')) {
        const safeName = ctx.report.business.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        res.setHeader('Content-Disposition', `attachment; filename="seo-report-${safeName}.html"`);
      }
      return res.type('html').send(html);
    }

    const { status, error } = ctx;
    return res.status(status).type('html').send(
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Report unavailable</title>
       <body style="font-family:system-ui,-apple-system,sans-serif;padding:48px;color:#3e1e56;background:#faf7fc">
       <h1 style="font-size:20px;margin:0 0 8px">Report unavailable</h1>
       <p style="color:#6b5a78;font-size:14px;max-width:520px">${error}</p>
       <p style="margin-top:24px"><a href="/" style="color:#4b1a66;font-weight:600">← Back to Search Vailable</a></p>
       </body></html>`
    );
  }

  router.get('/:businessId/view', sendHtml);
  router.get('/:businessId/download', sendHtml);

  return router;
}
