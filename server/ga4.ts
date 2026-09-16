import {
  ANALYTICS_SCOPE,
  getAccessToken as sharedGetAccessToken,
  getServiceAccount,
  isGoogleAuthConfigured,
  serviceAccountEmail,
} from './googleAuth';

/**
 * Google Analytics 4 (Data API) client.
 *
 * Authentication is shared with the Search Console client — see
 * server/googleAuth.ts. One service account covers both: enable both APIs on a
 * Cloud project, then add the service account address as a Viewer on the GA4
 * property and as a user on the Search Console property.
 *
 * The JWT is signed with Node's built-in crypto (RS256), so this adds no
 * dependency. Endpoints can be pointed at a stub for testing.
 */

const API_BASE =
  process.env.GA4_API_BASE_URL || 'https://analyticsdata.googleapis.com/v1beta';

export { getServiceAccount, serviceAccountEmail };

export function isAnalyticsConfigured(): boolean {
  return isGoogleAuthConfigured();
}

/** Access token for the Analytics scope only. */
export function getAccessToken(): Promise<string> {
  return sharedGetAccessToken(ANALYTICS_SCOPE);
}

export interface DataApiRow {
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
    await runReport(propertyId, {
      dateRanges,
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'bounceRate' },
        { name: 'userEngagementDuration' },
        { name: 'screenPageViews' },
      ],
    }),
    await runReport(propertyId, {
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    await runReport(propertyId, {
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
    await runReport(propertyId, {
      dateRanges,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 6,
    }),
    await runReport(propertyId, {
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
