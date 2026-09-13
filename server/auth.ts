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
  deleteUserCascade,
  insertUserIfEmailFree,
  loadSessions,
  loadTokens,
  loadUsers,
  markEmailVerified,
  saveSessions,
  saveTokens,
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

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Storage is SQLite now (see server/db.ts). These two helpers keep the existing
 * load-mutate-save shape of the handlers, but every mutation is wrapped in a
 * transaction by the caller, so the read and the write cannot be split by
 * another request.
 */
function readJson<T>(file: string, fallback: T): T {
  try {
    if (file === USERS_FILE) return loadUsers() as unknown as T;
    if (file === SESSIONS_FILE) return loadSessions() as unknown as T;
    if (file === TOKENS_FILE) return loadTokens() as unknown as T;
  } catch (err) {
    console.warn('[auth] load failed:', err instanceof Error ? err.message : err);
  }
  return fallback;
}

function writeJson(file: string, data: unknown) {
  if (file === USERS_FILE) return saveUsers(data as Parameters<typeof saveUsers>[0]);
  if (file === SESSIONS_FILE) return saveSessions(data as Parameters<typeof saveSessions>[0]);
  if (file === TOKENS_FILE) return saveTokens(data as Parameters<typeof saveTokens>[0]);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const candidate = hashPassword(password, salt);
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function toPublicUser(record: UserRecord): User {
  const { passwordSalt: _salt, passwordHash: _hash, ...user } = record;
  return user;
}

// Activate a subscription plan on a user record. Called only after a
// payment has been verified (Paynow webhook/poll or demo confirmation).
export function updateUserSubscription(userId: string, plan: SubscriptionTier): User | null {
  return tx(() => {
  const users = readJson<UserRecord[]>(USERS_FILE, []);
  const record = users.find((u) => u.id === userId);
  if (!record) return null;

  record.subscription = {
    ...record.subscription,
    plan,
    status: 'active',
  };
  record.subscriptionTier = plan;
  writeJson(USERS_FILE, users);
  return toPublicUser(record);
  });
}

// Record usage server-side so plan limits cannot be bypassed by the client.
export function recordUsage(
  userId: string,
  update: { audits?: number; pages?: number; aiRequests?: number }
): void {
  tx(() => {
  const users = readJson<UserRecord[]>(USERS_FILE, []);
  const record = users.find((u) => u.id === userId);
  if (!record) return;

  record.usage = {
    auditsUsed: (record.usage?.auditsUsed || 0) + (update.audits || 0),
    pagesCrawled: (record.usage?.pagesCrawled || 0) + (update.pages || 0),
    aiRequests: (record.usage?.aiRequests || 0) + (update.aiRequests || 0),
  };
  writeJson(USERS_FILE, users);
  });
}

function createSession(userId: string): string {
  return tx(() => {
  const sessions = readJson<SessionRecord[]>(SESSIONS_FILE, []);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.push({ token, userId, createdAt: new Date().toISOString() });
  // Keep only the most recent 500 sessions to prevent unbounded growth
  writeJson(SESSIONS_FILE, sessions.slice(-500));
  return token;
  });
}

export function getSessionUser(req: {
  headers: Record<string, string | string[] | undefined>;
}): User | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const sessions = readJson<SessionRecord[]>(SESSIONS_FILE, []);
  const session = sessions.find((s) => s.token === token);
  if (!session) return null;

  // Sessions expire so a leaked token does not work forever.
  const age = Date.now() - new Date(session.createdAt).getTime();
  if (!Number.isFinite(age) || age > SESSION_TTL_MS) {
    tx(() =>
      writeJson(
        SESSIONS_FILE,
        sessions.filter((s) => s.token !== token)
      )
    );
    return null;
  }

  const users = readJson<UserRecord[]>(USERS_FILE, []);
  const record = users.find((u) => u.id === session.userId);
  if (!record) return null;
  return toPublicUser(record);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ------------------------------------------------------------------ */
/* Single-use email tokens (verification + password reset)            */
/* ------------------------------------------------------------------ */

function pruneTokens(tokens: TokenRecord[]): TokenRecord[] {
  const now = Date.now();
  return tokens.filter((t) => new Date(t.expiresAt).getTime() > now);
}

function issueToken(userId: string, purpose: TokenPurpose, ttlMs: number): string {
  return tx(() => {
  const tokens = pruneTokens(readJson<TokenRecord[]>(TOKENS_FILE, []));
  const { token, tokenHash } = generateToken();
  const now = Date.now();

  // One outstanding token per purpose per user.
  const next = tokens.filter((t) => !(t.userId === userId && t.purpose === purpose));
  next.push({
    tokenHash,
    userId,
    purpose,
    expiresAt: new Date(now + ttlMs).toISOString(),
    createdAt: new Date(now).toISOString(),
  });

  writeJson(TOKENS_FILE, next);
  return token;
  });
}

function consumeToken(token: string, purpose: TokenPurpose): string | null {
  return tx(() => {
  const tokens = pruneTokens(readJson<TokenRecord[]>(TOKENS_FILE, []));
  const wanted = hashToken(token);
  const match = tokens.find((t) => t.tokenHash === wanted && t.purpose === purpose);

  if (!match) {
    writeJson(TOKENS_FILE, tokens);
    return null;
  }

  writeJson(
    TOKENS_FILE,
    tokens.filter((t) => t.tokenHash !== wanted)
  );
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

function invalidateSessions(userId: string) {
  tx(() => {
    const sessions = readJson<SessionRecord[]>(SESSIONS_FILE, []);
    writeJson(
      SESSIONS_FILE,
      sessions.filter((s) => s.userId !== userId)
    );
  });
}

/** Public user records — used by the monitoring scheduler. No secrets included. */
export function listUsers(): User[] {
  return readJson<UserRecord[]>(USERS_FILE, []).map(toPublicUser);
}

export function createAuthRouter(): Router {
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
      if (!insertUserIfEmailFree(record)) {
        return res
          .status(409)
          .json({ error: 'An account with this email already exists. Try logging in instead.' });
      }
      
      // Create free subscription record
      try {
        createSubscription(record.id, 'free', 0);
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
  router.post('/login', (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!validateEmail(cleanEmail) || !password) {
        return res.status(400).json({ error: 'Please enter both email and password.' });
      }

      const users = readJson<UserRecord[]>(USERS_FILE, []);
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
  router.get('/me', (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    return res.json({ user });
  });

  /* ---------------- Email verification ---------------- */

  // Confirm an email address from the link we sent
  router.post('/verify-email', (req, res) => {
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

    const record = markEmailVerified(userId);
    if (!record) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    return res.json({ user: toPublicUser(record as unknown as UserRecord), verified: true });
  });

  // Send a fresh verification link to the signed-in user
  router.post('/resend-verification', async (req, res) => {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const users = readJson<UserRecord[]>(USERS_FILE, []);
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
  router.get('/email-status', (req, res) => {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    return res.json({ configured: isEmailConfigured(), verified: sessionUser.emailVerified });
  });

  /* ---------------- Password reset ---------------- */

  // Always answers the same way so the endpoint cannot enumerate accounts.
  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body as { email?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    const genericResponse = {
      message: 'If an account exists for that address, a reset link is on its way.',
    };

    if (!validateEmail(cleanEmail)) {
      return res.json(genericResponse);
    }

    const users = readJson<UserRecord[]>(USERS_FILE, []);
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
    const record = updateUser(userId, (user) => {
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
  router.patch('/user', (req, res) => {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    try {
      const patch = req.body as Partial<User>;
      // One transaction: read this user, apply the patch, write it back.
      const record = updateUser(sessionUser.id, (record) => {
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
  router.post('/user/password', (req, res) => {
    const sessionUser = getSessionUser(req);
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

      const users = readJson<UserRecord[]>(USERS_FILE, []);
      const record = users.find((u) => u.id === sessionUser.id);
      if (!record) {
        return res.status(404).json({ error: 'Account not found.' });
      }
      if (!verifyPassword(currentPassword, record.passwordSalt, record.passwordHash)) {
        return res.status(400).json({ error: 'Your current password is incorrect.' });
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      record.passwordSalt = newSalt;
      record.passwordHash = hashPassword(newPassword, newSalt);
      writeJson(USERS_FILE, users);
      return res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      return res.status(500).json({ error: message });
    }
  });

  // Delete the signed-in user's account
  router.delete('/account', (req, res) => {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    try {
      // One transaction removes the user, their sessions, tokens, payments,
      // subscriptions and every document row keyed to them.
      deleteUserCascade(sessionUser.id);
      removeWorkspace(sessionUser.id);
      removeCompetitorData(sessionUser.id);
      removeMonitorData(sessionUser.id);
      removeAnalyticsData(sessionUser.id);
      removeRankingData(sessionUser.id);
      removeSearchConsoleData(sessionUser.id);
      return res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
