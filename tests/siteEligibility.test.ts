import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { assessSiteEligibility } from '../server/siteEligibility';
import { CrawlResult, classifyHost } from '../server/crawler';
import { CrawledPage } from '../src/types';

/**
 * These guard against the worst possible failure for a scoring product:
 * producing a confident-looking number for something that is not a website.
 *
 * A domain that does not exist once scored 36/100 because a failed fetch was
 * stored as a page and HTTPS was credited from the input URL without a response
 * ever coming back. These tests pin that down.
 */

function page(overrides: Partial<CrawledPage> = {}): CrawledPage {
  return {
    id: 'p1',
    url: 'https://example.co.zw/',
    path: '/',
    statusCode: 200,
    title: 'Mutare Rooftop Restaurant',
    metaDescription: 'Rooftop dining in Mutare, Zimbabwe.',
    h1: 'Rooftop dining in Mutare',
    h2s: [],
    wordCount: 320,
    images: [],
    missingAltCount: 0,
    internalLinks: ['/contact'],
    externalLinks: [],
    canonical: '',
    robotsDirectives: '',
    hasStructuredData: true,
    structuredDataTypes: ['Restaurant'],
    hasClickToCall: true,
    textSample: 'We serve dinner above Mutare every evening.',
    ...overrides,
  };
}

function crawl(pages: CrawledPage[]): CrawlResult {
  return {
    pages,
    siteWide: {
      https: true,
      robotsTxt: true,
      sitemapXml: true,
      canonicalConsistency: true,
      brokenLinks: [],
    },
    totalFound: pages.length,
  };
}

describe('site eligibility', () => {
  test('accepts a genuine business page', () => {
    assert.equal(assessSiteEligibility(crawl([page()])).ok, true);
  });

  test('refuses an empty crawl', () => {
    const result = assessSiteEligibility(crawl([]));
    assert.equal(result.ok, false);
    assert.match(result.reason || '', /no pages/i);
  });

  test('accepts a small one-page business site', () => {
    // A legitimate one-page site for a local business: not many words, but a
    // real title, heading and a phone number.
    const small = page({
      wordCount: 18,
      title: "Joe's Plumbing Mutare",
      h1: "Joe's Plumbing",
      metaDescription: '',
      hasClickToCall: true,
      internalLinks: [],
      images: [],
      textSample: 'Call us for a quote.',
    });
    assert.equal(assessSiteEligibility(crawl([small])).ok, true, 'should not be refused');
  });

  test('refuses a page with no content and no structure', () => {
    const empty = page({
      wordCount: 4,
      title: '',
      h1: '',
      metaDescription: '',
      hasClickToCall: false,
      internalLinks: [],
      images: [],
      textSample: 'Hello',
    });
    const result = assessSiteEligibility(crawl([empty]));
    assert.equal(result.ok, false);
    assert.match(result.reason || '', /nothing substantial/i);
  });

  test('refuses placeholder and parked pages', () => {
    const cases: Array<[string, Partial<CrawledPage>]> = [
      ['domain for sale', { title: 'example.com is for sale', textSample: 'Buy this domain now.' }],
      ['parked', { title: 'Parked Domain', textSample: 'This domain is parked free, courtesy of GoDaddy.' }],
      ['under construction', { title: 'Coming Soon', textSample: 'Our site is under construction.' }],
      ['default nginx', { title: 'Welcome to nginx!', textSample: 'If you see this page, nginx is installed.' }],
      ['directory listing', { title: 'Index of /', textSample: 'Index of / var www' }],
      ['suspended', { title: 'Account Suspended', textSample: 'This account has been suspended.' }],
    ];

    for (const [label, overrides] of cases) {
      const result = assessSiteEligibility(crawl([page(overrides)]));
      assert.equal(result.ok, false, `${label} must be refused`);
      assert.match(result.reason || '', /looks like/i, `${label} should explain why`);
    }
  });

  test('a parked page is refused even when it has plenty of words', () => {
    const parked = page({
      wordCount: 900,
      title: 'HugeDomains.com — Buy this domain',
      textSample: 'This domain is for sale. Make an offer today and own example.com.',
    });
    assert.equal(assessSiteEligibility(crawl([parked])).ok, false);
  });

  test('one real page among junk is enough to score', () => {
    const junk = page({
      id: 'p2',
      path: '/old',
      wordCount: 2,
      title: '',
      h1: '',
      metaDescription: '',
      hasClickToCall: false,
      internalLinks: [],
    });
    assert.equal(assessSiteEligibility(crawl([junk, page()])).ok, true);
  });
});

describe('host classification used by the crawler (and the score gate)', () => {
  test('blocks loopback and private addresses in every notation', () => {
    const blocked = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '10.1.2.3',
      '172.16.0.1',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '::1',
      '[::1]',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      'fd00::1',
      'fe80::1',
      'thing.local',
      'thing.internal',
    ];
    for (const host of blocked) {
      assert.equal(classifyHost(host).safe, false, `${host} must be blocked`);
    }
  });

  test('allows ordinary public hostnames', () => {
    for (const host of ['example.com', 'manicaskyview.co.zw', '8.8.8.8', 'www.iana.org']) {
      assert.equal(classifyHost(host).safe, true, `${host} must be allowed`);
    }
  });
});
