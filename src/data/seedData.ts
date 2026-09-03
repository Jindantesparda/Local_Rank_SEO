import { User, Business, AuditResult } from '../types';
import { DEMO_AUDIT_HARARE_DENTAL } from './demoData';

// User Dante (Business Plan owner with 2 businesses)
export const SEED_USER_DANTE: User = {
  id: 'usr_dante_01',
  name: 'Dante',
  email: 'dante@manicaskyview.co.zw',
  password: 'password123',
  emailVerified: true,
  subscription: {
    plan: 'business',
    status: 'active',
    expiresAt: '2027-09-03T00:00:00Z',
    providerCustomerId: 'cus_dante_stripe_99',
  },
  subscriptionTier: 'business',
  usage: {
    auditsUsed: 4,
    pagesCrawled: 48,
    aiRequests: 12,
  },
  businessIds: ['biz_manica_skyview', 'biz_abc_plumbing'],
  createdAt: '2026-08-01T10:00:00Z',
};

// Business 1: Manica SkyView
export const SEED_BIZ_MANICA: Business = {
  id: 'biz_manica_skyview',
  userId: 'usr_dante_01',
  name: 'Manica SkyView',
  website: 'https://manicaskyview.co.zw',
  location: 'Harare, Zimbabwe',
  category: 'Restaurant / Hotel / Lounge',
  description: 'Skyline rooftop restaurant, craft cocktail lounge, and boutique accommodation in Harare CBD.',
  services: ['Rooftop Dining', 'Cocktail Lounge', 'Executive Suites', 'Private Events'],
  createdAt: '2026-08-01T10:00:00Z',
};

// Business 2: ABC Plumbing
export const SEED_BIZ_ABC_PLUMBING: Business = {
  id: 'biz_abc_plumbing',
  userId: 'usr_dante_01',
  name: 'ABC Plumbing',
  website: 'https://abcplumbing.co.zw',
  location: 'Harare, Zimbabwe',
  category: 'Plumber / Emergency Services',
  description: 'Reliable residential and commercial plumbing, burst pipe repairs, drain unblocking, and solar geysers.',
  services: ['Emergency Plumbing', 'Drain Unblocking', 'Solar Geyser Repair', 'Bathroom Renovations'],
  createdAt: '2026-08-10T12:00:00Z',
};

// Audit for Manica SkyView (Score: 72/100, ↑ 8 points, Date: September 3, 2026)
export const SEED_AUDIT_MANICA: AuditResult = {
  id: 'audit_manica_01',
  businessId: 'biz_manica_skyview',
  business: SEED_BIZ_MANICA,
  createdAt: 'September 3, 2026',
  overallScore: 72,
  scoreDiff: 8,
  technicalScore: 22, // /25
  onpageScore: 20,    // /30
  localScore: 16,     // /25
  contentScore: 14,   // /20
  pagesAnalyzed: 18,
  criticalCount: 2,
  warningCount: 6,
  goodCount: 24,
  siteWideChecks: {
    https: true,
    robotsTxt: true,
    sitemapXml: true,
    canonicalConsistency: true,
  },
  pages: [
    {
      id: 'p_manica_home',
      url: 'https://manicaskyview.co.zw/',
      path: '/',
      statusCode: 200,
      title: 'Manica SkyView | Luxury Dining & Stay',
      metaDescription: 'Experience Harare from above at Manica SkyView rooftop lounge and boutique rooms.',
      h1: 'Welcome to Manica SkyView',
      h2s: ['Rooftop Dining Experience', 'Signature Cocktails', 'Boutique Suites', 'Reservations'],
      wordCount: 520,
      images: [
        { src: '/images/skyline-terrace.jpg', alt: 'Manica SkyView rooftop terrace view' },
        { src: '/images/dining-room.jpg', alt: '' },
      ],
      missingAltCount: 1,
      internalLinks: ['/menu', '/suites', '/events', '/contact'],
      externalLinks: ['https://instagram.com/manicaskyview'],
      canonical: 'https://manicaskyview.co.zw/',
      robotsDirectives: 'index, follow',
      hasStructuredData: false,
      structuredDataTypes: [],
      loadTimeMs: 380,
      issueCount: 3,
    },
    {
      id: 'p_manica_menu',
      url: 'https://manicaskyview.co.zw/menu',
      path: '/menu',
      statusCode: 200,
      title: 'Dining & Cocktails - Manica SkyView Harare',
      metaDescription: 'Explore our gourmet seasonal dinner menu, curated wines, and artisan craft cocktails in Harare CBD.',
      h1: 'Restaurant & Bar Menu',
      h2s: ['Starters', 'Mains', 'Desserts', 'Cocktails'],
      wordCount: 410,
      images: [{ src: '/images/steak.jpg', alt: 'Dry aged ribeye steak' }],
      missingAltCount: 0,
      internalLinks: ['/', '/contact'],
      externalLinks: [],
      canonical: 'https://manicaskyview.co.zw/menu',
      robotsDirectives: 'index, follow',
      hasStructuredData: true,
      structuredDataTypes: ['Menu'],
      loadTimeMs: 340,
      issueCount: 1,
    },
    {
      id: 'p_manica_suites',
      url: 'https://manicaskyview.co.zw/suites',
      path: '/suites',
      statusCode: 200,
      title: 'Suites & Accommodation | Manica SkyView',
      metaDescription: 'Book luxury boutique accommodation in downtown Harare with panoramic skyline views.',
      h1: 'Boutique Skyline Suites',
      h2s: ['Executive Suite', 'Panoramic Penthouse', 'Amenities', 'Book Your Stay'],
      wordCount: 460,
      images: [{ src: '/images/suite-bedroom.jpg', alt: '' }],
      missingAltCount: 1,
      internalLinks: ['/', '/contact'],
      externalLinks: [],
      canonical: 'https://manicaskyview.co.zw/suites',
      robotsDirectives: 'index, follow',
      hasStructuredData: false,
      structuredDataTypes: [],
      loadTimeMs: 410,
      issueCount: 2,
    },
  ],
  issues: [
    {
      id: 'issue_manica_page_rooftop',
      category: 'content',
      severity: 'critical',
      title: 'Your hotel doesn\'t have a dedicated "Hotels in Harare" page',
      description: 'Your homepage mentions accommodation, but there isn\'t a page specifically describing your hotel, amenities, and central Harare location.',
      businessOutcome: 'Google has less relevant content to associate your business with this search.',
      competitorContext: 'Three important competitors have dedicated pages for this service.',
      affectedPage: 'https://manicaskyview.co.zw/',
      whyItMatters: 'Google associates local searches with businesses that have focused, dedicated landing pages rather than broad single-page mentions.',
      recommendedAction: 'Create a page targeting this service/location. LocalRank AI can draft the full page for you.',
      difficulty: 'medium',
      impact: 'high',
      priorityScore: 98,
      actionType: 'generate_page',
      pageDraft: {
        serviceKeyword: 'Hotels in Harare',
        targetLocation: 'Harare, Zimbabwe',
        suggestedSlug: '/hotels-in-harare',
        title: 'Hotels in Harare | Luxury Skyline Suites | Manica SkyView',
        metaDescription: 'Book luxury hotel accommodation in central Harare at Manica SkyView. Skyline executive suites, fine rooftop dining, secure parking, and concierge services.',
        h1: 'Premier Hotel & Boutique Accommodation in Harare',
        h2s: [
          'Why Choose Manica SkyView for Your Stay in Harare',
          'Executive Suites & Contemporary Amenities',
          'Prime Central Location & CBD Neighborhood Access',
          'Guest Reviews & Skyline Dining Experience',
          'Check Availability & Book Direct'
        ],
        contentSections: [
          {
            heading: 'Refined Hospitality in the Heart of Harare',
            body: 'Welcome to Manica SkyView, your premier destination for boutique hotel accommodation in Harare, Zimbabwe. Designed for discerning business executives and international travelers, our property combines panoramic skyline vistas with refined comfort and attentive personal hospitality.',
          },
          {
            heading: 'Tailored for Business and Leisure Travelers',
            body: 'Each suite features ultra-quiet climate control, ergonomic workstations, high-speed fiber internet, and premium bedding. Guests enjoy priority access to our top-floor rooftop lounge, private meeting salons, and 24-hour secured on-site parking.',
          },
          {
            heading: 'Minutes from Central Harare Commercial Centers',
            body: 'Situated directly in the commercial corridor of Harare, Manica SkyView places you moments away from diplomatic missions, financial institutions, and top cultural landmarks, making morning commutes effortlessly convenient.',
          },
          {
            heading: 'Direct Reservations & Flexible Check-in',
            body: 'Book directly through our official portal for complimentary airport transfers, complimentary welcome refreshments at the rooftop bar, and guaranteed best available rates.',
          },
        ],
        callToAction: 'Reserve Your Hotel Stay at Manica SkyView Harare — Instant Online Confirmation',
        schemaMarkup: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Hotel",
  "name": "Manica SkyView Hotel",
  "url": "https://manicaskyview.co.zw/hotels-in-harare",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Harare",
    "addressCountry": "ZW"
  },
  "priceRange": "$$$",
  "amenities": "Free High-Speed WiFi, Rooftop Lounge, Airport Transfer, 24/7 Security"
}
</script>`,
      },
    },
    {
      id: 'issue_manica_1',
      category: 'onpage',
      severity: 'critical',
      title: 'Your homepage title is too generic',
      description: 'Your current title tag does not specify your primary service and city for search engine crawlers.',
      businessOutcome: 'Google may not understand what this page is about.',
      competitorContext: 'Competitors Tin Roof and Meikles explicitly include "Harare" and their primary category.',
      affectedPage: 'https://manicaskyview.co.zw/',
      whyItMatters: 'Title tags are Google\'s primary signal for understanding a page\'s core subject and ranking it in localized search results.',
      recommendedAction: 'Update your title tag to target your brand name, core category, and city.',
      difficulty: 'easy',
      impact: 'high',
      priorityScore: 96,
      actionType: 'copy_fix',
      suggestedFix: {
        type: 'title',
        current: 'Welcome | Manica SkyView',
        recommended: 'Manica SkyView | Rooftop Restaurant & Hotel in Harare, Zimbabwe',
        targetElement: '<title> in <head>',
      },
    },
    {
      id: 'issue_manica_2',
      category: 'local',
      severity: 'critical',
      title: 'Your business information isn\'t structured',
      description: 'Add LocalBusiness/Hotel structured data so search engines can clearly read your address, phone number, and hours.',
      businessOutcome: 'Search engines have less structured information about your business.',
      competitorContext: 'Businesses with valid JSON-LD schema have 2.8x higher chances of appearing in Google Knowledge Graph panels.',
      affectedPage: 'https://manicaskyview.co.zw/',
      whyItMatters: 'Schema markup unlocks Google Knowledge Graph badges, map card links, and rich snippets.',
      recommendedAction: 'Add LocalBusiness/Hotel structured data to your website head.',
      difficulty: 'easy',
      impact: 'high',
      priorityScore: 92,
      actionType: 'generate_schema',
      suggestedFix: {
        type: 'schema',
        recommended: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": ["Hotel", "Restaurant"],
  "name": "Manica SkyView",
  "url": "https://manicaskyview.co.zw",
  "telephone": "+263 24 2700000",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Central Business District",
    "addressLocality": "Harare",
    "addressCountry": "ZW"
  },
  "servesCuisine": ["Contemporary", "Grill", "Craft Cocktails"],
  "priceRange": "$$"
}
</script>`,
        targetElement: '<script type="application/ld+json"> in <head>',
      },
    },
    {
      id: 'issue_manica_3',
      category: 'content',
      severity: 'high',
      title: 'Weak location signals on service & suite pages',
      description: 'Your accommodation and private dining pages miss neighborhood landmarks and transit references that travelers search for.',
      businessOutcome: 'You\'re making it harder for Google to associate your services with Harare.',
      competitorContext: 'Competitor accommodation pages mention Harare CBD, airport shuttle distance, and nearby conference centers.',
      affectedPage: 'https://manicaskyview.co.zw/suites',
      whyItMatters: 'Thorough localized service copy helps search engines match your pages with long-tail traveler queries.',
      recommendedAction: 'Add dedicated paragraphs highlighting proximity to Harare CBD attractions, airport shuttle options, and room amenities.',
      difficulty: 'medium',
      impact: 'high',
      priorityScore: 84,
      suggestedFix: {
        type: 'content',
        recommended: 'Add a 150-word "Location & Neighborhood" section detailing walking distance to central Harare commercial centers and conference venues.',
      },
    },
  ],
  topPriorities: [
    {
      id: 'issue_manica_page_rooftop',
      category: 'content',
      severity: 'critical',
      title: 'Your hotel doesn\'t have a dedicated "Hotels in Harare" page',
      description: 'Your homepage mentions accommodation, but there isn\'t a page specifically describing your hotel and its location.',
      businessOutcome: 'Google has less relevant content to associate your business with this search.',
      competitorContext: 'Three important competitors have dedicated pages for this service.',
      affectedPage: 'https://manicaskyview.co.zw/',
      whyItMatters: 'Google has less relevant content to associate your business with this search.',
      recommendedAction: 'Create a page targeting this service/location. LocalRank AI can draft the page for you.',
      difficulty: 'medium',
      impact: 'high',
      priorityScore: 98,
      actionType: 'generate_page',
      pageDraft: {
        serviceKeyword: 'Hotels in Harare',
        targetLocation: 'Harare, Zimbabwe',
        suggestedSlug: '/hotels-in-harare',
        title: 'Hotels in Harare | Luxury Skyline Suites | Manica SkyView',
        metaDescription: 'Book luxury hotel accommodation in central Harare at Manica SkyView. Skyline executive suites, fine rooftop dining, secure parking, and concierge services.',
        h1: 'Premier Hotel & Boutique Accommodation in Harare',
        h2s: [
          'Why Choose Manica SkyView for Your Stay in Harare',
          'Executive Suites & Contemporary Amenities',
          'Prime Central Location & CBD Neighborhood Access',
          'Check Availability & Book Direct'
        ],
        contentSections: [
          {
            heading: 'Refined Hospitality in the Heart of Harare',
            body: 'Welcome to Manica SkyView, your premier destination for boutique hotel accommodation in Harare, Zimbabwe. Designed for discerning business executives and international travelers, our property combines panoramic skyline vistas with refined comfort and attentive personal hospitality.',
          },
          {
            heading: 'Tailored for Business and Leisure Travelers',
            body: 'Each suite features ultra-quiet climate control, ergonomic workstations, high-speed fiber internet, and premium bedding. Guests enjoy priority access to our top-floor rooftop lounge, private meeting salons, and 24-hour secured on-site parking.',
          },
          {
            heading: 'Minutes from Central Harare Commercial Centers',
            body: 'Situated directly in the commercial corridor of Harare, Manica SkyView places you moments away from diplomatic missions, financial institutions, and top cultural landmarks, making morning commutes effortlessly convenient.',
          },
        ],
        callToAction: 'Reserve Your Hotel Stay at Manica SkyView Harare — Instant Online Confirmation',
        schemaMarkup: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Hotel",
  "name": "Manica SkyView Hotel",
  "url": "https://manicaskyview.co.zw/hotels-in-harare",
  "address": { "@type": "PostalAddress", "addressLocality": "Harare", "addressCountry": "ZW" }
}
</script>`,
      },
    },
    {
      id: 'issue_manica_1',
      category: 'onpage',
      severity: 'critical',
      title: 'Your homepage title is too generic',
      description: 'Your current homepage title doesn\'t specify your exact primary service and city for search engines.',
      businessOutcome: 'Google may not understand what this page is about.',
      competitorContext: '3 competitors have explicit keyword-rich title tags.',
      affectedPage: 'https://manicaskyview.co.zw/',
      whyItMatters: 'Title tags are the #1 on-page ranking factor for local queries.',
      recommendedAction: 'Update homepage title to include brand, service, and city.',
      difficulty: 'easy',
      impact: 'high',
      priorityScore: 96,
      actionType: 'copy_fix',
      suggestedFix: {
        type: 'title',
        current: 'Welcome | Manica SkyView',
        recommended: 'Manica SkyView | Rooftop Restaurant & Hotel in Harare, Zimbabwe',
      },
    },
    {
      id: 'issue_manica_2',
      category: 'local',
      severity: 'critical',
      title: 'Your business information isn\'t structured',
      description: 'Add LocalBusiness/Hotel structured data.',
      businessOutcome: 'Search engines have less structured information about your business.',
      competitorContext: 'Unlocks Google rich snippets, Knowledge Graph, and Maps cards.',
      affectedPage: 'https://manicaskyview.co.zw/',
      whyItMatters: 'Helps Google map search understand your location and service types.',
      recommendedAction: 'Add LocalBusiness/Hotel structured data.',
      difficulty: 'easy',
      impact: 'high',
      priorityScore: 92,
      actionType: 'generate_schema',
      suggestedFix: {
        type: 'schema',
        recommended: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": ["Hotel", "Restaurant"],
  "name": "Manica SkyView",
  "url": "https://manicaskyview.co.zw",
  "telephone": "+263 24 2700000",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Central Business District",
    "addressLocality": "Harare",
    "addressCountry": "ZW"
  }
}
</script>`,
      },
    },
  ],
  auditHistory: [
    {
      date: '30 days ago',
      score: 64,
      scoreDiff: 14,
      fixedCount: 2,
      fixedItems: [
        'Homepage title optimized for Harare keywords',
        'JSON-LD LocalBusiness structured data installed in <head>'
      ],
      newIssuesCount: 3,
      newPagesCount: 2,
      nextPriorities: [
        'Your hotel doesn\'t have a dedicated "Hotels in Harare" page',
        'Your homepage title is too generic',
        'Your business information isn\'t structured'
      ]
    }
  ],
  aiRecommendations: [
    {
      id: 'rec_manica_1',
      issueId: 'issue_manica_1',
      problem: 'Missing geographic keywords in title tag',
      explanation: 'Searchers in Harare query "rooftop restaurant harare" and "harare boutique hotel". Your current title lacks both terms.',
      whyItMatters: 'Immediate +15% boost in local CTR.',
      recommendedSolution: 'Update the title tag to include both city and primary category.',
      suggestedCopy: 'Manica SkyView | Rooftop Restaurant & Boutique Hotel in Harare',
      expectedImpact: '+12-18% organic impressions',
      difficulty: 'Easy (5 mins)',
      fixType: 'title',
      currentValue: 'Manica SkyView | Luxury Dining & Stay',
      recommendedValue: 'Manica SkyView | Rooftop Restaurant & Boutique Hotel in Harare',
    },
  ],
};

// Audit for ABC Plumbing
export const SEED_AUDIT_ABC_PLUMBING: AuditResult = {
  id: 'audit_abc_01',
  businessId: 'biz_abc_plumbing',
  business: SEED_BIZ_ABC_PLUMBING,
  createdAt: 'September 1, 2026',
  overallScore: 64,
  scoreDiff: 5,
  technicalScore: 19,
  onpageScore: 18,
  localScore: 15,
  contentScore: 12,
  pagesAnalyzed: 12,
  criticalCount: 4,
  warningCount: 7,
  goodCount: 16,
  siteWideChecks: {
    https: true,
    robotsTxt: true,
    sitemapXml: true,
    canonicalConsistency: true,
  },
  pages: [
    {
      id: 'p_abc_home',
      url: 'https://abcplumbing.co.zw/',
      path: '/',
      statusCode: 200,
      title: 'ABC Plumbing Services',
      metaDescription: 'We fix plumbing issues in Zimbabwe.',
      h1: 'Fast Plumber in Harare',
      h2s: ['Emergency Plumbing', 'Solar Geysers', 'Drain Unblocking'],
      wordCount: 380,
      images: [{ src: '/images/van.jpg', alt: '' }],
      missingAltCount: 1,
      internalLinks: ['/services', '/contact'],
      externalLinks: [],
      canonical: 'https://abcplumbing.co.zw/',
      robotsDirectives: 'index, follow',
      hasStructuredData: false,
      structuredDataTypes: [],
      loadTimeMs: 440,
      issueCount: 4,
    },
  ],
  issues: [
    {
      id: 'issue_abc_page_emergency',
      category: 'content',
      severity: 'critical',
      title: 'Your plumbing business is missing an "Emergency Plumber in Harare" page',
      description: 'Your website lists general services, but lacks a dedicated emergency response page targeting urgently leaking pipes, burst geysers, and 24/7 callouts.',
      businessOutcome: 'You\'re missing opportunities to appear for high-intent emergency plumbing searches in Harare.',
      competitorContext: '3 rival plumbing services have dedicated emergency landing pages that rank at the top of Google.',
      affectedPage: 'https://abcplumbing.co.zw/',
      whyItMatters: 'Emergency plumbing searches convert at over 40% when users land on a dedicated page with an instant call button.',
      recommendedAction: 'Create a dedicated page targeting emergency plumbing. LocalRank AI can draft the full page for you.',
      difficulty: 'medium',
      impact: 'high',
      priorityScore: 99,
      actionType: 'generate_page',
      pageDraft: {
        serviceKeyword: 'Emergency Plumber in Harare',
        targetLocation: 'Harare, Zimbabwe',
        suggestedSlug: '/emergency-plumber-harare',
        title: 'Emergency Plumber in Harare | 24/7 Rapid Response | ABC Plumbing',
        metaDescription: 'Need an emergency plumber in Harare? ABC Plumbing provides 24/7 fast dispatch for burst pipes, leaking solar geysers, and blocked drains. Call now!',
        h1: '24/7 Emergency Plumber in Harare — Fast Local Dispatch',
        h2s: [
          'Immediate Plumbing Response Across Greater Harare',
          'Common Emergencies We Fix 24/7',
          'Why Harare Homeowners Trust ABC Plumbing',
          'Call Our Emergency Hotlines Now'
        ],
        contentSections: [
          {
            heading: 'Burst Pipes & Water Leaks Require Instant Action',
            body: 'When plumbing emergencies strike, waiting hours isn\'t an option. ABC Plumbing operates emergency response mobile units across Harare, equipped with professional detection gear and premium replacement fittings.',
          },
          {
            heading: 'Solar Geyser Replacements & Burst Valves',
            body: 'We specialize in solar geyser leak repairs, element replacements, pressure valve calibrations, and full drain unblocking using industrial rotary equipment.',
          },
          {
            heading: 'Upfront Pricing & Licensed Technicians',
            body: 'No hidden charges or surprise invoices. Our technicians arrive with certified credentials, diagnose the root fault, and provide a clear quote before commencing repairs.',
          },
        ],
        callToAction: 'Call Our 24/7 Harare Plumbing Dispatch Desk for Immediate Assistance',
        schemaMarkup: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "PlumbingService",
  "name": "ABC Emergency Plumbing Harare",
  "telephone": "+263 77 0000000",
  "areaServed": "Harare",
  "openingHours": "Mo-Su 00:00-24:00"
}
</script>`,
      },
    },
    {
      id: 'issue_abc_1',
      category: 'onpage',
      severity: 'critical',
      title: 'Your homepage title is too generic',
      description: 'Current title "ABC Plumbing Services" does not tell search engines where you are or what specific emergencies you solve.',
      businessOutcome: 'Google may not understand what this page is about.',
      competitorContext: 'Top ranking plumbing competitors include both "Harare" and "Emergency Plumber" in their titles.',
      affectedPage: 'https://abcplumbing.co.zw/',
      whyItMatters: 'Users searching during water leaks type "emergency plumber harare".',
      recommendedAction: 'Update title to: "ABC Plumbing | 24/7 Emergency Plumber & Solar Geysers in Harare"',
      difficulty: 'easy',
      impact: 'high',
      priorityScore: 98,
      actionType: 'copy_fix',
      suggestedFix: {
        type: 'title',
        current: 'ABC Plumbing Services',
        recommended: 'ABC Plumbing | 24/7 Emergency Plumber & Solar Geysers in Harare, Zimbabwe',
        targetElement: '<title> in <head>',
      },
    },
    {
      id: 'issue_abc_2',
      category: 'local',
      severity: 'critical',
      title: 'Your business information isn\'t structured',
      description: 'Add LocalBusiness/Plumber structured data with telephone, hours, and service radius.',
      businessOutcome: 'Search engines have less structured information about your business.',
      competitorContext: 'Structured data triggers "Call Now" buttons directly on mobile search results.',
      affectedPage: 'https://abcplumbing.co.zw/',
      whyItMatters: 'Google displays phone numbers and 24/7 badges directly in search results when Schema is present.',
      recommendedAction: 'Add Plumber structured data in JSON-LD format.',
      difficulty: 'easy',
      impact: 'high',
      priorityScore: 94,
      actionType: 'generate_schema',
      suggestedFix: {
        type: 'schema',
        recommended: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "PlumbingService",
  "name": "ABC Plumbing",
  "url": "https://abcplumbing.co.zw",
  "telephone": "+263 77 1234567",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Harare",
    "addressCountry": "ZW"
  },
  "priceRange": "$$"
}
</script>`,
        targetElement: '<script type="application/ld+json"> in <head>',
      },
    },
  ],
  topPriorities: [
    {
      id: 'issue_abc_page_emergency',
      category: 'content',
      severity: 'critical',
      title: 'Your plumbing business is missing an "Emergency Plumber in Harare" page',
      description: 'Create a dedicated page targeting high-intent emergency plumbing searches.',
      businessOutcome: 'You\'re missing opportunities to appear for high-intent emergency plumbing searches.',
      competitorContext: '3 rival plumbing services have dedicated emergency landing pages.',
      affectedPage: 'https://abcplumbing.co.zw/',
      whyItMatters: 'Google has less relevant content to associate your business with this search.',
      recommendedAction: 'Create a page targeting this service/location. LocalRank AI can draft the page for you.',
      difficulty: 'medium',
      impact: 'high',
      priorityScore: 99,
      actionType: 'generate_page',
    },
    {
      id: 'issue_abc_1',
      category: 'onpage',
      severity: 'critical',
      title: 'Your homepage title is too generic',
      description: 'Include 24/7 emergency keywords and Harare location.',
      businessOutcome: 'Google may not understand what this page is about.',
      affectedPage: 'https://abcplumbing.co.zw/',
      whyItMatters: 'Direct match for emergency repair searches in Harare.',
      recommendedAction: 'Change title tag in HTML.',
      difficulty: 'easy',
      impact: 'high',
      priorityScore: 98,
      actionType: 'copy_fix',
      suggestedFix: {
        type: 'title',
        current: 'ABC Plumbing Services',
        recommended: 'ABC Plumbing | 24/7 Emergency Plumber & Solar Geysers in Harare, Zimbabwe',
      },
    },
    {
      id: 'issue_abc_2',
      category: 'local',
      severity: 'critical',
      title: 'Your business information isn\'t structured',
      description: 'Add LocalBusiness/Plumber structured data.',
      businessOutcome: 'Search engines have less structured information about your business.',
      affectedPage: 'https://abcplumbing.co.zw/',
      whyItMatters: 'Enables rich Google Map pins and click-to-call numbers.',
      recommendedAction: 'Embed Schema script in HTML head.',
      difficulty: 'easy',
      impact: 'high',
      priorityScore: 94,
      actionType: 'generate_schema',
      suggestedFix: {
        type: 'schema',
        recommended: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "PlumbingService",\n  "name": "ABC Plumbing",\n  "telephone": "+263 77 1234567",\n  "address": { "@type": "PostalAddress", "addressLocality": "Harare", "addressCountry": "ZW" }\n}\n</script>`,
      },
    },
  ],
  auditHistory: [
    {
      date: '25 days ago',
      score: 52,
      scoreDiff: 12,
      fixedCount: 2,
      fixedItems: [
        'Enforced SSL HTTPS redirection',
        'Created XML sitemap at /sitemap.xml'
      ],
      newIssuesCount: 3,
      newPagesCount: 1,
      nextPriorities: [
        'Missing dedicated "Emergency Plumber in Harare" page',
        'Homepage title is too generic',
        'Business information isn\'t structured with Schema'
      ]
    }
  ],
  aiRecommendations: [],
};

// Seed database state
export interface LocalRankState {
  users: User[];
  businesses: Business[];
  audits: AuditResult[];
  activeUserId: string | null;
  activeBusinessId: string | null;
}

export function getInitialSeedState(): LocalRankState {
  return {
    users: [SEED_USER_DANTE],
    businesses: [SEED_BIZ_MANICA, SEED_BIZ_ABC_PLUMBING],
    audits: [SEED_AUDIT_MANICA, SEED_AUDIT_ABC_PLUMBING],
    activeUserId: SEED_USER_DANTE.id,
    activeBusinessId: SEED_BIZ_MANICA.id,
  };
}
