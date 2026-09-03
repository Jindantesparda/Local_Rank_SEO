export type IssueCategory = 'technical' | 'onpage' | 'local' | 'content';
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'good';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ImpactLevel = 'high' | 'medium' | 'low';

export interface Business {
  id: string;
  userId?: string;
  name: string;
  website: string;
  location: string;
  category: string;
  description: string;
  services: string[];
  createdAt: string;
}

export interface CrawledPage {
  id: string;
  url: string;
  path: string;
  statusCode: number;
  title: string;
  metaDescription: string;
  h1: string;
  h2s: string[];
  wordCount: number;
  images: { src: string; alt: string }[];
  missingAltCount: number;
  internalLinks: string[];
  externalLinks: string[];
  canonical: string;
  robotsDirectives: string;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  hasClickToCall?: boolean;
  loadTimeMs?: number;
  issueCount?: number;
}

export interface SuggestedFix {
  type: 'title' | 'metaDescription' | 'altText' | 'schema' | 'content' | 'code';
  current?: string;
  recommended: string;
  language?: string;
  targetElement?: string;
}

export interface SeoIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  affectedPage: string;
  whyItMatters: string;
  recommendedAction: string;
  difficulty: DifficultyLevel;
  impact: ImpactLevel;
  priorityScore: number;
  businessOutcome?: string; // e.g. "Google may not understand what this page is about"
  competitorContext?: string; // e.g. "Three important competitors have dedicated pages for this service"
  actionType?: 'generate_page' | 'copy_fix' | 'generate_schema' | 'edit_fix';
  pageDraft?: PageDraft;
  suggestedFix?: SuggestedFix;
  status?: 'open' | 'fixed' | 'dismissed';
}

export interface PageDraft {
  serviceKeyword: string;
  targetLocation: string;
  suggestedSlug: string;
  title: string;
  metaDescription: string;
  h1: string;
  h2s: string[];
  contentSections: {
    heading: string;
    body: string;
  }[];
  callToAction: string;
  schemaMarkup: string;
}

export interface AuditHistoryEntry {
  date: string;
  score: number;
  scoreDiff: number;
  fixedCount: number;
  fixedItems: string[];
  newIssuesCount: number;
  newPagesCount: number;
  nextPriorities: string[];
}

export interface AiRecommendation {
  id: string;
  issueId: string;
  problem: string;
  explanation: string;
  whyItMatters: string;
  recommendedSolution: string;
  suggestedCopy?: string;
  expectedImpact: string;
  difficulty: string;
  fixType?: 'title' | 'metaDescription' | 'altText' | 'schema';
  currentValue?: string;
  recommendedValue?: string;
}

export interface AuditResult {
  id: string;
  businessId: string;
  business: Business;
  createdAt: string;
  overallScore: number;
  scoreDiff?: number;
  technicalScore: number; // max 25
  onpageScore: number;    // max 30
  localScore: number;     // max 25
  contentScore: number;   // max 20
  pagesAnalyzed: number;
  criticalCount: number;
  warningCount: number;
  goodCount: number;
  pages: CrawledPage[];
  issues: SeoIssue[];
  topPriorities: SeoIssue[];
  aiRecommendations: AiRecommendation[];
  isDemo?: boolean;
  siteWideChecks?: {
    https: boolean;
    robotsTxt: boolean;
    sitemapXml: boolean;
    canonicalConsistency: boolean;
  };
  auditHistory?: AuditHistoryEntry[];
}

export type SubscriptionTier = 'free' | 'pro' | 'agency';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due';

export interface UserSubscription {
  plan: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt?: string;
  providerCustomerId?: string;
}

export interface UserUsage {
  auditsUsed: number;
  pagesCrawled: number;
  aiRequests: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  emailVerified: boolean;
  subscription: UserSubscription;
  subscriptionTier?: SubscriptionTier; // Backwards compatibility helper
  usage: UserUsage;
  businessIds: string[];
  createdAt?: string;
}
