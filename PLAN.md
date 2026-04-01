# BookingAutomation — Master Development Plan

> **Status: PLAN ONLY — No code has been written yet.**
> This document must be reviewed and approved before any file is created.
> We proceed **one step at a time**, completing and verifying each step before moving on.

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

## Tech Stack (Decided, Subject to Approval)

| Layer | Technology | Why |
|---|---|---|
| Backend runtime | Node.js + TypeScript | Industry standard, typed, fast |
| Backend framework | Express.js | Lightweight, well understood, huge ecosystem |
| Database | PostgreSQL | Relational, ACID, great for bookings/CRM data |
| ORM | Prisma | Type-safe queries, easy migrations, great DX |
| Auth | JWT (access + refresh tokens) | Stateless, scalable, industry standard |
| Validation | Zod | Type-safe runtime validation, integrates with TS |
| Job queue | BullMQ + Redis | Reliable background jobs (emails, reminders) |
| Email | Nodemailer + Handlebars templates | Flexible, self-hosted, templated |
| File uploads | Multer + Cloudinary | Local handling + cloud CDN storage |
| Logging | Winston | Structured logs, multiple transports |
| Testing | Jest + Supertest | Unit + integration tests |
| Frontend | React + TypeScript + Vite | Fast build, modern, component-based |
| Styling | Tailwind CSS | Utility-first, rapid UI, consistent design |
| State management | Zustand | Lightweight, simple, no boilerplate |
| 3D Mannequin | Three.js + React Three Fiber | Industry-leading 3D in the browser |
| CRM framework | React + Tailwind (custom-built) | Full control, no off-the-shelf limitations |
| Charts/Analytics | Recharts | React-native, clean, customisable |
| Calendar | Google Calendar API + Calendly | Real-time availability, conflict prevention |

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

## Step 1.4 — Authentication System

**What:** JWT-based login, registration, token refresh, and logout. Role-based access control (ADMIN, ARTIST, CUSTOMER).

**Why:** Every protected API route depends on this. It must be solid before any other module is built. We follow the access-token (15 min) + refresh-token (7 days) pattern to balance security and convenience.

**Files to create (this step only):**
- `backend/src/modules/auth/auth.schema.ts` — Zod validation for register/login requests
- `backend/src/modules/auth/auth.service.ts` — hash password, compare password, sign tokens, verify tokens, store/rotate refresh tokens
- `backend/src/modules/auth/auth.controller.ts` — POST register, POST login, POST refresh, POST logout
- `backend/src/modules/auth/auth.routes.ts` — route definitions
- `backend/src/middleware/auth.ts` — `requireAuth` middleware (validates Bearer token, attaches user to req)
- `backend/src/middleware/requireRole.ts` — `requireRole('ADMIN')` middleware

**Checklist:**
- [ ] `POST /api/auth/register` creates user, returns access + refresh tokens
- [ ] `POST /api/auth/login` verifies credentials, returns tokens
- [ ] `POST /api/auth/refresh` exchanges refresh token for new access token
- [ ] `POST /api/auth/logout` invalidates refresh token
- [ ] Passwords are hashed with bcrypt (cost 12)
- [ ] Invalid tokens return `401`
- [ ] Unit tests written and passing

---

## Step 1.5 — Artist Management API

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

**What:** Background email service using BullMQ queues and Handlebars HTML templates. Handles all transactional emails: booking confirmation, quote received, quote ready, invoice, follow-up, promotions.

**Why:** Email automation is a key differentiator. Every important event in the system triggers a beautifully templated, personalised email — automatically. Using a queue ensures emails are sent reliably without blocking the API response.

**Files to create (this step only):**
- `backend/src/modules/email/email.service.ts` — Nodemailer transport, compile + send template
- `backend/src/modules/email/email.queue.ts` — BullMQ queue definition, job processor
- `backend/src/modules/email/templates/booking-confirmation.hbs`
- `backend/src/modules/email/templates/quote-received.hbs`
- `backend/src/modules/email/templates/quote-ready.hbs`
- `backend/src/modules/email/templates/invoice.hbs`
- `backend/src/modules/email/templates/follow-up.hbs`
- `backend/src/modules/email/templates/promotion.hbs`

**Email triggers (automated):**
| Trigger | Template | Recipient |
|---|---|---|
| New lead submitted | `quote-received` | Artist + Studio admin |
| Quote sent by artist | `quote-ready` | Customer |
| Booking confirmed | `booking-confirmation` | Customer |
| Booking cancelled | Cancellation notice | Customer |
| Invoice sent | `invoice` | Customer |
| 48h before appointment | `follow-up` reminder | Customer |
| Lead gone quiet (7 days) | `follow-up` | Customer |

**Checklist:**
- [ ] All 6 templates created and styled
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
- 3 sample Email Templates (booking confirmation, quote ready, follow-up)
- 5 sample Leads in various pipeline stages
- 2 sample Bookings
- 2 sample Quotes
- 1 sample Invoice

**Checklist:**
- [ ] `npx prisma db seed` runs without errors
- [ ] All data visible in database after seed
- [ ] Seed is idempotent (can be re-run without creating duplicates)

---

## ✅ Phase 1 Complete When:

- [ ] All 16 steps above completed and verified
- [ ] `npm run test` — all tests pass
- [ ] `npm run build` — TypeScript compiles with zero errors
- [ ] `GET /health` returns `200 OK`
- [ ] All endpoints tested manually via Postman / curl
- [ ] No hardcoded secrets anywhere in code

---
---

# PHASE 2 — 3D Mannequin Module

> **Goal:** Build an interactive 3D mannequin using Three.js that customers use to select body placement for their tattoo. This is the single biggest UI differentiator vs all competitors.  
> **Why second:** This is a standalone visual component. It needs to be perfected in isolation before it is integrated into the frontend booking flow in Phase 3.

---

## Step 2.1 — 3D Scene Setup

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

## Step 2.2 — 3D Model Integration

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

## Step 2.3 — Hitbox Implementation

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

## Step 2.4 — Granular Placement Refinement UI

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

## Step 2.5 — Mannequin as Embeddable Component

**What:** Package the mannequin as a self-contained React component with a clean props interface so Phase 3 can drop it straight into the booking flow.

**Why:** The mannequin must integrate cleanly into the frontend without any leaky implementation details. A well-defined props API makes this seamless.

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

- [ ] All 5 steps above completed and verified
- [ ] Component renders, rotates, hitboxes work, refinement works
- [ ] Mobile-tested
- [ ] No console errors

---
---

# PHASE 3 — Customer-Facing Frontend

> **Goal:** Build the customer-facing booking inquiry website — a beautiful, fast, step-by-step form that guides customers from artist selection through to submitting their inquiry and scheduling.  
> **Why third:** The frontend is the customer's first impression. It depends on both the backend API (Phase 1) and the 3D mannequin (Phase 2) being complete.

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

**What:** Integrate the Phase 2 mannequin component into the booking flow.

**Why:** This is the step that makes the product unique. No competitor has this.

**Files to create (this step only):**
- `frontend/src/pages/booking/BodyPlacement.tsx` — wraps Mannequin component, handles selection event

**Logic:**
- Import Mannequin component from Phase 2
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

---
---

# PHASE 4 — CRM Admin Dashboard

> **Goal:** Build the studio management dashboard (CRM) that gives admins and artists full control over every aspect of the business.  
> **Why last:** The CRM reads from and writes to all the data built in Phase 1. It is the admin layer on top of everything else.

---

## Step 4.1 — CRM App Scaffolding

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

## Step 4.2 — Login Page

**What:** Clean, secure login screen for admins and artists.

**Files to create (this step only):**
- `crm/src/pages/Login.tsx`

**Checklist:**
- [ ] Login calls `POST /api/auth/login`
- [ ] JWT stored in memory + refresh token in httpOnly cookie
- [ ] Invalid credentials show clear error
- [ ] Redirect to dashboard on success

---

## Step 4.3 — Main Dashboard (Analytics Overview)

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

## Step 4.4 — Lead Management

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

## Step 4.5 — Quote Management

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

## Step 4.6 — Booking Management

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

## Step 4.7 — Invoice Management

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

## Step 4.8 — Artist Management

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

## Step 4.9 — Style Management

**What:** Manage the list of tattoo styles available on the frontend.

**Files to create (this step only):**
- `crm/src/pages/Styles.tsx` — list + add/edit/delete

**Checklist:**
- [ ] Add new style with name, description, example image
- [ ] Edit existing styles
- [ ] Disable/enable styles (controls visibility on frontend)

---

## Step 4.10 — Email Template Management

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

## Step 4.11 — God Mode Feature Flag Panel

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

## Step 4.12 — User & Role Management

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

- [ ] All 12 steps completed and verified
- [ ] Full admin workflow: lead → quote → booking → invoice works end-to-end in CRM
- [ ] Analytics dashboard shows real data
- [ ] God mode toggles work
- [ ] Tested on desktop (CRM is primarily desktop)

---
---

# Overall Project Completion Checklist

- [ ] Phase 1 — Backend ✅
- [ ] Phase 2 — 3D Mannequin ✅
- [ ] Phase 3 — Frontend ✅
- [ ] Phase 4 — CRM ✅
- [ ] End-to-end test: customer submits inquiry → artist quotes → customer accepts → booking confirmed → invoice generated
- [ ] Security audit: no hardcoded secrets, all routes protected, rate limiting active
- [ ] Performance: API < 200ms on all endpoints, frontend Lighthouse score > 90
- [ ] Documentation: README for each package with setup instructions
- [ ] Deployment: Docker Compose file for local dev, deployment guide for production

---

## Notes / Decisions to Confirm Before Starting

1. **Database host:** Where will PostgreSQL run? (Local Docker / Railway / Supabase / other?)
2. **Redis host:** Where will Redis run for the job queue? (Local Docker / Upstash / other?)
3. **Email provider:** Gmail SMTP (dev) or a dedicated provider like SendGrid/Resend for production?
4. **File storage:** Cloudinary confirmed? Or AWS S3?
5. **Calendar integration:** Start with Google Calendar only, or Calendly too?
6. **Domain / deployment target:** Vercel + Railway? Self-hosted VPS? Other?
7. **Brand colours:** What colour palette for the tattoo studio frontend?
8. **3D model:** Do we source a pre-made mannequin GLB, or commission a custom one?
