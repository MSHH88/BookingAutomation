# BookingAutomation — Step-By-Step Guide

> Run every command from: `~/Desktop/Automation/backend` unless told otherwise.
> Copy and paste each block exactly. Wait for it to finish before running the next one.

---

## ✅ Step 1.1 — Done

## ✅ Step 1.2 — Done

## ✅ Step 1.3 — Done (files downloaded in previous session)

---

## ✅ Step 1.4b — Files Already Downloaded

The 3 updated files (`businessType.ts`, `businessType.test.ts`, `express.d.ts`) are already in place.

The tests were failing because of **one missing step**: the Prisma client must be regenerated after the schema was updated to add `phone` to the User model. Without this, TypeScript does not know `phone` exists and throws a type error.

---

### STEP 1 — Regenerate the Prisma client ⚠️ THIS WAS THE MISSING STEP

```bash
cd ~/Desktop/Automation/backend && npx prisma generate
```

Expected output ends with something like:
```
✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in XXXms
```

> If this step shows errors — paste the output here before continuing.

---

### STEP 2 — Install / update dependencies (confirm up to date)

```bash
cd ~/Desktop/Automation/backend && npm install
```

Expected: finishes with no errors. Audit warnings are fine to ignore.

---

### STEP 3 — Run all tests

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

### STEP 4 — Type-check (must be silent)

```bash
cd ~/Desktop/Automation/backend && npm run typecheck
```

Expected: **no output**, exit code 0. Any output means a type error — paste it before continuing.

---

### ✅ VERIFICATION — Did everything work?

If STEP 3 shows **3 passed, 62 passed** and STEP 4 produces **no output**, then Step 1.4b is complete and you are ready to move on.

**Checklist:**
- [ ] `PASS src/config/businessType.test.ts`
- [ ] `PASS src/modules/auth/auth.service.test.ts`
- [ ] `PASS src/middleware/auth.test.ts`
- [ ] `Tests: 62 passed, 62 total`
- [ ] `npm run typecheck` produced no output

If all 5 are ✅ — **move on to STEP 5 (Build) below.**
If anything is ❌ — paste the output here before continuing.

---

### STEP 5 — Build

```bash
cd ~/Desktop/Automation/backend && npm run build
```

Expected: compiles to `dist/` with no errors.

---

### STEP 6 — Start the server

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

### STEP 7 — Verify health endpoint

```bash
curl http://localhost:3000/health
```

Expected:
```json
{"success":true,"data":{"status":"ok","timestamp":"...","env":"development"},"meta":null,"error":null}
```

---

### STEP 8 — Verify 404 handler

```bash
curl http://localhost:3000/api/doesnotexist
```

Expected:
```json
{"success":false,"data":null,"meta":null,"error":{"code":"NOT_FOUND","message":"Route not found","details":null}}
```

---

### STEP 9 — Test auth endpoints

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

### STEP 10 — Test artists endpoint

```bash
curl -s http://localhost:3000/api/artists | jq .
```

Expected:
```json
{"success":true,"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0},"error":null}
```

---

All 10 steps passing = Steps 1.4 / 1.4b / 1.5 complete. ✅

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

