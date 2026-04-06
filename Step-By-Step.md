# Step 1.11 — Lead Capture API (Universal — All Business Types) — Setup Guide

> **What this step adds**
> - A new dedicated `capture` module with a single public endpoint `POST /api/capture`
> - Honeypot bot detection (`website` field — invisible to humans, bots fill it → 422 SPAM_DETECTED)
> - Duplicate detection — same email + artistId within 24 hours returns the existing lead (idempotent)
> - Auto lead scoring algorithm (0–100) computed from data richness and intent signals
> - Device type inference from User-Agent when not supplied by the client
> - Session tracking via optional `sessionId` UUID-v4 for multi-step forms
> - Capture-specific rate limiting: 5 requests / 15 min per IP (stricter than global 100/15 min)
> - Structured webhook dispatch stub (Phase 2 will wire real HTTP webhooks)
> - Gated by `LEAD_CAPTURE_ENABLED` feature flag (same as the admin leads POST)

---

## ⚠️ CRITICAL — curl format rules (read once, never forget)

**NEVER use backslash `\` line continuation in curl commands.**
Copying multi-line curl from a document into zsh on macOS inserts invisible characters and causes `zsh: parse error near ')'`.
**Always write every curl as a single unbroken line.** That is the only format used in this guide.

---

## Files in this step — ALL 6 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/app.ts` | MODIFIED | Adds `/api/capture` route mount |
| 2 | `backend/src/modules/capture/capture.schema.ts` | NEW | Zod schemas (honeypot + sessionId fields) |
| 3 | `backend/src/modules/capture/capture.service.ts` | NEW | Bot guard, dedup, scoring, enrichment, webhook stub |
| 4 | `backend/src/modules/capture/capture.controller.ts` | NEW | HTTP handler |
| 5 | `backend/src/modules/capture/capture.routes.ts` | NEW | Express router with capture-specific rate limiter |
| 6 | `backend/src/modules/capture/capture.service.test.ts` | NEW | **42 unit tests — DO NOT SKIP** |

> **Missing file 6 means 42 fewer tests.** Every file must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

Run this block first to wipe any files from a previous attempt:

```bash
rm -rf ~/Desktop/Automation/backend/src/modules/capture && rm -f ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 2 — Create the capture folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/capture
```

---

## STEP 3 — Download all 6 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" -o ~/Desktop/Automation/backend/src/app.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/capture/capture.schema.ts" -o ~/Desktop/Automation/backend/src/modules/capture/capture.schema.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/capture/capture.service.ts" -o ~/Desktop/Automation/backend/src/modules/capture/capture.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/capture/capture.controller.ts" -o ~/Desktop/Automation/backend/src/modules/capture/capture.controller.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/capture/capture.routes.ts" -o ~/Desktop/Automation/backend/src/modules/capture/capture.routes.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/capture/capture.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/capture/capture.service.test.ts
```

---

## STEP 4 — Verify all 6 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/app.ts ~/Desktop/Automation/backend/src/modules/capture/capture.schema.ts ~/Desktop/Automation/backend/src/modules/capture/capture.service.ts ~/Desktop/Automation/backend/src/modules/capture/capture.controller.ts ~/Desktop/Automation/backend/src/modules/capture/capture.routes.ts ~/Desktop/Automation/backend/src/modules/capture/capture.service.test.ts
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
Test Suites: 9 passed, 9 total
Tests:       265 passed, 265 total
```

---

## Endpoint added in this step

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/capture` | Public | Universal lead capture — bot guard, dedup, scoring, 5 req/15min IP limit |

---

## Capture response shape

```json
{
  "success": true,
  "data": {
    "leadId":      "cl...",
    "score":       65,
    "isDuplicate": false,
    "sessionId":   "550e8400-e29b-41d4-a716-446655440000",
    "capturedAt":  "2026-04-06T12:00:00.000Z"
  },
  "meta": null,
  "error": null
}
```

On a duplicate submission the HTTP status is `200` (not `201`) and `isDuplicate` is `true`.

---

## Scoring algorithm

| Signal | Points |
|--------|--------|
| Description > 200 chars | +15 |
| Description > 100 chars | +10 |
| Reference images provided | +15 |
| Preferred dates provided | +15 |
| `artistId` specified | +10 |
| `serviceId` specified | +10 |
| `marketingConsent = true` | +10 |
| `utmSource` present | +10 |
| International phone (`+...`) | +5 |
| **Max (clamped)** | **100** |


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

## STEP 1 — Delete old files (clean slate)

Run this block first to wipe any files from a previous attempt or from Steps 1.4–1.9:

```bash
rm -rf ~/Desktop/Automation/backend/src/modules/invoices && rm -f ~/Desktop/Automation/backend/src/app.ts
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

