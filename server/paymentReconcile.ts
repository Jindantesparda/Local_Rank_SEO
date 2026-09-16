import { SubscriptionTier } from '../src/types';
import { createPaymentGateway, getGatewayConfig } from './paymentGateway';
import {
  createSubscription,
  getPayment,
  listPendingPayments,
  updatePaymentStatus,
  updatePaymentSubscription,
} from './paymentStore';
import { updateUser } from './userRepo';

/**
 * Payment reconciliation.
 *
 * The webhook is the fast path, but it must never be the *only* path: if
 * Cloudflare's bot protection challenges it, if Paynow cannot reach us, or if
 * the process restarts mid-request, the payment stays 'pending' while the
 * customer has already paid. Nothing warns anyone — the money is simply gone.
 *
 * So on a schedule we ask the gateway directly about anything still pending and
 * activate whatever the gateway says is settled. The webhook remains the
 * immediate trigger; this is the safety net that makes a blocked webhook a
 * delay rather than a lost sale.
 *
 * Safety properties:
 *   - the decision comes from the gateway, never from a request body
 *   - already-paid payments are skipped, so it cannot double-activate
 *   - a few minutes of age is required, so a webhook in flight is not raced
 */

/** Don't touch a payment younger than this — its webhook may still arrive. */
const MIN_AGE_MINUTES = 10;

export interface ActivationResult {
  activated: boolean;
  subscriptionId?: string;
  status: 'paid' | 'failed' | 'pending' | 'skipped' | 'error';
  reason?: string;
}

/**
 * Mark a verified payment as paid and give the buyer the plan they bought.
 *
 * Shared by the webhook and the sweep so the two can never drift apart — two
 * independent activation paths is exactly how one of them ends up subtly wrong.
 */
export async function activatePaidPayment(paymentId: string): Promise<ActivationResult> {
  const gateway = createPaymentGateway(getGatewayConfig());

  const payment = await getPayment(paymentId);

  if (!payment) {
    return { activated: false, status: 'error', reason: 'Payment not found.' };
  }
  if (payment.status === 'paid') {
    // Idempotent: the webhook may have beaten us to it.
    return { activated: false, status: 'skipped', reason: 'Already paid.' };
  }

  let verification: { valid: boolean; status: string; providerTransactionId?: string };
  try {
    verification = await gateway.verifyWebhook(
      { reference: payment.providerReference },
      payment.pollUrl
    );
  } catch (err) {
    return {
      activated: false,
      status: 'error',
      reason: err instanceof Error ? err.message : 'Could not reach the gateway.',
    };
  }

  if (!verification.valid) {
    return { activated: false, status: 'error', reason: 'Gateway rejected the verification.' };
  }

  if (verification.status === 'failed') {
    await updatePaymentStatus(payment.id, 'failed', new Date().toISOString());
    return { activated: false, status: 'failed' };
  }

  if (verification.status !== 'success') {
    return { activated: false, status: 'pending' };
  }

  // Confirmed by the gateway. Activate the plan that was actually purchased.
  const purchasedPlan: SubscriptionTier = payment.plan || 'pro';
  await updatePaymentStatus(payment.id, 'paid', new Date().toISOString());

  const subscription = await createSubscription(payment.userId, purchasedPlan, 30);
  await updatePaymentSubscription(payment.id, subscription.id);
  await updateUser(payment.userId, (user) => {
    user.subscription = { ...user.subscription, plan: purchasedPlan, status: 'active' };
    user.subscriptionTier = purchasedPlan;
  });

  console.log('[reconcile] activated a payment the webhook never confirmed', {
    paymentId: payment.id,
    userId: payment.userId,
    plan: purchasedPlan,
  });

  return { activated: true, subscriptionId: subscription.id, status: 'paid' };
}

export interface ReconcileSummary {
  checked: number;
  activated: number;
  failed: number;
  stillPending: number;
  errors: number;
}

/** Sweep payments still awaiting confirmation and settle them. */
export async function reconcilePendingPayments(): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    checked: 0,
    activated: 0,
    failed: 0,
    stillPending: 0,
    errors: 0,
  };

  let pending;
  try {
    pending = await listPendingPayments(MIN_AGE_MINUTES);
  } catch (err) {
    console.warn(
      '[reconcile] could not list pending payments:',
      err instanceof Error ? err.message : err
    );
    return summary;
  }

  for (const payment of pending) {
    summary.checked += 1;
    try {
      const result = await activatePaidPayment(payment.id);
      if (result.activated) summary.activated += 1;
      else if (result.status === 'failed') summary.failed += 1;
      else if (result.status === 'pending') summary.stillPending += 1;
      else if (result.status === 'error') summary.errors += 1;
    } catch (err) {
      summary.errors += 1;
      console.warn(
        `[reconcile] payment ${payment.id} could not be reconciled:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (summary.checked > 0) {
    console.log('[reconcile] sweep finished', summary);
  }
  return summary;
}
