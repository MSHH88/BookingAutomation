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

**Bugs fixed in this audit:**

| ID | File | Bug | Fix |
|----|------|-----|-----|
| BUG-A | `backend/package.json` | `react` + `react-dom` missing from devDependencies — caused all 16 integration test suites to fail at import time with "Cannot find module 'react-dom/server'" | Added `react@^18.3.1` + `react-dom@^18.3.1` as devDependencies |
| BUG-B | `backend/package-lock.json` | `axios <1.15.0` critical SSRF vulnerability + `lodash <=4.17.23` high prototype pollution vulnerability in transitive deps | Fixed via `npm audit fix` — lock file updated to safe versions |

**Test count:** 45 suites, 1039/1039 tests, 0 TS errors.

---

## ALL 26 FILES MUST BE DOWNLOADED

### New files (created in Phase 0)

| # | File |
|---|------|
| 1  | `backend/src/middleware/requireLeadAccess.ts`        |
| 2  | `backend/src/middleware/requireLeadAccess.test.ts`   |
| 3  | `backend/src/modules/roles/roles.controller.ts`      |
| 4  | `backend/src/modules/roles/roles.routes.ts`          |
| 5  | `backend/src/modules/roles/roles.schema.ts`          |
| 6  | `backend/src/modules/roles/roles.service.test.ts`    |
| 7  | `backend/src/modules/roles/roles.service.ts`         |
| 8  | `backend/src/modules/roles/roles.test.ts`            |
| 9  | `backend/src/modules/tenants/tenants.controller.ts`  |
| 10 | `backend/src/modules/tenants/tenants.routes.ts`      |
| 11 | `backend/src/modules/tenants/tenants.schema.ts`      |
| 12 | `backend/src/modules/tenants/tenants.service.test.ts`|
| 13 | `backend/src/modules/tenants/tenants.service.ts`     |
| 14 | `backend/src/modules/tenants/tenants.test.ts`        |

### Modified files (replace existing files)

| #  | File |
|----|------|
| 15 | `backend/prisma/schema.prisma`                       |
| 16 | `backend/src/app.ts`                                 |
| 17 | `backend/src/middleware/auth.ts`                     |
| 18 | `backend/src/middleware/auth.test.ts`                |
| 19 | `backend/src/middleware/requireRole.ts`              |
| 20 | `backend/src/modules/admin/admin.routes.ts`          |
| 21 | `backend/src/modules/admin/admin.schema.ts`          |
| 22 | `backend/src/modules/auth/auth.service.ts`           |
| 23 | `backend/src/modules/leads/leads.routes.ts`          |
| 24 | `backend/src/modules/leads/leads.test.ts`            |
| 25 | `backend/src/types/express.d.ts`                     |
| 26 | `backend/package.json`                               |

---

## STEP 1 — Delete all stale files

Paste this entire block at once. It uses a single `rm -f` so there are no inline comments to break zsh:

```bash
cd ~/Desktop/Automation && rm -f \
  backend/src/middleware/requireLeadAccess.ts \
  backend/src/middleware/requireLeadAccess.test.ts \
  backend/src/modules/roles/roles.controller.ts \
  backend/src/modules/roles/roles.routes.ts \
  backend/src/modules/roles/roles.schema.ts \
  backend/src/modules/roles/roles.service.test.ts \
  backend/src/modules/roles/roles.service.ts \
  backend/src/modules/roles/roles.test.ts \
  backend/src/modules/tenants/tenants.controller.ts \
  backend/src/modules/tenants/tenants.routes.ts \
  backend/src/modules/tenants/tenants.schema.ts \
  backend/src/modules/tenants/tenants.service.test.ts \
  backend/src/modules/tenants/tenants.service.ts \
  backend/src/modules/tenants/tenants.test.ts \
  backend/prisma/schema.prisma \
  backend/src/app.ts \
  backend/src/middleware/auth.ts \
  backend/src/middleware/auth.test.ts \
  backend/src/middleware/requireRole.ts \
  backend/src/modules/admin/admin.routes.ts \
  backend/src/modules/admin/admin.schema.ts \
  backend/src/modules/auth/auth.service.ts \
  backend/src/modules/leads/leads.routes.ts \
  backend/src/modules/leads/leads.test.ts \
  backend/src/types/express.d.ts \
  backend/package.json && echo "ALL OLD FILES DELETED"
```

---

## STEP 2 — Create required directories

```bash
mkdir -p ~/Desktop/Automation/backend/src/middleware
mkdir -p ~/Desktop/Automation/backend/src/modules/roles
mkdir -p ~/Desktop/Automation/backend/src/modules/tenants
mkdir -p ~/Desktop/Automation/backend/src/types
```

---

## STEP 3 — Download all 26 files

Each `curl` line is independent — paste them all at once. You will see `OK N/26 filename` for each success or `FAILED: filename` if one failed.

```bash
cd ~/Desktop/Automation/backend
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan"
curl -sfL -o src/middleware/requireLeadAccess.ts          "${BASE}/backend/src/middleware/requireLeadAccess.ts"          && echo "OK  1/26 requireLeadAccess.ts"          || echo "FAILED: requireLeadAccess.ts"
curl -sfL -o src/middleware/requireLeadAccess.test.ts     "${BASE}/backend/src/middleware/requireLeadAccess.test.ts"     && echo "OK  2/26 requireLeadAccess.test.ts"     || echo "FAILED: requireLeadAccess.test.ts"
curl -sfL -o src/modules/roles/roles.controller.ts        "${BASE}/backend/src/modules/roles/roles.controller.ts"        && echo "OK  3/26 roles.controller.ts"            || echo "FAILED: roles.controller.ts"
curl -sfL -o src/modules/roles/roles.routes.ts            "${BASE}/backend/src/modules/roles/roles.routes.ts"            && echo "OK  4/26 roles.routes.ts"               || echo "FAILED: roles.routes.ts"
curl -sfL -o src/modules/roles/roles.schema.ts            "${BASE}/backend/src/modules/roles/roles.schema.ts"            && echo "OK  5/26 roles.schema.ts"               || echo "FAILED: roles.schema.ts"
curl -sfL -o src/modules/roles/roles.service.test.ts      "${BASE}/backend/src/modules/roles/roles.service.test.ts"      && echo "OK  6/26 roles.service.test.ts"          || echo "FAILED: roles.service.test.ts"
curl -sfL -o src/modules/roles/roles.service.ts           "${BASE}/backend/src/modules/roles/roles.service.ts"           && echo "OK  7/26 roles.service.ts"              || echo "FAILED: roles.service.ts"
curl -sfL -o src/modules/roles/roles.test.ts              "${BASE}/backend/src/modules/roles/roles.test.ts"              && echo "OK  8/26 roles.test.ts"                 || echo "FAILED: roles.test.ts"
curl -sfL -o src/modules/tenants/tenants.controller.ts    "${BASE}/backend/src/modules/tenants/tenants.controller.ts"    && echo "OK  9/26 tenants.controller.ts"          || echo "FAILED: tenants.controller.ts"
curl -sfL -o src/modules/tenants/tenants.routes.ts        "${BASE}/backend/src/modules/tenants/tenants.routes.ts"        && echo "OK 10/26 tenants.routes.ts"             || echo "FAILED: tenants.routes.ts"
curl -sfL -o src/modules/tenants/tenants.schema.ts        "${BASE}/backend/src/modules/tenants/tenants.schema.ts"        && echo "OK 11/26 tenants.schema.ts"             || echo "FAILED: tenants.schema.ts"
curl -sfL -o src/modules/tenants/tenants.service.test.ts  "${BASE}/backend/src/modules/tenants/tenants.service.test.ts"  && echo "OK 12/26 tenants.service.test.ts"        || echo "FAILED: tenants.service.test.ts"
curl -sfL -o src/modules/tenants/tenants.service.ts       "${BASE}/backend/src/modules/tenants/tenants.service.ts"       && echo "OK 13/26 tenants.service.ts"            || echo "FAILED: tenants.service.ts"
curl -sfL -o src/modules/tenants/tenants.test.ts          "${BASE}/backend/src/modules/tenants/tenants.test.ts"          && echo "OK 14/26 tenants.test.ts"               || echo "FAILED: tenants.test.ts"
curl -sfL -o prisma/schema.prisma                         "${BASE}/backend/prisma/schema.prisma"                         && echo "OK 15/26 schema.prisma"                 || echo "FAILED: schema.prisma"
curl -sfL -o src/app.ts                                   "${BASE}/backend/src/app.ts"                                   && echo "OK 16/26 app.ts"                        || echo "FAILED: app.ts"
curl -sfL -o src/middleware/auth.ts                       "${BASE}/backend/src/middleware/auth.ts"                       && echo "OK 17/26 auth.ts"                       || echo "FAILED: auth.ts"
curl -sfL -o src/middleware/auth.test.ts                  "${BASE}/backend/src/middleware/auth.test.ts"                  && echo "OK 18/26 auth.test.ts"                  || echo "FAILED: auth.test.ts"
curl -sfL -o src/middleware/requireRole.ts                "${BASE}/backend/src/middleware/requireRole.ts"                && echo "OK 19/26 requireRole.ts"                || echo "FAILED: requireRole.ts"
curl -sfL -o src/modules/admin/admin.routes.ts            "${BASE}/backend/src/modules/admin/admin.routes.ts"            && echo "OK 20/26 admin.routes.ts"               || echo "FAILED: admin.routes.ts"
curl -sfL -o src/modules/admin/admin.schema.ts            "${BASE}/backend/src/modules/admin/admin.schema.ts"            && echo "OK 21/26 admin.schema.ts"               || echo "FAILED: admin.schema.ts"
curl -sfL -o src/modules/auth/auth.service.ts             "${BASE}/backend/src/modules/auth/auth.service.ts"             && echo "OK 22/26 auth.service.ts"               || echo "FAILED: auth.service.ts"
curl -sfL -o src/modules/leads/leads.routes.ts            "${BASE}/backend/src/modules/leads/leads.routes.ts"            && echo "OK 23/26 leads.routes.ts"               || echo "FAILED: leads.routes.ts"
curl -sfL -o src/modules/leads/leads.test.ts              "${BASE}/backend/src/modules/leads/leads.test.ts"              && echo "OK 24/26 leads.test.ts"                 || echo "FAILED: leads.test.ts"
curl -sfL -o src/types/express.d.ts                       "${BASE}/backend/src/types/express.d.ts"                       && echo "OK 25/26 express.d.ts"                  || echo "FAILED: express.d.ts"
curl -sfL -o package.json                                 "${BASE}/backend/package.json"                                 && echo "OK 26/26 package.json"                  || echo "FAILED: package.json"
```

> **All 26 lines must print `OK` — if any print `FAILED`, re-run that line before continuing.**

---

## STEP 4 — Install dependencies and fix vulnerabilities

```bash
cd ~/Desktop/Automation/backend && npm install --legacy-peer-deps && npm audit fix
```

Expected output ends with: `found 0 vulnerabilities`

---

## STEP 5 — Generate Prisma client and run migration

```bash
cd ~/Desktop/Automation/backend && npx prisma generate
```

Then apply the schema changes to your database:

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
