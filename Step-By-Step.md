# Step-By-Step Guide — LastAudits BUG 1–BUG 13

> **Source of truth:** `LastAudits.md` (BUG 1 through BUG 13) — **only**.
> **Branch:** `copilot/create-detailed-automation-plan`
> **Total files:** 1 new + 21 modified = 22 backend files.

---

## Definitive File Lists

### New Files (1)

| # | Path | Origin |
|---|------|--------|
| 1 | `backend/prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql` | BUG 12 (EmailTemplate `@@unique([tenantId, key])` migration) |

### Modified Files (21)

| # | Path | BUG(s) |
|---|------|--------|
| 1 | `backend/prisma/schema.prisma` | BUG 6, 11, 12 |
| 2 | `backend/src/config/businessType.ts` | BUG 2 |
| 3 | `backend/src/jobs/ai-suggestion.job.ts` | BUG 13 |
| 4 | `backend/src/jobs/invoice-overdue.job.ts` | BUG 5 |
| 5 | `backend/src/lib/notification-dispatcher.ts` | BUG 2, 12 |
| 6 | `backend/src/modules/bookings/bookings.controller.ts` | BUG 4 |
| 7 | `backend/src/modules/bookings/bookings.service.ts` | BUG 4 |
| 8 | `backend/src/modules/calendar/calendar.controller.ts` | BUG 9 |
| 9 | `backend/src/modules/calendar/calendar.service.ts` | BUG 9 |
| 10 | `backend/src/modules/invoices/invoices.controller.ts` | BUG 7 |
| 11 | `backend/src/modules/invoices/invoices.service.ts` | BUG 5, 7 |
| 12 | `backend/src/modules/notifications/notifications.controller.ts` | BUG 10 |
| 13 | `backend/src/modules/notifications/notifications.service.ts` | BUG 10, 12 |
| 14 | `backend/src/modules/quotes/quotes.controller.ts` | BUG 8 |
| 15 | `backend/src/modules/quotes/quotes.service.ts` | BUG 8 |
| 16 | `backend/src/modules/sessions/sessions.test.ts` | BUG 1 |
| 17 | `backend/src/modules/waitlist/waitlist.controller.ts` | BUG 6 |
| 18 | `backend/src/modules/waitlist/waitlist.service.ts` | BUG 6, 11 |
| 19 | `backend/src/modules/whatsapp/whatsapp.queue.ts` | BUG 3 |
| 20 | `backend/src/modules/whatsapp-templates/whatsapp-templates.service.ts` | BUG 3 |
| 21 | `backend/src/modules/whatsapp-templates/whatsapp-templates.routes.ts` | BUG 3 |

---

## Step 1 — Delete (reset local files)

Run from `~/Desktop/Automation/backend`:

```bash
# --- New files (1) ---
rm -f prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql

# --- Modified files (21) ---
rm -f prisma/schema.prisma
rm -f src/config/businessType.ts
rm -f src/jobs/ai-suggestion.job.ts
rm -f src/jobs/invoice-overdue.job.ts
rm -f src/lib/notification-dispatcher.ts
rm -f src/modules/bookings/bookings.controller.ts
rm -f src/modules/bookings/bookings.service.ts
rm -f src/modules/calendar/calendar.controller.ts
rm -f src/modules/calendar/calendar.service.ts
rm -f src/modules/invoices/invoices.controller.ts
rm -f src/modules/invoices/invoices.service.ts
rm -f src/modules/notifications/notifications.controller.ts
rm -f src/modules/notifications/notifications.service.ts
rm -f src/modules/quotes/quotes.controller.ts
rm -f src/modules/quotes/quotes.service.ts
rm -f src/modules/sessions/sessions.test.ts
rm -f src/modules/waitlist/waitlist.controller.ts
rm -f src/modules/waitlist/waitlist.service.ts
rm -f src/modules/whatsapp/whatsapp.queue.ts
rm -f src/modules/whatsapp-templates/whatsapp-templates.service.ts
rm -f src/modules/whatsapp-templates/whatsapp-templates.routes.ts

# --- Clean up empty migration directory (new files only) ---
rmdir --ignore-fail-on-non-empty prisma/migrations/20260415000001_email_template_tenant_key_unique 2>/dev/null
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
mkdir -p src/modules/quotes
mkdir -p src/modules/sessions
mkdir -p src/modules/waitlist
mkdir -p src/modules/whatsapp
mkdir -p src/modules/whatsapp-templates
```

---

## Step 3 — Download NEW files (1 new file)

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"
```

```bash
curl -L -o prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql \
  "$BASE/prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql" \
  && echo "OK  migration (email_template_tenant_key_unique)" \
  || echo "FAILED  migration (email_template_tenant_key_unique)"
```

---

## Step 4 — Download CHANGED files (21 modified files)

Use the same `$BASE` variable set in Step 3.

```bash
curl -L -o prisma/schema.prisma "$BASE/prisma/schema.prisma" \
  && echo "OK  prisma/schema.prisma" || echo "FAILED  prisma/schema.prisma"

curl -L -o src/config/businessType.ts "$BASE/src/config/businessType.ts" \
  && echo "OK  businessType.ts" || echo "FAILED  businessType.ts"

curl -L -o src/jobs/ai-suggestion.job.ts "$BASE/src/jobs/ai-suggestion.job.ts" \
  && echo "OK  ai-suggestion.job.ts" || echo "FAILED  ai-suggestion.job.ts"

curl -L -o src/jobs/invoice-overdue.job.ts "$BASE/src/jobs/invoice-overdue.job.ts" \
  && echo "OK  invoice-overdue.job.ts" || echo "FAILED  invoice-overdue.job.ts"

curl -L -o src/lib/notification-dispatcher.ts "$BASE/src/lib/notification-dispatcher.ts" \
  && echo "OK  notification-dispatcher.ts" || echo "FAILED  notification-dispatcher.ts"

curl -L -o src/modules/bookings/bookings.controller.ts "$BASE/src/modules/bookings/bookings.controller.ts" \
  && echo "OK  bookings.controller.ts" || echo "FAILED  bookings.controller.ts"

curl -L -o src/modules/bookings/bookings.service.ts "$BASE/src/modules/bookings/bookings.service.ts" \
  && echo "OK  bookings.service.ts" || echo "FAILED  bookings.service.ts"

curl -L -o src/modules/calendar/calendar.controller.ts "$BASE/src/modules/calendar/calendar.controller.ts" \
  && echo "OK  calendar.controller.ts" || echo "FAILED  calendar.controller.ts"

curl -L -o src/modules/calendar/calendar.service.ts "$BASE/src/modules/calendar/calendar.service.ts" \
  && echo "OK  calendar.service.ts" || echo "FAILED  calendar.service.ts"

curl -L -o src/modules/invoices/invoices.controller.ts "$BASE/src/modules/invoices/invoices.controller.ts" \
  && echo "OK  invoices.controller.ts" || echo "FAILED  invoices.controller.ts"

curl -L -o src/modules/invoices/invoices.service.ts "$BASE/src/modules/invoices/invoices.service.ts" \
  && echo "OK  invoices.service.ts" || echo "FAILED  invoices.service.ts"

curl -L -o src/modules/notifications/notifications.controller.ts "$BASE/src/modules/notifications/notifications.controller.ts" \
  && echo "OK  notifications.controller.ts" || echo "FAILED  notifications.controller.ts"

curl -L -o src/modules/notifications/notifications.service.ts "$BASE/src/modules/notifications/notifications.service.ts" \
  && echo "OK  notifications.service.ts" || echo "FAILED  notifications.service.ts"

curl -L -o src/modules/quotes/quotes.controller.ts "$BASE/src/modules/quotes/quotes.controller.ts" \
  && echo "OK  quotes.controller.ts" || echo "FAILED  quotes.controller.ts"

curl -L -o src/modules/quotes/quotes.service.ts "$BASE/src/modules/quotes/quotes.service.ts" \
  && echo "OK  quotes.service.ts" || echo "FAILED  quotes.service.ts"

curl -L -o src/modules/sessions/sessions.test.ts "$BASE/src/modules/sessions/sessions.test.ts" \
  && echo "OK  sessions.test.ts" || echo "FAILED  sessions.test.ts"

curl -L -o src/modules/waitlist/waitlist.controller.ts "$BASE/src/modules/waitlist/waitlist.controller.ts" \
  && echo "OK  waitlist.controller.ts" || echo "FAILED  waitlist.controller.ts"

curl -L -o src/modules/waitlist/waitlist.service.ts "$BASE/src/modules/waitlist/waitlist.service.ts" \
  && echo "OK  waitlist.service.ts" || echo "FAILED  waitlist.service.ts"

curl -L -o src/modules/whatsapp/whatsapp.queue.ts "$BASE/src/modules/whatsapp/whatsapp.queue.ts" \
  && echo "OK  whatsapp.queue.ts" || echo "FAILED  whatsapp.queue.ts"

curl -L -o src/modules/whatsapp-templates/whatsapp-templates.service.ts "$BASE/src/modules/whatsapp-templates/whatsapp-templates.service.ts" \
  && echo "OK  whatsapp-templates.service.ts" || echo "FAILED  whatsapp-templates.service.ts"

curl -L -o src/modules/whatsapp-templates/whatsapp-templates.routes.ts "$BASE/src/modules/whatsapp-templates/whatsapp-templates.routes.ts" \
  && echo "OK  whatsapp-templates.routes.ts" || echo "FAILED  whatsapp-templates.routes.ts"
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
