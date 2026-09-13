import { SEARCH_CONSOLE_SCOPE, getAccessToken, getServiceAccount } from './googleAuth';

/**
 * Google Search Console client.
 *
 * This is how rank tracking works now. The Custom Search JSON API that used to
 * supply positions is closed to new customers and is discontinued on
 * 1 January 2027, and Google removed whole-web search from newly created
 * Programmable Search Engines — so a new project cannot use it at all.
 *
 * Search Console is the Google-supported replacement, and for the job we
 * actually need it is better: it reports the real average position Google
 * ranked the site at, alongside clicks, impressions and CTR.
 *
 * What it is and is not:
 *   - position is an AVERAGE over the date range, not a single live SERP rank
 *   - it only covers queries the site already appeared for
 *   - data lags by roughly 2-3 days, and history goes back ~16 months
 *   - it covers ONE site the operator has verified — never competitors
 *
 * Endpoints are overridable so the whole flow can be tested against a stub.
 */

function apiBase(): string {
  return process.env.GSC_API_BASE_URL || 'https://searchconsole.googleapis.com/webmasters/v3';
}

export function isSearchConsoleConfigured(): boolean {
  return getServiceAccount() !== null;
}

export function searchConsoleServiceAccountEmail(): string | null {
  const account = getServiceAccount();
  return account ? account.clientEmail : null;
}

/**
 * Normalise whatever the user typed into the siteUrl string Search Console
 * expects. Domain properties use `sc-domain:example.com`; URL-prefix properties
 * must be the exact URL including protocol and, if present, the trailing slash.
 */
export function normaliseSiteUrl(input: string): string {
  const value = (input || '').trim();
  if (!value) return '';

  // Domain properties are written exactly like this.
  if (value.startsWith('sc-domain:')) {
    const domain = value.slice('sc-domain:'.length).trim().replace(/\/+$/, '').toLowerCase();
    return domain ? `sc-domain:${domain}` : '';
  }

  // URL-prefix properties are stored WITH a trailing slash. Omitting it is the
  // usual reason a correct-looking property still returns 404.
  if (/^https?:\/\//i.test(value)) {
    return value.endsWith('/') ? value : `${value}/`;
  }

  // A bare domain is most likely meant as a domain property.
  const domain = value.replace(/\/+$/, '').toLowerCase();
  return domain ? `sc-domain:${domain}` : '';
}

interface ApiRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getAccessToken(SEARCH_CONSOLE_SCOPE);
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    // Turn the common failures into something the operator can act on.
    if (res.status === 403) {
      throw new Error(
        'Google refused access to this Search Console property. Add the service-account address as a user on the property in Search Console → Settings → Users and permissions.'
      );
    }
    if (res.status === 404) {
      throw new Error(
        'That Search Console property was not found for this service account. Check the exact property string (for example sc-domain:example.com), and that the account has been added to it.'
      );
    }
    if (res.status === 429) {
      throw new Error('Search Console quota reached. Try again later.');
    }
    throw new Error(`Search Console error (${res.status}): ${text.slice(0, 200)}`);
  }

  return JSON.parse(text) as T;
}

/** Which properties this service account can actually see. */
export async function listSites(): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  const data = await call<{ siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> }>(
    '/sites',
    { method: 'GET' }
  );
  return data.siteEntry || [];
}

export async function verifySite(siteUrl: string): Promise<{ ok: true; siteUrl: string }> {
  let sites: Array<{ siteUrl: string; permissionLevel: string }>;
  try {
    sites = await listSites();
  } catch (err) {
    // Fall back to a direct query so a working property is not rejected just
    // because the account lacks the broader listing permission.
    await queryAnalytics(siteUrl, { days: 7, rowLimit: 1 });
    return { ok: true, siteUrl };
  }

  const match = sites.find((s) => s.siteUrl === siteUrl);
  if (!match) {
    const available = sites.map((s) => s.siteUrl).slice(0, 8).join(', ');
    throw new Error(
      `This service account cannot see "${siteUrl}" in Search Console.` +
        (available ? ` It can see: ${available}.` : ' It can see no properties yet.') +
        ' Add the service account as a user on the property, or check the property string.'
    );
  }

  return { ok: true, siteUrl };
}

export interface QueryOptions {
  days?: number;
  rowLimit?: number;
  /** Restrict to one exact query. */
  keyword?: string;
  dimensions?: string[];
}

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export interface KeywordPosition {
  keyword: string;
  /** Average position Google ranked the site at. Lower is better. */
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

/**
 * Average position (plus clicks/impressions/CTR) for one keyword.
 *
 * Returns null when the site had no impressions for that query in the window —
 * which is a genuinely different situation from ranking badly, and is reported
 * as such rather than being turned into a fake position.
 */
export async function fetchKeywordPosition(
  siteUrl: string,
  keyword: string,
  days = 28
): Promise<KeywordPosition | null> {
  const body = {
    startDate: isoDaysAgo(days),
    endDate: isoDaysAgo(1),
    dimensions: ['query'],
    rowLimit: 1,
    searchType: 'web',
    dataState: 'all',
    dimensionFilterGroups: [
      { filters: [{ dimension: 'query', operator: 'equals', expression: keyword }] },
    ],
  };

  const data = await call<{ rows?: ApiRow[] }>(
    `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { method: 'POST', body: JSON.stringify(body) }
  );

  const row = (data.rows || [])[0];
  if (!row || typeof row.position !== 'number') return null;

  return {
    keyword: row.keys?.[0] || keyword,
    position: row.position,
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
  };
}

/**
 * Positions for several keywords in one request (filter groups are OR-ed), so
 * a scheduled pass costs one API call rather than one per keyword.
 */
export async function fetchKeywordPositions(
  siteUrl: string,
  keywords: string[],
  days = 28
): Promise<Map<string, KeywordPosition>> {
  const out = new Map<string, KeywordPosition>();
  if (keywords.length === 0) return out;

  const body = {
    startDate: isoDaysAgo(days),
    endDate: isoDaysAgo(1),
    dimensions: ['query'],
    rowLimit: 250,
    searchType: 'web',
    dataState: 'all',
    dimensionFilterGroups: keywords.map((kw) => ({
      filters: [{ dimension: 'query', operator: 'equals', expression: kw }],
    })),
  };

  const data = await call<{ rows?: ApiRow[] }>(
    `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { method: 'POST', body: JSON.stringify(body) }
  );

  for (const row of data.rows || []) {
    const keyword = row.keys?.[0];
    if (!keyword || typeof row.position !== 'number') continue;
    out.set(keyword.toLowerCase(), {
      keyword,
      position: row.position,
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
    });
  }

  return out;
}

/** Generic query, used for verification and any future reporting. */
export async function queryAnalytics(
  siteUrl: string,
  options: QueryOptions = {}
): Promise<{ rows: ApiRow[] }> {
  const body = {
    startDate: isoDaysAgo(options.days || 28),
    endDate: isoDaysAgo(1),
    dimensions: options.dimensions || ['query'],
    rowLimit: options.rowLimit || 100,
    searchType: 'web',
    dataState: 'all',
  };

  const data = await call<{ rows?: ApiRow[] }>(
    `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { method: 'POST', body: JSON.stringify(body) }
  );

  return { rows: data.rows || [] };
}
