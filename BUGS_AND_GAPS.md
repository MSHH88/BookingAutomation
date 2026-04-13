## Audit — Backend Readiness Review (2026-04-13)

**Auditor:** Copilot Task Agent — full backend audit (Phases 0–9, all modules)
**Scope:** Entire backend (`/backend/src/**`) — functional correctness, security, API contract, code quality

---

### Two Questions Answered Upfront

**Q1: Do we use Supabase for credentials?**
**NO.** The backend does not use Supabase anywhere. Confirmed by inspecting `package.json`, `config/index.ts`, `auth.service.ts`, and `lib/prisma.ts`. The entire stack is: **Prisma + PostgreSQL** (database), **custom bcrypt (cost 12) + HS256 JWT** (auth), **ioredis / BullMQ** (queues), **Cloudinary / Twilio / Stripe / Resend** (external services). No Supabase SDK, client, or environment variable is present in the codebase.

**Q2: Are all features controllable from the CONTROL CENTRE by the SUPER_ADMIN?**
**NO — THIS IS THE #1 CRITICAL BUG.** The `FeatureFlag` database table IS written to by the admin API when the Control Centre saves a toggle. However, the `requireFeature` middleware and every internal service flag check reads from `getDefaultFlags()` in the static `businessType.ts` file — it **never queries the database**. Every feature-flag change made in the Control Centre is persisted to the DB but has **zero runtime effect**. See FINDING-001 below for full details.

---

### FINDING-001 — Feature Flag Enforcement Completely Disconnected from the DB (Control Centre is Non-Functional)

| Field | Value |
|---|---|
| **Severity** | 🔴 Critical |
| **Scope** | Backend-wide |
| **Phase/Step** | Phase 0 — Feature Flags / All Phases |
| **Status** | ❌ Open |
| **Files** | `src/middleware/requireFeature.ts` (line 36), `src/config/businessType.ts` (getDefaultFlags), `src/modules/admin/admin.service.ts` (updateFeatureFlag), `src/modules/bookings/bookings.service.ts` (lines 366, 550, 654), `src/lib/notification-dispatcher.ts` (line 57), `src/jobs/ai-suggestion.job.ts` (lines 71, 86), `src/jobs/index.ts` (line 19), `src/modules/public/public.service.ts` (lines 250, 339), `src/modules/calendar/calendar.service.ts` (lines 274, 376, 486), `src/modules/calendar/outlook-calendar.service.ts` (lines 203, 273, 340) |

**What's wrong:**
`requireFeature` (line 36) calls `getDefaultFlags(type)` from `businessType.ts` — a **static in-memory lookup** keyed on the `BUSINESS_TYPE` environment variable. The DB `FeatureFlag` table is written to by `PATCH /api/admin/feature-flags/:key` but is never read by the enforcement layer. Additionally, 10+ internal service call sites also call `getDefaultFlags()` statically (see file list).

**Risk/Impact:** The SUPER_ADMIN's Control Centre is entirely non-functional for feature management. Toggling a feature ON or OFF in the UI persists to the DB but has zero runtime effect. The SUPER_ADMIN cannot control any feature at runtime without a server redeploy and `BUSINESS_TYPE` env change.

**Recommended fix:** Replace `getDefaultFlags()` calls in `requireFeature.ts` with an async DB lookup: `prisma.featureFlag.findUnique({ where: { key: flag } })` checking `isEnabled`. Add Redis caching (60-second TTL) to avoid a DB hit per request. Apply the same fix to all 10+ internal service call sites. The DB schema is already correct — this is purely a wiring fix.

---

### FINDING-002 — Password Reset Email Never Sent (Broken User Flow)

| Field | Value |
|---|---|
| **Severity** | 🔴 Critical |
| **Scope** | `auth` module |
| **Phase/Step** | Phase 0 — Step 1.9 |
| **Status** | ❌ Open |
| **Files** | `src/modules/auth/auth.service.ts` (line 281), `src/modules/auth/auth.routes.ts` (line 68) |

**What's wrong:**
`forgotPassword()` creates a `PasswordResetToken` DB record but the email dispatch is a `// TODO (Step 1.9): queue a "password-reset" email job via BullMQ` comment stub. No email is ever dispatched. Users who click "Forgot Password" never receive the link. The route comment falsely says "generate reset token + queue email".

**Risk/Impact:** Account recovery is completely broken in production. Token exists in DB but user never receives it. The 1-hour token window passes silently.

**Recommended fix:** Implement the BullMQ email job using the existing Resend integration and `template-renderer.ts`. Render a password reset email with link `${FRONTEND_URL}/reset-password?token=${token}` and enqueue it. Remove the TODO comment once done.

---

### FINDING-003 — Admin Service Missing TenantId Filter — Cross-Tenant Data Leak

| Field | Value |
|---|---|
| **Severity** | 🔴 Critical |
| **Scope** | `admin` module |
| **Phase/Step** | Phase 0 — Step 1.26 |
| **Status** | ❌ Open |
| **Files** | `src/modules/admin/admin.service.ts` (functions: `listUsers` line 211, `listArtistsAdmin` line 277, `listFeatureFlags` line 172, `updateUser` line 247, `updateArtistAdmin` line 302) |

**What's wrong:**
All five admin service query functions omit a `tenantId` filter. `listUsers()` returns all users across ALL tenants. `listArtistsAdmin()` returns all artists globally. `listFeatureFlags()` returns all flags globally. An ADMIN user at TenantA can read the full user list of TenantB by calling `GET /api/admin/users`.

**Risk/Impact:** Critical GDPR violation and data-isolation breach. All tenant PII (names, emails, phones) is exposed to any ADMIN, not just their own tenant's data.

**Recommended fix:** Add `tenantId: req.user.tenantId` to every `where` clause in admin service functions. Pass `tenantId` from the controller. For SUPER_ADMIN (tenantId=null), accept an optional `?tenantId=` query param for scoped cross-tenant admin actions.

---

### FINDING-004 — listBookings Missing TenantId Scoping Filter

| Field | Value |
|---|---|
| **Severity** | 🔴 Critical |
| **Scope** | `bookings` module |
| **Phase/Step** | Phase 0 — Step 1.9 |
| **Status** | ❌ Open |
| **Files** | `src/modules/bookings/bookings.service.ts` (function: `listBookings`, lines 170–193) |

**What's wrong:**
`listBookings()` builds its Prisma `where` clause using only `artistId`, `customerId`, `status`, and date range — no `tenantId` filter. An ADMIN at TenantA can call `GET /api/bookings?artistId=<TenantB-artistId>` and enumerate all of TenantB's bookings. The ARTIST actor path is correctly scoped to their own `artistId` but the ADMIN path is unscoped.

**Risk/Impact:** Cross-tenant booking data (customer PII, amounts, dates) is accessible to any authenticated ADMIN with knowledge of a cross-tenant entity ID.

**Recommended fix:** Add a `tenantId` parameter to `listBookings()` and include `tenantId` in the Prisma `where` clause. The controller passes `req.user.tenantId`. SUPER_ADMIN with null tenantId queries globally or requires an explicit tenantId param.

---

### FINDING-005 — SUPER_ADMIN (tenantId=null) Crashes Controllers with Non-Null Assertion

| Field | Value |
|---|---|
| **Severity** | 🟠 High |
| **Scope** | Multiple modules (memberships, analytics, payroll, packages, loyalty) |
| **Phase/Step** | Phase 0, 4, 5, 6, 8 |
| **Status** | ❌ Open |
| **Files** | `src/modules/memberships/memberships.controller.ts` (lines 26, 41, 56, 71, 87, 104, 120, 137, 154), `src/modules/analytics/analytics.controller.ts` (lines 167, 186, 205), `src/modules/payroll/payroll.controller.ts` (lines 27, 45, 63) |

**What's wrong:**
Multiple controllers use `req.user!.tenantId!` — a non-null TypeScript assertion. SUPER_ADMIN users have `tenantId: null` by design (cross-tenant access). When SUPER_ADMIN hits any of these endpoints, the `!` assertion produces `undefined` at runtime. Prisma receives `tenantId: undefined`, which it silently ignores, returning cross-tenant data without any scope filter.

**Risk/Impact:** SUPER_ADMIN actions on memberships, analytics, payroll, and packages either crash with runtime errors or silently return data from all tenants without scope.

**Recommended fix:** Replace `req.user!.tenantId!` with a guarded pattern: `const tenantId = req.user!.tenantId; if (!tenantId) throw new AppError(400, 'TENANT_REQUIRED', ...)`. For legitimate SUPER_ADMIN cross-tenant operations, accept a `?tenantId=` query parameter.

---

### FINDING-006 — Payroll Routes: requireFeature Before requireAuth (Wrong Security Order)

| Field | Value |
|---|---|
| **Severity** | 🟠 High |
| **Scope** | `payroll` module |
| **Phase/Step** | Phase 4.6 |
| **Status** | ❌ Open |
| **Files** | `src/modules/payroll/payroll.routes.ts` (line 28) |

**What's wrong:**
`router.use(requireFeature('PAYROLL_ENABLED'), requireAuth)` — the feature gate fires before authentication. Unauthenticated requests receive `503 FEATURE_DISABLED` (if payroll is off), leaking the feature enablement state without credentials. All other modules correctly order `requireAuth` before `requireFeature`.

**Risk/Impact:** Unauthenticated actors can probe `/api/payroll` to determine whether payroll is enabled. Inconsistent convention may be copied by future developers.

**Recommended fix:** Swap the order to `router.use(requireAuth, requireFeature('PAYROLL_ENABLED'))` — matching the pattern in push.routes.ts, pricing.routes.ts, memberships.routes.ts, etc.

---

### FINDING-007 — Service Credentials Silently Default to Empty String (No Startup Validation)

| Field | Value |
|---|---|
| **Severity** | 🟠 High |
| **Scope** | `config/index.ts` |
| **Phase/Step** | Phase 0 — Config |
| **Status** | ❌ Open |
| **Files** | `src/config/index.ts` (lines 149–177) |

**What's wrong:**
All third-party service keys — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `OPENAI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `RESEND_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` — use `optional()` with empty string defaults. When a feature is enabled but its credential is missing, the server starts successfully but produces cryptic runtime errors at the first real API call.

**Risk/Impact:** Silent misconfiguration in production. Particularly dangerous for `STRIPE_WEBHOOK_SECRET` — an empty string would cause webhook signature verification to fail silently or be bypassed.

**Recommended fix:** Add conditional startup validation: for each optional credential, check if the corresponding feature flag is ON in defaults and the credential is empty — if so, `process.exit(1)` with a clear message. In production (`NODE_ENV=production`), require all credentials that correspond to enabled features.

---

### FINDING-008 — JWT Access Token Has No Revocation Mechanism

| Field | Value |
|---|---|
| **Severity** | 🟠 High |
| **Scope** | `auth` module |
| **Phase/Step** | Phase 0 — Auth |
| **Status** | ❌ Open |
| **Files** | `src/modules/auth/auth.service.ts` (functions: `login`, `logout`, `verifyAccessToken`), `src/middleware/auth.ts` |

**What's wrong:**
JWT access tokens are verified by signature and expiry only — there is no revocation list. `logout()` only revokes the refresh token in DB. The `isActive` user check only runs at refresh time, not on access token verification. A compromised or stolen access token remains valid for up to 15 minutes after logout or account deactivation.

**Risk/Impact:** Deactivated users can still make authenticated API calls for up to 15 minutes. Stolen access tokens cannot be invalidated before natural expiry.

**Recommended fix:** Maintain a Redis-backed short-lived revocation set. On logout and on `isActive=false`, write the token's `jti` (add a `jti: crypto.randomUUID()` claim) to Redis with TTL = remaining expiry. In `verifyAccessToken()`, check the jti against the revocation set. Standard pattern for JWT revocation without full server-side sessions.

---

### FINDING-009 — Fire-and-Forget `void` on Critical Side-Effect Paths

| Field | Value |
|---|---|
| **Severity** | 🟡 Medium |
| **Scope** | `bookings` module, `payments` module, `leads` module |
| **Phase/Step** | Phase 0–9 |
| **Status** | ❌ Open |
| **Files** | `src/modules/bookings/bookings.service.ts` (lines 308, 310–311, 317, 330, 354, 505, 518, 537, 552, 630, 632–633, 637, 640, 655, 755), `src/modules/payments/payments.service.ts` (lines 510, 564), `src/modules/leads/leads.service.ts` (lines 301, 312, 498) |

**What's wrong:**
Numerous critical side-effects use `void somePromise()` with no `.catch()`. Examples: `void syncCreateEvent(id)`, `void syncOutlookCreateEvent(id)`, `void syncAppleCreateEvent(id)`, `void enqueueWebhookEvent(...)`, `void cancelBookingReminder(id)`. Failures on these calls are entirely silent — no log entry, no error propagation.

**Risk/Impact:** Calendar sync failures go undetected (staff calendars desynchronised). Webhook delivery failures are invisible to integrations. Booking reminders may fire after cancellation if `cancelBookingReminder` silently fails.

**Recommended fix:** Wrap each `void` call with a `.catch(err => logger.error('Calendar sync failed', { err, bookingId }))` at minimum. Use the pattern already applied on line 558: `void awardPoints(...).catch((err) => logger.warn(...))`. Apply consistently across all 20+ fire-and-forget call sites.

---

### FINDING-010 — CAPTCHA Config Variables Not in Validated AppConfig

| Field | Value |
|---|---|
| **Severity** | 🟡 Medium |
| **Scope** | `middleware/captcha.ts`, `config/index.ts` |
| **Phase/Step** | Phase 2.3 |
| **Status** | ❌ Open |
| **Files** | `src/middleware/captcha.ts` (lines 50–52), `src/config/index.ts` |

**What's wrong:**
`captcha.ts` reads `CAPTCHA_ENABLED`, `CAPTCHA_PROVIDER`, and `CAPTCHA_SECRET` directly from `process.env` — not from the validated `config` object. These are absent from `AppConfig` and receive no startup validation. If `CAPTCHA_SECRET` is missing, the verifier sends an empty string to hCaptcha/Turnstile, which silently rejects all verifications (or may accept with a forgiving test key).

**Risk/Impact:** CAPTCHA can be silently misconfigured or bypassed in production, undermining bot protection on the public booking widget and lead capture form.

**Recommended fix:** Add `CAPTCHA_ENABLED`, `CAPTCHA_PROVIDER`, and `CAPTCHA_SECRET` to `AppConfig`. When `CAPTCHA_ENABLED=true`, validate that `CAPTCHA_SECRET` is non-empty. Reference `config.CAPTCHA_SECRET` in `captcha.ts`.

---

### FINDING-011 — FeatureFlag DB Model Has `tenantId` But Per-Tenant Override Is Not Implemented

| Field | Value |
|---|---|
| **Severity** | 🟡 Medium |
| **Scope** | `admin` module, Prisma schema |
| **Phase/Step** | Phase 0 — Feature Flags |
| **Status** | ❌ Open |
| **Files** | `prisma/schema.prisma` (FeatureFlag model, line 535), `src/modules/admin/admin.service.ts` (functions: `listFeatureFlags`, `updateFeatureFlag`) |

**What's wrong:**
The `FeatureFlag` model has a `tenantId String?` column designed for per-tenant flag overrides. However, `updateFeatureFlag()` uses `prisma.featureFlag.update({ where: { key } })` (unique by `key` only), which operates on the global row and does not create/update per-tenant rows. The entire per-tenant override capability is architecturally defined but never implemented.

**Risk/Impact:** All tenants always receive the same flag state. SUPER_ADMIN cannot give TenantA a feature that TenantB does not have. The `tenantId` column is dead weight.

**Recommended fix:** Extend `updateFeatureFlag()` to accept `tenantId` and use `prisma.featureFlag.upsert` with a `key + tenantId` composite key. Add `@@unique([key, tenantId])` to the schema. The admin API should accept an optional `tenantId` query param.

---

### FINDING-012 — Multiple Email Side-Effects Are Log Stubs Only (Not Functional)

| Field | Value |
|---|---|
| **Severity** | 🟡 Medium |
| **Scope** | Multiple modules |
| **Phase/Step** | Phase 0–1 |
| **Status** | ❌ Open |
| **Files** | `src/modules/auth/auth.service.ts` (line 281), `src/modules/bookings/bookings.service.ts` (line 304), `src/modules/invoices/invoices.service.ts` (line 261), `src/modules/leads/leads.service.ts` (lines 155, 163), `src/modules/customers/customers.service.ts` (lines 263, 282, 360), `src/modules/capture/capture.service.ts` (line 153) |

**What's wrong:**
The following actions emit `logger.info('Email job queued (stub)', ...)` but never queue or send anything: password reset email, booking confirmation email, invoice sent email, lead inquiry received email (to customer), admin notification for new lead, cancellation fee notification, booking cancelled email, reschedule request email, and capture webhook dispatch stub.

**Risk/Impact:** Critical user-facing communications (booking confirmation, invoice, password reset) are never sent. Studio owners miss new lead notifications. All failures are invisible — no monitoring indicates these are broken.

**Recommended fix:** Implement each stub as a proper BullMQ job enqueue using the existing `resend.ts` client and `template-renderer.ts`. Infrastructure exists — only the enqueueing calls are missing. Priority order: password reset (blocks user flow), booking confirmation, new lead notification.

---

### FINDING-013 — `where: any` Type in products.service.ts and pos.service.ts

| Field | Value |
|---|---|
| **Severity** | 🟡 Medium |
| **Scope** | `products` module, `pos` module |
| **Phase/Step** | Phase 4.3, 4.4 |
| **Status** | ❌ Open |
| **Files** | `src/modules/products/products.service.ts` (line 46), `src/modules/pos/pos.service.ts` (line 215) |

**What's wrong:**
Both services declare `const where: any = { tenantId, isActive: true }` and dynamically extend the where clause with untyped assignment. Using `any` bypasses TypeScript's Prisma query-builder type safety — invalid or injected query fields would not be caught at compile time.

**Risk/Impact:** Future modifications to the where clause will not be caught by TypeScript. Risk of incorrect query results due to malformed conditions passing silently.

**Recommended fix:** Replace `const where: any` with `const where: Prisma.ProductWhereInput` and `Prisma.PosTransactionWhereInput` respectively, matching the typed pattern used by every other service.

---

### FINDING-014 — Global Rate Limiter Is Hardcoded and Not Configurable

| Field | Value |
|---|---|
| **Severity** | 🟡 Medium |
| **Scope** | `app.ts`, `config/index.ts` |
| **Phase/Step** | Phase 0 |
| **Status** | ❌ Open |
| **Files** | `src/app.ts` (lines 101–113), `src/config/index.ts` |

**What's wrong:**
The global rate limiter is hardcoded at 100 requests per 15-minute window — not configurable via environment variables. This single limit is shared by all routes including admin dashboards (which may poll frequently), the public booking widget, and the analytics event endpoint. No per-route override mechanism exists beyond the separate auth and public booking-specific limiters.

**Risk/Impact:** Legitimate admin users (frequent polling) may be rate-limited and see 429 errors. The shared limit is both too strict for admin dashboards and potentially too generous for unauthenticated endpoints not covered by specific limiters.

**Recommended fix:** Move `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` to `AppConfig` as `optional()` with current hardcoded values as defaults. Consider distinct tiers for public, auth, and authenticated admin routes.

---

### FINDING-015 — booking.tenantId && Guard Allows Silent Skip of Side-Effects

| Field | Value |
|---|---|
| **Severity** | 🟡 Medium |
| **Scope** | `bookings` module |
| **Phase/Step** | Phase 5 |
| **Status** | ❌ Open |
| **Files** | `src/modules/bookings/bookings.service.ts` (lines 366, 550, 654) |

**What's wrong:**
`if (booking.tenantId && getDefaultFlags()['PACKAGES_ENABLED'])` — using `&&` with a nullable `tenantId` short-circuits the entire condition when `tenantId` is null/falsy. Bookings without a `tenantId` (global/legacy bookings) silently skip package deduction, loyalty point awards, and waitlist matching. This is the same anti-pattern flagged in stored security memories as a historical bypass vector.

**Risk/Impact:** Package credits are consumed by bookings but never decremented on global/legacy bookings. Loyalty points never awarded. Waitlist never processed.

**Recommended fix:** Separate the tenantId null check from the feature flag check. Handle null tenantId within the called service functions (they already accept `tenantId: string | null`). Only the DB-read feature flag check should gate the side-effect. Use strict null checks: `if (tenantId !== null && flagIsEnabled)`.

---

### FINDING-016 — GIFT_VOUCHER_ENABLED and GIFT_CARDS_ENABLED are Duplicate Feature Flag Keys

| Field | Value |
|---|---|
| **Severity** | 🟡 Medium |
| **Scope** | `config/businessType.ts` |
| **Phase/Step** | Phase 0 / Phase 4 |
| **Status** | ❌ Open |
| **Files** | `src/config/businessType.ts` (lines 254 and 293) |

**What's wrong:**
`FEATURE_FLAG_KEYS` contains both `'GIFT_VOUCHER_ENABLED'` (line 254, core flags section) and `'GIFT_CARDS_ENABLED'` (line 293, Phase 4 section). These appear to be duplicates for the same feature. The gift-cards module uses `requireFeature('GIFT_CARDS_ENABLED')`, but the legacy `GIFT_VOUCHER_ENABLED` key remains, causing two DB rows and two Control Centre toggles for the same feature.

**Risk/Impact:** Two diverging toggles for the same feature confuses SUPER_ADMIN. The DB seed creates redundant rows. Future flag state can diverge, producing unpredictable behaviour.

**Recommended fix:** Retain `GIFT_CARDS_ENABLED` (matches module and routes). Remove `GIFT_VOUCHER_ENABLED` from `FEATURE_FLAG_KEYS` and from all `defaultFeatureFlags` per-type objects. Run a DB migration to remove the orphaned row.

---

### FINDING-017 — Misleading Comments on forgotPassword Route and Controller

| Field | Value |
|---|---|
| **Severity** | 🟢 Low |
| **Scope** | `auth` module |
| **Phase/Step** | Phase 0 |
| **Status** | ❌ Open |
| **Files** | `src/modules/auth/auth.routes.ts` (line 68), `src/modules/auth/auth.controller.ts` (line 165) |

**What's wrong:**
Route comment says `"generate reset token + queue email"` and controller docstring says `"Generates a password reset token and queues a reset email"`. Both state the email is queued, which is false (see FINDING-002). This misleads developers into thinking password reset is operational.

**Recommended fix:** Update comments to accurately reflect: "generates reset token; email dispatch NOT YET IMPLEMENTED (TODO)". Fix alongside FINDING-002.

---

### FINDING-018 — isActive Filter Parsed from String Comparison (Fragile Pattern)

| Field | Value |
|---|---|
| **Severity** | 🟢 Low |
| **Scope** | `admin` module |
| **Phase/Step** | Phase 0 |
| **Status** | ❌ Open |
| **Files** | `src/modules/admin/admin.service.ts` (lines 220–222, 283–285) |

**What's wrong:**
`if (query.isActive !== undefined) { where.isActive = query.isActive === 'true'; }` — the query parameter is received as a string and compared to the literal `'true'`. Sending `?isActive=1` or `?isActive=True` returns all results (filter silently treated as false), rather than an error.

**Recommended fix:** Use `z.enum(['true','false']).transform(v => v === 'true')` in the Zod schema so the parameter is coerced to boolean before reaching the service.

---

### FINDING-019 — Inconsistent tenantId Nullability Pattern Across Controllers

| Field | Value |
|---|---|
| **Severity** | 🟢 Low |
| **Scope** | Multiple modules |
| **Phase/Step** | All Phases |
| **Status** | ❌ Open |
| **Files** | `src/modules/pricing/pricing.controller.ts` (uses `?? null`), `src/modules/memberships/memberships.controller.ts` (uses `!`), `src/modules/analytics/analytics.controller.ts` (uses `!`), `src/modules/locations/locations.controller.ts` (uses `?? null`) |

**What's wrong:**
Some controllers use the safe `req.user!.tenantId ?? null` while others use `req.user!.tenantId!` (crashes for SUPER_ADMIN). There is no centralised helper to enforce consistent extraction.

**Recommended fix:** Create a shared `extractTenantId(req: Request): string | null` utility in `src/utils/` that returns `req.user!.tenantId ?? null` and use it in all controllers. Eliminates inconsistency and FINDING-005 crashes.

---

### FINDING-020 — Public Booking Widget Not Guarded by BOOKING_ENABLED Master Switch

| Field | Value |
|---|---|
| **Severity** | 🟢 Low |
| **Scope** | `public` module |
| **Phase/Step** | Phase 2 |
| **Status** | ❌ Open |
| **Files** | `src/modules/public/public.routes.ts` (line 38) |

**What's wrong:**
`router.use(requireFeature('PUBLIC_BOOKING_ENABLED'))` — the public widget is gated only by its own flag, not by the master `BOOKING_ENABLED` flag. Disabling `BOOKING_ENABLED` (documented as "master switch — disables all bookings when OFF") does not disable public bookings.

**Recommended fix:** Add `requireFeature('BOOKING_ENABLED')` before `requireFeature('PUBLIC_BOOKING_ENABLED')` in the middleware chain, or document explicitly that public bookings intentionally bypass the master switch.

---

### FINDING-021 — Redis Connection Error Not Fatal at Startup

| Field | Value |
|---|---|
| **Severity** | 🟢 Low |
| **Scope** | `lib/redis.ts` |
| **Phase/Step** | Phase 0 |
| **Status** | ❌ Open |
| **Files** | `src/lib/redis.ts` (line 28) |

**What's wrong:**
Redis connection errors are only logged via `logger.error(...)`. If Redis is unavailable at startup, the server starts successfully but all BullMQ queue operations (reminders, reviews, webhooks, AI jobs, push notifications) fail silently. Rate limiting also falls back to in-memory state, which is incorrect under load balancing.

**Risk/Impact:** Silent degradation — no reminders, no webhooks, no AI jobs — but the server reports healthy.

**Recommended fix:** Add a Redis connectivity check at startup (`redis.ping()`) and surface a clear WARNING log. Optionally add Redis status to the `/health` endpoint as a degraded indicator.

---

## Summary — Backend Readiness Assessment (2026-04-13)

| # | Severity | Status | Title |
|---|---|---|---|
| 001 | 🔴 Critical | ❌ Open | Feature Flag Enforcement Disconnected from DB — Control Centre Non-Functional |
| 002 | 🔴 Critical | ❌ Open | Password Reset Email Never Sent |
| 003 | 🔴 Critical | ❌ Open | Admin Service Missing TenantId Filter — Cross-Tenant Data Leak |
| 004 | 🔴 Critical | ❌ Open | listBookings Missing TenantId Scoping Filter |
| 005 | 🟠 High | ❌ Open | SUPER_ADMIN (tenantId=null) Crashes Multiple Controllers |
| 006 | 🟠 High | ❌ Open | Payroll: requireFeature Before requireAuth (Wrong Order) |
| 007 | 🟠 High | ❌ Open | Third-Party Service Credentials Silent Empty Default |
| 008 | 🟠 High | ❌ Open | JWT Access Token Has No Revocation Mechanism |
| 009 | 🟡 Medium | ❌ Open | Fire-and-Forget `void` on 20+ Critical Side-Effect Paths |
| 010 | 🟡 Medium | ❌ Open | CAPTCHA Config Not in Validated AppConfig |
| 011 | 🟡 Medium | ❌ Open | FeatureFlag Per-Tenant Override (tenantId column) Not Implemented |
| 012 | 🟡 Medium | ❌ Open | Multiple Email Side-Effects Are Log Stubs (Not Functional) |
| 013 | 🟡 Medium | ❌ Open | `where: any` Type in Products/POS Services |
| 014 | 🟡 Medium | ❌ Open | Global Rate Limiter Hardcoded, Not Configurable |
| 015 | 🟡 Medium | ❌ Open | booking.tenantId && Guard Silently Skips Side-Effects |
| 016 | 🟡 Medium | ❌ Open | Duplicate GIFT_VOUCHER_ENABLED / GIFT_CARDS_ENABLED Keys |
| 017 | 🟢 Low | ❌ Open | Misleading Comments on forgotPassword Route/Controller |
| 018 | 🟢 Low | ❌ Open | isActive Filter Parsed via String Comparison (Fragile) |
| 019 | 🟢 Low | ❌ Open | Inconsistent tenantId Nullability Pattern Across Controllers |
| 020 | 🟢 Low | ❌ Open | Public Booking Widget Not Guarded by BOOKING_ENABLED Master Switch |
| 021 | 🟢 Low | ❌ Open | Redis Connection Error Not Fatal at Startup |

**Verdict: Backend is NOT ready for frontend integration in its current state.**
The 4 critical-severity findings (001–004) must be resolved before frontend development begins.
FINDING-001 (Control Centre is non-functional) and FINDING-003 (cross-tenant admin data leak) are the most urgent and must be fixed first.
