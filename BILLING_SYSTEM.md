# LocalRank AI - Billing & Subscription System

## Overview

LocalRank AI includes a complete, production-ready billing and subscription system with three pricing tiers:

- **FREE** ($0/month) — UNDERSTAND positioning
- **PRO** ($19/month) — IMPROVE positioning  
- **AGENCY** ($79/month) — SCALE positioning

## System Architecture

### Frontend
- **BillingView Component** (`src/components/BillingView.tsx`)
  - Pricing page with all plans
  - Current subscription display
  - Payment method selection (EcoCash/OneMoney)
  - Payment history tracking
  - Plan upgrade/downgrade/cancel

### Backend
- **Plans Configuration** (`server/plans.ts`)
  - Centralized plan definitions
  - Feature flags and limits
  - Price and renewal configuration

- **Billing Routes** (`server/billing.ts`)
  - `/api/billing/plans` — Get all pricing plans
  - `/api/billing/me` — Get current subscription and payment info
  - `/api/billing/checkout` — Initiate payment checkout
  - `/api/billing/payment-return` — Handle return from payment gateway
  - `/api/billing/webhook` — Receive payment confirmations
  - `/api/billing/payment/:id` — Get payment details
  - `/api/billing/cancel-subscription` — Cancel subscription

- **Payment Gateway** (`server/paymentGateway.ts`)
  - Abstract payment gateway interface
  - Payonify implementation
  - Sandbox/test mode support
  - Webhook signature verification

- **Payment Storage** (`server/paymentStore.ts`)
  - Payment record persistence
  - Subscription record persistence
  - Payment status tracking
  - Subscription lifecycle management

- **Plan Enforcement** (`server/planEnforcement.ts`)
  - Middleware for feature access control
  - Audit limit enforcement
  - Business limit enforcement
  - Paid plan requirement enforcement

## Data Models

### User Subscription
```typescript
UserSubscription {
  plan: 'free' | 'pro' | 'agency'
  status: 'active' | 'trialing' | 'canceled' | 'past_due'
  currentPeriodStart?: string
  currentPeriodEnd?: string
  expiresAt?: string
  providerCustomerId?: string
  providerSubscriptionId?: string
  createdAt?: string
  updatedAt?: string
}
```

### Payment
```typescript
Payment {
  id: string
  userId: string
  subscriptionId?: string
  provider: string ('paynow')
  providerReference: string (merchant reference)
  providerTransactionId?: string (Paynow's reference)
  plan?: SubscriptionTier (plan purchased)
  pollUrl?: string (Paynow poll URL for verification)
  amount: number (in cents)
  currency: string ('USD')
  paymentMethod: 'ecocash' | 'onemoney' | 'card'
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  createdAt: string
  updatedAt: string
  webhookReceivedAt?: string
}
```

### Subscription
```typescript
Subscription {
  id: string
  userId: string
  plan: 'free' | 'pro' | 'agency'
  status: 'active' | 'trialing' | 'canceled' | 'past_due'
  currentPeriodStart: string
  currentPeriodEnd: string
  providerCustomerId?: string
  providerSubscriptionId?: string
  createdAt: string
  updatedAt: string
}
```

## Plan Features & Limits

### FREE Plan
```
Price: $0/month
Features:
  - 1 website audit
  - SEO score
  - Top 3 issues
  - Basic recommendations
  - Local search visibility overview
  - No credit card required

Limits:
  - 1 business
  - 1 audit per month
  - 15 pages per audit
  - No ongoing monitoring
  - No client management
```

### PRO Plan
```
Price: $19/month (renewable)
Features:
  - 1 website monitored
  - Full SEO audit
  - Local SEO analysis
  - AI recommendations
  - Weekly monitoring
  - Progress tracking
  - Re-audits
  - Audit history
  - Cancel anytime

Limits:
  - 1 website monitored
  - 1 business
  - 5 audits per month
  - 30 pages per audit
  - Weekly monitoring
  - No client management
```

### AGENCY Plan
```
Price: $79/month (renewable)
Features:
  - Up to 10 businesses
  - Automated monitoring
  - Progress monitoring
  - Full SEO audits
  - AI recommendations
  - Client management
  - Client reports
  - Priority support

Limits:
  - 10 websites monitored
  - 10 businesses
  - 50 audits per month
  - 30 pages per audit
  - Automated/frequent monitoring
  - Client management enabled
  - Priority support enabled
```

## Payment Flow

### Checkout Initiation
1. User selects plan (PRO or AGENCY)
2. User chooses payment method (EcoCash or OneMoney)
3. Frontend sends `/api/billing/checkout` request
4. Backend creates pending payment record
5. Backend requests checkout session from payment gateway
6. Frontend redirects to payment gateway

### Payment Processing
1. User completes payment with EcoCash/OneMoney
2. Payment gateway processes transaction
3. Payment gateway sends webhook to `/api/billing/webhook`
4. Backend verifies webhook signature
5. Backend updates payment status to PAID
6. Backend creates subscription record
7. Backend updates user's subscription

### Subscription Activation
1. Payment confirmed via webhook
2. Subscription created with plan and period
3. User's plan limits are updated
4. User can immediately access plan features
5. Plan enforcement middleware controls feature access

## Security Considerations

✅ **Implemented:**
- Backend determines plan price (frontend cannot manipulate)
- Server-side payment verification (never trust frontend)
- Webhook signature verification
- Idempotent webhook processing (safe to retry)
- Secrets stored in environment variables
- Payment status tracking (PENDING → PAID → confirmed)
- Subscription verification before feature access

⚠️ **Future Enhancements:**
- Payment data encryption at rest
- PCI compliance audit
- Rate limiting on payment endpoints
- Advanced fraud detection
- Subscription renewal notifications

## Configuration

### Environment Variables
```
PAYMENT_MODE=sandbox|live
PAYNOW_INTEGRATION_ID=your-integration-id
PAYNOW_INTEGRATION_KEY=your-integration-key
PAYMENT_CALLBACK_URL=https://yourdomain.com/api/billing
APP_URL=https://yourdomain.com
```

### Sandbox Development
```
PAYMENT_MODE=sandbox
PAYNOW_INTEGRATION_ID=
PAYNOW_INTEGRATION_KEY=
```

## Testing

See [PAYMENT_TESTING.md](./PAYMENT_TESTING.md) for comprehensive testing guide including:
- Environment setup
- Payment flow testing
- Webhook testing
- Audit limit enforcement testing
- Subscription cancellation testing
- Debugging and logs

## API Documentation

### GET /api/billing/plans
Get all available pricing plans.

**Response:**
```json
{
  "mode": "sandbox|live",
  "plans": {
    "free": { /* plan config */ },
    "pro": { /* plan config */ },
    "agency": { /* plan config */ }
  }
}
```

### GET /api/billing/me
Get current user's subscription and billing info.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "subscription": {
    "plan": "pro",
    "status": "active",
    "currentPeriodEnd": "2026-10-04T...",
    "activeSubscription": { /* subscription details */ }
  },
  "currentPlan": { /* plan config */ },
  "paymentHistory": [ /* payments */ ]
}
```

### POST /api/billing/checkout
Initiate checkout for a paid plan.

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "plan": "pro|agency",
  "paymentMethod": "ecocash|onemoney"
}
```

**Response:**
```json
{
  "payment": { /* payment record */ },
  "checkout": {
    "checkoutUrl": "https://...",
    "reference": "ref_...",
    "expiresAt": "2026-09-04T..."
  },
  "gatewayMode": "sandbox|live"
}
```

### POST /api/billing/webhook
Receive payment confirmation from gateway (no auth required, signature verified).

**Body:**
```json
{
  "transactionId": "txn_...",
  "reference": "ref_...",
  "status": "success|failed",
  "amount": 1900,
  "currency": "USD",
  "timestamp": "2026-09-04T...",
  "signature": "..."
}
```

### POST /api/billing/cancel-subscription
Cancel current subscription and revert to FREE plan.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "ok": true,
  "message": "Subscription cancelled."
}
```

## Database Schema

### data/users.json
```json
{
  "id": "usr_...",
  "name": "User Name",
  "email": "user@example.com",
  "subscription": {
    "plan": "pro",
    "status": "active",
    "currentPeriodStart": "...",
    "currentPeriodEnd": "...",
    "updatedAt": "..."
  }
}
```

### data/payments.json
```json
{
  "id": "pay_...",
  "userId": "usr_...",
  "subscriptionId": "sub_...",
  "provider": "paynow",
  "providerReference": "localrank-...",
  "providerTransactionId": "sandbox_...",
  "plan": "pro",
  "amount": 1900,
  "currency": "USD",
  "paymentMethod": "ecocash",
  "status": "paid",
  "createdAt": "...",
  "updatedAt": "...",
  "webhookReceivedAt": "..."
}
```

### data/subscriptions.json
```json
{
  "id": "sub_...",
  "userId": "usr_...",
  "plan": "pro",
  "status": "active",
  "currentPeriodStart": "...",
  "currentPeriodEnd": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Implementation Roadmap

### Phase 1: MVP (Current)
- ✅ Plan configuration and pricing
- ✅ Sandbox payment gateway
- ✅ Checkout flow with EcoCash/OneMoney selection
- ✅ Payment tracking and webhook handling
- ✅ Subscription activation
- ✅ Plan limit enforcement
- ✅ Payment history display
- ✅ Subscription cancellation

### Phase 2: Production Ready
- 🔄 Integration with real Payonify/Smile&Pay account
- 🔄 Webhook production testing
- 🔄 Advanced error handling and logging
- 🔄 Subscription renewal notifications
- 🔄 Refund processing

### Phase 3: Advanced Features
- 🔄 Automatic recurring billing if supported
- 🔄 Subscription pause/resume
- 🔄 Team/multi-user billing
- 🔄 Invoice generation
- 🔄 Usage-based billing
- 🔄 Promo codes and discounts
- 🔄 Dunning management

## Troubleshooting

### Payment stuck in PENDING status
1. Check webhook logs: `[Billing] Webhook received`
2. Verify webhook signature: look for verification failed messages
3. Check payment reference matches database records
4. Manually trigger webhook for testing

### Subscription not activated
1. Verify payment status is PAID (not PENDING)
2. Look for `[Subscription]` creation log entries
3. Check user record in users.json for plan change
4. Verify subscription record in subscriptions.json

### Audit limit not enforced
1. Check user's plan in users.json
2. Verify usage.auditsUsed is tracking
3. Ensure middleware is applied to /api/audit endpoint
4. Look for `[Plan Check]` log entries

### Webhook delivery failed
1. Verify PAYMENT_CALLBACK_URL is correct and accessible
2. Check server logs for webhook errors
3. Verify webhook payload format matches expectation
4. Test webhook manually via curl/Postman

## Support & Contact

For issues or questions:
1. Check PAYMENT_TESTING.md for common scenarios
2. Review server logs for error messages
3. Check browser DevTools → Network for API responses
4. Verify environment variables are set correctly

## License & Usage

This billing system is built for LocalRank AI. Do not redistribute or use in other projects without permission.
