# Step 1.8 — Quote Management API — Setup Guide

> **What this step adds**
> - A new `quotes` module with 7 REST endpoints (create, list, get, update, send, accept, reject)
> - Full quote lifecycle: `DRAFT → SENT → ACCEPTED` (auto-creates Booking) or `REJECTED`
> - Atomic Booking creation on acceptance (Prisma transaction)
> - Feature-flagged: `QUOTE_SYSTEM_ENABLED` (on by default for `tattoo_studio`)

---

## Files in this step

### NEW folder (create once)
```
backend/src/modules/quotes/
```

### NEW files (brand-new — 5 files)
| File | Description |
|------|-------------|
| `backend/src/modules/quotes/quotes.schema.ts` | Zod validation schemas — 4 bugs fixed here |
| `backend/src/modules/quotes/quotes.service.ts` | Business logic — 2 bugs fixed here |
| `backend/src/modules/quotes/quotes.controller.ts` | HTTP handlers |
| `backend/src/modules/quotes/quotes.routes.ts` | Express router |
| `backend/src/modules/quotes/quotes.service.test.ts` | 40 unit tests |

### MODIFIED existing file (delete then re-download — 1 file)
| File | What changed |
|------|-------------|
| `backend/src/app.ts` | Added `quoteRoutes` import and `/api/quotes` route mount |

---

## STEP 1 — Create the new folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/quotes
```

---

## STEP 2 — Delete the existing file that was changed

> Run this so the old `app.ts` on your machine is removed before the fresh download.

```bash
rm ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 3 — Download all 6 files

Run all six commands in your terminal. Each command saves the file to the correct path.

```bash
# 1 — app.ts (modified: added /api/quotes route)
curl -o ~/Desktop/Automation/backend/src/app.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts"

# 2 — quotes.schema.ts (new — BUG-1 & BUG-2 fixed: implicit-any on refine callbacks)
curl -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.schema.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.schema.ts"

# 3 — quotes.service.ts (new — BUG-3 & BUG-4 fixed: tx typed + select added)
curl -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.service.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.service.ts"

# 4 — quotes.controller.ts (new)
curl -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.controller.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.controller.ts"

# 5 — quotes.routes.ts (new)
curl -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.routes.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.routes.ts"

# 6 — quotes.service.test.ts (new — 40 tests)
curl -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.service.test.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.service.test.ts"
```

---

## STEP 4 — Run the tests

```bash
cd ~/Desktop/Automation/backend && npm test
```

**Expected output:**
```
Test Suites: X passed, X total
Tests:       155 passed, 155 total   ← 40 new quote tests added
```

All 155 tests should pass. Zero failures.

---

## Bug fixes applied in this step

The following bugs were found and fixed during the audit. All fixed files are included in the downloads above.

| Bug | File | Line | Description | Fix |
|-----|------|------|-------------|-----|
| BUG-1 | `quotes.schema.ts` | 108–127 | `.refine((b) => ...)` callback — `b` had implicit `any` type (violates `noImplicitAny`) | Extracted `updateQuoteBody` object + `UpdateQuoteBodyRaw` type; callback now explicitly typed |
| BUG-2 | `quotes.schema.ts` | 130–159 | `.refine((b) => ...)` callback on `acceptQuoteSchema` — same implicit `any` issue | Extracted `acceptQuoteBody` object + `AcceptQuoteBodyRaw` type; callback explicitly typed |
| BUG-3 | `quotes.service.ts` | ~467 | `prisma.$transaction(async (tx) =>` — `tx` had implicit `any` (violates `noImplicitAny`) | Annotated as `Prisma.TransactionClient` |
| BUG-4 | `quotes.service.ts` | ~469–493 | `tx.quote.update`, `tx.booking.create`, `tx.lead.update` inside transaction missing `select: { id: true }` | Added `select: { id: true }` to all three — consistent with every other mutation in the codebase and avoids fetching unnecessary data |

---

## Endpoints added by this step

| Method | Path | Auth | Feature flag | Description |
|--------|------|------|-------------|-------------|
| `POST` | `/api/quotes` | ARTIST / ADMIN | `QUOTE_SYSTEM_ENABLED` | Create DRAFT quote for a lead |
| `GET` | `/api/quotes` | ARTIST / ADMIN | `QUOTE_SYSTEM_ENABLED` | List quotes (ARTIST: own only; ADMIN: all) |
| `GET` | `/api/quotes/:id` | ARTIST / ADMIN | `QUOTE_SYSTEM_ENABLED` | Full quote detail |
| `PATCH` | `/api/quotes/:id` | ARTIST / ADMIN | `QUOTE_SYSTEM_ENABLED` | Edit DRAFT quote |
| `PATCH` | `/api/quotes/:id/send` | ARTIST / ADMIN | `QUOTE_SYSTEM_ENABLED` | Send DRAFT → SENT + lead → QUOTED |
| `PATCH` | `/api/quotes/:id/accept` | ADMIN | `QUOTE_SYSTEM_ENABLED` | Accept SENT → creates Booking + lead → BOOKED |
| `PATCH` | `/api/quotes/:id/reject` | ADMIN | `QUOTE_SYSTEM_ENABLED` | Reject SENT quote |

---

## Quote lifecycle

```
DRAFT ──► SENT ──► ACCEPTED  (creates Booking atomically; lead → BOOKED)
               └──► REJECTED  (lead stays QUOTED — studio may re-quote)
               └──► EXPIRED   (runtime check on validUntil; no job queue in Phase 1)
```

---

## Role permissions

| Role | Create | Read | Edit DRAFT | Send | Accept | Reject |
|------|--------|------|-----------|------|--------|--------|
| CUSTOMER | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| ARTIST | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✗ | ✗ |
| ADMIN | ✓ (any) | ✓ (any) | ✓ (any) | ✓ (any) | ✓ | ✓ |

---

## Feature flag

`QUOTE_SYSTEM_ENABLED` is set in `backend/src/config/businessType.ts`.

| Business type | Value |
|---|---|
| `tattoo_studio` | `true` ✅ |
| All others | `false` |

If the flag is `false`, all quote endpoints return `503 Feature Disabled`.
