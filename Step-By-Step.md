# Step-By-Step Guide — LastAudits BUG 1–BUG 13

> **Source of truth:** `LastAudits.md` (BUG 1 through BUG 13) — **only**.
> **Branch:** `copilot/create-detailed-automation-plan`
> **Owner/Repo:** `MSHH88/BookingAutomation`
> **Total files:** 3 new + 26 modified = **29 backend files**

---

## Why you got 100 suites / 1754 instead of 102 / 1821

The BUG 1–13 fixes introduced **2 brand-new test files** (adding 2 new test suites)
and **added new `it()` test cases to 8 existing test files**. If you still see
100/1754, it means either:

1. **The 2 new test files were never downloaded** — `ai-suggestion.job.test.ts`
   and `whatsapp.queue.test.ts` are NEW files that did not exist before.
   If your delete step only deleted files that already existed, these were never
   created. **You must run ALL the curl commands below, including the new files.**
2. **The 8 modified test files still have old content** — the curls either failed
   silently or you copied from GitHub's rendered HTML (which mangles `&&` into
   `&amp;&amp;`). **Always copy from the Raw view or use the commands below exactly.**
3. **You ran the curls from a wrong directory** — all commands assume you are in
   `~/Desktop/Automation/backend`. If you were one level up, files went to wrong paths.

### New test files (2 new suites — this is what takes you from 100 → 102):

| File | BUG | New `it()` tests |
|------|-----|------------------|
| `src/jobs/ai-suggestion.job.test.ts` | BUG 13 | 3 |
| `src/modules/whatsapp/whatsapp.queue.test.ts` | BUG 3 | 3 |

### Modified test files (8 files with additional tests — this bumps 1754 → 1821):

| File | BUG(s) | What changed |
|------|--------|-------------|
| `src/modules/bookings/bookings.service.test.ts` | BUG 4 | +tenant isolation tests |
| `src/modules/calendar/calendar.service.test.ts` | BUG 9 | +tenant isolation tests |
| `src/modules/invoices/invoices.service.test.ts` | BUG 5, 7 | +tenant isolation tests |
| `src/modules/notifications/notifications.service.test.ts` | BUG 10, 12 | +tenant-scoped email tests |
| `src/modules/public/public.test.ts` | BUG 4 | +updated booking signature tests |
| `src/modules/quotes/quotes.service.test.ts` | BUG 8 | +tenant isolation tests |
| `src/modules/social/social.test.ts` | BUG 4 | +updated booking signature tests |
| `src/modules/waitlist/waitlist.service.test.ts` | BUG 6, 11 | +tenant isolation tests |

---

## Complete File Register (ALL 29 files)

### New Files (3)

| # | Path | BUG |
|---|------|-----|
| 1 | `backend/prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql` | BUG 12 |
| 2 | `backend/src/jobs/ai-suggestion.job.test.ts` | BUG 13 (NEW TEST FILE) |
| 3 | `backend/src/modules/whatsapp/whatsapp.queue.test.ts` | BUG 3 (NEW TEST FILE) |

### Modified Files (26)

| # | Path | BUG(s) |
|---|------|--------|
| 1 | `backend/prisma/schema.prisma` | BUG 6, 11, 12 |
| 2 | `backend/src/config/businessType.ts` | BUG 2 |
| 3 | `backend/src/jobs/ai-suggestion.job.ts` | BUG 13 |
| 4 | `backend/src/jobs/invoice-overdue.job.ts` | BUG 5 |
| 5 | `backend/src/lib/notification-dispatcher.ts` | BUG 2, 12 |
| 6 | `backend/src/modules/bookings/bookings.controller.ts` | BUG 4 |
| 7 | `backend/src/modules/bookings/bookings.service.test.ts` | BUG 4 (UPDATED TESTS) |
| 8 | `backend/src/modules/bookings/bookings.service.ts` | BUG 4 |
| 9 | `backend/src/modules/calendar/calendar.controller.ts` | BUG 9 |
| 10 | `backend/src/modules/calendar/calendar.service.test.ts` | BUG 9 (UPDATED TESTS) |
| 11 | `backend/src/modules/calendar/calendar.service.ts` | BUG 9 |
| 12 | `backend/src/modules/invoices/invoices.controller.ts` | BUG 7 |
| 13 | `backend/src/modules/invoices/invoices.service.test.ts` | BUG 5, 7 (UPDATED TESTS) |
| 14 | `backend/src/modules/invoices/invoices.service.ts` | BUG 5, 7 |
| 15 | `backend/src/modules/notifications/notifications.controller.ts` | BUG 10 |
| 16 | `backend/src/modules/notifications/notifications.service.test.ts` | BUG 10, 12 (UPDATED TESTS) |
| 17 | `backend/src/modules/notifications/notifications.service.ts` | BUG 10, 12 |
| 18 | `backend/src/modules/public/public.test.ts` | BUG 4 (UPDATED TESTS) |
| 19 | `backend/src/modules/quotes/quotes.controller.ts` | BUG 8 |
| 20 | `backend/src/modules/quotes/quotes.service.test.ts` | BUG 8 (UPDATED TESTS) |
| 21 | `backend/src/modules/quotes/quotes.service.ts` | BUG 8 |
| 22 | `backend/src/modules/social/social.test.ts` | BUG 4 (UPDATED TESTS) |
| 23 | `backend/src/modules/waitlist/waitlist.controller.ts` | BUG 6 |
| 24 | `backend/src/modules/waitlist/waitlist.service.test.ts` | BUG 6, 11 (UPDATED TESTS) |
| 25 | `backend/src/modules/waitlist/waitlist.service.ts` | BUG 6, 11 |
| 26 | `backend/src/modules/whatsapp/whatsapp.queue.ts` | BUG 3 |

---

## Step 1 — Delete ALL 29 files (reset local)

Run from `~/Desktop/Automation/backend`:

```bash
cd ~/Desktop/Automation/backend
rm -f prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql
rm -f prisma/schema.prisma
rm -f src/config/businessType.ts
rm -f src/jobs/ai-suggestion.job.test.ts
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
rm -f src/modules/whatsapp/whatsapp.queue.test.ts
rm -f src/modules/whatsapp/whatsapp.queue.ts
rmdir --ignore-fail-on-non-empty "prisma/migrations/20260415000001_email_template_tenant_key_unique" || true
```

---

## Step 2 — Create directories

```bash
cd ~/Desktop/Automation/backend
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

## Step 3 — Download ALL 29 files

**IMPORTANT:** Run from `~/Desktop/Automation/backend`. Copy-paste this ENTIRE block at once.

```bash
cd ~/Desktop/Automation/backend
curl -sfL -o prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql" && echo "OK  1/29 migration.sql" || echo "FAILED 1/29 migration.sql"
curl -sfL -o prisma/schema.prisma "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/schema.prisma" && echo "OK  2/29 schema.prisma" || echo "FAILED 2/29 schema.prisma"
curl -sfL -o src/config/businessType.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/config/businessType.ts" && echo "OK  3/29 businessType.ts" || echo "FAILED 3/29 businessType.ts"
curl -sfL -o src/jobs/ai-suggestion.job.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/jobs/ai-suggestion.job.test.ts" && echo "OK  4/29 ai-suggestion.job.test.ts (NEW TEST)" || echo "FAILED 4/29 ai-suggestion.job.test.ts"
curl -sfL -o src/jobs/ai-suggestion.job.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/jobs/ai-suggestion.job.ts" && echo "OK  5/29 ai-suggestion.job.ts" || echo "FAILED 5/29 ai-suggestion.job.ts"
curl -sfL -o src/jobs/invoice-overdue.job.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/jobs/invoice-overdue.job.ts" && echo "OK  6/29 invoice-overdue.job.ts" || echo "FAILED 6/29 invoice-overdue.job.ts"
curl -sfL -o src/lib/notification-dispatcher.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/notification-dispatcher.ts" && echo "OK  7/29 notification-dispatcher.ts" || echo "FAILED 7/29 notification-dispatcher.ts"
curl -sfL -o src/modules/bookings/bookings.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.controller.ts" && echo "OK  8/29 bookings.controller.ts" || echo "FAILED 8/29 bookings.controller.ts"
curl -sfL -o src/modules/bookings/bookings.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.test.ts" && echo "OK  9/29 bookings.service.test.ts (UPDATED TESTS)" || echo "FAILED 9/29 bookings.service.test.ts"
curl -sfL -o src/modules/bookings/bookings.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.ts" && echo "OK 10/29 bookings.service.ts" || echo "FAILED 10/29 bookings.service.ts"
curl -sfL -o src/modules/calendar/calendar.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/calendar.controller.ts" && echo "OK 11/29 calendar.controller.ts" || echo "FAILED 11/29 calendar.controller.ts"
curl -sfL -o src/modules/calendar/calendar.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/calendar.service.test.ts" && echo "OK 12/29 calendar.service.test.ts (UPDATED TESTS)" || echo "FAILED 12/29 calendar.service.test.ts"
curl -sfL -o src/modules/calendar/calendar.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/calendar.service.ts" && echo "OK 13/29 calendar.service.ts" || echo "FAILED 13/29 calendar.service.ts"
curl -sfL -o src/modules/invoices/invoices.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/invoices/invoices.controller.ts" && echo "OK 14/29 invoices.controller.ts" || echo "FAILED 14/29 invoices.controller.ts"
curl -sfL -o src/modules/invoices/invoices.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/invoices/invoices.service.test.ts" && echo "OK 15/29 invoices.service.test.ts (UPDATED TESTS)" || echo "FAILED 15/29 invoices.service.test.ts"
curl -sfL -o src/modules/invoices/invoices.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/invoices/invoices.service.ts" && echo "OK 16/29 invoices.service.ts" || echo "FAILED 16/29 invoices.service.ts"
curl -sfL -o src/modules/notifications/notifications.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/notifications/notifications.controller.ts" && echo "OK 17/29 notifications.controller.ts" || echo "FAILED 17/29 notifications.controller.ts"
curl -sfL -o src/modules/notifications/notifications.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/notifications/notifications.service.test.ts" && echo "OK 18/29 notifications.service.test.ts (UPDATED TESTS)" || echo "FAILED 18/29 notifications.service.test.ts"
curl -sfL -o src/modules/notifications/notifications.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/notifications/notifications.service.ts" && echo "OK 19/29 notifications.service.ts" || echo "FAILED 19/29 notifications.service.ts"
curl -sfL -o src/modules/public/public.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/public/public.test.ts" && echo "OK 20/29 public.test.ts (UPDATED TESTS)" || echo "FAILED 20/29 public.test.ts"
curl -sfL -o src/modules/quotes/quotes.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.controller.ts" && echo "OK 21/29 quotes.controller.ts" || echo "FAILED 21/29 quotes.controller.ts"
curl -sfL -o src/modules/quotes/quotes.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.service.test.ts" && echo "OK 22/29 quotes.service.test.ts (UPDATED TESTS)" || echo "FAILED 22/29 quotes.service.test.ts"
curl -sfL -o src/modules/quotes/quotes.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.service.ts" && echo "OK 23/29 quotes.service.ts" || echo "FAILED 23/29 quotes.service.ts"
curl -sfL -o src/modules/social/social.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/social/social.test.ts" && echo "OK 24/29 social.test.ts (UPDATED TESTS)" || echo "FAILED 24/29 social.test.ts"
curl -sfL -o src/modules/waitlist/waitlist.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.controller.ts" && echo "OK 25/29 waitlist.controller.ts" || echo "FAILED 25/29 waitlist.controller.ts"
curl -sfL -o src/modules/waitlist/waitlist.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.service.test.ts" && echo "OK 26/29 waitlist.service.test.ts (UPDATED TESTS)" || echo "FAILED 26/29 waitlist.service.test.ts"
curl -sfL -o src/modules/waitlist/waitlist.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.service.ts" && echo "OK 27/29 waitlist.service.ts" || echo "FAILED 27/29 waitlist.service.ts"
curl -sfL -o src/modules/whatsapp/whatsapp.queue.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/whatsapp/whatsapp.queue.test.ts" && echo "OK 28/29 whatsapp.queue.test.ts (NEW TEST)" || echo "FAILED 28/29 whatsapp.queue.test.ts"
curl -sfL -o src/modules/whatsapp/whatsapp.queue.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/whatsapp/whatsapp.queue.ts" && echo "OK 29/29 whatsapp.queue.ts" || echo "FAILED 29/29 whatsapp.queue.ts"
```

**After running:** You should see `OK` for all 29 lines. If ANY line says `FAILED`, that file was not downloaded — re-run that specific curl command.

---

## Step 4 — Verify the 2 NEW test files exist

```bash
cd ~/Desktop/Automation/backend
ls -la src/jobs/ai-suggestion.job.test.ts && echo "EXISTS" || echo "MISSING!"
ls -la src/modules/whatsapp/whatsapp.queue.test.ts && echo "EXISTS" || echo "MISSING!"
```

Both must say `EXISTS`. If either says `MISSING!`, the download failed and you'll stay at 100 suites.

---

## Step 5 — Install dependencies and migrate

```bash
cd ~/Desktop/Automation/backend
npm install
npx prisma generate
npx prisma migrate dev
```

> If Docker is required for PostgreSQL / Redis:
> ```bash
> cd ~/Desktop/Automation
> docker compose up -d
> ```

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

## Expected Output After Step 6

```text
Test Suites: 102 passed, 102 total
Tests:       1821 passed, 1821 total
Snapshots:   0 total
Time:        <varies>
Ran all test suites.
```

**Key checkpoints:**
- **102 suites** (was 100) — the 2 new test files add 2 suites
- **1821 tests** (was 1754) — 67 new `it()` test cases across 10 test files
- If you see 100 suites → the 2 new test files are missing (re-run Step 3)
- If you see 102 suites but ~1754 tests → the 8 modified test files have old content (re-run Step 3)

**Common failure signals:**
- Any line starting with `FAIL` — a failing test suite
- Non-zero exit code from `npm test`
- `"Jest did not exit one second after…"` — open handle not cleaned up in `afterAll`
