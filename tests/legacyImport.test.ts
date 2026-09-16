import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * The legacy JSON importer.
 *
 * This lives in its own file on purpose: server/db.ts resolves DATA_DIR and
 * DB_FILE once at import time, so a test that needs a fresh database has to set
 * the environment BEFORE importing anything. Keeping it separate also means the
 * main storage suite never has to swap directories underneath itself.
 */

const legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-legacy-'));
process.env.DATA_DIR = legacyDir;
process.env.DB_FILE = path.join(legacyDir, 'legacy.db');
process.env.MONITORING_ENABLED = 'false';

// A pre-SQLite install: one user, one workspace, one payment.
fs.writeFileSync(
  path.join(legacyDir, 'users.json'),
  JSON.stringify([
    {
      id: 'usr_old',
      name: 'Old User',
      email: 'old@test.com',
      emailVerified: true,
      subscription: { plan: 'pro', status: 'active' },
      subscriptionTier: 'pro',
      usage: { auditsUsed: 1, pagesCrawled: 5, aiRequests: 0 },
      businessIds: ['b1'],
      createdAt: '2026-01-01T00:00:00.000Z',
      passwordSalt: 'salt',
      passwordHash: 'hash',
    },
  ])
);
fs.writeFileSync(
  path.join(legacyDir, 'workspaces.json'),
  JSON.stringify({
    usr_old: {
      businesses: [{ id: 'b1', name: 'Old Bistro', website: 'https://example.com' }],
      audits: [],
      activeBusinessId: 'b1',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  })
);
fs.writeFileSync(
  path.join(legacyDir, 'payments.json'),
  JSON.stringify([
    {
      id: 'pay_old',
      userId: 'usr_old',
      provider: 'paynow',
      providerReference: 'REF-OLD',
      amount: 1900,
      currency: 'USD',
      paymentMethod: 'ecocash',
      status: 'paid',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
);

fs.writeFileSync(
  path.join(legacyDir, 'subscriptions.json'),
  JSON.stringify([
    {
      id: 'sub_old',
      userId: 'usr_old',
      plan: 'pro',
      status: 'active',
      currentPeriodStart: '2026-01-01T00:00:00.000Z',
      currentPeriodEnd: '2027-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
);

const { closeDb, docGet } = await import('../server/db');
const { importLegacyData } = await import('../server/legacyImport');
const { getUserActiveSubscription, getPaymentByProviderReference } = await import(
  '../server/paymentStore'
);
const { findUserByEmail } = await import('../server/userRepo');

after(async () => {
  await closeDb();
  // Windows can refuse to delete the file the database handle has only just
  // released, so retry briefly rather than failing the run on cleanup.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(legacyDir, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

describe('legacy JSON import', () => {
  test('imports everything, then refuses to run a second time', async () => {
    const report = await importLegacyData();
    assert.equal(report.ran, true);
    assert.equal(report.users, 1);
    assert.equal(report.payments, 1);
    assert.equal(report.subscriptions, 1);
    assert.equal(report.documents, 1);

    const second = await importLegacyData();
    assert.equal(second.ran, false, 'must never import twice');
    assert.match(second.skipped || '', /already contains users/);
  });

  test('renames the files instead of deleting them (the rollback path)', async () => {
    assert.ok(
      fs.existsSync(path.join(legacyDir, 'users.json.imported')),
      'the original should survive as .imported'
    );
    assert.equal(
      fs.existsSync(path.join(legacyDir, 'users.json')),
      false,
      'the original name should be gone so the import cannot repeat'
    );
  });

  test('the imported user is usable, with plan and usage intact', async () => {
    const user = await findUserByEmail('old@test.com');
    assert.ok(user);
    assert.equal(user.subscription.plan, 'pro');
    assert.equal(user.usage.auditsUsed, 1);
    assert.equal(user.usage.pagesCrawled, 5);
    assert.equal(user.emailVerified, true);
  });

  test('payments survive with their provider reference intact', async () => {
    const payment = await getPaymentByProviderReference('REF-OLD');
    assert.ok(payment, 'payment lookup by reference must work');
    assert.equal(payment.amount, 1900);
    assert.equal(payment.status, 'paid');
    assert.equal(payment.paymentMethod, 'ecocash');
  });

  test('the subscription carries over as the active plan', async () => {
    const sub = await getUserActiveSubscription('usr_old');
    assert.ok(sub);
    assert.equal(sub.plan, 'pro');
    assert.equal(sub.status, 'active');
  });

  test('workspace documents carry over keyed by user', async () => {
    const workspace = await docGet<{ businesses: Array<{ name: string }> }>('workspace', 'usr_old');
    assert.ok(workspace);
    assert.equal(workspace.businesses[0].name, 'Old Bistro');
  });
});
