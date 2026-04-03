# BookingAutomation — Step-By-Step Guide

> Run every command from: `~/Desktop/Automation/backend` unless told otherwise.
> Copy and paste each block exactly. Wait for it to finish before running the next one.

---

## ✅ Steps 1.1 → 1.5 + Full reinstall — Done (31 files, 62/62 tests passing)
## ✅ Two post-reinstall issues found and fixed
## ✅ Step 1.6 — requireFeature middleware + Styles module — Done (78/78 tests passing)

---

## Step 1.6 — Files Created / Updated

| # | File | Status |
|---|------|--------|
| 1 | `backend/src/middleware/requireFeature.ts` | **NEW** — feature-flag gate middleware |
| 2 | `backend/src/modules/styles/styles.schema.ts` | **NEW** — Zod request schemas |
| 3 | `backend/src/modules/styles/styles.service.ts` | **NEW** — business logic |
| 4 | `backend/src/modules/styles/styles.controller.ts` | **NEW** — HTTP handlers |
| 5 | `backend/src/modules/styles/styles.routes.ts` | **NEW** — Express router |
| 6 | `backend/src/modules/styles/styles.service.test.ts` | **NEW** — unit tests (16 tests) |
| 7 | `backend/src/app.ts` | **UPDATED** — mounts `/api/styles` |

---

### STEP 1 — Delete the outdated files

```bash
cd ~/Desktop/Automation/backend && \
rm -f src/middleware/requireFeature.ts \
      src/modules/styles/styles.schema.ts \
      src/modules/styles/styles.service.ts \
      src/modules/styles/styles.controller.ts \
      src/modules/styles/styles.routes.ts \
      src/modules/styles/styles.service.test.ts \
      src/app.ts && echo "OLD FILES DELETED"
```

Expected: `OLD FILES DELETED`

---

### STEP 2 — Download the new/updated files

```bash
cd ~/Desktop/Automation/backend && \
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend" && \
mkdir -p src/middleware src/modules/styles && \
curl -sfL -o src/middleware/requireFeature.ts "$BASE/src/middleware/requireFeature.ts" && echo "OK 1/7 requireFeature.ts" || echo "FAILED: requireFeature.ts" && \
curl -sfL -o src/modules/styles/styles.schema.ts "$BASE/src/modules/styles/styles.schema.ts" && echo "OK 2/7 styles.schema.ts" || echo "FAILED: styles.schema.ts" && \
curl -sfL -o src/modules/styles/styles.service.ts "$BASE/src/modules/styles/styles.service.ts" && echo "OK 3/7 styles.service.ts" || echo "FAILED: styles.service.ts" && \
curl -sfL -o src/modules/styles/styles.controller.ts "$BASE/src/modules/styles/styles.controller.ts" && echo "OK 4/7 styles.controller.ts" || echo "FAILED: styles.controller.ts" && \
curl -sfL -o src/modules/styles/styles.routes.ts "$BASE/src/modules/styles/styles.routes.ts" && echo "OK 5/7 styles.routes.ts" || echo "FAILED: styles.routes.ts" && \
curl -sfL -o src/modules/styles/styles.service.test.ts "$BASE/src/modules/styles/styles.service.test.ts" && echo "OK 6/7 styles.service.test.ts" || echo "FAILED: styles.service.test.ts" && \
curl -sfL -o src/app.ts "$BASE/src/app.ts" && echo "OK 7/7 app.ts" || echo "FAILED: app.ts"
```

Expected:
```
OK 1/7 requireFeature.ts
OK 2/7 styles.schema.ts
OK 3/7 styles.service.ts
OK 4/7 styles.controller.ts
OK 5/7 styles.routes.ts
OK 6/7 styles.service.test.ts
OK 7/7 app.ts
```

---

### STEP 3 — Fix your local .env BUSINESS_TYPE comment

Open your `.env` file and find this line:
```
# Values: tattoo_studio | hair_salon | barber | restaurant
```

Replace it with:
```
# Values: tattoo_studio | hair_salon | barber | nail_salon | masseuse | restaurant
```

The `BUSINESS_TYPE=` value itself stays the same — only the comment above it changes.

---

### STEP 4 — Run the database migration

This applies the full schema to your PostgreSQL database for the first time.
It creates all tables and columns including `phone`, `breakStart`, `breakEnd`, and all other new fields.

Stop the dev server first if it is running (Ctrl+C in the server terminal window), then run:

```bash
cd ~/Desktop/Automation/backend && npx prisma migrate dev --name init
```

Expected output (roughly):
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "...", schema "public"

✔ Generated Prisma Client

The following migration(s) have been applied:

migrations/
  └─ 20260403_init/
    └─ migration.sql

✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in XXXms

Your database is now in sync with your schema.
```

> If it asks **"We need to reset the PostgreSQL database"** — type `y` and press Enter. This is fine in development.
> If you see any error — stop and paste the full output here before continuing.

---

### STEP 5 — Restart the dev server

```bash
cd ~/Desktop/Automation/backend && npm run dev
```

Expected:
```
[info] Server started {"port":3000,"env":"development","pid":XXXXX}
```

---

### STEP 6 — Verify health endpoint

```bash
curl http://localhost:3000/health
```

Expected:
```json
{"success":true,"data":{"status":"ok","timestamp":"...","env":"development"},"meta":null,"error":null}
```

---

### STEP 7 — Verify 404 handler

```bash
curl http://localhost:3000/api/doesnotexist
```

Expected:
```json
{"success":false,"data":null,"meta":null,"error":{"code":"NOT_FOUND","message":"Route not found","details":null}}
```

---

### STEP 8 — Test auth register endpoint

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

### STEP 9 — Test artists endpoint

```bash
curl -s http://localhost:3000/api/artists | jq .
```

Expected:
```json
{"success":true,"data":[],"meta":{"page":1,"limit":20,"total":0,"totalPages":0},"error":null}
```

---

### STEP 10 — Test styles endpoint (Step 1.6)

```bash
curl -s http://localhost:3000/api/styles | jq .
```

Expected:
```json
{"success":true,"data":[],"meta":{"page":1,"limit":20,"total":0,"totalPages":0},"error":null}
```

---

## ✅ All 10 steps passing = Step 1.6 complete. Steps 1.1 → 1.6 fully verified. ✅
