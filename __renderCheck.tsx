/**
 * Render CompetitorsView on the server to surface any render-time crash.
 * Server rendering runs the same render path as the browser (minus effects),
 * so an exception here is the same one that blanks the page.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CompetitorsView } from './src/components/CompetitorsView';

const audit = {
  id: 'audit-1',
  businessId: 'biz1',
  business: {
    id: 'biz1',
    name: 'Manica SkyView',
    website: 'https://example.com',
    location: 'Mutare, Zimbabwe',
    category: 'Restaurant',
    services: ['Rooftop dining'],
  },
  createdAt: new Date().toISOString(),
  overallScore: 43,
  technicalScore: 14,
  onpageScore: 16,
  localScore: 7,
  contentScore: 6,
  pagesAnalyzed: 1,
  criticalCount: 3,
  warningCount: 5,
  goodCount: 2,
  pages: [],
  issues: [],
  topPriorities: [],
  aiRecommendations: [],
  isDemo: false,
};

const cases: Array<[string, Record<string, unknown>]> = [
  [
    'free tier',
    { business: audit.business, audit, userTier: 'free', token: 'test-token', onNeedBusiness: () => {}, onUpgrade: () => {} },
  ],
  [
    'growth tier with token',
    { business: audit.business, audit, userTier: 'pro', token: 'test-token', onNeedBusiness: () => {}, onUpgrade: () => {} },
  ],
  [
    'agency tier with token',
    { business: audit.business, audit, userTier: 'agency', token: 'test-token', onNeedBusiness: () => {}, onUpgrade: () => {} },
  ],
  [
    'NO AUDIT LOADED (currentAudit is null) — what App actually passes',
    { business: null, audit: null, userTier: 'pro', token: 'test-token', onNeedBusiness: () => {}, onUpgrade: () => {} },
  ],
  [
    'paid but no token',
    { business: audit.business, audit, userTier: 'pro', token: null, onNeedBusiness: () => {}, onUpgrade: () => {} },
  ],
];

let failures = 0;
for (const [label, props] of cases) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = renderToString(React.createElement(CompetitorsView as any, props as any));
    console.log(`  ok    ${label} — rendered ${html.length} chars`);
  } catch (err) {
    failures += 1;
    console.log(`  CRASH ${label}`);
    console.log(`        ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error && err.stack) {
      console.log(
        err.stack
          .split('\n')
          .slice(1, 5)
          .map((l) => '        ' + l.trim())
          .join('\n')
      );
    }
  }
}

console.log(failures === 0 ? '\n  no render crashes' : `\n  ${failures} render crash(es)`);
