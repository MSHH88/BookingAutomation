# Phase 1 — Backend Foundation & Interoperability Core

> **Status: 1.3 ✅ Done — Next: Step 1.4**  
> This file is the authoritative, self-contained reference for every step in Phase 1.  
> One step at a time. No step starts until the previous step is verified and signed off.  
> See `PLAN.md` for architecture decisions, tech stack reasoning, and project vision.

---

## Overview

**Goal:** Build a robust, scalable, platform-agnostic API that can power a tattoo studio, barber
shop, salon, or restaurant — just by changing configuration and the frontend skin.

**Total steps:** 25  
**Completion criteria:** All 25 steps done + full test suite passing + clean build + health endpoint live.

---

## Global Standards (apply to every step)

### Response Envelope
Every API response uses this shape:
```json
{
  "success": true,
  "data": { ... },
  "meta": null,
  "error": null
}
```
Error responses:
```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] }
}
```

### Pagination
All list endpoints accept `?page=1&limit=20` (default limit 20, max 100).  
Response `meta` includes: `{ "total": 150, "page": 1, "limit": 20, "totalPages": 8 }`.  
Implemented via `src/utils/paginate.ts` helper (wraps Prisma `count` + `findMany`).

### Role Hierarchy
`ADMIN` > `ARTIST` > `CUSTOMER`  
Routes are guarded by `requireAuth` + `requireRole(...)` middleware.

### Feature Flags
Every module with a feature flag wraps its routes with `requireFeature('FLAG_KEY')`.  
Returns `503 Feature Disabled` when flag is OFF.

---

## Step 1.1 — Project Scaffolding ✅ DONE

**Files created:**
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.env.example`
- `backend/.gitignore`

**Verified:** `tsc --noEmit` passes, `npm install` clean, 0 audit vulnerabilities.

---

## Step 1.2 — Database Schema (Prisma) ✅ DONE

**What:** Design and write the entire PostgreSQL schema using Prisma ORM.

**Why:** The database is the single source of truth. Every model, relationship, and constraint must
be correct before any code touches the database.

**Files to create:**
- `backend/prisma/schema.prisma`

### Models

#### `User`
```
id            String   @id @default(cuid())
email         String   @unique
passwordHash  String
role          Role     @default(CUSTOMER)  // ADMIN | ARTIST | CUSTOMER
name          String
phone         String?
preferWhatsApp Boolean @default(false)
isActive      Boolean  @default(true)
createdAt     DateTime @default(now())
updatedAt     DateTime @updatedAt
artist        Artist?
refreshTokens RefreshToken[]
resetTokens   PasswordResetToken[]
bookings      Booking[]  // customer's own bookings
leads         Lead[]     // customer's own leads
```

#### `Artist`
```
id              String   @id @default(cuid())
userId          String   @unique
user            User     @relation(...)
slug            String   @unique
bio             String?
profileImageUrl String?
portfolioImages String[]
bufferMinutes   Int      @default(30)   // gap between bookings
slotDuration    Int      @default(90)   // default slot length in minutes
isActive        Boolean  @default(true)
availability    ArtistAvailability[]
blocks          AvailabilityBlock[]
styles          ArtistStyle[]
services        ArtistService[]       // which services this artist performs
leads           Lead[]
bookings        Booking[]
```

#### `ArtistAvailability`
```
id          String   @id @default(cuid())
artistId    String
artist      Artist   @relation(...)
dayOfWeek   Int      // 0=Sun, 1=Mon, ... 6=Sat
startTime   String   // "09:00"
endTime     String   // "17:00"
isActive    Boolean  @default(true)
@@unique([artistId, dayOfWeek])
```

#### `AvailabilityBlock`
```
id          String   @id @default(cuid())
artistId    String
artist      Artist   @relation(...)
startAt     DateTime
endAt       DateTime
reason      String?  // "Holiday", "Private", etc.
createdAt   DateTime @default(now())
```

#### `PasswordResetToken`
```
id        String   @id @default(cuid())
userId    String
user      User     @relation(...)
token     String   @unique
expiresAt DateTime
usedAt    DateTime?
createdAt DateTime @default(now())
```

#### `RefreshToken`
```
id        String   @id @default(cuid())
userId    String
user      User     @relation(...)
token     String   @unique
expiresAt DateTime
revokedAt DateTime?
createdAt DateTime @default(now())
```

#### `ServiceCategory`
```
id          String    @id @default(cuid())
name        String
description String?
sortOrder   Int       @default(0)
isActive    Boolean   @default(true)
services    Service[]
createdAt   DateTime  @default(now())
updatedAt   DateTime  @updatedAt
```

#### `Service`
```
id               String          @id @default(cuid())
categoryId       String
category         ServiceCategory @relation(...)
name             String
description      String?
durationMinutes  Int
priceFrom        Decimal?        @db.Decimal(10,2)  // null = price on request
imageUrl         String?
isActive         Boolean         @default(true)
sortOrder        Int             @default(0)
artists          ArtistService[]
bookings         Booking[]
createdAt        DateTime        @default(now())
updatedAt        DateTime        @updatedAt
```

#### `ArtistService`
```
artistId   String
artist     Artist   @relation(...)
serviceId  String
service    Service  @relation(...)
customPrice Decimal? @db.Decimal(10,2)  // override studio price for this artist
@@id([artistId, serviceId])
```

#### `Table`
```
// Restaurant only — gated by TABLE_SELECTION_ENABLED flag
id          String     @id @default(cuid())
name        String     // "Table 1", "Window Booth", etc.
capacity    Int        // max party size
minCapacity Int        @default(1)
isActive    Boolean    @default(true)
positionX   Float?     // for visual floor plan rendering (CRM)
positionY   Float?
bookings    Booking[]
createdAt   DateTime   @default(now())
updatedAt   DateTime   @updatedAt
```

#### `TattooStyle`
```
id              String   @id @default(cuid())
name            String   @unique
description     String?
exampleImageUrl String?
isActive        Boolean  @default(true)
artists         ArtistStyle[]
```

#### `ArtistStyle`
```
artistId String
artist   Artist       @relation(...)
styleId  String
style    TattooStyle  @relation(...)
@@id([artistId, styleId])
```

#### `Lead`
```
// Tattoo-studio inquiry or general contact form
id              String     @id @default(cuid())
customerId      String?    // if customer was logged in
customer        User?      @relation(...)
artistId        String?
artist          Artist?    @relation(...)
styleId         String?
style           TattooStyle? @relation(...)
placement       Json?      // { generalArea, specificArea, refinement } — tattoo only
size            String?    // null if "whole area" — tattoo only
colorPreference String?    // "COLOR" | "BLACK_AND_WHITE" | "UNSURE" — tattoo only
referenceImages String[]   // Cloudinary URLs
description     String
name            String
email           String
phone           String
preferWhatsApp  Boolean    @default(false)
preferredDates  Json?      // Array of up to 3 preferred DateTime strings
status          LeadStatus @default(NEW)
score           Int        @default(0)
source          String?    // UTM source
utmMedium       String?
utmCampaign     String?
ipAddress       String?
deviceType      String?
createdAt       DateTime   @default(now())
updatedAt       DateTime   @updatedAt
quotes          Quote[]
booking         Booking?
analyticsEvents AnalyticsEvent[]
```

**LeadStatus enum:** `NEW | CONTACTED | QUOTED | BOOKED | COMPLETED | CANCELLED | LOST`

#### `Quote`
```
id           String      @id @default(cuid())
leadId       String
lead         Lead        @relation(...)
artistId     String
price        Decimal     @db.Decimal(10,2)
hours        Float?
notes        String?
validUntil   DateTime
status       QuoteStatus @default(DRAFT)
sentAt       DateTime?
respondedAt  DateTime?
createdAt    DateTime    @default(now())
updatedAt    DateTime    @updatedAt
booking      Booking?
```

**QuoteStatus enum:** `DRAFT | SENT | ACCEPTED | REJECTED | EXPIRED`

#### `Booking`
```
id              String        @id @default(cuid())
// leadId is NULLABLE — instant bookings (salon/barber/nail/masseuse/restaurant)
// do not require a lead; only tattoo quote-flow bookings set this
leadId          String?       @unique
lead            Lead?         @relation(...)
quoteId         String?       @unique
quote           Quote?        @relation(...)
customerId      String?       // logged-in customer who made the booking
customer        User?         @relation(...)
artistId        String
artist          Artist        @relation(...)
serviceId       String?       // which service was booked (salon/barber/etc.)
service         Service?      @relation(...)
// Restaurant fields (gated by TABLE_SELECTION_ENABLED / PARTY_SIZE_ENABLED)
tableId         String?
table           Table?        @relation(...)
partySize       Int?          // restaurant party size
specialRequests String?       // free-text special requests (all types)
startAt         DateTime
endAt           DateTime
status          BookingStatus @default(PENDING)
calendarEventId String?       // Google Calendar event ID
icsToken        String?       // unique token for .ics download URL
notes           String?       // internal notes (staff-only)
// Deposit tracking
depositAmount   Decimal?      @db.Decimal(10,2)
depositPaidAt   DateTime?
depositRefunded Boolean       @default(false)
confirmedAt     DateTime?
completedAt     DateTime?
cancelledAt     DateTime?
cancelReason    String?
rescheduledFrom DateTime?     // original startAt if rescheduled
createdAt       DateTime      @default(now())
updatedAt       DateTime      @updatedAt
invoice         Invoice?
```

**BookingStatus enum:** `PENDING | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW`

#### `Invoice`
```
id          String        @id @default(cuid())
bookingId   String        @unique
booking     Booking       @relation(...)
amount      Decimal       @db.Decimal(10,2)
currency    String        @default("GBP")
status      InvoiceStatus @default(UNPAID)
dueDate     DateTime
paidAt      DateTime?
voidedAt    DateTime?
sentAt      DateTime?
notes       String?
lineItems   Json          // [{ description, quantity, unitPrice, total }]
createdAt   DateTime      @default(now())
updatedAt   DateTime      @updatedAt
```

**InvoiceStatus enum:** `UNPAID | PAID | OVERDUE | VOID`

#### `EmailTemplate`
```
id        String   @id @default(cuid())
key       String   @unique  // e.g. "booking-confirmed"
subject   String
htmlBody  String   // Handlebars template string
variables Json     // list of variable names for CRM editor hint
isActive  Boolean  @default(true)
updatedAt DateTime @updatedAt
```

#### `FeatureFlag`
```
id          String   @id @default(cuid())
key         String   @unique
label       String
description String?
isEnabled   Boolean  @default(true)
updatedAt   DateTime @updatedAt
```

#### `AnalyticsEvent`
```
id          String   @id @default(cuid())
leadId      String?
lead        Lead?    @relation(...)
bookingId   String?
eventType   String   // "LEAD_CREATED" | "BOOKING_CONFIRMED" | "PAGE_VIEW" | "SERVICE_VIEWED" etc.
payload     Json?
sessionId   String?
ipAddress   String?
userAgent   String?
referrer    String?
utmSource   String?
utmMedium   String?
utmCampaign String?
createdAt   DateTime @default(now())
```

> **Schema migration note (added in gap-fill pass):**
> The original schema had `Booking.leadId` as `@unique` and non-nullable. It is now **nullable** (`String?`) to support instant bookings (salon/barber/nail/masseuse/restaurant) which create Bookings without a Lead. Additionally `ServiceCategory`, `Service`, `ArtistService`, and `Table` models were added to support the service menu CRM and restaurant table selection — these are required for Steps 1.24 and 1.25. A `prisma migrate dev --name add_service_table_models` will be needed before those steps.

**Checklist:**
- [x] `backend/prisma/schema.prisma` created with all models above
- [x] All enums defined
- [x] All relations correct (no dangling foreign keys)
- [x] `prisma validate` passes with zero errors
- [x] `prisma migrate dev --name init` runs successfully against local Docker DB
- [x] `prisma generate` produces the Prisma Client
- [ ] Migration `add_service_table_models` run after adding Service/ServiceCategory/Table/ArtistService (Step 1.24 prerequisite)

---

## Step 1.3 — Core Express App Setup ✅ DONE

**What:** Express application entry point with all global middleware. Health endpoint. Graceful shutdown.

**Why:** Security headers, CORS, rate limiting, and error handling must be in place before any route
is added. This prevents security gaps and ensures consistent behaviour across the whole API.

**Files created (spec):**
- `backend/src/app.ts` — Express app, all middleware, all route mounts, exported
- `backend/src/server.ts` — imports `app`, calls `listen()`, handles SIGTERM/SIGINT shutdown
- `backend/src/config/index.ts` — reads and validates ALL env vars at startup; throws if required var missing
- `backend/src/utils/logger.ts` — Winston logger (console in dev, JSON file in prod)
- `backend/src/utils/apiResponse.ts` — `success()`, `error()`, `paginated()` helpers
- `backend/src/utils/paginate.ts` — wraps Prisma count + findMany, returns pagination meta
- `backend/src/middleware/errorHandler.ts` — global Express error handler; maps known errors to HTTP codes

**Additional files created (required for full implementation):**
- `backend/src/types/express.d.ts` — augments Express.Request with `id` + `startTime`
- `backend/src/errors/AppError.ts` — typed operational error class (used by errorHandler + all modules)
- `backend/src/lib/prisma.ts` — singleton PrismaClient (hot-reload safe via global cache)
- `backend/src/lib/redis.ts` — singleton ioredis client with lazy connect + graceful disconnect
- `backend/src/middleware/requestLogger.ts` — UUID correlation ID, X-Request-Id header, duration logging

**Middleware stack (in order):**
1. `helmet()` — security headers
2. `cors({ origin: [FRONTEND_URL, CRM_URL] })` — CORS for both frontends
3. `express-rate-limit` — 100 requests per 15 min per IP
4. `express.json({ limit: '10mb' })` — body parser
5. Request logger — logs method, path, status, duration via Winston
6. Route mounts (added in each subsequent step)
7. `errorHandler` — catch-all (must be last)

**Endpoints in this step:**
- `GET /health` → `{ success: true, data: { status: "ok", timestamp, env } }`

**Checklist:**
- [x] `src/app.ts` created and reviewed
- [x] `src/server.ts` with graceful shutdown (closes DB + Redis before exit)
- [x] `src/config/index.ts` validates all env vars — process exits on missing required var
- [x] `src/utils/logger.ts` — debug/info/warn/error levels, `LOG_LEVEL` env var respected
- [x] `src/utils/apiResponse.ts` — consistent response shape on all endpoints
- [x] `src/utils/paginate.ts` — tested with simple Prisma mock
- [x] `src/middleware/errorHandler.ts` — maps `ZodError` → 400, `PrismaNotFound` → 404, unknown → 500
- [x] `tsc --noEmit` passes with zero errors
- [ ] `npm run dev` starts server without errors *(requires .env with DATABASE_URL + JWT secrets)*
- [ ] `GET /health` returns 200 with correct body *(manual verify when .env is configured)*

---

## Step 1.4 — Authentication System

**What:** JWT access token (15 min) + refresh token (7 days) auth. Register, login, logout, token
refresh, forgot/reset password, and current-user endpoints.

**Why:** Every protected API route depends on this. Must be airtight before any other module is built.

**Files to create:**
- `backend/src/modules/auth/auth.schema.ts` — Zod schemas: register, login, forgotPassword, resetPassword, updateMe
- `backend/src/modules/auth/auth.service.ts` — bcrypt hash/compare, JWT sign/verify, refresh token CRUD, password reset token lifecycle
- `backend/src/modules/auth/auth.controller.ts` — all handlers
- `backend/src/modules/auth/auth.routes.ts`
- `backend/src/middleware/auth.ts` — `requireAuth`: reads `Authorization: Bearer <token>`, verifies JWT, attaches `req.user`
- `backend/src/middleware/requireRole.ts` — `requireRole(role)`: checks `req.user.role`, returns 403 if insufficient

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create account, return tokens |
| POST | `/api/auth/login` | Public | Verify credentials, return tokens |
| POST | `/api/auth/refresh` | Public | Exchange refresh token for new access token |
| POST | `/api/auth/logout` | Auth | Revoke refresh token |
| POST | `/api/auth/forgot-password` | Public | Generate reset token, queue reset email |
| POST | `/api/auth/reset-password` | Public | Validate token, set new password |
| GET | `/api/auth/me` | Auth | Return current user profile |
| PATCH | `/api/auth/me` | Auth | Update own name, email, or password |

**Token storage:**
- Access token: returned in response body, stored in memory by frontend
- Refresh token: returned in response body AND set as `httpOnly` cookie

**Checklist:**
- [ ] All 8 endpoints implemented and returning correct shapes
- [ ] Passwords hashed with bcrypt cost 12
- [ ] Access token expires in 15m, refresh token in 7d
- [ ] Refresh token rotation: old token revoked when new one issued
- [ ] Password reset token expires in 1h and is single-use
- [ ] Invalid/expired tokens return 401
- [ ] `requireRole` returns 403 for insufficient role
- [ ] Unit tests written and passing (min: register, login, refresh, forgot/reset, me)

---

## Step 1.4b — Business Type Configuration ✅

**What:** Config module that reads `BUSINESS_TYPE` from env and exports a label map, feature flag
defaults, and service catalogue templates. All modules use this — never hardcoded strings.

**Files:**
- `backend/src/config/businessType.ts`
- `backend/src/config/businessType.test.ts`

**Supported types:** `tattoo_studio` | `hair_salon` | `barber` | `nail_salon` | `masseuse` | `restaurant`

**Label keys (16):** `artists`, `artist`, `styles`, `style`, `portfolio`, `quote`, `mannequin`,
`booking`, `services`, `service`, `serviceCategory`, `client`, `clients`, `deposit`, `appointment`, `review`

| Key | tattoo_studio | hair_salon | barber | nail_salon | masseuse | restaurant |
|---|---|---|---|---|---|---|
| `artists` | Artists | Stylists | Barbers | Nail Artists | Therapists | Staff |
| `styles` | Tattoo Styles | Hair Styles | Cuts & Styles | Nail Styles | Massage Types | Menu |
| `portfolio` | Portfolio | Gallery | Gallery | Gallery | Gallery | Photo Gallery |
| `quote` | Quote | Estimate | Estimate | Estimate | Estimate | N/A |
| `mannequin` | Body Placement | N/A | N/A | N/A | N/A | N/A |
| `booking` | Booking | Appointment | Appointment | Appointment | Session | Reservation |
| `services` | Services | Treatments | Services | Nail Services | Treatments | Menu |
| `client` | Client | Client | Client | Client | Client | Guest |
| `deposit` | Deposit | Deposit | Deposit | Deposit | Prepayment | Prepayment |

**Feature flags (28, updated in gap-fill pass):**

*Original 23:* `BOOKING_ENABLED`, `CALENDAR_ENABLED`, `ICS_DOWNLOAD_ENABLED`,
`DEPOSIT_REQUIRED`, `DEPOSIT_PARTIAL_ENABLED`, `LEAD_CAPTURE_ENABLED`, `QUOTE_SYSTEM_ENABLED`,
`INSTANT_BOOKING_ENABLED`, `MANNEQUIN_ENABLED`, `REFERENCE_IMAGES_ENABLED`,
`SERVICE_MENU_ENABLED`, `PRICE_LIST_VISIBLE`, `TABLE_SELECTION_ENABLED`, `PARTY_SIZE_ENABLED`,
`SPECIAL_REQUESTS_ENABLED`, `PORTFOLIO_ENABLED`, `GALLERY_UPLOAD_ENABLED`,
`EMAIL_REMINDERS_ENABLED`, `SMS_REMINDERS_ENABLED`, `WHATSAPP_CONTACT_ENABLED`,
`REVIEW_REQUEST_ENABLED`, `ANALYTICS_ENABLED`, `LEAD_SCORING_ENABLED`

*Added (5 new):*
- `ONLINE_PAYMENT_ENABLED` — Stripe card payment (deposit or full payment at booking time)
- `WAITING_LIST_ENABLED` — customers can join a waiting list if no slots available
- `RECURRING_BOOKING_ENABLED` — customer can mark a booking as recurring (weekly/biweekly)
- `CANCELLATION_FEE_ENABLED` — late cancellation / no-show charge (uses card on file)
- `GIFT_VOUCHER_ENABLED` — sell and redeem gift vouchers / gift cards

> **Action required:** `businessType.ts` must be updated to add the 5 new flags to `FEATURE_FLAG_KEYS`,
> `defaultFeatureFlags`, and tests (do this as part of Step 1.24 when the flag code is needed).

**Service catalogue templates** — default categories + services for all 6 types (seed data).
All prices, durations, and services are editable in the CRM via the Service Management API (Step 1.24).

---

### Per-Type Booking Flows

These flows define the exact steps a customer takes for each business type. They are the "red thread"
through the frontend pages and are documented here so every module (API, frontend, CRM, email
templates) is built to support them.

---

#### 🖋 Tattoo Studio — Quote-led flow (LEAD_CAPTURE_ENABLED + QUOTE_SYSTEM_ENABLED)

```
1.  Browse Artists        → choose preferred artist (or "no preference")
2.  Choose Style          → pick from tattoo styles (Hyperrealistic, Japanese, etc.)
3.  Body Placement        → 3D mannequin: select body area + sub-area + refinement
4.  Size                  → select size band (small / medium / large / whole area)
5.  Reference Images      → upload up to 10 inspiration photos (Cloudinary)
6.  Description           → free text: describe the idea
7.  Contact Details       → name, email, phone, preferWhatsApp, up to 3 preferred dates
8.  Submit Lead           → creates Lead (NEW), queues inquiry emails + optional WhatsApp Msg 1
    ── ARTIST SIDE ──
9.  Review Lead           → CRM: artist views placement, images, description
10. Send Quote            → CRM: price, estimated hours, notes, validity → queues quote-sent email
11. Customer Accepts      → quote accept endpoint → creates Booking (PENDING), lead → BOOKED
12. Deposit (optional)    → if DEPOSIT_REQUIRED: Stripe payment widget for deposit amount
13. Booking Confirmed     → admin/artist confirms → calendar event, booking-confirmed email + .ics
14. Reminder              → email + WhatsApp 24h before appointment
15. Appointment           → marking COMPLETED auto-creates Invoice, queues review request
16. Review Request        → 36h delay: email + optional WhatsApp
17. Invoice Sent          → artist sends invoice from CRM
```

---

#### ✂️ Barber — Instant booking flow (INSTANT_BOOKING_ENABLED + SERVICE_MENU_ENABLED)

```
1.  Choose Barber         → select from active barbers (or "first available")
2.  Choose Service        → pick from service menu (Clipper Cut, Fade, Beard Trim, Combo, etc.)
3.  Choose Date           → calendar picker showing available days
4.  Choose Time Slot      → time slots calculated by availability engine
5.  Special Requests      → optional free text (if SPECIAL_REQUESTS_ENABLED)
6.  Contact Details       → name, email, phone, preferWhatsApp
7.  Deposit (optional)    → if DEPOSIT_REQUIRED: Stripe widget
8.  Confirm Booking       → creates Booking directly (no Lead/Quote), status PENDING → auto-CONFIRMED
9.  Booking Confirmed     → booking-confirmed email + .ics attachment
10. Reminder              → email + optional WhatsApp 24h before
11. Appointment           → mark COMPLETE → auto-creates Invoice, queues review request
12. Review Request        → 36h delay: email + optional WhatsApp
```

---

#### 💇 Hair Salon — Instant booking flow (INSTANT_BOOKING_ENABLED + SERVICE_MENU_ENABLED)

```
1.  Choose Stylist         → select active stylist (or "any available")
2.  Choose Service         → pick from service menu (Cut & Blowdry, Balayage, Keratin, etc.)
3.  Choose Date            → calendar picker
4.  Choose Time Slot       → slots from availability engine (duration from selected service)
5.  Special Requests       → optional note (e.g., "allergic to X product")
6.  Contact Details        → name, email, phone, preferWhatsApp
7.  Deposit (optional)     → if DEPOSIT_REQUIRED: Stripe widget
8.  Confirm Booking        → creates Booking (no Lead/Quote), auto-CONFIRMED
9.  Booking Confirmed      → booking-confirmed email + .ics
10. Reminder               → email + WhatsApp 24h before
11. Appointment            → COMPLETE → Invoice, review request queued
12. Review Request         → 36h delay
```

---

#### 💅 Nail Salon — Instant booking flow (same pattern as hair salon)

```
1.  Choose Nail Artist     → select from active nail artists
2.  Choose Service         → pick from nail menu (Gel Manicure, Acrylic Set, Nail Art, etc.)
3.  Choose Date & Time     → calendar → slots
4.  Special Requests       → optional
5.  Contact Details        → name, email, phone, preferWhatsApp
6.  Deposit (optional)     → Stripe
7.  Confirm Booking        → Booking created, auto-CONFIRMED
8.  Confirmation Email     → + .ics
9.  Reminder               → 24h email + WhatsApp
10. Appointment            → COMPLETE → Invoice → review request
```

---

#### 🧘 Masseuse / Spa — Instant booking flow

```
1.  Choose Therapist       → select therapist (or "any available")
2.  Choose Treatment       → pick from treatments (Swedish 60min, Deep Tissue, Hot Stone, etc.)
3.  Choose Date & Time     → calendar → slots
4.  Special Requests       → health notes, pressure preferences
5.  Contact Details        → name, email, phone, preferWhatsApp
6.  Prepayment (optional)  → Stripe
7.  Confirm Booking        → Booking created, auto-CONFIRMED
8.  Session Confirmed      → booking-confirmed email + .ics
9.  Reminder               → 24h email + WhatsApp
10. Session                → COMPLETE → Invoice → review request
```

---

#### 🍽 Restaurant — Table reservation flow

```
1.  Select Date            → calendar (available days highlighted)
2.  Select Time            → available sitting times for that date
3.  Party Size             → number of guests (PARTY_SIZE_ENABLED)
4.  Choose Table           → visual table map shows free/occupied tables (TABLE_SELECTION_ENABLED)
                             or auto-assigned if flag off
5.  Occasion               → optional: Birthday / Anniversary / Business (Special Occasions menu)
6.  Special Requests       → dietary requirements, allergies, notes
7.  Contact Details        → name, email, phone, preferWhatsApp
8.  Deposit (optional)     → Stripe (especially for large groups / private dining)
9.  Confirm Reservation    → Booking created, auto-CONFIRMED
10. Confirmation Email     → booking-confirmed email + .ics (guests can add to calendar)
11. Reminder               → email + WhatsApp 24h before
12. Day-of WhatsApp        → "We look forward to seeing you tonight at [TIME]"
13. Post-visit             → WhatsApp / email review request 2h after reservation end time
```

---

**Checklist:**
- [x] Module validates `BUSINESS_TYPE` at import time — process exits on invalid value
- [x] Label map exported and typed with TypeScript (16 keys, 6 types)
- [x] Feature flag defaults exported per type (23 flags, seed script ready)
- [x] Service catalogue templates exported per type (default seed data, fully editable)
- [x] `isBusinessType()` type guard exported
- [x] `getLabels()`, `getDefaultFlags()`, `getServiceTemplate()` helpers exported
- [x] Unit tests: 32 tests — all 6 types, label correctness, flag business-logic checks, catalogue checks
- [x] `tsc --noEmit` clean, `npm test` 62/62 passing
- [ ] Add 5 new feature flags to `businessType.ts` (ONLINE_PAYMENT_ENABLED, WAITING_LIST_ENABLED, RECURRING_BOOKING_ENABLED, CANCELLATION_FEE_ENABLED, GIFT_VOUCHER_ENABLED) — do this before Step 1.24

---

## Step 1.5 — Artist Management API

**What:** Full CRUD for artist profiles, portfolio images (Cloudinary URLs), and style assignments.

**Files to create:**
- `backend/src/modules/artists/artists.schema.ts`
- `backend/src/modules/artists/artists.service.ts`
- `backend/src/modules/artists/artists.controller.ts`
- `backend/src/modules/artists/artists.routes.ts`

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/artists` | Public | List all active artists |
| GET | `/api/artists/:slug` | Public | Single artist with portfolio + styles |
| POST | `/api/artists` | ADMIN | Create artist (creates User + Artist) |
| PATCH | `/api/artists/:id` | ADMIN or own | Update profile, bio, images, availability |
| DELETE | `/api/artists/:id` | ADMIN | Soft-delete (sets `isActive = false`) |
| POST | `/api/artists/:id/styles` | ADMIN | Assign styles to artist (replaces existing) |
| GET | `/api/artists/:id/availability` | Public | Get working hours for this artist |
| PUT | `/api/artists/:id/availability` | ADMIN or own | Set/update working hours |

**Checklist:**
- [ ] Only `isActive = true` artists returned on public endpoints
- [ ] ADMIN role enforced on create/delete endpoints
- [ ] Artist can only edit their own profile (or ADMIN can edit any)
- [ ] Pagination applied to list endpoint
- [ ] Integration tests written and passing

---

## Step 1.6 — Tattoo Style Management API

**What:** CRUD for tattoo styles. Styles are shown on the frontend and fully manageable from CRM.

**Files to create:**
- `backend/src/modules/styles/styles.schema.ts`
- `backend/src/modules/styles/styles.service.ts`
- `backend/src/modules/styles/styles.controller.ts`
- `backend/src/modules/styles/styles.routes.ts`

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/styles` | Public | List all active styles |
| POST | `/api/styles` | ADMIN | Create style |
| PATCH | `/api/styles/:id` | ADMIN | Update style |
| DELETE | `/api/styles/:id` | ADMIN | Soft-delete style |

**12 styles to seed:**
Hyperrealistic, Old School, Japanese, Traditional, Neo-Traditional, Blackwork, Dotwork, Geometric, Watercolor, Tribal, Illustrative, Chicano

**Checklist:**
- [ ] All 12 styles seeded
- [ ] All endpoints implemented
- [ ] Tests written and passing

---

## Step 1.7 — Lead Capture API

**What:** Receives customer inquiries from the frontend. Creates a Lead record, queues notification emails, and optionally queues a WhatsApp welcome message.

**Files to create:**
- `backend/src/modules/leads/leads.schema.ts`
- `backend/src/modules/leads/leads.service.ts`
- `backend/src/modules/leads/leads.controller.ts`
- `backend/src/modules/leads/leads.routes.ts`

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/leads` | Public | Submit inquiry (gated by `LEAD_CAPTURE_ENABLED`) |
| GET | `/api/leads` | ADMIN/ARTIST | List leads with filters + pagination |
| GET | `/api/leads/:id` | ADMIN/ARTIST | Full lead detail |
| PATCH | `/api/leads/:id/status` | ADMIN/ARTIST | Update status |
| PATCH | `/api/leads/:id/score` | ADMIN | Update score |

**On `POST /api/leads`:**
1. Validate with Zod (all required fields)
2. Create `Lead` record
3. Create `AnalyticsEvent` record (`LEAD_CREATED`)
4. Queue `inquiry-received` email to customer
5. Queue `inquiry-notification` email to artist + `STUDIO_ADMIN_EMAIL`
6. If `preferWhatsApp = true` AND `WHATSAPP_CONTACT_ENABLED`: queue WhatsApp Message 1

**Status pipeline:**
`NEW → CONTACTED → QUOTED → BOOKED → COMPLETED → CANCELLED | LOST`

**Checklist:**
- [ ] All fields stored correctly including `placement` JSON
- [ ] All 3 async jobs queued on submission
- [ ] Status transitions validated (no backwards jumps without ADMIN role)
- [ ] Tests written and passing

---

## Step 1.8 — Quote Management API

**What:** Artists review a Lead and create a Quote (price, hours, notes, validity). Customer is notified. Customer can accept (→ auto-creates Booking) or reject.

**Files to create:**
- `backend/src/modules/quotes/quotes.schema.ts`
- `backend/src/modules/quotes/quotes.service.ts`
- `backend/src/modules/quotes/quotes.controller.ts`
- `backend/src/modules/quotes/quotes.routes.ts`

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/quotes` | ARTIST/ADMIN | Create quote for a lead |
| GET | `/api/quotes` | ADMIN/ARTIST | List quotes (paginated) |
| GET | `/api/quotes/:id` | ADMIN/ARTIST | Quote detail |
| PATCH | `/api/quotes/:id` | ARTIST/ADMIN | Edit draft before sending |
| PATCH | `/api/quotes/:id/send` | ARTIST/ADMIN | Send quote → queues `quote-sent` email |
| PATCH | `/api/quotes/:id/accept` | ADMIN | Accept quote → creates Booking (PENDING) |
| PATCH | `/api/quotes/:id/reject` | ADMIN | Reject quote |

**On `PATCH /api/quotes/:id/accept`:**
1. Set `quote.status = ACCEPTED`
2. Create `Booking` record (status `PENDING`)
3. Update `lead.status = BOOKED`

**Expired quote handling:**
- `validUntil` is set per quote (default 7 days)
- A BullMQ delayed job checks and marks expired quotes
- Expired quotes cannot be accepted

**Checklist:**
- [ ] Quote creation validates lead exists and is in correct status
- [ ] Accepting a quote creates a Booking atomically (Prisma transaction)
- [ ] Expired quotes return 409 on accept
- [ ] Tests written and passing

---

## Step 1.9 — Booking Management API

**What:** Manage confirmed appointments. Status transitions, scheduling conflict checks, calendar sync triggers, and confirmation/cancellation emails.

**Files to create:**
- `backend/src/modules/bookings/bookings.schema.ts`
- `backend/src/modules/bookings/bookings.service.ts`
- `backend/src/modules/bookings/bookings.controller.ts`
- `backend/src/modules/bookings/bookings.routes.ts`

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/bookings` | ADMIN/ARTIST | List bookings with filters + pagination |
| GET | `/api/bookings/:id` | ADMIN/ARTIST | Booking detail |
| PATCH | `/api/bookings/:id/confirm` | ADMIN/ARTIST | Confirm → email + calendar event + .ics |
| PATCH | `/api/bookings/:id/complete` | ADMIN/ARTIST | Complete → auto-create invoice + review job |
| PATCH | `/api/bookings/:id/cancel` | ADMIN/ARTIST | Cancel → cancellation email + delete calendar event |
| PATCH | `/api/bookings/:id/reschedule` | ADMIN/ARTIST | Change start/end → conflict check + update calendar event |

**On `PATCH /api/bookings/:id/confirm`:**
1. Check for scheduling conflicts (query overlapping confirmed bookings)
2. Set `status = CONFIRMED`, set `confirmedAt`
3. Create Google Calendar event (if `CALENDAR_SYNC_ENABLED`)
4. Queue `booking-confirmed` email with `.ics` attachment

**On `PATCH /api/bookings/:id/complete`:**
1. Set `status = COMPLETED`, set `completedAt`
2. Create `Invoice` record (auto-generated from quote price)
3. Enqueue review request job (36h delay)
4. Enqueue WhatsApp Message 2 (2h delay, if applicable)

**Checklist:**
- [ ] Scheduling conflict detection prevents double-booking
- [ ] Confirm triggers email + calendar (both can fail without breaking the confirm)
- [ ] Complete triggers invoice creation atomically
- [ ] Tests written and passing

---

## Step 1.10 — Invoice System API

**What:** Auto-generate invoices when a booking is completed. Track payment status. Send invoice emails.

**Files to create:**
- `backend/src/modules/invoices/invoices.schema.ts`
- `backend/src/modules/invoices/invoices.service.ts`
- `backend/src/modules/invoices/invoices.controller.ts`
- `backend/src/modules/invoices/invoices.routes.ts`

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/invoices` | ADMIN | List invoices with status filter + pagination |
| GET | `/api/invoices/:id` | ADMIN/ARTIST | Invoice detail |
| PATCH | `/api/invoices/:id/send` | ADMIN/ARTIST | Send invoice email to customer |
| PATCH | `/api/invoices/:id/mark-paid` | ADMIN | Mark as paid, set `paidAt` |
| PATCH | `/api/invoices/:id/void` | ADMIN | Void invoice |

**Overdue detection:**
- A recurring BullMQ job (daily) checks `UNPAID` invoices where `dueDate < now()` and sets status to `OVERDUE`

**Checklist:**
- [ ] Invoice auto-created on booking completion (via Step 1.9)
- [ ] Send endpoint queues `invoice` email
- [ ] Overdue detection job implemented
- [ ] Tests written and passing

---

## Step 1.11 — Email Automation Service

**What:** Resend-powered email service with Handlebars HTML templates. BullMQ queue ensures
reliable delivery without blocking API responses. `.ics` calendar attachment generated for
booking confirmations.

**Files to create:**
- `backend/src/modules/email/email.service.ts` — Resend transport, Handlebars compile + send, ical-generator for .ics
- `backend/src/modules/email/email.queue.ts` — BullMQ email queue + processor
- `backend/src/modules/email/templates/inquiry-received.hbs`
- `backend/src/modules/email/templates/inquiry-notification.hbs`
- `backend/src/modules/email/templates/quote-sent.hbs`
- `backend/src/modules/email/templates/booking-confirmed.hbs`
- `backend/src/modules/email/templates/booking-reminder.hbs`
- `backend/src/modules/email/templates/booking-cancelled.hbs`
- `backend/src/modules/email/templates/booking-rescheduled.hbs`
- `backend/src/modules/email/templates/deposit-received.hbs`
- `backend/src/modules/email/templates/review-request.hbs`
- `backend/src/modules/email/templates/invoice.hbs`
- `backend/src/modules/email/templates/welcome.hbs`

**Email triggers:**

| When | Template | To |
|---|---|---|
| Lead submitted | `inquiry-received` | Customer (auto-reply) |
| Lead submitted | `inquiry-notification` | Artist + STUDIO_ADMIN_EMAIL |
| Quote sent | `quote-sent` | Customer |
| Booking confirmed | `booking-confirmed` + .ics | Customer |
| 24h before appointment | `booking-reminder` | Customer |
| Booking cancelled | `booking-cancelled` | Customer |
| Booking rescheduled | `booking-rescheduled` | Customer |
| Deposit payment received | `deposit-received` | Customer |
| 24–48h post-appointment | `review-request` | Customer |
| Invoice sent | `invoice` | Customer |
| New customer account | `welcome` | Customer |

**Template variables** (available in all templates):
`{{ studioName }}`, `{{ customerName }}`, `{{ artistName }}`, `{{ date }}`, `{{ time }}`, `{{ googleReviewUrl }}`

**Checklist:**
- [ ] All 11 templates created and styled (HTML + inline CSS — no external CSS)
- [ ] `.ics` file generated and attached to `booking-confirmed` using `ical-generator`
- [ ] Queue processes jobs without blocking API
- [ ] Failed jobs retry 3 times with exponential backoff (2s, 4s, 8s)
- [ ] DB `EmailTemplate` records override `.hbs` content when present (CRM editing)
- [ ] `booking-reminder` fires 24h before `startAt` via a BullMQ delayed job (scheduled in Step 1.9 on confirm)
- [ ] `booking-cancelled` queued when booking status → CANCELLED
- [ ] `booking-rescheduled` queued when booking is rescheduled
- [ ] `deposit-received` queued when `Booking.depositPaidAt` is set
- [ ] `welcome` queued on new CUSTOMER account registration
- [ ] Tests for service and queue written and passing

---

## Step 1.12 — Google Calendar Integration

**What:** Adapter-based calendar service. Connects an artist's Google Calendar via OAuth 2.0.
Creates, updates, and deletes calendar events when bookings change.

**Files to create:**
- `backend/src/modules/calendar/calendar.interface.ts` — base `ICalendarAdapter` interface
- `backend/src/modules/calendar/calendar.service.ts` — picks the right adapter; stores/retrieves OAuth tokens
- `backend/src/modules/calendar/calendar.routes.ts` — OAuth callback + connect/disconnect endpoints
- `backend/src/modules/calendar/adapters/google.adapter.ts` — full Google Calendar API implementation
- `backend/src/modules/calendar/adapters/outlook.adapter.ts` — stub (TODO documented)
- `backend/src/modules/calendar/adapters/calendly.adapter.ts` — stub (TODO documented)

**Interface (every adapter must implement):**
```typescript
interface ICalendarAdapter {
  createEvent(booking: Booking): Promise<string>;   // returns calendarEventId
  updateEvent(booking: Booking): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}
```

**OAuth flow:**
1. `GET /api/calendar/connect` — redirect to Google consent screen
2. `GET /api/calendar/callback` — receive auth code, exchange for tokens, store encrypted in DB
3. `DELETE /api/calendar/disconnect` — revoke and delete stored tokens

**Checklist:**
- [ ] OAuth flow completes (connect → callback → tokens stored)
- [ ] `createEvent` creates a Google Calendar event with booking details
- [ ] `updateEvent` and `deleteEvent` work correctly
- [ ] Tokens refreshed automatically when expired
- [ ] Outlook and Calendly stubs present with clear TODO comments
- [ ] Tests for Google adapter written and passing

---

## Step 1.13 — Analytics API

**What:** Aggregate `AnalyticsEvent` and business data into actionable metrics. Powers the CRM dashboard.

**Files to create:**
- `backend/src/modules/analytics/analytics.service.ts`
- `backend/src/modules/analytics/analytics.controller.ts`
- `backend/src/modules/analytics/analytics.routes.ts`

**Endpoints (all ADMIN only):**

| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/overview` | Totals: leads, bookings, revenue, conversion rate, avg value, no-show rate, cancellation rate |
| GET | `/api/analytics/leads` | Leads by status, by source, by day/week/month |
| GET | `/api/analytics/bookings` | Bookings by status, by artist, by date, no-shows, cancellations |
| GET | `/api/analytics/revenue` | Revenue by month, by artist, by service type, outstanding invoices, avg spend per customer |
| GET | `/api/analytics/artists` | Per-artist: leads, bookings, revenue, conversion rate, no-show rate |
| GET | `/api/analytics/services` | Most-booked services, revenue by service, avg duration accuracy |
| GET | `/api/analytics/peak-times` | Peak hours, peak days, busiest months |
| GET | `/api/analytics/customers` | New vs returning customers, repeat rate, lifetime value top customers |

**Query params (all endpoints):** `?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Checklist:**
- [ ] All endpoints return correctly aggregated data
- [ ] Date range filters work on all endpoints
- [ ] ADMIN role enforced
- [ ] Tests written and passing

---

## Step 1.14 — File Upload Service

**What:** Upload reference images from the lead inquiry form. Files validated by Multer and stored on Cloudinary. Returns public CDN URLs.

**Files to create:**
- `backend/src/middleware/upload.ts` — Multer config (memory storage, file type check, size limit)
- `backend/src/modules/uploads/uploads.service.ts` — Cloudinary upload logic
- `backend/src/modules/uploads/uploads.controller.ts`
- `backend/src/modules/uploads/uploads.routes.ts`

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/uploads/images` | Auth | Upload 1–10 images; returns array of Cloudinary URLs |

**Constraints:**
- Max 10 images per request
- Max 10 MB per image
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp` (checked by Multer — not just extension)

**Checklist:**
- [ ] Upload endpoint returns `{ urls: [...] }` with Cloudinary CDN URLs
- [ ] MIME type validation works (rename .exe to .jpg → rejected)
- [ ] 10 MB size limit enforced
- [ ] 10 image count limit enforced
- [ ] Tests written and passing

---

## Step 1.15 — Feature Flag System

**What:** Every major feature can be toggled ON/OFF from the CRM God Mode panel without redeployment. Implemented as `FeatureFlag` records in the DB, checked by middleware.

**Files to create:**
- `backend/src/modules/features/features.service.ts`
- `backend/src/modules/features/features.controller.ts`
- `backend/src/modules/features/features.routes.ts`
- `backend/src/middleware/featureFlag.ts` — `requireFeature('KEY')` middleware

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/features` | ADMIN | List all feature flags |
| PATCH | `/api/features/:key` | ADMIN | Toggle flag on/off |

**28 flags (seeded per business type from `businessType.ts` — not all ON for every type):**

| Key | Controls |
|---|---|
| `BOOKING_ENABLED` | Entire booking flow |
| `CALENDAR_ENABLED` | Google Calendar sync |
| `ICS_DOWNLOAD_ENABLED` | .ics calendar download link in emails |
| `DEPOSIT_REQUIRED` | Deposit must be paid before booking confirms |
| `DEPOSIT_PARTIAL_ENABLED` | Configurable % deposit (vs fixed) |
| `LEAD_CAPTURE_ENABLED` | Public inquiry / lead form (tattoo + general) |
| `QUOTE_SYSTEM_ENABLED` | Artist generates a quote before booking |
| `INSTANT_BOOKING_ENABLED` | Direct booking without lead/quote step |
| `MANNEQUIN_ENABLED` | 3D body placement tool on inquiry form |
| `REFERENCE_IMAGES_ENABLED` | Upload reference photos on inquiry |
| `SERVICE_MENU_ENABLED` | Service categories + items visible on site |
| `PRICE_LIST_VISIBLE` | Show prices publicly (vs "from" / on request) |
| `TABLE_SELECTION_ENABLED` | Visual table map for restaurant reservations |
| `PARTY_SIZE_ENABLED` | Party size question on reservation form |
| `SPECIAL_REQUESTS_ENABLED` | Free-text notes / requests field on booking |
| `PORTFOLIO_ENABLED` | Artist/stylist portfolio gallery visible on site |
| `GALLERY_UPLOAD_ENABLED` | Staff can upload to portfolio via CRM |
| `EMAIL_REMINDERS_ENABLED` | Automated email reminder 24h before |
| `SMS_REMINDERS_ENABLED` | SMS reminder (future: Twilio SMS — see Step 1.17) |
| `WHATSAPP_CONTACT_ENABLED` | WhatsApp automation via Twilio |
| `REVIEW_REQUEST_ENABLED` | Post-appointment review request |
| `ANALYTICS_ENABLED` | First-party AnalyticsEvent tracking |
| `LEAD_SCORING_ENABLED` | Rule-based lead score visible in CRM |
| `ONLINE_PAYMENT_ENABLED` | Stripe card payment for deposits or full payment |
| `WAITING_LIST_ENABLED` | Customers can join waiting list when fully booked |
| `RECURRING_BOOKING_ENABLED` | Repeat bookings (weekly/bi-weekly cadence) |
| `CANCELLATION_FEE_ENABLED` | Charge late cancellation / no-show fee via Stripe |
| `GIFT_VOUCHER_ENABLED` | Sell and redeem gift vouchers / gift cards |

**Middleware behaviour:**
- Flag enabled → request continues
- Flag disabled → `503 { success: false, error: { code: "FEATURE_DISABLED", message: "..." } }`
- Flags cached in memory for 60 seconds (avoids a DB query on every request)

**Checklist:**
- [ ] All 28 flags seeded with correct per-type defaults from `businessType.ts`
- [ ] `requireFeature` middleware works correctly on enabled and disabled flags
- [ ] Toggle endpoint works; cache invalidated on change
- [ ] Tests written and passing

---

## Step 1.16 — Database Seed Script

**What:** Populate the database with complete, realistic initial data for development and demos.

**Files to create:**
- `backend/prisma/seed.ts`

**Data to seed:**
- 1 Admin user (`admin@studio.com` / `Admin1234!`)
- 3 Artist users with full profiles, bios, `ArtistAvailability` (Mon–Fri 10:00–18:00), portfolio placeholder URLs
- All 12 tattoo styles with descriptions and placeholder images (tattoo_studio type)
- Artist ↔ Style assignments (each artist assigned 4–6 styles)
- **ServiceCategory + Service records** seeded from `getServiceTemplate(BUSINESS_TYPE)` in `businessType.ts` (editable in CRM after seeding)
- ArtistService join records (all artists assigned to all seeded services)
- **Table records** (restaurant type only): 10 tables with names, capacities, placeholder positions
- All 28 feature flags seeded with per-type defaults from `getDefaultFlags(BUSINESS_TYPE)`
- 11 email templates (matching the 11 `.hbs` templates, subjects and placeholder HTML)
- 5 Leads in various statuses (NEW, QUOTED, BOOKED, COMPLETED, CANCELLED)
- 2 Quotes (SENT, ACCEPTED)
- 2 Bookings (CONFIRMED, COMPLETED) — one with `serviceId` set, one without (tattoo)
- 1 Invoice (UNPAID)

**Checklist:**
- [ ] `npm run db:seed` runs without errors
- [ ] Seed is fully idempotent: uses `upsert` / `createOrSkip` patterns throughout
- [ ] All data visible in `prisma studio` after seeding
- [ ] Re-running seed produces no duplicates and no errors

---

## Step 1.17 — WhatsApp Automation Module

**What:** Two automated WhatsApp messages via Twilio WhatsApp API, gated by `WHATSAPP_CONTACT_ENABLED`.

**Files to create:**
- `backend/src/modules/whatsapp/whatsapp.service.ts` — Twilio client, `sendMessage()` function
- `backend/src/modules/whatsapp/whatsapp.queue.ts` — BullMQ WhatsApp queue + processor

**Messages:**

**Message 1 — Lead submitted** (immediate, only if `lead.preferWhatsApp = true`):
> *"Hi [Name]! 👋 Thanks for reaching out to [STUDIO_NAME]. We've received your inquiry and [Artist] will be in touch shortly. — [STUDIO_NAME]"*

**Message 2 — Booking confirmed** (immediate on confirm, if `preferWhatsApp = true`):
> *"Hi [Name]! ✅ Your [appointment/session/reservation] at [STUDIO_NAME] is confirmed for [DATE] at [TIME] with [Artist]. See you then! — [STUDIO_NAME]"*

**Message 3 — Appointment reminder** (24h before `startAt`, if `preferWhatsApp = true`):
> *"Hi [Name]! 🗓 Just a reminder — your [appointment] at [STUDIO_NAME] is tomorrow at [TIME] with [Artist]. Reply CANCEL to cancel. — [STUDIO_NAME]"*

**Message 4 — Post-visit review request** (2-hour delay after COMPLETE, if `preferWhatsApp = true`):
> *"Hi [Name]! 🙏 Thank you for visiting [STUDIO_NAME] today! We'd love a Google review: [GOOGLE_REVIEW_URL] — [STUDIO_NAME]"*

**Message 5 — Day-of reminder for restaurant** (2h before reservation `startAt`, restaurant type only):
> *"Hi [Name]! 🍽 Looking forward to seeing you at [STUDIO_NAME] tonight at [TIME] (party of [PARTY_SIZE]). — [STUDIO_NAME]"*

**Checklist:**
- [ ] Message 1 queued on lead submit (when `preferWhatsApp = true` + flag enabled)
- [ ] Message 2 queued on booking CONFIRM (when `preferWhatsApp = true` + flag enabled)
- [ ] Message 3 queued as a delayed job on booking CONFIRM (delay = `startAt - 24h`)
- [ ] Message 4 queued with 2-hour delay on booking COMPLETE
- [ ] Message 5 queued for restaurant type on confirm (delay = `startAt - 2h`)
- [ ] Twilio errors handled gracefully (logged, do NOT fail the parent request)
- [ ] Feature flag checked before sending
- [ ] Tests written and passing

---

## Step 1.18 — BullMQ Job Queue Infrastructure

**What:** Centralised queue infrastructure — Redis connection, named queue registry, unified worker
process, retry/backoff configuration, and graceful shutdown.

**Files to create:**
- `backend/src/queue/redis.ts` — ioredis singleton (supports TLS for Upstash: `rediss://`)
- `backend/src/queue/queues.ts` — registry: `emailQueue`, `whatsappQueue`, `reviewQueue`
- `backend/src/queue/worker.ts` — unified Worker processing all queues; graceful shutdown on SIGTERM
- `backend/src/queue/index.ts` — exports; initialised in `server.ts`

**Configuration:**
- Retry: 3 attempts, exponential backoff starting at 2 seconds
- Failed jobs retained: 100 (for debugging in production)
- Completed jobs retained: 20 (cleanup)
- Graceful shutdown: `await worker.close()` before `process.exit(0)`

**Checklist:**
- [ ] Redis connection works with `redis://` (local Docker) and `rediss://` (Upstash TLS)
- [ ] All 3 queues registered and processed by the worker
- [ ] Retry/backoff config verified in unit test
- [ ] Graceful shutdown tested
- [ ] Worker started as part of `server.ts` startup sequence

---

## Step 1.19 — Review Request Automation

**What:** BullMQ delayed job that fires 36 hours after a booking is marked COMPLETE. Sends a review
request email and optional WhatsApp message.

**Files to create:**
- `backend/src/modules/reviews/reviews.queue.ts` — enqueue delayed job (called from Step 1.9)
- `backend/src/modules/reviews/reviews.processor.ts` — job handler: send `review-request` email + optional WhatsApp

**Logic:**
- Enqueued by `bookings.service.ts` on completion with `delay: 36 * 60 * 60 * 1000`
- Processor sends `review-request.hbs` email
- If `lead.preferWhatsApp = true` AND flag enabled → also sends WhatsApp Message 2 (avoids double-send: check if WhatsApp job already sent)

**Checklist:**
- [ ] Job enqueued with correct delay on booking complete
- [ ] Review email sent correctly
- [ ] WhatsApp sent only when appropriate (no double-send)
- [ ] Job idempotent (safe to re-process with same booking ID)
- [ ] Tests written and passing

---

## Step 1.20 — Availability & Time Slot Engine

**What:** Algorithm that calculates available time slots for a given artist and date range. Powers the
customer-facing booking calendar and the CRM schedule view.

**Files to create:**
- `backend/src/modules/availability/availability.service.ts` — slot calculation engine
- `backend/src/modules/availability/availability.controller.ts`
- `backend/src/modules/availability/availability.routes.ts`

**Endpoint:**
- `GET /api/availability?artistId=X&from=YYYY-MM-DD&to=YYYY-MM-DD` — Public

**Response:**
```json
[
  {
    "date": "2026-04-15",
    "slots": [
      { "start": "10:00", "end": "11:30", "available": true },
      { "start": "11:30", "end": "13:00", "available": false }
    ]
  }
]
```

**Algorithm:**
1. Load `ArtistAvailability` for each requested day of week
2. Load all `CONFIRMED` and `PENDING` bookings in the date range for this artist
3. Load all `AvailabilityBlock` records in the date range for this artist
4. For each day: subtract booked ranges (+ `artist.bufferMinutes`) and blocked ranges from working hours
5. Divide remaining time into slots of `artist.slotDuration` minutes

**Edge cases to handle:**
- Artist has no `ArtistAvailability` for a day → day returns empty slots
- Booking + buffer runs past end of working hours → no overflow
- `from === to` (single day query) → works correctly
- `to` is before `from` → return 400

**Checklist:**
- [ ] Single-day and multi-day queries both work
- [ ] Buffer between appointments respected
- [ ] Manually blocked ranges excluded
- [ ] No slot overlaps an existing confirmed/pending booking
- [ ] Unit tests with edge cases (no availability, fully booked, buffer overflow)

---

## Step 1.21 — Docker Compose (Local Dev Environment)

**What:** `docker-compose.yml` at repo root to start PostgreSQL 16 + Redis 7 locally.

**Files to create:**
- `docker-compose.yml` (repo root — one level above `backend/`)

**Service definitions:**

```yaml
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
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

**Local `.env` values when using Docker Compose:**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/automation_dev
REDIS_URL=redis://localhost:6379
```

**Checklist:**
- [ ] `docker compose up -d` starts both services without errors
- [ ] PostgreSQL accessible on `localhost:5432`
- [ ] Redis accessible on `localhost:6379`
- [ ] Both health checks pass
- [ ] `docker compose down -v` cleans up completely
- [ ] `npm run dev` works immediately after `docker compose up -d`

---

## Step 1.22 — Integration Tests (Full API Suite)

**What:** Supertest integration tests for every API route. Tests run against a real test database
and cover happy paths + key error cases for every module.

**Files to create:**
- `backend/jest.setup.ts` — global setup: connect test DB, run `prisma migrate reset --force`, teardown
- `backend/src/modules/auth/auth.test.ts`
- `backend/src/modules/artists/artists.test.ts`
- `backend/src/modules/styles/styles.test.ts`
- `backend/src/modules/leads/leads.test.ts`
- `backend/src/modules/quotes/quotes.test.ts`
- `backend/src/modules/bookings/bookings.test.ts`
- `backend/src/modules/invoices/invoices.test.ts`
- `backend/src/modules/availability/availability.test.ts`
- `backend/src/modules/uploads/uploads.test.ts`
- `backend/src/modules/features/features.test.ts`
- `backend/src/modules/analytics/analytics.test.ts`
- `backend/src/modules/services/services.test.ts`
- `backend/src/modules/tables/tables.test.ts`
- `backend/src/modules/payments/payments.test.ts`
- `backend/src/modules/customers/customers.test.ts`

**Test standards:**
- Each test file seeds its own minimal fixture data
- No shared mutable state between test files
- Each test cleans up after itself (or uses DB transactions that rollback)
- Mocks: Resend, Twilio, Cloudinary, Google Calendar are all mocked — tests do not hit real APIs

**Required env var:** `TEST_DATABASE_URL` — points to a `_test` database (separate from dev DB)

**Checklist:**
- [ ] `npm test` runs all suites without errors
- [ ] Auth flow fully tested: register → login → protected route → refresh → logout
- [ ] Role enforcement tested: ADMIN-only routes reject ARTIST and CUSTOMER
- [ ] Feature flag middleware tested: disabled flag returns 503
- [ ] Each module has ≥ 1 happy path + ≥ 1 error case
- [ ] 0 tests skipped, 0 tests with `any` type assertions

---

## Step 1.23 — Payment Integration (Stripe)

**What:** Stripe-powered online payment for deposits and full pre-payment. Creates a PaymentIntent
on booking creation (when `ONLINE_PAYMENT_ENABLED` + `DEPOSIT_REQUIRED`), confirms payment, and
records it on the `Booking` record. Supports card-on-file for late cancellation / no-show charges
(`CANCELLATION_FEE_ENABLED`).

**Why:** This is the #1 gap vs competitors (Fresha, Vagaro, Treatwell). Without online payment,
businesses cannot collect deposits, reduce no-shows, or offer a fully automated booking experience.
Every type (salon, barber, nail, masseuse, restaurant, tattoo) may require a deposit.

**Files to create:**
- `backend/src/modules/payments/payments.service.ts` — Stripe client, createPaymentIntent, confirmPayment, captureDeposit, chargeCardOnFile
- `backend/src/modules/payments/payments.controller.ts`
- `backend/src/modules/payments/payments.routes.ts`
- `backend/src/modules/payments/payments.webhook.ts` — Stripe webhook handler (signature verification)

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/intent` | Auth | Create Stripe PaymentIntent for booking deposit |
| POST | `/api/payments/confirm` | Public (Stripe) | Webhook: payment confirmed → set `depositPaidAt` on Booking, queue `deposit-received` email |
| POST | `/api/payments/cancel-fee` | ADMIN | Charge cancellation fee to stored card |

**Flow (deposit on booking):**
1. Customer reaches "Confirm Booking" step with `DEPOSIT_REQUIRED = true`
2. Frontend calls `POST /api/payments/intent` → backend creates Stripe PaymentIntent, returns `clientSecret`
3. Frontend renders Stripe payment element → customer enters card
4. Stripe calls webhook on success → booking confirmed, `depositPaidAt` set, `deposit-received` email queued

**Checklist:**
- [ ] Stripe client initialised with `STRIPE_SECRET_KEY` env var
- [ ] Webhook signature verified using `STRIPE_WEBHOOK_SECRET`
- [ ] `depositPaidAt` set on Booking atomically in webhook handler
- [ ] `deposit-received` email queued on successful payment
- [ ] Cancellation fee charge works when `CANCELLATION_FEE_ENABLED = true`
- [ ] Tests written and passing (Stripe events mocked with `stripe-mock` or fixtures)

---

## Step 1.24 — Service & Table Management API

**What:** Full CRUD for `ServiceCategory`, `Service`, `ArtistService` (price overrides per artist),
and `Table` (restaurants). These are the CRM-editable records seeded from `businessType.ts`
templates. Studio owners manage their menu and pricing from the CRM — no developer required.

**Why:** Every non-tattoo booking type requires selecting a service before picking a time slot.
Without this API, the CRM cannot edit prices, add new services, or manage restaurant tables.
This step also updates `businessType.ts` with the 5 new feature flags added in the gap-fill pass.

**Files to create:**
- `backend/src/modules/services/services.schema.ts`
- `backend/src/modules/services/services.service.ts`
- `backend/src/modules/services/services.controller.ts`
- `backend/src/modules/services/services.routes.ts`
- `backend/src/modules/tables/tables.schema.ts`
- `backend/src/modules/tables/tables.service.ts`
- `backend/src/modules/tables/tables.controller.ts`
- `backend/src/modules/tables/tables.routes.ts`

**Also update:**
- `backend/src/config/businessType.ts` — add 5 new flags (ONLINE_PAYMENT_ENABLED, WAITING_LIST_ENABLED, RECURRING_BOOKING_ENABLED, CANCELLATION_FEE_ENABLED, GIFT_VOUCHER_ENABLED) with per-type defaults

**Endpoints — Services:**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/service-categories` | Public | List active categories (with nested services) |
| POST | `/api/service-categories` | ADMIN | Create category |
| PATCH | `/api/service-categories/:id` | ADMIN | Update category |
| DELETE | `/api/service-categories/:id` | ADMIN | Soft-delete category |
| GET | `/api/services` | Public | List all active services |
| POST | `/api/services` | ADMIN | Create service |
| PATCH | `/api/services/:id` | ADMIN | Update service (name, price, duration, image, isActive) |
| DELETE | `/api/services/:id` | ADMIN | Soft-delete service |
| PUT | `/api/artists/:id/services` | ADMIN | Set which services an artist offers (with optional price overrides) |

**Endpoints — Tables (restaurant only, gated by `TABLE_SELECTION_ENABLED`):**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/tables` | Public | List active tables with capacity |
| GET | `/api/tables/availability` | Public | Tables available for `?date=&time=&partySize=` |
| POST | `/api/tables` | ADMIN | Create table (name, capacity, floor-plan position) |
| PATCH | `/api/tables/:id` | ADMIN | Update table |
| DELETE | `/api/tables/:id` | ADMIN | Soft-delete table |

**`GET /api/tables/availability` logic:**
1. Load all active tables
2. Load all CONFIRMED + PENDING bookings for the requested date/time window (sitting duration)
3. Filter tables where `capacity >= partySize` and no overlapping booking exists
4. Return available tables with their `positionX/Y` for floor-plan rendering

**Checklist:**
- [ ] Service CRUD implemented and tested
- [ ] Table CRUD implemented and tested
- [ ] `GET /api/tables/availability` returns correct available tables
- [ ] Artist price overrides work (ArtistService.customPrice shown on booking form)
- [ ] `businessType.ts` updated with 5 new flags, tests updated and passing
- [ ] `prisma migrate dev --name add_service_table_models` run

---

## Step 1.25 — Customer Portal API

**What:** Customer-facing endpoints so logged-in customers can view their own booking history,
manage upcoming bookings (reschedule/cancel), and manage their profile. Powers the "My Bookings"
section of the public frontend.

**Why:** This is standard across all competitor platforms (Fresha, Vagaro, Booksy). Without it,
customers have no self-service — every change requires contacting the studio. This also enables
repeat-booking UX (book again from history) which increases revenue.

**Files to create:**
- `backend/src/modules/customers/customers.schema.ts`
- `backend/src/modules/customers/customers.service.ts`
- `backend/src/modules/customers/customers.controller.ts`
- `backend/src/modules/customers/customers.routes.ts`

**Endpoints (all require `CUSTOMER` role or own-record check):**

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/me/bookings` | CUSTOMER | List own bookings (past + upcoming, paginated) |
| GET | `/api/me/bookings/:id` | CUSTOMER | Single booking detail |
| POST | `/api/me/bookings/:id/cancel` | CUSTOMER | Cancel own upcoming booking (respects cancellation window) |
| POST | `/api/me/bookings/:id/reschedule` | CUSTOMER | Request reschedule (creates a reschedule request, notifies staff) |
| GET | `/api/me/leads` | CUSTOMER | List own inquiry leads (tattoo studio type) |
| PATCH | `/api/me/profile` | CUSTOMER | Update own name, phone, preferWhatsApp |

**Business rules:**
- Customer can only cancel/reschedule bookings where `startAt > now() + cancellationWindowHours` (configurable, default 24h)
- If `CANCELLATION_FEE_ENABLED` and customer cancels inside the window → trigger cancellation fee charge
- Rescheduling creates a staff notification rather than auto-confirming (staff must re-confirm)

**Checklist:**
- [ ] Customers can only access their own records (no cross-customer data access)
- [ ] Cancellation window enforced
- [ ] Cancellation fee triggered when applicable (`CANCELLATION_FEE_ENABLED`)
- [ ] Rescheduling request notifies staff via email
- [ ] Tests written and passing

---

## ✅ Phase 1 Complete When

- [ ] All 25 steps above verified by checklist
- [ ] `npm run build` — TypeScript compiles with zero errors and zero warnings
- [ ] `npm test` — all tests pass, 0 failures
- [ ] `docker compose up -d && npm run dev` — full stack starts cleanly
- [ ] `GET /health` returns 200
- [ ] All endpoints tested manually via Postman / curl
- [ ] `npm audit` — 0 vulnerabilities
- [ ] No hardcoded secrets anywhere in source code
- [ ] PLAN.md Phase 1 status updated to ✅

---

*This document supersedes the Phase 1 section of PLAN.md as the authoritative step-by-step reference.
For architecture decisions, tech stack reasoning, and Phases 2–4, see PLAN.md.*
