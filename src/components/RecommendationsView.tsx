import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  Edit3,
  FileCode,
  Layers,
  MapPin,
  ArrowRight,
  Info,
  Globe
} from 'lucide-react';
import { AuditResult, SeoIssue, SuggestedFix } from '../types';

interface RecommendationsViewProps {
  audit: AuditResult;
  onOpenFixModal: (issue: SeoIssue) => void;
  onOpenPageGenerator?: (issue: SeoIssue) => void;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  audit,
  onOpenFixModal,
  onOpenPageGenerator,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { topPriorities, aiRecommendations = [], business } = audit;

  // All actionable items: either copy-fixable, schema, or page generator
  const actionableIssues = audit.issues.filter(
    (i) => i.suggestedFix !== undefined || i.actionType === 'generate_page' || i.pageDraft !== undefined
  );

  const filteredFixes = actionableIssues.filter((issue) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pages' && (issue.actionType === 'generate_page' || issue.pageDraft !== undefined)) return true;
    if (activeFilter === 'title' && issue.suggestedFix?.type === 'title') return true;
    if (activeFilter === 'meta' && issue.suggestedFix?.type === 'metaDescription') return true;
    if (activeFilter === 'schema' && (issue.suggestedFix?.type === 'schema' || issue.actionType === 'generate_schema')) return true;
    if (activeFilter === 'alt' && issue.suggestedFix?.type === 'altText') return true;
    return false;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Bento card style */}
      <div className="bg-indigo-950 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-indigo-900/80">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/70 border border-indigo-800 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Action Engine</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Prioritized Recommendations & Business Actions
          </h2>
          <p className="text-xs text-indigo-200/90 mt-2 leading-relaxed">
            Every action is translated into business impact for {business.name} in {business.location}.
            We supply the exact copy, code, and entire page drafts—no SEO jargon or theory required.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`text-xs font-medium px-3.5 py-2 rounded-lg transition cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Actions ({actionableIssues.length})
        </button>
        <button
          onClick={() => setActiveFilter('pages')}
          className={`text-xs font-medium px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'pages'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3 h-3 text-sky-500" />
          <span>Pages to Create</span>
        </button>
        <button
          onClick={() => setActiveFilter('title')}
          className={`text-xs font-medium px-3.5 py-2 rounded-lg transition cursor-pointer ${
            activeFilter === 'title'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Title Tags
        </button>
        <button
          onClick={() => setActiveFilter('meta')}
          className={`text-xs font-medium px-3.5 py-2 rounded-lg transition cursor-pointer ${
            activeFilter === 'meta'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Meta Descriptions
        </button>
        <button
          onClick={() => setActiveFilter('schema')}
          className={`text-xs font-medium px-3.5 py-2 rounded-lg transition cursor-pointer ${
            activeFilter === 'schema'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          LocalBusiness Schema
        </button>
      </div>

      {/* Actionable Recommendations Grid */}
      <div className="space-y-4">
        {filteredFixes.map((issue) => {
          const isPageAction = issue.actionType === 'generate_page' || issue.pageDraft !== undefined;
          const fix = issue.suggestedFix;
          const isSchema = fix?.type === 'schema' || issue.actionType === 'generate_schema';

          return (
            <div
              key={issue.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 transition hover:border-slate-300 space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isPageAction
                      ? 'bg-sky-100 text-sky-700'
                      : isSchema
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {isPageAction ? (
                      <Globe className="w-4 h-4" />
                    ) : isSchema ? (
                      <FileCode className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{issue.title}</h3>
                    <p className="text-xs text-slate-500">
                      Target:{' '}
                      <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {issue.affectedPage}
                      </code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                    {issue.impact === 'high' ? 'High Impact Fix' : 'Medium Impact'}
                  </span>
                  <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {issue.difficulty === 'easy' ? 'Takes 5 mins' : 'Takes 15 mins'}
                  </span>
                </div>
              </div>

              {/* Context / Business Translation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-900 block mb-1">Business Context:</span>
                  <p className="text-slate-600 leading-relaxed">{issue.description}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80">
                  <span className="font-bold text-amber-950 block mb-1">Why Google Cares (Business Outcome):</span>
                  <p className="text-amber-900 leading-relaxed font-medium">
                    {issue.businessOutcome || issue.whyItMatters}
                  </p>
                </div>
              </div>

              {/* Competitor Intel */}
              {issue.competitorContext && (
                <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200/70 text-xs text-sky-950 flex items-center gap-2">
                  <span className="font-bold text-sky-700 shrink-0">⚡ Competitor Opportunity:</span>
                  <span>{issue.competitorContext}</span>
                </div>
              )}

              {/* Page Generator Specific Box */}
              {isPageAction ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Suggested Page: <span className="text-sky-700 font-mono">{issue.pageDraft?.suggestedSlug || '/dedicated-service-page'}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Targeting <strong className="text-slate-800">{issue.pageDraft?.serviceKeyword || 'high-intent keywords'}</strong> in {business.location}.
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenPageGenerator && onOpenPageGenerator(issue)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
                    id={`btn-draft-page-${issue.id}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Draft Page</span>
                  </button>
                </div>
              ) : fix ? (
                /* Code / Copy Fix Box */
                <div className="space-y-3">
                  {fix.current && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Current on website:
                      </span>
                      <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl text-xs font-mono text-rose-950 break-all">
                        {fix.current}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Recommended LocalRank Replacement:
                      </span>
                      {fix.targetElement && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Target: {fix.targetElement}
                        </span>
                      )}
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        isSchema
                          ? 'bg-slate-950 border-slate-800 text-emerald-400'
                          : 'bg-emerald-50/70 border-emerald-200 text-slate-900'
                      }`}
                    >
                      <pre className="font-mono text-xs whitespace-pre-wrap break-all overflow-x-auto">
                        {fix.recommended}
                      </pre>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500">
                      Click Copy Fix and paste directly into your CMS (WordPress, Squarespace, Wix, Shopify).
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenFixModal(issue)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Before Copying</span>
                      </button>

                      <button
                        onClick={() => handleCopy(issue.id, fix.recommended)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition cursor-pointer"
                        id={`btn-copy-rec-${issue.id}`}
                      >
                        {copiedId === issue.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Fix</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

