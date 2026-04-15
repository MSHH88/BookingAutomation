# Step-By-Step Guide — Phase 1–3 + AUDIT-001..026

> **Scope:** All bug-fix and audit changes from Phase 1–3 and AUDIT-001 through AUDIT-026.
> **Branch:** `copilot/create-detailed-automation-plan`
> **Total files:** 9 created + 119 modified = 128 backend files.

---

## Definitive File Lists

### Created Files (9)

| # | Path | Origin |
|---|------|--------|
| 1 | `backend/prisma/migrations/20260414000001_remove_gift_voucher_enabled/migration.sql` | Phase 3 (FINDING-016) |
| 2 | `backend/prisma/migrations/20260414000002_feature_flag_per_tenant_unique/migration.sql` | Phase 3 (FINDING-011) |
| 3 | `backend/src/jobs/invoice-overdue.job.ts` | AUDIT-023 |
| 4 | `backend/src/middleware/captcha.ts` | Phase 2 (FINDING-010), AUDIT-017 |
| 5 | `backend/src/modules/auth/auth.email.processor.ts` | Phase 1 (FINDING-002) |
| 6 | `backend/src/modules/auth/auth.email.queue.ts` | Phase 1 (FINDING-002) |
| 7 | `backend/src/scripts/backfill-analyticsEvent-tenantId.ts` | AUDIT-025 |
| 8 | `backend/src/scripts/backfill-lead-tenantId.ts` | AUDIT-019 |
| 9 | `backend/src/utils/extractTenantId.ts` | Phase 2 (FINDING-019/028/030) |

### Modified Files (119)

| # | Path |
|---|------|
| 1 | `backend/prisma/schema.prisma` |
| 2 | `backend/src/app.ts` |
| 3 | `backend/src/config/businessType.test.ts` |
| 4 | `backend/src/config/businessType.ts` |
| 5 | `backend/src/config/index.ts` |
| 6 | `backend/src/jobs/ai-suggestion.job.ts` |
| 7 | `backend/src/jobs/birthday.job.ts` |
| 8 | `backend/src/jobs/campaign.job.ts` |
| 9 | `backend/src/jobs/index.ts` |
| 10 | `backend/src/jobs/no-show.job.ts` |
| 11 | `backend/src/jobs/rebook-nudge.job.ts` |
| 12 | `backend/src/jobs/recurring-booking.job.ts` |
| 13 | `backend/src/jobs/waitlist-match.job.ts` |
| 14 | `backend/src/lib/notification-dispatcher.ts` |
| 15 | `backend/src/lib/redis.ts` |
| 16 | `backend/src/middleware/auth.ts` |
| 17 | `backend/src/middleware/requireFeature.ts` |
| 18 | `backend/src/modules/admin/admin.controller.ts` |
| 19 | `backend/src/modules/admin/admin.schema.ts` |
| 20 | `backend/src/modules/admin/admin.service.test.ts` |
| 21 | `backend/src/modules/admin/admin.service.ts` |
| 22 | `backend/src/modules/ai/ai.controller.ts` |
| 23 | `backend/src/modules/alerts/alerts.controller.ts` |
| 24 | `backend/src/modules/alerts/alerts.service.ts` |
| 25 | `backend/src/modules/analytics/analytics.controller.ts` |
| 26 | `backend/src/modules/analytics/analytics.service.test.ts` |
| 27 | `backend/src/modules/analytics/analytics.service.ts` |
| 28 | `backend/src/modules/artists/artist-media.controller.ts` |
| 29 | `backend/src/modules/artists/artist-media.service.ts` |
| 30 | `backend/src/modules/auth/auth.controller.ts` |
| 31 | `backend/src/modules/auth/auth.routes.ts` |
| 32 | `backend/src/modules/auth/auth.service.test.ts` |
| 33 | `backend/src/modules/auth/auth.service.ts` |
| 34 | `backend/src/modules/availability/availability.controller.ts` |
| 35 | `backend/src/modules/booking-photos/booking-photos.controller.ts` |
| 36 | `backend/src/modules/booking-photos/booking-photos.service.ts` |
| 37 | `backend/src/modules/bookings/bookings.controller.ts` |
| 38 | `backend/src/modules/bookings/bookings.service.test.ts` |
| 39 | `backend/src/modules/bookings/bookings.service.ts` |
| 40 | `backend/src/modules/calendar/apple-calendar.service.ts` |
| 41 | `backend/src/modules/calendar/calendar.service.ts` |
| 42 | `backend/src/modules/calendar/outlook-calendar.service.ts` |
| 43 | `backend/src/modules/campaigns/campaigns.controller.ts` |
| 44 | `backend/src/modules/capture/capture.schema.ts` |
| 45 | `backend/src/modules/capture/capture.service.ts` |
| 46 | `backend/src/modules/customer-stats/customer-stats.controller.ts` |
| 47 | `backend/src/modules/customer-stats/customer-stats.service.ts` |
| 48 | `backend/src/modules/customers/customers.service.ts` |
| 49 | `backend/src/modules/email-templates/email-templates.controller.ts` |
| 50 | `backend/src/modules/forms/forms.controller.ts` |
| 51 | `backend/src/modules/forms/forms.service.ts` |
| 52 | `backend/src/modules/gift-cards/gift-cards.controller.ts` |
| 53 | `backend/src/modules/gift-cards/gift-cards.service.ts` |
| 54 | `backend/src/modules/health-flags/health-flags.controller.ts` |
| 55 | `backend/src/modules/health-flags/health-flags.service.ts` |
| 56 | `backend/src/modules/invoices/invoices.controller.ts` |
| 57 | `backend/src/modules/invoices/invoices.service.ts` |
| 58 | `backend/src/modules/leads/leads.controller.ts` |
| 59 | `backend/src/modules/leads/leads.schema.ts` |
| 60 | `backend/src/modules/leads/leads.service.test.ts` |
| 61 | `backend/src/modules/leads/leads.service.ts` |
| 62 | `backend/src/modules/leads/leads.test.ts` |
| 63 | `backend/src/modules/locations/locations.controller.ts` |
| 64 | `backend/src/modules/locations/locations.schema.ts` |
| 65 | `backend/src/modules/locations/locations.service.ts` |
| 66 | `backend/src/modules/loyalty/loyalty.controller.ts` |
| 67 | `backend/src/modules/loyalty/loyalty.service.ts` |
| 68 | `backend/src/modules/memberships/memberships.controller.ts` |
| 69 | `backend/src/modules/notifications/notifications.controller.ts` |
| 70 | `backend/src/modules/notifications/notifications.service.ts` |
| 71 | `backend/src/modules/packages/packages.controller.ts` |
| 72 | `backend/src/modules/packages/packages.service.ts` |
| 73 | `backend/src/modules/payments/payments.controller.ts` |
| 74 | `backend/src/modules/payments/payments.service.ts` |
| 75 | `backend/src/modules/payroll/payroll.routes.ts` |
| 76 | `backend/src/modules/pos/pos.controller.ts` |
| 77 | `backend/src/modules/pos/pos.service.ts` |
| 78 | `backend/src/modules/pricing/pricing.controller.ts` |
| 79 | `backend/src/modules/pricing/pricing.schema.ts` |
| 80 | `backend/src/modules/pricing/pricing.service.ts` |
| 81 | `backend/src/modules/products/products.controller.ts` |
| 82 | `backend/src/modules/products/products.service.ts` |
| 83 | `backend/src/modules/public/public.routes.ts` |
| 84 | `backend/src/modules/public/public.service.test.ts` |
| 85 | `backend/src/modules/public/public.service.ts` |
| 86 | `backend/src/modules/public/public.test.ts` |
| 87 | `backend/src/modules/push/push.routes.ts` |
| 88 | `backend/src/modules/quotes/quotes.controller.ts` |
| 89 | `backend/src/modules/quotes/quotes.service.ts` |
| 90 | `backend/src/modules/recurring-bookings/recurring-bookings.controller.ts` |
| 91 | `backend/src/modules/recurring-bookings/recurring-bookings.routes.ts` |
| 92 | `backend/src/modules/recurring-bookings/recurring-bookings.schema.ts` |
| 93 | `backend/src/modules/recurring-bookings/recurring-bookings.service.ts` |
| 94 | `backend/src/modules/recurring-bookings/recurring-bookings.test.ts` |
| 95 | `backend/src/modules/referrals/referrals.controller.ts` |
| 96 | `backend/src/modules/referrals/referrals.service.ts` |
| 97 | `backend/src/modules/reminders/reminders.queue.ts` |
| 98 | `backend/src/modules/reviews/reviews.queue.ts` |
| 99 | `backend/src/modules/roles/roles.controller.ts` |
| 100 | `backend/src/modules/roles/roles.service.test.ts` |
| 101 | `backend/src/modules/roles/roles.service.ts` |
| 102 | `backend/src/modules/rota/rota.controller.ts` |
| 103 | `backend/src/modules/rota/rota.service.ts` |
| 104 | `backend/src/modules/sessions/sessions.controller.ts` |
| 105 | `backend/src/modules/sessions/sessions.schema.ts` |
| 106 | `backend/src/modules/sessions/sessions.service.ts` |
| 107 | `backend/src/modules/settings/settings.controller.ts` |
| 108 | `backend/src/modules/settings/settings.service.ts` |
| 109 | `backend/src/modules/sms-templates/sms-templates.controller.ts` |
| 110 | `backend/src/modules/social/social.controller.ts` |
| 111 | `backend/src/modules/social/social.service.ts` |
| 112 | `backend/src/modules/social/social.test.ts` |
| 113 | `backend/src/modules/tables/tables.controller.ts` |
| 114 | `backend/src/modules/tables/tables.service.ts` |
| 115 | `backend/src/modules/webhooks/webhooks.controller.ts` |
| 116 | `backend/src/modules/webhooks/webhooks.service.ts` |
| 117 | `backend/src/modules/whatsapp-templates/whatsapp-templates.controller.ts` |
| 118 | `backend/src/modules/whatsapp/whatsapp.service.ts` |
| 119 | `backend/src/server.ts` |

---

## Step 1 — Delete (reset local files)

Run from `~/Desktop/Automation/backend`:

```bash
# --- Created files (9) ---
rm -f prisma/migrations/20260414000001_remove_gift_voucher_enabled/migration.sql
rm -f prisma/migrations/20260414000002_feature_flag_per_tenant_unique/migration.sql
rm -f src/jobs/invoice-overdue.job.ts
rm -f src/middleware/captcha.ts
rm -f src/modules/auth/auth.email.processor.ts
rm -f src/modules/auth/auth.email.queue.ts
rm -f src/scripts/backfill-analyticsEvent-tenantId.ts
rm -f src/scripts/backfill-lead-tenantId.ts
rm -f src/utils/extractTenantId.ts

# --- Modified files (119) ---
rm -f prisma/schema.prisma
rm -f src/app.ts
rm -f src/config/businessType.test.ts
rm -f src/config/businessType.ts
rm -f src/config/index.ts
rm -f src/jobs/ai-suggestion.job.ts
rm -f src/jobs/birthday.job.ts
rm -f src/jobs/campaign.job.ts
rm -f src/jobs/index.ts
rm -f src/jobs/no-show.job.ts
rm -f src/jobs/rebook-nudge.job.ts
rm -f src/jobs/recurring-booking.job.ts
rm -f src/jobs/waitlist-match.job.ts
rm -f src/lib/notification-dispatcher.ts
rm -f src/lib/redis.ts
rm -f src/middleware/auth.ts
rm -f src/middleware/requireFeature.ts
rm -f src/modules/admin/admin.controller.ts
rm -f src/modules/admin/admin.schema.ts
rm -f src/modules/admin/admin.service.test.ts
rm -f src/modules/admin/admin.service.ts
rm -f src/modules/ai/ai.controller.ts
rm -f src/modules/alerts/alerts.controller.ts
rm -f src/modules/alerts/alerts.service.ts
rm -f src/modules/analytics/analytics.controller.ts
rm -f src/modules/analytics/analytics.service.test.ts
rm -f src/modules/analytics/analytics.service.ts
rm -f src/modules/artists/artist-media.controller.ts
rm -f src/modules/artists/artist-media.service.ts
rm -f src/modules/auth/auth.controller.ts
rm -f src/modules/auth/auth.routes.ts
rm -f src/modules/auth/auth.service.test.ts
rm -f src/modules/auth/auth.service.ts
rm -f src/modules/availability/availability.controller.ts
rm -f src/modules/booking-photos/booking-photos.controller.ts
rm -f src/modules/booking-photos/booking-photos.service.ts
rm -f src/modules/bookings/bookings.controller.ts
rm -f src/modules/bookings/bookings.service.test.ts
rm -f src/modules/bookings/bookings.service.ts
rm -f src/modules/calendar/apple-calendar.service.ts
rm -f src/modules/calendar/calendar.service.ts
rm -f src/modules/calendar/outlook-calendar.service.ts
rm -f src/modules/campaigns/campaigns.controller.ts
rm -f src/modules/capture/capture.schema.ts
rm -f src/modules/capture/capture.service.ts
rm -f src/modules/customer-stats/customer-stats.controller.ts
rm -f src/modules/customer-stats/customer-stats.service.ts
rm -f src/modules/customers/customers.service.ts
rm -f src/modules/email-templates/email-templates.controller.ts
rm -f src/modules/forms/forms.controller.ts
rm -f src/modules/forms/forms.service.ts
rm -f src/modules/gift-cards/gift-cards.controller.ts
rm -f src/modules/gift-cards/gift-cards.service.ts
rm -f src/modules/health-flags/health-flags.controller.ts
rm -f src/modules/health-flags/health-flags.service.ts
rm -f src/modules/invoices/invoices.controller.ts
rm -f src/modules/invoices/invoices.service.ts
rm -f src/modules/leads/leads.controller.ts
rm -f src/modules/leads/leads.schema.ts
rm -f src/modules/leads/leads.service.test.ts
rm -f src/modules/leads/leads.service.ts
rm -f src/modules/leads/leads.test.ts
rm -f src/modules/locations/locations.controller.ts
rm -f src/modules/locations/locations.schema.ts
rm -f src/modules/locations/locations.service.ts
rm -f src/modules/loyalty/loyalty.controller.ts
rm -f src/modules/loyalty/loyalty.service.ts
rm -f src/modules/memberships/memberships.controller.ts
rm -f src/modules/notifications/notifications.controller.ts
rm -f src/modules/notifications/notifications.service.ts
rm -f src/modules/packages/packages.controller.ts
rm -f src/modules/packages/packages.service.ts
rm -f src/modules/payments/payments.controller.ts
rm -f src/modules/payments/payments.service.ts
rm -f src/modules/payroll/payroll.routes.ts
rm -f src/modules/pos/pos.controller.ts
rm -f src/modules/pos/pos.service.ts
rm -f src/modules/pricing/pricing.controller.ts
rm -f src/modules/pricing/pricing.schema.ts
rm -f src/modules/pricing/pricing.service.ts
rm -f src/modules/products/products.controller.ts
rm -f src/modules/products/products.service.ts
rm -f src/modules/public/public.routes.ts
rm -f src/modules/public/public.service.test.ts
rm -f src/modules/public/public.service.ts
rm -f src/modules/public/public.test.ts
rm -f src/modules/push/push.routes.ts
rm -f src/modules/quotes/quotes.controller.ts
rm -f src/modules/quotes/quotes.service.ts
rm -f src/modules/recurring-bookings/recurring-bookings.controller.ts
rm -f src/modules/recurring-bookings/recurring-bookings.routes.ts
rm -f src/modules/recurring-bookings/recurring-bookings.schema.ts
rm -f src/modules/recurring-bookings/recurring-bookings.service.ts
rm -f src/modules/recurring-bookings/recurring-bookings.test.ts
rm -f src/modules/referrals/referrals.controller.ts
rm -f src/modules/referrals/referrals.service.ts
rm -f src/modules/reminders/reminders.queue.ts
rm -f src/modules/reviews/reviews.queue.ts
rm -f src/modules/roles/roles.controller.ts
rm -f src/modules/roles/roles.service.test.ts
rm -f src/modules/roles/roles.service.ts
rm -f src/modules/rota/rota.controller.ts
rm -f src/modules/rota/rota.service.ts
rm -f src/modules/sessions/sessions.controller.ts
rm -f src/modules/sessions/sessions.schema.ts
rm -f src/modules/sessions/sessions.service.ts
rm -f src/modules/settings/settings.controller.ts
rm -f src/modules/settings/settings.service.ts
rm -f src/modules/sms-templates/sms-templates.controller.ts
rm -f src/modules/social/social.controller.ts
rm -f src/modules/social/social.service.ts
rm -f src/modules/social/social.test.ts
rm -f src/modules/tables/tables.controller.ts
rm -f src/modules/tables/tables.service.ts
rm -f src/modules/webhooks/webhooks.controller.ts
rm -f src/modules/webhooks/webhooks.service.ts
rm -f src/modules/whatsapp-templates/whatsapp-templates.controller.ts
rm -f src/modules/whatsapp/whatsapp.service.ts
rm -f src/server.ts

# --- Clean up empty directories (created files only) ---
rmdir --ignore-fail-on-non-empty prisma/migrations/20260414000001_remove_gift_voucher_enabled 2>/dev/null
rmdir --ignore-fail-on-non-empty prisma/migrations/20260414000002_feature_flag_per_tenant_unique 2>/dev/null
rmdir --ignore-fail-on-non-empty src/scripts 2>/dev/null
rmdir --ignore-fail-on-non-empty src/utils 2>/dev/null
```

---

## Step 2 — Create directories (mkdir -p)

```bash
mkdir -p prisma/migrations/20260414000001_remove_gift_voucher_enabled
mkdir -p prisma/migrations/20260414000002_feature_flag_per_tenant_unique
mkdir -p src/config
mkdir -p src/jobs
mkdir -p src/lib
mkdir -p src/middleware
mkdir -p src/modules/admin
mkdir -p src/modules/ai
mkdir -p src/modules/alerts
mkdir -p src/modules/analytics
mkdir -p src/modules/artists
mkdir -p src/modules/auth
mkdir -p src/modules/availability
mkdir -p src/modules/booking-photos
mkdir -p src/modules/bookings
mkdir -p src/modules/calendar
mkdir -p src/modules/campaigns
mkdir -p src/modules/capture
mkdir -p src/modules/customer-stats
mkdir -p src/modules/customers
mkdir -p src/modules/email-templates
mkdir -p src/modules/forms
mkdir -p src/modules/gift-cards
mkdir -p src/modules/health-flags
mkdir -p src/modules/invoices
mkdir -p src/modules/leads
mkdir -p src/modules/locations
mkdir -p src/modules/loyalty
mkdir -p src/modules/memberships
mkdir -p src/modules/notifications
mkdir -p src/modules/packages
mkdir -p src/modules/payments
mkdir -p src/modules/payroll
mkdir -p src/modules/pos
mkdir -p src/modules/pricing
mkdir -p src/modules/products
mkdir -p src/modules/public
mkdir -p src/modules/push
mkdir -p src/modules/quotes
mkdir -p src/modules/recurring-bookings
mkdir -p src/modules/referrals
mkdir -p src/modules/reminders
mkdir -p src/modules/reviews
mkdir -p src/modules/roles
mkdir -p src/modules/rota
mkdir -p src/modules/sessions
mkdir -p src/modules/settings
mkdir -p src/modules/sms-templates
mkdir -p src/modules/social
mkdir -p src/modules/tables
mkdir -p src/modules/webhooks
mkdir -p src/modules/whatsapp
mkdir -p src/modules/whatsapp-templates
mkdir -p src/scripts
mkdir -p src/utils
```

---

## Step 3 — Download NEW files (9 created files)

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"
```

```bash
curl -L -o prisma/migrations/20260414000001_remove_gift_voucher_enabled/migration.sql "$BASE/prisma/migrations/20260414000001_remove_gift_voucher_enabled/migration.sql" && echo "OK  migration (remove_gift_voucher)" || echo "FAILED  migration (remove_gift_voucher)"

curl -L -o prisma/migrations/20260414000002_feature_flag_per_tenant_unique/migration.sql "$BASE/prisma/migrations/20260414000002_feature_flag_per_tenant_unique/migration.sql" && echo "OK  migration (feature_flag_per_tenant)" || echo "FAILED  migration (feature_flag_per_tenant)"

curl -L -o src/jobs/invoice-overdue.job.ts "$BASE/src/jobs/invoice-overdue.job.ts" && echo "OK  invoice-overdue.job.ts" || echo "FAILED  invoice-overdue.job.ts"

curl -L -o src/middleware/captcha.ts "$BASE/src/middleware/captcha.ts" && echo "OK  captcha.ts" || echo "FAILED  captcha.ts"

curl -L -o src/modules/auth/auth.email.processor.ts "$BASE/src/modules/auth/auth.email.processor.ts" && echo "OK  auth.email.processor.ts" || echo "FAILED  auth.email.processor.ts"

curl -L -o src/modules/auth/auth.email.queue.ts "$BASE/src/modules/auth/auth.email.queue.ts" && echo "OK  auth.email.queue.ts" || echo "FAILED  auth.email.queue.ts"

curl -L -o src/scripts/backfill-analyticsEvent-tenantId.ts "$BASE/src/scripts/backfill-analyticsEvent-tenantId.ts" && echo "OK  backfill-analyticsEvent-tenantId.ts" || echo "FAILED  backfill-analyticsEvent-tenantId.ts"

curl -L -o src/scripts/backfill-lead-tenantId.ts "$BASE/src/scripts/backfill-lead-tenantId.ts" && echo "OK  backfill-lead-tenantId.ts" || echo "FAILED  backfill-lead-tenantId.ts"

curl -L -o src/utils/extractTenantId.ts "$BASE/src/utils/extractTenantId.ts" && echo "OK  extractTenantId.ts" || echo "FAILED  extractTenantId.ts"
```

---

## Step 4 — Download CHANGED files (119 modified files)

Use the same `$BASE` variable set in Step 3.

```bash
curl -L -o prisma/schema.prisma "$BASE/prisma/schema.prisma" && echo "OK  prisma/schema.prisma" || echo "FAILED  prisma/schema.prisma"
curl -L -o src/app.ts "$BASE/src/app.ts" && echo "OK  src/app.ts" || echo "FAILED  src/app.ts"
curl -L -o src/config/businessType.test.ts "$BASE/src/config/businessType.test.ts" && echo "OK  businessType.test.ts" || echo "FAILED  businessType.test.ts"
curl -L -o src/config/businessType.ts "$BASE/src/config/businessType.ts" && echo "OK  businessType.ts" || echo "FAILED  businessType.ts"
curl -L -o src/config/index.ts "$BASE/src/config/index.ts" && echo "OK  config/index.ts" || echo "FAILED  config/index.ts"
curl -L -o src/jobs/ai-suggestion.job.ts "$BASE/src/jobs/ai-suggestion.job.ts" && echo "OK  ai-suggestion.job.ts" || echo "FAILED  ai-suggestion.job.ts"
curl -L -o src/jobs/birthday.job.ts "$BASE/src/jobs/birthday.job.ts" && echo "OK  birthday.job.ts" || echo "FAILED  birthday.job.ts"
curl -L -o src/jobs/campaign.job.ts "$BASE/src/jobs/campaign.job.ts" && echo "OK  campaign.job.ts" || echo "FAILED  campaign.job.ts"
curl -L -o src/jobs/index.ts "$BASE/src/jobs/index.ts" && echo "OK  jobs/index.ts" || echo "FAILED  jobs/index.ts"
curl -L -o src/jobs/no-show.job.ts "$BASE/src/jobs/no-show.job.ts" && echo "OK  no-show.job.ts" || echo "FAILED  no-show.job.ts"
curl -L -o src/jobs/rebook-nudge.job.ts "$BASE/src/jobs/rebook-nudge.job.ts" && echo "OK  rebook-nudge.job.ts" || echo "FAILED  rebook-nudge.job.ts"
curl -L -o src/jobs/recurring-booking.job.ts "$BASE/src/jobs/recurring-booking.job.ts" && echo "OK  recurring-booking.job.ts" || echo "FAILED  recurring-booking.job.ts"
curl -L -o src/jobs/waitlist-match.job.ts "$BASE/src/jobs/waitlist-match.job.ts" && echo "OK  waitlist-match.job.ts" || echo "FAILED  waitlist-match.job.ts"
curl -L -o src/lib/notification-dispatcher.ts "$BASE/src/lib/notification-dispatcher.ts" && echo "OK  notification-dispatcher.ts" || echo "FAILED  notification-dispatcher.ts"
curl -L -o src/lib/redis.ts "$BASE/src/lib/redis.ts" && echo "OK  redis.ts" || echo "FAILED  redis.ts"
curl -L -o src/middleware/auth.ts "$BASE/src/middleware/auth.ts" && echo "OK  middleware/auth.ts" || echo "FAILED  middleware/auth.ts"
curl -L -o src/middleware/requireFeature.ts "$BASE/src/middleware/requireFeature.ts" && echo "OK  requireFeature.ts" || echo "FAILED  requireFeature.ts"
curl -L -o src/modules/admin/admin.controller.ts "$BASE/src/modules/admin/admin.controller.ts" && echo "OK  admin.controller.ts" || echo "FAILED  admin.controller.ts"
curl -L -o src/modules/admin/admin.schema.ts "$BASE/src/modules/admin/admin.schema.ts" && echo "OK  admin.schema.ts" || echo "FAILED  admin.schema.ts"
curl -L -o src/modules/admin/admin.service.test.ts "$BASE/src/modules/admin/admin.service.test.ts" && echo "OK  admin.service.test.ts" || echo "FAILED  admin.service.test.ts"
curl -L -o src/modules/admin/admin.service.ts "$BASE/src/modules/admin/admin.service.ts" && echo "OK  admin.service.ts" || echo "FAILED  admin.service.ts"
curl -L -o src/modules/ai/ai.controller.ts "$BASE/src/modules/ai/ai.controller.ts" && echo "OK  ai.controller.ts" || echo "FAILED  ai.controller.ts"
curl -L -o src/modules/alerts/alerts.controller.ts "$BASE/src/modules/alerts/alerts.controller.ts" && echo "OK  alerts.controller.ts" || echo "FAILED  alerts.controller.ts"
curl -L -o src/modules/alerts/alerts.service.ts "$BASE/src/modules/alerts/alerts.service.ts" && echo "OK  alerts.service.ts" || echo "FAILED  alerts.service.ts"
curl -L -o src/modules/analytics/analytics.controller.ts "$BASE/src/modules/analytics/analytics.controller.ts" && echo "OK  analytics.controller.ts" || echo "FAILED  analytics.controller.ts"
curl -L -o src/modules/analytics/analytics.service.test.ts "$BASE/src/modules/analytics/analytics.service.test.ts" && echo "OK  analytics.service.test.ts" || echo "FAILED  analytics.service.test.ts"
curl -L -o src/modules/analytics/analytics.service.ts "$BASE/src/modules/analytics/analytics.service.ts" && echo "OK  analytics.service.ts" || echo "FAILED  analytics.service.ts"
curl -L -o src/modules/artists/artist-media.controller.ts "$BASE/src/modules/artists/artist-media.controller.ts" && echo "OK  artist-media.controller.ts" || echo "FAILED  artist-media.controller.ts"
curl -L -o src/modules/artists/artist-media.service.ts "$BASE/src/modules/artists/artist-media.service.ts" && echo "OK  artist-media.service.ts" || echo "FAILED  artist-media.service.ts"
curl -L -o src/modules/auth/auth.controller.ts "$BASE/src/modules/auth/auth.controller.ts" && echo "OK  auth.controller.ts" || echo "FAILED  auth.controller.ts"
curl -L -o src/modules/auth/auth.routes.ts "$BASE/src/modules/auth/auth.routes.ts" && echo "OK  auth.routes.ts" || echo "FAILED  auth.routes.ts"
curl -L -o src/modules/auth/auth.service.test.ts "$BASE/src/modules/auth/auth.service.test.ts" && echo "OK  auth.service.test.ts" || echo "FAILED  auth.service.test.ts"
curl -L -o src/modules/auth/auth.service.ts "$BASE/src/modules/auth/auth.service.ts" && echo "OK  auth.service.ts" || echo "FAILED  auth.service.ts"
curl -L -o src/modules/availability/availability.controller.ts "$BASE/src/modules/availability/availability.controller.ts" && echo "OK  availability.controller.ts" || echo "FAILED  availability.controller.ts"
curl -L -o src/modules/booking-photos/booking-photos.controller.ts "$BASE/src/modules/booking-photos/booking-photos.controller.ts" && echo "OK  booking-photos.controller.ts" || echo "FAILED  booking-photos.controller.ts"
curl -L -o src/modules/booking-photos/booking-photos.service.ts "$BASE/src/modules/booking-photos/booking-photos.service.ts" && echo "OK  booking-photos.service.ts" || echo "FAILED  booking-photos.service.ts"
curl -L -o src/modules/bookings/bookings.controller.ts "$BASE/src/modules/bookings/bookings.controller.ts" && echo "OK  bookings.controller.ts" || echo "FAILED  bookings.controller.ts"
curl -L -o src/modules/bookings/bookings.service.test.ts "$BASE/src/modules/bookings/bookings.service.test.ts" && echo "OK  bookings.service.test.ts" || echo "FAILED  bookings.service.test.ts"
curl -L -o src/modules/bookings/bookings.service.ts "$BASE/src/modules/bookings/bookings.service.ts" && echo "OK  bookings.service.ts" || echo "FAILED  bookings.service.ts"
curl -L -o src/modules/calendar/apple-calendar.service.ts "$BASE/src/modules/calendar/apple-calendar.service.ts" && echo "OK  apple-calendar.service.ts" || echo "FAILED  apple-calendar.service.ts"
curl -L -o src/modules/calendar/calendar.service.ts "$BASE/src/modules/calendar/calendar.service.ts" && echo "OK  calendar.service.ts" || echo "FAILED  calendar.service.ts"
curl -L -o src/modules/calendar/outlook-calendar.service.ts "$BASE/src/modules/calendar/outlook-calendar.service.ts" && echo "OK  outlook-calendar.service.ts" || echo "FAILED  outlook-calendar.service.ts"
curl -L -o src/modules/campaigns/campaigns.controller.ts "$BASE/src/modules/campaigns/campaigns.controller.ts" && echo "OK  campaigns.controller.ts" || echo "FAILED  campaigns.controller.ts"
curl -L -o src/modules/capture/capture.schema.ts "$BASE/src/modules/capture/capture.schema.ts" && echo "OK  capture.schema.ts" || echo "FAILED  capture.schema.ts"
curl -L -o src/modules/capture/capture.service.ts "$BASE/src/modules/capture/capture.service.ts" && echo "OK  capture.service.ts" || echo "FAILED  capture.service.ts"
curl -L -o src/modules/customer-stats/customer-stats.controller.ts "$BASE/src/modules/customer-stats/customer-stats.controller.ts" && echo "OK  customer-stats.controller.ts" || echo "FAILED  customer-stats.controller.ts"
curl -L -o src/modules/customer-stats/customer-stats.service.ts "$BASE/src/modules/customer-stats/customer-stats.service.ts" && echo "OK  customer-stats.service.ts" || echo "FAILED  customer-stats.service.ts"
curl -L -o src/modules/customers/customers.service.ts "$BASE/src/modules/customers/customers.service.ts" && echo "OK  customers.service.ts" || echo "FAILED  customers.service.ts"
curl -L -o src/modules/email-templates/email-templates.controller.ts "$BASE/src/modules/email-templates/email-templates.controller.ts" && echo "OK  email-templates.controller.ts" || echo "FAILED  email-templates.controller.ts"
curl -L -o src/modules/forms/forms.controller.ts "$BASE/src/modules/forms/forms.controller.ts" && echo "OK  forms.controller.ts" || echo "FAILED  forms.controller.ts"
curl -L -o src/modules/forms/forms.service.ts "$BASE/src/modules/forms/forms.service.ts" && echo "OK  forms.service.ts" || echo "FAILED  forms.service.ts"
curl -L -o src/modules/gift-cards/gift-cards.controller.ts "$BASE/src/modules/gift-cards/gift-cards.controller.ts" && echo "OK  gift-cards.controller.ts" || echo "FAILED  gift-cards.controller.ts"
curl -L -o src/modules/gift-cards/gift-cards.service.ts "$BASE/src/modules/gift-cards/gift-cards.service.ts" && echo "OK  gift-cards.service.ts" || echo "FAILED  gift-cards.service.ts"
curl -L -o src/modules/health-flags/health-flags.controller.ts "$BASE/src/modules/health-flags/health-flags.controller.ts" && echo "OK  health-flags.controller.ts" || echo "FAILED  health-flags.controller.ts"
curl -L -o src/modules/health-flags/health-flags.service.ts "$BASE/src/modules/health-flags/health-flags.service.ts" && echo "OK  health-flags.service.ts" || echo "FAILED  health-flags.service.ts"
curl -L -o src/modules/invoices/invoices.controller.ts "$BASE/src/modules/invoices/invoices.controller.ts" && echo "OK  invoices.controller.ts" || echo "FAILED  invoices.controller.ts"
curl -L -o src/modules/invoices/invoices.service.ts "$BASE/src/modules/invoices/invoices.service.ts" && echo "OK  invoices.service.ts" || echo "FAILED  invoices.service.ts"
curl -L -o src/modules/leads/leads.controller.ts "$BASE/src/modules/leads/leads.controller.ts" && echo "OK  leads.controller.ts" || echo "FAILED  leads.controller.ts"
curl -L -o src/modules/leads/leads.schema.ts "$BASE/src/modules/leads/leads.schema.ts" && echo "OK  leads.schema.ts" || echo "FAILED  leads.schema.ts"
curl -L -o src/modules/leads/leads.service.test.ts "$BASE/src/modules/leads/leads.service.test.ts" && echo "OK  leads.service.test.ts" || echo "FAILED  leads.service.test.ts"
curl -L -o src/modules/leads/leads.service.ts "$BASE/src/modules/leads/leads.service.ts" && echo "OK  leads.service.ts" || echo "FAILED  leads.service.ts"
curl -L -o src/modules/leads/leads.test.ts "$BASE/src/modules/leads/leads.test.ts" && echo "OK  leads.test.ts" || echo "FAILED  leads.test.ts"
curl -L -o src/modules/locations/locations.controller.ts "$BASE/src/modules/locations/locations.controller.ts" && echo "OK  locations.controller.ts" || echo "FAILED  locations.controller.ts"
curl -L -o src/modules/locations/locations.schema.ts "$BASE/src/modules/locations/locations.schema.ts" && echo "OK  locations.schema.ts" || echo "FAILED  locations.schema.ts"
curl -L -o src/modules/locations/locations.service.ts "$BASE/src/modules/locations/locations.service.ts" && echo "OK  locations.service.ts" || echo "FAILED  locations.service.ts"
curl -L -o src/modules/loyalty/loyalty.controller.ts "$BASE/src/modules/loyalty/loyalty.controller.ts" && echo "OK  loyalty.controller.ts" || echo "FAILED  loyalty.controller.ts"
curl -L -o src/modules/loyalty/loyalty.service.ts "$BASE/src/modules/loyalty/loyalty.service.ts" && echo "OK  loyalty.service.ts" || echo "FAILED  loyalty.service.ts"
curl -L -o src/modules/memberships/memberships.controller.ts "$BASE/src/modules/memberships/memberships.controller.ts" && echo "OK  memberships.controller.ts" || echo "FAILED  memberships.controller.ts"
curl -L -o src/modules/notifications/notifications.controller.ts "$BASE/src/modules/notifications/notifications.controller.ts" && echo "OK  notifications.controller.ts" || echo "FAILED  notifications.controller.ts"
curl -L -o src/modules/notifications/notifications.service.ts "$BASE/src/modules/notifications/notifications.service.ts" && echo "OK  notifications.service.ts" || echo "FAILED  notifications.service.ts"
curl -L -o src/modules/packages/packages.controller.ts "$BASE/src/modules/packages/packages.controller.ts" && echo "OK  packages.controller.ts" || echo "FAILED  packages.controller.ts"
curl -L -o src/modules/packages/packages.service.ts "$BASE/src/modules/packages/packages.service.ts" && echo "OK  packages.service.ts" || echo "FAILED  packages.service.ts"
curl -L -o src/modules/payments/payments.controller.ts "$BASE/src/modules/payments/payments.controller.ts" && echo "OK  payments.controller.ts" || echo "FAILED  payments.controller.ts"
curl -L -o src/modules/payments/payments.service.ts "$BASE/src/modules/payments/payments.service.ts" && echo "OK  payments.service.ts" || echo "FAILED  payments.service.ts"
curl -L -o src/modules/payroll/payroll.routes.ts "$BASE/src/modules/payroll/payroll.routes.ts" && echo "OK  payroll.routes.ts" || echo "FAILED  payroll.routes.ts"
curl -L -o src/modules/pos/pos.controller.ts "$BASE/src/modules/pos/pos.controller.ts" && echo "OK  pos.controller.ts" || echo "FAILED  pos.controller.ts"
curl -L -o src/modules/pos/pos.service.ts "$BASE/src/modules/pos/pos.service.ts" && echo "OK  pos.service.ts" || echo "FAILED  pos.service.ts"
curl -L -o src/modules/pricing/pricing.controller.ts "$BASE/src/modules/pricing/pricing.controller.ts" && echo "OK  pricing.controller.ts" || echo "FAILED  pricing.controller.ts"
curl -L -o src/modules/pricing/pricing.schema.ts "$BASE/src/modules/pricing/pricing.schema.ts" && echo "OK  pricing.schema.ts" || echo "FAILED  pricing.schema.ts"
curl -L -o src/modules/pricing/pricing.service.ts "$BASE/src/modules/pricing/pricing.service.ts" && echo "OK  pricing.service.ts" || echo "FAILED  pricing.service.ts"
curl -L -o src/modules/products/products.controller.ts "$BASE/src/modules/products/products.controller.ts" && echo "OK  products.controller.ts" || echo "FAILED  products.controller.ts"
curl -L -o src/modules/products/products.service.ts "$BASE/src/modules/products/products.service.ts" && echo "OK  products.service.ts" || echo "FAILED  products.service.ts"
curl -L -o src/modules/public/public.routes.ts "$BASE/src/modules/public/public.routes.ts" && echo "OK  public.routes.ts" || echo "FAILED  public.routes.ts"
curl -L -o src/modules/public/public.service.test.ts "$BASE/src/modules/public/public.service.test.ts" && echo "OK  public.service.test.ts" || echo "FAILED  public.service.test.ts"
curl -L -o src/modules/public/public.service.ts "$BASE/src/modules/public/public.service.ts" && echo "OK  public.service.ts" || echo "FAILED  public.service.ts"
curl -L -o src/modules/public/public.test.ts "$BASE/src/modules/public/public.test.ts" && echo "OK  public.test.ts" || echo "FAILED  public.test.ts"
curl -L -o src/modules/push/push.routes.ts "$BASE/src/modules/push/push.routes.ts" && echo "OK  push.routes.ts" || echo "FAILED  push.routes.ts"
curl -L -o src/modules/quotes/quotes.controller.ts "$BASE/src/modules/quotes/quotes.controller.ts" && echo "OK  quotes.controller.ts" || echo "FAILED  quotes.controller.ts"
curl -L -o src/modules/quotes/quotes.service.ts "$BASE/src/modules/quotes/quotes.service.ts" && echo "OK  quotes.service.ts" || echo "FAILED  quotes.service.ts"
curl -L -o src/modules/recurring-bookings/recurring-bookings.controller.ts "$BASE/src/modules/recurring-bookings/recurring-bookings.controller.ts" && echo "OK  recurring-bookings.controller.ts" || echo "FAILED  recurring-bookings.controller.ts"
curl -L -o src/modules/recurring-bookings/recurring-bookings.routes.ts "$BASE/src/modules/recurring-bookings/recurring-bookings.routes.ts" && echo "OK  recurring-bookings.routes.ts" || echo "FAILED  recurring-bookings.routes.ts"
curl -L -o src/modules/recurring-bookings/recurring-bookings.schema.ts "$BASE/src/modules/recurring-bookings/recurring-bookings.schema.ts" && echo "OK  recurring-bookings.schema.ts" || echo "FAILED  recurring-bookings.schema.ts"
curl -L -o src/modules/recurring-bookings/recurring-bookings.service.ts "$BASE/src/modules/recurring-bookings/recurring-bookings.service.ts" && echo "OK  recurring-bookings.service.ts" || echo "FAILED  recurring-bookings.service.ts"
curl -L -o src/modules/recurring-bookings/recurring-bookings.test.ts "$BASE/src/modules/recurring-bookings/recurring-bookings.test.ts" && echo "OK  recurring-bookings.test.ts" || echo "FAILED  recurring-bookings.test.ts"
curl -L -o src/modules/referrals/referrals.controller.ts "$BASE/src/modules/referrals/referrals.controller.ts" && echo "OK  referrals.controller.ts" || echo "FAILED  referrals.controller.ts"
curl -L -o src/modules/referrals/referrals.service.ts "$BASE/src/modules/referrals/referrals.service.ts" && echo "OK  referrals.service.ts" || echo "FAILED  referrals.service.ts"
curl -L -o src/modules/reminders/reminders.queue.ts "$BASE/src/modules/reminders/reminders.queue.ts" && echo "OK  reminders.queue.ts" || echo "FAILED  reminders.queue.ts"
curl -L -o src/modules/reviews/reviews.queue.ts "$BASE/src/modules/reviews/reviews.queue.ts" && echo "OK  reviews.queue.ts" || echo "FAILED  reviews.queue.ts"
curl -L -o src/modules/roles/roles.controller.ts "$BASE/src/modules/roles/roles.controller.ts" && echo "OK  roles.controller.ts" || echo "FAILED  roles.controller.ts"
curl -L -o src/modules/roles/roles.service.test.ts "$BASE/src/modules/roles/roles.service.test.ts" && echo "OK  roles.service.test.ts" || echo "FAILED  roles.service.test.ts"
curl -L -o src/modules/roles/roles.service.ts "$BASE/src/modules/roles/roles.service.ts" && echo "OK  roles.service.ts" || echo "FAILED  roles.service.ts"
curl -L -o src/modules/rota/rota.controller.ts "$BASE/src/modules/rota/rota.controller.ts" && echo "OK  rota.controller.ts" || echo "FAILED  rota.controller.ts"
curl -L -o src/modules/rota/rota.service.ts "$BASE/src/modules/rota/rota.service.ts" && echo "OK  rota.service.ts" || echo "FAILED  rota.service.ts"
curl -L -o src/modules/sessions/sessions.controller.ts "$BASE/src/modules/sessions/sessions.controller.ts" && echo "OK  sessions.controller.ts" || echo "FAILED  sessions.controller.ts"
curl -L -o src/modules/sessions/sessions.schema.ts "$BASE/src/modules/sessions/sessions.schema.ts" && echo "OK  sessions.schema.ts" || echo "FAILED  sessions.schema.ts"
curl -L -o src/modules/sessions/sessions.service.ts "$BASE/src/modules/sessions/sessions.service.ts" && echo "OK  sessions.service.ts" || echo "FAILED  sessions.service.ts"
curl -L -o src/modules/settings/settings.controller.ts "$BASE/src/modules/settings/settings.controller.ts" && echo "OK  settings.controller.ts" || echo "FAILED  settings.controller.ts"
curl -L -o src/modules/settings/settings.service.ts "$BASE/src/modules/settings/settings.service.ts" && echo "OK  settings.service.ts" || echo "FAILED  settings.service.ts"
curl -L -o src/modules/sms-templates/sms-templates.controller.ts "$BASE/src/modules/sms-templates/sms-templates.controller.ts" && echo "OK  sms-templates.controller.ts" || echo "FAILED  sms-templates.controller.ts"
curl -L -o src/modules/social/social.controller.ts "$BASE/src/modules/social/social.controller.ts" && echo "OK  social.controller.ts" || echo "FAILED  social.controller.ts"
curl -L -o src/modules/social/social.service.ts "$BASE/src/modules/social/social.service.ts" && echo "OK  social.service.ts" || echo "FAILED  social.service.ts"
curl -L -o src/modules/social/social.test.ts "$BASE/src/modules/social/social.test.ts" && echo "OK  social.test.ts" || echo "FAILED  social.test.ts"
curl -L -o src/modules/tables/tables.controller.ts "$BASE/src/modules/tables/tables.controller.ts" && echo "OK  tables.controller.ts" || echo "FAILED  tables.controller.ts"
curl -L -o src/modules/tables/tables.service.ts "$BASE/src/modules/tables/tables.service.ts" && echo "OK  tables.service.ts" || echo "FAILED  tables.service.ts"
curl -L -o src/modules/webhooks/webhooks.controller.ts "$BASE/src/modules/webhooks/webhooks.controller.ts" && echo "OK  webhooks.controller.ts" || echo "FAILED  webhooks.controller.ts"
curl -L -o src/modules/webhooks/webhooks.service.ts "$BASE/src/modules/webhooks/webhooks.service.ts" && echo "OK  webhooks.service.ts" || echo "FAILED  webhooks.service.ts"
curl -L -o src/modules/whatsapp-templates/whatsapp-templates.controller.ts "$BASE/src/modules/whatsapp-templates/whatsapp-templates.controller.ts" && echo "OK  whatsapp-templates.controller.ts" || echo "FAILED  whatsapp-templates.controller.ts"
curl -L -o src/modules/whatsapp/whatsapp.service.ts "$BASE/src/modules/whatsapp/whatsapp.service.ts" && echo "OK  whatsapp.service.ts" || echo "FAILED  whatsapp.service.ts"
curl -L -o src/server.ts "$BASE/src/server.ts" && echo "OK  server.ts" || echo "FAILED  server.ts"
```

---

## Step 5 — Install dependencies

```bash
cd ~/Desktop/Automation/backend
npm install
```

> If Docker is required for PostgreSQL / Redis:
> ```bash
> docker compose up -d
> ```

Then regenerate the Prisma client and run migrations:

```bash
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
