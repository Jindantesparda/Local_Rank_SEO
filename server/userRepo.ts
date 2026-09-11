import { UserSubscription, UserUsage } from '../src/types';
import { getDb, n, tx } from './db';

/**
 * Row-level access to users, sessions and email tokens.
 *
 * These are relational tables rather than document rows because every lookup is
 * by column: email at sign-in, token on each authenticated request, user id
 * everywhere else.
 *
 * The load/save-all helpers below exist so the auth module could move onto
 * SQLite without rewriting every handler. They are safe because each mutation
 * runs inside `tx()`, and nothing inside a transaction awaits — so two requests
 * can never read the same snapshot and then overwrite each other.
 */

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordSalt: string;
  passwordHash: string;
  emailVerified: boolean;
  subscription: UserSubscription;
  subscriptionTier?: string | null;
  usage: UserUsage;
  businessIds?: string[];
  createdAt?: string | null;
}

export interface StoredSession {
  token: string;
  userId: string;
  createdAt: string;
}

export interface StoredToken {
  tokenHash: string;
  userId: string;
  purpose: string;
  expiresAt: string;
  createdAt: string;
}

function parse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ------------------------------- users ---------------------------- */

function rowToUser(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    passwordSalt: String(row.password_salt ?? ''),
    passwordHash: String(row.password_hash ?? ''),
    emailVerified: Number(row.email_verified) === 1,
    subscription: parse<UserSubscription>(row.subscription, { plan: 'free', status: 'active' } as UserSubscription),
    subscriptionTier: (row.subscription_tier as string | null) ?? null,
    usage: parse<UserUsage>(row.usage, { auditsUsed: 0, pagesCrawled: 0, aiRequests: 0 }),
    businessIds: parse<string[]>(row.business_ids, []),
    createdAt: (row.created_at as string | null) ?? null,
  };
}

export function loadUsers(): StoredUser[] {
  const rows = getDb().prepare('SELECT * FROM users').all() as Array<Record<string, unknown>>;
  return rows.map(rowToUser);
}

/** Replace the stored user set: upsert every row, remove any that vanished. */
export function saveUsers(users: StoredUser[]) {
  const conn = getDb();
  const upsert = conn.prepare(
    `INSERT INTO users (id, email, name, password_salt, password_hash, email_verified,
                        subscription, subscription_tier, usage, business_ids, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       password_salt = excluded.password_salt,
       password_hash = excluded.password_hash,
       email_verified = excluded.email_verified,
       subscription = excluded.subscription,
       subscription_tier = excluded.subscription_tier,
       usage = excluded.usage,
       business_ids = excluded.business_ids,
       created_at = excluded.created_at`
  );

  const seen: string[] = [];
  for (const u of users) {
    upsert.run(
      u.id,
      u.email,
      u.name,
      u.passwordSalt,
      u.passwordHash,
      u.emailVerified ? 1 : 0,
      JSON.stringify(u.subscription ?? { plan: 'free', status: 'active' }),
      n(u.subscriptionTier),
      JSON.stringify(u.usage ?? {}),
      JSON.stringify(u.businessIds ?? []),
      n(u.createdAt)
    );
    seen.push(u.id);
  }

  if (seen.length === 0) {
    conn.prepare('DELETE FROM users').run();
    return;
  }
  const placeholders = seen.map(() => '?').join(',');
  conn.prepare(`DELETE FROM users WHERE id NOT IN (${placeholders})`).run(...seen);
}

export function countUsers(): number {
  const row = getDb().prepare('SELECT COUNT(*) c FROM users').get() as { c: number };
  return Number(row?.c || 0);
}

/* ----------------------------- sessions --------------------------- */

export function loadSessions(): StoredSession[] {
  const rows = getDb()
    .prepare('SELECT token, user_id, created_at FROM sessions ORDER BY created_at')
    .all() as Array<{ token: string; user_id: string; created_at: string }>;
  return rows.map((r) => ({ token: r.token, userId: r.user_id, createdAt: r.created_at }));
}

const MAX_SESSIONS = 500;

export function saveSessions(sessions: StoredSession[]) {
  const conn = getDb();
  // Same cap as before, applied to the newest sessions.
  const kept = sessions.slice(-MAX_SESSIONS);

  const upsert = conn.prepare(
    `INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, created_at = excluded.created_at`
  );
  for (const s of kept) {
    upsert.run(s.token, s.userId, s.createdAt);
  }

  if (kept.length === 0) {
    conn.prepare('DELETE FROM sessions').run();
    return;
  }
  const placeholders = kept.map(() => '?').join(',');
  conn.prepare(`DELETE FROM sessions WHERE token NOT IN (${placeholders})`).run(
    ...kept.map((s) => s.token)
  );
}

/* ------------------------------ tokens ---------------------------- */

export function loadTokens(): StoredToken[] {
  const rows = getDb()
    .prepare('SELECT token_hash, user_id, purpose, expires_at, created_at FROM email_tokens')
    .all() as Array<{
    token_hash: string;
    user_id: string;
    purpose: string;
    expires_at: string;
    created_at: string;
  }>;
  return rows.map((r) => ({
    tokenHash: r.token_hash,
    userId: r.user_id,
    purpose: r.purpose,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }));
}

export function saveTokens(tokens: StoredToken[]) {
  const conn = getDb();
  const upsert = conn.prepare(
    `INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(token_hash) DO UPDATE SET
       user_id = excluded.user_id, purpose = excluded.purpose,
       expires_at = excluded.expires_at, created_at = excluded.created_at`
  );
  for (const t of tokens) {
    upsert.run(t.tokenHash, t.userId, t.purpose, t.expiresAt, t.createdAt);
  }

  if (tokens.length === 0) {
    conn.prepare('DELETE FROM email_tokens').run();
    return;
  }
  const placeholders = tokens.map(() => '?').join(',');
  conn.prepare(`DELETE FROM email_tokens WHERE token_hash NOT IN (${placeholders})`).run(
    ...tokens.map((t) => t.tokenHash)
  );
}

export { tx };

/* ---------------------- targeted, atomic operations ---------------- */

/** Insert a new user, refusing if the email is already taken (atomically). */
export function insertUserIfEmailFree(user: StoredUser): boolean {
  return tx(() => {
    const existing = getDb()
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(user.email) as { id: string } | undefined;
    if (existing) return false;
    saveUsers([...loadUsers(), user]);
    return true;
  });
}

export function findUserById(id: string): StoredUser | null {
  return loadUsers().find((u) => u.id === id) || null;
}

export function findUserByEmail(email: string): StoredUser | null {
  return loadUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Read one user, apply `mutate`, write it back — all inside one transaction.
 * This is the pattern that removes the lost-update risk: nothing else can read
 * the same row between the read and the write.
 */
export function updateUser(
  id: string,
  mutate: (user: StoredUser) => void
): StoredUser | null {
  return tx(() => {
    const users = loadUsers();
    const record = users.find((u) => u.id === id);
    if (!record) return null;
    mutate(record);
    saveUsers(users);
    return record;
  });
}

export function markEmailVerified(id: string): StoredUser | null {
  return updateUser(id, (u) => {
    u.emailVerified = true;
  });
}

/** Remove a user and everything that hangs off them, in one transaction. */
export function deleteUserCascade(id: string) {
  tx(() => {
    const conn = getDb();
    conn.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    conn.prepare('DELETE FROM email_tokens WHERE user_id = ?').run(id);
    conn.prepare('DELETE FROM payments WHERE user_id = ?').run(id);
    conn.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(id);
    conn.prepare('DELETE FROM documents WHERE user_id = ?').run(id);
    conn.prepare('DELETE FROM users WHERE id = ?').run(id);
  });
}

/** Paginated listing for the monitoring scheduler. */
export function listAllUsers(): StoredUser[] {
  return loadUsers();
}
