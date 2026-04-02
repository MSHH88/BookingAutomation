# Bugs & Gaps Register — BookingAutomation

> **How to use this file:**
> Every gap, bug, or missing feature found during audits is logged here with a severity,
> the phase/step where it lives, and its current status.
> When a gap is fixed, update `Status` to ✅ **Fixed** and add the Step/PR where it was resolved.

---

## Legend

| Severity | Meaning |
|---|---|
| 🔴 **CRITICAL** | Blocks production use / legal requirement / booking model is wrong |
| 🟠 **HIGH** | Breaks a major feature or revenue stream |
| 🟡 **MEDIUM** | Degraded experience; workaround exists |
| 🟢 **LOW** | Nice-to-have; no immediate impact |

| Status | Meaning |
|---|---|
| ❌ Open | Not yet fixed or planned |
| 📋 Planned | Added to a Phase step — not yet implemented |
| ✅ Fixed | Fully implemented and tested |

---

## Audit 1 — Original 13 Gaps (Gap 1–13)
> Found before PHASE1.md was first written. All have been accounted for in PHASE1.md already.

| # | Title | Severity | Phase/Step | Status |
|---|---|---|---|---|
| 1 | `Service`, `ServiceCategory`, `Table`, `ArtistService` models missing from schema | 🔴 | Step 1.2 | 📋 Planned (schema not yet migrated) |
| 2 | `Booking.leadId` was non-nullable — breaks instant booking | 🔴 | Step 1.2 | 📋 Planned (schema not yet migrated) |
| 3 | No Stripe / online payment step | 🔴 | Step 1.23 | 📋 Planned |
| 4 | Per-type booking flows not documented | 🟠 | Step 1.4b | ✅ Fixed (added to PHASE1.md) |
| 5 | No Service & Table Management API | 🔴 | Step 1.24 | 📋 Planned |
| 6 | No Customer Portal ("My Bookings") | 🟠 | Step 1.25 | 📋 Planned |
| 7 | WhatsApp only had 2 messages | 🟠 | Step 1.17 | ✅ Fixed (5 messages documented) |
| 8 | Email templates incomplete (7 → 11) | 🟠 | Step 1.11 | 📋 Planned |
| 9 | Feature flags incomplete (23 — 5 new not in code yet) | 🟠 | Step 1.4b / 1.15 | 📋 Planned |
| 10 | Analytics endpoints incomplete | 🟡 | Step 1.13 | ✅ Fixed (8 endpoints documented) |
| 11 | Seed missing Service / Table records | 🟡 | Step 1.16 | 📋 Planned |
| 12 | Missing integration test files for new modules | 🟡 | Step 1.22 | 📋 Planned |
| 13 | Step count 22 → 25 | 🟢 | PHASE1.md | ✅ Fixed |

---

## Audit 2 — Competitor Benchmark (Gap 14–32)
> Found by comparing against Fresha, Vagaro, Booksy, Square Appointments, OpenTable, Resy, Mindbody, Treatwell, Timely.

### Gap 14 — No Multi-Location / Multi-Branch Support
- **Severity:** 🟠 HIGH
- **Scope:** Phase 2 / Phase 3
- **Phase/Step:** PLAN.md Phase 2 — new step
- **Status:** 📋 Planned (noted in PLAN.md)
- **What's missing:** Zero `Location` model. No `locationId` on `Artist` or `Booking`. No location-scoped availability queries, analytics, or CRM views. Every competitor (Fresha, Vagaro, Square) supports multi-location.
- **Needs:** `Location` model; `locationId` FK on `Artist` and `Booking`; location-scoped queries; `MULTI_LOCATION_ENABLED` flag; analytics breakdown by location.

---

### Gap 15 — No Membership / Session Packages
- **Severity:** 🟠 HIGH
- **Scope:** Phase 1 (model/schema note) → Phase 2 (implementation)
- **Phase/Step:** Step 1.2 (schema note) + PLAN.md Phase 2
- **Status:** 📋 Planned
- **What's missing:** No `Package` or `CustomerPackage` model. Fresha, Vagaro, Mindbody all sell memberships (10 massage sessions for £500, monthly blowdry club). Major revenue stream missing.
- **Needs:** `Package` model (`id, name, serviceIds[], sessionCount, validityDays, priceTotal`); `CustomerPackage` model; Stripe subscription support; `PACKAGES_ENABLED` + `MEMBERSHIPS_ENABLED` flags; redeem-a-session booking flow.

---

### Gap 16 — No Loyalty Points / Rewards System
- **Severity:** 🟡 MEDIUM
- **Scope:** Phase 2
- **Phase/Step:** PLAN.md Phase 2
- **Status:** 📋 Planned
- **What's missing:** No `LoyaltyTransaction` model. No `User.loyaltyBalance`. Fresha has built-in loyalty points (1 pt per £1, redeemable for discounts).
- **Needs:** `LoyaltyTransaction` model; `User.loyaltyBalance Int @default(0)`; points earning rules; redemption at booking; analytics ROI; `LOYALTY_ENABLED` flag.

---

### Gap 17 — No Staff Commission Tracking
- **Severity:** 🟡 MEDIUM
- **Scope:** Phase 1 (schema fields) → Phase 2 (analytics display)
- **Phase/Step:** Step 1.2 (Artist model) + Step 1.13 (analytics)
- **Status:** 📋 Planned
- **What's missing:** No `Artist.commissionRate`, `commissionType`, `Booking.commissionEarned`. Vagaro, Fresha, Square track per-artist commission (critical for booth-rental barber shops).
- **Needs:** `Artist.commissionRate Decimal?`; `Artist.commissionType String?` (`PERCENTAGE | FLAT | BOOTH_RENT`); `Booking.commissionEarned Decimal?`; commission totals in analytics.

---

### Gap 18 — No Intake Forms / Consent Forms *(LEGAL REQUIREMENT)*
- **Severity:** 🔴 CRITICAL
- **Scope:** Phase 1 (new steps 1.26–1.27)
- **Phase/Step:** Step 1.26 (Forms API) — new step
- **Status:** 📋 Planned
- **What's missing:** No `FormTemplate`, `FormField`, `FormSubmission` models. No consent form flow. **Legal requirement for:**
  - Hair salon: patch test consent (colour allergy — UK legal requirement)
  - Masseuse/Spa: health questionnaire (medical contra-indications, pregnancy, injuries)
  - Tattoo studio: age verification + medical consent + aftercare acknowledgement
  - Nail salon: nail health questionnaire
- **Needs:** `FormTemplate` model (`id, name, businessTypes[], fields JSON, requiresSignature Boolean`); `FormSubmission` model (`id, templateId, customerId, bookingId?, answers JSON, signedAt?, ipAddress`); form link in booking confirmation email; CRM view of submitted forms; `FORMS_ENABLED` flag.

---

### Gap 19 — No Rebook / "Book Again" Reminder Automation *(HIGH ROI)*
- **Severity:** 🟠 HIGH
- **Scope:** Phase 1 (Step 1.19 update + Step 1.27 rebook automation)
- **Phase/Step:** Step 1.19 (Review Request Automation — extend) + new queue job
- **Status:** 📋 Planned
- **What's missing:** No `Service.rebookIntervalDays`. No rebook reminder job. Fresha, Vagaro, Booksy automatically remind customers to rebook — highest-ROI automation for repeat-visit businesses.
  - Barber: 28 days
  - Acrylic infill: 21 days
  - Massage: 14 days
  - Hair colour: 8 weeks
- **Needs:** `Service.rebookIntervalDays Int?`; `REBOOK_REMINDER_ENABLED` flag; BullMQ delayed job on COMPLETE; `rebook-reminder.hbs` email template (12th); WhatsApp Message 6.

---

### Gap 20 — No Tip / Gratuity Support
- **Severity:** 🟡 MEDIUM
- **Scope:** Phase 2
- **Phase/Step:** PLAN.md Phase 2 + Step 1.23 note
- **Status:** 📋 Planned
- **What's missing:** No `Invoice.tipAmount`. No tip selection in Stripe checkout. Square, Fresha, Vagaro all support tip collection — critical for masseuse, nail, hair.
- **Needs:** `Invoice.tipAmount Decimal?`; optional tip in Stripe PaymentIntent; tip selection UI; `TIP_COLLECTION_ENABLED` flag.

---

### Gap 21 — Waitlist Flag Exists But No Model or Implementation
- **Severity:** 🟠 HIGH
- **Scope:** Phase 1 (Step 1.28 — new step)
- **Phase/Step:** Step 1.28 (Waitlist API) — new step
- **Status:** 📋 Planned
- **What's missing:** `WAITING_LIST_ENABLED` flag is documented but there is no `WaitlistEntry` model, no API endpoints, and no automation to notify when a slot opens.
- **Needs:** `WaitlistEntry` model (`id, customerId?, name, email, phone, serviceId?, artistId?, requestedDate?, createdAt`); `POST /api/waitlist` (public); auto-notify on cancellation; `waitlist-available.hbs` email template (13th).

---

### Gap 22 — Single-Service Booking Model (Multi-Service Not Supported)
- **Severity:** 🔴 CRITICAL
- **Scope:** Phase 1 (Step 1.2 schema + Step 1.9 booking logic)
- **Phase/Step:** Step 1.2 (schema) + Step 1.9 (booking API)
- **Status:** 📋 Planned
- **What's missing:** `Booking` has a single `serviceId`. Nearly every competitor allows multi-service bookings (Fresha: Cut + Colour + Blow Dry; Barber: Fade + Beard + Eyebrow). Our barber catalogue has "Combo Deals" but the booking model can't represent them.
- **Needs:** `BookingService` join table (`bookingId, serviceId, quantity, priceAtBooking, durationMinutes`); `Booking.totalDurationMinutes Int`; `Booking.totalAmount Decimal`; availability engine accounts for total duration.

---

### Gap 23 — No GDPR / Privacy Compliance Fields *(LEGAL REQUIREMENT for UK/EU)*
- **Severity:** 🔴 CRITICAL
- **Scope:** Phase 1 (Step 1.2 schema + Step 1.4 auth + Step 1.25 customer portal)
- **Phase/Step:** Step 1.2 + Step 1.4 + Step 1.25
- **Status:** 📋 Planned
- **What's missing:** No marketing consent fields. No data deletion endpoint. No data export endpoint. UK GDPR requires these for any UK business processing personal data.
- **Needs:** `User.marketingConsent Boolean @default(false)`; `User.gdprConsentAt DateTime?`; `Lead.marketingConsent Boolean @default(false)`; `POST /api/me/data-export`; `DELETE /api/me/account` (soft-delete, anonymise); `GDPR_ENABLED` flag.

---

### Gap 24 — Recurring Breaks Not Supported in Artist Availability
- **Severity:** 🟡 MEDIUM
- **Scope:** Phase 1 (Step 1.2 schema + Step 1.20 availability engine)
- **Phase/Step:** Step 1.2 + Step 1.20
- **Status:** 📋 Planned
- **What's missing:** `ArtistAvailability` has `startTime/endTime` but no way to block a daily lunch break. E.g., "always block 13:00–14:00." Artists currently need a separate `AvailabilityBlock` for every single day.
- **Needs:** `ArtistAvailability.breakStart String?`; `ArtistAvailability.breakEnd String?`; availability slot engine excludes break window.

---

### Gap 25 — No Cancellation Policy Acceptance / Terms Recording
- **Severity:** 🔴 CRITICAL (legal — cannot charge fee without recorded consent)
- **Scope:** Phase 1 (Step 1.2 schema + Step 1.25 customer portal)
- **Phase/Step:** Step 1.2 + Step 1.25
- **Status:** 📋 Planned
- **What's missing:** `CANCELLATION_FEE_ENABLED` flag exists but there is no way to show the customer the policy or record their acceptance. You legally cannot charge a cancellation fee without documented consent at booking time.
- **Needs:** `Booking.policyAcceptedAt DateTime?`; `Booking.policyVersion String?`; booking API rejects confirm if `policyAcceptedAt` is null when `CANCELLATION_FEE_ENABLED = true`; `StudioSettings.cancellationPolicyText`.

---

### Gap 26 — Tattoo: No Consent Form PDF Generation / Aftercare Email
- **Severity:** 🟠 HIGH (legal for tattoo studio)
- **Scope:** Phase 1 (linked to Gap 18 / Step 1.26)
- **Phase/Step:** Step 1.26
- **Status:** 📋 Planned
- **What's missing:** No PDF generation capability. Tattoo studios must have a signed consent form. No `consent-form.hbs` or `aftercare-instructions.hbs` email template.
- **Needs:** PDF generation library (`pdfkit` or `puppeteer`); `consent-form.hbs` email template (14th); `aftercare-instructions.hbs` email template (15th); aftercare email triggered on COMPLETE for tattoo type.

---

### Gap 27 — No Studio / Business Settings API
- **Severity:** 🔴 CRITICAL
- **Scope:** Phase 1 (new Step 1.29)
- **Phase/Step:** Step 1.29 (Studio Settings API) — new step
- **Status:** 📋 Planned
- **What's missing:** No `StudioSettings` model or API. Studio name, address, timezone, currency, cancellation policy text, Google Review URL, min/max advance booking are all currently only in `.env` files — not editable from the CRM. Every competitor lets studio owners edit these from a settings page.
- **Needs:** `StudioSettings` model (`businessName, address, phone, email, timezone, currency, googleReviewUrl, cancellationPolicyText, minAdvanceBookingHours, maxAdvanceBookingDays, logoUrl, coverImageUrl`); `GET /api/settings` (public); `PATCH /api/settings` (ADMIN); used by email templates, WhatsApp messages, invoices.

---

### Gap 28 — No Daily / Weekly Summary Report Automation
- **Severity:** 🟡 MEDIUM
- **Scope:** Phase 2
- **Phase/Step:** PLAN.md Phase 2
- **Status:** 📋 Planned
- **What's missing:** Analytics endpoints exist but no scheduled summary report. Fresha, Vagaro send the studio owner a daily summary email: bookings today, revenue, no-shows, new leads.
- **Needs:** `DAILY_REPORT_ENABLED` flag; BullMQ CRON job (daily 6pm → `daily-summary.hbs` to ADMIN); `daily-summary.hbs` email template (16th); `weekly-summary.hbs` email template (17th).

---

### Gap 29 — Restaurant: No Covers / Pacing Management
- **Severity:** 🟡 MEDIUM
- **Scope:** Phase 1 (Step 1.2 schema + Step 1.24 table availability)
- **Phase/Step:** Step 1.2 + Step 1.24
- **Status:** 📋 Planned
- **What's missing:** No maximum covers limit. Table availability engine has no concept of "max 40 covers for dinner sitting." OpenTable and Resy have covers management as a core feature.
- **Needs:** `StudioSettings.maxCoversLunch Int?`; `StudioSettings.maxCoversDinner Int?`; table availability engine sums current covers and caps at max; `COVERS_MANAGEMENT_ENABLED` flag.

---

### Gap 30 — No Instagram / Google Business / External Booking Integration Plan
- **Severity:** 🟡 MEDIUM
- **Scope:** Phase 4 (PLAN.md)
- **Phase/Step:** PLAN.md Phase 4
- **Status:** 📋 Planned (noted in PLAN.md)
- **What's missing:** Booksy (#1 barber platform) gets a large percentage of bookings via Instagram "Book" button, Facebook "Book Now," and Google Business Profile "Book" (Google Reserve). No plan exists for any of these.
- **Needs (Phase 4 scope):** Public booking endpoint CORS-enabled for embed widgets; API key / embed token system; Google Reserve API integration; Facebook/Instagram Appointments API.

---

### Gap 31 — No Product / Retail Sales
- **Severity:** 🟢 LOW
- **Scope:** Phase 2 (PLAN.md)
- **Phase/Step:** PLAN.md Phase 2
- **Status:** 📋 Planned (noted in PLAN.md)
- **What's missing:** No `Product`, `ProductCategory` models. Vagaro, Fresha, Square: salons sell aftercare products. No structured product catalogue.
- **Needs (Phase 2):** `Product`, `ProductCategory` models; `InvoiceItem` can reference `productId` or `serviceId`; `RETAIL_SALES_ENABLED` flag.

---

### Gap 32 — No Staff Mobile App / Mobile-First CRM Plan
- **Severity:** 🟢 LOW
- **Scope:** Phase 3 (PLAN.md)
- **Phase/Step:** PLAN.md Phase 3
- **Status:** 📋 Planned (noted in PLAN.md)
- **What's missing:** Fresha, Booksy, Vagaro have dedicated staff apps. No mention of mobile-responsive staff views in PLAN.md.
- **Needs (Phase 3):** Explicitly document mobile-responsive staff CRM in PLAN.md Phase 3.

---

## Code-Level Bugs in Steps 1.1–1.4b (What Exists vs What's Specced)

> These are gaps between what PHASE1.md specifies and what is actually in the codebase right now.

### BUG-A — `prisma/schema.prisma`: Missing New Models (Steps 1.2 / Gap 1)
- **Severity:** 🔴 CRITICAL
- **File:** `backend/prisma/schema.prisma`
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **Description:** The following models required by PHASE1.md Step 1.2 do not exist in `schema.prisma`:
  - `ServiceCategory` — service category grouping ✅ Added
  - `Service` — individual bookable service with price/duration ✅ Added
  - `ArtistService` — per-artist price override join table ✅ Added
  - `Table` — restaurant table with `capacity`, `location` ✅ Added
  - `BookingService` — multi-service join table (Gap 22) ✅ Added
  - `WaitlistEntry` — waitlist entries (Gap 21) ✅ Added
  - `StudioSettings` — business settings (Gap 27) ✅ Added
- New enums added: `CommissionType`, `WaitlistStatus`, `BookingStatus.RESCHEDULED`

---

### BUG-B — `prisma/schema.prisma`: `Booking.leadId` Is NOT Nullable (Gap 2)
- **Severity:** 🔴 CRITICAL
- **File:** `backend/prisma/schema.prisma` line ~120
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **Description:** `Booking.leadId` is now `String? @unique` (nullable) — supports instant bookings without a Lead step.

---

### BUG-C — `prisma/schema.prisma`: Missing Fields on `Booking` Model (Step 1.2)
- **Severity:** 🔴 CRITICAL
- **File:** `backend/prisma/schema.prisma`
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **Fields added:**
  - `serviceId String?` ✅
  - `tableId String?` ✅
  - `partySize Int?` ✅
  - `specialRequests String?` ✅
  - `depositAmount Decimal? @db.Decimal(10,2)` ✅
  - `depositPaidAt DateTime?` ✅
  - `depositRefunded Boolean @default(false)` ✅
  - `rescheduledFrom String?` ✅
  - `customerId String?` ✅
  - `totalDurationMinutes Int?` ✅
  - `totalAmount Decimal? @db.Decimal(10,2)` ✅
  - `policyAcceptedAt DateTime?` ✅
  - `policyVersion String?` ✅
  - `commissionEarned Decimal? @db.Decimal(10,2)` ✅

---

### BUG-D — `prisma/schema.prisma`: Missing Fields on `User` Model
- **Severity:** 🟠 HIGH
- **File:** `backend/prisma/schema.prisma`
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **Fields added:** `phone String?` ✅, `marketingConsent Boolean @default(false)` ✅, `gdprConsentAt DateTime?` ✅, `loyaltyBalance Int @default(0)` ✅

---

### BUG-E — `prisma/schema.prisma`: Missing Fields on `Lead` Model
- **Severity:** 🟠 HIGH
- **File:** `backend/prisma/schema.prisma`
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **Fields added:** `customerId String?` ✅, `marketingConsent Boolean @default(false)` ✅

---

### BUG-F — `prisma/schema.prisma`: Missing Fields on `Artist` Model
- **Severity:** 🟡 MEDIUM
- **File:** `backend/prisma/schema.prisma`
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **Fields added:** `commissionRate Decimal? @db.Decimal(5,2)` ✅, `commissionType CommissionType?` ✅ (enum: PERCENTAGE | FLAT)

---

### BUG-G — `prisma/schema.prisma`: Missing `breakStart`/`breakEnd` on `ArtistAvailability`
- **Severity:** 🟡 MEDIUM
- **File:** `backend/prisma/schema.prisma`
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **Fields added:** `breakStart String?` ✅, `breakEnd String?` ✅

---

### BUG-H — `backend/src/config/businessType.ts`: 5 New Flags NOT Added to `FEATURE_FLAG_KEYS`
- **Severity:** 🔴 CRITICAL (flags are referenced in PHASE1.md Step 1.15 but code still has 23)
- **File:** `backend/src/config/businessType.ts` line 211
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **All 12 new flags added:** `ONLINE_PAYMENT_ENABLED`, `WAITING_LIST_ENABLED`, `RECURRING_BOOKING_ENABLED`, `CANCELLATION_FEE_ENABLED`, `GIFT_VOUCHER_ENABLED`, `LOYALTY_ENABLED`, `FORMS_ENABLED`, `REBOOK_REMINDER_ENABLED`, `TIP_COLLECTION_ENABLED`, `GDPR_ENABLED`, `DAILY_REPORT_ENABLED`, `COVERS_MANAGEMENT_ENABLED`. All 6 business-type default maps updated. Total flags: 35.

---

### BUG-I — `backend/src/config/businessType.ts`: 7 More Flags From Audit 2 Not Planned in Code
- **Severity:** 🟠 HIGH
- **File:** `backend/src/config/businessType.ts`
- **Status:** ✅ Fixed (2026-04-02 — included in BUG-H fix above)

---

### BUG-J — `backend/src/config/index.ts`: Missing Stripe Config Fields
- **Severity:** 🔴 CRITICAL (Step 1.23 depends on these)
- **File:** `backend/src/config/index.ts`
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **Fields added:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` — all optional strings with empty-string defaults. `.env.example` updated with Stripe section.

---

### BUG-K — Auth `PATCH /api/auth/me`: No Password Confirmation Required
- **Severity:** 🟡 MEDIUM
- **File:** `backend/src/modules/auth/auth.service.ts` (updateMe)
- **Status:** ✅ Fixed — already confirmed correct. `updateMe` checks `currentPassword` before allowing a password change. Zod schema also enforces this via `.refine()`. Both verified in code review 2026-04-02.

---

### BUG-L — Auth Registration: No `phone` Field Captured for Customer Accounts
- **Severity:** 🟡 MEDIUM
- **File:** `backend/src/modules/auth/auth.schema.ts` (register schema)
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **Fix:** Optional `phone` field added to `registerSchema` and `updateMeSchema`. `auth.service.ts` register saves it. `SafeUser` exposes it.

---

### BUG-M — PHASE1.md Step 1.4 Checklist Items All Unchecked
- **Severity:** 🟡 MEDIUM (tracking issue)
- **File:** `PHASE1.md` Step 1.4 checklist
- **Status:** ✅ Fixed (2026-04-02 — all checklist items marked complete)

---

### BUG-N — `prisma/schema.prisma`: No `calendarTokens` Field on `Artist` for OAuth
- **Severity:** 🟡 MEDIUM
- **File:** `backend/prisma/schema.prisma`
- **Status:** ✅ Fixed (2026-04-02 — Gap Audit Fix)
- **Fields added:** `calendarAccessToken String?` ✅, `calendarRefreshToken String?` ✅, `calendarTokenExpiresAt DateTime?` ✅

---

## Business-Type–Specific Gap Matrix

| Business Type | Gap | Severity | Gap # |
|---|---|---|---|
| **All types** | GDPR consent fields missing | 🔴 | BUG-D, Gap 23 |
| **All types** | Studio settings only in .env — not CRM-editable | 🔴 | Gap 27 |
| **All types** | Cancellation policy consent not recorded | 🔴 | Gap 25 |
| **Barber** | Multi-service (Fade + Beard + Eyebrow) impossible | 🔴 | Gap 22 |
| **Barber** | Rebook reminder automation missing | 🟠 | Gap 19 |
| **Barber** | Google Business / Instagram booking button — unplanned | 🟡 | Gap 30 |
| **Hair Salon** | Patch test consent record (legal in UK) | 🔴 | Gap 18 |
| **Hair Salon** | Multi-service (Cut + Colour + Blow Dry) impossible | 🔴 | Gap 22 |
| **Hair Salon** | Membership packages (blowdry club) missing | 🟠 | Gap 15 |
| **Hair Salon** | Rebook reminder (8 weeks) missing | 🟠 | Gap 19 |
| **Nail Salon** | Multi-service (Mani + Pedi) impossible | 🔴 | Gap 22 |
| **Nail Salon** | Nail health questionnaire (intake form) | 🟠 | Gap 18 |
| **Nail Salon** | Rebook reminder (3 weeks) missing | 🟠 | Gap 19 |
| **Masseuse** | Health questionnaire / contra-indications form (legal) | 🔴 | Gap 18 |
| **Masseuse** | Session packages / membership model | 🟠 | Gap 15 |
| **Masseuse** | Rebook reminder (14 days) missing | 🟠 | Gap 19 |
| **Masseuse** | Tip collection missing | 🟡 | Gap 20 |
| **Restaurant** | Covers / pacing management (no max covers limit) | 🟡 | Gap 29 |
| **Restaurant** | Dietary requirements stored per customer | 🟡 | BUG-D |
| **Tattoo** | Age / medical consent form + signature (legal) | 🔴 | Gap 18, 26 |
| **Tattoo** | Aftercare PDF / email automation | 🟠 | Gap 26 |

---

## New Phase 1 Steps Required (from this audit)

| Step # | Title | Priority | Source |
|---|---|---|---|
| 1.26 | Intake / Consent Forms API | 🔴 Must-have | Gap 18, 26 |
| 1.27 | Rebook Reminder Automation | 🟠 High | Gap 19 |
| 1.28 | Waitlist API | 🟠 High | Gap 21 |
| 1.29 | Studio Settings API | 🔴 Must-have | Gap 27 |

---

## Summary Scorecard

| Category | Before Audit 1 | After Audit 1 (PHASE1.md) | After Audit 2 (this file) | After Gap Fix (2026-04-02) |
|---|---|---|---|---|
| Schema models | ~10 | 14 (planned) | +7 more needed | ✅ All 21 in schema |
| Feature flags in code | 23 | 23 (5 planned) | 23 in code; 35 planned | ✅ 35 in code |
| Email templates | 7 | 11 (planned) | 17 planned | 📋 Planned (Steps 1.11, 1.27) |
| WhatsApp messages | 2 | 5 (planned) | 6 planned | 📋 Planned (Step 1.17) |
| Phase 1 steps | 22 | 25 | 29 (4 new: 1.26–1.29) | ✅ 29 steps documented |
| Legal compliance | ❌ | ❌ | 📋 GDPR, consent forms planned | ✅ Fields in schema; APIs in plan |
| Multi-service booking | ❌ | ❌ | 📋 Planned (BookingService model) | ✅ BookingService model in schema |
| Studio settings API | ❌ | ❌ | 📋 Planned (Step 1.29) | ✅ StudioSettings model in schema |
| Auth phone capture | ❌ | ❌ | 📋 BUG-L | ✅ Fixed |
| BUG-A through BUG-N | ❌ Open | ❌ Open | ❌ Open | ✅ All Fixed |

---

*Last updated: 2026-04-02. All BUG-A through BUG-N fixed in gap audit pass. Next review: after Step 1.6.*
