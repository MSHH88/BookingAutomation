# Phase 0 + Phase 1 — Complete Update Guide

**What this does:** Deletes and re-downloads ALL 76 files changed across Phase 0
(Security & Architecture Foundation) and Phase 1 (Messaging Foundation), so your
local project is 100% in sync with the repo. Then you run `npm install` and test.

**Why 76 files instead of 51:** The old guide only had 51 Phase 1 files. It was
missing 25 Phase 0 files (auth middleware, roles module, tenants module, Prisma
schema, package.json, etc.). Without those, `auth.ts` was missing the `SUPER_ADMIN`
type, which caused every integration test to fail with a TS2322 error.

**Test count:** 57 suites, 1194/1194 tests, 0 TS errors.

---

## Step 1 — Open Terminal and go to your backend folder

```bash
cd ~/Desktop/Automation/backend
```

**Every command below assumes you are inside `~/Desktop/Automation/backend`.**
Do NOT `cd` anywhere else until the guide says you are done.

---

## Step 2 — Delete all 76 files

Copy-paste this entire block into Terminal. It deletes every file that will be
re-downloaded in Step 3 so you start with a clean slate.

```bash
cd ~/Desktop/Automation/backend && \
rm -f \
  package.json \
  prisma/schema.prisma \
  src/app.ts \
  src/config/businessType.ts \
  src/types/express.d.ts \
  src/middleware/auth.ts \
  src/middleware/auth.test.ts \
  src/middleware/requireRole.ts \
  src/middleware/requireLeadAccess.ts \
  src/middleware/requireLeadAccess.test.ts \
  src/modules/auth/auth.service.ts \
  src/modules/admin/admin.routes.ts \
  src/modules/admin/admin.schema.ts \
  src/modules/leads/leads.routes.ts \
  src/modules/leads/leads.test.ts \
  src/modules/roles/roles.schema.ts \
  src/modules/roles/roles.service.ts \
  src/modules/roles/roles.controller.ts \
  src/modules/roles/roles.routes.ts \
  src/modules/roles/roles.service.test.ts \
  src/modules/roles/roles.test.ts \
  src/modules/tenants/tenants.schema.ts \
  src/modules/tenants/tenants.service.ts \
  src/modules/tenants/tenants.controller.ts \
  src/modules/tenants/tenants.routes.ts \
  src/modules/tenants/tenants.service.test.ts \
  src/modules/tenants/tenants.test.ts \
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
  && echo "ALL 76 OLD FILES DELETED"
```

You should see: **`ALL 76 OLD FILES DELETED`**

---

## Step 3 — Download all 76 files

Copy-paste this entire block into Terminal. Every file is numbered so you can
see exactly which ones succeed or fail.

```bash
cd ~/Desktop/Automation/backend

BRANCH="copilot/create-detailed-automation-plan"
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/${BRANCH}"

mkdir -p prisma \
  src/config src/types src/jobs src/lib \
  src/middleware \
  src/modules/auth \
  src/modules/admin \
  src/modules/leads \
  src/modules/roles \
  src/modules/tenants \
  src/modules/messages \
  src/modules/whatsapp \
  src/modules/whatsapp-templates \
  src/modules/email-templates \
  src/modules/sms-templates \
  src/modules/sms \
  src/modules/recurring-bookings \
  src/modules/campaigns

curl -sfL "${BASE}/backend/package.json" \
  -o package.json \
  && echo "OK  1/76 package.json" || echo "FAILED  1/76 package.json"

curl -sfL "${BASE}/backend/prisma/schema.prisma" \
  -o prisma/schema.prisma \
  && echo "OK  2/76 prisma/schema.prisma" || echo "FAILED  2/76 prisma/schema.prisma"

curl -sfL "${BASE}/backend/src/app.ts" \
  -o src/app.ts \
  && echo "OK  3/76 src/app.ts" || echo "FAILED  3/76 src/app.ts"

curl -sfL "${BASE}/backend/src/config/businessType.ts" \
  -o src/config/businessType.ts \
  && echo "OK  4/76 src/config/businessType.ts" || echo "FAILED  4/76 src/config/businessType.ts"

curl -sfL "${BASE}/backend/src/types/express.d.ts" \
  -o src/types/express.d.ts \
  && echo "OK  5/76 src/types/express.d.ts" || echo "FAILED  5/76 src/types/express.d.ts"

curl -sfL "${BASE}/backend/src/middleware/auth.ts" \
  -o src/middleware/auth.ts \
  && echo "OK  6/76 src/middleware/auth.ts" || echo "FAILED  6/76 src/middleware/auth.ts"

curl -sfL "${BASE}/backend/src/middleware/auth.test.ts" \
  -o src/middleware/auth.test.ts \
  && echo "OK  7/76 src/middleware/auth.test.ts" || echo "FAILED  7/76 src/middleware/auth.test.ts"

curl -sfL "${BASE}/backend/src/middleware/requireRole.ts" \
  -o src/middleware/requireRole.ts \
  && echo "OK  8/76 src/middleware/requireRole.ts" || echo "FAILED  8/76 src/middleware/requireRole.ts"

curl -sfL "${BASE}/backend/src/middleware/requireLeadAccess.ts" \
  -o src/middleware/requireLeadAccess.ts \
  && echo "OK  9/76 src/middleware/requireLeadAccess.ts" || echo "FAILED  9/76 src/middleware/requireLeadAccess.ts"

curl -sfL "${BASE}/backend/src/middleware/requireLeadAccess.test.ts" \
  -o src/middleware/requireLeadAccess.test.ts \
  && echo "OK 10/76 src/middleware/requireLeadAccess.test.ts" || echo "FAILED 10/76 src/middleware/requireLeadAccess.test.ts"

curl -sfL "${BASE}/backend/src/modules/auth/auth.service.ts" \
  -o src/modules/auth/auth.service.ts \
  && echo "OK 11/76 src/modules/auth/auth.service.ts" || echo "FAILED 11/76 src/modules/auth/auth.service.ts"

curl -sfL "${BASE}/backend/src/modules/admin/admin.routes.ts" \
  -o src/modules/admin/admin.routes.ts \
  && echo "OK 12/76 src/modules/admin/admin.routes.ts" || echo "FAILED 12/76 src/modules/admin/admin.routes.ts"

curl -sfL "${BASE}/backend/src/modules/admin/admin.schema.ts" \
  -o src/modules/admin/admin.schema.ts \
  && echo "OK 13/76 src/modules/admin/admin.schema.ts" || echo "FAILED 13/76 src/modules/admin/admin.schema.ts"

curl -sfL "${BASE}/backend/src/modules/leads/leads.routes.ts" \
  -o src/modules/leads/leads.routes.ts \
  && echo "OK 14/76 src/modules/leads/leads.routes.ts" || echo "FAILED 14/76 src/modules/leads/leads.routes.ts"

curl -sfL "${BASE}/backend/src/modules/leads/leads.test.ts" \
  -o src/modules/leads/leads.test.ts \
  && echo "OK 15/76 src/modules/leads/leads.test.ts" || echo "FAILED 15/76 src/modules/leads/leads.test.ts"

curl -sfL "${BASE}/backend/src/modules/roles/roles.schema.ts" \
  -o src/modules/roles/roles.schema.ts \
  && echo "OK 16/76 src/modules/roles/roles.schema.ts" || echo "FAILED 16/76 src/modules/roles/roles.schema.ts"

curl -sfL "${BASE}/backend/src/modules/roles/roles.service.ts" \
  -o src/modules/roles/roles.service.ts \
  && echo "OK 17/76 src/modules/roles/roles.service.ts" || echo "FAILED 17/76 src/modules/roles/roles.service.ts"

curl -sfL "${BASE}/backend/src/modules/roles/roles.controller.ts" \
  -o src/modules/roles/roles.controller.ts \
  && echo "OK 18/76 src/modules/roles/roles.controller.ts" || echo "FAILED 18/76 src/modules/roles/roles.controller.ts"

curl -sfL "${BASE}/backend/src/modules/roles/roles.routes.ts" \
  -o src/modules/roles/roles.routes.ts \
  && echo "OK 19/76 src/modules/roles/roles.routes.ts" || echo "FAILED 19/76 src/modules/roles/roles.routes.ts"

curl -sfL "${BASE}/backend/src/modules/roles/roles.service.test.ts" \
  -o src/modules/roles/roles.service.test.ts \
  && echo "OK 20/76 src/modules/roles/roles.service.test.ts" || echo "FAILED 20/76 src/modules/roles/roles.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/roles/roles.test.ts" \
  -o src/modules/roles/roles.test.ts \
  && echo "OK 21/76 src/modules/roles/roles.test.ts" || echo "FAILED 21/76 src/modules/roles/roles.test.ts"

curl -sfL "${BASE}/backend/src/modules/tenants/tenants.schema.ts" \
  -o src/modules/tenants/tenants.schema.ts \
  && echo "OK 22/76 src/modules/tenants/tenants.schema.ts" || echo "FAILED 22/76 src/modules/tenants/tenants.schema.ts"

curl -sfL "${BASE}/backend/src/modules/tenants/tenants.service.ts" \
  -o src/modules/tenants/tenants.service.ts \
  && echo "OK 23/76 src/modules/tenants/tenants.service.ts" || echo "FAILED 23/76 src/modules/tenants/tenants.service.ts"

curl -sfL "${BASE}/backend/src/modules/tenants/tenants.controller.ts" \
  -o src/modules/tenants/tenants.controller.ts \
  && echo "OK 24/76 src/modules/tenants/tenants.controller.ts" || echo "FAILED 24/76 src/modules/tenants/tenants.controller.ts"

curl -sfL "${BASE}/backend/src/modules/tenants/tenants.routes.ts" \
  -o src/modules/tenants/tenants.routes.ts \
  && echo "OK 25/76 src/modules/tenants/tenants.routes.ts" || echo "FAILED 25/76 src/modules/tenants/tenants.routes.ts"

curl -sfL "${BASE}/backend/src/modules/tenants/tenants.service.test.ts" \
  -o src/modules/tenants/tenants.service.test.ts \
  && echo "OK 26/76 src/modules/tenants/tenants.service.test.ts" || echo "FAILED 26/76 src/modules/tenants/tenants.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/tenants/tenants.test.ts" \
  -o src/modules/tenants/tenants.test.ts \
  && echo "OK 27/76 src/modules/tenants/tenants.test.ts" || echo "FAILED 27/76 src/modules/tenants/tenants.test.ts"

curl -sfL "${BASE}/backend/src/jobs/index.ts" \
  -o src/jobs/index.ts \
  && echo "OK 28/76 src/jobs/index.ts" || echo "FAILED 28/76 src/jobs/index.ts"

curl -sfL "${BASE}/backend/src/jobs/campaign.job.ts" \
  -o src/jobs/campaign.job.ts \
  && echo "OK 29/76 src/jobs/campaign.job.ts" || echo "FAILED 29/76 src/jobs/campaign.job.ts"

curl -sfL "${BASE}/backend/src/jobs/birthday.job.ts" \
  -o src/jobs/birthday.job.ts \
  && echo "OK 30/76 src/jobs/birthday.job.ts" || echo "FAILED 30/76 src/jobs/birthday.job.ts"

curl -sfL "${BASE}/backend/src/jobs/birthday.job.test.ts" \
  -o src/jobs/birthday.job.test.ts \
  && echo "OK 31/76 src/jobs/birthday.job.test.ts" || echo "FAILED 31/76 src/jobs/birthday.job.test.ts"

curl -sfL "${BASE}/backend/src/jobs/rebook-nudge.job.ts" \
  -o src/jobs/rebook-nudge.job.ts \
  && echo "OK 32/76 src/jobs/rebook-nudge.job.ts" || echo "FAILED 32/76 src/jobs/rebook-nudge.job.ts"

curl -sfL "${BASE}/backend/src/jobs/rebook-nudge.job.test.ts" \
  -o src/jobs/rebook-nudge.job.test.ts \
  && echo "OK 33/76 src/jobs/rebook-nudge.job.test.ts" || echo "FAILED 33/76 src/jobs/rebook-nudge.job.test.ts"

curl -sfL "${BASE}/backend/src/jobs/recurring-booking.job.ts" \
  -o src/jobs/recurring-booking.job.ts \
  && echo "OK 34/76 src/jobs/recurring-booking.job.ts" || echo "FAILED 34/76 src/jobs/recurring-booking.job.ts"

curl -sfL "${BASE}/backend/src/lib/notification-dispatcher.ts" \
  -o src/lib/notification-dispatcher.ts \
  && echo "OK 35/76 src/lib/notification-dispatcher.ts" || echo "FAILED 35/76 src/lib/notification-dispatcher.ts"

curl -sfL "${BASE}/backend/src/lib/template-renderer.ts" \
  -o src/lib/template-renderer.ts \
  && echo "OK 36/76 src/lib/template-renderer.ts" || echo "FAILED 36/76 src/lib/template-renderer.ts"

curl -sfL "${BASE}/backend/src/lib/twilio-sms.ts" \
  -o src/lib/twilio-sms.ts \
  && echo "OK 37/76 src/lib/twilio-sms.ts" || echo "FAILED 37/76 src/lib/twilio-sms.ts"

curl -sfL "${BASE}/backend/src/lib/resend.ts" \
  -o src/lib/resend.ts \
  && echo "OK 38/76 src/lib/resend.ts" || echo "FAILED 38/76 src/lib/resend.ts"

curl -sfL "${BASE}/backend/src/modules/messages/messages.routes.ts" \
  -o src/modules/messages/messages.routes.ts \
  && echo "OK 39/76 src/modules/messages/messages.routes.ts" || echo "FAILED 39/76 src/modules/messages/messages.routes.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.schema.ts" \
  -o src/modules/whatsapp/whatsapp.schema.ts \
  && echo "OK 40/76 src/modules/whatsapp/whatsapp.schema.ts" || echo "FAILED 40/76 src/modules/whatsapp/whatsapp.schema.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.service.ts" \
  -o src/modules/whatsapp/whatsapp.service.ts \
  && echo "OK 41/76 src/modules/whatsapp/whatsapp.service.ts" || echo "FAILED 41/76 src/modules/whatsapp/whatsapp.service.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.controller.ts" \
  -o src/modules/whatsapp/whatsapp.controller.ts \
  && echo "OK 42/76 src/modules/whatsapp/whatsapp.controller.ts" || echo "FAILED 42/76 src/modules/whatsapp/whatsapp.controller.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.routes.ts" \
  -o src/modules/whatsapp/whatsapp.routes.ts \
  && echo "OK 43/76 src/modules/whatsapp/whatsapp.routes.ts" || echo "FAILED 43/76 src/modules/whatsapp/whatsapp.routes.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.queue.ts" \
  -o src/modules/whatsapp/whatsapp.queue.ts \
  && echo "OK 44/76 src/modules/whatsapp/whatsapp.queue.ts" || echo "FAILED 44/76 src/modules/whatsapp/whatsapp.queue.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp/whatsapp.service.test.ts" \
  -o src/modules/whatsapp/whatsapp.service.test.ts \
  && echo "OK 45/76 src/modules/whatsapp/whatsapp.service.test.ts" || echo "FAILED 45/76 src/modules/whatsapp/whatsapp.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.schema.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.schema.ts \
  && echo "OK 46/76 src/modules/whatsapp-templates/whatsapp-templates.schema.ts" || echo "FAILED 46/76 src/modules/whatsapp-templates/whatsapp-templates.schema.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.service.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.service.ts \
  && echo "OK 47/76 src/modules/whatsapp-templates/whatsapp-templates.service.ts" || echo "FAILED 47/76 src/modules/whatsapp-templates/whatsapp-templates.service.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.controller.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.controller.ts \
  && echo "OK 48/76 src/modules/whatsapp-templates/whatsapp-templates.controller.ts" || echo "FAILED 48/76 src/modules/whatsapp-templates/whatsapp-templates.controller.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.routes.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.routes.ts \
  && echo "OK 49/76 src/modules/whatsapp-templates/whatsapp-templates.routes.ts" || echo "FAILED 49/76 src/modules/whatsapp-templates/whatsapp-templates.routes.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.service.test.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.service.test.ts \
  && echo "OK 50/76 src/modules/whatsapp-templates/whatsapp-templates.service.test.ts" || echo "FAILED 50/76 src/modules/whatsapp-templates/whatsapp-templates.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/whatsapp-templates/whatsapp-templates.test.ts" \
  -o src/modules/whatsapp-templates/whatsapp-templates.test.ts \
  && echo "OK 51/76 src/modules/whatsapp-templates/whatsapp-templates.test.ts" || echo "FAILED 51/76 src/modules/whatsapp-templates/whatsapp-templates.test.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.schema.ts" \
  -o src/modules/email-templates/email-templates.schema.ts \
  && echo "OK 52/76 src/modules/email-templates/email-templates.schema.ts" || echo "FAILED 52/76 src/modules/email-templates/email-templates.schema.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.service.ts" \
  -o src/modules/email-templates/email-templates.service.ts \
  && echo "OK 53/76 src/modules/email-templates/email-templates.service.ts" || echo "FAILED 53/76 src/modules/email-templates/email-templates.service.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.controller.ts" \
  -o src/modules/email-templates/email-templates.controller.ts \
  && echo "OK 54/76 src/modules/email-templates/email-templates.controller.ts" || echo "FAILED 54/76 src/modules/email-templates/email-templates.controller.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.routes.ts" \
  -o src/modules/email-templates/email-templates.routes.ts \
  && echo "OK 55/76 src/modules/email-templates/email-templates.routes.ts" || echo "FAILED 55/76 src/modules/email-templates/email-templates.routes.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.service.test.ts" \
  -o src/modules/email-templates/email-templates.service.test.ts \
  && echo "OK 56/76 src/modules/email-templates/email-templates.service.test.ts" || echo "FAILED 56/76 src/modules/email-templates/email-templates.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/email-templates/email-templates.test.ts" \
  -o src/modules/email-templates/email-templates.test.ts \
  && echo "OK 57/76 src/modules/email-templates/email-templates.test.ts" || echo "FAILED 57/76 src/modules/email-templates/email-templates.test.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.schema.ts" \
  -o src/modules/sms-templates/sms-templates.schema.ts \
  && echo "OK 58/76 src/modules/sms-templates/sms-templates.schema.ts" || echo "FAILED 58/76 src/modules/sms-templates/sms-templates.schema.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.service.ts" \
  -o src/modules/sms-templates/sms-templates.service.ts \
  && echo "OK 59/76 src/modules/sms-templates/sms-templates.service.ts" || echo "FAILED 59/76 src/modules/sms-templates/sms-templates.service.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.controller.ts" \
  -o src/modules/sms-templates/sms-templates.controller.ts \
  && echo "OK 60/76 src/modules/sms-templates/sms-templates.controller.ts" || echo "FAILED 60/76 src/modules/sms-templates/sms-templates.controller.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.routes.ts" \
  -o src/modules/sms-templates/sms-templates.routes.ts \
  && echo "OK 61/76 src/modules/sms-templates/sms-templates.routes.ts" || echo "FAILED 61/76 src/modules/sms-templates/sms-templates.routes.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.service.test.ts" \
  -o src/modules/sms-templates/sms-templates.service.test.ts \
  && echo "OK 62/76 src/modules/sms-templates/sms-templates.service.test.ts" || echo "FAILED 62/76 src/modules/sms-templates/sms-templates.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/sms-templates/sms-templates.test.ts" \
  -o src/modules/sms-templates/sms-templates.test.ts \
  && echo "OK 63/76 src/modules/sms-templates/sms-templates.test.ts" || echo "FAILED 63/76 src/modules/sms-templates/sms-templates.test.ts"

curl -sfL "${BASE}/backend/src/modules/sms/sms.queue.ts" \
  -o src/modules/sms/sms.queue.ts \
  && echo "OK 64/76 src/modules/sms/sms.queue.ts" || echo "FAILED 64/76 src/modules/sms/sms.queue.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.schema.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.schema.ts \
  && echo "OK 65/76 src/modules/recurring-bookings/recurring-bookings.schema.ts" || echo "FAILED 65/76 src/modules/recurring-bookings/recurring-bookings.schema.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.service.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.service.ts \
  && echo "OK 66/76 src/modules/recurring-bookings/recurring-bookings.service.ts" || echo "FAILED 66/76 src/modules/recurring-bookings/recurring-bookings.service.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.controller.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.controller.ts \
  && echo "OK 67/76 src/modules/recurring-bookings/recurring-bookings.controller.ts" || echo "FAILED 67/76 src/modules/recurring-bookings/recurring-bookings.controller.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.routes.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.routes.ts \
  && echo "OK 68/76 src/modules/recurring-bookings/recurring-bookings.routes.ts" || echo "FAILED 68/76 src/modules/recurring-bookings/recurring-bookings.routes.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.service.test.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.service.test.ts \
  && echo "OK 69/76 src/modules/recurring-bookings/recurring-bookings.service.test.ts" || echo "FAILED 69/76 src/modules/recurring-bookings/recurring-bookings.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/recurring-bookings/recurring-bookings.test.ts" \
  -o src/modules/recurring-bookings/recurring-bookings.test.ts \
  && echo "OK 70/76 src/modules/recurring-bookings/recurring-bookings.test.ts" || echo "FAILED 70/76 src/modules/recurring-bookings/recurring-bookings.test.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.schema.ts" \
  -o src/modules/campaigns/campaigns.schema.ts \
  && echo "OK 71/76 src/modules/campaigns/campaigns.schema.ts" || echo "FAILED 71/76 src/modules/campaigns/campaigns.schema.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.service.ts" \
  -o src/modules/campaigns/campaigns.service.ts \
  && echo "OK 72/76 src/modules/campaigns/campaigns.service.ts" || echo "FAILED 72/76 src/modules/campaigns/campaigns.service.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.controller.ts" \
  -o src/modules/campaigns/campaigns.controller.ts \
  && echo "OK 73/76 src/modules/campaigns/campaigns.controller.ts" || echo "FAILED 73/76 src/modules/campaigns/campaigns.controller.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.routes.ts" \
  -o src/modules/campaigns/campaigns.routes.ts \
  && echo "OK 74/76 src/modules/campaigns/campaigns.routes.ts" || echo "FAILED 74/76 src/modules/campaigns/campaigns.routes.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.service.test.ts" \
  -o src/modules/campaigns/campaigns.service.test.ts \
  && echo "OK 75/76 src/modules/campaigns/campaigns.service.test.ts" || echo "FAILED 75/76 src/modules/campaigns/campaigns.service.test.ts"

curl -sfL "${BASE}/backend/src/modules/campaigns/campaigns.test.ts" \
  -o src/modules/campaigns/campaigns.test.ts \
  && echo "OK 76/76 src/modules/campaigns/campaigns.test.ts" || echo "FAILED 76/76 src/modules/campaigns/campaigns.test.ts"
```

You should see **`OK`** for all 76 lines. If any say **`FAILED`**, re-run that
single curl line on its own.

---

## Step 4 — Install dependencies, generate Prisma, and migrate the database

```bash
cd ~/Desktop/Automation/backend
npm install
npx prisma generate
npx prisma migrate dev --name phase1
```

> If Prisma asks "Do you want to reset the database?" type **y** and press Enter.
> This is normal in development when the schema has new models.

---

## Step 5 — Run all tests

```bash
cd ~/Desktop/Automation/backend
npx jest --forceExit
```

**Expected result:** **57 suites, 1194/1194 tests pass, 0 TS errors.**

If any suite says FAILED, scroll up to see the error message and check that all
76 downloads in Step 3 said OK.
