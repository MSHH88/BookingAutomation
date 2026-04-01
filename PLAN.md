# BookingAutomation — Master Development Plan

> **Status: PLAN LOCKED — All decisions confirmed and elaborated. Ready to start Phase 1, Step 1.1.**
> We proceed **one step at a time**, completing and verifying each step before moving on.
> Last updated: 2026-04-01 — Phase order revised: Phase 1 Backend → Phase 2 CRM → Phase 3 Frontend → Phase 4 3D Mannequin.

---

## Project Vision

Build a **market-leading, fully automated booking and CRM system** that surpasses every existing solution (Fresha, Vagaro, Booksy, etc.).  
The system is built for tattoo studios first, but the **backend and core logic are 100% interchangeable** — swap out the frontend/CRM skin and it becomes a barber shop, salon, or restaurant booking system with zero re-engineering.

---

## Ground Rules (Must Follow)

- ✅ One step at a time. No step starts until the previous step is verified and approved.
- ✅ Every file is reviewed before the next one is created.
- ✅ The backend is built first — it is the foundation everything else rests on.
- ✅ No frontend or CRM file is created before the backend is stable.
- ✅ Quality over speed. Every file is production-grade from day one.
- ✅ The plan is a living document — we update it as we learn.

---

## Tech Stack (All Confirmed — See Architecture Decisions section for full reasoning)

| Layer | Technology | Status |
|---|---|---|
| Backend runtime | Node.js 20 LTS + TypeScript 5 | ✅ Confirmed |
| Backend framework | Express.js | ✅ Confirmed |
| Database | PostgreSQL 16 | ✅ Confirmed |
| ORM | Prisma | ✅ Confirmed |
| Auth | JWT access (15min) + refresh (7d) | ✅ Confirmed |
| Validation | Zod | ✅ Confirmed |
| Job queue | BullMQ + Redis | ✅ Confirmed |
| Email sending | **Resend** | ✅ Confirmed |
| Email templates | **Handlebars `.hbs`** | ✅ Confirmed (revised from React Email — see Decision 4) |
| File uploads | **Cloudinary** + Multer | ✅ Confirmed |
| Logging | Winston | ✅ Confirmed |
| Testing | Jest + Supertest | ✅ Confirmed |
| Frontend | React 18 + TypeScript + Vite | ✅ Confirmed |
| Styling | Tailwind CSS v3 | ✅ Confirmed |
| Design system | Jade green + dark bg + glass morphism | ✅ Confirmed |
| State management | Zustand | ✅ Confirmed |
| 3D Mannequin | Three.js + React Three Fiber | ✅ Confirmed |
| CRM framework | React + Tailwind (custom-built) | ✅ Confirmed |
| Charts/Analytics | Recharts | ✅ Confirmed |
| Calendar | **Google Calendar API** + .ics download | ✅ Confirmed |
| Lead analytics | **GA4** + first-party AnalyticsEvent table | ✅ Confirmed |
| Dev DB | Docker Compose postgres:16 | ✅ Confirmed |
| Prod DB | **Neon** (serverless PostgreSQL) | ✅ Confirmed |
| Dev Redis | Docker Compose redis:7-alpine | ✅ Confirmed |
| Prod Redis | **Upstash** (serverless Redis) | ✅ Confirmed |
| Frontend deploy | **Vercel** | ✅ Confirmed |
| Backend deploy | **Railway** | ✅ Confirmed |

---

---

# PHASE 1 — Backend Foundation & Interoperability Core

> **Goal:** Build a robust, scalable, platform-agnostic API that can power a tattoo studio, barber shop, salon, or restaurant — just by changing configuration and the frontend skin.  
> **Why first:** Everything — the frontend, the CRM, the 3D mannequin — depends on the API. Getting this right is the most important phase.

---

## Step 1.1 — Project Scaffolding

**What:** Create the `backend/` folder structure, `package.json`, `tsconfig.json`, and `.env.example`.

**Why:** Establishes the foundation. Every developer needs the same folder structure, TypeScript config, and environment variables to work on the project.

**Files to create (this step only):**
- `backend/package.json` — all dependencies listed, scripts defined
- `backend/tsconfig.json` — strict TypeScript config
- `backend/.env.example` — every required environment variable documented with a comment
- `backend/.gitignore` — ignore `node_modules`, `dist`, `.env`

**Checklist:**
- [ ] `backend/package.json` created and reviewed
- [ ] `backend/tsconfig.json` created and reviewed
- [ ] `backend/.env.example` created and reviewed
- [ ] `backend/.gitignore` created and reviewed
- [ ] `npm install` runs without errors
- [ ] `tsc --noEmit` runs without errors (on empty project)

---

## Step 1.2 — Database Schema (Prisma)

**What:** Design and write the entire PostgreSQL schema using Prisma.

**Why:** The database is the single source of truth. Every model, relationship, and constraint must be right before any code touches the database. Changing the schema later is costly.

**Models to create:**
- `User` — system accounts (Admin, Artist, Customer roles)
- `Artist` — artist profile linked to User; bio, slug, portfolio images
- `ArtistAvailability` — per-artist working hours per day of week (e.g. Tuesday 10:00–17:00)
- `AvailabilityBlock` — manually blocked date/time ranges per artist (holidays, private blocks)
- `TattooStyle` — list of styles (Hyperrealistic, Old School, Japanese, etc.); editable from CRM
- `ArtistStyle` — many-to-many join: which artist offers which style
- `Lead` — a customer inquiry with all tattoo details (placement, size, style, images, description, contact)
- `Booking` — confirmed appointment linked to a Lead and Artist; has calendar event ID
- `Quote` — price estimate sent to a Lead by an Artist; tracks accept/reject/expire
- `Invoice` — financial record linked to a Booking; tracks paid/unpaid/overdue
- `EmailTemplate` — stored email templates (subject, HTML body, variables); editable from CRM
- `FeatureFlag` — God Mode on/off switches for every feature in the system
- `AnalyticsEvent` — raw event log for leads, bookings, page views, conversions
- `RefreshToken` — stored refresh tokens for JWT rotation
- `PasswordResetToken` — one-time tokens for forgot-password / reset-password flow

**Checklist:**
- [ ] `backend/prisma/schema.prisma` created and reviewed
- [ ] All models, fields, relations and indexes are present
- [ ] `prisma validate` passes with zero errors
- [ ] `prisma migrate dev` creates the database successfully (when DB is ready)

---

## Step 1.3 — Core Express App Setup

**What:** Create the Express application entry point with all global middleware wired up.

**Why:** Middleware (security headers, CORS, rate limiting, request logging, error handling) must be in place before any route is added. This prevents security holes and ensures consistent behaviour across the whole API.

**Files to create (this step only):**
- `backend/src/app.ts` — Express app, all middleware, all route mounts, export
- `backend/src/server.ts` — imports `app`, calls `listen()`, handles shutdown
- `backend/src/config/index.ts` — reads and validates all env vars at startup (fail fast if missing)
- `backend/src/utils/logger.ts` — Winston logger setup (console + file)
- `backend/src/utils/apiResponse.ts` — consistent response shape `{ success, data, error, meta }`
- `backend/src/middleware/errorHandler.ts` — global Express error handler

**Middleware to configure:**
- `helmet` — security headers
- `cors` — allow frontend + CRM origins
- `express-rate-limit` — 100 req/15 min per IP
- `express.json()` — body parsing with 10 MB limit (for image metadata)
- Request logger — log method, path, status, duration on every request

**Checklist:**
- [ ] `src/app.ts` created and reviewed
- [ ] `src/server.ts` created and reviewed
- [ ] `src/config/index.ts` created and reviewed (all env vars validated)
- [ ] `src/utils/logger.ts` created and reviewed
- [ ] `src/utils/apiResponse.ts` created and reviewed
- [ ] `src/middleware/errorHandler.ts` created and reviewed
- [ ] `npm run dev` starts the server without errors
- [ ] `GET /health` returns `{ success: true, data: { status: "ok" } }`

---

## Step 1.3b — API Standards: Pagination & Response Envelopes

**What:** Define and document the standard pagination strategy and response shape used by every list endpoint in the system.

**Why:** With 20+ list endpoints across the API, defining the standard once prevents inconsistency. Every module built after this point follows the same contract — frontend developers get predictable behaviour on every endpoint.

**Standard response envelope (all endpoints):**
```json
{ "success": true, "data": { ... }, "meta": { ... }, "error": null }
```

**Pagination strategy (all list endpoints):**
- Query params: `?page=1&limit=20` (default limit 20, max 100)
- Response `meta`: `{ "total": 150, "page": 1, "limit": 20, "totalPages": 8 }`
- Implemented via `src/utils/paginate.ts` helper (wraps Prisma count + findMany)

**Checklist:**
- [ ] `src/utils/paginate.ts` helper created
- [ ] All list endpoints use the helper consistently
- [ ] Default limit 20, max limit 100 enforced

---

## Step 1.4 — Authentication System

**What:** JWT-based login, registration, token refresh, and logout. Role-based access control (ADMIN, ARTIST, CUSTOMER).

**Why:** Every protected API route depends on this. It must be solid before any other module is built. We follow the access-token (15 min) + refresh-token (7 days) pattern to balance security and convenience.

**Files to create (this step only):**
- `backend/src/modules/auth/auth.schema.ts` — Zod validation for register/login/forgot-password/reset-password requests
- `backend/src/modules/auth/auth.service.ts` — hash password, compare password, sign tokens, verify tokens, store/rotate refresh tokens, generate/validate password reset tokens
- `backend/src/modules/auth/auth.controller.ts` — POST register, POST login, POST refresh, POST logout, POST forgot-password, POST reset-password, GET /me, PATCH /me
- `backend/src/modules/auth/auth.routes.ts` — route definitions
- `backend/src/middleware/auth.ts` — `requireAuth` middleware (validates Bearer token, attaches user to req)
- `backend/src/middleware/requireRole.ts` — `requireRole('ADMIN')` middleware

**Checklist:**
- [ ] `POST /api/auth/register` creates user, returns access + refresh tokens
- [ ] `POST /api/auth/login` verifies credentials, returns tokens
- [ ] `POST /api/auth/refresh` exchanges refresh token for new access token
- [ ] `POST /api/auth/logout` invalidates refresh token
- [ ] `POST /api/auth/forgot-password` generates reset token, sends reset email (queued)
- [ ] `POST /api/auth/reset-password` validates token, sets new password, invalidates token
- [ ] `GET /api/auth/me` returns current authenticated user's profile
- [ ] `PATCH /api/auth/me` updates current user's own name, email, or password
- [ ] Passwords are hashed with bcrypt (cost 12)
- [ ] Invalid tokens return `401`
- [ ] Unit tests written and passing

---

## Step 1.4b — Business Type Configuration

**What:** A config module that reads `BUSINESS_TYPE` from env and exposes a label map + default feature flag set. This drives the CRM label system ("Artists" vs "Stylists" vs "Barbers") and the default flag configuration when seeding a new client.

**Why:** This is the core of the interchangeable architecture. Every module that renders a label (in email templates, API responses, the CRM) reads from this config rather than hardcoding "artists" or "tattoo styles". Adding a new business type in the future is a single config file change.

**Files to create (this step only):**
- `backend/src/config/businessType.ts` — label map + default flags per `BUSINESS_TYPE`

**Business types supported:** `tattoo_studio` | `hair_salon` | `barber` | `restaurant`

**Label map (example):**
| Key | tattoo_studio | hair_salon | barber | restaurant |
|---|---|---|---|---|
| `artists` | Artists | Stylists | Barbers | Staff |
| `styles` | Tattoo Styles | Hair Styles | Cuts | Menu |
| `portfolio` | Portfolio | Gallery | Gallery | Photo Gallery |
| `quote` | Quote | Estimate | Estimate | — |

**Checklist:**
- [ ] `BUSINESS_TYPE` env var read and validated at startup
- [ ] Label map exported and usable by any module
- [ ] Default feature flag set exported (used by seed script in Step 1.21)
- [ ] Unknown `BUSINESS_TYPE` value throws a startup error
- [ ] Tests written and passing

---

**What:** Full CRUD for artist profiles, portfolio images, and style assignments. All data is manageable from the CRM and consumed by the frontend.

**Why:** Artists are the core entity of the system. Customers browse and choose artists. The CRM manages them. Getting the data model and API right here sets the pattern for all other modules.

**Files to create (this step only):**
- `backend/src/modules/artists/artists.schema.ts`
- `backend/src/modules/artists/artists.service.ts`
- `backend/src/modules/artists/artists.controller.ts`
- `backend/src/modules/artists/artists.routes.ts`

**Endpoints:**
- `GET /api/artists` — list all active artists (public)
- `GET /api/artists/:slug` — get single artist profile with portfolio (public)
- `POST /api/artists` — create artist (ADMIN only)
- `PATCH /api/artists/:id` — update artist (ADMIN or own profile)
- `DELETE /api/artists/:id` — soft-delete artist (ADMIN only)
- `POST /api/artists/:id/styles` — assign styles to artist (ADMIN only)

**Checklist:**
- [ ] All endpoints implemented and returning correct shapes
- [ ] Only active artists returned on public endpoints
- [ ] ADMIN role enforced on write endpoints
- [ ] Integration tests written and passing

---

## Step 1.6 — Tattoo Style Management API

**What:** CRUD for tattoo styles (Hyperrealistic, Old School, Japanese, etc.). Styles are shown on the frontend and fully manageable from the CRM.

**Why:** The frontend style selection step reads from this list. Studio owners must be able to add/remove/edit styles without a developer. The seed data populates all 12 styles from the spec.

**Files to create (this step only):**
- `backend/src/modules/styles/styles.schema.ts`
- `backend/src/modules/styles/styles.service.ts`
- `backend/src/modules/styles/styles.controller.ts`
- `backend/src/modules/styles/styles.routes.ts`

**Endpoints:**
- `GET /api/styles` — list all active styles with example images (public)
- `POST /api/styles` — create style (ADMIN only)
- `PATCH /api/styles/:id` — update style (ADMIN only)
- `DELETE /api/styles/:id` — soft-delete style (ADMIN only)

**Styles to seed:** Hyperrealistic, Old School, Japanese, Traditional, Neo-Traditional, Blackwork, Dotwork, Geometric, Watercolor, Tribal, Illustrative, Chicano

**Checklist:**
- [ ] All 12 styles present in seed data
- [ ] All endpoints implemented and reviewed
- [ ] Tests written and passing

---

## Step 1.7 — Lead Capture API

**What:** The API that receives a customer's completed inquiry from the frontend (artist choice, style, body placement, size, images, description, contact info). This creates a Lead record and kicks off the automation pipeline.

**Why:** The Lead is the entry point for every customer. Getting the data model right — especially the JSON placement field that stores 3D mannequin selections — is critical because Quotes, Bookings, and Analytics all trace back to a Lead.

**Lead data captured:**
- Artist preference
- Style preference
- Body placement (from 3D mannequin) — stored as structured JSON: `{ generalArea, specificArea, refinement }`
- Size (or `null` if "whole area" was selected)
- Reference images (Cloudinary URLs)
- Description text
- Name, email, phone, `preferWhatsApp` flag
- Auto-assigned: status (`NEW`), score (0), source, timestamps

**Files to create (this step only):**
- `backend/src/modules/leads/leads.schema.ts`
- `backend/src/modules/leads/leads.service.ts`
- `backend/src/modules/leads/leads.controller.ts`
- `backend/src/modules/leads/leads.routes.ts`

**Endpoints:**
- `POST /api/leads` — public; submit a new inquiry (triggers "lead received" email to artist + studio)
- `GET /api/leads` — ADMIN/ARTIST; list leads with filters (status, artist, date range)
- `GET /api/leads/:id` — ADMIN/ARTIST; full lead detail
- `PATCH /api/leads/:id/status` — ADMIN/ARTIST; update lead status
- `PATCH /api/leads/:id/score` — ADMIN; update lead score

**Checklist:**
- [ ] Lead submitted from frontend creates record with all fields
- [ ] Notification email queued on lead creation
- [ ] Status pipeline transitions validated
- [ ] Tests written and passing

---

## Step 1.8 — Quote Management API

**What:** Artists review a Lead and generate a Quote (price, estimated hours, notes, validity period). The customer is notified by email. The customer can accept or reject the quote.

**Why:** The Quote is the bridge between a lead inquiry and a confirmed booking. Automating the quote workflow (send → accept → create booking) is a core differentiator.

**Files to create (this step only):**
- `backend/src/modules/quotes/quotes.schema.ts`
- `backend/src/modules/quotes/quotes.service.ts`
- `backend/src/modules/quotes/quotes.controller.ts`
- `backend/src/modules/quotes/quotes.routes.ts`

**Endpoints:**
- `POST /api/quotes` — ARTIST/ADMIN; create and send quote for a lead
- `GET /api/quotes` — ADMIN/ARTIST; list quotes
- `GET /api/quotes/:id` — ADMIN/ARTIST/CUSTOMER; get quote detail
- `PATCH /api/quotes/:id/accept` — CUSTOMER/ADMIN; accept quote → triggers booking creation
- `PATCH /api/quotes/:id/reject` — CUSTOMER/ADMIN; reject quote
- `PATCH /api/quotes/:id` — ARTIST/ADMIN; edit draft quote before sending

**Checklist:**
- [ ] Quote creation sends email to customer
- [ ] Accepting a quote automatically creates a Booking (status PENDING)
- [ ] Expired quotes handled gracefully
- [ ] Tests written and passing

---

## Step 1.9 — Booking Management API

**What:** Manage confirmed appointments. Handles status transitions (Pending → Confirmed → Completed / Cancelled / No-Show). Checks for scheduling conflicts. Integrates with the calendar layer.

**Why:** Bookings are the core operational unit of the studio. Double-booking prevention, real-time conflict detection, and automatic calendar sync are what make this system genuinely useful and better than competitors.

**Files to create (this step only):**
- `backend/src/modules/bookings/bookings.schema.ts`
- `backend/src/modules/bookings/bookings.service.ts`
- `backend/src/modules/bookings/bookings.controller.ts`
- `backend/src/modules/bookings/bookings.routes.ts`

**Endpoints:**
- `GET /api/bookings` — ADMIN/ARTIST; list bookings with filters
- `GET /api/bookings/:id` — ADMIN/ARTIST; booking detail
- `PATCH /api/bookings/:id/confirm` — ADMIN/ARTIST; confirm → sends confirmation email, syncs to calendar
- `PATCH /api/bookings/:id/complete` — ADMIN/ARTIST; mark complete → auto-generates invoice
- `PATCH /api/bookings/:id/cancel` — ADMIN/ARTIST; cancel → sends cancellation email
- `GET /api/bookings/availability` — public; returns available slots for a given artist/date range

**Checklist:**
- [ ] Double-booking detection works correctly
- [ ] Confirmation triggers email + calendar event
- [ ] Completion triggers invoice creation
- [ ] Availability endpoint returns correct open slots
- [ ] Tests written and passing

---

## Step 1.10 — Invoice System API

**What:** Auto-generate invoices when a booking is completed. Track payment status. Allow manual invoice creation. Generate printable/sendable invoice data.

**Why:** Studios need to track revenue and send professional invoices. Automating invoice creation on booking completion eliminates admin work and feeds the analytics system.

**Files to create (this step only):**
- `backend/src/modules/invoices/invoices.schema.ts`
- `backend/src/modules/invoices/invoices.service.ts`
- `backend/src/modules/invoices/invoices.controller.ts`
- `backend/src/modules/invoices/invoices.routes.ts`

**Endpoints:**
- `GET /api/invoices` — ADMIN; list all invoices with filters
- `GET /api/invoices/:id` — ADMIN/ARTIST; invoice detail
- `PATCH /api/invoices/:id/send` — ADMIN/ARTIST; send invoice email to customer
- `PATCH /api/invoices/:id/mark-paid` — ADMIN; mark invoice as paid
- `PATCH /api/invoices/:id/void` — ADMIN; void invoice

**Checklist:**
- [ ] Invoice auto-created on booking completion
- [ ] Invoice email sends correctly with all line items
- [ ] Overdue detection works (based on `dueDate`)
- [ ] Tests written and passing

---

## Step 1.11 — Email Automation Service

**What:** Background email service using BullMQ queues and Handlebars HTML templates. Handles all 7 transactional emails defined in Decision 4.

**Why:** Email automation is a key differentiator. Every important event in the system triggers a beautifully templated, personalised email — automatically. Using a queue ensures emails are sent reliably without blocking the API response.

**Files to create (this step only):**
- `backend/src/modules/email/email.service.ts` — Resend transport, Handlebars compile + send, .ics attachment generation (ical-generator)
- `backend/src/modules/email/email.queue.ts` — BullMQ queue definition, job processor
- `backend/src/modules/email/templates/inquiry-received.hbs` — auto-reply to customer on lead submit
- `backend/src/modules/email/templates/inquiry-notification.hbs` — internal alert to artist/admin on new lead
- `backend/src/modules/email/templates/quote-sent.hbs` — quote delivered to customer
- `backend/src/modules/email/templates/booking-confirmed.hbs` — confirmation to customer (+ .ics attachment)
- `backend/src/modules/email/templates/booking-reminder.hbs` — 24h reminder to customer
- `backend/src/modules/email/templates/review-request.hbs` — post-appointment review request
- `backend/src/modules/email/templates/invoice.hbs` — invoice to customer

**Email triggers (automated):**
| Trigger | Template | Recipient |
|---|---|---|
| New lead submitted | `inquiry-received` | Customer (auto-reply) |
| New lead submitted | `inquiry-notification` | Artist + Studio admin |
| Artist sends quote | `quote-sent` | Customer |
| Booking confirmed | `booking-confirmed` + .ics | Customer |
| 24h before appointment | `booking-reminder` | Customer |
| 24–48h after appointment | `review-request` | Customer |
| Invoice generated | `invoice` | Customer |

**Checklist:**
- [ ] All 7 templates created and styled with Handlebars variables
- [ ] .ics file generated and attached to `booking-confirmed` email
- [ ] Queue processes jobs without blocking API
- [ ] Failed jobs are retried (3 attempts, exponential backoff)
- [ ] Email templates are editable from CRM (via `EmailTemplate` DB model)
- [ ] Tests for service and queue written and passing

---

## Step 1.12 — Calendar Integration Layer

**What:** Adapter-based calendar service that creates, updates, and deletes calendar events when bookings are confirmed/cancelled/rescheduled. Supports Google Calendar, Outlook, and Calendly.

**Why:** Real-time calendar sync is essential for preventing double-bookings and giving artists visibility into their schedule. The adapter pattern means adding a new calendar provider never touches core booking logic.

**Files to create (this step only):**
- `backend/src/modules/calendar/calendar.interface.ts` — base interface all adapters implement
- `backend/src/modules/calendar/calendar.service.ts` — picks the right adapter based on config
- `backend/src/modules/calendar/calendar.routes.ts` — OAuth callback routes
- `backend/src/modules/calendar/adapters/google.adapter.ts`
- `backend/src/modules/calendar/adapters/outlook.adapter.ts`
- `backend/src/modules/calendar/adapters/calendly.adapter.ts`

**Interface methods every adapter must implement:**
```
createEvent(booking)   → returns calendarEventId
updateEvent(booking)   → updates existing event
deleteEvent(eventId)   → removes event
getAvailability(artistId, dateRange) → returns free slots
```

**Checklist:**
- [ ] Interface defined and documented
- [ ] Google adapter implemented (full OAuth flow + event CRUD)
- [ ] Outlook adapter stub with TODO for OAuth (documented)
- [ ] Calendly adapter stub with TODO (documented)
- [ ] Availability endpoint works with Google Calendar data
- [ ] Tests for Google adapter written and passing

---

## Step 1.13 — Analytics API

**What:** API endpoints that aggregate raw data into actionable business metrics: total leads, conversion rates, revenue, bookings by artist, lead sources, etc.

**Why:** Studio owners need data to make decisions. The analytics API powers the CRM dashboard. Having it built in the backend means the CRM just calls an endpoint — no complex queries in the frontend.

**Files to create (this step only):**
- `backend/src/modules/analytics/analytics.service.ts`
- `backend/src/modules/analytics/analytics.controller.ts`
- `backend/src/modules/analytics/analytics.routes.ts`

**Endpoints:**
- `GET /api/analytics/overview` — ADMIN; totals: leads, bookings, revenue, conversion rate, avg booking value
- `GET /api/analytics/leads` — ADMIN; leads by status, by source, by day/week/month
- `GET /api/analytics/bookings` — ADMIN; bookings by status, by artist, by date
- `GET /api/analytics/revenue` — ADMIN; revenue by month, by artist, outstanding invoices
- `GET /api/analytics/artists` — ADMIN; per-artist: leads, bookings, revenue, conversion

**Checklist:**
- [ ] All endpoints return correctly aggregated data
- [ ] Date range filters work on all endpoints
- [ ] Tests written and passing

---

## Step 1.14 — File Upload Service

**What:** Handle reference image uploads from the lead inquiry form. Images are received by Multer, validated, and stored on Cloudinary. Returns a public URL stored in the Lead record.

**Why:** Customers upload reference photos of tattoo ideas. Artists need to see these to prepare accurate quotes. Storing on Cloudinary ensures fast delivery globally and keeps the API server stateless.

**Files to create (this step only):**
- `backend/src/middleware/upload.ts` — Multer config (file types, size limits)
- `backend/src/modules/uploads/uploads.controller.ts`
- `backend/src/modules/uploads/uploads.routes.ts`
- `backend/src/modules/uploads/uploads.service.ts` — Cloudinary upload logic

**Limits:**
- Max 10 images per lead
- Max 10 MB per image
- Allowed types: JPEG, PNG, WebP
- Images scanned for MIME type (not just extension)

**Checklist:**
- [ ] Upload endpoint returns Cloudinary URL(s)
- [ ] File type and size limits enforced
- [ ] Invalid files rejected with clear error message
- [ ] Tests written and passing

---

## Step 1.15 — God Mode Feature Flag System

**What:** Every major feature in the system can be toggled ON or OFF from the CRM by an Admin, without redeploying. This is implemented via `FeatureFlag` records in the database, checked by middleware.

**Why:** This is a core differentiator. Studio owners can disable features they don't use. It also allows gradual rollouts and A/B testing. Flags are seeded with sensible defaults.

**Files to create (this step only):**
- `backend/src/modules/features/features.service.ts`
- `backend/src/modules/features/features.controller.ts`
- `backend/src/modules/features/features.routes.ts`
- `backend/src/middleware/featureFlag.ts` — `requireFeature('FLAG_KEY')` middleware

**Flags to seed (all ON by default):**
| Flag Key | Label | What it controls |
|---|---|---|
| `BOOKING_ENABLED` | Bookings | Entire booking flow |
| `QUOTES_ENABLED` | Quotes | Quote generation and sending |
| `ANALYTICS_ENABLED` | Analytics | Analytics dashboard |
| `LEAD_CAPTURE_ENABLED` | Lead Capture | Public inquiry form |
| `EMAIL_AUTOMATION_ENABLED` | Email Automation | All automated emails |
| `CALENDAR_SYNC_ENABLED` | Calendar Sync | Google/Outlook sync |
| `INVOICING_ENABLED` | Invoicing | Invoice generation and sending |
| `WHATSAPP_CONTACT_ENABLED` | WhatsApp Contact | WhatsApp preference on inquiry |
| `3D_MANNEQUIN_ENABLED` | 3D Mannequin | Interactive body placement tool |
| `REVIEWS_ENABLED` | Reviews | Customer review system (future) |

**Checklist:**
- [ ] All 10 flags seeded in DB
- [ ] `requireFeature` middleware returns `503 Feature Disabled` when flag is OFF
- [ ] `GET /api/features` returns all flags (ADMIN only)
- [ ] `PATCH /api/features/:key` toggles a flag (ADMIN only)
- [ ] Tests written and passing

---

## Step 1.16 — Database Seed Data

**What:** Populate the database with realistic initial data for development and testing.

**Why:** Without seed data, the frontend and CRM have nothing to display. Good seed data also makes demo presentations and investor showcases possible without manual data entry.

**Files to create (this step only):**
- `backend/prisma/seed.ts`

**Data to seed:**
- 1 Admin user (`admin@tattoo-studio.com` / `Admin1234!`)
- 3 Artist users with full profiles, bios, and portfolio image placeholder URLs
- All 12 tattoo styles with descriptions and placeholder image URLs
- All 10 feature flags (all enabled)
- 3 sample Email Templates (booking confirmed, quote sent, review-request)
- 5 sample Leads in various pipeline stages
- 2 sample Bookings
- 2 sample Quotes
- 1 sample Invoice

**Checklist:**
- [ ] `npx prisma db seed` runs without errors
- [ ] All data visible in database after seed
- [ ] Seed is idempotent (can be re-run without creating duplicates)

---

## Step 1.17 — WhatsApp Automation Module

**What:** Two automated WhatsApp messages per booking lifecycle sent via Twilio WhatsApp API. Gated behind the `WHATSAPP_CONTACT_ENABLED` feature flag.

**Why:** Immediate WhatsApp contact after a lead inquiry builds rapport instantly and differentiates the studio. The post-completion review request drives Google reviews automatically — directly increasing the studio's online reputation without manual effort.

**Files to create (this step only):**
- `backend/src/modules/whatsapp/whatsapp.service.ts` — Twilio client setup, send message function
- `backend/src/modules/whatsapp/whatsapp.queue.ts` — BullMQ queue for delayed messages (2h post-completion)

**Messages:**
- **Message 1 — on lead submit** (immediate, if `preferWhatsApp = true`): *"Hi [Name]! 👋 Thanks for reaching out to [STUDIO_NAME]. We've received your inquiry and [Artist Name] will get back to you shortly. — [STUDIO_NAME]"*
- **Message 2 — 2h after booking COMPLETE**: *"Hi [Name]! 🙏 Thank you for visiting [STUDIO_NAME] today! We'd love a Google review: [GOOGLE_REVIEW_URL] — [STUDIO_NAME]"*

**Checklist:**
- [ ] Message 1 queued immediately when lead submitted with `preferWhatsApp = true`
- [ ] Message 2 queued with 2-hour delay when booking marked COMPLETE
- [ ] `WHATSAPP_CONTACT_ENABLED` flag gates both messages
- [ ] Twilio errors handled gracefully (do not fail the parent API request)
- [ ] Tests written and passing

---

## Step 1.18 — BullMQ Job Queue Infrastructure

**What:** Centralised BullMQ setup — Redis connection, queue registry, worker process, retry/backoff config, and graceful shutdown. This is the infrastructure all queued jobs (email, WhatsApp, review requests) depend on.

**Why:** Email, WhatsApp, and review request jobs all use BullMQ. The queue infrastructure must be set up once, correctly, before any module uses it. Proper worker lifecycle management (graceful shutdown on SIGTERM) is essential for production reliability.

**Files to create (this step only):**
- `backend/src/queue/redis.ts` — ioredis connection singleton (TLS for Upstash in prod)
- `backend/src/queue/queues.ts` — registry of all named queues (`email`, `whatsapp`, `reviews`)
- `backend/src/queue/worker.ts` — unified worker process that processes all queues
- `backend/src/queue/index.ts` — re-exports; started in `server.ts`

**Config:**
- Retry: 3 attempts, exponential backoff (2s, 4s, 8s)
- Failed jobs retained for 100 entries (for debugging)
- Graceful shutdown: `worker.close()` on SIGTERM/SIGINT before process.exit

**Checklist:**
- [ ] Redis connection works with both `redis://` (local) and `rediss://` (Upstash TLS)
- [ ] All three queues registered and worker processes them
- [ ] Retry + backoff config active on all queues
- [ ] Graceful shutdown tested (jobs in-flight complete before shutdown)
- [ ] Tests: queue enqueue + worker process verified

---

## Step 1.19 — Review Request Automation

**What:** BullMQ job that fires 24–48 hours after a booking is marked COMPLETE. Sends a review request email (and/or WhatsApp message) to the customer asking for a Google review.

**Why:** Review requests sent at the right moment (after a successful appointment, before the customer forgets) dramatically increase review conversion. Automating this is a concrete, measurable value the system delivers over manual follow-up.

**Files to create (this step only):**
- `backend/src/modules/reviews/reviews.queue.ts` — schedule delayed review request job
- `backend/src/modules/reviews/reviews.processor.ts` — job processor: sends email + optional WhatsApp

**Logic:**
- On `PATCH /api/bookings/:id/complete`, enqueue a delayed job: delay = 36 hours
- Job sends `review-request.hbs` email
- If customer `preferWhatsApp = true` AND flag enabled, also sends WhatsApp Message 2

**Checklist:**
- [ ] Job enqueued with correct delay when booking completed
- [ ] Review email sent correctly 36h later
- [ ] WhatsApp message sent if applicable
- [ ] Job does not re-run if booking status changes after completion
- [ ] Tests written and passing

---

## Step 1.20 — Availability & Time Slot Engine

**What:** The algorithm that calculates which time slots are available for a given artist on a given date range, accounting for working hours, confirmed bookings, manually blocked times, and configurable buffer between appointments.

**Why:** This is the logic powering the `GET /api/bookings/availability` endpoint and the customer-facing calendar. It is complex enough to deserve its own focused step. Getting it right here prevents double-booking and is a core reliability promise.

**Files to create (this step only):**
- `backend/src/modules/availability/availability.service.ts` — core slot calculation engine
- `backend/src/modules/availability/availability.controller.ts`
- `backend/src/modules/availability/availability.routes.ts`

**Algorithm:**
1. Load artist's `ArtistAvailability` for the requested day of week
2. Load all `CONFIRMED` bookings for that artist in the date range
3. Load all `AvailabilityBlock` records for that artist in the date range
4. Subtract confirmed bookings (+ configurable buffer, default 30 min) from working hours
5. Subtract blocked ranges
6. Return remaining slots of `slotDuration` (configurable per artist, default 90 min)

**Endpoint:**
- `GET /api/availability?artistId=X&from=YYYY-MM-DD&to=YYYY-MM-DD` — public; returns array of `{ date, slots: [{ start, end, available }] }`

**Checklist:**
- [ ] Single-day and multi-day range queries both work
- [ ] Buffer between appointments respected
- [ ] Manually blocked ranges excluded correctly
- [ ] No slot returned that overlaps an existing confirmed booking
- [ ] Unit tests with edge cases: no working hours, fully booked day, partial day with buffer

---

## Step 1.21 — Docker Compose (Local Dev Environment)

**What:** A `docker-compose.yml` file that starts PostgreSQL 16 and Redis 7 locally with a single command. This is the local development database and queue infrastructure every developer uses.

**Why:** Every developer must be able to run the full backend stack locally without cloud accounts. Docker Compose provides a reproducible, zero-configuration local environment.

**Files to create (this step only):**
- `docker-compose.yml` (at repo root, one level above `backend/`)

**Services:**
```yaml
postgres:
  image: postgres:16-alpine
  ports: 5432:5432
  volumes: postgres_data:/var/lib/postgresql/data
  environment: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
  healthcheck: pg_isready

redis:
  image: redis:7-alpine
  ports: 6379:6379
  volumes: redis_data:/data
  command: redis-server --save 60 1 --loglevel warning
  healthcheck: redis-cli ping
```

**Checklist:**
- [ ] `docker compose up -d` starts both services successfully
- [ ] PostgreSQL accessible on `localhost:5432`
- [ ] Redis accessible on `localhost:6379`
- [ ] Health checks pass for both services
- [ ] Volumes persist data between restarts
- [ ] `docker compose down -v` cleans up completely

---

## Step 1.22 — Integration Tests (Full API Coverage)

**What:** Supertest integration tests for every API route. Tests run against a real test database (separate from dev) and cover the happy path and key error cases for every endpoint.

**Why:** The integration test suite is the safety net for all future development. Without it, any change to the backend could silently break a route. Running `npm test` must give complete confidence that the entire API is working.

**Files to create (this step only):**
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
- `backend/jest.setup.ts` — global test DB setup/teardown, Prisma test client

**Test environment:**
- Separate `TEST_DATABASE_URL` env var pointing to a `_test` database
- `jest.setup.ts` runs `prisma migrate reset --force` before the suite
- Each test file seeds its own minimal data
- All tests are isolated — no shared mutable state between tests

**Checklist:**
- [ ] `npm test` runs all suites without errors
- [ ] Each module has ≥1 happy path + ≥1 error path test
- [ ] Auth flow fully tested (register → login → protected route → refresh → logout)
- [ ] Role enforcement tested (ADMIN-only routes reject non-admins)
- [ ] Tests run in CI (GitHub Actions or Railway deploy checks)

---

## ✅ Phase 1 Complete When:

- [ ] All 22 steps above completed and verified
- [ ] `npm run test` — all tests pass
- [ ] `npm run build` — TypeScript compiles with zero errors
- [ ] `GET /health` returns `200 OK`
- [ ] All endpoints tested manually via Postman / curl
- [ ] No hardcoded secrets anywhere in code
- [ ] `docker compose up -d && npm run dev` starts the full stack locally

---
---

# PHASE 2 — CRM Admin Dashboard (Backend Integration & Full Management Layer)

> **Goal:** Build the studio management dashboard (CRM) that gives admins and artists full control over every aspect of the business — leads, quotes, bookings, invoices, artists, styles, email templates, feature flags, and user roles.  
> **Why second:** The CRM depends only on Phase 1 (backend) being stable and complete. Building the CRM before the customer-facing frontend ensures every admin workflow, every role, and every data management action is tested with real API calls. When the frontend (Phase 3) is built, it connects to a backend that already has a full admin layer proving it works. The CRM is also the primary tool for the studio owner from day one — they need it before customers do.

---

## Step 4.1 — 3D Scene Setup

**What:** Initialise a Three.js scene (or React Three Fiber scene) with camera, lights, renderer, and orbit controls for 360° rotation.

**Why:** Everything else in this module builds on top of the scene. Getting the camera angles, lighting model, and rotation feel right at this stage saves rework later.

**Files to create (this step only):**
- `mannequin/src/MannequinScene.tsx` — Three.js/R3F canvas with orbit controls
- `mannequin/src/hooks/useMannequinControls.ts` — camera + rotation logic
- `mannequin/package.json` and `tsconfig.json`

**Checklist:**
- [ ] Scene renders in browser
- [ ] Mannequin can be rotated 360° with mouse/touch
- [ ] Smooth 60fps performance on modern hardware

---

## Step 4.2 — 3D Model Integration

**What:** Load and render the mannequin 3D model (GLB/GLTF format) into the scene.

**Why:** The model is the visual centrepiece. It must be gender-neutral (or switchable), proportionally accurate, and render cleanly at all angles.

**Files to create (this step only):**
- `mannequin/public/models/mannequin.glb` — base 3D model (sourced or created)
- `mannequin/src/components/MannequinModel.tsx` — loads and renders the GLB

**Checklist:**
- [ ] Model loads and displays correctly
- [ ] No clipping, z-fighting, or texture issues
- [ ] Mobile-friendly (responsive canvas sizing)

---

## Step 4.3 — Hitbox Implementation

**What:** Add invisible clickable mesh overlays on top of the mannequin for each body part in the specification table.

**Why:** The hitboxes are what make the mannequin interactive. They must be perfectly aligned with the visual model so clicking the shoulder clicks the shoulder hitbox, not the chest.

**Body part hitboxes to implement (from issue spec):**

| General Area | Hitbox ID | Notes |
|---|---|---|
| Back | `torso-back` | Full back surface |
| Stomach | `torso-stomach` | Front torso |
| Left Chest | `torso-chest-left` | |
| Right Chest | `torso-chest-right` | |
| Left Shoulder | `arm-shoulder-left` | |
| Right Shoulder | `arm-shoulder-right` | |
| Left Upper Arm | `arm-upper-left` | |
| Right Upper Arm | `arm-upper-right` | |
| Left Under Arm | `arm-under-left` | |
| Right Under Arm | `arm-under-right` | |
| Left Upper Leg | `leg-upper-left` | |
| Right Upper Leg | `leg-upper-right` | |
| Left Front Leg | `leg-front-left` | |
| Right Front Leg | `leg-front-right` | |
| Left Back Leg | `leg-back-left` | |
| Right Back Leg | `leg-back-right` | |
| Left Knee | `leg-knee-left` | |
| Right Knee | `leg-knee-right` | |
| Chin | `head-chin` | |
| Left Foot | `extremity-foot-left` | |
| Right Foot | `extremity-foot-right` | |

**Files to create (this step only):**
- `mannequin/src/components/Hitboxes.tsx` — all hitbox meshes with raycasting
- `mannequin/src/data/hitboxDefinitions.ts` — position/size data for every hitbox

**Checklist:**
- [ ] All hitboxes correctly positioned on the model
- [ ] Clicking a hitbox highlights it visually (colour change)
- [ ] Hovering shows tooltip with body part name
- [ ] Hitbox data emitted as selection event to parent component

---

## Step 4.4 — Granular Placement Refinement UI

**What:** After a hitbox is clicked, show a contextual refinement panel with sub-region options specific to that body part.

**Why:** This is what makes the system precise. "I want a tattoo on my leg" is not enough for a quote. "Lower back of the right leg, outer side" is what an artist needs.

**Refinement options (from issue spec):**

| Hitbox clicked | Sub-region options shown |
|---|---|
| Any Back hitbox | Lower Back / Upper Back / Whole Back |
| Any Leg hitbox | Upper Leg / Lower Leg / Front / Back / Knee / Whole Leg |
| Any Arm hitbox | Inner / Outer / Whole Arm |
| Any Chest hitbox | Upper Chest / Lower Chest / Whole Chest |

**Files to create (this step only):**
- `mannequin/src/components/PlacementRefinement.tsx` — refinement options panel
- `mannequin/src/data/refinementOptions.ts` — mapping of hitbox → sub-regions

**Checklist:**
- [ ] Panel appears after hitbox click
- [ ] Correct sub-options shown per body part
- [ ] Selection stored correctly: `{ generalArea, specificArea, refinement }`
- [ ] "Whole X" selection flagged correctly (triggers size skip in frontend)

---

## Step 4.5 — Mannequin as Embeddable Component

**What:** Package the mannequin as a self-contained React component with a clean props interface so Phase 3 (frontend) can drop it straight into the booking flow at Step 3.5.

**Why:** The mannequin must integrate cleanly into the frontend without any leaky implementation details. A well-defined props API makes this a zero-friction drop-in once Phase 4 is complete.

**Props interface:**
```typescript
interface MannequinProps {
  onPlacementSelected: (placement: PlacementSelection) => void;
  initialSelection?: PlacementSelection;
  height?: number;
}
```

**Checklist:**
- [ ] Component exported cleanly with TypeScript types
- [ ] `onPlacementSelected` callback fires correctly
- [ ] Component resets cleanly when unmounted and remounted
- [ ] Works on mobile (touch rotation + tap hitboxes)

---

## ✅ Phase 2 Complete When:

- [ ] All 12 steps completed and verified
- [ ] Full admin workflow: lead → quote → booking → invoice works end-to-end in CRM
- [ ] Analytics dashboard shows real data
- [ ] God Mode toggles work live without restart
- [ ] All email templates editable from CRM
- [ ] Feature flags toggle all features in real time
- [ ] Role management works (ADMIN, ARTIST, CUSTOMER)
- [ ] Tested on desktop (CRM is primarily a desktop tool)

---
---

# PHASE 3 — Customer-Facing Frontend

> **Goal:** Build the customer-facing booking inquiry website — a beautiful, fast, step-by-step form that guides customers from artist selection through to submitting their inquiry and scheduling.  
> **Why third:** The frontend is the customer's first impression. It depends on the backend (Phase 1) for its API and on the CRM (Phase 2) being fully operational — by this point every backend route has been exercised by a real admin UI, so any bugs are already fixed. The 3D mannequin body-placement step (Step 3.5) uses the component built in Phase 4; that step can be skipped during initial development and slotted in once Phase 4 is complete.

---

## Step 3.1 — React App Scaffolding

**What:** Create the React + Vite + TypeScript + Tailwind app. Set up routing, global state, API client, and design system tokens (colours, fonts, spacing).

**Why:** A solid scaffold with consistent design tokens ensures every page looks cohesive without re-inventing styles per component.

**Files to create (this step only):**
- `frontend/package.json`, `vite.config.ts`, `tsconfig.json`
- `frontend/tailwind.config.ts` — brand colours, custom fonts
- `frontend/src/main.tsx`, `src/App.tsx`
- `frontend/src/store/bookingStore.ts` — Zustand store for multi-step form state
- `frontend/src/api/client.ts` — Axios instance with base URL, interceptors
- `frontend/src/api/index.ts` — typed API functions

**Checklist:**
- [ ] App runs with `npm run dev`
- [ ] Tailwind styles apply correctly
- [ ] Route structure defined for all steps
- [ ] Zustand store holds form state across steps

---

## Step 3.2 — Step 1: Artist Selection Page

**What:** The landing step where customers browse artist profiles, see their work, and choose who they want.

**Why:** First impressions count. Rich artist cards with portfolio thumbnails set the tone for the whole experience.

**Files to create (this step only):**
- `frontend/src/pages/booking/ArtistSelection.tsx`
- `frontend/src/components/ArtistCard.tsx`
- `frontend/src/components/ArtistModal.tsx` — expanded profile view

**UI requirements:**
- Grid of artist cards (photo, name, specialty, mini portfolio preview)
- Click to expand full profile with bio and portfolio gallery
- "Choose this artist" button updates store and advances to next step

**Checklist:**
- [ ] Artists fetched from `GET /api/artists`
- [ ] Cards render correctly with images and details
- [ ] Selection stored in Zustand
- [ ] Responsive on mobile

---

## Step 3.3 — Step 2: Style Selection Page

**What:** Customer selects their preferred tattoo style from a visual gallery.

**Why:** Visual reference examples make it much easier for customers to identify what they want, leading to better quality inquiries.

**Files to create (this step only):**
- `frontend/src/pages/booking/StyleSelection.tsx`
- `frontend/src/components/StyleCard.tsx`

**UI requirements:**
- Visual grid of style cards (style name + example image)
- Selected style highlighted with border/check mark
- Optional: multi-select if customer wants multiple styles

**Checklist:**
- [ ] Styles fetched from `GET /api/styles`
- [ ] Selection stored in Zustand
- [ ] Responsive on mobile

---

## Step 3.4 — Step 3: Color Preference

**What:** Simple choice — Color tattoo or Black & White.

**Why:** This information is essential for the artist to prepare. It is a quick step that significantly improves inquiry quality.

**Files to create (this step only):**
- `frontend/src/pages/booking/ColorPreference.tsx`

**UI requirements:**
- Two large toggle cards: "Full Colour" (with colour swatch examples) and "Black & White" (with BW examples)
- Optional: "I'm not sure yet" option

**Checklist:**
- [ ] Selection stored in Zustand
- [ ] Large, clear UI — easy on mobile

---

## Step 3.5 — Step 4: Body Placement (3D Mannequin)

**What:** Integrate the Phase 4 mannequin component into the booking flow.

**Why:** This is the step that makes the product unique. No competitor has this.

**Files to create (this step only):**
- `frontend/src/pages/booking/BodyPlacement.tsx` — wraps Mannequin component, handles selection event

**Note:** This step requires Phase 4 to be complete. During Phase 3 development, use a simple dropdown placeholder for placement so the rest of the booking flow can be built and tested. Swap the placeholder for the real 3D component once Phase 4 is done.

**Logic:**
- Import Mannequin component from Phase 4 (`mannequin/` package)
- Listen for `onPlacementSelected` event
- Store placement JSON in Zustand
- If placement is "whole area" → set `skipSizeStep = true` in store

**Checklist:**
- [ ] Mannequin renders inside booking flow
- [ ] Placement selection stored in Zustand
- [ ] Whole-area detection sets `skipSizeStep` flag correctly

---

## Step 3.6 — Step 5: Size Selection Page

**What:** Customer picks the size of their tattoo from predefined options. This step is **skipped** if the customer selected a "whole area" in the previous step.

**Why:** Size affects price. Predefined sizes make quoting consistent. Auto-skipping for whole-area selections improves the user flow as specified in the issue.

**Files to create (this step only):**
- `frontend/src/pages/booking/SizeSelection.tsx`

**Size options:** 5×5 cm / 10×10 cm / 15×15 cm / 20×20 cm / 25×25 cm / Custom

**Logic:**
- On mount, check Zustand for `skipSizeStep` flag
- If `true`, auto-advance to next step
- Otherwise show size selection UI

**Checklist:**
- [ ] Auto-skip works when whole-area was selected
- [ ] Selection stored in Zustand
- [ ] Responsive on mobile

---

## Step 3.7 — Step 6: Reference Images & Description

**What:** Customer uploads reference photos and writes a detailed description of what they want.

**Why:** Good reference material = accurate quotes = fewer back-and-forth messages = better customer experience.

**Files to create (this step only):**
- `frontend/src/pages/booking/References.tsx`
- `frontend/src/components/ImageUpload.tsx` — drag-and-drop + preview

**UI requirements:**
- Drag-and-drop image upload area (max 10 images, max 10 MB each)
- Preview thumbnails with remove button
- Large expandable textarea for description

**Checklist:**
- [ ] Images uploaded to `POST /api/uploads`
- [ ] Upload URLs stored in Zustand
- [ ] Image previews display correctly
- [ ] Description text stored in Zustand

---

## Step 3.8 — Step 7: Contact Information

**What:** Customer enters name, email, phone number, and selects preferred contact method (WhatsApp toggle).

**Why:** We need contact details to reach the customer. The WhatsApp toggle is a requirement from the spec — it directly affects how the studio follows up.

**Files to create (this step only):**
- `frontend/src/pages/booking/ContactInfo.tsx`

**UI requirements:**
- Name, email, phone fields with real-time Zod validation
- Prominent WhatsApp toggle (checkbox or toggle switch)
- Clear error states

**Checklist:**
- [ ] All fields validated before allowing next step
- [ ] WhatsApp preference stored in Zustand
- [ ] Form is accessible (keyboard navigation, labels)

---

## Step 3.9 — Step 8: Calendar & Appointment Scheduling

**What:** Dynamic calendar showing real available slots for the selected artist. Customer picks their preferred appointment date/time.

**Why:** This is the conversion step. Making it smooth and reliable directly impacts booking rates.

**Files to create (this step only):**
- `frontend/src/pages/booking/AppointmentScheduling.tsx`
- `frontend/src/components/AvailabilityCalendar.tsx`

**Logic:**
- Fetch available slots from `GET /api/bookings/availability?artistId=X&from=Y&to=Z`
- Greyed-out dates/times are unavailable
- Customer selects a slot → stored in Zustand

**Checklist:**
- [ ] Calendar shows real availability from API
- [ ] Unavailable slots clearly greyed out
- [ ] Selected slot stored in Zustand
- [ ] Mobile touch-friendly calendar

---

## Step 3.10 — Step 9: Review & Submit

**What:** Summary page showing all selected options. Customer reviews everything and submits the inquiry.

**Why:** A review step reduces mistakes. Customers can go back and change anything before submitting.

**Files to create (this step only):**
- `frontend/src/pages/booking/ReviewAndSubmit.tsx`

**UI requirements:**
- Show all selections: artist, style, colour, placement, size, images, description, contact, appointment
- "Edit" links back to each step
- "Submit" button calls `POST /api/leads` with all Zustand data
- Success state shows confirmation message and summary

**Checklist:**
- [ ] All data submitted to `POST /api/leads`
- [ ] Success screen shown with reference number
- [ ] Confirmation email sent (automated by backend)
- [ ] Error states handled (network error, validation error)

---

## Step 3.11 — Shared UI Components

**What:** All reusable components used across the booking flow.

**Files to create (this step only):**
- `frontend/src/components/StepIndicator.tsx` — progress bar showing which step customer is on
- `frontend/src/components/Button.tsx` — primary, secondary, danger variants
- `frontend/src/components/Input.tsx` — text input with label, error state
- `frontend/src/components/LoadingSpinner.tsx`
- `frontend/src/components/ErrorBoundary.tsx`

**Checklist:**
- [ ] StepIndicator updates correctly as customer progresses
- [ ] All components consistent with brand design
- [ ] Responsive on all screen sizes

---

## ✅ Phase 3 Complete When:

- [ ] All 11 steps completed and verified
- [ ] Full booking flow works end-to-end: artist → style → colour → placement → size → images → contact → calendar → submit
- [ ] Lead appears in database after submission
- [ ] Confirmation email received
- [ ] Tested on desktop and mobile
- [ ] Step 3.5 (3D Mannequin placement) integrated once Phase 4 component is complete

---
---

# PHASE 4 — 3D Mannequin Module

> **Goal:** Build the interactive 3D mannequin using Three.js / React Three Fiber that customers use to select body placement for their tattoo. This is the single biggest UI differentiator vs every competitor — no booking platform in the world has this.  
> **Why fourth:** The mannequin is a self-contained visual component. It is built after the backend (Phase 1), CRM (Phase 2), and frontend foundation (Phase 3) are all solid. Building it last means the integration point is already proven (Step 3.5 slot exists and waits), and the team can focus entirely on getting the 3D experience perfect without pressure from other moving parts.

---

## Step 2.1 — CRM App Scaffolding

**What:** Create the CRM React + Vite + TypeScript + Tailwind app with authenticated routing.

**Files to create (this step only):**
- `crm/package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- `crm/src/main.tsx`, `src/App.tsx`
- `crm/src/api/client.ts` — Axios with auth interceptor (attaches JWT, handles 401 refresh)
- `crm/src/store/authStore.ts` — Zustand store for auth state
- `crm/src/layouts/DashboardLayout.tsx` — sidebar + header shell

**Checklist:**
- [ ] App runs with `npm run dev`
- [ ] Login redirects to dashboard
- [ ] Unauthenticated routes redirect to login
- [ ] Dashboard layout renders with sidebar navigation

---

## Step 2.2 — Login Page

**What:** Clean, secure login screen for admins and artists.

**Files to create (this step only):**
- `crm/src/pages/Login.tsx`

**Checklist:**
- [ ] Login calls `POST /api/auth/login`
- [ ] JWT stored in memory + refresh token in httpOnly cookie
- [ ] Invalid credentials show clear error
- [ ] Redirect to dashboard on success

---

## Step 2.3 — Main Dashboard (Analytics Overview)

**What:** The home screen of the CRM showing key business metrics at a glance.

**Files to create (this step only):**
- `crm/src/pages/Dashboard.tsx`
- `crm/src/components/StatCard.tsx` — KPI metric card
- `crm/src/components/charts/LeadsChart.tsx` — leads over time
- `crm/src/components/charts/RevenueChart.tsx` — revenue over time
- `crm/src/components/charts/BookingsByArtistChart.tsx`
- `crm/src/components/charts/ConversionFunnelChart.tsx`

**Metrics displayed:**
- Total leads (this month vs last month)
- Total bookings (this month vs last month)
- Total revenue (this month vs last month)
- Conversion rate (leads → bookings)
- Leads by status (pipeline view)
- Revenue by month (bar chart)
- Bookings by artist (donut chart)

**Checklist:**
- [ ] All metrics fetched from `GET /api/analytics/overview`
- [ ] Charts render with Recharts
- [ ] Date range filter works
- [ ] Data refreshes on page revisit

---

## Step 2.4 — Lead Management

**What:** Full lead pipeline view. List, filter, search, and update lead status. View full lead detail including 3D placement selection, reference images, and notes.

**Files to create (this step only):**
- `crm/src/pages/Leads.tsx` — list/kanban pipeline view
- `crm/src/pages/LeadDetail.tsx` — full detail with all inquiry data

**Checklist:**
- [ ] Kanban board showing leads by status
- [ ] Filter by artist, status, date
- [ ] Click lead → full detail view
- [ ] Status can be updated inline
- [ ] Placement shown visually (mini mannequin or body area label)
- [ ] Reference images displayed

---

## Step 2.5 — Quote Management

**What:** Manage all quotes. Create new quotes from a lead. View quote status. Resend quotes.

**Files to create (this step only):**
- `crm/src/pages/Quotes.tsx` — list with filters
- `crm/src/pages/QuoteDetail.tsx` — view + edit draft
- `crm/src/components/QuoteForm.tsx` — create/edit form

**Checklist:**
- [ ] Create quote from Lead detail page
- [ ] Quote status (Draft / Sent / Accepted / Rejected / Expired) visible
- [ ] Send quote emails customer via API
- [ ] Accepted quotes show linked booking

---

## Step 2.6 — Booking Management

**What:** Full appointment management. Calendar view + list view. Confirm, cancel, reschedule bookings.

**Files to create (this step only):**
- `crm/src/pages/Bookings.tsx` — list view
- `crm/src/pages/BookingCalendar.tsx` — monthly/weekly calendar view
- `crm/src/pages/BookingDetail.tsx` — detail + actions

**Checklist:**
- [ ] Calendar view shows all bookings
- [ ] Confirm/Cancel/Complete actions work
- [ ] Linked to lead and quote for full history
- [ ] Calendar syncs with Google Calendar (shows external events)

---

## Step 2.7 — Invoice Management

**What:** View and manage all invoices. Mark as paid. Resend invoice email.

**Files to create (this step only):**
- `crm/src/pages/Invoices.tsx` — list with status filter
- `crm/src/pages/InvoiceDetail.tsx` — printable detail view

**Checklist:**
- [ ] Invoices list with status badges
- [ ] Mark paid / void actions work
- [ ] Invoice detail is print-friendly
- [ ] Overdue invoices highlighted in red

---

## Step 2.8 — Artist Management

**What:** Add, edit, and manage artist profiles, portfolios, and style assignments.

**Files to create (this step only):**
- `crm/src/pages/Artists.tsx` — list
- `crm/src/pages/ArtistDetail.tsx` — edit profile, portfolio, styles

**Checklist:**
- [ ] Add new artist with all profile fields
- [ ] Upload portfolio images (Cloudinary)
- [ ] Assign/remove styles
- [ ] Deactivate artist (hides from public frontend)

---

## Step 2.9 — Style Management

**What:** Manage the list of tattoo styles available on the frontend.

**Files to create (this step only):**
- `crm/src/pages/Styles.tsx` — list + add/edit/delete

**Checklist:**
- [ ] Add new style with name, description, example image
- [ ] Edit existing styles
- [ ] Disable/enable styles (controls visibility on frontend)

---

## Step 2.10 — Email Template Management

**What:** View, edit, and preview all automated email templates from the CRM.

**Files to create (this step only):**
- `crm/src/pages/EmailTemplates.tsx` — list
- `crm/src/pages/EmailTemplateEditor.tsx` — rich text / HTML editor with variable hints

**Checklist:**
- [ ] All templates listed
- [ ] Editable subject and HTML body
- [ ] Live preview with sample data
- [ ] "Send test email" button

---

## Step 2.11 — God Mode Feature Flag Panel

**What:** The ultimate admin control panel. Toggle any feature in the system ON or OFF with a switch.

**Files to create (this step only):**
- `crm/src/pages/FeatureFlags.tsx`

**UI requirements:**
- List of all feature flags
- Clear label and description for each
- Toggle switch with confirmation dialog
- Shows current state (ON = green, OFF = red)

**Checklist:**
- [ ] All 10 flags displayed
- [ ] Toggle calls `PATCH /api/features/:key`
- [ ] Confirmation dialog before disabling critical features
- [ ] Changes take effect immediately on frontend (no restart needed)

---

## Step 2.12 — User & Role Management

**What:** Manage all user accounts in the system (admins, artists, customers).

**Files to create (this step only):**
- `crm/src/pages/Users.tsx` — list with role filter
- `crm/src/pages/UserDetail.tsx` — edit role, deactivate account

**Checklist:**
- [ ] List all users with roles
- [ ] Change user role (ADMIN only)
- [ ] Deactivate/reactivate accounts
- [ ] Reset password (sends email)

---

## ✅ Phase 4 Complete When:

- [ ] All 5 steps completed and verified
- [ ] 3D mannequin renders and rotates 360° smoothly
- [ ] All body-part hitboxes clickable and correctly labelled
- [ ] Granular refinement panel works on all body areas
- [ ] Component exported and integrated into Step 3.5 of the frontend booking flow
- [ ] Mobile-tested (touch rotation + tap hitboxes)
- [ ] No console errors, no z-fighting, no clipping

---
---

# Overall Project Completion Checklist

- [ ] Phase 1 — Backend ✅
- [ ] Phase 2 — CRM Admin Dashboard ✅
- [ ] Phase 3 — Customer-Facing Frontend ✅
- [ ] Phase 4 — 3D Mannequin (integrated into Step 3.5) ✅
- [ ] End-to-end test: customer submits inquiry → artist quotes → customer accepts → booking confirmed → invoice generated
- [ ] Security audit: no hardcoded secrets, all routes protected, rate limiting active
- [ ] Performance: API < 200ms on all endpoints, frontend Lighthouse score > 90
- [ ] Documentation: README for each package with setup instructions
- [ ] Deployment: Docker Compose for local dev, Railway + Vercel for production

---

---

# ARCHITECTURE DECISIONS — Round 1 + Round 2 Q&A (All Confirmed)

> Everything in this section is a logical, factual decision with reasoning.
> No affirmation — just the best technical choice for quality, cost, reliability, and sellability.
> **Round 2 follow-up questions answered in full below each decision.**
> **Status: ✅ All decisions locked. Zero open items. Ready to build.**

---

## DECISION 1 — Feature Flags: Toggle ON/OFF vs Remove From Code ✅ LOCKED

**Confirmed:** Build all features as independent modules, controlled by `FeatureFlag` records in the database.  
One flag per feature. Admin can toggle any flag in the God Mode panel of the CRM.  
The code is always there — it just does nothing when the flag is OFF.

**How it works — no bugs:**
- The backend route for a disabled module returns `503 Feature Not Available` immediately. No logic runs.
- The CRM sidebar does not render the menu item. The user never sees it.
- The customer frontend checks the public `/api/features` endpoint on load and hides entire sections.
- No module references another module directly — they communicate only via the database. So disabling one never breaks another.

**Feature flag table — default state per business type:**

| Feature / Module | Tattoo Studio | Hair Salon | Barber | Restaurant |
|---|---|---|---|---|
| Booking & Calendar | ✅ ON | ✅ ON | ✅ ON | ✅ ON |
| Lead Capture | ✅ ON | ✅ ON | ✅ ON | ✅ ON |
| Automated Emails | ✅ ON | ✅ ON | ✅ ON | ✅ ON |
| WhatsApp Automation | ✅ ON | ✅ ON | ✅ ON | ✅ ON |
| Quote System | ✅ ON | ⚠️ OPTIONAL | ⚠️ OPTIONAL | ❌ OFF |
| Invoicing | ✅ ON | ✅ ON | ✅ ON | ⚠️ OPTIONAL |
| Deposit / Payment | ✅ ON (future) | ✅ ON (future) | ✅ ON (future) | ✅ ON (future) |
| 3D Mannequin | ✅ ON | ❌ OFF | ❌ OFF | ❌ OFF |
| Table Selector | ❌ OFF | ❌ OFF | ❌ OFF | ✅ ON |
| Artist Profiles | ✅ ON | ✅ ON (stylists) | ✅ ON (barbers) | ❌ OFF |
| Portfolio/Gallery | ✅ ON | ⚠️ OPTIONAL | ⚠️ OPTIONAL | ⚠️ OPTIONAL |
| Review Requests | ✅ ON | ✅ ON | ✅ ON | ✅ ON |
| Analytics (God Mode) | ✅ ON | ✅ ON | ✅ ON | ✅ ON |
| Email Campaigns | ✅ ON | ✅ ON | ✅ ON | ✅ ON |

---

## DECISION 2 — Database: Neon (Serverless PostgreSQL) ✅ LOCKED

**Confirmed: Neon for production. Docker Compose `postgres:16` for local dev.**

### Follow-up: Can we switch database later? Is Neon good for big scale?

**Yes — switching databases is easy.** Here is why: we use Prisma as our ORM. Prisma sits between our code and the database. Our code never writes raw SQL — it writes Prisma queries. If we ever need to move off Neon (to AWS RDS, a self-hosted VPS, or anything else), we change one line in the Prisma config and one environment variable. The application code is 100% unchanged. Migration is a half-day job, not a rewrite.

**Is Neon good for big scale and multiple clients?**

Yes, with caveats that are easy to plan around:

| Client count | Database strategy | Cost |
|---|---|---|
| 1–5 clients | One Neon project per client, each on free tier (~$0/month) | Free |
| 5–20 clients | Some clients upgrade to Neon Launch plan | $19/mo per active client |
| 20–50 clients | Most clients on Neon Launch, some on Scale | $19–$69/mo per client — you pass this cost to them |
| 50+ clients | Still fine on Neon, or migrate large clients to dedicated VPS | Evaluate case by case |

**Why one Neon project per client (not shared):**
- Data isolation — each client's data is completely separate. A bug or breach for one client cannot touch another's data.
- Billing is separate per client — you know exactly what each client costs.
- Backups and migrations are independent.
- This is the correct architecture for a white-label SaaS product. Every serious SaaS company does this.

**Neon's scale ceiling:** Neon's Scale plan ($69/mo) supports up to 10GB storage and autoscales compute. A tattoo studio or small salon will never hit this limit. If a client somehow grows to a major chain with thousands of bookings per day, at that point they are generating enough revenue to justify a dedicated AWS RDS or Hetzner VPS — and as noted above, moving is easy because of Prisma.

**Bottom line:** Neon is correct for every client from day one. Easy to scale within Neon (just pay more). Easy to switch to anything else when the time comes.

---

## DECISION 3 — Redis / Job Queue: Upstash ✅ LOCKED

**Confirmed: Upstash for production. Docker Compose `redis:7-alpine` for local dev.**

### Follow-up: What is Upstash and Redis? Could we build our own? Is it stable for 300 clients / 50k emails? How does billing work?

**What is Redis?**

Redis is an in-memory database that is extremely fast. We do not use it to store business data (that goes in PostgreSQL). We use Redis for one specific job: the **job queue**. When our system needs to send an email, it does not send it immediately — it writes a "job" (a small instruction: "send this email to this person at this time") into the Redis queue. A separate background worker reads jobs from the queue and executes them. This means:
- If the email provider is temporarily down, the job stays in the queue and retries automatically
- Emails that should be sent in 24 hours (review requests) sit in the queue and are executed at exactly the right time
- The main API stays fast — adding a job to the queue is instant, doing the actual email work is background

**What is BullMQ?**

BullMQ is our job queue library — the code that manages putting jobs into Redis and taking them out. It handles retries, delays, priorities, and failure handling. It is the most used Node.js job queue library in production.

**What is Upstash?**

Upstash is a cloud service that runs Redis for you. You do not manage a server. It is serverless — it scales automatically and you pay only for the commands you actually use.

**Could we build our own?**

Technically yes — you could run Redis on your own VPS. The cost would be included in the VPS bill. For now, Upstash is the correct choice because:
- Zero server management — it just works
- The cost at our scale is negligible
- The official BullMQ documentation has specific guidance for Upstash
- When you are eventually running a VPS for a client anyway, you can run Redis on the same VPS (one command: `docker compose up redis`) — there is literally no extra work

**Is it stable for 300 clients / 50k emails per month?**

Yes. Let us do the actual maths:

- 50,000 emails per month = ~1,667 emails per day = ~70 per hour
- Each email job = approximately 5–10 Redis commands (enqueue, dequeue, process, confirm, log)
- 50,000 emails × 10 commands = 500,000 Redis commands per month

**Upstash cost for 500,000 commands per month:** approximately **$1.00/month**. The free tier covers 10,000 commands/day (310,000/month) — so a light client may never even pay for Redis.

For 300 clients all sending emails, the Redis usage still costs a few dollars per month across the whole system. This is not a meaningful cost.

**How billing works:**

You own one Upstash account (or one per client if you want full isolation). Upstash sends you one bill. You charge your clients a monthly SaaS fee that covers all infrastructure costs with a healthy margin. Your clients never even know Upstash exists — it is invisible infrastructure.

**Billing model suggestion:**
- Your infrastructure cost per small client: ~$0–25/month (Neon + Upstash + Cloudinary + Resend + Railway)
- You charge the client: €50–150/month SaaS fee depending on plan tier
- Margin: very healthy, and it grows as you add more clients without proportionally more cost

---

## DECISION 4 — Email Templates: Custom Handlebars (NOT React Email) ✅ REVISED

**Original decision was Resend + React Email. This is revised based on your input.**

**Revised: Resend (confirmed, stays) + custom Handlebars `.hbs` HTML templates (replaces React Email).**

### Why the change is correct

React Email is a tool for writing email HTML using React components. It is useful for large teams where developers maintain a design system. For our use case, it adds unnecessary complexity — we are writing a fixed set of 5–7 templates per client, not a library of hundreds.

**The correct approach: Handlebars templates**

Handlebars (`.hbs`) is a simple templating system where you write plain HTML and put variables in `{{ }}` placeholders. Example:

```html
<h1>Hello {{ customerName }},</h1>
<p>Your booking with {{ artistName }} is confirmed for {{ date }} at {{ time }}.</p>
```

When the system sends the email, it replaces `{{ customerName }}` with the actual name. That is it. No React, no build step, no complexity.

**The 7 email templates we write — one set per client, customised with their branding:**

| Template | When sent | Who receives |
|---|---|---|
| `inquiry-received.hbs` | Customer submits inquiry form | Customer (auto-reply: "we received your inquiry") |
| `inquiry-notification.hbs` | Customer submits inquiry form | Artist / Studio admin (internal alert) |
| `quote-sent.hbs` | Artist sends a quote to customer | Customer |
| `booking-confirmed.hbs` | Booking is confirmed (artist + customer agreed) | Customer |
| `booking-reminder.hbs` | 24h before the appointment | Customer |
| `review-request.hbs` | 24–48h after appointment completed | Customer |
| `invoice.hbs` | Invoice generated | Customer |

**Each template is customised per client:** header logo, business name, brand colour, contact details, social links. This takes approximately 30 minutes per client to set up. If a client wants to change their email copy, you edit the `.hbs` file — it is plain text/HTML, no programming knowledge required.

**Can clients edit the templates themselves?** Not directly in the CRM (that would require a full template editor feature). They request changes from you, you edit the `.hbs` file, push the update. For most small businesses this is perfectly acceptable. A template editor in the CRM can be added later as a premium feature if there is demand.

**Resend is still used** — it is the service that actually sends the email through the internet and handles deliverability. The `.hbs` template is just the content. Think of Resend as the post office and the `.hbs` file as the letter.

**Confirmed (revised): Resend for delivery + custom Handlebars `.hbs` templates (stored in backend repo, one set per client).**

---

## DECISION 5 — File Storage: Cloudinary (One Account Per Client) ✅ UPDATED

**Confirmed: Cloudinary. One Cloudinary account per client (each gets their own 25GB free tier).**

### Follow-up: Why resizing? Can't I resize manually? Can each business have their own Cloudinary account?

**Yes — one Cloudinary account per client is exactly the right approach.** Here is why it works:

Each client creates their own free Cloudinary account (email + 2 minutes, no credit card). They get 25GB storage and 25GB bandwidth per month — completely free for any small business. You add their Cloudinary `cloud_name`, `api_key`, and `api_secret` to their deployment's environment variables. Their images stay in their account. They own their data. You pay nothing.

**Why use Cloudinary instead of just storing files yourself?**

When someone uploads an image to your server, the server stores it as a file on disk. Problems with this approach:
1. The file is on one server. If that server moves, the images move (or break).
2. Serving a 5MB raw image to 100 users simultaneously is slow and uses a lot of bandwidth.
3. You have to write code to handle file storage, naming, deletion, and serving URLs yourself.

Cloudinary handles all of this: images are stored on their CDN (Content Delivery Network), which means the image is automatically cached on servers worldwide. A visitor in Tokyo gets the image from a Tokyo server. A visitor in London gets it from a London server. Fast for everyone.

**Do you need the automatic resizing?**

The resizing is automatic and requires zero effort — it happens via the URL. You do not have to resize anything manually. The original full-size image is stored once. When you need a thumbnail, you just add `_w_400` to the URL — Cloudinary generates and caches the thumbnail on the fly. No code, no processing on your end. For the artist portfolio grid, you need a square thumbnail. For the full-screen image on the booking page, you need the full image. You do not want to show a 5MB photo where a 80KB thumbnail is needed — it makes the page slow. Cloudinary's URL trick solves this in literally one line of code.

**So the resizing benefit is:**
- Faster website load times (Google ranks fast sites higher)
- Less bandwidth cost
- No manual work — the URL does all the work

**If you genuinely do not want automatic resizing**, Cloudinary still works fine — just use the original image URL everywhere. You lose the performance benefit but the system still works perfectly. We will use the URL transformations because they cost nothing extra and make the product noticeably faster.

**Confirmed: Cloudinary, one account per client, each on free tier. URL transformations used for thumbnails.**

---

## DECISION 6 — Calendar Integration: Google Calendar API + Time Slots ✅ UPDATED

**Confirmed: Google Calendar API only. `.ics` download for universal compatibility. No Calendly.**

### Follow-up: Detailed booking and calendar flow — how does it actually work?

This is the core workflow. Here is the complete flow, step by step:

---

**STEP 1 — Customer submits inquiry:**
- Customer fills in the booking form on the frontend
- They enter: desired style, body placement, size, reference image, description
- They enter **3 preferred dates/times** when they are available (e.g. "Tuesday 14:00, Thursday 10:00, Saturday 11:00")
- They choose contact preference: email or WhatsApp
- System saves the inquiry to the database
- System sends auto-reply email (or WhatsApp message if chosen): *"Thanks for your inquiry! [Artist] will get back to you shortly."*
- Artist + admin receive internal notification: *"New inquiry from [Name] — 3 preferred dates."*

---

**STEP 2 — Artist reviews in the CRM:**
- Artist logs into the CRM
- Sees the inquiry with all details + the 3 proposed dates
- If more than one inquiry is for the same day, the CRM shows: **"3 requests already for Tuesday 14 Jan"** — a small warning badge on that date
- Artist clicks **"Accept"** on the date they prefer
- System immediately:
  1. Creates a Google Calendar event for the artist with full booking details
  2. Updates the booking status to `CONFIRMED`
  3. Sends confirmation email to the customer with the confirmed date, time, artist name, and studio address
  4. Sends WhatsApp confirmation message if the customer chose WhatsApp contact
  5. Marks that time slot as **BOOKED** in our database's availability table

---

**STEP 3 — Calendar display on the customer-facing website:**

The booking page shows a calendar. Rules:
- **If a full day is booked (no more slots):** Day is greyed out, non-clickable, shows small "FULL" label
- **If a day has some slots available:** Day is clickable and highlighted
- **When customer clicks an available day:** Time slots appear below the calendar
  - Available slots shown in jade green, clickable
  - Booked slots shown in grey, non-clickable
  - Example: Artist works 10:00–17:00. Booking from 10:00–13:00 is confirmed. Customer sees: `10:00` (grey/taken), `13:30` (green/available), `15:00` (green/available)
  - The 30-minute gap after a booking (`13:00` → next slot `13:30`) is configurable — some artists want 30 min setup, others want none
- **Multiple artists in a studio:** The availability calendar is per-artist. Customer selects an artist first, then sees that artist's available slots.

---

**STEP 4 — Time slot logic (how the slots work):**

Each artist has a set of working hours (stored in the database, e.g. Tuesday: 10:00–17:00). When a booking is confirmed for 10:00–13:00:
- The system calculates: occupied from 10:00 to 13:00
- Add the configured buffer (e.g. 30 minutes) = unavailable until 13:30
- Remaining available: 13:30–17:00
- Possible slots that fit within that window are generated (configurable slot duration, e.g. 90-minute minimum for small tattoos)

The artist can also manually block days or time ranges in the CRM (holidays, private blocks). These blocked ranges are also read from the database and shown as unavailable on the customer calendar.

---

**STEP 5 — CRM calendar view (what the studio admin sees):**

- Full month/week/day calendar view in the CRM
- Each confirmed booking shows as a colour-coded block
- Pending inquiries (not yet confirmed) show as dashed/striped blocks
- Days with 3+ pending requests show a badge counter
- Admin can click any booking to see full details
- Admin can manually drag bookings to different times (for rescheduling)
- Artist availability is shown per artist with a filter

---

**STEP 6 — Google Calendar sync:**

When a booking is confirmed (Step 2 above):
- Our backend calls the Google Calendar API using the artist's connected Google account
- Creates a calendar event: title = "[Customer name] — [Style] — [Body placement]", description = full booking details, start time = booking start, end time = booking end
- Event appears in the artist's personal Google Calendar immediately
- Artist gets Google Calendar's own reminders (email/phone notification 1 hour before) — we do not need to build this ourselves

Artist connects their Google account to the CRM once (OAuth flow, takes 2 minutes). Their stored Google refresh token is used for all future calendar writes.

---

**`.ics` file download:**
When a booking is confirmed, the customer receives an `.ics` file attachment in their confirmation email. They click it and it adds the appointment to whatever calendar app they use (Apple Calendar, Outlook, Google Calendar, any app in the world). This requires zero API integration — we generate an `.ics` file (plain text, standard format) and attach it to the email.

---

**Confirmed: Full booking flow with time slots, CRM calendar view with pending request indicators, Google Calendar auto-sync on confirmation, `.ics` for customers.**

---

### On Google Analytics for Lead Intelligence (unchanged)

**GA4 on frontend + first-party `AnalyticsEvent` table in backend. Both layers active. Only God Mode can see lead data.**

First-party data captured per inquiry: name, email, phone, WhatsApp preference, style interest, IP geolocation, UTM source (which marketing channel brought them), device type, referrer URL.

---

## DECISION 7 — Deployment Target ✅ LOCKED (unchanged)

**Confirmed: Vercel (frontend + CRM) + Railway (backend) + Neon (DB) + Upstash (Redis) + Cloudinary (files) + Resend (email).**

**Total cost per small client: ~$0–25/month.** Scales up only when traffic justifies it.

**Scale-up path:**
- Phase 1 (1–5 clients): Everything on free tiers. Cost ≈ $0.
- Phase 2 (5–20 clients): Some clients on paid Neon + Railway. Cost: ~$5–25/client.
- Phase 3 (20+ clients): Evaluate migrating large clients to Hetzner VPS (€5.77/month runs everything — backend, Redis, PostgreSQL together in Docker Compose).
- Vercel stays for frontends regardless of scale — it is free and requires zero maintenance.

---

## DECISION 8 — Brand Colours: Two-Mode Design System ✅ UPDATED

**The design has two complete palettes — one for each mode — plus the tattoo frontend follows the CRM design.**

### CRM — Light Mode (default)

> Bone white background. Jade green for interactive elements and text accents. Clean, professional, minimal.

```
CRM background:    #F5F0EB  (bone white — not pure white, warm and easy on the eyes)
CRM surface:       #FFFFFF  (white — cards, panels, inputs)
CRM border:        #E0D9D1  (warm light grey — card borders, dividers)
Primary / CTA:     #4D9B9E  (jade teal — buttons, links, active states, accents)
Primary hover:     #3A7B7E  (slightly darker jade — hover on buttons)
Text primary:      #1A1A1A  (near-black — headings, body text)
Text secondary:    #6B6B6B  (mid grey — labels, captions, placeholders)
Text on primary:   #FFFFFF  (white text on jade green buttons)
Error:             #C0392B  (muted red)
Success:           #27AE60  (muted green)
Warning:           #E67E22  (amber)
```

### CRM — Dark Mode

> Dark grey near-black background. Light blue-green for interactive elements and text accents. Premium, modern.

```
CRM background:    #1A1A1A  (dark grey near-black)
CRM surface:       #242424  (slightly lighter — cards, panels)
CRM border:        #333333  (dark border — card edges, dividers)
Primary / CTA:     #AFD6D8  (light blue-green — buttons, links, active states)
Primary hover:     #C5E5E7  (slightly lighter — hover)
Text primary:      #F0F0F0  (near-white — headings, body text)
Text secondary:    #999999  (mid grey — labels, captions)
Text on primary:   #1A1A1A  (dark text on light blue-green buttons)
Error:             #FF6B6B  (lighter red for dark mode legibility)
Success:           #6BCB77  (lighter green for dark mode)
Warning:           #FFD166  (lighter amber for dark mode)
```

### CRM Glass Morphism Elements (applies to both modes)

Glass panels, modals, and overlay elements use:
```
Glass fill:        rgba(255, 255, 255, 0.06)  (dark mode) / rgba(255, 255, 255, 0.65) (light mode)
Glass border:      rgba(255, 255, 255, 0.12)  (dark mode) / rgba(0, 0, 0, 0.08) (light mode)
Glass blur:        backdrop-filter: blur(16px) saturate(180%)
Glass shadow:      0 8px 32px rgba(0, 0, 0, 0.2)
```

This is exactly the Apple liquid-glass feel — panels that look like frosted glass over the background.

### Tattoo Studio Frontend

The tattoo studio frontend **follows the CRM design language exactly** — it uses the same glass morphism, same jade green, same dark mode palette as the CRM dark mode. This is intentional: the tattoo studio is the showcase product and it should look like a premium, expensive custom website. Since the CRM uses the same design, the two feel like a unified product — which they are.

The first frontend will follow the CRM dark mode palette:
- Dark background (`#1A1A1A`)
- Light blue-green accents (`#AFD6D8`) for interactive elements
- Jade teal (`#4D9B9E`) for CTAs and highlights
- Glass morphism cards and panels throughout

### Future Clients' Frontends

Every new client (restaurant, salon, barber) gets a frontend styled to **their brand colours**. We swap the Tailwind CSS variables to their palette. The glass morphism and component structure stay the same — only the colours change. This means a new frontend skin takes hours, not days.

---

## DECISION 9 — 3D Mannequin Model ✅ UPDATED (with links)

**Confirmed: Source a GLB for Phase 4 development. Commission or create a custom model for production.**

### Where to look and what to expect (with links)

**Option 1 — TurboSquid (recommended starting point):**
→ https://www.turbosquid.com/Search/3D-Models/free/mannequin
→ https://www.turbosquid.com/Search/3D-Models/mannequin/glb
- Search: "mannequin low poly GLB"
- Price range: Free–$150 for a decent model
- What to look for: under 50,000 triangles, separate named meshes (or separable in Blender), clean topology
- Note: Check the license carefully — you want **Royalty Free** license that allows use in commercial interactive applications

**Option 2 — CGTrader:**
→ https://www.cgtrader.com/3d-models/character/woman/mannequin
→ https://www.cgtrader.com/free-3d-models/character/man/mannequin
- Often cheaper than TurboSquid
- Wide variety of styles — wireframe mannequin, solid mannequin, stylised body forms
- Same license check applies

**Option 3 — Sketchfab:**
→ https://sketchfab.com/search?q=mannequin&sort_by=-likeCount&type=models
- Some models are free to download in GLB format
- Good for prototyping — check license (CC licenses vary)

**Option 4 — Mixamo (free, from Adobe):**
→ https://www.mixamo.com
- Free rigged 3D character models
- Export as FBX, then convert to GLB using https://products.aspose.app/3d/conversion or Blender
- Characters look like people, not mannequins — fine for development, not ideal for production
- Completely free for commercial use

**What the model needs to work with our system:**
- **Format:** GLB (GLTF binary) — non-negotiable, Three.js/R3F requires it
- **Poly count:** Under 50,000 triangles (ideally under 30,000) — must run at 60fps on a mid-range phone
- **Named meshes:** Each body region must be a separate mesh named clearly (e.g. `head`, `neck`, `chest`, `back`, `left_arm_upper`, `left_arm_lower`, `left_hand`, `right_arm_upper`, `right_arm_lower`, `right_hand`, `torso_front`, `torso_back`, `left_leg_upper`, `left_leg_lower`, `left_foot`, `right_leg_upper`, `right_leg_lower`, `right_foot`). This is how clicking detects which body part was selected.
- **If the purchased model is not pre-separated:** Open in Blender (free), manually separate by body region, export as GLB. This takes 2–4 hours for someone with basic Blender knowledge.
- **Style:** Stylised / slightly abstract mannequin preferred over photorealistic human — looks cleaner in a UI, loads faster

**Timeline:** Source a model before Phase 4 begins (can happen in parallel while Phases 1–3 are being built). This is a non-blocking parallel task.

**For production:** Commission a custom model from a 3D artist on Fiverr or ArtStation. Budget: $300–1,500 depending on complexity. Brief them on the named mesh requirements above. This is the model that goes live on real client sites.

---

## DECISION 10 — Artist Profile & Picture Editing ✅ LOCKED

**Confirmed: Artists edit their own profile and portfolio via the CRM (ARTIST role). This feature is also valuable for salons (stylists edit their own profile). Can be toggled OFF for restaurants.**

**Access rules:**
- `ARTIST` role: can edit own profile, bio, profile photo, portfolio images, own availability
- `ADMIN` role: can edit any artist's profile + all system settings
- Public frontend: read-only, displays what is in the database, updates reflect immediately without a page rebuild

---

## DECISION 11 — Interchangeable Architecture ✅ LOCKED

**Confirmed: One backend, multiple frontends, `BUSINESS_TYPE` environment variable drives label changes and default flag configuration.**

**Deployment per new client:**
1. Clone backend repository, set new client's environment variables (DB, Redis, email, Cloudinary, business type)
2. Deploy to Railway (10 minutes)
3. Deploy the appropriate frontend (tattoo / salon / barber / restaurant) to Vercel (5 minutes)
4. Configure feature flags in the CRM God Mode panel
5. Done — no new code written

**CRM label system (driven by `BUSINESS_TYPE` env var):**

| Label | TATTOO_STUDIO | HAIR_SALON | BARBER | RESTAURANT |
|---|---|---|---|---|
| "Artists" | Artists | Stylists | Barbers | Staff |
| "Styles" | Tattoo Styles | Hair Styles | Cuts & Styles | Menu |
| "Portfolio" | Portfolio | Gallery | Gallery | Photo Gallery |
| "Quote" | Quote | Estimate | Estimate | — (OFF) |
| "Mannequin" | Body Placement | — (OFF) | — (OFF) | — (OFF) |
| "Table Selector" | — (OFF) | — (OFF) | — (OFF) | Table Booking |

---

## DECISION 12 — WhatsApp Automation ✅ NEW — CONFIRMED

**Confirmed: Two automated WhatsApp messages per booking lifecycle. Offered as a toggleable service (`WHATSAPP_AUTOMATION` feature flag).**

### What the automation does

**Message 1 — On inquiry submission (immediate):**
Sent when the customer submits their inquiry and chose WhatsApp as their contact preference.

> *"Hi [Name]! 👋 Thanks for reaching out to [Studio Name]. We've received your inquiry and [Artist Name] will get back to you shortly to confirm your appointment. We're excited to work with you! — [Studio Name]"*

Purpose: establishes immediate contact, confirms receipt, sets expectation for response time, builds rapport.

**Message 2 — On booking completion (2 hours after marked COMPLETE):**
Sent when the artist marks the appointment as completed in the CRM.

> *"Hi [Name]! 🙏 Thank you so much for your visit to [Studio Name] today! We hope you love your new tattoo. We'd really appreciate it if you could take a moment to leave us a Google review — it means the world to us: [Google Review Link]. See you next time! — [Studio Name]"*

Purpose: post-appointment goodwill message + review request. The 2-hour delay gives the customer time to get home and rest before seeing the message.

### Technical implementation

**Provider: Twilio WhatsApp API** (or WhatsApp Business API via Meta directly for high-volume clients).

| Provider | Cost | Setup | Message limit |
|---|---|---|---|
| **Twilio** | $0.005–0.008 per message (~$0.007) | 2 hours | Unlimited |
| **Meta WhatsApp Business API** | Free for first 1,000 service conversations/month, then ~$0.015/message | 1–2 days (Facebook approval) | Unlimited |
| **WhatsApp Web scraping (unofficial)** | Free | ❌ Never — violates terms, account will be banned | ❌ Not allowed |

**Recommended: Start with Twilio.** Twilio is the professional standard. Their WhatsApp sandbox is available immediately for testing. To go live, you apply for a WhatsApp Business number (Twilio handles the Meta approval process for you). Takes 1–2 business days.

**Cost at scale:** 300 clients × 2 messages × 20 bookings/month = 12,000 messages/month = ~$84/month total. You pass this cost to clients as part of their WhatsApp Automation plan tier.

**Feature flag:** `WHATSAPP_AUTOMATION` — when OFF, no messages are sent, the preference is still captured in the database. Can be toggled on/off per client in the CRM.

**New module added to Phase 1:** `backend/src/modules/whatsapp/`

---

## UPDATED Tech Stack (All Decisions Locked — Round 2)

| Layer | Technology | Status | Notes |
|---|---|---|---|
| Backend runtime | Node.js 20 LTS + TypeScript 5 | ✅ Locked | |
| Backend framework | Express.js | ✅ Locked | |
| Database | PostgreSQL 16 | ✅ Locked | |
| ORM | Prisma | ✅ Locked | Easy DB migration: change 1 line |
| Auth | JWT access (15min) + refresh (7d) | ✅ Locked | |
| Validation | Zod | ✅ Locked | |
| Job queue | BullMQ | ✅ Locked | |
| Email sending | **Resend** | ✅ Locked | One account per client |
| Email templates | **Handlebars `.hbs`** | ✅ Revised | Plain HTML, no React Email |
| File uploads | **Cloudinary** | ✅ Locked | One account per client, 25GB free |
| File upload middleware | Multer | ✅ Locked | |
| WhatsApp messages | **Twilio WhatsApp API** | ✅ New | Toggle via `WHATSAPP_AUTOMATION` flag |
| Logging | Winston | ✅ Locked | |
| Testing | Jest + Supertest | ✅ Locked | |
| Frontend | React 18 + TypeScript + Vite | ✅ Locked | |
| Styling | Tailwind CSS v3 | ✅ Locked | |
| CRM light mode | Bone white (`#F5F0EB`) + jade (`#4D9B9E`) | ✅ Locked | |
| CRM dark mode | Near-black (`#1A1A1A`) + light blue (`#AFD6D8`) | ✅ Locked | |
| Glass morphism | backdrop-filter blur(16px) + frosted panels | ✅ Locked | Apple liquid-glass style |
| State management | Zustand | ✅ Locked | |
| 3D Mannequin | Three.js + React Three Fiber | ✅ Locked | |
| Mannequin model | **Purchased GLB for dev, custom for prod** | ✅ Locked | See links in Decision 9 |
| CRM framework | React + Tailwind (custom) | ✅ Locked | |
| Charts/Analytics | Recharts | ✅ Locked | |
| Calendar | **Google Calendar API + .ics** | ✅ Locked | Full time-slot system |
| Lead analytics | **GA4 + first-party AnalyticsEvent** | ✅ Locked | God Mode only |
| Feature flags | **DB-driven, middleware-gated** | ✅ Locked | |
| Dev DB | Docker Compose postgres:16 | ✅ Locked | |
| Prod DB | **Neon** | ✅ Locked | One project per client |
| Dev Redis | Docker Compose redis:7-alpine | ✅ Locked | |
| Prod Redis | **Upstash** | ✅ Locked | ~$1/mo per client at scale |
| Frontend deploy | **Vercel** | ✅ Locked | |
| Backend deploy | **Railway** | ✅ Locked | |
| Business type config | `BUSINESS_TYPE` env var | ✅ Locked | One codebase, all clients |

---

## Phase 1 Steps — Complete List (including all additions)

All steps to build the backend foundation. See `PHASE1.md` for the definitive per-step file list and checklists.

| Step | What | Status |
|---|---|---|
| 1.1 | Project scaffolding (package.json, tsconfig, .env.example, .gitignore) | ✅ Done |
| 1.2 | Prisma setup + schema (all models incl. ArtistAvailability, AvailabilityBlock, PasswordResetToken) | ⬜ Next |
| 1.3 | Core Express app (middleware, server, config, logger, apiResponse, errorHandler) | ⬜ |
| 1.3b | API standards: pagination helper + response envelope | ⬜ |
| 1.4 | Auth module (JWT, register, login, refresh, logout, forgot/reset password, GET/PATCH me) | ⬜ |
| 1.4b | Business type config (labels + default flags per BUSINESS_TYPE env var) | ⬜ |
| 1.5 | Artists module (CRUD + role-based access) | ⬜ |
| 1.6 | Styles module (tattoo styles / hair styles / etc.) | ⬜ |
| 1.7 | Leads module (inquiry form → lead record) | ⬜ |
| 1.8 | Quotes module | ⬜ |
| 1.9 | Bookings module (status transitions, double-booking prevention) | ⬜ |
| 1.10 | Invoices module | ⬜ |
| 1.11 | Email module (Resend + Handlebars, 7 templates, .ics attachment) | ⬜ |
| 1.12 | Calendar integration (Google Calendar OAuth + event CRUD) | ⬜ |
| 1.13 | Analytics module (AnalyticsEvent + aggregation endpoints) | ⬜ |
| 1.14 | File upload module (Cloudinary + Multer) | ⬜ |
| 1.15 | Feature flag system (DB-driven, middleware-gated) | ⬜ |
| 1.16 | Seed script (default flags per business type, test data) | ⬜ |
| 1.17 | WhatsApp automation module (Twilio, 2 messages) | ⬜ |
| 1.18 | BullMQ job queue infrastructure (Redis connection, worker, retry config) | ⬜ |
| 1.19 | Review request automation (36h BullMQ delayed job) | ⬜ |
| 1.20 | Availability & time slot engine | ⬜ |
| 1.21 | Docker Compose for local dev (postgres + redis) | ⬜ |
| 1.22 | Integration tests (Supertest, all routes) | ⬜ |

---

## Open Items — ALL RESOLVED ✅

All four previously open items are now resolved:

1. **Mannequin GLB source** — Links added in Decision 9. Source before Phase 4 begins. TurboSquid and CGTrader are the first stop. This can happen in parallel while Phases 1–3 are being built.

2. **Studio name / domain** — Not needed until Phase 3 (frontend build). This first deployment is a showcase / demo product. Domain, name, and branding finalised when ready. Phases 1 and 2 are completely unblocked without this.

3. **Payment / deposit** — Added as a future Phase 5 item. Module planned (`deposits/`) with `DEPOSIT_ENABLED` feature flag. Payment processed in-studio for now. Stripe will be integrated when ready (most sellable option: Stripe Checkout + Stripe Connect for passing payments to the business). Toggle OFF for clients who do not take deposits (many salons and restaurants do not).

4. **WhatsApp automation** — Fully defined in Decision 12 above. Two messages: welcome on inquiry, review request 2 hours after completion. Twilio WhatsApp API. `WHATSAPP_AUTOMATION` feature flag. This is a premium service tier you can charge extra for.

---

## Final Notes — Competitive Advantage Summary

| Competitor | Their weakness | Our advantage |
|---|---|---|
| **Fresha** | No mannequin, no quote system, no reference upload, no lead intelligence | 3D mannequin + quote workflow + reference upload + God Mode lead data |
| **Booksy** | Basic booking, minimal CRM, no automation | Full automation pipeline: email + WhatsApp + review requests |
| **Vagaro** | Expensive ($25–85/mo), slow, generic | Cheaper per client, modern glass UI, white-label |
| **Calendly** | Scheduling only — no CRM, no invoicing, no email automation | End-to-end: inquiry → quote → booking → calendar → invoice → review |
| **Square Appointments** | No tattoo-specific features | 3D body placement, quote + deposit system |
| **All of the above** | Single industry, cannot be resold across verticals | Multi-industry interchangeable architecture |

**The single biggest differentiator:** The 3D interactive body placement mannequin. No booking system in the world has this. It is immediately demonstrable and immediately obvious as superior.

**The second differentiator:** God Mode. No competitor gives the studio owner real-time lead intelligence (where people come from, what they want, how they found you). This is a feature that directly increases client revenue — you can sell it as a marketing intelligence add-on.

---

> **PLAN STATUS: ✅ LOCKED. Zero open items. All decisions made.**
> **Step 1.1 — Project scaffolding: ✅ DONE.**
> **Next action: Step 1.2 — Prisma schema (all models).**
> We proceed one step at a time. Each file is reviewed before the next is created.

---
