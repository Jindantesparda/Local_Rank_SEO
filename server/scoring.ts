import { CrawledPage, Business } from '../src/types';
import { CrawlResult } from './crawler';
import { isLocalBusinessSchemaType } from './schema';

export interface ScoreBreakdown {
  overallScore: number;
  technicalScore: number; // max 25
  onpageScore: number;    // max 30
  localScore: number;     // max 25
  contentScore: number;   // max 20
  details: {
    technical: {
      https: number;         // /6
      robotsTxt: number;     // /4
      sitemap: number;       // /4
      brokenLinks: number;   // /4
      canonical: number;     // /4
      crawlability: number;  // /3
    };
    onpage: {
      titleTags: number;        // /6
      metaDescriptions: number; // /5
      h1Usage: number;          // /5
      subheadings: number;      // /4
      imageAltText: number;     // /5
      internalLinks: number;    // /5
    };
    local: {
      businessName: number;    // /6
      locationSignals: number; // /6
      contactInfo: number;     // /5
      localSchema: number;     // /5
      serviceRelevance: number;// /3
    };
    content: {
      contentDepth: number;    // /6
      serviceCoverage: number; // /6
      locationCoverage: number;// /5
      thinPagesDeduction: number; // /3
    };
  };
}

export function calculateSeoScore(
  crawlData: CrawlResult,
  business: Business
): ScoreBreakdown {
  const { pages, siteWide } = crawlData;
  const homepage = pages.find(p => p.path === '/' || p.path === '') || pages[0];

  // ----------------------------------------------------
  // 1. Technical SEO (Max 25 points)
  // ----------------------------------------------------
  // HTTPS (6 pts)
  const httpsScore = siteWide.https ? 6 : 0;

  // Robots.txt (4 pts)
  const robotsScore = siteWide.robotsTxt ? 4 : 0;

  // Sitemap.xml (4 pts)
  const sitemapScore = siteWide.sitemapXml ? 4 : 0;

  // Broken links (4 pts)
  const brokenCount = siteWide.brokenLinks.length;
  const brokenLinksScore = brokenCount === 0 ? 4 : brokenCount <= 2 ? 2 : 0;

  // Canonical URLs (4 pts)
  const pagesWithCanonical = pages.filter(p => p.canonical && p.canonical.length > 5).length;
  const canonicalRatio = pages.length > 0 ? pagesWithCanonical / pages.length : 0;
  const canonicalScore = canonicalRatio > 0.8 ? 4 : canonicalRatio > 0.4 ? 2 : 1;

  // Crawlability & response status (3 pts)
  const okPages = pages.filter(p => p.statusCode === 200).length;
  const crawlabilityRatio = pages.length > 0 ? okPages / pages.length : 0;
  const crawlabilityScore = crawlabilityRatio >= 0.9 ? 3 : crawlabilityRatio >= 0.6 ? 2 : 0;

  const technicalScore = Math.min(25, Math.round(
    httpsScore + robotsScore + sitemapScore + brokenLinksScore + canonicalScore + crawlabilityScore
  ));

  // ----------------------------------------------------
  // 2. On-Page SEO (Max 30 points)
  // ----------------------------------------------------
  // Title tags (6 pts)
  let titlePoints = 0;
  if (homepage && homepage.title) {
    const len = homepage.title.length;
    if (len >= 30 && len <= 65) titlePoints += 4;
    else if (len > 15 && len < 90) titlePoints += 2;
    else titlePoints += 1;
  }
  const pagesWithTitle = pages.filter(p => p.title && p.title.length > 10).length;
  if (pages.length > 0 && pagesWithTitle / pages.length >= 0.8) titlePoints += 2;
  else if (pages.length > 0 && pagesWithTitle / pages.length >= 0.5) titlePoints += 1;
  const titleTagsScore = Math.min(6, titlePoints);

  // Meta descriptions (5 pts)
  const pagesWithMetaDesc = pages.filter(p => p.metaDescription && p.metaDescription.length >= 50).length;
  const metaDescRatio = pages.length > 0 ? pagesWithMetaDesc / pages.length : 0;
  const metaDescriptionsScore = metaDescRatio >= 0.8 ? 5 : metaDescRatio >= 0.5 ? 3 : metaDescRatio > 0 ? 1 : 0;

  // H1 usage (5 pts)
  const pagesWithH1 = pages.filter(p => p.h1 && p.h1.trim().length > 3).length;
  const h1Ratio = pages.length > 0 ? pagesWithH1 / pages.length : 0;
  const h1Score = h1Ratio >= 0.8 ? 5 : h1Ratio >= 0.5 ? 3 : 1;

  // Subheadings H2 (4 pts)
  const pagesWithH2 = pages.filter(p => p.h2s && p.h2s.length >= 2).length;
  const h2Ratio = pages.length > 0 ? pagesWithH2 / pages.length : 0;
  const subheadingsScore = h2Ratio >= 0.7 ? 4 : h2Ratio >= 0.3 ? 2 : 1;

  // Image Alt text (5 pts)
  let totalImages = 0;
  let totalMissingAlt = 0;
  pages.forEach(p => {
    totalImages += p.images.length;
    totalMissingAlt += p.missingAltCount;
  });
  let imageAltScore = 5;
  if (totalImages > 0) {
    const altRatio = (totalImages - totalMissingAlt) / totalImages;
    imageAltScore = altRatio >= 0.85 ? 5 : altRatio >= 0.6 ? 3 : altRatio >= 0.3 ? 2 : 1;
  }

  // Internal Links (5 pts)
  const pagesWithInternalLinks = pages.filter(p => p.internalLinks.length >= 3).length;
  const internalRatio = pages.length > 0 ? pagesWithInternalLinks / pages.length : 0;
  const internalLinksScore = internalRatio >= 0.8 ? 5 : internalRatio >= 0.5 ? 3 : 2;

  const onpageScore = Math.min(30, Math.round(
    titleTagsScore + metaDescriptionsScore + h1Score + subheadingsScore + imageAltScore + internalLinksScore
  ));

  // ----------------------------------------------------
  // 3. Local SEO (Max 25 points)
  // ----------------------------------------------------
  // Business name signals (6 pts)
  const cleanBizName = business.name.toLowerCase().trim();
  let bizNameFound = false;
  pages.forEach(p => {
    if (p.title.toLowerCase().includes(cleanBizName) || p.h1.toLowerCase().includes(cleanBizName)) {
      bizNameFound = true;
    }
  });
  const businessNameScore = bizNameFound ? 6 : (homepage && homepage.title.length > 5 ? 3 : 1);

  // Location signals (6 pts)
  const locKeywords = business.location
    ? business.location.toLowerCase().split(/[\s,]+/).filter(w => w.length > 3)
    : [];
  let locationMatches = 0;
  pages.forEach(p => {
    const textToCheck = `${p.title} ${p.metaDescription} ${p.h1} ${p.h2s.join(' ')}`.toLowerCase();
    locKeywords.forEach(kw => {
      if (textToCheck.includes(kw)) locationMatches++;
    });
  });
  const locationSignalsScore = locationMatches >= 3 ? 6 : locationMatches >= 1 ? 4 : 1;

  // Contact info cues (5 pts)
  let hasPhoneOrEmail = false;
  pages.forEach(p => {
    const full = `${p.title} ${p.metaDescription} ${p.h1} ${p.url}`.toLowerCase();
    if (full.includes('contact') || full.includes('phone') || full.includes('tel:') || full.includes('call')) {
      hasPhoneOrEmail = true;
    }
  });
  const contactInfoScore = hasPhoneOrEmail ? 5 : 2;

  // LocalBusiness Schema (5 pts)
  const hasLocalSchema = pages.some((p) =>
    p.hasStructuredData && p.structuredDataTypes.some((t) => isLocalBusinessSchemaType(t))
  );
  const hasGenericSchema = pages.some((p) => p.hasStructuredData);
  const localSchemaScore = hasLocalSchema ? 5 : hasGenericSchema ? 2 : 0;

  // Service/Location relevance (3 pts)
  const serviceKeywords = (business.services || []).map(s => s.toLowerCase());
  let serviceMatches = 0;
  pages.forEach(p => {
    const textToCheck = `${p.title} ${p.h1} ${p.h2s.join(' ')}`.toLowerCase();
    serviceKeywords.forEach(sk => {
      if (textToCheck.includes(sk)) serviceMatches++;
    });
  });
  const serviceRelevanceScore = serviceMatches >= 2 ? 3 : serviceMatches >= 1 ? 2 : 1;

  const localScore = Math.min(25, Math.round(
    businessNameScore + locationSignalsScore + contactInfoScore + localSchemaScore + serviceRelevanceScore
  ));

  // ----------------------------------------------------
  // 4. Content Quality & Depth (Max 20 points)
  // ----------------------------------------------------
  // Content depth / word count (6 pts)
  const avgWords = pages.length > 0 ? pages.reduce((acc, p) => acc + p.wordCount, 0) / pages.length : 0;
  const contentDepthScore = avgWords >= 450 ? 6 : avgWords >= 250 ? 4 : avgWords >= 100 ? 2 : 1;

  // Service coverage (6 pts)
  const serviceCount = business.services?.length || 1;
  const serviceCoverageScore = serviceMatches >= serviceCount ? 6 : serviceMatches >= 1 ? 4 : 2;

  // Location coverage across pages (5 pts)
  const pagesWithLocation = pages.filter(p => {
    const txt = `${p.title} ${p.metaDescription} ${p.h1}`.toLowerCase();
    return locKeywords.some(kw => txt.includes(kw));
  }).length;
  const locationCoverageScore = pagesWithLocation >= 2 ? 5 : pagesWithLocation === 1 ? 3 : 1;

  // Thin pages deduction / bonus (3 pts)
  const thinPages = pages.filter(p => p.statusCode === 200 && p.wordCount < 80).length;
  const thinPagesDeduction = thinPages === 0 ? 3 : thinPages <= 2 ? 2 : 0;

  const contentScore = Math.min(20, Math.round(
    contentDepthScore + serviceCoverageScore + locationCoverageScore + thinPagesDeduction
  ));

  // Overall Score
  const overallScore = Math.min(100, Math.max(10, Math.round(
    technicalScore + onpageScore + localScore + contentScore
  )));

  return {
    overallScore,
    technicalScore,
    onpageScore,
    localScore,
    contentScore,
    details: {
      technical: {
        https: httpsScore,
        robotsTxt: robotsScore,
        sitemap: sitemapScore,
        brokenLinks: brokenLinksScore,
        canonical: canonicalScore,
        crawlability: crawlabilityScore,
      },
      onpage: {
        titleTags: titleTagsScore,
        metaDescriptions: metaDescriptionsScore,
        h1Usage: h1Score,
        subheadings: subheadingsScore,
        imageAltText: imageAltScore,
        internalLinks: internalLinksScore,
      },
      local: {
        businessName: businessNameScore,
        locationSignals: locationSignalsScore,
        contactInfo: contactInfoScore,
        localSchema: localSchemaScore,
        serviceRelevance: serviceRelevanceScore,
      },
      content: {
        contentDepth: contentDepthScore,
        serviceCoverage: serviceCoverageScore,
        locationCoverage: locationCoverageScore,
        thinPagesDeduction: thinPagesDeduction,
      }
    }
  };
}
