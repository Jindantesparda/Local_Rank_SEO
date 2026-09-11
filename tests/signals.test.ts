import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { deriveMeasuredDropOff } from '../server/measuredDropoff';
import { detectMovement } from '../server/rankTracker';
import { TrackedKeyword } from '../server/rankStore';
import { AnalyticsSummary } from '../server/ga4';

/**
 * These cover the rules that decide what we TELL a customer about their site.
 * A false positive here is a customer acting on a problem they do not have, so
 * the thresholds and the suppression rules are worth pinning down.
 */

function summary(overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary {
  return {
    connected: true,
    propertyId: '123456789',
    rangeDays: 28,
    fetchedAt: new Date().toISOString(),
    totals: {
      sessions: 160,
      users: 138,
      bounceRate: 0.44,
      avgEngagementSeconds: 35,
      views: 420,
    },
    trend: [],
    topLandingPages: [],
    channels: [],
    devices: [],
    ...overrides,
  };
}

describe('measured drop-off (Google Analytics)', () => {
  test('stays silent below the traffic floor, even with terrible numbers', () => {
    const result = deriveMeasuredDropOff(
      summary({
        totals: { sessions: 12, users: 11, bounceRate: 0.95, avgEngagementSeconds: 3, views: 14 },
        topLandingPages: [
          { path: '/services', sessions: 11, bounceRate: 1, avgEngagementSeconds: 1 },
        ],
        devices: [
          { device: 'mobile', sessions: 11, bounceRate: 1 },
          { device: 'desktop', sessions: 1, bounceRate: 0 },
        ],
      })
    );

    assert.equal(result.hasEnoughData, false);
    assert.equal(result.signals.length, 0, 'must not accuse a page on 12 sessions');
    assert.match(result.headline, /not enough/i);
  });

  test('a healthy site produces no signals', () => {
    const result = deriveMeasuredDropOff(
      summary({
        totals: { sessions: 400, users: 350, bounceRate: 0.32, avgEngagementSeconds: 62, views: 900 },
        topLandingPages: [
          { path: '/', sessions: 200, bounceRate: 0.3, avgEngagementSeconds: 70 },
          { path: '/contact', sessions: 100, bounceRate: 0.22, avgEngagementSeconds: 80 },
        ],
        devices: [
          { device: 'mobile', sessions: 220, bounceRate: 0.34 },
          { device: 'desktop', sessions: 180, bounceRate: 0.3 },
        ],
        channels: [{ channel: 'Organic Search', sessions: 300, bounceRate: 0.3 }],
      })
    );

    assert.equal(result.hasEnoughData, true);
    assert.deepEqual(result.signals, []);
    assert.match(result.headline, /no page stands out/i);
  });

  test('flags the one landing page that is much worse than the site average', () => {
    const result = deriveMeasuredDropOff(
      summary({
        topLandingPages: [
          { path: '/services', sessions: 88, bounceRate: 0.78, avgEngagementSeconds: 17 },
          { path: '/', sessions: 70, bounceRate: 0.35, avgEngagementSeconds: 90 },
        ],
      })
    );

    const pageSignal = result.signals.find((s) => s.page === '/services');
    assert.ok(pageSignal, 'the outlier should be flagged');
    assert.equal(pageSignal.likelihood, 'high');
    assert.match(pageSignal.measured, /78%/);
    assert.match(pageSignal.baseline, /44%/);

    // The well-performing page must not be flagged.
    assert.equal(
      result.signals.some((s) => s.page === '/'),
      false,
      'a page beating the average must never be flagged'
    );
  });

  test('ignores a low-traffic page however bad its bounce rate', () => {
    const result = deriveMeasuredDropOff(
      summary({
        topLandingPages: [
          { path: '/thin', sessions: 4, bounceRate: 1, avgEngagementSeconds: 1 },
          { path: '/', sessions: 150, bounceRate: 0.4, avgEngagementSeconds: 60 },
        ],
      })
    );
    assert.equal(
      result.signals.some((s) => s.page === '/thin'),
      false,
      '4 sessions is not evidence'
    );
  });

  test('flags a mobile gap only when both devices have enough traffic', () => {
    const result = deriveMeasuredDropOff(
      summary({
        devices: [
          { device: 'mobile', sessions: 130, bounceRate: 0.71 },
          { device: 'desktop', sessions: 30, bounceRate: 0.3 },
        ],
      })
    );
    assert.ok(result.signals.some((s) => s.id === 'measured-mobile-gap'));

    const thinDesktop = deriveMeasuredDropOff(
      summary({
        devices: [
          { device: 'mobile', sessions: 150, bounceRate: 0.8 },
          { device: 'desktop', sessions: 3, bounceRate: 0.0 },
        ],
      })
    );
    assert.equal(
      thinDesktop.signals.some((s) => s.id === 'measured-mobile-gap'),
      false,
      '3 desktop sessions is not a baseline'
    );
  });

  test('flags a channel whose traffic bounces harder than the site', () => {
    const result = deriveMeasuredDropOff(
      summary({
        channels: [
          { channel: 'Paid Social', sessions: 40, bounceRate: 0.82 },
          { channel: 'Organic Search', sessions: 120, bounceRate: 0.38 },
        ],
      })
    );
    assert.ok(result.signals.some((s) => s.id.includes('Paid Social')));
  });

  test('notes when everything depends on a single landing page', () => {
    const concentrated = deriveMeasuredDropOff(
      summary({
        totals: { sessions: 100, users: 90, bounceRate: 0.4, avgEngagementSeconds: 40, views: 200 },
        topLandingPages: [
          { path: '/', sessions: 80, bounceRate: 0.4, avgEngagementSeconds: 40 },
          { path: '/contact', sessions: 20, bounceRate: 0.4, avgEngagementSeconds: 40 },
        ],
      })
    );
    assert.ok(concentrated.signals.some((s) => s.id === 'measured-funnel-concentration'));
  });
});

describe('rank movement detection', () => {
  const kw = (history: Array<{ position: number | null; error?: string }>): TrackedKeyword => ({
    keyword: 'roofers in mutare',
    createdAt: new Date().toISOString(),
    history: history.map((h) => ({
      checkedAt: new Date().toISOString(),
      position: h.position,
      resultsCount: 10,
      error: h.error,
    })),
  });

  test('a drop of 3 or more places is reported', () => {
    const move = detectMovement(kw([{ position: 2 }, { position: 7 }]));
    assert.ok(move);
    assert.equal(move.dropped, true);
    assert.equal(move.change, 5);
    assert.equal(move.fellOut, false);
  });

  test('small jitter is NOT reported as a drop', () => {
    const move = detectMovement(kw([{ position: 5 }, { position: 7 }]));
    assert.ok(move);
    assert.equal(move.dropped, false, '2 places is normal movement');
    assert.equal(move.change, 2);
  });

  test('leaving the top results is reported as falling out, not a position', () => {
    const move = detectMovement(kw([{ position: 1 }, { position: null }]));
    assert.ok(move);
    assert.equal(move.dropped, true);
    assert.equal(move.fellOut, true);
    assert.equal(move.change, null, 'there is no numeric change to report');
  });

  test('entering the results is an improvement, not a drop', () => {
    const move = detectMovement(kw([{ position: null }, { position: 4 }]));
    assert.ok(move);
    assert.equal(move.dropped, false);
  });

  test('improving is not a drop', () => {
    const move = detectMovement(kw([{ position: 9 }, { position: 3 }]));
    assert.ok(move);
    assert.equal(move.dropped, false);
    assert.ok((move.change || 0) < 0, 'a negative change means it moved up');
  });

  test('a failed check is skipped, not treated as a collapse', () => {
    const move = detectMovement(
      kw([{ position: 2 }, { position: null, error: 'Google Search API error (429)' }, { position: 4 }])
    );
    assert.ok(move);
    assert.equal(move.dropped, false, 'a quota error must never look like a ranking drop');
    assert.equal(move.previous, 2);
    assert.equal(move.current, 4);
  });

  test('one reading cannot produce movement', () => {
    assert.equal(detectMovement(kw([{ position: 3 }])), null);
  });
});
