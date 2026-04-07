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



**What this step adds:**

A production-grade, security-hardened File Upload API backed by Cloudinary CDN.
This is the upload engine every professional booking platform (Fresha, Booksy,
Vagaro, Square) requires before customers can submit reference images, before
artists can build portfolio galleries, and before any media appears on the site.

Two independent security layers protect every upload:

1. **Multer fileFilter** — rejects requests at the HTTP layer if the declared
   MIME type is not `image/jpeg`, `image/png`, or `image/webp`.
2. **Magic-byte validation** — reads the first bytes of each in-memory buffer to
   verify the file's actual content matches its MIME type.  This catches
   attackers who rename an `.exe` to `.jpg`.

Only after both guards pass are files streamed to Cloudinary's upload API.

## New files in this step — ALL 10 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/app.ts` | MODIFIED | Adds `/api/uploads` route mount |
| 2 | `backend/src/middleware/errorHandler.ts` | MODIFIED | Adds `MulterError` handling → 400 |
| 3 | `backend/src/lib/cloudinary.ts` | NEW | Singleton Cloudinary v2 instance |
| 4 | `backend/src/middleware/upload.ts` | NEW | Multer memory storage, MIME whitelist, size/count limits |
| 5 | `backend/src/modules/uploads/uploads.service.ts` | NEW | Magic-byte validation + Cloudinary upload |
| 6 | `backend/src/modules/uploads/uploads.controller.ts` | NEW | HTTP handler |
| 7 | `backend/src/modules/uploads/uploads.routes.ts` | NEW | Express router |
| 8 | `backend/src/modules/uploads/uploads.service.test.ts` | NEW | **27 unit tests — DO NOT SKIP** |
| 9 | `backend/src/modules/services/services.schema.ts` | MODIFIED | BUG-3 fix: `optStr` now rejects empty strings |
| 10 | `backend/src/modules/services/services.service.test.ts` | MODIFIED | BUG-4 fix: JSDoc comment corrected |

> **Missing file 8 means 27 fewer tests.** Every file must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -rf ~/Desktop/Automation/backend/src/modules/uploads && rm -f ~/Desktop/Automation/backend/src/lib/cloudinary.ts && rm -f ~/Desktop/Automation/backend/src/middleware/upload.ts && rm -f ~/Desktop/Automation/backend/src/middleware/errorHandler.ts && rm -f ~/Desktop/Automation/backend/src/app.ts && rm -f ~/Desktop/Automation/backend/src/modules/services/services.schema.ts && rm -f ~/Desktop/Automation/backend/src/modules/services/services.service.test.ts
```

---

## STEP 2 — Create the uploads folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/uploads
```

---

## STEP 3 — Download all 10 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" -o ~/Desktop/Automation/backend/src/app.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/middleware/errorHandler.ts" -o ~/Desktop/Automation/backend/src/middleware/errorHandler.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/cloudinary.ts" -o ~/Desktop/Automation/backend/src/lib/cloudinary.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/middleware/upload.ts" -o ~/Desktop/Automation/backend/src/middleware/upload.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/uploads/uploads.service.ts" -o ~/Desktop/Automation/backend/src/modules/uploads/uploads.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/uploads/uploads.controller.ts" -o ~/Desktop/Automation/backend/src/modules/uploads/uploads.controller.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/uploads/uploads.routes.ts" -o ~/Desktop/Automation/backend/src/modules/uploads/uploads.routes.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/uploads/uploads.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/uploads/uploads.service.test.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/services/services.schema.ts" -o ~/Desktop/Automation/backend/src/modules/services/services.schema.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/services/services.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/services/services.service.test.ts
```

---

## STEP 4 — Verify all 10 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/app.ts ~/Desktop/Automation/backend/src/middleware/errorHandler.ts ~/Desktop/Automation/backend/src/lib/cloudinary.ts ~/Desktop/Automation/backend/src/middleware/upload.ts ~/Desktop/Automation/backend/src/modules/uploads/uploads.service.ts ~/Desktop/Automation/backend/src/modules/uploads/uploads.controller.ts ~/Desktop/Automation/backend/src/modules/uploads/uploads.routes.ts ~/Desktop/Automation/backend/src/modules/uploads/uploads.service.test.ts ~/Desktop/Automation/backend/src/modules/services/services.schema.ts ~/Desktop/Automation/backend/src/modules/services/services.service.test.ts
```

All 10 files must show a byte count > 0. If any shows 0 bytes or is missing, re-run STEP 3.

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
Test Suites: 12 passed, 12 total
Tests:       373 passed, 373 total
```

---

## Endpoint added in this step

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/uploads/images` | Auth (any role) | Upload 1–10 images; returns array of Cloudinary CDN URLs |

---

## Request format

```
POST /api/uploads/images
Content-Type: multipart/form-data
Authorization: Bearer <token>

Field name: images (repeat up to 10 times)
```

## Response

```json
{
  "success": true,
  "data": {
    "count": 2,
    "files": [
      {
        "url": "https://res.cloudinary.com/your-cloud/image/upload/uploads/abc123.jpg",
        "publicId": "uploads/abc123",
        "width": 1920,
        "height": 1080,
        "format": "jpg",
        "bytes": 204800
      }
    ]
  }
}
```

---

## Constraints & security

| Constraint | Value |
|------------|-------|
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Max file size | 10 MB per image |
| Max files per request | 10 |
| Security layer 1 | Multer fileFilter — rejects wrong MIME type at HTTP layer |
| Security layer 2 | Magic-byte validation — confirms buffer content matches MIME type |
| Cloudinary folder | `uploads/` |
| Auth required | Yes — any authenticated user (CUSTOMER, ARTIST, ADMIN) |

---

## Bug fixes also included in this step

| Bug | Fix |
|-----|-----|
| BUG-3 (services.schema.ts) | `optStr` now adds `.min(1)` — empty strings `""` are rejected on description fields |
| BUG-4 (services.service.test.ts) | JSDoc coverage comment corrected to match the actual test behavior |
| BUG-A (uploads.service.ts) | `error ?? !result` → `error \|\| !result` — uses logical OR (truthiness) not nullish coalescing |
| BUG-B (uploads.service.test.ts) | JSDoc coverage comment now lists all 27 test cases accurately |

