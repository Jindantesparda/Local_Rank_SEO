import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Download,
  FileCode,
  Globe,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Eye,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PageDraft, Business, SeoIssue } from '../types';

interface PageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  issue?: SeoIssue | null;
  initialDraft?: PageDraft | null;
}

export const PageGeneratorModal: React.FC<PageGeneratorModalProps> = ({
  isOpen,
  onClose,
  business,
  issue,
  initialDraft,
}) => {
  const [copiedType, setCopiedType] = useState<'html' | 'markdown' | 'meta' | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'markdown'>('preview');

  if (!isOpen) return null;

  const targetCity = business.location.split(',')[0].trim();
  const primaryService = business.services?.[0] || business.category || 'Your Service';

  // Default rich page draft if not provided
  const draft: PageDraft = initialDraft || issue?.pageDraft || {
    serviceKeyword: `${primaryService} in ${targetCity}`,
    targetLocation: business.location,
    suggestedSlug: `/${primaryService.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${targetCity.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: `${primaryService} in ${targetCity} | ${business.name}`,
    metaDescription: `Looking for top-rated ${primaryService.toLowerCase()} in ${targetCity}? ${business.name} offers premium experiences, central CBD access, and memorable visits. Reserve today!`,
    h1: `Premier ${primaryService} in ${targetCity}`,
    h2s: [
      `Why Choose ${business.name} in ${targetCity}`,
      `Our Signature Offerings & Highlights`,
      `Convenient Location & Neighborhood Guide`,
      `Frequently Asked Questions`,
      `Reserve Your Experience Today`
    ],
    contentSections: [
      {
        heading: `Experience the Best ${primaryService} in Central ${targetCity}`,
        body: `Welcome to ${business.name}, your trusted destination for ${primaryService.toLowerCase()} in ${business.location}. Whether you are visiting ${targetCity} for business or looking for an unforgettable local outing, our dedicated team delivers unmatched hospitality and attention to detail.`,
      },
      {
        heading: `What Makes ${business.name} Distinctive`,
        body: `Located in the vibrant heart of ${targetCity}, we combine prime skyline views, curated culinary craftsmanship, and attentive service. Guests enjoy swift access to major business hubs, secure parking, and a relaxed atmosphere tailored for both private gatherings and corporate engagements.`,
      },
      {
        heading: `Location & Neighborhood Highlights in ${targetCity}`,
        body: `Situated conveniently near central commercial districts and diplomatic hubs, ${business.name} is ideally placed for residents and international travelers alike. Just minutes from major transit routes and top landmarks, our venue offers a seamless blend of convenience and exclusivity.`,
      },
      {
        heading: `Reservations & Inquiries`,
        body: `We recommend booking in advance, particularly for weekend evenings and private events. Contact our concierge team or use our direct inquiry portal to secure your table or suite.`,
      },
    ],
    callToAction: `Book Your Experience at ${business.name} — Call or Reserve Online Today`,
    schemaMarkup: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "${primaryService} in ${targetCity}",
  "provider": {
    "@type": "LocalBusiness",
    "name": "${business.name}",
    "url": "${business.website}"
  },
  "areaServed": {
    "@type": "City",
    "name": "${targetCity}"
  },
  "description": "Premium ${primaryService.toLowerCase()} located in ${business.location}."
}
</script>`,
  };

  const fullHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${draft.title}</title>
  <meta name="description" content="${draft.metaDescription}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="canonical" href="${business.website.replace(/\/$/, '')}${draft.suggestedSlug}">
  ${draft.schemaMarkup}
</head>
<body>
  <article class="service-page">
    <header class="service-header">
      <h1>${draft.h1}</h1>
      <p class="lead">${draft.contentSections[0]?.body || ''}</p>
    </header>

    <main>
${draft.contentSections.slice(1).map(s => `      <section>
        <h2>${s.heading}</h2>
        <p>${s.body}</p>
      </section>`).join('\n\n')}

      <section class="cta-box">
        <h2>${draft.h2s[draft.h2s.length - 1] || 'Reserve Today'}</h2>
        <p>${draft.callToAction}</p>
        <a href="/contact" class="btn-primary">Get In Touch / Book Now</a>
      </section>
    </main>
  </article>
</body>
</html>`;

  const markdownContent = `# ${draft.h1}

> **Title Tag:** ${draft.title}
> **Meta Description:** ${draft.metaDescription}
> **Recommended URL:** \`${business.website.replace(/\/$/, '')}${draft.suggestedSlug}\`

---

${draft.contentSections.map(s => `## ${s.heading}\n\n${s.body}`).join('\n\n')}

### ${draft.callToAction}

[Contact & Reservations](/contact)

---

### Structured Data (JSON-LD)
\`\`\`html
${draft.schemaMarkup}
\`\`\`
`;

  const handleCopy = (text: string, type: 'html' | 'markdown' | 'meta') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([fullHtmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${draft.suggestedSlug.replace(/^\//, '') || 'service-page'}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-white/80 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-left">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-indigo-50/50 to-white flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-sky-500 text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                LocalRank AI Page Drafter
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Draft for "{draft.serviceKeyword}"
            </h2>
            <p className="text-xs text-slate-500">
              Generated to target high-intent local searchers and close the content gap against competitors in {targetCity}.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            id="btn-close-page-generator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Competitor Context & Why it matters banner */}
        <div className="px-6 py-3.5 bg-amber-50/80 border-b border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Competitor Opportunity:</span>
              <span className="font-normal text-amber-800">
                {issue?.competitorContext || `Top competitors in ${targetCity} currently have dedicated landing pages for this service.`}
              </span>
            </div>
            <p className="text-[11px] text-amber-700">
              <strong>Why it matters:</strong> Google needs dedicated, location-specific pages to confidently associate your business with "{draft.serviceKeyword}" searches.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/90 border border-amber-300 text-amber-900 font-semibold">
              URL: {draft.suggestedSlug}
            </span>
          </div>
        </div>

        {/* Quick Meta Stats Pill Bar */}
        <div className="px-6 py-3 bg-slate-50/90 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Views:</span>
            <div className="flex rounded-lg bg-white border border-slate-200 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'preview' ? 'bg-sky-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Visual Preview
              </button>
              <button
                onClick={() => setActiveTab('html')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'html' ? 'bg-sky-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ready HTML Code
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'markdown' ? 'bg-sky-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Markdown / Copy
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(`${draft.title}\n${draft.metaDescription}`, 'meta')}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              {copiedType === 'meta' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedType === 'meta' ? 'Copied Meta!' : 'Copy Meta Tags'}</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download .html</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Metadata Accordion Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                SEO Metadata & Indexing Directives
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">Optimized for Google Local Search</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block mb-0.5">Page Title Tag (60 chars):</span>
                <p className="font-mono text-slate-800 bg-white p-2 rounded-lg border border-slate-200 select-all">
                  {draft.title}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block mb-0.5">Recommended URL Slug:</span>
                <p className="font-mono text-indigo-700 bg-white p-2 rounded-lg border border-slate-200 select-all">
                  {draft.suggestedSlug}
                </p>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-semibold text-xs block mb-0.5">Meta Description:</span>
              <p className="font-mono text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200 select-all">
                {draft.metaDescription}
              </p>
            </div>
          </div>

          {/* Tab 1: Visual Article Preview */}
          {activeTab === 'preview' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-5">
                <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">H1 Heading</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {draft.h1}
                </h1>
              </div>

              <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
                {draft.contentSections.map((section, idx) => (
                  <div key={idx} className="space-y-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {section.heading}
                    </h2>
                    <p className="text-slate-600 leading-relaxed">
                      {section.body}
                    </p>
                  </div>
                ))}

                {/* Call to action box */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 text-center space-y-3">
                  <h3 className="text-base font-bold text-slate-900">{draft.callToAction}</h3>
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sky-500 text-white font-bold text-xs shadow-xs">
                    <span>Contact {business.name} Today</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Ready HTML Code */}
          {activeTab === 'html' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Copy and paste into your CMS (WordPress Custom HTML block, Webflow, Shopify, or Wix):</span>
                <button
                  onClick={() => handleCopy(fullHtmlContent, 'html')}
                  className="text-sky-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedType === 'html' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
                {fullHtmlContent}
              </pre>
            </div>
          )}

          {/* Tab 3: Markdown / Copy */}
          {activeTab === 'markdown' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Formatted for standard rich-text editors and Notion:</span>
                <button
                  onClick={() => handleCopy(markdownContent, 'markdown')}
                  className="text-sky-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedType === 'markdown' ? 'Copied!' : 'Copy Markdown'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                {markdownContent}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Publishing this page fulfills <strong>Priority #1</strong> for {business.name}.</span>
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              Done
            </button>

            <button
              onClick={() => handleCopy(fullHtmlContent, 'html')}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-2"
              id="btn-copy-full-page-html"
            >
              {copiedType === 'html' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied Page to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Full Page HTML</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
