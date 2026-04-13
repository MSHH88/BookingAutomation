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
# 1/28 — prisma/schema.prisma (modified — adds Package, CustomerPackage, Membership, CustomerMembership, LoyaltyAccount, LoyaltyTransaction models + WaitlistEntry timePreference/notificationExpiry fields)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/schema.prisma" \
  -o prisma/schema.prisma && echo "1/28 OK" || echo "1/28 FAILED"

# 2/28 — src/app.ts (modified — registers /api/packages, /api/memberships, /api/loyalty, /api/me/packages, /api/me/memberships, /api/customers/:id/packages, /api/customers/:id/memberships routes)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o src/app.ts && echo "2/28 OK" || echo "2/28 FAILED"

# 3/28 — src/config/businessType.ts (modified — adds PACKAGES_ENABLED, MEMBERSHIPS_ENABLED, LOYALTY_ENABLED flags)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/config/businessType.ts" \
  -o src/config/businessType.ts && echo "3/28 OK" || echo "3/28 FAILED"

# 4/28 — src/jobs/index.ts (modified — starts waitlist match worker)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/jobs/index.ts" \
  -o src/jobs/index.ts && echo "4/28 OK" || echo "4/28 FAILED"

# 5/28 — src/modules/bookings/bookings.service.ts (modified — deducts package use on confirm + awards loyalty points on complete + smart waitlist matching on cancel)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.ts" \
  -o src/modules/bookings/bookings.service.ts && echo "5/28 OK" || echo "5/28 FAILED"

# 6/28 — src/modules/bookings/bookings.service.test.ts (modified — adds mocks for packages/loyalty services)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.test.ts" \
  -o src/modules/bookings/bookings.service.test.ts && echo "6/28 OK" || echo "6/28 FAILED"

# 7/28 — src/modules/waitlist/waitlist.schema.ts (modified — adds timePreference field to JoinWaitlistBody)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.schema.ts" \
  -o src/modules/waitlist/waitlist.schema.ts && echo "7/28 OK" || echo "7/28 FAILED"

# 8/28 — src/modules/waitlist/waitlist.service.ts (modified — adds matchAndNotify() smart matching logic)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.service.ts" \
  -o src/modules/waitlist/waitlist.service.ts && echo "8/28 OK" || echo "8/28 FAILED"

# 9/28 — src/modules/waitlist/waitlist.service.test.ts (modified — adds timePreference to fixtures + matchAndNotify tests)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.service.test.ts" \
  -o src/modules/waitlist/waitlist.service.test.ts && echo "9/28 OK" || echo "9/28 FAILED"

# 10/28 — src/jobs/waitlist-match.job.ts (new — BullMQ worker for waitlist notification expiry)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/jobs/waitlist-match.job.ts" \
  -o src/jobs/waitlist-match.job.ts && echo "10/28 OK" || echo "10/28 FAILED"

# 11/28 — src/modules/packages/packages.schema.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.schema.ts" \
  -o src/modules/packages/packages.schema.ts && echo "11/28 OK" || echo "11/28 FAILED"

# 12/28 — src/modules/packages/packages.service.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.service.ts" \
  -o src/modules/packages/packages.service.ts && echo "12/28 OK" || echo "12/28 FAILED"

# 13/28 — src/modules/packages/packages.controller.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.controller.ts" \
  -o src/modules/packages/packages.controller.ts && echo "13/28 OK" || echo "13/28 FAILED"

# 14/28 — src/modules/packages/packages.routes.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.routes.ts" \
  -o src/modules/packages/packages.routes.ts && echo "14/28 OK" || echo "14/28 FAILED"

# 15/28 — src/modules/packages/packages.service.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.service.test.ts" \
  -o src/modules/packages/packages.service.test.ts && echo "15/28 OK" || echo "15/28 FAILED"

# 16/28 — src/modules/packages/packages.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.test.ts" \
  -o src/modules/packages/packages.test.ts && echo "16/28 OK" || echo "16/28 FAILED"

# 17/28 — src/modules/memberships/memberships.schema.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.schema.ts" \
  -o src/modules/memberships/memberships.schema.ts && echo "17/28 OK" || echo "17/28 FAILED"

# 18/28 — src/modules/memberships/memberships.service.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.service.ts" \
  -o src/modules/memberships/memberships.service.ts && echo "18/28 OK" || echo "18/28 FAILED"

# 19/28 — src/modules/memberships/memberships.controller.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.controller.ts" \
  -o src/modules/memberships/memberships.controller.ts && echo "19/28 OK" || echo "19/28 FAILED"

# 20/28 — src/modules/memberships/memberships.routes.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.routes.ts" \
  -o src/modules/memberships/memberships.routes.ts && echo "20/28 OK" || echo "20/28 FAILED"

# 21/28 — src/modules/memberships/memberships.service.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.service.test.ts" \
  -o src/modules/memberships/memberships.service.test.ts && echo "21/28 OK" || echo "21/28 FAILED"

# 22/28 — src/modules/memberships/memberships.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.test.ts" \
  -o src/modules/memberships/memberships.test.ts && echo "22/28 OK" || echo "22/28 FAILED"

# 23/28 — src/modules/loyalty/loyalty.schema.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.schema.ts" \
  -o src/modules/loyalty/loyalty.schema.ts && echo "23/28 OK" || echo "23/28 FAILED"

# 24/28 — src/modules/loyalty/loyalty.service.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.service.ts" \
  -o src/modules/loyalty/loyalty.service.ts && echo "24/28 OK" || echo "24/28 FAILED"

# 25/28 — src/modules/loyalty/loyalty.controller.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.controller.ts" \
  -o src/modules/loyalty/loyalty.controller.ts && echo "25/28 OK" || echo "25/28 FAILED"

# 26/28 — src/modules/loyalty/loyalty.routes.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.routes.ts" \
  -o src/modules/loyalty/loyalty.routes.ts && echo "26/28 OK" || echo "26/28 FAILED"

# 27/28 — src/modules/loyalty/loyalty.service.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.service.test.ts" \
  -o src/modules/loyalty/loyalty.service.test.ts && echo "27/28 OK" || echo "27/28 FAILED"

# 28/28 — src/modules/loyalty/loyalty.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.test.ts" \
  -o src/modules/loyalty/loyalty.test.ts && echo "28/28 OK" || echo "28/28 FAILED"
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
