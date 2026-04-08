# Step 1.23 — Stripe Payment Integration

Adds a production-grade Stripe payment layer to the booking system.

**What this step delivers:**
- `POST /api/payments/create-intent` — ADMIN creates a deposit PaymentIntent for a booking
- `POST /api/payments/webhook` — Stripe webhook receiver (signature-verified, raw body)
- `GET  /api/payments/:bookingId/status` — live payment status from Stripe + DB
- `POST /api/payments/:bookingId/refund` — full or partial deposit refund

**Feature flag:** `ONLINE_PAYMENT_ENABLED`
- Now set to `true` for tattoo_studio, hair_salon, barber, nail_salon, masseuse
- `restaurant` remains `false` (disable per-type in businessType.ts as needed)

**Business logic:**
- Deposit amount = `booking.depositAmount` if set, else `StudioSettings.depositPercentage × totalAmount` (default 20%)
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

## STEP 5b — Run the database migration (if using a live PostgreSQL)

> **Skip this step if you are running tests only (mocked DB).**

```bash
cd ~/Desktop/Automation/backend && npx prisma migrate dev --name add-stripe-fields
```

---

## STEP 6 — Add Stripe environment variables to `.env`

Open `~/Desktop/Automation/backend/.env` and add:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

> Obtain these from your [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys).
> For local webhook testing use [Stripe CLI](https://stripe.com/docs/stripe-cli):
> `stripe listen --forward-to localhost:3000/api/payments/webhook`

---

## STEP 7 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 32 passed, 32 total
Tests:       788 passed, 788 total
```

> **All 788 tests must pass with 0 failures.**
