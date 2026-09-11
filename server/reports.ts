import { AuditResult, Business, CompetitorResult, User } from '../src/types';
import { getPlan } from './plans';

/**
 * Client-facing report generation.
 *
 * Produces a structured report object and a self-contained, print-optimised
 * HTML document. The HTML is what the customer opens in a new tab and saves as
 * PDF (browser print dialog) or downloads as a file — no PDF dependency and no
 * headless browser needed.
 *
 * Everything in here is derived from real stored data: the audit, the score
 * history, the crawled pages and the saved competitor comparison. Nothing is
 * invented, and the inferred drop-off section is labelled as inferred.
 */

export interface ReportSection {
  title: string;
  rows: Array<{ label: string; value: string }>;
}

export interface ReportData {
  id: string;
  generatedAt: string;
  preparedFor: string;
  preparedBy: string;
  business: {
    name: string;
    website: string;
    location: string;
    category: string;
  };
  audit: {
    date: string;
    pagesAnalyzed: number;
    overallScore: number;
    grade: string;
    scoreDiff: number | null;
    categories: Array<{ label: string; score: number; max: number }>;
    criticalCount: number;
    warningCount: number;
    goodCount: number;
  };
  history: Array<{ date: string; score: number; scoreDiff: number }>;
  priorities: Array<{
    rank: number;
    title: string;
    impact: string;
    difficulty: string;
    whyItMatters: string;
    action: string;
    page: string;
  }>;
  passed: string[];
  dropOff: Array<{ title: string; likelihood: string; evidence: string; action: string }>;
  competitors: CompetitorResult[];
  whatWeChecked: string[];
}

const WHAT_WE_CHECKED = [
  'HTTPS / secure transport',
  'robots.txt and XML sitemap',
  'Canonical tags and indexability',
  'Page titles and meta descriptions',
  'Heading structure (H1/H2)',
  'Internal linking',
  'Image alt text',
  'Structured data (Schema.org / LocalBusiness)',
  'Contact page and click-to-call phone links',
  'Mobile viewport',
  'Server response time',
  'Script weight and HTML size',
  'Content depth per page',
  'Location and service signals',
];

/** Escape untrusted values (crawled page text, business names) before HTML. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function gradeFor(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Needs improvement';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function buildReportData(
  user: User,
  business: Business,
  audit: AuditResult,
  competitors: CompetitorResult[],
  history: Array<{ date: string; score: number; scoreDiff: number }>
): ReportData {
  const plan = getPlan(user.subscription?.plan || 'free');

  const priorities = (audit.topPriorities?.length ? audit.topPriorities : audit.issues)
    .filter((i) => i.severity !== 'good')
    .slice(0, 10)
    .map((issue, index) => ({
      rank: index + 1,
      title: issue.title,
      impact: issue.impact,
      difficulty: issue.difficulty,
      whyItMatters: issue.whyItMatters,
      action: issue.recommendedAction,
      page: issue.affectedPage,
    }));

  const passed = audit.issues
    .filter((i) => i.severity === 'good')
    .map((i) => i.title)
    .slice(0, 20);

  const dropOff = (audit.dropOffAnalysis?.signals || []).map((s) => ({
    title: s.title,
    likelihood: s.likelihood,
    evidence: s.evidence,
    action: s.suggestedAction,
  }));

  return {
    id: `report-${business.id}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    preparedFor: business.name,
    preparedBy: user.name || user.email,
    business: {
      name: business.name,
      website: business.website,
      location: business.location,
      category: business.category,
    },
    audit: {
      date: audit.createdAt,
      pagesAnalyzed: audit.pagesAnalyzed,
      overallScore: audit.overallScore,
      grade: gradeFor(audit.overallScore),
      scoreDiff: typeof audit.scoreDiff === 'number' ? audit.scoreDiff : null,
      categories: [
        { label: 'Technical SEO', score: audit.technicalScore, max: 25 },
        { label: 'On-page SEO', score: audit.onpageScore, max: 30 },
        { label: 'Local SEO', score: audit.localScore, max: 25 },
        { label: 'Content', score: audit.contentScore, max: 20 },
      ],
      criticalCount: audit.criticalCount,
      warningCount: audit.warningCount,
      goodCount: audit.goodCount,
    },
    history: history.slice(0, 12),
    priorities,
    passed,
    dropOff,
    competitors: competitors.filter((c) => c.status === 'ok'),
    whatWeChecked: WHAT_WE_CHECKED,
  };
}

function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 75) return '#15803d';
  if (pct >= 50) return '#b45309';
  return '#b91c1c';
}

export function renderReportHtml(report: ReportData): string {
  const r = report;

  const categoryRows = r.audit.categories
    .map((c) => {
      const pct = c.max > 0 ? Math.round((c.score / c.max) * 100) : 0;
      return `
        <div class="bar-row">
          <span class="bar-label">${esc(c.label)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${scoreColor(
            c.score,
            c.max
          )}"></span></span>
          <span class="bar-value">${c.score}/${c.max}</span>
        </div>`;
    })
    .join('');

  const priorityRows = r.priorities
    .map(
      (p) => `
      <tr>
        <td class="num">${p.rank}</td>
        <td>
          <strong>${esc(p.title)}</strong>
          <div class="muted">${esc(p.page)}</div>
          <div class="small">${esc(p.action)}</div>
        </td>
        <td class="nowrap">${esc(p.impact)}<div class="muted">${esc(p.difficulty)}</div></td>
      </tr>`
    )
    .join('');

  const historyRows = r.history.length
    ? r.history
        .map(
          (h) => `<tr>
            <td>${esc(formatDate(h.date))}</td>
            <td class="num">${h.score}/100</td>
            <td class="num">${h.scoreDiff > 0 ? '+' : ''}${h.scoreDiff}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="3" class="muted">No previous audits recorded yet.</td></tr>';

  const competitorRows = r.competitors.length
    ? r.competitors
        .map(
          (c) => `<tr>
            <td><strong>${esc(c.name || c.domain)}</strong><div class="muted">${esc(c.domain)}</div></td>
            <td class="num">${c.overallScore}/100</td>
            <td class="num">${c.technicalScore}/25</td>
            <td class="num">${c.onpageScore}/30</td>
            <td class="num">${c.localScore}/25</td>
            <td class="num">${c.contentScore}/20</td>
            <td>${c.https ? 'Yes' : 'No'}</td>
            <td>${c.hasLocalSchema ? 'Yes' : 'No'}</td>
          </tr>`
        )
        .join('')
    : null;

  const dropOffRows = r.dropOff
    .map(
      (d) => `
      <li>
        <strong>${esc(d.title)}</strong>
        <span class="pill pill-${esc(d.likelihood)}">${esc(d.likelihood)} likelihood</span>
        <div class="small"><em>Measured:</em> ${esc(d.evidence)}</div>
        <div class="small"><em>What to do:</em> ${esc(d.action)}</div>
      </li>`
    )
    .join('');

  const passedList = r.passed.map((p) => `<li>${esc(p)}</li>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(r.business.name)} — SEO Report</title>
<style>
  :root { --ink:#2a1236; --brand:#4b1a66; --accent:#7c3aed; --muted:#6b5a78; --line:#e6dcef; }
  * { box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
         color:#46324f; margin:0; padding:32px; background:#fff; line-height:1.55; }
  .page { max-width: 860px; margin: 0 auto; }
  header.report-head { display:flex; justify-content:space-between; align-items:flex-start;
         gap:24px; border-bottom:3px solid var(--brand); padding-bottom:18px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:800; color:var(--ink); font-size:18px; }
  .brand img { width:34px; height:34px; object-fit:contain; }
  .meta { text-align:right; font-size:12px; color:var(--muted); }
  h1 { font-size:24px; color:var(--ink); margin:26px 0 4px; letter-spacing:-0.01em; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:0.08em; color:var(--accent);
       margin:30px 0 10px; }
  h3 { font-size:15px; color:var(--ink); margin:0 0 6px; }
  .muted { color:var(--muted); font-size:12px; }
  .small { font-size:12px; color:#55455f; margin-top:3px; }
  .score-hero { display:flex; align-items:center; gap:22px; margin-top:18px;
       background:#f4ebfc; border:1px solid var(--line); border-radius:14px; padding:18px 20px; }
  .score-big { font-size:46px; font-weight:800; color:var(--ink); line-height:1; }
  .score-grade { font-size:13px; font-weight:700; }
  .stats { display:flex; gap:26px; margin-top:6px; font-size:12px; }
  .stats b { display:block; font-size:19px; color:var(--ink); }
  .bar-row { display:flex; align-items:center; gap:10px; margin:6px 0; font-size:13px; }
  .bar-label { width:120px; flex:none; }
  .bar-track { flex:1; height:9px; background:#efe7f7; border-radius:999px; overflow:hidden; }
  .bar-fill { display:block; height:100%; border-radius:999px; }
  .bar-value { width:52px; text-align:right; font-weight:700; color:var(--ink); }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.06em;
       color:var(--muted); border-bottom:1px solid var(--line); padding:7px 8px; }
  td { border-bottom:1px solid #f2ecf8; padding:9px 8px; vertical-align:top; }
  td.num { text-align:right; font-weight:700; color:var(--ink); white-space:nowrap; }
  .nowrap { white-space:nowrap; }
  .pill { display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase;
       letter-spacing:0.06em; padding:2px 8px; border-radius:999px; margin-left:6px; }
  .pill-high { background:#ffe4e6; color:#9f1239; }
  .pill-medium { background:#fef3c7; color:#92400e; }
  .pill-low { background:#efe7f7; color:#4b5563; }
  ul { margin:8px 0 0; padding-left:18px; }
  li { margin-bottom:8px; }
  .note { background:#faf7fc; border:1px solid var(--line); border-radius:10px;
       padding:12px 14px; font-size:12px; color:var(--muted); margin-top:14px; }
  footer { margin-top:34px; border-top:1px solid var(--line); padding-top:12px;
       font-size:11px; color:var(--muted); }
  @media print {
    body { padding:0; font-size:12px; }
    h2 { page-break-after:avoid; }
    table, .bar-row, li { page-break-inside:avoid; }
    .page { max-width:none; }
  }
</style>
</head>
<body>
<div class="page">

  <header class="report-head">
    <div>
      <div class="brand">Search Vailable</div>
      <div class="muted">Local SEO report</div>
    </div>
    <div class="meta">
      Generated ${esc(formatDate(r.generatedAt))}<br />
      Prepared for ${esc(r.preparedFor)}<br />
      Prepared by ${esc(r.preparedBy)}
    </div>
  </header>

  <h1>${esc(r.business.name)}</h1>
  <div class="muted">${esc(r.business.website)} &nbsp;·&nbsp; ${esc(
    r.business.location
  )} &nbsp;·&nbsp; ${esc(r.business.category)}</div>

  <div class="score-hero">
    <div>
      <div class="score-big">${r.audit.overallScore}<span style="font-size:18px;color:#6b5a78">/100</span></div>
      <div class="score-grade" style="color:${scoreColor(r.audit.overallScore, 100)}">${esc(
        r.audit.grade
      )}</div>
    </div>
    <div>
      <div class="stats">
        <div><b>${r.audit.criticalCount}</b>Critical</div>
        <div><b>${r.audit.warningCount}</b>To improve</div>
        <div><b>${r.audit.goodCount}</b>Passed</div>
        <div><b>${r.audit.pagesAnalyzed}</b>Pages checked</div>
      </div>
      <div class="muted" style="margin-top:8px">Audit date: ${esc(
        formatDate(r.audit.date)
      )}${r.audit.scoreDiff !== null ? ` &nbsp;·&nbsp; ${r.audit.scoreDiff > 0 ? '+' : ''}${r.audit.scoreDiff} vs previous audit` : ''}</div>
    </div>
  </div>

  <h2>Score breakdown</h2>
  ${categoryRows}

  ${
    r.priorities.length
      ? `<h2>Priority fixes (ranked)</h2>
  <table>
    <thead><tr><th>#</th><th>Issue and recommended fix</th><th>Impact</th></tr></thead>
    <tbody>${priorityRows}</tbody>
  </table>
  <div class="note">Fixes are ranked by impact versus effort. Working down the list from the top gives the fastest score improvement.</div>`
      : '<h2>Priority fixes</h2><div class="muted">No outstanding issues were found in this audit.</div>'
  }

  ${
    dropOffRows
      ? `<h2>Why visitors are likely leaving</h2>
  <div class="note">These are likely causes, inferred from the pages themselves — not measured visitor behaviour. No analytics, bounce rate or session data is used.</div>
  <ul style="margin-top:10px">${dropOffRows}</ul>`
      : ''
  }

  ${
    competitorRows
      ? `<h2>Competitor comparison</h2>
  <table>
    <thead><tr><th>Website</th><th>Overall</th><th>Tech</th><th>On-page</th><th>Local</th><th>Content</th><th>HTTPS</th><th>Local schema</th></tr></thead>
    <tbody>
      <tr style="background:#f4ebfc">
        <td><strong>${esc(r.business.name)} (you)</strong><div class="muted">${esc(
          r.business.website
        )}</div></td>
        <td class="num">${r.audit.overallScore}/100</td>
        <td class="num">${r.audit.categories[0].score}/25</td>
        <td class="num">${r.audit.categories[1].score}/30</td>
        <td class="num">${r.audit.categories[2].score}/25</td>
        <td class="num">${r.audit.categories[3].score}/20</td>
        <td>—</td>
        <td>—</td>
      </tr>
      ${competitorRows}
    </tbody>
  </table>`
      : ''
  }

  <h2>Score history</h2>
  <table>
    <thead><tr><th>Date</th><th>Score</th><th>Change</th></tr></thead>
    <tbody>${historyRows}</tbody>
  </table>

  ${passedList ? `<h2>Checks that passed</h2><ul>${passedList}</ul>` : ''}

  <h2>What we checked</h2>
  <ul>${r.whatWeChecked.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>

  <footer>
    ${esc(r.business.name)} · SEO report generated by Search Vailable on ${esc(
      formatDate(r.generatedAt)
    )}.<br />
    Search Vailable measures on-page and technical signals from your public website. It does not
    report Google ranking positions or traffic unless a search or analytics source has been
    connected. To save this as a PDF, use your browser's Print → Save as PDF.
  </footer>
</div>
</body>
</html>`;
}
