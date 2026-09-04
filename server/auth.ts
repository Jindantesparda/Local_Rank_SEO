import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { User, SubscriptionTier } from '../src/types';
import { removeWorkspace } from './workspaceStore';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

interface UserRecord extends User {
  passwordSalt: string;
  passwordHash: string;
}

interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
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

function createSession(userId: string): string {
  const sessions = readJson<SessionRecord[]>(SESSIONS_FILE, []);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.push({ token, userId, createdAt: new Date().toISOString() });
  // Keep only the most recent 500 sessions to prevent unbounded growth
  writeJson(SESSIONS_FILE, sessions.slice(-500));
  return token;
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

  const users = readJson<UserRecord[]>(USERS_FILE, []);
  const record = users.find((u) => u.id === session.userId);
  if (!record) return null;
  return toPublicUser(record);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createAuthRouter(): Router {
  const router = Router();

  // Register a new account
  router.post('/register', (req, res) => {
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

      const users = readJson<UserRecord[]>(USERS_FILE, []);
      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return res
          .status(409)
          .json({ error: 'An account with this email already exists. Try logging in instead.' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const record: UserRecord = {
        id: `usr_${crypto.randomBytes(8).toString('hex')}`,
        name: cleanName,
        email: cleanEmail,
        emailVerified: true,
        subscription: {
          plan: 'free',
          status: 'active',
        },
        subscriptionTier: 'free',
        usage: {
          auditsUsed: 0,
          pagesCrawled: 0,
          aiRequests: 0,
        },
        businessIds: [],
        createdAt: new Date().toISOString(),
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
      };

      users.push(record);
      writeJson(USERS_FILE, users);

      const token = createSession(record.id);
      return res.status(201).json({ user: toPublicUser(record), token });
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
      const users = readJson<UserRecord[]>(USERS_FILE, []);
      const record = users.find((u) => u.id === sessionUser.id);
      if (!record) {
        return res.status(404).json({ error: 'Account not found.' });
      }

      if (typeof patch.name === 'string' && patch.name.trim()) {
        record.name = patch.name.trim();
      }
      if (typeof patch.email === 'string' && validateEmail(patch.email.trim())) {
        record.email = patch.email.trim().toLowerCase();
      }
      if (typeof patch.emailVerified === 'boolean') {
        record.emailVerified = patch.emailVerified;
      }
      if (patch.subscription && typeof patch.subscription === 'object') {
        record.subscription = { ...record.subscription, ...patch.subscription };
      }
      if (
        patch.subscriptionTier &&
        ['free', 'starter', 'business'].includes(patch.subscriptionTier)
      ) {
        record.subscriptionTier = patch.subscriptionTier as SubscriptionTier;
      }
      if (patch.usage && typeof patch.usage === 'object') {
        record.usage = { ...record.usage, ...patch.usage };
      }
      if (Array.isArray(patch.businessIds)) {
        record.businessIds = Array.from(new Set(patch.businessIds.map(String)));
      }

      writeJson(USERS_FILE, users);
      return res.json({ user: toPublicUser(record) });
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
      const users = readJson<UserRecord[]>(USERS_FILE, []);
      writeJson(
        USERS_FILE,
        users.filter((u) => u.id !== sessionUser.id)
      );
      const sessions = readJson<SessionRecord[]>(SESSIONS_FILE, []);
      writeJson(
        SESSIONS_FILE,
        sessions.filter((s) => s.userId !== sessionUser.id)
      );
      removeWorkspace(sessionUser.id);
      return res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
