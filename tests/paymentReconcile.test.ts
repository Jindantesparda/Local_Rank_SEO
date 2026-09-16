import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Payment reconciliation.
 *
 * The scenario that matters: a customer pays, the gateway marks the transaction
 * settled, but the webhook never reaches us — blocked by bot protection, a
 * deploy restarting mid-request, or a network blip. Previously the payment sat
 * 'pending' forever and the customer had paid for nothing, with no error shown
 * to anyone.
 *
 * These tests prove the sweep recovers it by asking the gateway directly, and
 * that it does not activate anything the gateway has not confirmed.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-reconcile-'));
process.env.DATA_DIR = tmpDir;
process.env.DB_FILE = path.join(tmpDir, 'test.db');
process.env.PAYMENT_MODE = 'live';
process.env.PAYNOW_INTEGRATION_ID = 'test-integration';
process.env.PAYNOW_INTEGRATION_KEY = 'test-key';

const { closeDb, exec, migrate } = await import('../server/db');
const { insertUserIfEmailFree, findUserById } = await import('../server/userRepo');
const { createPayment, getPayment } = await import('../server/paymentStore');
const { reconcilePendingPayments, activatePaidPayment } = await import(
  '../server/paymentReconcile'
);

const USER_ID = 'usr_reconcile_test';
const POLL_URL = 'https://paynow.example.test/poll/abc123';

/** Replace fetch so the gateway's poll gets a Paynow-shaped reply. */
function stubGateway(pollBody: string) {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push(String(url));
    void init;
    return new Response(pollBody, {
      status: 200,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

/** Age the payment past the sweep's minimum so it is eligible. */
async function backdatePayment(paymentId: string, minutes = 20) {
  const when = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  await exec('UPDATE payments SET created_at = ? WHERE id = ?', [when, paymentId]);
}

before(async () => {
  await migrate();
  await insertUserIfEmailFree({
    id: USER_ID,
    email: 'reconcile@test.com',
    name: 'Reconcile Tester',
    passwordSalt: 'salt',
    passwordHash: 'hash',
    emailVerified: true,
    subscription: { plan: 'free', status: 'active' } as never,
    usage: { auditsUsed: 0, pagesCrawled: 0, aiRequests: 0 },
  });
});

after(async () => {
  await closeDb();
  for (let i = 0; i < 5; i += 1) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

describe('payment reconciliation', () => {
  test('a paid-but-unconfirmed payment is activated by the sweep', async () => {
    const payment = await createPayment(
      USER_ID,
      1900,
      'ecocash',
      'REF-RECOVER-1',
      'pro',
      POLL_URL
    );
    await backdatePayment(payment.id);

    const before = await findUserById(USER_ID);
    assert.equal(before?.subscription.plan, 'free', 'starts on free');

    const stub = stubGateway('status=Paid&paynowreference=PN-RECOVER-1&reference=REF-RECOVER-1');
    let summary;
    try {
      summary = await reconcilePendingPayments();
    } finally {
      stub.restore();
    }

    assert.equal(summary.checked, 1, 'the pending payment was picked up');
    assert.equal(summary.activated, 1, 'and activated');
    assert.ok(stub.calls.includes(POLL_URL), 'the decision came from the gateway, not a body');

    const stored = await getPayment(payment.id);
    assert.equal(stored?.status, 'paid', 'payment marked paid');

    const after = await findUserById(USER_ID);
    assert.equal(after?.subscription.plan, 'pro', 'the plan the customer bought is active');
    assert.equal(after?.subscription.status, 'active');
  });

  test('a payment the gateway has not settled is left alone', async () => {
    const payment = await createPayment(
      'usr_second',
      1900,
      'onemoney',
      'REF-PENDING-1',
      'pro',
      POLL_URL
    );
    await backdatePayment(payment.id);

    const stub = stubGateway(
      'status=Pending&paynowreference=PN-PENDING-1&reference=REF-PENDING-1'
    );
    let summary;
    try {
      summary = await reconcilePendingPayments();
    } finally {
      stub.restore();
    }

    assert.equal(summary.activated, 0, 'nothing activated');
    assert.equal(summary.stillPending, 1);

    const stored = await getPayment(payment.id);
    assert.equal(stored?.status, 'pending', 'still pending, not wrongly marked paid');
  });

  test('a cancelled payment is marked failed, never activated', async () => {
    const payment = await createPayment(
      'usr_third',
      1900,
      'ecocash',
      'REF-FAILED-1',
      'pro',
      POLL_URL
    );
    await backdatePayment(payment.id);

    const stub = stubGateway('status=Cancelled&paynowreference=PN-FAILED-1');
    try {
      await reconcilePendingPayments();
    } finally {
      stub.restore();
    }

    const stored = await getPayment(payment.id);
    assert.equal(stored?.status, 'failed', 'a cancelled payment must not activate anything');
  });

  test('an already-paid payment is never activated twice', async () => {
    const payment = await createPayment(
      USER_ID,
      1900,
      'ecocash',
      'REF-DOUBLE-1',
      'pro',
      POLL_URL
    );
    await backdatePayment(payment.id);

    const stub = stubGateway('status=Paid&paynowreference=PN-DOUBLE-1');
    try {
      await reconcilePendingPayments();
      // Second pass: the webhook may also have already handled it.
      const second = await activatePaidPayment(payment.id);
      assert.equal(second.activated, false);
      assert.equal(second.status, 'skipped', 'idempotent — no double activation');
    } finally {
      stub.restore();
    }
  });

  test('a recent payment is not raced by the sweep', async () => {
    const fresh = await createPayment(
      'usr_recent',
      1900,
      'ecocash',
      'REF-FRESH-1',
      'pro',
      POLL_URL
    );
    // Deliberately NOT backdated: its webhook may still be in flight.

    const stub = stubGateway('status=Paid&paynowreference=PN-FRESH-1');
    let summary;
    try {
      summary = await reconcilePendingPayments();
    } finally {
      stub.restore();
    }

    assert.equal(summary.checked, 0, 'a payment younger than the minimum is left for its webhook');
    const stored = await getPayment(fresh.id);
    assert.equal(stored?.status, 'pending');
  });
});
