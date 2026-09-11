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
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';

interface LandingPageProps {
  onStartAudit: () => void;
  onOpenAuthSignup: () => void;
}

const PREVIEW_SCORES = [
  { label: 'Technical', score: 21, max: 25 },
  { label: 'On-page', score: 19, max: 30 },
  { label: 'Local', score: 14, max: 25 },
  { label: 'Content', score: 14, max: 20 },
];

const PREVIEW_PRIORITIES = [
  { number: '01', title: 'Improve homepage title', severity: 'bg-rose-500' },
  { number: '02', title: 'Add LocalBusiness schema', severity: 'bg-amber-500' },
  { number: '03', title: 'Fix missing image alt text', severity: 'bg-yellow-400' },
];

const LOCAL_KEYWORDS = [
  'restaurants in Mutare',
  'restaurants near me',
  'Mutare restaurants',
  'rooftop restaurants Mutare',
];

const CATEGORIES = ['Restaurants', 'Clinics', 'Hotels', 'Salons', 'Trades', 'Agencies'];

const STATS = [
  {
    label: 'Categories',
    value: '4',
    suffix: '',
    caption: 'Technical, on-page, local and content — each scored separately.',
  },
  {
    label: 'Signals checked',
    value: '25',
    suffix: '+',
    caption: 'Titles, schema, HTTPS, alt text, NAP and location signals.',
  },
  {
    label: 'To get started',
    value: '$0',
    suffix: '',
    caption: 'A free audit with no credit card required.',
  },
];

const FAQS = [
  {
    q: 'What is Search Vailable?',
    a: 'Search Vailable is a local SEO platform that analyzes your website and identifies opportunities to improve your visibility in local search.',
  },
  {
    q: 'Does Search Vailable guarantee Google rankings?',
    a: 'No. Search Vailable identifies SEO opportunities and provides actionable recommendations, but no tool can guarantee a specific Google ranking.',
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
    q: 'Can agencies use Search Vailable?',
    a: 'Yes. The Agency plan supports managing multiple businesses and generating reports.',
  },
  {
    q: 'Can I track my progress?',
    a: 'Yes. After your first audit, Search Vailable tracks your score and resolved issues every time you re-audit your website.',
  },
];

/* ------------------------------------------------------------------
   "What is Search Vailable?" section — sticker-style line chart
   (thick dark frame + hard offset shadow + coral mount + white plot)
   ------------------------------------------------------------------ */
const INK = '#2a1236'; // frame / axes / shadow
const MOUNT = '#f4795b'; // coral mount
const SERIES_KEYWORDS = '#f7ce55'; // yellow
const SERIES_POSITION = '#7aa87a'; // green

const KEYWORD_SERIES: Array<[number, number]> = [
  [40, 180],
  [90, 196],
  [140, 158],
  [190, 120],
  [232, 150],
  [272, 88],
  [312, 110],
  [352, 68],
  [422, 50],
  [500, 28],
];

const POSITION_SERIES: Array<[number, number]> = [
  [40, 236],
  [90, 214],
  [140, 226],
  [200, 220],
  [250, 150],
  [300, 176],
  [340, 150],
  [400, 140],
  [450, 118],
  [500, 104],
];

/** Smooth a list of points into an SVG path (quadratic midpoints). */
function smoothLine(points: Array<[number, number]>): string {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const xc = (points[i][0] + points[i + 1][0]) / 2;
    const yc = (points[i][1] + points[i + 1][1]) / 2;
    d += ` Q ${points[i][0]},${points[i][1]} ${xc},${yc}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last[0]},${last[1]}`;
  return d;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartAudit, onOpenAuthSignup }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">
            {/* Copy */}
            <div>
              <div className="inline-flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs">
                <div className="flex -space-x-2">
                  {[
                    { ch: 'R', bg: 'bg-brand-500' },
                    { ch: 'M', bg: 'bg-pink-500' },
                    { ch: 'T', bg: 'bg-pink-400' },
                  ].map((a) => (
                    <span
                      key={a.ch}
                      className={`w-6 h-6 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white ${a.bg}`}
                    >
                      {a.ch}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-slate-600">
                  Trusted by local businesses in Zimbabwe
                </span>
              </div>

              <h1 className="mt-6 text-[2.5rem] sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-[-0.02em] leading-[1.04] text-slate-900">
                Is your business
                <br />
                searchable?
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Search Vailable analyzes your website, local signals and the searches your customers
                actually make — then gives you a prioritized action plan showing exactly what to fix
                first.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={onStartAudit}
                  className="btn btn-primary btn-md inline-flex items-center gap-2"
                  id="btn-hero-analyze"
                >
                  <span>Run My Free SEO Audit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full text-sm font-semibold text-slate-700 hover:text-brand-700 transition"
                >
                  See how it works
                </a>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Results in minutes
                </span>
              </div>
            </div>

            {/* Product visual */}
            <div className="relative">
              <div className="relative mx-auto max-w-md lg:max-w-none min-h-[400px] rounded-[28px] bg-gradient-to-br from-pink-500 via-pink-300 to-pink-400 p-5 sm:p-7 overflow-hidden">
                {/* Decorative shapes */}
                <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/25" />
                <div className="absolute top-10 right-6 w-20 h-20 rounded-[32%] bg-sky-500/35 rotate-12" />
                <div className="absolute top-24 left-6 w-14 h-14 rounded-full border-4 border-white/45" />
                <div className="absolute bottom-8 left-10 w-24 h-24 rounded-full bg-lime-300/45" />
                <div className="absolute -bottom-6 right-10 w-24 h-24 rounded-[30%] bg-brand-500/25 -rotate-12" />

                {/* Report card */}
                <div className="relative z-10 mx-auto mt-6 w-[92%] bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Local SEO health
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        Example Local Business · Mutare
                      </p>
                    </div>
                    <div
                      className="w-16 h-16 rounded-full grid place-items-center shrink-0"
                      style={{ background: 'conic-gradient(#4b1a66 0% 68%, #e6dcef 68% 100%)' }}
                    >
                      <div className="w-12 h-12 rounded-full bg-white grid place-items-center">
                        <span className="text-base font-extrabold text-slate-900">68</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    {PREVIEW_SCORES.map((item, i) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="font-bold text-slate-900">
                            {item.score}/{item.max}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${i % 2 === 0 ? 'bg-brand-700' : 'bg-pink-300'}`}
                            style={{ width: `${(item.score / item.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating chips */}
                <div className="absolute z-20 left-3 sm:left-4 top-[30%] bg-white rounded-xl border border-slate-200 shadow-lg px-3 py-2 max-w-[170px]">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-rose-600">
                    High impact
                  </p>
                  <p className="text-[11px] font-bold text-slate-900 leading-tight mt-0.5">
                    LocalBusiness schema missing
                  </p>
                </div>

                <div className="absolute z-20 right-3 sm:right-5 top-[14%] bg-white rounded-xl border border-slate-200 shadow-lg px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-[11px] font-bold text-slate-900">+13 points</p>
                  </div>
                  <p className="text-[9px] font-semibold text-slate-500 mt-0.5">this month</p>
                </div>

                <div className="absolute z-20 right-4 sm:right-8 bottom-6 bg-white rounded-full border border-slate-200 shadow-lg px-3 py-1.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-brand-500" />
                  <span className="text-[10px] font-bold text-slate-900">3 competitors ahead</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BUILT FOR / MARKET WEDGE ===================== */}
      <section className="py-9 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Built for</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {CATEGORIES.map((c) => (
              <span key={c} className="text-sm font-bold text-slate-400">
                {c}
              </span>
            ))}
          </div>
          <p className="mt-5 text-xs font-semibold text-brand-700">
            Starting with businesses across Zimbabwe.
          </p>
        </div>
      </section>

      {/* ===================== WHAT IS SEARCH VILABLE? ===================== */}
      <section id="about" className="py-14 sm:py-20 bg-lilac-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,45%)_minmax(0,55%)] gap-12 lg:gap-14 items-center">
            {/* Copy */}
            <div>
              <h2 className="text-4xl sm:text-[2.9rem] font-extrabold tracking-[-0.02em] leading-[1.08] text-slate-900">
                What is
                <br />
                Search Vailable?
              </h2>
              <p className="mt-6 text-[15px] sm:text-base text-slate-600 leading-[1.7] max-w-[525px]">
                Search Vailable brings the kind of SEO big brands rely on to businesses of every
                size. You don't need an agency retainer to be found — you need to know what is
                holding your website back, and fix it in the right order.
              </p>
              <p className="mt-6 text-[15px] sm:text-base text-slate-600 leading-[1.7] max-w-[525px]">
                Every audit crawls your website and scores it across technical, on-page, local and
                content signals. You get a plain-English reason for each lost point, a ranked fix
                list, and a score you can watch climb as you make changes — then compare yourself
                against the businesses already showing up above you.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  onClick={onStartAudit}
                  className="btn btn-primary btn-md inline-flex items-center gap-2"
                >
                  Check my website
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <a
                  href="#how-it-works"
                  className="text-xs font-bold text-brand-700 hover:underline"
                >
                  Explore more about us
                </a>
              </div>
            </div>

            {/* Sticker-style line chart card */}
            <div>
              <div
                className="rounded-[14px] p-5 sm:p-6"
                style={{
                  background: MOUNT,
                  border: `3px solid ${INK}`,
                  boxShadow: `8px 8px 0 0 ${INK}`,
                }}
              >
                <div className="bg-white p-4 sm:p-5">
                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
                    <span
                      className="inline-flex items-center gap-2 text-sm font-semibold"
                      style={{ color: INK }}
                    >
                      Local keywords
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: SERIES_KEYWORDS, border: `1px solid ${INK}` }}
                      />
                    </span>
                    <span
                      className="inline-flex items-center gap-2 text-sm font-semibold"
                      style={{ color: INK }}
                    >
                      Average position
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: SERIES_POSITION, border: `1px solid ${INK}` }}
                      />
                    </span>
                  </div>

                  {/* Chart */}
                  <svg
                    viewBox="0 0 520 300"
                    role="img"
                    aria-label="Line chart showing local keywords rising and average position improving over time"
                    className="mt-3 w-full h-auto"
                  >
                    {/* Axes */}
                    <line x1="40" y1="20" x2="40" y2="270" stroke={INK} strokeWidth="3" />
                    <line x1="40" y1="270" x2="500" y2="270" stroke={INK} strokeWidth="3" />

                    {/* Series */}
                    <path
                      d={smoothLine(KEYWORD_SERIES)}
                      fill="none"
                      stroke={SERIES_KEYWORDS}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={smoothLine(POSITION_SERIES)}
                      fill="none"
                      stroke={SERIES_POSITION}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* End points */}
                    <circle
                      cx="500"
                      cy="28"
                      r="5"
                      fill={SERIES_KEYWORDS}
                      stroke={INK}
                      strokeWidth="2"
                    />
                    <circle
                      cx="500"
                      cy="104"
                      r="5"
                      fill={SERIES_POSITION}
                      stroke={INK}
                      strokeWidth="2"
                    />
                  </svg>

                  <p className="mt-3 text-[10px] text-slate-400 text-center">
                    Illustrative example — your audit shows your own real numbers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how-it-works" className="py-14 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-9">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
                How it works
              </span>
              <h2 className="mt-2 text-3xl sm:text-[2.1rem] font-extrabold tracking-[-0.01em] leading-[1.12] text-slate-900">
                Three steps from a hunch
                <br />
                to a fix list.
              </h2>
              <p className="mt-3 text-sm text-slate-600 max-w-lg leading-relaxed">
                Add your business once. After that, every audit checks your site and hands you a
                ranked list of what to do next.
              </p>
            </div>
            <button
              onClick={onStartAudit}
              className="btn btn-primary btn-md self-start sm:self-auto"
            >
              Get started free
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-stretch">
            {/* Step 01 */}
            <div className="md:col-span-1 rounded-2xl bg-lilac-50 border border-slate-200 p-5 flex flex-col justify-between">
              <span className="self-start inline-flex px-3 py-1 rounded-full border border-slate-300 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Step 01
              </span>
              <div className="mt-8">
                <h3 className="text-lg font-bold tracking-tight text-slate-900 leading-snug">
                  Enter your
                  <br />
                  business.
                </h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Website, business type and location — that's all we need to begin.
                </p>
              </div>
            </div>

            {/* Step 02 — chart card */}
            <div className="md:col-span-2 rounded-2xl bg-white border border-slate-200 p-5 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Step 02
                  </p>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">We crawl your site</h3>
                </div>
                <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-lilac-100 border border-slate-200">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white text-[9px] font-bold text-slate-700 shadow-2xs">
                    <BarChart3 className="w-3 h-3" /> Score
                  </span>
                  <span className="px-2 py-1 text-[9px] font-bold text-slate-400">Issues</span>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between gap-3 h-32">
                {PREVIEW_SCORES.map((s, i) => (
                  <div
                    key={s.label}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                  >
                    <span className="text-[10px] font-bold text-slate-700">{s.score}</span>
                    <div
                      className={`w-full rounded-full ${i % 2 === 0 ? 'bg-brand-700' : 'bg-lilac-300'}`}
                      style={{ height: `${Math.max(18, (s.score / s.max) * 100)}%` }}
                    />
                    <span className="text-[9px] font-semibold text-slate-400">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="absolute right-5 top-[56%] bg-white rounded-xl border border-slate-200 shadow-lg p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Overall
                </p>
                <p className="text-base font-extrabold text-slate-900 leading-none mt-1">68 / 100</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-700" />
                    <span className="text-[9px] font-semibold text-slate-500">Current score</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lilac-300" />
                    <span className="text-[9px] font-semibold text-slate-500">Potential</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 03 */}
            <div className="md:col-span-1 rounded-2xl bg-white border border-slate-200 p-5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Step 03
                </p>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">Get prioritized fixes</h3>
                <div className="mt-4 space-y-2">
                  {PREVIEW_PRIORITIES.map((p) => (
                    <div
                      key={p.number}
                      className="flex items-center gap-2 p-2 rounded-lg bg-lilac-50 border border-slate-200"
                    >
                      <span className="text-[10px] font-bold text-slate-400">{p.number}</span>
                      <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                        {p.title}
                      </span>
                      <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${p.severity}`} />
                    </div>
                  ))}
                </div>
              </div>
              <a
                href="#issues-fixes"
                className="mt-4 inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-full bg-brand-700 text-white text-[11px] font-bold hover:bg-brand-500 transition"
              >
                See the fixes
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== WHAT WE CHECK ===================== */}
      <section id="product" className="py-14 sm:py-20 bg-lilac-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
              What we check
            </span>
            <h2 className="mt-2 text-3xl sm:text-[2.1rem] font-extrabold tracking-[-0.01em] leading-[1.12] text-slate-900">
              Everything that affects
              <br />
              your local visibility.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Globe,
                label: 'Website SEO',
                items: [
                  'Page titles',
                  'Meta descriptions',
                  'Headings',
                  'Internal links',
                  'Indexability',
                  'Mobile experience',
                ],
              },
              {
                icon: MapPin,
                label: 'Local SEO',
                items: [
                  'Business information',
                  'Location signals',
                  'LocalBusiness schema',
                  'NAP consistency',
                  'Service pages',
                ],
              },
              {
                icon: FileText,
                label: 'Content',
                items: [
                  'Service coverage',
                  'Search intent',
                  'Location content',
                  'Missing pages',
                  'Opportunities',
                ],
              },
              {
                icon: Search,
                label: 'AI Search Visibility',
                items: [
                  'How you may appear in AI search',
                  'Signals that improve discoverability',
                  'Content gaps to close',
                ],
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-brand-500/40 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-lilac-100 text-brand-700 grid place-items-center">
                  <card.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">{card.label}</h3>
                <ul className="mt-3 space-y-1.5">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[11px] text-slate-600">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 100-POINT SCORE + STATS ===================== */}
      <section id="score" className="py-14 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[28px] bg-lilac-200 border border-slate-200 p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-9 items-center">
            {/* Left: white sub-panel with stacked mini cards */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Audit snapshot
                  </span>
                  <a
                    href="#issues-fixes"
                    className="text-[11px] font-bold text-brand-700 hover:underline"
                  >
                    View all ›
                  </a>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-lilac-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-700" />
                    <span className="text-xs font-bold text-slate-900">
                      Example Local Business
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">Mutare, ZW</span>
                </div>

                <div className="mt-2 flex items-center justify-between p-3 rounded-xl bg-brand-700 text-white">
                  <span className="text-[11px] font-semibold">Local SEO health</span>
                  <span className="text-sm font-extrabold">68 / 100</span>
                </div>
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Issue breakdown
                  </span>
                  <span className="text-slate-300 leading-none">⋯</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'High', value: '45%', dot: 'bg-pink-500' },
                    { label: 'Medium', value: '32%', dot: 'bg-pink-300' },
                    { label: 'Good', value: '23%', dot: 'bg-pink-400' },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />
                        <span className="text-[10px] font-semibold text-slate-500">
                          {row.label}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 mt-0.5">{row.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-3.5 rounded-full bg-pink-500" style={{ width: '88%' }} />
                  <div className="h-3.5 rounded-full bg-pink-300" style={{ width: '62%' }} />
                  <div className="h-3.5 rounded-full bg-pink-400" style={{ width: '44%' }} />
                </div>
              </div>
            </div>

            {/* Right: copy */}
            <div>
              <span className="inline-flex px-3 py-1 rounded-full bg-lilac-300 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-700">
                The 100-point score
              </span>
              <h2 className="mt-4 text-3xl sm:text-[2.2rem] font-extrabold tracking-[-0.01em] leading-[1.08] text-slate-900">
                A score you can
                <br />
                actually understand.
              </h2>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed max-w-md">
                Your score isn't a mystery number. Every point maps to a specific check — Technical
                25, On-page 30, Local 25, Content 20 — and every lost point has an explanation.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <a
                  href="#product"
                  className="w-10 h-10 rounded-xl border border-slate-300 bg-white grid place-items-center text-slate-600 hover:text-brand-700 transition"
                  aria-label="What we check"
                >
                  <Globe className="w-4 h-4" />
                </a>
                <a
                  href="#issues-fixes"
                  className="w-10 h-10 rounded-xl border border-slate-300 bg-white grid place-items-center text-slate-600 hover:text-brand-700 transition"
                  aria-label="Issue breakdown"
                >
                  <ClipboardList className="w-4 h-4" />
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-700 hover:bg-brand-500 text-white font-bold text-xs transition"
                >
                  Learn more
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-lilac-50 border border-slate-200 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {stat.label}
                  </span>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-slate-900 leading-none">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-base font-bold align-super ml-0.5">{stat.suffix}</span>
                  )}
                </p>
                <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{stat.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== ISSUES → FIXES ===================== */}
      <section id="issues-fixes" className="py-14 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-9">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
              Issues become fixes
            </span>
            <h2 className="mt-2 text-3xl sm:text-[2.1rem] font-extrabold tracking-[-0.01em] leading-[1.12] text-slate-900">
              See the fixes before
              <br />
              you implement.
            </h2>
            <p className="mt-3 text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Every issue explains what we found, why it matters, and exactly what to do about it.
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Missing LocalBusiness structured data
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Impact: High
                </span>
                <span className="px-2.5 py-1 rounded-full bg-lilac-100 text-slate-700 border border-slate-200">
                  Difficulty: Medium
                </span>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1">
                  What we found
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  Your homepage doesn't currently provide LocalBusiness structured data.
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600 mb-1">
                  Why it matters
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  Structured data helps search engines understand important information about your
                  business.
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-500 mb-1">
                  Recommended fix
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  Add LocalBusiness JSON-LD containing your business name, address, phone number and
                  other relevant details.
                </p>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={onStartAudit}
                className="btn btn-primary btn-sm inline-flex items-center"
              >
                View recommended fix
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== LOCAL VISIBILITY ===================== */}
      <section id="local-visibility" className="py-14 sm:py-20 bg-lilac-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
                Local visibility
              </span>
              <h2 className="mt-2 text-3xl sm:text-[2.1rem] font-extrabold tracking-[-0.01em] leading-[1.12] text-slate-900">
                See how your business
                <br />
                performs locally.
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-md">
                Search Vailable connects your website, your location and the searches your customers
                actually make.
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-700" />
                  <span className="text-xs font-bold text-slate-900">Example Local Business</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-700" />
                  <span className="text-xs text-slate-700">Mutare, Zimbabwe</span>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-brand-700" />
                  <span className="text-xs text-slate-700">Primary service: Restaurant</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">
                Example local search opportunities
              </h3>
              <div className="space-y-2">
                {LOCAL_KEYWORDS.map((keyword) => (
                  <div
                    key={keyword}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-semibold hover:border-brand-500/40 transition"
                  >
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    “{keyword}”
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                Example opportunities based on sample business, location and service data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PROGRESS TRACKING ===================== */}
      <section id="progress" className="py-14 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
            Progress tracking
          </span>
          <h2 className="mt-2 text-3xl sm:text-[2.1rem] font-extrabold tracking-[-0.01em] leading-[1.12] text-slate-900">
            Watch your score climb
            <br />
            as you fix things.
          </h2>
          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
            Example progress view after applying recommended fixes.
          </p>

          <div className="mt-9 rounded-2xl bg-white border border-slate-200 shadow-sm p-6 text-left">
            <div className="flex items-baseline gap-3 pb-5 border-b border-slate-100">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">68 → 81</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                +13 points
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-5 text-xs">
              {[
                { label: 'Technical SEO', from: 21, to: 24 },
                { label: 'On-page SEO', from: 19, to: 23 },
                { label: 'Local SEO', from: 14, to: 19 },
                { label: 'Content', from: 14, to: 15 },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-slate-600">{row.label}</span>
                  <span className="font-bold text-slate-900">
                    {row.from} → {row.to}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-slate-600">
                <strong className="text-slate-900">6 issues fixed this month</strong> — see what
                changed every time you re-audit.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== AGENCY ===================== */}
      <section id="agency" className="py-14 sm:py-20 bg-lilac-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
                For agencies
              </span>
              <h2 className="mt-2 text-3xl sm:text-[2.1rem] font-extrabold tracking-[-0.01em] leading-[1.12] text-slate-900">
                Manage local SEO for
                <br />
                every client in one place.
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-md">
                Run audits, track progress and generate client-ready reports without juggling
                spreadsheets.
              </p>
              <button
                onClick={onOpenAuthSignup}
                className="btn btn-primary btn-md mt-6 inline-flex items-center gap-2"
              >
                Explore the Agency plan
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Building2, label: 'Manage multiple businesses' },
                { icon: BarChart3, label: 'Generate reports' },
                { icon: ClipboardList, label: 'Track issues' },
                { icon: TrendingUp, label: 'Monitor progress' },
                { icon: FileText, label: 'Client-ready reports' },
                { icon: Layers, label: 'Organise client work' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-4 rounded-xl bg-white border border-slate-200 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-lilac-100 text-brand-700 grid place-items-center shrink-0">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section id="pricing" className="py-14 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
              Pricing
            </span>
            <h2 className="mt-2 text-3xl sm:text-[2.1rem] font-extrabold tracking-[-0.01em] leading-[1.12] text-slate-900">
              Start free. Upgrade
              <br />
              when you're ready.
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Ongoing visibility management, not just a one-off audit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Free */}
            <div className="rounded-2xl bg-lilac-50 border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Understand
                </span>
                <h3 className="mt-2 text-lg font-bold text-slate-900">Free</h3>
                <p className="text-xs text-slate-500 mt-1">See what's holding your website back.</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$0</span>
                  <span className="text-xs text-slate-400 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  {[
                    '1 website audit',
                    'SEO score',
                    'Top 3 issues',
                    'Basic recommendations',
                    'Local search overview',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200">
                <button
                  onClick={onStartAudit}
                  className="btn btn-secondary btn-md w-full"
                >
                  Run Free Audit
                </button>
                <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
                  No credit card required
                </p>
              </div>
            </div>

            {/* Growth */}
            <div className="relative rounded-2xl bg-white border-2 border-brand-700 shadow-lg p-6 flex flex-col justify-between">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-700 text-white text-[10px] uppercase tracking-[0.12em] font-bold px-3 py-0.5 rounded-full">
                Most popular
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-500">
                  Improve
                </span>
                <h3 className="mt-2 text-lg font-bold text-slate-900">Growth</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Improve your visibility and track your progress.
                </p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$19</span>
                  <span className="text-xs text-slate-400 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  {[
                    'Full SEO audit',
                    'Local SEO analysis',
                    'Progress tracking',
                    'Re-audits',
                    'Competitor comparison',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200">
                <button
                  onClick={onOpenAuthSignup}
                  className="btn btn-primary btn-md w-full"
                >
                  Start Growth
                </button>
                <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
                  Cancel anytime
                </p>
              </div>
            </div>

            {/* Agency */}
            <div className="rounded-2xl bg-lilac-50 border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Scale
                </span>
                <h3 className="mt-2 text-lg font-bold text-slate-900">Agency</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage local SEO for multiple businesses and clients.
                </p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$79</span>
                  <span className="text-xs text-slate-400 ml-1">/ month</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  {[
                    'Up to 10 businesses',
                    'Progress monitoring',
                    'Generate reports',
                    'Competitor comparison',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200">
                <button
                  onClick={onOpenAuthSignup}
                  className="btn btn-secondary btn-md w-full"
                >
                  For Agencies
                </button>
                <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
                  For agencies & active teams
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" className="py-14 sm:py-20 bg-lilac-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-9">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
              FAQ
            </span>
            <h2 className="mt-2 text-3xl sm:text-[2.1rem] font-extrabold tracking-[-0.01em] leading-[1.12] text-slate-900">
              Common questions.
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between font-bold text-sm text-slate-900 hover:bg-lilac-50 transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      activeFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {activeFaq === index && (
                  <div className="px-5 py-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="py-14 sm:py-20 bg-brand-900 text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-[2.4rem] font-extrabold tracking-[-0.02em] leading-[1.1]">
            Ready to see what's
            <br />
            holding your business back?
          </h2>
          <p className="mt-4 text-sky-100/80 text-sm sm:text-base max-w-xl mx-auto">
            Get your free local SEO audit and a prioritized action plan in minutes.
          </p>
          <div className="mt-8">
            <button
              onClick={onStartAudit}
              className="btn btn-on-dark btn-lg"
            >
              <span>Analyze My Website</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="py-12 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src="/brand/icon-64.png"
                  alt="Search Vailable"
                  width={28}
                  height={28}
                  className="w-7 h-7 object-contain"
                />
                <span className="font-bold text-white text-sm">Search Vailable</span>
              </div>
              <p className="text-slate-500">Is your business searchable?</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-left">
              <div>
                <h4 className="font-bold text-slate-200 mb-2.5">Product</h4>
                <div className="space-y-1.5">
                  <a href="#product" className="block hover:text-white transition">
                    SEO Audit
                  </a>
                  <a href="#local-visibility" className="block hover:text-white transition">
                    Local SEO
                  </a>
                  <a href="#progress" className="block hover:text-white transition">
                    Tracking
                  </a>
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
                  <a href="#pricing" className="block hover:text-white transition">
                    Pricing
                  </a>
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

          <div className="mt-10 pt-6 border-t border-slate-900 text-slate-500">© 2026 Search Vailable</div>
        </div>
      </footer>
    </div>
  );
};
