/** Retest: nonsense / parked / unreachable addresses must NOT be scored. */
const BASE = process.env.BASE || 'http://localhost:3403';

const CASES = [
  { label: 'domain that cannot exist', website: 'https://this-domain-definitely-does-not-exist-9f8a7b6c.com' },
  { label: 'another nonsense domain', website: 'https://qwertyuiop-asdfghjkl-nonsense-zzz.com' },
  { label: 'random string as the URL', website: 'https://asdkjhaskjdhaksjdhaksjdh.com' },
];

(async () => {
  for (const c of CASES) {
    const res = await fetch(`${BASE}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business: {
          id: 'b-test',
          name: 'Total Nonsense',
          website: c.website,
          location: 'Nowhere',
          category: 'Restaurant',
          services: [],
        },
        maxPages: 3,
      }),
    });

    const body = await res.json();
    if (body.audit) {
      console.log(`  ✗ ${c.label}: STILL SCORED ${body.audit.overallScore}/100  <-- BUG`);
    } else {
      console.log(`  ✓ ${c.label}: refused (HTTP ${res.status})`);
      console.log(`      "${String(body.error).split('\n')[0].slice(0, 130)}"`);
    }
  }

  // And a real site must still be scored.
  const real = await fetch(`${BASE}/api/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business: {
        id: 'b-real',
        name: 'Example',
        website: 'https://www.iana.org',
        location: 'Mutare',
        category: 'Restaurant',
        services: ['Dining'],
      },
      maxPages: 3,
    }),
  });
  const realBody = await real.json();
  if (realBody.audit) {
    console.log(`  ✓ real site (example.com) still scores: ${realBody.audit.overallScore}/100`);
  } else {
    console.log(`  ✗ real site was refused: ${realBody.error}`);
  }
})();
