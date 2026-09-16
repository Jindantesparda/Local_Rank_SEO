import fs from 'fs';
import path from 'path';
import { AuditResult, Business, User } from '../src/types';
import { docPut, exec, migrate, n, query, queryOne, tx } from './db';

/**
 * One-time import of the old JSON files into SQLite.
 *
 * Existing installations have data sitting in `data/*.json`. On first boot with
 * an empty database we copy everything across inside a single transaction, then
 * rename each file to `*.imported` so the import can never run twice and
 * overwrite newer data.
 *
 * The JSON files are RENAMED, never deleted, and that is a deliberate decision
 * rather than an oversight: they are the only rollback path if the SQLite
 * migration turns out to be wrong. Do not add a cleanup step that removes them.
 *
 * Note they do contain password hashes, so treat  with the same care you
 * would the database itself.
 */

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

interface ImportReport {
  ran: boolean;
  users: number;
  sessions: number;
  tokens: number;
  payments: number;
  subscriptions: number;
  documents: number;
  skipped?: string;
}

function readJsonFile<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function exists(file: string): boolean {
  return fs.existsSync(path.join(DATA_DIR, file));
}

interface LegacyUser extends User {
  passwordSalt?: string;
  passwordHash?: string;
}

/**
 * Minimal stand-in for the old prepared-statement API.
 *
 * The importer builds statements once and runs them in a loop, so this keeps
 * that shape while the storage layer is asynchronous.
 */
const statement = (sql: string) => ({
  run: (...args: unknown[]) => exec(sql, args),
  get: (...args: unknown[]) => queryOne(sql, args),
  all: (...args: unknown[]) => query(sql, args),
});

export async function importLegacyData(): Promise<ImportReport> {
    await migrate();

const report: ImportReport = {
    ran: false,
    users: 0,
    sessions: 0,
    tokens: 0,
    payments: 0,
    subscriptions: 0,
    documents: 0,
  };


  // Only ever run against a virgin database.
  const existing = (await queryOne<{ c: number }>('SELECT COUNT(*) c FROM users')) as { c: number };
  if (Number(existing.c) > 0) {
    return { ...report, skipped: 'database already contains users' };
  }

  const legacyFiles = [
    'users.json',
    'sessions.json',
    'tokens.json',
    'payments.json',
    'subscriptions.json',
    'workspaces.json',
    'competitors.json',
    'monitor.json',
    'analytics.json',
    'rankings.json',
  ].filter(exists);

  if (legacyFiles.length === 0) {
    return { ...report, skipped: 'no legacy JSON files found' };
  }

  const users = readJsonFile<LegacyUser[]>('users.json', []);
  const sessions = readJsonFile<Array<{ token: string; userId: string; createdAt: string }>>(
    'sessions.json',
    []
  );
  const tokens = readJsonFile<
    Array<{ tokenHash: string; userId: string; purpose: string; expiresAt: string; createdAt: string }>
  >('tokens.json', []);
  const payments = readJsonFile<
    Array<{
      id: string;
      userId: string;
      subscriptionId?: string;
      provider: string;
      providerReference: string;
      providerTransactionId?: string;
      plan?: string;
      pollUrl?: string;
      amount: number;
      currency: string;
      paymentMethod: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      webhookReceivedAt?: string;
    }>
  >('payments.json', []);
  const subscriptions = readJsonFile<
    Array<{
      id: string;
      userId: string;
      plan: string;
      status: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      providerCustomerId?: string;
      providerSubscriptionId?: string;
      createdAt: string;
      updatedAt: string;
    }>
  >('subscriptions.json', []);

  const workspaces = readJsonFile<
    Record<string, { businesses: Business[]; audits: AuditResult[]; activeBusinessId: string; updatedAt: string }>
  >('workspaces.json', {});
  const competitors = readJsonFile<Record<string, unknown>>('competitors.json', {});
  const monitor = readJsonFile<{ businesses?: Record<string, unknown>; windows?: Record<string, unknown> }>(
    'monitor.json',
    {}
  );
  const analytics = readJsonFile<Record<string, unknown>>('analytics.json', {});
  const rankings = readJsonFile<Record<string, unknown>>('rankings.json', {});

  await tx(async () => {
    const insertUser = statement(
      `INSERT INTO users (id, email, name, password_salt, password_hash, email_verified,
                          subscription, subscription_tier, usage, business_ids, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const u of users) {
      await insertUser.run(
        u.id,
        u.email,
        u.name,
        u.passwordSalt || '',
        u.passwordHash || '',
        u.emailVerified ? 1 : 0,
        JSON.stringify(u.subscription || { plan: 'free', status: 'active' }),
        n(u.subscriptionTier),
        JSON.stringify(u.usage || { auditsUsed: 0, pagesCrawled: 0, aiRequests: 0 }),
        JSON.stringify(u.businessIds || []),
        n(u.createdAt)
      );
      report.users += 1;
    }

    const insertSession = statement(
      'INSERT OR IGNORE INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)'
    );
    for (const s of sessions) {
      if (!users.some((u) => u.id === s.userId)) continue;
      await insertSession.run(s.token, s.userId, s.createdAt);
      report.sessions += 1;
    }

    const insertToken = statement(
      `INSERT OR IGNORE INTO email_tokens (token_hash, user_id, purpose, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const t of tokens) {
      if (!users.some(async (u) => u.id === t.userId)) continue;
      await insertToken.run(t.tokenHash, t.userId, t.purpose, t.expiresAt, t.createdAt);
      report.tokens += 1;
    }

    const insertPayment = statement(
      `INSERT OR IGNORE INTO payments (id, user_id, subscription_id, provider, provider_ref,
        provider_txn, plan, poll_url, amount, currency, payment_method, status,
        created_at, updated_at, webhook_received)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const p of payments) {
      await insertPayment.run(
        p.id,
        p.userId,
        n(p.subscriptionId),
        p.provider,
        p.providerReference,
        n(p.providerTransactionId),
        n(p.plan),
        n(p.pollUrl),
        p.amount,
        p.currency,
        p.paymentMethod,
        p.status,
        p.createdAt,
        p.updatedAt,
        n(p.webhookReceivedAt)
      );
      report.payments += 1;
    }

    const insertSubscription = statement(
      `INSERT OR IGNORE INTO subscriptions (id, user_id, plan, status, period_start, period_end,
        provider_customer_id, provider_sub_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const s of subscriptions) {
      await insertSubscription.run(
        s.id,
        s.userId,
        s.plan,
        s.status,
        s.currentPeriodStart,
        n(s.currentPeriodEnd),
        n(s.providerCustomerId),
        n(s.providerSubscriptionId),
        s.createdAt,
        s.updatedAt
      );
      report.subscriptions += 1;
    }

    for (const [userId, record] of Object.entries(workspaces)) {
      await docPut('workspace', userId, userId, record);
      report.documents += 1;
    }

    for (const [key, record] of Object.entries(competitors)) {
      await docPut('competitors', key, key.split('::')[0], record);
      report.documents += 1;
    }

    for (const [key, value] of Object.entries(monitor.businesses || {})) {
      await docPut('monitor', key, key.split('::')[0], value);
      report.documents += 1;
    }
    for (const [userId, value] of Object.entries(monitor.windows || {})) {
      await docPut('monitor', `window::${userId}`, userId, value);
      report.documents += 1;
    }

    for (const [key, record] of Object.entries(analytics)) {
      await docPut('analytics', key, key.split('::')[0], record);
      report.documents += 1;
    }

    for (const [key, record] of Object.entries(rankings)) {
      await docPut('rankings', key, key.split('::')[0], record);
      report.documents += 1;
    }
  });

  // Mark the files as imported. They are renamed, never deleted.
  for (const file of legacyFiles) {
    try {
      fs.renameSync(path.join(DATA_DIR, file), path.join(DATA_DIR, `${file}.imported`));
    } catch (err) {
      console.warn(`[db] could not rename ${file}:`, err instanceof Error ? err.message : err);
    }
  }

  return { ...report, ran: true };
}
