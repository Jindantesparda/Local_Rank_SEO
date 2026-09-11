import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  Subscription,
  SubscriptionTier,
} from '../src/types';
import { getDb, n, tx } from './db';

/**
 * Payments and subscriptions.
 *
 * Relational tables with targeted statements — no load-everything-then-write-
 * everything. The one multi-row operation (activating a new plan, which must
 * deactivate the user's previous active subscription) runs in a transaction, so
 * a user can never end up with two active subscriptions.
 */

interface PaymentRow {
  id: string;
  user_id: string;
  subscription_id: string | null;
  provider: string;
  provider_ref: string;
  provider_txn: string | null;
  plan: string | null;
  poll_url: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: string;
  updated_at: string;
  webhook_received: string | null;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  period_start: string;
  period_end: string | null;
  duration_days: number | null;
  provider_customer_id: string | null;
  provider_sub_id: string | null;
  created_at: string;
  updated_at: string;
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    userId: row.user_id,
    subscriptionId: row.subscription_id ?? undefined,
    provider: row.provider,
    providerReference: row.provider_ref,
    providerTransactionId: row.provider_txn ?? undefined,
    plan: (row.plan as SubscriptionTier | null) ?? undefined,
    pollUrl: row.poll_url ?? undefined,
    amount: Number(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method as PaymentMethod,
    status: row.status as PaymentStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    webhookReceivedAt: row.webhook_received ?? undefined,
  };
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan as SubscriptionTier,
    status: row.status as Subscription['status'],
    currentPeriodStart: row.period_start,
    currentPeriodEnd: row.period_end || '',
    providerCustomerId: row.provider_customer_id ?? undefined,
    providerSubscriptionId: row.provider_sub_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/* ==================== PAYMENTS ==================== */

export function createPayment(
  userId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  providerReference: string,
  plan: SubscriptionTier,
  pollUrl?: string,
  providerTransactionId?: string
): Payment {
  const now = new Date().toISOString();
  const payment: Payment = {
    id: newId('pay'),
    userId,
    provider: 'paynow',
    providerReference,
    providerTransactionId,
    plan,
    pollUrl,
    amount,
    currency: 'USD',
    paymentMethod,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  getDb()
    .prepare(
      `INSERT INTO payments (id, user_id, subscription_id, provider, provider_ref, provider_txn,
        plan, poll_url, amount, currency, payment_method, status, created_at, updated_at, webhook_received)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      payment.id,
      userId,
      null,
      payment.provider,
      providerReference,
      n(providerTransactionId),
      n(plan),
      n(pollUrl),
      amount,
      payment.currency,
      paymentMethod,
      payment.status,
      now,
      now,
      null
    );

  console.log(`[Payment] Created payment ${payment.id} for user ${userId} (${plan})`);
  return payment;
}

export function getPayment(paymentId: string): Payment | null {
  const row = getDb().prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as unknown as PaymentRow | undefined;
  return row ? toPayment(row) : null;
}

export function getPaymentByProviderReference(providerReference: string): Payment | null {
  const row = getDb()
    .prepare('SELECT * FROM payments WHERE provider_ref = ? ORDER BY created_at DESC LIMIT 1')
    .get(providerReference) as unknown as PaymentRow | undefined;
  return row ? toPayment(row) : null;
}

export function getUserPayments(userId: string): Payment[] {
  const rows = getDb()
    .prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as unknown as PaymentRow[];
  return rows.map(toPayment);
}

export function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  webhookReceivedAt?: string
): Payment | null {
  return tx(() => {
    const existing = getPayment(paymentId);
    if (!existing) return null;

    getDb()
      .prepare(
        `UPDATE payments SET status = ?, updated_at = ?,
           webhook_received = COALESCE(?, webhook_received)
         WHERE id = ?`
      )
      .run(status, new Date().toISOString(), n(webhookReceivedAt), paymentId);

    console.log(`[Payment] Updated payment ${paymentId} status to ${status}`);
    return getPayment(paymentId);
  });
}

export function updatePaymentSubscription(
  paymentId: string,
  subscriptionId: string
): Payment | null {
  return tx(() => {
    const existing = getPayment(paymentId);
    if (!existing) return null;

    getDb()
      .prepare('UPDATE payments SET subscription_id = ?, updated_at = ? WHERE id = ?')
      .run(subscriptionId, new Date().toISOString(), paymentId);

    return getPayment(paymentId);
  });
}

/* ==================== SUBSCRIPTIONS ==================== */

export function createSubscription(
  userId: string,
  plan: SubscriptionTier,
  durationDays: number = 30
): Subscription {
  // One transaction: deactivate any current plan, then activate the new one.
  const subscription = tx(() => {
    const now = new Date();
    const nowIso = now.toISOString();

    getDb()
      .prepare(
        `UPDATE subscriptions SET status = 'canceled', updated_at = ?
         WHERE user_id = ? AND status = 'active'`
      )
      .run(nowIso, userId);

    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const record: Subscription = {
      id: newId('sub'),
      userId,
      plan,
      status: 'active',
      currentPeriodStart: nowIso,
      currentPeriodEnd: endDate.toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    getDb()
      .prepare(
        `INSERT INTO subscriptions (id, user_id, plan, status, period_start, period_end,
          duration_days, provider_customer_id, provider_sub_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        userId,
        plan,
        record.status,
        record.currentPeriodStart,
        record.currentPeriodEnd,
        durationDays,
        null,
        null,
        nowIso,
        nowIso
      );

    return record;
  });

  console.log(`[Subscription] Created subscription ${subscription.id} (${plan}) for user ${userId}`);
  return subscription;
}

export function getSubscription(subscriptionId: string): Subscription | null {
  const row = getDb()
    .prepare('SELECT * FROM subscriptions WHERE id = ?')
    .get(subscriptionId) as unknown as SubscriptionRow | undefined;
  return row ? toSubscription(row) : null;
}

export function getUserActiveSubscription(userId: string): Subscription | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(userId) as unknown as SubscriptionRow | undefined;
  return row ? toSubscription(row) : null;
}

export function getUserSubscriptions(userId: string): Subscription[] {
  const rows = getDb()
    .prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as unknown as SubscriptionRow[];
  return rows.map(toSubscription);
}

export function cancelSubscription(subscriptionId: string): Subscription | null {
  return tx(() => {
    const existing = getSubscription(subscriptionId);
    if (!existing) return null;

    getDb()
      .prepare(`UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), subscriptionId);

    console.log(`[Subscription] Cancelled subscription ${subscriptionId}`);
    return getSubscription(subscriptionId);
  });
}

export function renewSubscription(
  subscriptionId: string,
  durationDays: number = 30
): Subscription | null {
  return tx(() => {
    const existing = getSubscription(subscriptionId);
    if (!existing) return null;

    const now = new Date();
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    getDb()
      .prepare(
        `UPDATE subscriptions SET status = 'active', period_start = ?, period_end = ?,
           duration_days = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        now.toISOString(),
        endDate.toISOString(),
        durationDays,
        now.toISOString(),
        subscriptionId
      );

    console.log(`[Subscription] Renewed subscription ${subscriptionId}`);
    return getSubscription(subscriptionId);
  });
}

export function changeSubscriptionPlan(
  subscriptionId: string,
  newPlan: SubscriptionTier
): Subscription | null {
  return tx(() => {
    const existing = getSubscription(subscriptionId);
    if (!existing) return null;

    getDb()
      .prepare('UPDATE subscriptions SET plan = ?, updated_at = ? WHERE id = ?')
      .run(newPlan, new Date().toISOString(), subscriptionId);

    console.log(`[Subscription] Changed subscription ${subscriptionId} plan to ${newPlan}`);
    return getSubscription(subscriptionId);
  });
}

export function isSubscriptionActive(subscription: Subscription): boolean {
  if (subscription.status !== 'active') return false;
  if (!subscription.currentPeriodEnd) return false;
  return new Date(subscription.currentPeriodEnd) > new Date();
}
