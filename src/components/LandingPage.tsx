import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  MapPin,
  FileText,
  Search,
  TrendingUp,
  ChevronDown,
  Layers,
  BarChart3,
  Building2,
  Wrench,
  ClipboardList
} from 'lucide-react';

interface LandingPageProps {
  onStartAudit: () => void;
   a: 'Yes. The Agency plan supports managing multiple businesses and generating reports.',
}

const PREVIEW_SCORES = [
  { label: 'Technical SEO', score: 21, max: 25, color: 'bg-indigo-600' },
  { label: 'On-page SEO', score: 19, max: 30, color: 'bg-indigo-600' },
  { label: 'Local SEO', score: 14, max: 25, color: 'bg-amber-500' },
  { label: 'Content', score: 14, max: 20, color: 'bg-amber-500' },
];

const PREVIEW_PRIORITIES = [
  {
    number: '01',
    title: 'Improve homepage title',
    impact: 'High impact',
    effort: 'Easy',
    severity: 'bg-rose-500',
    description: "Your title doesn't clearly communicate your location and primary service.",
  },
  {
    number: '02',
    title: 'Add LocalBusiness schema',
    impact: 'High impact',
    effort: 'Medium',
    severity: 'bg-amber-500',
    description: 'Help search engines understand your business information.',
  },
  {
    number: '03',
    title: 'Improve missing image alt text',
    impact: 'Medium impact',
    effort: 'Easy',
    severity: 'bg-yellow-400',
    description: "7 images don't have descriptive alt text.",
  },
];

const LOCAL_KEYWORDS = [
  'restaurants in Mutare',
  'restaurants near me',
  'Mutare restaurants',
  'rooftop restaurants Mutare',
];

const FAQS = [
  {
    q: 'What is LocalRank?',
    a: 'LocalRank is a local SEO platform that analyzes your website and identifies opportunities to improve your visibility in local search.',
  },
  {
    q: 'Does LocalRank guarantee Google rankings?',
    a: 'No. LocalRank identifies SEO opportunities and provides actionable recommendations, but no tool can guarantee a specific Google ranking.',
  },
  {
    q: 'Do I need SEO experience?',
    a: 'No. Every recommendation explains the problem, why it matters, and what you can do about it.',
  },
  {
    q: 'How long does an audit take?',
    a: 'Most audits complete in under a minute. Larger websites can take a few minutes, depending on page count and site speed.',
  },
  {
    q: 'Can agencies use LocalRank?',
    a: 'Yes. The Agency plan supports managing multiple businesses and generating reports.',
  },
  {
    q: 'Can I track my progress?',
    a: 'Yes. After your first audit, LocalRank tracks your score and resolved issues every time you re-audit your website.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStartAudit, onOpenAuthSignup }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28 border-b border-slate-200 bg-gradient-to-b from-white via-slate-50/60 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.1]">
            Find the issues that may be limiting your Google visibility.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Local search visibility, made simple. LocalRank analyzes your website, local SEO signals, and AI search visibility, then gives
            you a prioritized action plan showing exactly what to fix first.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onStartAudit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-sm transition"
              id="btn-hero-analyze"
            >
              <span>Run My Free SEO Audit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Results in minutes
            </span>
          </div>

          {/* Realistic product preview */}
          <div className="mt-10 relative mx-auto max-w-4xl text-left">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xl">
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-mono text-slate-400">LocalRank Report</span>
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Example LocalRank Audit · Score: 68/100
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Score Column */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Local SEO Health
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-slate-900">68</span>
                      <span className="text-lg font-semibold text-slate-400">/ 100</span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1 font-semibold">Needs improvement</p>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    {PREVIEW_SCORES.map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="font-semibold text-slate-900">
                            {item.score} / {item.max}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className={`${item.color} h-1.5 rounded-full`}
                            style={{ width: `${(item.score / item.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Priority Issues Preview */}
                <div className="md:col-span-2 p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Your top priorities
                    </span>
                    <span className="text-[11px] text-slate-500">Sorted by impact ÷ effort</span>
                  </div>

                  <div className="space-y-2.5">
                    {PREVIEW_PRIORITIES.map((priority) => (
                      <a
                        key={priority.number}
                        href="#issues-fixes"
                        className="block p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">{priority.number}</span>
                          <span className="text-xs font-bold text-slate-900">{priority.title}</span>
                          <span className="inline-flex items-center gap-1.5 ml-auto text-[10px] font-semibold text-slate-500">
                            <span className={`w-2 h-2 rounded-full ${priority.severity}`} />
                            {priority.impact} · {priority.effort}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 pl-7">{priority.description}</p>
                        <p className="text-[11px] font-semibold text-indigo-600 mt-1 pl-7">
                          Fix this →
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== MARKET WEDGE ===================== */}
      <section className="py-8 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-600">
            Built for restaurants, clinics, hotels, service businesses, agencies and local teams.
          </p>
          <p className="text-xs text-indigo-700 font-semibold mt-2">
            Starting with businesses across Zimbabwe.
          </p>
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how-it-works" className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">How it works</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              How LocalRank Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                number: '01',
                title: 'Enter business',
                body: 'Add your website, business type, and location.',
              },
              {
                number: '02',
                title: 'We crawl your site',
                body: 'We check your technical, on-page, and local SEO signals.',
              },
              {
                number: '03',
                title: 'Get prioritized fixes',
                body: 'Get clear explanations and recommended fixes ranked by impact.',
              },
            ].map((step) => (
              <div
                key={step.number}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-2">
                  {step.number}
                </div>
                <h3 className="font-bold text-base text-slate-900">{step.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== WHAT WE CHECK ===================== */}
      <section id="product" className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">What we check</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              Everything that affects your local visibility.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Website SEO</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Page titles</li>
                <li>Meta descriptions</li>
                <li>Headings</li>
                <li>Internal links</li>
                <li>Indexability</li>
                <li>Technical issues</li>
                <li>Mobile experience</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Local SEO</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Business information</li>
                <li>Location signals</li>
                <li>LocalBusiness schema</li>
                <li>NAP consistency</li>
                <li>Service/location pages</li>
                <li>Local relevance</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Content</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Service coverage</li>
                <li>Search intent</li>
                <li>Location-specific content</li>
                <li>Missing pages</li>
                <li>Content opportunities</li>
              </ul>
            </div>
          </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">AI Search Visibility</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Understand how your business may appear in AI-powered search and what signals could improve discoverability.
              </p>
            </div>
        </div>
      </section>

      {/* ===================== 100-POINT SCORE ===================== */}
      <section id="score" className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              The 100-point score
            </span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              A score you can actually understand.
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Your score isn't a mystery number. Every point maps to a specific check.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: 'Technical SEO',
                points: '25 points',
                body: 'Indexability, site structure, performance and technical issues.',
              },
              {
                label: 'On-page SEO',
                points: '30 points',
                body: 'Titles, headings, content, links and page optimization.',
              },
              {
                label: 'Local SEO',
                points: '25 points',
                body: 'Location signals, business information, structured data and local relevance.',
              },
              {
                label: 'Content',
                points: '20 points',
                body: 'Service coverage, relevance and content opportunities.',
              },
            ].map((card) => (
              <div key={card.label} className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="font-bold text-slate-900">{card.label}</h3>
                <p className="text-indigo-700 font-bold text-sm mt-1">{card.points}</p>
                <p className="text-xs text-slate-600 mt-3 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm font-semibold text-slate-900 mt-8">
            Every lost point has an explanation.
          </p>
        </div>
      </section>

      {/* ===================== ISSUES → FIXES ===================== */}
      <section id="issues-fixes" className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Issues become fixes
            </span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              See the Fixes Before You Implement
            </h2>
            <p className="text-slate-600 text-sm mt-2 max-w-xl mx-auto">
              Every issue explains what we found, why it matters, and exactly what to do about it.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                Missing LocalBusiness structured data
              </h3>
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  Impact: High
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Difficulty: Medium
                </span>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold text-slate-500 text-xs uppercase tracking-wider mb-1">
                  What we found
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  Your homepage doesn't currently provide LocalBusiness structured data.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-amber-600 text-xs uppercase tracking-wider mb-1">
                  Why it matters
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  Structured data helps search engines understand important information about your
                  business.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-indigo-600 text-xs uppercase tracking-wider mb-1">
                  Recommended fix
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  Add LocalBusiness JSON-LD containing your business name, address, phone number and
                  other relevant details.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onStartAudit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                View recommended fix
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== LOCAL VISIBILITY ===================== */}
      <section id="local-visibility" className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Local visibility
              </span>
              <h2 className="text-3xl font-bold text-slate-900 mt-1">
                See how your business performs locally.
              </h2>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                LocalRank connects your website, your location and the searches your customers
                actually make.
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-slate-900">Example Local Business</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span className="text-slate-700">Mutare, Zimbabwe</span>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-600" />
                  <span className="text-slate-700">Primary service: Restaurant</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Example local search opportunities
              </h3>
              <div className="space-y-2">
                {LOCAL_KEYWORDS.map((keyword) => (
                  <div
                    key={keyword}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 font-medium"
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                    “{keyword}”
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Example opportunities based on sample business, location, and service data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PROGRESS TRACKING ===================== */}
      <section id="progress" className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Progress tracking
          </span>
          <h2 className="text-3xl font-bold text-slate-900 mt-1">
            Watch your score climb as you fix things.
          </h2>
          <p className="text-slate-600 text-sm mt-2 max-w-xl mx-auto">
            Example progress view after applying recommended fixes.
          </p>

          <div className="mt-10 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left">
            <div className="flex items-baseline gap-3 pb-5 border-b border-slate-100">
              <span className="text-4xl font-bold text-slate-900">68 → 81</span>
              <span className="text-sm font-semibold text-emerald-700">+13 points</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Technical SEO</span>
                  <span className="font-semibold text-slate-900">21 → 24</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">On-page SEO</span>
                  <span className="font-semibold text-slate-900">19 → 23</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Local SEO</span>
                  <span className="font-semibold text-slate-900">14 → 19</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Content</span>
                  <span className="font-semibold text-slate-900">14 → 15</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-slate-700">
                <strong className="text-slate-900">6 issues fixed this month</strong> — see what
                changed every time you re-audit.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== AGENCY ===================== */}
      <section id="agency" className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                For agencies
              </span>
              <h2 className="text-3xl font-bold text-slate-900 mt-1">
                Manage local SEO for every client in one place.
              </h2>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                Run audits, track progress and generate client-ready reports without juggling
                spreadsheets.
              </p>
              <button
                onClick={onOpenAuthSignup}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                Explore the Agency plan
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Building2, label: 'Manage multiple businesses' },
                { icon: BarChart3, label: 'Generate reports' },
                { icon: ClipboardList, label: 'Track issues' },
                { icon: TrendingUp, label: 'Monitor progress' },
                { icon: FileText, label: 'Generate client reports' },
                { icon: Layers, label: 'Manage client work' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3"
                >
                  <item.icon className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="text-sm font-medium text-slate-800">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section id="pricing" className="py-12 sm:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Pricing
            </span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              Start free. Upgrade when you're ready.
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Ongoing visibility management, not just a one-off audit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Free */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Understand</span>
                <h3 className="font-bold text-slate-900 text-xl">Free</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">See what's holding your website back.</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$0</span>
                  <span className="text-xs text-slate-500 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> 1 website audit
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> SEO score
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Top 3 issues
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Basic recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Local search visibility overview
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 text-center">
                <button
                  onClick={onStartAudit}
                  className="w-full py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-xs text-slate-800 transition"
                >
                  Run Free Audit
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">No credit card required</p>
              </div>
            </div>

            {/* Pro */}
            <div className="p-6 rounded-2xl bg-white border-2 border-indigo-600 shadow-lg flex flex-col justify-between relative ring-4 ring-indigo-50">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] uppercase tracking-wider font-bold px-3 py-0.5 rounded-full">
                Most popular
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Improve</span>
                <h3 className="font-bold text-slate-900 text-xl">Pro</h3>
                <p className="text-xs text-indigo-700 mt-1 font-semibold">Improve your search visibility and track your progress.</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$19</span>
                  <span className="text-xs text-slate-500 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /> Full SEO audit
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /> Local SEO analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /> Progress tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /> Re-audits
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-indigo-100 text-center">
                <button
                  onClick={onOpenAuthSignup}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
                >
                  Start Pro
                </button>
                <p className="text-[10px] text-indigo-600/80 mt-1.5 font-medium">Cancel anytime</p>
              </div>
            </div>

            {/* Agency */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Scale</span>
                <h3 className="font-bold text-slate-900 text-xl">Agency</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">Manage local SEO for multiple businesses and clients.</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$79</span>
                  <span className="text-xs text-slate-500 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /> Up to 10 businesses
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /> Progress monitoring
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 text-center">
                <button
                  onClick={onOpenAuthSignup}
                  className="w-full py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-xs text-slate-800 transition"
                >
                  For Agencies
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">For agencies & active teams</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">FAQ</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">Common questions</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => (
              <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between font-semibold text-sm text-slate-900 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      activeFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {activeFaq === index && (
                  <div className="px-5 py-4 text-xs text-slate-600 leading-relaxed bg-white border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="py-12 sm:py-16 bg-indigo-950 text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to see what's holding your business back?
          </h2>
          <p className="mt-4 text-indigo-200/90 text-sm sm:text-base max-w-xl mx-auto">
            Get your free local SEO audit and a prioritized action plan in minutes.
          </p>
          <div className="mt-8">
            <button
              onClick={onStartAudit}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-white text-indigo-950 font-bold text-sm shadow-lg hover:bg-slate-100 transition"
            >
              <span>Analyze My Website</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="py-12 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                  L
                </div>
                <span className="font-bold text-white text-sm">LocalRank</span>
              </div>
              <p className="text-slate-500">Get found when local customers search.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-left">
              <div>
                <h4 className="font-bold text-slate-200 mb-2.5">Product</h4>
                <div className="space-y-1.5">
                  <a href="#product" className="block hover:text-white transition">SEO Audit</a>
                  <a href="#local-visibility" className="block hover:text-white transition">Local SEO</a>
                  <a href="#progress" className="block hover:text-white transition">Tracking</a>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-200 mb-2.5">Resources</h4>
                <div className="space-y-1.5">
                  <span className="block text-slate-500">SEO Guides</span>
                  <span className="block text-slate-500">Help Center</span>
                  <span className="block text-slate-500">Blog</span>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-200 mb-2.5">Company</h4>
                <div className="space-y-1.5">
                  <span className="block text-slate-500">About</span>
                  <span className="block text-slate-500">Contact</span>
                  <a href="#pricing" className="block hover:text-white transition">Pricing</a>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-200 mb-2.5">Legal</h4>
                <div className="space-y-1.5">
                  <span className="block text-slate-500">Privacy</span>
                  <span className="block text-slate-500">Terms</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-900 text-slate-500">
            © 2026 LocalRank
          </div>
        </div>
      </footer>
    </div>
  );
};
