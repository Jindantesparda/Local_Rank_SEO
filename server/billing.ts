/**
 * Billing & Payments API Routes
 * Handles pricing info, checkout initiation, payment verification, and subscription management
 */

import { Router, Request, Response } from 'express';
import { getSessionUser } from './auth';
import {
  createPayment,
  getPayment,
  getPaymentByProviderReference,
  updatePaymentStatus,
  updatePaymentSubscription,
  getUserPayments,
  createSubscription,
  getUserActiveSubscription,
  cancelSubscription,
} from './paymentStore';
import { PLANS, getPlan } from './plans';
import { findUserById, updateUser } from './userRepo';
import {
  createPaymentGateway,
  getGatewayConfig,
  InitiateCheckoutRequest,
  WebhookPayload,
} from './paymentGateway';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, SubscriptionTier } from '../src/types';

// DATA_DIR can be pointed at a mounted persistent disk in production.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

interface UserRecord extends User {
  passwordSalt: string;
  passwordHash: string;
}

/**
 * Storage moved to SQLite (server/db.ts). The user record is updated through
 * the repository so the read and write happen in one transaction.
 */
function readJson<T>(_file: string, fallback: T): T {
  return fallback;
}

function writeJson(_file: string, _data: unknown) {
  /* no-op: see await updateUser() below */
}

async function updateUserSubscription(userId: string, plan: SubscriptionTier, status: string) {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const user = await updateUser(userId, async (record) => {
    record.subscription.plan = plan;
    record.subscription.status = status as typeof record.subscription.status;
    record.subscription.currentPeriodStart = now.toISOString();
    record.subscription.currentPeriodEnd = periodEnd.toISOString();
    record.subscription.updatedAt = now.toISOString();
    record.subscriptionTier = plan;
  });
  if (!user) return;
  console.log(`[Billing] Updated user ${userId} subscription to ${plan}`);
}

export function createBillingRouter(): Router {
  const router = Router();
  const gateway = createPaymentGateway(getGatewayConfig());

  // ==================== PUBLIC ROUTES ====================

  // GET /api/billing/plans - Get all pricing plans
  router.get('/plans', (req, res) => {
    return res.json({
      mode: getGatewayConfig().mode,
      plans: PLANS,
    });
  });

  // ==================== AUTHENTICATED ROUTES ====================

  // GET /api/billing/me - Get current user's subscription and payment info
  router.get('/me', async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    try {
      const activeSubscription = await getUserActiveSubscription(user.id);
      const payments = await getUserPayments(user.id);
      const currentPlan = getPlan(user.subscription.plan);

      return res.json({
        subscription: {
          ...user.subscription,
          activeSubscription: activeSubscription || null,
        },
        currentPlan: currentPlan,
        paymentHistory: payments.slice(0, 10), // Last 10 payments
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get billing info';
      return res.status(500).json({ error: message });
    }
  });

  // POST /api/billing/checkout - Initiate payment checkout
  router.post('/checkout', async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    try {
      const { plan, paymentMethod } = req.body as {
        plan?: string;
        paymentMethod?: string;
      };

      if (!plan || !['pro', 'agency'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan selected.' });
      }

      if (!paymentMethod || !['ecocash', 'onemoney', 'card'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'Invalid payment method.' });
      }

      const planConfig = getPlan(plan as SubscriptionTier);

      // Create checkout session
      const checkoutRequest: InitiateCheckoutRequest = {
        userId: user.id,
        planId: plan,
        amount: planConfig.price,
        currency: planConfig.currency,
        paymentMethod: paymentMethod as 'ecocash' | 'onemoney' | 'card',
        returnUrl: `${process.env.APP_URL || 'http://localhost:3000'}/billing/checkout-return`,
      };

      const checkout = await gateway.initiateCheckout(checkoutRequest);

      // Create pending payment record. The purchased plan is stored on the
      // payment so the webhook can activate the correct plan later.
      const payment = createPayment(
        user.id,
        planConfig.price,
        paymentMethod as 'ecocash' | 'onemoney' | 'card',
        checkout.reference,
        plan as SubscriptionTier,
        checkout.pollUrl,
        checkout.sessionId
      );

      console.log(`[Billing] Checkout initiated for user ${user.id}`, {
        plan,
        paymentId: payment.id,
        reference: checkout.reference,
        gatewayMode: getGatewayConfig().mode,
      });

      return res.json({
        payment: payment,
        checkout: checkout,
        gatewayMode: getGatewayConfig().mode,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initiate checkout';
      console.error('[Billing] Checkout error:', message);
      return res.status(500).json({ error: message });
    }
  });

  // GET /api/billing/payment-return - Customer comes back from Paynow.
  // This is UX only. We do NOT activate anything here — the webhook +
  // server-side verification is the only path that activates a subscription.
  router.get('/payment-return', (req, res) => {
    const reference = String(req.query.reference || '');
    console.log(`[Billing] Customer returned from gateway`, { reference });

    // Send the customer back to the billing page. The client polls the
    // payment status, and the webhook activates the plan when verified.
    return res.redirect('/billing');
  });

  // ==================== WEBHOOK ROUTE (Public, but verified against Paynow) ====================

  // POST /api/billing/webhook - Receive payment confirmation from Paynow.
  // CRITICAL: we never trust this body alone. The gateway re-verifies the
  // transaction by polling Paynow's signed poll URL before activation.
  router.post('/webhook', async (req, res) => {
    try {
      const webhookPayload = req.body as WebhookPayload;

      console.log('[Billing] Webhook received', {
        reference: webhookPayload.reference || webhookPayload.paynowreference,
        status: webhookPayload.status,
        transactionId: webhookPayload.transactionId,
      });

      // Find payment by the merchant reference (or provider reference)
      const reference =
        webhookPayload.reference || webhookPayload.paynowreference || '';
      const payment = reference
        ? await getPaymentByProviderReference(reference)
        : null;
      if (!payment) {
        console.warn(`[Billing] Payment not found for webhook reference: ${reference}`);
        // Still return 200 to acknowledge receipt (idempotent)
        return res.json({ received: true, processed: false, message: 'Payment not found' });
      }

      // Check if already processed (idempotency)
      if (payment.status === 'paid') {
        console.log(`[Billing] Payment ${payment.id} already processed, skipping`);
        return res.json({ received: true, processed: false, message: 'Payment already processed' });
      }

      // Verify the transaction with Paynow (poll URL) — the critical step.
      const verification = await gateway.verifyWebhook(webhookPayload, payment.pollUrl);
      if (!verification.valid) {
        console.error('[Billing] Webhook verification failed', {
          reference,
        });
        return res.status(401).json({ error: 'Webhook verification failed.' });
      }

      if (verification.status === 'success') {
        // Gateway confirmed the transaction. Mark payment as PAID.
        await updatePaymentStatus(payment.id, 'paid', new Date().toISOString());

        // Activate the plan that was actually purchased (stored on the payment).
        const purchasedPlan = payment.plan || 'pro';

        const user = await findUserById(payment.userId);
        if (!user) {
          console.error(`[Billing] User not found: ${payment.userId}`);
          return res.status(404).json({ error: 'User not found' });
        }

        // Create subscription + update the user record
        const subscription = await createSubscription(payment.userId, purchasedPlan, 30);
        await updateUserSubscription(payment.userId, purchasedPlan, 'active');
        await updatePaymentSubscription(payment.id, subscription.id);

        console.log(`[Billing] Subscription activated`, {
          userId: payment.userId,
          subscriptionId: subscription.id,
          plan: purchasedPlan,
        });

        return res.json({
          received: true,
          processed: true,
          message: 'Payment confirmed and subscription activated',
          subscriptionId: subscription.id,
        });
      } else if (verification.status === 'failed') {
        await updatePaymentStatus(payment.id, 'failed', new Date().toISOString());

        console.log(`[Billing] Payment failed`, {
          paymentId: payment.id,
          reference,
        });

        return res.json({
          received: true,
          processed: true,
          message: 'Payment failed',
        });
      } else {
        // Gateway says the transaction is still pending.
        console.log(`[Billing] Payment still pending with gateway`, {
          reference,
        });
        return res.json({ received: true, processed: false, message: 'Payment pending' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Webhook processing error';
      console.error('[Billing] Webhook error:', message, err);
      // Still return 200 to prevent retry loop
      return res.status(500).json({ error: message, received: true, processed: false });
    }
  });

  // GET /api/billing/payment/:paymentId - Get payment details
  router.get('/payment/:paymentId', async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    try {
      const payment = await getPayment(req.params.paymentId);
      if (!payment || payment.userId !== user.id) {
        return res.status(404).json({ error: 'Payment not found.' });
      }

      return res.json({ payment });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get payment';
      return res.status(500).json({ error: message });
    }
  });

  // POST /api/billing/cancel-subscription - Cancel user's subscription
  router.post('/cancel-subscription', async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    try {
      const subscription = await getUserActiveSubscription(user.id);
      if (!subscription) {
        return res.status(404).json({ error: 'No active subscription found.' });
      }

      await cancelSubscription(subscription.id);
      await updateUserSubscription(user.id, 'free', 'canceled');

      console.log(`[Billing] Subscription cancelled`, {
        userId: user.id,
        subscriptionId: subscription.id,
      });

      return res.json({ ok: true, message: 'Subscription cancelled.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
