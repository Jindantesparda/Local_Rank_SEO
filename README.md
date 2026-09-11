# Search Vailable

**Is your business searchable?** Search Vailable crawls a business website, scores its local SEO on a 100-point scale, and produces a prioritized fix list with real recommendations.

---

## What this app does

- **Real website crawler** — crawls up to N pages per audit, follows redirects, detects HTTPS, robots.txt, sitemaps, canonicals, alt text, headings, meta tags, schema.org structured data, and click-to-call phone links.
- **Deterministic 100-point score** — Technical 25, On-page 30, Local 25, Content 20.
- **Issue engine** — every issue has severity, impact, confidence, and effort; priorities are ranked by `Impact × Confidence ÷ Effort`.
- **Local SEO schema generation** — suggests Schema.org LocalBusiness JSON-LD based on the business category and location (with country-code mapping).
- **Accounts** — real email/password auth with scrypt password hashing and server-side session tokens.
- **Email confirmation & password reset** — emailed links with single-use hashed tokens. A completed reset invalidates every existing session.
- **Automated monitoring** — paid plans are re-checked on a schedule (Growth weekly, Agency daily) and append real history entries.
- **Client-ready reports** — Agency plan generates a branded, print-optimised HTML report (save as PDF) covering score, priorities, competitors and history.
- **Cross-device workspace** — businesses and audits are stored on the server, so logging in on another device restores the full workspace.
- **Subscriptions** — Free / Growth ($19/mo) / Agency ($79/mo) with server-side plan enforcement.
- **Payments** — Paynow gateway (EcoCash, OneMoney, Visa/Mastercard) with webhook verification and sandbox mode for testing.
- **Competitor comparison** — crawl competitor websites with the same engine, score them on the same 100-point scale, and see exactly where you are behind or ahead.
- **Search visibility** — real "who is showing up above you" results for local keywords (requires a Google Programmable Search key; never faked).
- **Keyword rank tracking** — save the keywords that matter and record where you appear on each scheduled check, with email alerts when a position drops 3 or more places or falls out of the top 10.
- **Why visitors are likely leaving** — inferred from the pages themselves (response time, mobile viewport, script count, HTML size, contact/click-to-call friction, thin content). Clearly labelled as inferred: no analytics, bounce rate or session data is used unless the client connects their own.
- **Measured visitor behaviour (optional)** — connect Google Analytics 4 and the drop-off section switches to real bounce rates, engagement time, worst landing pages and mobile-vs-desktop gaps, compared against the client's own baseline.

---

## Status — what is built, and what is not

Kept in the README on purpose so the gap between what the product *claims* and what it
*does* stays visible. If you add a feature to the marketing copy, add it here too.

### Built and working

| Feature | Notes |
|---------|-------|
| Website crawler + 100-point scoring | Deterministic; no external service involved |
| Issue engine + priority ranking | `Impact × Confidence ÷ Effort` |
| Inferred drop-off analysis | From page signals only; never claims to be measured |
| Email confirmation | Single-use hashed tokens, 24-hour expiry |
| Password reset | 1-hour link; a completed reset invalidates every session |
| Outbound email | Resend HTTP API — no SMTP, no extra dependency |
| Automated monitoring | Growth weekly, Agency daily; honours each plan's audit allowance |
| Keyword rank tracking | Positions over time, alerts on a 3+ place drop |
| Client-ready reports | Agency plan; branded, print-optimised, save as PDF |
| Google Analytics 4 | Measured bounce, engagement, worst landing pages |
| SQLite storage | Transactions, WAL, one-time importer from the old JSON files |
| Tests + CI | 48 tests; GitHub Actions runs lint → test → build → smoke |

### Awaiting credentials (the code is finished)

These do nothing until you add the keys. Everything degrades honestly in the meantime —
see the [credentials checklist](#credentials--api-keys--the-complete-checklist).

| Feature | Needs |
|---------|-------|
| Google rankings + rank tracking | `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID` (free, 100 queries/day) |
| Live payments | Paynow Integration ID + Key, `PAYMENT_MODE=live` |
| Email delivery | `RESEND_API_KEY` + a domain verified with Resend |
| Measured visitor behaviour | `GA4_SERVICE_ACCOUNT_JSON` (free service account) |
| AI-written wording | `GEMINI_API_KEY` (optional — deterministic fallbacks exist) |

### Not built yet

| Item | What it needs | Effort |
|------|---------------|--------|
| **Backups** | Nothing but a choice of interval and retention. `VACUUM INTO` gives consistent hot snapshots with no downtime | Small |
| **Error tracking / alerting** | A Sentry DSN (free tier), or nothing if you accept a generic webhook. Stays dormant until configured | Small |
| **Real footer pages** | About and Contact need your genuine business details. Privacy and Terms would be clearly-labelled drafts pending your own legal review; binding legal text cannot be generated for you | Small |
| **Search Console integration** | A free Google service account. Cheap to add because it reuses the GA4 service-account and JWT code already in `server/ga4.ts` | Medium |
| **Competitor change alerts** | Nothing. Reuses the existing monitoring scheduler and competitor store. Score-based alerts need no credentials at all | Medium |
| **White-label reports / team seats** | Product decisions, not credentials: custom logo, whether to hide branding, how many seats, and whether that changes the pricing | Medium |
| **Review-management signals** | Without Google Business Profile API access this could only be inferred from the site, which would be guesswork | Medium |
| **Google Business Profile** | **Google must approve access.** The GBP API requires submitting an access-request form; approval can take weeks. Cannot be shortcut with a key | Large |
| **Multi-instance support** | A managed Postgres (paid beyond small free tiers). SQLite fixed data integrity, but the auth rate limiter is still in-process and one database file cannot be written by two instances safely | Large |

### Deliberately not done

- **Google ranking positions or traffic figures are never invented.** Where a data source is not
  connected, the UI says so instead of showing a plausible-looking number.
- **Measured visitor behaviour is never faked.** Drop-off starts as clearly-labelled inference and
  only becomes measured once a real analytics property is connected.
- **Review data is not estimated.** Without API access there is nothing honest to show.

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
| `GOOGLE_SEARCH_BASE_URL` | No | Google's endpoint | Override the Custom Search endpoint (proxy, or a stub while testing). |
| `RESEND_API_KEY` | For email | empty | Enables confirmation emails, password reset and monitoring alerts. |
| `EMAIL_FROM` | With Resend | `onboarding@resend.dev` | Sender address. Must be on a domain verified with Resend to reach anyone but you. |
| `GA4_SERVICE_ACCOUNT_JSON` | For analytics | empty | Enables measured visitor behaviour (bounce rate, engagement, landing pages). |
| `GA4_CLIENT_EMAIL` / `GA4_PRIVATE_KEY` | Alternative to the above | empty | Same credential split into two variables. |
| `GA4_OAUTH_URL` / `GA4_API_BASE_URL` | No | Google's endpoints | Override the Google endpoints for proxy or stub testing. |
| `MONITORING_ENABLED` | No | `true` | Set to `false` to turn the in-process scheduler off. |
| `MONITOR_INTERVAL_MINUTES` | No | `15` | How often the scheduler looks for businesses that are due. |
| `SESSION_TTL_DAYS` | No | `30` | How long a login stays valid. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Which Gemini model to use. |

---

## Credentials & API keys — the complete checklist

**The app runs with none of these set.** Every feature below degrades honestly rather than
breaking or faking data. This section is the full list of what to add when you are ready, in the
order that gives you the most value first.

### At a glance

| # | Feature | Variables | Unlocks | Without it | Cost |
|---|---------|-----------|---------|------------|------|
| 1 | **Email** | `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` | Confirmation emails, password reset, monitoring alerts | Messages are logged, not sent. Outside production the link is returned as `devLink` so flows still test locally | Free tier |
| 2 | **Live payments** | `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY`, `PAYMENT_MODE=live`, `APP_URL` | Real EcoCash / OneMoney / card payments | Sandbox simulation — the full checkout → webhook → activation flow, no real money | Paynow transaction fees |
| 3 | **Search rankings + rank tracking** | `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID` | "Who is showing up above you", plus saved keywords tracked over time with drop alerts | Reports "not connected" and the track controls stay hidden. Competitor **score** comparison still works fully | Free — 100 queries/day |
| 4 | **Measured visitor behaviour** | `GA4_SERVICE_ACCOUNT_JSON` | Real bounce rate, engagement time, worst landing pages, mobile gaps | The analytics panel does not render; drop-off stays honestly inferred | Free |
| 5 | **AI wording** | `GEMINI_API_KEY` | AI-written recommendations and copilot answers | Deterministic recommendations — same issues, plainer wording | Free tier available |
| 6 | **Persistence** | `DATA_DIR` + a mounted volume | Accounts, payments and audits survive restarts and redeploys | Everything is lost when the container is replaced | Host-dependent |
| 7 | **Reliable scheduling** | External cron → `POST /api/monitor/run` | Checks actually run weekly/daily | Checks only run while the server is awake | Free (cron-job.org etc.) |

---

### 1. Email — Resend

Used by: email confirmation, password reset, monitoring alert emails.

1. Create an account at [resend.com](https://resend.com) and copy an API key from
   [resend.com/api-keys](https://resend.com/api-keys).
2. Set:
   ```bash
   RESEND_API_KEY="re_xxxxxxxx"
   EMAIL_FROM="Search Vailable <hello@yourdomain.com>"
   APP_URL="https://your-domain.com"     # builds the links inside the emails
   ```
3. **You must verify a domain before email reaches anyone else.** The default sender
   `onboarding@resend.dev` is a shared test sender and Resend will only deliver it to the address
   on your own Resend account. To send to real users: *Resend → Domains → Add domain*, add the DNS
   records, then change `EMAIL_FROM` to an address on that domain.

**Verify it works:** use *Forgot your password?* on the login screen with a real address and check
the inbox. If the server logs `[email] not configured`, the key is not being read.
If you see `[email] provider rejected the message`, the sender domain is not verified.

---

### 2. Live payments — Paynow

Used by: subscriptions (Free / Growth / Agency).

1. Register a merchant account at [paynow.co.zw](https://www.paynow.co.zw).
2. From the merchant dashboard take the **Integration ID** and **Integration Key**.
3. Set:
   ```bash
   PAYMENT_MODE="live"
   PAYNOW_INTEGRATION_ID="your-integration-id"
   PAYNOW_INTEGRATION_KEY="your-integration-key"
   APP_URL="https://your-domain.com"
   PAYMENT_CALLBACK_URL="https://your-domain.com/api/billing"
   ```
4. `APP_URL` / `PAYMENT_CALLBACK_URL` **must be a public HTTPS address** — Paynow posts the result
   back to `POST /api/billing/webhook`, and a localhost URL is unreachable from Paynow.

**Verify it works:** run a real checkout on the live site. The subscription is activated by the
verified webhook, never by the browser redirect — if the webhook cannot reach you, the payment
will succeed at Paynow but the plan will not activate. Watch the server log for the webhook call.

> Full detail, including the sandbox flow and the security model, is in
> [Payments (Paynow)](#payments-paynow) below.

---

### 3. Search rankings — Google Programmable Search

Used by: the "Who is showing up above you" panel in the Competitors tab.

1. Create a search engine at
   [programmablesearchengine.google.com](https://programmablesearchengine.google.com).
2. In its settings, turn **ON** "Search the entire web". Without this the engine only searches
   sites you listed, and rankings come back empty.
3. Copy the **Search engine ID** (`cx`).
4. Enable the **Custom Search API** at
   [console.cloud.google.com](https://console.cloud.google.com) and create an API key.
5. Set:
   ```bash
   GOOGLE_SEARCH_API_KEY="your-api-key"
   GOOGLE_SEARCH_ENGINE_ID="your-cx-id"
   ```

**Verify it works:** `curl https://your-domain.com/api/competitors/config` should report
`"serpConfigured": true`. Google's free tier is 100 queries per day; quota errors are surfaced with
a hint rather than a generic failure.

---

### 4. Measured visitor behaviour — Google Analytics 4

Used by: the "What visitors actually did" panel on the audit page.

You need **one** service account for the whole server. Users then only type a numeric property ID —
they are never asked for a secret.

1. In [Google Cloud Console](https://console.cloud.google.com) create (or pick) a project.
2. Enable the **Google Analytics Data API** for that project.
3. Create a **service account** (*IAM & Admin → Service Accounts*), then create a **JSON key** for it
   and download the file.
4. Set the whole file contents as one variable:
   ```bash
   GA4_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","client_email":"ga4-reader@your-project.iam.gserviceaccount.com","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"}'
   ```
   (Or set `GA4_CLIENT_EMAIL` and `GA4_PRIVATE_KEY` separately — literal `\n` escapes are handled.)
5. Each client then adds that **`client_email`** address as a **Viewer** in GA4 under
   *Admin → Property access management*, and enters their property ID in the app.

**Verify it works:** `/api/analytics/config` requires a signed-in user, so pass a token:

```bash
curl https://your-domain.com/api/analytics/config -H "Authorization: Bearer <token>"
```

It should report `"configured": true` and return the `serviceAccountEmail` to hand to clients.
(`/api/competitors/config`, by contrast, needs no token.)

**Common failures, and what they look like:**
- *403 from Google* → the address was not added as a Viewer on that property. The app turns this
  into that exact instruction.
- *Private key could not be read* → the `\n` sequences were lost when pasting; re-paste the JSON
  exactly as downloaded.

---

### 5. AI wording — Gemini

Used by: AI-written recommendations and the audit copilot.

1. Get a key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`, default `gemini-2.5-flash`).

Without it, recommendations are generated deterministically: same issues, same priorities, plainer
wording. Nothing in the audit is dependent on the model.

**Verify it works:** if a call fails you will see
`Copilot Gemini call failed, using deterministic fallback` in the server log — that means the key is
missing, wrong, or out of quota.

---

### 6. Persistence — where the data lives

All runtime data is JSON files under `DATA_DIR` (`data/` by default). Containers are replaced on
every deploy, so **without a mounted volume you lose every account and payment record**.

```bash
DATA_DIR="/var/data/searchvailable"     # point at a mounted persistent disk
```

See [Deployment](#deployment) for the volume configuration for Render, Railway and Fly.

---

### 7. Reliable scheduling — external cron

Automated monitoring runs on an in-process timer, so it only fires while the server is awake. On
hosts that sleep idle instances (Render's free tier, for example) add an external cron that calls:

```bash
curl -X POST https://your-domain.com/api/monitor/run \
  -H "Authorization: Bearer <a user's session token>"
```

`POST /api/monitor/run` is idempotent per plan interval — it only re-checks businesses that are
actually due, and it respects each plan's monthly allowance, so calling it more often than needed
is harmless. Any scheduler works: a Render Cron Job, a GitHub Action on a schedule, or
[cron-job.org](https://cron-job.org).

> **Caveat:** the endpoint authenticates with a normal session token, and those expire after
> `SESSION_TTL_DAYS` (30 by default). For an unattended cron you will want a long-lived service
> token — that is not built yet, so today you would re-issue the token before it expires.

**Verify it works:** the dashboard shows real *last checked* and *next check due* values. If those
stay at "first check pending" for longer than the plan interval, the cron is not reaching the app.

---

### Not built yet — credentials will be needed when it is

| Feature | Will need | Notes |
|---------|-----------|-------|
| Google Business Profile insights | Google Business Profile API access | Requires an access request to Google; the biggest remaining local-SEO gap |
| Google Search Console data | Search Console API + service account | Would replace inferred impressions with real clicks, queries and coverage errors |
| Google Business Profile insights | Google Business Profile API access | Requires an access request to Google; the biggest remaining local-SEO gap |
| Google Search Console data | Search Console API + service account | Would replace inferred impressions with real clicks and queries |

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

1. In Google Cloud, enable the **Custom Search API** for your project:
   https://console.cloud.google.com/apis/library/customsearch.googleapis.com
2. Create an **API key**: https://console.cloud.google.com/apis/credentials
   (leave it unrestricted, or restrict it by IP — an HTTP-referrer restriction will block a
   server-side call and produce a 403).
3. Create a **Programmable Search Engine**:
   https://programmablesearchengine.google.com/controlpanel/create
   and turn on **"Search the entire web"**. If you skip this, results are limited to a site list
   you provide, and your own domain will never appear.
4. Copy the search engine ID (the `cx` value) from that control panel.
5. Set the env vars:

```bash
GOOGLE_SEARCH_API_KEY=your-key
GOOGLE_SEARCH_ENGINE_ID=your-cx
```

6. Restart the server. The Competitors tab will now return real top-10 results, mark
   your domain with a **YOU** badge, and tell you how many sites are above you.

Optional extras:

```bash
# Point the lookup at a proxy/gateway, or at a stub while testing.
GOOGLE_SEARCH_BASE_URL=https://www.googleapis.com/customsearch/v1
```

> Without these keys the tab clearly reports "ranking data is not connected yet", with the
> setup steps, instead of showing fake positions. The score comparison above still works.
> If Google rejects the key the error is surfaced verbatim, with a hint about the usual
> causes (API not enabled, referrer restriction, quota reached).

---

## Keyword rank tracking

Track the searches that actually matter to a business and watch where it sits over time.

1. Run a ranking check in the Competitors tab ("Check rankings").
2. Press **Track "…"** on the keyword you care about — the first position is recorded immediately.
3. Every scheduled monitoring pass re-checks it and stores a snapshot.

**Requires the Google Custom Search credentials** (`GOOGLE_SEARCH_API_KEY` +
`GOOGLE_SEARCH_ENGINE_ID` — see the [credentials checklist](#credentials--api-keys--the-complete-checklist)).
Without them the tracking controls do not appear at all.

### When an alert is sent

A drop email goes out when the position moves **3 or more places**, or when the site
**falls out of the top 10** entirely. Smaller moves are recorded in the history but do not send
mail — that is normal day-to-day jitter, and emailing about it trains people to ignore alerts.

### Honesty rules

- Positions come only from real search results. A failed check is stored with its error, never as
  a position, so a Google outage cannot look like a ranking collapse.
- Not appearing in the top results is stored as `null` and shown as *"Not in top 10"* — not as a
  drop to last place.
- A drop is only ever reported when there are two real positions to compare.
- If the site *enters* the results, that is recorded as an improvement, not a drop.

### Limits

| Limit | Value | Why |
|-------|-------|-----|
| Keywords per business | 5 | Keeps the daily query count inside Google's free tier |
| History kept | 60 checks per keyword | Roughly a year of weekly checks |
| Plan requirement | Growth and Agency | Free plans have no scheduled checks to attach to |
| Pacing | One query every 600ms | Never bursts through the daily quota |

---
## Plans and limits

| Plan | Price | Audits / month | Businesses | Crawl depth |
|------|-------|----------------|------------|-------------|
| Free | $0 | 1 | 1 | 20 pages |
| Growth | $19 | 12 | 1 | 100 pages (server clamps to 30) |
| Agency | $79 | 200 | 10 | 300 pages (server clamps to 30) |

Plan enforcement is server-side (`server/planEnforcement.ts`).

---

## Accounts: email confirmation and password reset

Registration sets `emailVerified: false` and sends a confirmation link (valid 24 hours).
Until it is confirmed the app shows a prompt with a **Resend link** button, and Settings displays
the address as *Unverified*.

Password reset is a real flow: **Forgot your password?** on the login screen → emailed link
(valid 1 hour) → choose a new password. A completed reset **invalidates every existing session**
for that account.

Both flows use single-use tokens. Only the SHA-256 hash is stored (`data/tokens.json`), so a
leaked data file cannot be replayed against the API.

`/api/auth/forgot-password` always returns the same message, whether or not the address exists,
so it cannot be used to enumerate accounts.

**If no email provider is configured** the server logs the message instead of sending it. Outside
production it also returns the link as `devLink` so you can still complete the flow locally;
in production that field is never returned.

```bash
RESEND_API_KEY=re_xxxxx
EMAIL_FROM="Search Vailable <hello@yourdomain.com>"
APP_URL=https://your-domain.com    # used to build the links in emails
```

---

## Automated monitoring

Paid plans get their businesses re-checked on a schedule. The frequency comes from the plan
itself, so it cannot drift from the pricing table:

| Plan | `monitoringFrequency` | Interval | Sites monitored |
|------|----------------------|----------|-----------------|
| Free | `one-time` | never | 0 |
| Growth | `weekly` | every 7 days | 1 |
| Agency | `automated` | every 1 day | 10 |

How it works (`server/monitor.ts`):

1. The scheduler wakes every `MONITOR_INTERVAL_MINUTES` (default 15).
2. For each stored business it checks whether the plan allows monitoring *and* the last check is
   older than that plan's interval.
3. Due businesses are re-run through the **same audit pipeline** as a manual audit
   (`server/auditPipeline.ts`), so the result is identical in shape.
4. The refreshed audit replaces the stored one and appends a real history entry
   (score, change, fixes detected, new issues).
5. If the score changed and email is configured, an alert is sent.

Scheduled runs draw from the plan's monthly audit allowance, so a plan cannot be drained faster
than its stated limit. They also skip the LLM call and crawl a maximum of 10 pages to stay gentle
on the sites being checked.

The dashboard shows real values — **last checked / next check due** — plus a **Check now** button
(`POST /api/monitor/run`, also plan-gated).

> **Hosting caveat.** This is an in-process timer, so it only runs while the server is awake. On a
> host that sleeps idle instances, add an external cron that calls `POST /api/monitor/run`:
>
> ```bash
> curl -X POST https://your-domain.com/api/monitor/run -H "Authorization: Bearer <token>"
> ```
>
> Set `MONITORING_ENABLED=false` to turn the in-process scheduler off entirely.

---

## Client reports (Agency plan)

`GET /api/reports/:businessId` returns structured JSON. Two HTML variants render the same data as
a branded, print-optimised document:

| Endpoint | Use |
|----------|-----|
| `GET /api/reports/:businessId/view` | Open in a new tab → browser **Print → Save as PDF** |
| `GET /api/reports/:businessId/download` | Download as a self-contained `.html` file |

The report contains the overall score and grade, the four category breakdowns, ranked priority
fixes with recommended actions, the inferred drop-off signals (labelled as inferred), a competitor
comparison when one has been run, score history, passed checks and the full list of what was
checked.

Report generation is gated to the **Agency** plan on the server, not just hidden in the UI. All
scores come from stored audits; nothing is invented. Values from crawled pages are HTML-escaped
before being written into the report.

---

## Google Analytics 4 (measured visitor behaviour)

The drop-off section has two halves and they are deliberately kept apart:

- **Inferred** (`server/dropoff.ts`) — likely causes read from the pages themselves. Always available.
- **Measured** (`server/measuredDropoff.ts`) — what visitors actually did, from the client's own GA4. Only appears once they connect a property.

Connecting changes the numbers from guesses into facts: real bounce rate, engagement
time, worst landing pages, mobile-vs-desktop gaps and which channel's traffic bounces hardest.

### How the credential works

The app uses **one service account for the whole server**, not one per user. That means:

- users never paste a private key into a web form — they enter a numeric property ID
- the credential lives only in the server environment, never in `data/`
- `/api/analytics/config` returns the service-account **email address** so the app can show the
  client exactly what to grant access to

```bash
GA4_SERVICE_ACCOUNT_JSON='{"type":"service_account","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"}'
```

Then each client adds that address as a **Viewer** in GA4 under
*Admin → Property access management*.

The JWT is signed with Node's built-in `crypto` (RS256) — **no new dependency and no interactive
OAuth**. Access tokens are cached until they expire.

### What is checked

| Rule | Fires when |
|------|-----------|
| Single-page visits | Site-wide bounce rate ≥ 60% |
| Worst landing pages | A page's bounce rate ≥ 1.3× the site average, on ≥ 10 sessions |
| Short engagement | Average engagement under 20s |
| Mobile gap | Mobile bounce ≥ 1.25× desktop, both on ≥ 10 sessions |
| Leaky channel | A channel's bounce ≥ 1.3× the site average, on ≥ 10 sessions |
| Funnel concentration | One landing page takes ≥ 70% of all sessions |

**Guard rails.** Nothing is reported below **50 sessions in 28 days** — instead the panel says
plainly that there is not enough data to draw conclusions. Every figure is a comparison against the
client's *own* baseline, not a generic benchmark, and page-level rules require a minimum traffic
threshold so a page with 3 visits is never accused of losing visitors.

Reports fetched from Google are cached for 15 minutes; if a later fetch fails the panel keeps
showing the last good numbers with a warning rather than an error.

A property ID is verified against Google **before** it is saved, and a 403 is turned into the
actionable "add the service-account address as a Viewer" message.

**Without `GA4_SERVICE_ACCOUNT_JSON` the panel does not render at all** — the drop-off section
simply stays in its honest inferred mode, so there is no dead end for the user.

---


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
| POST | `/api/auth/verify-email` | no | Confirm an address from an emailed token |
| POST | `/api/auth/resend-verification` | Bearer | Send a fresh confirmation link |
| GET | `/api/auth/email-status` | Bearer | Whether mail is configured, and if verified |
| POST | `/api/auth/forgot-password` | no | Request a reset link (never reveals if the account exists) |
| POST | `/api/auth/reset-password` | no | Set a new password; invalidates all sessions |

### Reports & monitoring

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/reports/:businessId` | Bearer (Agency) | Structured report JSON |
| GET | `/api/reports/:businessId/view` | Bearer (Agency) | Printable HTML report |
| GET | `/api/reports/:businessId/download` | Bearer (Agency) | HTML report as a download |
| GET | `/api/monitor/status` | Bearer | Last check, next due, allowance used |
| POST | `/api/monitor/run` | Bearer (paid) | Check now; also used by external cron |
| GET | `/api/analytics/config` | Bearer | Whether GA4 is set up, and the address to grant access to |
| GET | `/api/analytics/:businessId` | Bearer | Measured summary + drop-off signals |
| PUT | `/api/analytics/:businessId` | Bearer | Connect a property ID (verified against Google first) |
| DELETE | `/api/analytics/:businessId` | Bearer | Disconnect |
| GET | `/api/rankings/:businessId` | Bearer (paid) | Tracked keywords, positions and movement |
| POST | `/api/rankings/:businessId` | Bearer (paid) | Track a keyword (first reading taken immediately) |
| POST | `/api/rankings/:businessId/refresh` | Bearer (paid) | Re-check every tracked keyword now |
| DELETE | `/api/rankings/:businessId/:keyword` | Bearer (paid) | Stop tracking a keyword |


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
| `data/tokens.json` | Hashed, single-use email tokens (verification + password reset) |
| `data/monitor.json` | Monitoring schedule state: last check, score, monthly allowance used |
| `data/analytics.json` | Connected GA4 property per business + cached summary |
| `data/rankings.json` | Tracked keywords + position history per business |

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
