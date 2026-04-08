# Step 1.22 — Integration Test Suite — Setup Guide

**What this step adds:**

A comprehensive HTTP-layer integration test suite (29 test files, 719 tests) that
runs against the full Express app using mocked Prisma, Cloudinary, Redis, and
external services.  Every API module introduced in earlier steps now has
end-to-end coverage at the route level, including auth, feature-flag gating,
error handling, and business-logic assertions.

The step delivers:

1. **`backend/jest.setup.ts`** (NEW) — global test environment setup loaded
   before every test module; sets all required env vars so `config/index.ts`
   never calls `process.exit(1)` during the test run.
2. **11 new integration test files** (`*.test.ts`) — one per API module:
   analytics, artists, availability, bookings, features (flag enforcement),
   invoices, leads, quotes, styles, uploads, and the auth middleware.
3. **`backend/src/middleware/requireFeature.ts`** (MODIFIED) — bug fix: the
   feature-flag check now reads `BUSINESS_TYPE` from `process.env` at
   **request time** instead of at module-load time so tests can override it
   between requests without restarting the process.
4. **`backend/package.json`** (MODIFIED) — jest config updated to reference
   `jest.setup.ts` via `setupFiles`.

---

## New / modified files — ALL 13 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1  | `backend/jest.setup.ts` | NEW | Global test env variables for the full test suite |
| 2  | `backend/package.json` | MODIFIED | jest setupFiles references jest.setup.ts |
| 3  | `backend/src/middleware/requireFeature.ts` | MODIFIED | Bug fix: read BUSINESS_TYPE at request time |
| 4  | `backend/src/modules/analytics/analytics.test.ts` | NEW | POST /api/analytics/events + GET overview/leads/bookings/revenue/events |
| 5  | `backend/src/modules/artists/artists.test.ts` | NEW | GET /api/artists (public + ADMIN) |
| 6  | `backend/src/modules/availability/availability.test.ts` | NEW | GET/PUT schedule, blocks CRUD, GET slots |
| 7  | `backend/src/modules/bookings/bookings.test.ts` | NEW | Booking lifecycle CRUD + status transitions |
| 8  | `backend/src/modules/features/features.test.ts` | NEW | Feature-flag enforcement across LEAD, QUOTE, ANALYTICS, BOOKING routes |
| 9  | `backend/src/modules/invoices/invoices.test.ts` | NEW | Invoice CRUD + status transitions |
| 10 | `backend/src/modules/leads/leads.test.ts` | NEW | Lead capture + list + status update |
| 11 | `backend/src/modules/quotes/quotes.test.ts` | NEW | Quote lifecycle DRAFT→SENT→ACCEPTED/REJECTED |
| 12 | `backend/src/modules/styles/styles.test.ts` | NEW | Style catalogue CRUD |
| 13 | `backend/src/modules/uploads/uploads.test.ts` | NEW | Multipart image upload + Cloudinary mock |

---

## STEP 1 — Delete old / outdated files (clean slate)

```bash
rm -f ~/Desktop/Automation/backend/jest.setup.ts && \
rm -f ~/Desktop/Automation/backend/package.json && \
rm -f ~/Desktop/Automation/backend/src/middleware/requireFeature.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/analytics/analytics.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/artists/artists.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/availability/availability.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/bookings/bookings.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/features/features.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/invoices/invoices.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/leads/leads.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/quotes/quotes.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/styles/styles.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/uploads/uploads.test.ts
```

---

## STEP 2 — Create any missing directories

```bash
mkdir -p ~/Desktop/Automation/backend/src/middleware && \
mkdir -p ~/Desktop/Automation/backend/src/modules/analytics && \
mkdir -p ~/Desktop/Automation/backend/src/modules/artists && \
mkdir -p ~/Desktop/Automation/backend/src/modules/availability && \
mkdir -p ~/Desktop/Automation/backend/src/modules/bookings && \
mkdir -p ~/Desktop/Automation/backend/src/modules/features && \
mkdir -p ~/Desktop/Automation/backend/src/modules/invoices && \
mkdir -p ~/Desktop/Automation/backend/src/modules/leads && \
mkdir -p ~/Desktop/Automation/backend/src/modules/quotes && \
mkdir -p ~/Desktop/Automation/backend/src/modules/styles && \
mkdir -p ~/Desktop/Automation/backend/src/modules/uploads
```

---

## STEP 3 — Download all 13 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/jest.setup.ts" -o ~/Desktop/Automation/backend/jest.setup.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/package.json" -o ~/Desktop/Automation/backend/package.json && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/middleware/requireFeature.ts" -o ~/Desktop/Automation/backend/src/middleware/requireFeature.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/analytics/analytics.test.ts" -o ~/Desktop/Automation/backend/src/modules/analytics/analytics.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artists.test.ts" -o ~/Desktop/Automation/backend/src/modules/artists/artists.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/availability/availability.test.ts" -o ~/Desktop/Automation/backend/src/modules/availability/availability.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.test.ts" -o ~/Desktop/Automation/backend/src/modules/bookings/bookings.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/features/features.test.ts" -o ~/Desktop/Automation/backend/src/modules/features/features.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/invoices/invoices.test.ts" -o ~/Desktop/Automation/backend/src/modules/invoices/invoices.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/leads/leads.test.ts" -o ~/Desktop/Automation/backend/src/modules/leads/leads.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.test.ts" -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/styles/styles.test.ts" -o ~/Desktop/Automation/backend/src/modules/styles/styles.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/uploads/uploads.test.ts" -o ~/Desktop/Automation/backend/src/modules/uploads/uploads.test.ts
```

---

## STEP 4 — Verify all 13 files were downloaded (bytes > 0)

```bash
wc -c \
  ~/Desktop/Automation/backend/jest.setup.ts \
  ~/Desktop/Automation/backend/package.json \
  ~/Desktop/Automation/backend/src/middleware/requireFeature.ts \
  ~/Desktop/Automation/backend/src/modules/analytics/analytics.test.ts \
  ~/Desktop/Automation/backend/src/modules/artists/artists.test.ts \
  ~/Desktop/Automation/backend/src/modules/availability/availability.test.ts \
  ~/Desktop/Automation/backend/src/modules/bookings/bookings.test.ts \
  ~/Desktop/Automation/backend/src/modules/features/features.test.ts \
  ~/Desktop/Automation/backend/src/modules/invoices/invoices.test.ts \
  ~/Desktop/Automation/backend/src/modules/leads/leads.test.ts \
  ~/Desktop/Automation/backend/src/modules/quotes/quotes.test.ts \
  ~/Desktop/Automation/backend/src/modules/styles/styles.test.ts \
  ~/Desktop/Automation/backend/src/modules/uploads/uploads.test.ts
```

All 13 files must show a byte count > 0. If any shows 0 bytes or is missing,
re-run STEP 3 for the missing file(s).

---

## STEP 5 — Install dependencies (package.json was updated)

```bash
cd ~/Desktop/Automation/backend && npm install
```

Expected: npm resolves dependencies and exits without errors. This is needed
because `package.json` was modified to wire up `jest.setup.ts` in the jest
config.

---

## STEP 6 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 29 passed, 29 total
Tests:       719 passed, 719 total
```

> **All 719 tests must pass with 0 failures.**
> The test suite runs entirely with mocked Prisma, Redis, and external
> services — no Docker containers, no real database, no internet connection
> required.

---

## What was fixed in the bug audit (for your reference)

| Bug | File | Description |
|-----|------|-------------|
| BUG-A | `requireFeature.ts` | Read `BUSINESS_TYPE` at module-load time (constant) → 503 feature-flag tests always passed with the startup value, never the test override. Fixed: reads `process.env` at **each request**. |
| BUG-B | `analytics.test.ts` | `POST /api/analytics/events` controller returns `201 Created` but 2 tests expected `200`. Fixed: updated expectations to `201`. |
| BUG-C | `quotes.test.ts` | `POST /api/quotes` (201 test): `prisma.quote.findUnique` mocked with `mockResolvedValue(null)` for ALL calls. `fetchQuoteDetail` (called after create) also uses `findUnique` → got `null` → threw 404. Fixed: use `mockResolvedValueOnce(baseQuote)` so only the post-create detail fetch returns the quote. |
| BUG-D | `uploads.test.ts` | `upload_stream` mock returned a `Readable` stream. The service calls `stream.end(buffer)` but `Readable` has no `.end()` method (only `Writable` does) → `TypeError: stream.end is not a function` → 500. Fixed: mock returns `PassThrough` (both readable + writable). |
| BUG-E | `uploads.test.ts` | Controller returns `201 Created` but 2 success tests expected `200`. Fixed: updated to `201`. |
| BUG-F | `uploads.test.ts` | "no files" test manually set `Content-Type: multipart/form-data` without a boundary → busboy threw `RangeError: missing boundary` → 500. Fixed: removed the manual Content-Type header; supertest sends a plain POST with no body, Multer sets `req.files` to undefined, controller returns 400. |
| BUG-G | `availability.test.ts` | `GET /api/availability/slots`: test checked `res.body.data.slots` but the service returns a flat array → `res.body.data` is the array. Fixed: assert `Array.isArray(res.body.data)`. |
| BUG-H | `availability.test.ts` | `GET /api/availability/blocks`: `resolveOwnArtistId` uses `prisma.artist.findUnique` but test mocked `prisma.artist.findFirst` → `findUnique` returned `undefined` → 404. Fixed: mock `artist.findUnique` with `{ id: baseArtist.id }`. |
| BUG-I | `availability.test.ts` | `DELETE /api/availability/blocks/:id`: `deleteBlock` selects `artist: { userId: true }` on the block but mock returned `baseBlock` without that nested field → `TypeError: Cannot read properties of undefined (reading 'userId')` → 500. Fixed: mock returns `{ ...baseBlock, artist: { userId: 'u_1' } }`. |

---

## Architecture notes

- **No real I/O in tests** — every integration test mocks `../../lib/prisma`,
  `../../lib/cloudinary`, BullMQ queues, and Twilio. `supertest` creates an
  in-process HTTP server so no port binding occurs.
- **`jest.setup.ts` loaded before every test module** — setting env vars in
  `setupFiles` (not `setupFilesAfterFramework`) ensures `config/index.ts` reads
  them when it first runs at import time, before any test module executes.
- **`requireFeature` reads env at request time** — the production behaviour is
  unchanged (the env var is set once at startup), but integration tests can
  temporarily override `process.env['BUSINESS_TYPE']` between requests and have
  the middleware respond correctly.
- **Test isolation** — every test file calls `jest.clearAllMocks()` in
  `beforeEach` to reset mock call counts. Implementations set with
  `mockResolvedValue` / `mockResolvedValueOnce` are scoped to each test.
