# Step 1.8 — Quote Management API — Setup Guide

> **What this step adds**
> - A new `quotes` module with 7 REST endpoints (create, list, get, update, send, accept, reject)
> - Full quote lifecycle: `DRAFT → SENT → ACCEPTED` (auto-creates Booking) or `REJECTED`
> - Atomic Booking creation on acceptance (Prisma transaction)
> - Feature-flagged: `QUOTE_SYSTEM_ENABLED` (on by default for `tattoo_studio`)

---

## ⚠️ CRITICAL — curl format rules (read once, never forget)

**NEVER use backslash `\` line continuation in curl commands.**  
Copying multi-line curl from a document into zsh on macOS inserts invisible characters and causes `zsh: parse error near ')'`.  
**Always write every curl as a single unbroken line.** That is the only format used in this guide.

---

## Files in this step — ALL 6 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/app.ts` | MODIFIED | Adds `/api/quotes` route mount |
| 2 | `backend/src/modules/quotes/quotes.schema.ts` | NEW | Zod schemas — BUG-1 & BUG-2 fixed |
| 3 | `backend/src/modules/quotes/quotes.service.ts` | NEW | Business logic — BUG-3 & BUG-4 fixed |
| 4 | `backend/src/modules/quotes/quotes.controller.ts` | NEW | HTTP handlers |
| 5 | `backend/src/modules/quotes/quotes.routes.ts` | NEW | Express router |
| 6 | `backend/src/modules/quotes/quotes.service.test.ts` | NEW | **40 unit tests — DO NOT SKIP** |

> **Missing file 6 is why tests show 115 instead of 155.** Every file must be downloaded.

---

## STEP 1 — Delete everything from a previous attempt (clean slate)

```bash
rm -rf ~/Desktop/Automation/backend/src/modules/quotes
rm -f ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 2 — Create the quotes folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/quotes
```

---

## STEP 3 — Download all 6 files (single-line curl — copy one line at a time)

```bash
curl -o ~/Desktop/Automation/backend/src/app.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts"
```

```bash
curl -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.schema.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.schema.ts"
```

```bash
curl -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.service.ts"
```

```bash
curl -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.controller.ts"
```

```bash
curl -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.routes.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.routes.ts"
```

```bash
curl -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.service.test.ts"
```

> ✅ Verify: after all 6 curl commands each shows `100 xxxxx` in the progress line (non-zero bytes). If any shows `100    0` the file is empty — re-run that curl.

---

## STEP 4 — Run the tests

```bash
cd ~/Desktop/Automation/backend && npm test
```

**Expected output:**
```
Test Suites: 6 passed, 6 total
Tests:       155 passed, 155 total   ← 115 existing + 40 new quote tests
```

All 155 tests must pass. Zero failures. If still 115, the test file (file 6) is missing — re-run step 1 and step 3 in full.

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
