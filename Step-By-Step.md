# BookingAutomation — Step-By-Step Guide

> Run every command from: `~/Desktop/Automation/backend` unless told otherwise.
> Copy and paste each block exactly. Wait for it to finish before running the next one.

---

## ✅ Step 1.1 — Done

## ✅ Step 1.2 — Done

## ✅ Step 1.3 — Done (files downloaded in previous session)

---

## 🔄 Step 1.4b — Download Updated Files (Expanded Service Catalogue + TypeScript Fix)

**What changed in this update:**
- **`src/config/businessType.ts`** — Service catalogue massively expanded (300+ services across all 6 business types — exceeds every target)
- **`src/config/businessType.test.ts`** — Tests updated to match expanded catalogue (62 tests)
- **`src/types/express.d.ts`** — Root cause TypeScript fix: removed the `@prisma/client` import that caused `Property 'user' does not exist on type 'Request'` error when prisma types weren't yet installed

> **Note:** Steps 1.1–1.3 and Step 1.4 / 1.5 files were already downloaded and are untouched. Only these 3 files need updating.

---

### STEP 1 — Delete the 3 outdated files

```bash
cd ~/Desktop/Automation/backend

rm -f src/config/businessType.ts
rm -f src/config/businessType.test.ts
rm -f src/types/express.d.ts

echo "✅ Old files deleted."
```

Expected:
```
✅ Old files deleted.
```

---

### STEP 2 — Ensure the types folder exists

```bash
cd ~/Desktop/Automation/backend
mkdir -p src/config src/types
echo "✅ Folders ready."
```

---

### STEP 3 — Download the 3 updated files

```bash
cd ~/Desktop/Automation/backend

BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

# ── Step 1.4b — Expanded service catalogue ─────────────────────────────────
curl -sfL -o src/config/businessType.ts "$BASE/src/config/businessType.ts" \
  && echo "OK 1 businessType.ts" || echo "FAILED: businessType.ts"

curl -sfL -o src/config/businessType.test.ts "$BASE/src/config/businessType.test.ts" \
  && echo "OK 2 businessType.test.ts" || echo "FAILED: businessType.test.ts"

# ── TypeScript root-cause fix ───────────────────────────────────────────────
# Fixes: "Property 'user' does not exist on type 'Request'"
# Root cause: express.d.ts imported @prisma/client, which breaks when
# node_modules is not yet installed. Now uses a self-contained string union.
curl -sfL -o src/types/express.d.ts "$BASE/src/types/express.d.ts" \
  && echo "OK 3 express.d.ts" || echo "FAILED: express.d.ts"
```

Expected — all 3 lines must say OK:
```
OK 1 businessType.ts
OK 2 businessType.test.ts
OK 3 express.d.ts
```

> If any line says FAILED — paste it here before continuing.

---

### STEP 4 — Install / update dependencies

```bash
cd ~/Desktop/Automation/backend && npm install
```

Expected: finishes with no errors. Audit warnings are fine to ignore.

---

### STEP 5 — Run all tests

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected (62 tests must pass):
```
PASS src/config/businessType.test.ts
PASS src/modules/auth/auth.service.test.ts
PASS src/middleware/auth.test.ts

Test Suites: 3 passed, 3 total
Tests:       62 passed, 62 total
```

> If any test FAILS — paste the full output here before continuing.

---

### STEP 6 — Type-check (must be silent)

```bash
cd ~/Desktop/Automation/backend && npm run typecheck
```

Expected: **no output**, exit code 0. Any output means a type error — paste it before continuing.

---

### STEP 7 — Build

```bash
cd ~/Desktop/Automation/backend && npm run build
```

Expected: compiles to `dist/` with no errors.

---

### STEP 8 — Start the server

Make sure your `.env` has these filled in:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `BUSINESS_TYPE` (one of: `tattoo_studio`, `hair_salon`, `barber`, `nail_salon`, `masseuse`, `restaurant`)

Then:

```bash
cd ~/Desktop/Automation/backend && npm run dev
```

Expected:
```
[info] Server started {"port":3000,"env":"development","pid":XXXXX}
```

---

### STEP 9 — Verify health endpoint

```bash
curl http://localhost:3000/health
```

Expected:
```json
{"success":true,"data":{"status":"ok","timestamp":"...","env":"development"},"meta":null,"error":null}
```

---

### STEP 10 — Verify 404 handler

```bash
curl http://localhost:3000/api/doesnotexist
```

Expected:
```json
{"success":false,"data":null,"meta":null,"error":{"code":"NOT_FOUND","message":"Route not found","details":null}}
```

---

### STEP 11 — Test auth endpoints

```bash
# Register
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Password123!","name":"Test User","role":"OWNER"}' | jq .
```

Expected:
```json
{"success":true,"data":{"user":{"id":"...","email":"test@test.com","name":"Test User","role":"OWNER","phone":null,"createdAt":"..."},"accessToken":"..."}}
```

---

### STEP 12 — Test artists endpoint

```bash
curl -s http://localhost:3000/api/artists | jq .
```

Expected:
```json
{"success":true,"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0},"error":null}
```

---

All 12 steps passing = Steps 1.4 / 1.4b / 1.5 complete. ✅

---

## Bug Fix Summary (all applied in this session)

| # | File | Bug Fixed |
|---|------|-----------|
| BUG-1 | `src/middleware/validate.ts` | `req.query` and `req.params` were never updated with Zod-coerced values — only `req.body` was. Zod transforms on query params (e.g. pagination coercion) were silently discarded. |
| BUG-2 | `src/modules/artists/artists.service.ts` | `artistDetailSelect.availability` was missing `id: true`, so the artist detail endpoint returned availability items without IDs. |
| BUG-3 | `src/modules/artists/artists.service.ts` | `getAvailability` had no `isActive` filter, returning inactive records while the detail endpoint only returned active ones. |
| BUG-4 | `src/modules/artists/artists.routes.ts` | `GET /:id/availability` was the only parameterised route without `validate()`. Wired up `getAvailabilitySchema`. |
| BUG-4a | `src/modules/artists/artists.schema.ts` | Added missing `getAvailabilitySchema` for the `/:id/availability` route param. |
| BUG-5 | `src/modules/auth/auth.controller.ts` | `refreshToken` handler manually built the error envelope object instead of using `apiError()`. Missing `apiError` import added. |
| BUG-6 | `src/modules/artists/artists.service.ts` | `paginate` used the wrong type (the detail shape). Added accurate `ArtistListItem` and `ArtistDetail` types via `Prisma.ArtistGetPayload`. |
| BUG-7 | `src/modules/auth/auth.service.test.ts` | `baseUser` fixture missing `phone: null`; `toSafeUser()` would return `phone: undefined` instead of `null`. |
| BUG-8 | `src/middleware/auth.test.ts` | Same `phone: null` fix. Converted dynamic `await import()` calls to static imports (dynamic import breaks under ts-jest). |
| BUG-9 | `src/index.ts` | Replaced empty `export {}` stub with `export { app }` barrel export for integration tests. |
| BUG-10 | `package.json` | Suppressed ts-jest TS151002 warning via `diagnostics.ignoreCodes` in the transform config. |
| BUG-CATALOGUE | `src/config/businessType.ts` | Massively expanded service catalogue from ~30 services to **300+ services** across all 6 business types — hair salon, barber, masseuse, nail salon, tattoo studio, restaurant. Every possible service is now included. |

