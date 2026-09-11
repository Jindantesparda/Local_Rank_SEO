import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';

/**
 * Google Analytics 4 panel.
 *
 * Three states, and the copy is different in each so the user always knows
 * whether a number was measured or merely inferred:
 *
 *   server not configured → renders nothing (no dead end for the user)
 *   configured, not connected → connect flow, with the address to grant access to
 *   connected → measured visitor behaviour for the last 28 days
 */

interface MeasuredSignal {
  id: string;
  title: string;
  likelihood: 'high' | 'medium' | 'low';
  measured: string;
  baseline: string;
  whyItMatters: string;
  suggestedAction: string;
  page?: string;
  sessions: number;
}

interface Summary {
  propertyId: string;
  rangeDays: number;
  fetchedAt: string;
  totals: {
    sessions: number;
    users: number;
    bounceRate: number;
    avgEngagementSeconds: number;
    views: number;
  };
  trend: Array<{ date: string; sessions: number }>;
  topLandingPages: Array<{
    path: string;
    sessions: number;
    bounceRate: number;
    avgEngagementSeconds: number;
  }>;
  channels: Array<{ channel: string; sessions: number; bounceRate: number }>;
  devices: Array<{ device: string; sessions: number; bounceRate: number }>;
}

interface Props {
  businessId: string;
  token?: string | null;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const secs = (v: number) => (v < 60 ? `${v}s` : `${Math.floor(v / 60)}m ${v % 60}s`);

export const AnalyticsPanel: React.FC<Props> = ({ businessId, token }) => {
  const [config, setConfig] = useState<{ configured: boolean; serviceAccountEmail: string | null } | null>(null);
  const [connected, setConnected] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [measured, setMeasured] = useState<{
    headline: string;
    signals: MeasuredSignal[];
    hasEnoughData: boolean;
  } | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);

  const authed = token ? { Authorization: `Bearer ${token}` } : undefined;

  const load = async (refresh = false) => {
    if (!token) return;
    try {
      const cfgRes = await fetch('/api/analytics/config', { headers: authed });
      const cfg = (await cfgRes.json()) as {
        configured: boolean;
        serviceAccountEmail: string | null;
      };
      setConfig(cfg);
      if (!cfg.configured) return;

      const res = await fetch(`/api/analytics/${businessId}${refresh ? '?refresh=1' : ''}`, {
        headers: authed,
      });
      const data = (await res.json()) as {
        connected?: boolean;
        summary?: Summary;
        measured?: { headline: string; signals: MeasuredSignal[]; hasEnoughData: boolean };
        warning?: string;
        error?: string;
      };
      setConnected(Boolean(data.connected && data.summary));
      if (data.summary) setSummary(data.summary);
      if (data.measured) setMeasured(data.measured);
      setWarning(data.warning || data.error || null);
    } catch {
      /* the panel is optional; stay quiet if it cannot load */
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, token]);

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/${businessId}`, {
        method: 'PUT',
        headers: { ...authed, 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: propertyId.trim() }),
      });
      const data = (await res.json()) as { error?: string; connected?: boolean };
      if (!res.ok) throw new Error(data.error || 'Could not connect that property.');
      setShowConnect(false);
      setPropertyId('');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect that property.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await fetch(`/api/analytics/${businessId}`, { method: 'DELETE', headers: authed });
      setConnected(false);
      setSummary(null);
      setMeasured(null);
    } finally {
      setBusy(false);
    }
  };

  // Nothing to offer if the operator has not set up a credential.
  if (!config || !config.configured) return null;

  /* ---------------- Connected: show measured data ---------------- */
  if (connected && summary) {
    const worstPages = [...summary.topLandingPages]
      .filter((p) => p.sessions >= 10)
      .sort((a, b) => b.bounceRate - a.bounceRate)
      .slice(0, 5);

    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 grid place-items-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">What visitors actually did</h3>
              <p className="text-xs text-slate-500 mt-0.5">{measured?.headline}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
            Measured · Google Analytics
          </span>
        </div>

        {warning && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Showing the last successful fetch. {warning}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Sessions', value: summary.totals.sessions.toLocaleString() },
            { label: 'Bounce rate', value: pct(summary.totals.bounceRate) },
            { label: 'Avg. engagement', value: secs(summary.totals.avgEngagementSeconds) },
            { label: 'Visitors', value: summary.totals.users.toLocaleString() },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {stat.label}
              </span>
              <span className="text-lg font-extrabold text-slate-900">{stat.value}</span>
            </div>
          ))}
        </div>

        {worstPages.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2">
              Landing pages, worst bounce rate first
            </h4>
            <div className="space-y-1.5">
              {worstPages.map((page) => {
                const worse = page.bounceRate > summary.totals.bounceRate;
                return (
                  <div
                    key={page.path}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs"
                  >
                    <code className="font-mono text-slate-700 truncate">{page.path}</code>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-400">{page.sessions} sessions</span>
                      <span className="text-slate-400">{secs(page.avgEngagementSeconds)}</span>
                      <span
                        className={`font-bold ${
                          worse ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {pct(page.bounceRate)} bounce
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {measured && measured.signals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700">Measured drop-off signals</h4>
            {measured.signals.map((signal) => (
              <div key={signal.id} className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      signal.likelihood === 'high'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : signal.likelihood === 'medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {signal.likelihood}
                  </span>
                  <h5 className="text-xs font-bold text-slate-900">{signal.title}</h5>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  <strong className="text-slate-800">Measured: </strong>
                  {signal.measured}
                </p>
                <p className="mt-1 text-xs text-slate-500">{signal.baseline}</p>
                <p className="mt-1.5 text-xs text-slate-600">{signal.whyItMatters}</p>
                <p className="mt-1.5 text-xs text-slate-600">
                  <strong className="text-slate-800">What to do: </strong>
                  {signal.suggestedAction}
                </p>
              </div>
            ))}
          </div>
        )}

        {measured && !measured.hasEnoughData && (
          <p className="text-xs text-slate-500">
            As traffic builds, this section starts flagging pages automatically.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => load(true)}
            className="btn btn-outline btn-sm flex items-center gap-1.5"
            id="btn-analytics-refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={disconnect}
            disabled={busy}
            className="btn btn-ghost btn-sm flex items-center gap-1.5"
            id="btn-analytics-disconnect"
          >
            <X className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
          <span className="text-[10px] text-slate-400">
            Property {summary.propertyId} · last {summary.rangeDays} days · fetched{' '}
            {new Date(summary.fetchedAt).toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  /* ---------------- Not connected: offer to connect ---------------- */
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 grid place-items-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">See what visitors actually did</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              The list below is <strong>inferred</strong> from your pages. Connect Google Analytics
              and we can show real bounce rates, engagement time and which pages people leave.
            </p>
          </div>
        </div>
        {!showConnect && (
          <button
            onClick={() => setShowConnect(true)}
            className="btn btn-secondary btn-sm shrink-0"
            id="btn-analytics-connect"
          >
            Connect Analytics
          </button>
        )}
      </div>

      {showConnect && (
        <form onSubmit={connect} className="space-y-3 pt-2 border-t border-slate-100">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-800">Two steps:</p>
            <p>
              1. In Google Analytics open{' '}
              <strong>Admin → Property access management</strong> and add this address as a{' '}
              <strong>Viewer</strong>:
            </p>
            {config.serviceAccountEmail && (
              <code className="block p-2 rounded-lg bg-lilac-50 border border-slate-200 font-mono text-[11px] break-all text-brand-900">
                {config.serviceAccountEmail}
              </code>
            )}
            <p>
              2. Then enter the property ID from <strong>Admin → Property settings</strong> (it is
              all digits):
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              required
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              placeholder="e.g. 123456789"
              className="flex-1 min-w-[12rem] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary btn-md flex items-center gap-2"
              id="btn-analytics-save"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? 'Checking…' : 'Connect'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConnect(false);
                setError(null);
              }}
              className="btn btn-ghost btn-md"
            >
              Cancel
            </button>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            We only ever read data. Your Analytics account is never modified, and no visitor
            identities are stored.
          </p>
        </form>
      )}
    </div>
  );
};

export const MeasuredBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
    <CheckCircle2 className="w-3 h-3" /> Measured
  </span>
);

export const MobileHint: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
    <Smartphone className="w-3 h-3" /> Mobile
  </span>
);
