/**
 * Domain setup checker.
 *
 * Run this after each step of pointing a domain at the app. It reports what is
 * actually true on the network rather than what should be true, and names the
 * specific fix for each failure.
 *
 *   node scripts/check-domain.cjs
 *   node scripts/check-domain.cjs your-domain.com
 *
 * Exit code is non-zero unless every check passes, so it can gate a release.
 */
const dns = require('dns').promises;
const https = require('https');

const DOMAIN = (process.argv[2] || process.env.DOMAIN || 'searchvailable.com').replace(
  /^https?:\/\//,
  ''
);

const EXPECTED_TRUST_PROXY = process.env.EXPECTED_TRUST_PROXY || '1';

let failures = 0;
const results = [];

function ok(label, detail) {
  results.push({ pass: true, label, detail });
}
function fail(label, detail, fix) {
  failures += 1;
  results.push({ pass: false, label, detail, fix });
}

/** An address that looks like a Cloudflare edge, i.e. wrong for rate limiting. */
function looksLikeCloudflare(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const m = ip.match(/^(\d+)\.(\d+)\./);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 172 && b >= 64 && b <= 71) return true; // 172.64-71.x
  if (a === 104 && b >= 16 && b <= 31) return true; // 104.16-31.x
  if (a === 162 && b === 159) return true; // 162.159.x
  if (a === 188 && b === 114) return true; // 188.114.x
  return false;
}

async function tryResolve(fn) {
  try {
    return { value: await fn() };
  } catch (err) {
    return { error: err.code || err.message };
  }
}

function fetchHealth(url, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'timed out' });
    });
    req.on('error', (err) => resolve({ error: err.code || err.message }));
  });
}

(async () => {
  console.log(`\nChecking ${DOMAIN}\n${'='.repeat(60)}`);

  /* ---------------------------- nameservers ---------------------------- */
  const ns = await tryResolve(() => dns.resolveNs(DOMAIN));
  if (ns.value && ns.value.some((n) => n.includes('cloudflare'))) {
    ok('Nameservers', `${ns.value.join(', ')} (Cloudflare)`);
  } else if (ns.value) {
    ok('Nameservers', ns.value.join(', '));
  } else {
    fail('Nameservers', ns.error || 'not found', 'The domain is not delegated yet.');
  }

  /* ------------------------------- DNS -------------------------------- */
  const apex4 = await tryResolve(() => dns.resolve4(DOMAIN));
  const apexCname = await tryResolve(() => dns.resolveCname(DOMAIN));
  const www4 = await tryResolve(() => dns.resolve4(`www.${DOMAIN}`));
  const wwwCname = await tryResolve(() => dns.resolveCname(`www.${DOMAIN}`));

  const apexPoints = Boolean(apex4.value || apexCname.value);
  const wwwPoints = Boolean(www4.value || wwwCname.value);

  if (apexPoints) {
    ok('Apex record', apexCname.value ? `CNAME → ${apexCname.value.join(', ')}` : apex4.value.join(', '));
  } else {
    fail(
      'Apex record',
      'no A or CNAME record',
      `In Cloudflare → DNS add:  CNAME  @  →  your-host-hostname   (proxy status per your setup)`
    );
  }

  if (wwwPoints) {
    ok('www record', wwwCname.value ? `CNAME → ${wwwCname.value.join(', ')}` : www4.value.join(', '));
  } else {
    fail(
      'www record',
      'no A or CNAME record',
      `Add:  CNAME  www  →  your-host-hostname`
    );
  }

  /* ------------------------------ HTTPS ------------------------------- */
  if (!apexPoints) {
    fail('HTTPS', 'skipped — the domain does not resolve yet', 'Add the DNS record first.');
  } else {
    const health = await fetchHealth(`https://${DOMAIN}/api/health`);

    if (health.error) {
      fail(
        'HTTPS',
        `could not reach https://${DOMAIN}/api/health (${health.error})`,
        'Check the SSL/TLS mode is Full (strict) — NOT Flexible, which loops. Also confirm the host has the domain added.'
      );
    } else if (health.status !== 200) {
      fail('HTTPS', `HTTP ${health.status} from /api/health`, 'The host is reachable but the app is not healthy.');
    } else {
      let parsed = null;
      try {
        parsed = JSON.parse(health.body);
      } catch {
        /* fall through */
      }

      if (!parsed) {
        fail('HTTPS', 'reachable, but /api/health did not return JSON', 'Something other than the app is answering.');
      } else {
        ok('HTTPS', `HTTP 200, status "${parsed.status}"`);

        if (parsed.database && parsed.database.ok === true) {
          ok('Database', `schema v${parsed.database.schemaVersion}, ${parsed.database.users} user(s)`);
        } else {
          fail('Database', 'storage is not usable', 'Check DATA_DIR is writable and a disk is mounted.');
        }

        /* ------------------------ the proxy check ------------------------ */
        const ip = parsed.resolvedClientIp;
        if (!ip) {
          fail('Proxy / rate limiting', 'health did not report resolvedClientIp', 'Update to the current server build.');
        } else if (looksLikeCloudflare(ip)) {
          fail(
            'Proxy / rate limiting',
            `resolvedClientIp is ${ip} — a Cloudflare address, not yours`,
            `Set TRUST_PROXY=${Number(EXPECTED_TRUST_PROXY) + 1} on the host and restart. Until then every ` +
              `visitor shares one rate-limit bucket, so 30 failed logins lock out the whole app.`
          );
        } else {
          ok(
            'Proxy / rate limiting',
            `resolvedClientIp is ${ip} (trustProxy=${parsed.trustProxy}) — the real client`
          );
        }
      }
    }
  }

  /* ------------------------------ email DNS --------------------------- */
  const mx = await tryResolve(() => dns.resolveMx(DOMAIN));
  const txt = await tryResolve(() => dns.resolveTxt(DOMAIN));

  if (mx.value && mx.value.length) {
    ok('MX', mx.value.map((r) => r.exchange).join(', '));
  } else {
    results.push({
      pass: null,
      label: 'MX',
      detail: 'no MX records — expected if you send only (Resend needs SPF/DKIM, not MX)',
    });
  }

  const flat = (txt.value || []).map((r) => r.join(''));
  const hasSpf = flat.some((r) => r.startsWith('v=spf1'));
  if (hasSpf) {
    ok('SPF', flat.find((r) => r.startsWith('v=spf1')));
  } else {
    results.push({
      pass: null,
      label: 'SPF',
      detail: 'not set yet — add the records Resend gives you so email reaches clients',
    });
  }

  /* ------------------------------- report ----------------------------- */
  console.log('');
  for (const r of results) {
    const mark = r.pass === true ? 'PASS' : r.pass === false ? 'FAIL' : 'INFO';
    console.log(`  [${mark}] ${r.label}: ${r.detail}`);
    if (r.fix) console.log(`         fix → ${r.fix}`);
  }

  console.log('');
  if (failures === 0) {
    console.log('  All checks passed.\n');
  } else {
    console.log(`  ${failures} check(s) need attention.\n`);
  }
  process.exit(failures === 0 ? 0 : 1);
})();
