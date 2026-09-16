import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { AddressInfo } from 'node:net';

/**
 * Search providers and Search Console.
 *
 * A local stub stands in for Google's OAuth endpoint, the Search Console API
 * and the Brave API. The stub VERIFIES the RS256 signature on the JWT, so a
 * broken signing path fails here instead of appearing to work.
 */

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

let server: http.Server;
let base = '';
const tokenScopes: string[] = [];

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      const url = new URL(req.url || '/', 'http://localhost');
      const send = (code: number, obj: unknown) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };

      if (url.pathname.endsWith('/token')) {
        const assertion = new URLSearchParams(body).get('assertion') || '';
        const [h, c, s] = assertion.split('.');
        const raw = (x: string) =>
          Buffer.from(x.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        const valid =
          h && c && s
            ? crypto
                .createVerify('RSA-SHA256')
                .update(`${h}.${c}`)
                .end()
                .verify(publicKey, raw(s))
            : false;
        if (!valid) return send(400, { error: 'invalid_grant', error_description: 'bad signature' });
        const payload = JSON.parse(raw(c).toString('utf8'));
        tokenScopes.push(payload.scope);
        return send(200, { access_token: 'stub-token', expires_in: 3600 });
      }

      if (url.pathname.endsWith('/sites')) {
        return send(200, {
          siteEntry: [{ siteUrl: 'sc-domain:known.example', permissionLevel: 'siteFullUser' }],
        });
      }

      if (url.pathname.includes('/searchAnalytics/query')) {
        const payload = JSON.parse(body || '{}');
        const wanted = (payload.dimensionFilterGroups || [])
          .map((g: { filters?: Array<{ expression?: string }> }) => g.filters?.[0]?.expression)
          .filter(Boolean) as string[];
        const rows = wanted
          .filter((k) => k !== 'no-impressions-keyword')
          .map((k) => ({ keys: [k], clicks: 5, impressions: 300, ctr: 0.02, position: 4.3 }));
        return send(200, { rows });
      }

      if (url.pathname.includes('/web/search')) {
        return send(200, {
          web: {
            results: [
              { title: 'Rival', url: 'https://rival.example/' },
              { title: 'Us', url: 'https://oursite.example/' },
            ],
          },
        });
      }

      if (url.pathname.includes('/forbidden')) {
        return send(403, { error: { message: 'no access' } });
      }

      send(404, { error: 'not found' });
    });
  });

  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  process.env.GOOGLE_CLIENT_EMAIL = 'tester@example.iam.gserviceaccount.com';
  process.env.GOOGLE_PRIVATE_KEY = privateKey;
  process.env.GOOGLE_OAUTH_URL = `${base}/oauth/token`;
  process.env.GSC_API_BASE_URL = `${base}/webmasters/v3`;
  process.env.BRAVE_SEARCH_API_KEY = 'stub-brave';
  process.env.BRAVE_SEARCH_BASE_URL = `${base}/brave/res/v1/web/search`;
});

after(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

/* ---------------------------- pure helpers ---------------------------- */

describe('Search Console property strings', () => {
  test('a bare domain becomes a domain property', async () => {
    const { normaliseSiteUrl } = await import('../server/searchConsole');
    assert.equal(normaliseSiteUrl('example.com'), 'sc-domain:example.com');
    assert.equal(normaliseSiteUrl('  Example.COM  '), 'sc-domain:example.com');
  });

  test('a URL gets a trailing slash, which Search Console requires', async () => {
    const { normaliseSiteUrl } = await import('../server/searchConsole');
    assert.equal(normaliseSiteUrl('https://example.com'), 'https://example.com/');
    assert.equal(normaliseSiteUrl('https://example.com/'), 'https://example.com/');
    assert.equal(normaliseSiteUrl('http://example.com/blog'), 'http://example.com/blog/');
  });

  test('an explicit domain property is preserved', async () => {
    const { normaliseSiteUrl } = await import('../server/searchConsole');
    assert.equal(normaliseSiteUrl('sc-domain:Example.com'), 'sc-domain:example.com');
    assert.equal(normaliseSiteUrl('sc-domain:example.com/'), 'sc-domain:example.com');
  });

  test('empty input yields empty output rather than a broken property', async () => {
    const { normaliseSiteUrl } = await import('../server/searchConsole');
    assert.equal(normaliseSiteUrl(''), '');
    assert.equal(normaliseSiteUrl('   '), '');
  });
});

describe('search provider selection', () => {
  test('Brave wins when both are configured, and labels are never ambiguous', async () => {
    const { activeSerpSource, sourceLabel, braveConfigured, customSearchConfigured } =
      await import('../server/serpProviders');

    assert.equal(braveConfigured(), true);
    assert.equal(activeSerpSource(), 'brave');
    assert.equal(sourceLabel('brave'), 'Brave Search index');
    assert.equal(sourceLabel('google-custom-search'), 'Google Programmable Search');
    assert.equal(sourceLabel('none'), 'not connected');

    // The Brave label must not claim to be Google.
    assert.equal(/google/i.test(sourceLabel('brave')), false);

    const savedKey = process.env.BRAVE_SEARCH_API_KEY;
    delete process.env.BRAVE_SEARCH_API_KEY;
    assert.equal(activeSerpSource(), 'none');
    assert.equal(customSearchConfigured(), false);
    process.env.BRAVE_SEARCH_API_KEY = savedKey;
  });

  test('toDomain strips protocol, www and case', async () => {
    const { toDomain } = await import('../server/serpProviders');
    assert.equal(toDomain('https://www.Example.com/path'), 'example.com');
    assert.equal(toDomain('example.com'), 'example.com');
    assert.equal(toDomain('HTTP://Sub.Example.CO.UK'), 'sub.example.co.uk');
  });
});

/* ------------------------- live paths via the stub -------------------- */

describe('Search Console client', () => {
  test('signs a JWT, gets a token, and never hits Google for real', async () => {
    const { fetchKeywordPosition } = await import('../server/searchConsole');
    const result = await fetchKeywordPosition('sc-domain:known.example', 'rooftop restaurants mutare', 28);

    assert.ok(result, 'a row was returned');
    assert.equal(result.position, 4.3, 'fractional averages must survive');
    assert.equal(result.clicks, 5);
    assert.equal(result.impressions, 300);

    // The stub only issues a token when the RS256 signature verifies.
    assert.ok(tokenScopes.length > 0, 'the JWT was accepted by the token endpoint');
    assert.ok(
      tokenScopes.every((s) => s.includes('webmasters.readonly')),
      'Search Console must be asked for the webmasters scope, not the analytics one'
    );
  });

  test('a keyword with no impressions returns null, not a fake position', async () => {
    const { fetchKeywordPosition } = await import('../server/searchConsole');
    const result = await fetchKeywordPosition(
      'sc-domain:known.example',
      'no-impressions-keyword',
      28
    );
    assert.equal(result, null);
  });

  test('several keywords are fetched in one request', async () => {
    const { fetchKeywordPositions } = await import('../server/searchConsole');
    const map = await fetchKeywordPositions(
      'sc-domain:known.example',
      ['rooftop restaurants mutare', 'restaurants in mutare'],
      28
    );
    assert.equal(map.size, 2);
    assert.equal(map.get('restaurants in mutare')?.position, 4.3);
  });

  test('a property the account cannot see is explained, not swallowed', async () => {
    const { verifySite } = await import('../server/searchConsole');
    await assert.rejects(
      () => verifySite('sc-domain:someone-elses.example'),
      /cannot see|Add the service account/i
    );
  });
});

describe('Brave search provider', () => {
  test('maps results and marks which one is you', async () => {
    const { fetchSerp } = await import('../server/serpProviders');
    const serp = await fetchSerp('rooftop restaurants mutare', 'oursite.example');

    assert.equal(serp.configured, true);
    assert.equal(serp.source, 'brave');
    assert.equal(serp.sourceLabel, 'Brave Search index');
    assert.equal(serp.results.length, 2);
    assert.equal(serp.yourPosition, 2);
    assert.equal(serp.aboveYou, 1);
    assert.equal(serp.results[1].isYou, true);
    // The message must not imply the result is a Google ranking.
    assert.match(serp.message || '', /not Google/i);
  });

  test('not appearing is reported honestly, with the index named', async () => {
    const { fetchSerp } = await import('../server/serpProviders');
    const serp = await fetchSerp('rooftop restaurants mutare', 'somewhere-else.example');
    assert.equal(serp.yourPosition, null);
    assert.match(serp.message || '', /not found/i);
    assert.match(serp.message || '', /not Google/i);
  });
});

/* --------------------------- proxy / client IP ------------------------- */

describe('proxy resolution (rate-limit keying)', () => {
  test('defaults to one hop, which suits a single host proxy', async () => {
    const { parseTrustProxy } = await import('../server/proxy');
    assert.equal(parseTrustProxy(undefined).value, 1);
    assert.equal(parseTrustProxy('').value, 1);
    assert.equal(parseTrustProxy('   ').value, 1);
  });

  test('accepts an explicit hop count, including the Cloudflare case', async () => {
    const { parseTrustProxy } = await import('../server/proxy');
    assert.equal(parseTrustProxy('1').value, 1);
    assert.equal(parseTrustProxy('2').value, 2, 'Cloudflare in front of Render is two hops');
    assert.equal(parseTrustProxy('3').value, 3);
    assert.equal(parseTrustProxy('0').value, 0);
  });

  test('accepts an IP/CIDR list', async () => {
    const { parseTrustProxy } = await import('../server/proxy');
    assert.equal(parseTrustProxy('loopback').value, 'loopback');
    assert.equal(parseTrustProxy('10.0.0.0/8,172.16.0.0/12').value, '10.0.0.0/8,172.16.0.0/12');
  });

  test('warns that trusting every proxy is spoofable', async () => {
    const { parseTrustProxy } = await import('../server/proxy');
    const result = parseTrustProxy('true');
    assert.equal(result.value, true);
    assert.match(result.warning || '', /spoof/i);
  });

  test('nonsense falls back to the safe default and says so', async () => {
    const { parseTrustProxy } = await import('../server/proxy');
    const result = parseTrustProxy('99');
    assert.equal(result.value, 1);
    assert.match(result.warning || '', /TRUST_PROXY/);

    assert.equal(parseTrustProxy('nonsense-value!').value, 'nonsense-value!');
  });

  test('a missing IP still produces a stable bucket key', async () => {
    const { clientKey } = await import('../server/proxy');
    assert.equal(clientKey(undefined), 'unknown');
    assert.equal(clientKey('203.0.113.9'), '203.0.113.9');
  });
});
