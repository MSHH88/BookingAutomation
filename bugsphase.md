## AUDIT‑001..AUDIT‑010 Completion Status (Verification)

> Verified: 2026-04-14 against commit `a94cddd` (HEAD of `copilot/create-detailed-automation-plan`).

AUDIT-001: ✅ Completed — `requireFeature.ts` updated: `isFeatureEnabled(flag, tenantId?)` with tenant-scoped cache key `feature:{flag}:{tenantId||'global'}`, two-step DB lookup (tenant row → global row fallback), middleware extracts `tenantId` via `extractTenantId(req)`.
AUDIT-002: ✅ Completed — `campaigns.controller.ts`, `recurring-bookings.controller.ts`, `email-templates.controller.ts`, `whatsapp-templates.controller.ts`, `sms-templates.controller.ts`, `push.routes.ts`, `roles.controller.ts`, `sessions.controller.ts`, `ai.controller.ts`, `invoices.controller.ts`, `webhooks.controller.ts`, `notifications.controller.ts`, `settings.controller.ts`, `quotes.controller.ts` — all migrated to `extractTenantId(req)` + 403 guard (removed unsafe `as string` casts).
AUDIT-003: ✅ Completed — `customers.service.ts` (CANCELLATION_FEE_ENABLED), `reviews.queue.ts` (REVIEW_REQUEST_ENABLED), `bookings.service.ts` (enqueueReviewRequest), `whatsapp.service.ts` (WHATSAPP_CONTACT_ENABLED), `apple-calendar.service.ts` (APPLE_CALENDAR_ENABLED) — all converted from `getDefaultFlags()` to `await isFeatureEnabled(...)` with tenant context.
AUDIT-004: ✅ Completed — `admin.service.ts` `listFeatureFlags()` now applies `where: { OR: [{ tenantId: null }, { tenantId }] }` when a non-null tenantId is provided; SUPER_ADMIN (null tenantId) sees only global rows.
AUDIT-005: ✅ Completed — `findDuplicate()` in `capture.service.ts` now accepts `tenantId` param; `captureLeadPublic()` derives `tenantId` from the artist record and threads it into `findDuplicate()` so dedup is never cross-tenant.
AUDIT-006: ✅ Completed — Redundant `booking.tenantId!` non-null assertion removed from the `cancelBooking()` waitlist-match block in `bookings.service.ts`; TypeScript narrowing from the surrounding `if (booking.tenantId)` guard is sufficient.
AUDIT-007: ✅ Completed — Redis cache key changed from `feature:${flag}` to `feature:${flag}:${scopeKey}` where `scopeKey = tenantId ?? 'global'`; per-tenant and global flag values are now cached independently.
AUDIT-008: ✅ Completed — `campaigns.controller.ts` and `recurring-bookings.controller.ts` both use `extractTenantId(req)` for all handler functions; `req.user!.tenantId` patterns removed; `string | null` type maintained throughout.
AUDIT-009: ✅ Completed — `createPublicBooking()` in `public.service.ts` wraps the availability conflict-check + `booking.create` inside a single `prisma.$transaction()` (interactive transaction); double-booking race condition eliminated.
AUDIT-010: ✅ Completed — `cancelMyBooking()` in `customers.service.ts` now uses `await isFeatureEnabled('CANCELLATION_FEE_ENABLED', booking.tenantId)` instead of `getDefaultFlags()`; function is already async; tenant context passed from the fetched booking record.

### Created Files (AUDIT-001..AUDIT-010)

None. All AUDIT fixes are changes to existing files only.

### Modified Files (AUDIT-001..AUDIT-010)

- `backend/src/middleware/requireFeature.ts` — AUDIT-001, AUDIT-007
- `backend/src/modules/campaigns/campaigns.controller.ts` — AUDIT-002, AUDIT-008
- `backend/src/modules/recurring-bookings/recurring-bookings.controller.ts` — AUDIT-002, AUDIT-008
- `backend/src/modules/email-templates/email-templates.controller.ts` — AUDIT-002
- `backend/src/modules/whatsapp-templates/whatsapp-templates.controller.ts` — AUDIT-002
- `backend/src/modules/sms-templates/sms-templates.controller.ts` — AUDIT-002
- `backend/src/modules/push/push.routes.ts` — AUDIT-002
- `backend/src/modules/roles/roles.controller.ts` — AUDIT-002
- `backend/src/modules/sessions/sessions.controller.ts` — AUDIT-002
- `backend/src/modules/ai/ai.controller.ts` — AUDIT-002
- `backend/src/modules/invoices/invoices.controller.ts` — AUDIT-002
- `backend/src/modules/webhooks/webhooks.controller.ts` — AUDIT-002
- `backend/src/modules/notifications/notifications.controller.ts` — AUDIT-002
- `backend/src/modules/settings/settings.controller.ts` — AUDIT-002
- `backend/src/modules/quotes/quotes.controller.ts` — AUDIT-002
- `backend/src/modules/customers/customers.service.ts` — AUDIT-003, AUDIT-010
- `backend/src/modules/reviews/reviews.queue.ts` — AUDIT-003
- `backend/src/modules/bookings/bookings.service.ts` — AUDIT-003, AUDIT-006
- `backend/src/lib/apple-calendar.ts` — AUDIT-003
- `backend/src/modules/whatsapp/whatsapp.service.ts` — AUDIT-003
- `backend/src/modules/admin/admin.service.ts` — AUDIT-004
- `backend/src/modules/capture/capture.service.ts` — AUDIT-005
- `backend/src/modules/public/public.service.ts` — AUDIT-009
- `backend/src/modules/public/public.service.test.ts` — AUDIT-009

### Missing Items

None. All AUDIT-001..AUDIT-010 items are implemented and committed on `copilot/create-detailed-automation-plan`.

---

## ULTRA AUDIT — Backend Quality, Feature-Flag Coverage, and CRM Manageability (2026-04-14)

> **Audit date:** 2026-04-14
> **Commit ref / branch audited:** `76153ca` — `copilot/create-detailed-automation-plan`
> **Analysis only.** No code was modified during this audit. All findings are recommendations only.

---

### AUDIT-011 — `admin.service.ts` `getStudioSettings` / `updateStudioSettings` Missing Tenant Scoping

- **Severity:** 🔴 Critical
- **Files:**
  - `backend/src/modules/admin/admin.service.ts` (lines 127, 141–163)
  - `backend/src/modules/admin/admin.controller.ts` (lines 33–73)
- **What's wrong:** `getStudioSettings()` queries `prisma.studioSettings.findFirst({ select: settingsSelect })` with **no tenantId WHERE clause**, returning whichever settings row the DB returns first. `updateStudioSettings(body)` does the same — `findFirst({ select: { id: true } })` with no tenant filter and then updates that row. The `StudioSettings` model has a `tenantId String? @unique` column and one row per tenant, yet neither the service function nor `admin.controller.ts` passes a `tenantId` argument. Contrast: the parallel `settings.service.ts` (`GET/PATCH /api/settings`) correctly uses `where: { tenantId }` throughout.
- **Impact:** In a multi-tenant deployment every ADMIN user's `GET /api/admin/settings` returns the **same first row** (likely Tenant A's data exposed to Tenant B, C, …). `PATCH /api/admin/settings` overwrites that same shared row, wiping another tenant's studio name, timezone, deposit rules, cancellation policy, etc.
- **Regression risk:** High — this was never tenant-scoped in the admin service path.
- **Recommended fix:** Add a `tenantId: string | null` parameter to both `getStudioSettings(tenantId)` and `updateStudioSettings(tenantId, body)`. Apply `where: { tenantId }` in all four `prisma.studioSettings` calls. Update `admin.controller.ts` `getSettings` and `patchSettings` to extract `tenantId` via `extractTenantId(req)` and pass it down.

---

### AUDIT-012 — Duplicate / Conflicting Feature Flag Key Pairs — Route vs Job Mismatches

- **Severity:** 🟠 High
- **Files:**
  - `backend/src/config/businessType.ts` — `FEATURE_FLAG_KEYS` array
  - `backend/src/modules/recurring-bookings/recurring-bookings.routes.ts` — uses `RECURRING_BOOKING_ENABLED`
  - `backend/src/jobs/index.ts` — uses `RECURRING_BOOKINGS_ENABLED` (plural)
  - `backend/src/jobs/index.ts` — uses `REBOOKING_NUDGES_ENABLED`; no code ever uses `REBOOK_REMINDER_ENABLED`
  - `backend/src/modules/forms/forms.routes.ts` — uses `INTAKE_FORMS_ENABLED`; no code ever uses `FORMS_ENABLED`
  - `backend/src/modules/payments/payments.schema.ts` — comment references `TIPS_ENABLED`; no code enforces it; `TIP_COLLECTION_ENABLED` also exists but is also never enforced
- **What's wrong:** `FEATURE_FLAG_KEYS` contains **four legacy/duplicate pairs** where two distinct keys cover the same functional area but different code paths use different keys:
  1. `RECURRING_BOOKING_ENABLED` (route) vs `RECURRING_BOOKINGS_ENABLED` (job) — toggling the route key does not affect the job worker registration and vice versa.
  2. `REBOOK_REMINDER_ENABLED` (FEATURE_FLAG_KEYS only — never used) vs `REBOOKING_NUDGES_ENABLED` (jobs/index.ts).
  3. `TIP_COLLECTION_ENABLED` (FEATURE_FLAG_KEYS only — never used) vs `TIPS_ENABLED` (FEATURE_FLAG_KEYS only — never enforced either; mentioned only in a schema comment).
  4. `FORMS_ENABLED` (FEATURE_FLAG_KEYS only — never used) vs `INTAKE_FORMS_ENABLED` (forms.routes.ts).
- **Impact:** High — a SUPER_ADMIN toggling `RECURRING_BOOKING_ENABLED` to `false` in the Control Centre blocks the API routes but the BullMQ recurring-booking job worker continues running (it checks `RECURRING_BOOKINGS_ENABLED`). Symmetrically, disabling `RECURRING_BOOKINGS_ENABLED` stops the worker but leaves the API live. Both must be in sync for the feature to behave correctly.
- **Regression risk:** Medium — the mismatch pre-dates Phase 1; all defaults are `true` so the divergence is silent in production unless someone explicitly disables one flag.
- **Recommended fix:** (1) Pick one canonical key per feature and remove the duplicate from `FEATURE_FLAG_KEYS` and all `getDefaultFlags` blocks. (2) Update all call sites to the canonical key. Suggested resolutions: use `RECURRING_BOOKINGS_ENABLED` everywhere (rename route call site); use `REBOOKING_NUDGES_ENABLED` everywhere (remove `REBOOK_REMINDER_ENABLED`); use `INTAKE_FORMS_ENABLED` everywhere (remove `FORMS_ENABLED`); pick `TIPS_ENABLED` and add enforcement (see AUDIT-015).

---

### AUDIT-013 — ~16 Orphan Feature Flag Keys — Toggleable in Control Centre but Never Enforced at Runtime

- **Severity:** 🟠 High
- **Files:**
  - `backend/src/config/businessType.ts` — `FEATURE_FLAG_KEYS` array (all entries below)
- **What's wrong:** The following flag keys exist in `FEATURE_FLAG_KEYS`, have per-business-type defaults, appear in the SUPER_ADMIN Control Centre, and can be toggled — but **zero routes, services, middleware, or jobs** ever call `requireFeature()` or `isFeatureEnabled()` with these keys:

  | Flag key | Expected behaviour |
  |---|---|
  | `GDPR_ENABLED` | Consent capture on booking/registration |
  | `DAILY_REPORT_ENABLED` | Automated daily/weekly summary email |
  | `COVERS_MANAGEMENT_ENABLED` | Max covers per slot pacing |
  | `PARTY_SIZE_ENABLED` | Ask party size on reservation |
  | `SPECIAL_REQUESTS_ENABLED` | Free-text special requests |
  | `PORTFOLIO_ENABLED` | Artist portfolio visible on site |
  | `GALLERY_UPLOAD_ENABLED` | Gallery image uploads via CRM |
  | `LEAD_SCORING_ENABLED` | AI/rule-based lead score in CRM |
  | `ICS_DOWNLOAD_ENABLED` | Customer `.ics` download link |
  | `DEPOSIT_PARTIAL_ENABLED` | Configurable-% deposit mode |
  | `PRICE_LIST_VISIBLE` | Show prices publicly |
  | `INSTANT_BOOKING_ENABLED` | Skip lead form — direct book |
  | `MANNEQUIN_ENABLED` | 3-D body placement on inquiry |
  | `REFERENCE_IMAGES_ENABLED` | Customer uploads reference photos |
  | `REBOOK_REMINDER_ENABLED` | Automated rebook reminder (duplicate — see AUDIT-012) |
  | `TIP_COLLECTION_ENABLED` | Tip collection (duplicate — see AUDIT-015) |
  | `FORMS_ENABLED` | Intake/consent forms (duplicate — see AUDIT-012) |

- **Impact:** High — the Control Centre gives SUPER_ADMIN a false impression of control. Toggling these 17 flags does nothing. If a business deactivates `LEAD_SCORING_ENABLED`, `PARTY_SIZE_ENABLED`, etc., those features remain active. This is a UX/trust problem for the product.
- **Regression risk:** None — flags are currently all defaulted appropriately; no code relies on them being enforced.
- **Recommended fix:** For each orphan flag, either (a) add the enforcement gate (requireFeature call in the appropriate route or isFeatureEnabled check in the service/schema), or (b) remove the flag from `FEATURE_FLAG_KEYS` and the defaults if the feature is not yet implemented. Prioritise flags tied to high-visibility UX (PARTY_SIZE, PORTFOLIO, INSTANT_BOOKING) and compliance (GDPR).

---

### AUDIT-014 — `notification-dispatcher.ts` and `reminders.queue.ts` Call `isFeatureEnabled()` Without tenantId

- **Severity:** 🟡 Medium
- **Files:**
  - `backend/src/lib/notification-dispatcher.ts` — `resolveChannels()` at lines 58–60
  - `backend/src/modules/reminders/reminders.queue.ts` — `enqueueBookingReminder` at lines 210, 279
- **What's wrong:** `resolveChannels(channel)` checks `isFeatureEnabled('WHATSAPP_CONTACT_ENABLED')`, `isFeatureEnabled('SMS_REMINDERS_ENABLED')`, and `isFeatureEnabled('EMAIL_REMINDERS_ENABLED')` without passing `tenantId`. The `NotificationPayload` interface already carries `tenantId?: string` but it is not threaded into `resolveChannels`. The result is that all per-tenant flag overrides for notification channels are ignored — every tenant's notification dispatch uses the global (or first-matched) DB row. Similarly, `enqueueBookingReminder` calls `isFeatureEnabled('EMAIL_REMINDERS_ENABLED')` without tenant context.
- **Impact:** Medium — if a specific tenant has `WHATSAPP_CONTACT_ENABLED=false` (override row in DB) their customers still receive WhatsApp messages because the dispatcher uses the global flag value. Conversely, a globally-disabled channel cannot be enabled for a single tenant.
- **Regression risk:** Low — the bug pre-dates per-tenant flag support; behaviour is unchanged from before AUDIT-001 was fixed. It only matters once per-tenant overrides are actively used.
- **Recommended fix:** Change `resolveChannels(channel: ChannelPreference)` to `resolveChannels(channel: ChannelPreference, tenantId?: string | null)` and pass `tenantId` to each `isFeatureEnabled()` call. Thread `payload.tenantId` from `dispatchNotification` → `resolveChannels`. Apply the same fix to `enqueueBookingReminder` — add `tenantId?: string | null` to `EnqueueReminderParams` and pass it to `isFeatureEnabled`.

---

### AUDIT-015 — `TIPS_ENABLED` Feature Flag Has No Runtime Enforcement Point

- **Severity:** 🟡 Medium
- **Files:**
  - `backend/src/modules/payments/payments.service.ts` — `createPaymentIntent()` (lines 155–170)
  - `backend/src/modules/payments/payments.schema.ts` — schema comment only (line 26)
- **What's wrong:** The `TIPS_ENABLED` flag is defined in `FEATURE_FLAG_KEYS` (and `TIP_COLLECTION_ENABLED` is the legacy duplicate). `payments.schema.ts` comments that `tipAmount` is "Added to the PaymentIntent amount when TIPS_ENABLED", but `createPaymentIntent()` in `payments.service.ts` unconditionally processes any non-zero `tipAmount` from the request body — it never calls `isFeatureEnabled('TIPS_ENABLED')`. A SUPER_ADMIN toggling `TIPS_ENABLED` to `false` has no effect; tip collection remains active.
- **Impact:** Medium — tips can be collected even when the flag is off, which may cause accounting discrepancies for businesses that use the Control Centre to disable tip collection (e.g., switching business model).
- **Regression risk:** None — tips are currently processed correctly; this is a missing feature-gate, not a data-integrity regression.
- **Recommended fix:** In `createPaymentIntent()`, check `await isFeatureEnabled('TIPS_ENABLED', tenantId)` before processing `data.tipAmount`. If the flag is off, ignore `tipAmount` (set `tipPence = 0`) and optionally return a warning in the response. Remove `TIP_COLLECTION_ENABLED` as a duplicate (see AUDIT-012).

---

### AUDIT-016 — Background Jobs Registered Once at Startup — Feature Flag Toggles Take No Effect Until Restart

- **Severity:** 🟡 Medium
- **Files:**
  - `backend/src/jobs/index.ts` — `registerAllJobs()`
  - `backend/src/jobs/birthday.job.ts`, `campaign.job.ts`, `rebook-nudge.job.ts`, `recurring-booking.job.ts`, `no-show.job.ts`, `waitlist-match.job.ts`
- **What's wrong:** `registerAllJobs()` is called once at server startup and checks each feature flag exactly once to decide whether to start BullMQ workers/queues. If a SUPER_ADMIN later toggles `BIRTHDAY_AUTOMATION_ENABLED`, `CAMPAIGNS_ENABLED`, `REBOOKING_NUDGES_ENABLED`, `RECURRING_BOOKINGS_ENABLED`, `NO_SHOW_AUTOMATION_ENABLED`, or `WAITING_LIST_ENABLED` via the Control Centre: (a) toggling OFF does not stop the already-running worker — it continues consuming jobs, (b) toggling ON does not start a new worker — no jobs are processed until the next server restart. The AI suggestion worker (`ai-suggestion.job.ts`) correctly re-checks the flag inside each job execution, but the others do not.
- **Impact:** Medium — this is an operational gap, not a data-corruption risk. A SUPER_ADMIN may believe a job has been stopped when it is still running (or started when it hasn't). The 60-second Redis cache means any flag check inside a job loop would re-read the flag quickly.
- **Regression risk:** None.
- **Recommended fix:** Two options: (1) Mirror the `ai-suggestion.job.ts` pattern — add a per-job `isFeatureEnabled` check at the top of each worker's `process()` function so the job no-ops when the flag is off, and document that ON→job requires restart; (2) More robust: add a post-flag-update hook in `admin.service.ts` `updateFeatureFlag()` that triggers worker start/stop (hard to do cleanly with BullMQ). Option 1 is simpler and prevents unwanted job execution without needing to manage live worker lifecycle.

---

### AUDIT-017 — CAPTCHA and Rate-Limit Parameters Are `.env`-Only — Not CRM-Editable

- **Severity:** 🟡 Medium
- **Files:**
  - `backend/src/config/index.ts` — `CAPTCHA_ENABLED`, `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`
  - `backend/src/middleware/captcha.ts`
  - `backend/src/app.ts` — global rate limiter
- **What's wrong:** CAPTCHA enforcement (`CAPTCHA_ENABLED=true/false`) and the global rate-limit parameters are read once from environment variables at process start and are fixed for the lifetime of the server. The Control Centre (`/api/admin/feature-flags`) has no way to toggle CAPTCHA on/off at runtime, meaning enabling CAPTCHA in production requires a deployment/restart. For a multi-tenant SaaS product, operators typically want to enable CAPTCHA for specific tenants under bot attack without redeploying.
- **Impact:** Medium — workable but degrades real-world operational agility; CAPTCHA changes require server restarts.
- **Regression risk:** None.
- **Recommended fix:** Add `CAPTCHA_ENABLED` as a `FeatureFlagKey` (or separate it into a well-named `PUBLIC_CAPTCHA_ENABLED` flag) so it can be toggled from the Control Centre like other feature flags. The `requireCaptcha` middleware can check `isFeatureEnabled('PUBLIC_CAPTCHA_ENABLED')` instead of the env var. Rate-limit parameters can remain env-only (they are infrastructure-level), but document this explicitly.

---

### AUDIT-018 — `reminders.queue.ts` and Several Background Job Files Use Global (Non-Tenant) Feature Flag Checks

- **Severity:** 🟡 Medium
- **Files:**
  - `backend/src/modules/reminders/reminders.queue.ts` (lines 210, 279)
  - `backend/src/jobs/birthday.job.ts` (no per-tenant isFeatureEnabled check inside job processing)
  - `backend/src/jobs/no-show.job.ts` (no per-tenant isFeatureEnabled check)
  - `backend/src/jobs/rebook-nudge.job.ts` (no per-tenant isFeatureEnabled check)
- **What's wrong:** Background jobs that process individual bookings/customers do not perform per-tenant feature flag checks when executing. A job started for Tenant A's `BIRTHDAY_AUTOMATION_ENABLED` flag being `true` will also process customers from Tenant B, even if Tenant B has `BIRTHDAY_AUTOMATION_ENABLED=false` in a per-tenant override row. The jobs query all records matching a time window without filtering by tenant-flag pairs.
- **Impact:** Medium — per-tenant feature override system is partially bypassed for background automations. If a tenant disables a job-driven feature (e.g., birthday automation), they may still receive automated messages because the global worker processes all tenants.
- **Regression risk:** Low — per-tenant overrides are a new capability; before AUDIT-001 all flag checks were global anyway.
- **Recommended fix:** In each job's per-record processing loop, extract the record's `tenantId` and call `await isFeatureEnabled(flagKey, tenantId)` before processing that record. This ensures per-tenant overrides are respected at job execution time, not just at worker startup.

---

### B) Feature Flag System "Control Centre" Completeness — Explicit Assessment

**1. Can Super Admin globally enable/disable every feature?**
Mostly yes — all flags are accessible via `PATCH /api/admin/feature-flags/:key` (SUPER_ADMIN only). However, 17 orphan flags (AUDIT-013) and 4 duplicate-key mismatches (AUDIT-012) mean that toggling ~21 of the ~85 defined flags has zero runtime effect.

**2. Can Super Admin set per-tenant overrides and do they actually take effect everywhere?**
Partially. The DB model and admin API correctly support per-tenant override rows (AUDIT-001..004 fixed). However, per-tenant overrides are **not respected** in: (a) notification dispatch (`notification-dispatcher.ts` — AUDIT-014), (b) reminder enqueueing (`reminders.queue.ts` — AUDIT-014/018), (c) background job per-record processing (AUDIT-018).

**3. Are there any remaining `getDefaultFlags()` or other static-default checks?**
`getDefaultFlags()` is now only called as a **fallback** inside `requireFeature.ts` when both Redis and the DB are unavailable (lines 85, 93). This is correct and intentional. No production-path code calls `getDefaultFlags()` unconditionally.

**4. Are enforcement points consistent?**
- Middleware `requireFeature`: ✅ All feature-gated route modules use it correctly (45+ usages found).
- Service-level `isFeatureEnabled`: ✅ Used in bookings, leads, reminders, reviews, calendar, whatsapp, AI job.
- Job registration: ✅ `jobs/index.ts` checks flags at startup; ❌ no per-job re-check for most workers (AUDIT-016/018).
- Background processors: ❌ Per-tenant override not applied during per-record processing (AUDIT-018).

**5. Cache correctness**
- Cache keys are now tenant-scoped: `feature:{flag}:{tenantId||'global'}` ✅ (AUDIT-007 fixed).
- TTL is 60 seconds — sensible for a feature-flag system ✅.
- No cross-tenant bleed: ✅ (per-tenant scope key isolates tenant-specific values).

---

### C) CRM Manageability / Admin Editability — Assessment

| Area | Status | Notes |
|---|---|---|
| Business settings (timezone, currency, deposit, cancellation policy) | ✅ CRM-editable | `PATCH /api/settings` (correctly scoped); `PATCH /api/admin/settings` broken (AUDIT-011) |
| Services & categories | ✅ CRM-editable | Full CRUD at `/api/services` (SERVICE_MENU_ENABLED gate) |
| Artists/staff | ✅ CRM-editable | CRUD at `/api/artists` + `/api/admin/artists` |
| Artist availability & breaks | ✅ CRM-editable | `/api/availability` (CRUD) |
| Staff rota / shifts | ✅ CRM-editable | `/api/rota` (ROTA_ENABLED gate) |
| Pricing rules | ✅ CRM-editable | `/api/pricing-rules` CRUD (DYNAMIC_PRICING_ENABLED gate) |
| Locations | ✅ CRM-editable | `/api/locations` CRUD (MULTI_LOCATION_ENABLED gate) |
| Email templates | ✅ CRM-editable | `/api/notifications` + `/api/email-templates` CRUD |
| WhatsApp templates | ✅ CRM-editable | `/api/whatsapp-templates` CRUD |
| SMS templates | ✅ CRM-editable | `/api/sms-templates` CRUD |
| Roles & permissions | ✅ CRM-editable | `/api/roles` CRUD |
| Feature flags (global) | ✅ CRM-editable | `PATCH /api/admin/feature-flags/:key` (SUPER_ADMIN) |
| Feature flags (per-tenant) | ✅ CRM-editable | `PATCH /api/admin/feature-flags/:key?tenantId=X` (SUPER_ADMIN) |
| Packages & memberships | ✅ CRM-editable | `/api/packages`, `/api/memberships` CRUD |
| Loyalty rules | ✅ CRM-editable | `/api/loyalty` CRUD |
| Gift cards | ✅ CRM-editable | `/api/gift-cards` CRUD |
| Products / inventory | ✅ CRM-editable | `/api/products` CRUD (INVENTORY_ENABLED gate) |
| Sessions / classes | ✅ CRM-editable | `/api/sessions` CRUD (GROUP_BOOKING_ENABLED gate) |
| Public booking widget toggle | ✅ CRM-editable | Via `BOOKING_ENABLED` + `PUBLIC_BOOKING_ENABLED` flags |
| Tenant provisioning | ✅ CRM-editable | `/api/tenants` CRUD (SUPER_ADMIN) |
| CAPTCHA enforcement | ❌ `.env`-only | `CAPTCHA_ENABLED` env var — requires restart (AUDIT-017) |
| Rate limit parameters | ❌ `.env`-only | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` — infra level, acceptable |
| Calendar OAuth credentials | ❌ Per-artist flow only | No unified admin view; per-artist via `/api/calendar` connect flows |
| Stripe API keys | ❌ `.env`-only | Appropriate for security; no per-tenant payment gateway config |
| Background job schedules | ❌ `.env`-only | No DB-configurable cron expressions; job timing is hardcoded |
| Studio name in notification templates | ⚠️ Mixed | `config.STUDIO_NAME` (env) used in some job templates instead of `StudioSettings.studioName` (DB) |

---

### D) Security & Compliance — Assessment

| Area | Status | Notes |
|---|---|---|
| JWT auth (access + refresh) | ✅ | HS256, 15 min access, 7 day refresh, jti revocation via Redis |
| SUPER_ADMIN null tenantId | ✅ | No crashes found; `listUsers`, `listArtistsAdmin`, `listFeatureFlags` handle null correctly |
| Logging safety | ✅ | Request logger logs method/path/status/duration/IP only; no body/headers in logs |
| PII in logs | ✅ | Email and phone masked in notification-dispatcher logs (`'***'`); password-reset email logged as `{ email }` only (acceptable) |
| Rate limiting | ✅ | Global limiter + stricter limiters on `/api/capture` (5/15min) and `/api/public/*/bookings` (5/15min) |
| CAPTCHA | ✅ | `requireCaptcha` middleware on public booking POST; ⚠️ env-only toggle (AUDIT-017) |
| Stripe webhook signature | ✅ | `stripe.webhooks.constructEvent()` used; raw body preserved on `/api/payments/webhook` |
| Outgoing webhook secret | ✅ | 32-byte cryptographic secret per webhook; secret returned only on creation (one-time reveal pattern) |
| Bcrypt cost | ✅ | Cost factor 12; timing-safe dummy hash for non-existent users |
| CORS | ✅ | `ALLOWED_ORIGINS` allowlist; `credentials: true`; `SameSite=Strict` on refresh token cookie |
| Prisma cross-tenant leakage | ✅ (with caveat) | All major modules correctly scope queries to tenantId; admin.service.ts StudioSettings is the exception (AUDIT-011) |
| Multi-tenant bypass via null tenantId | ✅ | Post AUDIT-006/015 fixes: all critical tenant checks use strict inequality (`!==`) not `&&` pattern |

---

> **Ultra Audit Summary:**
> - **New findings: AUDIT-011 through AUDIT-018** (8 total)
> - **Highest severity: 🔴 Critical** — AUDIT-011 (`admin.service.ts` StudioSettings missing tenant scoping)
> - **🔴 Critical: 1** (AUDIT-011)
> - **🟠 High: 2** (AUDIT-012, AUDIT-013)
> - **🟡 Medium: 5** (AUDIT-014, AUDIT-015, AUDIT-016, AUDIT-017, AUDIT-018)
>
> **Can every feature be turned on/off in Control Centre?** **Partially** — ~64 of ~85 flags are correctly enforced; ~17 orphan flags (AUDIT-013) and 4 duplicate-key mismatches (AUDIT-012) mean roughly 25% of the flags have no runtime effect.
>
> **Is everything manageable/editable from CRM?** **Mostly yes** — all core operational data (services, artists, settings, templates, pricing, packages, memberships, locations, sessions, feature flags) is CRM-editable. Key gaps: CAPTCHA toggle requires restart (AUDIT-017); StudioSettings via `/api/admin/settings` is broken (AUDIT-011); some notification templates use `config.STUDIO_NAME` (env) instead of DB-backed `studioName`.

---

# Phase 1–3 Implementation File Register (AUTO-GENERATED)

> Generated: 2026-04-14 by post-phase-3 verification agent.
> Branch: `copilot/create-detailed-automation-plan`
> Working tree: **CLEAN** — nothing uncommitted.

---
AUDIT-001:

backend/src/middleware/requireFeature.ts — isFeatureEnabled(flag, tenantId?) with tenant-scoped cache keys feature:{flag}:{tenantId||'global'}, two-step DB lookup (tenant row → global row), requireFeature extracts tenantId from req
AUDIT-002 (13 controllers/routes):

campaigns.controller.ts, recurring-bookings.controller.ts — extractTenantId(req) + 403 guard
email-templates.controller.ts, whatsapp-templates.controller.ts, sms-templates.controller.ts — removed as string casts + 403 guard
push.routes.ts, roles.controller.ts, sessions.controller.ts, ai.controller.ts, invoices.controller.ts, webhooks.controller.ts, notifications.controller.ts, settings.controller.ts, quotes.controller.ts
AUDIT-003 (6 files):

customers.service.ts — await isFeatureEnabled('CANCELLATION_FEE_ENABLED', booking.tenantId) (added tenantId: true to select)
reviews.queue.ts — added tenantId? to EnqueueReviewParams, await isFeatureEnabled('REVIEW_REQUEST_ENABLED', params.tenantId)
bookings.service.ts — passes tenantId: booking.tenantId to enqueueReviewRequest
whatsapp.service.ts — canSend made async, uses await isFeatureEnabled('WHATSAPP_CONTACT_ENABLED')
apple-calendar.service.ts — 3 functions use await isFeatureEnabled('APPLE_CALENDAR_ENABLED')
capture.schema.ts, leads.schema.ts — replaced getDefaultFlags() with activeBusinessType === 'tattoo_studio' (startup-time config, not async DB)
## Created Files (Phase 1 / Phase 2 / Phase 3)

### Phase 1 — Security & Critical Fixes

- `backend/src/modules/auth/auth.email.processor.ts` — BullMQ processor for password-reset emails (FINDING-002)
- `backend/src/modules/auth/auth.email.queue.ts` — BullMQ queue definition for auth emails (FINDING-002)

### Phase 2 — API Quality & Tenant Scoping

- `backend/src/utils/extractTenantId.ts` — `extractTenantId(req)` utility replacing `req.user!.tenantId!` (FINDING-019/028/030)
- `backend/src/middleware/captcha.ts` — `requireCaptcha` middleware for public route CAPTCHA verification (FINDING-010)

### Phase 3 — Schema Cleanup & Code Quality

- `backend/prisma/migrations/20260414000001_remove_gift_voucher_enabled/migration.sql` — Delete orphaned GIFT_VOUCHER_ENABLED row (FINDING-016)
- `backend/prisma/migrations/20260414000002_feature_flag_per_tenant_unique/migration.sql` — Replace `key` unique with `@@unique([key, tenantId])` (FINDING-011)

---

## Modified Files (Phase 1 / Phase 2 / Phase 3)

### Phase 1 — Security & Critical Fixes

- `backend/src/config/index.ts` — Added required-credential validation + env vars for Resend, rate-limit, CAPTCHA (FINDING-007/002)
- `backend/src/server.ts` — Register BullMQ auth-email worker; call `pingRedis()` at startup (FINDING-002/021)
- `backend/src/middleware/requireFeature.ts` — Wire to DB + Redis; replace all `getDefaultFlags()` call sites (FINDING-001)
- `backend/src/middleware/auth.ts` — Add `jti` claim + Redis revocation check on every request (FINDING-008)
- `backend/src/modules/auth/auth.service.ts` — BullMQ enqueue for password-reset; remove token debug log (FINDING-002/029)
- `backend/src/modules/auth/auth.controller.ts` — Logout: revoke JWT `jti` in Redis (FINDING-008)
- `backend/src/modules/admin/admin.service.ts` — Add `tenantId` filter to listUsers, listArtistsAdmin, etc. (FINDING-003)
- `backend/src/modules/admin/admin.controller.ts` — Pass `tenantId` from req.user to all admin service calls (FINDING-003)
- `backend/src/modules/bookings/bookings.service.ts` — Add `tenantId` filter to `listBookings`; transaction for conflict-check (FINDING-004/027)
- `backend/src/modules/bookings/bookings.controller.ts` — Pass tenantId to listBookings (FINDING-004)
- `backend/src/modules/analytics/analytics.service.ts` — Add tenantId scoping to all four analytics functions (FINDING-022)
- `backend/src/modules/analytics/analytics.controller.ts` — Pass tenantId to all analytics service calls (FINDING-022/005)
- `backend/src/modules/leads/leads.service.ts` — Add tenantId filter to listLeads + export cap (FINDING-023)
- `backend/src/modules/leads/leads.controller.ts` — Pass tenantId to leads list/export (FINDING-023)
- `backend/src/modules/memberships/memberships.controller.ts` — Guard tenantId null for SUPER_ADMIN (FINDING-005)
- `backend/src/modules/payments/payments.service.ts` — Add tenantId scoping to createPaymentIntent/getPaymentStatus/refundPayment (FINDING-032)
- `backend/src/modules/payments/payments.controller.ts` — Pass tenantId to payment service calls (FINDING-032)
- `backend/src/modules/payroll/payroll.routes.ts` — Swap `requireAuth` before `requireFeature` (FINDING-006)
- `backend/src/modules/tables/tables.service.ts` — Add tenantId scoping to all 5 table functions (FINDING-031)
- `backend/src/modules/tables/tables.controller.ts` — Pass tenantId from request user (FINDING-031)
- `backend/src/jobs/ai-suggestion.job.ts` — Use `isFeatureEnabled()` instead of `getDefaultFlags()` (FINDING-001)
- `backend/src/jobs/index.ts` — Guard AI job registration behind `isFeatureEnabled()` (FINDING-001)
- `backend/src/lib/notification-dispatcher.ts` — Use `isFeatureEnabled()` instead of `getDefaultFlags()` (FINDING-001)
- `backend/src/modules/calendar/calendar.service.ts` — Use `isFeatureEnabled()` instead of `getDefaultFlags()` (FINDING-001)
- `backend/src/modules/calendar/outlook-calendar.service.ts` — Use `isFeatureEnabled()` instead of `getDefaultFlags()` (FINDING-001)
- `backend/src/modules/public/public.service.ts` — Use `isFeatureEnabled()` instead of `getDefaultFlags()` (FINDING-001)
- `backend/src/modules/leads/leads.service.ts` — Use `isFeatureEnabled()` instead of `getDefaultFlags()` (FINDING-001)
- `backend/src/modules/reminders/reminders.queue.ts` — Use `isFeatureEnabled()` instead of `getDefaultFlags()` (FINDING-001)
- `backend/src/modules/bookings/bookings.service.ts` — Use `isFeatureEnabled()` instead of `getDefaultFlags()` (FINDING-001)
- `backend/src/modules/admin/admin.service.test.ts` — Test regressions fix (Phase 1 test cleanup)
- `backend/src/modules/auth/auth.service.test.ts` — Test regressions fix (Phase 1 test cleanup)
- `backend/src/modules/bookings/bookings.service.test.ts` — Test regressions fix (Phase 1 test cleanup)

### Phase 2 — API Quality & Tenant Scoping

- `backend/src/modules/webhooks/webhooks.service.ts` — Add tenantId scoping to all webhook CRUD (FINDING-024)
- `backend/src/modules/webhooks/webhooks.controller.ts` — Pass tenantId from request (FINDING-024)
- `backend/src/modules/invoices/invoices.service.ts` — Add tenantId filter to listInvoices (FINDING-025)
- `backend/src/modules/invoices/invoices.controller.ts` — Pass tenantId from request (FINDING-025)
- `backend/src/modules/notifications/notifications.service.ts` — Add tenantId scoping to template CRUD (FINDING-026)
- `backend/src/modules/notifications/notifications.controller.ts` — Pass tenantId from request (FINDING-026)
- `backend/src/modules/quotes/quotes.service.ts` — Add tenantId scoping to listQuotes/getQuoteById/acceptQuote (FINDING-033)
- `backend/src/modules/quotes/quotes.controller.ts` — Pass tenantId from request (FINDING-033)
- `backend/src/modules/settings/settings.service.ts` — Add tenantId to getCachedSettings/updateSettings (FINDING-034)
- `backend/src/modules/settings/settings.controller.ts` — Pass tenantId to settings service (FINDING-034)
- `backend/src/modules/payments/payments.service.ts` — Use tenantId-scoped settings in Stripe calls (FINDING-034)
- `backend/prisma/schema.prisma` — Add `tenantId` to Quote model (FINDING-033)
- `backend/src/modules/bookings/bookings.service.ts` — Add `.catch()` to all fire-and-forget void calls (FINDING-009)
- `backend/src/modules/leads/leads.service.ts` — Add `.catch()` to fire-and-forget (FINDING-009)
- `backend/src/modules/payments/payments.service.ts` — Add `.catch()` to fire-and-forget (FINDING-009)
- `backend/src/modules/admin/admin.schema.ts` — Zod `isActive` boolean coercion via `.transform()` (FINDING-018)
- `backend/src/modules/admin/admin.service.ts` — Use coerced boolean for isActive (FINDING-018)
- `backend/src/config/index.ts` — Add `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `CAPTCHA_*` to AppConfig (FINDING-014/010)
- `backend/src/app.ts` — Use `config.RATE_LIMIT_WINDOW_MS` / `config.RATE_LIMIT_MAX` in global rate limiter; add `/health` degraded status (FINDING-014/021)
- `backend/src/lib/redis.ts` — Add `pingRedis()` + `isRedisHealthy()` (FINDING-021)
- `backend/src/server.ts` — Call `pingRedis()` at startup (FINDING-021)
- `backend/src/modules/rota/rota.controller.ts` — Return 204 on DELETE (FINDING-028)
- `backend/src/modules/availability/availability.controller.ts` — Return 204 on DELETE (FINDING-028)
- `backend/src/modules/artists/artist-media.controller.ts` — Return 204 on DELETE (FINDING-028)
- `backend/src/modules/alerts/alerts.service.ts` — Add pagination support (FINDING-030)
- `backend/src/modules/alerts/alerts.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/artists/artist-media.service.ts` — Add pagination support (FINDING-030)
- `backend/src/modules/booking-photos/booking-photos.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/booking-photos/booking-photos.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/customer-stats/customer-stats.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/customer-stats/customer-stats.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/forms/forms.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/forms/forms.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/gift-cards/gift-cards.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/gift-cards/gift-cards.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/health-flags/health-flags.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/health-flags/health-flags.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/locations/locations.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/locations/locations.controller.ts` — Pass pagination params; use extractTenantId (FINDING-030/019)
- `backend/src/modules/locations/locations.schema.ts` — Add pagination schema (FINDING-030)
- `backend/src/modules/loyalty/loyalty.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/loyalty/loyalty.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/packages/packages.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/packages/packages.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/pos/pos.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/pos/pos.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/pricing/pricing.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/pricing/pricing.controller.ts` — Pass pagination params; use extractTenantId (FINDING-030/019)
- `backend/src/modules/pricing/pricing.schema.ts` — Add pagination schema (FINDING-030)
- `backend/src/modules/products/products.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/products/products.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/referrals/referrals.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/referrals/referrals.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/rota/rota.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/sessions/sessions.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/sessions/sessions.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/sessions/sessions.schema.ts` — Add pagination schema (FINDING-030)
- `backend/src/modules/social/social.service.ts` — Add pagination (FINDING-030)
- `backend/src/modules/social/social.controller.ts` — Pass pagination params (FINDING-030)
- `backend/src/modules/memberships/memberships.controller.ts` — Use extractTenantId (FINDING-019)
- `backend/src/modules/analytics/analytics.controller.ts` — Use extractTenantId (FINDING-019)
- `backend/src/modules/auth/auth.controller.ts` — Update forgotPassword comments (FINDING-017)
- `backend/src/modules/auth/auth.routes.ts` — Update forgotPassword route comments (FINDING-017)

### Phase 3 — Schema Cleanup & Code Quality

- `backend/src/config/businessType.ts` — Remove `GIFT_VOUCHER_ENABLED` from FEATURE_FLAG_KEYS + all defaultFeatureFlags (FINDING-016)
- `backend/prisma/schema.prisma` — Add `@@unique([key, tenantId])` to FeatureFlag; remove old `@@unique([key])` (FINDING-011)
- `backend/src/modules/admin/admin.service.ts` — Extend `updateFeatureFlag()` with optional tenantId + upsert (FINDING-011)
- `backend/src/modules/admin/admin.controller.ts` — Accept `?tenantId=` query param in PATCH /feature-flags/:key (FINDING-011)
- `backend/src/modules/admin/admin.service.test.ts` — Tests for per-tenant flag upsert (FINDING-011)
- `backend/src/middleware/requireFeature.ts` — Switch from `findUnique` to `findFirst` after composite unique change (FINDING-011)
- `backend/src/modules/bookings/bookings.service.ts` — Separate tenantId null-check from feature-flag guard (FINDING-015)
- `backend/src/modules/products/products.service.ts` — Replace `where: any` with `Prisma.ProductWhereInput` (FINDING-013)
- `backend/src/modules/pos/pos.service.ts` — Replace `where: any` with `Prisma.PaymentWhereInput` (FINDING-013)
- `backend/src/modules/public/public.routes.ts` — Add `requireFeature('BOOKING_ENABLED')` master switch before `PUBLIC_BOOKING_ENABLED` (FINDING-020)
- `backend/src/modules/analytics/analytics.controller.ts` — Use `extractTenantId(req)` (FINDING-019)
- `backend/src/modules/locations/locations.controller.ts` — Use `extractTenantId(req)` (FINDING-019)
- `backend/src/modules/memberships/memberships.controller.ts` — Use `extractTenantId(req)` (FINDING-019)
- `backend/src/modules/pricing/pricing.controller.ts` — Use `extractTenantId(req)` (FINDING-019)

---

## Missing / Not Committed / Not Merged

**None.** All Phase 1, 2, and 3 expected deliverables are present, committed, and on the current branch.

> Verification: `git status` → `nothing to commit, working tree clean`
> All 27 bug-fix commits are present in the history of `copilot/create-detailed-automation-plan`.

---

## Backend-Wide Audit Findings (Post Phase 1–3 Verification)

> Audit performed 2026-04-14 across all backend modules, middleware, jobs, integrations, config, and schema.

---

### AUDIT-001 — `requireFeature` Does Not Support Per-Tenant Overrides in Middleware

**Severity:** 🟡 Medium
**File:** `backend/src/middleware/requireFeature.ts`
**What's wrong:** FINDING-011 correctly added `@@unique([key, tenantId])` to the schema and extended the admin API/service to upsert per-tenant rows. However, `requireFeature()` middleware still uses `prisma.featureFlag.findFirst({ where: { key: flag } })` which returns *any* row matching the key — typically the global row — without considering the authenticated user's tenantId. A per-tenant override row can exist in the DB but will never be used by route-level `requireFeature()` calls.
**Impact:** Medium — per-tenant feature flag overrides are write-able through the admin API but are never read by the middleware; the feature is half-implemented at runtime.
**Regression risk:** No regression — previous behaviour unchanged. New capability silently missing.
**Recommended fix:** Update `isFeatureEnabled()` to accept an optional `tenantId` parameter; in the middleware, extract `req.user?.tenantId` and pass it. Query strategy: look for `{ key: flag, tenantId }` first; fall back to `{ key: flag, tenantId: null }` if no override row exists.
**Classification:** Previously known but not fully fixed (FINDING-011 partial).

---

### AUDIT-002 — ~26 Controllers Still Use `req.user!.tenantId` Without `extractTenantId()`

**Severity:** 🟡 Medium
**Files:**
- `backend/src/modules/campaigns/campaigns.controller.ts`
- `backend/src/modules/recurring-bookings/recurring-bookings.controller.ts`
- `backend/src/modules/email-templates/email-templates.controller.ts` (with unsafe `as string` cast)
- `backend/src/modules/whatsapp-templates/whatsapp-templates.controller.ts` (with unsafe `as string` cast)
- `backend/src/modules/sms-templates/sms-templates.controller.ts` (with unsafe `as string` cast)
- `backend/src/modules/push/push.routes.ts`
- `backend/src/modules/roles/roles.controller.ts`
- (+ ~19 more controllers using `req.user!.tenantId ?? null`)

**What's wrong:** FINDING-019 (Phase 3) partially migrated controllers to `extractTenantId(req)`. Approximately 26 call sites in production-path controllers still use the direct `req.user!.tenantId` pattern. The `?? null` coalescing in most of these is safe, but the `as string` casts in template controllers (email-templates, whatsapp-templates, sms-templates) could crash when a SUPER_ADMIN (tenantId=null) accesses those endpoints.
**Impact:** Medium — SUPER_ADMIN requests to template-management endpoints could receive incorrect data or encounter runtime errors due to the `as string` type cast on a null value.
**Regression risk:** Low — only SUPER_ADMIN accounts are affected; regular tenant admins always have a non-null tenantId.
**Recommended fix:** Replace all `req.user!.tenantId as string` patterns with `extractTenantId(req)`. For endpoints that genuinely require a non-null tenantId, add an explicit guard: `if (!tenantId) throw new AppError(403, 'FORBIDDEN', 'Tenant context required')`.
**Classification:** New bug (FINDING-019 incomplete pass).

---

### AUDIT-003 — Several Services Still Call `getDefaultFlags()` Instead of `isFeatureEnabled()`

**Severity:** 🟡 Medium
**Files:**
- `backend/src/modules/customers/customers.service.ts:259` — CANCELLATION_FEE_ENABLED check
- `backend/src/lib/apple-calendar.ts:174,239,304` — Apple Calendar feature checks
- `backend/src/modules/reviews/reviews.queue.ts:152` — REVIEW_REQUEST_ENABLED gate
- `backend/src/modules/whatsapp/whatsapp.service.ts:101` — WHATSAPP_CONTACT_ENABLED gate
- `backend/src/modules/capture/capture.schema.ts:51` — MANNEQUIN_ENABLED for schema building
- `backend/src/modules/leads/leads.schema.ts:45` — feature-dependent schema field

**What's wrong:** FINDING-001 (Phase 1) replaced all `getDefaultFlags()` usages in the critical path. However, several service-layer checks that gate optional features (cancellation fees, review requests, WhatsApp sends, Apple Calendar syncs) still read the static in-memory defaults rather than the DB-backed flags. This means these features cannot be toggled at runtime via the admin flag API.
**Impact:** Medium — feature flags for cancellation fees, review requests, WhatsApp, and Apple Calendar cannot be controlled via the admin UI. They are permanently determined by the BUSINESS_TYPE environment variable at startup.
**Regression risk:** No regression — static defaults were used before. Runtime toggleability is the missing feature.
**Recommended fix:** Convert each `getDefaultFlags()` call to `await isFeatureEnabled('FLAG_NAME')` where the calling context is already async. For schema-building contexts (capture.schema.ts, leads.schema.ts), which run synchronously at module load time, consider caching the flag value once at server startup or restructuring the schema to accept the flag at request time.
**Classification:** Previously known (FINDING-001 partial — not all call sites migrated).

---

### AUDIT-004 — `listFeatureFlags` Admin Endpoint Missing Tenant Filter (Returns All Rows)

**Severity:** 🟡 Medium
**File:** `backend/src/modules/admin/admin.service.ts:173`
**What's wrong:** `listFeatureFlags()` calls `prisma.featureFlag.findMany({ select, orderBy })` with no `where` clause. After FINDING-011 introduced per-tenant rows, an ADMIN user calling `GET /api/admin/feature-flags` will receive all rows including other tenants' override rows. The `_tenantId` parameter is accepted but never used in the query.
**Impact:** Medium — tenants can observe which features other tenants have overridden; minor information disclosure in a multi-tenant deployment.
**Regression risk:** No regression — cross-tenant data was visible before Phase 3 too.
**Recommended fix:** Apply `where: { OR: [{ tenantId: null }, { tenantId }] }` in `listFeatureFlags` when a non-null tenantId is provided.
**Classification:** New bug (introduced by FINDING-011 — per-tenant rows created but list not filtered).

---

### AUDIT-005 — Capture Service `findRecentLead()` Has No Tenant Scoping

**Severity:** 🟡 Medium
**File:** `backend/src/modules/capture/capture.service.ts:114`
**What's wrong:** The `findRecentLead()` function (deduplication check) queries `prisma.lead.findFirst({ where: { email, status: { in: [...] }, createdAt: { gte: since } } })` without a `tenantId` filter. A duplicate-submission check from Tenant A could match a lead created by Tenant B if both happen to share an email address, silently suppressing the new lead.
**Impact:** Medium — legitimate leads from new tenants could be incorrectly treated as duplicates of leads from other tenants. Data is never exposed cross-tenant, but data may be silently dropped.
**Regression risk:** No regression — the function existed before Phase 1.
**Recommended fix:** Add `tenantId` to the `where` clause in `findRecentLead()`. The tenantId must be threaded down from the public `captureLead()` controller where `req.user?.tenantId` is available, or derived from the `slug` parameter used to resolve the business.
**Classification:** New bug (not covered by any FINDING).

---

### AUDIT-006 — `bookings.tenantId!` Non-Null Assertion Survives in One Place

**Severity:** 🟢 Low
**File:** `backend/src/modules/bookings/bookings.service.ts:675`
**What's wrong:** Inside the `cancelBooking()` function, the waitlist-match fire-and-forget block uses `booking.tenantId!` (non-null assertion) on line 675. While the assertion is guarded by `if (booking.tenantId)` on the line above, the `!` assertion is redundant and misleading — TypeScript would still infer `tenantId` as `string | null` inside the `if` block without it. This is a minor type-safety smell.
**Impact:** Low — no runtime crash risk; TypeScript narrowing inside `if (booking.tenantId)` ensures the value is a string. The `!` is redundant.
**Regression risk:** None.
**Recommended fix:** Remove the `!` — TypeScript narrowing from the surrounding `if` block is sufficient.
**Classification:** New bug (leftover from FINDING-015 partial cleanup).

---

### AUDIT-007 — `requireFeature` Cache Key Does Not Include `tenantId`

**Severity:** 🟡 Medium
**File:** `backend/src/middleware/requireFeature.ts:22`
**What's wrong:** The Redis cache key is `feature:${flag}` (line 22). Once per-tenant overrides are implemented (see AUDIT-001), a request from Tenant A could serve a cached response originally generated for Tenant B's flag value. The two tenants could have different overrides.
**Impact:** Medium — cached per-tenant flag values would bleed across tenants for up to 60 seconds; could enable or block features for the wrong tenant.
**Regression risk:** No regression now (per-tenant lookup not yet implemented in middleware). Would become a bug if AUDIT-001 is fixed without also fixing the cache key.
**Recommended fix:** Change the cache key to `feature:${tenantId ?? 'global'}:${flag}` so per-tenant and global values are cached independently.
**Classification:** Latent bug (only materialises after AUDIT-001 is fixed).

---

### AUDIT-008 — `campaigns.controller.ts` / `recurring-bookings.controller.ts` Pass `undefined` tenantId to Services

**Severity:** 🟡 Medium
**Files:**
- `backend/src/modules/campaigns/campaigns.controller.ts:29,48,67,86,106`
- `backend/src/modules/recurring-bookings/recurring-bookings.controller.ts:29,48,67,86,106`

**What's wrong:** Both controllers use `req.user!.tenantId` (not `?? null`). For SUPER_ADMIN accounts where `tenantId` is `null` on the token, this evaluates to `null` which is actually fine. However, the `!` non-null assertion means TypeScript does not flag the downstream service calls that may interpret `undefined` differently from `null`.
**Impact:** Low — campaigns and recurring-bookings services apply `if (tenantId) where.tenantId = tenantId` guards, so a null tenantId (SUPER_ADMIN) correctly returns all-tenant data.
**Regression risk:** None.
**Recommended fix:** Use `extractTenantId(req)` for consistency with the rest of the codebase.
**Classification:** New bug (FINDING-019 incomplete pass).

---

### AUDIT-009 — Missing Transaction on `createPublicBooking` (Race Condition Risk)

**Severity:** 🟠 High
**File:** `backend/src/modules/public/public.service.ts`
**What's wrong:** The public booking creation in `public.service.ts` checks availability and then creates a booking in two separate Prisma calls without a `prisma.$transaction()`. FINDING-027 correctly wrapped the admin `confirmBooking` flow in a transaction, but the public booking path was not updated. Under concurrent load, two requests for the same time slot could both pass the availability check and both create conflicting bookings.
**Impact:** High — double-bookings can occur on the public widget when two customers book the same slot simultaneously. This defeats the purpose of the conflict-check guard.
**Regression risk:** No regression — existed before Phase 1. FINDING-027 only addressed the admin confirm path.
**Recommended fix:** Wrap the slot-availability check + booking creation in a `prisma.$transaction()` block in `createPublicBooking`. Optionally use a SELECT FOR UPDATE or Prisma's interactive transactions to lock the slot during the check.
**Classification:** New bug (not covered by FINDING-027 scope).

---

### AUDIT-010 — `customers.service.ts` Uses `getDefaultFlags()` in `cancelMyBooking`

**Severity:** 🟢 Low
**File:** `backend/src/modules/customers/customers.service.ts:259`
**What's wrong:** The cancellation-fee stub check `const flags = getDefaultFlags(); if (insideWindow && flags.CANCELLATION_FEE_ENABLED)` reads the static default rather than the live DB-backed flag. This is the same issue as AUDIT-003 but specifically calls out the customer-facing cancellation path.
**Impact:** Low — cancellation fees are stubbed and do not actually charge; the fee trigger is only a logger.warn. No financial or data integrity impact at present.
**Regression risk:** None.
**Recommended fix:** Convert to `await isFeatureEnabled('CANCELLATION_FEE_ENABLED')` and make `cancelMyBooking` fully async if it is not already.
**Classification:** Previously known (sub-item of AUDIT-003).

---

> **Summary:** 10 audit findings identified.
> - 🟠 High: 1 (AUDIT-009 — public booking race condition)
> - 🟡 Medium: 6 (AUDIT-001, 002, 003, 004, 005, 007)
> - 🟢 Low: 3 (AUDIT-006, 008, 010)
>
> No additional 🔴 Critical findings. All Phase 1–3 fixes appear correct and in place. No regressions introduced. The fixes above are enhancements / partial implementations left open after Phase 3.

---

# Bug-Fix Execution Plan — BookingAutomation Backend

---

## 1. Goals and Planning Assumptions

### Source
This plan is derived **entirely** from [`BUGS_AND_GAPS.md`](./BUGS_AND_GAPS.md), which documents **34 open findings** across three audit passes performed on 2026-04-13. No bugs are fixed in this document — only the execution order and agent assignments are defined here.

### Planning Constraints
| Constraint | Detail |
|---|---|
| **Parallel agents** | Work is split into independent lanes (Agent A / B / C / D) that can be executed simultaneously within each phase. |
| **Minimal merge conflicts** | Tasks touching the same file are always placed in the **same** agent lane or in **different phases** to prevent concurrent edits. |
| **Stable backend for frontend** | Phase 1 exits with all 6 Critical findings resolved and all cross-tenant data-leak Highs fixed. The backend must be safe for frontend integration only after Phase 1 is complete. |
| **No schema-breaking changes in Phase 2/3** | Schema migrations required by Phase 1 are applied first; later phases only extend the schema non-destructively. |
| **Effort balance** | Each phase contains approximately 10–12 effort points (1 pt = simple 1-file fix; 2 pts = multi-file scoping change; 3 pts = architectural change). |

---

## 2. Categorized Bug/Gap Inventory

### 2A — Security / Data Leakage / Auth-RBAC

| ID | Title (from BUGS_AND_GAPS.md) | Severity | File/Module Area | Depends On |
|---|---|---|---|---|
| 001 | Feature Flag Enforcement Completely Disconnected from the DB — Control Centre Non-Functional | 🔴 Critical | `middleware/requireFeature.ts`, `config/businessType.ts`, `modules/admin/admin.service.ts`, 10+ service files | — |
| 003 | Admin Service Missing TenantId Filter — Cross-Tenant Data Leak | 🔴 Critical | `modules/admin/admin.service.ts` | — |
| 004 | listBookings Missing TenantId Scoping Filter | 🔴 Critical | `modules/bookings/bookings.service.ts` | — |
| 005 | SUPER_ADMIN (tenantId=null) Crashes Controllers with Non-Null Assertion | 🟠 High | `modules/memberships`, `analytics`, `payroll` controllers | 019 (utility extraction) |
| 006 | Payroll Routes: requireFeature Before requireAuth (Wrong Security Order) | 🟠 High | `modules/payroll/payroll.routes.ts` | — |
| 008 | JWT Access Token Has No Revocation Mechanism | 🟠 High | `modules/auth/auth.service.ts`, `middleware/auth.ts` | — |
| 022 | Analytics Dashboard (4 functions) Returns Cross-Tenant Aggregate Data | 🔴 Critical | `modules/analytics/analytics.service.ts`, `analytics.controller.ts` | — |
| 023 | Leads listLeads + exportLeadsCsv Has No TenantId Scoping | 🔴 Critical | `modules/leads/leads.service.ts`, `leads.controller.ts` | — |
| 024 | Webhooks Module CRUD Has No TenantId Scoping | 🟠 High | `modules/webhooks/webhooks.service.ts`, `webhooks.controller.ts` | — |
| 025 | Invoices listInvoices Has No TenantId Scoping | 🟠 High | `modules/invoices/invoices.service.ts`, `invoices.controller.ts` | — |
| 026 | Notifications Email Template Admin Has No TenantId Scoping | 🟠 High | `modules/notifications/notifications.service.ts`, `notifications.controller.ts` | — |
| 029 | Password Reset Token Logged at debug Level (Sensitive Token in Logs) | 🟡 Medium | `modules/auth/auth.service.ts` | — |
| 031 | Tables Module Has No TenantId Scoping (All 5 Service Functions) | 🟠 High | `modules/tables/tables.service.ts`, `tables.controller.ts` | — |
| 032 | Payments Service Has No Tenant Scoping (createPaymentIntent / getPaymentStatus / refundPayment) | 🟠 High | `modules/payments/payments.service.ts`, `payments.controller.ts` | — |
| 033 | Quotes Module: ADMIN listQuotes / getQuoteById / acceptQuote Returns All Quotes Cross-Tenant | 🟡 Medium | `modules/quotes/quotes.service.ts`, `prisma/schema.prisma` | Schema migration (add `tenantId` to Quote) |
| 034 | Settings Service: getCachedSettings / updateSettings Missing Tenant Scoping in Multi-Tenant Mode | 🟡 Medium | `modules/settings/settings.service.ts`, `modules/payments/payments.service.ts` | — |

---

### 2B — API Contract & Frontend Readiness

| ID | Title | Severity | File/Module Area | Depends On |
|---|---|---|---|---|
| 028 | Inconsistent DELETE Response Shape (204 vs 200+body) | 🟡 Medium | `modules/rota/rota.controller.ts`, `modules/availability/availability.controller.ts`, `modules/artists/artist-media.controller.ts` | — |
| 030 | sessions / pricing / locations List Endpoints Are Unbounded (No Pagination Cap) | 🟡 Medium | `modules/sessions/sessions.service.ts`, `modules/pricing/pricing.service.ts`, `modules/locations/locations.service.ts` | — |

---

### 2C — DB / Migrations / Schema & Integrity

| ID | Title | Severity | File/Module Area | Depends On |
|---|---|---|---|---|
| 011 | FeatureFlag DB Model Has tenantId But Per-Tenant Override Is Not Implemented | 🟡 Medium | `prisma/schema.prisma`, `modules/admin/admin.service.ts` | 001 (feature flag wiring) |
| 016 | GIFT_VOUCHER_ENABLED and GIFT_CARDS_ENABLED are Duplicate Feature Flag Keys | 🟡 Medium | `src/config/businessType.ts`, `prisma/schema.prisma` | 001 |
| 027 | Booking Conflict Check TOCTOU Race Condition (Not in Transaction) | 🟠 High | `modules/bookings/bookings.service.ts` | — |
| 033 | Quotes Model Has No tenantId Column | 🟡 Medium | `prisma/schema.prisma` | — |

---

### 2D — Integrations & Reliability

| ID | Title | Severity | File/Module Area | Depends On |
|---|---|---|---|---|
| 002 | Password Reset Email Never Sent (Broken User Flow) | 🔴 Critical | `modules/auth/auth.service.ts`, BullMQ jobs | — |
| 009 | Fire-and-Forget `void` on 20+ Critical Side-Effect Paths | 🟡 Medium | `modules/bookings/bookings.service.ts`, `modules/payments/payments.service.ts`, `modules/leads/leads.service.ts` | — |
| 012 | Multiple Email Side-Effects Are Log Stubs Only (Not Functional) | 🟡 Medium | `modules/auth/auth.service.ts`, `modules/bookings/bookings.service.ts`, `modules/invoices/invoices.service.ts`, `modules/leads/leads.service.ts`, `modules/customers/customers.service.ts`, `modules/capture/capture.service.ts` | 002 (BullMQ pattern established) |

---

### 2E — Performance / Scalability

| ID | Title | Severity | File/Module Area | Depends On |
|---|---|---|---|---|
| 030 | sessions / pricing / locations List Endpoints Are Unbounded (No Pagination Cap) | 🟡 Medium | (also in 2B) `modules/sessions`, `modules/pricing`, `modules/locations` | — |
| 023 | exportLeadsCsv Unbounded Memory Load (no take limit) | 🔴 Critical | (sub-issue of 023) `modules/leads/leads.service.ts` | — |

---

### 2F — Observability & Ops

| ID | Title | Severity | File/Module Area | Depends On |
|---|---|---|---|---|
| 007 | Third-Party Service Credentials Silently Default to Empty String (No Startup Validation) | 🟠 High | `src/config/index.ts` | — |
| 010 | CAPTCHA Config Variables Not in Validated AppConfig | 🟡 Medium | `src/middleware/captcha.ts`, `src/config/index.ts` | 007 (config validation pattern) |
| 014 | Global Rate Limiter Is Hardcoded and Not Configurable | 🟡 Medium | `src/app.ts`, `src/config/index.ts` | — |
| 021 | Redis Connection Error Not Fatal at Startup | 🟢 Low | `src/lib/redis.ts` | — |

---

### 2G — Code Quality / Maintainability

| ID | Title | Severity | File/Module Area | Depends On |
|---|---|---|---|---|
| 013 | `where: any` Type in products.service.ts and pos.service.ts | 🟡 Medium | `modules/products/products.service.ts`, `modules/pos/pos.service.ts` | — |
| 015 | booking.tenantId && Guard Allows Silent Skip of Side-Effects | 🟡 Medium | `modules/bookings/bookings.service.ts` | 004 (tenantId scoping in bookings) |
| 017 | Misleading Comments on forgotPassword Route/Controller | 🟢 Low | `modules/auth/auth.routes.ts`, `modules/auth/auth.controller.ts` | 002 |
| 018 | isActive Filter Parsed from String Comparison (Fragile Pattern) | 🟢 Low | `modules/admin/admin.service.ts` | — |
| 019 | Inconsistent tenantId Nullability Pattern Across Controllers | 🟢 Low | Multiple controllers | — |
| 020 | Public Booking Widget Not Guarded by BOOKING_ENABLED Master Switch | 🟢 Low | `modules/public/public.routes.ts` | — |

---

## 3. Three-Phase Execution Plan

### Effort Points Legend
- **1 pt** — single-file, low-risk change (comment fix, enum fix, route reorder)
- **2 pts** — multi-file scoping change (add tenantId to service + controller)
- **3 pts** — architectural change (transaction wrapper, Redis integration, BullMQ job, schema migration)

---

### Phase 1 — Critical Security Hardening & Data Isolation Foundation

**Total effort: ~33 pts across 4 agent lanes**

#### Objective
Resolve all 6 🔴 Critical findings and the highest-impact 🟠 High security findings. After Phase 1, no cross-tenant data leak remains, the booking TOCTOU race is closed, feature flags are live from the DB, and the password reset flow works end-to-end. The backend is safe for frontend integration to begin.

#### Entry Criteria
- All 34 findings in `BUGS_AND_GAPS.md` are confirmed open (status ❌).
- The existing test suite passes (`npm test` in `/backend`): 100 suites, 1756/1756 tests.
- No uncommitted schema drift (`npx prisma migrate status` shows no pending migrations).
- A feature branch per agent lane is checked out from the same base commit.

#### Workstreams

---

##### Agent A — Security: Auth-RBAC + Tenant Isolation (Admin / Bookings / Analytics / Leads)
**Effort: ~11 pts**

- [ ] **FINDING-006** — Swap `requireFeature` / `requireAuth` order in `payroll.routes.ts` *(1 pt)*
- [ ] **FINDING-003** — Add `tenantId` filter to all 5 admin service functions (`listUsers`, `listArtistsAdmin`, `listFeatureFlags`, `updateUser`, `updateArtistAdmin`); pass from controller; handle SUPER_ADMIN null case *(2 pts)*
- [ ] **FINDING-004** — Add `tenantId` param to `listBookings()`; inject into `where` clause; pass from controller *(2 pts)*
- [ ] **FINDING-022** — Add `tenantId: string | null` to `getOverview`, `getLeadsAnalytics`, `getBookingsAnalytics`, `getRevenueAnalytics`; inject into every Prisma query; update controller *(3 pts)*
- [ ] **FINDING-023** — Add `tenantId` to `listLeads()` and `exportLeadsCsv()`; add `take: 10000` cap to export; update controller *(2 pts)*
- [ ] **FINDING-005** — Replace `req.user!.tenantId!` with guarded extraction in memberships, analytics, and payroll controllers; throw `AppError(400, 'TENANT_REQUIRED')` for null tenantId where appropriate *(1 pt)*

---

##### Agent B — Feature Flag System Rewire (Control Centre Fix)
**Effort: ~8 pts**

- [ ] **FINDING-001** — In `requireFeature.ts` (line 36), replace `getDefaultFlags()` with async `prisma.featureFlag.findUnique({ where: { key: flag } })`; add Redis caching with 60-second TTL *(3 pts)*
- [ ] **FINDING-001 (cont.)** — Replace all 10+ `getDefaultFlags()` call sites in service files (`bookings.service.ts` lines 366/550/654, `notification-dispatcher.ts`, `ai-suggestion.job.ts`, `jobs/index.ts`, `public.service.ts`, `calendar.service.ts`, `outlook-calendar.service.ts`) with DB-backed async flag checks *(3 pts)*
- [ ] **FINDING-029** — Remove raw reset token from debug log in `auth.service.ts` (lines 287–292) *(1 pt)*
- [ ] **FINDING-031** — Add `tenantId` scoping to all 5 `tables.service.ts` functions; add public `?tenantSlug=` resolution; update controller *(1 pt)*  
  *(Placed in Agent B to avoid conflict with Agent A's `bookings.service.ts` edits)*

---

##### Agent C — DB Integrity: TOCTOU Race Fix + Payments Tenant Scoping
**Effort: ~8 pts**

- [ ] **FINDING-027** — Wrap `confirmBooking` conflict-check + status-update in `prisma.$transaction()`; do the same for `rescheduleBooking` *(3 pts)*
- [ ] **FINDING-032** — Add `tenantId: string | null` to `createPaymentIntent`, `getPaymentStatus`, `refundPayment`; add ownership assertion after booking fetch; fix `resolveDepositPence` to scope `studioSettings.findFirst()` *(3 pts)*
- [ ] **FINDING-008** — Add `jti: crypto.randomUUID()` to access token payload; maintain Redis revocation set in `logout()`; check jti in `verifyAccessToken()` *(2 pts)*

---

##### Agent D — Critical Integration: Password Reset Email
**Effort: ~6 pts**

- [ ] **FINDING-002** — Implement BullMQ password reset email job using existing `resend.ts` + `template-renderer.ts`; enqueue from `forgotPassword()`; remove TODO stub *(3 pts)*
- [ ] **FINDING-007** — Add startup validation in `config/index.ts` for all 14 third-party credentials; log clear error + `process.exit(1)` in `NODE_ENV=production` when feature is enabled but credential is missing *(3 pts)*

---

#### Expected Conflicts in Phase 1

| Risk | Files Affected | Mitigation |
|---|---|---|
| `bookings.service.ts` touched by Agent A (FINDING-004, 015) and Agent C (FINDING-027) | `modules/bookings/bookings.service.ts` | Agent C works only on `confirmBooking` / `rescheduleBooking` transaction blocks. Agent A works only on `listBookings` function. Agreed line ranges: Agent A lines 170–193; Agent C lines 278–296, 719–740. |
| `auth.service.ts` touched by Agent A (FINDING-005 context) and Agent D (FINDING-002) | `modules/auth/auth.service.ts` | Agent A only touches controller files. Agent D owns `auth.service.ts`. No overlap. |
| `config/index.ts` touched by Agent D (FINDING-007) | `src/config/index.ts` | Only Agent D touches this file in Phase 1. |
| `analytics.controller.ts` touched by Agent A (FINDING-022) and FINDING-005 fixes | `modules/analytics/analytics.controller.ts` | All analytics controller edits owned exclusively by Agent A. |

#### Exit Criteria — Phase 1 ✅
- [ ] All 6 🔴 Critical findings (001, 002, 003, 004, 022, 023) status changed to ✅ Fixed.
- [ ] All Phase 1 High findings (005, 006, 007, 008, 027, 031, 032) status changed to ✅ Fixed.
- [ ] `npm test` passes: ≥1756 tests, 0 failures, 0 TS errors.
- [ ] `npx prisma migrate status` shows no pending drift.
- [ ] Manual smoke test: ADMIN at TenantA cannot retrieve users/bookings/analytics/leads from TenantB.
- [ ] Manual smoke test: password reset email is delivered (check email preview in dev Resend sandbox).
- [ ] Manual smoke test: toggling a feature flag in admin API changes enforcement within 60 seconds (Redis TTL).
- [ ] No new `console.error` or unhandled promise rejections in startup log.

---

### Phase 2 — Remaining Tenant Scoping + API Contract Hardening

**Total effort: ~28 pts across 4 agent lanes**

#### Objective
Fix all remaining 🟠 High cross-tenant leaks (webhooks, invoices, notifications, quotes, settings, payments settings). Standardise the API contract (DELETE shape, pagination). Implement all email stubs. Fix fire-and-forget patterns to be observable.

#### Entry Criteria
- Phase 1 exit criteria all met and merged to the base branch.
- Feature branches for Phase 2 agents are cut from the merged Phase 1 base.

#### Workstreams

---

##### Agent A — Remaining Tenant Scoping (Webhooks / Invoices / Notifications / Quotes / Settings)
**Effort: ~10 pts**

- [ ] **FINDING-024** — Add `tenantId` to all `webhooks.service.ts` functions; scope list/get/update/delete; add ownership assertion; update controller *(2 pts)*
- [ ] **FINDING-025** — Add `tenantId` to `listInvoices()`; scope through booking relation; update controller *(2 pts)*
- [ ] **FINDING-026** — Add `tenantId` to all `notifications.service.ts` CRUD; scope queries; apply ownership assertion in get/update/delete; update controller *(2 pts)*
- [ ] **FINDING-034** — Add `tenantId` to `getCachedSettings()` and `updateSettings()`; use `'settings:public:{tenantId}'` as Redis key; fix `resolveDepositPence` in payments.service.ts *(2 pts)*
- [ ] **FINDING-033** — Add `tenantId String?` column to `Quote` model in schema; migrate; scope `listQuotes`, `getQuoteById`, `acceptQuote`, `rejectQuote` through `artist.tenantId` join; update controller *(2 pts)*

---

##### Agent B — API Contract: DELETE Shape + Pagination
**Effort: ~6 pts**

- [ ] **FINDING-028** — Change `rota.controller.ts`, `availability.controller.ts`, `artist-media.controller.ts` DELETE handlers to return `res.status(204).send()` *(1 pt)*
- [ ] **FINDING-030** — Add real `page`/`limit` query params to `listSessions`, `listPricingRules`, `listLocations`, and `listSessionBookings`; replace raw `findMany` with the `paginate()` utility; update controllers and schemas *(3 pts)*
- [ ] **FINDING-019** — Create `src/utils/extractTenantId.ts` helper returning `req.user!.tenantId ?? null`; replace all `req.user!.tenantId!` and `req.user!.tenantId ?? null` usage in every controller with this shared utility *(2 pts)*

---

##### Agent C — Integrations: Email Stubs + Fire-and-Forget Hardening
**Effort: ~8 pts**

- [ ] **FINDING-012** — Implement BullMQ email job enqueue calls for all 9 stub sites: booking confirmation, invoice sent, lead inquiry received, admin new-lead notification, cancellation fee notice, booking cancelled, reschedule request, capture webhook dispatch *(3 pts)*
- [ ] **FINDING-009** — Add `.catch(err => logger.error(...))` to all 20+ `void` fire-and-forget call sites in `bookings.service.ts`, `payments.service.ts`, and `leads.service.ts`; follow the pattern on line 558 *(3 pts)*
- [ ] **FINDING-017** — Update misleading comments on `auth.routes.ts` (line 68) and `auth.controller.ts` (line 165) to accurately reflect implementation status *(1 pt)*
- [ ] **FINDING-018** — Replace `query.isActive === 'true'` comparisons in `admin.service.ts` with Zod `.enum(['true','false']).transform(v => v === 'true')` coercion *(1 pt)*

---

##### Agent D — Observability & Config Hardening
**Effort: ~4 pts**

- [ ] **FINDING-010** — Add `CAPTCHA_ENABLED`, `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET` to `AppConfig`; add startup validation when `CAPTCHA_ENABLED=true`; update `captcha.ts` to reference `config.*` *(2 pts)*
- [ ] **FINDING-014** — Move `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` to `AppConfig` as `optional()` with current hardcoded defaults; reference from `app.ts` *(1 pt)*
- [ ] **FINDING-021** — Add `redis.ping()` connectivity check at startup in `lib/redis.ts`; log clear WARNING if Redis is unavailable; surface degraded status in `/health` endpoint *(1 pt)*

---

#### Expected Conflicts in Phase 2

| Risk | Files Affected | Mitigation |
|---|---|---|
| `config/index.ts` touched by Agent D (FINDING-010, 014) | `src/config/index.ts` | Both changes owned by Agent D only. |
| `payments.service.ts` touched by Agent A (FINDING-034 `resolveDepositPence`) | `modules/payments/payments.service.ts` | Agent A owns only the `resolveDepositPence` function. Agent C touches only fire-and-forget call sites in `payments.service.ts`. Agree on line ownership before starting. |
| `auth.service.ts` touched by Agent C (FINDING-012 stubs, FINDING-017) | `modules/auth/auth.service.ts` | All auth.service.ts changes owned by Agent C only. |
| `admin.service.ts` touched by Agent C (FINDING-018) | `modules/admin/admin.service.ts` | Phase 1 Agent A already edited `admin.service.ts`. Phase 2 Agent C should rebase on Phase 1 merge before starting. |
| `prisma/schema.prisma` touched by Agent A (Quote `tenantId` migration) | `prisma/schema.prisma` | Only one schema migration in Phase 2. Agent A owns it exclusively. |

#### Exit Criteria — Phase 2 ✅
- [ ] All Phase 2 items (024–026, 028–030, 033–034) status ✅ Fixed.
- [ ] All Phase 2 quality (017–019) status ✅ Fixed.
- [ ] `npm test` passes: ≥1756 tests, 0 failures, 0 TS errors.
- [ ] `npx prisma migrate deploy` succeeds against a staging DB with the Phase 2 Quote `tenantId` migration.
- [ ] Manual smoke test: DELETE endpoints for rota, availability, artist-media return HTTP 204.
- [ ] Manual smoke test: `GET /api/sessions?page=1&limit=20` returns correct `totalCount` / `totalPages` metadata.
- [ ] Integration test: booking confirmation email is delivered to Resend sandbox on `confirmBooking()`.
- [ ] Integration test: all `void` fire-and-forget failures are now captured in logger output.
- [ ] Manual startup test: setting `LOG_LEVEL=debug` does NOT log a reset token.

---

### Phase 3 — Code Quality, Schema Cleanup & Low-Severity Fixes

**Total effort: ~16 pts across 2 agent lanes**

#### Objective
Complete the remaining Medium/Low findings: per-tenant feature flag override (DB schema extension), duplicate flag key cleanup, `where: any` type fix, booking side-effect guard logic, public booking master switch, and all Low code-quality items.

#### Entry Criteria
- Phase 2 exit criteria all met and merged to the base branch.
- No open 🔴 Critical or 🟠 High findings remain.

#### Workstreams

---

##### Agent A — DB/Schema Cleanup + Feature Flag Per-Tenant Extension
**Effort: ~9 pts**

- [ ] **FINDING-016** — Remove `GIFT_VOUCHER_ENABLED` from `FEATURE_FLAG_KEYS` array and from all `defaultFeatureFlags` per-type objects in `businessType.ts`; add a Prisma migration to delete the orphaned DB row *(2 pts)*
- [ ] **FINDING-011** — Add `@@unique([key, tenantId])` composite constraint to `FeatureFlag` schema; extend `updateFeatureFlag()` to accept optional `tenantId` and use `prisma.featureFlag.upsert` with the composite key; update admin API to accept `?tenantId=` param *(3 pts)*
- [ ] **FINDING-015** — In `bookings.service.ts` lines 366, 550, 654, separate the `tenantId` null check from the feature flag check; restructure to: check `tenantId !== null`, then check the DB-backed flag (now wired via Phase 1 FINDING-001 fix); pass `tenantId` into called service functions *(2 pts)*
- [ ] **FINDING-013** — Replace `const where: any` in `products.service.ts` (line 46) with `Prisma.ProductWhereInput` and in `pos.service.ts` (line 215) with `Prisma.PosTransactionWhereInput` *(1 pt)*
- [ ] **FINDING-020** — Add `requireFeature('BOOKING_ENABLED')` before `requireFeature('PUBLIC_BOOKING_ENABLED')` in `public.routes.ts` middleware chain; add comment documenting the intent *(1 pt)*

---

##### Agent B — Code Quality & Documentation
**Effort: ~7 pts**

- [ ] **FINDING-019** (cleanup pass) — Verify all controllers now use `extractTenantId(req)` utility introduced in Phase 2; fix any remaining `req.user!.tenantId!` patterns missed in Phase 2 *(1 pt)*
- [ ] **FINDING-018** (if not completed in Phase 2) — Zod `isActive` boolean coercion in admin service *(1 pt)*
- [ ] **FINDING-017** (if not completed in Phase 2) — Remove misleading forgotPassword comments *(1 pt)*
- [ ] **FINDING-010** (if not completed in Phase 2) — CAPTCHA config validation *(2 pts)*
- [ ] **FINDING-014** (if not completed in Phase 2) — Rate limiter to AppConfig *(1 pt)*
- [ ] **FINDING-021** (if not completed in Phase 2) — Redis startup ping check *(1 pt)*

> Note: Items marked "if not completed in Phase 2" are carried over only if Agent D in Phase 2 did not complete them. They are listed here as the safety net.

---

#### Expected Conflicts in Phase 3

| Risk | Files Affected | Mitigation |
|---|---|---|
| `businessType.ts` touched by Agent A (FINDING-016, FINDING-011) and previously by Phase 1/2 | `src/config/businessType.ts` | Agent A is the sole owner of this file in Phase 3. No other agent touches it. |
| `bookings.service.ts` already modified in Phase 1 (FINDING-004, 027) and now again in Phase 3 (FINDING-015) | `modules/bookings/bookings.service.ts` | Phase 3 Agent A must rebase cleanly on the Phase 1 + Phase 2 merged base before editing lines 366/550/654. |
| `prisma/schema.prisma` touched again for FINDING-011 and FINDING-016 | `prisma/schema.prisma` | Only one migration per phase. Phase 3 bundles both schema changes into a single migration file. |

#### Exit Criteria — Phase 3 ✅
- [ ] All 34 findings in `BUGS_AND_GAPS.md` status changed to ✅ Fixed.
- [ ] `npm test` passes: ≥1756 tests, 0 failures, 0 TS errors.
- [ ] `npx tsc --noEmit` in `/backend`: 0 errors (the `Prisma.ProductWhereInput` fix from FINDING-013 removes the last `any` usage in service files).
- [ ] `npx prisma migrate deploy` succeeds with Phase 3 schema migrations (FINDING-011 composite unique, FINDING-016 orphaned row cleanup).
- [ ] Manual smoke test: Control Centre per-tenant flag override creates a separate DB row for TenantA without affecting TenantB's flag.
- [ ] Manual smoke test: `GET /api/public` with `BOOKING_ENABLED=false` returns 503 (master switch respected).
- [ ] `npm run lint` (or equivalent ESLint run): 0 errors, 0 warnings on modified files.

---

## 4. Parallelization Rules

### How Tasks Were Grouped to Minimise Merge Conflicts

1. **Each agent owns a clear module boundary.** In every phase, a given source file is edited by **at most one agent lane**. Module ownership is established in the phase plan and must not be violated.

2. **Cross-cutting files are serialised across phases.** Files like `bookings.service.ts`, `config/index.ts`, `prisma/schema.prisma`, and `auth.service.ts` that are needed in multiple phases are assigned to a single agent in Phase 1, then that agent's Phase 2/3 owner must rebase cleanly before editing.

3. **Schema migrations are one-per-phase.** Each phase includes at most one schema migration PR. Phase 1 has no schema changes. Phase 2 has one migration (Quote `tenantId`). Phase 3 has one migration (FeatureFlag composite unique + orphaned key removal).

4. **Controller files are co-owned by the same agent as their service file.** An agent that edits `webhooks.service.ts` also edits `webhooks.controller.ts` — they are never split across agents.

### Tasks That Can Run Simultaneously (Within a Phase)

| Phase | Safe Parallel Pairs |
|---|---|
| Phase 1 | Agent A (admin/analytics/leads scoping) ‖ Agent B (feature flag rewire + tables) ‖ Agent C (TOCTOU race + payments) ‖ Agent D (password reset email + config startup) |
| Phase 2 | Agent A (webhooks/invoices/notifications/quotes/settings) ‖ Agent B (DELETE shape + pagination + extractTenantId utility) ‖ Agent C (email stubs + fire-and-forget) ‖ Agent D (config/captcha/rate-limiter/redis) |
| Phase 3 | Agent A (schema + businessType + bookings guard) ‖ Agent B (code quality cleanup) |

### Tasks That Must Be Sequenced (Dependencies)

| Dependency | Rule |
|---|---|
| FINDING-001 must complete before FINDING-011 and FINDING-015 | The per-tenant flag override (011) and the booking guard fix (015) rely on DB-backed flag reads introduced by FINDING-001. |
| FINDING-002 must complete before FINDING-012 | FINDING-012 email stubs follow the exact BullMQ + Resend pattern established by the password reset email fix (FINDING-002). |
| FINDING-019 utility creation (Phase 2) should precede 019 cleanup pass (Phase 3) | The `extractTenantId()` helper is created in Phase 2 Agent B; Phase 3 Agent B does the cleanup sweep. |
| Phase 1 must be fully merged before any Phase 2 agent branch is cut | Phase 2 agents depend on the re-wired feature flag system and on `extractTenantId()` not yet existing — cutting Phase 2 branches from Phase 1's base avoids rework. |
| Phase 2 must be fully merged before any Phase 3 agent branch is cut | Phase 3's FINDING-015 fix depends on Phase 1's FINDING-001 wiring; Phase 3's schema migration must not conflict with Phase 2's Quote migration. |

---

## 5. Verification Strategy

### Phase 1 Verification

| Gate | Command / Check |
|---|---|
| TypeScript | `cd backend && npx tsc --noEmit` — must produce 0 errors |
| Unit + integration tests | `cd backend && npm test` — must pass all 1756+ tests |
| DB migration status | `npx prisma migrate status` — no pending migrations (Phase 1 has no schema changes) |
| Cross-tenant smoke test | Manually: ADMIN at TenantA calls `GET /api/admin/users` → must return only TenantA users |
| Feature flag live smoke test | Manually: toggle a flag OFF in admin API, make a request → feature returns 503 within 60 seconds |
| Password reset E2E | Manually: call `POST /api/auth/forgot-password` → email arrives in Resend sandbox |
| Payment scoping smoke test | Manually: ADMIN at TenantA attempts `POST /api/payments/intent` with TenantB's bookingId → must receive 403 |
| JWT revocation smoke test | Manually: login → logout → replay the access token → must receive 401 before 15-minute expiry |

**Minimum quality gate to advance to Phase 2:** All 8 checks above pass. No 🔴 Critical or 🟠 High findings remain open.

---

### Phase 2 Verification

| Gate | Command / Check |
|---|---|
| TypeScript | `cd backend && npx tsc --noEmit` — 0 errors |
| Unit + integration tests | `cd backend && npm test` — all tests pass |
| Schema migration | `npx prisma migrate deploy` against staging DB — succeeds cleanly |
| DELETE shape contract | HTTP client: `DELETE /api/rota/:id`, `DELETE /api/artists/:id/media/:mediaId`, `DELETE /api/availability/:id` → must return HTTP 204 with empty body |
| Pagination smoke test | `GET /api/sessions?page=2&limit=5` → must return `totalCount`, `totalPages > 1`, and exactly 5 records |
| Email delivery smoke test | Trigger booking confirmation, invoice send, new-lead notification → all arrive in Resend sandbox |
| Fire-and-forget logging | Force a calendar sync to fail (mock) → error must appear in logger output, no unhandled rejection |
| Webhook scoping | ADMIN at TenantA calls `GET /api/webhooks` → must return only TenantA webhooks |
| Settings isolation | Update settings as ADMIN at TenantA; `GET /api/settings` as TenantB → must return TenantB's own settings |
| Token not in logs | Set `LOG_LEVEL=debug`; call `POST /api/auth/forgot-password` → grep logs for `resetToken` → must find nothing |

**Minimum quality gate to advance to Phase 3:** All 10 checks above pass. No 🟠 High findings remain open.

---

### Phase 3 Verification

| Gate | Command / Check |
|---|---|
| TypeScript | `cd backend && npx tsc --noEmit` — 0 errors (FINDING-013 `any` removal must be clean) |
| Unit + integration tests | `cd backend && npm test` — all tests pass |
| Schema migration | `npx prisma migrate deploy` for Phase 3 migrations — composite unique + orphaned row deletion succeeds |
| Lint | `cd backend && npm run lint` (ESLint) — 0 errors, 0 warnings on modified files |
| Per-tenant flag override | Create a per-tenant flag override via admin API; verify TenantA has feature enabled while TenantB does not |
| Public booking master switch | Set `BOOKING_ENABLED=false` via admin API; call `GET /api/public/booking-widget` → must return 503 |
| Duplicate flag key | `GET /api/admin/feature-flags` → must return exactly one key for gift cards (`GIFT_CARDS_ENABLED`); `GIFT_VOUCHER_ENABLED` must not appear |
| Full audit sweep | Re-read `BUGS_AND_GAPS.md`; every finding must be marked ✅ Fixed |

**Minimum quality gate to declare complete:** All 8 checks above pass. All 34 findings marked ✅ Fixed. The backend audit summary verdict changes from "NOT ready" to "READY for frontend integration".

---

## Appendix — Phase/Agent Assignment Quick-Reference

| ID | Title (abbreviated) | Phase | Agent |
|---|---|---|---|
| 001 | Feature Flag DB Wiring | 1 | B |
| 002 | Password Reset Email | 1 | D |
| 003 | Admin TenantId Filter | 1 | A |
| 004 | listBookings TenantId | 1 | A |
| 005 | SUPER_ADMIN null crash | 1 | A |
| 006 | Payroll route order | 1 | A |
| 007 | Credential startup validation | 1 | D |
| 008 | JWT revocation | 1 | C |
| 009 | Fire-and-forget void | 2 | C |
| 010 | CAPTCHA config validation | 2 | D |
| 011 | FeatureFlag per-tenant override | 3 | A |
| 012 | Email stubs implementation | 2 | C |
| 013 | `where: any` type fix | 3 | A |
| 014 | Rate limiter configurable | 2 | D |
| 015 | booking.tenantId&& guard | 3 | A |
| 016 | Duplicate GIFT flag keys | 3 | A |
| 017 | Misleading forgotPassword comments | 2 | C |
| 018 | isActive string comparison | 2 | C |
| 019 | extractTenantId utility | 2 | B |
| 020 | Public booking master switch | 3 | A |
| 021 | Redis startup ping | 2 | D |
| 022 | Analytics cross-tenant | 1 | A |
| 023 | Leads cross-tenant + export cap | 1 | A |
| 024 | Webhooks TenantId scoping | 2 | A |
| 025 | Invoices TenantId scoping | 2 | A |
| 026 | Notifications TenantId scoping | 2 | A |
| 027 | Booking TOCTOU race (transaction) | 1 | C |
| 028 | DELETE response shape 204 | 2 | B |
| 029 | Reset token in debug log | 1 | B |
| 030 | Unbounded list pagination | 2 | B |
| 031 | Tables TenantId scoping | 1 | B |
| 032 | Payments TenantId scoping | 1 | C |
| 033 | Quotes TenantId + schema | 2 | A |
| 034 | Settings TenantId + Redis key | 2 | A |
