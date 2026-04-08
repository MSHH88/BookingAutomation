# Step 1.23 — Stripe Payment Integration

Adds a production-grade Stripe payment layer to the booking system.

**What this step delivers:**
- `POST /api/payments/create-intent` — ADMIN creates a deposit PaymentIntent for a booking
- `POST /api/payments/webhook` — Stripe webhook receiver (signature-verified, raw body)
- `GET  /api/payments/:bookingId/status` — live payment status from Stripe + DB (incl. totalAmount)
- `POST /api/payments/:bookingId/refund` — full or partial deposit refund

**Feature flag:** `ONLINE_PAYMENT_ENABLED`
- Now set to `true` for tattoo_studio, hair_salon, barber, nail_salon, masseuse
- `restaurant` remains `false` (disable per-type in businessType.ts as needed)

**Business logic:**
- Deposit amount = `booking.depositAmount` if set, else `StudioSettings.depositPercentage × totalAmount` (default 20%)
- **Idempotency:** if a PaymentIntent already exists for an unpaid booking, the existing client_secret is returned (no duplicate charges); only creates a new intent when the previous one was cancelled/failed
- Auto-creates or reuses a Stripe Customer by payer email; caches as `User.stripeCustomerId`
- Webhook: `payment_intent.succeeded` → sets `depositPaidAt`, promotes PENDING→CONFIRMED, marks UNPAID invoices PAID
- Webhook: `charge.refunded` → sets `depositRefunded = true`

---

## ALL 10 FILES MUST BE DOWNLOADED

| # | File | New / Modified |
|---|------|---------------|
| 1 | `backend/prisma/schema.prisma` | MODIFIED |
| 2 | `backend/src/lib/stripe.ts` | NEW |
| 3 | `backend/src/modules/payments/payments.schema.ts` | NEW |
| 4 | `backend/src/modules/payments/payments.service.ts` | NEW |
| 5 | `backend/src/modules/payments/payments.controller.ts` | NEW |
| 6 | `backend/src/modules/payments/payments.routes.ts` | NEW |
| 7 | `backend/src/modules/payments/payments.service.test.ts` | NEW |
| 8 | `backend/src/modules/payments/payments.test.ts` | NEW |
| 9 | `backend/src/app.ts` | MODIFIED |
| 10 | `backend/src/config/businessType.ts` | MODIFIED |

---

## STEP 1 — Install the Stripe SDK

```bash
cd ~/Desktop/Automation/backend && npm install stripe@^16.12.0
```

---

## STEP 2 — Delete stale copies of all 10 files

```bash
rm -f ~/Desktop/Automation/backend/prisma/schema.prisma && \
rm -f ~/Desktop/Automation/backend/src/lib/stripe.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/payments/payments.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/payments/payments.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/payments/payments.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/payments/payments.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/payments/payments.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/payments/payments.test.ts && \
rm -f ~/Desktop/Automation/backend/src/app.ts && \
rm -f ~/Desktop/Automation/backend/src/config/businessType.ts
```

---

## STEP 3 — Create required directories

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/payments
```

---

## STEP 4 — Download all 10 files

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/schema.prisma" \
  -o ~/Desktop/Automation/backend/prisma/schema.prisma && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/stripe.ts" \
  -o ~/Desktop/Automation/backend/src/lib/stripe.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/payments/payments.schema.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/payments/payments.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.controller.ts" \
  -o ~/Desktop/Automation/backend/src/modules/payments/payments.controller.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/payments/payments.routes.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/payments/payments.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/payments/payments.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o ~/Desktop/Automation/backend/src/app.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/config/businessType.ts" \
  -o ~/Desktop/Automation/backend/src/config/businessType.ts
```

---

## STEP 5 — Regenerate the Prisma client

The schema adds two new fields (`stripeCustomerId` on User, `stripePaymentIntentId` on Booking).
Regenerate the Prisma client so TypeScript picks up the new types:

```bash
cd ~/Desktop/Automation/backend && npx prisma generate
```

---

## STEP 5b — Run the database migration (live PostgreSQL only)

> **You can skip this step if you are only running tests — tests use a mocked database and do not need a live Postgres connection.**
>
> This step is only required when you want to actually **run the application** and store real payment data.
> It adds two new columns to your live database: `stripeCustomerId` on the `User` table and `stripePaymentIntentId` on the `Booking` table.

**Pre-requisite — your Docker Postgres container must be running first.**

1. Open Docker Desktop on your Mac and confirm the container named `automation_postgres` (or similar) shows **Running**.
2. If it is not running, start it:
   ```bash
   cd ~/Desktop/Automation && docker compose up -d postgres
   ```
3. Confirm Postgres is accepting connections on port **5433**:
   ```bash
   psql -h localhost -p 5433 -U postgres -c "\l"
   ```
   You should see a list of databases including `automation_dev`. If you see a connection error, Docker is not running or the port mapping is wrong — check Docker Desktop.
4. Once Postgres is confirmed running, run the migration:
   ```bash
   cd ~/Desktop/Automation/backend && npx prisma migrate dev --name add-stripe-fields
   ```
   Expected output ends with:
   ```
   The following migration(s) have been applied:
   20xxxxxx_add-stripe-fields
   ✔ Generated Prisma Client
   ```

> **pgAdmin users:** if your pgAdmin "automation dev" server connection is set to port `5432` instead of `5433`, open pgAdmin → right-click the server → Properties → Connection tab → change Port to `5433` and save. This is a pgAdmin display setting only and does not affect the migration command above.

---

## STEP 6 — Add Stripe environment variables to `.env`

> **Do you need to do this step right now?**
> - **For running tests only (Step 7):** ❌ No — you can skip it. The test suite mocks all Stripe calls; no real keys are required and all 790 tests will pass without them.
> - **For actually running the app** (so the payment endpoints work in production or local dev): ✅ Yes — you must add real Stripe keys before starting the server, otherwise every payment API call will fail at startup.

### 6a — Create a free Stripe account (if you don't have one)

Go to [https://stripe.com](https://stripe.com) → click **Start now** → sign up with your email. You do not need to add a bank account to use test mode.

### 6b — Open the Stripe Dashboard

1. Log in at [https://dashboard.stripe.com](https://dashboard.stripe.com).
2. Make sure you are in **Test mode** — look for the **"Test mode"** toggle in the top-right of the dashboard and confirm it is ON (shown in orange). You must be in Test mode to get test API keys.

### 6c — Find your Secret Key and Publishable Key

1. In the left sidebar, click **Developers** (bottom of the left menu).
2. Click **API keys** in the sub-menu that appears.
3. You will see two keys:
   - **Publishable key** — starts with `pk_test_...` — this is safe to expose to a browser/frontend.
   - **Secret key** — starts with `sk_test_...` — **keep this private, never commit it to Git**.
4. Click **Reveal test key** next to the Secret key to see the full value. Copy both keys.

### 6d — Find your Webhook Signing Secret

The webhook secret (`STRIPE_WEBHOOK_SECRET`) is used to verify that incoming webhook events genuinely come from Stripe and have not been tampered with. Without it the `/api/payments/webhook` endpoint will reject every event with a 400 error.

**For local development (recommended first step):**

Install the Stripe CLI: [https://stripe.com/docs/stripe-cli#install](https://stripe.com/docs/stripe-cli#install)

On macOS with Homebrew:
```bash
brew install stripe/stripe-cli/stripe
stripe login
```

Then start forwarding webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

The CLI will print a line like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxx (^C to quit)
```

Copy that `whsec_...` value — that is your `STRIPE_WEBHOOK_SECRET` for local development.

**For production (when deployed):**

1. In the Stripe Dashboard → Developers → **Webhooks**.
2. Click **Add endpoint**.
3. Enter your production URL: `https://yourdomain.com/api/payments/webhook`
4. Under **Events to listen to**, select: `payment_intent.succeeded` and `charge.refunded`.
5. Click **Add endpoint**.
6. On the endpoint detail page, click **Reveal** under **Signing secret** — copy the `whsec_...` value.

### 6e — Add the keys to your `.env` file

Open `~/Desktop/Automation/backend/.env` in any text editor and add these three lines (replace the placeholder values with your real keys from the steps above):

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

Save the file. These values are only read when the server starts — you do not need to restart Docker for this, just restart the Node server.

> ⚠️ **Never commit your `.env` file or your secret keys to Git.** The `.gitignore` already excludes `.env`, but double-check before any push.

---

## STEP 7 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 32 passed, 32 total
Tests:       790 passed, 790 total
```

> **All 790 tests must pass with 0 failures.**  
> Tests mock all Stripe and database calls — they do not require a live Postgres connection or real Stripe keys.

