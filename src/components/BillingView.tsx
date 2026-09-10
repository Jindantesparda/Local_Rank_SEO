import React, { useState, useEffect } from 'react';
import { CheckCircle2, Check, AlertCircle, Loader2, CreditCard } from 'lucide-react';
import { SubscriptionTier, Payment } from '../types';

interface BillingViewProps {
  currentTier: SubscriptionTier;
  onSelectTier?: (tier: SubscriptionTier) => void;
  token?: string;
}

interface PlanConfig {
  id: string;
  name: string;
  positioning: string;
  description: string;
  price: number;
  currency: string;
  cta: string;
  badge?: string;
  features: string[];
}

interface BillingInfo {
  subscription: {
    plan: SubscriptionTier;
    status: string;
    currentPeriodEnd?: string;
    activeSubscription?: { id: string; plan: SubscriptionTier; status: string; currentPeriodEnd: string };
  };
  currentPlan: PlanConfig;
  paymentHistory: Payment[];
}

export const BillingView: React.FC<BillingViewProps> = ({ currentTier, token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [plans, setPlans] = useState<Record<string, PlanConfig>>({});
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [gatewayMode, setGatewayMode] = useState<'sandbox' | 'live'>('sandbox');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'ecocash' | 'onemoney' | 'card'>('ecocash');
  const [demoCheckout, setDemoCheckout] = useState<{
    reference: string;
    planId: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    loadPlans();
    loadBillingInfo();
  }, [token]);

  const loadPlans = async () => {
    try {
      const response = await fetch('/api/billing/plans');
      const data = (await response.json()) as { plans: Record<string, PlanConfig>; mode: string };
      setPlans(data.plans);
      setGatewayMode(data.mode as 'sandbox' | 'live');
    } catch (err) {
      console.error('Failed to load plans:', err);
      setError('Failed to load pricing plans');
    }
  };

  const loadBillingInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/billing/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view billing information');
          setLoading(false);
          return;
        }
        throw new Error('Failed to load billing information');
      }
      const data = (await response.json()) as BillingInfo;
      setBillingInfo(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load billing info:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planId: string) => {
    if (!token) {
      setError('Please log in to purchase');
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: planId,
          paymentMethod: selectedPaymentMethod,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || 'Checkout failed');
      }

      const data = (await response.json()) as {
        checkout: { checkoutUrl: string; reference: string };
        gatewayMode: 'sandbox' | 'live';
      };

      if (data.gatewayMode === 'sandbox') {
        // Sandbox: don't leave the app. Simulate the gateway here and then
        // fire the same webhook the production gateway would send.
        setDemoCheckout({
          reference: data.checkout.reference,
          planId,
          amount: plans[planId]?.price || 0,
        });
        return;
      }

      // Live: hand off to Paynow's hosted checkout (EcoCash / OneMoney / Visa)
      if (data.checkout.checkoutUrl) {
        window.location.href = data.checkout.checkoutUrl;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      setError(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSimulateWebhook = async (status: 'success' | 'failed') => {
    if (!demoCheckout) return;

    setCheckoutLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: demoCheckout.reference,
          status,
          transactionId: `sandbox_${Date.now()}`,
        }),
      });

      const data = (await response.json()) as {
        processed?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok && !data.processed) {
        throw new Error(data.error || 'Simulated webhook failed');
      }

      setDemoCheckout(null);
      setSuccessMsg(
        status === 'success'
          ? 'Payment confirmed via webhook. Your subscription is now active.'
          : 'Payment marked as failed (simulated).'
      );
      setTimeout(() => loadBillingInfo(), 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Simulated webhook failed';
      setError(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!token || !confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      setSuccessMsg('Subscription cancelled. Your account has been downgraded to Free.');
      setTimeout(() => loadBillingInfo(), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel';
      setError(message);
    }
  };

  return (
    <div className="max-w-6xl space-y-8 text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Pricing</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl font-medium">
          Start free. Upgrade when you're ready.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Ongoing visibility management, not just a one-off audit.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 font-medium flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 font-medium flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Gateway Mode Badge */}
      {gatewayMode === 'sandbox' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>
            <strong>Sandbox Mode:</strong> Payments are being processed in sandbox/test mode. No actual charges will occur.
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-sm text-slate-600">Loading pricing...</span>
        </div>
      )}

      {/* Plans Grid */}
      {!loading && (
        <>
          {/* Current Subscription Info */}
          {billingInfo && billingInfo.subscription.plan !== 'free' && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-indigo-900">
                    Current Plan: <span className="uppercase">{billingInfo.subscription.plan}</span>
                  </p>
                  {billingInfo.subscription.activeSubscription?.currentPeriodEnd && (
                    <p className="text-xs text-indigo-700 mt-1">
                      Renews on{' '}
                      {new Date(
                        billingInfo.subscription.activeSubscription.currentPeriodEnd
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleCancelSubscription}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-300 hover:bg-indigo-100 rounded transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {Object.values(plans).map((plan: PlanConfig) => {
              const isActive = currentTier === (plan.id as SubscriptionTier);
              const isFree = plan.id === 'free';
              const price = plan.price === 0 ? 'Free' : `$${(plan.price / 100).toFixed(2)}`;

              return (
                <div
                  key={plan.id}
                  className={`p-6 rounded-2xl bg-white border flex flex-col justify-between transition shadow-sm ${
                    plan.badge
                      ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                      : isActive
                      ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                        {plan.positioning}
                      </span>
                      {plan.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {plan.badge}
                        </span>
                      )}
                      {isActive && !plan.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Current
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium">{plan.description}</p>

                    <div className="mt-3 flex items-baseline">
                      <span className="text-3xl font-extrabold text-slate-900">{price}</span>
                      {!isFree && <span className="text-xs text-slate-500 ml-1">/ month</span>}
                    </div>

                    <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                    {isFree ? (
                      <button
                        disabled={isActive}
                        className={`w-full py-2.5 rounded-lg font-semibold text-xs transition ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 cursor-default border border-indigo-200'
                            : 'border border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {isActive ? 'Current Plan' : plan.cta}
                      </button>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-semibold text-slate-700">
                            Payment Method
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['ecocash', 'onemoney', 'card'] as const).map((method) => (
                              <button
                                key={method}
                                onClick={() => setSelectedPaymentMethod(method)}
                                className={`py-2 px-2 rounded border text-[10px] font-semibold transition ${
                                  selectedPaymentMethod === method
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {method === 'ecocash'
                                  ? 'EcoCash'
                                  : method === 'onemoney'
                                  ? 'OneMoney'
                                  : 'Visa/Master'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => handleCheckout(plan.id)}
                          disabled={isActive || checkoutLoading}
                          className={`w-full py-2.5 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-2 ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 cursor-default border border-indigo-200'
                              : plan.badge
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50'
                              : 'border border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          {checkoutLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                          {isActive ? 'Current Plan' : plan.cta}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment History */}
          {billingInfo && billingInfo.paymentHistory.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Payment History</h2>
              <div className="space-y-3">
                {billingInfo.paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          ${(payment.amount / 100).toFixed(2)} USD
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.paymentMethod.toUpperCase()} •{' '}
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded ${
                        payment.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : payment.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {payment.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sandbox gateway simulation modal */}
      {demoCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/90 p-6 sm:p-7 text-left">
            <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
              Simulated Paynow Checkout
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {demoCheckout.planId.toUpperCase()} plan · $
              {(demoCheckout.amount / 100).toFixed(2)} · Reference{' '}
              <span className="font-mono">{demoCheckout.reference}</span>
            </p>

            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
              Paynow is not configured yet. This simulates the gateway page where the customer
              would pay with EcoCash, OneMoney or Visa/Mastercard. It then fires the same{' '}
              <strong>/api/billing/webhook</strong> the real gateway sends.
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => handleSimulateWebhook('success')}
                disabled={checkoutLoading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {checkoutLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                Simulate successful payment (webhook)
              </button>
              <button
                onClick={() => handleSimulateWebhook('failed')}
                disabled={checkoutLoading}
                className="w-full py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-lg transition cursor-pointer disabled:opacity-60"
              >
                Simulate failed payment
              </button>
              <button
                onClick={() => setDemoCheckout(null)}
                disabled={checkoutLoading}
                className="w-full py-2 px-4 text-slate-400 hover:text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
