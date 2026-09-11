import React, { useEffect, useState } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Search,
  Loader2,
  AlertCircle,
  ExternalLink,
  Globe,
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
  const [serpLoading, setSerpLoading] = useState(false);

  const maxCompetitors = userTier === 'free' ? 3 : 10;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  // Default keyword suggestion
  useEffect(() => {
    if (business) {
      setKeyword([business.category, business.location].filter(Boolean).join(' in '));
    }
  }, [business?.id, business?.category, business?.location]);

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
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
          <Trophy className="w-7 h-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900">Compare yourself to the competition</h3>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Run an audit for a business first. Then you can add competitor websites, compare SEO
          scores side by side, and see who is outranking you in local search.
        </p>
        <button
          onClick={onNeedBusiness}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-full shadow-sm transition cursor-pointer"
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
        <div className="w-14 h-14 rounded-2xl bg-lilac-100 text-brand-700 mx-auto flex items-center justify-center">
          <Trophy className="w-7 h-7" />
        </div>
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
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-700 hover:bg-brand-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
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

  const okCompetitors = competitors.filter((c) => c.status === 'ok');

  return (
    <div className="space-y-6 text-left max-w-6xl">
      {/* Header */}
      <div className="bg-white backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
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
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
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
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5" />
          </div>
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
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {serpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            {serpLoading ? 'Checking…' : 'Check rankings'}
          </button>
        </div>

        {/*
          Show the setup card whenever ranking data is unavailable — including
          after the user clicks "Check rankings", which previously set `serp`
          and hid this notice while rendering no results at all.
        */}
        {serpConfigured === false && !serp?.configured && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Ranking data is not connected yet.</strong>{' '}
            {serp?.message || 'To show real "who ranks above you" results, connect a Google Programmable Search key.'}
            {serp?.query && (
              <>
                {' '}
                The search <em>“{serp.query}”</em> could not be checked.
              </>
            )}
            <ol className="mt-3 space-y-1.5 list-decimal list-inside text-slate-600">
              <li>
                In Google Cloud, enable the{' '}
                <a
                  href="https://console.cloud.google.com/apis/library/customsearch.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Custom Search API
                </a>{' '}
                and create an API key in{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Credentials
                </a>
                .
              </li>
              <li>
                Create a search engine at{' '}
                <a
                  href="https://programmablesearchengine.google.com/controlpanel/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Programmable Search Engine
                </a>{' '}
                and turn on <strong>“Search the entire web”</strong> — otherwise results are
                limited to sites you list, and your own site will never appear.
              </li>
              <li>Copy the search engine ID (the <code>cx</code> value) from that control panel.</li>
              <li>Add both values to <code>.env</code> and restart the server:</li>
            </ol>
            <div className="mt-2 font-mono text-[10px] bg-white rounded-lg border border-slate-200 p-2">
              GOOGLE_SEARCH_API_KEY=your-key
              <br />
              GOOGLE_SEARCH_ENGINE_ID=your-cx
            </div>
            Until then, the competitor score comparison above still works.
          </div>
        )}

        {serp && serp.configured && (
          <div className="space-y-3">
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
