# Step 1.8 — Quote Management API — Setup Guide

> **What this step adds**
> - A new `quotes` module with 7 REST endpoints (create, list, get, update, send, accept, reject)
> - Full quote lifecycle: `DRAFT → SENT → ACCEPTED` (auto-creates Booking) or `REJECTED`
> - Atomic Booking creation on acceptance (Prisma transaction)
> - Feature-flagged: `QUOTE_SYSTEM_ENABLED` (on by default for `tattoo_studio`)

---

## Files in this step

### NEW folder
```
backend/src/modules/quotes/
```

### NEW files (download all 5)
| File | Description |
|------|-------------|
| `backend/src/modules/quotes/quotes.schema.ts` | Zod validation schemas for all 7 endpoints |
| `backend/src/modules/quotes/quotes.service.ts` | Business logic — all service functions |
| `backend/src/modules/quotes/quotes.controller.ts` | HTTP handlers — thin layer over service |
| `backend/src/modules/quotes/quotes.routes.ts` | Express router with auth + role + feature guards |
| `backend/src/modules/quotes/quotes.service.test.ts` | 40 unit tests covering all service functions |

### MODIFIED files (download and replace)
| File | What changed |
|------|-------------|
| `backend/src/app.ts` | Added `quoteRoutes` import and `/api/quotes` route mount |

---

## STEP 1 — Create the quotes module folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/quotes
```

---

## STEP 2 — Download and place `quotes.schema.ts`

Place the file at:
```
backend/src/modules/quotes/quotes.schema.ts
```

---

## STEP 3 — Download and place `quotes.service.ts`

Place the file at:
```
backend/src/modules/quotes/quotes.service.ts
```

---

## STEP 4 — Download and place `quotes.controller.ts`

Place the file at:
```
backend/src/modules/quotes/quotes.controller.ts
```

---

## STEP 5 — Download and place `quotes.routes.ts`

Place the file at:
```
backend/src/modules/quotes/quotes.routes.ts
```

---

## STEP 6 — Download and place `quotes.service.test.ts`

Place the file at:
```
backend/src/modules/quotes/quotes.service.test.ts
```

---

## STEP 7 — Replace `app.ts`

Replace the entire file at:
```
backend/src/app.ts
```

> **What was added:** one import line and one route mount:
> ```typescript
> import { quoteRoutes }  from './modules/quotes/quotes.routes';  // new
> // ...
> app.use('/api/quotes',   quoteRoutes);      // Step 1.8 — new
> ```

---

## STEP 8 — Run the tests

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
