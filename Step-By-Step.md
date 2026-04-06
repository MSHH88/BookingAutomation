# Step 1.10 — Invoice System API — Setup Guide

> **What this step adds**
> - A new `invoices` module with 5 REST endpoints (list, get, send, mark-paid, void)
> - Invoice lifecycle: `UNPAID → PAID`, `UNPAID → OVERDUE`, `UNPAID → VOID`, `OVERDUE → PAID`, `OVERDUE → VOID`
> - ARTIST-scoped access: ARTISTs can view/send only invoices for their own bookings
> - `markOverdueInvoices()` utility (called by Phase 2 BullMQ daily cron)
> - Gated by `BOOKING_ENABLED` feature flag (invoices are a direct product of booking completion)

---

## ⚠️ CRITICAL — curl format rules (read once, never forget)

**NEVER use backslash `\` line continuation in curl commands.**
Copying multi-line curl from a document into zsh on macOS inserts invisible characters and causes `zsh: parse error near ')'`.
**Always write every curl as a single unbroken line.** That is the only format used in this guide.

---

## Files in this step — ALL 6 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/app.ts` | MODIFIED | Adds `/api/invoices` route mount |
| 2 | `backend/src/modules/invoices/invoices.schema.ts` | NEW | Zod schemas |
| 3 | `backend/src/modules/invoices/invoices.service.ts` | NEW | Business logic |
| 4 | `backend/src/modules/invoices/invoices.controller.ts` | NEW | HTTP handlers |
| 5 | `backend/src/modules/invoices/invoices.routes.ts` | NEW | Express router |
| 6 | `backend/src/modules/invoices/invoices.service.test.ts` | NEW | **29 unit tests — DO NOT SKIP** |

> **Missing file 6 means 29 fewer tests.** Every file must be downloaded.

---

## STEP 1 — Delete everything from a previous attempt (clean slate)

```bash
rm -rf ~/Desktop/Automation/backend/src/modules/invoices
rm -f ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 2 — Create the invoices folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/invoices
```

---

## STEP 3 — Download all 6 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" -o ~/Desktop/Automation/backend/src/app.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/invoices/invoices.schema.ts" -o ~/Desktop/Automation/backend/src/modules/invoices/invoices.schema.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/invoices/invoices.service.ts" -o ~/Desktop/Automation/backend/src/modules/invoices/invoices.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/invoices/invoices.controller.ts" -o ~/Desktop/Automation/backend/src/modules/invoices/invoices.controller.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/invoices/invoices.routes.ts" -o ~/Desktop/Automation/backend/src/modules/invoices/invoices.routes.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/invoices/invoices.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/invoices/invoices.service.test.ts
```

---

## STEP 4 — Verify all 6 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/app.ts ~/Desktop/Automation/backend/src/modules/invoices/invoices.schema.ts ~/Desktop/Automation/backend/src/modules/invoices/invoices.service.ts ~/Desktop/Automation/backend/src/modules/invoices/invoices.controller.ts ~/Desktop/Automation/backend/src/modules/invoices/invoices.routes.ts ~/Desktop/Automation/backend/src/modules/invoices/invoices.service.test.ts
```

All 6 files must show a byte count > 0. If any shows 0 bytes or the file is missing, re-run STEP 3.

---

## STEP 5 — Run typecheck

```bash
cd ~/Desktop/Automation/backend && npm run typecheck
```

Expected: **no errors printed, exit 0.**

---

## STEP 6 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 8 passed, 8 total
Tests:       223 passed, 223 total
```

---

## If you need to REPLACE outdated files from a previous step

If you already have files from Steps 1.4–1.9 on your machine and only need to update the files changed by this step, run the delete curl first:

```bash
rm -f ~/Desktop/Automation/backend/src/app.ts && rm -rf ~/Desktop/Automation/backend/src/modules/invoices
```

Then re-run STEP 3 above.

---

## Endpoints added in this step

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/invoices` | ADMIN | List invoices (status filter + date range + pagination) |
| GET | `/api/invoices/:id` | ARTIST / ADMIN | Invoice detail (ARTISTs: own bookings only) |
| PATCH | `/api/invoices/:id/send` | ARTIST / ADMIN | Send invoice email stub (ARTISTs: own only) |
| PATCH | `/api/invoices/:id/mark-paid` | ADMIN | Mark UNPAID or OVERDUE → PAID |
| PATCH | `/api/invoices/:id/void` | ADMIN | Void UNPAID or OVERDUE invoice |

---

## Invoice status lifecycle

```
UNPAID  ──── markInvoicePaid ────► PAID    (terminal)
UNPAID  ──── voidInvoice ─────────► VOID    (terminal)
UNPAID  ──── cron (Phase 2) ──────► OVERDUE
OVERDUE ──── markInvoicePaid ────► PAID    (terminal)
OVERDUE ──── voidInvoice ─────────► VOID    (terminal)
```

PAID and VOID are terminal — no further transitions are allowed.

