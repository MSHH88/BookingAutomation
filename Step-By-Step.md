# Step-By-Step Guide — LastAudits BUG 1–BUG 13

> **Source of truth:** `LastAudits.md` (BUG 1 through BUG 13) — **only**.
> **Branch:** `copilot/create-detailed-automation-plan`
> **Owner/Repo:** `MSHH88/BookingAutomation`
> **Total files:** 3 new + 26 modified = **29 backend files**

---

## ⚠️ IMPORTANT — How to copy commands from this guide

> **DO NOT copy from GitHub's rendered HTML page.** GitHub renders `&&` as
> `&amp;&amp;` in the raw HTML, and pasting that into your terminal gives you the
> `cmdand cmdor dquote>` error you saw.
>
> **Instead:** Click the **Raw** button at the top-right of this file on GitHub,
> then copy from the raw text view. Or use the copy button on each code block.
>
> **All commands below have been rewritten to avoid `&&` and `||` entirely**
> so they will work even if GitHub mangles them.

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
   silently or you copied from GitHub's rendered HTML. **Always copy from the
   Raw view or use the commands below exactly.**
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
rmdir prisma/migrations/20260415000001_email_template_tenant_key_unique 2>/dev/null; true
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

> These commands use a helper function `dl` that does NOT use `&&` or `||`,
> so they are safe to paste from GitHub.

```bash
cd ~/Desktop/Automation/backend

B="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

dl() {
  curl -sfL -o "$1" "$B/$1"
  if [ $? -eq 0 ]; then echo "OK  $2 $3"; else echo "FAILED $2 $3"; fi
}

dl "prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql" " 1/29" "migration.sql"
dl "prisma/schema.prisma"                                        " 2/29" "schema.prisma"
dl "src/config/businessType.ts"                                  " 3/29" "businessType.ts"
dl "src/jobs/ai-suggestion.job.test.ts"                          " 4/29" "ai-suggestion.job.test.ts (NEW TEST)"
dl "src/jobs/ai-suggestion.job.ts"                               " 5/29" "ai-suggestion.job.ts"
dl "src/jobs/invoice-overdue.job.ts"                             " 6/29" "invoice-overdue.job.ts"
dl "src/lib/notification-dispatcher.ts"                          " 7/29" "notification-dispatcher.ts"
dl "src/modules/bookings/bookings.controller.ts"                 " 8/29" "bookings.controller.ts"
dl "src/modules/bookings/bookings.service.test.ts"               " 9/29" "bookings.service.test.ts (UPDATED TESTS)"
dl "src/modules/bookings/bookings.service.ts"                    "10/29" "bookings.service.ts"
dl "src/modules/calendar/calendar.controller.ts"                 "11/29" "calendar.controller.ts"
dl "src/modules/calendar/calendar.service.test.ts"               "12/29" "calendar.service.test.ts (UPDATED TESTS)"
dl "src/modules/calendar/calendar.service.ts"                    "13/29" "calendar.service.ts"
dl "src/modules/invoices/invoices.controller.ts"                 "14/29" "invoices.controller.ts"
dl "src/modules/invoices/invoices.service.test.ts"               "15/29" "invoices.service.test.ts (UPDATED TESTS)"
dl "src/modules/invoices/invoices.service.ts"                    "16/29" "invoices.service.ts"
dl "src/modules/notifications/notifications.controller.ts"       "17/29" "notifications.controller.ts"
dl "src/modules/notifications/notifications.service.test.ts"     "18/29" "notifications.service.test.ts (UPDATED TESTS)"
dl "src/modules/notifications/notifications.service.ts"          "19/29" "notifications.service.ts"
dl "src/modules/public/public.test.ts"                           "20/29" "public.test.ts (UPDATED TESTS)"
dl "src/modules/quotes/quotes.controller.ts"                     "21/29" "quotes.controller.ts"
dl "src/modules/quotes/quotes.service.test.ts"                   "22/29" "quotes.service.test.ts (UPDATED TESTS)"
dl "src/modules/quotes/quotes.service.ts"                        "23/29" "quotes.service.ts"
dl "src/modules/social/social.test.ts"                           "24/29" "social.test.ts (UPDATED TESTS)"
dl "src/modules/waitlist/waitlist.controller.ts"                 "25/29" "waitlist.controller.ts"
dl "src/modules/waitlist/waitlist.service.test.ts"               "26/29" "waitlist.service.test.ts (UPDATED TESTS)"
dl "src/modules/waitlist/waitlist.service.ts"                    "27/29" "waitlist.service.ts"
dl "src/modules/whatsapp/whatsapp.queue.test.ts"                 "28/29" "whatsapp.queue.test.ts (NEW TEST)"
dl "src/modules/whatsapp/whatsapp.queue.ts"                      "29/29" "whatsapp.queue.ts"
```

**After running:** You should see `OK` for all 29 lines. If ANY line says `FAILED`, that file was not downloaded — re-run that specific `dl` line.

---

## Step 4 — Verify the 2 NEW test files exist

> These commands do NOT use `&&` or `||` so they are safe to paste anywhere.

```bash
cd ~/Desktop/Automation/backend
echo "--- Checking new test files ---"
if [ -f src/jobs/ai-suggestion.job.test.ts ]; then echo "EXISTS: ai-suggestion.job.test.ts"; else echo "MISSING: ai-suggestion.job.test.ts"; fi
if [ -f src/modules/whatsapp/whatsapp.queue.test.ts ]; then echo "EXISTS: whatsapp.queue.test.ts"; else echo "MISSING: whatsapp.queue.test.ts"; fi
echo "--- Done ---"
```

Both must say `EXISTS`. If either says `MISSING`, the download failed — go back to Step 3 and re-run the `dl` line for that file. You will stay at 100 suites until both new test files are present.

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

All commands in this guide have been rewritten to avoid `&&` and `||` so this
should no longer happen.
