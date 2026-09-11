# Search Vailable

**Is your business searchable?** Search Vailable crawls a business website, scores its local SEO on a 100-point scale, and produces a prioritized fix list with real recommendations.

---

## What this app does

- **Real website crawler** — crawls up to N pages per audit, follows redirects, detects HTTPS, robots.txt, sitemaps, canonicals, alt text, headings, meta tags, schema.org structured data, and click-to-call phone links.
- **Deterministic 100-point score** — Technical 25, On-page 30, Local 25, Content 20.
- **Issue engine** — every issue has severity, impact, confidence, and effort; priorities are ranked by `Impact × Confidence ÷ Effort`.
- **Local SEO schema generation** — suggests Schema.org LocalBusiness JSON-LD based on the business category and location (with country-code mapping).
- **Accounts** — real email/password auth with scrypt password hashing and server-side session tokens.
- **Cross-device workspace** — businesses and audits are stored on the server, so logging in on another device restores the full workspace.
- **Subscriptions** — Free / Growth ($19/mo) / Agency ($79/mo) with server-side plan enforcement.
- **Payments** — Paynow gateway (EcoCash, OneMoney, Visa/Mastercard) with webhook verification and sandbox mode for testing.
- **Competitor comparison** — crawl competitor websites with the same engine, score them on the same 100-point scale, and see exactly where you are behind or ahead.
- **Search visibility** — real "who is showing up above you" results for local keywords (requires a Google Programmable Search key; never faked).
- **Why visitors are likely leaving** — inferred from the pages themselves (response time, mobile viewport, script count, HTML size, contact/click-to-call friction, thin content). Clearly labelled as inferred: no analytics, bounce rate or session data is used, and the app never pretends otherwise.

---

## Tech stack

- **Frontend:** React + TypeScript + Tailwind (Vite)
- **Backend:** Express + TypeScript (served by `tsx` in dev, bundled with esbuild for production)
- **Payments:** Paynow Zimbabwe (paynow.co.zw)
- **AI recommendations:** Gemini via `@google/genai` with deterministic fallback when no API key is set
- **Storage:** JSON files under `data/` (no database required)

---

## Quick start

```bash
npm install

# Development (hot reload, port 3000)
npm run dev

# Production
npm run build
npm start
```

Open http://localhost:3000

### Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server (tsx + Vite middleware) |
| `npm run build` | Build the client bundle + bundle the server into `dist/server.cjs` |
| `npm start` | Run the compiled production server (`node dist/server.cjs`) |
| `npm run lint` | Type-check with `tsc --noEmit` |
| `npm run preview` | Preview the built client with Vite |
| `npm run clean` | Remove `dist` |

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `GEMINI_API_KEY` | No | empty | Enables Gemini AI recommendations/copilot. Without it the app uses deterministic fallbacks. |
| `APP_URL` | For live payments | `http://localhost:3000` | Public URL of the app. Used to build Paynow return/result URLs. |
| `PAYMENT_MODE` | No | `sandbox` | `sandbox` or `live`. Live is ignored unless Paynow credentials are set. |
| `PAYNOW_INTEGRATION_ID` | For live payments | empty | Paynow merchant Integration ID. |
| `PAYNOW_INTEGRATION_KEY` | For live payments | empty | Paynow merchant Integration Key. Keep secret. |
| `PAYNOW_BASE_URL` | No | `https://www.paynow.co.zw/interface/remotetransaction` | Paynow API endpoint override. |
| `PAYMENT_CALLBACK_URL` | No | `http://localhost:3000/api/billing` | Base URL used for Paynow return/result URLs. |
| `PORT` | No | `3000` | Port the server listens on. Hosts like Render/Railway set this automatically. |
| `DATA_DIR` | No | `<cwd>/data` | Where accounts/payments/workspaces are stored. Point at a mounted disk in production. |
| `GOOGLE_SEARCH_API_KEY` | No | empty | Enables "who is showing up above you" rankings. Google Custom Search JSON API key. |
| `GOOGLE_SEARCH_ENGINE_ID` | No | empty | Google Programmable Search Engine ID (`cx`) used with the key above. |

---

## Payments (Paynow)

Paynow provides a single hosted checkout that supports **EcoCash**, **OneMoney**, and **Visa/Mastercard**.

### The flow (never trust the browser)

```
User clicks Pay (Billing page)
  -> POST /api/billing/checkout
  -> Search Vailable stores a PENDING payment record
  -> Redirect to Paynow hosted checkout
  -> Customer pays with EcoCash / OneMoney / Visa-Mastercard
  -> Paynow POSTs the result to the webhook: POST /api/billing/webhook
  -> Search Vailable polls Paynow's poll URL (signed with the integration key)
  -> Paynow confirms paid/delivered
  -> Payment marked PAID
  -> Subscription created for the purchased plan
  -> User's plan activated
```

The browser return URL (`GET /api/billing/payment-return`) only redirects back to `/billing`. It never activates anything. **Only a verified webhook can activate a subscription.**

### Sandbox mode (no real money — the default)

With `PAYNOW_INTEGRATION_ID` / `PAYNOW_INTEGRATION_KEY` empty, the app runs in sandbox mode:

1. Register/login, open **Settings → Billing**.
2. Pick **Growth** or **Agency**, choose a payment method (EcoCash / OneMoney / Visa-Master).
3. A simulated Paynow checkout modal appears.
4. Click **Simulate successful payment (webhook)** — this fires the exact same `/api/billing/webhook` endpoint the real gateway would call.
5. The plan activates, and the payment appears in Payment History.

Use **Simulate failed payment** to verify that a failed webhook does not upgrade the account.

### Going live with Paynow

1. Create a Paynow merchant account at https://www.paynow.co.zw and get your **Integration ID** and **Integration Key**.
2. Deploy the app somewhere with a public URL (Paynow must be able to reach the webhook).
3. Set the environment variables:

```bash
PAYMENT_MODE=live
PAYNOW_INTEGRATION_ID=your-integration-id
PAYNOW_INTEGRATION_KEY=your-integration-key
APP_URL=https://your-domain.com
# optional
# PAYMENT_CALLBACK_URL=https://your-domain.com/api/billing
```

4. Rebuild/restart. The Billing page will now redirect to Paynow's hosted checkout.

Webhook URL for the Paynow dashboard (result URL):

```
https://your-domain.com/api/billing/webhook
```

Return URL:

```
https://your-domain.com/api/billing/payment-return
```

---

## Competitor comparison & search visibility

The **Competitors** tab has two honest layers.

### 1. Competitor analysis (always available)

Add competitor website URLs for a business. Search Vailable crawls each one with the same
engine used for your own audit and scores it on the same 100-point scale, so you get
an apples-to-apples comparison:

| Column | Meaning |
|--------|---------|
| Overall / Technical / On-page / Local / Content | Same scoring model as your audit |
| HTTPS | Whether the competitor serves securely |
| Local schema | Whether they have LocalBusiness structured data |

The table marks where a competitor is ahead (amber) or you lead (green), followed by
plain-English insights like "3 of 5 competitors beat you on Local SEO".

Competitors are saved per business (`data/competitors.json`) and restored when you
come back.

### 2. Search visibility — "who is showing up above you" (optional)

This shows which websites rank above you for a local keyword (e.g.
`Restaurant in Harare`). It uses the **Google Programmable Search / Custom Search JSON API**,
so we never invent rankings.

To enable it:

1. Create a Programmable Search Engine: https://programmablesearchengine.google.com
   (set it to search the entire web).
2. Get a Custom Search JSON API key: https://developers.google.com/custom-search/v1/overview
3. Set the env vars:

```bash
GOOGLE_SEARCH_API_KEY=your-key
GOOGLE_SEARCH_ENGINE_ID=your-cx
```

4. Restart the server. The Competitors tab will now return real top-10 results, mark
   your domain with a **YOU** badge, and tell you how many sites are above you.

> Without these keys the tab clearly reports "ranking data is not connected yet"
> instead of showing fake positions. The score comparison above still works.

---

## Plans and limits

| Plan | Price | Audits / month | Businesses | Crawl depth |
|------|-------|----------------|------------|-------------|
| Free | $0 | 1 | 1 | 20 pages |
| Growth | $19 | 12 | 1 | 100 pages (server clamps to 30) |
| Agency | $79 | 200 | 10 | 300 pages (server clamps to 30) |

Plan enforcement is server-side (`server/planEnforcement.ts`).

---

## API reference

### Auth

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/register` | no | Create account (`name`, `email`, `password`) |
| POST | `/api/auth/login` | no | Login, returns `user` + `token` |
| GET | `/api/auth/me` | Bearer | Current user |
| POST | `/api/auth/logout` | Bearer | Invalidate this device's session |
| PATCH | `/api/auth/user` | Bearer | Update profile/subscription/usage |
| POST | `/api/auth/user/password` | Bearer | Change password |
| DELETE | `/api/auth/account` | Bearer | Delete account + workspace |

### Audit & AI

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/audit` | Bearer (limit checked) | Crawl + score a website |
| POST | `/api/ai/copilot` | no | Ask about an audit |
| POST | `/api/ai/fix` | no | Generate a custom fix snippet |

### Workspace (cross-device sync)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/workspace` | Bearer | Load businesses, audits, active business |
| PUT | `/api/workspace` | Bearer | Save businesses, audits, active business |

### Billing / Paynow

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/billing/plans` | no | Pricing plans + gateway mode |
| GET | `/api/billing/me` | Bearer | Subscription + payment history |
| POST | `/api/billing/checkout` | Bearer | Start checkout (`plan`, `paymentMethod`) |
| GET | `/api/billing/payment-return` | no | Paynow return redirect (UX only) |
| POST | `/api/billing/webhook` | Paynow | Webhook — verifies and activates |
| GET | `/api/billing/payment/:paymentId` | Bearer | Single payment details |
| POST | `/api/billing/cancel-subscription` | Bearer | Cancel active subscription |

### Competitors

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/competitors/config` | no | Whether SERP ranking data is configured |
| POST | `/api/competitors/analyze` | Bearer | Crawl + score competitor sites (`business`, `urls`) |
| POST | `/api/competitors/serp` | Bearer | Top search results for a keyword (`business`, `keyword`) |
| GET | `/api/competitors/:businessId` | Bearer | Saved competitor URLs + last comparison |
| PUT | `/api/competitors/:businessId` | Bearer | Save competitor URL list |

---

## Data files

All runtime data lives in `data/` (created automatically, git-ignored):

| File | Contents |
|------|----------|
| `data/users.json` | User accounts (password hash + salt, subscription, usage) |
| `data/sessions.json` | Session tokens (max 500 kept) |
| `data/workspaces.json` | Per-user businesses + audits for cross-device sync |
| `data/payments.json` | Payment records (provider, plan, status, references) |
| `data/subscriptions.json` | Subscription records (plan, period, status) |
| `data/competitors.json` | Per-business competitor URLs + last comparison results |

Delete `data/` to reset the app completely.

---

## Deployment

**Important:** Search Vailable is not a static site. It needs a host that runs the Express
server (crawler + auth + billing + webhook) and a **persistent disk** for `data/`.

Do **not** deploy it to a static-only host (Vercel static, Netlify, GitHub Pages) —
all `/api/...` calls will return 404 because the backend isn't running.

### Option A — Render (recommended)

The repo includes `render.yaml`.

1. Push the repo to GitHub.
2. In Render: **New → Blueprint**, connect the repo. Render reads `render.yaml`.
3. Set the secret env vars in the dashboard (they're marked `sync: false`):
   - `APP_URL` — your Render URL, e.g. `https://search-vailable.onrender.com`
   - `GEMINI_API_KEY` (optional)
   - `PAYNOW_INTEGRATION_ID` / `PAYNOW_INTEGRATION_KEY` (only for live payments)
4. Deploy. Render runs `npm install --include=dev && npm run build` then `npm start`.
5. Check `https://your-service.onrender.com/api/health` returns `{"status":"ok"}`.

The blueprint mounts a 1 GB disk at `/opt/render/project/src/data` and sets
`DATA_DIR` there, so accounts and payments survive deploys.

> Render disks require a paid instance. On the free tier, remove the `disk:` block
> and the `DATA_DIR` env var — the app works, but data resets on restart.

### Option B — Railway

1. **New Project → Deploy from GitHub repo.**
2. Railway runs the build (`npm run build`) and start (`npm start` via `Procfile`).
3. Add a **Volume** mounted at `/app/data` and set `DATA_DIR=/app/data`.
4. Add the same env vars as above, then deploy.

### Option C — Fly.io

```bash
fly launch --no-deploy      # uses the Dockerfile
fly volumes create searchvailable_data --size 1
# add to fly.toml: [mounts] source = "searchvailable_data" destination = "/app/data"
fly secrets set APP_URL=https://your-app.fly.dev
fly deploy
```

### Option D — any VPS / Docker

```bash
docker build -t search-vailable .
docker run -d -p 3000:3000 \
  -v searchvailable_data:/app/data \
  -e APP_URL=https://your-domain.com \
  -e PAYMENT_MODE=sandbox \
  search-vailable
```

Put Nginx/Caddy in front for HTTPS, then set `APP_URL` to the public HTTPS URL.

### After deploying

- Open the deployed URL and confirm an audit works (that was the 404 you hit).
- Point your custom domain at the Node host instead of Vercel.
- For live Paynow payments, set `APP_URL` to the public HTTPS URL and configure
  the Paynow webhook as `https://your-domain.com/api/billing/webhook`.

---

## Common issues

**`POST /api/audit` returns 404 (e.g. on a Vercel URL)**
The backend isn't deployed. Vercel is serving only the static frontend. Deploy the
full app to a Node host (see Deployment above).

**`EADDRINUSE` on port 3000**
Another server is already running. Find and kill it, then restart.

**Paynow checkout returns an error**
- Check `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY`.
- `APP_URL` must be publicly reachable so Paynow can POST the webhook.
- Check the server logs for the Paynow response.

**Sandbox banner still shows after setting credentials**
The gateway only enters live mode when **both** `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY` are set **and** `PAYMENT_MODE=live`. Restart the server after changing env vars.

**Login works on another device but workspace is empty**
Make sure the workspace saved (look for `data/workspaces.json`). The client saves after every business/audit change and on login.

---

## More documentation

- [README_BILLING.md](./README_BILLING.md) — billing system overview
- [QUICK_START.md](./QUICK_START.md) — step-by-step setup and testing
- [BILLING_SYSTEM.md](./BILLING_SYSTEM.md) — billing architecture and data model
- [PAYMENT_TESTING.md](./PAYMENT_TESTING.md) — payment test scenarios
- [PAYMENT_PROVIDER_GUIDE.md](./PAYMENT_PROVIDER_GUIDE.md) — Paynow integration guide
