/**
 * Proxy / client-IP resolution.
 *
 * Getting this wrong has a specific, nasty consequence: the auth rate limiter is
 * keyed on `req.ip`, so if the resolved IP is a proxy's address instead of the
 * visitor's, every user shares one bucket. With a 30-attempt limit that means
 * "30 failed logins from anyone, anywhere, locks out all logins".
 *
 * `trust proxy` tells Express how many hops to skip when reading
 * X-Forwarded-For. The correct value is the number of proxies actually in front
 * of the app:
 *
 *   1  one proxy      — Render, Railway, Fly, or an nginx/host proxy
 *   2  two proxies    — Cloudflare (proxied) in front of Render
 *
 * It is configurable because it cannot be detected reliably from inside the
 * process, and guessing wrong is what causes the shared-bucket failure.
 */

export interface ProxyResolution {
  /** Value passed to Express's `trust proxy` setting. */
  value: number | boolean | string;
  /** Human-readable description, useful in logs and the health endpoint. */
  description: string;
  /** Set when the value looks risky. */
  warning?: string;
}

export function parseTrustProxy(raw: string | undefined): ProxyResolution {
  const input = (raw ?? '').trim();

  if (!input) {
    return {
      value: 1,
      description: 'default: 1 proxy (Render/Railway/Fly/nginx)',
    };
  }

  if (input === 'false') {
    return { value: false, description: 'disabled: the app is directly exposed' };
  }

  if (input === 'true') {
    return {
      value: true,
      description: 'trusts every proxy',
      warning:
        'TRUST_PROXY=true trusts the whole X-Forwarded-For chain, which a client can spoof unless every path to the app strips it. Prefer a hop count.',
    };
  }

  // A comma-separated list of addresses/CIDRs, or a keyword like 'loopback'.
  if (/[,\/a-zA-Z]/.test(input) && !/^\d+$/.test(input)) {
    return { value: input, description: `trusted list: ${input}` };
  }

  const hops = Number(input);
  if (Number.isInteger(hops) && hops >= 0 && hops <= 10) {
    return { value: hops, description: `explicit: ${hops} proxy hop(s)` };
  }

  return {
    value: 1,
    description: `unrecognised ("${input}") — falling back to 1 proxy`,
    warning: `TRUST_PROXY was "${input}", which is not a hop count, true/false, or an IP/CIDR list.`,
  };
}

/**
 * The client IP to rate-limit on.
 *
 * Uses Express's already-resolved `req.ip`, which is correct as long as
 * `trust proxy` is set for the real topology. `CF-Connecting-IP` is deliberately
 * NOT trusted here on its own: a client can send that header when the app is
 * reachable directly, which would let an attacker rotate the value and bypass
 * the limiter entirely.
 */
export function clientKey(reqIp: string | undefined): string {
  return reqIp || 'unknown';
}
