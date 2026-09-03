import { AuditResult } from '../types';

export const DEMO_AUDIT_HARARE_DENTAL: AuditResult = {
  id: 'audit-demo-harare-dental',
  businessId: 'biz-demo-harare-dental',
  business: {
    id: 'biz-demo-harare-dental',
    name: 'Harare Dental Clinic',
    website: 'https://hararedentalclinic.co.zw',
    location: 'Harare, Zimbabwe',
    category: 'Dentist / Dental Clinic',
    description: 'Family dental clinic providing preventive dental care, teeth whitening, orthodontics, and emergency dental treatments in Harare.',
    services: ['Family Dentistry', 'Teeth Whitening', 'Root Canal Treatment', 'Dental Implants', 'Emergency Dental Care'],
    createdAt: '2026-08-15T09:30:00Z',
  },
  createdAt: '2026-09-02T14:15:00Z',
  overallScore: 68,
  scoreDiff: 8,
  technicalScore: 21, // /25
  onpageScore: 19,    // /30
  localScore: 14,     // /25
  contentScore: 14,   // /20
  pagesAnalyzed: 14,
  criticalCount: 3,
  warningCount: 8,
  goodCount: 19,
  isDemo: true,
  siteWideChecks: {
    https: true,
    robotsTxt: true,
    sitemapXml: true,
    canonicalConsistency: true,
  },
  pages: [
    {
      id: 'page-1',
      url: 'https://hararedentalclinic.co.zw/',
      path: '/',
      statusCode: 200,
      title: 'Home | Dental Clinic Zimbabwe',
      metaDescription: 'Welcome to our dental clinic. We offer general dental services.',
      h1: 'Welcome to Harare Dental Clinic',
      h2s: ['Our Services', 'Meet the Team', 'Book an Appointment', 'Patient Testimonials'],
      wordCount: 420,
      images: [
        { src: '/images/hero-banner.jpg', alt: '' },
        { src: '/images/dr-moyo.jpg', alt: 'Dr Moyo Head Dentist' },
        { src: '/images/clinic-room.jpg', alt: '' },
        { src: '/images/teeth-whitening.jpg', alt: '' }
      ],
      missingAltCount: 3,
      internalLinks: ['/about-us', '/services', '/contact', '/emergency'],
      externalLinks: ['https://facebook.com/hararedental'],
      canonical: 'https://hararedentalclinic.co.zw/',
      robotsDirectives: 'index, follow',
      hasStructuredData: false,
      structuredDataTypes: [],
      loadTimeMs: 410,
      issueCount: 4,
    },
    {
      id: 'page-2',
      url: 'https://hararedentalclinic.co.zw/services',
      path: '/services',
      statusCode: 200,
      title: 'Services - Harare Dental Clinic',
      metaDescription: '',
      h1: 'Dental Services',
      h2s: ['Teeth Cleaning', 'Fillings', 'Whitening', 'Extractions'],
      wordCount: 290,
      images: [
        { src: '/images/cleaning.jpg', alt: '' },
        { src: '/images/filling.jpg', alt: '' }
      ],
      missingAltCount: 2,
      internalLinks: ['/', '/contact', '/emergency'],
      externalLinks: [],
      canonical: 'https://hararedentalclinic.co.zw/services',
      robotsDirectives: 'index, follow',
      hasStructuredData: false,
      structuredDataTypes: [],
      loadTimeMs: 380,
      issueCount: 3,
    },
    {
      id: 'page-3',
      url: 'https://hararedentalclinic.co.zw/about-us',
      path: '/about-us',
      statusCode: 200,
      title: 'About Us | Harare Dental Clinic',
      metaDescription: 'Learn about our dental practice located in Harare CBD, operating since 2018.',
      h1: 'About Harare Dental Clinic',
      h2s: ['Our Story', 'Our Facility'],
      wordCount: 510,
      images: [
        { src: '/images/clinic-exterior.jpg', alt: 'Harare Dental Clinic exterior building in Harare' }
      ],
      missingAltCount: 0,
      internalLinks: ['/', '/services', '/contact'],
      externalLinks: [],
      canonical: 'https://hararedentalclinic.co.zw/about-us',
      robotsDirectives: 'index, follow',
      hasStructuredData: false,
      structuredDataTypes: [],
      loadTimeMs: 320,
      issueCount: 1,
    },
    {
      id: 'page-4',
      url: 'https://hararedentalclinic.co.zw/contact',
      path: '/contact',
      statusCode: 200,
      title: 'Contact Us',
      metaDescription: 'Get in touch with Harare Dental Clinic.',
      h1: 'Contact Us',
      h2s: ['Opening Hours', 'Find Our Clinic'],
      wordCount: 180,
      images: [
        { src: '/images/map-pin.png', alt: 'Clinic location map' }
      ],
      missingAltCount: 0,
      internalLinks: ['/', '/services'],
      externalLinks: ['https://maps.google.com/?q=Harare+Dental'],
      canonical: 'https://hararedentalclinic.co.zw/contact',
      robotsDirectives: 'index, follow',
      hasStructuredData: false,
      structuredDataTypes: [],
      loadTimeMs: 290,
      issueCount: 3,
    },
    {
      id: 'page-5',
      url: 'https://hararedentalclinic.co.zw/emergency',
      path: '/emergency',
      statusCode: 200,
      title: 'Emergency Dental Care in Harare | 24/7 Dental Pain Relief',
      metaDescription: 'Need urgent dental treatment in Harare? Contact Harare Dental Clinic immediately for same-day emergency toothache relief and repairs.',
      h1: 'Emergency Dental Services in Harare',
      h2s: ['Common Dental Emergencies', 'Call Our Hotline'],
      wordCount: 640,
      images: [
        { src: '/images/emergency-care.jpg', alt: 'Emergency dental treatment room in Harare' }
      ],
      missingAltCount: 0,
      internalLinks: ['/', '/contact'],
      externalLinks: [],
      canonical: 'https://hararedentalclinic.co.zw/emergency',
      robotsDirectives: 'index, follow',
      hasStructuredData: false,
      structuredDataTypes: [],
      loadTimeMs: 310,
      issueCount: 0,
    }
  ],
  issues: [
    {
      id: 'issue-1',
      category: 'onpage',
      severity: 'high',
      title: 'Homepage title does not include your primary service and city',
      description: 'Your homepage title tag is currently "Home | Dental Clinic Zimbabwe". It misses your exact city "Harare" and primary treatment focus that potential patients search for.',
      affectedPage: 'https://hararedentalclinic.co.zw/',
      whyItMatters: 'The title tag is Google\'s #1 on-page signal for deciding who to display in local search results. Missing "Harare" means losing patients searching for "dentist near me" or "dentist in Harare".',
      recommendedAction: 'Update your homepage title to include your clinic name, core specialization, and city.',
      difficulty: 'easy',
      impact: 'high',
      priorityScore: 9.0, // Impact (3) * Confidence (3) / Effort (1) = 9
      status: 'open',
      suggestedFix: {
        type: 'title',
        current: 'Home | Dental Clinic Zimbabwe',
        recommended: 'Harare Dental Clinic | Family Dentist & Emergency Dental Care in Harare',
        targetElement: '<title> tag on Homepage',
      }
    },
    {
      id: 'issue-2',
      category: 'local',
      severity: 'high',
      title: 'Missing LocalBusiness structured data (Schema.org)',
      description: 'Search engines are crawling your site as plain text without structured machine-readable business data. There is no LocalBusiness JSON-LD schema found on your pages.',
      affectedPage: 'https://hararedentalclinic.co.zw/',
      whyItMatters: 'Structured data tells Google explicitly your business hours, medical specialty, geographic coordinates, and phone number, boosting your chance of showing up in Google Knowledge Graph and Google Local Map Pack.',
      recommendedAction: 'Paste a valid Dentist LocalBusiness JSON-LD script into the <head> of your homepage.',
      difficulty: 'medium',
      impact: 'high',
      priorityScore: 4.5, // 3 * 3 / 2
      status: 'open',
      suggestedFix: {
        type: 'schema',
        recommended: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dentist",
          "name": "Harare Dental Clinic",
          "image": "https://hararedentalclinic.co.zw/images/hero-banner.jpg",
          "url": "https://hararedentalclinic.co.zw",
          "telephone": "+263-242-700000",
          "priceRange": "$$",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "CBD Medical Plaza, 4th Street",
            "addressLocality": "Harare",
            "addressCountry": "ZW"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": -17.8252,
            "longitude": 31.0530
          },
          "openingHoursSpecification": [
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
              "opens": "08:00",
              "closes": "17:00"
            },
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Saturday"],
              "opens": "08:30",
              "closes": "13:00"
            }
          ]
        }, null, 2),
        language: 'json',
        targetElement: 'Inside <head> of index.html',
      }
    },
    {
      id: 'issue-3',
      category: 'content',
      severity: 'high',
      title: 'Services page lacks dedicated URLs for high-value treatments',
      description: 'High-intent treatments like "Teeth Whitening" and "Dental Implants" are only mentioned in a short bullet list on a single page, rather than having individual dedicated landing pages.',
      affectedPage: 'https://hararedentalclinic.co.zw/services',
      whyItMatters: 'When someone in Harare searches for "teeth whitening Harare cost" or "emergency root canal", Google prefers ranking dedicated in-depth pages rather than a generic summary page.',
      recommendedAction: 'Create separate dedicated pages for your main high-margin services: /teeth-whitening, /dental-implants, and /root-canal.',
      difficulty: 'medium',
      impact: 'high',
      priorityScore: 4.5,
      status: 'open',
    },
    {
      id: 'issue-4',
      category: 'onpage',
      severity: 'medium',
      title: '5 images are missing descriptive alt text',
      description: '5 images across your homepage and services page have empty alt="" tags or are missing alt attributes entirely.',
      affectedPage: 'https://hararedentalclinic.co.zw/ (3 images) & /services (2 images)',
      whyItMatters: 'Google Image Search cannot understand untagged images. Informative alt text helps visually impaired visitors and helps your clinic rank in Google Image searches for local dental equipment and clinics.',
      recommendedAction: 'Add clear, descriptive alt text explaining what each photo shows, including natural location context.',
      difficulty: 'easy',
      impact: 'medium',
      priorityScore: 4.0, // 2 * 2 / 1
      status: 'open',
      suggestedFix: {
        type: 'altText',
        current: '<img src="/images/hero-banner.jpg" alt="" />',
        recommended: '<img src="/images/hero-banner.jpg" alt="Modern dental consultation room at Harare Dental Clinic" />',
        targetElement: 'Homepage hero image',
      }
    },
    {
      id: 'issue-5',
      category: 'onpage',
      severity: 'medium',
      title: 'Homepage meta description is too brief and generic',
      description: 'The meta description is only 63 characters ("Welcome to our dental clinic. We offer general dental services.") and lacks keywords, location, and a clear call-to-action.',
      affectedPage: 'https://hararedentalclinic.co.zw/',
      whyItMatters: 'The meta description is your billboard in Google search results. A compelling 140-160 character description directly improves click-through rate (CTR).',
      recommendedAction: 'Replace with an engaging description highlighting gentle care, location in Harare, and how to book.',
      difficulty: 'easy',
      impact: 'medium',
      priorityScore: 4.0,
      status: 'open',
      suggestedFix: {
        type: 'metaDescription',
        current: 'Welcome to our dental clinic. We offer general dental services.',
        recommended: 'Looking for a trusted family dentist in Harare? Harare Dental Clinic offers gentle dental care, teeth whitening & emergency toothache relief. Book your visit today!',
        targetElement: '<meta name="description"> on Homepage',
      }
    },
    {
      id: 'issue-6',
      category: 'local',
      severity: 'medium',
      title: 'Contact page lacks clickable telephone link (tel: protocol)',
      description: 'The telephone number on the contact page is rendered as plain text without an `<a href="tel:...">` hyperlink.',
      affectedPage: 'https://hararedentalclinic.co.zw/contact',
      whyItMatters: 'Over 70% of local searches happen on mobile devices. If a prospective patient in pain cannot tap to call immediately, they tap back to Google and call your competitor.',
      recommendedAction: 'Format phone numbers into clickable links: `<a href="tel:+263242700000">+263 242 700000</a>`.',
      difficulty: 'easy',
      impact: 'medium',
      priorityScore: 3.5,
      status: 'open',
    },
    {
      id: 'issue-7',
      category: 'technical',
      severity: 'good',
      title: 'Website is securely served over HTTPS',
      description: 'Your domain uses valid SSL encryption, protecting user privacy and fulfilling Google\'s core security requirement.',
      affectedPage: 'Site-wide',
      whyItMatters: 'HTTPS has been a confirmed Google ranking factor since 2014 and prevents browser "Not Secure" warnings.',
      recommendedAction: 'No action required — SSL certificate is active.',
      difficulty: 'easy',
      impact: 'high',
      priorityScore: 1.0,
      status: 'fixed',
    },
    {
      id: 'issue-8',
      category: 'technical',
      severity: 'good',
      title: 'Valid robots.txt and sitemap.xml detected',
      description: 'Googlebot and other crawlers can discover your pages via https://hararedentalclinic.co.zw/sitemap.xml.',
      affectedPage: 'Site-wide',
      whyItMatters: 'Enables quick indexation of newly published content and service updates.',
      recommendedAction: 'Keep sitemap automatically updated when adding new treatment pages.',
      difficulty: 'easy',
      impact: 'medium',
      priorityScore: 1.0,
      status: 'fixed',
    }
  ],
  topPriorities: [], // Will populate below
  aiRecommendations: [
    {
      id: 'rec-1',
      issueId: 'issue-1',
      problem: 'Homepage title tag misses key location and dental keywords',
      explanation: 'Your current title tag "Home | Dental Clinic Zimbabwe" is too generic. Patients in Harare search specifically for "dentist Harare", "dental clinic Harare CBD", or "teeth cleaning Harare".',
      whyItMatters: 'The title tag is the single strongest on-page ranking signal. Improving it typically produces rank improvements within 7-14 days.',
      recommendedSolution: 'Change your homepage title tag to: "Harare Dental Clinic | Family Dentist & Emergency Dental Care in Harare".',
      suggestedCopy: 'Harare Dental Clinic | Family Dentist & Emergency Dental Care in Harare',
      expectedImpact: 'High — Immediate relevance boost for local search queries',
      difficulty: 'Easy (5 minutes in CMS or HTML header)',
      fixType: 'title',
      currentValue: 'Home | Dental Clinic Zimbabwe',
      recommendedValue: 'Harare Dental Clinic | Family Dentist & Emergency Dental Care in Harare'
    },
    {
      id: 'rec-2',
      issueId: 'issue-2',
      problem: 'No LocalBusiness JSON-LD structured data detected',
      explanation: 'Search engines are left to guess your operating hours, exact street address, and dental specialties. Schema markup translates your website content into unambiguous database records for Google.',
      whyItMatters: 'Increases eligibility for Google Rich Results, knowledge cards, and prominent placement in local search carousels.',
      recommendedSolution: 'Embed the provided Schema.org JSON-LD snippet directly into your homepage HTML header.',
      expectedImpact: 'High — Direct signal for Google Local Map Pack',
      difficulty: 'Medium (requires copying code into theme settings or header)',
      fixType: 'schema',
      recommendedValue: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Dentist",
  "name": "Harare Dental Clinic",
  "image": "https://hararedentalclinic.co.zw/images/hero-banner.jpg",
  "url": "https://hararedentalclinic.co.zw",
  "telephone": "+263-242-700000",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "CBD Medical Plaza, 4th Street",
    "addressLocality": "Harare",
    "addressCountry": "ZW"
  }
}
</script>`
    },
    {
      id: 'rec-3',
      issueId: 'issue-5',
      problem: 'Meta description is too short to generate search clicks',
      explanation: 'At 63 characters, your description doesn\'t reassure patients about why they should choose your clinic over nearby alternatives.',
      whyItMatters: 'A high click-through rate tells Google your result answers searcher intent, preserving your ranking position.',
      recommendedSolution: 'Update your meta description to 148 characters emphasizing gentle family care and immediate phone booking.',
      suggestedCopy: 'Looking for a trusted family dentist in Harare? Harare Dental Clinic offers gentle dental care, teeth whitening & emergency toothache relief. Book your visit today!',
      expectedImpact: 'Medium — 15-30% improvement in organic search click-through rate',
      difficulty: 'Easy (2 minutes in SEO settings)',
      fixType: 'metaDescription',
      currentValue: 'Welcome to our dental clinic. We offer general dental services.',
      recommendedValue: 'Looking for a trusted family dentist in Harare? Harare Dental Clinic offers gentle dental care, teeth whitening & emergency toothache relief. Book your visit today!'
    },
    {
      id: 'rec-4',
      issueId: 'issue-4',
      problem: '5 key images missing descriptive alternative text',
      explanation: 'Images showing clinic interiors and staff currently have empty alt attributes.',
      whyItMatters: 'Adding descriptive alt tags helps visually impaired patients with screen readers and allows images to rank in Google Images.',
      recommendedSolution: 'Add natural descriptive alt text such as "Modern dental consultation room at Harare Dental Clinic" to the hero image.',
      suggestedCopy: 'Modern dental consultation room at Harare Dental Clinic',
      expectedImpact: 'Medium — Image search presence and WCAG accessibility compliance',
      difficulty: 'Easy (5 minutes in media library)',
      fixType: 'altText',
      currentValue: '<img src="/images/hero-banner.jpg" alt="" />',
      recommendedValue: '<img src="/images/hero-banner.jpg" alt="Modern dental consultation room at Harare Dental Clinic" />'
    },
    {
      id: 'rec-5',
      issueId: 'issue-3',
      problem: 'Key services lack dedicated landing pages',
      explanation: 'Teeth whitening and root canals are bundled into a short list on /services. Competitors with dedicated /teeth-whitening-harare pages will outrank you for high-intent search terms.',
      whyItMatters: 'Google ranks specific URLs that thoroughly address a search query. Dedicated service pages allow you to target unique keyword clusters.',
      recommendedSolution: 'Publish 3 individual service pages with pricing ranges, procedure steps, and FAQs.',
      expectedImpact: 'High — New ranking entry points for lucrative dental treatments',
      difficulty: 'Medium (requires writing 300-400 words per treatment)',
    }
  ]
};

// Assign top 5 priorities
DEMO_AUDIT_HARARE_DENTAL.topPriorities = DEMO_AUDIT_HARARE_DENTAL.issues
  .filter(i => i.severity !== 'good')
  .sort((a, b) => b.priorityScore - a.priorityScore)
  .slice(0, 5);
