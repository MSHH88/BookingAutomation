# GapsBeforeProd — All Gaps, Issues & Required Changes Before Production

> Last updated: 2026-04-09
> Status: OPEN — none of the items below have been implemented yet.

---

## 1. SUPER_ADMIN / PLATFORM OWNER ROLE (CRITICAL)

**Gap:** There is no `SUPER_ADMIN` (platform owner / creator) role in the system. The current role hierarchy is only:
`ADMIN (3) > ARTIST (2) > CUSTOMER (1)`

**Required:**
- Add a `SUPER_ADMIN` role that sits above all others (level 4+).
- SUPER_ADMIN is the only role that can:
  - Turn features on or off (feature flags).
  - Switch the business type (e.g. barber → studio → restaurant).
  - See **all leads** across all tenants/businesses.
  - Give any user any role (including ADMIN).
  - Remove any role from any user.
  - Enable or disable entire backend modules for a sold instance.
- ADMIN (business owner) **cannot** assign roles to others by default — unless SUPER_ADMIN explicitly grants them that ability (a "can assign roles" permission flag).
- A customer must **never** be able to give themselves more features or see leads they haven't paid for.
- All of this must be manageable from the CRM.

**Files to change:** `prisma/schema.prisma` (add `SUPER_ADMIN` to `enum Role`), `requireRole.ts`, all route guards.

---

## 2. WHATSAPP MESSAGES ARE HARDCODED — NOT DB-EDITABLE (CRITICAL)

**Gap:** All 5 WhatsApp message templates are hardcoded inside `whatsapp.queue.ts` → `buildWhatsAppMessage()`. There is **no database model** for WhatsApp templates. There is **no CRM UI** to edit them.

**Current hardcoded templates (all 5):**
1. `lead-inquiry` — "Thanks for reaching out, artist will be in touch"
2. `booking-confirmed` — "Your appointment is confirmed for [date] at [time]"
3. `appointment-reminder` — "Reminder: your appointment is tomorrow at [time]"
4. `post-visit-review` — "Thank you for visiting, please leave a Google review"
5. `restaurant-reminder` — "Looking forward to seeing you tonight at [time]"

**Required:**
- Add a `WhatsAppTemplate` model to Prisma schema (fields: `id`, `key`, `body`, `variables`, `isActive`, `updatedAt`).
- Move all 5 template bodies into the DB (seeded with defaults).
- `buildWhatsAppMessage()` must look up the template from DB (or a cache) instead of hardcoding strings.
- Every template must be **fully editable** from the CRM backend — businesses must be able to change the text, language, and signature.
- Each template must support **placeholder variables** (e.g. `{{customerName}}`, `{{studioName}}`, `{{date}}`, `{{time}}`) rendered at send time.

---

## 3. MISSING WHATSAPP MESSAGE TYPES

**Gap:** The current 5 types cover basic journeys but are missing several important automation types common in industry (Fresha, Booksy, Vagaro standard).

**Missing WhatsApp message types to add:**
- **Cancellation confirmation** — sent to customer when their booking is cancelled.
- **Reschedule confirmation** — sent when a booking is rescheduled (new date/time).
- **Waitlist notification** — "A slot has opened up, book now."
- **Payment received / deposit confirmation** — "Your deposit of €X has been received."
- **Invoice / receipt link** — "Your invoice is ready."
- **Quote response (tattoo/bespoke)** — "Your artist has responded to your quote request."
- **No-show follow-up** — sent after a no-show to re-engage.
- **Loyalty / reward notification** — "You've earned X loyalty points."
- **Welcome message (new customer)** — first-time booking/registration welcome.
- **Staff notification** — internal WhatsApp alert to artist/staff on new booking (optional but valuable).

---

## 4. EMAIL TEMPLATES — PARTIALLY DONE BUT NOT FULLY EDITABLE FROM CRM

**Gap:** Email templates **do** exist in the DB (`EmailTemplate` model with `key`, `subject`, `htmlBody`, `variables`, `isActive`) and are rendered via Handlebars. However:
- There is **no CRM UI endpoint or section** to list, view, or edit email templates.
- The notifications module has the service logic but it is not exposed to the CRM interface.

**Required:**
- Add a **Email Templates section** to the CRM.
- SUPER_ADMIN and ADMIN (with permission) must be able to: list all templates, edit subject and body, preview rendered output, activate/deactivate a template.
- All businesses must be able to customise templates in their own language and with their own signature/branding.

**Missing email message types to review/add:**
- Booking cancellation email (to customer).
- Booking reschedule email (to customer).
- Waitlist slot available email.
- Payment / deposit receipt email.
- Quote accepted / artist reply email.
- No-show follow-up email.
- Welcome / onboarding email (new customer registration).
- Password reset / account email (if not already present).
- Staff/artist new booking notification email.
- Loyalty reward notification email.

---

## 5. NO CRM EMAIL & WHATSAPP TEMPLATE MANAGEMENT SECTION

**Gap:** There is no dedicated section in the CRM to manage messaging.

**Required CRM sections to build:**
- **Messages > WhatsApp Templates** — list all 5 (and future) WhatsApp templates, edit body text, preview with sample variables.
- **Messages > Email Templates** — list all email templates, edit subject and HTML body, activate/deactivate.
- Both sections must be accessible to SUPER_ADMIN always, and to ADMIN only if SUPER_ADMIN has granted access.

---

## 6. NO CRM ROLES SECTION

**Gap:** There is no CRM UI section for managing user roles and permissions.

**Required:**
- Add a **Roles** section to the CRM.
- SUPER_ADMIN can view all users and change any role.
- SUPER_ADMIN can toggle a "can assign roles" flag on any ADMIN user.
- ADMIN users (with the flag) can assign roles to users within their own business only, and only up to ADMIN level — never SUPER_ADMIN.
- Role changes must take effect immediately (JWT refresh or short TTL required).

---

## 7. NO CRM CONTROL CENTRE (FEATURE FLAGS / BUSINESS TYPE)

**Gap:** Feature flags exist in the DB and there is an admin API endpoint (`PATCH /api/admin/feature-flags/:key`) but there is no CRM Control Centre section.

**Required:**
- Add a **Control Centre** section to the CRM (SUPER_ADMIN only).
- Toggle any feature flag on or off per business/tenant.
- Switch business type (e.g. `barber` → `tattoo_studio`) — this arms/disarms entire backend modules.
- Only SUPER_ADMIN can access this — no other role, no matter what.

---

## 8. NO MULTI-TENANCY / TENANT ISOLATION

**Gap:** The entire codebase is single-tenant. There is no `tenantId` on any model. When you sell a second business the same backend, all data is shared in one DB with no isolation.

**Required (for reselling model):**
- Add `tenantId` to all relevant models: `User`, `Artist`, `Booking`, `Lead`, `StudioSettings`, `FeatureFlag`, `EmailTemplate`, `WhatsAppTemplate`, etc.
- All queries must be scoped to the calling user's `tenantId`.
- SUPER_ADMIN can query across all tenants.
- Feature flags and templates must be per-tenant (each business gets its own copy/overrides).

**Architecture decision needed:** whether to use a single DB with `tenantId` columns (simplest, recommended for start) or separate schemas/databases per tenant.

---

## 9. NO CRM SERVICES SECTION (AVAILABLE OPTIONS / HAIRSTYLES ETC.)

**Gap:** There is no section in the CRM to manage what services, styles, or options a business offers (e.g. available hairstyles for a barber, tattoo styles for a studio, menu items for a restaurant).

**Required:**
- Add a **Services** section to the CRM.
- ADMIN (and SUPER_ADMIN) can add/edit/delete: service names, descriptions, prices, durations, which artists offer which service.
- This connects to the existing `ArtistService` / `setArtistServices` endpoint already built.
- Services must be filterable by business type.

---

## 10. NO CRM ARTIST / FRONTEND MEDIA MANAGEMENT SECTION

**Gap:** There is no section in the CRM to update artist profile pictures or frontend imagery.

**Required:**
- Add a media/content section (or part of the artist profile section) in the CRM.
- Upload or change artist profile photos.
- Update portfolio images.
- Cloudinary is already set up as the media library (`src/lib/cloudinary.ts`).

---

## 11. RESELLING MODEL — CRM URL / MULTI-INSTANCE ARCHITECTURE (DECISION NEEDED)

**Gap:** No architecture decision has been made or implemented for how to serve multiple businesses from one codebase.

**Industry standard approach (recommended):**
- The CRM runs at the **same URL as the frontend**, under a `/crm` path (e.g. `yourbusiness.com/crm`). This is how HubSpot, GoHighLevel, and most SaaS CRMs in the US, Europe, and Asia operate — no separate CRM domain needed per client.
- Each business gets one domain (their own or a subdomain on your platform). The CRM is behind login at `/crm`.
- SUPER_ADMIN has a master login that can switch between tenants.
- No new domain or URL needs to be purchased per client — one deployment, one platform, many tenants.

**What needs to be decided/built:**
- Subdomain routing strategy (e.g. `businessname.yourplatform.com`) OR path-based (`yourplatform.com/client/businessname`).
- Tenant resolution middleware (reads subdomain or header, sets `tenantId` on request context).
- Onboarding flow: SUPER_ADMIN creates a new tenant, assigns ADMIN user, enables features, sets business type — all from CRM.

---

## 12. WHATSAPP AGENT AS A SERVICE (NOT YET BUILT)

**Gap:** The current WhatsApp setup uses Twilio's WhatsApp API (send-only, template-based). There is no conversational WhatsApp agent.

**Required (if requested):**
- Integrate Meta's WhatsApp Business API (Cloud API) — preferred over Twilio for production scale and verified Business accounts.
- Build an inbound webhook to receive customer replies.
- Add an AI agent layer (e.g. OpenAI function-calling) that can: answer FAQs, check availability, take a booking, escalate to human.
- Store conversation history in DB.
- CRM inbox to see and respond to WhatsApp conversations.
- This is a significant standalone feature — should be a separate step.

---

## 13. LEADS ACCESS CONTROL — PARTIALLY DONE BUT NOT COMPLETE

**Current state:** Leads routes are gated by `requireRole('ADMIN')` — so ADMIN and above can see leads. This means any user given ADMIN role can see leads.

**Gap:** Per your requirement, only SUPER_ADMIN should see leads by default. An ADMIN should only see leads if SUPER_ADMIN explicitly grants them "lead access". A customer must never see leads regardless of role.

**Required:**
- Add a `canViewLeads` permission flag per user (default: false).
- SUPER_ADMIN always sees leads.
- ADMIN only sees leads if `canViewLeads = true` (set by SUPER_ADMIN).
- Change leads route guard from `requireRole('ADMIN')` to a custom `requireLeadAccess` middleware.

---

## 14. GENERAL SETTINGS SECTION IN CRM

**Gap:** Studio settings (`StudioSettings`) have an API (`GET/PATCH /api/settings`) but no dedicated CRM UI section distinct from Control Centre.

**Required:**
- A clearly separate **Settings** section in the CRM for general business settings: studio name, email, phone, address, timezone, currency, cancellation policy, Google review URL, etc.
- Distinct from Control Centre (which is for feature flags/business type) and Roles (which is for user permissions).

---

## 15. MESSAGE TEMPLATES NOT PER-TENANT / NOT PER-BUSINESS-TYPE

**Gap:** Email templates are shared globally (no `tenantId`, no `businessType` filter). WhatsApp templates don't exist in DB at all.

**Required:**
- Each tenant (business) must have its own copy of all templates.
- Templates should have a `businessType` tag so defaults can be seeded correctly per type (tattoo studio gets tattoo-specific language, barber gets barber-specific language, etc.).
- SUPER_ADMIN seeds the master defaults; each ADMIN can customise their own copy.

---

## Summary Table

| # | Gap | Priority | Complexity |
|---|-----|----------|------------|
| 1 | SUPER_ADMIN role missing | CRITICAL | Medium |
| 2 | WhatsApp templates hardcoded | CRITICAL | Medium |
| 3 | Missing WhatsApp message types | HIGH | Medium |
| 4 | Email templates not editable from CRM | HIGH | Low |
| 5 | No CRM Messages section | HIGH | Medium |
| 6 | No CRM Roles section | HIGH | Medium |
| 7 | No CRM Control Centre | HIGH | Low |
| 8 | No multi-tenancy / tenantId | HIGH | High |
| 9 | No CRM Services section | MEDIUM | Low |
| 10 | No CRM artist media management | MEDIUM | Low |
| 11 | Reselling architecture not decided | HIGH | High |
| 12 | WhatsApp agent (AI/conversational) | MEDIUM | Very High |
| 13 | Leads access control incomplete | CRITICAL | Low |
| 14 | No CRM general Settings UI | MEDIUM | Low |
| 15 | Templates not per-tenant | HIGH | Medium |

---

## Recommended Fix Order (Before Prod)

1. **SUPER_ADMIN role + leads access guard** (items 1, 13) — security, must be first.
2. **WhatsApp templates → DB + editable** (items 2, 3) — core automation value.
3. **Email templates CRM UI** (items 4, 5) — quick win, service already built.
4. **CRM Roles section** (item 6) — needed before handing to any client.
5. **CRM Control Centre** (item 7) — needed to arm/disarm features per client.
6. **CRM Services section + artist media** (items 9, 10) — needed for live demo.
7. **CRM general Settings UI** (item 14) — polish.
8. **Multi-tenancy / tenantId** (item 8) — needed before selling second client.
9. **Reselling architecture** (item 11) — plan before building item 8.
10. **Templates per-tenant** (item 15) — follows from item 8.
11. **WhatsApp agent** (item 12) — optional add-on, sell separately.
