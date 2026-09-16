import { UserSubscription, UserUsage } from '../src/types';
import { exec, n, query, queryOne, tx } from './db';

/**
 * Row-level access to users, sessions and email tokens.
 *
 * These are relational tables rather than document rows because every lookup is
 * by column: email at sign-in, token on each authenticated request, user id
 * everywhere else.
 *
 * Lookups are targeted: sign-in fetches one row by email, and every
 * authenticated request fetches exactly one row by id. An earlier version read
 * the whole users table on every request, which was tolerable against a local
 * file but would transfer the entire table over the network on each API call
 * now that the database is hosted.
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

/**
 * Every user. Only for whole-table operations (e.g. the monitoring scheduler
 * iterating accounts) — never on a per-request path.
 */
export async function loadUsers(): Promise<StoredUser[]> {
  const rows = await query<Record<string, unknown>>('SELECT * FROM users');
  return rows.map(rowToUser);
}

/** One user by id. This is the hot path: it runs on every authenticated call. */
export async function findUserById(id: string): Promise<StoredUser | null> {
  const row = await queryOne<Record<string, unknown>>('SELECT * FROM users WHERE id = ?', [id]);
  return row ? rowToUser(row) : null;
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  // Column is not COLLATE NOCASE in libSQL by default, so compare lower-cased.
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM users WHERE lower(email) = lower(?)',
    [email]
  );
  return row ? rowToUser(row) : null;
}

export async function countUsers(): Promise<number> {
  const row = await queryOne<{ c: number }>('SELECT COUNT(*) c FROM users');
  return Number(row?.c || 0);
}

/** Replace the stored user set: upsert every row, remove any that vanished. */
export async function saveUsers(users: StoredUser[]): Promise<void> {
  const statements = users.map((u) => ({
    sql: `INSERT INTO users (id, email, name, password_salt, password_hash, email_verified,
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
            created_at = excluded.created_at`,
    args: [
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
      n(u.createdAt),
    ],
  }));

  if (statements.length === 0) {
    await exec('DELETE FROM users');
    return;
  }

  const placeholders = users.map(() => '?').join(',');
  statements.push({
    sql: `DELETE FROM users WHERE id NOT IN (${placeholders})`,
    args: users.map((u) => u.id),
  });

  // One request: either the whole set lands or none of it does.
  const { getDb } = await import('./db');
  await getDb().batch(statements as never[], 'write');
}

/* ----------------------------- sessions --------------------------- */

/**
 * One session by token. Targeted on purpose: this runs on every authenticated
 * request, and reading the whole table here would transfer every session over
 * the network each time.
 */
export async function findSession(token: string): Promise<StoredSession | null> {
  const row = await queryOne<{ token: string; user_id: string; created_at: string }>(
    'SELECT token, user_id, created_at FROM sessions WHERE token = ?',
    [token]
  );
  return row ? { token: row.token, userId: row.user_id, createdAt: row.created_at } : null;
}

export async function insertSession(session: StoredSession): Promise<void> {
  await exec(
    `INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, created_at = excluded.created_at`,
    [session.token, session.userId, session.createdAt]
  );
}

export async function deleteSession(token: string): Promise<void> {
  await exec('DELETE FROM sessions WHERE token = ?', [token]);
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await exec('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

/** Keep only the most recent sessions, so the table cannot grow forever. */
export async function pruneSessions(keep = 500): Promise<void> {
  await exec(
    `DELETE FROM sessions WHERE token NOT IN (
       SELECT token FROM sessions ORDER BY created_at DESC LIMIT ?
     )`,
    [keep]
  );
}

export async function loadSessions(): Promise<StoredSession[]> {
  const rows = await query<{ token: string; user_id: string; created_at: string }>(
    'SELECT token, user_id, created_at FROM sessions ORDER BY created_at'
  );
  return rows.map((r) => ({ token: r.token, userId: r.user_id, createdAt: r.created_at }));
}

/* ------------------------------ tokens ---------------------------- */

export async function findToken(
  tokenHash: string,
  purpose: string
): Promise<StoredToken | null> {
  const row = await queryOne<{
    token_hash: string;
    user_id: string;
    purpose: string;
    expires_at: string;
    created_at: string;
  }>(
    'SELECT token_hash, user_id, purpose, expires_at, created_at FROM email_tokens WHERE token_hash = ? AND purpose = ?',
    [tokenHash, purpose]
  );
  return row
    ? {
        tokenHash: row.token_hash,
        userId: row.user_id,
        purpose: row.purpose,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      }
    : null;
}

export async function insertToken(token: StoredToken): Promise<void> {
  await exec(
    `INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(token_hash) DO UPDATE SET
       user_id = excluded.user_id, purpose = excluded.purpose,
       expires_at = excluded.expires_at, created_at = excluded.created_at`,
    [token.tokenHash, token.userId, token.purpose, token.expiresAt, token.createdAt]
  );
}

export async function deleteToken(tokenHash: string): Promise<void> {
  await exec('DELETE FROM email_tokens WHERE token_hash = ?', [tokenHash]);
}

/** Drop expired tokens for a purpose so the table stays small. */
/**
 * Remove any outstanding token for one user and purpose, so issuing a new one
 * invalidates the old link (only the newest reset/verification link works).
 */
export async function deleteUserTokensForPurpose(
  userId: string,
  purpose: string
): Promise<void> {
  await exec('DELETE FROM email_tokens WHERE user_id = ? AND purpose = ?', [userId, purpose]);
}

export async function pruneExpiredTokens(): Promise<void> {
  await exec('DELETE FROM email_tokens WHERE expires_at <= ?', [new Date().toISOString()]);
}

export async function loadTokens(): Promise<StoredToken[]> {
  const rows = await query<{
    token_hash: string;
    user_id: string;
    purpose: string;
    expires_at: string;
    created_at: string;
  }>('SELECT token_hash, user_id, purpose, expires_at, created_at FROM email_tokens');
  return rows.map((r) => ({
    tokenHash: r.token_hash,
    userId: r.user_id,
    purpose: r.purpose,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }));
}

/* ---------------------- targeted, atomic operations ---------------- */

/**
 * Insert a new user, refusing if the email is already taken.
 *
 * The `users.email` column is UNIQUE, so the database itself is the arbiter —
 * no read-then-write race is possible, and no transaction is needed.
 */
export async function insertUserIfEmailFree(user: StoredUser): Promise<boolean> {
  return await tx(async () => {
    const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE lower(email) = lower(?)', [
      user.email,
    ]);
    if (existing) return false;

    await exec(
      `INSERT INTO users (id, email, name, password_salt, password_hash, email_verified,
                          subscription, subscription_tier, usage, business_ids, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.email,
        user.name,
        user.passwordSalt,
        user.passwordHash,
        user.emailVerified ? 1 : 0,
        JSON.stringify(user.subscription ?? { plan: 'free', status: 'active' }),
        n(user.subscriptionTier),
        JSON.stringify(user.usage ?? {}),
        JSON.stringify(user.businessIds ?? []),
        n(user.createdAt),
      ]
    );
    return true;
  });
}

/**
 * Read one user, apply `mutate`, write that one row back — inside a
 * transaction, so nothing can read it in between.
 */
export async function updateUser(
  id: string,
  mutate: (user: StoredUser) => void
): Promise<StoredUser | null> {
  return await tx(async () => {
    const record = await findUserById(id);
    if (!record) return null;

    mutate(record);

    await exec(
      `UPDATE users SET email = ?, name = ?, password_salt = ?, password_hash = ?,
                        email_verified = ?, subscription = ?, subscription_tier = ?,
                        usage = ?, business_ids = ?
       WHERE id = ?`,
      [
        record.email,
        record.name,
        record.passwordSalt,
        record.passwordHash,
        record.emailVerified ? 1 : 0,
        JSON.stringify(record.subscription ?? {}),
        n(record.subscriptionTier),
        JSON.stringify(record.usage ?? {}),
        JSON.stringify(record.businessIds ?? []),
        id,
      ]
    );

    return record;
  });
}

export async function markEmailVerified(id: string): Promise<StoredUser | null> {
  return await updateUser(id, (u) => {
    u.emailVerified = true;
  });
}

/** Remove a user and everything that hangs off them, in one request. */
export async function deleteUserCascade(id: string): Promise<void> {
  const { getDb } = await import('./db');
  await getDb().batch(
    [
      { sql: 'DELETE FROM sessions WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM email_tokens WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM payments WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM subscriptions WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM documents WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [id] },
    ] as never[],
    'write'
  );
}

/** Every user, for whole-table work such as scheduled monitoring. */
export async function listAllUsers(): Promise<StoredUser[]> {
  return await loadUsers();
}

export { tx };
