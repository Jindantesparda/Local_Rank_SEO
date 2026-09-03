import React from 'react';
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
  userTier?: 'free' | 'starter' | 'business';
  onNavigateTab: (tab: 'audit' | 'recommendations' | 'pages' | 'billing') => void;
  onRunAudit: () => void;
}

export const ContinuousSeoTracker: React.FC<ContinuousSeoTrackerProps> = ({
  audit,
  userTier = 'free',
  onNavigateTab,
  onRunAudit,
}) => {
  const history = audit.auditHistory || [];
  const latest = history[0];
  const isPaidPlan = userTier === 'starter' || userTier === 'business';
  const city = audit.business.location.split(',')[0].trim();

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-7 border border-white/90 shadow-sm text-left space-y-5">
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
              {isPaidPlan ? 'Automated Tracking' : 'Audit Frequency'}
            </span>
            <span className="text-xs font-bold text-slate-700 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-sky-500" />
              <span>{isPaidPlan ? 'Next crawl scheduled automatically' : 'Manual re-audit only'}</span>
            </span>
          </div>

          {!isPaidPlan && (
            <button
              onClick={() => onNavigateTab('billing')}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              Enable Weekly Crawls
            </button>
          )}
        </div>
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
                      className="p-3 rounded-xl bg-white/90 border border-emerald-100 text-xs text-slate-800 flex items-start gap-2.5 shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-bold text-slate-900">{item}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-white/90 border border-emerald-100 text-xs text-slate-600 shadow-2xs">
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
                      className="p-3 rounded-xl bg-white/90 border border-sky-100 text-xs text-slate-800 flex items-start gap-2.5 shadow-2xs"
                    >
                      <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{item}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-white/90 border border-sky-100 text-xs text-slate-600 shadow-2xs">
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
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
