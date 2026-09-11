import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Shield,
  FileText,
  MapPin,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCode,
  Copy,
  Check,
  ArrowRight
} from 'lucide-react';
import { AuditResult, SeoIssue } from '../types';
import { Lock } from 'lucide-react';

interface WebsiteAuditViewProps {
  audit: AuditResult;
  userTier?: 'free' | 'pro' | 'agency';
  onOpenFixModal: (issue: SeoIssue) => void;
  onNavigateBilling?: () => void;
}

export const WebsiteAuditView: React.FC<WebsiteAuditViewProps> = ({
  audit,
  userTier = 'free',
  onOpenFixModal,
  onNavigateBilling,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [copiedIssueId, setCopiedIssueId] = useState<string | null>(null);

  const { issues } = audit;

  const filteredIssues = issues.filter((issue) => {
    // Category filter
    if (selectedCategory !== 'all' && issue.category !== selectedCategory) {
      return false;
    }
    // Severity filter
    if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchDesc = issue.description.toLowerCase().includes(q);
      const matchWhy = issue.whyItMatters.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchWhy) return false;
    }
    return true;
  });

  const handleQuickCopy = (issue: SeoIssue) => {
    if (issue.suggestedFix?.recommended) {
      navigator.clipboard.writeText(issue.suggestedFix.recommended);
      setCopiedIssueId(issue.id);
      setTimeout(() => setCopiedIssueId(null), 2000);
    } else {
      navigator.clipboard.writeText(issue.recommendedAction);
      setCopiedIssueId(issue.id);
      setTimeout(() => setCopiedIssueId(null), 2000);
    }
  };

  const getSeverityBadge = (severity: SeoIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Warning
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
            Low
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Passed
          </span>
        );
    }
  };

  const categories = [
    { id: 'all', label: 'All Checks', count: issues.length },
    { id: 'technical', label: 'Technical SEO', count: issues.filter(i => i.category === 'technical').length },
    { id: 'onpage', label: 'On-page SEO', count: issues.filter(i => i.category === 'onpage').length },
    { id: 'local', label: 'Local SEO', count: issues.filter(i => i.category === 'local').length },
    { id: 'content', label: 'Content Depth', count: issues.filter(i => i.category === 'content').length },
  ];

  // Free is a diagnosis: the score plus the top 3 problems.
  // Growth unlocks the full actionable audit.
  const FREE_ISSUE_LIMIT = 3;
  const visibleIssues =
    userTier === 'free' ? filteredIssues.slice(0, FREE_ISSUE_LIMIT) : filteredIssues;
  const lockedCount =
    userTier === 'free' ? Math.max(0, filteredIssues.length - FREE_ISSUE_LIMIT) : 0;

  return (
    <div className="space-y-6">
      {/* Category Pills & Filters - Bento container */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategory === cat.id ? 'bg-indigo-700 text-white' : 'bg-white text-slate-600'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Severity Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 w-44 text-slate-800"
              />
            </div>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">Warning</option>
              <option value="medium">Medium</option>
              <option value="good">Passed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Checks that passed */}
      {audit.goodCount > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <img
            src="/illustrations/approve-circle-256.png"
            alt=""
            width={40}
            height={40}
            className="object-contain shrink-0"
            style={{ width: 40, height: 40 }}
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">
              {audit.goodCount} check{audit.goodCount === 1 ? '' : 's'} passed
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              These are already in good shape — no action needed. Filter by{' '}
              <span className="font-semibold text-slate-700">Passed</span> to review them.
            </p>
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">No issues found matching your filter.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSeverity('all');
                setSearchQuery('');
              }}
              className="mt-3 text-xs text-indigo-600 font-bold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          visibleIssues.map((issue) => {
            const isExpanded = expandedIssueId === issue.id;

            return (
              <div
                key={issue.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition hover:border-slate-300"
              >
                {/* Issue Header */}
                <div
                  onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                  className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="mt-0.5 sm:mt-0">{getSeverityBadge(issue.severity)}</div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                        <span>{issue.title}</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Page: <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{issue.affectedPage}</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {issue.suggestedFix && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFixModal(issue);
                        }}
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition border border-indigo-200"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>View Fix</span>
                      </button>
                    )}

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded 4-Part Plain-English Breakdown in Bento-style cards */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* What's Wrong? */}
                      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1.5">
                          1. What's Wrong?
                        </span>
                        <p className="text-slate-700 leading-relaxed">{issue.description}</p>
                      </div>

                      {/* Why does it matter? */}
                      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1.5">
                          2. Why Does It Matter?
                        </span>
                        <p className="text-slate-700 leading-relaxed">{issue.whyItMatters}</p>
                      </div>

                      {/* What should I do? */}
                      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1.5">
                          3. What Should I Do?
                        </span>
                        <p className="text-slate-700 leading-relaxed">{issue.recommendedAction}</p>
                      </div>
                    </div>

                    {/* Can Search Vailable help me fix it? */}
                    {issue.suggestedFix && (
                      <div className="p-4 bg-white rounded-xl border border-indigo-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                            <Copy className="w-4 h-4 text-brand-700" />
                            4. Suggested Copy-Paste Solution
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {issue.suggestedFix.targetElement}
                          </span>
                        </div>

                        {issue.suggestedFix.current && (
                          <div className="mb-2.5 text-xs">
                            <span className="text-[11px] font-semibold text-slate-500">Current on page:</span>
                            <div className="mt-1 p-2 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-700 break-all border border-slate-200">
                              {issue.suggestedFix.current}
                            </div>
                          </div>
                        )}

                        <div className="text-xs">
                          <span className="text-[11px] font-semibold text-emerald-800">
                            Recommended replacement:
                          </span>
                          <div className="mt-1 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950 font-mono text-xs whitespace-pre-wrap break-all flex items-start justify-between gap-3">
                            <span className="flex-1">{issue.suggestedFix.recommended}</span>
                            <button
                              onClick={() => handleQuickCopy(issue)}
                              className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-indigo-200 shadow-xs transition"
                            >
                              {copiedIssueId === issue.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" /> Copy Fix
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            onClick={() => onOpenFixModal(issue)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            Edit & Customize Fix →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Inferred drop-off analysis — page signals only, never behavioural data */}
        {audit.dropOffAnalysis && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <img
                  src="/illustrations/attention-circle-256.png"
                  alt=""
                  width={48}
                  height={48}
                  className="object-contain shrink-0"
                  style={{ width: 48, height: 48 }}
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Why visitors are likely leaving
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{audit.dropOffAnalysis.summary}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                Inferred · not measured
              </span>
            </div>

            <p className="mt-3 text-[11px] text-slate-500 bg-lilac-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
              {audit.dropOffAnalysis.note}
            </p>

            {audit.dropOffAnalysis.signals.length > 0 && (
              <div className="mt-4 space-y-3">
                {audit.dropOffAnalysis.signals.map((signal) => {
                  const tone =
                    signal.likelihood === 'high'
                      ? { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200' }
                      : signal.likelihood === 'medium'
                        ? { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' }
                        : { dot: 'bg-sky-400', badge: 'bg-lilac-100 text-slate-600 border-slate-200' };

                  return (
                    <div
                      key={signal.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{signal.title}</h4>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tone.badge}`}
                            >
                              {signal.likelihood} likelihood
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                            <strong className="text-slate-800">What we measured: </strong>
                            {signal.evidence}
                          </p>
                          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                            <strong className="text-slate-800">Why it loses visitors: </strong>
                            {signal.whyItMatters}
                          </p>
                          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                            <strong className="text-slate-800">What to do: </strong>
                            {signal.suggestedAction}
                          </p>
                          <p className="mt-2 text-[10px] text-slate-400">
                            Based on: {signal.basedOn}
                            {signal.affectedPages.length > 0 && (
                              <>
                                {' '}
                                · {signal.affectedPages.slice(0, 3).join(', ')}
                                {signal.affectedPages.length > 3
                                  ? ` +${signal.affectedPages.length - 3} more`
                                  : ''}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Upgrade Trigger Banner for Remaining Issues on Free Plan */}
        {userTier === 'free' && lockedCount > 0 && (
          <div
            className="relative overflow-hidden rounded-2xl border border-brand-700/60 shadow-md"
            style={{
              backgroundImage:
                'linear-gradient(100deg, #2a1236 0%, #4b1a66 46%, #7c3aed 100%)',
            }}
          >
            {/* Soft glow behind the illustration */}
            <div
              className="pointer-events-none absolute -left-16 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(196,181,245,0.35) 0%, rgba(124,58,237,0) 70%)',
              }}
            />

            <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
              {/* Illustration */}
              <img
                src="/illustrations/progress-circle-256.png"
                alt=""
                width={88}
                height={88}
                className="w-20 h-20 sm:w-[88px] sm:h-[88px] shrink-0 self-start sm:self-center drop-shadow-xl"
              />

              <div className="flex-1 min-w-0 space-y-1.5">
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.12em] text-lilac-100 bg-white/10 border border-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs">
                  Free Plan Limit • {lockedCount} More Issues Locked
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  You've found the problems. Now track your progress.
                </h4>
                <p className="text-xs text-lilac-200/75 max-w-xl">
                  The recurring value isn't the initial audit. It's ongoing monitoring.
                </p>
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-lilac-200 pt-1">
                  <span className="font-semibold text-white">Growth unlocks:</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lilac-300" /> Full SEO audit
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lilac-300" /> Local SEO analysis
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lilac-300" /> Progress tracking
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lilac-300" /> Re-audits
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lilac-300" /> Competitor comparison
                  </span>
                </div>
              </div>

              {onNavigateBilling && (
                <button
                  onClick={onNavigateBilling}
                  className="btn btn-bright btn-md shrink-0 self-start sm:self-center"
                  id="btn-audit-locked-upgrade"
                >
                  <span>Upgrade to Growth — $19/mo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
