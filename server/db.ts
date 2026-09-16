import fs from 'fs';
import path from 'path';
import { Client, InStatement, ResultSet, Transaction, createClient } from '@libsql/client';

/**
 * Storage layer, backed by libSQL.
 *
 * Runs against either:
 *   - Turso (hosted)  — TURSO_DATABASE_URL=libsql://…  + TURSO_AUTH_TOKEN
 *   - a local file    — the default when no URL is set: file:<DATA_DIR>/searchvailable.db
 *
 * The same client handles both, so development and tests run offline against a
 * local file with no credentials while production talks to Turso — one code
 * path, no divergence between what you test and what you deploy.
 *
 * That matters because the app is hosted on Render's free tier, which has no
 * persistent disk: a local database file would be wiped on every restart and
 * every deploy. Turso holds the data off-box instead.
 *
 * ## Shape of the schema
 *
 *   Relational where we look things up by column  → users, sessions,
 *     email_tokens, payments, subscriptions
 *   Document rows where we always fetch a whole aggregate by key → workspaces,
 *     competitor results, monitoring state, analytics, rankings, searchconsole
 *
 * ## Transactions
 *
 * The client is asynchronous, so `await tx()` takes an async callback. Transactions
 * are *ambient*: nested calls join the outer transaction rather than opening a
 * second one (libSQL cannot nest), which keeps the read-modify-write call sites
 * correct without threading a transaction handle through every function.
 */

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

/** Turso URL if configured, otherwise a local file. */
export function databaseUrl(): string {
  const remote = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
  if (remote && remote.trim()) return remote.trim();
  return `file:${process.env.DB_FILE || path.join(DATA_DIR, 'searchvailable.db')}`;
}

export function isRemoteDatabase(): boolean {
  return /^(libsql|wss?|https?):/i.test(databaseUrl());
}

/** A human-readable target for logs, with anything secret removed. */
export function databaseTarget(): string {
  const url = databaseUrl();
  if (!isRemoteDatabase()) return url;
  try {
    return `libsql://${new URL(url).host}`;
  } catch {
    return 'libsql://(remote)';
  }
}

let client: Client | null = null;

/**
 * The client for a statement: the ambient transaction if one is open, otherwise
 * the connection itself. This is what makes `await tx()` transparent to callers.
 */
let activeTx: Transaction | null = null;

export function getDb(): Client {
  if (client) return client;

  const url = databaseUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (isRemoteDatabase() && !authToken) {
    console.warn(
      '[db] A remote database URL is set but TURSO_AUTH_TOKEN is empty — connecting without a token will fail.'
    );
  }

  /*
    A local file database needs its directory to exist. libSQL reports only
    "Unable to open connection to local database" if it is missing, which is a
    confusing way to discover a fresh deployment has no data directory yet.
  */
  if (!isRemoteDatabase()) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
      console.warn(
        `[db] could not create ${DATA_DIR}: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  client = createClient({ url, ...(authToken ? { authToken } : {}) });
  return client;
}

export function closeDb(): void {
  if (client) {
    client.close();
    client = null;
    activeTx = null;
  }
}

/* ------------------------------------------------------------------ */
/* Statement helpers                                                   */
/* ------------------------------------------------------------------ */

function toStatement(sql: string, args?: Array<unknown>): InStatement {
  return args && args.length ? { sql, args: args as never[] } : { sql };
}

function runner(): Client | Transaction {
  if (activeTx) return activeTx;
  return getDb();
}

/** Run a statement, ignoring rows. */
export async function exec(sql: string, args?: Array<unknown>): Promise<ResultSet> {
  const conn = await runner();
  return conn.execute(toStatement(sql, args));
}

/**
 * Run several statements as one atomic request.
 *
 * Routed through the ambient transaction when one is open. Calling the client
 * directly here would use a *second* connection while the transaction holds the
 * write lock, and libSQL answers that with SQLITE_BUSY — the transaction
 * deadlocking against itself.
 */
export async function batch(statements: InStatement[]): Promise<void> {
  if (statements.length === 0) return;
  const conn = await runner();
  // Client and Transaction both expose batch(); the union confuses the checker.
  await (conn as unknown as {
    batch: (s: InStatement[], mode: 'write') => Promise<unknown>;
  }).batch(statements, 'write');
}

/** Run a statement and return its rows. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  args?: Array<unknown>
): Promise<T[]> {
  const result = await exec(sql, args);
  return result.rows as unknown as T[];
}

/** Run a statement expecting at most one row. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args?: Array<unknown>
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows.length ? rows[0] : null;
}

/** SQLite/libSQL rejects `undefined` bindings; normalise them to NULL. */
export function n<T>(value: T | undefined | null): T | null {
  return value === undefined ? null : (value as T | null);
}

export function bool(value: boolean | undefined | null): number {
  return value ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* Schema                                                             */
/* ------------------------------------------------------------------ */

const SCHEMA_VERSION = 1;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS meta (
     key   TEXT PRIMARY KEY,
     value TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS users (
     id                TEXT PRIMARY KEY,
     email             TEXT NOT NULL UNIQUE,
     name              TEXT NOT NULL,
     password_salt     TEXT NOT NULL,
     password_hash     TEXT NOT NULL,
     email_verified    INTEGER NOT NULL DEFAULT 0,
     subscription      TEXT NOT NULL,
     subscription_tier TEXT,
     usage             TEXT NOT NULL,
     business_ids      TEXT NOT NULL DEFAULT '[]',
     created_at        TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token      TEXT PRIMARY KEY,
     user_id    TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS email_tokens (
     token_hash TEXT PRIMARY KEY,
     user_id    TEXT NOT NULL,
     purpose    TEXT NOT NULL,
     expires_at TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_tokens_user ON email_tokens(user_id, purpose)`,
  `CREATE TABLE IF NOT EXISTS payments (
     id               TEXT PRIMARY KEY,
     user_id          TEXT NOT NULL,
     subscription_id  TEXT,
     provider         TEXT NOT NULL,
     provider_ref     TEXT NOT NULL,
     provider_txn     TEXT,
     plan             TEXT,
     poll_url         TEXT,
     amount           INTEGER NOT NULL,
     currency         TEXT NOT NULL,
     payment_method   TEXT NOT NULL,
     status           TEXT NOT NULL,
     created_at       TEXT NOT NULL,
     updated_at       TEXT NOT NULL,
     webhook_received TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
     id                   TEXT PRIMARY KEY,
     user_id              TEXT NOT NULL,
     plan                 TEXT NOT NULL,
     status               TEXT NOT NULL,
     period_start         TEXT NOT NULL,
     period_end           TEXT,
     duration_days        INTEGER,
     provider_customer_id TEXT,
     provider_sub_id      TEXT,
     created_at           TEXT NOT NULL,
     updated_at           TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)`,
  `CREATE TABLE IF NOT EXISTS documents (
     ns         TEXT NOT NULL,
     k          TEXT NOT NULL,
     user_id    TEXT,
     payload    TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     PRIMARY KEY (ns, k)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id, ns)`,
];

let migrated = false;

export async function migrate(): Promise<void> {
  if (migrated) return;
  const db = getDb();

  // Local file mode: these pragmas matter and are supported. A remote libSQL
  // database manages durability itself, and rejects some of them.
  if (!isRemoteDatabase()) {
    await db.execute('PRAGMA journal_mode = WAL');
    await db.execute('PRAGMA foreign_keys = ON');
  }

  await db.batch(SCHEMA_STATEMENTS as InStatement[], 'write');

  await db.execute({
    sql: `INSERT INTO meta (key, value) VALUES ('schema_version', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [String(SCHEMA_VERSION)],
  });

  migrated = true;
}

/* ------------------------------------------------------------------ */
/* Transactions                                                       */
/* ------------------------------------------------------------------ */

/**
 * Run `fn` inside a write transaction. Nested calls join the outer transaction
 * instead of opening a second one, because libSQL does not nest transactions.
 */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  if (activeTx) return fn();

  const db = getDb();
  const transaction = await db.transaction('write');
  activeTx = transaction;

  try {
    const result = await fn();
    await transaction.commit();
    return result;
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {
      /* the transaction is already gone */
    }
    throw err;
  } finally {
    activeTx = null;
  }
}

/* ------------------------------------------------------------------ */
/* Document rows                                                      */
/* ------------------------------------------------------------------ */

export type DocNamespace =
  | 'workspace'
  | 'competitors'
  | 'monitor'
  | 'analytics'
  | 'rankings'
  | 'searchconsole';

export async function docGet<T>(ns: DocNamespace, key: string): Promise<T | null> {
  const row = await queryOne<{ payload: string }>(
    'SELECT payload FROM documents WHERE ns = ? AND k = ?',
    [ns, key]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export async function docPut(
  ns: DocNamespace,
  key: string,
  userId: string | null,
  payload: unknown
): Promise<void> {
  await exec(
    `INSERT INTO documents (ns, k, user_id, payload, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(ns, k) DO UPDATE SET
       payload = excluded.payload,
       user_id = excluded.user_id,
       updated_at = excluded.updated_at`,
    [ns, key, n(userId), JSON.stringify(payload), new Date().toISOString()]
  );
}

export async function docDelete(ns: DocNamespace, key: string): Promise<boolean> {
  const result = await exec('DELETE FROM documents WHERE ns = ? AND k = ?', [ns, key]);
  return Number(result.rowsAffected) > 0;
}

export async function docDeleteByUser(userId: string): Promise<number> {
  const result = await exec('DELETE FROM documents WHERE user_id = ?', [userId]);
  return Number(result.rowsAffected);
}

export async function docCount(ns?: DocNamespace): Promise<number> {
  const row = ns
    ? await queryOne<{ c: number }>('SELECT COUNT(*) c FROM documents WHERE ns = ?', [ns])
    : await queryOne<{ c: number }>('SELECT COUNT(*) c FROM documents');
  return Number(row?.c || 0);
}

export async function docKeysForUser(ns: DocNamespace, userId: string): Promise<string[]> {
  const rows = await query<{ k: string }>(
    'SELECT k FROM documents WHERE ns = ? AND user_id = ?',
    [ns, userId]
  );
  return rows.map((r) => r.k);
}

/* ------------------------------------------------------------------ */
/* Health                                                             */
/* ------------------------------------------------------------------ */

export interface DbHealth {
  target: string;
  remote: boolean;
  ok: boolean;
  schemaVersion: number;
  users: number;
  documents: number;
  error?: string;
}

export async function dbHealth(): Promise<DbHealth> {
  const base = {
    target: databaseTarget(),
    remote: isRemoteDatabase(),
  };

  try {
    await migrate();
    const version = await queryOne<{ value: string }>(
      'SELECT value FROM meta WHERE key = ?',
      ['schema_version']
    );
    const users = await queryOne<{ c: number }>('SELECT COUNT(*) c FROM users');
    const documents = await queryOne<{ c: number }>('SELECT COUNT(*) c FROM documents');

    return {
      ...base,
      ok: true,
      schemaVersion: version ? Number(version.value) : 0,
      users: Number(users?.c || 0),
      documents: Number(documents?.c || 0),
    };
  } catch (err) {
    return {
      ...base,
      ok: false,
      schemaVersion: 0,
      users: 0,
      documents: 0,
      error: err instanceof Error ? err.message : 'database unavailable',
    };
  }
}
