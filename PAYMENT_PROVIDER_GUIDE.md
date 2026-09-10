# Paynow Integration Guide

LocalRank uses **Paynow** (https://www.paynow.co.zw) as its payment gateway. Paynow provides one hosted checkout that supports:

- EcoCash
- OneMoney
- Visa / Mastercard

This guide covers how to go from sandbox testing to live payments.

---

## 1. How the integration works

### Checkout (initiate)

1. The Billing page calls `POST /api/billing/checkout` with `{ plan, paymentMethod }`.
2. The server calls Paynow's **RemoteTransaction** endpoint with:
   - `id` — your Integration ID
   - `reference` — a unique LocalRank merchant reference (`localrank-<timestamp>-<random>`)
   - `amount` — USD amount, e.g. `19.00` for Pro
   - `returnurl` — `https://your-domain.com/api/billing/payment-return`
   - `resulturl` — `https://your-domain.com/api/billing/webhook`
   - `hash` — `SHA512(id + reference + amount + integrationKey)` uppercase hex
3. Paynow responds with `browserurl`, `pollurl`, and `paynowreference`.
4. LocalRank stores a PENDING payment record (including `plan`, `pollUrl`, and Paynow's reference) and redirects the customer to `browserurl`.

### Verification (webhook — the critical part)

1. The customer pays on Paynow's hosted page.
2. Paynow POSTs the transaction result to the result URL:
   `POST https://your-domain.com/api/billing/webhook`
3. LocalRank does **not** trust the webhook body. It looks up the payment by reference and then **polls Paynow's `pollurl`**:
   - `POST <pollurl>` with `hash = SHA512(pollurl + integrationKey)` uppercase hex
4. Only if Paynow returns `Paid`, `Delivered`, or `Awaiting Delivery` does LocalRank:
   - mark the payment PAID
   - create a subscription for the purchased plan
   - activate the plan on the user account
5. The webhook handler is idempotent — repeat notifications for an already-paid payment are ignored.

### Return (browser)

Paynow redirects the customer's browser to the return URL after payment. LocalRank only redirects them to `/billing`. The return URL never activates anything.

---

## 2. Sandbox mode (default, no real money)

When `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY` are empty, the gateway runs in sandbox mode:

- Checkout stays inside the app.
- A simulated Paynow checkout modal is shown.
- "Simulate successful payment (webhook)" fires the real `/api/billing/webhook` handler.
- "Simulate failed payment" tests the failure path.

This lets you test the complete checkout → webhook → verification → activation flow without credentials.

---

## 3. Going live

### Step 1 — Get Paynow merchant credentials

1. Register at https://www.paynow.co.zw.
2. Complete merchant onboarding.
3. From the Paynow dashboard, copy:
   - **Integration ID**
   - **Integration Key**

### Step 2 — Configure the environment

```bash
PAYMENT_MODE=live
PAYNOW_INTEGRATION_ID=your-integration-id
PAYNOW_INTEGRATION_KEY=your-integration-key
APP_URL=https://your-domain.com
# Optional override
# PAYMENT_CALLBACK_URL=https://your-domain.com/api/billing
```

The gateway only enters live mode when **both** credentials are set **and** `PAYMENT_MODE=live`.

### Step 3 — Deploy with a public URL

Paynow must be able to reach your webhook. The relevant URLs:

| Purpose | URL |
|---------|-----|
| Webhook (result URL) | `https://your-domain.com/api/billing/webhook` |
| Return URL | `https://your-domain.com/api/billing/payment-return` |

### Step 4 — Test a real payment

1. Register a test account in the deployed app.
2. Buy Pro with EcoCash/OneMoney for a small amount.
3. Complete the payment on Paynow's page.
4. Confirm the account shows Pro and the payment appears in Payment History.

---

## 4. Paynow API notes

| Item | Value |
|------|-------|
| Base URL | `https://www.paynow.co.zw/interface/remotetransaction` |
| Initiate hash | `SHA512(integrationId + reference + amount + integrationKey)` uppercase hex |
| Poll hash | `SHA512(pollUrl + integrationKey)` uppercase hex |
| Success statuses | `Paid`, `Delivered`, `Awaiting Delivery` |

Implementation lives in `server/paymentGateway.ts`.

---

## 5. Security checklist

- [ ] Integration Key is only set via environment variables, never committed to the repo.
- [ ] `APP_URL` is the public HTTPS URL.
- [ ] Webhook never activates a plan without polling Paynow (live mode).
- [ ] Webhook handler is idempotent (repeat notifications are safe).
- [ ] Failed webhooks mark payments failed and never change the user's plan.
- [ ] Payments store the purchased plan so the webhook can never hardcode a tier.

---

## 6. Refunds

Refunds are currently processed from the Paynow merchant dashboard. The gateway has a `refund()` hook (`server/paymentGateway.ts`) ready if you later enable API refunds.

---

## 7. Troubleshooting

### Payment not credited
1. Check `data/payments.json` — is the payment `pending` or `paid`?
2. Check the server logs for `[Billing] Webhook received` and the Paynow poll response.
3. If the webhook never arrived, confirm `APP_URL` is public and the result URL matches what Paynow has.
4. Contact Paynow if the webhook still doesn't arrive.

### Sandbox banner still shows after setting credentials
The gateway requires **both** `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY` **and** `PAYMENT_MODE=live`. Restart the server after changing env vars.

### Checkout returns an error
- Verify the Integration ID/Key.
- Check the server logs for the Paynow `status` / `error` response.
- Ensure the amount is a valid USD number (Pro = 19.00, Agency = 79.00).
