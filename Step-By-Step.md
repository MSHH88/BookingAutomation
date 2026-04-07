# Step 1.15 — Notifications Service (Transactional Email Engine) — Setup Guide

**What this step adds:**

A production-grade Transactional Email Engine backed by the Resend API and
Handlebars templating. This is the notification layer every professional
booking platform (Fresha, Booksy, Acuity, Mindbody) requires to send
booking confirmations, invoice emails, quote notifications, and reminders.

Two layers are provided:

1. **Email Template CRUD** — ADMIN-only management API for the `EmailTemplate`
   Prisma model. Templates store a Handlebars subject + HTML body and a
   `variables` array that documents expected placeholders.
2. **`sendEmail(key, to, vars)`** — internal dispatch utility called by other
   services (bookings, invoices, quotes). Loads the template by key, renders
   it with Handlebars, and dispatches via Resend.

## New files in this step — ALL 7 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/app.ts` | MODIFIED | Adds `/api/notifications` route mount |
| 2 | `backend/src/lib/resend.ts` | NEW | Singleton Resend client |
| 3 | `backend/src/modules/notifications/notifications.schema.ts` | NEW | Zod schemas for template CRUD + send-test |
| 4 | `backend/src/modules/notifications/notifications.service.ts` | NEW | Template CRUD + sendEmail + sendTestEmail |
| 5 | `backend/src/modules/notifications/notifications.controller.ts` | NEW | HTTP handlers |
| 6 | `backend/src/modules/notifications/notifications.routes.ts` | NEW | Express router (6 endpoints) |
| 7 | `backend/src/modules/notifications/notifications.service.test.ts` | NEW | **31 unit tests — DO NOT SKIP** |

> **Missing file 7 means 31 fewer tests.** Every file must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -f ~/Desktop/Automation/backend/src/app.ts && rm -f ~/Desktop/Automation/backend/src/lib/resend.ts && rm -rf ~/Desktop/Automation/backend/src/modules/notifications
```

---

## STEP 2 — Create the notifications folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/notifications
```

---

## STEP 3 — Download all 7 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" -o ~/Desktop/Automation/backend/src/app.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/resend.ts" -o ~/Desktop/Automation/backend/src/lib/resend.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/notifications/notifications.schema.ts" -o ~/Desktop/Automation/backend/src/modules/notifications/notifications.schema.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/notifications/notifications.service.ts" -o ~/Desktop/Automation/backend/src/modules/notifications/notifications.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/notifications/notifications.controller.ts" -o ~/Desktop/Automation/backend/src/modules/notifications/notifications.controller.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/notifications/notifications.routes.ts" -o ~/Desktop/Automation/backend/src/modules/notifications/notifications.routes.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/notifications/notifications.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/notifications/notifications.service.test.ts
```

---

## STEP 4 — Verify all 7 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/app.ts ~/Desktop/Automation/backend/src/lib/resend.ts ~/Desktop/Automation/backend/src/modules/notifications/notifications.schema.ts ~/Desktop/Automation/backend/src/modules/notifications/notifications.service.ts ~/Desktop/Automation/backend/src/modules/notifications/notifications.controller.ts ~/Desktop/Automation/backend/src/modules/notifications/notifications.routes.ts ~/Desktop/Automation/backend/src/modules/notifications/notifications.service.test.ts
```

All 7 files must show a byte count > 0. If any shows 0 bytes or is missing, re-run STEP 3.

---

## STEP 5 — Run typecheck

```bash
cd ~/Desktop/Automation/backend && npm run typecheck
```

Expected: **no errors printed, exit 0.**

---

## STEP 6 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 13 passed, 13 total
Tests:       404 passed, 404 total
```

---

## Endpoints added in this step

| Method | Path | Auth | Feature Flag | Description |
|--------|------|------|--------------|-------------|
| GET | `/api/notifications/templates` | ADMIN | EMAIL_REMINDERS_ENABLED | List all email templates (paginated) |
| POST | `/api/notifications/templates` | ADMIN | EMAIL_REMINDERS_ENABLED | Create a new email template |
| GET | `/api/notifications/templates/:id` | ADMIN | EMAIL_REMINDERS_ENABLED | Get full template detail (includes HTML body) |
| PATCH | `/api/notifications/templates/:id` | ADMIN | EMAIL_REMINDERS_ENABLED | Partially update a template |
| DELETE | `/api/notifications/templates/:id` | ADMIN | EMAIL_REMINDERS_ENABLED | Soft-delete (deactivate) a template |
| POST | `/api/notifications/templates/:id/send-test` | ADMIN | EMAIL_REMINDERS_ENABLED | Test-send a template to a given email address |

---

## Template system

### Template keys (built-in)

| Key | Trigger |
|-----|---------|
| `booking-confirmed` | When a booking is confirmed |
| `booking-cancelled` | When a booking is cancelled |
| `booking-rescheduled` | When a booking is rescheduled |
| `quote-sent` | When a quote is sent to a customer |
| `invoice-sent` | When an invoice is emailed |
| `review-request` | 36h after booking completion |
| `welcome` | After a new user registers |

### Handlebars variable substitution

Templates use `{{variableName}}` placeholders in both subject and HTML body:

```html
Subject: Booking confirmed for {{customerName}}

Body:
<h1>Hi {{customerName}},</h1>
<p>Your booking on {{bookingDate}} at {{startTime}} is confirmed.</p>
<p>Artist: {{artistName}}</p>
```

### Internal `sendEmail` API (for use by other services)

```typescript
import { sendEmail } from '../notifications/notifications.service';

// Dispatches a rendered transactional email
await sendEmail('booking-confirmed', customer.email, {
  customerName: customer.name,
  bookingDate:  '10 Apr 2026',
  artistName:   artist.user.name,
});
```

---

## Request / Response examples

### Create template

```
POST /api/notifications/templates
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "key": "booking-confirmed",
  "subject": "Booking confirmed — {{customerName}}",
  "htmlBody": "<h1>Hi {{customerName}}, your booking on {{bookingDate}} is confirmed.</h1>",
  "variables": ["customerName", "bookingDate", "artistName"],
  "isActive": true
}
```

### Test-send

```
POST /api/notifications/templates/:id/send-test
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "to": "admin@yourstudio.com",
  "variables": {
    "customerName": "Preview Customer",
    "bookingDate": "10 Apr 2026",
    "artistName": "Alex Ink"
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "templateId": "cuid_abc123",
    "to": "admin@yourstudio.com",
    "subject": "Booking confirmed — Preview Customer"
  },
  "meta": null,
  "error": null
}
```

---

## Architecture notes

- **Resend SDK** (`src/lib/resend.ts`) — singleton shared across the app
- **Handlebars** renders both subject and htmlBody at dispatch time
- **Soft-delete** — templates are never hard-deleted; `isActive = false` only
- **sendEmail is unconditional** — feature flag checks belong to the caller
- **Phase 2 BullMQ** — `sendEmail` will enqueue a job for retry semantics

---

## Bug fixes included in this step

| Bug | Fix |
|-----|-----|
| BUG-A (notifications.service.ts) | `updateTemplate` eliminated extra `findUnique` round-trip — `update` now returns full `templateDetailSelect` directly (3 → 2 DB queries) |
| BUG-B (notifications.service.ts) | `deleteTemplate` eliminated extra `findUnique` round-trip — `update` now returns full `templateDetailSelect` directly (3 → 2 DB queries) |
| BUG-C (notifications.service.ts) | `sendTestEmail` removed redundant `as Record<string, unknown>` cast — `body.variables` is already correctly typed by Zod |
| BUG-D/E (notifications.service.test.ts) | Test mocks updated to match the new single-round-trip update pattern; unreachable DB-race test cases removed |
| BUG-F (notifications.service.ts) | `sendEmail` + `sendTestEmail`: subject-line compilation now uses `{ noEscape: true }` — Handlebars default HTML-escaping turned `&` → `&amp;` and `'` → `&#x27;` in plain-text email subjects; 2 regression tests added |
