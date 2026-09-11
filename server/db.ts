import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Storage layer.
 *
 * One SQLite database replaces the eight JSON files. That buys us what the file
 * layer could not:
 *
 *   - every write is atomic, so a crash mid-write cannot leave a half-written
 *     file behind (the old failure mode that could lose every account at once)
 *   - read-modify-write runs inside a transaction, so two concurrent requests
 *     cannot silently overwrite each other
 *   - WAL mode means readers never block behind a writer
 *
 * Shape of the schema:
 *
 *   Relational where we look things up by column  → users, sessions,
 *     email_tokens, payments, subscriptions
 *   Document rows where we always fetch a whole aggregate by key → workspaces,
 *     competitor results, monitoring state, analytics, rankings
 *
 * The document rows are real SQL rows with a namespace and a key, not a JSON
 * dump of the whole dataset — so a single business's data can be read or
 * deleted without touching anything else, and account deletion is one query.
 *
 * node:sqlite is synchronous, which suits this codebase (it used writeFileSync
 * throughout) and means a transaction block can never await.
 */

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'searchvailable.db');

let db: DatabaseSync | null = null;

/** SQLite rejects `undefined` bindings; normalise them to NULL. */
export function n<T>(value: T | undefined | null): T | null {
  return value === undefined ? null : (value as T | null);
}

export function bool(value: boolean | undefined | null): number {
  return value ? 1 : 0;
}

function ensureDataDir() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

export function getDb(): DatabaseSync {
  if (db) return db;

  ensureDataDir();
  db = new DatabaseSync(DB_FILE);

  // Durability + concurrency settings.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA synchronous = NORMAL');

  migrate(db);
  return db;
}

export function databasePath(): string {
  return DB_FILE;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/* ------------------------------------------------------------------ */
/* Schema                                                             */
/* ------------------------------------------------------------------ */

const SCHEMA_VERSION = 1;

function migrate(conn: DatabaseSync) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const current = (() => {
    try {
      const row = conn.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as
        | { value: string }
        | undefined;
      return row ? Number(row.value) : 0;
    } catch {
      return 0;
    }
  })();

  if (current >= SCHEMA_VERSION) return;

  tx(() => {
    conn.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id                TEXT PRIMARY KEY,
        email             TEXT NOT NULL UNIQUE COLLATE NOCASE,
        name              TEXT NOT NULL,
        password_salt     TEXT NOT NULL,
        password_hash     TEXT NOT NULL,
        email_verified    INTEGER NOT NULL DEFAULT 0,
        subscription      TEXT NOT NULL,
        subscription_tier TEXT,
        usage             TEXT NOT NULL,
        business_ids      TEXT NOT NULL DEFAULT '[]',
        created_at        TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token      TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS email_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose    TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tokens_user ON email_tokens(user_id, purpose);

      CREATE TABLE IF NOT EXISTS payments (
        id                TEXT PRIMARY KEY,
        user_id           TEXT NOT NULL,
        subscription_id   TEXT,
        provider          TEXT NOT NULL,
        provider_ref      TEXT NOT NULL,
        provider_txn      TEXT,
        plan              TEXT,
        poll_url          TEXT,
        amount            INTEGER NOT NULL,
        currency          TEXT NOT NULL,
        payment_method    TEXT NOT NULL,
        status            TEXT NOT NULL,
        created_at        TEXT NOT NULL,
        updated_at        TEXT NOT NULL,
        webhook_received  TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

      CREATE TABLE IF NOT EXISTS subscriptions (
        id                    TEXT PRIMARY KEY,
        user_id               TEXT NOT NULL,
        plan                  TEXT NOT NULL,
        status                TEXT NOT NULL,
        period_start          TEXT NOT NULL,
        period_end            TEXT,
        duration_days         INTEGER,
        provider_customer_id  TEXT,
        provider_sub_id       TEXT,
        created_at            TEXT NOT NULL,
        updated_at            TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

      CREATE TABLE IF NOT EXISTS documents (
        ns         TEXT NOT NULL,
        k          TEXT NOT NULL,
        user_id    TEXT,
        payload    TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (ns, k)
      );
      CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id, ns);

      INSERT INTO meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `);
  });
}

/* ------------------------------------------------------------------ */
/* Transactions                                                       */
/* ------------------------------------------------------------------ */

/**
 * Run `fn` inside an immediate transaction. Nested calls join the outer one
 * rather than trying to open a second transaction (SQLite does not nest).
 */
let depth = 0;

export function tx<T>(fn: () => T): T {
  const conn = getDb();

  if (depth > 0) {
    return fn();
  }

  conn.exec('BEGIN IMMEDIATE');
  depth += 1;
  try {
    const result = fn();
    conn.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      conn.exec('ROLLBACK');
    } catch {
      /* the transaction is already gone */
    }
    throw err;
  } finally {
    depth -= 1;
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
  | 'rankings';

export function docGet<T>(ns: DocNamespace, key: string): T | null {
  const row = getDb()
    .prepare('SELECT payload FROM documents WHERE ns = ? AND k = ?')
    .get(ns, key) as { payload: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export function docPut(ns: DocNamespace, key: string, userId: string | null, payload: unknown) {
  getDb()
    .prepare(
      `INSERT INTO documents (ns, k, user_id, payload, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(ns, k) DO UPDATE SET
         payload = excluded.payload,
         user_id = excluded.user_id,
         updated_at = excluded.updated_at`
    )
    .run(ns, key, n(userId), JSON.stringify(payload), new Date().toISOString());
}

export function docDelete(ns: DocNamespace, key: string): boolean {
  const result = getDb().prepare('DELETE FROM documents WHERE ns = ? AND k = ?').run(ns, key);
  return Number(result.changes) > 0;
}

export function docDeleteByUser(userId: string): number {
  const result = getDb().prepare('DELETE FROM documents WHERE user_id = ?').run(userId);
  return Number(result.changes);
}

export function docCount(ns?: DocNamespace): number {
  const row = ns
    ? (getDb().prepare('SELECT COUNT(*) c FROM documents WHERE ns = ?').get(ns) as { c: number })
    : (getDb().prepare('SELECT COUNT(*) c FROM documents').get() as { c: number });
  return Number(row?.c || 0);
}

export function docKeysForUser(ns: DocNamespace, userId: string): string[] {
  const rows = getDb()
    .prepare('SELECT k FROM documents WHERE ns = ? AND user_id = ?')
    .all(ns, userId) as Array<{ k: string }>;
  return rows.map((r) => r.k);
}

/* ------------------------------------------------------------------ */
/* Health                                                             */
/* ------------------------------------------------------------------ */

export interface DbHealth {
  path: string;
  ok: boolean;
  schemaVersion: number;
  users: number;
  documents: number;
  sizeBytes: number;
  error?: string;
}

export function dbHealth(): DbHealth {
  try {
    const conn = getDb();
    const version = conn.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as
      | { value: string }
      | undefined;
    const users = conn.prepare('SELECT COUNT(*) c FROM users').get() as { c: number };
    const documents = conn.prepare('SELECT COUNT(*) c FROM documents').get() as { c: number };

    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(DB_FILE).size;
    } catch {
      /* not flushed yet */
    }

    return {
      path: DB_FILE,
      ok: true,
      schemaVersion: version ? Number(version.value) : 0,
      users: Number(users.c),
      documents: Number(documents.c),
      sizeBytes,
    };
  } catch (err) {
    return {
      path: DB_FILE,
      ok: false,
      schemaVersion: 0,
      users: 0,
      documents: 0,
      sizeBytes: 0,
      error: err instanceof Error ? err.message : 'database unavailable',
    };
  }
}
