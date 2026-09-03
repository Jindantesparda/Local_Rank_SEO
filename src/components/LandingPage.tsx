import React, { useState } from 'react';
import {
  ArrowRight,
  Play,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  Zap,
  ShieldCheck,
  Globe,
  MapPin,
  FileCode,
  Copy,
  Check,
  ChevronDown,
  TrendingUp,
  Award,
  Layers
} from 'lucide-react';

interface LandingPageProps {
  onStartAudit: () => void;
  onTryDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartAudit, onTryDemo }) => {
  const [copiedSample, setCopiedSample] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const handleCopySample = () => {
    navigator.clipboard.writeText('ABC Plumbing | Professional Plumbers in Harare');
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const faqs = [
    {
      q: 'What is included in the free audit?',
      a: 'The free audit analyzes up to 20 pages and highlights your five highest-priority SEO issues.'
    },
    {
      q: 'Do I need technical SEO knowledge?',
      a: 'No. LocalRank explains each issue in plain language and tells you what to do next.'
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes.'
    },
    {
      q: 'Does LocalRank automatically change my website?',
      a: 'Not in the current version. LocalRank provides recommended fixes that you can review and apply yourself.'
    },
    {
      q: 'Does LocalRank guarantee higher Google rankings?',
      a: 'No. LocalRank identifies and prioritizes SEO improvements, but search rankings depend on many factors outside the platform\'s control.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28 border-b border-slate-200 bg-gradient-to-b from-white via-slate-50/50 to-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Tag pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Built for Restaurants, Clinics, Hotels & Local Services</span>
          </div>

          {/* Core Prompt Hero Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.15]">
            Find the issues that may be limiting your Google visibility.
          </h1>

          {/* Supporting Text */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            LocalRank AI analyzes your website and gives you a simple, prioritized SEO action plan—so you know exactly what to fix first.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onStartAudit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-base shadow-sm transition duration-150"
              id="btn-hero-analyze"
            >
              <span>Analyze My Website</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onTryDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-medium text-base border border-slate-200 shadow-xs transition"
              id="btn-hero-demo"
            >
              <Play className="w-4 h-4 text-indigo-600 fill-indigo-600" />
              <span>Try Demo</span>
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Real crawler, no fake metrics
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100-point deterministic score
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Actionable in 15 mins
            </span>
          </div>

          {/* Interactive Bento Preview Dashboard Card */}
          <div className="mt-14 relative mx-auto max-w-4xl text-left">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xl">
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-mono text-slate-400">audit-report-demo.localrank.ai</span>
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Harare Dental Clinic · Score: 68/100 (+8)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Score Column */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall SEO Score</span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-slate-900">68</span>
                      <span className="text-lg font-semibold text-slate-400">/ 100</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">+8 pts</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">14 pages crawled and evaluated</p>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-600">Technical SEO</span>
                      <span className="font-semibold text-slate-900">21 / 25</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '84%' }} />
                    </div>

                    <div className="flex justify-between font-medium">
                      <span className="text-slate-600">On-page SEO</span>
                      <span className="font-semibold text-slate-900">19 / 30</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '63%' }} />
                    </div>

                    <div className="flex justify-between font-medium">
                      <span className="text-slate-600">Local SEO</span>
                      <span className="font-semibold text-slate-900">14 / 25</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '56%' }} />
                    </div>
                  </div>
                </div>

                {/* Priority Issues Preview */}
                <div className="md:col-span-2 p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Your Top Priorities (Fix First)
                    </span>
                    <span className="text-[11px] text-slate-500">Sorted by Impact ÷ Effort</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <p className="text-xs font-bold text-slate-900">1. Improve homepage title tag</p>
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-medium">High impact · Easy</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 pl-4">
                          Current: "Home | Dental Clinic Zimbabwe" is missing your exact city Harare.
                        </p>
                      </div>
                      <button
                        onClick={onTryDemo}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded-md shadow-xs transition"
                      >
                        Copy Fix
                      </button>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <p className="text-xs font-bold text-slate-900">2. Add LocalBusiness structured data</p>
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded font-medium">High impact · Medium</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 pl-4">
                          Generate ready-to-paste Schema.org JSON-LD to qualify for Google Local Pack.
                        </p>
                      </div>
                      <button
                        onClick={onTryDemo}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded-md shadow-xs transition"
                      >
                        Get Schema
                      </button>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <p className="text-xs font-bold text-slate-900">3. Fix missing image alt text</p>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-medium">Med impact · Easy</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 pl-4">
                          5 images have empty alt attributes. LocalRank AI generated descriptive tags.
                        </p>
                      </div>
                      <button
                        onClick={onTryDemo}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded-md shadow-xs transition"
                      >
                        View Alt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">The Simple Flow</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">How LocalRank AI Works</h2>
            <p className="text-slate-600 text-sm mt-2">
              No complicated setups or SEO agencies charging $1,500/month. Three direct steps to ranking improvements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-left relative">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-lg mb-4">
                1
              </div>
              <h3 className="font-bold text-lg text-slate-900">Enter Business Details</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Provide your website URL, primary city (e.g. Harare, Zimbabwe), and core services. Takes under 60 seconds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-left relative">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-lg mb-4">
                2
              </div>
              <h3 className="font-bold text-lg text-slate-900">Automated Crawler & Scoring</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Our bot crawls your pages, tests HTTPS, headings, internal links, local keywords, and calculates a deterministic 100-pt score.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-left relative">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-lg mb-4">
                3
              </div>
              <h3 className="font-bold text-lg text-slate-900">Get Prioritized AI Fixes</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                See your Top 5 priorities ranked by Impact × Confidence ÷ Effort, with copy-paste title tags, meta descriptions, and schema code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Built For Small Business Owners</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">Everything You Need to Rank Higher</h2>
            <p className="text-slate-600 text-sm mt-2">
              We cut out 95% of the bloated enterprise SEO metrics to focus purely on what moves the needle for local businesses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Deterministic 100-Point SEO Score</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Evaluated across Technical (25), On-page (30), Local (25), and Content (20). Never guess where your website stands.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Prioritized Fixes (Impact ÷ Effort)</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Don't drown in 50 warnings. We calculate the highest return tasks first so you can complete them during your lunch break.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Copy-Paste AI Fixes</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Instead of telling you "Improve your title", we write the exact title tag, meta description, and image alt text for you.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Local Business Schema Generator</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Valid Schema.org JSON-LD built using your exact business details to help search engines locate and feature you on maps.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Example SEO Report (Before and After) */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">The Power of Direct Fixes</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">See the Fixes Before You Implement</h2>
            <p className="text-slate-600 text-sm mt-2">
              Here is how LocalRank AI transforms vague, low-ranking website copy into high-performing Google magnets.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <span className="text-xs font-bold uppercase text-slate-500">Example: Plumbing Company in Harare</span>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                Homepage Title Fix
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">Current Title (Hurting SEO)</span>
                <div className="mt-2 font-mono text-xs text-rose-950 bg-white p-3 rounded-lg border border-rose-200">
                  Home | ABC Plumbing
                </div>
                <p className="text-xs text-rose-700 mt-2">
                  ❌ No location mentioned, no specific service keywords, Google has zero local signals.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">LocalRank AI Recommendation</span>
                <div className="mt-2 font-mono text-xs text-emerald-950 bg-white p-3 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <span>ABC Plumbing | Professional Plumbers in Harare</span>
                  <button
                    onClick={handleCopySample}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-sans font-semibold"
                  >
                    {copiedSample ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSample ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-xs text-emerald-800 mt-2">
                  ✓ Targets "Plumbers in Harare", states business name, 51 characters (optimal length).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200" id="pricing">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Transparent Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1">Start Free. Grow Your Google Visibility.</h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2.5 max-w-xl mx-auto">
              Get a free SEO audit, then upgrade when you want ongoing monitoring, deeper analysis and actionable recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Free: Understand */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-sm hover:border-slate-300 transition">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider mb-3">
                  <span>Phase 1: Understand</span>
                </div>
                <h3 className="font-bold text-slate-900 text-xl">Free</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">See what's holding your website back</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Find your biggest SEO problems.</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">$0</span>
                  <span className="text-xs font-medium text-slate-500 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1 free SEO audit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to 20 pages crawled</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>SEO score</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Top 5 issues</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Basic recommendations</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                <button
                  onClick={onStartAudit}
                  className="w-full py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-xs text-slate-800 transition"
                  id="btn-pricing-free"
                >
                  Get My Free Audit
                </button>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">No credit card required</p>
              </div>
            </div>

            {/* Starter: Improve (Featured & Dominant) */}
            <div className="p-6 rounded-2xl bg-white border-2 border-indigo-600 shadow-xl relative flex flex-col justify-between ring-4 ring-indigo-50">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] uppercase tracking-wider font-bold px-3.5 py-1 rounded-full shadow-sm">
                Most Popular
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-3">
                  <span>Phase 2: Improve</span>
                </div>
                <h3 className="font-bold text-slate-900 text-xl">Starter</h3>
                <p className="text-xs text-indigo-700 mt-1 font-semibold">For businesses serious about SEO</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Monitor your website and track progress.</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">$9</span>
                  <span className="text-xs font-medium text-slate-500 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>1 website monitored</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Up to 50 pages crawled</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Full SEO audit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>AI-powered recommendations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 font-medium text-slate-900" />
                    <span className="font-medium text-slate-900">Weekly SEO monitoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Audit history & progress tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>SEO issue alerts</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-indigo-100 text-center">
                <button
                  onClick={onStartAudit}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition"
                  id="btn-pricing-starter"
                >
                  Start Monitoring — $9/mo
                </button>
                <p className="text-[11px] text-indigo-600/80 mt-2 font-medium">Cancel anytime • 7-day money-back guarantee</p>
              </div>
            </div>

            {/* Business: Grow */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-sm hover:border-slate-300 transition">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider mb-3">
                  <span>Phase 3: Grow</span>
                </div>
                <h3 className="font-bold text-slate-900 text-xl">Business</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">For growing businesses & multiple sites</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Monitor multiple sites and get deeper insights.</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">$19</span>
                  <span className="text-xs font-medium text-slate-500 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>3 websites monitored</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Up to 200 pages per website</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Full SEO audits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Advanced schema & content analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 font-medium text-slate-900" />
                    <span className="font-medium text-slate-900">Daily SEO monitoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 font-medium text-indigo-700" />
                    <span className="font-medium text-indigo-700">Competitor insights</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Priority email support</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                <button
                  onClick={onStartAudit}
                  className="w-full py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-xs text-slate-800 transition"
                  id="btn-pricing-business"
                >
                  Choose Business — $19/mo
                </button>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">For agencies & active businesses</p>
              </div>
            </div>
          </div>

          {/* Tiny Comparison Below Cards */}
          <div className="mt-12 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Every plan includes
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs text-slate-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> SEO score
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Technical SEO analysis
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> On-page SEO analysis
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Local SEO analysis
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Actionable recommendations
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-100 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">
                Paid plans add ongoing monitoring, deeper crawling and historical tracking.
              </span>
              <span className="text-[11px] text-slate-400">
                Cancel or upgrade at any time with 1-click.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Common Questions</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-xl overflow-hidden transition"
              >
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

      {/* Final Call to Action */}
      <section className="py-16 sm:py-20 bg-indigo-950 text-white text-center border-t border-indigo-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Stop losing local customers to competitors on Google.
          </h2>
          <p className="mt-4 text-indigo-200/90 text-sm sm:text-base max-w-xl mx-auto">
            Get your instant 100-point SEO score and your 5 copy-paste priority fixes in under 2 minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onStartAudit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-white text-indigo-950 font-bold text-sm shadow-lg hover:bg-slate-100 transition"
              id="btn-footer-analyze"
            >
              <span>Analyze My Website</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onTryDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-indigo-900 hover:bg-indigo-850 text-white font-medium text-sm border border-indigo-700 transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Try Demo First</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-slate-950 text-slate-400 text-xs border-t border-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              L
            </div>
            <span className="font-bold text-white text-sm">LocalRank AI</span>
            <span className="text-slate-500">© 2026 LocalRank AI Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={onTryDemo} className="hover:text-white transition">Demo Mode</button>
            <button onClick={onStartAudit} className="hover:text-white transition">Analyze Website</button>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
