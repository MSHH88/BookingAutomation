# Step-By-Step Guide — Full Backend Sync

> **Branch:** `copilot/create-detailed-automation-plan`
> **Owner/Repo:** `MSHH88/BookingAutomation`
> **Total files to download:** **371** (split into 2 parts)
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

1. **Follow this updated guide** — it downloads ALL 371 backend files (everything except `.env`)
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

## Step 1 — Delete old files (Part 1 of 2: files 1–186)

Run from `~/Desktop/Automation/backend`:

```bash
cd ~/Desktop/Automation/backend
rm -f ".dockerignore"
rm -f ".gitignore"
rm -f "Dockerfile"
rm -f "jest.setup.ts"
rm -f "package.json"
rm -f "prisma/migrations/20260414000001_remove_gift_voucher_enabled/migration.sql"
rm -f "prisma/migrations/20260414000002_feature_flag_per_tenant_unique/migration.sql"
rm -f "prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql"
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
echo "Part 1 delete done (186 files)"
```

---

## Step 2 — Delete old files (Part 2 of 2: files 187–371)

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
echo "Part 2 delete done (185 files). Total: 371 files deleted."
```

---

## Step 3 — Create all directories

```bash
cd ~/Desktop/Automation/backend
mkdir -p "prisma"
mkdir -p "prisma/migrations/20260414000001_remove_gift_voucher_enabled"
mkdir -p "prisma/migrations/20260414000002_feature_flag_per_tenant_unique"
mkdir -p "prisma/migrations/20260415000001_email_template_tenant_key_unique"
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

## Step 4 — Download ALL files (Part 1 of 2: files 1–186)

**IMPORTANT:** Run from `~/Desktop/Automation/backend`. Copy-paste this ENTIRE block at once.

```bash
cd ~/Desktop/Automation/backend

B="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

dl() {
  curl -sfL -o "$1" "$B/$1"
  if [ $? -eq 0 ]; then echo "OK  $2"; else echo "FAILED $2"; fi
}

dl ".dockerignore" "  1/371"
dl ".gitignore" "  2/371"
dl "Dockerfile" "  3/371"
dl "jest.setup.ts" "  4/371"
dl "package.json" "  5/371"
dl "prisma/migrations/20260414000001_remove_gift_voucher_enabled/migration.sql" "  6/371"
dl "prisma/migrations/20260414000002_feature_flag_per_tenant_unique/migration.sql" "  7/371"
dl "prisma/migrations/20260415000001_email_template_tenant_key_unique/migration.sql" "  8/371"
dl "prisma/schema.prisma" "  9/371"
dl "src/app.ts" " 10/371"
dl "src/config/businessType.test.ts" " 11/371"
dl "src/config/businessType.ts" " 12/371"
dl "src/config/index.ts" " 13/371"
dl "src/errors/AppError.ts" " 14/371"
dl "src/index.ts" " 15/371"
dl "src/jobs/ai-suggestion.job.test.ts" " 16/371"
dl "src/jobs/ai-suggestion.job.ts" " 17/371"
dl "src/jobs/birthday.job.test.ts" " 18/371"
dl "src/jobs/birthday.job.ts" " 19/371"
dl "src/jobs/campaign.job.ts" " 20/371"
dl "src/jobs/index.ts" " 21/371"
dl "src/jobs/invoice-overdue.job.ts" " 22/371"
dl "src/jobs/no-show.job.test.ts" " 23/371"
dl "src/jobs/no-show.job.ts" " 24/371"
dl "src/jobs/rebook-nudge.job.test.ts" " 25/371"
dl "src/jobs/rebook-nudge.job.ts" " 26/371"
dl "src/jobs/recurring-booking.job.ts" " 27/371"
dl "src/jobs/waitlist-match.job.ts" " 28/371"
dl "src/lib/apple-calendar.ts" " 29/371"
dl "src/lib/cloudinary.ts" " 30/371"
dl "src/lib/google-calendar.ts" " 31/371"
dl "src/lib/notification-dispatcher.ts" " 32/371"
dl "src/lib/openai.ts" " 33/371"
dl "src/lib/outlook-calendar.ts" " 34/371"
dl "src/lib/pricing-engine.test.ts" " 35/371"
dl "src/lib/pricing-engine.ts" " 36/371"
dl "src/lib/prisma.ts" " 37/371"
dl "src/lib/push-notifications.ts" " 38/371"
dl "src/lib/redis.ts" " 39/371"
dl "src/lib/resend.ts" " 40/371"
dl "src/lib/stripe.ts" " 41/371"
dl "src/lib/template-renderer.ts" " 42/371"
dl "src/lib/twilio-sms.ts" " 43/371"
dl "src/lib/twilio.ts" " 44/371"
dl "src/middleware/auth.test.ts" " 45/371"
dl "src/middleware/auth.ts" " 46/371"
dl "src/middleware/captcha.ts" " 47/371"
dl "src/middleware/errorHandler.ts" " 48/371"
dl "src/middleware/requestLogger.ts" " 49/371"
dl "src/middleware/requireFeature.ts" " 50/371"
dl "src/middleware/requireLeadAccess.test.ts" " 51/371"
dl "src/middleware/requireLeadAccess.ts" " 52/371"
dl "src/middleware/requireRole.ts" " 53/371"
dl "src/middleware/upload.ts" " 54/371"
dl "src/middleware/validate.ts" " 55/371"
dl "src/modules/admin/admin.controller.ts" " 56/371"
dl "src/modules/admin/admin.routes.ts" " 57/371"
dl "src/modules/admin/admin.schema.ts" " 58/371"
dl "src/modules/admin/admin.service.test.ts" " 59/371"
dl "src/modules/admin/admin.service.ts" " 60/371"
dl "src/modules/ai/ai.controller.ts" " 61/371"
dl "src/modules/ai/ai.routes.ts" " 62/371"
dl "src/modules/ai/ai.schema.ts" " 63/371"
dl "src/modules/ai/ai.service.test.ts" " 64/371"
dl "src/modules/ai/ai.service.ts" " 65/371"
dl "src/modules/alerts/alerts.controller.ts" " 66/371"
dl "src/modules/alerts/alerts.routes.ts" " 67/371"
dl "src/modules/alerts/alerts.schema.ts" " 68/371"
dl "src/modules/alerts/alerts.service.test.ts" " 69/371"
dl "src/modules/alerts/alerts.service.ts" " 70/371"
dl "src/modules/alerts/alerts.test.ts" " 71/371"
dl "src/modules/analytics/analytics.controller.ts" " 72/371"
dl "src/modules/analytics/analytics.routes.ts" " 73/371"
dl "src/modules/analytics/analytics.schema.ts" " 74/371"
dl "src/modules/analytics/analytics.service.test.ts" " 75/371"
dl "src/modules/analytics/analytics.service.ts" " 76/371"
dl "src/modules/analytics/analytics.test.ts" " 77/371"
dl "src/modules/artists/artist-media.controller.ts" " 78/371"
dl "src/modules/artists/artist-media.service.test.ts" " 79/371"
dl "src/modules/artists/artist-media.service.ts" " 80/371"
dl "src/modules/artists/artists.controller.ts" " 81/371"
dl "src/modules/artists/artists.routes.ts" " 82/371"
dl "src/modules/artists/artists.schema.ts" " 83/371"
dl "src/modules/artists/artists.service.ts" " 84/371"
dl "src/modules/artists/artists.test.ts" " 85/371"
dl "src/modules/auth/auth.controller.ts" " 86/371"
dl "src/modules/auth/auth.email.processor.ts" " 87/371"
dl "src/modules/auth/auth.email.queue.ts" " 88/371"
dl "src/modules/auth/auth.routes.ts" " 89/371"
dl "src/modules/auth/auth.schema.ts" " 90/371"
dl "src/modules/auth/auth.service.test.ts" " 91/371"
dl "src/modules/auth/auth.service.ts" " 92/371"
dl "src/modules/auth/auth.test.ts" " 93/371"
dl "src/modules/availability/availability.controller.ts" " 94/371"
dl "src/modules/availability/availability.routes.ts" " 95/371"
dl "src/modules/availability/availability.schema.ts" " 96/371"
dl "src/modules/availability/availability.service.test.ts" " 97/371"
dl "src/modules/availability/availability.service.ts" " 98/371"
dl "src/modules/availability/availability.test.ts" " 99/371"
dl "src/modules/booking-photos/booking-photos.controller.ts" "100/371"
dl "src/modules/booking-photos/booking-photos.routes.ts" "101/371"
dl "src/modules/booking-photos/booking-photos.schema.ts" "102/371"
dl "src/modules/booking-photos/booking-photos.service.test.ts" "103/371"
dl "src/modules/booking-photos/booking-photos.service.ts" "104/371"
dl "src/modules/booking-photos/booking-photos.test.ts" "105/371"
dl "src/modules/bookings/bookings.controller.ts" "106/371"
dl "src/modules/bookings/bookings.routes.ts" "107/371"
dl "src/modules/bookings/bookings.schema.ts" "108/371"
dl "src/modules/bookings/bookings.service.test.ts" "109/371"
dl "src/modules/bookings/bookings.service.ts" "110/371"
dl "src/modules/bookings/bookings.test.ts" "111/371"
dl "src/modules/calendar/apple-calendar.controller.ts" "112/371"
dl "src/modules/calendar/apple-calendar.service.test.ts" "113/371"
dl "src/modules/calendar/apple-calendar.service.ts" "114/371"
dl "src/modules/calendar/calendar.controller.ts" "115/371"
dl "src/modules/calendar/calendar.routes.ts" "116/371"
dl "src/modules/calendar/calendar.schema.ts" "117/371"
dl "src/modules/calendar/calendar.service.test.ts" "118/371"
dl "src/modules/calendar/calendar.service.ts" "119/371"
dl "src/modules/calendar/calendar.test.ts" "120/371"
dl "src/modules/calendar/outlook-calendar.controller.ts" "121/371"
dl "src/modules/calendar/outlook-calendar.service.test.ts" "122/371"
dl "src/modules/calendar/outlook-calendar.service.ts" "123/371"
dl "src/modules/campaigns/campaigns.controller.ts" "124/371"
dl "src/modules/campaigns/campaigns.routes.ts" "125/371"
dl "src/modules/campaigns/campaigns.schema.ts" "126/371"
dl "src/modules/campaigns/campaigns.service.test.ts" "127/371"
dl "src/modules/campaigns/campaigns.service.ts" "128/371"
dl "src/modules/campaigns/campaigns.test.ts" "129/371"
dl "src/modules/capture/capture.controller.ts" "130/371"
dl "src/modules/capture/capture.routes.ts" "131/371"
dl "src/modules/capture/capture.schema.ts" "132/371"
dl "src/modules/capture/capture.service.test.ts" "133/371"
dl "src/modules/capture/capture.service.ts" "134/371"
dl "src/modules/customer-stats/customer-stats.controller.ts" "135/371"
dl "src/modules/customer-stats/customer-stats.routes.ts" "136/371"
dl "src/modules/customer-stats/customer-stats.schema.ts" "137/371"
dl "src/modules/customer-stats/customer-stats.service.test.ts" "138/371"
dl "src/modules/customer-stats/customer-stats.service.ts" "139/371"
dl "src/modules/customer-stats/customer-stats.test.ts" "140/371"
dl "src/modules/customers/customers.controller.ts" "141/371"
dl "src/modules/customers/customers.routes.ts" "142/371"
dl "src/modules/customers/customers.schema.ts" "143/371"
dl "src/modules/customers/customers.service.test.ts" "144/371"
dl "src/modules/customers/customers.service.ts" "145/371"
dl "src/modules/email-templates/email-templates.controller.ts" "146/371"
dl "src/modules/email-templates/email-templates.routes.ts" "147/371"
dl "src/modules/email-templates/email-templates.schema.ts" "148/371"
dl "src/modules/email-templates/email-templates.service.test.ts" "149/371"
dl "src/modules/email-templates/email-templates.service.ts" "150/371"
dl "src/modules/email-templates/email-templates.test.ts" "151/371"
dl "src/modules/features/features.test.ts" "152/371"
dl "src/modules/forms/forms.controller.ts" "153/371"
dl "src/modules/forms/forms.routes.ts" "154/371"
dl "src/modules/forms/forms.schema.ts" "155/371"
dl "src/modules/forms/forms.service.test.ts" "156/371"
dl "src/modules/forms/forms.service.ts" "157/371"
dl "src/modules/forms/forms.test.ts" "158/371"
dl "src/modules/gift-cards/gift-cards.controller.ts" "159/371"
dl "src/modules/gift-cards/gift-cards.routes.ts" "160/371"
dl "src/modules/gift-cards/gift-cards.schema.ts" "161/371"
dl "src/modules/gift-cards/gift-cards.service.test.ts" "162/371"
dl "src/modules/gift-cards/gift-cards.service.ts" "163/371"
dl "src/modules/gift-cards/gift-cards.test.ts" "164/371"
dl "src/modules/health-flags/health-flags.controller.ts" "165/371"
dl "src/modules/health-flags/health-flags.routes.ts" "166/371"
dl "src/modules/health-flags/health-flags.schema.ts" "167/371"
dl "src/modules/health-flags/health-flags.service.test.ts" "168/371"
dl "src/modules/health-flags/health-flags.service.ts" "169/371"
dl "src/modules/health-flags/health-flags.test.ts" "170/371"
dl "src/modules/invoices/invoices.controller.ts" "171/371"
dl "src/modules/invoices/invoices.routes.ts" "172/371"
dl "src/modules/invoices/invoices.schema.ts" "173/371"
dl "src/modules/invoices/invoices.service.test.ts" "174/371"
dl "src/modules/invoices/invoices.service.ts" "175/371"
dl "src/modules/invoices/invoices.test.ts" "176/371"
dl "src/modules/leads/leads.controller.ts" "177/371"
dl "src/modules/leads/leads.routes.ts" "178/371"
dl "src/modules/leads/leads.schema.ts" "179/371"
dl "src/modules/leads/leads.service.test.ts" "180/371"
dl "src/modules/leads/leads.service.ts" "181/371"
dl "src/modules/leads/leads.test.ts" "182/371"
dl "src/modules/locations/locations.controller.ts" "183/371"
dl "src/modules/locations/locations.routes.ts" "184/371"
dl "src/modules/locations/locations.schema.ts" "185/371"
dl "src/modules/locations/locations.service.ts" "186/371"

echo "Part 1 download done (186/371)"
```

**After running:** You should see `OK` for all 186 lines. If ANY line says `FAILED`, re-run that specific `dl` line.

---

## Step 5 — Download ALL files (Part 2 of 2: files 187–371)

```bash
cd ~/Desktop/Automation/backend

B="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

dl() {
  curl -sfL -o "$1" "$B/$1"
  if [ $? -eq 0 ]; then echo "OK  $2"; else echo "FAILED $2"; fi
}

dl "src/modules/locations/locations.test.ts" "187/371"
dl "src/modules/loyalty/loyalty.controller.ts" "188/371"
dl "src/modules/loyalty/loyalty.routes.ts" "189/371"
dl "src/modules/loyalty/loyalty.schema.ts" "190/371"
dl "src/modules/loyalty/loyalty.service.test.ts" "191/371"
dl "src/modules/loyalty/loyalty.service.ts" "192/371"
dl "src/modules/loyalty/loyalty.test.ts" "193/371"
dl "src/modules/memberships/memberships.controller.ts" "194/371"
dl "src/modules/memberships/memberships.routes.ts" "195/371"
dl "src/modules/memberships/memberships.schema.ts" "196/371"
dl "src/modules/memberships/memberships.service.test.ts" "197/371"
dl "src/modules/memberships/memberships.service.ts" "198/371"
dl "src/modules/memberships/memberships.test.ts" "199/371"
dl "src/modules/messages/messages.routes.ts" "200/371"
dl "src/modules/notifications/notifications.controller.ts" "201/371"
dl "src/modules/notifications/notifications.routes.ts" "202/371"
dl "src/modules/notifications/notifications.schema.ts" "203/371"
dl "src/modules/notifications/notifications.service.test.ts" "204/371"
dl "src/modules/notifications/notifications.service.ts" "205/371"
dl "src/modules/packages/packages.controller.ts" "206/371"
dl "src/modules/packages/packages.routes.ts" "207/371"
dl "src/modules/packages/packages.schema.ts" "208/371"
dl "src/modules/packages/packages.service.test.ts" "209/371"
dl "src/modules/packages/packages.service.ts" "210/371"
dl "src/modules/packages/packages.test.ts" "211/371"
dl "src/modules/payments/payments.controller.ts" "212/371"
dl "src/modules/payments/payments.routes.ts" "213/371"
dl "src/modules/payments/payments.schema.ts" "214/371"
dl "src/modules/payments/payments.service.test.ts" "215/371"
dl "src/modules/payments/payments.service.ts" "216/371"
dl "src/modules/payments/payments.test.ts" "217/371"
dl "src/modules/payroll/payroll.controller.ts" "218/371"
dl "src/modules/payroll/payroll.routes.ts" "219/371"
dl "src/modules/payroll/payroll.schema.ts" "220/371"
dl "src/modules/payroll/payroll.service.test.ts" "221/371"
dl "src/modules/payroll/payroll.service.ts" "222/371"
dl "src/modules/payroll/payroll.test.ts" "223/371"
dl "src/modules/pos/pos.controller.ts" "224/371"
dl "src/modules/pos/pos.routes.ts" "225/371"
dl "src/modules/pos/pos.schema.ts" "226/371"
dl "src/modules/pos/pos.service.test.ts" "227/371"
dl "src/modules/pos/pos.service.ts" "228/371"
dl "src/modules/pos/pos.test.ts" "229/371"
dl "src/modules/pricing/pricing.controller.ts" "230/371"
dl "src/modules/pricing/pricing.routes.ts" "231/371"
dl "src/modules/pricing/pricing.schema.ts" "232/371"
dl "src/modules/pricing/pricing.service.ts" "233/371"
dl "src/modules/pricing/pricing.test.ts" "234/371"
dl "src/modules/products/products.controller.ts" "235/371"
dl "src/modules/products/products.routes.ts" "236/371"
dl "src/modules/products/products.schema.ts" "237/371"
dl "src/modules/products/products.service.test.ts" "238/371"
dl "src/modules/products/products.service.ts" "239/371"
dl "src/modules/products/products.test.ts" "240/371"
dl "src/modules/public/public.controller.ts" "241/371"
dl "src/modules/public/public.routes.ts" "242/371"
dl "src/modules/public/public.schema.ts" "243/371"
dl "src/modules/public/public.service.test.ts" "244/371"
dl "src/modules/public/public.service.ts" "245/371"
dl "src/modules/public/public.test.ts" "246/371"
dl "src/modules/push/push.routes.ts" "247/371"
dl "src/modules/push/push.service.test.ts" "248/371"
dl "src/modules/push/push.service.ts" "249/371"
dl "src/modules/quotes/quotes.controller.ts" "250/371"
dl "src/modules/quotes/quotes.routes.ts" "251/371"
dl "src/modules/quotes/quotes.schema.ts" "252/371"
dl "src/modules/quotes/quotes.service.test.ts" "253/371"
dl "src/modules/quotes/quotes.service.ts" "254/371"
dl "src/modules/quotes/quotes.test.ts" "255/371"
dl "src/modules/recurring-bookings/recurring-bookings.controller.ts" "256/371"
dl "src/modules/recurring-bookings/recurring-bookings.routes.ts" "257/371"
dl "src/modules/recurring-bookings/recurring-bookings.schema.ts" "258/371"
dl "src/modules/recurring-bookings/recurring-bookings.service.test.ts" "259/371"
dl "src/modules/recurring-bookings/recurring-bookings.service.ts" "260/371"
dl "src/modules/recurring-bookings/recurring-bookings.test.ts" "261/371"
dl "src/modules/referrals/referrals.controller.ts" "262/371"
dl "src/modules/referrals/referrals.routes.ts" "263/371"
dl "src/modules/referrals/referrals.schema.ts" "264/371"
dl "src/modules/referrals/referrals.service.test.ts" "265/371"
dl "src/modules/referrals/referrals.service.ts" "266/371"
dl "src/modules/referrals/referrals.test.ts" "267/371"
dl "src/modules/reminders/reminders.processor.ts" "268/371"
dl "src/modules/reminders/reminders.queue.test.ts" "269/371"
dl "src/modules/reminders/reminders.queue.ts" "270/371"
dl "src/modules/reviews/reviews.processor.ts" "271/371"
dl "src/modules/reviews/reviews.queue.test.ts" "272/371"
dl "src/modules/reviews/reviews.queue.ts" "273/371"
dl "src/modules/roles/roles.controller.ts" "274/371"
dl "src/modules/roles/roles.routes.ts" "275/371"
dl "src/modules/roles/roles.schema.ts" "276/371"
dl "src/modules/roles/roles.service.test.ts" "277/371"
dl "src/modules/roles/roles.service.ts" "278/371"
dl "src/modules/roles/roles.test.ts" "279/371"
dl "src/modules/rota/rota.controller.ts" "280/371"
dl "src/modules/rota/rota.routes.ts" "281/371"
dl "src/modules/rota/rota.schema.ts" "282/371"
dl "src/modules/rota/rota.service.test.ts" "283/371"
dl "src/modules/rota/rota.service.ts" "284/371"
dl "src/modules/rota/rota.test.ts" "285/371"
dl "src/modules/services/services.controller.ts" "286/371"
dl "src/modules/services/services.routes.ts" "287/371"
dl "src/modules/services/services.schema.ts" "288/371"
dl "src/modules/services/services.service.test.ts" "289/371"
dl "src/modules/services/services.service.ts" "290/371"
dl "src/modules/services/services.test.ts" "291/371"
dl "src/modules/sessions/sessions.controller.ts" "292/371"
dl "src/modules/sessions/sessions.routes.ts" "293/371"
dl "src/modules/sessions/sessions.schema.ts" "294/371"
dl "src/modules/sessions/sessions.service.ts" "295/371"
dl "src/modules/sessions/sessions.test.ts" "296/371"
dl "src/modules/settings/settings.controller.ts" "297/371"
dl "src/modules/settings/settings.routes.ts" "298/371"
dl "src/modules/settings/settings.schema.ts" "299/371"
dl "src/modules/settings/settings.service.test.ts" "300/371"
dl "src/modules/settings/settings.service.ts" "301/371"
dl "src/modules/settings/settings.test.ts" "302/371"
dl "src/modules/sms-templates/sms-templates.controller.ts" "303/371"
dl "src/modules/sms-templates/sms-templates.routes.ts" "304/371"
dl "src/modules/sms-templates/sms-templates.schema.ts" "305/371"
dl "src/modules/sms-templates/sms-templates.service.test.ts" "306/371"
dl "src/modules/sms-templates/sms-templates.service.ts" "307/371"
dl "src/modules/sms-templates/sms-templates.test.ts" "308/371"
dl "src/modules/sms/sms.queue.ts" "309/371"
dl "src/modules/social/social.controller.ts" "310/371"
dl "src/modules/social/social.routes.ts" "311/371"
dl "src/modules/social/social.schema.ts" "312/371"
dl "src/modules/social/social.service.test.ts" "313/371"
dl "src/modules/social/social.service.ts" "314/371"
dl "src/modules/social/social.test.ts" "315/371"
dl "src/modules/styles/styles.controller.ts" "316/371"
dl "src/modules/styles/styles.routes.ts" "317/371"
dl "src/modules/styles/styles.schema.ts" "318/371"
dl "src/modules/styles/styles.service.test.ts" "319/371"
dl "src/modules/styles/styles.service.ts" "320/371"
dl "src/modules/styles/styles.test.ts" "321/371"
dl "src/modules/tables/tables.controller.ts" "322/371"
dl "src/modules/tables/tables.routes.ts" "323/371"
dl "src/modules/tables/tables.schema.ts" "324/371"
dl "src/modules/tables/tables.service.test.ts" "325/371"
dl "src/modules/tables/tables.service.ts" "326/371"
dl "src/modules/tenants/tenants.controller.ts" "327/371"
dl "src/modules/tenants/tenants.routes.ts" "328/371"
dl "src/modules/tenants/tenants.schema.ts" "329/371"
dl "src/modules/tenants/tenants.service.test.ts" "330/371"
dl "src/modules/tenants/tenants.service.ts" "331/371"
dl "src/modules/tenants/tenants.test.ts" "332/371"
dl "src/modules/uploads/uploads.controller.ts" "333/371"
dl "src/modules/uploads/uploads.routes.ts" "334/371"
dl "src/modules/uploads/uploads.service.test.ts" "335/371"
dl "src/modules/uploads/uploads.service.ts" "336/371"
dl "src/modules/uploads/uploads.test.ts" "337/371"
dl "src/modules/waitlist/waitlist.controller.ts" "338/371"
dl "src/modules/waitlist/waitlist.routes.ts" "339/371"
dl "src/modules/waitlist/waitlist.schema.ts" "340/371"
dl "src/modules/waitlist/waitlist.service.test.ts" "341/371"
dl "src/modules/waitlist/waitlist.service.ts" "342/371"
dl "src/modules/waitlist/waitlist.test.ts" "343/371"
dl "src/modules/webhooks/webhooks.controller.ts" "344/371"
dl "src/modules/webhooks/webhooks.queue.ts" "345/371"
dl "src/modules/webhooks/webhooks.routes.ts" "346/371"
dl "src/modules/webhooks/webhooks.schema.ts" "347/371"
dl "src/modules/webhooks/webhooks.service.test.ts" "348/371"
dl "src/modules/webhooks/webhooks.service.ts" "349/371"
dl "src/modules/whatsapp-templates/whatsapp-templates.controller.ts" "350/371"
dl "src/modules/whatsapp-templates/whatsapp-templates.routes.ts" "351/371"
dl "src/modules/whatsapp-templates/whatsapp-templates.schema.ts" "352/371"
dl "src/modules/whatsapp-templates/whatsapp-templates.service.test.ts" "353/371"
dl "src/modules/whatsapp-templates/whatsapp-templates.service.ts" "354/371"
dl "src/modules/whatsapp-templates/whatsapp-templates.test.ts" "355/371"
dl "src/modules/whatsapp/whatsapp.controller.ts" "356/371"
dl "src/modules/whatsapp/whatsapp.queue.test.ts" "357/371"
dl "src/modules/whatsapp/whatsapp.queue.ts" "358/371"
dl "src/modules/whatsapp/whatsapp.routes.ts" "359/371"
dl "src/modules/whatsapp/whatsapp.schema.ts" "360/371"
dl "src/modules/whatsapp/whatsapp.service.test.ts" "361/371"
dl "src/modules/whatsapp/whatsapp.service.ts" "362/371"
dl "src/scripts/backfill-analyticsEvent-tenantId.ts" "363/371"
dl "src/scripts/backfill-lead-tenantId.ts" "364/371"
dl "src/server.ts" "365/371"
dl "src/types/express.d.ts" "366/371"
dl "src/utils/apiResponse.ts" "367/371"
dl "src/utils/extractTenantId.ts" "368/371"
dl "src/utils/logger.ts" "369/371"
dl "src/utils/paginate.ts" "370/371"
dl "tsconfig.json" "371/371"

echo "Part 2 download done (371/371). ALL FILES DOWNLOADED."
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
- **102 suites** — all test files present and compiling
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
