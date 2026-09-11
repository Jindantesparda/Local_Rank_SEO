import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  ChevronRight,
  RefreshCw,
  Zap
} from 'lucide-react';
import { AuditResult } from '../types';

interface ContinuousSeoTrackerProps {
  audit: AuditResult;
  userTier?: 'free' | 'pro' | 'agency';
  onNavigateTab: (tab: 'audit' | 'recommendations' | 'pages' | 'billing') => void;
  onRunAudit: () => void;
  token?: string | null;
}

interface MonitorStatus {
  enabled: boolean;
  frequencyDays: number;
  frequencyLabel: string;
  monthlyAllowance: number;
  usedThisPeriod: number;
  businesses: Array<{
    businessId: string;
    lastCheckedAt: string | null;
    nextDueAt: string | null;
    lastScore: number | null;
    lastError?: string | null;
  }>;
}

export const ContinuousSeoTracker: React.FC<ContinuousSeoTrackerProps> = ({
  audit,
  userTier = 'free',
  onNavigateTab,
  onRunAudit,
  token,
}) => {
  const history = audit.auditHistory || [];
  const latest = history[0];
  const isPaidPlan = userTier === 'pro' || userTier === 'agency';
  const city = audit.business.location.split(',')[0].trim();

  const [monitor, setMonitor] = useState<MonitorStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkNote, setCheckNote] = useState<string | null>(null);

  const loadMonitorStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/monitor/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMonitor((await res.json()) as MonitorStatus);
    } catch {
      /* status is advisory only */
    }
  };

  useEffect(() => {
    loadMonitorStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, audit.businessId]);

  const runCheckNow = async () => {
    if (!token) return;
    setChecking(true);
    setCheckNote(null);
    try {
      const res = await fetch('/api/monitor/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        error?: string;
        results?: Array<{ status: string; businessName: string }>;
      };
      if (!res.ok) throw new Error(data.error || 'Could not run a check.');

      const checked = (data.results || []).filter((r) => r.status === 'checked');
      const skipped = (data.results || []).filter((r) => r.status === 'skipped');
      const failed = (data.results || []).filter((r) => r.status === 'error');

      if (checked.length) {
        setCheckNote(`Checked ${checked.length} site${checked.length === 1 ? '' : 's'}. Reload the dashboard to see the new audit.`);
      } else if (skipped.length) {
        setCheckNote(skipped[0] ? 'Not due yet, or this plan\'s monthly allowance is used up.' : 'Nothing to check.');
      } else if (failed.length) {
        setCheckNote('The check could not reach the site.');
      } else {
        setCheckNote('Nothing was due for a check right now.');
      }
      await loadMonitorStatus();
    } catch (err) {
      setCheckNote(err instanceof Error ? err.message : 'Could not run a check.');
    } finally {
      setChecking(false);
    }
  };

  const myMonitor = monitor?.businesses?.find((b) => b.businessId === audit.businessId) || null;

  const relative = (iso?: string | null) => {
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60000);
    if (Math.abs(mins) < 60) return `${Math.max(1, mins)} min ago`;
    const hours = Math.round(mins / 60);
    if (Math.abs(hours) < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  const dueRelative = (iso?: string | null) => {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 'due now';
    const hours = Math.round(diff / 3600000);
    if (hours < 24) return `in ${Math.max(1, hours)} hour${hours === 1 ? '' : 's'}`;
    const days = Math.round(hours / 24);
    return `in ${days} day${days === 1 ? '' : 's'}`;
  };

  return (
    <div className="bg-white backdrop-blur-xl rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm text-left space-y-5">
      {/* Header with Continuous Badge & Automated Crawl Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Continuous SEO Evolution
            </span>
            {latest && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {history.length} previous audit{history.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            SEO isn't a one-time check. Here is your real momentum:
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {isPaidPlan ? 'Automated monitoring' : 'Audit frequency'}
            </span>
            <span className="text-xs font-bold text-slate-700 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-sky-500" />
              {isPaidPlan ? (
                <span>
                  {myMonitor?.lastCheckedAt
                    ? `Last checked ${relative(myMonitor.lastCheckedAt)} · next ${dueRelative(myMonitor.nextDueAt)}`
                    : monitor
                      ? `Checks run every ${monitor.frequencyDays} day${monitor.frequencyDays === 1 ? '' : 's'} — first check pending`
                      : 'Automated checks enabled'}
                </span>
              ) : (
                <span>Manual re-audit only</span>
              )}
            </span>
          </div>

          {!isPaidPlan ? (
            <button
              onClick={() => onNavigateTab('billing')}
              className="btn btn-primary btn-sm"
            >
              Enable automated checks
            </button>
          ) : (
            <button
              onClick={runCheckNow}
              disabled={checking}
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
              id="btn-monitor-check-now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking…' : 'Check now'}</span>
            </button>
          )}
        </div>
      </div>

      {checkNote && (
        <div className="p-3 rounded-xl bg-lilac-50 border border-slate-200 text-xs text-slate-700">
          {checkNote}
        </div>
      )}

      {myMonitor?.lastError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          Last scheduled check could not complete: {myMonitor.lastError}
        </div>
      )}

      {/* Progress illustration banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-lilac-50">
        <img
          src="/illustrations/progress-banner.jpg"
          alt="Illustration: fixing issues raises your score and improves local visibility"
          className="w-full object-cover object-[center_40%]"
          style={{ aspectRatio: '16 / 7' }}
        />
      </div>

      {latest ? (
        <>
          {/* 4-Stat Transformation Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Metric 1: Score Progression */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200/70 space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                SCORE PROGRESSION
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
                  {latest.score} → {audit.overallScore}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  {audit.overallScore - latest.score >= 0 ? '+' : ''}
                  {audit.overallScore - latest.score} pts
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/80">Since your previous audit</p>
            </div>

            {/* Metric 2: Fixed Since Last Audit */}
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>RESOLVED FIXES</span>
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {latest.fixedCount} fixed
              </div>
              <p className="text-[11px] text-slate-500">
                {latest.fixedItems?.[0] || 'Issues no longer present in the latest crawl'}
              </p>
            </div>

            {/* Metric 3: New Issues Detected */}
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>NEW DETECTED</span>
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-900">
                {latest.newIssuesCount} alert{latest.newIssuesCount === 1 ? '' : 's'}
              </div>
              <p className="text-[11px] text-slate-500">New issues found in the latest crawl</p>
            </div>

            {/* Metric 4: New Pages Crawled */}
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                <FileText className="w-3 h-3 text-sky-500" />
                <span>PAGE COUNT</span>
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {latest.newPagesCount >= 0 ? '+' : ''}
                {latest.newPagesCount} pages
              </div>
              <p className="text-[11px] text-slate-500">Pages analyzed vs previous audit</p>
            </div>
          </div>

          {/* Two Comparison Columns: "What You Fixed" vs "Next Priorities" */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Left: What was successfully resolved */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Resolved Since Last Audit ({latest.fixedItems.length})</span>
                </h3>
              </div>

              <div className="space-y-2">
                {latest.fixedItems.length > 0 ? (
                  latest.fixedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-emerald-100 text-xs text-slate-800 flex items-start gap-2.5 shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-bold text-slate-900">{item}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-white border border-emerald-100 text-xs text-slate-600 shadow-2xs">
                    No previously open issues were resolved in this crawl. Keep applying the
                    recommended fixes and re-audit.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Your Next Priorities */}
            <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/40 border border-sky-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-sky-600" />
                  <span>Next 3 Priorities to Improve</span>
                </h3>
                <button
                  onClick={() => onNavigateTab('recommendations')}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  View Plan →
                </button>
              </div>

              <div className="space-y-2">
                {latest.nextPriorities.length > 0 ? (
                  latest.nextPriorities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-sky-100 text-xs text-slate-800 flex items-start gap-2.5 shadow-2xs"
                    >
                      <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{item}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-white border border-sky-100 text-xs text-slate-600 shadow-2xs">
                    No open priorities. Great work — keep an eye on new content.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Honest empty state for first-time audits */
        <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/70 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-slate-400 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              No previous audits for {audit.business.name} yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto">
              Your baseline score is {audit.overallScore}/100. Run a re-audit after applying fixes
              and this tracker will show your real score progression, resolved issues, and new
              priorities for {city}.
            </p>
          </div>
          <button
            onClick={onRunAudit}
            className="btn btn-primary btn-sm inline-flex items-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Run Re-Audit</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
