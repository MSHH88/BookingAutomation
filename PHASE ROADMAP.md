# PHASE ROADMAP — BookingAutomation Platform

> **Source:** Based on [GapsBeforeProd.md](./GapsBeforeProd.md)  
> **Status:** Phase 0 — ✅ COMPLETE. Phases 1–10 — 🔲 PENDING.  
> **Architecture:** Node.js + Express + Prisma + PostgreSQL + BullMQ + Redis + Twilio + Stripe.  
> **Rule:** Every feature is gated by a feature flag. Nothing is forced on. SUPER_ADMIN controls everything from the Control Centre.

---

## ✅ PHASE 0 — Security & Architecture Foundation
**Status: COMPLETE**

All blockers for every downstream phase have been resolved:

- ✅ `SUPER_ADMIN` role added to `enum Role` in Prisma schema (`CUSTOMER=1, ARTIST=2, ADMIN=3, SUPER_ADMIN=4`).
- ✅ `canViewLeads` and `canAssignRoles` boolean flags added to `User` model.
- ✅ `requireLeadAccess` middleware — only SUPER_ADMIN or users with `canViewLeads=true` can access `/api/leads`.
- ✅ `Tenant` model added; `tenantId` added to all 13 relevant models (`User`, `Artist`, `Booking`, `Lead`, `StudioSettings`, `FeatureFlag`, `EmailTemplate`, `WhatsAppTemplate`, `Payment`, `Service`, `ArtistService`, `Waitlist`, `Table`).
- ✅ `WhatsAppTemplate` model added to schema with `id`, `tenantId`, `key`, `body`, `variables`, `isActive`, `updatedAt`.
- ✅ `/api/roles` module — SUPER_ADMIN can list users, change roles, toggle `canAssignRoles`/`canViewLeads` flags.
- ✅ `/api/tenants` module — SUPER_ADMIN can create/list/manage tenants; each tenant gets isolated data.
- ✅ All existing queries scoped by `tenantId` extracted from JWT.
- ✅ 45 test suites, 1037/1037 tests passing, 0 TypeScript errors.

---

## 🔲 PHASE 1 — Messaging Foundation
**Theme:** WhatsApp + Email + SMS — all messaging infrastructure built as one unit.  
**Dependencies:** Phase 0 complete (tenantId, WhatsAppTemplate model, SUPER_ADMIN role).

---

### 1.1 — WhatsApp Templates: DB-Driven + Editable

**Gap #2**

**What to build:**

- Migrate all 5 hardcoded templates from `whatsapp.queue.ts → buildWhatsAppMessage()` into the `WhatsAppTemplate` DB table.
- Seed script inserts the 5 defaults on first run (idempotent upsert).
- `buildWhatsAppMessage()` rewritten to: load template by `key` + `tenantId` from DB (Redis-cached, 5-minute TTL), interpolate `{{variables}}` at send time using a safe Handlebars-style renderer.
- Each template supports placeholder variables: `{{customerName}}`, `{{studioName}}`, `{{artistName}}`, `{{date}}`, `{{time}}`, `{{serviceType}}`, `{{bookingId}}`, `{{depositAmount}}`, `{{loyaltyPoints}}`, `{{bookingLink}}`.
- Redis cache key: `whatsapp_template:{tenantId}:{key}`. Invalidated on any PATCH.

**Files to create/modify:**
- `prisma/schema.prisma` — already has `WhatsAppTemplate` (Phase 0). No schema change needed.
- `backend/src/lib/template-renderer.ts` — shared Handlebars renderer used by both WhatsApp and Email.
- `backend/src/modules/whatsapp/whatsapp.queue.ts` — replace `buildWhatsAppMessage()` to use DB lookup.
- `backend/src/modules/whatsapp-templates/whatsapp-templates.schema.ts` — Zod validation.
- `backend/src/modules/whatsapp-templates/whatsapp-templates.service.ts` — CRUD + cache invalidation.
- `backend/src/modules/whatsapp-templates/whatsapp-templates.controller.ts`
- `backend/src/modules/whatsapp-templates/whatsapp-templates.routes.ts` — `GET/PATCH /api/messages/whatsapp-templates/:key`
- `backend/src/modules/whatsapp-templates/whatsapp-templates.service.test.ts` — unit tests
- `backend/src/modules/whatsapp-templates/whatsapp-templates.test.ts` — integration tests
- `backend/src/app.ts` — mount whatsapp-templates routes under `/api/messages`
- `backend/prisma/seed.ts` — seed 5 WhatsApp template defaults per tenant

---

### 1.2 — New WhatsApp Message Types (10 additional)

**Gap #3**

**What to build:**

Add 10 new message types to the WhatsApp queue. Each type needs a template key in DB and a trigger point in the relevant service:

| Key | Trigger Location |
|-----|-----------------|
| `cancellation-confirmation` | `bookings.service.ts → cancelBooking()` |
| `reschedule-confirmation` | `bookings.service.ts → rescheduleBooking()` |
| `waitlist-notification` | `waitlist.service.ts → notifyWaitlistMatch()` |
| `deposit-received` | `payments.service.ts → confirmDeposit()` (DEPOSIT_ENABLED only) |
| `invoice-ready` | `payments.service.ts → generateInvoice()` |
| `quote-response` | `leads.service.ts → respondToQuote()` |
| `no-show-followup` | `bookings.service.ts → markNoShow()` |
| `loyalty-reward` | `loyalty.service.ts → awardPoints()` (LOYALTY_ENABLED only) |
| `welcome-new-customer` | `auth.service.ts → register()` |
| `staff-new-booking` | `bookings.service.ts → createBooking()` — sent to artist |

**Files to create/modify:**
- `backend/prisma/seed.ts` — add 10 new template seeds.
- `backend/src/modules/whatsapp/whatsapp.queue.ts` — add 10 new `addJob()` calls / queue processors.
- Each relevant service file listed above — add `whatsappQueue.add()` call at correct trigger point.
- `backend/src/modules/whatsapp-templates/whatsapp-templates.service.test.ts` — add tests for new types.

---

### 1.3 — Email Templates: CRM Editable

**Gap #4**

**What to build:**

The `EmailTemplate` model already exists in the DB with `key`, `subject`, `htmlBody`, `variables`, `isActive`. The service logic exists in the notifications module. What is missing is:

- A CRM-exposed CRUD API to list, view, edit, and preview email templates.
- An email-templates module exposing: `GET /api/messages/email-templates` (list all for tenant), `GET /api/messages/email-templates/:key`, `PATCH /api/messages/email-templates/:key` (edit subject + htmlBody + isActive), `POST /api/messages/email-templates/:key/preview` (render with sample variables and return HTML).
- Per-tenant: each tenant has its own copy of all templates (seeded from master defaults on tenant creation).

**New email template types to seed (in addition to existing):**
- `booking-cancellation-customer`
- `booking-reschedule-customer`
- `waitlist-slot-available`
- `payment-receipt`
- `deposit-receipt`
- `quote-artist-reply`
- `no-show-followup`
- `welcome-new-customer`
- `password-reset` (if not already)
- `staff-new-booking-notification`
- `loyalty-reward-earned`

**Files to create/modify:**
- `backend/src/modules/email-templates/email-templates.schema.ts`
- `backend/src/modules/email-templates/email-templates.service.ts`
- `backend/src/modules/email-templates/email-templates.controller.ts`
- `backend/src/modules/email-templates/email-templates.routes.ts`
- `backend/src/modules/email-templates/email-templates.service.test.ts`
- `backend/src/modules/email-templates/email-templates.test.ts`
- `backend/src/app.ts` — mount under `/api/messages`
- `backend/prisma/seed.ts` — seed all email template defaults

---

### 1.4 — CRM Messages Section (API)

**Gap #5**

**What to build:**

A unified `/api/messages` namespace consolidating WhatsApp and Email template management:

```
GET    /api/messages/whatsapp-templates          → list all WA templates for tenant
GET    /api/messages/whatsapp-templates/:key     → get single
PATCH  /api/messages/whatsapp-templates/:key     → update body/isActive
GET    /api/messages/email-templates             → list all email templates for tenant
GET    /api/messages/email-templates/:key        → get single
PATCH  /api/messages/email-templates/:key        → update subject/htmlBody/isActive
POST   /api/messages/email-templates/:key/preview → preview rendered HTML
```

Access control: SUPER_ADMIN always; ADMIN only if `canManageMessages = true` (new flag on User).

**Files to create/modify:**
- `backend/src/modules/messages/messages.routes.ts` — top-level router that mounts WA + Email sub-routers
- `backend/src/app.ts` — mount at `/api/messages`
- `backend/prisma/schema.prisma` — add `canManageMessages Boolean @default(false)` on `User`
- Migration + seed

---

### 1.5 — SMS Channel via Twilio SMS

**Gap #18**

**What to build:**

- New `sms.queue.ts` using BullMQ — parallel to `whatsapp.queue.ts`.
- `SmsTemplate` model in Prisma (same shape as `WhatsAppTemplate` — plain text, no HTML).
- Twilio SMS client in `backend/src/lib/twilio-sms.ts` (separate from the WhatsApp Twilio client).
- Per-customer channel preference: `notificationChannel` field on `User` — enum `WHATSAPP | SMS | EMAIL | ALL` (default `WHATSAPP`).
- All transactional message triggers check `notificationChannel` and fan out to the correct queue(s).
- Feature flag `SMS_ENABLED` — if false, no SMS jobs are added to queue.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `SmsTemplate` model, `notificationChannel` on `User`
- `backend/src/lib/twilio-sms.ts`
- `backend/src/modules/sms/sms.queue.ts`
- `backend/src/modules/sms-templates/` — same structure as whatsapp-templates module
- `backend/src/modules/sms-templates/sms-templates.routes.ts` → `GET/PATCH /api/messages/sms-templates/:key`
- All booking/notification service files — replace direct `whatsappQueue.add()` calls with a shared `sendNotification(userId, key, vars)` dispatcher that routes to correct channel(s)
- `backend/src/lib/notification-dispatcher.ts` — the shared channel-routing function
- `backend/src/modules/sms-templates/sms-templates.service.test.ts`
- `backend/src/modules/sms-templates/sms-templates.test.ts`

---

### 1.6 — Client Birthday Automation

**Gap #42**

**What to build:**

- BullMQ repeatable job (cron `0 8 * * *` — 8am daily) that queries all customers whose `dateOfBirth` matches today (or today + N days if configured).
- Sends birthday message via `notification-dispatcher` (WhatsApp/SMS/email based on preference).
- ADMIN configures: message template, discount code/percentage, advance notice days (0 = on birthday, 3 = 3 days before).
- Birthday config stored in `StudioSettings` JSON.
- Feature flag `BIRTHDAY_AUTOMATION_ENABLED`.

**Files to create/modify:**
- `backend/src/jobs/birthday.job.ts` — BullMQ cron job definition
- `backend/src/jobs/index.ts` — register all jobs (create if not exists)
- `backend/prisma/seed.ts` — seed `BIRTHDAY_AUTOMATION_ENABLED` feature flag
- `backend/src/modules/settings/settings.schema.ts` — add birthday config fields
- `backend/src/jobs/birthday.job.test.ts` — unit test for date matching logic

---

### 1.7 — Automated Rebooking Nudges

**Gap #41**

**What to build:**

- When a booking is marked `COMPLETED`, schedule a delayed BullMQ job to fire after `service.rebookIntervalDays` days.
- On fire: check if the customer has already rebooked. If not, send rebooking nudge via `notification-dispatcher`.
- Message includes a deep link to the public booking widget: `{{bookingLink}}`.
- ADMIN can disable per-customer (`noRebookNudge Boolean @default(false)` on `User`).
- Feature flag `REBOOKING_NUDGES_ENABLED`.

**Files to create/modify:**
- `backend/src/jobs/rebook-nudge.job.ts`
- `backend/src/modules/bookings/bookings.service.ts` — on `COMPLETED` status transition, schedule job
- `backend/prisma/schema.prisma` — `noRebookNudge` on `User`
- `backend/src/jobs/rebook-nudge.job.test.ts`

---

### 1.8 — Recurring Bookings

**Gap #34**

**What to build:**

- `RecurringBooking` model: `id`, `tenantId`, `customerId`, `serviceId`, `artistId`, `intervalDays`, `nextBookingDate`, `isActive`.
- When a customer opts-in during booking creation (`recurring: true, intervalDays: N`), create a `RecurringBooking` record.
- BullMQ cron job (daily) checks `RecurringBooking` records where `nextBookingDate = today`. For each, auto-creates a new booking at the same service/artist/time slot (if available) and advances `nextBookingDate`.
- If the slot is unavailable, sends a nudge to the customer to manually rebook instead.
- ADMIN can view and cancel recurring schedules per customer.
- Feature flag `RECURRING_BOOKINGS_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `RecurringBooking` model
- `backend/src/modules/recurring-bookings/recurring-bookings.schema.ts`
- `backend/src/modules/recurring-bookings/recurring-bookings.service.ts`
- `backend/src/modules/recurring-bookings/recurring-bookings.controller.ts`
- `backend/src/modules/recurring-bookings/recurring-bookings.routes.ts` → `/api/recurring-bookings`
- `backend/src/jobs/recurring-booking.job.ts`
- `backend/src/modules/bookings/bookings.schema.ts` — add optional `recurring` + `intervalDays` fields
- `backend/src/modules/recurring-bookings/recurring-bookings.service.test.ts`
- `backend/src/modules/recurring-bookings/recurring-bookings.test.ts`

---

### 1.9 — Bulk Messaging Campaigns

**Gap #40**

**What to build:**

- `Campaign` model: `id`, `tenantId`, `name`, `channel` (SMS/WHATSAPP/EMAIL), `templateKey`, `audienceFilter` (JSON), `scheduledAt`, `status` (DRAFT/SCHEDULED/SENT/CANCELLED), `stats` (delivered, failed).
- Audience filter options: `ALL`, `INACTIVE_30_DAYS`, `BIRTHDAY_THIS_MONTH`, `TOP_SPENDERS`, `BY_SERVICE_TYPE`.
- `POST /api/campaigns` — create; `GET /api/campaigns` — list; `PATCH /api/campaigns/:id` — edit/schedule/cancel; `GET /api/campaigns/:id/stats` — delivery stats.
- BullMQ job processes scheduled campaigns at `scheduledAt` time: resolves audience, fans out individual message jobs per customer.
- Unsubscribe/opt-out: `unsubscribed Boolean @default(false)` on `User`. Any customer with `unsubscribed=true` is skipped.
- Feature flag `CAMPAIGNS_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `Campaign` model, `unsubscribed` on `User`
- `backend/src/modules/campaigns/campaigns.schema.ts`
- `backend/src/modules/campaigns/campaigns.service.ts`
- `backend/src/modules/campaigns/campaigns.controller.ts`
- `backend/src/modules/campaigns/campaigns.routes.ts`
- `backend/src/jobs/campaign.job.ts`
- `backend/src/modules/campaigns/campaigns.service.test.ts`
- `backend/src/modules/campaigns/campaigns.test.ts`
- `backend/src/app.ts` — mount at `/api/campaigns`

---

### Phase 1 Summary

| Step | Feature | New Files | Key Schema Changes |
|------|---------|-----------|-------------------|
| 1.1 | WA Templates DB-driven | 6 | none (model exists) |
| 1.2 | 10 new WA message types | seed + queue edits | none |
| 1.3 | Email Templates CRM API | 6 | seed new email types |
| 1.4 | Messages section API | 2 | `canManageMessages` on User |
| 1.5 | SMS channel | 8 | `SmsTemplate`, `notificationChannel` on User |
| 1.6 | Birthday automation | 3 | birthday config in StudioSettings |
| 1.7 | Rebooking nudges | 2 | `noRebookNudge` on User |
| 1.8 | Recurring bookings | 8 | `RecurringBooking` model |
| 1.9 | Bulk campaigns | 8 | `Campaign` model, `unsubscribed` on User |

**Prisma migrations needed:** 1 (covers all schema additions in Phase 1).  
**New test suites:** ~9 (one per step — service + integration).  
**New feature flags to seed:** `SMS_ENABLED`, `BIRTHDAY_AUTOMATION_ENABLED`, `REBOOKING_NUDGES_ENABLED`, `RECURRING_BOOKINGS_ENABLED`, `CAMPAIGNS_ENABLED`.

---

## 🔲 PHASE 2 — Booking Completeness
**Theme:** Public booking widget, deposit enforcement, no-show automation, and CRM alert system.  
**Dependencies:** Phase 1 (notification dispatcher, SMS channel, template system).

---

### 2.1 — Deposit-First Booking Enforcement

**Gap #16**

**What to build:**

- `DEPOSIT_ENABLED` feature flag (already seeded for some business types). When `true`:
  - `POST /api/bookings` creates booking in `AWAITING_DEPOSIT` status instead of `PENDING`.
  - A `PaymentIntent` for the deposit amount is created immediately (Stripe).
  - Booking only transitions to `CONFIRMED` when deposit `Payment` record exists with `status=SUCCEEDED`.
  - New booking status added to enum: `AWAITING_DEPOSIT`.
- Deposit config in `StudioSettings`: `depositAmountFlat` (£/€), `depositPercentage`, `depositMinThreshold`, `depositRefundOnCancellation` (boolean), `depositRequiredServiceTypes` (array of service type keys).
- `PATCH /api/settings` already handles StudioSettings — add new deposit config fields.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — add `AWAITING_DEPOSIT` to `BookingStatus` enum; add deposit fields to `StudioSettings`
- `backend/src/modules/bookings/bookings.service.ts` — deposit guard on `createBooking()`, `confirmDeposit()` method
- `backend/src/modules/bookings/bookings.schema.ts` — update
- `backend/src/modules/payments/payments.service.ts` — `confirmDeposit()` transitions booking to `CONFIRMED`
- `backend/src/modules/settings/settings.schema.ts` — add deposit config fields
- Relevant test files updated

---

### 2.2 — No-Show Charge Automation

**Gaps #20 / #49**

**What to build:**

- After a booking's scheduled `startTime` passes and it is still `CONFIRMED` (not checked-in / completed):
  - BullMQ delayed job is scheduled at booking creation time for `startTime + gracePeriodMinutes`.
  - On job fire: check booking status. If still `CONFIRMED`, mark as `NO_SHOW`, charge no-show fee via Stripe (card on file), send no-show follow-up message.
- New `BookingStatus` value: `NO_SHOW`.
- No-show config in `StudioSettings`: `noShowFeeAmount`, `noShowGracePeriodMinutes`, `noShowAutoCharge` (boolean — auto vs. manual review).
- Feature flag `NO_SHOW_AUTOMATION_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `NO_SHOW` to `BookingStatus` enum; no-show fields on `StudioSettings`
- `backend/src/jobs/no-show.job.ts` — BullMQ delayed job
- `backend/src/modules/bookings/bookings.service.ts` — schedule job on booking creation; `markNoShow()` method
- `backend/src/modules/payments/payments.service.ts` — no-show charge using saved payment method
- `backend/src/jobs/no-show.job.test.ts`

---

### 2.3 — Public Booking Widget / Embeddable Page

**Gap #19**

**What to build:**

This is the primary customer-facing acquisition tool. All endpoints are **public** (no JWT required), rate-limited (100 req/15min per IP), and CAPTCHA-validated (hCaptcha or Cloudflare Turnstile).

```
GET  /api/public/businesses/:slug           → public studio info (name, services, artists, settings)
GET  /api/public/businesses/:slug/services  → available services with prices
GET  /api/public/businesses/:slug/artists   → artists offering each service
GET  /api/public/businesses/:slug/slots     → available slots (date, serviceId, artistId)
POST /api/public/businesses/:slug/bookings  → create booking (anonymous customer)
GET  /api/public/bookings/:token            → customer checks their booking by token (no auth)
```

- `Tenant` gets a `slug` field (unique, URL-safe identifier e.g. `ink-masters-london`).
- Anonymous booking flow: customer provides `name`, `phone`, `email`. System creates `Customer` record if new (matched by phone).
- Booking confirmation token: UUID, stored on `Booking.publicToken`, returned to customer. Used for self-service lookup/cancellation.
- Deposit step: if `DEPOSIT_ENABLED`, the booking response includes a Stripe `PaymentIntent.clientSecret` for the customer to complete payment in the widget.
- Rate limiting, CAPTCHA middleware applied to all public routes.
- Feature flag `PUBLIC_BOOKING_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `slug` on `Tenant`, `publicToken` on `Booking`
- `backend/src/middleware/rate-limit.ts`
- `backend/src/middleware/captcha.ts`
- `backend/src/modules/public/public.schema.ts`
- `backend/src/modules/public/public.service.ts`
- `backend/src/modules/public/public.controller.ts`
- `backend/src/modules/public/public.routes.ts`
- `backend/src/modules/public/public.service.test.ts`
- `backend/src/modules/public/public.test.ts`
- `backend/src/app.ts` — mount `/api/public` (no auth middleware on this router)

---

### 2.4 — Social Media "Book Now" Integration

**Gap #32**

**What to build:**

- Generate a permanent shareable booking URL per business: `https://book.yourplatform.com/{slug}` (or relative `/book/{slug}`).
- Booking source attribution: `source` field on `Booking` — `DIRECT | INSTAGRAM | FACEBOOK | WIDGET | POS | REFERRAL`.
- Meta Business API integration: generate a Meta-formatted booking link (`fb.me/book/{page-id}`) that points to the public booking URL with `?source=facebook` UTM.
- Track `source` in analytics.
- Feature flag `SOCIAL_BOOKING_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `source` enum on `Booking`
- `backend/src/modules/public/public.service.ts` — tag `source` from query param on booking creation
- `backend/src/modules/social/social.service.ts` — generate Meta booking link URL
- `backend/src/modules/social/social.routes.ts` → `GET /api/social/booking-link`
- `backend/src/modules/social/social.test.ts`

---

### 2.5 — CRM Warning & Alert System (Backend Data Support)

**Gap #50**

**What to build:**

The frontend CRM will render warning banners. The backend must expose a single **alerts endpoint** that returns all active warnings for a given context (booking, customer, or global dashboard).

```
GET /api/alerts/booking/:id     → warnings for a specific booking
GET /api/alerts/customer/:id    → warnings for a customer
GET /api/alerts/dashboard       → global admin alerts (low stock, failed payments, etc.)
```

Each alert has: `type` (HEALTH_FLAG | DEPOSIT_PENDING | OVERDUE_INVOICE | WAITLIST_MATCH | REBOOK_DUE | LOW_STOCK | NO_SHOW_TIMER | CARD_NOT_ON_FILE | SUBSCRIPTION_FAILED | BIRTHDAY_TODAY), `severity` (RED | AMBER | GREEN), `message`, `entityId`, `entityType`.

**Files to create/modify:**
- `backend/src/modules/alerts/alerts.service.ts` — aggregates warnings from all sources
- `backend/src/modules/alerts/alerts.controller.ts`
- `backend/src/modules/alerts/alerts.routes.ts`
- `backend/src/modules/alerts/alerts.service.test.ts`
- `backend/src/modules/alerts/alerts.test.ts`
- `backend/src/app.ts` — mount `/api/alerts`

---

### Phase 2 Summary

| Step | Feature | New Files | Key Schema Changes |
|------|---------|-----------|-------------------|
| 2.1 | Deposit enforcement | 0 new (modify existing) | `AWAITING_DEPOSIT` status, deposit fields on StudioSettings |
| 2.2 | No-show automation | 2 | `NO_SHOW` status, no-show fields on StudioSettings |
| 2.3 | Public booking widget | 8 | `slug` on Tenant, `publicToken` on Booking |
| 2.4 | Social booking | 3 | `source` enum on Booking |
| 2.5 | CRM alerts API | 5 | none |

**Feature flags to seed:** `PUBLIC_BOOKING_ENABLED`, `SOCIAL_BOOKING_ENABLED`, `NO_SHOW_AUTOMATION_ENABLED`.

---

## 🔲 PHASE 3 — Customer Profile & Safety
**Theme:** Customer data enrichment — health flags, consent forms, photos, LTV, referrals.  
**Dependencies:** Phase 0 (tenantId), Phase 2 (booking source for referral attribution).

---

### 3.1 — Allergy / Health Flags

**Gap #44**

**What to build:**

- `HealthFlag` model: `id`, `customerId`, `tenantId`, `type` (enum: `LATEX_ALLERGY | BLOOD_THINNERS | SKIN_CONDITION | PREGNANCY | EPILEPSY | PACEMAKER | PRODUCT_SENSITIVITY | OTHER`), `notes`, `severity` (HIGH | MEDIUM), `confirmedAt`, `confirmedBy`.
- `GET /api/customers/:id/health-flags`, `POST /api/customers/:id/health-flags`, `DELETE /api/customers/:id/health-flags/:flagId`.
- The Alerts service (Phase 2.5) checks health flags when returning `GET /api/alerts/booking/:id` — returns `HEALTH_FLAG` alert if customer has any active flags.
- Feature flag `HEALTH_FLAGS_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `HealthFlag` model, `HealthFlagType` enum
- `backend/src/modules/customers/health-flags.schema.ts`
- `backend/src/modules/customers/health-flags.service.ts`
- `backend/src/modules/customers/health-flags.controller.ts`
- Routes mounted on `/api/customers/:id/health-flags`
- `backend/src/modules/customers/health-flags.service.test.ts`
- `backend/src/modules/customers/health-flags.test.ts`

---

### 3.2 — Intake / Consent Forms

**Gap #31**

**What to build:**

- `Form` model: `id`, `tenantId`, `name`, `serviceTypes` (array — which services require it), `fields` (JSON array of field definitions), `isActive`.
- `FormField` types: `text`, `checkbox`, `dropdown`, `date`, `signature`.
- `FormResponse` model: `id`, `formId`, `bookingId`, `customerId`, `answers` (JSON), `completedAt`.
- When `INTAKE_FORMS_ENABLED` and a booking is created for a service that has a required form: booking status set to `AWAITING_FORM` until form is submitted.
- Public endpoint: `GET /api/public/forms/:bookingToken` (retrieve form), `POST /api/public/forms/:bookingToken` (submit answers). No auth required.
- ADMIN endpoints: `GET/POST/PATCH/DELETE /api/forms`.
- Feature flag `INTAKE_FORMS_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `Form`, `FormResponse` models; `AWAITING_FORM` to `BookingStatus`
- `backend/src/modules/forms/forms.schema.ts`
- `backend/src/modules/forms/forms.service.ts`
- `backend/src/modules/forms/forms.controller.ts`
- `backend/src/modules/forms/forms.routes.ts`
- `backend/src/modules/public/public.routes.ts` — add form public endpoints
- `backend/src/modules/forms/forms.service.test.ts`
- `backend/src/modules/forms/forms.test.ts`

---

### 3.3 — Before / After Photos Per Booking

**Gap #37**

**What to build:**

- `BookingPhoto` model: `id`, `bookingId`, `tenantId`, `url`, `type` (BEFORE | AFTER), `uploadedBy` (artistId), `uploadedAt`.
- `POST /api/bookings/:id/photos` — artist uploads a before or after photo (multipart, stored via Cloudinary).
- `GET /api/bookings/:id/photos` — ADMIN/artist view all photos for a booking.
- `GET /api/artists/:id/portfolio` — public or artist view of all `AFTER` photos (portfolio gallery).
- Feature flag `BOOKING_PHOTOS_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `BookingPhoto` model
- `backend/src/modules/bookings/booking-photos.service.ts`
- `backend/src/modules/bookings/booking-photos.controller.ts`
- Routes added to existing `bookings.routes.ts`
- `backend/src/modules/bookings/booking-photos.service.test.ts`

---

### 3.4 — Customer LTV / Spend History

**Gap #39**

**What to build:**

- No new model needed — computed from existing `Payment` and `Booking` records.
- `GET /api/customers/:id/stats` → returns: `totalSpend`, `visitCount`, `lastVisitDate`, `firstVisitDate`, `averageSpend`, `mostBookedService`, `mostBookedArtist`.
- `GET /api/customers?sortBy=ltv&minSpend=X&lastVisitBefore=Y` — ADMIN filtered customer list with LTV data.
- A `CustomerStats` computed view can be cached in Redis (`customer_stats:{tenantId}:{customerId}`, TTL 1 hour).

**Files to create/modify:**
- `backend/src/modules/customers/customer-stats.service.ts`
- `backend/src/modules/customers/customers.controller.ts` — add `/stats` endpoint
- `backend/src/modules/customers/customer-stats.service.test.ts`

---

### 3.5 — Customer Referral Tracking

**Gap #43**

**What to build:**

- `Referral` model: `id`, `tenantId`, `referrerId` (Customer), `refereeId` (Customer), `referralCode` (unique), `rewardIssued` (boolean), `rewardAmount`, `createdAt`.
- `referralCode` on `User` — unique short code generated on account creation.
- Public booking widget accepts `?ref=CODE` query param — on new customer creation, links to referrer.
- Reward trigger: when referee completes first booking, issue reward to referrer (credit or discount code) and send notification.
- ADMIN configures: referrer reward type/amount, referee discount, via `StudioSettings`.
- Feature flag `REFERRALS_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `Referral` model, `referralCode` on `User`
- `backend/src/modules/referrals/referrals.service.ts`
- `backend/src/modules/referrals/referrals.controller.ts`
- `backend/src/modules/referrals/referrals.routes.ts` → `/api/referrals`
- `backend/src/modules/public/public.service.ts` — handle `?ref=CODE` on anonymous booking
- `backend/src/modules/referrals/referrals.service.test.ts`
- `backend/src/modules/referrals/referrals.test.ts`

---

### Phase 3 Summary

| Step | Feature | New Files | Key Schema Changes |
|------|---------|-----------|-------------------|
| 3.1 | Health flags | 6 | `HealthFlag` model |
| 3.2 | Intake / consent forms | 8 | `Form`, `FormResponse` models; `AWAITING_FORM` status |
| 3.3 | Before/after photos | 4 | `BookingPhoto` model |
| 3.4 | Customer LTV | 2 | none |
| 3.5 | Referral tracking | 6 | `Referral` model, `referralCode` on User |

**Feature flags to seed:** `HEALTH_FLAGS_ENABLED`, `INTAKE_FORMS_ENABLED`, `BOOKING_PHOTOS_ENABLED`, `REFERRALS_ENABLED`.

---

## 🔲 PHASE 4 — Financial & POS
**Theme:** Revenue, payments, tips, gift cards, inventory, POS mode, payroll, analytics.  
**Dependencies:** Phase 0 (Stripe + tenantId), Phase 1 (notification dispatcher), Phase 3 (customer LTV).

---

### 4.1 — Tip Collection at Checkout

**Gap #24**

**What to build:**

- `tipAmount Decimal?` field added to `Payment` model.
- Online checkout: after service payment, customer is prompted with tip options (10%, 15%, 20%, custom). Tip is added to `PaymentIntent` amount.
- POS mode: same tip options at in-person checkout.
- Tips tracked separately in analytics and payroll.
- Feature flag `TIPS_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `tipAmount` on `Payment`
- `backend/src/modules/payments/payments.service.ts` — include tip in `createPaymentIntent()`
- `backend/src/modules/payments/payments.schema.ts` — optional `tipAmount`
- Migration

---

### 4.2 — Gift Cards / Vouchers

**Gap #25**

**What to build:**

- `GiftCard` model: `id`, `tenantId`, `code` (unique, alphanumeric, 12 chars), `originalValue`, `currentBalance`, `issuedTo` (email), `purchasedBy` (customerId?), `expiresAt`, `isRedeemed`, `createdAt`.
- `POST /api/gift-cards` — create/sell a gift card (online or POS).
- `GET /api/gift-cards/:code` — check balance (public endpoint).
- Checkout redemption: customer enters gift card code; `currentBalance` is deducted from invoice total. Partial use supported (remaining balance stays on card).
- Feature flag `GIFT_CARDS_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `GiftCard` model
- `backend/src/modules/gift-cards/gift-cards.schema.ts`
- `backend/src/modules/gift-cards/gift-cards.service.ts`
- `backend/src/modules/gift-cards/gift-cards.controller.ts`
- `backend/src/modules/gift-cards/gift-cards.routes.ts`
- `backend/src/modules/payments/payments.service.ts` — apply gift card at checkout
- `backend/src/modules/gift-cards/gift-cards.service.test.ts`
- `backend/src/modules/gift-cards/gift-cards.test.ts`

---

### 4.3 — Product / Inventory Management

**Gap #27**

**What to build:**

- `Product` model: `id`, `tenantId`, `name`, `sku`, `price`, `stockLevel`, `lowStockThreshold`, `category`, `imageUrl`, `isActive`.
- `StockMovement` model: `id`, `productId`, `tenantId`, `quantity` (positive=in, negative=out), `reason` (SALE | ADJUSTMENT | RESTOCK), `bookingId?`, `createdAt`.
- CRUD: `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/:id`.
- Products can be sold standalone or bundled with a service at checkout.
- `PATCH /api/products/:id/stock` — restock adjustment.
- Alerts service returns `LOW_STOCK` alert when `stockLevel ≤ lowStockThreshold`.
- Feature flag `INVENTORY_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `Product`, `StockMovement` models
- `backend/src/modules/products/products.schema.ts`
- `backend/src/modules/products/products.service.ts`
- `backend/src/modules/products/products.controller.ts`
- `backend/src/modules/products/products.routes.ts`
- `backend/src/modules/products/products.service.test.ts`
- `backend/src/modules/products/products.test.ts`

---

### 4.4 — POS Mode

**Gap #28**

**What to build:**

- POS is a backend API mode (the CRM frontend renders it as a "POS" tab). Staff create a walk-in booking + add products + apply discounts/vouchers/gift cards + take tip + process payment — all in one flow.
- `POST /api/pos/checkout` — creates walk-in booking, processes all line items, applies discounts, charges Stripe (or records cash).
  - Body: `{ customerId?, name?, phone?, email?, serviceId, artistId, products: [{productId, qty}], giftCardCode?, discountCode?, tipAmount?, paymentMethod: 'CARD'|'CASH' }`.
  - Returns: booking record, payment record, receipt data.
- `GET /api/pos/receipt/:paymentId` — generate receipt (JSON or PDF).
- `POST /api/pos/cash-payment` — record cash payment (no Stripe, just internal tracking).
- Feature flag `POS_ENABLED`.

**Files to create/modify:**
- `backend/src/modules/pos/pos.schema.ts`
- `backend/src/modules/pos/pos.service.ts`
- `backend/src/modules/pos/pos.controller.ts`
- `backend/src/modules/pos/pos.routes.ts`
- `backend/src/modules/pos/pos.service.test.ts`
- `backend/src/modules/pos/pos.test.ts`
- `backend/src/app.ts` — mount `/api/pos`

---

### 4.5 — Stripe Terminal / Card Reader Support

**Gap #29**

**What to build:**

- Integrate Stripe Terminal SDK (`@stripe/terminal-js` on frontend; `stripe.terminal.readers` on backend).
- `GET /api/pos/terminal/connection-token` — generates a Stripe Terminal connection token for the frontend SDK.
- `POST /api/pos/terminal/payment-intent` — creates a Stripe PaymentIntent for Terminal capture.
- POS `checkout` flow: if `paymentMethod = 'TERMINAL'`, use Terminal capture path instead of standard Stripe charge.
- Feature flag `STRIPE_TERMINAL_ENABLED`.

**Files to create/modify:**
- `backend/src/lib/stripe.ts` — add terminal connection token and reader payment methods
- `backend/src/modules/pos/pos.service.ts` — add terminal payment path
- `backend/src/modules/pos/pos.routes.ts` — add terminal endpoints

---

### 4.6 — Staff Payroll & Commission Tracking

**Gap #30**

**What to build:**

- `PayrollConfig` on artist: `basePay` (hourly rate or daily), `serviceCommissionPct` (% of service revenue), `productCommissionPct` (% of product sales).
- `PayrollReport` model: `id`, `tenantId`, `artistId`, `periodStart`, `periodEnd`, `basePay`, `serviceCommission`, `productCommission`, `totalTips`, `totalPay`, `generatedAt`.
- `POST /api/payroll/generate` (ADMIN) — generates payroll report for a date range. Calculates from `Booking`, `Payment`, `StockMovement` records.
- `GET /api/payroll/reports` — list reports. `GET /api/payroll/reports/:id` — download CSV.
- `GET /api/payroll/my-earnings` (ARTIST) — artist self-service earnings view.
- Feature flag `PAYROLL_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `PayrollConfig` on `Artist`, `PayrollReport` model
- `backend/src/modules/payroll/payroll.schema.ts`
- `backend/src/modules/payroll/payroll.service.ts`
- `backend/src/modules/payroll/payroll.controller.ts`
- `backend/src/modules/payroll/payroll.routes.ts`
- `backend/src/modules/payroll/payroll.service.test.ts`
- `backend/src/modules/payroll/payroll.test.ts`

---

### 4.7 — Profit Tracking / Analytics Dashboard

**Gap #17**

**What to build:**

- `GET /api/analytics/revenue` — total revenue by period (day/week/month/year), with filters: `artistId`, `serviceId`, `dateFrom`, `dateTo`.
- `GET /api/analytics/artists` — revenue, commission, bookings per artist.
- `GET /api/analytics/services` — revenue per service type.
- `GET /api/analytics/bookings` — booking volume, cancellation rate, no-show rate, average booking value.
- `GET /api/analytics/customers` — new vs. returning customers, top spenders, LTV distribution.
- All endpoints return data suitable for rendering charts (grouped time-series arrays).
- All computed from existing `Payment`, `Booking`, `User` records — no new models needed.
- Results cached in Redis (TTL 15 minutes per tenant + date range hash).
- Feature flag `ANALYTICS_ENABLED`.

**Files to create/modify:**
- `backend/src/modules/analytics/analytics.service.ts`
- `backend/src/modules/analytics/analytics.controller.ts`
- `backend/src/modules/analytics/analytics.routes.ts`
- `backend/src/modules/analytics/analytics.service.test.ts`
- `backend/src/modules/analytics/analytics.test.ts`
- `backend/src/app.ts` — mount `/api/analytics`

---

### 4.8 — Artist Personal Performance Dashboard

**Gap #47**

**What to build:**

- `GET /api/analytics/my-performance` (ARTIST role) — artist self-service stats:
  - Total revenue, revenue by service, revenue by month, tip totals.
  - Repeat customer rate, average rating (from reviews), average tip.
  - Busiest hours/days (heatmap data), most/least popular services.
  - Comparison vs. previous period (delta values).
- Scoped strictly to the calling artist's `artistId` — cannot see other artists' data.
- Feature flag `ANALYTICS_ENABLED` (same flag as admin analytics).

**Files to create/modify:**
- `backend/src/modules/analytics/analytics.service.ts` — add `getArtistPerformance(artistId)` method
- `backend/src/modules/analytics/analytics.controller.ts` — add `/my-performance` route
- `backend/src/modules/analytics/analytics.service.test.ts` — add tests

---

### Phase 4 Summary

| Step | Feature | New Files | Key Schema Changes |
|------|---------|-----------|-------------------|
| 4.1 | Tips | 0 new | `tipAmount` on Payment |
| 4.2 | Gift cards | 8 | `GiftCard` model |
| 4.3 | Inventory | 8 | `Product`, `StockMovement` models |
| 4.4 | POS mode | 6 | none |
| 4.5 | Stripe Terminal | 0 new | none |
| 4.6 | Payroll | 7 | `PayrollConfig` on Artist, `PayrollReport` model |
| 4.7 | Analytics dashboard | 5 | none |
| 4.8 | Artist performance | 0 new | none |

**Feature flags to seed:** `TIPS_ENABLED`, `GIFT_CARDS_ENABLED`, `INVENTORY_ENABLED`, `POS_ENABLED`, `STRIPE_TERMINAL_ENABLED`, `PAYROLL_ENABLED`, `ANALYTICS_ENABLED`.

---

## 🔲 PHASE 5 — Packages, Loyalty & Retention
**Theme:** Repeat business, customer retention, recurring revenue.  
**Dependencies:** Phase 0, Phase 4 (Stripe, payments), Phase 1 (notification dispatcher).

---

### 5.1 — Service Packages / Bundles

**Gap #22**

**What to build:**

- `Package` model: `id`, `tenantId`, `name`, `description`, `price`, `includedServices` (JSON array of serviceId + quantity), `totalUses`, `expiryDays`, `isActive`.
- `CustomerPackage` model: `id`, `customerId`, `packageId`, `tenantId`, `remainingUses`, `purchasedAt`, `expiresAt`.
- Purchase: `POST /api/packages/:id/purchase` — creates `CustomerPackage`, charges via Stripe.
- Usage: when booking a service that is in a package the customer holds, system deducts 1 use automatically.
- `GET /api/customers/:id/packages` — ADMIN view. `GET /api/me/packages` — customer portal view.
- Feature flag `PACKAGES_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `Package`, `CustomerPackage` models
- `backend/src/modules/packages/packages.schema.ts`
- `backend/src/modules/packages/packages.service.ts`
- `backend/src/modules/packages/packages.controller.ts`
- `backend/src/modules/packages/packages.routes.ts`
- `backend/src/modules/bookings/bookings.service.ts` — deduct package use on booking creation
- `backend/src/modules/packages/packages.service.test.ts`
- `backend/src/modules/packages/packages.test.ts`

---

### 5.2 — Memberships / Subscriptions

**Gap #23**

**What to build:**

- `Membership` model: `id`, `tenantId`, `name`, `price`, `billingInterval` (MONTHLY | ANNUAL), `includedServices` (JSON), `usageLimit` (null = unlimited), `isActive`.
- `CustomerMembership` model: `id`, `customerId`, `membershipId`, `stripeSubscriptionId`, `status` (ACTIVE | CANCELLED | PAST_DUE), `currentPeriodEnd`.
- Stripe Subscriptions used for billing. Webhook handler for `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.
- When booking, if customer has an active membership that covers the service, no payment required (or discounted).
- Alerts service returns `SUBSCRIPTION_FAILED` alert when `status = PAST_DUE`.
- Feature flag `MEMBERSHIPS_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `Membership`, `CustomerMembership` models
- `backend/src/modules/memberships/memberships.schema.ts`
- `backend/src/modules/memberships/memberships.service.ts`
- `backend/src/modules/memberships/memberships.controller.ts`
- `backend/src/modules/memberships/memberships.routes.ts`
- `backend/src/modules/payments/stripe-webhooks.ts` — add subscription webhook handlers
- `backend/src/modules/bookings/bookings.service.ts` — membership coverage check
- `backend/src/modules/memberships/memberships.service.test.ts`
- `backend/src/modules/memberships/memberships.test.ts`

---

### 5.3 — Loyalty / Points Program

**Gap #26**

**What to build:**

- `LoyaltyAccount` model: `id`, `customerId`, `tenantId`, `points`, `tier` (BRONZE | SILVER | GOLD), `totalEarned`.
- `LoyaltyTransaction` model: `id`, `loyaltyAccountId`, `points` (positive=earned, negative=redeemed), `reason`, `bookingId?`, `createdAt`.
- Points earned: configurable rate in `StudioSettings` (e.g. 1 point per £1 spent, or 10 points per visit).
- Points redeemed: customer can apply points as a discount at checkout (ADMIN sets redemption rate, e.g. 100 points = £1).
- Tier thresholds configurable in `StudioSettings`.
- Send loyalty notification on earn and on tier upgrade.
- `GET /api/me/loyalty` — customer portal. `GET /api/customers/:id/loyalty` — ADMIN view.
- Feature flag `LOYALTY_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `LoyaltyAccount`, `LoyaltyTransaction` models
- `backend/src/modules/loyalty/loyalty.service.ts`
- `backend/src/modules/loyalty/loyalty.controller.ts`
- `backend/src/modules/loyalty/loyalty.routes.ts`
- `backend/src/modules/bookings/bookings.service.ts` — award points on COMPLETED
- `backend/src/modules/payments/payments.service.ts` — redeem points at checkout
- `backend/src/modules/loyalty/loyalty.service.test.ts`
- `backend/src/modules/loyalty/loyalty.test.ts`

---

### 5.4 — Smart Waitlist Matching

**Gap #46**

**What to build:**

- Upgrade existing `Waitlist` module. When a booking is cancelled:
  - Query waitlist for entries matching: `serviceId = booking.serviceId`, `tenantId`, optional `artistId`, date range overlap, `timePreference` match.
  - Rank matches by: exact artist match > service-only match > date proximity > entry timestamp.
  - Send immediate notification to top match with a time-limited booking link (token expires in `matchWindowMinutes`).
  - If no response within window, notify next match. Continue until slot is filled or waitlist exhausted.
- `matchWindowMinutes` configurable in `StudioSettings`.
- `WaitlistEntry` model gets new fields: `timePreference` (MORNING | AFTERNOON | EVENING | ANY), `expiresAt`, `notifiedAt`, `notificationExpiry`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — new fields on `WaitlistEntry`
- `backend/src/modules/waitlist/waitlist.service.ts` — `matchAndNotify()` method
- `backend/src/modules/bookings/bookings.service.ts` — call `matchAndNotify()` on cancellation
- `backend/src/jobs/waitlist-match.job.ts` — delayed job for notification expiry + next-match retry
- `backend/src/modules/waitlist/waitlist.service.test.ts` — add matching tests

---

### Phase 5 Summary

| Step | Feature | New Files | Key Schema Changes |
|------|---------|-----------|-------------------|
| 5.1 | Packages | 8 | `Package`, `CustomerPackage` models |
| 5.2 | Memberships | 9 | `Membership`, `CustomerMembership` models |
| 5.3 | Loyalty | 8 | `LoyaltyAccount`, `LoyaltyTransaction` models |
| 5.4 | Smart waitlist | 2 | fields on `WaitlistEntry` |

**Feature flags to seed:** `PACKAGES_ENABLED`, `MEMBERSHIPS_ENABLED`, `LOYALTY_ENABLED`.

---

## 🔲 PHASE 6 — Staff & HR
**Theme:** Staff-facing tools — rota, mobile app, services section, media management.  
**Dependencies:** Phase 0, Phase 4 (payroll for rota integration).

---

### 6.1 — Staff Rota / Shift Scheduling

**Gap #21**

**What to build:**

- `Shift` model: `id`, `tenantId`, `artistId`, `dayOfWeek` (0–6), `startTime` (HH:MM), `endTime`, `isRecurring`, `effectiveFrom`, `effectiveUntil?`.
- `ShiftOverride` model: `id`, `shiftId`, `date`, `startTime?`, `endTime?`, `isOff` (boolean — marked as day off).
- ADMIN CRUD: `GET/POST /api/rota/shifts`, `GET/PATCH/DELETE /api/rota/shifts/:id`.
- Override: `POST /api/rota/shifts/:id/override` for one-off changes.
- `GET /api/rota/week?from=YYYY-MM-DD` — returns all artists' schedules for the week (rota grid).
- Availability calculation updated to use rota shifts as the primary source of truth (availability blocks become overrides).
- Feature flag `ROTA_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `Shift`, `ShiftOverride` models
- `backend/src/modules/rota/rota.schema.ts`
- `backend/src/modules/rota/rota.service.ts`
- `backend/src/modules/rota/rota.controller.ts`
- `backend/src/modules/rota/rota.routes.ts`
- `backend/src/modules/artists/artists.service.ts` — update availability logic to check rota
- `backend/src/modules/rota/rota.service.test.ts`
- `backend/src/modules/rota/rota.test.ts`

---

### 6.2 — Staff Mobile App (PWA API Support)

**Gap #36**

**What to build:**

The backend APIs mostly exist. What is needed:

- **Push Notifications** — integrate **Web Push** (VAPID) or **Firebase Cloud Messaging** (FCM) for push notifications to artist PWA.
- `PushSubscription` model: `id`, `userId`, `endpoint`, `p256dh`, `auth`, `tenantId`.
- `POST /api/push/subscribe` — artist registers their push subscription.
- `DELETE /api/push/subscribe` — unsubscribe.
- Push trigger points: new booking assigned to artist, booking cancelled, booking rescheduled, new message from customer.
- `GET /api/artists/me/schedule` — artist's daily/weekly bookings (already partially covered by existing APIs, consolidate into one efficient endpoint).
- `GET /api/artists/me/schedule?date=YYYY-MM-DD` — single day view.
- `PATCH /api/bookings/:id/status` — artist can mark a booking as COMPLETED or NO_SHOW from mobile.
- Feature flag `STAFF_APP_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `PushSubscription` model
- `backend/src/lib/push-notifications.ts` — Web Push / FCM sender
- `backend/src/modules/push/push.service.ts`
- `backend/src/modules/push/push.routes.ts`
- `backend/src/modules/artists/artists.service.ts` — add `getMySchedule()` method
- `backend/src/modules/artists/artists.controller.ts` — add `GET /api/artists/me/schedule`
- `backend/src/modules/push/push.service.test.ts`

---

### 6.3 — CRM Services Section

**Gap #9**

**What to build:**

- Full CRUD for services (the `Service` model already exists in the schema).
- Existing `PUT /api/artists/:id/services` sets which services an artist offers.
- What is missing: a CRM management section for defining the service catalogue.
- `GET /api/services` — list all services for the tenant (name, description, price, duration, businessType filter).
- `POST /api/services` — ADMIN creates a new service.
- `PATCH /api/services/:id` — edit service name, description, price, duration, rebookIntervalDays, businessType tags.
- `DELETE /api/services/:id` — deactivate (soft delete, `isActive: false`).
- `GET /api/services/:id/artists` — which artists offer this service.

**Files to create/modify:**
- `backend/src/modules/services/services.schema.ts`
- `backend/src/modules/services/services.service.ts`
- `backend/src/modules/services/services.controller.ts`
- `backend/src/modules/services/services.routes.ts`
- `backend/src/modules/services/services.service.test.ts`
- `backend/src/modules/services/services.test.ts`
- `backend/src/app.ts` — mount `/api/services`

---

### 6.4 — CRM Artist Media Management

**Gap #10**

**What to build:**

- `GET /api/artists/:id/media` — list all media (profile photo, portfolio images).
- `POST /api/artists/:id/media` — upload new image (multipart → Cloudinary). Returns `{url, publicId, type}`.
- `DELETE /api/artists/:id/media/:publicId` — remove from Cloudinary and DB.
- `PATCH /api/artists/:id/profile-photo` — set which uploaded image is the profile photo.
- `ArtistMedia` model: `id`, `artistId`, `tenantId`, `url`, `cloudinaryPublicId`, `type` (PROFILE | PORTFOLIO), `sortOrder`, `uploadedAt`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `ArtistMedia` model
- `backend/src/modules/artists/artist-media.service.ts`
- `backend/src/modules/artists/artist-media.controller.ts`
- Routes mounted on `artists.routes.ts`
- `backend/src/modules/artists/artist-media.service.test.ts`

---

### Phase 6 Summary

| Step | Feature | New Files | Key Schema Changes |
|------|---------|-----------|-------------------|
| 6.1 | Staff rota | 8 | `Shift`, `ShiftOverride` models |
| 6.2 | Staff mobile PWA | 7 | `PushSubscription` model |
| 6.3 | CRM Services section | 6 | none (model exists) |
| 6.4 | Artist media | 4 | `ArtistMedia` model |

**Feature flags to seed:** `ROTA_ENABLED`, `STAFF_APP_ENABLED`.

---

## 🔲 PHASE 7 — Calendar & Integration Expansion
**Theme:** Outlook and Apple Calendar sync alongside existing Google Calendar.  
**Dependencies:** Phase 0, existing Google Calendar module (Step 1.28).

---

### 7.1 — Outlook Calendar Sync

**Gap #35**

**What to build:**

- Microsoft Graph API OAuth 2.0 flow (same pattern as Google Calendar).
- `GET /api/calendar/outlook/auth-url` — returns Microsoft OAuth URL.
- `GET /api/calendar/outlook/callback` — handles redirect, stores `microsoftAccessToken`, `microsoftRefreshToken` on `Artist`.
- `GET /api/calendar/outlook/status` — check if connected.
- `DELETE /api/calendar/outlook/disconnect` — revoke.
- `syncCreateEvent()`, `syncUpdateEvent()`, `syncDeleteEvent()` in `lib/outlook-calendar.ts` — called from `bookings.service.ts` alongside Google Calendar calls.
- Feature flag `OUTLOOK_CALENDAR_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `microsoftAccessToken`, `microsoftRefreshToken` on `Artist`
- `backend/src/lib/outlook-calendar.ts`
- `backend/src/modules/calendar/outlook-calendar.service.ts`
- `backend/src/modules/calendar/calendar.routes.ts` — add Outlook endpoints
- `backend/src/modules/bookings/bookings.service.ts` — call Outlook sync methods
- `backend/src/modules/calendar/outlook-calendar.service.test.ts`

---

### 7.2 — Apple iCloud Calendar Sync

**Gap #35**

**What to build:**

- CalDAV protocol (RFC 4791) used by Apple iCloud Calendar.
- `GET /api/calendar/apple/auth-url` — returns Apple Sign In OAuth URL.
- Apple calendar sync: `lib/apple-calendar.ts` — CalDAV client using the `tsdav` library.
- Same sync behaviour: create/update/delete `.ics` events on the artist's iCloud calendar.
- `appleCalDAVUrl`, `appleCalDAVToken` stored on `Artist`.
- Feature flag `APPLE_CALENDAR_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `appleCalDAVUrl`, `appleCalDAVToken` on `Artist`
- `backend/src/lib/apple-calendar.ts`
- `backend/src/modules/calendar/apple-calendar.service.ts`
- `backend/src/modules/calendar/calendar.routes.ts` — add Apple endpoints
- `backend/src/modules/bookings/bookings.service.ts` — call Apple sync methods
- `backend/src/modules/calendar/apple-calendar.service.test.ts`

---

### Phase 7 Summary

| Step | Feature | New Files | Key Schema Changes |
|------|---------|-----------|-------------------|
| 7.1 | Outlook Calendar | 4 | `microsoftAccessToken`, `microsoftRefreshToken` on Artist |
| 7.2 | Apple iCloud Calendar | 4 | `appleCalDAVUrl`, `appleCalDAVToken` on Artist |

**Feature flags to seed:** `OUTLOOK_CALENDAR_ENABLED`, `APPLE_CALENDAR_ENABLED`.  
**npm packages needed:** `@microsoft/microsoft-graph-client`, `tsdav` (CalDAV).

---

## 🔲 PHASE 8 — Advanced Intelligence
**Theme:** AI-powered features and dynamic pricing.  
**Dependencies:** All previous phases (Phase 8 requires rich customer + booking data to be meaningful).

---

### 8.1 — Dynamic / Surge Pricing

**Gap #45**

**What to build:**

- `PricingRule` model: `id`, `tenantId`, `serviceId?` (null = all), `ruleType` (PEAK | OFF_PEAK | SEASONAL | DEMAND), `daysOfWeek` (array), `startTime`, `endTime`, `dateFrom?`, `dateTo?`, `adjustmentType` (PERCENTAGE | FLAT), `adjustmentValue` (positive=surcharge, negative=discount), `priority`.
- `GET /api/pricing-rules` — list rules. `POST/PATCH/DELETE /api/pricing-rules/:id` — manage rules.
- Price calculation: `calculatePrice(serviceId, slotDateTime, tenantId)` — applies all matching rules in priority order.
- Public booking widget (Phase 2.3) calls `calculatePrice()` when displaying slot prices — the price shown at booking time is locked in on the `Booking` record.
- Revenue analytics (Phase 4.7) shows dynamic pricing impact.
- Feature flag `DYNAMIC_PRICING_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `PricingRule` model
- `backend/src/lib/pricing-engine.ts` — `calculatePrice()` pure function, fully testable
- `backend/src/modules/pricing/pricing.schema.ts`
- `backend/src/modules/pricing/pricing.service.ts`
- `backend/src/modules/pricing/pricing.controller.ts`
- `backend/src/modules/pricing/pricing.routes.ts`
- `backend/src/modules/public/public.service.ts` — use pricing engine for slot prices
- `backend/src/lib/pricing-engine.test.ts` — comprehensive unit tests for all rule combinations
- `backend/src/modules/pricing/pricing.test.ts`

---

### 8.2 — AI-Powered Booking Suggestions

**Gap #48**

**What to build:**

- Post-booking-completion: schedule a BullMQ job to generate an AI suggestion for the customer.
- Job calls OpenAI `gpt-4o-mini` (cost-effective, ~$0.01/suggestion) with: customer booking history (last 5 bookings), service catalogue, artist availability summary.
- System prompt: instructs the model to return a short personalised rebooking or upsell suggestion message (1–2 sentences max) and the recommended service/slot.
- The suggestion is stored in `AISuggestion` model and optionally auto-sent via `notification-dispatcher`, or queued for ADMIN review before sending.
- `GET /api/ai/suggestions` — ADMIN views pending suggestions. `POST /api/ai/suggestions/:id/send` — approve and send.
- ADMIN configures: auto-send vs. manual-review, OpenAI API key.
- Feature flag `AI_SUGGESTIONS_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `AISuggestion` model
- `backend/src/lib/openai.ts` — OpenAI client (using `openai` npm package)
- `backend/src/jobs/ai-suggestion.job.ts`
- `backend/src/modules/ai/ai.service.ts`
- `backend/src/modules/ai/ai.controller.ts`
- `backend/src/modules/ai/ai.routes.ts`
- `backend/src/modules/ai/ai.service.test.ts`
- `backend/src/app.ts` — mount `/api/ai`

---

### Phase 8 Summary

| Step | Feature | New Files | Key Schema Changes |
|------|---------|-----------|-------------------|
| 8.1 | Dynamic pricing | 8 | `PricingRule` model |
| 8.2 | AI suggestions | 8 | `AISuggestion` model |

**Feature flags to seed:** `DYNAMIC_PRICING_ENABLED`, `AI_SUGGESTIONS_ENABLED`.  
**npm packages needed:** `openai`.

---

## 🔲 PHASE 9 — Scale & Growth
**Theme:** Multi-location support and group bookings — only relevant at scale.  
**Dependencies:** All previous phases fully stable.

---

### 9.1 — Multi-Location Support

**Gap #33**

**What to build:**

- `Location` model: `id`, `tenantId`, `name`, `address`, `city`, `postcode`, `country`, `phone`, `timezone`, `isActive`.
- `locationId` added to: `Artist`, `Service`, `Table`, `Booking`.
- All queries that currently scope by `tenantId` now also optionally scope by `locationId`.
- ADMIN can switch active location in CRM (stored in session/JWT claims).
- Public booking widget shows a location selector when multiple locations exist.
- Analytics can be filtered by location and also rolled up across all locations.
- `GET /api/locations`, `POST /api/locations`, `PATCH/DELETE /api/locations/:id`.
- Feature flag `MULTI_LOCATION_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `Location` model, `locationId` on Artist/Service/Table/Booking
- `backend/src/modules/locations/locations.schema.ts`
- `backend/src/modules/locations/locations.service.ts`
- `backend/src/modules/locations/locations.controller.ts`
- `backend/src/modules/locations/locations.routes.ts`
- All affected service files — add optional `locationId` scoping
- `backend/src/modules/locations/locations.service.test.ts`
- `backend/src/modules/locations/locations.test.ts`

---

### 9.2 — Group / Class Booking

**Gap #38**

**What to build:**

- `Session` model: `id`, `tenantId`, `serviceId`, `artistId`, `locationId?`, `startTime`, `endTime`, `capacity`, `currentAttendees`, `status` (OPEN | FULL | CANCELLED).
- `SessionBooking` model: `id`, `sessionId`, `customerId`, `tenantId`, `status`.
- `GET /api/sessions` — list available sessions. `POST /api/sessions` — ADMIN creates. `DELETE/PATCH /api/sessions/:id`.
- `POST /api/sessions/:id/book` — customer books a spot (atomic decrement of `currentAttendees`).
- Full sessions auto-move the waitlist (Phase 5.4 waitlist matching extended to sessions).
- Feature flag `GROUP_BOOKING_ENABLED`.

**Files to create/modify:**
- `backend/prisma/schema.prisma` — `Session`, `SessionBooking` models
- `backend/src/modules/sessions/sessions.schema.ts`
- `backend/src/modules/sessions/sessions.service.ts`
- `backend/src/modules/sessions/sessions.controller.ts`
- `backend/src/modules/sessions/sessions.routes.ts`
- `backend/src/modules/sessions/sessions.service.test.ts`
- `backend/src/modules/sessions/sessions.test.ts`

---

### Phase 9 Summary

| Step | Feature | New Files | Key Schema Changes |
|------|---------|-----------|-------------------|
| 9.1 | Multi-location | 8 | `Location` model, `locationId` on 4 models |
| 9.2 | Group bookings | 7 | `Session`, `SessionBooking` models |

**Feature flags to seed:** `MULTI_LOCATION_ENABLED`, `GROUP_BOOKING_ENABLED`.

---

## 🔲 PHASE 10 — Future / Optional Add-Ons
**Theme:** Standalone products — significant scope each.  
**Dependencies:** All previous phases stable. These are independent product decisions.

---

### 10.1 — WhatsApp Conversational AI Agent

**Gap #12**

**What to build:**

This is a standalone product — a full inbound WhatsApp AI conversation system. Scope includes:

- Migrate from Twilio WhatsApp API to **Meta WhatsApp Business Cloud API** (preferred for scale).
- Inbound webhook: `POST /api/webhooks/whatsapp-inbound` — receives customer messages from Meta.
- Message storage: `WhatsAppConversation` and `WhatsAppMessage` models.
- AI agent: `openai` function-calling layer that can: answer FAQs (from a knowledge base), check availability, initiate a booking, escalate to human if confidence low.
- Knowledge base: ADMIN enters FAQs (`POST /api/whatsapp-agent/faq`) which are stored and used as context.
- **CRM Inbox**: `GET /api/whatsapp-agent/inbox` — ADMIN views all conversations. `POST /api/whatsapp-agent/reply/:conversationId` — human reply.
- Human handoff: agent sets conversation to `HUMAN_REQUIRED` status; CRM shows unread indicator.
- Feature flag `WHATSAPP_AGENT_ENABLED`.

**Files to create/modify (major — standalone module):**
- `backend/prisma/schema.prisma` — `WhatsAppConversation`, `WhatsAppMessage`, `WhatsAppFaq` models
- `backend/src/lib/meta-whatsapp.ts` — Meta Cloud API client
- `backend/src/modules/whatsapp-agent/` — full module (service, controller, routes, agent logic, FAQ management)
- `backend/src/jobs/whatsapp-agent.job.ts` — async agent processing queue
- Full test suite

---

### 10.2 — Multi-Language CRM UI

**Gap #51**

**What to build:**

- **Staff/admin-facing only** — customer booking widget stays in English (or business-set default).
- i18n translation files: `backend/src/locales/{en,fr,nl,es,de}/translations.json`.
- `crmLanguage` field on `User` (default `'en'`).
- All API error messages and server-sent strings use a `t(key, lang)` function.
- `PATCH /api/users/me/language` — user sets their CRM language.
- Frontend: uses the `crmLanguage` value from user profile to load the correct locale bundle.
- Feature flag `UI_LANGUAGE_ENABLED`.

**Files to create/modify:**
- `backend/src/locales/` — locale JSON files for each supported language
- `backend/src/lib/i18n.ts` — `t(key, lang)` translation function
- `backend/prisma/schema.prisma` — `crmLanguage String @default("en")` on `User`
- API error messages refactored to use `t()` where user context is available
- `backend/src/lib/i18n.test.ts`

---

### Phase 10 Summary

| Step | Feature | Scale |
|------|---------|-------|
| 10.1 | WhatsApp AI Agent | Large — 2–3 week standalone build |
| 10.2 | Multi-language UI | Medium — 1 week + ongoing translation work |

**Feature flags to seed:** `WHATSAPP_AGENT_ENABLED`, `UI_LANGUAGE_ENABLED`.

---

## Master Checklist

| Phase | Theme | Status | Prisma Migrations | New Test Suites | New Feature Flags |
|-------|-------|--------|------------------|-----------------|-------------------|
| 0 | Security & Architecture | ✅ DONE | 1 | 45 (1037 tests) | SUPER_ADMIN, tenantId |
| 1 | Messaging Foundation | 🔲 | 1 | ~9 | SMS, BIRTHDAY, REBOOKING, RECURRING, CAMPAIGNS |
| 2 | Booking Completeness | 🔲 | 1 | ~5 | PUBLIC_BOOKING, SOCIAL_BOOKING, NO_SHOW |
| 3 | Customer Profile & Safety | 🔲 | 1 | ~5 | HEALTH_FLAGS, INTAKE_FORMS, BOOKING_PHOTOS, REFERRALS |
| 4 | Financial & POS | 🔲 | 1 | ~8 | TIPS, GIFT_CARDS, INVENTORY, POS, TERMINAL, PAYROLL, ANALYTICS |
| 5 | Packages, Loyalty & Retention | 🔲 | 1 | ~4 | PACKAGES, MEMBERSHIPS, LOYALTY |
| 6 | Staff & HR | 🔲 | 1 | ~4 | ROTA, STAFF_APP |
| 7 | Calendar Expansion | 🔲 | 1 | ~2 | OUTLOOK_CAL, APPLE_CAL |
| 8 | Advanced Intelligence | 🔲 | 1 | ~4 | DYNAMIC_PRICING, AI_SUGGESTIONS |
| 9 | Scale & Growth | 🔲 | 1 | ~4 | MULTI_LOCATION, GROUP_BOOKING |
| 10 | Optional Add-Ons | 🔲 | 1 | ~3 | WHATSAPP_AGENT, UI_LANGUAGE |

---

> **Engineering Rule:** Every phase starts with the Prisma schema migration, then services, then controllers, then routes, then tests. Every new feature must have both a unit test (`*.service.test.ts`) and an integration test (`*.test.ts`). All 45 existing tests must remain green throughout.
