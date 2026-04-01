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

### 📋 Step 0.5: Delete any old or corrupt backend files

If you have run any part of Step 1 before (even partially), old files may be broken or out of date. This command wipes the entire `backend/` folder so you start completely clean.

> ⚠️ This deletes everything inside `backend/` — including `node_modules`, `.env`, and any files you created. Your `~/Desktop/Automation/` folder itself is kept, only the `backend/` subfolder is removed.

```bash
rm -rf ~/Desktop/Automation/backend
echo "✅ Old backend folder deleted — ready for a clean start"
```

**Expected output:**
```
✅ Old backend folder deleted — ready for a clean start
```

> If the folder didn't exist yet, the command still succeeds silently — that's fine.

---

### 📋 Step 1: Create the 4 files directly in your Automation folder

Open Terminal. **Copy the entire block below and paste it in one go**, then press Enter.

```bash
mkdir -p ~/Desktop/Automation/backend && cat > ~/Desktop/Automation/backend/package.json << 'EOF'
{
  "name": "automation-backend",
  "version": "1.0.0",
  "description": "Booking Automation backend — multi-client SaaS API",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0",
    "bcryptjs": "^3.0.3",
    "bullmq": "^5.8.0",
    "cloudinary": "^2.2.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.3.1",
    "@googleapis/calendar": "^14.2.0",
    "google-auth-library": "^10.6.2",
    "ical-generator": "^10.1.0",
    "handlebars": "^4.7.8",
    "helmet": "^7.1.0",
    "ioredis": "^5.4.1",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.1.1",
    "resend": "^3.2.0",
    "twilio": "^5.1.0",
    "uuid": "^10.0.0",
    "winston": "^3.13.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@eslint/js": "^9.5.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/multer": "^2.1.0",
    "@types/node": "^20.14.5",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^10.0.0",
    "eslint": "^9.5.0",
    "jest": "^29.7.0",
    "prisma": "^5.14.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.5",
    "tsx": "^4.15.6",
    "typescript": "^5.5.2",
    "typescript-eslint": "^8.0.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/src"],
    "testMatch": ["**/*.test.ts", "**/*.spec.ts"],
    "collectCoverageFrom": ["src/**/*.ts", "!src/**/*.d.ts"]
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
EOF
echo "✅ 1/4 package.json"
cat > ~/Desktop/Automation/backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "node16",
    "moduleResolution": "node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
EOF
echo "✅ 2/4 tsconfig.json"
cat > ~/Desktop/Automation/backend/.env.example << 'EOF'
# ============================================================
# AUTOMATION BACKEND — Environment Variables
# ============================================================
# Copy this file to .env and fill in all values.
# Never commit .env to source control.
# ============================================================

# ── Server ───────────────────────────────────────────────────
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# ── Studio Identity ───────────────────────────────────────────
STUDIO_NAME=Your Studio Name
STUDIO_ADMIN_EMAIL=admin@yourdomain.com
GOOGLE_REVIEW_URL=https://g.page/r/YOUR_GOOGLE_REVIEW_LINK

# ── Business Type ─────────────────────────────────────────────
# Values: tattoo_studio | hair_salon | barber | restaurant
BUSINESS_TYPE=tattoo_studio

# ── Database (Neon PostgreSQL) ────────────────────────────────
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require

# ── Redis ─────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── JWT ──────────────────────────────────────────────────────
JWT_ACCESS_SECRET=REPLACE_WITH_STRONG_SECRET_64_CHARS_MIN
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_STRONG_SECRET_64_CHARS_MIN
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Allowed Origins (CORS) ────────────────────────────────────
FRONTEND_URL=http://localhost:5173
CRM_URL=http://localhost:5174

# ── Resend (Email) ───────────────────────────────────────────
RESEND_API_KEY=re_REPLACE_WITH_YOUR_RESEND_API_KEY
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Your Studio Name

# ── Cloudinary (File Uploads) ─────────────────────────────────
CLOUDINARY_CLOUD_NAME=REPLACE_WITH_CLOUD_NAME
CLOUDINARY_API_KEY=REPLACE_WITH_API_KEY
CLOUDINARY_API_SECRET=REPLACE_WITH_API_SECRET

# ── Twilio (WhatsApp Automation) ──────────────────────────────
TWILIO_ACCOUNT_SID=ACREPLACE_WITH_YOUR_SID
TWILIO_AUTH_TOKEN=REPLACE_WITH_YOUR_AUTH_TOKEN
TWILIO_WHATSAPP_FROM=whatsapp:+1XXXXXXXXXX

# ── Google Calendar ──────────────────────────────────────────
GOOGLE_CLIENT_ID=REPLACE_WITH_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=REPLACE_WITH_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback

# ── Feature Flags ─────────────────────────────────────────────
BOOKING_ENABLED=true
QUOTES_ENABLED=true
ANALYTICS_ENABLED=true
LEAD_CAPTURE_ENABLED=true
EMAIL_AUTOMATION_ENABLED=true
CALENDAR_SYNC_ENABLED=true
INVOICING_ENABLED=true
WHATSAPP_CONTACT_ENABLED=true
3D_MANNEQUIN_ENABLED=true
REVIEWS_ENABLED=true
DEPOSIT_ENABLED=false
EOF
echo "✅ 3/4 .env.example"
cat > ~/Desktop/Automation/backend/.gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
.env.*.local
logs/
*.log
npm-debug.log*
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp
*.swo
coverage/
*.tsbuildinfo
EOF
echo "✅ 4/4 .gitignore"
```

**Expected output:**
```
✅ 1/4 package.json
✅ 2/4 tsconfig.json
✅ 3/4 .env.example
✅ 4/4 .gitignore
```

> ❌ If any line shows an error — stop and tell me before continuing.

**Verify the files landed correctly:**
```bash
ls -la ~/Desktop/Automation/backend/
```

Expected output:
```
-rw-r--r--  .env.example
-rw-r--r--  .gitignore
-rw-r--r--  package.json
-rw-r--r--  tsconfig.json
```

Your folder now looks like this:
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
added 639 packages, and audited 640 packages in Xs

found 0 vulnerabilities
```

> ⚠️ If you see `found N vulnerabilities` — stop and tell me before continuing.

> ℹ️ **About `npm warn deprecated` messages** — these are normal and safe to ignore. They come from internal tools used by your dependencies (not your own code), and `npm audit` is the real security check. As long as it says `found 0 vulnerabilities`, your project is secure. Deprecation warnings just mean those internal packages are old but still working.

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

### 📋 Step 5: Create the src folder and placeholder server file

TypeScript and Jest both need a `src/` directory to exist before they can run. Right now the folder is empty, so we create a one-line placeholder that keeps both tools happy. It will be replaced with the real server code in Step 1.3.

```bash
mkdir -p ~/Desktop/Automation/backend/src && cat > ~/Desktop/Automation/backend/src/server.ts << 'EOF'
// Step 1.1 placeholder — replaced with real server in Step 1.3
export {};
EOF
echo "✅ src/server.ts created"
```

**Expected output:**
```
✅ src/server.ts created
```

---

### 📋 Step 6: Run the TypeScript type-check

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

### 📋 Step 7: Run the security audit

```bash
cd ~/Desktop/Automation/backend && npm audit
```

**Expected output:**
```
found 0 vulnerabilities
```

---

### 📋 Step 8: Run the test suite

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

- [ ] Docker Desktop installed and running ([download here](https://www.docker.com/products/docker-desktop/))
- [ ] Step 1.1 complete (all 3 checks passing)

### What this step does

Creates the entire PostgreSQL database schema in a single Prisma schema file, plus a Docker Compose file to run the local database.

**Files created in this step:**

| File | Purpose |
|---|---|
| `docker-compose.yml` | Starts PostgreSQL 16 + Redis 7 locally with one command |
| `backend/prisma/schema.prisma` | Complete database schema — all 15 models, 4 enums, indexes, cascade rules |

**Models:** User, Artist, ArtistAvailability, AvailabilityBlock, TattooStyle, ArtistStyle, Lead, Quote, Booking, Invoice, RefreshToken, PasswordResetToken, EmailTemplate, FeatureFlag, AnalyticsEvent.

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

  @@index([email])
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

  @@index([slug])
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
  @@index([token])
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

  @@index([token])
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

  @@index([key, isActive])
  @@map("email_templates")
}

model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique
  label       String
  description String?
  isEnabled   Boolean  @default(true)
  updatedAt   DateTime @updatedAt

  @@index([key])
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

> ❌ If you see any errors — stop and tell me before continuing.

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
