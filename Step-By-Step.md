# BookingAutomation — Step-By-Step Terminal Guide

> **This file is your practical hands-on companion to PHASE1.md.**  
> Each step in PHASE1.md has a matching section here with the exact terminal commands you run.  
> Copy and paste each block in order. Always wait for a command to finish before running the next.  
> Path for all commands: `~/Desktop/Automation/backend`

---

## 🗺️ Phase Map

| Phase | What | Status |
|---|---|---|
| **Phase 1** | Backend API (Node.js + Express + Prisma + TypeScript) | 🔄 In Progress |
| **Phase 2** | CRM Admin Dashboard (React + full backend integration) | ⬜ After Phase 1 |
| **Phase 3** | Customer-Facing Frontend (booking flow website) | ⬜ After Phase 2 |
| **Phase 4** | 3D Mannequin (Three.js body placement component) | ⬜ After Phase 3 |

---

## 🖥️ Daily Commands

```bash
# ── Start the dev server ────────────────────────────────────
cd ~/Desktop/Automation/backend && npm run dev

# ── Stop the server
Press Ctrl+C

# ── Run all tests (open a SECOND Terminal tab) ──────────────
cd ~/Desktop/Automation/backend && npm test

# ── Type-check without building ─────────────────────────────
cd ~/Desktop/Automation/backend && npm run typecheck

# ── Build for production ────────────────────────────────────
cd ~/Desktop/Automation/backend && npm run build
```

---

## 🐳 Docker Commands (local database + Redis)

```bash
# ── Start PostgreSQL + Redis (run once, then leave it running) ──
cd ~/Desktop/Automation && docker compose up -d

# ── Check both containers are healthy ───────────────────────
docker compose ps

# ── Stop everything (data is preserved) ─────────────────────
docker compose down

# ── Stop and DELETE all data (full reset) ───────────────────
docker compose down -v
```

---

## 🗄️ Database Commands

```bash
cd ~/Desktop/Automation/backend

# ── Run all pending migrations ───────────────────────────────
npm run db:migrate

# ── Regenerate Prisma client after schema change ─────────────
npm run db:generate

# ── Seed the database with test data ─────────────────────────
npm run db:seed

# ── Open Prisma Studio (visual DB browser) ───────────────────
npm run db:studio
# → opens http://localhost:5555

# ── Reset database (drops all data, re-runs all migrations) ──
npm run db:reset
# ⚠️ This deletes everything — use only in development
```

---

---

# PHASE 1 — Backend Foundation

---

## ✅ Step 1.1 — Project Scaffolding

> **Status: DONE** — All 4 files already created and verified.

### Files created in this step

| File | Purpose |
|---|---|
| `backend/package.json` | All dependencies, scripts, jest config |
| `backend/tsconfig.json` | TypeScript config (strict mode, node16, ES2022) |
| `backend/.env.example` | Template for all environment variables |
| `backend/.gitignore` | Prevents secrets and build artifacts from being committed |

---

### 📋 Step 1: Move the files to your machine

Put all 4 files inside: `~/Desktop/Automation/backend/`

Your folder should look like this after:
```
~/Desktop/Automation/
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── .gitignore
```

---

### 📋 Step 2: Install Node.js (if not already installed)

Check if you have Node.js 20+:
```bash
node --version
```

Expected output (version 20 or higher):
```
v20.x.x
```

If you don't have Node.js or it's below v20, download from:  
→ https://nodejs.org/en/download  
Choose **"LTS"** version (currently 20.x).

---

### 📋 Step 3: Install dependencies

```bash
cd ~/Desktop/Automation/backend && npm install
```

This installs all packages listed in `package.json`. Takes about 30–60 seconds.

**Expected output:**
```
added 646 packages, and audited 646 packages in Xs

found 0 vulnerabilities
```

> ⚠️ If you see `found N vulnerabilities` — stop and tell me before continuing.

---

### 📋 Step 4: Create your `.env` file

```bash
cd ~/Desktop/Automation/backend && cp .env.example .env
```

Then open `.env` in your code editor (VS Code) and fill in the values you have so far.  
For Step 1.1 testing, the minimum you need is:

```
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
BUSINESS_TYPE=tattoo_studio
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/automation_dev
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=any-long-random-string-for-now-minimum-32-chars
JWT_REFRESH_SECRET=a-different-long-random-string-for-now-minimum-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
CRM_URL=http://localhost:5174
```

You can leave all other values blank for now — they are needed for specific modules in later steps.

---

### 📋 Step 5: Run the TypeScript type-check

```bash
cd ~/Desktop/Automation/backend && npm run typecheck
```

**Expected output:**
```
> automation-backend@1.0.0 typecheck
> tsc --noEmit
```

No error messages = ✅ TypeScript config is valid.

---

### 📋 Step 6: Run the security audit

```bash
cd ~/Desktop/Automation/backend && npm audit
```

**Expected output:**
```
found 0 vulnerabilities
```

---

### 📋 Step 7: Run the test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

**Expected output (Step 1.1 — no tests written yet):**
```
> automation-backend@1.0.0 test
> jest --passWithNoTests

No tests found, exiting with code 0
```

This is correct. Tests are written in later steps. `--passWithNoTests` means the suite passes when there are no test files yet.

---

### ✅ Step 1.1 Complete Checklist

Run all three checks — all must pass before moving to Step 1.2:

```bash
cd ~/Desktop/Automation/backend

# Check 1: TypeScript
npm run typecheck
# → no output = ✅

# Check 2: Audit
npm audit
# → "found 0 vulnerabilities" = ✅

# Check 3: Tests
npm test
# → "No tests found, exiting with code 0" = ✅
```

---

---

## ⬜ Step 1.2 — Database Schema (Prisma)

> **Status: NOT STARTED** — Next step after Step 1.1.

### Prerequisites before starting

- [ ] Docker Desktop installed and running
- [ ] Step 1.1 complete (all 3 checks passing)

### What this step does

Creates the entire PostgreSQL database schema in a single Prisma schema file:  
`backend/prisma/schema.prisma`

All models: User, Artist, ArtistAvailability, AvailabilityBlock, TattooStyle, Lead, Quote, Booking, Invoice, EmailTemplate, FeatureFlag, AnalyticsEvent, RefreshToken, PasswordResetToken.

### Commands you'll run in this step

```bash
# ── 1. Start the local database ──────────────────────────────
cd ~/Desktop/Automation && docker compose up -d

# ── 2. Verify database is running ────────────────────────────
docker compose ps
# → Both postgres and redis show "healthy"

# ── 3. Run the initial migration ─────────────────────────────
cd ~/Desktop/Automation/backend && npm run db:migrate
# → Enter migration name when prompted: init
# → Expected: "Your database is now in sync with your schema."

# ── 4. Generate Prisma client ─────────────────────────────────
cd ~/Desktop/Automation/backend && npm run db:generate
# → Expected: "Generated Prisma Client"

# ── 5. Verify schema in Prisma Studio ────────────────────────
cd ~/Desktop/Automation/backend && npm run db:studio
# → Opens http://localhost:5555
# → You should see all tables listed in the left sidebar
# → Press Ctrl+C when done
```

**Expected migration output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "automation_dev", schema "public" at "localhost:5432"

Applying migration `20260401_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260401000000_init/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in Xms
```

---

## ⬜ Step 1.3 — Core Express App Setup

> **Status: NOT STARTED**

### What this step does

Creates the Express app entry point with all global middleware:
- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/config/index.ts`
- `backend/src/utils/logger.ts`
- `backend/src/utils/apiResponse.ts`
- `backend/src/utils/paginate.ts`
- `backend/src/middleware/errorHandler.ts`

### Commands you'll run in this step

```bash
# ── 1. Start the dev server ──────────────────────────────────
cd ~/Desktop/Automation/backend && npm run dev
# → Expected: "🚀 Server running on port 3000"

# ── 2. Test the health endpoint (open a SECOND Terminal) ─────
curl http://localhost:3000/health
```

**Expected health response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-04-01T17:00:00.000Z",
    "env": "development"
  },
  "meta": null,
  "error": null
}
```

```bash
# ── 3. Run type-check ────────────────────────────────────────
cd ~/Desktop/Automation/backend && npm run typecheck
# → No errors = ✅

# ── 4. Run tests ─────────────────────────────────────────────
cd ~/Desktop/Automation/backend && npm test
```

---

## ⬜ Step 1.4 — Authentication System

> **Status: NOT STARTED**

### What this step does

JWT login, register, refresh, logout, forgot/reset password. All protected routes use this.

### Endpoints created in this step

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
PATCH /api/auth/me
```

### Commands you'll run in this step

```bash
# ── Test register ────────────────────────────────────────────
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Admin","email":"admin@test.com","password":"Admin1234!"}'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Test Admin", "email": "admin@test.com", "role": "CUSTOMER" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

```bash
# ── Test login ───────────────────────────────────────────────
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin1234!"}'

# ── Run tests ────────────────────────────────────────────────
cd ~/Desktop/Automation/backend && npm test
```

**Expected test output:**
```
Test Suites: 1 passed, 1 total
Tests:       X passed, X total
```

---

## ⬜ Steps 1.5 → 1.22

> **These steps will each get their own terminal command guide as they are built.**  
> See `PHASE1.md` for the full description of what each step builds.

---

---

# Phase 1 — All Steps Reference

| Step | What | Commands available |
|---|---|---|
| ✅ 1.1 | Project scaffolding | See above ↑ |
| ⬜ 1.2 | Prisma schema + migrations | See above ↑ |
| ⬜ 1.3 | Express app + health endpoint | See above ↑ |
| ⬜ 1.4 | Auth (JWT, register, login, forgot/reset) | See above ↑ |
| ⬜ 1.4b | Business type config | Added to Step 1.4 guide |
| ⬜ 1.5 | Artists API | Guide added when step starts |
| ⬜ 1.6 | Styles API | Guide added when step starts |
| ⬜ 1.7 | Leads API | Guide added when step starts |
| ⬜ 1.8 | Quotes API | Guide added when step starts |
| ⬜ 1.9 | Bookings API | Guide added when step starts |
| ⬜ 1.10 | Invoices API | Guide added when step starts |
| ⬜ 1.11 | Email module (Resend + 7 templates) | Guide added when step starts |
| ⬜ 1.12 | Google Calendar integration | Guide added when step starts |
| ⬜ 1.13 | Analytics API | Guide added when step starts |
| ⬜ 1.14 | File upload (Cloudinary + Multer) | Guide added when step starts |
| ⬜ 1.15 | Feature flags (God Mode) | Guide added when step starts |
| ⬜ 1.16 | Seed script | Guide added when step starts |
| ⬜ 1.17 | WhatsApp automation (Twilio) | Guide added when step starts |
| ⬜ 1.18 | BullMQ queue infrastructure | Guide added when step starts |
| ⬜ 1.19 | Review request automation | Guide added when step starts |
| ⬜ 1.20 | Availability & time slot engine | Guide added when step starts |
| ⬜ 1.21 | Docker Compose | Guide added when step starts |
| ⬜ 1.22 | Integration tests (all routes) | Guide added when step starts |

---

## 🆘 Troubleshooting

### `npm install` fails

```bash
# Clear cache and retry
cd ~/Desktop/Automation/backend
rm -rf node_modules package-lock.json
npm install
```

### `npm run dev` — "Cannot find module"

```bash
# Regenerate node_modules
cd ~/Desktop/Automation/backend && npm install
```

### `npm run typecheck` shows errors

Do not move to the next step until all TypeScript errors are fixed.  
Copy the exact error message and we will fix it together.

### Database connection refused

```bash
# Check if Docker is running the database
docker compose ps
# If postgres shows "Exit" or is missing:
cd ~/Desktop/Automation && docker compose up -d
```

### Port 3000 already in use

```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
# Then restart the server
cd ~/Desktop/Automation/backend && npm run dev
```

### Check what's running on a port

```bash
lsof -i :3000   # dev server
lsof -i :5432   # PostgreSQL
lsof -i :6379   # Redis
lsof -i :5555   # Prisma Studio
```

---

> **Last updated: Step 1.1 complete.**  
> Next terminal guide: Step 1.2 — Prisma schema will be added when that step starts.
