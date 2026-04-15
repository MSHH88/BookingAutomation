# Step-By-Step Guide — LastAudits BUG 1–BUG 13

> **Source of truth:** `LastAudits.md` (BUG 1 through BUG 13) — **only**.
> **Branch:** `copilot/create-detailed-automation-plan`
> **Total files:** 3 new + 26 modified = 29 backend files.

---

## Definitive File Lists

### New Files (3)

| # | Path | Origin |
|---|------|--------|
| 1 | `backend/prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql` | BUG 12 (EmailTemplate `@@unique([tenantId, key])` migration) |
| 2 | `backend/src/jobs/ai-suggestion.job.test.ts` | BUG 13 (new test for per-tenant AI suggestion gating) |
| 3 | `backend/src/modules/whatsapp/whatsapp.queue.test.ts` | BUG 3 (new test for DB-template-aware WhatsApp processor) |

### Modified Files (26)

| # | Path | BUG(s) |
|---|------|--------|
| 1 | `backend/prisma/schema.prisma` | BUG 6, 11, 12 |
| 2 | `backend/src/config/businessType.ts` | BUG 2 |
| 3 | `backend/src/jobs/ai-suggestion.job.ts` | BUG 13 |
| 4 | `backend/src/jobs/invoice-overdue.job.ts` | BUG 5 |
| 5 | `backend/src/lib/notification-dispatcher.ts` | BUG 2, 12 |
| 6 | `backend/src/modules/bookings/bookings.controller.ts` | BUG 4 |
| 7 | `backend/src/modules/bookings/bookings.service.test.ts` | BUG 4 (updated tests for tenant isolation) |
| 8 | `backend/src/modules/bookings/bookings.service.ts` | BUG 4 |
| 9 | `backend/src/modules/calendar/calendar.controller.ts` | BUG 9 |
| 10 | `backend/src/modules/calendar/calendar.service.test.ts` | BUG 9 (updated tests for tenant isolation) |
| 11 | `backend/src/modules/calendar/calendar.service.ts` | BUG 9 |
| 12 | `backend/src/modules/invoices/invoices.controller.ts` | BUG 7 |
| 13 | `backend/src/modules/invoices/invoices.service.test.ts` | BUG 5, 7 (updated tests for tenant isolation) |
| 14 | `backend/src/modules/invoices/invoices.service.ts` | BUG 5, 7 |
| 15 | `backend/src/modules/notifications/notifications.controller.ts` | BUG 10 |
| 16 | `backend/src/modules/notifications/notifications.service.test.ts` | BUG 10, 12 (updated tests for tenant-scoped email) |
| 17 | `backend/src/modules/notifications/notifications.service.ts` | BUG 10, 12 |
| 18 | `backend/src/modules/public/public.test.ts` | BUG 4 (tests aligned with updated booking signatures) |
| 19 | `backend/src/modules/quotes/quotes.controller.ts` | BUG 8 |
| 20 | `backend/src/modules/quotes/quotes.service.test.ts` | BUG 8 (updated tests for tenant isolation) |
| 21 | `backend/src/modules/quotes/quotes.service.ts` | BUG 8 |
| 22 | `backend/src/modules/social/social.test.ts` | BUG 4 (tests aligned with updated booking signatures) |
| 23 | `backend/src/modules/waitlist/waitlist.controller.ts` | BUG 6 |
| 24 | `backend/src/modules/waitlist/waitlist.service.test.ts` | BUG 6, 11 (updated tests for tenant isolation) |
| 25 | `backend/src/modules/waitlist/waitlist.service.ts` | BUG 6, 11 |
| 26 | `backend/src/modules/whatsapp/whatsapp.queue.ts` | BUG 3 |

---

## Step 1 — Delete (reset local files)

Run from `~/Desktop/Automation/backend`:

```bash
# --- New files (3) ---
rm -f prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql
rm -f src/jobs/ai-suggestion.job.test.ts
rm -f src/modules/whatsapp/whatsapp.queue.test.ts

# --- Modified files (26) ---
rm -f prisma/schema.prisma
rm -f src/config/businessType.ts
rm -f src/jobs/ai-suggestion.job.ts
rm -f src/jobs/invoice-overdue.job.ts
rm -f src/lib/notification-dispatcher.ts
rm -f src/modules/bookings/bookings.controller.ts
rm -f src/modules/bookings/bookings.service.test.ts
rm -f src/modules/bookings/bookings.service.ts
rm -f src/modules/calendar/calendar.controller.ts
rm -f src/modules/calendar/calendar.service.test.ts
rm -f src/modules/calendar/calendar.service.ts
rm -f src/modules/invoices/invoices.controller.ts
rm -f src/modules/invoices/invoices.service.test.ts
rm -f src/modules/invoices/invoices.service.ts
rm -f src/modules/notifications/notifications.controller.ts
rm -f src/modules/notifications/notifications.service.test.ts
rm -f src/modules/notifications/notifications.service.ts
rm -f src/modules/public/public.test.ts
rm -f src/modules/quotes/quotes.controller.ts
rm -f src/modules/quotes/quotes.service.test.ts
rm -f src/modules/quotes/quotes.service.ts
rm -f src/modules/social/social.test.ts
rm -f src/modules/waitlist/waitlist.controller.ts
rm -f src/modules/waitlist/waitlist.service.test.ts
rm -f src/modules/waitlist/waitlist.service.ts
rm -f src/modules/whatsapp/whatsapp.queue.ts

# --- Clean up empty migration directory (new files only) ---
rmdir --ignore-fail-on-non-empty "prisma/migrations/20260415000001_email_template_tenant_key_unique" || true
```

---

## Step 2 — Create directories (mkdir -p)

```bash
mkdir -p prisma/migrations/20260415000001_email_template_tenant_key_unique
mkdir -p src/config
mkdir -p src/jobs
mkdir -p src/lib
mkdir -p src/modules/bookings
mkdir -p src/modules/calendar
mkdir -p src/modules/invoices
mkdir -p src/modules/notifications
mkdir -p src/modules/public
mkdir -p src/modules/quotes
mkdir -p src/modules/social
mkdir -p src/modules/waitlist
mkdir -p src/modules/whatsapp
```

---

## Step 3 — Download NEW files (3 new files)

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"
```

```bash
curl -L -o prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql \
  "$BASE/prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql" \
  && echo "OK 1/3  migration (email_template_tenant_key_unique)" \
  || echo "FAILED  migration (email_template_tenant_key_unique)"

curl -L -o src/jobs/ai-suggestion.job.test.ts \
  "$BASE/src/jobs/ai-suggestion.job.test.ts" \
  && echo "OK 2/3  ai-suggestion.job.test.ts" \
  || echo "FAILED  ai-suggestion.job.test.ts"

curl -L -o src/modules/whatsapp/whatsapp.queue.test.ts \
  "$BASE/src/modules/whatsapp/whatsapp.queue.test.ts" \
  && echo "OK 3/3  whatsapp.queue.test.ts" \
  || echo "FAILED  whatsapp.queue.test.ts"
```

---

## Step 4 — Download CHANGED files (26 modified files)

Use the same `$BASE` variable set in Step 3.

```bash
curl -L -o prisma/schema.prisma "$BASE/prisma/schema.prisma" \
  && echo "OK  1/26 prisma/schema.prisma" || echo "FAILED  prisma/schema.prisma"

curl -L -o src/config/businessType.ts "$BASE/src/config/businessType.ts" \
  && echo "OK  2/26 businessType.ts" || echo "FAILED  businessType.ts"

curl -L -o src/jobs/ai-suggestion.job.ts "$BASE/src/jobs/ai-suggestion.job.ts" \
  && echo "OK  3/26 ai-suggestion.job.ts" || echo "FAILED  ai-suggestion.job.ts"

curl -L -o src/jobs/invoice-overdue.job.ts "$BASE/src/jobs/invoice-overdue.job.ts" \
  && echo "OK  4/26 invoice-overdue.job.ts" || echo "FAILED  invoice-overdue.job.ts"

curl -L -o src/lib/notification-dispatcher.ts "$BASE/src/lib/notification-dispatcher.ts" \
  && echo "OK  5/26 notification-dispatcher.ts" || echo "FAILED  notification-dispatcher.ts"

curl -L -o src/modules/bookings/bookings.controller.ts "$BASE/src/modules/bookings/bookings.controller.ts" \
  && echo "OK  6/26 bookings.controller.ts" || echo "FAILED  bookings.controller.ts"

curl -L -o src/modules/bookings/bookings.service.test.ts "$BASE/src/modules/bookings/bookings.service.test.ts" \
  && echo "OK  7/26 bookings.service.test.ts" || echo "FAILED  bookings.service.test.ts"

curl -L -o src/modules/bookings/bookings.service.ts "$BASE/src/modules/bookings/bookings.service.ts" \
  && echo "OK  8/26 bookings.service.ts" || echo "FAILED  bookings.service.ts"

curl -L -o src/modules/calendar/calendar.controller.ts "$BASE/src/modules/calendar/calendar.controller.ts" \
  && echo "OK  9/26 calendar.controller.ts" || echo "FAILED  calendar.controller.ts"

curl -L -o src/modules/calendar/calendar.service.test.ts "$BASE/src/modules/calendar/calendar.service.test.ts" \
  && echo "OK 10/26 calendar.service.test.ts" || echo "FAILED  calendar.service.test.ts"

curl -L -o src/modules/calendar/calendar.service.ts "$BASE/src/modules/calendar/calendar.service.ts" \
  && echo "OK 11/26 calendar.service.ts" || echo "FAILED  calendar.service.ts"

curl -L -o src/modules/invoices/invoices.controller.ts "$BASE/src/modules/invoices/invoices.controller.ts" \
  && echo "OK 12/26 invoices.controller.ts" || echo "FAILED  invoices.controller.ts"

curl -L -o src/modules/invoices/invoices.service.test.ts "$BASE/src/modules/invoices/invoices.service.test.ts" \
  && echo "OK 13/26 invoices.service.test.ts" || echo "FAILED  invoices.service.test.ts"

curl -L -o src/modules/invoices/invoices.service.ts "$BASE/src/modules/invoices/invoices.service.ts" \
  && echo "OK 14/26 invoices.service.ts" || echo "FAILED  invoices.service.ts"

curl -L -o src/modules/notifications/notifications.controller.ts "$BASE/src/modules/notifications/notifications.controller.ts" \
  && echo "OK 15/26 notifications.controller.ts" || echo "FAILED  notifications.controller.ts"

curl -L -o src/modules/notifications/notifications.service.test.ts "$BASE/src/modules/notifications/notifications.service.test.ts" \
  && echo "OK 16/26 notifications.service.test.ts" || echo "FAILED  notifications.service.test.ts"

curl -L -o src/modules/notifications/notifications.service.ts "$BASE/src/modules/notifications/notifications.service.ts" \
  && echo "OK 17/26 notifications.service.ts" || echo "FAILED  notifications.service.ts"

curl -L -o src/modules/public/public.test.ts "$BASE/src/modules/public/public.test.ts" \
  && echo "OK 18/26 public.test.ts" || echo "FAILED  public.test.ts"

curl -L -o src/modules/quotes/quotes.controller.ts "$BASE/src/modules/quotes/quotes.controller.ts" \
  && echo "OK 19/26 quotes.controller.ts" || echo "FAILED  quotes.controller.ts"

curl -L -o src/modules/quotes/quotes.service.test.ts "$BASE/src/modules/quotes/quotes.service.test.ts" \
  && echo "OK 20/26 quotes.service.test.ts" || echo "FAILED  quotes.service.test.ts"

curl -L -o src/modules/quotes/quotes.service.ts "$BASE/src/modules/quotes/quotes.service.ts" \
  && echo "OK 21/26 quotes.service.ts" || echo "FAILED  quotes.service.ts"

curl -L -o src/modules/social/social.test.ts "$BASE/src/modules/social/social.test.ts" \
  && echo "OK 22/26 social.test.ts" || echo "FAILED  social.test.ts"

curl -L -o src/modules/waitlist/waitlist.controller.ts "$BASE/src/modules/waitlist/waitlist.controller.ts" \
  && echo "OK 23/26 waitlist.controller.ts" || echo "FAILED  waitlist.controller.ts"

curl -L -o src/modules/waitlist/waitlist.service.test.ts "$BASE/src/modules/waitlist/waitlist.service.test.ts" \
  && echo "OK 24/26 waitlist.service.test.ts" || echo "FAILED  waitlist.service.test.ts"

curl -L -o src/modules/waitlist/waitlist.service.ts "$BASE/src/modules/waitlist/waitlist.service.ts" \
  && echo "OK 25/26 waitlist.service.ts" || echo "FAILED  waitlist.service.ts"

curl -L -o src/modules/whatsapp/whatsapp.queue.ts "$BASE/src/modules/whatsapp/whatsapp.queue.ts" \
  && echo "OK 26/26 whatsapp.queue.ts" || echo "FAILED  whatsapp.queue.ts"
```

---

## Step 5 — Install dependencies

```bash
cd ~/Desktop/Automation/backend
npm install
```

> If Docker is required for PostgreSQL / Redis:
> ```bash
> cd ~/Desktop/Automation
> docker compose up -d
> ```

Then regenerate the Prisma client and run migrations:

```bash
cd ~/Desktop/Automation/backend
npx prisma generate
npx prisma migrate dev
```

---

## Step 6 — Run tests

```bash
cd ~/Desktop/Automation/backend
npm test
```

If TypeScript type checking is needed:

```bash
npx tsc --noEmit
```

---

## Expected Output After Step 6 (`npm test`)

A successful run should look like:

```text
Test Suites: 100 passed, 100 total
Tests:       1754 passed, 1754 total
Snapshots:   0 total
Time:        <varies>
Ran all test suites.
```

> **Note (BUG 1 — Test Count Discrepancy):**
> The `bugsphase.md` baseline documents **1756 tests** across 100 suites.
> The current HEAD produces **1754 tests** across 100 suites — 2 tests are
> missing (see BUG 1 in `LastAudits.md` for details). If your test count
> differs from the value above, it may indicate an additional regression or
> a partial fix for BUG 1. Please report any mismatch.

**Common failure signals to watch for:**

- Any line starting with `FAIL` (e.g., `FAIL src/modules/bookings/bookings.test.ts`) — indicates a failing test suite.
- Non-zero exit code from `npm test` — the process exits with code 1 on any test failure.
- `"Jest did not exit one second after the test run has completed"` — usually means an open handle (DB connection, Redis client, or timer) was not cleaned up in a test's `afterAll`.
