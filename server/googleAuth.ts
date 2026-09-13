import crypto from 'crypto';

/**
 * Shared Google service-account authentication.
 *
 * Both Google Analytics 4 and Google Search Console are called with the *same*
 * service account — you enable both APIs on one Cloud project, create one
 * service account, then add its address as a user on the GA4 property and on
 * the Search Console property. So the credential is read here once and tokens
 * are cached per scope.
 *
 * The JWT is signed with Node's built-in crypto (RS256), so this needs no
 * dependency. Every endpoint is overridable so the auth flow can be exercised
 * against a stub in tests.
 *
 * Accepted environment variables, in order of preference:
 *   GOOGLE_SERVICE_ACCOUNT_JSON      full service-account JSON  (preferred)
 *   GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY
 *   GA4_SERVICE_ACCOUNT_JSON         the original GA4-only names, still honoured
 *   GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY
 */

export const ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export function tokenUrl(): string {
  return process.env.GOOGLE_OAUTH_URL || process.env.GA4_OAUTH_URL || 'https://oauth2.googleapis.com/token';
}

export interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
  projectId?: string;
  /** Which env var the credential came from, for clearer error messages. */
  source: string;
}

function normalisePrivateKey(key: string): string {
  // Keys pasted into env vars often arrive with literal \n sequences.
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

export function getServiceAccount(): ServiceAccount | null {
  const jsonVars = ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GA4_SERVICE_ACCOUNT_JSON'] as const;
  for (const name of jsonVars) {
    const raw = process.env[name];
    if (!raw || !raw.trim()) continue;
    try {
      const parsed = JSON.parse(raw) as {
        client_email?: string;
        private_key?: string;
        project_id?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: normalisePrivateKey(parsed.private_key),
          projectId: parsed.project_id,
          source: name,
        };
      }
    } catch {
      console.warn(`[google] ${name} is not valid JSON`);
    }
  }

  const pairs: Array<[string, string, string]> = [
    ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CLIENT_EMAIL'],
    ['GA4_CLIENT_EMAIL', 'GA4_PRIVATE_KEY', 'GA4_CLIENT_EMAIL'],
  ];
  for (const [emailVar, keyVar, label] of pairs) {
    const email = process.env[emailVar];
    const key = process.env[keyVar];
    if (email && key) {
      return { clientEmail: email, privateKey: normalisePrivateKey(key), source: label };
    }
  }

  return null;
}

export function isGoogleAuthConfigured(): boolean {
  return getServiceAccount() !== null;
}

/** The address the operator must add to their GA4 / Search Console property. */
export function serviceAccountEmail(): string | null {
  return getServiceAccount()?.clientEmail || null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** Cached per scope — a GA4 token is not valid for Search Console. */
const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

/** Mint a signed JWT and trade it for an access token for one scope. */
export async function getAccessToken(scope: string): Promise<string> {
  const account = getServiceAccount();
  if (!account) {
    throw new Error('No Google service account is configured on this server.');
  }

  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt - 60 > now) {
    return cached.accessToken;
  }

  const url = tokenUrl();
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope,
      aud: url,
      iat: now,
      exp: now + 3600,
    })
  );

  const signingInput = `${header}.${claims}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();

  let signature: string;
  try {
    signature = base64url(signer.sign(account.privateKey));
  } catch {
    throw new Error(
      `The Google service-account private key could not be read (from ${account.source}). ` +
        'Check for a corrupted or partially pasted key — the value must include the BEGIN/END PRIVATE KEY lines.'
    );
  }

  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Google refused the service-account token request (${res.status}). ` +
        `Check the account is enabled and the private key is current. ${text.slice(0, 200)}`
    );
  }

  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) {
    throw new Error('Google returned no access token for the service account.');
  }

  tokenCache.set(scope, {
    accessToken: body.access_token,
    expiresAt: now + (body.expires_in || 3600),
  });

  return body.access_token;
}

/** Used by tests to drop cached tokens. */
export function clearTokenCache() {
  tokenCache.clear();
}
