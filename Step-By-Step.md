# BookingAutomation — Step-By-Step Guide

> Run every command from: `~/Desktop/Automation/backend` unless told otherwise.  
> Copy and paste each block exactly. Wait for it to finish before running the next one.

---

## One-time setup — install the `code` command in Terminal

VS Code has a built-in CLI command called `code` that lets you open files from Terminal. You only need to do this once.

1. Open **VS Code**
2. Press `⌘ Shift P` to open the command palette
3. Type `shell command` and click **"Shell Command: Install 'code' command in PATH"**
4. Close Terminal completely, reopen it

From now on you can open any file with `code <filename>`.

---

# PHASE 1 — Backend Foundation

---

## ✅ Step 1.1 — Done

---

## 🔄 Step 1.2 — Database Schema

---

### Step 1: Open pgAdmin and confirm your database exists

Open **pgAdmin 4**. On the left, click your PostgreSQL server and enter your password if it asks.

Under **Databases**, check for `automation_dev`.

If it's not there: right-click **Databases** → **Create** → **Database** → type `automation_dev` → **Save**.

That's it. PostgreSQL runs as a background service on your Mac automatically — nothing else to start.

---

### Step 2: Create your .env file

`.env.example` is the permanent template stored in the repo — **never delete or edit it**.  
Your `.env` is the private copy you create from it. It's never saved to GitHub (it's in `.gitignore`), so re-downloading the repo won't restore it — you always create it fresh with this command.

If you already have a `.env` from a previous attempt, delete it first:

```bash
rm -f ~/Desktop/Automation/backend/.env
```

Now create a fresh one from the template:

```bash
cp ~/Desktop/Automation/backend/.env.example ~/Desktop/Automation/backend/.env && echo "✅ .env created"
```

Open it in VS Code:

```bash
code ~/Desktop/Automation/backend/.env
```

---

### Step 3: Edit your .env — exactly 3 changes

**Change 1 — DATABASE_URL**

Find this line (it has placeholder text in it):
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

Delete it completely and replace with:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/automation_dev
```

Replace `YOUR_PASSWORD` with the password you chose when you installed PostgreSQL.  
If you didn't set one (used all defaults), try `postgres`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/automation_dev
```

---

**Change 2 — JWT_ACCESS_SECRET**

This is a secret key used to sign login tokens. Generate one now — run this in Terminal:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the long string it prints. Find this line in your `.env`:
```
JWT_ACCESS_SECRET=REPLACE_WITH_STRONG_SECRET_64_CHARS_MIN
```

Replace `REPLACE_WITH_STRONG_SECRET_64_CHARS_MIN` with what you just copied.

---

**Change 3 — JWT_REFRESH_SECRET**

Run the exact same command again (you need a different value — run it again, don't reuse the first one):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy this new output. Find:
```
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_STRONG_SECRET_64_CHARS_MIN
```

Replace `REPLACE_WITH_DIFFERENT_STRONG_SECRET_64_CHARS_MIN` with this second string.

---

**Everything else** — leave as-is. The Resend, Cloudinary, Twilio, and Google entries are only needed in Phase 3+.

Save the file: `⌘ S`

---

### Step 4: Test the database connection

```bash
cd ~/Desktop/Automation/backend && npx prisma db pull --print 2>&1 | head -5
```

Expected output (first two lines):
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
```

> ❌ `P1001: Can't reach database server at localhost:5432` — PostgreSQL isn't running. Open pgAdmin, click your server, enter your password. Then try again.  
> ❌ `P1000: Authentication failed` — wrong password in DATABASE_URL. Open `.env`, fix the password part between `:` and `@localhost`, save, try again.

---

### Step 5: Create the database schema

This creates the file that defines all your database tables.

```bash
mkdir -p ~/Desktop/Automation/backend/prisma && cat > ~/Desktop/Automation/backend/prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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
echo "✅ schema.prisma created"
```

Expected output:
```
✅ schema.prisma created
```

---

### Step 6: Check the schema has no errors

```bash
cd ~/Desktop/Automation/backend && npx prisma validate
```

Expected output:
```
The schema at prisma/schema.prisma is valid 🚀
```

> ❌ Any errors — stop and paste them here before continuing.

---

### Step 7: Run the migration — this creates all the tables in your database

```bash
cd ~/Desktop/Automation/backend && npm run db:migrate
```

When it asks for a migration name, type `init` and press Enter.

Expected output (last few lines):
```
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

> ❌ `P1001: Can't reach database server` — PostgreSQL isn't running. Open pgAdmin, click your server. Then run again.  
> ❌ `P1000: Authentication failed` — wrong password in DATABASE_URL. Fix it in `.env`, save, run again.  
> ❌ Anything else — paste the error and we'll fix it.

---

### Step 8: Confirm all 15 tables were created

```bash
cd ~/Desktop/Automation/backend && npm run db:studio
```

This opens **http://localhost:5555** in your browser. You should see 15 tables on the left:
```
analytics_events    artist_availability    artist_styles
artists             availability_blocks    bookings
email_templates     feature_flags          invoices
leads               password_reset_tokens  quotes
refresh_tokens      tattoo_styles          users
```

Press `Ctrl+C` in Terminal to stop Prisma Studio when done.

---

### Step 9: Verify everything is clean before moving on

```bash
cd ~/Desktop/Automation/backend && npx prisma validate && npm run typecheck && npm test
```

Expected:
```
The schema at prisma/schema.prisma is valid 🚀
(no typecheck output = clean)
No tests found, exiting with code 0
```

All three passing = Step 1.2 complete.

---

## ⬜ Step 1.3 — Express App

Start the server:
```bash
cd ~/Desktop/Automation/backend && npm run dev
```
Expected: `🚀 Server running on port 3000`

Test it (open a second Terminal tab):
```bash
curl http://localhost:3000/health
```
Expected:
```json
{"success":true,"data":{"status":"ok"}}
```

---

## ⬜ Step 1.4 — Auth System

Test register:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Admin","email":"admin@test.com","password":"Admin1234!"}'
```

Test login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin1234!"}'
```

Run tests:
```bash
cd ~/Desktop/Automation/backend && npm test
```

---

## ⬜ Steps 1.5 → 1.22

Commands for each step get added here when that step starts.

---

## Troubleshooting

**`npm install` fails**
```bash
cd ~/Desktop/Automation/backend
rm -rf node_modules package-lock.json
npm install
```

**`npm run dev` says "Cannot find module"**
```bash
cd ~/Desktop/Automation/backend && npm install
```

**Database connection refused (P1001)**  
Open pgAdmin 4 → click your server → enter password. That starts the connection. Try your command again.

**Authentication failed (P1000)**  
Your DATABASE_URL password is wrong. Open `backend/.env`, find the `DATABASE_URL` line, fix the password between `:` and `@localhost`, save, try again.

**Port 3000 already in use**
```bash
lsof -i :3000
# Copy the PID number from the output, then:
kill -9 <PID>
cd ~/Desktop/Automation/backend && npm run dev
```

**Useful port checks**
```bash
lsof -i :3000   # dev server
lsof -i :5432   # PostgreSQL
lsof -i :5555   # Prisma Studio
```

**Daily commands**
```bash
cd ~/Desktop/Automation/backend && npm run dev        # start server
cd ~/Desktop/Automation/backend && npm test           # run tests
cd ~/Desktop/Automation/backend && npm run typecheck  # check TypeScript
cd ~/Desktop/Automation/backend && npm run build      # build for production
```

**Database commands**
```bash
cd ~/Desktop/Automation/backend
npm run db:migrate    # apply pending migrations
npm run db:generate   # regenerate Prisma client after schema change
npm run db:seed       # seed with test data
npm run db:studio     # open visual DB browser at http://localhost:5555
npm run db:reset      # ⚠️ wipes everything and re-runs all migrations
```
