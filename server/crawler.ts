import * as cheerio from 'cheerio';
import { CrawledPage, Business } from '../src/types';

interface CrawlSiteWide {
  https: boolean;
  robotsTxt: boolean;
  sitemapXml: boolean;
  canonicalConsistency: boolean;
  brokenLinks: string[];
}

export interface CrawlResult {
  pages: CrawledPage[];
  siteWide: CrawlSiteWide;
  totalFound: number;
}

// Check for Private / Localhost / SSRF targets
function isSafeUrl(rawUrl: string): { safe: boolean; reason?: string; parsed?: URL } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTP and HTTPS URLs are allowed.' };
    }

    const host = parsed.hostname.toLowerCase();

    // Check for localhost or loopback
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return { safe: false, reason: 'Access to localhost and internal loopback addresses is prohibited.' };
    }

    // Check IPv4 private ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
    const ipv4Match = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const b1 = parseInt(ipv4Match[1], 10);
      const b2 = parseInt(ipv4Match[2], 10);
      if (
        b1 === 10 ||
        b1 === 127 ||
        (b1 === 172 && b2 >= 16 && b2 <= 31) ||
        (b1 === 192 && b2 === 168) ||
        (b1 === 169 && b2 === 254)
      ) {
        return { safe: false, reason: 'Access to private internal network addresses is prohibited.' };
      }
    }

    return { safe: true, parsed };
  } catch {
    return { safe: false, reason: 'Invalid URL format. Please include http:// or https://' };
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 10000, retries = 1): Promise<{ ok: boolean; status: number; text: string; timeMs: number; finalUrl: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    // Follow redirects manually so we can record the final URL (and detect
    // http -> https upgrades for the HTTPS site-wide check).
    let currentUrl = url;
    let res = await fetch(currentUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LocalRank Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
      },
      redirect: 'manual',
    });

    let redirects = 0;
    while (
      res.status >= 300 &&
      res.status < 400 &&
      res.status !== 304 &&
      redirects < 6
    ) {
      const location = res.headers.get('location');
      if (!location) break;
      try {
        await res.body?.cancel();
      } catch {
        // ignore cancellation errors on redirect bodies
      }
      currentUrl = new URL(location, currentUrl).href;
      res = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LocalRank Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
        },
        redirect: 'manual',
      });
      redirects++;
    }

    const text = await res.text();
    const timeMs = Date.now() - start;
    const finalUrl = currentUrl;
    return { ok: res.ok, status: res.status, text, timeMs, finalUrl };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    // Retry once on timeout or network error
    if (retries > 0 && (err instanceof Error && err.name === 'AbortError' || err instanceof TypeError)) {
      return fetchWithTimeout(url, timeoutMs + 2000, retries - 1);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function crawlWebsite(
  targetUrl: string,
  maxPages = 15,
  _business?: Partial<Business>
): Promise<CrawlResult> {
  const safety = isSafeUrl(targetUrl);
  if (!safety.safe || !safety.parsed) {
    throw new Error(safety.reason || 'Invalid website URL');
  }

  const rootOrigin = safety.parsed.origin;
  const isHttps = safety.parsed.protocol === 'https:';
  // A site may be entered as http:// but redirect to https://. Treat the
  // observed final protocol as the source of truth for the HTTPS check.
  let httpsObserved = isHttps;

  const queue: string[] = [safety.parsed.href];
  const visited = new Set<string>();
  const pages: CrawledPage[] = [];
  const brokenLinks: string[] = [];

  // Site-wide checks
  let robotsTxtFound = false;
  let sitemapXmlFound = false;

  // Check robots.txt & sitemap with retry
  try {
    const robotsRes = await fetchWithTimeout(`${rootOrigin}/robots.txt`, 5000, 1);
    if (robotsRes.status === 200 && robotsRes.text.length > 5) {
      robotsTxtFound = true;
    }
  } catch {
    // Ignore error, robots.txt might not exist
  }

  try {
    const sitemapRes = await fetchWithTimeout(`${rootOrigin}/sitemap.xml`, 5000, 1);
    if (
      sitemapRes.status === 200 &&
      (sitemapRes.text.includes('<urlset') || sitemapRes.text.includes('<sitemapindex'))
    ) {
      sitemapXmlFound = true;
    }
  } catch {
    // Ignore error
  }

  while (queue.length > 0 && pages.length < maxPages) {
    const currentUrl = queue.shift()!;
    const normalized = normalizeUrl(currentUrl);

    if (visited.has(normalized)) continue;
    visited.add(normalized);

    try {
      const { status, text, timeMs, finalUrl } = await fetchWithTimeout(currentUrl, 10000, 1);
      if (finalUrl.startsWith('https://')) {
        httpsObserved = true;
      }

      if (status >= 400) {
        brokenLinks.push(currentUrl);
        pages.push({
          id: `page-${pages.length + 1}`,
          url: currentUrl,
          path: new URL(currentUrl).pathname || '/',
          statusCode: status,
          title: '',
          metaDescription: '',
          h1: '',
          h2s: [],
          wordCount: 0,
          images: [],
          missingAltCount: 0,
          internalLinks: [],
          externalLinks: [],
          canonical: '',
          robotsDirectives: '',
          hasStructuredData: false,
          structuredDataTypes: [],
          hasClickToCall: false,
          loadTimeMs: timeMs,
          issueCount: 1,
        });
        continue;
      }

      // Parse HTML with Cheerio
      const $ = cheerio.load(text);

      // Remove non-content elements for cleaner text extraction
      $('script, style, noscript, svg, iframe').remove();

      const title = $('title').first().text().trim() || '';
      const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
      const h1List: string[] = [];
      $('h1').each((_, el) => {
        const t = $(el).text().trim();
        if (t) h1List.push(t);
      });
      const h1 = h1List[0] || '';

      const h2s: string[] = [];
      $('h2').each((_, el) => {
        const t = $(el).text().trim();
        if (t && h2s.length < 10) h2s.push(t);
      });

      // Words in visible body
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      const words = bodyText ? bodyText.split(' ').filter(w => w.length > 0) : [];
      const wordCount = words.length;

      // Images & alt tags
      const images: { src: string; alt: string }[] = [];
      let missingAltCount = 0;
      $('img').each((_, el) => {
        const src = $(el).attr('src') || '';
        const alt = $(el).attr('alt') ?? '';
        if (src) {
          images.push({ src, alt });
          if (!alt.trim()) {
            missingAltCount++;
          }
        }
      });

      // Links
      const internalLinks: string[] = [];
      const externalLinks: string[] = [];
      let hasClickToCall = false;

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href')?.trim();
        if (href?.startsWith('tel:')) {
          hasClickToCall = true;
        }
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          return;
        }

        try {
          const resolved = new URL(href, currentUrl);
          if (resolved.origin === rootOrigin) {
            const clean = resolved.href.split('#')[0];
            if (!internalLinks.includes(clean)) {
              internalLinks.push(clean);
              const norm = normalizeUrl(clean);
              if (!visited.has(norm) && queue.length < 40) {
                queue.push(clean);
              }
            }
          } else {
            if (!externalLinks.includes(resolved.href)) {
              externalLinks.push(resolved.href);
            }
          }
        } catch {
          // ignore malformed hrefs
        }
      });

      // Canonical
      const canonical = $('link[rel="canonical"]').attr('href')?.trim() || '';

      // Robots meta
      const robotsDirectives = $('meta[name="robots"]').attr('content')?.trim() || '';

      // Structured Data (JSON-LD)
      let hasStructuredData = false;
      const structuredDataTypes: string[] = [];
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const content = $(el).html();
          if (content) {
            const parsed = JSON.parse(content);
            hasStructuredData = true;
            if (Array.isArray(parsed)) {
              parsed.forEach(item => {
                if (item?.['@type']) structuredDataTypes.push(String(item['@type']));
              });
            } else if (parsed?.['@type']) {
              structuredDataTypes.push(String(parsed['@type']));
            } else if (parsed?.['@graph'] && Array.isArray(parsed['@graph'])) {
              parsed['@graph'].forEach((item: { ['@type']?: string }) => {
                if (item?.['@type']) structuredDataTypes.push(String(item['@type']));
              });
            }
          }
        } catch {
          // invalid json-ld
        }
      });

      pages.push({
        id: `page-${pages.length + 1}`,
        url: currentUrl,
        path: new URL(currentUrl).pathname || '/',
        statusCode: status,
        title,
        metaDescription,
        h1,
        h2s,
        wordCount,
        images,
        missingAltCount,
        internalLinks,
        externalLinks,
        canonical,
        robotsDirectives,
        hasStructuredData,
        structuredDataTypes,
        hasClickToCall,
        loadTimeMs: timeMs,
      });
    } catch (err: unknown) {
      brokenLinks.push(currentUrl);
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch page';
      pages.push({
        id: `page-${pages.length + 1}`,
        url: currentUrl,
        path: new URL(currentUrl).pathname || '/',
        statusCode: 0,
        title: `Error: ${errMsg.slice(0, 50)}`,
        metaDescription: '',
        h1: '',
        h2s: [],
        wordCount: 0,
        images: [],
        missingAltCount: 0,
        internalLinks: [],
        externalLinks: [],
        canonical: '',
        robotsDirectives: '',
        hasStructuredData: false,
        structuredDataTypes: [],
        hasClickToCall: false,
        issueCount: 1,
      });
    }
  }

  return {
    pages,
    siteWide: {
      https: httpsObserved,
      robotsTxt: robotsTxtFound,
      sitemapXml: sitemapXmlFound,
      canonicalConsistency: pages.every(p => !p.canonical || p.canonical.startsWith('http')),
      brokenLinks,
    },
    totalFound: pages.length,
  };
}

function normalizeUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    u.hash = '';
    // trim trailing slash if not root
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.origin + u.pathname;
  } catch {
    return urlStr;
  }
}
