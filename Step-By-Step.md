# Phase 2 — Booking Completeness (29 files)

**What Phase 2 adds:**

- **2.1 Deposit Enforcement** — `AWAITING_DEPOSIT` booking status, deposit fields on settings
- **2.2 No-Show Automation** — Cron job that marks no-shows, auto-charges Stripe fee
- **2.3 Public Booking Widget** — Anonymous booking via `/api/public/*`, CAPTCHA middleware
- **2.4 Social Booking Links** — `/api/social/*` for Instagram/Facebook shareable URLs
- **2.5 CRM Alerts** — `/api/alerts/*` with booking, customer, and dashboard warnings
- **Bug-audited** — 15 bugs fixed (token validation, tenantId leaks, rate limits, etc.)

**Files:** 8 modified + 21 new = 29 total
**Expected result:** 64 suites, 1254 tests pass, 0 failures, 0 TypeScript errors.

---

## Step 1 — Open Terminal and go to your backend folder

```bash
cd ~/Desktop/Automation/backend
```

---

## Step 2 — Create new directories

These directories are needed for the new modules. If they already exist, that's fine.

```bash
cd ~/Desktop/Automation/backend && \
mkdir -p src/modules/public && \
mkdir -p src/modules/social && \
mkdir -p src/modules/alerts
```

---

## Step 3 — Delete the 8 MODIFIED files that will be replaced

These are existing files that were updated for Phase 2. Delete them first so the
fresh downloads replace them cleanly.

```bash
cd ~/Desktop/Automation/backend && \
rm -f \
  prisma/schema.prisma \
  src/app.ts \
  src/config/businessType.ts \
  src/jobs/index.ts \
  src/modules/bookings/bookings.schema.ts \
  src/modules/bookings/bookings.service.ts \
  src/modules/settings/settings.schema.ts \
  src/modules/webhooks/webhooks.schema.ts
```

---

## Step 4 — Download all 29 Phase 2 files

```bash
cd ~/Desktop/Automation/backend

BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan"

echo ""
echo "=== MODIFIED FILES (8) ==="
echo ""

curl -sfL "${BASE}/backend/prisma/schema.prisma" \
  -o prisma/schema.prisma \
  && echo "OK  1/29  prisma/schema.prisma" \
  || echo "FAILED  1/29  prisma/schema.prisma"

curl -sfL "${BASE}/backend/src/app.ts" \
  -o src/app.ts \
  && echo "OK  2/29  src/app.ts" \
  || echo "FAILED  2/29  src/app.ts"

curl -sfL "${BASE}/backend/src/config/businessType.ts" \
  -o src/config/businessType.ts \
  && echo "OK  3/29  src/config/businessType.ts" \
  || echo "FAILED  3/29  src/config/businessType.ts"

curl -sfL "${BASE}/backend/src/jobs/index.ts" \
  -o src/jobs/index.ts \
  && echo "OK  4/29  src/jobs/index.ts" \
  || echo "FAILED  4/29  src/jobs/index.ts"

curl -sfL "${BASE}/backend/src/modules/bookings/bookings.schema.ts" \
  -o src/modules/bookings/bookings.schema.ts \
  && echo "OK  5/29  src/modules/bookings/bookings.schema.ts" \
  || echo "FAILED  5/29  src/modules/bookings/bookings.schema.ts"

curl -sfL "${BASE}/backend/src/modules/bookings/bookings.service.ts" \
  -o src/modules/bookings/bookings.service.ts \
  && echo "OK  6/29  src/modules/bookings/bookings.service.ts" \
  || echo "FAILED  6/29  src/modules/bookings/bookings.service.ts"

curl -sfL "${BASE}/backend/src/modules/settings/settings.schema.ts" \
  -o src/modules/settings/settings.schema.ts \
  && echo "OK  7/29  src/modules/settings/settings.schema.ts" \
  || echo "FAILED  7/29  src/modules/settings/settings.schema.ts"

curl -sfL "${BASE}/backend/src/modules/webhooks/webhooks.schema.ts" \
  -o src/modules/webhooks/webhooks.schema.ts \
  && echo "OK  8/29  src/modules/webhooks/webhooks.schema.ts" \
  || echo "FAILED  8/29  src/modules/webhooks/webhooks.schema.ts"

echo ""
echo "=== NEW FILES — Middleware (1) ==="
echo ""

curl -sfL "${BASE}/backend/src/middleware/captcha.ts" \
  -o src/middleware/captcha.ts \
  && echo "OK  9/29  src/middleware/captcha.ts" \
  || echo "FAILED  9/29  src/middleware/captcha.ts"

echo ""
echo "=== NEW FILES — No-Show Job (2) ==="
echo ""

curl -sfL "${BASE}/backend/src/jobs/no-show.job.ts" \
  -o src/jobs/no-show.job.ts \
  && echo "OK  10/29  src/jobs/no-show.job.ts" \
  || echo "FAILED  10/29  src/jobs/no-show.job.ts"

curl -sfL "${BASE}/backend/src/jobs/no-show.job.test.ts" \
  -o src/jobs/no-show.job.test.ts \
  && echo "OK  11/29  src/jobs/no-show.job.test.ts" \
  || echo "FAILED  11/29  src/jobs/no-show.job.test.ts"

echo ""
echo "=== NEW FILES — Public Booking Widget (6) ==="
echo ""

curl -sfL "${BASE}/backend/src/modules/public/public.schema.ts" \
  -o src/modules/public/public.schema.ts \
  && echo "OK  12/29  src/modules/public/public.schema.ts" \
  || echo "FAILED  12/29  src/modules/public/public.schema.ts"

curl -sfL "${BASE}/backend/src/modules/public/public.service.ts" \
  -o src/modules/public/public.service.ts \
  && echo "OK  13/29  src/modules/public/public.service.ts" \
  || echo "FAILED  13/29  src/modules/public/public.service.ts"

curl -sfL "${BASE}/backend/src/modules/public/public.controller.ts" \
  -o src/modules/public/public.controller.ts \
  && echo "OK  14/29  src/modules/public/public.controller.ts" \
  || echo "FAILED  14/29  src/modules/public/public.controller.ts"

curl -sfL "${BASE}/backend/src/modules/public/public.routes.ts" \
  -o src/modules/public/public.routes.ts \
  && echo "OK  15/29  src/modules/public/public.routes.ts" \
  || echo "FAILED  15/29  src/modules/public/public.routes.ts"

curl -sfL "${BASE}/backend/src/modules/public/public.service.test.ts" \
  -o src/modules/public/public.service.test.ts \
  && echo "OK  16/29  src/modules/public/public.service.test.ts" \
  || echo "FAILED  16/29  src/modules/public/public.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/public/public.test.ts" \
  -o src/modules/public/public.test.ts \
  && echo "OK  17/29  src/modules/public/public.test.ts" \
  || echo "FAILED  17/29  src/modules/public/public.test.ts"

echo ""
echo "=== NEW FILES — Social Booking Links (5) ==="
echo ""

curl -sfL "${BASE}/backend/src/modules/social/social.schema.ts" \
  -o src/modules/social/social.schema.ts \
  && echo "OK  18/29  src/modules/social/social.schema.ts" \
  || echo "FAILED  18/29  src/modules/social/social.schema.ts"

curl -sfL "${BASE}/backend/src/modules/social/social.service.ts" \
  -o src/modules/social/social.service.ts \
  && echo "OK  19/29  src/modules/social/social.service.ts" \
  || echo "FAILED  19/29  src/modules/social/social.service.ts"

curl -sfL "${BASE}/backend/src/modules/social/social.controller.ts" \
  -o src/modules/social/social.controller.ts \
  && echo "OK  20/29  src/modules/social/social.controller.ts" \
  || echo "FAILED  20/29  src/modules/social/social.controller.ts"

curl -sfL "${BASE}/backend/src/modules/social/social.routes.ts" \
  -o src/modules/social/social.routes.ts \
  && echo "OK  21/29  src/modules/social/social.routes.ts" \
  || echo "FAILED  21/29  src/modules/social/social.routes.ts"

curl -sfL "${BASE}/backend/src/modules/social/social.service.test.ts" \
  -o src/modules/social/social.service.test.ts \
  && echo "OK  22/29  src/modules/social/social.service.test.ts" \
  || echo "FAILED  22/29  src/modules/social/social.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/social/social.test.ts" \
  -o src/modules/social/social.test.ts \
  && echo "OK  23/29  src/modules/social/social.test.ts" \
  || echo "FAILED  23/29  src/modules/social/social.test.ts"

echo ""
echo "=== NEW FILES — CRM Alerts (6) ==="
echo ""

curl -sfL "${BASE}/backend/src/modules/alerts/alerts.schema.ts" \
  -o src/modules/alerts/alerts.schema.ts \
  && echo "OK  24/29  src/modules/alerts/alerts.schema.ts" \
  || echo "FAILED  24/29  src/modules/alerts/alerts.schema.ts"

curl -sfL "${BASE}/backend/src/modules/alerts/alerts.service.ts" \
  -o src/modules/alerts/alerts.service.ts \
  && echo "OK  25/29  src/modules/alerts/alerts.service.ts" \
  || echo "FAILED  25/29  src/modules/alerts/alerts.service.ts"

curl -sfL "${BASE}/backend/src/modules/alerts/alerts.controller.ts" \
  -o src/modules/alerts/alerts.controller.ts \
  && echo "OK  26/29  src/modules/alerts/alerts.controller.ts" \
  || echo "FAILED  26/29  src/modules/alerts/alerts.controller.ts"

curl -sfL "${BASE}/backend/src/modules/alerts/alerts.routes.ts" \
  -o src/modules/alerts/alerts.routes.ts \
  && echo "OK  27/29  src/modules/alerts/alerts.routes.ts" \
  || echo "FAILED  27/29  src/modules/alerts/alerts.routes.ts"

curl -sfL "${BASE}/backend/src/modules/alerts/alerts.service.test.ts" \
  -o src/modules/alerts/alerts.service.test.ts \
  && echo "OK  28/29  src/modules/alerts/alerts.service.test.ts" \
  || echo "FAILED  28/29  src/modules/alerts/alerts.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/alerts/alerts.test.ts" \
  -o src/modules/alerts/alerts.test.ts \
  && echo "OK  29/29  src/modules/alerts/alerts.test.ts" \
  || echo "FAILED  29/29  src/modules/alerts/alerts.test.ts"

echo ""
echo "=== DONE — All 29 files downloaded ==="
```

You should see **`OK`** for all 29 lines. If any say **`FAILED`**, re-run that
single curl line on its own.

---

## Step 5 — Generate Prisma Client (schema changed)

```bash
cd ~/Desktop/Automation/backend
npx prisma generate
```

---

## Step 6 — Run Prisma migration (new fields added)

```bash
cd ~/Desktop/Automation/backend
npx prisma migrate dev --name phase2-booking-completeness
```

If asked "Are you sure you want to create and apply this migration?", type `y` and press Enter.

---

## Step 7 — Run all tests

```bash
cd ~/Desktop/Automation/backend
npx jest --forceExit
```

**Expected result:** **64 suites, 1254 tests pass, 0 failures.**

---

## Complete File Inventory — Phase 2

### Modified files (8) — deleted in Step 3, re-downloaded in Step 4

| # | Path | What changed |
|---|------|--------------|
| 1 | `prisma/schema.prisma` | Added `AWAITING_DEPOSIT` to BookingStatus, `BookingSource` enum, `publicToken`, `source`, `depositAmount`, `depositPaidAt` on Booking, no-show fields on StudioSettings |
| 2 | `src/app.ts` | Mounted `/api/public`, `/api/social`, `/api/alerts` routes |
| 3 | `src/config/businessType.ts` | Added 3 feature flags: `PUBLIC_BOOKING_ENABLED`, `SOCIAL_BOOKING_ENABLED`, `NO_SHOW_AUTOMATION_ENABLED` |
| 4 | `src/jobs/index.ts` | Registered no-show worker |
| 5 | `src/modules/bookings/bookings.schema.ts` | Added `AWAITING_DEPOSIT` to `BOOKING_STATUSES` array |
| 6 | `src/modules/bookings/bookings.service.ts` | `confirmBooking()` + `cancelBooking()` now accept `AWAITING_DEPOSIT` status |
| 7 | `src/modules/settings/settings.schema.ts` | Added no-show fields: `noShowFeeAmount`, `noShowGracePeriodMinutes`, `noShowAutoCharge` |
| 8 | `src/modules/webhooks/webhooks.schema.ts` | Added `booking.no_show` webhook event |

### New files (21) — created in Step 4

| # | Path | Purpose |
|---|------|---------|
| 9 | `src/middleware/captcha.ts` | CAPTCHA verification middleware (Google reCAPTCHA / hCaptcha / Turnstile) |
| 10 | `src/jobs/no-show.job.ts` | BullMQ worker: marks no-shows, charges Stripe fee, sends notification |
| 11 | `src/jobs/no-show.job.test.ts` | 8 unit tests for no-show job |
| 12 | `src/modules/public/public.schema.ts` | Zod schemas for public booking widget API |
| 13 | `src/modules/public/public.service.ts` | Business logic: get info/services/artists/slots, create booking, token lookup |
| 14 | `src/modules/public/public.controller.ts` | HTTP handlers for public endpoints |
| 15 | `src/modules/public/public.routes.ts` | Router: 6 endpoints, rate limiter, CAPTCHA gate |
| 16 | `src/modules/public/public.service.test.ts` | 12 unit tests for public service |
| 17 | `src/modules/public/public.test.ts` | 11 integration tests for /api/public |
| 18 | `src/modules/social/social.schema.ts` | Zod schemas for social booking link API |
| 19 | `src/modules/social/social.service.ts` | Generate booking URLs with UTM, source analytics |
| 20 | `src/modules/social/social.controller.ts` | HTTP handlers for social endpoints |
| 21 | `src/modules/social/social.routes.ts` | Router: 2 endpoints (ADMIN only) |
| 22 | `src/modules/social/social.service.test.ts` | 7 unit tests for social service |
| 23 | `src/modules/social/social.test.ts` | 5 integration tests for /api/social |
| 24 | `src/modules/alerts/alerts.schema.ts` | Zod schemas + alert type definitions |
| 25 | `src/modules/alerts/alerts.service.ts` | Booking/customer/dashboard alert aggregation |
| 26 | `src/modules/alerts/alerts.controller.ts` | HTTP handlers for alert endpoints |
| 27 | `src/modules/alerts/alerts.routes.ts` | Router: 3 endpoints (ARTIST/ADMIN) |
| 28 | `src/modules/alerts/alerts.service.test.ts` | 15 unit tests for alerts service |
| 29 | `src/modules/alerts/alerts.test.ts` | 7 integration tests for /api/alerts |
