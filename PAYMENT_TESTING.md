# Search Vailable - Payment System Testing & Sandbox Setup

## Overview

The Search Vailable payment system includes a complete sandbox/test mode for development and testing without processing real payments.

## Environment Configuration

### Development Setup

Create a `.env` file in your project root with the following configuration:

```env
# Payment Gateway Configuration
PAYMENT_MODE=sandbox
PAYNOW_INTEGRATION_ID=
PAYNOW_INTEGRATION_KEY=

# Application URL
APP_URL=http://localhost:3000
```

### Production Setup

For production, use your Paynow merchant credentials:

```env
PAYMENT_MODE=live
PAYNOW_INTEGRATION_ID=your-integration-id
PAYNOW_INTEGRATION_KEY=your-integration-key
PAYMENT_CALLBACK_URL=https://yourdomain.com/api/billing

APP_URL=https://yourdomain.com
```

## Testing Payment Flow

### Step 1: Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` in sandbox mode.

### Step 2: Register a Test Account

Navigate to the registration page and create a test account:
- Name: `Test User`
- Email: `test@example.com`
- Password: `password123`

### Step 3: Access the Billing Page

After logging in, navigate to the Settings → Billing section.

You should see:
- ✅ Three pricing plans (FREE, PRO, AGENCY)
- ✅ "Sandbox Mode" notice at the top
- ✅ Payment method selection (EcoCash / OneMoney)
- ✅ Current subscription status

### Step 4: Initiate Sandbox Checkout

**For PRO Plan ($19/month):**

1. Click "Start Pro"
2. Select payment method: "EcoCash" or "OneMoney"
3. Click "Start Pro" button
4. You'll be redirected to the sandbox payment page

**For AGENCY Plan ($79/month):**

1. Click "For Agencies"
2. Select payment method
3. Click "For Agencies" button
4. You'll be redirected to the sandbox payment page

### Step 5: Complete Sandbox Payment

In sandbox mode, the payment page is simulated. The redirect will include:
- `session`: Sandbox session ID
- `reference`: Payment reference
- `mode=sandbox`: Indicates test mode

Your application will:
1. ✅ Create a PENDING payment record
2. ✅ Wait for webhook confirmation

### Step 6: Verify Payment Webhook

In sandbox mode, you can manually test webhook processing. The webhook should be sent to:

```
POST http://localhost:3000/api/billing/webhook
```

**Sandbox Webhook Payload Example:**

```json
{
  "transactionId": "txn_sandbox_12345",
  "reference": "ref_1234567890_abcdef",
  "status": "success",
  "amount": 1900,
  "currency": "USD",
  "timestamp": "2026-09-04T10:30:00Z",
  "signature": "webhook-signature-here"
}
```

### Step 7: Verify Subscription Activation

After the webhook is processed:

1. ✅ Payment status changes from PENDING to PAID
2. ✅ Subscription is created and activated
3. ✅ User's plan changes from FREE to PRO/AGENCY
4. ✅ Plan limits are enforced on subsequent audits

## Testing Audit Limits

### For FREE Plan
- Maximum: 1 audit per month
- Test: Run 1 audit successfully, then verify 2nd audit is blocked

### For PRO Plan
- Maximum: 5 audits per month (effectively unlimited with renewals)
- Test: Upgrade to PRO and verify increased limits

### For AGENCY Plan
- Maximum: 50 audits per month
- Test: Upgrade to AGENCY and verify high limits

## Testing Subscription Cancellation

1. Go to Billing page
2. Click "Cancel" button on active subscription
3. Confirm cancellation
4. Plan should revert to FREE

## Testing Payment History

1. Complete multiple test payments
2. Go to Billing page
3. Verify "Payment History" section shows all transactions
4. Check payment status (PAID/PENDING/FAILED)

## Database Files (Development Only)

The system uses JSON files for storage during development:

```
data/
  users.json              # User accounts and authentication
  workspaces.json         # Business/audit data per user
  payments.json           # Payment records
  subscriptions.json      # Subscription records
  sessions.json           # Auth tokens and sessions
```

## Debugging & Logs

### Console Logging

The payment system logs all important events:

```
[Payment] Created payment [payment-id] for user [user-id]
[Billing] Checkout initiated for user [user-id]
[Billing] Webhook received reference=[reference]
[Payment] Updated payment [payment-id] status to paid
[Subscription] Created subscription [sub-id] (pro) for user [user-id]
[Billing] Updated user [user-id] subscription to pro
```

### Payment Status Tracking

You can check payment details by accessing the payment record:

1. Open browser DevTools → Network tab
2. Look for API calls to `/api/billing/payment/[paymentId]`
3. Verify response contains:
   - `id`, `userId`, `status`, `provider`, `amount`, `currency`
   - `createdAt`, `updatedAt`, `webhookReceivedAt`

## Common Issues & Solutions

### Issue: Webhook Not Processing

**Solution:**
1. Verify webhook payload signature (sandbox mode skips this)
2. Check server logs for `[Billing] Webhook` messages
3. Ensure payment reference matches a pending payment

### Issue: Subscription Not Activated

**Solution:**
1. Verify payment status is PAID (not PENDING)
2. Check that webhook was received and processed
3. Look for `[Subscription]` log entries
4. Verify user subscription was updated in database

### Issue: Audit Limit Not Enforced

**Solution:**
1. Verify user's plan in the database
2. Check that `usage.auditsUsed` is tracking correctly
3. Ensure plan limits are configured in `server/plans.ts`
4. Look for `[Plan Check]` log entries

## Manual Testing Checklist

- [ ] Register new account → starts on FREE plan
- [ ] Select PRO → initiate checkout → redirected to payment
- [ ] Select EcoCash payment method
- [ ] Verify payment record created (PENDING status)
- [ ] Manually send webhook with status=success
- [ ] Verify subscription created
- [ ] Verify user plan changed to PRO
- [ ] Run audit with PRO plan → succeeds
- [ ] Check payment history shows transaction
- [ ] Cancel subscription → reverts to FREE
- [ ] Try to run audit on FREE plan → limited
- [ ] Verify all logs are clean and informative

## Real Payment Integration (Future)

When ready for production:

1. **Get Real Credentials:**
   - Sign up with Payonify, Smile&Pay, or similar provider
   - Obtain API key, merchant ID, and webhook secret
   - Add to production environment variables

2. **Update Gateway Configuration:**
   - Set `PAYMENT_MODE=live`
   - Update all API keys and credentials
   - Configure webhook URL to production domain

3. **Security Checklist:**
   - [ ] Verify webhook signatures in production
   - [ ] Never log sensitive data (API keys, tokens)
   - [ ] Use HTTPS for all payment URLs
   - [ ] Implement rate limiting on payment endpoints
   - [ ] Add payment data encryption for sensitive fields
   - [ ] Regular security audits

4. **Testing Before Go-Live:**
   - [ ] Complete test with real provider's sandbox
   - [ ] Test webhook delivery and retry logic
   - [ ] Verify refund processing
   - [ ] Load testing on payment endpoints
   - [ ] Manual testing with all payment methods

## Monitoring & Analytics

Track these metrics in production:

- Payment success/failure rate
- Average checkout time
- Webhook delivery failures
- Subscription churn rate
- Most popular plan
- Revenue per user

## Support & Troubleshooting

For issues:

1. Check application logs for payment-related entries
2. Verify database files are being created and updated
3. Ensure all environment variables are set correctly
4. Test with simplest flow first (FREE → PRO upgrade)
5. Check browser console for frontend errors

## Additional Notes

- **MVP Approach**: Current implementation prioritizes working checkout and subscription activation
- **Recurring Billing**: If provider doesn't support automatic recurring, implement 30-day manual renewal
- **Idempotency**: Webhook processing is idempotent (safe to retry)
- **Security**: Backend always verifies payments, never trusts frontend
