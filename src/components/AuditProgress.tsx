import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Zap, ArrowRight } from 'lucide-react';
import { Business } from '../types';

interface AuditProgressProps {
  business: Business;
  isComplete: boolean;
  error?: string | null;
  isGuest?: boolean;
  onViewResults: () => void;
  onRequestSignUp?: () => void;
  onRetry: () => void;
}

interface StepItem {
  id: string;
  label: string;
  detail: string;
}

const STEPS: StepItem[] = [
  { id: 'connect', label: 'Connecting to website', detail: 'Validating domain SSL & server response' },
  { id: 'discover', label: 'Discovering pages', detail: 'Crawling internal links & sitemap.xml' },
  { id: 'tech', label: 'Checking technical SEO', detail: 'Testing HTTPS, robots.txt & canonical tags' },
  { id: 'content', label: 'Analyzing page content', detail: 'Scanning titles, meta descriptions, H1s & word count' },
  { id: 'local', label: 'Checking local SEO signals', detail: 'Validating location cues, Schema & contact cues' },
  { id: 'issues', label: 'Finding issues', detail: 'Calculating deterministic 100-pt SEO scores' },
  { id: 'ai', label: 'Preparing recommendations', detail: 'Prioritizing Top 5 action plan with recommended fixes' },
];

export const AuditProgress: React.FC<AuditProgressProps> = ({
  business,
  isComplete,
  error,
  isGuest = false,
  onViewResults,
  onRequestSignUp,
  onRetry,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isComplete) {
      setCurrentStepIndex(STEPS.length);
      return;
    }

    if (error) return;

    // Simulate animated step progression while backend runs
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isComplete, error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm text-left">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mb-3">
            <Zap className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {isComplete
              ? 'Your audit is ready!'
              : error
              ? 'Audit encountered an issue'
              : 'Analyzing your website...'}
          </h2>

          <p className="text-sm text-slate-500 mt-1 font-mono">
            {business.website} ({business.location})
          </p>
        </div>

        {/* Error state */}
        {error ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Unable to complete crawl</h4>
                  <p className="mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onRetry}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-sm transition"
              >
                Try Again or Edit URL
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Step list */}
            {STEPS.map((step, idx) => {
              const isDone = isComplete || idx < currentStepIndex;
              const isCurrent = !isComplete && idx === currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-2.5 rounded-xl transition ${
                    isCurrent
                      ? 'bg-indigo-50/70 border border-indigo-200'
                      : isDone
                      ? 'bg-emerald-50/40'
                      : 'opacity-40'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isCurrent ? 'text-indigo-950' : 'text-slate-900'}`}>
                        {step.label}
                      </span>
                      {isDone && (
                        <span className="text-[10px] font-semibold text-emerald-600">✓ Done</span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-semibold text-indigo-600 animate-pulse">Running...</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{step.detail}</p>
                  </div>
                </div>
              );
            })}

            {/* Ready Call-To-Action */}
            {isComplete && (
              <div className="pt-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-3">
                {isGuest ? (
                  <>
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 text-left space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-100/80 px-2 py-0.5 rounded-full">
                        Analysis Complete
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        We've analyzed your website. Your SEO score is ready!
                      </h4>
                      <p className="text-xs text-slate-600">
                        Create your free account to unlock your prioritized SEO action plan and benchmark score.
                      </p>
                    </div>

                    <button
                      onClick={onRequestSignUp || onViewResults}
                      className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      id="btn-gate-create-account"
                    >
                      <span>Create free account to see results →</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onViewResults}
                    className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    id="btn-view-seo-score"
                  >
                    <span>View My SEO Score →</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
