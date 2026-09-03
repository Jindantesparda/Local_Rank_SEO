import React, { useState } from 'react';
import { CheckCircle2, Zap, Shield, Sparkles, Check } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface BillingViewProps {
  currentTier: SubscriptionTier;
  onSelectTier: (tier: SubscriptionTier) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ currentTier, onSelectTier }) => {
  const [activeTier, setActiveTier] = useState<SubscriptionTier>(currentTier);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePlanChange = (tier: SubscriptionTier) => {
    setActiveTier(tier);
    onSelectTier(tier);
    setSuccessMsg(`Successfully updated your subscription to the ${tier.toUpperCase()} plan!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="max-w-4xl space-y-6 text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Start Free. Grow Your Google Visibility.</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
          Get a free SEO audit, then upgrade when you want ongoing monitoring, deeper analysis and actionable recommendations.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {/* Free Plan: Understand */}
        <div className={`p-6 rounded-2xl bg-white border flex flex-col justify-between transition shadow-sm ${
          activeTier === 'free' ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-slate-200 hover:border-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                Phase 1: Understand
              </span>
              {activeTier === 'free' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Current Plan
                </span>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-lg">Free</h3>
            <p className="text-xs text-slate-600 mt-1 font-medium">See what's holding your website back</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Find your biggest SEO problems.</p>

            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-extrabold text-slate-900">$0</span>
              <span className="text-xs text-slate-500 ml-1">/ month</span>
            </div>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>1 free SEO audit</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Up to 20 pages crawled</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>SEO score</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Top 5 issues</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Basic recommendations</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => handlePlanChange('free')}
              disabled={activeTier === 'free'}
              className={`w-full py-2.5 rounded-lg font-semibold text-xs transition ${
                activeTier === 'free'
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'border border-slate-300 hover:bg-slate-50 text-slate-800'
              }`}
            >
              {activeTier === 'free' ? 'Active' : 'Downgrade to Free'}
            </button>
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">No credit card required</p>
          </div>
        </div>

        {/* Starter Plan: Improve */}
        <div className={`p-6 rounded-2xl bg-white border-2 flex flex-col justify-between transition shadow-md relative ${
          activeTier === 'starter'
            ? 'border-indigo-600 ring-2 ring-indigo-600/20'
            : 'border-indigo-600 ring-4 ring-indigo-50/70 hover:border-indigo-700'
        }`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] uppercase tracking-wider font-bold px-3 py-0.5 rounded-full">
            Most Popular
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                Phase 2: Improve
              </span>
              {activeTier === 'starter' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Current Plan
                </span>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-lg">Starter</h3>
            <p className="text-xs text-indigo-700 mt-1 font-semibold">For businesses serious about SEO</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Monitor your website and track progress.</p>

            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-extrabold text-slate-900">$9</span>
              <span className="text-xs font-medium text-slate-500 ml-1">/ month</span>
            </div>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>1 website monitored</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Up to 50 pages crawled</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Full SEO audit</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Detailed recommendations</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 font-medium text-slate-900" />
                <span className="font-medium text-slate-900">Weekly SEO monitoring</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Audit history & progress tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>SEO issue alerts</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-3 border-t border-indigo-100 text-center">
            <button
              onClick={() => handlePlanChange('starter')}
              disabled={activeTier === 'starter'}
              className={`w-full py-2.5 rounded-lg font-semibold text-xs transition ${
                activeTier === 'starter'
                  ? 'bg-indigo-50 text-indigo-700 cursor-default border border-indigo-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              {activeTier === 'starter' ? 'Active' : 'Start Monitoring — $9/mo'}
            </button>
            <p className="text-[10px] text-indigo-600/80 mt-1.5 font-medium">Cancel anytime • 7-day money-back</p>
          </div>
        </div>

        {/* Business Plan: Grow */}
        <div className={`p-6 rounded-2xl bg-white border flex flex-col justify-between transition shadow-sm ${
          activeTier === 'business' ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-slate-200 hover:border-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                Phase 3: Grow
              </span>
              {activeTier === 'business' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Current Plan
                </span>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-lg">Business</h3>
            <p className="text-xs text-slate-600 mt-1 font-medium">For growing businesses & multiple sites</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Monitor multiple sites and get deeper insights.</p>

            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-extrabold text-slate-900">$19</span>
              <span className="text-xs font-medium text-slate-500 ml-1">/ month</span>
            </div>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>3 websites monitored</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Up to 200 pages per website</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Full SEO audits</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Advanced schema & content analysis</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 font-medium text-slate-900" />
                <span className="font-medium text-slate-900">Daily SEO monitoring</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 font-medium text-indigo-700" />
                <span className="font-medium text-indigo-700">Competitor insights</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Priority email support</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => handlePlanChange('business')}
              disabled={activeTier === 'business'}
              className={`w-full py-2.5 rounded-lg font-semibold text-xs transition ${
                activeTier === 'business'
                  ? 'bg-indigo-50 text-indigo-700 cursor-default border border-indigo-200'
                  : 'border border-slate-300 hover:bg-slate-50 text-slate-800'
              }`}
            >
              {activeTier === 'business' ? 'Active' : 'Choose Business — $19/mo'}
            </button>
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">For agencies & active businesses</p>
          </div>
        </div>
      </div>

      {/* Tiny Comparison Below Cards */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          Every plan includes
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs text-slate-800">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> SEO score
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Technical SEO analysis
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> On-page SEO analysis
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Local SEO analysis
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Actionable recommendations
          </span>
        </div>
        <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-semibold text-slate-900">
            Paid plans add ongoing monitoring, deeper crawling and historical tracking.
          </span>
          <span className="text-[11px] text-slate-400">
            Cancel anytime with zero lock-in.
          </span>
        </div>
      </div>
    </div>
  );
};
