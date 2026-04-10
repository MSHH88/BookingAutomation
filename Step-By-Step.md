# PHASE 3 — Customer Profile & Safety

**Sub-phases:** 3.1 Health Flags, 3.2 Intake/Consent Forms, 3.3 Before/After Photos, 3.4 Customer LTV/Stats, 3.5 Referral Tracking  
**Files changed:** 36 total (6 modified + 30 new)  
**Feature flags added:** `HEALTH_FLAGS_ENABLED`, `INTAKE_FORMS_ENABLED`, `BOOKING_PHOTOS_ENABLED`, `REFERRALS_ENABLED`  
**Bugs fixed in audit:** 6 (multi-tenant null tenantId bypass ×5, duplicate form submission)  
**Expected result:** 74 suites, 1385 tests pass, 0 failures.

---

## Step 1 — Open Terminal and go to your backend folder

```bash
cd ~/Desktop/Automation/backend
```

---

## Step 2 — Create new module directories

```bash
cd ~/Desktop/Automation/backend && \
mkdir -p src/modules/health-flags && \
mkdir -p src/modules/forms && \
mkdir -p src/modules/booking-photos && \
mkdir -p src/modules/customer-stats && \
mkdir -p src/modules/referrals
```

---

## Step 3 — Delete modified files (to be replaced)

```bash
cd ~/Desktop/Automation/backend && \
rm -f prisma/schema.prisma && \
rm -f src/app.ts && \
rm -f src/config/businessType.ts && \
rm -f src/modules/alerts/alerts.service.ts && \
rm -f src/modules/alerts/alerts.service.test.ts && \
rm -f src/modules/alerts/alerts.test.ts
```

---

## Step 4 — Download all 36 files

```bash
cd ~/Desktop/Automation/backend

# ── Modified files (6) ─────────────────────────────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/schema.prisma" \
  -o prisma/schema.prisma \
  && echo "OK  1/36  prisma/schema.prisma" \
  || echo "FAILED  1/36  prisma/schema.prisma"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o src/app.ts \
  && echo "OK  2/36  src/app.ts" \
  || echo "FAILED  2/36  src/app.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/config/businessType.ts" \
  -o src/config/businessType.ts \
  && echo "OK  3/36  src/config/businessType.ts" \
  || echo "FAILED  3/36  src/config/businessType.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/alerts/alerts.service.ts" \
  -o src/modules/alerts/alerts.service.ts \
  && echo "OK  4/36  src/modules/alerts/alerts.service.ts" \
  || echo "FAILED  4/36  src/modules/alerts/alerts.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/alerts/alerts.service.test.ts" \
  -o src/modules/alerts/alerts.service.test.ts \
  && echo "OK  5/36  src/modules/alerts/alerts.service.test.ts" \
  || echo "FAILED  5/36  src/modules/alerts/alerts.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/alerts/alerts.test.ts" \
  -o src/modules/alerts/alerts.test.ts \
  && echo "OK  6/36  src/modules/alerts/alerts.test.ts" \
  || echo "FAILED  6/36  src/modules/alerts/alerts.test.ts"

# ── 3.1 Health Flags (6 new files) ────────────────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/health-flags/health-flags.schema.ts" \
  -o src/modules/health-flags/health-flags.schema.ts \
  && echo "OK  7/36  src/modules/health-flags/health-flags.schema.ts" \
  || echo "FAILED  7/36  src/modules/health-flags/health-flags.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/health-flags/health-flags.service.ts" \
  -o src/modules/health-flags/health-flags.service.ts \
  && echo "OK  8/36  src/modules/health-flags/health-flags.service.ts" \
  || echo "FAILED  8/36  src/modules/health-flags/health-flags.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/health-flags/health-flags.controller.ts" \
  -o src/modules/health-flags/health-flags.controller.ts \
  && echo "OK  9/36  src/modules/health-flags/health-flags.controller.ts" \
  || echo "FAILED  9/36  src/modules/health-flags/health-flags.controller.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/health-flags/health-flags.routes.ts" \
  -o src/modules/health-flags/health-flags.routes.ts \
  && echo "OK  10/36  src/modules/health-flags/health-flags.routes.ts" \
  || echo "FAILED  10/36  src/modules/health-flags/health-flags.routes.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/health-flags/health-flags.service.test.ts" \
  -o src/modules/health-flags/health-flags.service.test.ts \
  && echo "OK  11/36  src/modules/health-flags/health-flags.service.test.ts" \
  || echo "FAILED  11/36  src/modules/health-flags/health-flags.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/health-flags/health-flags.test.ts" \
  -o src/modules/health-flags/health-flags.test.ts \
  && echo "OK  12/36  src/modules/health-flags/health-flags.test.ts" \
  || echo "FAILED  12/36  src/modules/health-flags/health-flags.test.ts"

# ── 3.2 Intake / Consent Forms (6 new files) ──────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/forms/forms.schema.ts" \
  -o src/modules/forms/forms.schema.ts \
  && echo "OK  13/36  src/modules/forms/forms.schema.ts" \
  || echo "FAILED  13/36  src/modules/forms/forms.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/forms/forms.service.ts" \
  -o src/modules/forms/forms.service.ts \
  && echo "OK  14/36  src/modules/forms/forms.service.ts" \
  || echo "FAILED  14/36  src/modules/forms/forms.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/forms/forms.controller.ts" \
  -o src/modules/forms/forms.controller.ts \
  && echo "OK  15/36  src/modules/forms/forms.controller.ts" \
  || echo "FAILED  15/36  src/modules/forms/forms.controller.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/forms/forms.routes.ts" \
  -o src/modules/forms/forms.routes.ts \
  && echo "OK  16/36  src/modules/forms/forms.routes.ts" \
  || echo "FAILED  16/36  src/modules/forms/forms.routes.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/forms/forms.service.test.ts" \
  -o src/modules/forms/forms.service.test.ts \
  && echo "OK  17/36  src/modules/forms/forms.service.test.ts" \
  || echo "FAILED  17/36  src/modules/forms/forms.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/forms/forms.test.ts" \
  -o src/modules/forms/forms.test.ts \
  && echo "OK  18/36  src/modules/forms/forms.test.ts" \
  || echo "FAILED  18/36  src/modules/forms/forms.test.ts"

# ── 3.3 Before/After Photos (6 new files) ─────────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/booking-photos/booking-photos.schema.ts" \
  -o src/modules/booking-photos/booking-photos.schema.ts \
  && echo "OK  19/36  src/modules/booking-photos/booking-photos.schema.ts" \
  || echo "FAILED  19/36  src/modules/booking-photos/booking-photos.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/booking-photos/booking-photos.service.ts" \
  -o src/modules/booking-photos/booking-photos.service.ts \
  && echo "OK  20/36  src/modules/booking-photos/booking-photos.service.ts" \
  || echo "FAILED  20/36  src/modules/booking-photos/booking-photos.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/booking-photos/booking-photos.controller.ts" \
  -o src/modules/booking-photos/booking-photos.controller.ts \
  && echo "OK  21/36  src/modules/booking-photos/booking-photos.controller.ts" \
  || echo "FAILED  21/36  src/modules/booking-photos/booking-photos.controller.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/booking-photos/booking-photos.routes.ts" \
  -o src/modules/booking-photos/booking-photos.routes.ts \
  && echo "OK  22/36  src/modules/booking-photos/booking-photos.routes.ts" \
  || echo "FAILED  22/36  src/modules/booking-photos/booking-photos.routes.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/booking-photos/booking-photos.service.test.ts" \
  -o src/modules/booking-photos/booking-photos.service.test.ts \
  && echo "OK  23/36  src/modules/booking-photos/booking-photos.service.test.ts" \
  || echo "FAILED  23/36  src/modules/booking-photos/booking-photos.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/booking-photos/booking-photos.test.ts" \
  -o src/modules/booking-photos/booking-photos.test.ts \
  && echo "OK  24/36  src/modules/booking-photos/booking-photos.test.ts" \
  || echo "FAILED  24/36  src/modules/booking-photos/booking-photos.test.ts"

# ── 3.4 Customer LTV / Stats (6 new files) ────────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customer-stats/customer-stats.schema.ts" \
  -o src/modules/customer-stats/customer-stats.schema.ts \
  && echo "OK  25/36  src/modules/customer-stats/customer-stats.schema.ts" \
  || echo "FAILED  25/36  src/modules/customer-stats/customer-stats.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customer-stats/customer-stats.service.ts" \
  -o src/modules/customer-stats/customer-stats.service.ts \
  && echo "OK  26/36  src/modules/customer-stats/customer-stats.service.ts" \
  || echo "FAILED  26/36  src/modules/customer-stats/customer-stats.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customer-stats/customer-stats.controller.ts" \
  -o src/modules/customer-stats/customer-stats.controller.ts \
  && echo "OK  27/36  src/modules/customer-stats/customer-stats.controller.ts" \
  || echo "FAILED  27/36  src/modules/customer-stats/customer-stats.controller.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customer-stats/customer-stats.routes.ts" \
  -o src/modules/customer-stats/customer-stats.routes.ts \
  && echo "OK  28/36  src/modules/customer-stats/customer-stats.routes.ts" \
  || echo "FAILED  28/36  src/modules/customer-stats/customer-stats.routes.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customer-stats/customer-stats.service.test.ts" \
  -o src/modules/customer-stats/customer-stats.service.test.ts \
  && echo "OK  29/36  src/modules/customer-stats/customer-stats.service.test.ts" \
  || echo "FAILED  29/36  src/modules/customer-stats/customer-stats.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customer-stats/customer-stats.test.ts" \
  -o src/modules/customer-stats/customer-stats.test.ts \
  && echo "OK  30/36  src/modules/customer-stats/customer-stats.test.ts" \
  || echo "FAILED  30/36  src/modules/customer-stats/customer-stats.test.ts"

# ── 3.5 Referral Tracking (6 new files) ───────────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/referrals/referrals.schema.ts" \
  -o src/modules/referrals/referrals.schema.ts \
  && echo "OK  31/36  src/modules/referrals/referrals.schema.ts" \
  || echo "FAILED  31/36  src/modules/referrals/referrals.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/referrals/referrals.service.ts" \
  -o src/modules/referrals/referrals.service.ts \
  && echo "OK  32/36  src/modules/referrals/referrals.service.ts" \
  || echo "FAILED  32/36  src/modules/referrals/referrals.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/referrals/referrals.controller.ts" \
  -o src/modules/referrals/referrals.controller.ts \
  && echo "OK  33/36  src/modules/referrals/referrals.controller.ts" \
  || echo "FAILED  33/36  src/modules/referrals/referrals.controller.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/referrals/referrals.routes.ts" \
  -o src/modules/referrals/referrals.routes.ts \
  && echo "OK  34/36  src/modules/referrals/referrals.routes.ts" \
  || echo "FAILED  34/36  src/modules/referrals/referrals.routes.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/referrals/referrals.service.test.ts" \
  -o src/modules/referrals/referrals.service.test.ts \
  && echo "OK  35/36  src/modules/referrals/referrals.service.test.ts" \
  || echo "FAILED  35/36  src/modules/referrals/referrals.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/referrals/referrals.test.ts" \
  -o src/modules/referrals/referrals.test.ts \
  && echo "OK  36/36  src/modules/referrals/referrals.test.ts" \
  || echo "FAILED  36/36  src/modules/referrals/referrals.test.ts"
```

You should see **OK** for all 36 files. If any say **FAILED**, re-run that specific curl line.

---

## Step 5 — Generate Prisma client and run migrations

```bash
cd ~/Desktop/Automation/backend && \
npx prisma generate && \
npx prisma migrate dev --name phase3-customer-profile-safety
```

---

## Step 6 — Run all tests

```bash
cd ~/Desktop/Automation/backend
npx jest --forceExit
```

**Expected result:** **74 suites, 1385/1385 tests pass, 0 failures.**

---

## What was changed — Complete file manifest

### Modified files (6)

| # | Path | What changed |
|---|------|--------------|
| 1 | `prisma/schema.prisma` | Added `HealthFlag`, `HealthFlagType`, `HealthFlagSeverity`, `Form`, `FormResponse`, `BookingPhoto`, `PhotoType`, `Referral` models; `AWAITING_FORM` to `BookingStatus` enum; `referralCode` on `User` |
| 2 | `src/app.ts` | Mount 5 new route modules: `/api/health-flags`, `/api/forms`, `/api/booking-photos`, `/api/customer-stats`, `/api/referrals` |
| 3 | `src/config/businessType.ts` | Added 4 feature flags: `HEALTH_FLAGS_ENABLED`, `INTAKE_FORMS_ENABLED`, `BOOKING_PHOTOS_ENABLED`, `REFERRALS_ENABLED` |
| 4 | `src/modules/alerts/alerts.service.ts` | Added `HEALTH_FLAG` alert type — checks customer health flags when generating booking alerts |
| 5 | `src/modules/alerts/alerts.service.test.ts` | Added unit tests for HEALTH_FLAG alert integration; fixed timezone-safe DOB creation |
| 6 | `src/modules/alerts/alerts.test.ts` | Added integration test for HEALTH_FLAG alert in booking alerts endpoint |

### New files (30)

| # | Path | Module |
|---|------|--------|
| 7 | `src/modules/health-flags/health-flags.schema.ts` | 3.1 Health Flags |
| 8 | `src/modules/health-flags/health-flags.service.ts` | 3.1 Health Flags |
| 9 | `src/modules/health-flags/health-flags.controller.ts` | 3.1 Health Flags |
| 10 | `src/modules/health-flags/health-flags.routes.ts` | 3.1 Health Flags |
| 11 | `src/modules/health-flags/health-flags.service.test.ts` | 3.1 Health Flags |
| 12 | `src/modules/health-flags/health-flags.test.ts` | 3.1 Health Flags |
| 13 | `src/modules/forms/forms.schema.ts` | 3.2 Intake Forms |
| 14 | `src/modules/forms/forms.service.ts` | 3.2 Intake Forms |
| 15 | `src/modules/forms/forms.controller.ts` | 3.2 Intake Forms |
| 16 | `src/modules/forms/forms.routes.ts` | 3.2 Intake Forms |
| 17 | `src/modules/forms/forms.service.test.ts` | 3.2 Intake Forms |
| 18 | `src/modules/forms/forms.test.ts` | 3.2 Intake Forms |
| 19 | `src/modules/booking-photos/booking-photos.schema.ts` | 3.3 Photos |
| 20 | `src/modules/booking-photos/booking-photos.service.ts` | 3.3 Photos |
| 21 | `src/modules/booking-photos/booking-photos.controller.ts` | 3.3 Photos |
| 22 | `src/modules/booking-photos/booking-photos.routes.ts` | 3.3 Photos |
| 23 | `src/modules/booking-photos/booking-photos.service.test.ts` | 3.3 Photos |
| 24 | `src/modules/booking-photos/booking-photos.test.ts` | 3.3 Photos |
| 25 | `src/modules/customer-stats/customer-stats.schema.ts` | 3.4 Customer LTV |
| 26 | `src/modules/customer-stats/customer-stats.service.ts` | 3.4 Customer LTV |
| 27 | `src/modules/customer-stats/customer-stats.controller.ts` | 3.4 Customer LTV |
| 28 | `src/modules/customer-stats/customer-stats.routes.ts` | 3.4 Customer LTV |
| 29 | `src/modules/customer-stats/customer-stats.service.test.ts` | 3.4 Customer LTV |
| 30 | `src/modules/customer-stats/customer-stats.test.ts` | 3.4 Customer LTV |
| 31 | `src/modules/referrals/referrals.schema.ts` | 3.5 Referrals |
| 32 | `src/modules/referrals/referrals.service.ts` | 3.5 Referrals |
| 33 | `src/modules/referrals/referrals.controller.ts` | 3.5 Referrals |
| 34 | `src/modules/referrals/referrals.routes.ts` | 3.5 Referrals |
| 35 | `src/modules/referrals/referrals.service.test.ts` | 3.5 Referrals |
| 36 | `src/modules/referrals/referrals.test.ts` | 3.5 Referrals |

### Bug audit fixes applied

| Bug | Severity | Fix |
|-----|----------|-----|
| BUG-A | CRITICAL | Multi-tenant null tenantId bypass in health-flags — changed `entity.tenantId && entity.tenantId !== tenantId` to `entity.tenantId !== tenantId` |
| BUG-B | CRITICAL | Same null bypass in forms.service.ts (4 locations) |
| BUG-C | CRITICAL | Same null bypass in booking-photos.service.ts (3 locations) |
| BUG-D | CRITICAL | Same null bypass in customer-stats.service.ts (1 location) |
| BUG-E | CRITICAL | Same null bypass in referrals.service.ts (2 locations) |
| BUG-F | HIGH | Duplicate form submission — added `findFirst` check before creating response in `submitPublicForm()` |
