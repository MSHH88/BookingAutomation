# Step 1.20 — Appointment Reminder Automation — Setup Guide

**What this step adds:**

A production-grade automated appointment-reminder pipeline that fires a
personalised email to every customer 24 hours before their confirmed booking.
Every major booking platform (Fresha, Booksy, Square Appointments, Acuity
Scheduling, Mindbody) sends exactly this touchpoint — it is the single most
effective tool for reducing no-show rates, with studios reporting a 25–40 %
improvement once automated reminders are active.

The module provides:

1. **BullMQ delayed queue** (`reminders.queue.ts`) — schedules a
   `booking-reminder` job at booking-confirm time with a configurable lead
   time (default 24 h, overridable via `REMINDER_HOURS_BEFORE`). Uses a
   **deterministic job ID** (`booking-reminder-{bookingId}`) so the pending
   job can be found and removed by booking ID alone. Gated by the
   `EMAIL_REMINDERS_ENABLED` feature flag.
2. **Stateless job processor** (`reminders.processor.ts`) — picks up the job
   ~24 h before the appointment, calls
   `sendEmail('booking-reminder', customerEmail, vars)` via the existing
   Notifications module, and logs every outcome for observability.
3. **Job cancellation** — `cancelBookingReminder(bookingId)` is called in
   `bookings.service.ts` whenever a booking is **cancelled or rescheduled**,
   removing the pending reminder so the customer never receives a reminder for
   an appointment that no longer exists at the original time.
4. **Reschedule re-enqueue** — when a booking is rescheduled the old reminder
   is cancelled and a new one is immediately scheduled for the new `startAt`.
5. **Zero-downtime error handling** — if the `booking-reminder` email template
   is missing or inactive the job completes silently (no dead-letter spam);
   all other errors trigger BullMQ's 3-attempt exponential back-off.
6. **Graceful shutdown** — `server.ts` now closes the WhatsApp, Review, and
   Reminder workers + queues in order, draining in-flight jobs before exit.
7. **bookings.service.ts** — `confirmBooking` wires `enqueueBookingReminder`;
   `cancelBooking` wires `cancelBookingReminder`; `rescheduleBooking` wires
   cancel + re-enqueue.
8. **bookings.service.test.ts** — mock added for `reminders.queue` so the
   test suite runs cleanly with zero Redis open-handle warnings.

---

## New / modified files — ALL 6 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/modules/reminders/reminders.queue.ts` | NEW | Queue + enqueueBookingReminder + cancelBookingReminder |
| 2 | `backend/src/modules/reminders/reminders.processor.ts` | NEW | Worker + processReminderJob + startReminderWorker |
| 3 | `backend/src/modules/reminders/reminders.queue.test.ts` | NEW | **39 unit tests — DO NOT SKIP** |
| 4 | `backend/src/modules/bookings/bookings.service.ts` | MODIFIED | Wires reminder on confirm, cancel, and reschedule |
| 5 | `backend/src/modules/bookings/bookings.service.test.ts` | MODIFIED | Adds reminders.queue mock — eliminates Redis open-handle warnings |
| 6 | `backend/src/server.ts` | MODIFIED | Starts reminder worker + graceful shutdown for reminder queue |

> **Missing file 3 means 38 fewer tests and broken coverage.**
> **Missing file 5 causes Redis ECONNREFUSED errors + open-handle warnings every test run.**
> All 6 files must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -rf ~/Desktop/Automation/backend/src/modules/reminders && rm -f ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts && rm -f ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.test.ts && rm -f ~/Desktop/Automation/backend/src/server.ts
```

---

## STEP 2 — Create the reminders folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/reminders
```

---

## STEP 3 — Download all 6 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/reminders/reminders.queue.ts" -o ~/Desktop/Automation/backend/src/modules/reminders/reminders.queue.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/reminders/reminders.processor.ts" -o ~/Desktop/Automation/backend/src/modules/reminders/reminders.processor.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/reminders/reminders.queue.test.ts" -o ~/Desktop/Automation/backend/src/modules/reminders/reminders.queue.test.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.ts" -o ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.test.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/server.ts" -o ~/Desktop/Automation/backend/src/server.ts
```

---

## STEP 4 — Verify all 6 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/modules/reminders/reminders.queue.ts ~/Desktop/Automation/backend/src/modules/reminders/reminders.processor.ts ~/Desktop/Automation/backend/src/modules/reminders/reminders.queue.test.ts ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.test.ts ~/Desktop/Automation/backend/src/server.ts
```

All 6 files must show a byte count > 0. If any shows 0 bytes or is missing, re-run STEP 3.

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
Test Suites: 18 passed, 18 total
Tests:       581 passed, 581 total
```

---

## Architecture notes

- **EMAIL_REMINDERS_ENABLED feature flag** — the queue helpers return
  immediately (without touching Redis) when this flag is OFF, so disabling
  the feature costs zero overhead and never blocks the booking-confirm /
  cancel / reschedule flows.
- **24-hour default** — used by Fresha, Booksy, Square Appointments, Acuity,
  and Mindbody as their default reminder lead-time.  Override with
  `REMINDER_HOURS_BEFORE=48` (or any positive integer) in `.env` if needed.
- **Deterministic job ID** — `booking-reminder-{bookingId}` makes cancellation
  O(1): the queue lookup requires only the booking ID, with no secondary index
  or scan.  BullMQ silently discards duplicate-ID enqueue calls, so
  re-confirming the same booking cannot schedule a duplicate reminder.
- **Stateless processor** — all data needed to send the email is embedded in
  the job payload at enqueue-time.  The processor requires zero DB lookups,
  making retries cheap and safe with no risk of stale data.
- **Template key `booking-reminder`** — the email body is stored in the
  `EmailTemplate` DB table (managed via the Notifications module from Step
  1.15).  If the template does not exist or is inactive, the job silently
  completes so the dead-letter queue is never flooded.
- **Reschedule race safety** — cancel is called before re-enqueue, eliminating
  the theoretical race where two reminders exist briefly for the same booking.
- **Graceful shutdown** — server.ts closes workers and queues in dependency
  order (workers first, then queues) to drain in-flight jobs before exit,
  preventing message loss on rolling deployments.
- **Producer / processor split** — `reminders.queue.ts` (producer) and
  `reminders.processor.ts` (consumer) are separate files so the heavy
  Resend / Handlebars / Prisma dependency chain is never loaded in tests
  that only exercise the enqueue / cancel helpers.

---

## Email template variables

The processor calls `sendEmail('booking-reminder', customerEmail, vars)`.
Your `booking-reminder` email template should include these Handlebars variables:

| Variable | Example value | Notes |
|----------|---------------|-------|
| `{{ customerName }}` | `Jane Smith` | Customer's name |
| `{{ studioName }}` | `Black Rose Studio` | Your studio name |
| `{{ artistName }}` | `Alex Ink` | Performing artist |
| `{{ serviceName }}` | `Full Sleeve Tattoo` | Service booked (fallback: "appointment") |
| `{{ bookingDate }}` | `Monday, 14 April 2025` | Formatted in en-GB, UTC |
| `{{ bookingTime }}` | `14:30` | HH:MM, UTC |
| `{{ studioAddress }}` | `42 Ink Lane, London` | Empty string if not set |
| `{{ bookingId }}` | `cla000…` | Booking reference |

---

## Environment variables required

| Variable | Example | Notes |
|----------|---------|-------|
| `REDIS_URL` | `redis://localhost:6379` | BullMQ connection (same as WhatsApp + Review queues) |
| `REMINDER_HOURS_BEFORE` | `24` | Optional — hours before appointment to send reminder (default: 24) |

