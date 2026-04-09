# Phase 0 — Security & Architecture Foundation

Implements the **multi-tenancy base layer** and the **SUPER_ADMIN role** required
before any other feature can be safely deployed.

**What Phase 0 delivers:**

- `SUPER_ADMIN` role (level 5, above ADMIN) — the platform owner / god mode
- `Tenant` model — every sold business instance is a `Tenant`
- `WhatsAppTemplate` model — per-tenant overridable message templates (seeded globally)
- `tenantId` added to **13 models** — multi-tenancy scaffolding on all data
- `canViewLeads` + `canAssignRoles` permission flags on `User` — granular access control
- Both flags embedded in the JWT at login — zero extra DB round-trips on protected routes
- `requireLeadAccess` middleware — SUPER_ADMIN always; ADMIN only if `canViewLeads=true`
- `requireRole` updated — SUPER_ADMIN satisfies any minimum-role check
- `leads.routes` updated — protected by `requireLeadAccess` instead of `requireRole('ADMIN')`
- `admin.routes` — feature-flags endpoints now require `SUPER_ADMIN` (god-mode only)
- `admin.schema` — role filter enum extended to include `SUPER_ADMIN`
- `/api/roles` module — list users + update role / permission flags
- `/api/tenants` module — full CRUD for tenant management (SUPER_ADMIN only)

**Bug fixed in this audit:**

| ID | File | Bug | Fix |
|----|------|-----|-----|
| BUG-A | `backend/package.json` | `react` + `react-dom` missing from devDependencies — `@react-email/render` (required by `resend`) has them as peer deps; their absence caused all 16 integration test suites to fail at import time with "Cannot find module 'react-dom/server'" | Added `react@^18.3.1` + `react-dom@^18.3.1` as devDependencies |

**Test count:** 45 suites, 1039/1039 tests, 0 TS errors.

---

## ALL 26 FILES MUST BE DOWNLOADED

### New files (created in Phase 0)

| # | File | Status |
|---|------|--------|
| 1  | `backend/src/middleware/requireLeadAccess.ts`              | NEW |
| 2  | `backend/src/middleware/requireLeadAccess.test.ts`          | NEW |
| 3  | `backend/src/modules/roles/roles.controller.ts`             | NEW |
| 4  | `backend/src/modules/roles/roles.routes.ts`                 | NEW |
| 5  | `backend/src/modules/roles/roles.schema.ts`                 | NEW |
| 6  | `backend/src/modules/roles/roles.service.test.ts`           | NEW |
| 7  | `backend/src/modules/roles/roles.service.ts`                | NEW |
| 8  | `backend/src/modules/roles/roles.test.ts`                   | NEW |
| 9  | `backend/src/modules/tenants/tenants.controller.ts`         | NEW |
| 10 | `backend/src/modules/tenants/tenants.routes.ts`             | NEW |
| 11 | `backend/src/modules/tenants/tenants.schema.ts`             | NEW |
| 12 | `backend/src/modules/tenants/tenants.service.test.ts`       | NEW |
| 13 | `backend/src/modules/tenants/tenants.service.ts`            | NEW |
| 14 | `backend/src/modules/tenants/tenants.test.ts`               | NEW |

### Modified files (replace existing files)

| #  | File | Status |
|----|------|--------|
| 15 | `backend/prisma/schema.prisma`                              | MODIFIED |
| 16 | `backend/src/app.ts`                                        | MODIFIED |
| 17 | `backend/src/middleware/auth.ts`                            | MODIFIED |
| 18 | `backend/src/middleware/auth.test.ts`                       | MODIFIED |
| 19 | `backend/src/middleware/requireRole.ts`                     | MODIFIED |
| 20 | `backend/src/modules/admin/admin.routes.ts`                 | MODIFIED |
| 21 | `backend/src/modules/admin/admin.schema.ts`                 | MODIFIED |
| 22 | `backend/src/modules/auth/auth.service.ts`                  | MODIFIED |
| 23 | `backend/src/modules/leads/leads.routes.ts`                 | MODIFIED |
| 24 | `backend/src/modules/leads/leads.test.ts`                   | MODIFIED |
| 25 | `backend/src/types/express.d.ts`                            | MODIFIED |
| 26 | `backend/package.json`                                      | MODIFIED |

---

## STEP 1 — Delete stale copies of all files that need replacing

Run this from the root of your local project (`~/Desktop/Automation`):

```bash
# ── New files (may not exist yet — safe to rm -f) ─────────────────────────────
rm -f ~/Desktop/Automation/backend/src/middleware/requireLeadAccess.ts && \
rm -f ~/Desktop/Automation/backend/src/middleware/requireLeadAccess.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/roles/roles.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/roles/roles.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/roles/roles.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/roles/roles.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/roles/roles.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/roles/roles.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tenants/tenants.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tenants/tenants.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tenants/tenants.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tenants/tenants.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tenants/tenants.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tenants/tenants.test.ts && \
# ── Modified files (replace with updated versions) ───────────────────────────
rm -f ~/Desktop/Automation/backend/prisma/schema.prisma && \
rm -f ~/Desktop/Automation/backend/src/app.ts && \
rm -f ~/Desktop/Automation/backend/src/middleware/auth.ts && \
rm -f ~/Desktop/Automation/backend/src/middleware/auth.test.ts && \
rm -f ~/Desktop/Automation/backend/src/middleware/requireRole.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/admin/admin.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/admin/admin.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/auth/auth.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/leads/leads.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/leads/leads.test.ts && \
rm -f ~/Desktop/Automation/backend/src/types/express.d.ts && \
rm -f ~/Desktop/Automation/backend/package.json
```

---

## STEP 2 — Create required directories

```bash
mkdir -p ~/Desktop/Automation/backend/src/middleware && \
mkdir -p ~/Desktop/Automation/backend/src/modules/roles && \
mkdir -p ~/Desktop/Automation/backend/src/modules/tenants && \
mkdir -p ~/Desktop/Automation/backend/src/types
```

---

## STEP 3 — Download all 26 files

```bash
BRANCH="copilot/create-detailed-automation-plan"
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/${BRANCH}"

# ── New files ─────────────────────────────────────────────────────────────────
curl -fsSL "${BASE}/backend/src/middleware/requireLeadAccess.ts" \
  -o ~/Desktop/Automation/backend/src/middleware/requireLeadAccess.ts && \
curl -fsSL "${BASE}/backend/src/middleware/requireLeadAccess.test.ts" \
  -o ~/Desktop/Automation/backend/src/middleware/requireLeadAccess.test.ts && \
curl -fsSL "${BASE}/backend/src/modules/roles/roles.controller.ts" \
  -o ~/Desktop/Automation/backend/src/modules/roles/roles.controller.ts && \
curl -fsSL "${BASE}/backend/src/modules/roles/roles.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/roles/roles.routes.ts && \
curl -fsSL "${BASE}/backend/src/modules/roles/roles.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/roles/roles.schema.ts && \
curl -fsSL "${BASE}/backend/src/modules/roles/roles.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/roles/roles.service.test.ts && \
curl -fsSL "${BASE}/backend/src/modules/roles/roles.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/roles/roles.service.ts && \
curl -fsSL "${BASE}/backend/src/modules/roles/roles.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/roles/roles.test.ts && \
curl -fsSL "${BASE}/backend/src/modules/tenants/tenants.controller.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tenants/tenants.controller.ts && \
curl -fsSL "${BASE}/backend/src/modules/tenants/tenants.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tenants/tenants.routes.ts && \
curl -fsSL "${BASE}/backend/src/modules/tenants/tenants.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tenants/tenants.schema.ts && \
curl -fsSL "${BASE}/backend/src/modules/tenants/tenants.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tenants/tenants.service.test.ts && \
curl -fsSL "${BASE}/backend/src/modules/tenants/tenants.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tenants/tenants.service.ts && \
curl -fsSL "${BASE}/backend/src/modules/tenants/tenants.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tenants/tenants.test.ts && \
# ── Modified files ────────────────────────────────────────────────────────────
curl -fsSL "${BASE}/backend/prisma/schema.prisma" \
  -o ~/Desktop/Automation/backend/prisma/schema.prisma && \
curl -fsSL "${BASE}/backend/src/app.ts" \
  -o ~/Desktop/Automation/backend/src/app.ts && \
curl -fsSL "${BASE}/backend/src/middleware/auth.ts" \
  -o ~/Desktop/Automation/backend/src/middleware/auth.ts && \
curl -fsSL "${BASE}/backend/src/middleware/auth.test.ts" \
  -o ~/Desktop/Automation/backend/src/middleware/auth.test.ts && \
curl -fsSL "${BASE}/backend/src/middleware/requireRole.ts" \
  -o ~/Desktop/Automation/backend/src/middleware/requireRole.ts && \
curl -fsSL "${BASE}/backend/src/modules/admin/admin.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/admin/admin.routes.ts && \
curl -fsSL "${BASE}/backend/src/modules/admin/admin.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/admin/admin.schema.ts && \
curl -fsSL "${BASE}/backend/src/modules/auth/auth.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/auth/auth.service.ts && \
curl -fsSL "${BASE}/backend/src/modules/leads/leads.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/leads/leads.routes.ts && \
curl -fsSL "${BASE}/backend/src/modules/leads/leads.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/leads/leads.test.ts && \
curl -fsSL "${BASE}/backend/src/types/express.d.ts" \
  -o ~/Desktop/Automation/backend/src/types/express.d.ts && \
curl -fsSL "${BASE}/backend/package.json" \
  -o ~/Desktop/Automation/backend/package.json
```

---

## STEP 4 — Install dependencies (react + react-dom peer-dep fix)

```bash
cd ~/Desktop/Automation/backend && npm install --legacy-peer-deps
```

---

## STEP 5 — Generate Prisma client and run migration

```bash
cd ~/Desktop/Automation/backend && npx prisma generate
```

Then run the migration against your database:

```bash
cd ~/Desktop/Automation/backend && npx prisma migrate dev --name phase0_tenants_super_admin
```

> **If using a fresh Docker Postgres** (from Step 1.21), run instead:
> ```bash
> cd ~/Desktop/Automation/backend && npx prisma migrate deploy
> ```

---

## STEP 6 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 45 passed, 45 total
Tests:       1039 passed, 1039 total
```

> **All tests must pass with 0 failures.**
> Tests mock all database, Redis, and email calls — no live services required.

---

Adds a **dedicated Studio Settings API** — a public `GET /api/settings` endpoint
(served from Redis cache) plus an ADMIN-only `PATCH /api/settings` endpoint.
Powers email templates, booking confirmations, invoices, and WhatsApp messages
without requiring `.env` changes — studio owners manage all business details
from the CRM.

**What this step delivers:**

- `GET   /api/settings` — Public. Returns a customer-safe subset of StudioSettings (served from Redis cache, 5-minute TTL)
- `PATCH /api/settings` — ADMIN only. Updates the settings row and invalidates the cache.

**Public fields exposed (no auth required):**

| DB field               | Description                                   |
|------------------------|-----------------------------------------------|
| `studioName`           | Business display name                         |
| `studioEmail`          | Contact / reply-to email                      |
| `studioPhone`          | Contact phone                                 |
| `studioAddress`        | Full address (shown on invoices)              |
| `studioTimezone`       | IANA timezone (e.g. "Europe/London")          |
| `currency`             | ISO 4217 code (e.g. "GBP", "USD")             |
| `cancellationPolicyText` | Displayed to customers at booking confirmation |
| `googleReviewUrl`      | Google Business review link                   |
| `bookingPageUrl`       | Public booking page URL                       |

Financial fields (`depositPercentage`, `cancellationFeePercent`, etc.) are **not** exposed
on the public endpoint — they are only returned in the ADMIN PATCH response.

**Caching:**
- Redis key `settings:public`, TTL = 300 s (5 minutes)
- Cache is invalidated immediately on every successful PATCH
- Redis failures are **non-fatal** — service falls through to DB on read failure,
  and logs-but-continues on write/delete failure

**Business rules:**
- `studioName` is required when creating the settings row for the first time
  (fresh deployment before seed has run)
- All other fields are optional on update

**No schema migration required** — the `StudioSettings` model and all its fields
already exist from Step 1.2 and were seeded in Step 1.16.

---

## ALL 7 FILES MUST BE DOWNLOADED

| # | File | New / Modified |
|---|------|----------------|
| 1 | `backend/src/modules/settings/settings.schema.ts`       | NEW |
| 2 | `backend/src/modules/settings/settings.service.ts`      | NEW |
| 3 | `backend/src/modules/settings/settings.controller.ts`   | NEW |
| 4 | `backend/src/modules/settings/settings.routes.ts`       | NEW |
| 5 | `backend/src/modules/settings/settings.service.test.ts` | NEW |
| 6 | `backend/src/modules/settings/settings.test.ts`         | NEW |
| 7 | `backend/src/app.ts`                                    | MODIFIED |

---

## STEP 1 — Delete stale copies of all files

```bash
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.test.ts && \
rm -f ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 2 — Create required directory

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/settings
```

---

## STEP 3 — Download all 7 files

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.schema.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.controller.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.controller.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.routes.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 4 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 40 passed, 40 total
Tests:       972 passed, 972 total
```

> **All tests must pass with 0 failures.**
> Tests mock all database and Redis calls — no live Postgres or Redis required.

---

