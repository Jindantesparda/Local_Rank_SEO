/**
 * Centralized plan configuration for Search Vailable
 * Single source of truth for pricing, features, and limits
 */

export type PlanId = 'free' | 'pro' | 'agency';
export type PaymentMethod = 'ecocash' | 'onemoney' | 'card';

export interface PlanConfig {
  id: PlanId;
  name: string;
  positioning: string; // 'UNDERSTAND', 'IMPROVE', 'SCALE'
  description: string;
  price: number; // in USD cents (0 for free)
  currency: string; // 'USD'
  renewalPeriod: number | null; // in days (30 for monthly, null for one-time)
  cta: string; // Call to action button text
  badge?: string; // 'MOST POPULAR' for pro
  features: string[];
  limits: {
    websitesMonitored: number;
    businessesManaged: number;
    monthlyAudits: number;
    crawlDepth: number; // max pages per audit
    monitoringFrequency: string; // 'one-time', 'weekly', 'automated'
    clientManagement: boolean;
    clientReports: boolean;
    prioritySupport: boolean;
  };
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'FREE',
    positioning: 'UNDERSTAND',
    description: "See what's holding your website back.",
    price: 0,
    currency: 'USD',
    renewalPeriod: null,
    cta: 'Run Free Audit',
    features: [
      '1 website audit',
      'SEO score',
      'Top 3 issues',
      'Basic recommendations',
      'Local search overview',
    ],
    limits: {
      websitesMonitored: 0, // No ongoing monitoring
      businessesManaged: 1,
      monthlyAudits: 1,
      crawlDepth: 15,
      monitoringFrequency: 'one-time',
      clientManagement: false,
      clientReports: false,
      prioritySupport: false,
    },
  },

  pro: {
    id: 'pro',
    name: 'GROWTH',
    positioning: 'IMPROVE',
    description: 'Improve your visibility and track your progress.',
    price: 1900, // $19.00 in cents
    currency: 'USD',
    renewalPeriod: 30,
    cta: 'Start Growth',
    badge: 'MOST POPULAR',
    features: [
      'Full SEO audit',
      'Local SEO analysis',
      'Progress tracking',
      'Re-audits',
      'Competitor comparison',
    ],
    limits: {
      websitesMonitored: 1,
      businessesManaged: 1,
      monthlyAudits: 12,
      crawlDepth: 30,
      monitoringFrequency: 'weekly',
      clientManagement: false,
      clientReports: false,
      prioritySupport: false,
    },
  },

  agency: {
    id: 'agency',
    name: 'AGENCY',
    positioning: 'SCALE',
    description: 'Manage local SEO for multiple businesses and clients.',
    price: 7900, // $79.00 in cents
    currency: 'USD',
    renewalPeriod: 30,
    cta: 'For Agencies',
    features: [
      'Up to 10 businesses',
      'Progress monitoring',
      'Generate reports',
      'Competitor comparison',
    ],
    limits: {
      websitesMonitored: 10,
      businessesManaged: 10,
      monthlyAudits: 200,
      crawlDepth: 30,
      monitoringFrequency: 'automated',
      clientManagement: true,
      clientReports: true,
      prioritySupport: true,
    },
  },
};

export function getPlan(id: PlanId): PlanConfig {
  const plan = PLANS[id];
  if (!plan) {
    throw new Error(`Plan not found: ${id}`);
  }
  return plan;
}

export function formatPrice(plan: PlanConfig): string {
  if (plan.price === 0) {
    return 'Free';
  }
  const dollars = (plan.price / 100).toFixed(2);
  return `$${dollars}/month`;
}

export function canUserAuditMore(currentAuditCount: number, plan: PlanConfig): boolean {
  return currentAuditCount < plan.limits.monthlyAudits;
}

export function canUserAddBusiness(
  currentBusinessCount: number,
  plan: PlanConfig
): boolean {
  return currentBusinessCount < plan.limits.businessesManaged;
}

export function canUserMonitorWebsite(
  currentWebsiteCount: number,
  plan: PlanConfig
): boolean {
  return currentWebsiteCount < plan.limits.websitesMonitored;
}
