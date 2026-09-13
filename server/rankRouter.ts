import { Router, Request, Response } from 'express';
import { getSessionUser } from './auth';
import { getWorkspace } from './workspaceStore';
import { getPlan } from './plans';
import {
  isSearchConsoleConfigured,
  normaliseSiteUrl,
  searchConsoleServiceAccountEmail,
  verifySite,
} from './searchConsole';
import { connect, disconnect, getConnection } from './searchConsoleStore';
import {
  getRankingRecord,
  recordSnapshot,
  trackKeyword,
  untrackKeyword,
  MAX_TRACKED_KEYWORDS,
} from './rankStore';
import {
  checkKeyword,
  detectMovement,
  positionTrend,
  refreshTrackedKeywords,
} from './rankTracker';

/**
 * Keyword rank tracking, sourced from Google Search Console.
 *
 *   GET    /api/rankings/:businessId             tracked keywords + history
 *   POST   /api/rankings/:businessId             track a keyword
 *   DELETE /api/rankings/:businessId/:keyword    stop tracking
 *   POST   /api/rankings/:businessId/refresh     re-check every keyword now
 *   GET    /api/rankings/:businessId/connection  Search Console connection state
 *   PUT    /api/rankings/:businessId/connection  connect a property
 *   DELETE /api/rankings/:businessId/connection  disconnect
 *
 * Tracking is a paid-plan feature. Positions come only from Search Console, so
 * nothing is invented: without a connected property the UI says so instead of
 * showing a number.
 */
export function createRankRouter(): Router {
  const router = Router();

  function context(req: Request, res: Response, businessId: string) {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return null;
    }
    const plan = getPlan(user.subscription?.plan || 'free');
    if (plan.limits.websitesMonitored <= 0) {
      res.status(403).json({
        error: 'Rank tracking is part of the Growth and Agency plans.',
        upgradeTo: 'pro',
      });
      return null;
    }
    const workspace = getWorkspace(user.id);
    const business = workspace?.businesses.find((b) => b.id === businessId);
    if (!business) {
      res.status(404).json({ error: 'Business not found.' });
      return null;
    }
    return { user, business };
  }

  /* ------------------------ Search Console link ------------------------- */

  router.get('/:businessId/connection', (req: Request, res: Response) => {
    const ctx = context(req, res, req.params.businessId);
    if (!ctx) return;

    const connection = getConnection(ctx.user.id, ctx.business.id);
    return res.json({
      serviceAccountConfigured: isSearchConsoleConfigured(),
      // The address the operator adds as a user on the Search Console property.
      serviceAccountEmail: isSearchConsoleConfigured()
        ? searchConsoleServiceAccountEmail()
        : null,
      connected: connection !== null,
      siteUrl: connection?.siteUrl ?? null,
      connectedAt: connection?.connectedAt ?? null,
      lastFetchedAt: connection?.lastFetchedAt ?? null,
      lastError: connection?.lastError ?? null,
      suggestedSiteUrl: normaliseSiteUrl(ctx.business.website || ''),
    });
  });

  router.put('/:businessId/connection', async (req: Request, res: Response) => {
    const ctx = context(req, res, req.params.businessId);
    if (!ctx) return;

    if (!isSearchConsoleConfigured()) {
      return res.status(503).json({
        error:
          'No Google service account is configured on this server yet. Set GOOGLE_SERVICE_ACCOUNT_JSON (see the README) before connecting Search Console.',
      });
    }

    const raw = (req.body as { siteUrl?: string }).siteUrl;
    const siteUrl = normaliseSiteUrl(raw || ctx.business.website || '');
    if (!siteUrl) {
      return res
        .status(400)
        .json({ error: 'Enter the Search Console property, for example sc-domain:example.com' });
    }

    try {
      // Verify before saving, so a typo does not look like "connected".
      await verifySite(siteUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not verify that property.';
      return res.status(400).json({ error: message });
    }

    connect(ctx.user.id, ctx.business.id, siteUrl);
    return res.json({ connected: true, siteUrl });
  });

  router.delete('/:businessId/connection', (req: Request, res: Response) => {
    const ctx = context(req, res, req.params.businessId);
    if (!ctx) return;
    disconnect(ctx.user.id, ctx.business.id);
    return res.json({ connected: false });
  });

  /* --------------------------- tracked keywords ------------------------- */

  router.get('/:businessId', (req: Request, res: Response) => {
    const ctx = context(req, res, req.params.businessId);
    if (!ctx) return;

    const record = getRankingRecord(ctx.user.id, ctx.business.id);
    const connection = getConnection(ctx.user.id, ctx.business.id);

    return res.json({
      configured: isSearchConsoleConfigured() && connection !== null,
      connected: connection !== null,
      siteUrl: connection?.siteUrl ?? null,
      source: 'search-console',
      sourceLabel: 'Google Search Console',
      maxKeywords: MAX_TRACKED_KEYWORDS,
      /**
       * Surfaced so the UI can be explicit that this is an average over a
       * window rather than a live SERP position.
       */
      positionNote:
        'Average position over the last 28 days as reported by Google Search Console. Google publishes this 2-3 days behind, and it only covers queries your site already appeared for.',
      keywords: record.keywords.map((kw) => {
        const movement = detectMovement(kw);
        const latest = [...kw.history].reverse().find((s) => !s.error);
        return {
          keyword: kw.keyword,
          createdAt: kw.createdAt,
          lastCheckedAt: kw.lastCheckedAt,
          latestPosition: latest?.position ?? null,
          latestClicks: latest?.clicks ?? null,
          latestImpressions: latest?.impressions ?? null,
          // Always present (null when fine) so the client can rely on the shape.
          latestError: kw.history.length ? [...kw.history].reverse()[0].error ?? null : null,
          checks: kw.history.length,
          movement,
          trend: positionTrend(kw),
          history: kw.history.slice(-12),
        };
      }),
    });
  });

  router.post('/:businessId', async (req: Request, res: Response) => {
    const ctx = context(req, res, req.params.businessId);
    if (!ctx) return;

    if (!getConnection(ctx.user.id, ctx.business.id)) {
      return res.status(409).json({
        error:
          'Connect Google Search Console for this business first — positions come from Google, not from scraping search results.',
        needsConnection: true,
      });
    }

    const { keyword } = req.body as { keyword?: string };
    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ error: 'Enter a keyword to track.' });
    }

    const added = trackKeyword(ctx.user.id, ctx.business.id, keyword);
    if (!added.ok) {
      return res.status(400).json({ error: added.error });
    }

    // Take the first reading straight away so the user sees a number.
    const clean = keyword.trim();
    const result = await checkKeyword(ctx.user.id, ctx.business.id, clean);

    recordSnapshot(ctx.user.id, ctx.business.id, clean, {
      checkedAt: new Date().toISOString(),
      position: result.error ? null : result.position,
      resultsCount: result.impressions,
      clicks: result.clicks,
      impressions: result.impressions,
      source: 'search-console',
      error: result.error,
    });

    return res.json({ tracked: true, result });
  });

  router.post('/:businessId/refresh', async (req: Request, res: Response) => {
    const ctx = context(req, res, req.params.businessId);
    if (!ctx) return;

    if (!getConnection(ctx.user.id, ctx.business.id)) {
      return res
        .status(409)
        .json({ error: 'Connect Google Search Console for this business first.', needsConnection: true });
    }

    try {
      const outcome = await refreshTrackedKeywords(ctx.user.id, ctx.business);
      return res.json(outcome);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not check rankings.';
      return res.status(500).json({ error: message });
    }
  });

  router.delete('/:businessId/:keyword', (req: Request, res: Response) => {
    const ctx = context(req, res, req.params.businessId);
    if (!ctx) return;

    const removed = untrackKeyword(ctx.user.id, ctx.business.id, req.params.keyword);
    if (!removed) {
      return res.status(404).json({ error: 'That keyword is not being tracked.' });
    }
    return res.json({ removed: true });
  });

  return router;
}
