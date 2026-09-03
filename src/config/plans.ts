import { SubscriptionTier } from '../types';

export interface PlanConfig {
  id: SubscriptionTier;
  name: string;
  priceMonthly: number;
  maxPages: number;
  maxBusinesses: number;
  auditFrequency: 'one_time' | 'weekly' | 'daily';
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
    description: 'Single-website snapshot for local business owners.',
    features: [
      '1 Business website',
      'Up to 20 pages crawled',
      '1 Initial baseline audit',
      'Top 5 prioritized fixes',
      'Plain-language copy & meta suggestions',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 9,
    maxPages: 50,
    maxBusinesses: 1,
    auditFrequency: 'weekly',
    auditsAllowed: 10,
    description: 'Continuous weekly tracking & monitoring for growing businesses.',
    features: [
      '1 Business website',
      'Up to 50 pages crawled',
      'Weekly automated re-audits',
      '10 audits per month',
      'Schema markup generator',
      'Competitor ranking cues',
      'Email alerts on score drops',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    priceMonthly: 19,
    maxPages: 200,
    maxBusinesses: 3,
    auditFrequency: 'daily',
    auditsAllowed: 50,
    description: 'Multi-location and agency management for up to 3 businesses.',
    features: [
      'Up to 3 Business profiles',
      'Up to 200 pages crawled per site',
      'Daily/weekly automated crawls',
      '50 audits per month',
      'Multi-business switcher',
      'Exportable client PDF reports',
      'Priority SEO support',
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
        reason: "You've used your free audit. Upgrade to Starter ($9/mo) to continue monitoring this website.",
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
  const currentCount = user.businessCount || 1;

  if (currentCount >= config.maxBusinesses) {
    return {
      allowed: false,
      reason: `Your ${config.name} plan allows up to ${config.maxBusinesses} business${
        config.maxBusinesses > 1 ? 'es' : ''
      }. Upgrade to the Business plan ($19/mo) to manage up to 3 businesses.`,
    };
  }

  return { allowed: true };
}
