import React, { useState } from 'react';
import { CheckCircle2, Check } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface BillingViewProps {
  currentTier: SubscriptionTier;
  onSelectTier: (tier: SubscriptionTier) => void;
}

const PLANS: Array<{
  tier: SubscriptionTier;
  name: string;
  phase: string;
  tagline: string;
  price: string;
  blurb: string;
  cta: string;
  features: string[];
  featured?: boolean;
}> = [
  {
    tier: 'free',
    name: 'Free',
    phase: 'Understand',
    tagline: 'See what is holding your website back',
    price: '$0',
    blurb: 'No credit card required',
    cta: 'Analyze My Website',
    features: [
      '1 website audit',
      'SEO score',
      'Top 3 issues',
      'Basic recommendations',
      'Local search visibility overview',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    phase: 'Improve',
    tagline: 'Ongoing visibility management',
    price: '$19',
    blurb: 'Cancel anytime',
    cta: 'Start Pro',
    featured: true,
    features: [
      'Full SEO audit',
      'Local SEO analysis',
      'Progress tracking',
      'Re-audits',
    ],
  },
  {
    tier: 'agency',
    name: 'Agency',
    phase: 'Scale',
    tagline: 'Manage local SEO for every client',
    price: '$79',
    blurb: 'For agencies & local teams',
    cta: 'For Agencies',
    features: [
      'Up to 10 businesses',
      'Progress monitoring',
      'Generate reports',
    ],
  },
];

export const BillingView: React.FC<BillingViewProps> = ({ currentTier, onSelectTier }) => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePlanChange = (tier: SubscriptionTier) => {
    onSelectTier(tier);
    setSuccessMsg(`Successfully updated your subscription to the ${tier.toUpperCase()} plan!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="max-w-5xl space-y-6 text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Plans & Billing</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
          Start with a free audit, then upgrade when you want ongoing visibility management for
          your business — or your clients.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {PLANS.map((plan) => {
          const isActive = currentTier === plan.tier;
          return (
            <div
              key={plan.tier}
              className={`p-6 rounded-2xl bg-white border flex flex-col justify-between transition shadow-sm ${
                plan.featured
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                  : isActive
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                    {plan.phase}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Current Plan
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">{plan.tagline}</p>

                <div className="mt-3 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                  <span className="text-xs text-slate-500 ml-1">/ month</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 text-center">
                <button
                  onClick={() => handlePlanChange(plan.tier)}
                  disabled={isActive}
                  className={`w-full py-2.5 rounded-lg font-semibold text-xs transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 cursor-default border border-indigo-200'
                      : plan.featured
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                      : 'border border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  {isActive ? 'Active' : plan.cta}
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{plan.blurb}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
