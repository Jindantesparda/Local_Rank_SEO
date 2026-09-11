import crypto from 'crypto';

/**
 * Google Analytics 4 (Data API) client.
 *
 * Authentication uses a **service account**, so there is no interactive OAuth
 * dance and no per-user secret to store. The operator sets one credential:
 *
 *   GA4_SERVICE_ACCOUNT_JSON  the full service-account JSON key, or
 *   GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY  the same values split up
 *
 * The client then adds that service-account address as a **Viewer** on their
 * GA4 property and enters the numeric property ID in the app.
 *
 * The JWT is signed with Node's built-in crypto (RS256), so this adds no
 * dependency. Endpoints can be pointed at a stub for testing.
 */

const TOKEN_URL = process.env.GA4_OAUTH_URL || 'https://oauth2.googleapis.com/token';
const API_BASE =
  process.env.GA4_API_BASE_URL || 'https://analyticsdata.googleapis.com/v1beta';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
  projectId?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

function normalisePrivateKey(key: string): string {
  // Keys pasted into env vars often arrive with literal \n sequences.
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

export function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as {
        client_email?: string;
        private_key?: string;
        project_id?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: normalisePrivateKey(parsed.private_key),
          projectId: parsed.project_id,
        };
      }
    } catch {
      console.warn('[ga4] GA4_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }

  const email = process.env.GA4_CLIENT_EMAIL;
  const key = process.env.GA4_PRIVATE_KEY;
  if (email && key) {
    return { clientEmail: email, privateKey: normalisePrivateKey(key) };
  }

  return null;
}

export function isAnalyticsConfigured(): boolean {
  return getServiceAccount() !== null;
}

export function serviceAccountEmail(): string | null {
  return getServiceAccount()?.clientEmail || null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** Mint a signed JWT and trade it for an access token. */
export async function getAccessToken(): Promise<string> {
  const account = getServiceAccount();
  if (!account) {
    throw new Error('Google Analytics is not configured on this server.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.accessToken;
  }

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const signingInput = `${header}.${claims}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();

  let signature: string;
  try {
    signature = base64url(signer.sign(account.privateKey));
  } catch {
    throw new Error(
      'The Google service-account private key could not be read. Check GA4_PRIVATE_KEY / GA4_SERVICE_ACCOUNT_JSON.'
    );
  }

  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Google rejected the service-account credentials (${res.status}). ${text}`);
  }

  const data = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error('Google did not return an access token.');
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };
  return cachedToken.accessToken;
}

interface DataApiRow {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

export interface DataApiResponse {
  rows?: DataApiRow[];
  totals?: Array<{ metricValues?: Array<{ value?: string }> }>;
  rowCount?: number;
}

/** Raw runReport call. Kept thin so a stub can stand in during tests. */
export async function runReport(
  propertyId: string,
  body: Record<string, unknown>
): Promise<DataApiResponse> {
  const token = await getAccessToken();
  const url = `${API_BASE}/properties/${encodeURIComponent(propertyId)}:runReport`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(
        'Google refused access to that property. Make sure you added the service-account address as a Viewer on the GA4 property.'
      );
    }
    if (res.status === 404) {
      throw new Error('That GA4 property ID could not be found.');
    }
    throw new Error(`Google Analytics returned ${res.status}. ${text.slice(0, 300)}`);
  }

  return JSON.parse(text) as DataApiResponse;
}

/* ------------------------------------------------------------------ */
/* Reporting                                                          */
/* ------------------------------------------------------------------ */

export interface AnalyticsPageRow {
  path: string;
  sessions: number;
  bounceRate: number; // 0–1
  avgEngagementSeconds: number;
}

export interface AnalyticsChannelRow {
  channel: string;
  sessions: number;
  bounceRate: number;
}

export interface AnalyticsSummary {
  connected: true;
  propertyId: string;
  rangeDays: number;
  fetchedAt: string;
  totals: {
    sessions: number;
    users: number;
    bounceRate: number; // 0–1
    avgEngagementSeconds: number;
    views: number;
  };
  trend: Array<{ date: string; sessions: number }>;
  topLandingPages: AnalyticsPageRow[];
  channels: AnalyticsChannelRow[];
  devices: Array<{ device: string; sessions: number; bounceRate: number }>;
}

function num(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateLabel(raw: string): string {
  if (raw.length !== 8) return raw;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export async function fetchAnalyticsSummary(
  propertyId: string,
  rangeDays = 28
): Promise<AnalyticsSummary> {
  const dateRanges = [{ startDate: `${rangeDays}daysAgo`, endDate: 'today' }];

  const [totalsRes, trendRes, landingRes, channelRes, deviceRes] = await Promise.all([
    runReport(propertyId, {
      dateRanges,
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'bounceRate' },
        { name: 'userEngagementDuration' },
        { name: 'screenPageViews' },
      ],
    }),
    runReport(propertyId, {
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    runReport(propertyId, {
      dateRanges,
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [
        { name: 'sessions' },
        { name: 'bounceRate' },
        { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 12,
    }),
    runReport(propertyId, {
      dateRanges,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 6,
    }),
    runReport(propertyId, {
      dateRanges,
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 4,
    }),
  ]);

  const totalsRow = totalsRes.totals?.[0]?.metricValues || totalsRes.rows?.[0]?.metricValues || [];
  const sessions = num(totalsRow[0]?.value);
  const users = num(totalsRow[1]?.value);
  const bounceRate = num(totalsRow[2]?.value);
  const engagementSeconds = num(totalsRow[3]?.value);
  const views = num(totalsRow[4]?.value);

  const trend = (trendRes.rows || []).map((row) => ({
    date: dateLabel(row.dimensionValues?.[0]?.value || ''),
    sessions: num(row.metricValues?.[0]?.value),
  }));

  const topLandingPages: AnalyticsPageRow[] = (landingRes.rows || []).map((row) => {
    const pageSessions = num(row.metricValues?.[0]?.value);
    const pageEngagement = num(row.metricValues?.[2]?.value);
    return {
      path: row.dimensionValues?.[0]?.value || '(not set)',
      sessions: pageSessions,
      bounceRate: num(row.metricValues?.[1]?.value),
      avgEngagementSeconds: pageSessions > 0 ? Math.round(pageEngagement / pageSessions) : 0,
    };
  });

  const channels: AnalyticsChannelRow[] = (channelRes.rows || []).map((row) => ({
    channel: row.dimensionValues?.[0]?.value || '(not set)',
    sessions: num(row.metricValues?.[0]?.value),
    bounceRate: num(row.metricValues?.[1]?.value),
  }));

  const devices = (deviceRes.rows || []).map((row) => ({
    device: row.dimensionValues?.[0]?.value || '(not set)',
    sessions: num(row.metricValues?.[0]?.value),
    bounceRate: num(row.metricValues?.[1]?.value),
  }));

  return {
    connected: true,
    propertyId,
    rangeDays,
    fetchedAt: new Date().toISOString(),
    totals: {
      sessions,
      users,
      bounceRate,
      avgEngagementSeconds: sessions > 0 ? Math.round(engagementSeconds / sessions) : 0,
      views,
    },
    trend,
    topLandingPages,
    channels,
    devices,
  };
}

/** Quick validity check used when a user connects a property. */
export async function verifyProperty(propertyId: string): Promise<{ ok: true }> {
  await runReport(propertyId, {
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    metrics: [{ name: 'sessions' }],
  });
  return { ok: true };
}
