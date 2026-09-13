/**
 * Competitor comparison + search visibility.
 *
 * Two honest layers:
 *
 *  1. Competitor analysis (always available): crawl each competitor website with
 *     the same engine used for the user's own audit, score it on the same
 *     100-point scale, and compare category by category.
 *
 *  2. Search visibility ("who is showing up above you"): real SERP results,
 *     available when a Google Programmable Search key is configured
 *     (GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_ENGINE_ID). Without it we return
 *     configured: false and the UI explains how to enable it — we never fake
 *     rankings.
 */

import { Router } from 'express';
import { getSessionUser } from './auth';
import { crawlWebsite } from './crawler';
import { calculateSeoScore } from './scoring';
import { isLocalBusinessSchemaType } from './schema';
import {
  getCompetitorRecord,
  saveCompetitorRecord,
} from './competitorStore';
import { Business, CompetitorResult, SerpResponse, SerpResult } from '../src/types';

const MAX_COMPETITORS = 10;
const COMPETITOR_PAGES = 8;

/**
 * Competitor comparison is a Growth/Agency feature. The Free plan is a
 * diagnosis: it shows the score and the biggest problems so there is a clear
 * reason to upgrade, but it does not include competitor analysis.
 */
function planAllowsCompetitors(user: {
  subscription?: { plan?: string };
  subscriptionTier?: string;
}): boolean {
  const plan = user.subscription?.plan || user.subscriptionTier || 'free';
  return plan === 'pro' || plan === 'agency';
}

function competitorUpgradeGate(
  user: { subscription?: { plan?: string }; subscriptionTier?: string }
): { error: string; upgradeTo: string } | null {
  if (planAllowsCompetitors(user)) return null;
  return {
    error:
      'Competitor comparison is part of the Growth plan. Upgrade to compare your site against competitors.',
    upgradeTo: 'pro',
  };
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Search providers live in server/serpProviders.ts so the source of a
// position is always explicit. Re-exported here for existing callers.
import {
  toDomain,
  serpConfigured,
  fetchSerp,
  activeSerpSource,
  sourceLabel,
} from './serpProviders';

export { toDomain, serpConfigured, fetchSerp, activeSerpSource, sourceLabel };

function namesFromUrl(url: string): string {
  const domain = toDomain(url);
  if (!domain) return url;
  const base = domain.split('.')[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

async function analyzeCompetitor(url: string, business: Business): Promise<CompetitorResult> {
  const normalized = normalizeUrl(url);
  const domain = toDomain(normalized);

  const base: CompetitorResult = {
    url: normalized,
    domain,
    name: namesFromUrl(normalized),
    overallScore: 0,
    technicalScore: 0,
    onpageScore: 0,
    localScore: 0,
    contentScore: 0,
    https: false,
    hasLocalSchema: false,
    pagesAnalyzed: 0,
    status: 'ok',
    analyzedAt: new Date().toISOString(),
  };

  try {
    const crawl = await crawlWebsite(normalized, COMPETITOR_PAGES, {
      ...business,
      website: normalized,
    });

    if (!crawl.pages || crawl.pages.length === 0) {
      return { ...base, status: 'error', error: 'No pages could be crawled.' };
    }

    const score = calculateSeoScore(crawl, { ...business, website: normalized });

    const hasLocalSchema = crawl.pages.some((page) =>
      (page.structuredDataTypes || []).some((t) => isLocalBusinessSchemaType(t))
    );

    return {
      ...base,
      overallScore: score.overallScore,
      technicalScore: score.technicalScore,
      onpageScore: score.onpageScore,
      localScore: score.localScore,
      contentScore: score.contentScore,
      https: crawl.siteWide.https,
      hasLocalSchema,
      pagesAnalyzed: crawl.pages.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not analyze this website.';
    return { ...base, status: 'error', error: message };
  }
}

/** Run async tasks with a small concurrency limit so we don't hammer sites. */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}


export function createCompetitorsRouter(): Router {
  const router = Router();

  // Public: tell the client whether SERP data is available, and from where.
  router.get('/config', (_req, res) => {
    const source = activeSerpSource();
    res.json({
      serpConfigured: source !== 'none',
      /**
       * Which index the "who shows up above you" results come from. Brave has
       * its own index, so these are NOT Google positions and the UI must say so.
       */
      serpSource: source,
      serpSourceLabel: sourceLabel(source),
      competitorAnalysis: true,
      maxCompetitors: MAX_COMPETITORS,
    });
  });

  // Analyze competitor sites and save the comparison.
  router.post('/analyze', async (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const gate = competitorUpgradeGate(user);
    if (gate) {
      return res.status(403).json(gate);
    }

    const { business, urls } = req.body as { business?: Business; urls?: unknown };
    if (!business || !business.website) {
      return res.status(400).json({ error: 'A business with a website is required.' });
    }
    if (!Array.isArray(urls)) {
      return res.status(400).json({ error: 'A list of competitor URLs is required.' });
    }

    const ownDomain = toDomain(business.website);
    const cleaned = Array.from(
      new Set(
        (urls as string[])
          .map((u) => normalizeUrl(String(u || '')))
          .filter((u) => u && toDomain(u) && toDomain(u) !== ownDomain)
      )
    ).slice(0, MAX_COMPETITORS);

    if (cleaned.length === 0) {
      return res.status(400).json({ error: 'Add at least one valid competitor URL.' });
    }

    try {
      const results = await mapWithLimit(cleaned, 3, (url) =>
        analyzeCompetitor(url, business)
      );

      const record = saveCompetitorRecord(user.id, business.id, {
        urls: cleaned,
        results,
      });

      return res.json({ competitors: record.results, urls: record.urls });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Competitor analysis failed';
      return res.status(500).json({ error: message });
    }
  });

  // Search visibility: who ranks above you for a keyword.
  router.post('/serp', async (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const gate = competitorUpgradeGate(user);
    if (gate) {
      return res.status(403).json(gate);
    }

    const { business, keyword } = req.body as { business?: Business; keyword?: string };
    if (!business || !business.website) {
      return res.status(400).json({ error: 'A business with a website is required.' });
    }

    const yourDomain = toDomain(business.website);
    const query =
      (keyword && keyword.trim()) ||
      [business.category, business.location].filter(Boolean).join(' in ') ||
      business.name;

    if (!serpConfigured()) {
      const response: SerpResponse = {
        configured: false,
        query,
        results: [],
        yourDomain,
        yourPosition: null,
        aboveYou: 0,
        source: 'none',
        sourceLabel: sourceLabel('none'),
        message:
          'Whole-web search is not connected. Google no longer offers this for new projects, so add a Brave Search API key (BRAVE_SEARCH_API_KEY) to enable competitor search visibility.',
      };
      return res.json(response);
    }

    try {
      const response = await fetchSerp(query, yourDomain);
      return res.json(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Search lookup failed';
      return res.status(502).json({ error: message });
    }
  });

  // Saved competitors + last comparison for a business.
  router.get('/:businessId', (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    const record = getCompetitorRecord(user.id, req.params.businessId);
    return res.json({ competitors: record.results, urls: record.urls, updatedAt: record.updatedAt });
  });

  // Save the competitor URL list.
  router.put('/:businessId', (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const { urls } = req.body as { urls?: unknown };
    if (!Array.isArray(urls)) {
      return res.status(400).json({ error: 'A list of competitor URLs is required.' });
    }

    const cleaned = Array.from(
      new Set(
        (urls as string[])
          .map((u) => normalizeUrl(String(u || '')))
          .filter((u) => u && toDomain(u))
      )
    ).slice(0, MAX_COMPETITORS);

    const record = saveCompetitorRecord(user.id, req.params.businessId, { urls: cleaned });
    return res.json({ urls: record.urls, competitors: record.results });
  });

  return router;
}
