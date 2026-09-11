import { Router, Request, Response } from 'express';
import { getSessionUser } from './auth';
import { getWorkspace } from './workspaceStore';
import { getPlan } from './plans';
import { serpConfigured } from './competitors';
import {
  getRankingRecord,
  recordSnapshot,
  trackKeyword,
  untrackKeyword,
  MAX_TRACKED_KEYWORDS,
} from './rankStore';
import { checkKeyword, detectMovement, positionTrend, refreshTrackedKeywords } from './rankTracker';

/**
 * Keyword rank tracking.
 *
 *   GET    /api/rankings/:businessId            → tracked keywords + history
 *   POST   /api/rankings/:businessId            → track a keyword (checked immediately)
 *   DELETE /api/rankings/:businessId/:keyword   → stop tracking
 *   POST   /api/rankings/:businessId/refresh    → re-check every tracked keyword now
 *
 * Ranking data requires the Google Custom Search credentials, so everything
 * reports `configured: false` rather than inventing positions when they are
 * missing. Tracking is a paid-plan feature.
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

  router.get('/:businessId', (req: Request, res: Response) => {
    const ctx = context(req, res, req.params.businessId);
    if (!ctx) return;

    const record = getRankingRecord(ctx.user.id, ctx.business.id);

    return res.json({
      configured: serpConfigured(),
      maxKeywords: MAX_TRACKED_KEYWORDS,
      keywords: record.keywords.map((kw) => {
        const movement = detectMovement(kw);
        const latest = [...kw.history].reverse().find((s) => !s.error);
        return {
          keyword: kw.keyword,
          createdAt: kw.createdAt,
          lastCheckedAt: kw.lastCheckedAt,
          latestPosition: latest?.position ?? null,
          latestError: latest?.error,
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

    const { keyword } = req.body as { keyword?: string };
    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ error: 'Enter a keyword to track.' });
    }

    const added = trackKeyword(ctx.user.id, ctx.business.id, keyword);
    if (!added.ok) {
      return res.status(400).json({ error: added.error });
    }

    // Take the first reading straight away so the user sees a number.
    const result = await checkKeyword(ctx.business, keyword.trim());
    if (!result.error) {
      recordSnapshot(ctx.user.id, ctx.business.id, keyword.trim(), {
        checkedAt: new Date().toISOString(),
        position: result.position,
        resultsCount: result.resultsCount,
      });
    }

    return res.json({
      tracked: true,
      configured: serpConfigured(),
      result,
    });
  });

  router.post('/:businessId/refresh', async (req: Request, res: Response) => {
    const ctx = context(req, res, req.params.businessId);
    if (!ctx) return;

    if (!serpConfigured()) {
      return res.status(503).json({
        error:
          'Rank tracking needs Google Custom Search credentials on this server (GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_ENGINE_ID).',
      });
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
