# PHASE 5 — Packages, Loyalty & Retention

**Sub-phases:** 5.1 Service Packages / Bundles, 5.2 Memberships / Subscriptions, 5.3 Loyalty / Points Program, 5.4 Smart Waitlist Matching  
**Files changed:** 26 total (5 modified + 21 new)  
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
rm -f src/modules/waitlist/waitlist.schema.ts && \
rm -f src/modules/waitlist/waitlist.service.ts && \
rm -f src/modules/waitlist/waitlist.service.test.ts && \
rm -f src/jobs/waitlist-match.job.ts
```

---

## Step 4 — Download all files (1/26 to 26/26)

```bash
# 1/26 — prisma/schema.prisma (modified — adds Package, CustomerPackage, Membership, CustomerMembership, LoyaltyAccount, LoyaltyTransaction models + WaitlistEntry timePreference/notificationExpiry fields)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/schema.prisma" \
  -o prisma/schema.prisma && echo "1/26 OK" || echo "1/26 FAILED"

# 2/26 — src/app.ts (modified — registers /api/packages, /api/memberships, /api/loyalty routes)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o src/app.ts && echo "2/26 OK" || echo "2/26 FAILED"

# 3/26 — src/config/businessType.ts (modified — adds PACKAGES_ENABLED, MEMBERSHIPS_ENABLED, LOYALTY_ENABLED flags)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/config/businessType.ts" \
  -o src/config/businessType.ts && echo "3/26 OK" || echo "3/26 FAILED"

# 4/26 — src/jobs/index.ts (modified — starts waitlist match worker)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/jobs/index.ts" \
  -o src/jobs/index.ts && echo "4/26 OK" || echo "4/26 FAILED"

# 5/26 — src/modules/bookings/bookings.service.ts (modified — deduct package use + award loyalty points + membership coverage check on booking)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.ts" \
  -o src/modules/bookings/bookings.service.ts && echo "5/26 OK" || echo "5/26 FAILED"

# 6/26 — src/modules/waitlist/waitlist.schema.ts (modified — adds timePreference field to JoinWaitlistBody)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.schema.ts" \
  -o src/modules/waitlist/waitlist.schema.ts && echo "6/26 OK" || echo "6/26 FAILED"

# 7/26 — src/modules/waitlist/waitlist.service.ts (modified — adds matchAndNotify() smart matching logic)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.service.ts" \
  -o src/modules/waitlist/waitlist.service.ts && echo "7/26 OK" || echo "7/26 FAILED"

# 8/26 — src/modules/waitlist/waitlist.service.test.ts (modified — adds timePreference to fixtures + matchAndNotify tests)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.service.test.ts" \
  -o src/modules/waitlist/waitlist.service.test.ts && echo "8/26 OK" || echo "8/26 FAILED"

# 9/26 — src/jobs/waitlist-match.job.ts (new — BullMQ worker for waitlist notification expiry)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/jobs/waitlist-match.job.ts" \
  -o src/jobs/waitlist-match.job.ts && echo "9/26 OK" || echo "9/26 FAILED"

# 10/26 — src/modules/packages/packages.schema.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.schema.ts" \
  -o src/modules/packages/packages.schema.ts && echo "10/26 OK" || echo "10/26 FAILED"

# 11/26 — src/modules/packages/packages.service.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.service.ts" \
  -o src/modules/packages/packages.service.ts && echo "11/26 OK" || echo "11/26 FAILED"

# 12/26 — src/modules/packages/packages.controller.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.controller.ts" \
  -o src/modules/packages/packages.controller.ts && echo "12/26 OK" || echo "12/26 FAILED"

# 13/26 — src/modules/packages/packages.routes.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.routes.ts" \
  -o src/modules/packages/packages.routes.ts && echo "13/26 OK" || echo "13/26 FAILED"

# 14/26 — src/modules/packages/packages.service.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.service.test.ts" \
  -o src/modules/packages/packages.service.test.ts && echo "14/26 OK" || echo "14/26 FAILED"

# 15/26 — src/modules/packages/packages.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/packages/packages.test.ts" \
  -o src/modules/packages/packages.test.ts && echo "15/26 OK" || echo "15/26 FAILED"

# 16/26 — src/modules/memberships/memberships.schema.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.schema.ts" \
  -o src/modules/memberships/memberships.schema.ts && echo "16/26 OK" || echo "16/26 FAILED"

# 17/26 — src/modules/memberships/memberships.service.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.service.ts" \
  -o src/modules/memberships/memberships.service.ts && echo "17/26 OK" || echo "17/26 FAILED"

# 18/26 — src/modules/memberships/memberships.controller.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.controller.ts" \
  -o src/modules/memberships/memberships.controller.ts && echo "18/26 OK" || echo "18/26 FAILED"

# 19/26 — src/modules/memberships/memberships.routes.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.routes.ts" \
  -o src/modules/memberships/memberships.routes.ts && echo "19/26 OK" || echo "19/26 FAILED"

# 20/26 — src/modules/memberships/memberships.service.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.service.test.ts" \
  -o src/modules/memberships/memberships.service.test.ts && echo "20/26 OK" || echo "20/26 FAILED"

# 21/26 — src/modules/memberships/memberships.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/memberships/memberships.test.ts" \
  -o src/modules/memberships/memberships.test.ts && echo "21/26 OK" || echo "21/26 FAILED"

# 22/26 — src/modules/loyalty/loyalty.schema.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.schema.ts" \
  -o src/modules/loyalty/loyalty.schema.ts && echo "22/26 OK" || echo "22/26 FAILED"

# 23/26 — src/modules/loyalty/loyalty.service.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.service.ts" \
  -o src/modules/loyalty/loyalty.service.ts && echo "23/26 OK" || echo "23/26 FAILED"

# 24/26 — src/modules/loyalty/loyalty.controller.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.controller.ts" \
  -o src/modules/loyalty/loyalty.controller.ts && echo "24/26 OK" || echo "24/26 FAILED"

# 25/26 — src/modules/loyalty/loyalty.routes.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.routes.ts" \
  -o src/modules/loyalty/loyalty.routes.ts && echo "25/26 OK" || echo "25/26 FAILED"

# 26/26 — src/modules/loyalty/loyalty.service.test.ts (new)
curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/loyalty/loyalty.service.test.ts" \
  -o src/modules/loyalty/loyalty.service.test.ts && echo "26/26 OK" || echo "26/26 FAILED"
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
