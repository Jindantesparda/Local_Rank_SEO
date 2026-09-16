/**
 * Paynow Payment Gateway Integration
 * https://www.paynow.co.zw
 *
 * Paynow provides a single hosted checkout that supports EcoCash, OneMoney
 * and Visa/Mastercard. Flow:
 *
 *   1. Search Vailable calls initiateCheckout() -> Paynow returns a browser URL
 *      (customer pays) and a poll URL (server verifies).
 *   2. Customer pays on Paynow's hosted page with the method they choose.
 *   3. Paynow POSTs the result to our webhook (resultUrl).
 *   4. We NEVER trust the webhook body alone. We poll Paynow's poll URL
 *      (signed with our integration key) and only activate the subscription
 *      when Paynow confirms the transaction is paid/delivered.
 *
 * Sandbox mode exists for local development when PAYNOW_INTEGRATION_ID /
 * PAYNOW_INTEGRATION_KEY are not configured. It simulates the gateway so
 * the full checkout -> webhook -> activation flow can be tested.
 */

import crypto from 'crypto';

export type PaymentMode = 'sandbox' | 'live';

export interface PaymentGatewayConfig {
  mode: PaymentMode;
  provider: string;
  integrationId: string;
  integrationKey: string;
  baseUrl: string;
  callbackUrl: string;
}

export interface InitiateCheckoutRequest {
  userId: string;
  planId: string;
  amount: number; // in cents
  currency: string;
  paymentMethod: 'ecocash' | 'onemoney' | 'card';
  returnUrl: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
  reference: string;
  pollUrl?: string; // used by the server to verify the transaction later
  expiresAt: string;
}

export interface WebhookPayload {
  transactionId?: string;
  reference?: string;
  paynowreference?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  timestamp?: string;
  signature?: string;
}

export interface WebhookVerification {
  valid: boolean;
  status: 'success' | 'failed' | 'pending';
  providerTransactionId?: string;
}

interface PaynowInitiateResponse {
  status?: string;
  browserurl?: string;
  pollurl?: string;
  paynowreference?: string;
  error?: string;
}

function sha512Upper(value: string): string {
  return crypto.createHash('sha512').update(value).digest('hex').toUpperCase();
}

function paynowInitiateHash(
  integrationId: string,
  reference: string,
  amount: string,
  integrationKey: string
): string {
  return sha512Upper(`${integrationId}${reference}${amount}${integrationKey}`);
}

function paynowPollHash(pollUrl: string, integrationKey: string): string {
  return sha512Upper(`${pollUrl}${integrationKey}`);
}

function parseUrlEncoded(text: string): Record<string, string> {
  const parsed = new URLSearchParams(text);
  const out: Record<string, string> = {};
  parsed.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function isPaidStatus(status: string | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'paid' || s === 'delivered' || s === 'awaiting delivery';
}

/**
 * Statuses that mean the transaction is over and did not succeed.
 *
 * The live poll path previously only looked for the substring "error", so
 * "Cancelled" and "Declined" fell through to "still pending". An abandoned
 * payment therefore stayed pending forever, and the reconciliation sweep would
 * keep polling it indefinitely.
 */
const FAILED_STATUSES = [
  'failed',
  'failure',
  'cancelled',
  'canceled',
  'declined',
  'error',
  'abandoned',
  'expired',
  'disputed',
  'reversed',
];

function isFailedStatus(status: string | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  if (FAILED_STATUSES.includes(s)) return true;
  // Paynow sometimes prefixes, e.g. "Error: invalid merchant".
  return s.includes('error') || s.includes('cancel') || s.includes('declin');
}

/**
 * Paynow gateway implementation.
 */
export class PaynowGateway {
  protected config: PaymentGatewayConfig;

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  protected log(message: string, data?: unknown) {
    const prefix = `[${this.config.provider}:${this.config.mode}]`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  async initiateCheckout(request: InitiateCheckoutRequest): Promise<CheckoutResponse> {
    this.log('Initiating checkout', {
      userId: request.userId,
      planId: request.planId,
      amount: request.amount,
      method: request.paymentMethod,
    });

    const reference = `searchvailable-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Sandbox mode: no real gateway call. The "checkout page" is simulated
    // in the app and the webhook endpoint accepts simulated confirmations.
    if (this.config.mode === 'sandbox') {
      const sessionId = `sandbox_${Date.now()}`;
      this.log('Sandbox checkout session created', { sessionId, reference });
      return {
        checkoutUrl: `${this.config.callbackUrl}/checkout-return?session=${sessionId}&reference=${reference}&mode=sandbox`,
        sessionId,
        reference,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    }

    // Live mode: Paynow RemoteTransaction API
    const amountDollars = (request.amount / 100).toFixed(2);
    const resultUrl = `${this.config.callbackUrl}/webhook`;

    const body = new URLSearchParams({
      id: this.config.integrationId,
      reference,
      amount: amountDollars,
      additionalinfo: `Search Vailable ${request.planId.toUpperCase()} plan`,
      returnurl: request.returnUrl,
      resulturl: resultUrl,
      status: 'Message',
    });
    body.set(
      'hash',
      paynowInitiateHash(
        this.config.integrationId,
        reference,
        amountDollars,
        this.config.integrationKey
      )
    );

    try {
      const res = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const text = await res.text();
      const init = parseUrlEncoded(text) as PaynowInitiateResponse;

      if ((init.status || '').toLowerCase() !== 'ok' || !init.browserurl || !init.pollurl) {
        this.log('Checkout creation failed', init);
        throw new Error(init.error || 'Paynow could not start the checkout. Please try again.');
      }

      this.log('Paynow checkout created', {
        paynowreference: init.paynowreference,
      });

      return {
        checkoutUrl: init.browserurl,
        sessionId: init.paynowreference || reference,
        reference,
        pollUrl: init.pollurl,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    } catch (err) {
      this.log('Checkout error', err);
      throw err;
    }
  }

  /**
   * Verify a webhook notification from Paynow.
   *
   * Live mode: the incoming notification is never trusted by itself.
   * We poll Paynow's signed poll URL and use that as the source of truth.
   */
  async verifyWebhook(
    payload: WebhookPayload,
    pollUrl?: string
  ): Promise<WebhookVerification> {
    this.log('Verifying webhook', { reference: payload.reference, status: payload.status });

    if (this.config.mode === 'sandbox') {
      // Sandbox still requires an explicit success status. Anything that is
      // not a known success (cancelled, declined, expired, pending, ...) must
      // never activate a subscription.
      const raw = (payload.status || '').toLowerCase().trim();
      const successStatuses = ['success', 'paid', 'delivered', 'awaiting delivery'];
      const status = successStatuses.includes(raw)
        ? 'success'
        : isFailedStatus(raw)
          ? 'failed'
          : 'pending';

      this.log('Sandbox webhook verified', { incoming: payload.status, status });
      return {
        valid: true,
        status,
        providerTransactionId: payload.transactionId,
      };
    }

    // Live verification: poll Paynow.
    if (!pollUrl) {
      this.log('Webhook verification failed: no poll URL for payment');
      return { valid: false, status: 'pending' };
    }

    try {
      const body = new URLSearchParams({
        hash: paynowPollHash(pollUrl, this.config.integrationKey),
      });
      const res = await fetch(pollUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const text = await res.text();
      const poll = parseUrlEncoded(text);

      this.log('Paynow poll response', poll);

      if (isPaidStatus(poll.status)) {
        return {
          valid: true,
          status: 'success',
          providerTransactionId: poll.paynowreference,
        };
      }
      if (isFailedStatus(poll.status)) {
        return { valid: true, status: 'failed' };
      }
      // Still pending with the gateway.
      return { valid: true, status: 'pending' };
    } catch (err) {
      this.log('Webhook verification error', err);
      return { valid: false, status: 'pending' };
    }
  }

  async refund(transactionId: string, amount: number): Promise<boolean> {
    this.log('Refund requested', { transactionId, amount });
    // Paynow refunds are processed from the merchant dashboard.
    // We keep the hook so refunds can be added when the merchant account allows.
    return false;
  }
}

/**
 * Gateway factory
 */
export function createPaymentGateway(config: PaymentGatewayConfig): PaynowGateway {
  if (config.provider !== 'paynow') {
    throw new Error(`Unknown payment provider: ${config.provider}`);
  }
  return new PaynowGateway(config);
}

/**
 * Get gateway configuration from environment
 */
export function getGatewayConfig(): PaymentGatewayConfig {
  const integrationId = process.env.PAYNOW_INTEGRATION_ID || '';
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || '';
  // Without real credentials we run in sandbox mode regardless of PAYMENT_MODE.
  const configured = Boolean(integrationId && integrationKey);
  const mode: PaymentMode =
    configured && (process.env.PAYMENT_MODE || 'live') === 'live' ? 'live' : 'sandbox';

  return {
    mode,
    provider: 'paynow',
    integrationId,
    integrationKey,
    baseUrl:
      process.env.PAYNOW_BASE_URL || 'https://www.paynow.co.zw/interface/remotetransaction',
    callbackUrl: process.env.PAYMENT_CALLBACK_URL || 'http://localhost:3000/api/billing',
  };
}
