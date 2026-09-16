import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { CrawlResult } from '../server/crawler';
import { calculateSeoScore } from '../server/scoring';
import { generateIssues } from '../server/issues';
import { generateDropOffAnalysis } from '../server/dropoff';
import { crawlWebsite, classifyHost, isSafeUrl } from '../server/crawler';
import { Business, CrawledPage } from '../src/types';

/**
 * The analysis engine: scoring, issues and inferred drop-off.
 *
 * These run against a hand-built crawl payload rather than a live site. That is
 * deliberate — it makes the tests deterministic and fast, and it means a failure
 * points at our logic rather than at someone else's web server. The crawler's
 * own network behaviour is covered separately, including the SSRF guard that
 * refuses to fetch internal addresses.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-audit-'));
process.env.DATA_DIR = tmpDir;
process.env.DB_FILE = path.join(tmpDir, 'test.db');
process.env.MONITORING_ENABLED = 'false';

const business: Business = {
  id: 'biz-test',
  name: 'Manica SkyView',
  website: 'https://manicaskyview.example',
  location: 'Mutare, Zimbabwe',
  category: 'Restaurant',
  services: ['Rooftop dining'],
  description: 'Rooftop restaurant in Mutare, Zimbabwe.',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function page(overrides: Partial<CrawledPage> = {}): CrawledPage {
  return {
    id: `page-${Math.random().toString(36).slice(2, 8)}`,
    url: 'https://manicaskyview.example/',
    path: '/',
    statusCode: 200,
    title: 'Mutare Rooftop Restaurant | Manica SkyView',
    metaDescription: 'Rooftop dining in Mutare, Zimbabwe. Book a table at Manica SkyView.',
    h1: 'Rooftop dining in Mutare',
    h2s: ['Our menu', 'Find us'],
    wordCount: 420,
    images: [{ src: '/hero.jpg', alt: 'Rooftop terrace at sunset' }],
    missingAltCount: 0,
    internalLinks: ['/contact', '/menu'],
    externalLinks: [],
    canonical: 'https://manicaskyview.example/',
    robotsDirectives: '',
    hasStructuredData: true,
    structuredDataTypes: ['Restaurant', 'LocalBusiness'],
    hasClickToCall: true,
    loadTimeMs: 480,
    htmlBytes: 42_000,
    scriptCount: 5,
    formCount: 1,
    hasViewport: true,
    ...overrides,
  };
}

function crawl(pages: CrawledPage[], siteWide: Partial<CrawlResult['siteWide']> = {}): CrawlResult {
  return {
    pages,
    siteWide: {
      https: true,
      robotsTxt: true,
      sitemapXml: true,
      canonicalConsistency: true,
      brokenLinks: [],
      ...siteWide,
    },
    totalFound: pages.length,
  };
}

const healthySite = () =>
  crawl([
    page(),
    page({
      id: 'p-contact',
      url: 'https://manicaskyview.example/contact',
      path: '/contact',
      title: 'Contact Manica SkyView',
      h1: 'Contact us',
      hasStructuredData: false,
      structuredDataTypes: [],
    }),
  ]);

/* ------------------------------- scoring ------------------------------- */

describe('scoring', () => {
  test('the headline score is exactly the sum of the four categories', () => {
    const score = calculateSeoScore(healthySite(), business);
    const sum = score.technicalScore + score.onpageScore + score.localScore + score.contentScore;
    assert.equal(score.overallScore, sum);
  });

  test('never exceeds the documented maxima (25 / 30 / 25 / 20)', () => {
    const perfect = crawl([
      page({ wordCount: 1200, h2s: ['a', 'b', 'c'], scriptCount: 2, htmlBytes: 60_000 }),
      page({ path: '/contact', hasStructuredData: true, structuredDataTypes: ['Restaurant'] }),
      page({ path: '/menu' }),
      page({ path: '/about' }),
    ]);
    const score = calculateSeoScore(perfect, business);

    assert.ok(score.technicalScore <= 25, `technical ${score.technicalScore} > 25`);
    assert.ok(score.onpageScore <= 30, `on-page ${score.onpageScore} > 30`);
    assert.ok(score.localScore <= 25, `local ${score.localScore} > 25`);
    assert.ok(score.contentScore <= 20, `content ${score.contentScore} > 20`);
    assert.ok(score.overallScore <= 100);
  });

  test('a healthy site outscores a neglected one', () => {
    const good = calculateSeoScore(healthySite(), business).overallScore;

    const bad = calculateSeoScore(
      crawl(
        [
          page({
            title: '',
            metaDescription: '',
            h1: '',
            h2s: [],
            wordCount: 40,
            images: [{ src: '/a.jpg', alt: '' }],
            missingAltCount: 1,
            hasStructuredData: false,
            structuredDataTypes: [],
            hasClickToCall: false,
            hasViewport: false,
            scriptCount: 30,
            htmlBytes: 900_000,
            loadTimeMs: 4200,
          }),
        ],
        { https: false, robotsTxt: false, sitemapXml: false }
      ),
      business
    ).overallScore;

    assert.ok(bad < good, `neglected site (${bad}) should score below healthy (${good})`);
    assert.ok(bad < 45, 'a neglected site should land in the low band');
  });

  test('missing HTTPS and a missing sitemap actually cost points', () => {
    const withTls = calculateSeoScore(healthySite(), business).technicalScore;
    const withoutTls = calculateSeoScore(
      crawl(healthySite().pages, { https: false, sitemapXml: false, robotsTxt: false }),
      business
    ).technicalScore;
    assert.ok(withoutTls < withTls, 'losing TLS and the sitemap must reduce the technical score');
  });
});

/* -------------------------------- issues ------------------------------- */

describe('issues', () => {
  test('every issue is well-formed', () => {
    const site = healthySite();
    const score = calculateSeoScore(site, business);
    const { issues } = generateIssues(site, score, business);

    for (const issue of issues) {
      assert.ok(issue.title?.length > 0, 'issue needs a title');
      assert.ok(issue.affectedPage, 'issue needs an affected page');
      assert.ok(
        ['critical', 'high', 'medium', 'low', 'good'].includes(issue.severity),
        `unexpected severity ${issue.severity}`
      );
      assert.ok(issue.impact && issue.difficulty, 'impact and difficulty drive ranking');
    }
  });

  test('passed checks are never listed as priorities', () => {
    const site = healthySite();
    const score = calculateSeoScore(site, business);
    const { topPriorities } = generateIssues(site, score, business);
    assert.equal(
      topPriorities.some((i) => i.severity === 'good'),
      false
    );
  });

  test('flags missing image alt text', () => {
    const site = crawl([
      page({ images: [{ src: '/hero.jpg', alt: '' }], missingAltCount: 1 }),
      page({ path: '/contact' }),
    ]);
    const score = calculateSeoScore(site, business);
    const { issues } = generateIssues(site, score, business);
    assert.ok(issues.some((i) => /alt/i.test(i.title)), 'expected a missing-alt finding');
  });

  test('flags a missing sitemap', () => {
    const site = crawl(healthySite().pages, { sitemapXml: false });
    const score = calculateSeoScore(site, business);
    const { issues } = generateIssues(site, score, business);
    assert.ok(issues.some((i) => /sitemap/i.test(i.title)), 'expected a sitemap finding');
  });

  test('reports a passing HTTPS check as a good issue, not a problem', () => {
    const site = healthySite();
    const score = calculateSeoScore(site, business);
    const { issues } = generateIssues(site, score, business);
    const good = issues.filter((i) => i.severity === 'good');
    assert.ok(good.length > 0, 'a well-built site should earn some passed checks');
  });

  test('a site with no issues at all does not crash the engine', () => {
    const empty = crawl([]);
    const score = calculateSeoScore(empty, business);
    const { issues } = generateIssues(empty, score, business);
    assert.ok(Array.isArray(issues));
  });
});

/* ----------------------------- drop-off -------------------------------- */

describe('inferred drop-off', () => {
  test('a fast, mobile-friendly site produces no signals', () => {
    const analysis = generateDropOffAnalysis(healthySite(), business);
    assert.equal(analysis.signals.length, 0);
  });

  test('a slow, heavy, desktop-only page produces signals', () => {
    const slow = crawl([
      page({
        loadTimeMs: 5200,
        hasViewport: false,
        scriptCount: 34,
        htmlBytes: 1_200_000,
        hasClickToCall: false,
        wordCount: 60,
      }),
    ]);
    const analysis = generateDropOffAnalysis(slow, business);
    assert.ok(analysis.signals.length > 0, 'a page this bad should produce signals');

    for (const signal of analysis.signals) {
      assert.ok(signal.evidence, 'every signal must cite what was measured');
      assert.ok(signal.whyItMatters, 'every signal must explain why it matters');
      assert.ok(signal.suggestedAction, 'every signal must suggest an action');
      assert.ok(signal.basedOn, 'every signal must say what it is based on');
    }
  });

  test('never claims to be measured behaviour', () => {
    const analysis = generateDropOffAnalysis(
      crawl([page({ loadTimeMs: 5200, hasViewport: false })]),
      business
    );
    assert.match(analysis.summary.toLowerCase(), /inferred|likely/);
  });
});

/* --------------------------- the SSRF guard ---------------------------- */

describe('crawler safety', () => {
  test('refuses localhost, loopback and private addresses', async () => {
    const blocked = [
      'http://localhost/',
      'http://127.0.0.1/',
      'http://0.0.0.0/',
      'http://[::1]/',
      'http://169.254.169.254/latest/meta-data/', // cloud metadata endpoint
      'http://10.0.0.5/',
      'http://192.168.1.1/',
      'http://172.16.0.1/',
      'http://100.64.0.1/', // carrier-grade NAT
      'http://something.local/',
      'http://anything.internal/',
      // IPv6 forms — these were reachable before the bracket bug was fixed
      'http://[0:0:0:0:0:0:0:1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[::ffff:7f00:1]/',
      'http://[fd00::1]/', // unique-local
      'http://[fe80::1]/', // link-local
    ];

    for (const url of blocked) {
      await assert.rejects(
        async () => await crawlWebsite(url, 1, business),
        /prohibited|not allowed|Invalid|private/i,
        `${url} must be refused`
      );
    }
  });

  test('still allows a normal public hostname', () => {
    for (const host of ['example.com', 'manicaskyview.co.zw', '8.8.8.8', 'sub.domain.example.org']) {
      assert.equal(classifyHost(host).safe, true, );
    }
    assert.equal(isSafeUrl('https://example.com/path').safe, true);
  });

  test('refuses non-HTTP protocols', async () => {
    for (const url of ['file:///etc/passwd', 'ftp://example.com', 'javascript:alert(1)']) {
      await assert.rejects(
        async () => await crawlWebsite(url, 1, business),
        /only http|prohibited|Invalid/i,
        `${url} must be refused`
      );
    }
  });
});

process.on('exit', () => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
