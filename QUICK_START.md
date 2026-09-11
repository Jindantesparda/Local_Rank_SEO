# Quick Start — Search Vailable

## 1. Setup

```bash
npm install
cp .env.example .env
# In .env, keep PAYMENT_MODE=sandbox for testing (no Paynow credentials needed)
npm run dev
# App runs on http://localhost:3000
```

## 2. Create an account

1. Open http://localhost:3000
2. Sign up with any email + password (min 6 chars)
3. You start on the **Free** plan

## 3. Test payments (sandbox, no real money)

1. Go to **Settings → Billing**
2. Choose **Pro** or **Agency**
3. Pick a payment method: EcoCash, OneMoney, or Visa/Master
4. A simulated Paynow checkout opens
5. Click **Simulate successful payment (webhook)** — this fires the real webhook handler
6. The account upgrades, and the payment appears in Payment History as PAID

Click **Simulate failed payment** to verify a failed webhook does not upgrade the plan.

## 4. Test an audit

1. From the dashboard, add a business (website + city + services)
2. Run the audit — it crawls the real website and returns a score + issues
3. Free plan allows 1 audit; the server enforces the limit

## 5. Useful API checks

```bash
# Pricing + gateway mode
curl http://localhost:3000/api/billing/plans

# Your subscription + payment history (replace {token})
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/billing/me

# Start a sandbox checkout
curl -X POST http://localhost:3000/api/billing/checkout \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro","paymentMethod":"ecocash"}'

# Fire the webhook (use the reference returned by checkout)
curl -X POST http://localhost:3000/api/billing/webhook \
  -H "Content-Type: application/json" \
  -d '{"reference":"searchvailable-...","status":"success","transactionId":"sandbox_test"}'
```

## 6. Reset everything

```bash
# Stop the server, then:
rm -rf data
npm run dev
```

## 7. Go live with Paynow

See [PAYMENT_PROVIDER_GUIDE.md](./PAYMENT_PROVIDER_GUIDE.md). In short:

```bash
PAYMENT_MODE=live
PAYNOW_INTEGRATION_ID=your-integration-id
PAYNOW_INTEGRATION_KEY=your-integration-key
APP_URL=https://your-domain.com
```

Webhook URL: `https://your-domain.com/api/billing/webhook`

## 8. Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build (`dist/`) |
| `npm start` | Run production server |
| `npm run lint` | Type-check |
| `rm -rf data` | Reset all accounts/data |

## Key files

| File | Purpose |
|------|---------|
| `server/billing.ts` | Billing API (plans, checkout, webhook, cancel) |
| `server/paymentGateway.ts` | Paynow gateway (initiate + poll verification) |
| `server/paymentStore.ts` | Payment + subscription persistence |
| `server/plans.ts` | Plans, prices, limits |
| `server/planEnforcement.ts` | Server-side plan enforcement |
| `src/components/BillingView.tsx` | Billing UI + sandbox modal |
| `server/workspace.ts` | Cross-device business/audit sync |
| `server/crawler.ts` | Real website crawler |
