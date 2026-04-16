# Step-By-Step Guide — Full Backend Sync

> **Branch:** `copilot/create-detailed-automation-plan`
> **Owner/Repo:** `MSHH88/BookingAutomation`
> **Total files to download:** **372** (split into 2 parts)
> **Files preserved (NOT touched):** `.env` and any local secrets/passwords

---

## Current npm test failures — What happened / What to do next

### What happened

The previous version of this guide only downloaded **29 files** (the BUG 1–13
fixes). But those 29 files depend on **114+ other files** that were also changed
in earlier phases (AUDIT-013 through AUDIT-026, FINDING-011 through FINDING-020,
Phase 9 features). Your local copy still had **old versions** of those
dependency files, causing cascading TypeScript compile errors that made **49 out
of 102 test suites fail**.

The terminal output you pasted was **partial samples** — only a few
representative error blocks. The actual run had:

```
Test Suites: 49 failed, 53 passed, 102 total
Tests:       1058 passed, 1058 total
Snapshots:   0 total
Time:        297.5 s
Ran all test suites.
```

### Root cause: stale local files (NOT a repo code defect)

The repo at HEAD has **zero TypeScript errors** (`npx tsc --noEmit` passes
clean). The errors you saw come from old file versions on your machine:

| Error you saw | Old file | What changed |
|---|---|---|
| `MANNEQUIN_ENABLED` not in `FeatureFlagDefaults` | `leads.schema.ts` | AUDIT-013 removed 14 orphan flags; schema rewritten to use `activeBusinessType` |
| `isFeatureEnabled` not exported from `requireFeature` | `requireFeature.ts` | FINDING-011 rewrote feature flag middleware with `isFeatureEnabled` export |
| `tenantId` not in `EnqueueReminderParams` | `reminders.queue.ts` | AUDIT-014 added tenantId to reminder params |
| `FeatureFlagWhereUniqueInput` compound key mismatch | `admin.service.ts` | FINDING-011 changed FeatureFlag to compound unique `@@unique([key, tenantId])` |
| `enabled` implicitly has `any` type | `bookings.service.ts` | Multiple AUDIT fixes added typed feature flag checks |

### What to do now

1. **Follow this updated guide** — it downloads ALL 372 backend files (everything except `.env`)
2. Run `npm install` then `npx prisma generate` then `npx prisma migrate dev`
3. Run `npm test`
4. You should see: **102 suites passed, 1821 tests passed**

### Error samples from the failed run (verbatim)

```
 FAIL  src/modules/alerts/alerts.test.ts
  ● Test suite failed to run

    src/modules/leads/leads.schema.ts:46:29 - error TS7053: Element implicitly has an 'any' type because expression of type '"MANNEQUIN_ENABLED"' can't be used to index type 'FeatureFlagDefaults'.
      Property 'MANNEQUIN_ENABLED' does not exist on type 'FeatureFlagDefaults'.

    46   const placementRequired = flags['MANNEQUIN_ENABLED'] === true;
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/modules/bookings/bookings.service.test.ts
  ● Test suite failed to run

    src/modules/bookings/bookings.service.ts:52:10 - error TS2305: Module '"../../middleware/requireFeature"' has no exported member 'isFeatureEnabled'.

    52 import { isFeatureEnabled } from '../../middleware/requireFeature';
                ~~~~~~~~~~~~~~~~
    src/modules/bookings/bookings.service.ts:349:5 - error TS2353: Object literal may only specify known properties, and 'tenantId' does not exist in type 'EnqueueReminderParams'.

    349     tenantId:       booking.tenantId,
            ~~~~~~~~
    src/modules/bookings/bookings.service.ts:393:53 - error TS7006: Parameter 'enabled' implicitly has an 'any' type.

 FAIL  src/modules/admin/admin.service.test.ts
  ● Test suite failed to run

    src/modules/admin/admin.service.ts:188:54 - error TS2322: Type '{ key: string; }' is not assignable to type 'FeatureFlagWhereUniqueInput'.

 FAIL  src/modules/leads/leads.service.test.ts
  ● Test suite failed to run

    src/modules/leads/leads.schema.ts:46:29 - error TS7053: Element implicitly has an 'any' type because expression of type '"MANNEQUIN_ENABLED"' can't be used to index type 'FeatureFlagDefaults'.

 FAIL  src/modules/auth/auth.test.ts
  ● Test suite failed to run

    src/modules/leads/leads.schema.ts:46:29 - error TS7053: ...same MANNEQUIN_ENABLED error...

 FAIL  src/modules/sessions/sessions.test.ts
  ● Test suite failed to run

    src/modules/leads/leads.schema.ts:46:29 - error TS7053: ...same MANNEQUIN_ENABLED error...

 FAIL  src/modules/artists/artists.test.ts
  ● Test suite failed to run

    src/modules/leads/leads.schema.ts:46:29 - error TS7053: ...same MANNEQUIN_ENABLED error...
```

---

## Prisma `migrate dev` errors P3006 / P1014 — What happened + Fix

### Terminal output — first error (verbatim)

```text
rm -rf node_modules
npm install
npx prisma generate
npx prisma migrate dev
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated scmp@2.1.0: Just use Node.js's crypto.timingSafeEqual()
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me

added 674 packages, and audited 675 packages in 5s

121 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in 303ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints

Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "automation_dev", schema "public" at "localhost:5433"

Error: P3006

Migration `20260416100129_y` failed to apply cleanly to the shadow database. 
Error:
ERROR: index "feature_flags_key_key" does not exist
   0: sql_schema_connector::validate_migrations
           with namespaces=None
             at schema-engine/connectors/sql-schema-connector/src/lib.rs:335
   1: schema_core::state::DevDiagnostic
             at schema-engine/core/src/state.rs:276

neilapacesaite@Neilas-MacBook-Pro backend % cd ~/Desktop/Automation
docker compose up -d
[+] up 2/2
 ✔ Container bookingautomation_postgres Running                             0.0s
 ✔ Container bookingautomation_redis    Running                             0.0s
```

### Terminal output — error persisted after full reset + stale migration removal (verbatim)

```text
cd ~/Desktop/Automation
docker compose down -v
docker compose up -d
cd backend
rm -rf prisma/migrations/20260416100129_REdev   # remove stale local migration
npx prisma migrate dev

Error: P3006

Migration `20260414000001_remove_gift_voucher_enabled` failed to apply cleanly to the shadow database. 
Error code: P1014
Error:
The underlying table for model `feature_flags` does not exist.
```

```text
% cd ~/Desktop/Automation
docker compose down -v
docker compose up -d
cd backend
rm -rf prisma/migrations/20260416100129_REdev   # remove stale local migration
npx prisma migrate dev
[+] down 5/5
 ✔ Container bookingautomation_redis    Removed                                               0.3s
 ✔ Container bookingautomation_postgres Removed                                               0.3s
 ! Network automation_bookingautomation Resource is still in use                              0.0s
 ✔ Volume automation_postgres_data      Removed                                               0.0s
 ✔ Volume automation_redis_data         Removed                                               0.0s
[+] up 4/4
 ✔ Volume automation_redis_data         Created                                               0.0s
 ✔ Volume automation_postgres_data      Created                                               0.0s
 ✔ Container bookingautomation_postgres Started                                               0.2s
 ✔ Container bookingautomation_redis    Started                                               0.2s
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "automation_dev", schema "public" at "localhost:5433"

Error: P3006

Migration `20260414000001_remove_gift_voucher_enabled` failed to apply cleanly to the shadow database. 
Error code: P1014
Error:
The underlying table for model `feature_flags` does not exist.
```

### What do P3006 and P1014 mean?

**P3006** means a migration failed to apply cleanly on Prisma's **shadow database**. When you run `npx prisma migrate dev`, Prisma creates a temporary empty shadow database, replays ALL migrations in order against it, and compares the result to your `schema.prisma`. If any migration fails during this replay, you get P3006.

**P1014** means Prisma tried to operate on a table that does not exist.

### Root cause (confirmed by code investigation)

The repo previously had **three incremental migrations** that assumed the database tables already existed:

1. `20260414000001_remove_gift_voucher_enabled` — runs `DELETE FROM feature_flags WHERE key = 'GIFT_VOUCHER_ENABLED'`
2. `20260414000002_feature_flag_per_tenant_unique` — runs `ALTER TABLE "feature_flags" DROP CONSTRAINT ...`
3. `20260415000001_email_template_tenant_key_unique` — runs `ALTER TABLE "email_templates" DROP CONSTRAINT ...`

**But there was no initial migration that creates the tables.** The schema was likely managed with `prisma db push` before migrations were introduced. When Prisma replays migrations on an empty shadow database, the very first migration (`DELETE FROM feature_flags`) fails because **the `feature_flags` table does not exist yet** — nothing created it.

Removing stale local migrations (like `20260416100129_y` or `20260416100129_REdev`) only helps with locally-generated files. It does **not** fix the fundamental problem: the committed migrations are incomplete (no `CREATE TABLE`).

**This has been fixed.** The three incremental migrations have been replaced with a single baseline migration `20260413000000_init` that creates the entire database schema (all tables, enums, indexes, and foreign keys) in one step. After downloading the latest files from this guide, `npx prisma migrate dev` will work.

### What to do now (exact commands)

**Prerequisite:** Docker must be running with Postgres on **localhost:5433**. Your `.env` must contain `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/automation_dev?schema=public"` (or equivalent).

**Step 1:** Reset your Docker database (fresh start):

```bash
cd ~/Desktop/Automation
docker compose down -v
docker compose up -d
```

> `docker compose down -v` deletes the Postgres volume, wiping all local dev data. A fresh empty database will be created.

**Step 2:** Remove ALL old migration folders and download the new ones by following Steps 1–5 of this guide below.

**Step 3:** After downloading all files, verify your migrations folder:

```bash
cd ~/Desktop/Automation/backend
ls prisma/migrations/
```

You should see **exactly**:

```
20260413000000_init/
migration_lock.toml
```

If you see any other folders (like `20260416100129_y`, `20260416100129_REdev`, `20260414000001_*`, etc.), delete them:

```bash
cd ~/Desktop/Automation/backend
find prisma/migrations -mindepth 1 -maxdepth 1 -type d ! -name '20260413000000_init' -exec rm -rf {} +
```

**Step 4:** Run migrations:

```bash
cd ~/Desktop/Automation/backend
rm -rf node_modules
npm install
npx prisma generate
npx prisma migrate dev
```

**Expected output** (success looks like this):

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "automation_dev", schema "public" at "localhost:5433"

Applying migration `20260413000000_init`

The following migration(s) have been applied:
  ...
Your database is now in sync with your schema.
```

### Decision tree — If you still get Prisma errors

| Error | Cause | Fix |
|---|---|---|
| P3006 + `index "..." does not exist` | Stale local migration folder referencing an index that doesn't exist | Delete any migration folders NOT in the repo (keep only `20260413000000_init`), then `docker compose down -v`, `docker compose up -d`, `npx prisma migrate dev` |
| P3006 + P1014 `table does not exist` | Missing initial `CREATE TABLE` migration | You have old migration files. Re-download using Steps 1–5 of this guide. The new `20260413000000_init` migration creates all tables. |
| P3005 `migration not found in migration directory` | Your local `_prisma_migrations` table references a migration folder that no longer exists | Run `docker compose down -v` then `docker compose up -d` to reset, then `npx prisma migrate dev` |
| `Could not connect to database` | Docker Postgres not running or wrong port | Run `docker compose up -d` and verify `.env` uses `localhost:5433` |

> **Important:** Removing a stale migration folder only helps if the folder was locally created and is NOT in git. It will **not** fix broken committed migrations. If the committed migrations themselves are wrong, you need the updated migration files from the repository.

---

## ⚠️ IMPORTANT — How to copy commands from this guide

> **DO NOT copy from GitHub's rendered HTML page.** GitHub renders `&&` as
> `&amp;&amp;` in the raw HTML, and pasting that into your terminal gives you the
> `cmdand cmdor dquote>` error you saw.
>
> **Instead:** Click the **Raw** button at the top-right of this file on GitHub,
> then copy from the raw text view. Or use the copy button on each code block.
>
> **All commands below avoid `&&` and `||` entirely** so they are safe to paste
> even from the rendered page.

---

## ⚠️ Files that are PRESERVED (not deleted, not downloaded)

The following files are **never touched** by this guide:

- `.env` — your database URL, API keys, passwords, ports, etc.
- `.env.local` — if you have one
- `node_modules/` — will be reinstalled in Step 5
- `package-lock.json` — will be regenerated by npm install

**You will NOT need to re-enter any passwords, ports, or API keys.**

---

## Step 1 — Delete old files (Part 1 of 2: files 1–187)

Run from `~/Desktop/Automation/backend`:

```bash
cd ~/Desktop/Automation/backend
rm -f ".dockerignore"
rm -f ".env.example"
rm -f ".gitignore"
rm -f "Dockerfile"
rm -f "jest.setup.ts"
rm -f "package.json"
rm -f "prisma/migrations/20260413000000_init/migration.sql"
rm -f "prisma/migrations/migration_lock.toml"
rm -f "prisma/schema.prisma"
rm -f "src/app.ts"
rm -f "src/config/businessType.test.ts"
rm -f "src/config/businessType.ts"
rm -f "src/config/index.ts"
rm -f "src/errors/AppError.ts"
rm -f "src/index.ts"
rm -f "src/jobs/ai-suggestion.job.test.ts"
rm -f "src/jobs/ai-suggestion.job.ts"
rm -f "src/jobs/birthday.job.test.ts"
rm -f "src/jobs/birthday.job.ts"
rm -f "src/jobs/campaign.job.ts"
rm -f "src/jobs/index.ts"
rm -f "src/jobs/invoice-overdue.job.ts"
rm -f "src/jobs/no-show.job.test.ts"
rm -f "src/jobs/no-show.job.ts"
rm -f "src/jobs/rebook-nudge.job.test.ts"
rm -f "src/jobs/rebook-nudge.job.ts"
rm -f "src/jobs/recurring-booking.job.ts"
rm -f "src/jobs/waitlist-match.job.ts"
rm -f "src/lib/apple-calendar.ts"
rm -f "src/lib/cloudinary.ts"
rm -f "src/lib/google-calendar.ts"
rm -f "src/lib/notification-dispatcher.ts"
rm -f "src/lib/openai.ts"
rm -f "src/lib/outlook-calendar.ts"
rm -f "src/lib/pricing-engine.test.ts"
rm -f "src/lib/pricing-engine.ts"
rm -f "src/lib/prisma.ts"
rm -f "src/lib/push-notifications.ts"
rm -f "src/lib/redis.ts"
rm -f "src/lib/resend.ts"
rm -f "src/lib/stripe.ts"
rm -f "src/lib/template-renderer.ts"
rm -f "src/lib/twilio-sms.ts"
rm -f "src/lib/twilio.ts"
rm -f "src/middleware/auth.test.ts"
rm -f "src/middleware/auth.ts"
rm -f "src/middleware/captcha.ts"
rm -f "src/middleware/errorHandler.ts"
rm -f "src/middleware/requestLogger.ts"
rm -f "src/middleware/requireFeature.ts"
rm -f "src/middleware/requireLeadAccess.test.ts"
rm -f "src/middleware/requireLeadAccess.ts"
rm -f "src/middleware/requireRole.ts"
rm -f "src/middleware/upload.ts"
rm -f "src/middleware/validate.ts"
rm -f "src/modules/admin/admin.controller.ts"
rm -f "src/modules/admin/admin.routes.ts"
rm -f "src/modules/admin/admin.schema.ts"
rm -f "src/modules/admin/admin.service.test.ts"
rm -f "src/modules/admin/admin.service.ts"
rm -f "src/modules/ai/ai.controller.ts"
rm -f "src/modules/ai/ai.routes.ts"
rm -f "src/modules/ai/ai.schema.ts"
rm -f "src/modules/ai/ai.service.test.ts"
rm -f "src/modules/ai/ai.service.ts"
rm -f "src/modules/alerts/alerts.controller.ts"
rm -f "src/modules/alerts/alerts.routes.ts"
rm -f "src/modules/alerts/alerts.schema.ts"
rm -f "src/modules/alerts/alerts.service.test.ts"
rm -f "src/modules/alerts/alerts.service.ts"
rm -f "src/modules/alerts/alerts.test.ts"
rm -f "src/modules/analytics/analytics.controller.ts"
rm -f "src/modules/analytics/analytics.routes.ts"
rm -f "src/modules/analytics/analytics.schema.ts"
rm -f "src/modules/analytics/analytics.service.test.ts"
rm -f "src/modules/analytics/analytics.service.ts"
rm -f "src/modules/analytics/analytics.test.ts"
rm -f "src/modules/artists/artist-media.controller.ts"
rm -f "src/modules/artists/artist-media.service.test.ts"
rm -f "src/modules/artists/artist-media.service.ts"
rm -f "src/modules/artists/artists.controller.ts"
rm -f "src/modules/artists/artists.routes.ts"
rm -f "src/modules/artists/artists.schema.ts"
rm -f "src/modules/artists/artists.service.ts"
rm -f "src/modules/artists/artists.test.ts"
rm -f "src/modules/auth/auth.controller.ts"
rm -f "src/modules/auth/auth.email.processor.ts"
rm -f "src/modules/auth/auth.email.queue.ts"
rm -f "src/modules/auth/auth.routes.ts"
rm -f "src/modules/auth/auth.schema.ts"
rm -f "src/modules/auth/auth.service.test.ts"
rm -f "src/modules/auth/auth.service.ts"
rm -f "src/modules/auth/auth.test.ts"
rm -f "src/modules/availability/availability.controller.ts"
rm -f "src/modules/availability/availability.routes.ts"
rm -f "src/modules/availability/availability.schema.ts"
rm -f "src/modules/availability/availability.service.test.ts"
rm -f "src/modules/availability/availability.service.ts"
rm -f "src/modules/availability/availability.test.ts"
rm -f "src/modules/booking-photos/booking-photos.controller.ts"
rm -f "src/modules/booking-photos/booking-photos.routes.ts"
rm -f "src/modules/booking-photos/booking-photos.schema.ts"
rm -f "src/modules/booking-photos/booking-photos.service.test.ts"
rm -f "src/modules/booking-photos/booking-photos.service.ts"
rm -f "src/modules/booking-photos/booking-photos.test.ts"
rm -f "src/modules/bookings/bookings.controller.ts"
rm -f "src/modules/bookings/bookings.routes.ts"
rm -f "src/modules/bookings/bookings.schema.ts"
rm -f "src/modules/bookings/bookings.service.test.ts"
rm -f "src/modules/bookings/bookings.service.ts"
rm -f "src/modules/bookings/bookings.test.ts"
rm -f "src/modules/calendar/apple-calendar.controller.ts"
rm -f "src/modules/calendar/apple-calendar.service.test.ts"
rm -f "src/modules/calendar/apple-calendar.service.ts"
rm -f "src/modules/calendar/calendar.controller.ts"
rm -f "src/modules/calendar/calendar.routes.ts"
rm -f "src/modules/calendar/calendar.schema.ts"
rm -f "src/modules/calendar/calendar.service.test.ts"
rm -f "src/modules/calendar/calendar.service.ts"
rm -f "src/modules/calendar/calendar.test.ts"
rm -f "src/modules/calendar/outlook-calendar.controller.ts"
rm -f "src/modules/calendar/outlook-calendar.service.test.ts"
rm -f "src/modules/calendar/outlook-calendar.service.ts"
rm -f "src/modules/campaigns/campaigns.controller.ts"
rm -f "src/modules/campaigns/campaigns.routes.ts"
rm -f "src/modules/campaigns/campaigns.schema.ts"
rm -f "src/modules/campaigns/campaigns.service.test.ts"
rm -f "src/modules/campaigns/campaigns.service.ts"
rm -f "src/modules/campaigns/campaigns.test.ts"
rm -f "src/modules/capture/capture.controller.ts"
rm -f "src/modules/capture/capture.routes.ts"
rm -f "src/modules/capture/capture.schema.ts"
rm -f "src/modules/capture/capture.service.test.ts"
rm -f "src/modules/capture/capture.service.ts"
rm -f "src/modules/customer-stats/customer-stats.controller.ts"
rm -f "src/modules/customer-stats/customer-stats.routes.ts"
rm -f "src/modules/customer-stats/customer-stats.schema.ts"
rm -f "src/modules/customer-stats/customer-stats.service.test.ts"
rm -f "src/modules/customer-stats/customer-stats.service.ts"
rm -f "src/modules/customer-stats/customer-stats.test.ts"
rm -f "src/modules/customers/customers.controller.ts"
rm -f "src/modules/customers/customers.routes.ts"
rm -f "src/modules/customers/customers.schema.ts"
rm -f "src/modules/customers/customers.service.test.ts"
rm -f "src/modules/customers/customers.service.ts"
rm -f "src/modules/email-templates/email-templates.controller.ts"
rm -f "src/modules/email-templates/email-templates.routes.ts"
rm -f "src/modules/email-templates/email-templates.schema.ts"
rm -f "src/modules/email-templates/email-templates.service.test.ts"
rm -f "src/modules/email-templates/email-templates.service.ts"
rm -f "src/modules/email-templates/email-templates.test.ts"
rm -f "src/modules/features/features.test.ts"
rm -f "src/modules/forms/forms.controller.ts"
rm -f "src/modules/forms/forms.routes.ts"
rm -f "src/modules/forms/forms.schema.ts"
rm -f "src/modules/forms/forms.service.test.ts"
rm -f "src/modules/forms/forms.service.ts"
rm -f "src/modules/forms/forms.test.ts"
rm -f "src/modules/gift-cards/gift-cards.controller.ts"
rm -f "src/modules/gift-cards/gift-cards.routes.ts"
rm -f "src/modules/gift-cards/gift-cards.schema.ts"
rm -f "src/modules/gift-cards/gift-cards.service.test.ts"
rm -f "src/modules/gift-cards/gift-cards.service.ts"
rm -f "src/modules/gift-cards/gift-cards.test.ts"
rm -f "src/modules/health-flags/health-flags.controller.ts"
rm -f "src/modules/health-flags/health-flags.routes.ts"
rm -f "src/modules/health-flags/health-flags.schema.ts"
rm -f "src/modules/health-flags/health-flags.service.test.ts"
rm -f "src/modules/health-flags/health-flags.service.ts"
rm -f "src/modules/health-flags/health-flags.test.ts"
rm -f "src/modules/invoices/invoices.controller.ts"
rm -f "src/modules/invoices/invoices.routes.ts"
rm -f "src/modules/invoices/invoices.schema.ts"
rm -f "src/modules/invoices/invoices.service.test.ts"
rm -f "src/modules/invoices/invoices.service.ts"
rm -f "src/modules/invoices/invoices.test.ts"
rm -f "src/modules/leads/leads.controller.ts"
rm -f "src/modules/leads/leads.routes.ts"
rm -f "src/modules/leads/leads.schema.ts"
rm -f "src/modules/leads/leads.service.test.ts"
rm -f "src/modules/leads/leads.service.ts"
rm -f "src/modules/leads/leads.test.ts"
rm -f "src/modules/locations/locations.controller.ts"
rm -f "src/modules/locations/locations.routes.ts"
rm -f "src/modules/locations/locations.schema.ts"
rm -f "src/modules/locations/locations.service.ts"
echo "Part 1 delete done (187 files)"
```

---

## Step 2 — Delete old files (Part 2 of 2: files 188–372)

```bash
cd ~/Desktop/Automation/backend
rm -f "src/modules/locations/locations.test.ts"
rm -f "src/modules/loyalty/loyalty.controller.ts"
rm -f "src/modules/loyalty/loyalty.routes.ts"
rm -f "src/modules/loyalty/loyalty.schema.ts"
rm -f "src/modules/loyalty/loyalty.service.test.ts"
rm -f "src/modules/loyalty/loyalty.service.ts"
rm -f "src/modules/loyalty/loyalty.test.ts"
rm -f "src/modules/memberships/memberships.controller.ts"
rm -f "src/modules/memberships/memberships.routes.ts"
rm -f "src/modules/memberships/memberships.schema.ts"
rm -f "src/modules/memberships/memberships.service.test.ts"
rm -f "src/modules/memberships/memberships.service.ts"
rm -f "src/modules/memberships/memberships.test.ts"
rm -f "src/modules/messages/messages.routes.ts"
rm -f "src/modules/notifications/notifications.controller.ts"
rm -f "src/modules/notifications/notifications.routes.ts"
rm -f "src/modules/notifications/notifications.schema.ts"
rm -f "src/modules/notifications/notifications.service.test.ts"
rm -f "src/modules/notifications/notifications.service.ts"
rm -f "src/modules/packages/packages.controller.ts"
rm -f "src/modules/packages/packages.routes.ts"
rm -f "src/modules/packages/packages.schema.ts"
rm -f "src/modules/packages/packages.service.test.ts"
rm -f "src/modules/packages/packages.service.ts"
rm -f "src/modules/packages/packages.test.ts"
rm -f "src/modules/payments/payments.controller.ts"
rm -f "src/modules/payments/payments.routes.ts"
rm -f "src/modules/payments/payments.schema.ts"
rm -f "src/modules/payments/payments.service.test.ts"
rm -f "src/modules/payments/payments.service.ts"
rm -f "src/modules/payments/payments.test.ts"
rm -f "src/modules/payroll/payroll.controller.ts"
rm -f "src/modules/payroll/payroll.routes.ts"
rm -f "src/modules/payroll/payroll.schema.ts"
rm -f "src/modules/payroll/payroll.service.test.ts"
rm -f "src/modules/payroll/payroll.service.ts"
rm -f "src/modules/payroll/payroll.test.ts"
rm -f "src/modules/pos/pos.controller.ts"
rm -f "src/modules/pos/pos.routes.ts"
rm -f "src/modules/pos/pos.schema.ts"
rm -f "src/modules/pos/pos.service.test.ts"
rm -f "src/modules/pos/pos.service.ts"
rm -f "src/modules/pos/pos.test.ts"
rm -f "src/modules/pricing/pricing.controller.ts"
rm -f "src/modules/pricing/pricing.routes.ts"
rm -f "src/modules/pricing/pricing.schema.ts"
rm -f "src/modules/pricing/pricing.service.ts"
rm -f "src/modules/pricing/pricing.test.ts"
rm -f "src/modules/products/products.controller.ts"
rm -f "src/modules/products/products.routes.ts"
rm -f "src/modules/products/products.schema.ts"
rm -f "src/modules/products/products.service.test.ts"
rm -f "src/modules/products/products.service.ts"
rm -f "src/modules/products/products.test.ts"
rm -f "src/modules/public/public.controller.ts"
rm -f "src/modules/public/public.routes.ts"
rm -f "src/modules/public/public.schema.ts"
rm -f "src/modules/public/public.service.test.ts"
rm -f "src/modules/public/public.service.ts"
rm -f "src/modules/public/public.test.ts"
rm -f "src/modules/push/push.routes.ts"
rm -f "src/modules/push/push.service.test.ts"
rm -f "src/modules/push/push.service.ts"
rm -f "src/modules/quotes/quotes.controller.ts"
rm -f "src/modules/quotes/quotes.routes.ts"
rm -f "src/modules/quotes/quotes.schema.ts"
rm -f "src/modules/quotes/quotes.service.test.ts"
rm -f "src/modules/quotes/quotes.service.ts"
rm -f "src/modules/quotes/quotes.test.ts"
rm -f "src/modules/recurring-bookings/recurring-bookings.controller.ts"
rm -f "src/modules/recurring-bookings/recurring-bookings.routes.ts"
rm -f "src/modules/recurring-bookings/recurring-bookings.schema.ts"
rm -f "src/modules/recurring-bookings/recurring-bookings.service.test.ts"
rm -f "src/modules/recurring-bookings/recurring-bookings.service.ts"
rm -f "src/modules/recurring-bookings/recurring-bookings.test.ts"
rm -f "src/modules/referrals/referrals.controller.ts"
rm -f "src/modules/referrals/referrals.routes.ts"
rm -f "src/modules/referrals/referrals.schema.ts"
rm -f "src/modules/referrals/referrals.service.test.ts"
rm -f "src/modules/referrals/referrals.service.ts"
rm -f "src/modules/referrals/referrals.test.ts"
rm -f "src/modules/reminders/reminders.processor.ts"
rm -f "src/modules/reminders/reminders.queue.test.ts"
rm -f "src/modules/reminders/reminders.queue.ts"
rm -f "src/modules/reviews/reviews.processor.ts"
rm -f "src/modules/reviews/reviews.queue.test.ts"
rm -f "src/modules/reviews/reviews.queue.ts"
rm -f "src/modules/roles/roles.controller.ts"
rm -f "src/modules/roles/roles.routes.ts"
rm -f "src/modules/roles/roles.schema.ts"
rm -f "src/modules/roles/roles.service.test.ts"
rm -f "src/modules/roles/roles.service.ts"
rm -f "src/modules/roles/roles.test.ts"
rm -f "src/modules/rota/rota.controller.ts"
rm -f "src/modules/rota/rota.routes.ts"
rm -f "src/modules/rota/rota.schema.ts"
rm -f "src/modules/rota/rota.service.test.ts"
rm -f "src/modules/rota/rota.service.ts"
rm -f "src/modules/rota/rota.test.ts"
rm -f "src/modules/services/services.controller.ts"
rm -f "src/modules/services/services.routes.ts"
rm -f "src/modules/services/services.schema.ts"
rm -f "src/modules/services/services.service.test.ts"
rm -f "src/modules/services/services.service.ts"
rm -f "src/modules/services/services.test.ts"
rm -f "src/modules/sessions/sessions.controller.ts"
rm -f "src/modules/sessions/sessions.routes.ts"
rm -f "src/modules/sessions/sessions.schema.ts"
rm -f "src/modules/sessions/sessions.service.ts"
rm -f "src/modules/sessions/sessions.test.ts"
rm -f "src/modules/settings/settings.controller.ts"
rm -f "src/modules/settings/settings.routes.ts"
rm -f "src/modules/settings/settings.schema.ts"
rm -f "src/modules/settings/settings.service.test.ts"
rm -f "src/modules/settings/settings.service.ts"
rm -f "src/modules/settings/settings.test.ts"
rm -f "src/modules/sms-templates/sms-templates.controller.ts"
rm -f "src/modules/sms-templates/sms-templates.routes.ts"
rm -f "src/modules/sms-templates/sms-templates.schema.ts"
rm -f "src/modules/sms-templates/sms-templates.service.test.ts"
rm -f "src/modules/sms-templates/sms-templates.service.ts"
rm -f "src/modules/sms-templates/sms-templates.test.ts"
rm -f "src/modules/sms/sms.queue.ts"
rm -f "src/modules/social/social.controller.ts"
rm -f "src/modules/social/social.routes.ts"
rm -f "src/modules/social/social.schema.ts"
rm -f "src/modules/social/social.service.test.ts"
rm -f "src/modules/social/social.service.ts"
rm -f "src/modules/social/social.test.ts"
rm -f "src/modules/styles/styles.controller.ts"
rm -f "src/modules/styles/styles.routes.ts"
rm -f "src/modules/styles/styles.schema.ts"
rm -f "src/modules/styles/styles.service.test.ts"
rm -f "src/modules/styles/styles.service.ts"
rm -f "src/modules/styles/styles.test.ts"
rm -f "src/modules/tables/tables.controller.ts"
rm -f "src/modules/tables/tables.routes.ts"
rm -f "src/modules/tables/tables.schema.ts"
rm -f "src/modules/tables/tables.service.test.ts"
rm -f "src/modules/tables/tables.service.ts"
rm -f "src/modules/tenants/tenants.controller.ts"
rm -f "src/modules/tenants/tenants.routes.ts"
rm -f "src/modules/tenants/tenants.schema.ts"
rm -f "src/modules/tenants/tenants.service.test.ts"
rm -f "src/modules/tenants/tenants.service.ts"
rm -f "src/modules/tenants/tenants.test.ts"
rm -f "src/modules/uploads/uploads.controller.ts"
rm -f "src/modules/uploads/uploads.routes.ts"
rm -f "src/modules/uploads/uploads.service.test.ts"
rm -f "src/modules/uploads/uploads.service.ts"
rm -f "src/modules/uploads/uploads.test.ts"
rm -f "src/modules/waitlist/waitlist.controller.ts"
rm -f "src/modules/waitlist/waitlist.routes.ts"
rm -f "src/modules/waitlist/waitlist.schema.ts"
rm -f "src/modules/waitlist/waitlist.service.test.ts"
rm -f "src/modules/waitlist/waitlist.service.ts"
rm -f "src/modules/waitlist/waitlist.test.ts"
rm -f "src/modules/webhooks/webhooks.controller.ts"
rm -f "src/modules/webhooks/webhooks.queue.ts"
rm -f "src/modules/webhooks/webhooks.routes.ts"
rm -f "src/modules/webhooks/webhooks.schema.ts"
rm -f "src/modules/webhooks/webhooks.service.test.ts"
rm -f "src/modules/webhooks/webhooks.service.ts"
rm -f "src/modules/whatsapp-templates/whatsapp-templates.controller.ts"
rm -f "src/modules/whatsapp-templates/whatsapp-templates.routes.ts"
rm -f "src/modules/whatsapp-templates/whatsapp-templates.schema.ts"
rm -f "src/modules/whatsapp-templates/whatsapp-templates.service.test.ts"
rm -f "src/modules/whatsapp-templates/whatsapp-templates.service.ts"
rm -f "src/modules/whatsapp-templates/whatsapp-templates.test.ts"
rm -f "src/modules/whatsapp/whatsapp.controller.ts"
rm -f "src/modules/whatsapp/whatsapp.queue.test.ts"
rm -f "src/modules/whatsapp/whatsapp.queue.ts"
rm -f "src/modules/whatsapp/whatsapp.routes.ts"
rm -f "src/modules/whatsapp/whatsapp.schema.ts"
rm -f "src/modules/whatsapp/whatsapp.service.test.ts"
rm -f "src/modules/whatsapp/whatsapp.service.ts"
rm -f "src/scripts/backfill-analyticsEvent-tenantId.ts"
rm -f "src/scripts/backfill-lead-tenantId.ts"
rm -f "src/server.ts"
rm -f "src/types/express.d.ts"
rm -f "src/utils/apiResponse.ts"
rm -f "src/utils/extractTenantId.ts"
rm -f "src/utils/logger.ts"
rm -f "src/utils/paginate.ts"
rm -f "tsconfig.json"
echo "Part 2 delete done (185 files). Total: 372 files deleted."
echo "Removing any stale local migrations not in repo..."
find prisma/migrations -mindepth 1 -maxdepth 1 -type d \
  ! -name '20260413000000_init' \
  -exec rm -rf {} +
echo "Stale migrations cleaned."
```

---

## Step 3 — Create all directories

```bash
cd ~/Desktop/Automation/backend
mkdir -p "prisma"
mkdir -p "prisma/migrations/20260413000000_init"
mkdir -p "src"
mkdir -p "src/config"
mkdir -p "src/errors"
mkdir -p "src/jobs"
mkdir -p "src/lib"
mkdir -p "src/middleware"
mkdir -p "src/modules/admin"
mkdir -p "src/modules/ai"
mkdir -p "src/modules/alerts"
mkdir -p "src/modules/analytics"
mkdir -p "src/modules/artists"
mkdir -p "src/modules/auth"
mkdir -p "src/modules/availability"
mkdir -p "src/modules/booking-photos"
mkdir -p "src/modules/bookings"
mkdir -p "src/modules/calendar"
mkdir -p "src/modules/campaigns"
mkdir -p "src/modules/capture"
mkdir -p "src/modules/customer-stats"
mkdir -p "src/modules/customers"
mkdir -p "src/modules/email-templates"
mkdir -p "src/modules/features"
mkdir -p "src/modules/forms"
mkdir -p "src/modules/gift-cards"
mkdir -p "src/modules/health-flags"
mkdir -p "src/modules/invoices"
mkdir -p "src/modules/leads"
mkdir -p "src/modules/locations"
mkdir -p "src/modules/loyalty"
mkdir -p "src/modules/memberships"
mkdir -p "src/modules/messages"
mkdir -p "src/modules/notifications"
mkdir -p "src/modules/packages"
mkdir -p "src/modules/payments"
mkdir -p "src/modules/payroll"
mkdir -p "src/modules/pos"
mkdir -p "src/modules/pricing"
mkdir -p "src/modules/products"
mkdir -p "src/modules/public"
mkdir -p "src/modules/push"
mkdir -p "src/modules/quotes"
mkdir -p "src/modules/recurring-bookings"
mkdir -p "src/modules/referrals"
mkdir -p "src/modules/reminders"
mkdir -p "src/modules/reviews"
mkdir -p "src/modules/roles"
mkdir -p "src/modules/rota"
mkdir -p "src/modules/services"
mkdir -p "src/modules/sessions"
mkdir -p "src/modules/settings"
mkdir -p "src/modules/sms"
mkdir -p "src/modules/sms-templates"
mkdir -p "src/modules/social"
mkdir -p "src/modules/styles"
mkdir -p "src/modules/tables"
mkdir -p "src/modules/tenants"
mkdir -p "src/modules/uploads"
mkdir -p "src/modules/waitlist"
mkdir -p "src/modules/webhooks"
mkdir -p "src/modules/whatsapp"
mkdir -p "src/modules/whatsapp-templates"
mkdir -p "src/scripts"
mkdir -p "src/types"
mkdir -p "src/utils"
echo "All directories created."
```

---

## Step 4 — Download ALL files (Part 1 of 2: files 1–187)

**IMPORTANT:** Run from `~/Desktop/Automation/backend`. Copy-paste this ENTIRE block at once.

```bash
cd ~/Desktop/Automation/backend

B="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

dl() {
  curl -sfL -o "$1" "$B/$1"
  if [ $? -eq 0 ]; then echo "OK  $2"; else echo "FAILED $2"; fi
}

dl ".dockerignore" "  1/372"
dl ".env.example" "  2/372"
dl ".gitignore" "  3/372"
dl "Dockerfile" "  4/372"
dl "jest.setup.ts" "  5/372"
dl "package.json" "  6/372"
dl "prisma/migrations/20260413000000_init/migration.sql" "  7/372"
dl "prisma/migrations/migration_lock.toml" "  8/372"
dl "prisma/schema.prisma" "  9/372"
dl "src/app.ts" " 11/372"
dl "src/config/businessType.test.ts" " 12/372"
dl "src/config/businessType.ts" " 13/372"
dl "src/config/index.ts" " 14/372"
dl "src/errors/AppError.ts" " 15/372"
dl "src/index.ts" " 16/372"
dl "src/jobs/ai-suggestion.job.test.ts" " 17/372"
dl "src/jobs/ai-suggestion.job.ts" " 18/372"
dl "src/jobs/birthday.job.test.ts" " 19/372"
dl "src/jobs/birthday.job.ts" " 20/372"
dl "src/jobs/campaign.job.ts" " 21/372"
dl "src/jobs/index.ts" " 22/372"
dl "src/jobs/invoice-overdue.job.ts" " 23/372"
dl "src/jobs/no-show.job.test.ts" " 24/372"
dl "src/jobs/no-show.job.ts" " 25/372"
dl "src/jobs/rebook-nudge.job.test.ts" " 26/372"
dl "src/jobs/rebook-nudge.job.ts" " 27/372"
dl "src/jobs/recurring-booking.job.ts" " 28/372"
dl "src/jobs/waitlist-match.job.ts" " 29/372"
dl "src/lib/apple-calendar.ts" " 30/372"
dl "src/lib/cloudinary.ts" " 31/372"
dl "src/lib/google-calendar.ts" " 32/372"
dl "src/lib/notification-dispatcher.ts" " 33/372"
dl "src/lib/openai.ts" " 34/372"
dl "src/lib/outlook-calendar.ts" " 35/372"
dl "src/lib/pricing-engine.test.ts" " 36/372"
dl "src/lib/pricing-engine.ts" " 37/372"
dl "src/lib/prisma.ts" " 38/372"
dl "src/lib/push-notifications.ts" " 39/372"
dl "src/lib/redis.ts" " 40/372"
dl "src/lib/resend.ts" " 41/372"
dl "src/lib/stripe.ts" " 42/372"
dl "src/lib/template-renderer.ts" " 43/372"
dl "src/lib/twilio-sms.ts" " 44/372"
dl "src/lib/twilio.ts" " 45/372"
dl "src/middleware/auth.test.ts" " 46/372"
dl "src/middleware/auth.ts" " 47/372"
dl "src/middleware/captcha.ts" " 48/372"
dl "src/middleware/errorHandler.ts" " 49/372"
dl "src/middleware/requestLogger.ts" " 50/372"
dl "src/middleware/requireFeature.ts" " 51/372"
dl "src/middleware/requireLeadAccess.test.ts" " 52/372"
dl "src/middleware/requireLeadAccess.ts" " 53/372"
dl "src/middleware/requireRole.ts" " 54/372"
dl "src/middleware/upload.ts" " 55/372"
dl "src/middleware/validate.ts" " 56/372"
dl "src/modules/admin/admin.controller.ts" " 57/372"
dl "src/modules/admin/admin.routes.ts" " 58/372"
dl "src/modules/admin/admin.schema.ts" " 59/372"
dl "src/modules/admin/admin.service.test.ts" " 60/372"
dl "src/modules/admin/admin.service.ts" " 61/372"
dl "src/modules/ai/ai.controller.ts" " 62/372"
dl "src/modules/ai/ai.routes.ts" " 63/372"
dl "src/modules/ai/ai.schema.ts" " 64/372"
dl "src/modules/ai/ai.service.test.ts" " 65/372"
dl "src/modules/ai/ai.service.ts" " 66/372"
dl "src/modules/alerts/alerts.controller.ts" " 67/372"
dl "src/modules/alerts/alerts.routes.ts" " 68/372"
dl "src/modules/alerts/alerts.schema.ts" " 69/372"
dl "src/modules/alerts/alerts.service.test.ts" " 70/372"
dl "src/modules/alerts/alerts.service.ts" " 71/372"
dl "src/modules/alerts/alerts.test.ts" " 72/372"
dl "src/modules/analytics/analytics.controller.ts" " 73/372"
dl "src/modules/analytics/analytics.routes.ts" " 74/372"
dl "src/modules/analytics/analytics.schema.ts" " 75/372"
dl "src/modules/analytics/analytics.service.test.ts" " 76/372"
dl "src/modules/analytics/analytics.service.ts" " 77/372"
dl "src/modules/analytics/analytics.test.ts" " 78/372"
dl "src/modules/artists/artist-media.controller.ts" " 79/372"
dl "src/modules/artists/artist-media.service.test.ts" " 80/372"
dl "src/modules/artists/artist-media.service.ts" " 81/372"
dl "src/modules/artists/artists.controller.ts" " 82/372"
dl "src/modules/artists/artists.routes.ts" " 83/372"
dl "src/modules/artists/artists.schema.ts" " 84/372"
dl "src/modules/artists/artists.service.ts" " 85/372"
dl "src/modules/artists/artists.test.ts" " 86/372"
dl "src/modules/auth/auth.controller.ts" " 87/372"
dl "src/modules/auth/auth.email.processor.ts" " 88/372"
dl "src/modules/auth/auth.email.queue.ts" " 89/372"
dl "src/modules/auth/auth.routes.ts" " 90/372"
dl "src/modules/auth/auth.schema.ts" " 91/372"
dl "src/modules/auth/auth.service.test.ts" " 92/372"
dl "src/modules/auth/auth.service.ts" " 93/372"
dl "src/modules/auth/auth.test.ts" " 94/372"
dl "src/modules/availability/availability.controller.ts" " 95/372"
dl "src/modules/availability/availability.routes.ts" " 96/372"
dl "src/modules/availability/availability.schema.ts" " 97/372"
dl "src/modules/availability/availability.service.test.ts" " 98/372"
dl "src/modules/availability/availability.service.ts" " 99/372"
dl "src/modules/availability/availability.test.ts" "100/372"
dl "src/modules/booking-photos/booking-photos.controller.ts" "101/372"
dl "src/modules/booking-photos/booking-photos.routes.ts" "102/372"
dl "src/modules/booking-photos/booking-photos.schema.ts" "103/372"
dl "src/modules/booking-photos/booking-photos.service.test.ts" "104/372"
dl "src/modules/booking-photos/booking-photos.service.ts" "105/372"
dl "src/modules/booking-photos/booking-photos.test.ts" "106/372"
dl "src/modules/bookings/bookings.controller.ts" "107/372"
dl "src/modules/bookings/bookings.routes.ts" "108/372"
dl "src/modules/bookings/bookings.schema.ts" "109/372"
dl "src/modules/bookings/bookings.service.test.ts" "110/372"
dl "src/modules/bookings/bookings.service.ts" "111/372"
dl "src/modules/bookings/bookings.test.ts" "112/372"
dl "src/modules/calendar/apple-calendar.controller.ts" "113/372"
dl "src/modules/calendar/apple-calendar.service.test.ts" "114/372"
dl "src/modules/calendar/apple-calendar.service.ts" "115/372"
dl "src/modules/calendar/calendar.controller.ts" "116/372"
dl "src/modules/calendar/calendar.routes.ts" "117/372"
dl "src/modules/calendar/calendar.schema.ts" "118/372"
dl "src/modules/calendar/calendar.service.test.ts" "119/372"
dl "src/modules/calendar/calendar.service.ts" "120/372"
dl "src/modules/calendar/calendar.test.ts" "121/372"
dl "src/modules/calendar/outlook-calendar.controller.ts" "122/372"
dl "src/modules/calendar/outlook-calendar.service.test.ts" "123/372"
dl "src/modules/calendar/outlook-calendar.service.ts" "124/372"
dl "src/modules/campaigns/campaigns.controller.ts" "125/372"
dl "src/modules/campaigns/campaigns.routes.ts" "126/372"
dl "src/modules/campaigns/campaigns.schema.ts" "127/372"
dl "src/modules/campaigns/campaigns.service.test.ts" "128/372"
dl "src/modules/campaigns/campaigns.service.ts" "129/372"
dl "src/modules/campaigns/campaigns.test.ts" "130/372"
dl "src/modules/capture/capture.controller.ts" "131/372"
dl "src/modules/capture/capture.routes.ts" "132/372"
dl "src/modules/capture/capture.schema.ts" "133/372"
dl "src/modules/capture/capture.service.test.ts" "134/372"
dl "src/modules/capture/capture.service.ts" "135/372"
dl "src/modules/customer-stats/customer-stats.controller.ts" "136/372"
dl "src/modules/customer-stats/customer-stats.routes.ts" "137/372"
dl "src/modules/customer-stats/customer-stats.schema.ts" "138/372"
dl "src/modules/customer-stats/customer-stats.service.test.ts" "139/372"
dl "src/modules/customer-stats/customer-stats.service.ts" "140/372"
dl "src/modules/customer-stats/customer-stats.test.ts" "141/372"
dl "src/modules/customers/customers.controller.ts" "142/372"
dl "src/modules/customers/customers.routes.ts" "143/372"
dl "src/modules/customers/customers.schema.ts" "144/372"
dl "src/modules/customers/customers.service.test.ts" "145/372"
dl "src/modules/customers/customers.service.ts" "146/372"
dl "src/modules/email-templates/email-templates.controller.ts" "147/372"
dl "src/modules/email-templates/email-templates.routes.ts" "148/372"
dl "src/modules/email-templates/email-templates.schema.ts" "149/372"
dl "src/modules/email-templates/email-templates.service.test.ts" "150/372"
dl "src/modules/email-templates/email-templates.service.ts" "151/372"
dl "src/modules/email-templates/email-templates.test.ts" "152/372"
dl "src/modules/features/features.test.ts" "153/372"
dl "src/modules/forms/forms.controller.ts" "154/372"
dl "src/modules/forms/forms.routes.ts" "155/372"
dl "src/modules/forms/forms.schema.ts" "156/372"
dl "src/modules/forms/forms.service.test.ts" "157/372"
dl "src/modules/forms/forms.service.ts" "158/372"
dl "src/modules/forms/forms.test.ts" "159/372"
dl "src/modules/gift-cards/gift-cards.controller.ts" "160/372"
dl "src/modules/gift-cards/gift-cards.routes.ts" "161/372"
dl "src/modules/gift-cards/gift-cards.schema.ts" "162/372"
dl "src/modules/gift-cards/gift-cards.service.test.ts" "163/372"
dl "src/modules/gift-cards/gift-cards.service.ts" "164/372"
dl "src/modules/gift-cards/gift-cards.test.ts" "165/372"
dl "src/modules/health-flags/health-flags.controller.ts" "166/372"
dl "src/modules/health-flags/health-flags.routes.ts" "167/372"
dl "src/modules/health-flags/health-flags.schema.ts" "168/372"
dl "src/modules/health-flags/health-flags.service.test.ts" "169/372"
dl "src/modules/health-flags/health-flags.service.ts" "170/372"
dl "src/modules/health-flags/health-flags.test.ts" "171/372"
dl "src/modules/invoices/invoices.controller.ts" "172/372"
dl "src/modules/invoices/invoices.routes.ts" "173/372"
dl "src/modules/invoices/invoices.schema.ts" "174/372"
dl "src/modules/invoices/invoices.service.test.ts" "175/372"
dl "src/modules/invoices/invoices.service.ts" "176/372"
dl "src/modules/invoices/invoices.test.ts" "177/372"
dl "src/modules/leads/leads.controller.ts" "178/372"
dl "src/modules/leads/leads.routes.ts" "179/372"
dl "src/modules/leads/leads.schema.ts" "180/372"
dl "src/modules/leads/leads.service.test.ts" "181/372"
dl "src/modules/leads/leads.service.ts" "182/372"
dl "src/modules/leads/leads.test.ts" "183/372"
dl "src/modules/locations/locations.controller.ts" "184/372"
dl "src/modules/locations/locations.routes.ts" "185/372"
dl "src/modules/locations/locations.schema.ts" "186/372"
dl "src/modules/locations/locations.service.ts" "187/372"

echo "Part 1 download done (187/372)"
```

**After running:** You should see `OK` for all 187 lines. If ANY line says `FAILED`, re-run that specific `dl` line.

---

## Step 5 — Download ALL files (Part 2 of 2: files 188–372)

```bash
cd ~/Desktop/Automation/backend

B="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

dl() {
  curl -sfL -o "$1" "$B/$1"
  if [ $? -eq 0 ]; then echo "OK  $2"; else echo "FAILED $2"; fi
}

dl "src/modules/locations/locations.test.ts" "188/372"
dl "src/modules/loyalty/loyalty.controller.ts" "189/372"
dl "src/modules/loyalty/loyalty.routes.ts" "190/372"
dl "src/modules/loyalty/loyalty.schema.ts" "191/372"
dl "src/modules/loyalty/loyalty.service.test.ts" "192/372"
dl "src/modules/loyalty/loyalty.service.ts" "193/372"
dl "src/modules/loyalty/loyalty.test.ts" "194/372"
dl "src/modules/memberships/memberships.controller.ts" "195/372"
dl "src/modules/memberships/memberships.routes.ts" "196/372"
dl "src/modules/memberships/memberships.schema.ts" "197/372"
dl "src/modules/memberships/memberships.service.test.ts" "198/372"
dl "src/modules/memberships/memberships.service.ts" "199/372"
dl "src/modules/memberships/memberships.test.ts" "200/372"
dl "src/modules/messages/messages.routes.ts" "201/372"
dl "src/modules/notifications/notifications.controller.ts" "202/372"
dl "src/modules/notifications/notifications.routes.ts" "203/372"
dl "src/modules/notifications/notifications.schema.ts" "204/372"
dl "src/modules/notifications/notifications.service.test.ts" "205/372"
dl "src/modules/notifications/notifications.service.ts" "206/372"
dl "src/modules/packages/packages.controller.ts" "207/372"
dl "src/modules/packages/packages.routes.ts" "208/372"
dl "src/modules/packages/packages.schema.ts" "209/372"
dl "src/modules/packages/packages.service.test.ts" "210/372"
dl "src/modules/packages/packages.service.ts" "211/372"
dl "src/modules/packages/packages.test.ts" "212/372"
dl "src/modules/payments/payments.controller.ts" "213/372"
dl "src/modules/payments/payments.routes.ts" "214/372"
dl "src/modules/payments/payments.schema.ts" "215/372"
dl "src/modules/payments/payments.service.test.ts" "216/372"
dl "src/modules/payments/payments.service.ts" "217/372"
dl "src/modules/payments/payments.test.ts" "218/372"
dl "src/modules/payroll/payroll.controller.ts" "219/372"
dl "src/modules/payroll/payroll.routes.ts" "220/372"
dl "src/modules/payroll/payroll.schema.ts" "221/372"
dl "src/modules/payroll/payroll.service.test.ts" "222/372"
dl "src/modules/payroll/payroll.service.ts" "223/372"
dl "src/modules/payroll/payroll.test.ts" "224/372"
dl "src/modules/pos/pos.controller.ts" "225/372"
dl "src/modules/pos/pos.routes.ts" "226/372"
dl "src/modules/pos/pos.schema.ts" "227/372"
dl "src/modules/pos/pos.service.test.ts" "228/372"
dl "src/modules/pos/pos.service.ts" "229/372"
dl "src/modules/pos/pos.test.ts" "230/372"
dl "src/modules/pricing/pricing.controller.ts" "231/372"
dl "src/modules/pricing/pricing.routes.ts" "232/372"
dl "src/modules/pricing/pricing.schema.ts" "233/372"
dl "src/modules/pricing/pricing.service.ts" "234/372"
dl "src/modules/pricing/pricing.test.ts" "235/372"
dl "src/modules/products/products.controller.ts" "236/372"
dl "src/modules/products/products.routes.ts" "237/372"
dl "src/modules/products/products.schema.ts" "238/372"
dl "src/modules/products/products.service.test.ts" "239/372"
dl "src/modules/products/products.service.ts" "240/372"
dl "src/modules/products/products.test.ts" "241/372"
dl "src/modules/public/public.controller.ts" "242/372"
dl "src/modules/public/public.routes.ts" "243/372"
dl "src/modules/public/public.schema.ts" "244/372"
dl "src/modules/public/public.service.test.ts" "245/372"
dl "src/modules/public/public.service.ts" "246/372"
dl "src/modules/public/public.test.ts" "247/372"
dl "src/modules/push/push.routes.ts" "248/372"
dl "src/modules/push/push.service.test.ts" "249/372"
dl "src/modules/push/push.service.ts" "250/372"
dl "src/modules/quotes/quotes.controller.ts" "251/372"
dl "src/modules/quotes/quotes.routes.ts" "252/372"
dl "src/modules/quotes/quotes.schema.ts" "253/372"
dl "src/modules/quotes/quotes.service.test.ts" "254/372"
dl "src/modules/quotes/quotes.service.ts" "255/372"
dl "src/modules/quotes/quotes.test.ts" "256/372"
dl "src/modules/recurring-bookings/recurring-bookings.controller.ts" "257/372"
dl "src/modules/recurring-bookings/recurring-bookings.routes.ts" "258/372"
dl "src/modules/recurring-bookings/recurring-bookings.schema.ts" "259/372"
dl "src/modules/recurring-bookings/recurring-bookings.service.test.ts" "260/372"
dl "src/modules/recurring-bookings/recurring-bookings.service.ts" "261/372"
dl "src/modules/recurring-bookings/recurring-bookings.test.ts" "262/372"
dl "src/modules/referrals/referrals.controller.ts" "263/372"
dl "src/modules/referrals/referrals.routes.ts" "264/372"
dl "src/modules/referrals/referrals.schema.ts" "265/372"
dl "src/modules/referrals/referrals.service.test.ts" "266/372"
dl "src/modules/referrals/referrals.service.ts" "267/372"
dl "src/modules/referrals/referrals.test.ts" "268/372"
dl "src/modules/reminders/reminders.processor.ts" "269/372"
dl "src/modules/reminders/reminders.queue.test.ts" "270/372"
dl "src/modules/reminders/reminders.queue.ts" "271/372"
dl "src/modules/reviews/reviews.processor.ts" "272/372"
dl "src/modules/reviews/reviews.queue.test.ts" "273/372"
dl "src/modules/reviews/reviews.queue.ts" "274/372"
dl "src/modules/roles/roles.controller.ts" "275/372"
dl "src/modules/roles/roles.routes.ts" "276/372"
dl "src/modules/roles/roles.schema.ts" "277/372"
dl "src/modules/roles/roles.service.test.ts" "278/372"
dl "src/modules/roles/roles.service.ts" "279/372"
dl "src/modules/roles/roles.test.ts" "280/372"
dl "src/modules/rota/rota.controller.ts" "281/372"
dl "src/modules/rota/rota.routes.ts" "282/372"
dl "src/modules/rota/rota.schema.ts" "283/372"
dl "src/modules/rota/rota.service.test.ts" "284/372"
dl "src/modules/rota/rota.service.ts" "285/372"
dl "src/modules/rota/rota.test.ts" "286/372"
dl "src/modules/services/services.controller.ts" "287/372"
dl "src/modules/services/services.routes.ts" "288/372"
dl "src/modules/services/services.schema.ts" "289/372"
dl "src/modules/services/services.service.test.ts" "290/372"
dl "src/modules/services/services.service.ts" "291/372"
dl "src/modules/services/services.test.ts" "292/372"
dl "src/modules/sessions/sessions.controller.ts" "293/372"
dl "src/modules/sessions/sessions.routes.ts" "294/372"
dl "src/modules/sessions/sessions.schema.ts" "295/372"
dl "src/modules/sessions/sessions.service.ts" "296/372"
dl "src/modules/sessions/sessions.test.ts" "297/372"
dl "src/modules/settings/settings.controller.ts" "298/372"
dl "src/modules/settings/settings.routes.ts" "299/372"
dl "src/modules/settings/settings.schema.ts" "300/372"
dl "src/modules/settings/settings.service.test.ts" "301/372"
dl "src/modules/settings/settings.service.ts" "302/372"
dl "src/modules/settings/settings.test.ts" "303/372"
dl "src/modules/sms-templates/sms-templates.controller.ts" "304/372"
dl "src/modules/sms-templates/sms-templates.routes.ts" "305/372"
dl "src/modules/sms-templates/sms-templates.schema.ts" "306/372"
dl "src/modules/sms-templates/sms-templates.service.test.ts" "307/372"
dl "src/modules/sms-templates/sms-templates.service.ts" "308/372"
dl "src/modules/sms-templates/sms-templates.test.ts" "309/372"
dl "src/modules/sms/sms.queue.ts" "310/372"
dl "src/modules/social/social.controller.ts" "311/372"
dl "src/modules/social/social.routes.ts" "312/372"
dl "src/modules/social/social.schema.ts" "313/372"
dl "src/modules/social/social.service.test.ts" "314/372"
dl "src/modules/social/social.service.ts" "315/372"
dl "src/modules/social/social.test.ts" "316/372"
dl "src/modules/styles/styles.controller.ts" "317/372"
dl "src/modules/styles/styles.routes.ts" "318/372"
dl "src/modules/styles/styles.schema.ts" "319/372"
dl "src/modules/styles/styles.service.test.ts" "320/372"
dl "src/modules/styles/styles.service.ts" "321/372"
dl "src/modules/styles/styles.test.ts" "322/372"
dl "src/modules/tables/tables.controller.ts" "323/372"
dl "src/modules/tables/tables.routes.ts" "324/372"
dl "src/modules/tables/tables.schema.ts" "325/372"
dl "src/modules/tables/tables.service.test.ts" "326/372"
dl "src/modules/tables/tables.service.ts" "327/372"
dl "src/modules/tenants/tenants.controller.ts" "328/372"
dl "src/modules/tenants/tenants.routes.ts" "329/372"
dl "src/modules/tenants/tenants.schema.ts" "330/372"
dl "src/modules/tenants/tenants.service.test.ts" "331/372"
dl "src/modules/tenants/tenants.service.ts" "332/372"
dl "src/modules/tenants/tenants.test.ts" "333/372"
dl "src/modules/uploads/uploads.controller.ts" "334/372"
dl "src/modules/uploads/uploads.routes.ts" "335/372"
dl "src/modules/uploads/uploads.service.test.ts" "336/372"
dl "src/modules/uploads/uploads.service.ts" "337/372"
dl "src/modules/uploads/uploads.test.ts" "338/372"
dl "src/modules/waitlist/waitlist.controller.ts" "339/372"
dl "src/modules/waitlist/waitlist.routes.ts" "340/372"
dl "src/modules/waitlist/waitlist.schema.ts" "341/372"
dl "src/modules/waitlist/waitlist.service.test.ts" "342/372"
dl "src/modules/waitlist/waitlist.service.ts" "343/372"
dl "src/modules/waitlist/waitlist.test.ts" "344/372"
dl "src/modules/webhooks/webhooks.controller.ts" "345/372"
dl "src/modules/webhooks/webhooks.queue.ts" "346/372"
dl "src/modules/webhooks/webhooks.routes.ts" "347/372"
dl "src/modules/webhooks/webhooks.schema.ts" "348/372"
dl "src/modules/webhooks/webhooks.service.test.ts" "349/372"
dl "src/modules/webhooks/webhooks.service.ts" "350/372"
dl "src/modules/whatsapp-templates/whatsapp-templates.controller.ts" "351/372"
dl "src/modules/whatsapp-templates/whatsapp-templates.routes.ts" "352/372"
dl "src/modules/whatsapp-templates/whatsapp-templates.schema.ts" "353/372"
dl "src/modules/whatsapp-templates/whatsapp-templates.service.test.ts" "354/372"
dl "src/modules/whatsapp-templates/whatsapp-templates.service.ts" "355/372"
dl "src/modules/whatsapp-templates/whatsapp-templates.test.ts" "356/372"
dl "src/modules/whatsapp/whatsapp.controller.ts" "357/372"
dl "src/modules/whatsapp/whatsapp.queue.test.ts" "358/372"
dl "src/modules/whatsapp/whatsapp.queue.ts" "359/372"
dl "src/modules/whatsapp/whatsapp.routes.ts" "360/372"
dl "src/modules/whatsapp/whatsapp.schema.ts" "361/372"
dl "src/modules/whatsapp/whatsapp.service.test.ts" "362/372"
dl "src/modules/whatsapp/whatsapp.service.ts" "363/372"
dl "src/scripts/backfill-analyticsEvent-tenantId.ts" "364/372"
dl "src/scripts/backfill-lead-tenantId.ts" "365/372"
dl "src/server.ts" "366/372"
dl "src/types/express.d.ts" "367/372"
dl "src/utils/apiResponse.ts" "368/372"
dl "src/utils/extractTenantId.ts" "369/372"
dl "src/utils/logger.ts" "370/372"
dl "src/utils/paginate.ts" "371/372"
dl "tsconfig.json" "372/372"

echo "Part 2 download done (372/372). ALL FILES DOWNLOADED."
```

**After running:** You should see `OK` for all lines. If ANY line says `FAILED`, re-run that specific `dl` line.

---

## Step 6 — Verify critical files exist

```bash
cd ~/Desktop/Automation/backend
echo "--- Checking critical files ---"
if [ -f src/middleware/requireFeature.ts ]; then echo "OK: requireFeature.ts"; else echo "MISSING: requireFeature.ts"; fi
if [ -f src/modules/leads/leads.schema.ts ]; then echo "OK: leads.schema.ts"; else echo "MISSING: leads.schema.ts"; fi
if [ -f src/modules/reminders/reminders.queue.ts ]; then echo "OK: reminders.queue.ts"; else echo "MISSING: reminders.queue.ts"; fi
if [ -f src/modules/admin/admin.service.ts ]; then echo "OK: admin.service.ts"; else echo "MISSING: admin.service.ts"; fi
if [ -f src/jobs/ai-suggestion.job.test.ts ]; then echo "OK: ai-suggestion.job.test.ts"; else echo "MISSING: ai-suggestion.job.test.ts"; fi
if [ -f src/modules/whatsapp/whatsapp.queue.test.ts ]; then echo "OK: whatsapp.queue.test.ts"; else echo "MISSING: whatsapp.queue.test.ts"; fi
if [ -f prisma/schema.prisma ]; then echo "OK: schema.prisma"; else echo "MISSING: schema.prisma"; fi
if [ -f package.json ]; then echo "OK: package.json"; else echo "MISSING: package.json"; fi
echo "--- Done ---"
```

All must say `OK`. If any say `MISSING`, go back to Step 4/5 and re-run the `dl` line for that file.

---

## Step 7 — Install dependencies and migrate

> **Prerequisites before running:**
> - Docker must be running with Postgres on port 5433: `docker compose up -d` (from repo root)
> - Your `.env` must have `DATABASE_URL` pointing to `localhost:5433`
> - If you previously had migration errors, reset the DB first: `docker compose down -v` then `docker compose up -d`

```bash
cd ~/Desktop/Automation/backend
rm -rf node_modules
npm install
npx prisma generate
npx prisma migrate dev
```

> If Docker is required for PostgreSQL / Redis:
> ```bash
> cd ~/Desktop/Automation
> docker compose up -d
> ```

> **If you get Prisma error P3006 or P1014:** see the [Prisma P3006/P1014 troubleshooting section](#prisma-migrate-dev-errors-p3006--p1014--what-happened--fix) at the top of this guide. Quick summary:
>
> 1. Make sure you downloaded the latest migration files (Steps 1–5). The repo now uses a single `20260413000000_init` baseline migration.
> 2. Remove any stale/extra migration folders:
> ```bash
> cd ~/Desktop/Automation/backend
> find prisma/migrations -mindepth 1 -maxdepth 1 -type d ! -name '20260413000000_init' -exec rm -rf {} +
> ```
> 3. Reset Docker and re-run:
> ```bash
> cd ~/Desktop/Automation
> docker compose down -v
> docker compose up -d
> cd backend
> npx prisma migrate dev
> ```

---

## Step 8 — Run tests

```bash
cd ~/Desktop/Automation/backend
npm test
```

If TypeScript type checking is needed separately:

```bash
npx tsc --noEmit
```

---

## Expected Output After Step 8

```text
Test Suites: 102 passed, 102 total
Tests:       1821 passed, 1821 total
Snapshots:   0 total
Time:        <varies>
Ran all test suites.
```

**Key checkpoints:**
- **102 suites** — all 372 files present and compiling
- **1821 tests** — all `it()` test cases passing
- **0 TypeScript errors** — `npx tsc --noEmit` should exit cleanly
- If TypeScript compile errors exist, Jest will show `Test suite failed to run` and many suites can fail from a single broken import chain

**If tests still fail:**
1. Run `npx tsc --noEmit` first — if it shows errors, some file was not downloaded correctly
2. Check which file the error points to, re-download it from Step 4 or 5
3. Paste back the full `npm test` output and the `npx tsc --noEmit` output

---

## Troubleshooting — "cmdand cmdor dquote>" error

If you see `cmdand cmdor dquote>` in your terminal, it means you pasted `&amp;&amp;`
(the HTML-encoded form of `&&`) instead of actual `&&`. This happens when you copy
commands from GitHub's **rendered markdown page** instead of the **Raw** view.

**Fix:** Press `Ctrl+C` to cancel the broken command, then:
1. Go to this file on GitHub
2. Click the **Raw** button (top-right of the file)
3. Copy the commands from the raw plain-text view
4. Paste into your terminal

All commands in this guide avoid `&&` and `||` so this should not happen.
