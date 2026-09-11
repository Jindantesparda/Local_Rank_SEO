import crypto from 'crypto';

/**
 * Email delivery.
 *
 * Uses Resend's HTTP API (https://resend.com) over fetch, so no new dependency
 * and no SMTP socket handling. Configure with:
 *
 *   RESEND_API_KEY   your Resend API key
 *   EMAIL_FROM       e.g. "Search Vailable <hello@yourdomain.com>"
 *   APP_URL          public base URL, used to build links in emails
 *
 * With no API key the server does not silently pretend to send. It logs the
 * message and (outside production) returns the link to the caller so the flow
 * can be tested locally.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  /** Why it was not sent (missing key, provider error). */
  reason?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function appBaseUrl(): string {
  const raw =
    process.env.APP_URL ||
    process.env.PAYMENT_CALLBACK_URL ||
    `http://localhost:${Number(process.env.PORT) || 3000}`;
  return raw.replace(/\/+$/, '');
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Search Vailable <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(
      `[email] not configured — would send "${input.subject}" to ${input.to}\n${input.text}`
    );
    return { sent: false, reason: 'no_provider' };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[email] provider rejected the message (${res.status}): ${body}`);
      return { sent: false, reason: `provider_${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[email] send failed:', message);
    return { sent: false, reason: 'network' };
  }
}

/* ------------------------------------------------------------------ */
/* Templates                                                          */
/* ------------------------------------------------------------------ */

const shell = (heading: string, body: string, cta?: { label: string; url: string }) => `
<!doctype html>
<html><body style="margin:0;padding:28px;background:#f6f2fa;font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif;color:#46324f">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e6dcef;border-radius:16px;padding:28px">
    <div style="font-weight:800;color:#2a1236;font-size:16px;margin-bottom:18px">Search Vailable</div>
    <h1 style="font-size:20px;color:#2a1236;margin:0 0 12px">${heading}</h1>
    <div style="font-size:14px;line-height:1.6;color:#46324f">${body}</div>
    ${
      cta
        ? `<p style="margin:24px 0 8px"><a href="${cta.url}" style="background:#4b1a66;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block">${cta.label}</a></p>
           <p style="font-size:12px;color:#6b5a78;word-break:break-all">Or paste this link into your browser:<br />${cta.url}</p>`
        : ''
    }
    <p style="font-size:11px;color:#8b7d96;margin-top:24px;border-top:1px solid #f2ecf8;padding-top:12px">
      Search Vailable — is your business searchable?
    </p>
  </div>
</body></html>`;

export function verificationEmail(name: string, url: string): Omit<SendEmailInput, 'to'> {
  const hello = name ? `Hi ${name},` : 'Hi,';
  return {
    subject: 'Confirm your Search Vailable email',
    html: shell(
      'Confirm your email address',
      `<p>${hello}</p><p>Confirm this address to finish setting up your Search Vailable account. The link works for 24 hours.</p><p>If you didn't create an account, you can ignore this email.</p>`,
      { label: 'Confirm my email', url }
    ),
    text: `${hello}\n\nConfirm your Search Vailable email address (link valid for 24 hours):\n${url}\n\nIf you didn't create an account, ignore this email.`,
  };
}

export function passwordResetEmail(name: string, url: string): Omit<SendEmailInput, 'to'> {
  const hello = name ? `Hi ${name},` : 'Hi,';
  return {
    subject: 'Reset your Search Vailable password',
    html: shell(
      'Reset your password',
      `<p>${hello}</p><p>Use the button below to choose a new password. The link works for 1 hour.</p><p>If you didn't ask for this, ignore this email — your password will not change.</p>`,
      { label: 'Choose a new password', url }
    ),
    text: `${hello}\n\nChoose a new Search Vailable password (link valid for 1 hour):\n${url}\n\nIf you didn't ask for this, ignore this email.`,
  };
}

export function scoreDropEmail(
  businessName: string,
  score: number,
  previous: number,
  url: string
): Omit<SendEmailInput, 'to'> {
  return {
    subject: `${businessName}: SEO score moved to ${score}/100`,
    html: shell(
      `${businessName} scored ${score}/100`,
      `<p>Your scheduled check finished. The score for <strong>${businessName}</strong> is now <strong>${score}/100</strong>${
        previous ? ` (was ${previous}/100)` : ''
      }.</p><p>Open your dashboard to see what changed and which fixes to do next.</p>`,
      { label: 'Open my dashboard', url }
    ),
    text: `${businessName} scored ${score}/100${previous ? ` (was ${previous}/100)` : ''}.\n\nOpen your dashboard: ${url}`,
  };
}

export function rankDropEmail(
  businessName: string,
  drops: Array<{ keyword: string; previous: number | null; current: number | null; fellOut: boolean }>,
  url: string
): Omit<SendEmailInput, 'to'> {
  const lines = drops.map((d) =>
    d.fellOut
      ? `  • “${d.keyword}” — was position ${d.previous}, is no longer in the top 10`
      : `  • “${d.keyword}” — position ${d.previous} → ${d.current}`
  );

  const rows = drops
    .map(
      (d) => `<li style="margin-bottom:6px"><strong>${d.keyword}</strong> — ${
        d.fellOut
          ? `was position ${d.previous}, no longer in the top 10`
          : `position ${d.previous} → ${d.current}`
      }</li>`
    )
    .join('');

  return {
    subject: `${businessName}: ${drops.length} keyword${drops.length === 1 ? '' : 's'} slipped in search`,
    html: shell(
      'Your search positions moved',
      `<p><strong>${businessName}</strong> dropped in these searches on your latest scheduled check:</p>
       <ul style="padding-left:18px;margin:12px 0">${rows}</ul>
       <p>Rankings move for many reasons — a competitor publishing a stronger page, a Google algorithm update, or a page of yours losing relevance. Open your dashboard to compare your pages against the sites now above you.</p>`,
      { label: 'Open my dashboard', url }
    ),
    text: `${businessName} dropped in these searches on your latest scheduled check:

${lines.join('\n')}

Open your dashboard: ${url}`,
  };
}

/* ------------------------------------------------------------------ */
/* Signed tokens for email links                                      */
/* ------------------------------------------------------------------ */

/**
 * Tokens are random 32-byte values; we store only their SHA-256 hash, so a
 * leaked data file cannot be replayed against the API.
 */
export function generateToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
