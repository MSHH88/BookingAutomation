# Step-By-Step Guide — Full Test Sync

---

## 🔧 Latest fix — PR: fix(tests): restore green + fix step-by-step guide completeness (2026-04-19)

### What was failing (6 tests across 3 suites)

| Suite | Test | Root Cause |
|---|---|---|
| `pricing.test.ts` | GET /api/pricing-rules — returns empty list | `pricingRule.count` not mocked; `paginate()` calls `.count()` + `.findMany()` → TypeError |
| `pricing.test.ts` | GET /api/pricing-rules — returns list of rules | same as above |
| `locations.test.ts` | GET /api/locations — returns empty list | `location.count` not mocked; same `paginate()` issue |
| `locations.test.ts` | GET /api/locations — returns list of locations | same as above |
| `locations.test.ts` | GET /api/locations — filters by isActive=true | same as above |
| `public.test.ts` | POST /api/public/businesses/:slug/bookings — 201 creates booking | `$transaction` mock returned `undefined`; service accessed `booking.id` → TypeError |

### What was fixed

- **`pricing.test.ts`** — added `mockRuleCount = jest.fn()` + `count` entry in prisma mock; added `mockRuleCount.mockResolvedValue(N)` in each GET list test
- **`locations.test.ts`** — added `mockLocationCount = jest.fn()` + `count` entry in prisma mock; added `mockLocationCount.mockResolvedValue(N)` in each GET list test  
- **`public.test.ts`** — added `booking.findFirst` to mock (needed inside `$transaction` callback for conflict check); wired `$transaction` to call its callback: `mockImplementation((cb) => cb(prisma))`

### Commit SHA

`4f4c3f0` — fix(tests): fix 6 failing tests across 3 suites

---

## ⚡ Quick fix — download only the 3 modified test files

> Use this if you previously ran the full guide and just need to apply the latest test fixes.

**Step A — Delete the 3 old test files:**

```bash
cd ~/Desktop/Automation/backend && \
rm -f \
  src/modules/pricing/pricing.test.ts \
  src/modules/locations/locations.test.ts \
  src/modules/public/public.test.ts \
&& echo "3 OLD TEST FILES DELETED"
```

**Step B — Ensure target directories exist:**

```bash
mkdir -p \
  src/modules/pricing \
  src/modules/locations \
  src/modules/public
```

**Step C — Download the 3 fixed test files:**

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

curl -fsSL --create-dirs -o src/modules/pricing/pricing.test.ts   "$BASE/src/modules/pricing/pricing.test.ts"   && echo "OK 1/3 pricing.test.ts"   || echo "FAIL 1/3 pricing.test.ts"
curl -fsSL --create-dirs -o src/modules/locations/locations.test.ts "$BASE/src/modules/locations/locations.test.ts" && echo "OK 2/3 locations.test.ts" || echo "FAIL 2/3 locations.test.ts"
curl -fsSL --create-dirs -o src/modules/public/public.test.ts      "$BASE/src/modules/public/public.test.ts"      && echo "OK 3/3 public.test.ts"    || echo "FAIL 3/3 public.test.ts"
```

**Step D — Run tests:**

```bash
npm test -- --no-coverage --forceExit
```

Expected: **102 suites / 1821 tests / 0 failures**.

---

> **Guide hotfix: single-command delete + single-curl download for all 102 test files (2026-04-19)**
>
> **Branch:** `copilot/create-detailed-automation-plan`
> **Owner/Repo:** `MSHH88/BookingAutomation`
> **Goal:** Nuke every local test file and re-download all 102 from the repo so your local copy is 100 % identical to the branch.

---

## What this guide fixes

The previous guide only replaced 6 test files, leaving older copies of the remaining 96 on your machine.  
Running those older copies produced **1809 tests / 40 failures** instead of the expected **1821 tests / 0 failures**.  
This guide replaces every single test file, closing the gap.

---

## ⚡ Quick method — 2 commands (run from inside `backend/`)

> Use these two commands if you just want to nuke and re-download everything in one go.  
> Detailed steps with explanations follow below.

**Command 1 — Delete all 102 old test files:**

```bash
cd ~/Desktop/Automation/backend && \
find src -name "*.test.ts" -delete && \
echo "ALL 102 OLD TEST FILES DELETED"
```

**Command 2 — Download all 102 fresh from the repo (single curl):**

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/scripts/download-tests.sh" | bash
```

> Each file prints `OK  N/102  <path>` on success or `FAIL` on error.  
> When done you should see: `✅  All 102 test files downloaded.`

Then run:

```bash
npm test -- --no-coverage --forceExit
```

Expected: **102 suites / 1821 tests / 0 failures**.

---

## Step 1 — Navigate to your backend folder

> ⚠️ **Run this first.** Every command below uses paths relative to `backend/`.

```bash
cd ~/Desktop/Automation/backend
```

Confirm you are in the right place:

```bash
pwd
# expected: .../BookingAutomation/backend
ls package.json
# expected: package.json
```

---

## Step 2 — Delete all 102 old test files

```bash
rm -f \
  src/config/businessType.test.ts \
  src/jobs/ai-suggestion.job.test.ts \
  src/jobs/birthday.job.test.ts \
  src/jobs/no-show.job.test.ts \
  src/jobs/rebook-nudge.job.test.ts \
  src/lib/pricing-engine.test.ts \
  src/middleware/auth.test.ts \
  src/middleware/requireLeadAccess.test.ts \
  src/modules/admin/admin.service.test.ts \
  src/modules/ai/ai.service.test.ts \
  src/modules/alerts/alerts.service.test.ts \
  src/modules/alerts/alerts.test.ts \
  src/modules/analytics/analytics.service.test.ts \
  src/modules/analytics/analytics.test.ts \
  src/modules/artists/artist-media.service.test.ts \
  src/modules/artists/artists.test.ts \
  src/modules/auth/auth.service.test.ts \
  src/modules/auth/auth.test.ts \
  src/modules/availability/availability.service.test.ts \
  src/modules/availability/availability.test.ts \
  src/modules/booking-photos/booking-photos.service.test.ts \
  src/modules/booking-photos/booking-photos.test.ts \
  src/modules/bookings/bookings.service.test.ts \
  src/modules/bookings/bookings.test.ts \
  src/modules/calendar/apple-calendar.service.test.ts \
  src/modules/calendar/calendar.service.test.ts \
  src/modules/calendar/calendar.test.ts \
  src/modules/calendar/outlook-calendar.service.test.ts \
  src/modules/campaigns/campaigns.service.test.ts \
  src/modules/campaigns/campaigns.test.ts \
  src/modules/capture/capture.service.test.ts \
  src/modules/customer-stats/customer-stats.service.test.ts \
  src/modules/customer-stats/customer-stats.test.ts \
  src/modules/customers/customers.service.test.ts \
  src/modules/email-templates/email-templates.service.test.ts \
  src/modules/email-templates/email-templates.test.ts \
  src/modules/features/features.test.ts \
  src/modules/forms/forms.service.test.ts \
  src/modules/forms/forms.test.ts \
  src/modules/gift-cards/gift-cards.service.test.ts \
  src/modules/gift-cards/gift-cards.test.ts \
  src/modules/health-flags/health-flags.service.test.ts \
  src/modules/health-flags/health-flags.test.ts \
  src/modules/invoices/invoices.service.test.ts \
  src/modules/invoices/invoices.test.ts \
  src/modules/leads/leads.service.test.ts \
  src/modules/leads/leads.test.ts \
  src/modules/locations/locations.test.ts \
  src/modules/loyalty/loyalty.service.test.ts \
  src/modules/loyalty/loyalty.test.ts \
  src/modules/memberships/memberships.service.test.ts \
  src/modules/memberships/memberships.test.ts \
  src/modules/notifications/notifications.service.test.ts \
  src/modules/packages/packages.service.test.ts \
  src/modules/packages/packages.test.ts \
  src/modules/payments/payments.service.test.ts \
  src/modules/payments/payments.test.ts \
  src/modules/payroll/payroll.service.test.ts \
  src/modules/payroll/payroll.test.ts \
  src/modules/pos/pos.service.test.ts \
  src/modules/pos/pos.test.ts \
  src/modules/pricing/pricing.test.ts \
  src/modules/products/products.service.test.ts \
  src/modules/products/products.test.ts \
  src/modules/public/public.service.test.ts \
  src/modules/public/public.test.ts \
  src/modules/push/push.service.test.ts \
  src/modules/quotes/quotes.service.test.ts \
  src/modules/quotes/quotes.test.ts \
  src/modules/recurring-bookings/recurring-bookings.service.test.ts \
  src/modules/recurring-bookings/recurring-bookings.test.ts \
  src/modules/referrals/referrals.service.test.ts \
  src/modules/referrals/referrals.test.ts \
  src/modules/reminders/reminders.queue.test.ts \
  src/modules/reviews/reviews.queue.test.ts \
  src/modules/roles/roles.service.test.ts \
  src/modules/roles/roles.test.ts \
  src/modules/rota/rota.service.test.ts \
  src/modules/rota/rota.test.ts \
  src/modules/services/services.service.test.ts \
  src/modules/services/services.test.ts \
  src/modules/sessions/sessions.test.ts \
  src/modules/settings/settings.service.test.ts \
  src/modules/settings/settings.test.ts \
  src/modules/sms-templates/sms-templates.service.test.ts \
  src/modules/sms-templates/sms-templates.test.ts \
  src/modules/social/social.service.test.ts \
  src/modules/social/social.test.ts \
  src/modules/styles/styles.service.test.ts \
  src/modules/styles/styles.test.ts \
  src/modules/tables/tables.service.test.ts \
  src/modules/tenants/tenants.service.test.ts \
  src/modules/tenants/tenants.test.ts \
  src/modules/uploads/uploads.service.test.ts \
  src/modules/uploads/uploads.test.ts \
  src/modules/waitlist/waitlist.service.test.ts \
  src/modules/waitlist/waitlist.test.ts \
  src/modules/webhooks/webhooks.service.test.ts \
  src/modules/whatsapp-templates/whatsapp-templates.service.test.ts \
  src/modules/whatsapp-templates/whatsapp-templates.test.ts \
  src/modules/whatsapp/whatsapp.queue.test.ts \
  src/modules/whatsapp/whatsapp.service.test.ts \
  && echo "ALL 102 OLD TEST FILES DELETED"
```

---

## Step 3 — Ensure all target directories exist

```bash
mkdir -p \
  src/config \
  src/jobs \
  src/lib \
  src/middleware \
  src/modules/admin \
  src/modules/ai \
  src/modules/alerts \
  src/modules/analytics \
  src/modules/artists \
  src/modules/auth \
  src/modules/availability \
  src/modules/booking-photos \
  src/modules/bookings \
  src/modules/calendar \
  src/modules/campaigns \
  src/modules/capture \
  src/modules/customer-stats \
  src/modules/customers \
  src/modules/email-templates \
  src/modules/features \
  src/modules/forms \
  src/modules/gift-cards \
  src/modules/health-flags \
  src/modules/invoices \
  src/modules/leads \
  src/modules/locations \
  src/modules/loyalty \
  src/modules/memberships \
  src/modules/notifications \
  src/modules/packages \
  src/modules/payments \
  src/modules/payroll \
  src/modules/pos \
  src/modules/pricing \
  src/modules/products \
  src/modules/public \
  src/modules/push \
  src/modules/quotes \
  src/modules/recurring-bookings \
  src/modules/referrals \
  src/modules/reminders \
  src/modules/reviews \
  src/modules/roles \
  src/modules/rota \
  src/modules/services \
  src/modules/sessions \
  src/modules/settings \
  src/modules/sms-templates \
  src/modules/social \
  src/modules/styles \
  src/modules/tables \
  src/modules/tenants \
  src/modules/uploads \
  src/modules/waitlist \
  src/modules/webhooks \
  src/modules/whatsapp \
  src/modules/whatsapp-templates \
  && echo "ALL DIRECTORIES READY"
```

---

## Step 4 — Download all 102 test files from the repo

> Each `curl` uses `--create-dirs` so the directory is created automatically if somehow missing.  
> The branch is `copilot/create-detailed-automation-plan`.

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

curl -fsSL --create-dirs -o src/config/businessType.test.ts                                     "$BASE/src/config/businessType.test.ts"                                     && echo "OK  1/102" || echo "FAIL  1/102 businessType.test.ts"
curl -fsSL --create-dirs -o src/jobs/ai-suggestion.job.test.ts                                  "$BASE/src/jobs/ai-suggestion.job.test.ts"                                  && echo "OK  2/102" || echo "FAIL  2/102 ai-suggestion.job.test.ts"
curl -fsSL --create-dirs -o src/jobs/birthday.job.test.ts                                       "$BASE/src/jobs/birthday.job.test.ts"                                       && echo "OK  3/102" || echo "FAIL  3/102 birthday.job.test.ts"
curl -fsSL --create-dirs -o src/jobs/no-show.job.test.ts                                        "$BASE/src/jobs/no-show.job.test.ts"                                        && echo "OK  4/102" || echo "FAIL  4/102 no-show.job.test.ts"
curl -fsSL --create-dirs -o src/jobs/rebook-nudge.job.test.ts                                   "$BASE/src/jobs/rebook-nudge.job.test.ts"                                   && echo "OK  5/102" || echo "FAIL  5/102 rebook-nudge.job.test.ts"
curl -fsSL --create-dirs -o src/lib/pricing-engine.test.ts                                      "$BASE/src/lib/pricing-engine.test.ts"                                      && echo "OK  6/102" || echo "FAIL  6/102 pricing-engine.test.ts"
curl -fsSL --create-dirs -o src/middleware/auth.test.ts                                         "$BASE/src/middleware/auth.test.ts"                                         && echo "OK  7/102" || echo "FAIL  7/102 auth.test.ts (middleware)"
curl -fsSL --create-dirs -o src/middleware/requireLeadAccess.test.ts                            "$BASE/src/middleware/requireLeadAccess.test.ts"                            && echo "OK  8/102" || echo "FAIL  8/102 requireLeadAccess.test.ts"
curl -fsSL --create-dirs -o src/modules/admin/admin.service.test.ts                             "$BASE/src/modules/admin/admin.service.test.ts"                             && echo "OK  9/102" || echo "FAIL  9/102 admin.service.test.ts"
curl -fsSL --create-dirs -o src/modules/ai/ai.service.test.ts                                   "$BASE/src/modules/ai/ai.service.test.ts"                                   && echo "OK 10/102" || echo "FAIL 10/102 ai.service.test.ts"
curl -fsSL --create-dirs -o src/modules/alerts/alerts.service.test.ts                           "$BASE/src/modules/alerts/alerts.service.test.ts"                           && echo "OK 11/102" || echo "FAIL 11/102 alerts.service.test.ts"
curl -fsSL --create-dirs -o src/modules/alerts/alerts.test.ts                                   "$BASE/src/modules/alerts/alerts.test.ts"                                   && echo "OK 12/102" || echo "FAIL 12/102 alerts.test.ts"
curl -fsSL --create-dirs -o src/modules/analytics/analytics.service.test.ts                     "$BASE/src/modules/analytics/analytics.service.test.ts"                     && echo "OK 13/102" || echo "FAIL 13/102 analytics.service.test.ts"
curl -fsSL --create-dirs -o src/modules/analytics/analytics.test.ts                             "$BASE/src/modules/analytics/analytics.test.ts"                             && echo "OK 14/102" || echo "FAIL 14/102 analytics.test.ts"
curl -fsSL --create-dirs -o src/modules/artists/artist-media.service.test.ts                    "$BASE/src/modules/artists/artist-media.service.test.ts"                    && echo "OK 15/102" || echo "FAIL 15/102 artist-media.service.test.ts"
curl -fsSL --create-dirs -o src/modules/artists/artists.test.ts                                 "$BASE/src/modules/artists/artists.test.ts"                                 && echo "OK 16/102" || echo "FAIL 16/102 artists.test.ts"
curl -fsSL --create-dirs -o src/modules/auth/auth.service.test.ts                               "$BASE/src/modules/auth/auth.service.test.ts"                               && echo "OK 17/102" || echo "FAIL 17/102 auth.service.test.ts"
curl -fsSL --create-dirs -o src/modules/auth/auth.test.ts                                       "$BASE/src/modules/auth/auth.test.ts"                                       && echo "OK 18/102" || echo "FAIL 18/102 auth.test.ts (module)"
curl -fsSL --create-dirs -o src/modules/availability/availability.service.test.ts               "$BASE/src/modules/availability/availability.service.test.ts"               && echo "OK 19/102" || echo "FAIL 19/102 availability.service.test.ts"
curl -fsSL --create-dirs -o src/modules/availability/availability.test.ts                       "$BASE/src/modules/availability/availability.test.ts"                       && echo "OK 20/102" || echo "FAIL 20/102 availability.test.ts"
curl -fsSL --create-dirs -o src/modules/booking-photos/booking-photos.service.test.ts           "$BASE/src/modules/booking-photos/booking-photos.service.test.ts"           && echo "OK 21/102" || echo "FAIL 21/102 booking-photos.service.test.ts"
curl -fsSL --create-dirs -o src/modules/booking-photos/booking-photos.test.ts                   "$BASE/src/modules/booking-photos/booking-photos.test.ts"                   && echo "OK 22/102" || echo "FAIL 22/102 booking-photos.test.ts"
curl -fsSL --create-dirs -o src/modules/bookings/bookings.service.test.ts                       "$BASE/src/modules/bookings/bookings.service.test.ts"                       && echo "OK 23/102" || echo "FAIL 23/102 bookings.service.test.ts"
curl -fsSL --create-dirs -o src/modules/bookings/bookings.test.ts                               "$BASE/src/modules/bookings/bookings.test.ts"                               && echo "OK 24/102" || echo "FAIL 24/102 bookings.test.ts"
curl -fsSL --create-dirs -o src/modules/calendar/apple-calendar.service.test.ts                 "$BASE/src/modules/calendar/apple-calendar.service.test.ts"                 && echo "OK 25/102" || echo "FAIL 25/102 apple-calendar.service.test.ts"
curl -fsSL --create-dirs -o src/modules/calendar/calendar.service.test.ts                       "$BASE/src/modules/calendar/calendar.service.test.ts"                       && echo "OK 26/102" || echo "FAIL 26/102 calendar.service.test.ts"
curl -fsSL --create-dirs -o src/modules/calendar/calendar.test.ts                               "$BASE/src/modules/calendar/calendar.test.ts"                               && echo "OK 27/102" || echo "FAIL 27/102 calendar.test.ts"
curl -fsSL --create-dirs -o src/modules/calendar/outlook-calendar.service.test.ts               "$BASE/src/modules/calendar/outlook-calendar.service.test.ts"               && echo "OK 28/102" || echo "FAIL 28/102 outlook-calendar.service.test.ts"
curl -fsSL --create-dirs -o src/modules/campaigns/campaigns.service.test.ts                     "$BASE/src/modules/campaigns/campaigns.service.test.ts"                     && echo "OK 29/102" || echo "FAIL 29/102 campaigns.service.test.ts"
curl -fsSL --create-dirs -o src/modules/campaigns/campaigns.test.ts                             "$BASE/src/modules/campaigns/campaigns.test.ts"                             && echo "OK 30/102" || echo "FAIL 30/102 campaigns.test.ts"
curl -fsSL --create-dirs -o src/modules/capture/capture.service.test.ts                         "$BASE/src/modules/capture/capture.service.test.ts"                         && echo "OK 31/102" || echo "FAIL 31/102 capture.service.test.ts"
curl -fsSL --create-dirs -o src/modules/customer-stats/customer-stats.service.test.ts           "$BASE/src/modules/customer-stats/customer-stats.service.test.ts"           && echo "OK 32/102" || echo "FAIL 32/102 customer-stats.service.test.ts"
curl -fsSL --create-dirs -o src/modules/customer-stats/customer-stats.test.ts                   "$BASE/src/modules/customer-stats/customer-stats.test.ts"                   && echo "OK 33/102" || echo "FAIL 33/102 customer-stats.test.ts"
curl -fsSL --create-dirs -o src/modules/customers/customers.service.test.ts                     "$BASE/src/modules/customers/customers.service.test.ts"                     && echo "OK 34/102" || echo "FAIL 34/102 customers.service.test.ts"
curl -fsSL --create-dirs -o src/modules/email-templates/email-templates.service.test.ts         "$BASE/src/modules/email-templates/email-templates.service.test.ts"         && echo "OK 35/102" || echo "FAIL 35/102 email-templates.service.test.ts"
curl -fsSL --create-dirs -o src/modules/email-templates/email-templates.test.ts                 "$BASE/src/modules/email-templates/email-templates.test.ts"                 && echo "OK 36/102" || echo "FAIL 36/102 email-templates.test.ts"
curl -fsSL --create-dirs -o src/modules/features/features.test.ts                               "$BASE/src/modules/features/features.test.ts"                               && echo "OK 37/102" || echo "FAIL 37/102 features.test.ts"
curl -fsSL --create-dirs -o src/modules/forms/forms.service.test.ts                             "$BASE/src/modules/forms/forms.service.test.ts"                             && echo "OK 38/102" || echo "FAIL 38/102 forms.service.test.ts"
curl -fsSL --create-dirs -o src/modules/forms/forms.test.ts                                     "$BASE/src/modules/forms/forms.test.ts"                                     && echo "OK 39/102" || echo "FAIL 39/102 forms.test.ts"
curl -fsSL --create-dirs -o src/modules/gift-cards/gift-cards.service.test.ts                   "$BASE/src/modules/gift-cards/gift-cards.service.test.ts"                   && echo "OK 40/102" || echo "FAIL 40/102 gift-cards.service.test.ts"
curl -fsSL --create-dirs -o src/modules/gift-cards/gift-cards.test.ts                           "$BASE/src/modules/gift-cards/gift-cards.test.ts"                           && echo "OK 41/102" || echo "FAIL 41/102 gift-cards.test.ts"
curl -fsSL --create-dirs -o src/modules/health-flags/health-flags.service.test.ts               "$BASE/src/modules/health-flags/health-flags.service.test.ts"               && echo "OK 42/102" || echo "FAIL 42/102 health-flags.service.test.ts"
curl -fsSL --create-dirs -o src/modules/health-flags/health-flags.test.ts                       "$BASE/src/modules/health-flags/health-flags.test.ts"                       && echo "OK 43/102" || echo "FAIL 43/102 health-flags.test.ts"
curl -fsSL --create-dirs -o src/modules/invoices/invoices.service.test.ts                       "$BASE/src/modules/invoices/invoices.service.test.ts"                       && echo "OK 44/102" || echo "FAIL 44/102 invoices.service.test.ts"
curl -fsSL --create-dirs -o src/modules/invoices/invoices.test.ts                               "$BASE/src/modules/invoices/invoices.test.ts"                               && echo "OK 45/102" || echo "FAIL 45/102 invoices.test.ts"
curl -fsSL --create-dirs -o src/modules/leads/leads.service.test.ts                             "$BASE/src/modules/leads/leads.service.test.ts"                             && echo "OK 46/102" || echo "FAIL 46/102 leads.service.test.ts"
curl -fsSL --create-dirs -o src/modules/leads/leads.test.ts                                     "$BASE/src/modules/leads/leads.test.ts"                                     && echo "OK 47/102" || echo "FAIL 47/102 leads.test.ts"
curl -fsSL --create-dirs -o src/modules/locations/locations.test.ts                             "$BASE/src/modules/locations/locations.test.ts"                             && echo "OK 48/102" || echo "FAIL 48/102 locations.test.ts"
curl -fsSL --create-dirs -o src/modules/loyalty/loyalty.service.test.ts                         "$BASE/src/modules/loyalty/loyalty.service.test.ts"                         && echo "OK 49/102" || echo "FAIL 49/102 loyalty.service.test.ts"
curl -fsSL --create-dirs -o src/modules/loyalty/loyalty.test.ts                                 "$BASE/src/modules/loyalty/loyalty.test.ts"                                 && echo "OK 50/102" || echo "FAIL 50/102 loyalty.test.ts"
curl -fsSL --create-dirs -o src/modules/memberships/memberships.service.test.ts                 "$BASE/src/modules/memberships/memberships.service.test.ts"                 && echo "OK 51/102" || echo "FAIL 51/102 memberships.service.test.ts"
curl -fsSL --create-dirs -o src/modules/memberships/memberships.test.ts                         "$BASE/src/modules/memberships/memberships.test.ts"                         && echo "OK 52/102" || echo "FAIL 52/102 memberships.test.ts"
curl -fsSL --create-dirs -o src/modules/notifications/notifications.service.test.ts             "$BASE/src/modules/notifications/notifications.service.test.ts"             && echo "OK 53/102" || echo "FAIL 53/102 notifications.service.test.ts"
curl -fsSL --create-dirs -o src/modules/packages/packages.service.test.ts                       "$BASE/src/modules/packages/packages.service.test.ts"                       && echo "OK 54/102" || echo "FAIL 54/102 packages.service.test.ts"
curl -fsSL --create-dirs -o src/modules/packages/packages.test.ts                               "$BASE/src/modules/packages/packages.test.ts"                               && echo "OK 55/102" || echo "FAIL 55/102 packages.test.ts"
curl -fsSL --create-dirs -o src/modules/payments/payments.service.test.ts                       "$BASE/src/modules/payments/payments.service.test.ts"                       && echo "OK 56/102" || echo "FAIL 56/102 payments.service.test.ts"
curl -fsSL --create-dirs -o src/modules/payments/payments.test.ts                               "$BASE/src/modules/payments/payments.test.ts"                               && echo "OK 57/102" || echo "FAIL 57/102 payments.test.ts"
curl -fsSL --create-dirs -o src/modules/payroll/payroll.service.test.ts                         "$BASE/src/modules/payroll/payroll.service.test.ts"                         && echo "OK 58/102" || echo "FAIL 58/102 payroll.service.test.ts"
curl -fsSL --create-dirs -o src/modules/payroll/payroll.test.ts                                 "$BASE/src/modules/payroll/payroll.test.ts"                                 && echo "OK 59/102" || echo "FAIL 59/102 payroll.test.ts"
curl -fsSL --create-dirs -o src/modules/pos/pos.service.test.ts                                 "$BASE/src/modules/pos/pos.service.test.ts"                                 && echo "OK 60/102" || echo "FAIL 60/102 pos.service.test.ts"
curl -fsSL --create-dirs -o src/modules/pos/pos.test.ts                                         "$BASE/src/modules/pos/pos.test.ts"                                         && echo "OK 61/102" || echo "FAIL 61/102 pos.test.ts"
curl -fsSL --create-dirs -o src/modules/pricing/pricing.test.ts                                 "$BASE/src/modules/pricing/pricing.test.ts"                                 && echo "OK 62/102" || echo "FAIL 62/102 pricing.test.ts"
curl -fsSL --create-dirs -o src/modules/products/products.service.test.ts                       "$BASE/src/modules/products/products.service.test.ts"                       && echo "OK 63/102" || echo "FAIL 63/102 products.service.test.ts"
curl -fsSL --create-dirs -o src/modules/products/products.test.ts                               "$BASE/src/modules/products/products.test.ts"                               && echo "OK 64/102" || echo "FAIL 64/102 products.test.ts"
curl -fsSL --create-dirs -o src/modules/public/public.service.test.ts                           "$BASE/src/modules/public/public.service.test.ts"                           && echo "OK 65/102" || echo "FAIL 65/102 public.service.test.ts"
curl -fsSL --create-dirs -o src/modules/public/public.test.ts                                   "$BASE/src/modules/public/public.test.ts"                                   && echo "OK 66/102" || echo "FAIL 66/102 public.test.ts"
curl -fsSL --create-dirs -o src/modules/push/push.service.test.ts                               "$BASE/src/modules/push/push.service.test.ts"                               && echo "OK 67/102" || echo "FAIL 67/102 push.service.test.ts"
curl -fsSL --create-dirs -o src/modules/quotes/quotes.service.test.ts                           "$BASE/src/modules/quotes/quotes.service.test.ts"                           && echo "OK 68/102" || echo "FAIL 68/102 quotes.service.test.ts"
curl -fsSL --create-dirs -o src/modules/quotes/quotes.test.ts                                   "$BASE/src/modules/quotes/quotes.test.ts"                                   && echo "OK 69/102" || echo "FAIL 69/102 quotes.test.ts"
curl -fsSL --create-dirs -o src/modules/recurring-bookings/recurring-bookings.service.test.ts   "$BASE/src/modules/recurring-bookings/recurring-bookings.service.test.ts"   && echo "OK 70/102" || echo "FAIL 70/102 recurring-bookings.service.test.ts"
curl -fsSL --create-dirs -o src/modules/recurring-bookings/recurring-bookings.test.ts           "$BASE/src/modules/recurring-bookings/recurring-bookings.test.ts"           && echo "OK 71/102" || echo "FAIL 71/102 recurring-bookings.test.ts"
curl -fsSL --create-dirs -o src/modules/referrals/referrals.service.test.ts                     "$BASE/src/modules/referrals/referrals.service.test.ts"                     && echo "OK 72/102" || echo "FAIL 72/102 referrals.service.test.ts"
curl -fsSL --create-dirs -o src/modules/referrals/referrals.test.ts                             "$BASE/src/modules/referrals/referrals.test.ts"                             && echo "OK 73/102" || echo "FAIL 73/102 referrals.test.ts"
curl -fsSL --create-dirs -o src/modules/reminders/reminders.queue.test.ts                       "$BASE/src/modules/reminders/reminders.queue.test.ts"                       && echo "OK 74/102" || echo "FAIL 74/102 reminders.queue.test.ts"
curl -fsSL --create-dirs -o src/modules/reviews/reviews.queue.test.ts                           "$BASE/src/modules/reviews/reviews.queue.test.ts"                           && echo "OK 75/102" || echo "FAIL 75/102 reviews.queue.test.ts"
curl -fsSL --create-dirs -o src/modules/roles/roles.service.test.ts                             "$BASE/src/modules/roles/roles.service.test.ts"                             && echo "OK 76/102" || echo "FAIL 76/102 roles.service.test.ts"
curl -fsSL --create-dirs -o src/modules/roles/roles.test.ts                                     "$BASE/src/modules/roles/roles.test.ts"                                     && echo "OK 77/102" || echo "FAIL 77/102 roles.test.ts"
curl -fsSL --create-dirs -o src/modules/rota/rota.service.test.ts                               "$BASE/src/modules/rota/rota.service.test.ts"                               && echo "OK 78/102" || echo "FAIL 78/102 rota.service.test.ts"
curl -fsSL --create-dirs -o src/modules/rota/rota.test.ts                                       "$BASE/src/modules/rota/rota.test.ts"                                       && echo "OK 79/102" || echo "FAIL 79/102 rota.test.ts"
curl -fsSL --create-dirs -o src/modules/services/services.service.test.ts                       "$BASE/src/modules/services/services.service.test.ts"                       && echo "OK 80/102" || echo "FAIL 80/102 services.service.test.ts"
curl -fsSL --create-dirs -o src/modules/services/services.test.ts                               "$BASE/src/modules/services/services.test.ts"                               && echo "OK 81/102" || echo "FAIL 81/102 services.test.ts"
curl -fsSL --create-dirs -o src/modules/sessions/sessions.test.ts                               "$BASE/src/modules/sessions/sessions.test.ts"                               && echo "OK 82/102" || echo "FAIL 82/102 sessions.test.ts"
curl -fsSL --create-dirs -o src/modules/settings/settings.service.test.ts                       "$BASE/src/modules/settings/settings.service.test.ts"                       && echo "OK 83/102" || echo "FAIL 83/102 settings.service.test.ts"
curl -fsSL --create-dirs -o src/modules/settings/settings.test.ts                               "$BASE/src/modules/settings/settings.test.ts"                               && echo "OK 84/102" || echo "FAIL 84/102 settings.test.ts"
curl -fsSL --create-dirs -o src/modules/sms-templates/sms-templates.service.test.ts             "$BASE/src/modules/sms-templates/sms-templates.service.test.ts"             && echo "OK 85/102" || echo "FAIL 85/102 sms-templates.service.test.ts"
curl -fsSL --create-dirs -o src/modules/sms-templates/sms-templates.test.ts                     "$BASE/src/modules/sms-templates/sms-templates.test.ts"                     && echo "OK 86/102" || echo "FAIL 86/102 sms-templates.test.ts"
curl -fsSL --create-dirs -o src/modules/social/social.service.test.ts                           "$BASE/src/modules/social/social.service.test.ts"                           && echo "OK 87/102" || echo "FAIL 87/102 social.service.test.ts"
curl -fsSL --create-dirs -o src/modules/social/social.test.ts                                   "$BASE/src/modules/social/social.test.ts"                                   && echo "OK 88/102" || echo "FAIL 88/102 social.test.ts"
curl -fsSL --create-dirs -o src/modules/styles/styles.service.test.ts                           "$BASE/src/modules/styles/styles.service.test.ts"                           && echo "OK 89/102" || echo "FAIL 89/102 styles.service.test.ts"
curl -fsSL --create-dirs -o src/modules/styles/styles.test.ts                                   "$BASE/src/modules/styles/styles.test.ts"                                   && echo "OK 90/102" || echo "FAIL 90/102 styles.test.ts"
curl -fsSL --create-dirs -o src/modules/tables/tables.service.test.ts                           "$BASE/src/modules/tables/tables.service.test.ts"                           && echo "OK 91/102" || echo "FAIL 91/102 tables.service.test.ts"
curl -fsSL --create-dirs -o src/modules/tenants/tenants.service.test.ts                         "$BASE/src/modules/tenants/tenants.service.test.ts"                         && echo "OK 92/102" || echo "FAIL 92/102 tenants.service.test.ts"
curl -fsSL --create-dirs -o src/modules/tenants/tenants.test.ts                                 "$BASE/src/modules/tenants/tenants.test.ts"                                 && echo "OK 93/102" || echo "FAIL 93/102 tenants.test.ts"
curl -fsSL --create-dirs -o src/modules/uploads/uploads.service.test.ts                         "$BASE/src/modules/uploads/uploads.service.test.ts"                         && echo "OK 94/102" || echo "FAIL 94/102 uploads.service.test.ts"
curl -fsSL --create-dirs -o src/modules/uploads/uploads.test.ts                                 "$BASE/src/modules/uploads/uploads.test.ts"                                 && echo "OK 95/102" || echo "FAIL 95/102 uploads.test.ts"
curl -fsSL --create-dirs -o src/modules/waitlist/waitlist.service.test.ts                       "$BASE/src/modules/waitlist/waitlist.service.test.ts"                       && echo "OK 96/102" || echo "FAIL 96/102 waitlist.service.test.ts"
curl -fsSL --create-dirs -o src/modules/waitlist/waitlist.test.ts                               "$BASE/src/modules/waitlist/waitlist.test.ts"                               && echo "OK 97/102" || echo "FAIL 97/102 waitlist.test.ts"
curl -fsSL --create-dirs -o src/modules/webhooks/webhooks.service.test.ts                       "$BASE/src/modules/webhooks/webhooks.service.test.ts"                       && echo "OK 98/102" || echo "FAIL 98/102 webhooks.service.test.ts"
curl -fsSL --create-dirs -o src/modules/whatsapp-templates/whatsapp-templates.service.test.ts   "$BASE/src/modules/whatsapp-templates/whatsapp-templates.service.test.ts"   && echo "OK 99/102" || echo "FAIL 99/102 whatsapp-templates.service.test.ts"
curl -fsSL --create-dirs -o src/modules/whatsapp-templates/whatsapp-templates.test.ts           "$BASE/src/modules/whatsapp-templates/whatsapp-templates.test.ts"           && echo "OK 100/102" || echo "FAIL 100/102 whatsapp-templates.test.ts"
curl -fsSL --create-dirs -o src/modules/whatsapp/whatsapp.queue.test.ts                         "$BASE/src/modules/whatsapp/whatsapp.queue.test.ts"                         && echo "OK 101/102" || echo "FAIL 101/102 whatsapp.queue.test.ts"
curl -fsSL --create-dirs -o src/modules/whatsapp/whatsapp.service.test.ts                       "$BASE/src/modules/whatsapp/whatsapp.service.test.ts"                       && echo "OK 102/102" || echo "FAIL 102/102 whatsapp.service.test.ts"
```

---

## Step 5 — Install dependencies (if needed)

> Skip this step if `node_modules/` is already present and up-to-date.

```bash
npm install
```

---

## Step 6 — Run the tests

```bash
npm test -- --no-coverage --forceExit
```

**Expected result:**

```
Test Suites: 102 passed, 102 total
Tests:       1821 passed, 1821 total
Snapshots:   0 total
```
