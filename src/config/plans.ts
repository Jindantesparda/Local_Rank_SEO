import { SubscriptionTier } from '../types';

export interface PlanConfig {
  id: SubscriptionTier;
  name: string;
  priceMonthly: number;
  maxPages: number;
  maxBusinesses: number;
  auditFrequency: 'one_time' | 'monthly' | 'weekly' | 'daily';
  auditsAllowed: number;
  description: string;
  features: string[];
}

export const PLAN_CONFIGS: Record<SubscriptionTier, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    maxPages: 20,
    maxBusinesses: 1,
    auditFrequency: 'one_time',
    auditsAllowed: 1,
    description: 'A single snapshot of your local SEO health.',
    features: [
      '1 website audit',
      'SEO score',
      'Top 3 issues',
      'Basic recommendations',
      'Local search visibility overview',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 19,
    maxPages: 100,
    maxBusinesses: 1,
    auditFrequency: 'weekly',
    auditsAllowed: 12,
    description: 'Ongoing local visibility management for a growing business.',
    features: [
      '1 website monitored',
      'Full SEO audit',
      'Local SEO analysis',
      'Progress tracking',
      'Re-audits',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    priceMonthly: 79,
    maxPages: 300,
    maxBusinesses: 10,
    auditFrequency: 'daily',
    auditsAllowed: 200,
    description: 'Manage local SEO for every client in one place.',
    features: [
      'Up to 10 businesses',
      'Progress monitoring',
      'Generate reports',
    ],
  },
};

export function canUserRunAudit(user: {
  subscriptionTier?: SubscriptionTier;
  usage?: { auditsUsed: number };
}): { allowed: boolean; reason?: string } {
  const tier = user.subscriptionTier || 'free';
  const config = PLAN_CONFIGS[tier];
  const auditsUsed = user.usage?.auditsUsed || 0;

  if (auditsUsed >= config.auditsAllowed) {
    if (tier === 'free') {
      return {
        allowed: false,
        reason: "You've used your free audit. Upgrade to Pro ($19/mo) to keep monitoring this website.",
      };
    }
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${config.auditsAllowed} audits on the ${config.name} plan.`,
    };
  }

  return { allowed: true };
}

export function canUserAddBusiness(user: {
  subscriptionTier?: SubscriptionTier;
  businessCount?: number;
}): { allowed: boolean; reason?: string } {
  const tier = user.subscriptionTier || 'free';
  const config = PLAN_CONFIGS[tier];
  const currentCount = user.businessCount || 0;

  if (currentCount >= config.maxBusinesses) {
    return {
      allowed: false,
      reason: `Your ${config.name} plan allows up to ${config.maxBusinesses} business${
        config.maxBusinesses > 1 ? 'es' : ''
      }. Upgrade to the Agency plan ($79/mo) to manage up to 10 businesses.`,
    };
  }

  return { allowed: true };
}
