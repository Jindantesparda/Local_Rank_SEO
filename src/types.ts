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
  /** Size of the HTML response only (excludes images, CSS and scripts). */
  htmlBytes?: number;
  /** Number of <script> tags in the page HTML. */
  scriptCount?: number;
  /** Number of <form> elements in the page HTML. */
  formCount?: number;
  /** True when a `width=device-width` viewport meta tag was found. */
  hasViewport?: boolean;
  /** First few hundred characters of visible text, used to spot placeholder pages. */
  textSample?: string;
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

/**
 * A likely reason visitors leave a page.
 *
 * These are INFERRED from the page's own HTML (speed, mobile-readiness,
 * contact friction, content depth). They are NOT measured visitor behaviour —
 * no analytics, bounce rate or session data is used. Always present them to
 * clients as "likely", never as measured fact.
 */
export interface DropOffSignal {
  id: string;
  title: string;
  /** How likely this is to be costing the business visitors. */
  likelihood: 'high' | 'medium' | 'low';
  /** The measured fact this inference is based on. */
  evidence: string;
  whyItMatters: string;
  suggestedAction: string;
  affectedPages: string[];
  /** Plain-English label for the underlying measurement. */
  basedOn: string;
}

export interface DropOffAnalysis {
  signals: DropOffSignal[];
  /** Short human summary, e.g. "4 likely causes found". */
  summary: string;
  /** Always true — the UI uses this to show the "inferred, not measured" note. */
  inferred: true;
  note: string;
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
  dropOffAnalysis?: DropOffAnalysis;
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
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'ecocash' | 'onemoney' | 'card';

export interface UserSubscription {
  plan: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  expiresAt?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  createdAt?: string;
  updatedAt?: string;
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

// Payment-related types
export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  provider: string; // e.g., 'paynow'
  providerReference: string; // Merchant reference sent to the provider
  providerTransactionId?: string; // Provider's own transaction reference
  plan?: SubscriptionTier; // Which plan was purchased
  pollUrl?: string; // Paynow poll URL used to verify the transaction
  amount: number; // In cents
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  webhookReceivedAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

// Competitor comparison
export interface CompetitorResult {
  url: string;
  domain: string;
  name: string;
  overallScore: number;
  technicalScore: number;
  onpageScore: number;
  localScore: number;
  contentScore: number;
  https: boolean;
  hasLocalSchema: boolean;
  pagesAnalyzed: number;
  status: 'ok' | 'error';
  error?: string;
  analyzedAt: string;
}

export interface CompetitorRecord {
  urls: string[];
  results: CompetitorResult[];
  updatedAt: string;
}

// Search visibility ("who is showing up above you")
export interface SerpResult {
  position: number;
  title: string;
  url: string;
  domain: string;
  isYou: boolean;
}

export interface SerpResponse {
  configured: boolean;
  query: string;
  results: SerpResult[];
  yourDomain: string;
  yourPosition: number | null;
  aboveYou: number;
  /**
   * Which search index produced these results. Brave has its own index, so a
   * Brave position is NOT a Google position and must never be labelled as one.
   */
  source?: 'brave' | 'google-custom-search' | 'none';
  sourceLabel?: string;
  message?: string;
}

/** Where a tracked ranking figure came from. */
export type RankSource = 'search-console';

/** Search Console connection for one business. */
export interface SearchConsoleConnection {
  siteUrl: string;
  connectedAt: string;
  lastFetchedAt?: string;
  lastError?: string;
}

/** A keyword's position as reported by Search Console. */
export interface KeywordPositionRecord {
  keyword: string;
  /** Average position over the reporting window. Lower is better. */
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
  windowDays: number;
}
