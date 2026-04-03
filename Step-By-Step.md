# BookingAutomation — Step-By-Step Guide

> Run every command from: `~/Desktop/Automation/backend` unless told otherwise.
> Copy and paste each block exactly. Wait for it to finish before running the next one.

---

## ✅ Step 1.1 — Done
## ✅ Step 1.2 — Done
## ✅ Step 1.3 — Done

---

## Step 1.4 / 1.4b / 1.5 — Download All Updated Files

---

### STEP 1 — Delete all old files

Removes every file that will be replaced so you have no outdated copies.

```bash
cd ~/Desktop/Automation/backend && \
rm -f \
  package.json \
  tsconfig.json \
  prisma/schema.prisma \
  src/app.ts \
  src/server.ts \
  src/index.ts \
  src/config/index.ts \
  src/config/businessType.ts \
  src/config/businessType.test.ts \
  src/errors/AppError.ts \
  src/lib/prisma.ts \
  src/lib/redis.ts \
  src/middleware/auth.ts \
  src/middleware/auth.test.ts \
  src/middleware/errorHandler.ts \
  src/middleware/requestLogger.ts \
  src/middleware/requireRole.ts \
  src/middleware/validate.ts \
  src/modules/artists/artists.controller.ts \
  src/modules/artists/artists.routes.ts \
  src/modules/artists/artists.schema.ts \
  src/modules/artists/artists.service.ts \
  src/modules/auth/auth.controller.ts \
  src/modules/auth/auth.routes.ts \
  src/modules/auth/auth.schema.ts \
  src/modules/auth/auth.service.ts \
  src/modules/auth/auth.service.test.ts \
  src/types/express.d.ts \
  src/utils/apiResponse.ts \
  src/utils/logger.ts \
  src/utils/paginate.ts && echo "ALL OLD FILES DELETED"
```

Expected: `ALL OLD FILES DELETED`

---

### STEP 2 — Download all 31 updated files

```bash
cd ~/Desktop/Automation/backend && \
mkdir -p prisma src/config src/errors src/lib src/middleware src/modules/artists src/modules/auth src/types src/utils && \
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend" && \
curl -sfL -o package.json                                "$BASE/package.json"                                && echo "OK  1/31 package.json"                    || echo "FAILED: package.json" && \
curl -sfL -o tsconfig.json                               "$BASE/tsconfig.json"                               && echo "OK  2/31 tsconfig.json"                   || echo "FAILED: tsconfig.json" && \
curl -sfL -o prisma/schema.prisma                        "$BASE/prisma/schema.prisma"                        && echo "OK  3/31 prisma/schema.prisma"             || echo "FAILED: prisma/schema.prisma" && \
curl -sfL -o src/app.ts                                  "$BASE/src/app.ts"                                  && echo "OK  4/31 src/app.ts"                      || echo "FAILED: src/app.ts" && \
curl -sfL -o src/server.ts                               "$BASE/src/server.ts"                               && echo "OK  5/31 src/server.ts"                   || echo "FAILED: src/server.ts" && \
curl -sfL -o src/index.ts                                "$BASE/src/index.ts"                                && echo "OK  6/31 src/index.ts"                    || echo "FAILED: src/index.ts" && \
curl -sfL -o src/config/index.ts                         "$BASE/src/config/index.ts"                         && echo "OK  7/31 src/config/index.ts"             || echo "FAILED: src/config/index.ts" && \
curl -sfL -o src/config/businessType.ts                  "$BASE/src/config/businessType.ts"                  && echo "OK  8/31 src/config/businessType.ts"       || echo "FAILED: src/config/businessType.ts" && \
curl -sfL -o src/config/businessType.test.ts             "$BASE/src/config/businessType.test.ts"             && echo "OK  9/31 src/config/businessType.test.ts"  || echo "FAILED: src/config/businessType.test.ts" && \
curl -sfL -o src/errors/AppError.ts                      "$BASE/src/errors/AppError.ts"                      && echo "OK 10/31 src/errors/AppError.ts"           || echo "FAILED: src/errors/AppError.ts" && \
curl -sfL -o src/lib/prisma.ts                           "$BASE/src/lib/prisma.ts"                           && echo "OK 11/31 src/lib/prisma.ts"               || echo "FAILED: src/lib/prisma.ts" && \
curl -sfL -o src/lib/redis.ts                            "$BASE/src/lib/redis.ts"                            && echo "OK 12/31 src/lib/redis.ts"                || echo "FAILED: src/lib/redis.ts" && \
curl -sfL -o src/middleware/auth.ts                      "$BASE/src/middleware/auth.ts"                      && echo "OK 13/31 src/middleware/auth.ts"           || echo "FAILED: src/middleware/auth.ts" && \
curl -sfL -o src/middleware/auth.test.ts                 "$BASE/src/middleware/auth.test.ts"                 && echo "OK 14/31 src/middleware/auth.test.ts"      || echo "FAILED: src/middleware/auth.test.ts" && \
curl -sfL -o src/middleware/errorHandler.ts              "$BASE/src/middleware/errorHandler.ts"              && echo "OK 15/31 src/middleware/errorHandler.ts"   || echo "FAILED: src/middleware/errorHandler.ts" && \
curl -sfL -o src/middleware/requestLogger.ts             "$BASE/src/middleware/requestLogger.ts"             && echo "OK 16/31 src/middleware/requestLogger.ts"  || echo "FAILED: src/middleware/requestLogger.ts" && \
curl -sfL -o src/middleware/requireRole.ts               "$BASE/src/middleware/requireRole.ts"               && echo "OK 17/31 src/middleware/requireRole.ts"    || echo "FAILED: src/middleware/requireRole.ts" && \
curl -sfL -o src/middleware/validate.ts                  "$BASE/src/middleware/validate.ts"                  && echo "OK 18/31 src/middleware/validate.ts"       || echo "FAILED: src/middleware/validate.ts" && \
curl -sfL -o src/modules/artists/artists.controller.ts   "$BASE/src/modules/artists/artists.controller.ts"   && echo "OK 19/31 artists.controller.ts"           || echo "FAILED: artists.controller.ts" && \
curl -sfL -o src/modules/artists/artists.routes.ts       "$BASE/src/modules/artists/artists.routes.ts"       && echo "OK 20/31 artists.routes.ts"               || echo "FAILED: artists.routes.ts" && \
curl -sfL -o src/modules/artists/artists.schema.ts       "$BASE/src/modules/artists/artists.schema.ts"       && echo "OK 21/31 artists.schema.ts"               || echo "FAILED: artists.schema.ts" && \
curl -sfL -o src/modules/artists/artists.service.ts      "$BASE/src/modules/artists/artists.service.ts"      && echo "OK 22/31 artists.service.ts"              || echo "FAILED: artists.service.ts" && \
curl -sfL -o src/modules/auth/auth.controller.ts         "$BASE/src/modules/auth/auth.controller.ts"         && echo "OK 23/31 auth.controller.ts"              || echo "FAILED: auth.controller.ts" && \
curl -sfL -o src/modules/auth/auth.routes.ts             "$BASE/src/modules/auth/auth.routes.ts"             && echo "OK 24/31 auth.routes.ts"                  || echo "FAILED: auth.routes.ts" && \
curl -sfL -o src/modules/auth/auth.schema.ts             "$BASE/src/modules/auth/auth.schema.ts"             && echo "OK 25/31 auth.schema.ts"                  || echo "FAILED: auth.schema.ts" && \
curl -sfL -o src/modules/auth/auth.service.ts            "$BASE/src/modules/auth/auth.service.ts"            && echo "OK 26/31 auth.service.ts"                 || echo "FAILED: auth.service.ts" && \
curl -sfL -o src/modules/auth/auth.service.test.ts       "$BASE/src/modules/auth/auth.service.test.ts"       && echo "OK 27/31 auth.service.test.ts"            || echo "FAILED: auth.service.test.ts" && \
curl -sfL -o src/types/express.d.ts                      "$BASE/src/types/express.d.ts"                      && echo "OK 28/31 src/types/express.d.ts"          || echo "FAILED: src/types/express.d.ts" && \
curl -sfL -o src/utils/apiResponse.ts                    "$BASE/src/utils/apiResponse.ts"                    && echo "OK 29/31 src/utils/apiResponse.ts"         || echo "FAILED: src/utils/apiResponse.ts" && \
curl -sfL -o src/utils/logger.ts                         "$BASE/src/utils/logger.ts"                         && echo "OK 30/31 src/utils/logger.ts"              || echo "FAILED: src/utils/logger.ts" && \
curl -sfL -o src/utils/paginate.ts                       "$BASE/src/utils/paginate.ts"                       && echo "OK 31/31 src/utils/paginate.ts"            || echo "FAILED: src/utils/paginate.ts"
```

Expected: all 31 lines show `OK N/31`. If any show `FAILED` — stop and paste the output here.

---

### STEP 3 — Install, generate Prisma client, run tests

```bash
cd ~/Desktop/Automation/backend && npm install && npx prisma generate && npm test
```

Expected:
```
✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in XXXms

PASS  src/config/businessType.test.ts
PASS  src/modules/auth/auth.service.test.ts
PASS  src/middleware/auth.test.ts

Test Suites: 3 passed, 3 total
Tests:       62 passed, 62 total
```

> If any test FAILS — paste the full output here before continuing.

---

### STEP 4 — Type-check (must be silent)

```bash
cd ~/Desktop/Automation/backend && npm run typecheck
```

Expected: **no output**, exit code 0. Any output = type error — paste it before continuing.

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

### STEP 9 — Test auth register endpoint

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Password123!","name":"Test User"}' | jq .
```

Expected:
```json
{"success":true,"data":{"user":{"id":"...","email":"test@test.com","name":"Test User","role":"CUSTOMER","phone":null,"createdAt":"..."},"accessToken":"..."}}
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

