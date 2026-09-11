import { AuditResult, Business } from '../src/types';
import { crawlWebsite } from './crawler';
import { calculateSeoScore } from './scoring';
import { generateIssues } from './issues';
import { generateDropOffAnalysis } from './dropoff';
import { generateAiRecommendations } from './ai';
import { assessSiteEligibility } from './siteEligibility';

/**
 * The audit pipeline, in one place.
 *
 * Both the user-triggered POST /api/audit route and the automated monitoring
 * scheduler call this, so a scheduled check produces byte-for-byte the same
 * AuditResult shape the dashboard already knows how to render.
 */

export interface RunAuditOptions {
  maxPages?: number;
  /**
   * Worth calling the LLM for the narrative recommendations. Scheduled checks
   * pass false — the deterministic recommendations are still produced, they
   * just skip the AI wording.
   */
  useAi?: boolean;
}

export class AuditError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.name = 'AuditError';
    this.status = status;
  }
}

export function normaliseUrl(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) throw new AuditError('A website address is required.');
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;
}

export async function runAudit(
  business: Business,
  options: RunAuditOptions = {}
): Promise<AuditResult> {
  const { maxPages = 15, useAi = true } = options;

  const targetUrl = normaliseUrl(business.website);
  const target: Business = { ...business, website: targetUrl };

  let crawlData;
  try {
    crawlData = await crawlWebsite(targetUrl, Math.min(maxPages, 30), target);
  } catch (crawlErr: unknown) {
    const msg = crawlErr instanceof Error ? crawlErr.message : 'Crawler error';
    console.error('Crawl failed:', msg);
    throw new AuditError(
      `We couldn't reach your website. ${msg}. Please ensure:\n- The website is online and public\n- The domain is correct (e.g., example.com)\n- The server accepts bot requests`
    );
  }

  if (!crawlData || !crawlData.pages || crawlData.pages.length === 0) {
    throw new AuditError(
      'We could not reach or parse any pages from this website. The server may be offline, blocking bot requests, or requiring JavaScript rendering.'
    );
  }

  // A reachable address is not the same as a real website. A parked domain or a
  // five-word holding page would otherwise produce a meaningless score, which
  // reads as a genuine result — worse than an honest refusal.
  const eligibility = assessSiteEligibility(crawlData);
  if (!eligibility.ok) {
    throw new AuditError(eligibility.reason || 'This address could not be analysed.');
  }

  console.log(`Crawled ${crawlData.pages.length} pages from ${targetUrl}`);

  const scoreBreakdown = calculateSeoScore(crawlData, target);
  const { issues, topPriorities } = generateIssues(crawlData, scoreBreakdown, target);

  let aiRecommendations: Awaited<ReturnType<typeof generateAiRecommendations>> = [];
  if (useAi) {
    try {
      aiRecommendations = await generateAiRecommendations(topPriorities, target);
    } catch (aiErr) {
      console.warn('AI recommendation generation error:', aiErr);
    }
  } else {
    try {
      // Deterministic fallback wording only — no model call.
      aiRecommendations = await generateAiRecommendations(topPriorities, target);
    } catch {
      aiRecommendations = [];
    }
  }

  const dropOffAnalysis = generateDropOffAnalysis(crawlData, target);

  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    businessId: target.id || `biz-${Date.now()}`,
    business: target,
    createdAt: new Date().toISOString(),
    overallScore: scoreBreakdown.overallScore,
    technicalScore: scoreBreakdown.technicalScore,
    onpageScore: scoreBreakdown.onpageScore,
    localScore: scoreBreakdown.localScore,
    contentScore: scoreBreakdown.contentScore,
    pagesAnalyzed: crawlData.pages.length,
    criticalCount: issues.filter((i) => i.severity === 'critical').length,
    warningCount: issues.filter((i) => i.severity === 'high' || i.severity === 'medium').length,
    goodCount: issues.filter((i) => i.severity === 'good').length,
    pages: crawlData.pages,
    issues,
    topPriorities,
    aiRecommendations,
    dropOffAnalysis,
    siteWideChecks: {
      https: crawlData.siteWide.https,
      robotsTxt: crawlData.siteWide.robotsTxt,
      sitemapXml: crawlData.siteWide.sitemapXml,
      canonicalConsistency: crawlData.siteWide.canonicalConsistency,
    },
    isDemo: false,
  };
}
