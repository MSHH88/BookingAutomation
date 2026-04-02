# BookingAutomation — Step-By-Step Guide

> Run every command from: `~/Desktop/Automation/backend` unless told otherwise.
> Copy and paste each block exactly. Wait for it to finish before running the next one.

---

## ✅ Step 1.1 — Done

## ✅ Step 1.2 — Done

## ✅ Step 1.3 — Done (files downloaded in previous session)

---

## 🔄 Step 1.4 / 1.4b / 1.5 — Download & Install Updated Files

The following sections cover:
- **Step 1.4** — Authentication System (auth module + middleware)
- **Step 1.4b** — Business Type Configuration (fully expanded service catalogue)
- **Step 1.5** — Artist Management API (artists module)
- **Bug fixes** applied to files from Steps 1.3–1.5

---

### STEP 1 — Delete all files that have been updated (bugs fixed + new steps)

Paste this entire block. It deletes every file that was changed so you start clean:

```bash
cd ~/Desktop/Automation/backend

# ── Bug-fixed files (steps 1.3 and below) ──────────────────────────────────
rm -f src/middleware/validate.ts
rm -f src/index.ts
rm -f package.json

# ── Step 1.4 — Auth module ──────────────────────────────────────────────────
rm -f src/modules/auth/auth.schema.ts
rm -f src/modules/auth/auth.service.ts
rm -f src/modules/auth/auth.controller.ts
rm -f src/modules/auth/auth.routes.ts
rm -f src/modules/auth/auth.service.test.ts

# ── Step 1.4 — Middleware ───────────────────────────────────────────────────
rm -f src/middleware/auth.ts
rm -f src/middleware/requireRole.ts
rm -f src/middleware/auth.test.ts

# ── Step 1.4b — Business type config ───────────────────────────────────────
rm -f src/config/businessType.ts
rm -f src/config/businessType.test.ts

# ── Step 1.5 — Artists module ───────────────────────────────────────────────
rm -f src/modules/artists/artists.schema.ts
rm -f src/modules/artists/artists.service.ts
rm -f src/modules/artists/artists.controller.ts
rm -f src/modules/artists/artists.routes.ts

# ── Step 1.5 — Updated app.ts (mounts /api/artists) ────────────────────────
rm -f src/app.ts

echo "✅ All old files deleted."
```

Expected:
```
✅ All old files deleted.
```

---

### STEP 2 — Recreate folder structure

```bash
cd ~/Desktop/Automation/backend
mkdir -p src/modules/auth src/modules/artists src/config src/middleware
echo "✅ Folders ready."
```

---

### STEP 3 — Download all updated files

Paste this entire block (all curls run sequentially):

```bash
cd ~/Desktop/Automation/backend

BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

# ── Bug-fixed core files ────────────────────────────────────────────────────
curl -sfL -o package.json "$BASE/package.json" && echo "OK  1 package.json" || echo "FAILED: package.json"
curl -sfL -o src/index.ts "$BASE/src/index.ts" && echo "OK  2 src/index.ts" || echo "FAILED: src/index.ts"
curl -sfL -o src/app.ts "$BASE/src/app.ts" && echo "OK  3 src/app.ts" || echo "FAILED: src/app.ts"
curl -sfL -o src/middleware/validate.ts "$BASE/src/middleware/validate.ts" && echo "OK  4 src/middleware/validate.ts" || echo "FAILED: src/middleware/validate.ts"

# ── Step 1.4 — Auth module ──────────────────────────────────────────────────
curl -sfL -o src/modules/auth/auth.schema.ts "$BASE/src/modules/auth/auth.schema.ts" && echo "OK  5 auth.schema.ts" || echo "FAILED: auth.schema.ts"
curl -sfL -o src/modules/auth/auth.service.ts "$BASE/src/modules/auth/auth.service.ts" && echo "OK  6 auth.service.ts" || echo "FAILED: auth.service.ts"
curl -sfL -o src/modules/auth/auth.controller.ts "$BASE/src/modules/auth/auth.controller.ts" && echo "OK  7 auth.controller.ts" || echo "FAILED: auth.controller.ts"
curl -sfL -o src/modules/auth/auth.routes.ts "$BASE/src/modules/auth/auth.routes.ts" && echo "OK  8 auth.routes.ts" || echo "FAILED: auth.routes.ts"
curl -sfL -o src/modules/auth/auth.service.test.ts "$BASE/src/modules/auth/auth.service.test.ts" && echo "OK  9 auth.service.test.ts" || echo "FAILED: auth.service.test.ts"

# ── Step 1.4 — Middleware ───────────────────────────────────────────────────
curl -sfL -o src/middleware/auth.ts "$BASE/src/middleware/auth.ts" && echo "OK 10 middleware/auth.ts" || echo "FAILED: middleware/auth.ts"
curl -sfL -o src/middleware/requireRole.ts "$BASE/src/middleware/requireRole.ts" && echo "OK 11 middleware/requireRole.ts" || echo "FAILED: middleware/requireRole.ts"
curl -sfL -o src/middleware/auth.test.ts "$BASE/src/middleware/auth.test.ts" && echo "OK 12 middleware/auth.test.ts" || echo "FAILED: middleware/auth.test.ts"

# ── Step 1.4b — Business type config (FULL expanded service catalogue) ──────
curl -sfL -o src/config/businessType.ts "$BASE/src/config/businessType.ts" && echo "OK 13 config/businessType.ts" || echo "FAILED: config/businessType.ts"
curl -sfL -o src/config/businessType.test.ts "$BASE/src/config/businessType.test.ts" && echo "OK 14 config/businessType.test.ts" || echo "FAILED: config/businessType.test.ts"

# ── Step 1.5 — Artists module ───────────────────────────────────────────────
curl -sfL -o src/modules/artists/artists.schema.ts "$BASE/src/modules/artists/artists.schema.ts" && echo "OK 15 artists.schema.ts" || echo "FAILED: artists.schema.ts"
curl -sfL -o src/modules/artists/artists.service.ts "$BASE/src/modules/artists/artists.service.ts" && echo "OK 16 artists.service.ts" || echo "FAILED: artists.service.ts"
curl -sfL -o src/modules/artists/artists.controller.ts "$BASE/src/modules/artists/artists.controller.ts" && echo "OK 17 artists.controller.ts" || echo "FAILED: artists.controller.ts"
curl -sfL -o src/modules/artists/artists.routes.ts "$BASE/src/modules/artists/artists.routes.ts" && echo "OK 18 artists.routes.ts" || echo "FAILED: artists.routes.ts"
```

Expected — all 18 lines must say OK:
```
OK  1 package.json
OK  2 src/index.ts
OK  3 src/app.ts
OK  4 src/middleware/validate.ts
OK  5 auth.schema.ts
OK  6 auth.service.ts
OK  7 auth.controller.ts
OK  8 auth.routes.ts
OK  9 auth.service.test.ts
OK 10 middleware/auth.ts
OK 11 middleware/requireRole.ts
OK 12 middleware/auth.test.ts
OK 13 config/businessType.ts
OK 14 config/businessType.test.ts
OK 15 artists.schema.ts
OK 16 artists.service.ts
OK 17 artists.controller.ts
OK 18 artists.routes.ts
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

