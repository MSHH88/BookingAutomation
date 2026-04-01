# BookingAutomation — Step-By-Step Terminal Guide

> **This file is your practical hands-on companion to PHASE1.md.**  
> Each step in PHASE1.md has a matching section here with the exact terminal commands you run.  
> Copy and paste each block in order. Always wait for a command to finish before running the next.  
> Path for all commands: `~/Desktop/Automation/backend`

---

## 🐳 Before You Start — Install Docker Desktop

> **Read this first.** Docker must be installed and running before you can start the database. If you skip this and run `docker compose up -d`, you will get `zsh: command not found: docker`.

### What is Docker?

Docker is a free app that lets you run software like a database **inside a container** on your Mac — without installing the database directly onto your machine. Think of it like a tiny isolated computer that runs inside your Mac.

For this project, Docker runs two things locally:
- **PostgreSQL** — the database that stores all your booking data
- **Redis** — a fast cache used for sessions and rate limiting

Both start with a single command (`docker compose up -d`) and stop just as easily. Your data is saved between restarts.

---

### How to install Docker Desktop on Mac

**Step 1 — Check if Docker is already installed**

Open Terminal and run:
```bash
docker --version
```

- If you see `Docker version 26.x.x` → ✅ Already installed, skip to the next section.
- If you see `zsh: command not found: docker` → Follow the steps below.

---

**Step 2 — Find out which Mac chip you have**

Click the  (Apple logo) in the top-left corner of your screen → **About This Mac**

- Look for **"Chip"** — if it says **Apple M1 / M2 / M3 / M4** → you have **Apple Silicon**
- Look for **"Processor"** — if it says **Intel** → you have **Intel**

---

**Step 3 — Download Docker Desktop**

Go to: **https://www.docker.com/products/docker-desktop/**

Click **"Download for Mac"** and choose:
- **Apple Silicon** if your chip is M1/M2/M3/M4
- **Intel Chip** if your processor is Intel

---

**Step 4 — Install Docker Desktop**

1. Open the `.dmg` file that downloaded
2. Drag the **Docker** icon into your **Applications** folder
3. Close the installer window

---

**Step 5 — Open Docker Desktop**

1. Open **Finder → Applications → Docker** (or press `⌘ Space`, type `Docker`, press Enter)
2. Wait for the **whale icon 🐳** to appear in your Mac's **menu bar** (top-right of screen)
3. Wait until the whale **stops animating** — that means Docker is fully started
4. If Docker asks you to **accept terms** → click **Accept**

> ⚠️ The whale icon 🐳 must be visible and still in your menu bar **every time** you use Docker commands. If it's not there, open Docker from Applications before running any `docker compose` commands.

---

**Step 6 — Verify Docker is working**

Open Terminal and run both commands:

```bash
docker --version
```
**Expected:**
```
Docker version 26.x.x, build xxxxxxx
```

```bash
docker compose version
```
**Expected:**
```
Docker Compose version v2.x.x
```

> ❌ If either command still shows `command not found` — **close Terminal completely**, reopen it, then try again. Docker adds itself to your PATH when it first launches.

---

✅ Docker is installed and working. You're ready to follow the steps below.

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

> **Status: DONE** — All files created and verified (0 vulnerabilities, typecheck clean, tests pass).

### Files created

| File | Purpose |
|---|---|
| `backend/package.json` | All dependencies, scripts, jest config |
| `backend/tsconfig.json` | TypeScript config (strict mode, node16, ES2022) |
| `backend/.env.example` | Template for all environment variables |
| `backend/.gitignore` | Prevents secrets and build artifacts from being committed |

---

---

## 🔄 Step 1.2 — Database Schema (Prisma)

> **Status: IN PROGRESS** — Current step.

### 📥 Get the latest Step-By-Step guide first

The files for this step were committed to the repository. Before running any commands, download the updated guide to replace your local copy:

```bash
curl -L -o ~/Desktop/Automation/Step-By-Step.md \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/Step-By-Step.md"
echo "✅ Step-By-Step.md updated"
```

**Expected output:**
```
✅ Step-By-Step.md updated
```

Then open the new file in VS Code and continue from **Step 1** below.

---

### Prerequisites before starting

- [ ] Step 1.1 complete (all 3 checks passing)
- [ ] Docker Desktop installed and running (instructions in Step 0 below)

### What this step does

Creates the entire PostgreSQL database schema in a single Prisma schema file, plus a Docker Compose file to run the local database.

**Files created in this step:**

| File | Purpose |
|---|---|
| `docker-compose.yml` | Starts PostgreSQL 16 + Redis 7 locally with one command |
| `backend/prisma/schema.prisma` | Complete database schema — all 15 models, 4 enums, indexes, cascade rules |

**Models:** User, Artist, ArtistAvailability, AvailabilityBlock, TattooStyle, ArtistStyle, Lead, Quote, Booking, Invoice, RefreshToken, PasswordResetToken, EmailTemplate, FeatureFlag, AnalyticsEvent.

---

### 📋 Step 0: Install Docker Desktop (skip if already installed)

Docker Desktop is the app that runs your local PostgreSQL database and Redis. You only install it once.

**Check if Docker is already installed:**
```bash
docker --version
```

If you see something like `Docker version 26.x.x` → skip to Step 1.  
If you see `zsh: command not found: docker` → follow the steps below.

---

**Download and install Docker Desktop for Mac:**

1. Go to → **https://www.docker.com/products/docker-desktop/**
2. Click **"Download for Mac"**
   - If your Mac has an Apple chip (M1/M2/M3/M4) → choose **Apple Silicon**
   - If your Mac has an Intel chip → choose **Intel Chip**  
   - _(Not sure? Click  → "About This Mac" → look for "Chip" or "Processor")_
3. Open the downloaded `.dmg` file
4. Drag **Docker** into your **Applications** folder
5. Open **Docker** from Applications (or Spotlight: press `⌘ Space`, type `Docker`, press Enter)
6. Wait for the Docker whale icon 🐳 to appear in your **menu bar** (top-right of screen) and stop animating
7. If Docker asks you to accept terms → click **Accept**

**Verify Docker is working:**
```bash
docker --version
```

**Expected output:**
```
Docker version 26.x.x, build xxxxxxx
```

```bash
docker compose version
```

**Expected output:**
```
Docker Compose version v2.x.x
```

> ❌ If either command still shows `command not found` — close Terminal completely, reopen it, and try again. Docker adds itself to your PATH when it first launches.

> ⚠️ Docker Desktop must be **open and running** (whale icon in menu bar) every time you use `docker compose`. If the whale icon is not visible, open Docker from Applications first.

---

### 📋 Step 1: Create the Docker Compose file

This starts a local PostgreSQL database and Redis, both exactly matching what runs in production.

Open Terminal. **Copy the entire block below and paste it in one go**, then press Enter.

```bash
cat > ~/Desktop/Automation/docker-compose.yml << 'EOF'
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: automation_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --save 60 1 --loglevel warning
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  postgres_data:
  redis_data:
EOF
echo "✅ docker-compose.yml created"
```

**Expected output:**
```
✅ docker-compose.yml created
```

---

### 📋 Step 2: Create the Prisma schema file

This creates the full database schema with all models, relationships, and indexes.

```bash
mkdir -p ~/Desktop/Automation/backend/prisma && cat > ~/Desktop/Automation/backend/prisma/schema.prisma << 'EOF'
// This is your Prisma schema file.
// Learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum Role {
  ADMIN
  ARTIST
  CUSTOMER
}

enum LeadStatus {
  NEW
  CONTACTED
  QUOTED
  BOOKED
  COMPLETED
  CANCELLED
  LOST
}

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
}

enum BookingStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum InvoiceStatus {
  UNPAID
  PAID
  OVERDUE
  VOID
}

// ─── Models ──────────────────────────────────────────────────────────────────

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(CUSTOMER)
  name         String
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  artist        Artist?
  refreshTokens RefreshToken[]
  resetTokens   PasswordResetToken[]

  @@map("users")
}

model Artist {
  id              String   @id @default(cuid())
  userId          String   @unique
  slug            String   @unique
  bio             String?
  profileImageUrl String?
  portfolioImages String[]
  bufferMinutes   Int      @default(30)
  slotDuration    Int      @default(90)
  isActive        Boolean  @default(true)

  user         User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  availability ArtistAvailability[]
  blocks       AvailabilityBlock[]
  styles       ArtistStyle[]
  leads        Lead[]               @relation("ArtistLeads")
  quotes       Quote[]              @relation("ArtistQuotes")
  bookings     Booking[]            @relation("ArtistBookings")

  @@index([isActive])
  @@map("artists")
}

model ArtistAvailability {
  id        String  @id @default(cuid())
  artistId  String
  dayOfWeek Int
  startTime String
  endTime   String
  isActive  Boolean @default(true)

  artist Artist @relation(fields: [artistId], references: [id], onDelete: Cascade)

  @@unique([artistId, dayOfWeek])
  @@index([artistId, isActive])
  @@map("artist_availability")
}

model AvailabilityBlock {
  id        String   @id @default(cuid())
  artistId  String
  startAt   DateTime
  endAt     DateTime
  reason    String?
  createdAt DateTime @default(now())

  artist Artist @relation(fields: [artistId], references: [id], onDelete: Cascade)

  @@index([artistId, startAt, endAt])
  @@map("availability_blocks")
}

model TattooStyle {
  id              String  @id @default(cuid())
  name            String  @unique
  description     String?
  exampleImageUrl String?
  isActive        Boolean @default(true)

  artists ArtistStyle[]
  leads   Lead[]        @relation("StyleLeads")

  @@index([isActive])
  @@map("tattoo_styles")
}

model ArtistStyle {
  artistId String
  styleId  String

  artist Artist      @relation(fields: [artistId], references: [id], onDelete: Cascade)
  style  TattooStyle @relation(fields: [styleId], references: [id], onDelete: Cascade)

  @@id([artistId, styleId])
  @@map("artist_styles")
}

model Lead {
  id              String     @id @default(cuid())
  artistId        String?
  styleId         String?
  placement       Json
  size            String?
  colorPreference String?
  referenceImages String[]
  description     String
  name            String
  email           String
  phone           String
  preferWhatsApp  Boolean    @default(false)
  preferredDates  Json?
  status          LeadStatus @default(NEW)
  score           Int        @default(0)
  source          String?
  utmMedium       String?
  utmCampaign     String?
  ipAddress       String?
  deviceType      String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  artist          Artist?      @relation("ArtistLeads", fields: [artistId], references: [id], onDelete: SetNull)
  style           TattooStyle? @relation("StyleLeads", fields: [styleId], references: [id], onDelete: SetNull)
  quotes          Quote[]
  booking         Booking?
  analyticsEvents AnalyticsEvent[]

  @@index([status])
  @@index([artistId, status])
  @@index([email])
  @@index([createdAt])
  @@map("leads")
}

model Quote {
  id          String      @id @default(cuid())
  leadId      String
  artistId    String
  price       Decimal     @db.Decimal(10, 2)
  hours       Float?
  notes       String?
  validUntil  DateTime
  status      QuoteStatus @default(DRAFT)
  sentAt      DateTime?
  respondedAt DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  lead    Lead    @relation(fields: [leadId], references: [id], onDelete: Cascade)
  artist  Artist  @relation("ArtistQuotes", fields: [artistId], references: [id], onDelete: Restrict)
  booking Booking?

  @@index([leadId])
  @@index([artistId, status])
  @@map("quotes")
}

model Booking {
  id              String        @id @default(cuid())
  leadId          String        @unique
  quoteId         String?       @unique
  artistId        String
  startAt         DateTime
  endAt           DateTime
  status          BookingStatus @default(PENDING)
  calendarEventId String?
  icsToken        String?       @unique
  notes           String?
  confirmedAt     DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?
  cancelReason    String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  lead    Lead     @relation(fields: [leadId], references: [id], onDelete: Restrict)
  quote   Quote?   @relation(fields: [quoteId], references: [id], onDelete: SetNull)
  artist  Artist   @relation("ArtistBookings", fields: [artistId], references: [id], onDelete: Restrict)
  invoice Invoice?

  @@index([artistId, startAt])
  @@index([status])
  @@index([startAt, endAt])
  @@map("bookings")
}

model Invoice {
  id        String        @id @default(cuid())
  bookingId String        @unique
  amount    Decimal       @db.Decimal(10, 2)
  currency  String        @default("GBP")
  status    InvoiceStatus @default(UNPAID)
  dueDate   DateTime
  paidAt    DateTime?
  voidedAt  DateTime?
  sentAt    DateTime?
  notes     String?
  lineItems Json
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Restrict)

  @@index([status])
  @@index([dueDate])
  @@map("invoices")
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_reset_tokens")
}

model EmailTemplate {
  id        String   @id @default(cuid())
  key       String   @unique
  subject   String
  htmlBody  String
  variables Json
  isActive  Boolean  @default(true)
  updatedAt DateTime @updatedAt

  @@index([isActive])
  @@map("email_templates")
}

model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique
  label       String
  description String?
  isEnabled   Boolean  @default(true)
  updatedAt   DateTime @updatedAt

  @@map("feature_flags")
}

model AnalyticsEvent {
  id          String   @id @default(cuid())
  leadId      String?
  eventType   String
  payload     Json?
  sessionId   String?
  ipAddress   String?
  userAgent   String?
  referrer    String?
  utmSource   String?
  utmMedium   String?
  utmCampaign String?
  createdAt   DateTime @default(now())

  lead Lead? @relation(fields: [leadId], references: [id], onDelete: SetNull)

  @@index([eventType])
  @@index([leadId])
  @@index([createdAt])
  @@map("analytics_events")
}
EOF
echo "✅ prisma/schema.prisma created"
```

**Expected output:**
```
✅ prisma/schema.prisma created
```

---

### 📋 Step 3: Verify the schema file is valid

Before touching the database, check that Prisma can parse the schema with zero errors.

```bash
cd ~/Desktop/Automation/backend && npx prisma validate
```

**Expected output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid 🚀
```

> ❌ If you see any errors — stop and tell me before continuing.

---

### 📋 Step 4: Start the local database

> ⚠️ **Before running this step:** make sure Docker Desktop is open and the whale icon 🐳 is visible and still in your Mac menu bar. If it's not there, open Docker from Applications and wait for it to fully start before continuing.

```bash
cd ~/Desktop/Automation && docker compose up -d
```

**Expected output:**
```
✔ Network automation_default  Created
✔ Container automation-postgres-1  Started
✔ Container automation-redis-1     Started
```

Wait ~5 seconds, then verify both containers are healthy:

```bash
docker compose ps
```

**Expected output (both STATUS columns should say "healthy"):**
```
NAME                    IMAGE               STATUS
automation-postgres-1   postgres:16-alpine  Up X seconds (healthy)
automation-redis-1      redis:7-alpine      Up X seconds (healthy)
```

> ⚠️ If either shows `starting` instead of `healthy` — wait 10 more seconds and run `docker compose ps` again. It takes a moment on first run.

> ❌ If either shows `unhealthy` or `exited` — stop and tell me before continuing.

> ❌ If you see `zsh: command not found: docker` — Docker Desktop is not installed or not open. Go back to **Step 0**.

---

### 📋 Step 5: Run the initial migration

This creates all the database tables from your schema.

```bash
cd ~/Desktop/Automation/backend && npm run db:migrate
```

When prompted for a migration name, type `init` and press Enter.

**Expected output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "automation_dev", schema "public" at "localhost:5432"

✔ Enter a name for the new migration: › init

Applying migration `20260401000000_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260401000000_init/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in Xms
```

> ❌ If you see `Error: P1001: Can't reach database server at localhost:5432` — Docker is not running or the containers were not started. Go back to **Step 4** and start the containers first, then return here.

> ❌ If you see any other errors — stop and tell me before continuing.

---

### 📋 Step 6: Verify in Prisma Studio

Open the visual database browser to confirm all 15 tables were created:

```bash
cd ~/Desktop/Automation/backend && npm run db:studio
```

This opens **http://localhost:5555** in your browser automatically.

**You should see these tables in the left sidebar:**
```
analytics_events
artist_availability
artist_styles
artists
availability_blocks
bookings
email_templates
feature_flags
invoices
leads
password_reset_tokens
quotes
refresh_tokens
tattoo_styles
users
```

Once confirmed — press **Ctrl+C** in Terminal to stop Prisma Studio.

> ❌ If you see `Error: P1001: Can't reach database server at localhost:5432` — the Docker containers are not running. Go back to **Step 4**, start them, and return here.

---

### ✅ Step 1.2 Complete Checklist

```bash
cd ~/Desktop/Automation/backend

# Check 1: Schema validates
npx prisma validate
# → "The schema at prisma/schema.prisma is valid 🚀"

# Check 2: TypeScript still clean
npm run typecheck
# → no output = ✅

# Check 3: Tests still pass
npm test
# → "No tests found, exiting with code 0" = ✅
```

All three must pass before moving to Step 1.3.

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
