# BookingAutomation — Step-By-Step Guide

> Run every command from: `~/Desktop/Automation/backend` unless told otherwise.
> Copy and paste each block exactly. Wait for it to finish before running the next one.

---

## ✅ Step 1.1 — Done
## ✅ Step 1.2 — Done
## ✅ Step 1.3 — Done
## ✅ Step 1.4 / 1.4b / 1.5 — Full reinstall done (31 files, 62/62 tests passing)

---

## Fixes — Two issues found after reinstall

**Issue 1** — `users.phone` does not exist in the database.
> Root cause: `npx prisma migrate dev` was never run. `prisma generate` only builds the TypeScript client — it does NOT apply schema changes to the real database. Every new column in `schema.prisma` (phone, breakStart, breakEnd, commissionRate, etc.) must be applied with a migration before the server can use them.

**Issue 2** — `.env` BUSINESS_TYPE comment only listed 4 types (`tattoo_studio | hair_salon | barber | restaurant`).
> Root cause: `.env.example` was never included in the download steps, so the user's local file was outdated. The correct file lists all 6 types.

**Files changed to fix both issues:**
- `backend/.env.example` — was missing from download steps; added now so you have the correct template

---

### STEP 1 — Delete old .env.example

```bash
cd ~/Desktop/Automation/backend && \
rm -f .env.example && echo "OLD FILE DELETED"
```

Expected: `OLD FILE DELETED`

---

### STEP 2 — Download updated .env.example

```bash
cd ~/Desktop/Automation/backend && \
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend" && \
curl -sfL -o .env.example "$BASE/.env.example" && echo "OK 1/1 .env.example" || echo "FAILED: .env.example"
```

Expected: `OK 1/1 .env.example`

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
{"success":true,"data":[],"meta":{"page":1,"pageSize":20,"total":0,"totalPages":0},"error":null}
```

---

All 9 steps passing = Issues fixed. Steps 1.4 / 1.4b / 1.5 fully complete. ✅

