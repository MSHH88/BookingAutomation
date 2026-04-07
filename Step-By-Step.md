# Step 1.17 — WhatsApp Automation Module — Setup Guide

**What this step adds:**

A production-grade WhatsApp Automation Engine that sends customers the right
message at the right moment — inquiry acknowledgement, booking confirmation,
appointment reminder, post-visit review request, and restaurant table reminder.
Every top booking platform (Fresha, Booksy, Vagaro, Mindbody) includes automated
WhatsApp/SMS touchpoints as a core revenue-retention feature.

The module provides:

1. **BullMQ Queue + Worker** — Twilio messages are delivered via a persistent
   Redis-backed job queue with 3-attempt exponential back-off, so transient
   network failures never lose a message.
2. **Five automated message templates** — each triggered at the optimal moment
   with a configurable delay.
3. **Double opt-in gate** — messages are only sent when the customer's
   `preferWhatsApp` flag is `true` AND the `WHATSAPP_CONTACT_ENABLED` feature
   flag is active (GDPR Article 6 compliance + Twilio policy).
4. **Admin test-send endpoint** — `POST /api/whatsapp/send-test` lets admins
   verify Twilio credentials and connectivity without going through the full
   booking flow.
5. **Graceful shutdown** — the Worker waits for in-flight Twilio calls to
   complete before the process exits, preventing mid-delivery kills.

---

## New / modified files — ALL 10 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/server.ts` | MODIFIED | Starts WhatsApp Worker + closes it on shutdown |
| 2 | `backend/src/lib/twilio.ts` | NEW | Twilio client singleton + sendWhatsAppMessage |
| 3 | `backend/src/modules/whatsapp/whatsapp.schema.ts` | NEW | Zod schema for send-test endpoint |
| 4 | `backend/src/modules/whatsapp/whatsapp.queue.ts` | NEW | BullMQ Queue, Worker, message factory |
| 5 | `backend/src/modules/whatsapp/whatsapp.service.ts` | NEW | Enqueue helpers + testSendWhatsApp |
| 6 | `backend/src/modules/whatsapp/whatsapp.controller.ts` | NEW | HTTP handler for send-test |
| 7 | `backend/src/modules/whatsapp/whatsapp.routes.ts` | NEW | Express router (1 admin endpoint) |
| 8 | `backend/src/modules/whatsapp/whatsapp.service.test.ts` | NEW | **40 unit tests — DO NOT SKIP** |
| 9 | `backend/src/modules/leads/leads.service.ts` | MODIFIED | Calls enqueueLeadInquiry on lead create |
| 10 | `backend/src/modules/bookings/bookings.service.ts` | MODIFIED | Calls enqueueBookingConfirmed / enqueuePostVisitReview / enqueueRestaurantReminder |

> **Missing file 8 means 40 fewer tests and broken coverage.** All 10 files must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -f ~/Desktop/Automation/backend/src/server.ts && rm -f ~/Desktop/Automation/backend/src/lib/twilio.ts && rm -rf ~/Desktop/Automation/backend/src/modules/whatsapp && rm -f ~/Desktop/Automation/backend/src/modules/leads/leads.service.ts && rm -f ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts
```

---

## STEP 2 — Create the whatsapp folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/whatsapp
```

---

## STEP 3 — Download all 10 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/server.ts" -o ~/Desktop/Automation/backend/src/server.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/twilio.ts" -o ~/Desktop/Automation/backend/src/lib/twilio.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/whatsapp/whatsapp.schema.ts" -o ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.schema.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/whatsapp/whatsapp.queue.ts" -o ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.queue.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/whatsapp/whatsapp.service.ts" -o ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/whatsapp/whatsapp.controller.ts" -o ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.controller.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/whatsapp/whatsapp.routes.ts" -o ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.routes.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/whatsapp/whatsapp.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.service.test.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/leads/leads.service.ts" -o ~/Desktop/Automation/backend/src/modules/leads/leads.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.ts" -o ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts
```

---

## STEP 4 — Verify all 10 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/server.ts ~/Desktop/Automation/backend/src/lib/twilio.ts ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.schema.ts ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.queue.ts ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.service.ts ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.controller.ts ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.routes.ts ~/Desktop/Automation/backend/src/modules/whatsapp/whatsapp.service.test.ts ~/Desktop/Automation/backend/src/modules/leads/leads.service.ts ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts
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
Test Suites: 15 passed, 15 total
Tests:       480 passed, 480 total
```

---

## Endpoints added in this step

| Method | Path | Auth | Feature Flag | Description |
|--------|------|------|--------------|-------------|
| POST | `/api/whatsapp/send-test` | ADMIN | WHATSAPP_CONTACT_ENABLED | Send a test WhatsApp message via Twilio |

---

## Automated messages triggered in this step

| Message | Trigger | Delay | Job name |
|---------|---------|-------|----------|
| 1 — Inquiry acknowledgement | Lead created (opt-in) | Immediate | `lead-inquiry` |
| 2 — Booking confirmation | Booking → CONFIRMED | Immediate | `booking-confirmed` |
| 3 — Appointment reminder | Booking → CONFIRMED | startAt − 24 h | `appointment-reminder` |
| 4 — Post-visit review | Booking → COMPLETED | + 2 h | `post-visit-review` |
| 5 — Restaurant table reminder | Booking → CONFIRMED (restaurant) | startAt − 2 h | `restaurant-reminder` |

---

## Environment variables required

Add these to your `.env` file (server will start without them, but WhatsApp messages will be skipped):

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=+14155238886
```

> The `TWILIO_WHATSAPP_FROM` number must be a Twilio WhatsApp-enabled number
> (Sandbox number `+14155238886` is used for development; use your approved
> WhatsApp Sender for production).

---

## Architecture notes

- **Fire-and-forget** — all enqueue helpers catch errors internally so that a
  Redis outage never fails a booking or lead creation.
- **Stateless job payload** — all data needed to build the message is embedded
  in the job data at enqueue time.  The processor needs no DB lookups, making
  retries fast and cheap.
- **Double gate** — both `preferWhatsApp` (per-customer opt-in) and
  `WHATSAPP_CONTACT_ENABLED` (per-instance feature flag) must be active before
  any message is enqueued.
- **Empty review URL guard** — `enqueuePostVisitReview` silently skips when
  `GOOGLE_REVIEW_URL` is not configured; customers never receive a broken link.
- **UTC formatting** — message date/time strings are formatted in UTC so
  output is consistent regardless of server timezone.
- **Graceful shutdown** — the BullMQ Worker finishes in-flight Twilio calls
  before the process exits (SIGTERM → Worker.close() → Queue.close() → exit).

---

## Request / Response example

### Test Twilio connectivity (admin)

```
POST /api/whatsapp/send-test
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "to": "+447700900001",
  "message": "Hello from Black Rose Studio! 👋 WhatsApp is configured correctly."
}
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "to": "+447700900001",
    "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "meta": null,
  "error": null
}
```

Error `503` when Twilio is not configured:

```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": {
    "code": "WHATSAPP_NOT_CONFIGURED",
    "message": "Twilio WhatsApp is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM."
  }
}
```

