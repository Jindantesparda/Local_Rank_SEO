import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Search,
  Loader2,
  AlertCircle,
  ExternalLink,
  Globe,
  LineChart,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  Minus,
  ArrowRight,
} from 'lucide-react';
import { AuditResult, Business, CompetitorResult, SerpResponse, SubscriptionTier } from '../types';

interface CompetitorsViewProps {
  business: Business | null;
  audit: AuditResult | null;
  token?: string | null;
  userTier: SubscriptionTier;
  onNeedBusiness: () => void;
  onUpgrade: () => void;
}

type MetricKey = 'overallScore' | 'technicalScore' | 'onpageScore' | 'localScore' | 'contentScore';

const METRICS: Array<{ key: MetricKey; label: string; max: number }> = [
  { key: 'overallScore', label: 'Overall', max: 100 },
  { key: 'technicalScore', label: 'Technical', max: 25 },
  { key: 'onpageScore', label: 'On-page', max: 30 },
  { key: 'localScore', label: 'Local', max: 25 },
  { key: 'contentScore', label: 'Content', max: 20 },
];

export const CompetitorsView: React.FC<CompetitorsViewProps> = ({
  business,
  audit,
  token,
  userTier,
  onNeedBusiness,
  onUpgrade,
}) => {
  const [urls, setUrls] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [competitors, setCompetitors] = useState<CompetitorResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serpConfigured, setSerpConfigured] = useState<boolean | null>(null);
  const [keyword, setKeyword] = useState('');
  const [serp, setSerp] = useState<SerpResponse | null>(null);
  const [rankings, setRankings] = useState<{
    configured: boolean;
    source?: string;
    sourceLabel?: string;
    positionNote?: string;
    maxKeywords: number;
    keywords: Array<{
      keyword: string;
      latestPosition: number | null;
      latestError?: string | null;
      checks: number;
      movement: {
        previous: number | null;
        current: number | null;
        change: number | null;
        dropped: boolean;
        fellOut: boolean;
      } | null;
      trend: number[];
    }>;
  } | null>(null);
  const [trackingKeyword, setTrackingKeyword] = useState(false);
  const [rankingBusy, setRankingBusy] = useState(false);
  const [trackNotice, setTrackNotice] = useState<string | null>(null);
  const [gsc, setGsc] = useState<{
    serviceAccountConfigured: boolean;
    serviceAccountEmail: string | null;
    connected: boolean;
    siteUrl: string | null;
    lastError: string | null;
    suggestedSiteUrl: string;
  } | null>(null);
  const [gscInput, setGscInput] = useState('');
  const [gscBusy, setGscBusy] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const [serpLoading, setSerpLoading] = useState(false);

  const maxCompetitors = userTier === 'free' ? 3 : 10;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  // Default keyword suggestion
  useEffect(() => {
    if (business) {
      setKeyword([business.category, business.location].filter(Boolean).join(' in '));
    }
  }, [business?.id, business?.category, business?.location]);

  // Load any keywords already being tracked for this business.
  useEffect(() => {
    loadRankings();
    loadGscConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id, token]);

  // Load config + saved competitors
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const configRes = await fetch('/api/competitors/config');
        const config = await configRes.json();
        if (!cancelled) setSerpConfigured(Boolean(config.serpConfigured));
      } catch {
        if (!cancelled) setSerpConfigured(false);
      }
    })();

    if (business && token) {
      (async () => {
        try {
          const res = await fetch(`/api/competitors/${encodeURIComponent(business.id)}`, {
            headers: authHeaders,
          });
          if (!res.ok) return;
          const data = await res.json();
          if (cancelled) return;
          setUrls(Array.isArray(data.urls) ? data.urls : []);
          setCompetitors(Array.isArray(data.competitors) ? data.competitors : []);
        } catch {
          // ignore
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [business?.id, token]);

  if (!business || !audit) {
    return (
      <div className="max-w-3xl mx-auto bg-white backdrop-blur-md rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
        <img
          src="/illustrations/competitor-circle-256.png"
          alt=""
          width={112}
          height={112}
          className="mx-auto object-contain"
          style={{ width: 112, height: 112 }}
        />
        <h3 className="mt-4 text-lg font-bold text-slate-900">Compare yourself to the competition</h3>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Run an audit for a business first. Then you can add competitor websites, compare SEO
          scores side by side, and see who is outranking you in local search.
        </p>
        <button
          onClick={onNeedBusiness}
          className="btn btn-primary btn-md mt-5 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add a business & run an audit
        </button>
      </div>
    );
  }

  if (userTier === 'free') {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
        <img
          src="/illustrations/competitor-circle-256.png"
          alt=""
          className="mx-auto object-contain"
          style={{ width: 112, height: 112 }}
        />
        <span className="mt-4 inline-flex px-3 py-1 rounded-full bg-lilac-200 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-700">
          Growth plan
        </span>
        <h3 className="mt-3 text-lg font-bold text-slate-900">
          Competitor comparison is part of Growth
        </h3>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Your free audit shows your SEO score and your biggest problems. Growth adds the full
          actionable audit, ongoing monitoring, re-audits, and side-by-side competitor comparison.
        </p>
        <button
          onClick={onUpgrade}
          className="btn btn-primary btn-md mt-5 inline-flex items-center gap-2"
        >
          Upgrade to Growth
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const yourHasSchema = audit.issues.some(
    (i) => i.severity === 'good' && /structured data/i.test(i.title)
  );
  const yourMetrics: Record<MetricKey, number> = {
    overallScore: audit.overallScore,
    technicalScore: audit.technicalScore,
    onpageScore: audit.onpageScore,
    localScore: audit.localScore,
    contentScore: audit.contentScore,
  };

  const persistUrls = async (nextUrls: string[]) => {
    setUrls(nextUrls);
    try {
      await fetch(`/api/competitors/${encodeURIComponent(business.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ urls: nextUrls }),
      });
    } catch {
      // best-effort save
    }
  };

  const addUrl = () => {
    const value = input.trim();
    if (!value) return;
    if (urls.length >= maxCompetitors) {
      setError(`You can compare up to ${maxCompetitors} competitors on your plan.`);
      return;
    }
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    if (urls.some((u) => u.toLowerCase() === normalized.toLowerCase())) {
      setInput('');
      return;
    }
    setError(null);
    persistUrls([...urls, normalized]);
    setInput('');
  };

  const removeUrl = (url: string) => {
    persistUrls(urls.filter((u) => u !== url));
  };

  const analyze = async () => {
    if (urls.length === 0) {
      setError('Add at least one competitor website first.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/competitors/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ business, urls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Competitor analysis failed.');
      setCompetitors(Array.isArray(data.competitors) ? data.competitors : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Competitor analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  async function loadGscConnection() {
    if (!token || userTier === 'free') return;
    try {
      const res = await fetch(`/api/rankings/${business.id}/connection`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setGsc(data);
      if (!gscInput) setGscInput(data.siteUrl || data.suggestedSiteUrl || '');
    } catch {
      /* advisory only */
    }
  }

  async function connectGsc() {
    if (!token) return;
    const siteUrl = gscInput.trim();
    if (!siteUrl) return;
    setGscBusy(true);
    setGscError(null);
    try {
      const res = await fetch(`/api/rankings/${business.id}/connection`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not connect that property.');
      setGsc((prev) => (prev ? { ...prev, connected: true, siteUrl: data.siteUrl } : prev));
      setTrackNotice(`Connected ${data.siteUrl} to Google Search Console.`);
      await loadRankings();
    } catch (err) {
      setGscError(err instanceof Error ? err.message : 'Could not connect that property.');
    } finally {
      setGscBusy(false);
    }
  }

  async function disconnectGsc() {
    if (!token) return;
    setGscBusy(true);
    setGscError(null);
    try {
      await fetch(`/api/rankings/${business.id}/connection`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setGsc((prev) => (prev ? { ...prev, connected: false, siteUrl: null } : prev));
      setRankings(null);
      setTrackNotice(null);
    } catch {
      /* ignore */
    } finally {
      setGscBusy(false);
    }
  }

  // Declared as a function (not a const arrow) on purpose: the effect above
  // runs on every tier, but the Free and empty-state branches return BEFORE
  // this point. A const would still be in its temporal dead zone when that
  // effect fired, which crashed the whole page with
  // "Cannot access 'loadRankings' before initialization". Function
  // declarations are hoisted, so this one is always safe to call.
  async function loadRankings() {
    // Rank tracking is a paid feature; skip the request entirely on Free.
    if (!token || userTier === 'free') return;
    try {
      const res = await fetch(`/api/rankings/${business.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRankings(await res.json());
    } catch {
      /* advisory only */
    }
  }

  const trackKeyword = async (kw: string) => {
    if (!token || !kw) return;
    setTrackingKeyword(true);
    setTrackNotice(null);
    try {
      const res = await fetch(`/api/rankings/${business.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw }),
      });
      const data = (await res.json()) as {
        error?: string;
        result?: { position: number | null; error?: string };
      };
      if (!res.ok) throw new Error(data.error || 'Could not track that keyword.');

      if (data.result?.error) {
        setTrackNotice(`Tracking saved, but the first check failed: ${data.result.error}`);
      } else if (data.result?.position === null) {
        setTrackNotice(
          `Tracking “${kw}”. It is not in the top 10 results right now — we will record it as it changes.`
        );
      } else {
        setTrackNotice(`Tracking “${kw}” — currently position ${data.result?.position}.`);
      }
      await loadRankings();
    } catch (err) {
      setTrackNotice(err instanceof Error ? err.message : 'Could not track that keyword.');
    } finally {
      setTrackingKeyword(false);
    }
  };

  const refreshRankings = async () => {
    if (!token) return;
    setRankingBusy(true);
    setTrackNotice(null);
    try {
      const res = await fetch(`/api/rankings/${business.id}/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { error?: string; alerts?: unknown[]; errors?: number };
      if (!res.ok) throw new Error(data.error || 'Could not check rankings.');

      const alertCount = (data.alerts || []).length;
      setTrackNotice(
        alertCount > 0
          ? `Checked. ${alertCount} keyword${alertCount === 1 ? '' : 's'} dropped — we have emailed you about it.`
          : 'Checked. No significant movement.'
      );
      await loadRankings();
    } catch (err) {
      setTrackNotice(err instanceof Error ? err.message : 'Could not check rankings.');
    } finally {
      setRankingBusy(false);
    }
  };

  const removeKeyword = async (kw: string) => {
    if (!token) return;
    try {
      await fetch(`/api/rankings/${business.id}/${encodeURIComponent(kw)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadRankings();
    } catch {
      /* ignore */
    }
  };

  const runSerp = async () => {
    setSerpLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/competitors/serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ business, keyword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search lookup failed.');
      setSerp(data as SerpResponse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search lookup failed.');
    } finally {
      setSerpLoading(false);
    }
  };

  const gscConnected = Boolean(gsc?.connected);

  const okCompetitors = competitors.filter((c) => c.status === 'ok');

  return (
    <div className="space-y-6 text-left max-w-6xl">
      {/* Header */}
      <div className="bg-white backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3">
          <img
            src="/illustrations/competitor-circle-256.png"
            alt=""
            width={88}
            height={88}
            className="object-contain shrink-0"
            style={{ width: 88, height: 88 }}
          />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Competitor Comparison</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              We crawl each competitor with the same engine used for {business.name}, score them on
              the same 100-point scale, and show exactly where you are behind or ahead.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add competitors */}
      <div className="bg-white backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Competitor websites</h3>
          <span className="text-[10px] font-bold text-slate-400">
            {urls.length} / {maxCompetitors}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="competitor.com"
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            onClick={addUrl}
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
          <button
            onClick={analyze}
            disabled={analyzing || urls.length === 0}
            className="btn btn-primary btn-md flex items-center justify-center"
          >
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
            {analyzing ? 'Analyzing…' : 'Analyze competitors'}
          </button>
        </div>

        {urls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {urls.map((url) => (
              <span
                key={url}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700"
              >
                {url.replace(/^https?:\/\//, '')}
                <button
                  onClick={() => removeUrl(url)}
                  className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  aria-label={`Remove ${url}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {analyzing && (
          <p className="text-[11px] text-slate-500">
            Crawling {urls.length} competitor {urls.length === 1 ? 'site' : 'sites'}… this can take
            a few seconds per site.
          </p>
        )}
      </div>

      {/* Comparison table */}
      {okCompetitors.length > 0 && (
        <div className="bg-white backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Score comparison</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Green = you lead, amber = the competitor is ahead.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70">
                  <th className="text-left font-bold text-slate-500 px-6 py-2.5">Website</th>
                  {METRICS.map((m) => (
                    <th key={m.key} className="text-center font-bold text-slate-500 px-3 py-2.5">
                      {m.label}
                      <span className="block text-[9px] text-slate-400 font-medium">/{m.max}</span>
                    </th>
                  ))}
                  <th className="text-center font-bold text-slate-500 px-3 py-2.5">HTTPS</th>
                  <th className="text-center font-bold text-slate-500 px-3 py-2.5">Local schema</th>
                </tr>
              </thead>
              <tbody>
                {/* You */}
                <tr className="border-b border-slate-100 bg-sky-50/40">
                  <td className="px-6 py-3">
                    <div className="font-bold text-slate-900">{business.name}</div>
                    <div className="text-[10px] text-sky-600 font-bold">You</div>
                  </td>
                  {METRICS.map((m) => (
                    <td key={m.key} className="text-center px-3 py-3 font-bold text-slate-900">
                      {yourMetrics[m.key]}
                    </td>
                  ))}
                  <td className="text-center px-3 py-3">
                    {audit.siteWideChecks?.https ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-rose-500 mx-auto" />
                    )}
                  </td>
                  <td className="text-center px-3 py-3">
                    {yourHasSchema ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                </tr>

                {okCompetitors.map((c) => {
                  const beatsYouOverall = c.overallScore > yourMetrics.overallScore;
                  return (
                    <tr key={c.url} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-6 py-3">
                        <div className="font-bold text-slate-800">{c.name}</div>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-400 hover:text-sky-600 inline-flex items-center gap-1"
                        >
                          {c.domain}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>
                      {METRICS.map((m) => {
                        const ahead = c[m.key] > yourMetrics[m.key];
                        const behind = c[m.key] < yourMetrics[m.key];
                        return (
                          <td
                            key={m.key}
                            className={`text-center px-3 py-3 font-bold ${
                              ahead ? 'text-amber-600' : behind ? 'text-emerald-600' : 'text-slate-500'
                            }`}
                          >
                            {c[m.key]}
                            {ahead && <TrendingUp className="w-3 h-3 inline ml-1" />}
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-3">
                        {c.https ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-rose-500 mx-auto" />
                        )}
                      </td>
                      <td className="text-center px-3 py-3">
                        {c.hasLocalSchema ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <Minus className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Insights */}
          <div className="p-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 mb-3">What this means</h4>
            <ul className="space-y-2">
              {METRICS.map((m) => {
                const ahead = okCompetitors.filter((c) => c[m.key] > yourMetrics[m.key]).length;
                const behind = okCompetitors.filter((c) => c[m.key] < yourMetrics[m.key]).length;
                if (ahead === 0 && behind === 0) return null;
                return (
                  <li key={m.key} className="flex items-start gap-2 text-xs">
                    {ahead > 0 ? (
                      <TrendingDown className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    )}
                    <span className="text-slate-600">
                      {ahead > 0 ? (
                        <>
                          <strong className="text-slate-900">{ahead}</strong> of{' '}
                          {okCompetitors.length} competitors beat you on{' '}
                          <strong className="text-slate-900">{m.label}</strong>
                          {behind > 0 && <> (you lead {behind})</>}.
                        </>
                      ) : (
                        <>
                          You lead all {okCompetitors.length} competitors on{' '}
                          <strong className="text-slate-900">{m.label}</strong>.
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {competitors.some((c) => c.status === 'error') && (
        <div className="bg-white rounded-2xl p-4 border border-amber-200 text-xs text-amber-900">
          <p className="font-bold mb-1">Some competitors could not be analyzed:</p>
          <ul className="space-y-1">
            {competitors
              .filter((c) => c.status === 'error')
              .map((c) => (
                <li key={c.url}>
                  <span className="font-mono">{c.domain || c.url}</span> — {c.error}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Search visibility */}
      <div className="bg-white backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <img
            src="/illustrations/search-competitors-256.png"
            alt=""
            width={64}
            height={64}
            className="object-contain shrink-0"
            style={{ width: 64, height: 64 }}
          />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Who is showing up above you</h3>
            <p className="text-xs text-slate-500 mt-1">
              See which websites appear above {business.name} for the searches that matter locally.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={`e.g. ${business.category} in ${business.location}`}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            onClick={runSerp}
            disabled={serpLoading}
            className="btn btn-dark btn-md flex items-center justify-center"
            id="btn-check-rankings"
          >
            {serpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            {serpLoading ? 'Checking…' : 'Check rankings'}
          </button>
        </div>

        {/* Rank tracking — positions come from Google Search Console, so the
            tracking controls only appear once a property is connected. */}
        {gscConnected && keyword.trim() && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => trackKeyword(keyword.trim())}
              disabled={trackingKeyword}
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
              id="btn-track-keyword"
            >
              {trackingKeyword ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LineChart className="w-3.5 h-3.5" />
              )}
              <span>{trackingKeyword ? 'Tracking…' : `Track “${keyword.trim()}”`}</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Saves the Google position and re-checks it on every scheduled run.
            </span>
          </div>
        )}

        {trackNotice && (
          <div className="p-3 rounded-xl bg-lilac-50 border border-slate-200 text-xs text-slate-700">
            {trackNotice}
          </div>
        )}

        {/*
          Rank tracking source. Positions come from Google Search Console now:
          the Custom Search API that used to supply them is closed to new
          customers and discontinued 1 Jan 2027, and Google removed whole-web
          search from newly created engines.
        */}
        {gsc && !gsc.connected && (
          <div className="pt-3 mt-1 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <LineChart className="w-3.5 h-3.5 text-brand-500" />
              Keyword rank tracking
            </h4>
            <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
              Positions come from <strong>Google Search Console</strong> — the real average position
              Google reports for your site, with clicks and impressions alongside it. Connect the
              property below to start tracking.
            </p>

            {!gsc.serviceAccountConfigured ? (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                This server has no Google service account configured yet, so Search Console cannot be
                connected. Add <code className="font-mono">GOOGLE_SERVICE_ACCOUNT_JSON</code> — the
                same service account used for Google Analytics — and restart.
              </div>
            ) : (
              <>
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">One step before you connect:</strong> in Search
                  Console go to <em>Settings → Users and permissions → Add user</em> and add this
                  address.
                  {gsc.serviceAccountEmail && (
                    <div className="mt-1.5 font-mono text-[10px] bg-white rounded-lg border border-slate-200 p-2 break-all">
                      {gsc.serviceAccountEmail}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={gscInput}
                    onChange={(e) => setGscInput(e.target.value)}
                    placeholder="sc-domain:example.com"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    onClick={connectGsc}
                    disabled={gscBusy}
                    className="btn btn-primary btn-md flex items-center justify-center"
                    id="btn-connect-gsc"
                  >
                    {gscBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{gscBusy ? 'Verifying…' : 'Connect Search Console'}</span>
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  Use the exact property string from Search Console. A bare domain is treated as a
                  domain property; a full URL keeps its trailing slash.
                </p>
              </>
            )}

            {gscError && (
              <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 leading-relaxed">
                {gscError}
              </div>
            )}
          </div>
        )}

        {gsc?.connected && (
          <div className="pt-3 mt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              Rank data from <strong className="text-slate-700">Google Search Console</strong>
              {gsc.siteUrl ? <> · <span className="font-mono text-[10px]">{gsc.siteUrl}</span></> : null}
            </span>
            <button
              onClick={disconnectGsc}
              disabled={gscBusy}
              className="btn btn-ghost btn-xs"
              id="btn-disconnect-gsc"
            >
              Disconnect
            </button>
          </div>
        )}

        {rankings && rankings.keywords.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-700">
                Tracked keywords ({rankings.keywords.length}/{rankings.maxKeywords})
              </h4>
              <button
                onClick={refreshRankings}
                disabled={rankingBusy}
                className="btn btn-ghost btn-sm flex items-center gap-1.5"
                id="btn-refresh-rankings"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rankingBusy ? 'animate-spin' : ''}`} />
                <span>{rankingBusy ? 'Checking…' : 'Check now'}</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {rankings.keywords.map((kw) => {
                const move = kw.movement;
                const isNew = !move || move.change === null;
                return (
                  <div
                    key={kw.keyword}
                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs"
                  >
                    <span className="font-semibold text-slate-700 truncate">{kw.keyword}</span>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-bold text-slate-900">
                        {kw.latestPosition === null ? 'No data yet' : `#${kw.latestPosition}`}
                      </span>
                      {!isNew && move && (
                        <span
                          className={`font-bold ${
                            move.dropped || move.fellOut
                              ? 'text-rose-600'
                              : move.change === 0
                                ? 'text-slate-400'
                                : 'text-emerald-600'
                          }`}
                        >
                          {move.fellOut
                            ? '↓ left results'
                            : move.change === 0
                              ? 'no change'
                              : move.change && move.change > 0
                                ? `↓ ${move.change}`
                                : `↑ ${Math.abs(move.change || 0)}`}
                        </span>
                      )}
                      {kw.trend.length > 1 && (
                        <span className="text-[10px] text-slate-400">
                          {kw.trend.map((p) => `#${p}`).join(' → ')}
                        </span>
                      )}
                      <button
                        onClick={() => removeKeyword(kw.keyword)}
                        className="text-slate-400 hover:text-rose-600"
                        title="Stop tracking"
                        aria-label={`Stop tracking ${kw.keyword}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400">
              {rankings?.positionNote ||
                'Average position as reported by Google Search Console. A drop of 3 or more places triggers an email alert.'}
            </p>
          </div>
        )}

        {/*
          Whole-web search is no longer available from Google for new projects,
          so this now runs on Brave and says so. The index matters: a Brave
          position is not a Google position, and presenting it as one would be
          a lie.
        */}
        {!serpConfigured && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Competitor search visibility is not connected.</strong>{' '}
            {serp?.message ||
              'To show which sites outrank you, this needs a whole-web search provider.'}
            <p className="mt-2">
              Google used to provide this, but the Custom Search JSON API is closed to new customers
              and is discontinued on 1 January 2027, and new Programmable Search Engines can no
              longer search the entire web. So this uses{' '}
              <strong className="text-slate-800">Brave Search</strong> instead, which has its own
              independent index.
            </p>
            <ol className="mt-3 space-y-1.5 list-decimal list-inside text-slate-600">
              <li>
                Create a free API key at{' '}
                <a
                  href="https://api-dashboard.search.brave.com/app/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Brave Search API
                </a>{' '}
                (the free tier covers about 2,000 queries a month).
              </li>
              <li>
                Add it to <code>.env</code> and restart the server:
                <div className="mt-1.5 font-mono text-[10px] bg-white rounded-lg border border-slate-200 p-2">
                  BRAVE_SEARCH_API_KEY=your-key
                </div>
              </li>
            </ol>
            <p className="mt-2">
              Results will be labelled as coming from the Brave index — they are not Google
              rankings. Everything else on this page, including the score comparison above, works
              without any of this.
            </p>
          </div>
        )}

        {serp && serp.configured && (
          <div className="space-y-3">
            {serp.sourceLabel && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <Globe className="w-3 h-3" />
                {serp.sourceLabel}
                {serp.source === 'brave' ? ' — not Google' : ''}
              </span>
            )}
            <p className="text-xs font-semibold text-slate-700">{serp.message}</p>

            <div className="space-y-1.5">
              {serp.results.map((r) => (
                <div
                  key={`${r.position}-${r.url}`}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border ${
                    r.isYou ? 'border-sky-300 bg-sky-50/60' : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {r.position}
                  </span>
                  <div className="min-w-0">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-800 hover:text-sky-600 line-clamp-1"
                    >
                      {r.title}
                    </a>
                    <span className="text-[10px] text-slate-400">{r.domain}</span>
                    {r.isYou && (
                      <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500 text-white">
                        YOU
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
