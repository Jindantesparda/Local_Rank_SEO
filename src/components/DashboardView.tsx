import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  ChevronRight,
  Send,
  ArrowUpRight,
  TrendingUp,
  Shield,
  Layers,
  FileText,
  Clock,
  ExternalLink,
  Plus,
  FileCode
} from 'lucide-react';
import { AuditResult, SeoIssue } from '../types';
import { ContinuousSeoTracker } from './ContinuousSeoTracker';

interface DashboardViewProps {
  audit: AuditResult;
  userTier?: 'free' | 'pro' | 'agency';
  userName?: string;
  onOpenAuditModal: () => void;
  onSelectIssue: (issue: SeoIssue) => void;
  onNavigateTab: (tab: 'audit' | 'recommendations' | 'pages' | 'billing') => void;
  onRunNewAudit?: () => void;
  onOpenPageGenerator?: (issue: SeoIssue) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  audit,
  userTier = 'free',
  userName,
  onOpenAuditModal,
  onSelectIssue,
  onNavigateTab,
  onRunNewAudit,
  onOpenPageGenerator,
}) => {
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'popular' | 'top'>('all');
  const [copiedFix, setCopiedFix] = useState(false);
  const [copiedPriorityId, setCopiedPriorityId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  const handleCopyFixItem = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPriorityId(id);
    setTimeout(() => setCopiedPriorityId(null), 2200);
  };
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string }>>([
    { sender: 'ai', text: 'Ask me anything about your audit. I can pull the exact fixes from your report.', time: 'Now' },
  ]);

  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? 'Good morning 👋' : currentHour < 18 ? 'Good afternoon 👋' : 'Good evening 👋';

  const {
    overallScore,
    scoreDiff = 8,
    technicalScore,
    onpageScore,
    localScore,
    contentScore,
    pagesAnalyzed,
    criticalCount,
    warningCount,
    goodCount,
    topPriorities,
    business,
  } = audit;

  const spotlightIssue =
    topPriorities.find((p) => p.suggestedFix) ||
    audit.issues.find((i) => i.suggestedFix) ||
    topPriorities[0];

  const handleCopySpotlight = () => {
    if (spotlightIssue?.suggestedFix?.recommended) {
      navigator.clipboard.writeText(spotlightIssue.suggestedFix.recommended);
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2000);
    } else if (spotlightIssue) {
      onSelectIssue(spotlightIssue);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = { sender: 'user' as const, text: chatInput, time: 'Now' };
    setChatMessages((prev) => [...prev, newMsg]);
    const inputVal = chatInput;
    setChatInput('');

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputVal, audit }),
      });
      const data = await res.json();
      const reply = data.reply || 'Sorry, I could not generate a response. Please try again.';
      setChatMessages((prev) => [...prev, { sender: 'ai', text: reply, time: 'Now' }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Could not reach the SEO copilot. Check your connection and try again.',
          time: 'Now',
        },
      ]);
    }
  };

  // Real score history for the trend chart (only when previous audits exist)
  const auditHistory = audit.auditHistory || [];
  const scoreSeries = [...auditHistory.map((h) => h.score).reverse(), overallScore].slice(-13);
  const chartBars = scoreSeries.map((score) => ({
    height: Math.max(6, Math.min(100, score)),
    color: '#38bdf8',
  }));

  // Pillar cards: percentage of their category maximum
  const pillarCards = [
    { key: 'technical', label: 'Technical SEO', score: technicalScore, max: 25, pct: Math.round((technicalScore / 25) * 100) },
    { key: 'onpage', label: 'On-Page Meta', score: onpageScore, max: 30, pct: Math.round((onpageScore / 30) * 100) },
    { key: 'local', label: 'Local Signals', score: localScore, max: 25, pct: Math.round((localScore / 25) * 100) },
    { key: 'content', label: 'Content Depth', score: contentScore, max: 20, pct: Math.round((contentScore / 20) * 100) },
  ];
  const sortedPillars = [...pillarCards].sort((a, b) => b.pct - a.pct);
  const visiblePillarKeys = new Set(
    collectionFilter === 'all'
      ? sortedPillars.map((p) => p.key)
      : collectionFilter === 'popular'
      ? sortedPillars.slice(0, 2).map((p) => p.key)
      : sortedPillars.slice(0, 1).map((p) => p.key)
  );

  // Coverage rings: passed vs open fixes, derived from the audit
  const totalChecks = Math.max(1, audit.issues.length);
  const passedRatio = goodCount / totalChecks;
  const fixesRatio = Math.max(0, (audit.issues.length - goodCount) / totalChecks);

  return (
    <div className="space-y-6">
      {/* Executive Business & Audit Overview Card (Requirement 7) */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-7 border border-white/90 shadow-sm text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <span className="text-sm font-semibold text-slate-500">{greetingText}</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {business.name}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{business.location}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-600">{business.website}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="bg-slate-50/80 rounded-2xl px-5 py-3 border border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                SEO SCORE
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-extrabold text-slate-900">{overallScore}</span>
                <span className="text-sm font-semibold text-slate-400">/ 100</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center">
                  ↑ {scoreDiff} points
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Last audit: {audit.createdAt || 'September 3, 2026'}
              </span>
            </div>

            <button
              onClick={onRunNewAudit || onOpenAuditModal}
              className="px-5 py-3 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2"
              id="btn-run-new-audit"
            >
              <span>Run New Audit</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 🚨 FIX THESE FIRST (Core Value Engine) */}
        <div className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <h3 className="text-sm font-extrabold tracking-tight text-slate-900 uppercase">
                Fix these first
              </h3>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full">
                Highest Business Impact
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('recommendations')}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View all recommendations</span>
              <span>→</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {topPriorities.slice(0, 3).map((priority, idx) => {
              const isPageIssue =
                priority.actionType === 'generate_page' ||
                priority.title.toLowerCase().includes('missing') ||
                priority.title.toLowerCase().includes('page');
              const isSchemaIssue =
                priority.actionType === 'generate_schema' ||
                priority.title.toLowerCase().includes('schema');
              const isCopyFix =
                priority.actionType === 'copy_fix' ||
                (priority.suggestedFix?.recommended && !isSchemaIssue && !isPageIssue);

              return (
                <div
                  key={priority.id || idx}
                  className="p-5 rounded-2xl bg-slate-50/90 hover:bg-white border border-slate-200/80 hover:border-sky-200 hover:shadow-md transition flex flex-col justify-between space-y-4 text-left group"
                >
                  <div className="space-y-3">
                    {/* Header: Number, Title, Impact badge */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80">
                          Impact: {priority.impact === 'high' ? 'High' : 'Medium'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {priority.title}
                      </h4>
                    </div>

                    {/* Context / Description */}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {priority.description}
                    </p>

                    {/* Business Outcome: Why it matters */}
                    {priority.businessOutcome && (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-950 leading-relaxed font-medium">
                        <span className="font-bold text-amber-900 block mb-0.5">Why it matters:</span>
                        {priority.businessOutcome}
                      </div>
                    )}

                    {/* Competitor Intel */}
                    {priority.competitorContext && (
                      <div className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                        <span className="text-sky-600 font-bold shrink-0">⚡ Competitors:</span>
                        <span>{priority.competitorContext}</span>
                      </div>
                    )}

                    {/* Current vs Recommended preview */}
                    {priority.suggestedFix?.current && (
                      <div className="space-y-1 text-[11px] pt-1">
                        <div className="text-slate-400 font-medium">
                          Current: <span className="font-mono text-slate-700">{priority.suggestedFix.current}</span>
                        </div>
                        {priority.suggestedFix.recommended && !isSchemaIssue && (
                          <div className="text-emerald-700 font-medium">
                            Recommended:{' '}
                            <span className="font-mono text-emerald-950 font-bold">
                              {priority.suggestedFix.recommended}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: [Generate Page], [Copy Fix], [Generate Schema], [View Fix] */}
                  <div className="pt-2 border-t border-slate-200/50">
                    {isPageIssue ? (
                      <button
                        onClick={() =>
                          onOpenPageGenerator ? onOpenPageGenerator(priority) : onSelectIssue(priority)
                        }
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                        id={`btn-generate-page-${idx}`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Page</span>
                      </button>
                    ) : isSchemaIssue ? (
                      <button
                        onClick={() => onSelectIssue(priority)}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                        id={`btn-generate-schema-${idx}`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Generate Schema</span>
                      </button>
                    ) : isCopyFix ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleCopyFixItem(
                              priority.id,
                              priority.suggestedFix?.recommended || priority.recommendedAction
                            )
                          }
                          className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                          id={`btn-copy-fix-${idx}`}
                        >
                          {copiedPriorityId === priority.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-300" />
                              <span>Copy Fix</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => onSelectIssue(priority)}
                          className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectIssue(priority)}
                        className="w-full py-2.5 px-4 bg-white hover:bg-sky-500 hover:text-white text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition shadow-2xs cursor-pointer text-center"
                      >
                        View Fix
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Continuous SEO Evolution & Monthly Tracking Strip */}
      <ContinuousSeoTracker
        audit={audit}
        userTier={userTier}
        onNavigateTab={onNavigateTab}
        onRunAudit={onRunNewAudit || onOpenAuditModal}
      />

      {/* Main Grid: Left 2 Columns + Right Balance/Copilot Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left / Center Workstation (8 cols on xl) */}
        <div className="xl:col-span-8 space-y-6">
          {/* Section 1: "My collection 4 items" Row (Exact visual match to reference image) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                  SEO Pillars
                </h2>
                <span className="text-xs font-medium text-slate-400">4 categories</span>
              </div>

              {/* Filter Pills: All, Popular, Top */}
              <div className="flex items-center gap-1.5 p-1 bg-white/70 backdrop-blur-md rounded-full border border-white/90 shadow-xs">
                {(['all', 'popular', 'top'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCollectionFilter(filter)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition cursor-pointer ${
                      collectionFilter === filter
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* The 4 Iridescent Pastel Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {/* Card 1: Technical SEO */}
              <div
                onClick={() => onNavigateTab('audit')}
                className={`group relative bg-gradient-to-b from-white/90 via-sky-50/60 to-purple-50/40 rounded-3xl p-3.5 border border-white/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center ${
                  visiblePillarKeys.has('technical') ? '' : 'hidden'
                }`}
              >
                {/* Floating pill badge like 24.06 ETH */}
                <div className="self-start mb-2 px-2 py-0.5 rounded-full bg-white/80 border border-sky-100 shadow-2xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span className="text-[10px] font-bold text-slate-700">{technicalScore}/25 PTS</span>
                </div>

                {/* Soft 3D Pastel Orb */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full my-1 p-1 bg-gradient-to-tr from-sky-200 via-blue-100 to-indigo-100 shadow-inner flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-300/30 via-indigo-200/40 to-pink-200/30 rounded-full blur-xs" />
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/75 backdrop-blur-md flex items-center justify-center shadow-xs">
                    <Shield className="w-7 h-7 text-sky-500" />
                  </div>
                </div>

                <div className="mt-2 w-full">
                  <p className="text-xs font-bold text-slate-800 truncate">Technical SEO</p>
                  <p className="text-[11px] font-semibold text-sky-600 mt-0.5">Health {Math.round((technicalScore / 25) * 100)}%</p>
                </div>
              </div>

              {/* Card 2: On-Page SEO */}
              <div
                onClick={() => onNavigateTab('audit')}
                className={`group relative bg-gradient-to-b from-white/90 via-purple-50/60 to-pink-50/40 rounded-3xl p-3.5 border border-white/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center ${
                  visiblePillarKeys.has('onpage') ? '' : 'hidden'
                }`}
              >
                <div className="self-start mb-2 px-2 py-0.5 rounded-full bg-white/80 border border-purple-100 shadow-2xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="text-[10px] font-bold text-slate-700">{onpageScore}/30 PTS</span>
                </div>

                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full my-1 p-1 bg-gradient-to-tr from-purple-200 via-pink-100 to-sky-100 shadow-inner flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-300/30 via-pink-200/40 to-sky-200/30 rounded-full blur-xs" />
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/75 backdrop-blur-md flex items-center justify-center shadow-xs">
                    <FileText className="w-7 h-7 text-purple-500" />
                  </div>
                </div>

                <div className="mt-2 w-full">
                  <p className="text-xs font-bold text-slate-800 truncate">On-Page Meta</p>
                  <p className="text-[11px] font-semibold text-purple-600 mt-0.5">Optimized {Math.round((onpageScore / 30) * 100)}%</p>
                </div>
              </div>

              {/* Card 3: Local Signals */}
              <div
                onClick={() => onNavigateTab('audit')}
                className={`group relative bg-gradient-to-b from-white/90 via-pink-50/60 to-purple-50/40 rounded-3xl p-3.5 border border-white/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center ${
                  visiblePillarKeys.has('local') ? '' : 'hidden'
                }`}
              >
                <div className="self-start mb-2 px-2 py-0.5 rounded-full bg-white/80 border border-pink-100 shadow-2xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  <span className="text-[10px] font-bold text-slate-700">{localScore}/25 PTS</span>
                </div>

                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full my-1 p-1 bg-gradient-to-tr from-pink-200 via-purple-100 to-sky-100 shadow-inner flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-300/30 via-purple-200/40 to-sky-200/30 rounded-full blur-xs" />
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/75 backdrop-blur-md flex items-center justify-center shadow-xs">
                    <TrendingUp className="w-7 h-7 text-pink-500" />
                  </div>
                </div>

                <div className="mt-2 w-full">
                  <p className="text-xs font-bold text-slate-800 truncate">Local Signals</p>
                  <p className="text-[11px] font-semibold text-pink-600 mt-0.5">Reach {Math.round((localScore / 25) * 100)}%</p>
                </div>
              </div>

              {/* Card 4: Content Depth */}
              <div
                onClick={() => onNavigateTab('audit')}
                className={`group relative bg-gradient-to-b from-white/90 via-sky-50/60 to-teal-50/40 rounded-3xl p-3.5 border border-white/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center ${
                  visiblePillarKeys.has('content') ? '' : 'hidden'
                }`}
              >
                <div className="self-start mb-2 px-2 py-0.5 rounded-full bg-white/80 border border-teal-100 shadow-2xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span className="text-[10px] font-bold text-slate-700">{contentScore}/20 PTS</span>
                </div>

                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full my-1 p-1 bg-gradient-to-tr from-teal-200 via-sky-100 to-indigo-100 shadow-inner flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-300/30 via-sky-200/40 to-indigo-200/30 rounded-full blur-xs" />
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/75 backdrop-blur-md flex items-center justify-center shadow-xs">
                    <Layers className="w-7 h-7 text-teal-600" />
                  </div>
                </div>

                <div className="mt-2 w-full">
                  <p className="text-xs font-bold text-slate-800 truncate">Content Depth</p>
                  <p className="text-[11px] font-semibold text-teal-600 mt-0.5">Coverage {Math.round((contentScore / 20) * 100)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Middle Visual Cards (Revenue Statistics & Coverage Concentric Rings) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Chart 1: Revenue statistics style -> "Crawl & Score Trend" (7 cols) */}
            <div className="md:col-span-7 bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-white/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  Crawl & Score Trend
                </h3>
              </div>

              {/* Score Trend Chart — real data only */}
              {chartBars.length > 1 ? (
                <div className="relative pt-2 pb-1">
                  {/* Horizontal guide lines */}
                  <div className="flex flex-col justify-between h-36 text-[10px] text-slate-400 font-medium absolute inset-0 pointer-events-none">
                    <div className="border-b border-slate-100/80 pb-0.5">90%</div>
                    <div className="border-b border-slate-100/80 pb-0.5">60%</div>
                    <div className="border-b border-slate-100/80 pb-0.5">30%</div>
                    <div className="pb-0.5">0%</div>
                  </div>

                  {/* Bars */}
                  <div className="h-36 pl-8 flex items-end justify-between gap-1.5 sm:gap-2">
                    {chartBars.map((bar, idx) => (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                      >
                        <div
                          className="w-full max-w-[14px] rounded-full transition-all duration-500 group-hover:opacity-80"
                          style={{
                            height: `${bar.height}%`,
                            backgroundColor: bar.color,
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* X-axis labels */}
                  <div className="pl-8 pt-2 flex justify-between text-[10px] font-semibold text-slate-400">
                    {chartBars.map((_, idx) => (
                      <span key={idx}>{String(idx + 1).padStart(2, '0')}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-36 flex flex-col items-center justify-center text-center space-y-2 text-xs text-slate-500">
                  <span className="font-bold text-slate-700">No score history yet</span>
                  <span>Run a re-audit after applying fixes to see your trend here.</span>
                </div>
              )}
            </div>

            {/* Chart 2: "Coverage" Concentric Circular Rings (5 cols) */}
            <div className="md:col-span-5 bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-white/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Coverage</h3>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* The Exact Concentric Rings from the reference image */}
              <div className="relative flex items-center justify-center my-2">
                <svg className="w-40 h-40 transform -rotate-90">
                  {/* Outer pink ring track */}
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    stroke="#fce7f3"
                    strokeWidth="14"
                    fill="transparent"
                  />
                  {/* Outer pink ring progress */}
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    stroke="#f472b6"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 68}
                    strokeDashoffset={2 * Math.PI * 68 * (1 - fixesRatio)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />

                  {/* Inner cyan ring track */}
                  <circle
                    cx="80"
                    cy="80"
                    r="48"
                    stroke="#e0f2fe"
                    strokeWidth="14"
                    fill="transparent"
                  />
                  {/* Inner cyan ring progress */}
                  <circle
                    cx="80"
                    cy="80"
                    r="48"
                    stroke="#38bdf8"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - passedRatio)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* Center Percentage Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-slate-800 tracking-tight">
                    {overallScore}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Score</span>
                </div>
              </div>

              {/* Legend with pastel dots */}
              <div className="flex items-center justify-center gap-5 pt-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                  <span>Passed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f472b6]" />
                  <span>Fixes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Smart Fix Spotlight & Priority Action List */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-white/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Priority Action Items</h3>
                <p className="text-xs text-slate-400">
                  Issues with the highest immediate impact on your local visibility
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('audit')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View all {audit.issues.length}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {topPriorities.slice(0, 3).map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => onSelectIssue(issue)}
                  className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-sky-50/50 border border-slate-100 hover:border-sky-200/60 transition cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        issue.severity === 'critical'
                          ? 'bg-rose-100 text-rose-500'
                          : issue.severity === 'warning'
                          ? 'bg-amber-100 text-amber-500'
                          : 'bg-sky-100 text-sky-500'
                      }`}
                    >
                      {issue.severity === 'critical' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-sky-700 transition">
                        {issue.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{issue.whyItMatters}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIssue(issue);
                    }}
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-sky-500 hover:text-white text-slate-600 font-bold text-xs border border-slate-200/80 hover:border-sky-500 transition shadow-2xs shrink-0 cursor-pointer"
                  >
                    Fix Issue →
                  </button>
                </div>
              ))}
            </div>

            {/* Upgrade Banner for Free Plan */}
            {userTier === 'free' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/30 text-sky-300 px-2 py-0.5 rounded border border-sky-400/30">
                      Free Plan • 5 Issues Unlocked
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    You've found the problems. Now track your progress.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    The recurring value isn't the initial audit. It's ongoing weekly monitoring.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('billing')}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-full shadow-sm whitespace-nowrap transition cursor-pointer shrink-0 text-center"
                  id="btn-dashboard-upgrade-pro"
                >
                  Start Monitoring — $19/mo →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: "You balance $4,592.24" style & Copilot (4 cols on xl) */}
        <div className="xl:col-span-4 space-y-5">
          {/* Card 1: Balance Card -> "Overall Health Score" */}
          <div className="bg-white/85 backdrop-blur-md rounded-3xl p-5 border border-white/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Overall SEO Score</span>
              <span className="cursor-pointer hover:text-slate-600">•••</span>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1">
                <span>{overallScore}</span>
                <span className="text-lg font-medium text-slate-400">/ 100</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Total Checks</span>
                <span className="font-bold text-sky-600 flex items-center gap-0.5">
                  ▲ +{scoreDiff}% vs initial
                </span>
              </div>
            </div>

            <button
              onClick={onOpenAuditModal}
              className="w-full py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-200/80 shadow-2xs hover:shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              id="btn-dashboard-top-up-score"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Run Live Re-Audit</span>
            </button>
          </div>

          {/* Card 2: "Trending Creator" style -> "High Priority Checks" */}
          <div className="bg-white/85 backdrop-blur-md rounded-3xl p-5 border border-white/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>High Priority Checks</span>
              <button
                onClick={() => onNavigateTab('recommendations')}
                className="text-slate-400 hover:text-slate-600 font-medium"
              >
                ›
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Item 1 */}
              <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition cursor-pointer">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-pink-300 to-purple-300 shrink-0">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-xs text-purple-600">
                      H1
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">Title & H1 Match</p>
                    <p className="text-[10px] text-slate-400">Local relevance</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-800">+15 pts</p>
                  <p className="text-[10px] text-slate-400">Impact</p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition cursor-pointer">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-sky-300 to-indigo-300 shrink-0">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-xs text-sky-600">
                      JSON
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">LocalBusiness Schema</p>
                    <p className="text-[10px] text-slate-400">Knowledge Graph</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-800">+20 pts</p>
                  <p className="text-[10px] text-slate-400">Impact</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: SEO Assistant */}
          <div className="bg-white/85 backdrop-blur-md rounded-3xl p-5 border border-white/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <div className="flex items-center gap-1.5">
                <span>SEO Copilot</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer">✕</span>
            </div>

            {/* Chat Bubble Thread */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-tr-xs'
                        : 'bg-purple-50/80 text-purple-950 border border-purple-100 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Chat Input Pill */}
            <form onSubmit={handleSendChat} className="relative pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your audit..."
                className="w-full pl-3.5 pr-9 py-2 bg-slate-50/90 border border-slate-200/80 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-2.5 w-6 h-6 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center transition cursor-pointer"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
