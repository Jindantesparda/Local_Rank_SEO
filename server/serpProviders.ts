import { SerpResponse } from '../src/types';

/**
 * Whole-web search providers for "who is showing up above you".
 *
 * Why this exists at all: the Google Custom Search JSON API that used to back
 * this is closed to new customers (discontinued 1 January 2027) and Google
 * removed whole-web search from newly created Programmable Search Engines. So a
 * new project has no Google option for arbitrary web SERPs.
 *
 * Providers are therefore pluggable, and every response carries the `source` it
 * came from. That matters: Brave has its own independent index, so a Brave
 * position is NOT a Google position, and the UI must never present it as one.
 */

export type SerpSource = 'brave' | 'google-custom-search' | 'none';

export function toDomain(url: string): string {
  // Lowercased, because it is compared against result domains to decide
  // "is this you?" and DNS hostnames are case-insensitive.
  try {
    // Case-insensitive: `'HTTP://x'.startsWith('http')` is false, which used
    // to prepend a second protocol and yield the hostname "http".
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return url
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .toLowerCase();
  }
}

/** Human-readable label shown to users, so the source is never ambiguous. */
export function sourceLabel(source: SerpSource): string {
  switch (source) {
    case 'brave':
      return 'Brave Search index';
    case 'google-custom-search':
      return 'Google Programmable Search';
    default:
      return 'not connected';
  }
}

export function braveConfigured(): boolean {
  return Boolean(process.env.BRAVE_SEARCH_API_KEY);
}

/** Legacy path. Only works for a pre-existing whole-web Custom Search engine. */
export function customSearchConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);
}

/** The provider that will actually be used, in preference order. */
export function activeSerpSource(): SerpSource {
  if (braveConfigured()) return 'brave';
  if (customSearchConfigured()) return 'google-custom-search';
  return 'none';
}

export function serpConfigured(): boolean {
  return activeSerpSource() !== 'none';
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
}

async function fetchBrave(query: string, yourDomain: string): Promise<SerpResponse> {
  const key = process.env.BRAVE_SEARCH_API_KEY as string;
  const base = process.env.BRAVE_SEARCH_BASE_URL || 'https://api.search.brave.com/res/v1/web/search';
  const params = new URLSearchParams({ q: query, count: '20', result_filter: 'web' });

  const res = await fetch(`${base}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': key,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let hint = '';
    if (res.status === 401 || res.status === 403) {
      hint = ' Check the Brave Search API key is correct and the subscription is active.';
    } else if (res.status === 429) {
      hint =
        ' The Brave query allowance for this key has been used up. The free tier allows about 2,000 queries a month.';
    }
    throw new Error(`Brave Search error (${res.status}).${hint} ${text.slice(0, 160)}`);
  }

  const data = (await res.json()) as { web?: { results?: BraveWebResult[] } };
  const raw = data.web?.results || [];

  const results = raw
    .map((r, i) => ({
      position: i + 1,
      title: r.title || '',
      url: r.url || '',
      domain: toDomain(r.url || ''),
      isYou: false,
    }))
    .filter((r) => r.url);

  for (const r of results) {
    if (r.domain === yourDomain) r.isYou = true;
  }

  const mine = results.find((r) => r.isYou);
  const yourPosition = mine ? mine.position : null;

  return {
    configured: true,
    query,
    results,
    yourDomain,
    yourPosition,
    aboveYou: yourPosition ? yourPosition - 1 : results.length,
    source: 'brave',
    sourceLabel: sourceLabel('brave'),
    message: yourPosition
      ? `${yourDomain} appears at position ${yourPosition} in the Brave Search index (not Google).`
      : `${yourDomain} was not found in the top ${results.length} Brave Search results (Brave's own index, not Google).`,
  };
}

/** Legacy Google Programmable Search. Only usable with a grandfathered engine. */
async function fetchCustomSearch(query: string, yourDomain: string): Promise<SerpResponse> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY as string;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID as string;

  const params = new URLSearchParams({ key: apiKey, cx, q: query, num: '10' });
  const baseUrl =
    process.env.GOOGLE_SEARCH_BASE_URL || 'https://www.googleapis.com/customsearch/v1';

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    let hint = '';
    if (res.status === 400 || res.status === 403) {
      hint =
        ' Check that the Custom Search API is enabled for this key, and that the key has no HTTP-referrer restriction blocking a server-side call.';
    } else if (res.status === 429) {
      hint = ' The daily query quota for this key has been reached — try again tomorrow.';
    }
    throw new Error(`Google Search error (${res.status}).${hint} ${text.slice(0, 160)}`);
  }

  const data = (await res.json()) as {
    items?: Array<{ title?: string; link?: string; snippet?: string; displayLink?: string }>;
  };

  const items = data.items || [];
  const results = items.map((item, i) => {
    const domain = item.displayLink || toDomain(item.link || '');
    return {
      position: i + 1,
      title: item.title || '',
      url: item.link || '',
      domain,
      isYou: domain.replace(/^www\./, '') === yourDomain,
    };
  });

  const mine = results.find((r) => r.isYou);
  const yourPosition = mine ? mine.position : null;

  return {
    configured: true,
    query,
    results,
    yourDomain,
    yourPosition,
    aboveYou: yourPosition ? yourPosition - 1 : results.length,
    source: 'google-custom-search',
    sourceLabel: sourceLabel('google-custom-search'),
    message: yourPosition
      ? `${yourDomain} appears at position ${yourPosition} in Google.`
      : `${yourDomain} was not found in the top ${results.length} Google results.`,
  };
}

export async function fetchSerp(query: string, yourDomain: string): Promise<SerpResponse> {
  switch (activeSerpSource()) {
    case 'brave':
      return fetchBrave(query, yourDomain);
    case 'google-custom-search':
      return await fetchCustomSearch(query, yourDomain);
    default:
      throw new Error('No whole-web search provider is configured.');
  }
}
