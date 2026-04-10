# PHASE 4 — Financial & POS

**Sub-phases:** 4.1 Tip Collection, 4.2 Gift Cards, 4.3 Product Inventory, 4.4 POS Mode, 4.5 Stripe Terminal, 4.6 Staff Payroll, 4.7 Analytics Dashboard, 4.8 Artist Performance  
**Files changed:** 35 total (11 modified + 24 new)  
**Feature flags added:** `TIPS_ENABLED`, `GIFT_CARDS_ENABLED`, `INVENTORY_ENABLED`, `POS_ENABLED`, `STRIPE_TERMINAL_ENABLED`, `PAYROLL_ENABLED`  
**Bugs fixed in audit:** 1 (artist analytics returned email instead of name — fixed to return artistName)  
**Expected result:** 82 suites, 1490 tests pass, 0 failures.

---

## Step 1 — Open Terminal and go to your backend folder

```bash
cd ~/Desktop/Automation/backend
```

---

## Step 2 — Create new module directories

```bash
cd ~/Desktop/Automation/backend && \
mkdir -p src/modules/gift-cards && \
mkdir -p src/modules/products && \
mkdir -p src/modules/pos && \
mkdir -p src/modules/payroll
```

---

## Step 3 — Delete modified files (to be replaced)

```bash
cd ~/Desktop/Automation/backend && \
rm -f prisma/schema.prisma && \
rm -f src/app.ts && \
rm -f src/config/businessType.ts && \
rm -f src/lib/stripe.ts && \
rm -f src/modules/analytics/analytics.controller.ts && \
rm -f src/modules/analytics/analytics.routes.ts && \
rm -f src/modules/analytics/analytics.schema.ts && \
rm -f src/modules/analytics/analytics.service.ts && \
rm -f src/modules/payments/payments.schema.ts && \
rm -f src/modules/payments/payments.service.test.ts && \
rm -f src/modules/payments/payments.service.ts
```

---

## Step 4 — Download all 35 files

```bash
cd ~/Desktop/Automation/backend

# ── Modified files (11) ────────────────────────────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/schema.prisma" \
  -o prisma/schema.prisma \
  && echo "OK  1/35  prisma/schema.prisma" \
  || echo "FAILED  1/35  prisma/schema.prisma"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o src/app.ts \
  && echo "OK  2/35  src/app.ts" \
  || echo "FAILED  2/35  src/app.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/config/businessType.ts" \
  -o src/config/businessType.ts \
  && echo "OK  3/35  src/config/businessType.ts" \
  || echo "FAILED  3/35  src/config/businessType.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/stripe.ts" \
  -o src/lib/stripe.ts \
  && echo "OK  4/35  src/lib/stripe.ts" \
  || echo "FAILED  4/35  src/lib/stripe.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/analytics/analytics.controller.ts" \
  -o src/modules/analytics/analytics.controller.ts \
  && echo "OK  5/35  src/modules/analytics/analytics.controller.ts" \
  || echo "FAILED  5/35  src/modules/analytics/analytics.controller.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/analytics/analytics.routes.ts" \
  -o src/modules/analytics/analytics.routes.ts \
  && echo "OK  6/35  src/modules/analytics/analytics.routes.ts" \
  || echo "FAILED  6/35  src/modules/analytics/analytics.routes.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/analytics/analytics.schema.ts" \
  -o src/modules/analytics/analytics.schema.ts \
  && echo "OK  7/35  src/modules/analytics/analytics.schema.ts" \
  || echo "FAILED  7/35  src/modules/analytics/analytics.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/analytics/analytics.service.ts" \
  -o src/modules/analytics/analytics.service.ts \
  && echo "OK  8/35  src/modules/analytics/analytics.service.ts" \
  || echo "FAILED  8/35  src/modules/analytics/analytics.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.schema.ts" \
  -o src/modules/payments/payments.schema.ts \
  && echo "OK  9/35  src/modules/payments/payments.schema.ts" \
  || echo "FAILED  9/35  src/modules/payments/payments.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.service.test.ts" \
  -o src/modules/payments/payments.service.test.ts \
  && echo "OK  10/35  src/modules/payments/payments.service.test.ts" \
  || echo "FAILED  10/35  src/modules/payments/payments.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.service.ts" \
  -o src/modules/payments/payments.service.ts \
  && echo "OK  11/35  src/modules/payments/payments.service.ts" \
  || echo "FAILED  11/35  src/modules/payments/payments.service.ts"

# ── New files — Gift Cards (6) ─────────────────────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/gift-cards/gift-cards.schema.ts" \
  -o src/modules/gift-cards/gift-cards.schema.ts \
  && echo "OK  12/35  src/modules/gift-cards/gift-cards.schema.ts" \
  || echo "FAILED  12/35  src/modules/gift-cards/gift-cards.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/gift-cards/gift-cards.service.ts" \
  -o src/modules/gift-cards/gift-cards.service.ts \
  && echo "OK  13/35  src/modules/gift-cards/gift-cards.service.ts" \
  || echo "FAILED  13/35  src/modules/gift-cards/gift-cards.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/gift-cards/gift-cards.controller.ts" \
  -o src/modules/gift-cards/gift-cards.controller.ts \
  && echo "OK  14/35  src/modules/gift-cards/gift-cards.controller.ts" \
  || echo "FAILED  14/35  src/modules/gift-cards/gift-cards.controller.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/gift-cards/gift-cards.routes.ts" \
  -o src/modules/gift-cards/gift-cards.routes.ts \
  && echo "OK  15/35  src/modules/gift-cards/gift-cards.routes.ts" \
  || echo "FAILED  15/35  src/modules/gift-cards/gift-cards.routes.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/gift-cards/gift-cards.service.test.ts" \
  -o src/modules/gift-cards/gift-cards.service.test.ts \
  && echo "OK  16/35  src/modules/gift-cards/gift-cards.service.test.ts" \
  || echo "FAILED  16/35  src/modules/gift-cards/gift-cards.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/gift-cards/gift-cards.test.ts" \
  -o src/modules/gift-cards/gift-cards.test.ts \
  && echo "OK  17/35  src/modules/gift-cards/gift-cards.test.ts" \
  || echo "FAILED  17/35  src/modules/gift-cards/gift-cards.test.ts"

# ── New files — Products / Inventory (6) ──────────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/products/products.schema.ts" \
  -o src/modules/products/products.schema.ts \
  && echo "OK  18/35  src/modules/products/products.schema.ts" \
  || echo "FAILED  18/35  src/modules/products/products.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/products/products.service.ts" \
  -o src/modules/products/products.service.ts \
  && echo "OK  19/35  src/modules/products/products.service.ts" \
  || echo "FAILED  19/35  src/modules/products/products.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/products/products.controller.ts" \
  -o src/modules/products/products.controller.ts \
  && echo "OK  20/35  src/modules/products/products.controller.ts" \
  || echo "FAILED  20/35  src/modules/products/products.controller.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/products/products.routes.ts" \
  -o src/modules/products/products.routes.ts \
  && echo "OK  21/35  src/modules/products/products.routes.ts" \
  || echo "FAILED  21/35  src/modules/products/products.routes.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/products/products.service.test.ts" \
  -o src/modules/products/products.service.test.ts \
  && echo "OK  22/35  src/modules/products/products.service.test.ts" \
  || echo "FAILED  22/35  src/modules/products/products.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/products/products.test.ts" \
  -o src/modules/products/products.test.ts \
  && echo "OK  23/35  src/modules/products/products.test.ts" \
  || echo "FAILED  23/35  src/modules/products/products.test.ts"

# ── New files — POS Mode (6) ──────────────────────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/pos/pos.schema.ts" \
  -o src/modules/pos/pos.schema.ts \
  && echo "OK  24/35  src/modules/pos/pos.schema.ts" \
  || echo "FAILED  24/35  src/modules/pos/pos.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/pos/pos.service.ts" \
  -o src/modules/pos/pos.service.ts \
  && echo "OK  25/35  src/modules/pos/pos.service.ts" \
  || echo "FAILED  25/35  src/modules/pos/pos.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/pos/pos.controller.ts" \
  -o src/modules/pos/pos.controller.ts \
  && echo "OK  26/35  src/modules/pos/pos.controller.ts" \
  || echo "FAILED  26/35  src/modules/pos/pos.controller.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/pos/pos.routes.ts" \
  -o src/modules/pos/pos.routes.ts \
  && echo "OK  27/35  src/modules/pos/pos.routes.ts" \
  || echo "FAILED  27/35  src/modules/pos/pos.routes.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/pos/pos.service.test.ts" \
  -o src/modules/pos/pos.service.test.ts \
  && echo "OK  28/35  src/modules/pos/pos.service.test.ts" \
  || echo "FAILED  28/35  src/modules/pos/pos.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/pos/pos.test.ts" \
  -o src/modules/pos/pos.test.ts \
  && echo "OK  29/35  src/modules/pos/pos.test.ts" \
  || echo "FAILED  29/35  src/modules/pos/pos.test.ts"

# ── New files — Payroll (6) ───────────────────────────────────────────

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payroll/payroll.schema.ts" \
  -o src/modules/payroll/payroll.schema.ts \
  && echo "OK  30/35  src/modules/payroll/payroll.schema.ts" \
  || echo "FAILED  30/35  src/modules/payroll/payroll.schema.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payroll/payroll.service.ts" \
  -o src/modules/payroll/payroll.service.ts \
  && echo "OK  31/35  src/modules/payroll/payroll.service.ts" \
  || echo "FAILED  31/35  src/modules/payroll/payroll.service.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payroll/payroll.controller.ts" \
  -o src/modules/payroll/payroll.controller.ts \
  && echo "OK  32/35  src/modules/payroll/payroll.controller.ts" \
  || echo "FAILED  32/35  src/modules/payroll/payroll.controller.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payroll/payroll.routes.ts" \
  -o src/modules/payroll/payroll.routes.ts \
  && echo "OK  33/35  src/modules/payroll/payroll.routes.ts" \
  || echo "FAILED  33/35  src/modules/payroll/payroll.routes.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payroll/payroll.service.test.ts" \
  -o src/modules/payroll/payroll.service.test.ts \
  && echo "OK  34/35  src/modules/payroll/payroll.service.test.ts" \
  || echo "FAILED  34/35  src/modules/payroll/payroll.service.test.ts"

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payroll/payroll.test.ts" \
  -o src/modules/payroll/payroll.test.ts \
  && echo "OK  35/35  src/modules/payroll/payroll.test.ts" \
  || echo "FAILED  35/35  src/modules/payroll/payroll.test.ts"
```

---

## Step 5 — Regenerate Prisma client and run migration

```bash
cd ~/Desktop/Automation/backend && \
npx prisma generate --schema ./prisma/schema.prisma && \
npx prisma migrate dev --name phase4_financial_pos --schema ./prisma/schema.prisma
```

---

## Step 6 — Run tests

```bash
cd ~/Desktop/Automation/backend && npx jest --no-coverage
```

**Expected:** 82 suites, 1490/1490 tests pass.

---

## Step 7 — Delete Phase 4 files (cleanup / rollback)

> **Warning:** Only run this if you want to remove Phase 4. This deletes all new files and directories. Modified files will need to be restored from Phase 3.

```bash
cd ~/Desktop/Automation/backend && \

# ── New module directories (safe to remove entirely) ───────────────────
rm -rf src/modules/gift-cards && \
rm -rf src/modules/products && \
rm -rf src/modules/pos && \
rm -rf src/modules/payroll && \

# ── Modified files that need reverting to Phase 3 versions ────────────
# (re-download from Phase 3 branch or restore from git)
echo "Remember to restore: prisma/schema.prisma, src/app.ts, src/config/businessType.ts, src/lib/stripe.ts, src/modules/analytics/*.ts, src/modules/payments/payments.service.ts, src/modules/payments/payments.schema.ts, src/modules/payments/payments.service.test.ts"
```

---

## Phase 4 File Index

### Modified files (11)

| # | Path |
|---|------|
| 1 | `backend/prisma/schema.prisma` |
| 2 | `backend/src/app.ts` |
| 3 | `backend/src/config/businessType.ts` |
| 4 | `backend/src/lib/stripe.ts` |
| 5 | `backend/src/modules/analytics/analytics.controller.ts` |
| 6 | `backend/src/modules/analytics/analytics.routes.ts` |
| 7 | `backend/src/modules/analytics/analytics.schema.ts` |
| 8 | `backend/src/modules/analytics/analytics.service.ts` |
| 9 | `backend/src/modules/payments/payments.schema.ts` |
| 10 | `backend/src/modules/payments/payments.service.test.ts` |
| 11 | `backend/src/modules/payments/payments.service.ts` |

### New files (24)

| # | Path |
|---|------|
| 12 | `backend/src/modules/gift-cards/gift-cards.schema.ts` |
| 13 | `backend/src/modules/gift-cards/gift-cards.service.ts` |
| 14 | `backend/src/modules/gift-cards/gift-cards.controller.ts` |
| 15 | `backend/src/modules/gift-cards/gift-cards.routes.ts` |
| 16 | `backend/src/modules/gift-cards/gift-cards.service.test.ts` |
| 17 | `backend/src/modules/gift-cards/gift-cards.test.ts` |
| 18 | `backend/src/modules/products/products.schema.ts` |
| 19 | `backend/src/modules/products/products.service.ts` |
| 20 | `backend/src/modules/products/products.controller.ts` |
| 21 | `backend/src/modules/products/products.routes.ts` |
| 22 | `backend/src/modules/products/products.service.test.ts` |
| 23 | `backend/src/modules/products/products.test.ts` |
| 24 | `backend/src/modules/pos/pos.schema.ts` |
| 25 | `backend/src/modules/pos/pos.service.ts` |
| 26 | `backend/src/modules/pos/pos.controller.ts` |
| 27 | `backend/src/modules/pos/pos.routes.ts` |
| 28 | `backend/src/modules/pos/pos.service.test.ts` |
| 29 | `backend/src/modules/pos/pos.test.ts` |
| 30 | `backend/src/modules/payroll/payroll.schema.ts` |
| 31 | `backend/src/modules/payroll/payroll.service.ts` |
| 32 | `backend/src/modules/payroll/payroll.controller.ts` |
| 33 | `backend/src/modules/payroll/payroll.routes.ts` |
| 34 | `backend/src/modules/payroll/payroll.service.test.ts` |
| 35 | `backend/src/modules/payroll/payroll.test.ts` |

### Schema changes summary

- **Payment model**: `tipAmount Decimal?` added (Phase 4.1)
- **Artist model**: `basePay Decimal?`, `serviceCommissionPct Decimal?`, `productCommissionPct Decimal?`, `payrollReports PayrollReport[]` added (Phase 4.6)
- **New models**: `GiftCard`, `Product`, `StockMovement`, `PayrollReport`
- **New enums**: `StockMovementReason` (SALE | ADJUSTMENT | RESTOCK)
