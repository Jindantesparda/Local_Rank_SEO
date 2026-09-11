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
  /** Pages that could not be fetched. Never scored, but useful to report. */
  skippedPages?: Array<{ url: string; reason: string }>;
}

// Check for Private / Localhost / SSRF targets
export function isSafeUrl(rawUrl: string): { safe: boolean; reason?: string; parsed?: URL } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTP and HTTPS URLs are allowed.' };
    }
    const verdict = classifyHost(parsed.hostname);
    if (!verdict.safe) return { safe: false, reason: verdict.reason };
    return { safe: true, parsed };
  } catch {
    return { safe: false, reason: 'Invalid URL format. Please include http:// or https://' };
  }
}

/** Is an IPv4 address in a private, loopback, link-local or reserved range? */
function isPrivateIpv4(ip: string): boolean {
  const match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;

  const parts = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
  if (parts.some((n) => n > 255)) return true; // malformed → refuse

  const [b1, b2] = parts;
  return (
    b1 === 0 || // "this network"
    b1 === 10 || // private
    b1 === 127 || // loopback
    (b1 === 169 && b2 === 254) || // link-local, incl. cloud metadata 169.254.169.254
    (b1 === 172 && b2 >= 16 && b2 <= 31) || // private
    (b1 === 192 && b2 === 168) || // private
    (b1 === 100 && b2 >= 64 && b2 <= 127) || // carrier-grade NAT
    b1 >= 224 // multicast and reserved
  );
}

/**
 * Decide whether a hostname is safe to fetch.
 *
 * NOTE: `new URL('http://[::1]/').hostname` returns `"[::1]"` — brackets
 * included. An earlier version compared against `'::1'` and so never matched,
 * which left IPv6 loopback and IPv4-mapped addresses reachable. Brackets are
 * stripped before comparison now, and this is exported so it can be tested.
 */
export function classifyHost(rawHostname: string): { safe: boolean; reason?: string } {
  const host = rawHostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');

  if (!host) {
    return { safe: false, reason: 'Invalid URL format. Please include http:// or https://' };
  }

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.home.arpa')
  ) {
    return { safe: false, reason: 'Access to localhost and internal loopback addresses is prohibited.' };
  }

  // IPv6 loopback / unspecified, in any of their written forms.
  if (host === '::' || host === '::1' || /^(0{1,4}:){7}0{0,3}1$/.test(host) || /^0*:0*:0*:0*:0*:0*:0*:0*1$/.test(host)) {
    return { safe: false, reason: 'Access to localhost and internal loopback addresses is prohibited.' };
  }

  // IPv4-mapped / IPv4-compatible IPv6, e.g. ::ffff:127.0.0.1
  const mappedDotted = host.match(/^::(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedDotted) {
    return isPrivateIpv4(mappedDotted[1])
      ? { safe: false, reason: 'Access to private internal network addresses is prohibited.' }
      : { safe: true };
  }

  // Hex form, e.g. ::ffff:7f00:1
  const mappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    const dotted = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
    return isPrivateIpv4(dotted)
      ? { safe: false, reason: 'Access to private internal network addresses is prohibited.' }
      : { safe: true };
  }

  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
  if (/^f[cd][0-9a-f]{0,2}:/.test(host) || /^fe[89ab][0-9a-f]?:/.test(host)) {
    return { safe: false, reason: 'Access to private internal network addresses is prohibited.' };
  }

  if (isPrivateIpv4(host)) {
    return { safe: false, reason: 'Access to private internal network addresses is prohibited.' };
  }

  return { safe: true };
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
        'User-Agent': 'Mozilla/5.0 (compatible; Search Vailable Bot/1.0)',
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
          'User-Agent': 'Mozilla/5.0 (compatible; Search Vailable Bot/1.0)',
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
  // HTTPS is only credited once a response has actually come back over TLS.
  // Starting this at  meant an unreachable https:// URL still earned
  // the full HTTPS score, which is how a site that does not exist scored 36.
  let httpsObserved = false;

  const queue: string[] = [safety.parsed.href];
  const visited = new Set<string>();
  const pages: CrawledPage[] = [];
  const skippedPages: Array<{ url: string; reason: string }> = [];
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
          htmlBytes: 0,
          scriptCount: 0,
          formCount: 0,
          hasViewport: true,
          issueCount: 1,
        });
        continue;
      }

      // Parse HTML with Cheerio
      const $ = cheerio.load(text);

      // Signals used for the inferred "why visitors may leave" analysis.
      // All measured from the HTML response only — no behavioural data.
      // (Must be read before scripts/style are stripped below.)
      const htmlBytes = Buffer.byteLength(text, 'utf8');
      const scriptCount = $('script').length;
      const formCount = $('form').length;
      const viewportContent = $('meta[name="viewport"]').attr('content') || '';
      const hasViewport = /width\s*=\s*device-width/i.test(viewportContent);

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
      const textSample = bodyText.slice(0, 600);
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
        textSample,
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
        htmlBytes,
        scriptCount,
        formCount,
        hasViewport,
      });
    } catch (err: unknown) {
      brokenLinks.push(currentUrl);
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch page';

      // A page we could not fetch is NOT a page. Storing a placeholder here
      // (which is what used to happen) meant an unreachable site produced one
      // "page", sailed past the empty-crawl guard, and earned free points for
      // things like a mobile viewport that were never observed.
      skippedPages.push({ url: currentUrl, reason: errMsg.slice(0, 120) });

      // If the very first page fails, the site itself is unreachable — there is
      // nothing to score, so fail loudly instead of inventing a score.
      if (pages.length === 0) {
        throw new Error(`Could not reach ${currentUrl}: ${errMsg.slice(0, 120)}`);
      }
    }
  }

  return {
    pages,
    skippedPages,
    siteWide: {
      // Only true when every fetched page answered over https.
      https: httpsObserved && pages.length > 0,
      robotsTxt: robotsTxtFound,
      sitemapXml: sitemapXmlFound,
      canonicalConsistency:
        pages.length > 0 &&
        pages.every((p) => !p.canonical || p.canonical.startsWith('http')),
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
