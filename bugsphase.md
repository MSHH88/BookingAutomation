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
