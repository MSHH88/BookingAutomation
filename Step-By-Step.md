# Phase 1 — Messaging Foundation

Implements the **complete messaging infrastructure**: DB-driven WhatsApp templates,
10 new WhatsApp message types, email CRM API, SMS channel, birthday/rebooking/recurring
automation, and bulk campaign system.

**What Phase 1 delivers:**

- **WhatsApp Templates (DB-driven)** — CRUD management under `/api/messages/whatsapp-templates` with key-based lookup, variable preview, and tenant scoping
- **10 new WhatsApp message types** — lead-inquiry, booking-confirmed, booking-reminder, booking-cancelled, booking-rescheduled, post-visit-review, restaurant-reminder, birthday-greeting, rebook-nudge, campaign (via `whatsapp.queue.ts`)
- **Email Templates (CRM API)** — CRUD management under `/api/messages/email-templates` with Handlebars rendering, HTML preview, and tenant scoping
- **SMS Channel** — SMS queue processor (`sms.queue.ts`), SMS template management (`/api/messages/sms-templates`), Twilio SMS integration (`twilio-sms.ts`)
- **Notification Dispatcher** — unified multi-channel dispatcher supporting WhatsApp, SMS, and email via `Promise.allSettled()`
- **Template Renderer** — `{{variable}}` interpolation engine shared across all channels
- **Birthday Automation** — daily cron job scans users with matching birth date, sends birthday greeting via preferred channel
- **Rebooking Nudges** — delayed BullMQ job fired when booking is completed, sends rebook reminder after configurable delay
- **Recurring Bookings** — `/api/recurring-bookings` CRUD + daily cron that advances `nextBookingDate` and sends notification
- **Bulk Campaigns** — `/api/campaigns` CRUD + audience resolution (ALL, INACTIVE_30_DAYS, BIRTHDAY_THIS_MONTH) + BullMQ delayed dispatch
- **Feature flags enabled** — `SMS_ENABLED`, `SMS_REMINDERS_ENABLED`, `RECURRING_BOOKING_ENABLED`, `RECURRING_BOOKINGS_ENABLED`, `CAMPAIGNS_ENABLED`, `BIRTHDAY_AUTOMATION_ENABLED`, `REBOOKING_NUDGES_ENABLED` for tattoo_studio, hair_salon, barber, nail_salon, masseuse

**Bugs fixed in this audit:**

| ID | File | Bug | Fix |
|----|------|-----|-----|
| BUG-A | `config/businessType.ts` | Phase 1 feature flags (`SMS_REMINDERS_ENABLED`, `RECURRING_BOOKING_ENABLED`, `CAMPAIGNS_ENABLED`, etc.) were `false` for all business types — caused 3 integration test suites (24 tests) to get 503 | Enabled all Phase 1 flags for tattoo_studio, hair_salon, barber, nail_salon, masseuse |
| BUG-B | `jobs/index.ts` | `startRebookWorker()` was never imported or called — rebook nudge jobs queued but never processed | Added import and call to `startRebookWorker()` when `REBOOKING_NUDGES_ENABLED` is true |
| BUG-C | `jobs/campaign.job.ts` | `BIRTHDAY_THIS_MONTH` audience filter only checked `dateOfBirth IS NOT NULL` without filtering by actual month | Added post-query filter comparing `getUTCMonth()` to current month |
| BUG-D | `jobs/campaign.job.ts` | `catch` block in campaign dispatch loop swallowed errors silently with `failed++` only | Added error logging with `customerId`, `campaignId`, and error message |
| BUG-E | `jobs/campaign.job.ts` | `TOP_SPENDERS` and `BY_SERVICE_TYPE` filter types silently fell through to `ALL` without warning | Added explicit `logger.warn()` for unimplemented filter types |
| BUG-F | `lib/notification-dispatcher.ts` | WhatsApp dispatch cast `artistName`, `bookingId`, `startAt`, `service` as `string` without nullish fallback — `undefined` values would become string `"undefined"` | Added `?? ''` fallback to all fields |

**Test count:** 57 suites, 1194/1194 tests, 0 TS errors.

---

## Step 1 — Go to your backend folder

Open Terminal and run:

```bash
cd ~/Desktop/Automation/backend
```

**All commands below must be run from `~/Desktop/Automation/backend`.**
Do NOT `cd` anywhere else until the guide says so.

---

## Step 2 — Delete all 51 Phase 1 files

Copy-paste this entire block into Terminal. It deletes every Phase 1 file so you get a clean slate.

```bash
cd ~/Desktop/Automation/backend && \
rm -f \
  src/config/businessType.ts \
  src/app.ts \
  src/jobs/index.ts \
  src/jobs/campaign.job.ts \
  src/jobs/birthday.job.ts \
  src/jobs/birthday.job.test.ts \
  src/jobs/rebook-nudge.job.ts \
  src/jobs/rebook-nudge.job.test.ts \
  src/jobs/recurring-booking.job.ts \
  src/lib/notification-dispatcher.ts \
  src/lib/template-renderer.ts \
  src/lib/twilio-sms.ts \
  src/lib/resend.ts \
  src/modules/messages/messages.routes.ts \
  src/modules/whatsapp/whatsapp.schema.ts \
  src/modules/whatsapp/whatsapp.service.ts \
  src/modules/whatsapp/whatsapp.controller.ts \
  src/modules/whatsapp/whatsapp.routes.ts \
  src/modules/whatsapp/whatsapp.queue.ts \
  src/modules/whatsapp/whatsapp.service.test.ts \
  src/modules/whatsapp-templates/whatsapp-templates.schema.ts \
  src/modules/whatsapp-templates/whatsapp-templates.service.ts \
  src/modules/whatsapp-templates/whatsapp-templates.controller.ts \
  src/modules/whatsapp-templates/whatsapp-templates.routes.ts \
  src/modules/whatsapp-templates/whatsapp-templates.service.test.ts \
  src/modules/whatsapp-templates/whatsapp-templates.test.ts \
  src/modules/email-templates/email-templates.schema.ts \
  src/modules/email-templates/email-templates.service.ts \
  src/modules/email-templates/email-templates.controller.ts \
  src/modules/email-templates/email-templates.routes.ts \
  src/modules/email-templates/email-templates.service.test.ts \
  src/modules/email-templates/email-templates.test.ts \
  src/modules/sms-templates/sms-templates.schema.ts \
  src/modules/sms-templates/sms-templates.service.ts \
  src/modules/sms-templates/sms-templates.controller.ts \
  src/modules/sms-templates/sms-templates.routes.ts \
  src/modules/sms-templates/sms-templates.service.test.ts \
  src/modules/sms-templates/sms-templates.test.ts \
  src/modules/sms/sms.queue.ts \
  src/modules/recurring-bookings/recurring-bookings.schema.ts \
  src/modules/recurring-bookings/recurring-bookings.service.ts \
  src/modules/recurring-bookings/recurring-bookings.controller.ts \
  src/modules/recurring-bookings/recurring-bookings.routes.ts \
  src/modules/recurring-bookings/recurring-bookings.service.test.ts \
  src/modules/recurring-bookings/recurring-bookings.test.ts \
  src/modules/campaigns/campaigns.schema.ts \
  src/modules/campaigns/campaigns.service.ts \
  src/modules/campaigns/campaigns.controller.ts \
  src/modules/campaigns/campaigns.routes.ts \
  src/modules/campaigns/campaigns.service.test.ts \
  src/modules/campaigns/campaigns.test.ts \
  && echo "ALL 51 OLD FILES DELETED"
```

You should see: `ALL 51 OLD FILES DELETED`

---

## Step 3 — Download all 51 Phase 1 files

Copy-paste this entire block into Terminal. Every file is numbered so you can see which ones succeed or fail.

```bash
cd ~/Desktop/Automation/backend

BRANCH="copilot/create-detailed-automation-plan"
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/${BRANCH}"

mkdir -p src/config src/jobs src/lib \
  src/modules/messages \
  src/modules/whatsapp \
  src/modules/whatsapp-templates \
  src/modules/email-templates \
  src/modules/sms-templates \
  src/modules/sms \
  src/modules/recurring-bookings \
  src/modules/campaigns

curl -sfL "${BASE}/backend/src/config/businessType.ts" \
  -o src/config/businessType.ts \
  && echo "OK  1/51 config/businessType.ts" || echo "FAILED  1/51 config/businessType.ts"

curl -sfL "${BASE}/backend/src/app.ts" \
  -o src/app.ts \
  && echo "OK  2/51 app.ts" || echo "FAILED  2/51 app.ts"

curl -sfL "${BASE}/backend/src/jobs/index.ts" \
  -o src/jobs/index.ts \
  && echo "OK  3/51 jobs/index.ts" || echo "FAILED  3/51 jobs/index.ts"

curl -sfL "${BASE}/backend/src/jobs/campaign.job.ts" \
  -o src/jobs/campaign.job.ts \
  && echo "OK  4/51 jobs/campaign.job.ts" || echo "FAILED  4/51 jobs/campaign.job.ts"

curl -sfL "${BASE}/backend/src/lib/notification-dispatcher.ts" \
  -o src/lib/notification-dispatcher.ts \
  && echo "OK  5/51 lib/notification-dispatcher.ts" || echo "FAILED  5/51 lib/notification-dispatcher.ts"

curl -sfL "${BASE}/backend/src/lib/template-renderer.ts" \
  -o src/lib/template-renderer.ts \
  && echo "OK  6/51 lib/template-renderer.ts" || echo "FAILED  6/51 lib/template-renderer.ts"

curl -sfL "${BASE}/backend/src/lib/twilio-sms.ts" \
  -o src/lib/twilio-sms.ts \
  && echo "OK  7/51 lib/twilio-sms.ts" || echo "FAILED  7/51 lib/twilio-sms.ts"

curl -sfL "${BASE}/backend/src/lib/resend.ts" \
  -o src/lib/resend.ts \
  && echo "OK  8/51 lib/resend.ts" || echo "FAILED  8/51 lib/resend.ts"

curl -sfL "${BASE}/backend/src/jobs/birthday.job.ts" \
  -o src/jobs/birthday.job.ts \
  && echo "OK  9/51 jobs/birthday.job.ts" || echo "FAILED  9/51 jobs/birthday.job.ts"

curl -sfL "${BASE}/backend/src/jobs/birthday.job.test.ts" \
  -o src/jobs/birthday.job.test.ts \
  && echo "OK 10/51 jobs/birthday.job.test.ts" || echo "FAILED 10/51 jobs/birthday.job.test.ts"

curl -sfL "${BASE}/backend/src/jobs/rebook-nudge.job.ts" \
  -o src/jobs/rebook-nudge.job.ts \
  && echo "OK 11/51 jobs/rebook-nudge.job.ts" || echo "FAILED 11/51 jobs/rebook-nudge.job.ts"

curl -sfL "${BASE}/backend/src/jobs/rebook-nudge.job.test.ts" \
  -o src/jobs/rebook-nudge.job.test.ts \
  && echo "OK 12/51 jobs/rebook-nudge.job.test.ts" || echo "FAILED 12/51 jobs/rebook-nudge.job.test.ts"

curl -sfL "${BASE}/backend/src/jobs/recurring-booking.job.ts" \
  -o src/jobs/recurring-booking.job.ts \
  && echo "OK 13/51 jobs/recurring-booking.job.ts" || echo "FAILED 13/51 jobs/recurring-booking.job.ts"

curl -sfL "${BASE}/backend/src/modules/messages/messages.routes.ts" \
  -o src/modules/messages/messages.routes.ts \
  && echo "OK 14/51 modules/messages/messages.routes.ts" || echo "FAILED 14/51 modules/messages/messages.routes.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.schema.ts" \
  -o src/modules/whatsapp/whatsapp.schema.ts \
  && echo "OK 15/51 modules/whatsapp/whatsapp.schema.ts" || echo "FAILED 15/51 modules/whatsapp/whatsapp.schema.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.service.ts" \
  -o src/modules/whatsapp/whatsapp.service.ts \
  && echo "OK 16/51 modules/whatsapp/whatsapp.service.ts" || echo "FAILED 16/51 modules/whatsapp/whatsapp.service.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.controller.ts" \
  -o src/modules/whatsapp/whatsapp.controller.ts \
  && echo "OK 17/51 modules/whatsapp/whatsapp.controller.ts" || echo "FAILED 17/51 modules/whatsapp/whatsapp.controller.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.routes.ts" \
  -o src/modules/whatsapp/whatsapp.routes.ts \
  && echo "OK 18/51 modules/whatsapp/whatsapp.routes.ts" || echo "FAILED 18/51 modules/whatsapp/whatsapp.routes.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.queue.ts" \
  -o src/modules/whatsapp/whatsapp.queue.ts \
  && echo "OK 19/51 modules/whatsapp/whatsapp.queue.ts" || echo "FAILED 19/51 modules/whatsapp/whatsapp.queue.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.service.test.ts" \
  -o src/modules/whatsapp/whatsapp.service.test.ts \
  && echo "OK 20/51 modules/whatsapp/whatsapp.service.test.ts" || echo "FAILED 20/51 modules/whatsapp/whatsapp.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.schema.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.schema.ts \
  && echo "OK 21/51 modules/whatsapp-templates/whatsapp-templates.schema.ts" || echo "FAILED 21/51 modules/whatsapp-templates/whatsapp-templates.schema.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.service.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.service.ts \
  && echo "OK 22/51 modules/whatsapp-templates/whatsapp-templates.service.ts" || echo "FAILED 22/51 modules/whatsapp-templates/whatsapp-templates.service.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.controller.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.controller.ts \
  && echo "OK 23/51 modules/whatsapp-templates/whatsapp-templates.controller.ts" || echo "FAILED 23/51 modules/whatsapp-templates/whatsapp-templates.controller.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.routes.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.routes.ts \
  && echo "OK 24/51 modules/whatsapp-templates/whatsapp-templates.routes.ts" || echo "FAILED 24/51 modules/whatsapp-templates/whatsapp-templates.routes.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.service.test.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.service.test.ts \
  && echo "OK 25/51 modules/whatsapp-templates/whatsapp-templates.service.test.ts" || echo "FAILED 25/51 modules/whatsapp-templates/whatsapp-templates.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.test.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.test.ts \
  && echo "OK 26/51 modules/whatsapp-templates/whatsapp-templates.test.ts" || echo "FAILED 26/51 modules/whatsapp-templates/whatsapp-templates.test.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.schema.ts" \
  -o src/modules/email-templates/email-templates.schema.ts \
  && echo "OK 27/51 modules/email-templates/email-templates.schema.ts" || echo "FAILED 27/51 modules/email-templates/email-templates.schema.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.service.ts" \
  -o src/modules/email-templates/email-templates.service.ts \
  && echo "OK 28/51 modules/email-templates/email-templates.service.ts" || echo "FAILED 28/51 modules/email-templates/email-templates.service.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.controller.ts" \
  -o src/modules/email-templates/email-templates.controller.ts \
  && echo "OK 29/51 modules/email-templates/email-templates.controller.ts" || echo "FAILED 29/51 modules/email-templates/email-templates.controller.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.routes.ts" \
  -o src/modules/email-templates/email-templates.routes.ts \
  && echo "OK 30/51 modules/email-templates/email-templates.routes.ts" || echo "FAILED 30/51 modules/email-templates/email-templates.routes.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.service.test.ts" \
  -o src/modules/email-templates/email-templates.service.test.ts \
  && echo "OK 31/51 modules/email-templates/email-templates.service.test.ts" || echo "FAILED 31/51 modules/email-templates/email-templates.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.test.ts" \
  -o src/modules/email-templates/email-templates.test.ts \
  && echo "OK 32/51 modules/email-templates/email-templates.test.ts" || echo "FAILED 32/51 modules/email-templates/email-templates.test.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.schema.ts" \
  -o src/modules/sms-templates/sms-templates.schema.ts \
  && echo "OK 33/51 modules/sms-templates/sms-templates.schema.ts" || echo "FAILED 33/51 modules/sms-templates/sms-templates.schema.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.service.ts" \
  -o src/modules/sms-templates/sms-templates.service.ts \
  && echo "OK 34/51 modules/sms-templates/sms-templates.service.ts" || echo "FAILED 34/51 modules/sms-templates/sms-templates.service.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.controller.ts" \
  -o src/modules/sms-templates/sms-templates.controller.ts \
  && echo "OK 35/51 modules/sms-templates/sms-templates.controller.ts" || echo "FAILED 35/51 modules/sms-templates/sms-templates.controller.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.routes.ts" \
  -o src/modules/sms-templates/sms-templates.routes.ts \
  && echo "OK 36/51 modules/sms-templates/sms-templates.routes.ts" || echo "FAILED 36/51 modules/sms-templates/sms-templates.routes.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.service.test.ts" \
  -o src/modules/sms-templates/sms-templates.service.test.ts \
  && echo "OK 37/51 modules/sms-templates/sms-templates.service.test.ts" || echo "FAILED 37/51 modules/sms-templates/sms-templates.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.test.ts" \
  -o src/modules/sms-templates/sms-templates.test.ts \
  && echo "OK 38/51 modules/sms-templates/sms-templates.test.ts" || echo "FAILED 38/51 modules/sms-templates/sms-templates.test.ts"

curl -sfL "${BASE}/backend/src/modules/sms/sms.queue.ts" \
  -o src/modules/sms/sms.queue.ts \
  && echo "OK 39/51 modules/sms/sms.queue.ts" || echo "FAILED 39/51 modules/sms/sms.queue.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.schema.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.schema.ts \
  && echo "OK 40/51 modules/recurring-bookings/recurring-bookings.schema.ts" || echo "FAILED 40/51 modules/recurring-bookings/recurring-bookings.schema.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.service.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.service.ts \
  && echo "OK 41/51 modules/recurring-bookings/recurring-bookings.service.ts" || echo "FAILED 41/51 modules/recurring-bookings/recurring-bookings.service.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.controller.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.controller.ts \
  && echo "OK 42/51 modules/recurring-bookings/recurring-bookings.controller.ts" || echo "FAILED 42/51 modules/recurring-bookings/recurring-bookings.controller.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.routes.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.routes.ts \
  && echo "OK 43/51 modules/recurring-bookings/recurring-bookings.routes.ts" || echo "FAILED 43/51 modules/recurring-bookings/recurring-bookings.routes.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.service.test.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.service.test.ts \
  && echo "OK 44/51 modules/recurring-bookings/recurring-bookings.service.test.ts" || echo "FAILED 44/51 modules/recurring-bookings/recurring-bookings.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.test.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.test.ts \
  && echo "OK 45/51 modules/recurring-bookings/recurring-bookings.test.ts" || echo "FAILED 45/51 modules/recurring-bookings/recurring-bookings.test.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.schema.ts" \
  -o src/modules/campaigns/campaigns.schema.ts \
  && echo "OK 46/51 modules/campaigns/campaigns.schema.ts" || echo "FAILED 46/51 modules/campaigns/campaigns.schema.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.service.ts" \
  -o src/modules/campaigns/campaigns.service.ts \
  && echo "OK 47/51 modules/campaigns/campaigns.service.ts" || echo "FAILED 47/51 modules/campaigns/campaigns.service.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.controller.ts" \
  -o src/modules/campaigns/campaigns.controller.ts \
  && echo "OK 48/51 modules/campaigns/campaigns.controller.ts" || echo "FAILED 48/51 modules/campaigns/campaigns.controller.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.routes.ts" \
  -o src/modules/campaigns/campaigns.routes.ts \
  && echo "OK 49/51 modules/campaigns/campaigns.routes.ts" || echo "FAILED 49/51 modules/campaigns/campaigns.routes.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.service.test.ts" \
  -o src/modules/campaigns/campaigns.service.test.ts \
  && echo "OK 50/51 modules/campaigns/campaigns.service.test.ts" || echo "FAILED 50/51 modules/campaigns/campaigns.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.test.ts" \
  -o src/modules/campaigns/campaigns.test.ts \
  && echo "OK 51/51 modules/campaigns/campaigns.test.ts" || echo "FAILED 51/51 modules/campaigns/campaigns.test.ts"
```

You should see `OK` for all 51 lines. If any say `FAILED`, re-run that single curl line.

---

## Step 4 — Install dependencies and run tests

You should already be in `~/Desktop/Automation/backend` from the steps above.
If not, run `cd ~/Desktop/Automation/backend` first.

```bash
npm install
npx prisma generate
npx jest --forceExit
```

**Expected result:** 57 suites, 1194/1194 tests pass, 0 TS errors.
