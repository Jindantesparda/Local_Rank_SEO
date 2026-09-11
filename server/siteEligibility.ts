import { CrawlResult } from './crawler';

/**
 * Is this actually a website we can score?
 *
 * A crawl that returns a 200 does not mean a business site was found. Parked
 * domains, registrar holding pages, "under construction" stubs and default web
 * server pages all answer 200 with a handful of words. Scoring those produced
 * meaningless numbers (a domain that does not exist scored 36/100), which is
 * worse than an error: it looks like a real result.
 *
 * The rule is deliberately blunt — if we cannot find ONE page with real content,
 * we refuse to score and say why.
 */

/** Phrases that reliably indicate a placeholder rather than a business. */
const PLACEHOLDER_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /domain (is )?for sale|buy this domain|this domain is parked/i, label: 'a domain-for-sale page' },
  { re: /domain (is )?parked|parked (free|by|at)|sedoparking|afternic|hugedomains/i, label: 'a parked domain page' },
  { re: /\bunder construction\b|coming soon|site is being built|launching soon/i, label: 'an "under construction" page' },
  { re: /welcome to nginx|apache2? (ubuntu|debian) default page|it works!|default web (site|page)/i, label: 'a default web server page' },
  { re: /index of \//i, label: 'a directory listing' },
  { re: /this (site|website) (can.?t|can not|cannot) be reached|site not found|404 not found|page not found/i, label: 'an error page' },
  { re: /(account|hosting) (is )?(suspended|expired)|bandwidth limit exceeded/i, label: 'a suspended hosting page' },
  { re: /placeholder|coming soon page|lorem ipsum/i, label: 'a placeholder page' },
];

/** A page needs at least this much text before we treat it as real content. */
const MIN_WORDS_FOR_REAL_CONTENT = 25;

export interface SiteEligibility {
  ok: boolean;
  /** User-facing explanation when the site cannot be scored. */
  reason?: string;
}

function findPlaceholder(crawl: CrawlResult): string | null {
  for (const page of crawl.pages) {
    const haystack = [page.title, page.h1, page.metaDescription, page.textSample]
      .filter(Boolean)
      .join(' \n ');
    if (!haystack.trim()) continue;

    for (const { re, label } of PLACEHOLDER_PATTERNS) {
      if (re.test(haystack)) return label;
    }
  }
  return null;
}

export function assessSiteEligibility(crawl: CrawlResult): SiteEligibility {
  const pages = crawl.pages || [];

  if (pages.length === 0) {
    return {
      ok: false,
      reason:
        'No pages could be read from this address. Check the domain is correct and the site is online.',
    };
  }

  const placeholder = findPlaceholder(crawl);
  if (placeholder) {
    return {
      ok: false,
      reason: `This address looks like ${placeholder}, not a business website. Point us at your real site and we will score it properly.`,
    };
  }

  // At least one page must look like a real business page. The bar is kept low
  // on purpose: a legitimate one-page site for a small local business often has
  // very few words, so a real title, a heading and one other sign of a
  // maintained site is enough.
  const hasRealContent = pages.some((p) => {
    const words = p.wordCount || 0;
    if (words >= MIN_WORDS_FOR_REAL_CONTENT) return true;

    const hasTitle = Boolean(p.title && p.title.trim().length > 3);
    const hasHeading = Boolean(p.h1 && p.h1.trim());
    const hasOtherEvidence =
      Boolean(p.metaDescription && p.metaDescription.trim().length > 10) ||
      Boolean(p.hasClickToCall) ||
      (p.images || []).length > 0 ||
      (p.internalLinks || []).length >= 2;

    return hasTitle && hasHeading && hasOtherEvidence;
  });

  if (!hasRealContent) {
    const mostWords = Math.max(...pages.map((p) => p.wordCount || 0), 0);
    return {
      ok: false,
      reason:
        `There is nothing substantial to analyse at this address — the most any page contained was ` +
        `${mostWords} word${mostWords === 1 ? '' : 's'}. This usually means the site is empty, ` +
        `password-protected, or renders entirely with JavaScript.`,
    };
  }

  return { ok: true };
}
