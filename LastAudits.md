# LastAudits.md — Full-System Audit Report

- **Audit Date:** 2026-04-15
- **Branch:** `copilot/create-detailed-automation-plan`
- **Commit:** `a5e2c2afe593807fb9464b3e4db5d8d09b8daa55`
- **Statement:** Full-system audit completed; all modules/routes/jobs/flags reviewed.

---

## Test Output Validation

**Given output:**
```
Test Suites: 100 passed, 100 total
Tests:       1754 passed, 1754 total
```

**Baseline from `bugsphase.md` (line 1031):** `100 suites, 1756/1756 tests`

**Verdict:** ❌ **This output is NOT correct.** The repo baseline expects **1756 tests** but only **1754** were reported. 2 tests are missing. There are **zero** `test.skip`, `describe.skip`, `it.skip`, `it.only`, or `describe.only` in the codebase (verified via grep). The 100-suite count matches. The discrepancy is recorded as BUG 1 below.

---

## Audit Coverage Summary

| Category | Reviewed | Findings |
|----------|----------|----------|
| A) Route & Module Wiring | 53 routes, 45 API modules, 8 jobs, 11 middleware | 0 issues |
| B) Feature Flag Coverage | 46 flags in FEATURE_FLAG_KEYS | 1 orphan flag |
| C) Business Type Behavior | 6 business types verified | 0 issues |
| D) CRM Manageability | Templates, invoices, roles, artists, services, pricing | 1 issue |
| E) Analytics & Statistics | 8 analytics functions | 0 issues |
| F) Notifications + Automations | Dispatcher, reminders, 8 jobs, 3 template modules | 2 issues |
| G) Security, RBAC, Tenant Isolation | Auth, roles, 85+ endpoints | 1 issue |

---

## Findings

---

### BUG 1 — Test Count Mismatch (2 Tests Missing)

**Severity:** Low

**Files:**
- `bugsphase.md:1031` (baseline: "100 suites, 1756/1756 tests")
- `backend/src/modules/sessions/sessions.test.ts` (most recently added test file)
- All 100 `.test.ts` files in `backend/src/`

**Issue:**
The repo baseline documented in `bugsphase.md` expects **1756 tests across 100 suites**. The actual test run reports **1754 tests across 100 suites**. Two tests are missing. No `test.skip`, `describe.skip`, `it.only`, or `describe.only` markers exist in any test file (verified by full-codebase grep). No `--testPathPattern` or filter was used. The Jest config (`backend/package.json` lines 73–102) uses `testMatch: ["**/*.test.ts", "**/*.spec.ts"]` with `roots: ["<rootDir>/src"]` and no `testPathIgnorePatterns`.

**Impact:**
Two test cases that existed at baseline time are no longer running. This could mask regressions — the missing tests may have been unintentionally removed during a refactor or commit squash.

**Evidence:**
- `bugsphase.md:1031`: "100 suites, 1756/1756 tests"
- `bugsphase.md:1091,1167,1227,1275`: "≥1756 tests" referenced multiple times
- Repository memories (Phase 9 bug-audit round): "100 suites, 1756/1756 tests"
- Repository memories (Phase 9 initial): "100 suites, 1754/1754 tests"
- Zero skipped/only markers found in all test files

**Recommended Fix:**
1. Run `cd backend && npx jest --listTests | wc -l` to confirm 100 test files are discovered.
2. Compare the detailed per-file test count between the baseline commit and HEAD using `npx jest --verbose 2>&1 | grep -E "^  (PASS|FAIL)" | wc -l` to identify which suite(s) lost tests.
3. The sessions.test.ts file (32 `it()` calls) was the last file modified — compare its current test count to the bug-audit round that reported 1756 to identify the 2 missing tests.

---

### BUG 2 — SMS_ENABLED Flag Has No Runtime Enforcement

**Severity:** Medium

**Files:**
- `backend/src/config/businessType.ts:245` (flag definition)
- `backend/src/config/businessType.ts:328,377,426,475,524,573` (per-business-type defaults)
- `backend/src/lib/notification-dispatcher.ts:18` (comment references it)
- `backend/src/lib/notification-dispatcher.ts:62` (code uses SMS_REMINDERS_ENABLED instead)

**Issue:**
`SMS_ENABLED` is defined in `FEATURE_FLAG_KEYS` (line 245) with defaults for all 6 business types (ON for all except Restaurant). However, it has **zero runtime enforcement** anywhere in the codebase. No `requireFeature('SMS_ENABLED')` middleware call, no `isFeatureEnabled('SMS_ENABLED', ...)` service call exists. The notification dispatcher's comment (line 18) states "SMS_ENABLED must be ON for SMS" but the actual code at line 62 checks `SMS_REMINDERS_ENABLED` instead.

**Impact:**
Admins toggling `SMS_ENABLED` in the Control Centre will see no effect — SMS dispatch is gated only by `SMS_REMINDERS_ENABLED`. This is a feature-flag-not-affecting-runtime-behavior violation (rule #4 from the audit criteria). The flag pollutes the Control Centre with a non-functional toggle.

**Evidence:**
- `grep -rn '"SMS_ENABLED"' backend/src/` returns only `businessType.ts` definitions — zero runtime usage.
- `notification-dispatcher.ts:62` checks `SMS_REMINDERS_ENABLED`, not `SMS_ENABLED`.
- `notification-dispatcher.ts:18` comment incorrectly references `SMS_ENABLED`.

**Recommended Fix:**
Option A: Remove `SMS_ENABLED` from `FEATURE_FLAG_KEYS` and all 6 business-type defaults (it's redundant with `SMS_REMINDERS_ENABLED`).
Option B: Add `SMS_ENABLED` as a master SMS channel check in `notification-dispatcher.ts` resolveChannels(), gating SMS_REMINDERS_ENABLED behind it.

---

### BUG 3 — WhatsApp Processor Ignores Editable Templates

**Severity:** Medium

**Files:**
- `backend/src/modules/whatsapp/whatsapp.queue.ts:136-230` (hardcoded `buildWhatsAppMessage()`)
- `backend/src/modules/whatsapp-templates/whatsapp-templates.service.ts` (full CRUD exists)
- `backend/src/modules/whatsapp-templates/whatsapp-templates.routes.ts` (mounted at `/api/messages/whatsapp-templates`)

**Issue:**
The WhatsApp queue processor (`whatsapp.queue.ts`) uses `buildWhatsAppMessage()` (line 136) which constructs messages via a hardcoded `switch` statement on `jobName` (lines 154–230). The WhatsApp template module provides full CRUD operations (list, get, update, create, delete) and templates are stored in the database, but the processor **never calls** `renderWhatsAppTemplate()` or any template lookup function. Instead, it builds messages from hardcoded string concatenation.

By contrast, the SMS queue processor (`sms.queue.ts:93-97`) correctly looks up templates from the database: `where: { key: jobName, tenantId: tenantId ?? null, isActive: true }`.

**Impact:**
Admins can edit WhatsApp templates via the CRM (`/api/messages/whatsapp-templates` endpoints) but changes have **zero effect** on actual WhatsApp messages sent. This breaks the CRM manageability contract — admins believe they are customizing messages, but hardcoded text is always used. This is a blocks-real-operations violation (rule #6).

**Evidence:**
- `whatsapp.queue.ts:243`: `const message = buildWhatsAppMessage(job.data)` — uses hardcoded builder.
- `sms.queue.ts:97`: `where: { key: jobName, tenantId: tenantId ?? null, isActive: true }` — uses DB templates.
- `grep -rn "renderWhatsAppTemplate\|whatsapp-templates" modules/whatsapp/ lib/ jobs/` returns zero hits.

**Recommended Fix:**
Update the WhatsApp queue processor to look up the template by `jobName` + `tenantId` from the database (matching the SMS processor pattern), compile it with the job's variables, and fall back to the hardcoded `buildWhatsAppMessage()` only when no active template exists.

---

### BUG 4 — Booking Single-Record Endpoints Missing Tenant Isolation

**Severity:** High

**Files:**
- `backend/src/modules/bookings/bookings.controller.ts:24-50` (getBookingById — no tenantId passed)
- `backend/src/modules/bookings/bookings.controller.ts:52-68` (confirmBooking — no tenantId)
- `backend/src/modules/bookings/bookings.controller.ts:70-90` (completeBooking — no tenantId)
- `backend/src/modules/bookings/bookings.controller.ts:92-110` (cancelBooking — no tenantId)
- `backend/src/modules/bookings/bookings.controller.ts:112-130` (rescheduleBooking — no tenantId)
- `backend/src/modules/bookings/bookings.service.ts:208-233` (getBookingById — no tenant check for ADMIN)

**Issue:**
The `listBookings` controller correctly passes `tenantId` to the service (line 39-40), but **all five single-record booking endpoints** (`getBookingById`, `confirmBooking`, `completeBooking`, `cancelBooking`, `rescheduleBooking`) do NOT extract or pass `tenantId`. In the service layer, `getBookingById()` (lines 208-233) fetches a booking by ID with no tenant filter for ADMIN actors — an ADMIN user from Tenant A can view, confirm, complete, cancel, or reschedule any booking from Tenant B if they know (or brute-force) the booking ID.

**Impact:**
Cross-tenant data access: An ADMIN can read and mutate bookings belonging to other tenants. This is a security/privacy/tenant-isolation risk (rule #2). Given that booking records contain customer PII (name, phone, email, service details), this is a cross-tenant PII leak.

**Evidence:**
- `bookings.controller.ts:39`: `const tenantId = req.user?.tenantId ?? null;` (only in listBookings)
- `bookings.controller.ts:44-130`: No `tenantId` extraction in getBookingById, confirmBooking, completeBooking, cancelBooking, rescheduleBooking.
- `bookings.service.ts:213`: `prisma.booking.findUnique({ where: { id } })` — no tenantId in where clause.
- `bookings.service.ts:222-229`: Only ARTIST actors are checked; ADMIN actors bypass all ownership checks.

**Recommended Fix:**
1. In `bookings.controller.ts`: Extract `tenantId` from `req.user` in all five single-record handlers and pass it to the service.
2. In `bookings.service.ts`: For `getBookingById`, `confirmBooking`, `completeBooking`, `cancelBooking`, `rescheduleBooking` — after fetching the booking, verify `booking.tenantId === tenantId` when `tenantId !== null` (i.e., non-SUPER_ADMIN), or reject with 403 FORBIDDEN.

---

### BUG 5 — Invoice Overdue Job Lacks Per-Tenant Feature Flag Check

**Severity:** Low

**Files:**
- `backend/src/jobs/invoice-overdue.job.ts:56-68`
- `backend/src/modules/invoices/invoices.service.ts:422-436` (`markOverdueInvoices`)

**Issue:**
The invoice overdue job (line 58) checks only the global `INVOICE_AUTOMATION_ENABLED` flag: `isFeatureEnabled('INVOICE_AUTOMATION_ENABLED')` without passing a `tenantId`. All other jobs (birthday, campaign, no-show, rebook-nudge, recurring-booking, waitlist-match, ai-suggestion) perform per-tenant flag checks. Additionally, `markOverdueInvoices()` (lines 422-436) runs a blanket `updateMany` across ALL tenants without tenant scoping.

**Impact:**
If one tenant wants to disable invoice automation, there is no mechanism to do so — the toggle is global only. Disabling the flag disables invoice overdue processing for ALL tenants. This is inconsistent with the per-tenant flag model used by all other jobs.

**Evidence:**
- `invoice-overdue.job.ts:58`: `if (!(await isFeatureEnabled('INVOICE_AUTOMATION_ENABLED')))` — no tenantId parameter.
- Compare with `birthday.job.ts:123`: `isFeatureEnabled('BIRTHDAY_AUTOMATION_ENABLED', tenantId)` — has tenantId.
- `invoices.service.ts:423-429`: `prisma.invoice.updateMany({ where: { status: 'UNPAID', dueDate: { lt: new Date() } } })` — no tenant filter.

**Recommended Fix:**
1. Change `markOverdueInvoices()` to iterate by tenant: fetch distinct tenantIds from unpaid invoices, check `isFeatureEnabled('INVOICE_AUTOMATION_ENABLED', tenantId)` per tenant, then updateMany per tenant.
2. Alternatively, add tenant scoping to the updateMany where clause.

---

## Modules Verified (No Issues Found)

The following areas were audited and found to be correctly wired with no issues:

### A) Route & Module Coverage — ✅ All Clear
- **53 routes** mounted in `app.ts` — all reference valid router files.
- **45 API modules** with standard routes → controller → service wiring.
- **3 sub-router modules** (email-templates, sms-templates, whatsapp-templates) mounted via `/api/messages`.
- **3 background queue processors** (reminders, reviews, sms) correctly not HTTP-mounted.
- **8 jobs** registered in `jobs/index.ts` with correct feature flags.
- **11 middleware files** present and correctly ordered.

### B) Feature Flags — ✅ 45/46 Enforced
- 32 flags enforced via `requireFeature()` middleware on routes.
- 14 flags enforced via `isFeatureEnabled()` in services/jobs/dispatchers.
- 6 flags have dual enforcement (middleware + service layer).
- Per-tenant override support confirmed via Redis caching (60s TTL) with DB fallback.
- **1 orphan flag found:** SMS_ENABLED (BUG 2 above).

### C) Business Type Behavior — ✅ All Clear
- All 6 business types (nail salon, hair salon, barber, masseuse, tattoo shop, restaurant) have complete feature flag defaults in `businessType.ts`.
- Restaurant correctly restricts to 17/46 flags (booking, tables, waitlist, POS, analytics, rota, referrals, tips, gift cards, inventory, review, invoice automation, email/whatsapp reminders, public booking, staff app).
- Tattoo shop correctly enables quote system and disables service menu.
- No business type claims features that lack backend scaffolding.

### D) CRM Manageability — ✅ Mostly Clear
- Email templates: Full CRUD + Handlebars rendering + `sendEmail()` uses DB templates at send time.
- SMS templates: Full CRUD + variable interpolation + `sms.queue.ts` uses DB templates at send time.
- WhatsApp templates: Full CRUD exists but **processor ignores templates** (BUG 3 above).
- Invoices: Full lifecycle (create → UNPAID → PAID/OVERDUE/VOIDED) with status transitions.
- Roles/permissions: CRUD with RBAC version invalidation via Redis.
- Artists, services, pricing, locations, sessions: All have CRUD endpoints.

### E) Analytics & Statistics — ✅ All Clear
- All 8 analytics functions are tenant-scoped (tenantId passed in all DB queries).
- Revenue analytics includes grossRevenue, totalCommissions, netRevenue, deposits (collected/refunded/net).
- Customer analytics includes rebookRate with 30-day window.
- Bookings analytics includes byLocation breakdown.
- Artist analytics includes utilization rate from Shift model (availableMinutes/bookedMinutes).
- Controller extracts tenantId for all endpoints.

### F) Notifications + Automations — ✅ Mostly Clear
- Notification dispatcher respects per-tenant flags for EMAIL_REMINDERS_ENABLED, SMS_REMINDERS_ENABLED, WHATSAPP_CONTACT_ENABLED.
- Reminders queue checks EMAIL_REMINDERS_ENABLED with tenantId.
- All 8 jobs check feature flags at runtime (7/8 with per-tenant checks; invoice-overdue is global-only — BUG 5).
- Email and SMS templates used at send time. WhatsApp templates not used (BUG 3).
- No stub/no-op send paths that claim delivery but do nothing.

### G) Security, RBAC, Tenant Isolation — ✅ Mostly Clear
- Role hierarchy: SUPER_ADMIN > ADMIN > ARTIST > CUSTOMER — properly cascading.
- JWT with rbacVersion: token invalidated on role/permission changes via Redis counter.
- Refresh token rotation: old tokens immediately revoked on exchange.
- Public endpoints properly protected with rate limiting + CAPTCHA.
- `listBookings` tenant-scoped ✅.
- Single-record booking endpoints NOT tenant-scoped (BUG 4).
- Admin module: Studio settings reject null tenantId with 403 ✅.
- Roles module: ADMIN with canAssignRoles cannot escalate to SUPER_ADMIN ✅.
- Leads module: getLeadById/updateLeadStatus/updateLeadScore all tenant-scoped ✅.
- Analytics module: all endpoints tenant-scoped ✅.

---

## Summary

| Bug | Severity | Category | One-Line Summary |
|-----|----------|----------|------------------|
| BUG 1 | Low | Testing | 2 tests missing vs baseline (1754 vs 1756) |
| BUG 2 | Medium | Feature Flags | SMS_ENABLED flag defined but never enforced at runtime |
| BUG 3 | Medium | CRM/Notifications | WhatsApp processor uses hardcoded messages, ignores editable templates |
| BUG 4 | High | Security/Tenant | Booking single-record endpoints lack tenant isolation for ADMIN users |
| BUG 5 | Low | Automations | Invoice overdue job has global-only flag check, no per-tenant support |

**Total: 5 findings (1 High, 2 Medium, 2 Low)**
