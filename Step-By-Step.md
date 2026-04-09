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

## Step 1 — Download all Phase 1 files

> **Total: 53 files** (49 new + 4 modified)

### 1.1 Delete outdated files that will be replaced

```bash
rm -f backend/src/config/businessType.ts
rm -f backend/src/app.ts
rm -f backend/src/jobs/index.ts
rm -f backend/src/jobs/campaign.job.ts
rm -f backend/src/lib/notification-dispatcher.ts
```

### 1.2 Download all Phase 1 files

```bash
BRANCH="copilot/create-detailed-automation-plan"
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/${BRANCH}"

# Modified files (4) — ensure directories exist first
mkdir -p backend/src/config backend/src/jobs backend/src/lib

curl -sfL "${BASE}/backend/src/config/businessType.ts" \
  -o backend/src/config/businessType.ts \
  && echo "OK businessType.ts" || echo "FAILED businessType.ts"

curl -sfL "${BASE}/backend/src/app.ts" \
  -o backend/src/app.ts \
  && echo "OK app.ts" || echo "FAILED app.ts"

curl -sfL "${BASE}/backend/src/jobs/index.ts" \
  -o backend/src/jobs/index.ts \
  && echo "OK jobs/index.ts" || echo "FAILED jobs/index.ts"

curl -sfL "${BASE}/backend/src/jobs/campaign.job.ts" \
  -o backend/src/jobs/campaign.job.ts \
  && echo "OK jobs/campaign.job.ts" || echo "FAILED jobs/campaign.job.ts"

curl -sfL "${BASE}/backend/src/lib/notification-dispatcher.ts" \
  -o backend/src/lib/notification-dispatcher.ts \
  && echo "OK lib/notification-dispatcher.ts" || echo "FAILED lib/notification-dispatcher.ts"

# Lib files - 3 new

curl -sfL "${BASE}/backend/src/lib/template-renderer.ts" \
  -o backend/src/lib/template-renderer.ts \
  && echo "OK lib/template-renderer.ts" || echo "FAILED lib/template-renderer.ts"

curl -sfL "${BASE}/backend/src/lib/twilio-sms.ts" \
  -o backend/src/lib/twilio-sms.ts \
  && echo "OK lib/twilio-sms.ts" || echo "FAILED lib/twilio-sms.ts"

curl -sfL "${BASE}/backend/src/lib/resend.ts" \
  -o backend/src/lib/resend.ts \
  && echo "OK lib/resend.ts" || echo "FAILED lib/resend.ts"

# Job files - 6 new

mkdir -p backend/src/jobs

curl -sfL "${BASE}/backend/src/jobs/birthday.job.ts" \
  -o backend/src/jobs/birthday.job.ts \
  && echo "OK jobs/birthday.job.ts" || echo "FAILED jobs/birthday.job.ts"

curl -sfL "${BASE}/backend/src/jobs/birthday.job.test.ts" \
  -o backend/src/jobs/birthday.job.test.ts \
  && echo "OK jobs/birthday.job.test.ts" || echo "FAILED jobs/birthday.job.test.ts"

curl -sfL "${BASE}/backend/src/jobs/rebook-nudge.job.ts" \
  -o backend/src/jobs/rebook-nudge.job.ts \
  && echo "OK jobs/rebook-nudge.job.ts" || echo "FAILED jobs/rebook-nudge.job.ts"

curl -sfL "${BASE}/backend/src/jobs/rebook-nudge.job.test.ts" \
  -o backend/src/jobs/rebook-nudge.job.test.ts \
  && echo "OK jobs/rebook-nudge.job.test.ts" || echo "FAILED jobs/rebook-nudge.job.test.ts"

curl -sfL "${BASE}/backend/src/jobs/recurring-booking.job.ts" \
  -o backend/src/jobs/recurring-booking.job.ts \
  && echo "OK jobs/recurring-booking.job.ts" || echo "FAILED jobs/recurring-booking.job.ts"

# Messages router - 1 new

mkdir -p backend/src/modules/messages

curl -sfL "${BASE}/backend/src/modules/messages/messages.routes.ts" \
  -o backend/src/modules/messages/messages.routes.ts \
  && echo "OK modules/messages/messages.routes.ts" || echo "FAILED modules/messages/messages.routes.ts"

# WhatsApp module - 6 new

mkdir -p backend/src/modules/whatsapp

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.schema.ts" \
  -o backend/src/modules/whatsapp/whatsapp.schema.ts \
  && echo "OK modules/whatsapp/whatsapp.schema.ts" || echo "FAILED modules/whatsapp/whatsapp.schema.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.service.ts" \
  -o backend/src/modules/whatsapp/whatsapp.service.ts \
  && echo "OK modules/whatsapp/whatsapp.service.ts" || echo "FAILED modules/whatsapp/whatsapp.service.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.controller.ts" \
  -o backend/src/modules/whatsapp/whatsapp.controller.ts \
  && echo "OK modules/whatsapp/whatsapp.controller.ts" || echo "FAILED modules/whatsapp/whatsapp.controller.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.routes.ts" \
  -o backend/src/modules/whatsapp/whatsapp.routes.ts \
  && echo "OK modules/whatsapp/whatsapp.routes.ts" || echo "FAILED modules/whatsapp/whatsapp.routes.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.queue.ts" \
  -o backend/src/modules/whatsapp/whatsapp.queue.ts \
  && echo "OK modules/whatsapp/whatsapp.queue.ts" || echo "FAILED modules/whatsapp/whatsapp.queue.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.service.test.ts" \
  -o backend/src/modules/whatsapp/whatsapp.service.test.ts \
  && echo "OK modules/whatsapp/whatsapp.service.test.ts" || echo "FAILED modules/whatsapp/whatsapp.service.test.ts"

# WhatsApp Templates module - 6 new

mkdir -p backend/src/modules/whatsapp-templates

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.schema.ts" \
  -o backend/src/modules/whatsapp-templates/whatsapp-templates.schema.ts \
  && echo "OK modules/whatsapp-templates/whatsapp-templates.schema.ts" || echo "FAILED modules/whatsapp-templates/whatsapp-templates.schema.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.service.ts" \
  -o backend/src/modules/whatsapp-templates/whatsapp-templates.service.ts \
  && echo "OK modules/whatsapp-templates/whatsapp-templates.service.ts" || echo "FAILED modules/whatsapp-templates/whatsapp-templates.service.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.controller.ts" \
  -o backend/src/modules/whatsapp-templates/whatsapp-templates.controller.ts \
  && echo "OK modules/whatsapp-templates/whatsapp-templates.controller.ts" || echo "FAILED modules/whatsapp-templates/whatsapp-templates.controller.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.routes.ts" \
  -o backend/src/modules/whatsapp-templates/whatsapp-templates.routes.ts \
  && echo "OK modules/whatsapp-templates/whatsapp-templates.routes.ts" || echo "FAILED modules/whatsapp-templates/whatsapp-templates.routes.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.service.test.ts" \
  -o backend/src/modules/whatsapp-templates/whatsapp-templates.service.test.ts \
  && echo "OK modules/whatsapp-templates/whatsapp-templates.service.test.ts" || echo "FAILED modules/whatsapp-templates/whatsapp-templates.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.test.ts" \
  -o backend/src/modules/whatsapp-templates/whatsapp-templates.test.ts \
  && echo "OK modules/whatsapp-templates/whatsapp-templates.test.ts" || echo "FAILED modules/whatsapp-templates/whatsapp-templates.test.ts"

# Email Templates module - 6 new

mkdir -p backend/src/modules/email-templates

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.schema.ts" \
  -o backend/src/modules/email-templates/email-templates.schema.ts \
  && echo "OK modules/email-templates/email-templates.schema.ts" || echo "FAILED modules/email-templates/email-templates.schema.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.service.ts" \
  -o backend/src/modules/email-templates/email-templates.service.ts \
  && echo "OK modules/email-templates/email-templates.service.ts" || echo "FAILED modules/email-templates/email-templates.service.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.controller.ts" \
  -o backend/src/modules/email-templates/email-templates.controller.ts \
  && echo "OK modules/email-templates/email-templates.controller.ts" || echo "FAILED modules/email-templates/email-templates.controller.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.routes.ts" \
  -o backend/src/modules/email-templates/email-templates.routes.ts \
  && echo "OK modules/email-templates/email-templates.routes.ts" || echo "FAILED modules/email-templates/email-templates.routes.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.service.test.ts" \
  -o backend/src/modules/email-templates/email-templates.service.test.ts \
  && echo "OK modules/email-templates/email-templates.service.test.ts" || echo "FAILED modules/email-templates/email-templates.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.test.ts" \
  -o backend/src/modules/email-templates/email-templates.test.ts \
  && echo "OK modules/email-templates/email-templates.test.ts" || echo "FAILED modules/email-templates/email-templates.test.ts"

# SMS Templates module - 6 new

mkdir -p backend/src/modules/sms-templates

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.schema.ts" \
  -o backend/src/modules/sms-templates/sms-templates.schema.ts \
  && echo "OK modules/sms-templates/sms-templates.schema.ts" || echo "FAILED modules/sms-templates/sms-templates.schema.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.service.ts" \
  -o backend/src/modules/sms-templates/sms-templates.service.ts \
  && echo "OK modules/sms-templates/sms-templates.service.ts" || echo "FAILED modules/sms-templates/sms-templates.service.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.controller.ts" \
  -o backend/src/modules/sms-templates/sms-templates.controller.ts \
  && echo "OK modules/sms-templates/sms-templates.controller.ts" || echo "FAILED modules/sms-templates/sms-templates.controller.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.routes.ts" \
  -o backend/src/modules/sms-templates/sms-templates.routes.ts \
  && echo "OK modules/sms-templates/sms-templates.routes.ts" || echo "FAILED modules/sms-templates/sms-templates.routes.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.service.test.ts" \
  -o backend/src/modules/sms-templates/sms-templates.service.test.ts \
  && echo "OK modules/sms-templates/sms-templates.service.test.ts" || echo "FAILED modules/sms-templates/sms-templates.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.test.ts" \
  -o backend/src/modules/sms-templates/sms-templates.test.ts \
  && echo "OK modules/sms-templates/sms-templates.test.ts" || echo "FAILED modules/sms-templates/sms-templates.test.ts"

# SMS Queue module - 1 new

mkdir -p backend/src/modules/sms

curl -sfL "${BASE}/backend/src/modules/sms/sms.queue.ts" \
  -o backend/src/modules/sms/sms.queue.ts \
  && echo "OK modules/sms/sms.queue.ts" || echo "FAILED modules/sms/sms.queue.ts"

# Recurring Bookings module - 6 new

mkdir -p backend/src/modules/recurring-bookings

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.schema.ts" \
  -o backend/src/modules/recurring-bookings/recurring-bookings.schema.ts \
  && echo "OK modules/recurring-bookings/recurring-bookings.schema.ts" || echo "FAILED modules/recurring-bookings/recurring-bookings.schema.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.service.ts" \
  -o backend/src/modules/recurring-bookings/recurring-bookings.service.ts \
  && echo "OK modules/recurring-bookings/recurring-bookings.service.ts" || echo "FAILED modules/recurring-bookings/recurring-bookings.service.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.controller.ts" \
  -o backend/src/modules/recurring-bookings/recurring-bookings.controller.ts \
  && echo "OK modules/recurring-bookings/recurring-bookings.controller.ts" || echo "FAILED modules/recurring-bookings/recurring-bookings.controller.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.routes.ts" \
  -o backend/src/modules/recurring-bookings/recurring-bookings.routes.ts \
  && echo "OK modules/recurring-bookings/recurring-bookings.routes.ts" || echo "FAILED modules/recurring-bookings/recurring-bookings.routes.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.service.test.ts" \
  -o backend/src/modules/recurring-bookings/recurring-bookings.service.test.ts \
  && echo "OK modules/recurring-bookings/recurring-bookings.service.test.ts" || echo "FAILED modules/recurring-bookings/recurring-bookings.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.test.ts" \
  -o backend/src/modules/recurring-bookings/recurring-bookings.test.ts \
  && echo "OK modules/recurring-bookings/recurring-bookings.test.ts" || echo "FAILED modules/recurring-bookings/recurring-bookings.test.ts"

# Campaigns module - 6 new

mkdir -p backend/src/modules/campaigns

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.schema.ts" \
  -o backend/src/modules/campaigns/campaigns.schema.ts \
  && echo "OK modules/campaigns/campaigns.schema.ts" || echo "FAILED modules/campaigns/campaigns.schema.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.service.ts" \
  -o backend/src/modules/campaigns/campaigns.service.ts \
  && echo "OK modules/campaigns/campaigns.service.ts" || echo "FAILED modules/campaigns/campaigns.service.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.controller.ts" \
  -o backend/src/modules/campaigns/campaigns.controller.ts \
  && echo "OK modules/campaigns/campaigns.controller.ts" || echo "FAILED modules/campaigns/campaigns.controller.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.routes.ts" \
  -o backend/src/modules/campaigns/campaigns.routes.ts \
  && echo "OK modules/campaigns/campaigns.routes.ts" || echo "FAILED modules/campaigns/campaigns.routes.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.service.test.ts" \
  -o backend/src/modules/campaigns/campaigns.service.test.ts \
  && echo "OK modules/campaigns/campaigns.service.test.ts" || echo "FAILED modules/campaigns/campaigns.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.test.ts" \
  -o backend/src/modules/campaigns/campaigns.test.ts \
  && echo "OK modules/campaigns/campaigns.test.ts" || echo "FAILED modules/campaigns/campaigns.test.ts"
```

### 1.3 Install dependencies and verify

```bash
cd backend
npm install
npx prisma generate
npx jest --forceExit
```

**Expected result:** 57 suites, 1194/1194 tests pass, 0 TS errors.
