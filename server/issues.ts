import { CrawledPage, Business, SeoIssue, IssueCategory, IssueSeverity, DifficultyLevel, ImpactLevel } from '../src/types';
import { CrawlResult } from './crawler';
import { ScoreBreakdown } from './scoring';
import { guessCountryCode } from './country';

export function generateIssues(
  crawlData: CrawlResult,
  scores: ScoreBreakdown,
  business: Business
): { issues: SeoIssue[]; topPriorities: SeoIssue[] } {
  const { pages, siteWide } = crawlData;
  const homepage = pages.find(p => p.path === '/' || p.path === '') || pages[0] || {
    url: business.website,
    title: '',
    metaDescription: '',
    h1: '',
    images: [],
    missingAltCount: 0,
    hasStructuredData: false,
  };

  const issues: SeoIssue[] = [];

  // Helper to add issue
  const addIssue = (item: {
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
    suggestedFix?: SeoIssue['suggestedFix'];
    status?: 'open' | 'fixed' | 'dismissed';
  }) => {
    // Impact numeric: High=3, Medium=2, Low=1
    const impactVal = item.impact === 'high' ? 3 : item.impact === 'medium' ? 2 : 1;
    // Confidence: High=3, Medium=2.5, Low=2
    const confidenceVal = item.severity === 'critical' ? 3 : item.severity === 'high' ? 3 : 2.5;
    // Effort: Easy=1, Medium=2, Hard=3
    const effortVal = item.difficulty === 'easy' ? 1 : item.difficulty === 'medium' ? 2 : 3;

    // Priority = Impact * Confidence / Effort (Good issues receive 0 priority)
    const priorityScore = item.severity === 'good'
      ? 0
      : Number(((impactVal * confidenceVal) / effortVal).toFixed(1));

    issues.push({
      ...item,
      priorityScore,
      status: item.status || (item.severity === 'good' ? 'fixed' : 'open'),
    });
  };

  // ----------------------------------------------------
  // TECHNICAL SEO ISSUES
  // ----------------------------------------------------
  if (!siteWide.https) {
    addIssue({
      id: 'issue-https-missing',
      category: 'technical',
      severity: 'critical',
      title: 'Your website does not enforce secure HTTPS',
      description: 'Your website is loaded over insecure HTTP, which displays a "Not Secure" warning in modern browsers.',
      affectedPage: 'Site-wide',
      whyItMatters: 'Google penalizes non-HTTPS websites in search rankings. Furthermore, potential customers will abandon your site when they see security warnings.',
      recommendedAction: 'Install a free SSL certificate (via Let\'s Encrypt or your web host) and redirect all HTTP traffic to HTTPS.',
      difficulty: 'medium',
      impact: 'high',
    });
  } else {
    addIssue({
      id: 'issue-https-good',
      category: 'technical',
      severity: 'good',
      title: 'Your website uses secure HTTPS',
      description: 'SSL encryption is active across your domain, protecting visitor privacy and fulfilling Google\'s core baseline.',
      affectedPage: 'Site-wide',
      whyItMatters: 'Satisfies Google\'s core ranking security requirement and builds immediate trust with visitors.',
      recommendedAction: 'Maintain auto-renewal of your SSL certificate.',
      difficulty: 'easy',
      impact: 'high',
    });
  }

  if (siteWide.robotsTxt) {
    addIssue({
      id: 'issue-robots-good',
      category: 'technical',
      severity: 'good',
      title: 'Robots.txt is active and crawlable',
      description: 'Search engines can successfully check crawl guidelines via /robots.txt.',
      affectedPage: '/robots.txt',
      whyItMatters: 'Ensures Googlebot does not waste crawl budget on unnecessary script or admin files.',
      recommendedAction: 'No action needed.',
      difficulty: 'easy',
      impact: 'medium',
    });
  } else {
    addIssue({
      id: 'issue-robots-missing',
      category: 'technical',
      severity: 'medium',
      title: 'Missing robots.txt file',
      description: 'No robots.txt file was found at the root of your domain (e.g. /robots.txt returned 404).',
      affectedPage: '/robots.txt',
      whyItMatters: 'While not mandatory, robots.txt tells Google which pages to prioritize and points crawlers to your XML sitemap.',
      recommendedAction: 'Create a simple robots.txt file at the root of your server referencing your sitemap.',
      difficulty: 'easy',
      impact: 'medium',
      suggestedFix: {
        type: 'code',
        recommended: `User-agent: *\nAllow: /\nSitemap: ${business.website.replace(/\/$/, '')}/sitemap.xml`,
        language: 'text',
        targetElement: 'File at /robots.txt',
      }
    });
  }

  if (siteWide.sitemapXml) {
    addIssue({
      id: 'issue-sitemap-good',
      category: 'technical',
      severity: 'good',
      title: 'XML Sitemap found',
      description: 'Your XML sitemap is present, helping Google discover your website structure quickly.',
      affectedPage: '/sitemap.xml',
      whyItMatters: 'Accelerates indexing of newly added services or updated contact information.',
      recommendedAction: 'Keep sitemap submitted in Google Search Console.',
      difficulty: 'easy',
      impact: 'medium',
    });
  } else {
    addIssue({
      id: 'issue-sitemap-missing',
      category: 'technical',
      severity: 'high',
      title: 'XML Sitemap could not be found at /sitemap.xml',
      description: 'Search crawlers could not locate an XML sitemap at the standard /sitemap.xml location.',
      affectedPage: '/sitemap.xml',
      whyItMatters: 'Without a sitemap, Google might miss secondary service pages or take weeks to discover new blog posts.',
      recommendedAction: 'Generate an XML sitemap using your CMS (WordPress Yoast/RankMath, Shopify, or a generator) and submit it to Google Search Console.',
      difficulty: 'easy',
      impact: 'high',
    });
  }

  if (siteWide.brokenLinks.length > 0) {
    addIssue({
      id: 'issue-broken-links',
      category: 'technical',
      severity: 'high',
      title: `${siteWide.brokenLinks.length} broken link(s) detected`,
      description: `During crawling, ${siteWide.brokenLinks.length} internal URL(s) returned HTTP errors (404/500).`,
      affectedPage: siteWide.brokenLinks.slice(0, 3).join(', '),
      whyItMatters: 'Broken links frustrate customers and signal to Google that the website is outdated or poorly maintained.',
      recommendedAction: 'Update or remove broken internal links or set up 301 redirects to the correct active destination.',
      difficulty: 'easy',
      impact: 'high',
    });
  }

  // ----------------------------------------------------
  // ON-PAGE SEO ISSUES
  // ----------------------------------------------------
  // Homepage Title
  const homeTitle = homepage.title || '';
  const cleanLoc = business.location.split(',')[0].trim();
  const primaryService = business.services?.[0] || business.category;

  if (!homeTitle) {
    addIssue({
      id: 'issue-title-missing',
      category: 'onpage',
      severity: 'critical',
      title: 'Your homepage is completely missing a title tag',
      description: 'Your homepage HTML has an empty or nonexistent <title> element.',
      affectedPage: homepage.url,
      whyItMatters: 'The title tag is the single most important on-page SEO ranking signal. Without it, Google has to guess what your website is about.',
      recommendedAction: 'Add a distinct, keyword-rich title tag to the <head> of your homepage.',
      difficulty: 'easy',
      impact: 'high',
      suggestedFix: {
        type: 'title',
        current: '<title></title>',
        recommended: `${business.name} | ${primaryService} in ${cleanLoc}`,
        targetElement: '<title> in <head>',
      }
    });
  } else if (!homeTitle.toLowerCase().includes(cleanLoc.toLowerCase()) || homeTitle.length < 25) {
    addIssue({
      id: 'issue-title-suboptimal',
      category: 'onpage',
      severity: 'high',
      title: 'Homepage title does not clearly target your service or location',
      description: `Your current homepage title is "${homeTitle}". It lacks your primary local keyword ("${cleanLoc}") or primary service offering.`,
      affectedPage: homepage.url,
      whyItMatters: 'When local customers search on Google (e.g. "${primaryService} in ${cleanLoc}"), Google matches their search intent against your page title.',
      recommendedAction: 'Rewrite your homepage title to combine your brand name, core specialty, and primary city.',
      difficulty: 'easy',
      impact: 'high',
      suggestedFix: {
        type: 'title',
        current: homeTitle,
        recommended: `${business.name} | ${primaryService} in ${cleanLoc}`,
        targetElement: '<title> on homepage',
      }
    });
  } else {
    addIssue({
      id: 'issue-title-good',
      category: 'onpage',
      severity: 'good',
      title: 'Homepage title is well-targeted',
      description: `Your homepage title (${homeTitle.length} characters) includes relevant branding and local keywords.`,
      affectedPage: homepage.url,
      whyItMatters: 'Provides clear relevance to search engines and displays cleanly in Google search snippet previews.',
      recommendedAction: 'Keep current title structure for brand consistency.',
      difficulty: 'easy',
      impact: 'high',
    });
  }

  // Meta Description
  const homeMeta = homepage.metaDescription || '';
  if (!homeMeta) {
    addIssue({
      id: 'issue-meta-missing',
      category: 'onpage',
      severity: 'high',
      title: 'Missing meta description on homepage',
      description: 'Your homepage does not have a <meta name="description"> tag.',
      affectedPage: homepage.url,
      whyItMatters: 'Google will pull random fragments of text from your page, resulting in an unappealing search snippet that loses clicks to competitors.',
      recommendedAction: 'Add a 130-160 character meta description highlighting your services, location, and a clear call to action.',
      difficulty: 'easy',
      impact: 'medium',
      suggestedFix: {
        type: 'metaDescription',
        current: 'None',
        recommended: `Looking for top-rated ${primaryService.toLowerCase()} in ${cleanLoc}? ${business.name} delivers reliable, professional service. Contact us today!`,
        targetElement: '<meta name="description"> in <head>',
      }
    });
  } else if (homeMeta.length < 70) {
    addIssue({
      id: 'issue-meta-short',
      category: 'onpage',
      severity: 'medium',
      title: 'Homepage meta description is too brief',
      description: `Your meta description is only ${homeMeta.length} characters long. A full snippet is 140-160 characters.`,
      affectedPage: homepage.url,
      whyItMatters: 'Short descriptions miss opportunities to communicate key selling points, phone numbers, or reasons to choose your business.',
      recommendedAction: 'Expand your meta description with key service highlights and a persuasive call to action.',
      difficulty: 'easy',
      impact: 'medium',
      suggestedFix: {
        type: 'metaDescription',
        current: homeMeta,
        recommended: `${business.name} offers expert ${business.services?.slice(0, 2).join(' and ') || business.category} in ${cleanLoc}. Get in touch with our team today for friendly, fast service!`,
        targetElement: '<meta name="description"> in <head>',
      }
    });
  } else {
    addIssue({
      id: 'issue-meta-good',
      category: 'onpage',
      severity: 'good',
      title: 'Meta description is present with good length',
      description: `Homepage description is ${homeMeta.length} characters, fitting well within Google search display limits.`,
      affectedPage: homepage.url,
      whyItMatters: 'Helps maximize click-through rate from search result pages.',
      recommendedAction: 'Periodically test promotional copy or seasonal offers.',
      difficulty: 'easy',
      impact: 'medium',
    });
  }

  // H1 Heading
  const homeH1 = homepage.h1 || '';
  if (!homeH1) {
    addIssue({
      id: 'issue-h1-missing',
      category: 'onpage',
      severity: 'high',
      title: 'Homepage is missing an H1 main heading',
      description: 'No <h1> heading was detected on your homepage.',
      affectedPage: homepage.url,
      whyItMatters: 'The H1 heading is the primary structural landmark of your page. Google uses it to verify the core subject matter.',
      recommendedAction: 'Add a prominent <h1> heading near the top of your page containing your business name and main service.',
      difficulty: 'easy',
      impact: 'high',
      suggestedFix: {
        type: 'content',
        recommended: `<h1>${business.name} — ${primaryService} in ${cleanLoc}</h1>`,
        targetElement: 'Top of page body',
      }
    });
  } else {
    addIssue({
      id: 'issue-h1-good',
      category: 'onpage',
      severity: 'good',
      title: 'Homepage contains a clear H1 heading',
      description: `Found <h1>: "${homeH1}".`,
      affectedPage: homepage.url,
      whyItMatters: 'Provides clean structural hierarchy for search engine robots and screen readers.',
      recommendedAction: 'Ensure only one primary H1 exists per page.',
      difficulty: 'easy',
      impact: 'medium',
    });
  }

  // Image Alt Tags
  let totalImgs = 0;
  let missingAlt = 0;
  pages.forEach(p => {
    totalImgs += p.images.length;
    missingAlt += p.missingAltCount;
  });

  if (missingAlt > 0) {
    addIssue({
      id: 'issue-images-missing-alt',
      category: 'onpage',
      severity: missingAlt >= 5 ? 'high' : 'medium',
      title: `${missingAlt} image(s) are missing descriptive alt text`,
      description: `${missingAlt} of ${totalImgs} images across your crawled pages do not have alt="" attributes.`,
      affectedPage: pages.find(p => p.missingAltCount > 0)?.url || homepage.url,
      whyItMatters: 'Google cannot "see" images without alt attributes. Alt text helps your images appear in Google Image Search and ensures accessibility for vision-impaired users.',
      recommendedAction: 'Add concise, descriptive alt text to every photo explaining what is depicted.',
      difficulty: 'easy',
      impact: 'medium',
      suggestedFix: {
        type: 'altText',
        current: '<img src="/banner.jpg" alt="" />',
        recommended: `<img src="/banner.jpg" alt="${business.name} ${primaryService} facilities in ${cleanLoc}" />`,
        targetElement: 'Image tags in HTML',
      }
    });
  } else if (totalImgs > 0) {
    addIssue({
      id: 'issue-images-good',
      category: 'onpage',
      severity: 'good',
      title: 'All images have descriptive alt text',
      description: `All ${totalImgs} audited images possess non-empty alt text.`,
      affectedPage: 'Site-wide',
      whyItMatters: 'Enables inclusion in Google Image search and passes web accessibility standards.',
      recommendedAction: 'Maintain this practice when uploading new photos.',
      difficulty: 'easy',
      impact: 'medium',
    });
  }

  // ----------------------------------------------------
  // LOCAL SEO ISSUES
  // ----------------------------------------------------
  // LocalBusiness Schema
  const hasSchema = pages.some(p => p.hasStructuredData);
  if (!hasSchema) {
    const countryCode = guessCountryCode(business.location);
    const address: { '@type': string; addressLocality: string; addressCountry?: string } = {
      '@type': 'PostalAddress',
      addressLocality: cleanLoc,
    };
    if (countryCode) {
      address.addressCountry = countryCode;
    }

    const sampleSchema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": business.name,
      "description": business.description || `${business.category} in ${business.location}`,
      "url": business.website,
      "address": address
    };

    addIssue({
      id: 'issue-schema-missing',
      category: 'local',
      severity: 'high',
      title: 'Missing LocalBusiness structured data (Schema.org)',
      description: 'Your website does not include machine-readable Schema markup for local businesses.',
      affectedPage: homepage.url,
      whyItMatters: 'Structured data explicitly informs Google of your official business name, coordinates, category, and contact numbers, significantly improving your presence in the Google Local 3-Pack and Knowledge Panel.',
      recommendedAction: 'Paste a valid LocalBusiness JSON-LD script into the <head> of your website.',
      difficulty: 'medium',
      impact: 'high',
      suggestedFix: {
        type: 'schema',
        recommended: JSON.stringify(sampleSchema, null, 2),
        language: 'json',
        targetElement: '<head> tag in index.html',
      }
    });
  } else {
    addIssue({
      id: 'issue-schema-good',
      category: 'local',
      severity: 'good',
      title: 'Structured data (Schema.org) detected',
      description: 'Your website contains structured JSON-LD data to help Google interpret your business entities.',
      affectedPage: homepage.url,
      whyItMatters: 'Increases chances of rich search snippets and local entity disambiguation.',
      recommendedAction: 'Verify periodically with Google\'s Rich Results Test tool.',
      difficulty: 'easy',
      impact: 'high',
    });
  }

  // Location Signals
  const locKeywords = cleanLoc.toLowerCase();
  const pagesWithLoc = pages.filter(p => {
    const txt = `${p.title} ${p.metaDescription} ${p.h1}`.toLowerCase();
    return txt.includes(locKeywords);
  });

  if (pagesWithLoc.length <= 1) {
    addIssue({
      id: 'issue-location-weak',
      category: 'local',
      severity: 'medium',
      title: `Weak local signals for "${cleanLoc}" across your website`,
      description: `Your target city or region ("${cleanLoc}") is only mentioned on ${pagesWithLoc.length} page(s).`,
      affectedPage: 'Site-wide',
      whyItMatters: 'Google relies on local relevance signals to determine geographic ranking boundaries. Weak location signals make it hard to rank outside your immediate street.',
      recommendedAction: `Incorporate natural mentions of ${cleanLoc}, your neighborhood, and surrounding areas in your page footers, about page, and service descriptions.`,
      difficulty: 'easy',
      impact: 'medium',
    });
  }

  // Clickable Phone
  const hasTelLink = pages.some(p => p.url.includes('contact') || p.internalLinks.some(l => l.includes('contact')));
  if (hasTelLink) {
    addIssue({
      id: 'issue-contact-good',
      category: 'local',
      severity: 'good',
      title: 'Dedicated Contact page discovered',
      description: 'Your website includes an accessible contact page where customers can find you.',
      affectedPage: '/contact',
      whyItMatters: 'Builds consumer confidence and assists Google in verifying physical existence.',
      recommendedAction: 'Ensure your phone number is clickable with <a href="tel:..."> for mobile visitors.',
      difficulty: 'easy',
      impact: 'medium',
    });
  }

  // ----------------------------------------------------
  // CONTENT ISSUES
  // ----------------------------------------------------
  // Dedicated service pages check
  if (business.services && business.services.length > 1 && pages.length <= 4) {
    addIssue({
      id: 'issue-services-pages-missing',
      category: 'content',
      severity: 'high',
      title: 'Multiple services bundled without dedicated landing pages',
      description: `You offer ${business.services.length} services (${business.services.join(', ')}), but your website has only ${pages.length} total pages crawled.`,
      affectedPage: 'Site-wide',
      whyItMatters: 'Customers search for specific problems (e.g. "${business.services[0]} near me"). Having a dedicated page for each core service allows you to target high-intent search terms.',
      recommendedAction: 'Create individual landing pages for each main service offering with detailed descriptions, pricing indicators, and FAQs.',
      difficulty: 'medium',
      impact: 'high',
    });
  }

  // Thin pages check
  const thinPages = pages.filter(p => p.statusCode === 200 && p.wordCount > 0 && p.wordCount < 120);
  if (thinPages.length > 0) {
    addIssue({
      id: 'issue-thin-content',
      category: 'content',
      severity: 'medium',
      title: `${thinPages.length} page(s) have thin content (< 120 words)`,
      description: `Pages like ${thinPages[0].path} have very low word count (${thinPages[0].wordCount} words).`,
      affectedPage: thinPages.map(p => p.path).slice(0, 3).join(', '),
      whyItMatters: 'Thin pages provide little context for Google to index, and Google may treat them as low quality.',
      recommendedAction: 'Expand each page with helpful customer information, FAQs, photos, or service details (aim for at least 300 words).',
      difficulty: 'medium',
      impact: 'medium',
    });
  }

  // Sort by priorityScore descending for top priorities
  const nonGoodIssues = issues.filter(i => i.severity !== 'good');
  const sortedByPriority = [...nonGoodIssues].sort((a, b) => b.priorityScore - a.priorityScore);
  const topPriorities = sortedByPriority.slice(0, 5);

  return {
    issues,
    topPriorities,
  };
}
