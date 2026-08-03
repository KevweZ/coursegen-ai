# Stripe launch checklist — NexCourse AI

Default: **test mode** (`STRIPE_MODE=test`). Live is a deliberate flip, not the day-to-day admin default.

Admin QA of Free / Creator / Team Account UI does **not** need live Stripe — use **My Account → Admin account views**.

---

## Architecture note (important)

One Render API process uses **one** Stripe mode at a time.

| Goal | How |
|------|-----|
| Admin QA without paying | Account view switcher (Free / Creator / Team preview) |
| Test real Checkout / webhooks / portal | `STRIPE_MODE=test` + test Price IDs + `sk_test_` |
| Real customer charges | Flip `STRIPE_MODE=live` + live Price IDs + `sk_live_` + live webhook |

You cannot have “admin on test, customers on live” on the same server simultaneously. Keep production on **test** until launch day, then flip once.

---

## A. Pre-flight (test mode) — do these first

### 1. Pricing + Checkout smoke test
- [x] Creator annual → Stripe Checkout URL
- [x] Creator monthly → Stripe Checkout URL
- [x] Team annual → Stripe Checkout URL
- [ ] Complete a **test** payment with card `4242 4242 4242 4242`
- [ ] Land on `/payment-success`
- [ ] My Account shows correct plan + credit balances

### 2. Webhook grants credits / Team workspace
After a test Team (or Creator) checkout completes:

- [ ] Stripe Dashboard → Developers → Webhooks → endpoint for `https://nexcourse-ai-api.onrender.com/api/payments/webhook` shows **checkout.session.completed** = succeeded
- [ ] Supabase `user_entitlements` row updated (`subscription`, `credits_ai`, `credits_tts`, `stripe_customer_id`)
- [ ] Team only: `workspaces` + `workspace_members` owner row created
- [ ] My Account → Team seats panel shows you as owner (real data, not demo)

If webhook signatures fail: confirm raw-body middleware is deployed and `STRIPE_WEBHOOK_SECRET_TEST` matches the **test** endpoint signing secret.

### 3. Cancel / billing portal
- [ ] After a test subscription, open Pricing or Account → **Manage Subscription**
- [ ] Stripe Customer Portal opens
- [ ] Cancel subscription (or schedule cancel at period end)
- [ ] Return URL lands on `/account`
- [ ] After `customer.subscription.deleted` webhook: plan returns to free; Team workspace `status=cancelled`

Stripe Dashboard → Settings → Billing → Customer portal: enable cancel, invoices, payment method update.

### 4. Support / refund path (policy)
- Support inbox: **support@nexcourse.ai**
- Cancel anytime via billing portal (access through paid period)
- Refunds: email support within **14 days** of charge; case-by-case (unused credits / first-time charges prioritized)
- Pricing FAQ + Help widget should match this policy
- [ ] Decide who answers refund emails (you) and max turnaround (e.g. 2 business days)
- [ ] In Stripe Dashboard, practice issuing a **test** refund once

### 5. Accidental real charges
- Keep `STRIPE_MODE=test` on Render until launch
- Never paste `sk_live_` into the active `STRIPE_SECRET_KEY` while still QAing
- Admin previews do not create charges

---

## B. Prepare live (without turning it on)

1. Stripe Dashboard → toggle to **Live**
2. Create live webhook endpoint → same URL `/api/payments/webhook` → copy `whsec_…` → `STRIPE_WEBHOOK_SECRET_LIVE`
3. Put `STRIPE_SECRET_KEY_LIVE=sk_live_…` in local `.env` (never commit)
4. Run: `node stripe_create_v2_prices.mjs --live`
5. Copy printed `STRIPE_PRICE_*_LIVE` values into Render **Environment** (do **not** set `STRIPE_MODE=live` yet)
6. Also store on Render (inactive until flip):
   - `STRIPE_SECRET_KEY_LIVE`
   - `STRIPE_WEBHOOK_SECRET_LIVE`
   - all `STRIPE_PRICE_*_LIVE`
7. Keep active:
   - `STRIPE_MODE=test`
   - `STRIPE_SECRET_KEY_TEST` / `STRIPE_WEBHOOK_SECRET_TEST` / `STRIPE_PRICE_*_TEST` (or unsuffixed aliases)

### Confirm live keys are stored (still test-active)
```
GET https://nexcourse-ai-api.onrender.com/api/health
```
Expect: `"stripe_mode":"test"` and price flags true for test prices.

---

## C. Flip to live (launch day)

1. Render env: `STRIPE_MODE=live`
2. Redeploy API
3. Health check: `"stripe_mode":"live"`
4. One real $ checkout with your own card on Creator monthly (easiest to refund) → verify webhook + Account
5. Refund that charge from Stripe Dashboard (proves refund path)
6. Announce paid plans

### Flip back to test
Set `STRIPE_MODE=test` → redeploy. Existing live customers would stop billing against live until you flip back — only do this before you have real subscribers.

---

## Render env reference

```
STRIPE_MODE=test

# Active while test:
STRIPE_SECRET_KEY_TEST=sk_test_…
STRIPE_WEBHOOK_SECRET_TEST=whsec_…
STRIPE_PRICE_PRO_CREATOR_ANNUAL_TEST=price_…
STRIPE_PRICE_PRO_CREATOR_MONTHLY_TEST=price_…
STRIPE_PRICE_BUSINESS_TEAM_ANNUAL_TEST=price_…
STRIPE_PRICE_CREDITS_STANDARD_TEST=price_…   # or unsuffixed
STRIPE_PRICE_CREDITS_VOLUME_TEST=price_…

# Staged for flip (unused until STRIPE_MODE=live):
STRIPE_SECRET_KEY_LIVE=sk_live_…
STRIPE_WEBHOOK_SECRET_LIVE=whsec_…
STRIPE_PRICE_PRO_CREATOR_ANNUAL_LIVE=price_…
STRIPE_PRICE_PRO_CREATOR_MONTHLY_LIVE=price_…
STRIPE_PRICE_BUSINESS_TEAM_ANNUAL_LIVE=price_…
STRIPE_PRICE_CREDITS_STANDARD_LIVE=price_…
STRIPE_PRICE_CREDITS_VOLUME_LIVE=price_…
```

Legacy unsuffixed `STRIPE_SECRET_KEY` / `STRIPE_PRICE_*` still work as fallbacks for the active mode.
