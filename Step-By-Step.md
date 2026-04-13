# PHASE 5 — Packages, Loyalty & Retention

**Sub-phases:** 5.1 Service Packages / Bundles, 5.2 Memberships / Subscriptions, 5.3 Loyalty / Points Program, 5.4 Smart Waitlist Matching  
**Files changed:** 28 total (9 modified + 19 new)  
**Feature flags added:** `PACKAGES_ENABLED`, `MEMBERSHIPS_ENABLED`, `LOYALTY_ENABLED`  
**Expected result:** 88 suites, 1551 tests pass, 0 failures.

---

## Step 1 — Open Terminal and go to your backend folder

```bash
cd ~/Desktop/Automation/backend
```

---

## Step 2 — Create new module directories

```bash
cd ~/Desktop/Automation/backend && \
mkdir -p src/modules/packages && \
mkdir -p src/modules/memberships && \
mkdir -p src/modules/loyalty
```

---

## Step 3 — Remove files that will be re-created (modified files)

```bash
cd ~/Desktop/Automation/backend && \
rm -f prisma/schema.prisma && \
rm -f src/app.ts && \
rm -f src/config/businessType.ts && \
rm -f src/jobs/index.ts && \
rm -f src/modules/bookings/bookings.service.ts && \
rm -f src/modules/bookings/bookings.service.test.ts && \
rm -f src/modules/waitlist/waitlist.schema.ts && \
rm -f src/modules/waitlist/waitlist.service.ts && \
rm -f src/modules/waitlist/waitlist.service.test.ts && \
rm -f src/jobs/waitlist-match.job.ts
```

---

## Step 4 — Download all files (1/28 to 28/28)

```bash
curl -sfL -o prisma/schema.prisma "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/schema.prisma" && echo "OK 1/28 schema.prisma" || echo "FAILED 1/28 schema.prisma"
curl -sfL -o src/app.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" && echo "OK 2/28 app.ts" || echo "FAILED 2/28 app.ts"
curl -sfL -o src/config/businessType.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/config/businessType.ts" && echo "OK 3/28 businessType.ts" || echo "FAILED 3/28 businessType.ts"
curl -sfL -o src/jobs/index.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/jobs/index.ts" && echo "OK 4/28 jobs/index.ts" || echo "FAILED 4/28 jobs/index.ts"
curl -sfL -o src/modules/bookings/bookings.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.ts" && echo "OK 5/28 bookings.service.ts" || echo "FAILED 5/28 bookings.service.ts"
curl -sfL -o src/modules/bookings/bookings.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.test.ts" && echo "OK 6/28 bookings.service.test.ts" || echo "FAILED 6/28 bookings.service.test.ts"
curl -sfL -o src/modules/waitlist/waitlist.schema.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.schema.ts" && echo "OK 7/28 waitlist.schema.ts" || echo "FAILED 7/28 waitlist.schema.ts"
curl -sfL -o src/modules/waitlist/waitlist.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.service.ts" && echo "OK 8/28 waitlist.service.ts" || echo "FAILED 8/28 waitlist.service.ts"
curl -sfL -o src/modules/waitlist/waitlist.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.service.test.ts" && echo "OK 9/28 waitlist.service.test.ts" || echo "FAILED 9/28 waitlist.service.test.ts"
curl -sfL -o src/jobs/waitlist-match.job.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/jobs/waitlist-match.job.ts" && echo "OK 10/28 waitlist-match.job.ts" || echo "FAILED 10/28 waitlist-match.job.ts"
curl -sfL -o src/modules/packages/packages.schema.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.schema.ts" && echo "OK 11/28 packages.schema.ts" || echo "FAILED 11/28 packages.schema.ts"
curl -sfL -o src/modules/packages/packages.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.service.ts" && echo "OK 12/28 packages.service.ts" || echo "FAILED 12/28 packages.service.ts"
curl -sfL -o src/modules/packages/packages.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.controller.ts" && echo "OK 13/28 packages.controller.ts" || echo "FAILED 13/28 packages.controller.ts"
curl -sfL -o src/modules/packages/packages.routes.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.routes.ts" && echo "OK 14/28 packages.routes.ts" || echo "FAILED 14/28 packages.routes.ts"
curl -sfL -o src/modules/packages/packages.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.service.test.ts" && echo "OK 15/28 packages.service.test.ts" || echo "FAILED 15/28 packages.service.test.ts"
curl -sfL -o src/modules/packages/packages.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.test.ts" && echo "OK 16/28 packages.test.ts" || echo "FAILED 16/28 packages.test.ts"
curl -sfL -o src/modules/memberships/memberships.schema.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.schema.ts" && echo "OK 17/28 memberships.schema.ts" || echo "FAILED 17/28 memberships.schema.ts"
curl -sfL -o src/modules/memberships/memberships.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.service.ts" && echo "OK 18/28 memberships.service.ts" || echo "FAILED 18/28 memberships.service.ts"
curl -sfL -o src/modules/memberships/memberships.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.controller.ts" && echo "OK 19/28 memberships.controller.ts" || echo "FAILED 19/28 memberships.controller.ts"
curl -sfL -o src/modules/memberships/memberships.routes.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.routes.ts" && echo "OK 20/28 memberships.routes.ts" || echo "FAILED 20/28 memberships.routes.ts"
curl -sfL -o src/modules/memberships/memberships.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.service.test.ts" && echo "OK 21/28 memberships.service.test.ts" || echo "FAILED 21/28 memberships.service.test.ts"
curl -sfL -o src/modules/memberships/memberships.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.test.ts" && echo "OK 22/28 memberships.test.ts" || echo "FAILED 22/28 memberships.test.ts"
curl -sfL -o src/modules/loyalty/loyalty.schema.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.schema.ts" && echo "OK 23/28 loyalty.schema.ts" || echo "FAILED 23/28 loyalty.schema.ts"
curl -sfL -o src/modules/loyalty/loyalty.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.service.ts" && echo "OK 24/28 loyalty.service.ts" || echo "FAILED 24/28 loyalty.service.ts"
curl -sfL -o src/modules/loyalty/loyalty.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.controller.ts" && echo "OK 25/28 loyalty.controller.ts" || echo "FAILED 25/28 loyalty.controller.ts"
curl -sfL -o src/modules/loyalty/loyalty.routes.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.routes.ts" && echo "OK 26/28 loyalty.routes.ts" || echo "FAILED 26/28 loyalty.routes.ts"
curl -sfL -o src/modules/loyalty/loyalty.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.service.test.ts" && echo "OK 27/28 loyalty.service.test.ts" || echo "FAILED 27/28 loyalty.service.test.ts"
curl -sfL -o src/modules/loyalty/loyalty.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.test.ts" && echo "OK 28/28 loyalty.test.ts" || echo "FAILED 28/28 loyalty.test.ts"
```

---

## Step 5 — Apply Prisma migration

```bash
cd ~/Desktop/Automation/backend && \
npx prisma generate && \
npx prisma migrate dev --name phase5_packages_memberships_loyalty_waitlist
```

---

## Step 6 — Run tests

```bash
cd ~/Desktop/Automation/backend && \
npx jest --clearCache --silent && \
npx jest --passWithNoTests
```

**Expected output:** 88 suites, 1551/1551 tests, 0 failures.

---

## To delete all Phase 5 files (clean-up / rollback)

```bash
cd ~/Desktop/Automation/backend && \
rm -f src/jobs/waitlist-match.job.ts && \
rm -f src/modules/packages/packages.schema.ts && \
rm -f src/modules/packages/packages.service.ts && \
rm -f src/modules/packages/packages.controller.ts && \
rm -f src/modules/packages/packages.routes.ts && \
rm -f src/modules/packages/packages.service.test.ts && \
rm -f src/modules/packages/packages.test.ts && \
rm -f src/modules/memberships/memberships.schema.ts && \
rm -f src/modules/memberships/memberships.service.ts && \
rm -f src/modules/memberships/memberships.controller.ts && \
rm -f src/modules/memberships/memberships.routes.ts && \
rm -f src/modules/memberships/memberships.service.test.ts && \
rm -f src/modules/memberships/memberships.test.ts && \
rm -f src/modules/loyalty/loyalty.schema.ts && \
rm -f src/modules/loyalty/loyalty.service.ts && \
rm -f src/modules/loyalty/loyalty.controller.ts && \
rm -f src/modules/loyalty/loyalty.routes.ts && \
rm -f src/modules/loyalty/loyalty.service.test.ts && \
rm -f src/modules/loyalty/loyalty.test.ts && \
rmdir src/modules/packages src/modules/memberships src/modules/loyalty 2>/dev/null; true
```

> **Note:** Modified files (`prisma/schema.prisma`, `src/app.ts`, `src/config/businessType.ts`, `src/jobs/index.ts`, `src/modules/bookings/bookings.service.ts`, `src/modules/bookings/bookings.service.test.ts`, `src/modules/waitlist/waitlist.schema.ts`, `src/modules/waitlist/waitlist.service.ts`, `src/modules/waitlist/waitlist.service.test.ts`) must be restored from the previous phase's versions — they are not deleted here to avoid data loss.
