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

export function toDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

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

export function serpConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);
}

export async function fetchSerp(query: string, yourDomain: string): Promise<SerpResponse> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY as string;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID as string;

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: '10',
  });

  // Base URL is overridable so the ranking path can be tested against a stub
  // (and so a proxy/enterprise gateway can be used) without touching code.
  const baseUrl =
    process.env.GOOGLE_SEARCH_BASE_URL || 'https://www.googleapis.com/customsearch/v1';

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    // Turn the common Google failures into something actionable.
    let hint = '';
    if (res.status === 400 || res.status === 403) {
      hint =
        ' Check that the Custom Search API is enabled for this key, and that the key has no HTTP-referrer restriction blocking a server-side call.';
    } else if (res.status === 429) {
      hint = ' The daily query quota for this key has been reached — try again tomorrow.';
    }
    throw new Error(
      `Google Search API error (${res.status}).${hint} ${text.slice(0, 200)}`.trim()
    );
  }

  const data = (await res.json()) as {
    items?: Array<{ title?: string; link?: string; displayLink?: string }>;
  };

  const results: SerpResult[] = (data.items || []).map((item, index) => {
    const url = item.link || '';
    const domain = toDomain(url) || (item.displayLink || '').replace(/^www\./i, '');
    return {
      position: index + 1,
      title: item.title || url,
      url,
      domain,
      isYou: Boolean(yourDomain) && domain === yourDomain,
    };
  });

  const yourIndex = results.findIndex((r) => r.isYou);
  const yourPosition = yourIndex >= 0 ? results[yourIndex].position : null;
  const aboveYou = yourIndex >= 0 ? yourIndex : results.length;

  return {
    configured: true,
    query,
    results,
    yourDomain,
    yourPosition,
    aboveYou,
    message:
      yourPosition === null
        ? results.length > 0
          ? `You are not in the top ${results.length} results for this search.`
          : 'No results returned for this search.'
        : `You appear at position ${yourPosition}.`,
  };
}

export function createCompetitorsRouter(): Router {
  const router = Router();

  // Public: tell the client whether SERP data is available.
  router.get('/config', (_req, res) => {
    res.json({
      serpConfigured: serpConfigured(),
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
        message:
          'Search ranking data is not connected yet. Add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID to enable it.',
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
