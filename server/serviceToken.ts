import crypto from 'crypto';

/**
 * A long-lived token for machine callers (the monitoring cron).
 *
 * Why this exists: the monitoring workflow used to authenticate with a normal
 * session token copied out of the browser. Sessions expire after
 * SESSION_TTL_DAYS (30 by default), so the cron would work for a month and then
 * start failing — silently, because the only symptom is that scheduled
 * monitoring quietly stops. A dedicated token that lives in an environment
 * variable has no expiry and is not tied to any one user's login.
 *
 * Deliberately opt-in: with MONITOR_TOKEN unset, service access is disabled and
 * only a signed-in user can trigger a pass, so there is no insecure default.
 */

/** Refuse to accept anything short enough to be guessable. */
const MIN_LENGTH = 24;

export function serviceTokenConfigured(): boolean {
  const token = process.env.MONITOR_TOKEN;
  return Boolean(token && token.length >= MIN_LENGTH);
}

/**
 * Is this request presenting the service token?
 *
 * Compared in constant time so the header cannot be discovered byte by byte
 * from response timing.
 */
export function isServiceRequest(req: {
  headers: Record<string, string | string[] | undefined>;
}): boolean {
  const expected = process.env.MONITOR_TOKEN;
  if (!expected || expected.length < MIN_LENGTH) return false;

  const header = req.headers['authorization'];
  const direct = req.headers['x-service-token'];

  let presented = '';
  if (typeof direct === 'string') {
    presented = direct.trim();
  } else if (typeof header === 'string' && header.startsWith('Bearer ')) {
    presented = header.slice('Bearer '.length).trim();
  }

  if (!presented) return false;
  // timingSafeEqual throws on differing lengths, so hash both first.
  const a = crypto.createHash('sha256').update(presented).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Guidance shown when the token is missing or too short. */
export function serviceTokenHint(): string {
  const token = process.env.MONITOR_TOKEN;
  if (!token) {
    return 'Set MONITOR_TOKEN on the server (at least 24 characters) to let the monitoring cron run unattended.';
  }
  return `MONITOR_TOKEN is only ${token.length} characters; use at least ${MIN_LENGTH}.`;
}
