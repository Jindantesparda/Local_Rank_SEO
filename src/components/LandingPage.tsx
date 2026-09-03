import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Globe,
  Search,
  ShieldCheck,
  FileText,
  BarChart3,
  TrendingUp,
  Briefcase,
  Layers,
  Smartphone,
  Link2
} from 'lucide-react';

interface LandingPageProps {
  onStartAudit: () => void;
  onOpenAuthSignup: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartAudit, onOpenAuthSignup }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is LocalRank?',
      a: 'LocalRank is a local SEO platform that analyzes your website and identifies opportunities to improve your visibility in local search. You get a clear score and a prioritized list of fixes.',
    },
    {
      q: 'Does LocalRank guarantee Google rankings?',
      a: 'No. LocalRank identifies SEO opportunities and provides actionable recommendations, but no tool can guarantee a specific Google ranking.',
    },
    {
      q: 'Do I need SEO experience?',
      a: 'No. Every recommendation explains the problem in plain language, why it matters, and exactly what to do about it.',
    },
    {
      q: 'How long does an audit take?',
      a: 'A typical scan of up to 15 pages usually finishes in under a minute. A deep scan of up to 30 pages can take a few minutes depending on your website speed.',
    },
    {
      q: 'Can agencies use LocalRank?',
      a: 'Yes. The Business plan lets you manage multiple businesses from one workspace, track issues, and re-audit each site to monitor progress.',
    },
    {
      q: 'Can I track my progress?',
      a: 'Yes. After you apply fixes and run a new audit, LocalRank records your previous score, resolved issues, and new priorities so you can see your progress over time.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden pt-16 pb-16 lg:pt-24 lg:pb-20 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6">
            Local search visibility, made simple
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.12]">
            Get found when local customers search.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            LocalRank analyzes your website and local SEO signals, then gives you a prioritized
            action plan showing exactly what to fix first.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <button
              onClick={onStartAudit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-sm transition"
              id="btn-hero-analyze"
            >
              <span>Get My Free SEO Audit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-slate-500">No credit card required · Results in minutes</p>
          </div>

          <p className="mt-8 text-sm text-slate-500 max-w-2xl mx-auto">
            Built for restaurants, clinics, hotels, service businesses, agencies and local teams.
            Starting with businesses across Zimbabwe — and built to grow with you.
          </p>
        </div>
      </section>

      {/* ================= PRODUCT MOCKUP ================= */}
      <section id="product" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Product</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">A real local SEO report, not a mystery score</h2>
          </div>

          <div className="max-w-3xl mx-auto rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-left">
            {/* Report header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                  L
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">LocalRank Report</p>
                  <p className="text-[11px] text-slate-500">manicaskyview.co.zw</p>
                </div>
              </div>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                Updated just now
              </span>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* Business + overall score */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Manica SkyView</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Mutare, Zimbabwe
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Local SEO Health
                  </p>
                  <div className="flex items-baseline gap-2 justify-start sm:justify-end">
                    <span className="text-4xl font-bold text-slate-900">68</span>
                    <span className="text-lg font-semibold text-slate-400">/ 100</span>
                  </div>
                  <p className="text-xs font-semibold text-amber-600 mt-0.5">Needs improvement</p>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="space-y-3">
                {[
                  { label: 'Technical SEO', score: 21, max: 25, width: '84%' },
                  { label: 'On-page SEO', score: 19, max: 30, width: '63%' },
                  { label: 'Local SEO', score: 14, max: 25, width: '56%' },
                  { label: 'Content', score: 14, max: 20, width: '70%' },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-slate-600">{row.label}</span>
                      <span className="font-semibold text-slate-900">
                        {row.score} / {row.max}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-indigo-600"
                        style={{ width: row.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Top priorities */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900">Your top priorities</h4>
                  <span className="text-[11px] text-slate-400">Sorted by impact ÷ effort</span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">01 — Improve homepage title</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            High impact · Easy
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Your title doesn't clearly communicate your location and primary service.
                        </p>
                      </div>
                    </div>
                    <a
                      href="#fixes"
                      className="inline-block mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      View recommended fix →
                    </a>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">02 — Add LocalBusiness schema</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            High impact · Medium
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Help search engines understand your business name, address and services.
                        </p>
                      </div>
                    </div>
                    <a
                      href="#fixes"
                      className="inline-block mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      View recommended fix →
                    </a>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">03 — Improve missing image alt text</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Medium impact · Easy
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          7 images don't have descriptive alt text.
                        </p>
                      </div>
                    </div>
                    <a
                      href="#fixes"
                      className="inline-block mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      View recommended fix →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= LOCAL VISIBILITY ================= */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Local SEO</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              See how your business performs locally
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              LocalRank connects your website, your location and local search behavior.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Business profile</h3>
              </div>
              <div className="space-y-1.5 text-sm text-slate-700">
                <p><span className="text-slate-500">Business:</span> Manica SkyView</p>
                <p><span className="text-slate-500">Location:</span> Mutare, Zimbabwe</p>
                <p><span className="text-slate-500">Primary service:</span> Restaurant</p>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Local search opportunities</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  'restaurants in Mutare',
                  'restaurants near me',
                  'Mutare restaurants',
                  'rooftop restaurants Mutare',
                ].map((kw) => (
                  <span
                    key={kw}
                    className="text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                Website + Location + Search → Visibility. No guaranteed rankings — just clear,
                prioritized opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">How It Works</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              From website to action plan in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                icon: Globe,
                title: 'Enter your website',
                body: 'Tell LocalRank your website, business type and location.',
              },
              {
                num: '02',
                icon: BarChart3,
                title: 'Get analyzed',
                body: 'LocalRank checks your technical, on-page and local SEO signals.',
              },
              {
                num: '03',
                icon: CheckCircle2,
                title: 'Fix what matters',
                body: 'Get a prioritized list of issues with clear explanations and recommended fixes.',
              },
            ].map((step) => (
              <div key={step.num} className="p-6 rounded-xl bg-white border border-slate-200 text-left">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-base mb-4">
                  {step.num}
                </div>
                <step.icon className="w-5 h-5 text-indigo-600 mb-2" />
                <h3 className="font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= WHAT LOCALRANK CHECKS ================= */}
      <section id="checks" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">What We Check</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              Everything that affects your local visibility
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Website SEO</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  'Page titles',
                  'Meta descriptions',
                  'Headings',
                  'Internal links',
                  'Indexability',
                  'Technical issues',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Local SEO</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  'Business information',
                  'Location signals',
                  'LocalBusiness schema',
                  'NAP consistency',
                  'Service / location pages',
                  'Local relevance',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Content</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  'Service coverage',
                  'Search intent',
                  'Location-specific content',
                  'Missing pages',
                  'Content opportunities',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 100-POINT SCORE ================= */}
      <section id="score" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">The Score</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              A score you can actually understand
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Your score isn't a mystery number. Every lost point has an explanation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: ShieldCheck,
                label: 'Technical SEO',
                points: '25 points',
                body: 'Indexability, site structure, performance and technical issues.',
              },
              {
                icon: FileText,
                label: 'On-page SEO',
                points: '30 points',
                body: 'Titles, headings, content, links and page optimization.',
              },
              {
                icon: MapPin,
                label: 'Local SEO',
                points: '25 points',
                body: 'Location signals, business information, structured data and local relevance.',
              },
              {
                icon: Layers,
                label: 'Content',
                points: '20 points',
                body: 'Service coverage, relevance and content opportunities.',
              },
            ].map((cat) => (
              <div key={cat.label} className="p-5 rounded-xl bg-white border border-slate-200">
                <cat.icon className="w-5 h-5 text-indigo-600 mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">{cat.label}</h3>
                <p className="text-xs font-semibold text-indigo-600 mt-0.5">{cat.points}</p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{cat.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ISSUES → FIXES ================= */}
      <section id="fixes" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Issues → Fixes</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              Recommendations you can actually act on
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              LocalRank doesn't just tell you what's wrong. It explains why it matters and shows
              you the fix.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6 text-left">
            <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900">Missing LocalBusiness structured data</h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span className="font-semibold text-slate-500">
                    Impact: <span className="text-rose-700 font-bold">High</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-slate-500">
                    Difficulty: <span className="text-amber-700 font-bold">Medium</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
              <div className="p-4 rounded-lg bg-white border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1.5">
                  What we found
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Your homepage doesn't currently provide LocalBusiness structured data.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1.5">
                  Why it matters
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Structured data helps search engines understand important information about your
                  business, like name, address and opening hours.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1.5">
                  Recommended fix
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Add LocalBusiness JSON-LD containing your business name, address, phone number
                  and other relevant details.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={onStartAudit}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View your own recommended fixes →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROGRESS TRACKING ================= */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Progress Tracking</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              See your progress after you fix things
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Re-audit after applying fixes and LocalRank tracks what changed.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Example progress
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold text-slate-900">68</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="text-4xl font-bold text-emerald-600">81</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">6 issues fixed this month</p>
              </div>

              <div className="space-y-2 text-xs w-full sm:w-72">
                {[
                  { label: 'Technical SEO', from: 21, to: 24 },
                  { label: 'On-page SEO', from: 19, to: 25 },
                  { label: 'Local SEO', from: 14, to: 20 },
                  { label: 'Content', from: 14, to: 12 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-slate-600">{row.label}</span>
                    <span className="font-semibold text-slate-900">
                      {row.from} <span className="text-slate-400">→</span> {row.to}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= AGENCY ================= */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">For Agencies</span>
              <h2 className="text-3xl font-bold text-slate-900 mt-1">
                Manage local SEO for every client in one place
              </h2>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                LocalRank is built to grow from single businesses to agencies and multi-location
                teams. Manage multiple businesses, track issues, and re-audit to monitor client
                progress.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: Briefcase, label: 'Manage multiple businesses' },
                { icon: BarChart3, label: 'Track issues per client' },
                { icon: TrendingUp, label: 'Monitor progress over time' },
                { icon: Globe, label: 'Re-audit on your schedule' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                  <item.icon className="w-4 h-4 text-indigo-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 text-center">
            White-label reports and competitor tracking are on the roadmap.
          </p>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200" id="pricing">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1">
              Start free. Upgrade when you're ready to track progress.
            </h2>
            <p className="text-slate-600 text-sm mt-2.5 max-w-xl mx-auto">
              LocalRank is built for ongoing local visibility management — not a one-time audit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Free */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Free</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">See what's holding your website back</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$0</span>
                  <span className="text-xs font-medium text-slate-500 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Website audit
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    SEO score
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Top 5 issues
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Basic recommendations
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                <button
                  onClick={onStartAudit}
                  className="w-full py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-xs text-slate-800 transition"
                  id="btn-pricing-free"
                >
                  Analyze my website →
                </button>
              </div>
            </div>

            {/* Starter */}
            <div className="p-6 rounded-xl bg-white border-2 border-indigo-600 shadow-sm relative flex flex-col justify-between">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] uppercase tracking-wider font-bold px-3 py-0.5 rounded-full">
                Most Popular
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Starter</h3>
                <p className="text-xs text-indigo-700 mt-1 font-semibold">For businesses serious about visibility</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$9</span>
                  <span className="text-xs font-medium text-slate-500 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Everything in Free
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Full SEO audit
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Local SEO analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Detailed recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Progress tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Recurring re-audits
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-indigo-100 text-center">
                <button
                  onClick={onOpenAuthSignup}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
                  id="btn-pricing-starter"
                >
                  Start Starter →
                </button>
              </div>
            </div>

            {/* Business */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Business</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">For agencies & multiple sites</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$19</span>
                  <span className="text-xs font-medium text-slate-500 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Everything in Starter
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Up to 3 businesses
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Client management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Multi-business switcher
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    Deeper crawling
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                <button
                  onClick={onOpenAuthSignup}
                  className="w-full py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-xs text-slate-800 transition"
                  id="btn-pricing-business"
                >
                  For agencies →
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 mt-8">
            Cancel or upgrade at any time. Prices in USD and subject to change as we grow.
          </p>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">FAQ</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
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

      {/* ================= FINAL CTA ================= */}
      <section className="py-16 sm:py-20 bg-indigo-950 text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to see what's holding your business back?
          </h2>
          <p className="mt-4 text-indigo-200/90 text-sm sm:text-base max-w-xl mx-auto">
            Get your 100-point local SEO score and a prioritized list of fixes.
          </p>
          <div className="mt-8">
            <button
              onClick={onStartAudit}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-white text-indigo-950 font-bold text-sm shadow-lg hover:bg-slate-100 transition"
              id="btn-footer-analyze"
            >
              <span>Analyze My Website</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-6 text-[11px] text-indigo-300/70">
            Powered by automation and AI-assisted recommendations.
          </p>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="py-12 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-8 border-b border-slate-800/60">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                  L
                </div>
                <span className="font-bold text-white text-sm">LocalRank</span>
              </div>
              <p className="text-slate-500 mt-3 leading-relaxed">
                Get found when local customers search.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[10px]">Product</h4>
              <ul className="space-y-2">
                <li><a href="#product" className="hover:text-white transition">SEO Audit</a></li>
                <li><a href="#checks" className="hover:text-white transition">Local SEO</a></li>
                <li><a href="#score" className="hover:text-white transition">100-Point Score</a></li>
                <li><a href="#fixes" className="hover:text-white transition">Tracking</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[10px]">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
                <li><a href="#faq" className="hover:text-white transition">Help Center</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[10px]">Company</h4>
              <ul className="space-y-2">
                <li><a href="#product" className="hover:text-white transition">About</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="mailto:support@localrank.app" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[10px]">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 LocalRank. All rights reserved.</p>
            <p className="text-slate-500">Local SEO platform for businesses and agencies.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
