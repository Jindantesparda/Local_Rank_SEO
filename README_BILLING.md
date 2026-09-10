# LocalRank — Billing System

LocalRank has three pricing tiers and a Paynow payment flow with a verified webhook.

## Pricing

| Plan | Price | Audits / month | Businesses | Crawl depth |
|------|-------|----------------|------------|-------------|
| Free | $0 | 1 | 1 | 20 pages |
| Pro | $19 | 12 | 1 | 100 pages (server clamps to 30) |
| Agency | $79 | 200 | 10 | 300 pages (server clamps to 30) |

## Payment methods

Paynow's hosted checkout supports:

- EcoCash
- OneMoney
- Visa / Mastercard

## Payment flow

```
Billing page → choose plan + method
  → POST /api/billing/checkout        (creates PENDING payment)
  → Paynow hosted checkout            (live) or simulated modal (sandbox)
  → POST /api/billing/webhook         (Paynow result URL)
  → server polls Paynow poll URL      (verification — never trusts the body)
  → payment marked PAID
  → subscription created + plan activated
```

The browser return URL (`GET /api/billing/payment-return`) only redirects. Only a verified webhook activates a plan.

## Modes

- **Sandbox (default):** no Paynow credentials needed. The Billing page shows a simulated Paynow checkout with "Simulate successful/failed payment (webhook)" buttons that fire the real webhook handler.
- **Live:** set `PAYMENT_MODE=live`, `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY`, and `APP_URL`. Checkout redirects to Paynow.

## Environment variables

```bash
PAYMENT_MODE=sandbox                    # or live
PAYNOW_INTEGRATION_ID=""                # Paynow Integration ID
PAYNOW_INTEGRATION_KEY=""               # Paynow Integration Key
APP_URL=http://localhost:3000           # public URL in production
# PAYNOW_BASE_URL=...                  # optional override
# PAYMENT_CALLBACK_URL=...             # optional override
```

## Key files

| File | Purpose |
|------|---------|
| `server/billing.ts` | Billing routes: plans, checkout, webhook, cancel |
| `server/paymentGateway.ts` | Paynow gateway (initiate, poll verification, sandbox) |
| `server/paymentStore.ts` | Payment + subscription JSON persistence |
| `server/plans.ts` | Plan pricing and limits (single source of truth) |
| `server/planEnforcement.ts` | Server-side plan limit middleware |
| `src/components/BillingView.tsx` | Pricing page, method selection, sandbox modal |

## Data files

- `data/payments.json` — payment records with provider reference, plan, status.
- `data/subscriptions.json` — subscription records (only one active per user).

Delete `data/` to reset.

## Testing

Quick sandbox test:

1. `npm run dev`
2. Register an account.
3. Settings → Billing → choose Pro → EcoCash.
4. In the simulated checkout, click **Simulate successful payment (webhook)**.
5. The account becomes Pro and the payment shows as PAID in history.

See [README.md](./README.md) for the full setup, and [PAYMENT_PROVIDER_GUIDE.md](./PAYMENT_PROVIDER_GUIDE.md) for going live with Paynow.
