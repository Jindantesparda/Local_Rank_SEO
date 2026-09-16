import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { User, SubscriptionTier } from '../src/types';
import { removeWorkspace } from './workspaceStore';
import { createSubscription } from './paymentStore';
import { removeCompetitorData } from './competitorStore';
import { removeMonitorData } from './monitorStore';
import { removeAnalyticsData } from './analyticsStore';
import { removeRankingData } from './rankStore';
import { removeSearchConsoleData } from './searchConsoleStore';
import {
  deleteSession,
  deleteUserCascade,
  deleteUserSessions,
  deleteUserTokensForPurpose,
  deleteToken,
  findSession,
  findToken,
  findUserById,
  insertSession,
  insertToken,
  insertUserIfEmailFree,
  loadUsers,
  markEmailVerified,
  pruneExpiredTokens,
  pruneSessions,
  saveUsers,
  tx,
  updateUser,
} from './userRepo';
import {
  appBaseUrl,
  generateToken,
  hashToken,
  passwordResetEmail,
  sendEmail,
  isEmailConfigured,
  verificationEmail,
} from './email';

// DATA_DIR can be pointed at a mounted persistent disk in production.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');

interface UserRecord extends User {
  passwordSalt: string;
  passwordHash: string;
}

interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
}

type TokenPurpose = 'verify_email' | 'reset_password';

interface TokenRecord {
  tokenHash: string;
  userId: string;
  purpose: TokenPurpose;
  expiresAt: string;
  createdAt: string;
}

/** How long a login stays valid. Override with SESSION_TTL_DAYS. */
const SESSION_TTL_MS =
  (Number(process.env.SESSION_TTL_DAYS) || 30) * 24 * 60 * 60 * 1000;

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

async function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Storage is SQLite now (see server/db.ts). These two helpers keep the existing
 * load-mutate-save shape of the handlers, but every mutation is wrapped in a
 * transaction by the caller, so the read and the write cannot be split by
 * another request.
 */
async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    if (file === USERS_FILE) return (await loadUsers()) as unknown as T;
  } catch (err) {
    console.warn('[auth] load failed:', err instanceof Error ? err.message : err);
  }
  return fallback;
}

/**
 * Sessions and tokens are written row-by-row now (insertSession, insertToken,
 * deleteToken, …) rather than by saving a whole array back. Only the users
 * table still goes through this shim, because several handlers legitimately
 * mutate it as a set inside a transaction.
 */
async function writeJson(file: string, data: unknown): Promise<void> {
  if (file === USERS_FILE) {
    await saveUsers(data as Parameters<typeof saveUsers>[0]);
  }
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const candidate = hashPassword(password, salt);
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function toPublicUser(record: UserRecord): Promise<User> {
  const { passwordSalt: _salt, passwordHash: _hash, ...user } = record;
  return user;
}

// Activate a subscription plan on a user record. Called only after a
// payment has been verified (Paynow webhook/poll or demo confirmation).
export async function updateUserSubscription(userId: string, plan: SubscriptionTier): Promise<User | null> {
  return await tx(async () => {
  const users = await readJson<UserRecord[]>(USERS_FILE, []);
  const record = users.find((u) => u.id === userId);
  if (!record) return null;

  record.subscription = {
    ...record.subscription,
    plan,
    status: 'active',
  };
  record.subscriptionTier = plan;
  await writeJson(USERS_FILE, users);
  return toPublicUser(record);
  });
}

// Record usage server-side so plan limits cannot be bypassed by the client.
export async function recordUsage(
  userId: string,
  update:  { audits?: number; pages?: number; aiRequests?: number }
): void {




  await tx(async () => {
  const users = await readJson<UserRecord[]>(USERS_FILE, []);
  const record = users.find((u) => u.id === userId);
  if (!record) return;

  record.usage = {
    auditsUsed: (record.usage?.auditsUsed || 0) + (update.audits || 0),
    pagesCrawled: (record.usage?.pagesCrawled || 0) + (update.pages || 0),
    aiRequests: (record.usage?.aiRequests || 0) + (update.aiRequests || 0),
  };
  await writeJson(USERS_FILE, users);
  });
}

async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await insertSession({ token, userId, createdAt: new Date().toISOString() });
  // Keep only the most recent sessions so the table cannot grow forever.
  await pruneSessions(500);
  return token;
}

/**
 * Resolve the bearer token to a user.
 *
 * Two targeted single-row reads — one session by token, one user by id. This
 * runs on every authenticated request, so reading whole tables here (as an
 * earlier version did) would transfer the entire sessions and users tables over
 * the network on each call now that the database is hosted.
 */
export async function getSessionUser(req: {
  headers: Record<string, string | string[] | undefined>;
}): Promise<User | null> {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const session = await findSession(token);
  if (!session) return null;

  // Sessions expire so a leaked token does not work forever.
  const age = Date.now() - new Date(session.createdAt).getTime();
  if (!Number.isFinite(age) || age > SESSION_TTL_MS) {
    await deleteSession(token);
    return null;
  }

  const record = await findUserById(session.userId);
  if (!record) return null;
  return toPublicUser(record);
}

async function validateEmail(email: string): Promise<boolean> {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ------------------------------------------------------------------ */
/* Single-use email tokens (verification + password reset)            */
/* ------------------------------------------------------------------ */

async function pruneTokens(tokens: TokenRecord[]): Promise<TokenRecord[]> {
  const now = Date.now();
  return tokens.filter((t) => new Date(t.expiresAt).getTime() > now);
}

async function issueToken(userId: string, purpose: TokenPurpose, ttlMs: number): Promise<string> {
  const { token, tokenHash } = generateToken();
  const now = Date.now();

  await tx(async () => {
    // One outstanding token per purpose per user.
    await deleteUserTokensForPurpose(userId, purpose);
    await insertToken({
      tokenHash,
      userId,
      purpose,
      expiresAt: new Date(now + ttlMs).toISOString(),
      createdAt: new Date(now).toISOString(),
    });
  });

  // Keep the table small.
  await pruneExpiredTokens();
  return token;
}

async function consumeToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  const wanted = hashToken(token);

  return await tx(async () => {
    const match = await findToken(wanted, purpose);
    if (!match) return null;

    // Single use.
    await deleteToken(wanted);
    return match.userId;
  });
}

/**
 * Issue a verification link and try to email it. Without an email provider we
 * return the link so the flow stays testable — but only outside production, so
 * a live deployment can never hand out a verification link in an API response.
 */
async function sendVerification(
  user: UserRecord
): Promise<{ sent: boolean; devLink?: string }> {
  const token = issueToken(user.id, 'verify_email', VERIFY_TTL_MS);
  const url = `${appBaseUrl()}/verify-email?token=${token}`;
  const template = verificationEmail(user.name, url);
  const result = await sendEmail({ to: user.email, ...template });

  if (!result.sent && process.env.NODE_ENV !== 'production') {
    return { sent: false, devLink: url };
  }
  return { sent: result.sent };
}

async function invalidateSessions(userId: string): Promise<void> {
  await deleteUserSessions(userId);
}

/** Public user records — used by the monitoring scheduler. No secrets included. */
export async function listUsers(): Promise<User[]> {
  return await readJson<UserRecord[]>(USERS_FILE, []).map(toPublicUser);
}

export async function createAuthRouter(): Promise<Router> {
  const router = Router();

  // Register a new account
  router.post('/register', async (req, res) => {
    try {
      const { name, email, password } = req.body as {
        name?: string;
        email?: string;
        password?: string;
      };

      const cleanName = (name || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanName) {
        return res.status(400).json({ error: 'Please enter your name.' });
      }
      if (!validateEmail(cleanEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const now = new Date().toISOString();
      
      const record: UserRecord = {
        id: `usr_${crypto.randomBytes(8).toString('hex')}`,
        name: cleanName,
        email: cleanEmail,
        emailVerified: false,
        subscription: {
          plan: 'free',
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: undefined,
          createdAt: now,
          updatedAt: now,
        },
        subscriptionTier: 'free',
        usage: {
          auditsUsed: 0,
          pagesCrawled: 0,
          aiRequests: 0,
        },
        businessIds: [],
        createdAt: now,
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
      };

      // Refuses if the email was taken in the meantime — checked and inserted
      // in the same transaction so two simultaneous signups cannot both win.
      if (!await insertUserIfEmailFree(record)) {
        return res
          .status(409)
          .json({ error: 'An account with this email already exists. Try logging in instead.' });
      }
      
      // Create free subscription record
      try {
        await createSubscription(record.id, 'free', 0);
      } catch (err) {
        console.warn('Failed to create free subscription record:', err);
      }

      const token = createSession(record.id);

      // Ask them to confirm the address (non-blocking: signup still succeeds).
      const verification = await sendVerification(record);

      return res.status(201).json({
        user: toPublicUser(record),
        token,
        emailVerification: verification,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return res.status(500).json({ error: message });
    }
  });

  // Login with email + password
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      const cleanEmail = async (email || '').trim().toLowerCase();

      if (!validateEmail(cleanEmail) || !password) {
        return res.status(400).json({ error: 'Please enter both email and password.' });
      }

      const users = await readJson<UserRecord[]>(USERS_FILE, []);
      const record = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!record || !verifyPassword(password, record.passwordSalt, record.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = createSession(record.id);
      return res.json({ user: toPublicUser(record), token });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return res.status(500).json({ error: message });
    }
  });

  // Restore the current session
  router.get('/me', async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    return res.json({ user });
  });

  /* ---------------- Email verification ---------------- */

  // Confirm an email address from the link we sent
  router.post('/verify-email', async (req, res) => {
    const { token } = req.body as { token?: string };
    if (!token) {
      return res.status(400).json({ error: 'Verification token is missing.' });
    }

    const userId = consumeToken(token, 'verify_email');
    if (!userId) {
      return res
        .status(400)
        .json({ error: 'This link is invalid or has expired. Request a new one below.' });
    }

    const record = await markEmailVerified(userId);
    if (!record) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    return res.json({ user: toPublicUser(record as unknown as UserRecord), verified: true });
  });

  // Send a fresh verification link to the signed-in user
  router.post('/resend-verification', async (req, res) => {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const users = await readJson<UserRecord[]>(USERS_FILE, []);
    const record = users.find((u) => u.id === sessionUser.id);
    if (!record) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    if (record.emailVerified) {
      return res.json({ alreadyVerified: true });
    }

    const verification = await sendVerification(record);
    return res.json({ sent: verification.sent, devLink: verification.devLink });
  });

  // Whether this deployment can actually deliver mail
  router.get('/email-status', async (req, res) => {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    return res.json({ configured: isEmailConfigured(), verified: sessionUser.emailVerified });
  });

  /* ---------------- Password reset ---------------- */

  // Always answers the same way so the endpoint cannot enumerate accounts.
  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body as { email?: string };
    const cleanEmail = async (email || '').trim().toLowerCase();
    const genericResponse = {
      message: 'If an account exists for that address, a reset link is on its way.',
    };

    if (!validateEmail(cleanEmail)) {
      return res.json(genericResponse);
    }

    const users = await readJson<UserRecord[]>(USERS_FILE, []);
    const record = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!record) {
      return res.json(genericResponse);
    }

    const token = issueToken(record.id, 'reset_password', RESET_TTL_MS);
    const url = `${appBaseUrl()}/reset-password?token=${token}`;
    const result = await sendEmail({ to: record.email, ...passwordResetEmail(record.name, url) });

    if (!result.sent && process.env.NODE_ENV !== 'production') {
      return res.json({ ...genericResponse, devLink: url });
    }
    return res.json(genericResponse);
  });

  // Set a new password using a reset link. Invalidates every existing session.
  router.post('/reset-password', (req, res) => {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token) {
      return res.status(400).json({ error: 'Reset token is missing.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const userId = consumeToken(token, 'reset_password');
    if (!userId) {
      return res
        .status(400)
        .json({ error: 'This reset link is invalid or has expired. Request a new one.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const record = await updateUser(userId, async (user) => {
      user.passwordSalt = salt;
      user.passwordHash = hashPassword(password, salt);
    });
    if (!record) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    // Anyone holding an old session is signed out.
    invalidateSessions(record.id);

    return res.json({ reset: true, user: toPublicUser(record as unknown as UserRecord) });
  });

  // Logout (invalidate the session token)
  router.post('/logout', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const sessions = readJson<SessionRecord[]>(SESSIONS_FILE, []);
      writeJson(
        SESSIONS_FILE,
        sessions.filter((s) => s.token !== token)
      );
    }
    return res.json({ ok: true });
  });

  // Update the signed-in user's profile / subscription / usage
  router.patch('/user', async (req, res) => {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    try {
      const patch = req.body as Partial<User>;
      // One transaction: read this user, apply the patch, write it back.
      const record = await updateUser(sessionUser.id, async (record) => {
      if (typeof patch.name === 'string' && patch.name.trim()) {
        record.name = patch.name.trim();
      }
      if (typeof patch.email === 'string' && validateEmail(patch.email.trim())) {
        record.email = patch.email.trim().toLowerCase();
      }
      if (typeof patch.emailVerified === 'boolean') {
        record.emailVerified = patch.emailVerified;
      }
      // Subscription plan/status is server-controlled (Paynow webhook or
      // billing routes only). Never accept a plan change from the client.
      if (patch.subscription && typeof patch.subscription === 'object') {
        const { plan: _plan, status: _status, ...safeSubscription } = patch.subscription;
        record.subscription = { ...record.subscription, ...safeSubscription };
      }
      // Usage counters may only move forward, so limits can't be reset.
      if (patch.usage && typeof patch.usage === 'object') {
        record.usage = {
          ...record.usage,
          auditsUsed: Math.max(record.usage.auditsUsed || 0, Number(patch.usage.auditsUsed) || 0),
          pagesCrawled: Math.max(
            record.usage.pagesCrawled || 0,
            Number(patch.usage.pagesCrawled) || 0
          ),
          aiRequests: Math.max(record.usage.aiRequests || 0, Number(patch.usage.aiRequests) || 0),
        };
      }
      if (Array.isArray(patch.businessIds)) {
        record.businessIds = Array.from(new Set(patch.businessIds.map(String)));
      }
      });

      if (!record) {
        return res.status(404).json({ error: 'Account not found.' });
      }
      return res.json({ user: toPublicUser(record as unknown as UserRecord) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      return res.status(500).json({ error: message });
    }
  });

  // Change password for the signed-in user
  router.post('/user/password', async (req, res) => {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string;
        newPassword?: string;
      };
      if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({
          error: 'Please provide your current password and a new password (min 6 characters).',
        });
      }

      const users = await readJson<UserRecord[]>(USERS_FILE, []);
      const record = users.find(async (u) => u.id === sessionUser.id);
      if (!record) {
        return res.status(404).json({ error: 'Account not found.' });
      }
      if (!verifyPassword(currentPassword, record.passwordSalt, record.passwordHash)) {
        return res.status(400).json({ error: 'Your current password is incorrect.' });
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      record.passwordSalt = newSalt;
      record.passwordHash = hashPassword(newPassword, newSalt);
      await writeJson(USERS_FILE, users);
      return res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      return res.status(500).json({ error: message });
    }
  });

  // Delete the signed-in user's account
  router.delete('/account', async (req, res) => {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    try {
      // One transaction removes the user, their sessions, tokens, payments,
      // subscriptions and every document row keyed to them.
      await deleteUserCascade(sessionUser.id);
      await removeWorkspace(sessionUser.id);
      await removeCompetitorData(sessionUser.id);
      await removeMonitorData(sessionUser.id);
      await removeAnalyticsData(sessionUser.id);
      await removeRankingData(sessionUser.id);
      await removeSearchConsoleData(sessionUser.id);
      return res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
