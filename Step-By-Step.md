# BookingAutomation — Step-By-Step Terminal Guide

> Copy and paste each command block in order. Wait for each command to finish before running the next.  
> All commands run from: `~/Desktop/Automation/backend`

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
# ── Start the dev server ─────────────────────────────────────
cd ~/Desktop/Automation/backend && npm run dev

# ── Stop the server
Press Ctrl+C

# ── Run all tests (open a SECOND Terminal tab) ───────────────
cd ~/Desktop/Automation/backend && npm test

# ── Type-check without building ──────────────────────────────
cd ~/Desktop/Automation/backend && npm run typecheck

# ── Build for production ─────────────────────────────────────
cd ~/Desktop/Automation/backend && npm run build
```

---

## 🗄️ Database Commands

```bash
cd ~/Desktop/Automation/backend

# ── Run all pending migrations ────────────────────────────────
npm run db:migrate

# ── Regenerate Prisma client after schema change ──────────────
npm run db:generate

# ── Seed the database with test data ─────────────────────────
npm run db:seed

# ── Open Prisma Studio (visual DB browser) ────────────────────
npm run db:studio
# → opens http://localhost:5555

# ── Reset database (drops all data, re-runs all migrations) ───
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

### Prerequisites before starting

- [ ] Step 1.1 complete (all 3 checks passing)
- [ ] PostgreSQL installed and running (pgAdmin open, `automation_dev` database created)

### What this step does

Creates the entire PostgreSQL database schema in a single Prisma schema file.

**Files created in this step:**

| File | Purpose |
|---|---|
| `backend/prisma/schema.prisma` | Complete database schema — all 15 models, 4 enums, indexes, cascade rules |

**Models:** User, Artist, ArtistAvailability, AvailabilityBlock, TattooStyle, ArtistStyle, Lead, Quote, Booking, Invoice, RefreshToken, PasswordResetToken, EmailTemplate, FeatureFlag, AnalyticsEvent.

---

### 📋 Step 0: Confirm PostgreSQL is running

Open **pgAdmin 4** on your Mac. You should see your PostgreSQL server listed on the left. Make sure:

- The server is connected (click it — if it asks for a password, enter it and click Save)
- You have a database called `automation_dev` under **Databases**

> ❌ If `automation_dev` doesn't exist yet: right-click **Databases** → **Create** → **Database...** → type `automation_dev` → click **Save**.

Your PostgreSQL is already running as a background service on your Mac — you don't need to start anything extra.

---

### 📋 Step 1: Create the .env file

This is the file that tells the backend how to connect to your local database.

**Run this command to copy the template:**

```bash
cp ~/Desktop/Automation/backend/.env.example ~/Desktop/Automation/backend/.env
echo "✅ .env created"
```

Now open the file in VS Code:

```bash
open -a "Visual Studio Code" ~/Desktop/Automation/backend/.env
```

**Make exactly these 3 changes** (leave everything else as-is):

---

**Change 1 — DATABASE_URL**

Find this line:
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

Replace the entire line with:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/automation_dev
```

> Replace `YOUR_PASSWORD` with the password you set when you installed PostgreSQL.  
> If you used the default during installation, it is `postgres`.  
> Example if your password is `postgres`:
> ```
> DATABASE_URL=postgresql://postgres:postgres@localhost:5432/automation_dev
> ```

---

**Change 2 — JWT_ACCESS_SECRET**

Run this in Terminal to generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output (a long random string). In your `.env`, find:
```
JWT_ACCESS_SECRET=REPLACE_WITH_STRONG_SECRET_64_CHARS_MIN
```

Replace `REPLACE_WITH_STRONG_SECRET_64_CHARS_MIN` with the output you just copied.

---

**Change 3 — JWT_REFRESH_SECRET**

Run the same command **again** to get a **different** secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy this new output. Find:
```
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_STRONG_SECRET_64_CHARS_MIN
```

Replace `REPLACE_WITH_DIFFERENT_STRONG_SECRET_64_CHARS_MIN` with this second output.

---

**Everything else in .env** — leave exactly as-is. All the other placeholders (Resend, Cloudinary, Twilio, Google) are only needed in later phases.

**Save the file** (`⌘ S`).

---

**Verify the database connection works:**

```bash
cd ~/Desktop/Automation/backend && npx prisma db pull --print 2>&1 | head -5
```

**Expected output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
```

> ❌ If you see `P1001: Can't reach database server at localhost:5432` — PostgreSQL is not running. Open pgAdmin, click the server, enter your password. Then try again.  
> ❌ If you see `P1000: Authentication failed` — the password in DATABASE_URL is wrong. Fix it in `.env`, save, and try again.

---

### 📋 Step 2: Create the Prisma schema file

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

### 📋 Step 3: Verify the schema is valid

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

### 📋 Step 4: Run the initial migration

This creates all the database tables.

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

> ❌ If you see `P1001: Can't reach database server at localhost:5432` — PostgreSQL is not running. Open pgAdmin, connect your server, then try again.  
> ❌ If you see `P1000: Authentication failed` — your password in DATABASE_URL is wrong. Fix it in `.env` and try again.  
> ❌ Any other errors — stop and tell me.

---

### 📋 Step 5: Verify in Prisma Studio

```bash
cd ~/Desktop/Automation/backend && npm run db:studio
```

This opens **http://localhost:5555** in your browser automatically.

**You should see these 15 tables in the left sidebar:**
```
analytics_events       artist_availability    artist_styles
artists                availability_blocks    bookings
email_templates        feature_flags          invoices
leads                  password_reset_tokens  quotes
refresh_tokens         tattoo_styles          users
```

Once confirmed — press **Ctrl+C** in Terminal to stop Prisma Studio.

> ❌ If you see `P1001: Can't reach database server` — PostgreSQL is not running. Open pgAdmin, connect, then try again.

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

| Step | What | Status |
|---|---|---|
| ✅ 1.1 | Project scaffolding | Done |
| 🔄 1.2 | Prisma schema + migrations | In progress |
| ⬜ 1.3 | Express app + health endpoint | Not started |
| ⬜ 1.4 | Auth (JWT, register, login, forgot/reset) | Not started |
| ⬜ 1.4b | Business type config | Not started |
| ⬜ 1.5 | Artists API | Not started |
| ⬜ 1.6 | Styles API | Not started |
| ⬜ 1.7 | Leads API | Not started |
| ⬜ 1.8 | Quotes API | Not started |
| ⬜ 1.9 | Bookings API | Not started |
| ⬜ 1.10 | Invoices API | Not started |
| ⬜ 1.11 | Email module (Resend + 7 templates) | Not started |
| ⬜ 1.12 | Google Calendar integration | Not started |
| ⬜ 1.13 | Analytics API | Not started |
| ⬜ 1.14 | File upload (Cloudinary + Multer) | Not started |
| ⬜ 1.15 | Feature flags (God Mode) | Not started |
| ⬜ 1.16 | Seed script | Not started |
| ⬜ 1.17 | WhatsApp automation (Twilio) | Not started |
| ⬜ 1.18 | BullMQ queue infrastructure | Not started |
| ⬜ 1.19 | Review request automation | Not started |
| ⬜ 1.20 | Availability & time slot engine | Not started |
| ⬜ 1.21 | Docker Compose | Not started |
| ⬜ 1.22 | Integration tests (all routes) | Not started |

---

## 🆘 Troubleshooting

### `npm install` fails

```bash
cd ~/Desktop/Automation/backend
rm -rf node_modules package-lock.json
npm install
```

### `npm run dev` — "Cannot find module"

```bash
cd ~/Desktop/Automation/backend && npm install
```

### `npm run typecheck` shows errors

Do not move to the next step until all TypeScript errors are fixed.  
Copy the exact error message and we will fix it together.

### Database connection refused (P1001)

PostgreSQL is not running. Open pgAdmin 4, click the server, enter your password when prompted. Then try your command again.

### Authentication failed (P1000)

The password in your `DATABASE_URL` is wrong. Open `backend/.env`, find the `DATABASE_URL` line, and correct the password between `:` and `@localhost`. Save the file and try again.

### Port 3000 already in use

```bash
# Find the PID using port 3000, then kill it
lsof -i :3000
# Note the PID from the output, then run:
kill -9 <PID>
cd ~/Desktop/Automation/backend && npm run dev
```

### Check what's running on a port

```bash
lsof -i :3000   # dev server
lsof -i :5432   # PostgreSQL
lsof -i :5555   # Prisma Studio
```

---

> **Last updated: Step 1.2 in progress.**
