/**
 * Payment and Subscription Data Store
 * Handles persistence of payment records and subscription information
 */

import fs from 'fs';
import path from 'path';
import {
  Payment,
  Subscription,
  SubscriptionTier,
  PaymentStatus,
  PaymentMethod,
} from '../src/types';

// DATA_DIR can be pointed at a mounted persistent disk in production.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');

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

// ==================== PAYMENTS ====================

export function createPayment(
  userId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  providerReference: string,
  plan: SubscriptionTier,
  pollUrl?: string,
  providerTransactionId?: string
): Payment {
  const payments = readJson<Payment[]>(PAYMENTS_FILE, []);
  
  const payment: Payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  payments.push(payment);
  writeJson(PAYMENTS_FILE, payments);
  
  console.log(`[Payment] Created payment ${payment.id} for user ${userId} (${plan})`);
  return payment;
}

export function getPayment(paymentId: string): Payment | null {
  const payments = readJson<Payment[]>(PAYMENTS_FILE, []);
  return payments.find((p) => p.id === paymentId) || null;
}

export function getPaymentByProviderReference(providerReference: string): Payment | null {
  const payments = readJson<Payment[]>(PAYMENTS_FILE, []);
  return payments.find((p) => p.providerReference === providerReference) || null;
}

export function getUserPayments(userId: string): Payment[] {
  const payments = readJson<Payment[]>(PAYMENTS_FILE, []);
  return payments.filter((p) => p.userId === userId).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  webhookReceivedAt?: string
): Payment | null {
  const payments = readJson<Payment[]>(PAYMENTS_FILE, []);
  const payment = payments.find((p) => p.id === paymentId);

  if (!payment) return null;

  payment.status = status;
  payment.updatedAt = new Date().toISOString();
  if (webhookReceivedAt) {
    payment.webhookReceivedAt = webhookReceivedAt;
  }

  writeJson(PAYMENTS_FILE, payments);
  console.log(`[Payment] Updated payment ${paymentId} status to ${status}`);
  return payment;
}

export function updatePaymentSubscription(
  paymentId: string,
  subscriptionId: string
): Payment | null {
  const payments = readJson<Payment[]>(PAYMENTS_FILE, []);
  const payment = payments.find((p) => p.id === paymentId);

  if (!payment) return null;

  payment.subscriptionId = subscriptionId;
  payment.updatedAt = new Date().toISOString();

  writeJson(PAYMENTS_FILE, payments);
  return payment;
}

// ==================== SUBSCRIPTIONS ====================

export function createSubscription(
  userId: string,
  plan: SubscriptionTier,
  durationDays: number = 30
): Subscription {
  const subscriptions = readJson<Subscription[]>(SUBSCRIPTIONS_FILE, []);

  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // A user should only ever have one active subscription. Deactivate older ones.
  subscriptions.forEach((s) => {
    if (s.userId === userId && s.status === 'active') {
      s.status = 'canceled';
      s.updatedAt = now.toISOString();
    }
  });

  const subscription: Subscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    userId,
    plan,
    status: 'active',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: endDate.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  subscriptions.push(subscription);
  writeJson(SUBSCRIPTIONS_FILE, subscriptions);
  
  console.log(`[Subscription] Created subscription ${subscription.id} (${plan}) for user ${userId}`);
  return subscription;
}

export function getSubscription(subscriptionId: string): Subscription | null {
  const subscriptions = readJson<Subscription[]>(SUBSCRIPTIONS_FILE, []);
  return subscriptions.find((s) => s.id === subscriptionId) || null;
}

export function getUserActiveSubscription(userId: string): Subscription | null {
  const subscriptions = readJson<Subscription[]>(SUBSCRIPTIONS_FILE, []);
  const active = subscriptions
    .filter((s) => s.userId === userId && s.status === 'active')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return active[0] || null;
}

export function getUserSubscriptions(userId: string): Subscription[] {
  const subscriptions = readJson<Subscription[]>(SUBSCRIPTIONS_FILE, []);
  return subscriptions.filter((s) => s.userId === userId).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function cancelSubscription(subscriptionId: string): Subscription | null {
  const subscriptions = readJson<Subscription[]>(SUBSCRIPTIONS_FILE, []);
  const subscription = subscriptions.find((s) => s.id === subscriptionId);

  if (!subscription) return null;

  subscription.status = 'canceled';
  subscription.updatedAt = new Date().toISOString();

  writeJson(SUBSCRIPTIONS_FILE, subscriptions);
  console.log(`[Subscription] Cancelled subscription ${subscriptionId}`);
  return subscription;
}

export function renewSubscription(subscriptionId: string, durationDays: number = 30): Subscription | null {
  const subscriptions = readJson<Subscription[]>(SUBSCRIPTIONS_FILE, []);
  const subscription = subscriptions.find((s) => s.id === subscriptionId);

  if (!subscription) return null;

  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  subscription.status = 'active';
  subscription.currentPeriodStart = now.toISOString();
  subscription.currentPeriodEnd = endDate.toISOString();
  subscription.updatedAt = now.toISOString();

  writeJson(SUBSCRIPTIONS_FILE, subscriptions);
  console.log(`[Subscription] Renewed subscription ${subscriptionId}`);
  return subscription;
}

export function changeSubscriptionPlan(
  subscriptionId: string,
  newPlan: SubscriptionTier,
  effectiveDate?: string
): Subscription | null {
  const subscriptions = readJson<Subscription[]>(SUBSCRIPTIONS_FILE, []);
  const subscription = subscriptions.find((s) => s.id === subscriptionId);

  if (!subscription) return null;

  subscription.plan = newPlan;
  subscription.updatedAt = new Date().toISOString();

  writeJson(SUBSCRIPTIONS_FILE, subscriptions);
  console.log(`[Subscription] Changed subscription ${subscriptionId} plan to ${newPlan}`);
  return subscription;
}

// Helper: Check if subscription is still active (not expired)
export function isSubscriptionActive(subscription: Subscription): boolean {
  if (subscription.status !== 'active') return false;
  if (!subscription.currentPeriodEnd) return false;
  return new Date(subscription.currentPeriodEnd) > new Date();
}
