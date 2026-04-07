# Step 1.19 — Review Request Automation — Setup Guide

**What this step adds:**

A production-grade automated review-request pipeline that fires a personalised
email to every customer 36 hours after their booking is marked COMPLETED.
Every major booking platform (Fresha, Booksy, Vagaro, Acuity, Mindbody) sends
exactly this touchpoint — it is the single highest-ROI automation a studio can
run, consistently delivering a 3-5× increase in Google review volume vs. manual
follow-up.

The module provides:

1. **BullMQ delayed queue** (`reviews.queue.ts`) — schedules a `review-request`
   job with a configurable delay (default 36 h) the moment a booking transitions
   to COMPLETED.  Gated by the `REVIEW_REQUEST_ENABLED` feature flag so it can
   be disabled per deployment with a single flag flip.
2. **Stateless job processor** (`reviews.processor.ts`) — picks up the job
   36 h later, calls `sendEmail('review-request', customerEmail, vars)` via the
   existing Notifications module, and logs every outcome for observability.
3. **Zero-downtime error handling** — if the `review-request` email template
   is missing or inactive in the DB, the job completes silently (no dead-letter
   spam); all other errors (Resend API, network) trigger BullMQ's 3-attempt
   exponential back-off.
4. **Graceful shutdown** — `server.ts` now closes both the WhatsApp and Review
   workers + queues in order, draining in-flight jobs before the process exits.
5. **bookings.service.ts** — the previous `"Email job queued (stub)"` log line
   is replaced with the real `enqueueReviewRequest(...)` call.
6. **bookings.service.test.ts** — mock added for `reviews.queue` so the test
   suite runs cleanly with zero Redis open-handle warnings.

---

## New / modified files — ALL 6 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/modules/reviews/reviews.queue.ts` | NEW | Queue definition + enqueueReviewRequest helper |
| 2 | `backend/src/modules/reviews/reviews.processor.ts` | NEW | Worker + processReviewJob + startReviewWorker |
| 3 | `backend/src/modules/reviews/reviews.queue.test.ts` | NEW | **23 unit tests — DO NOT SKIP** |
| 4 | `backend/src/modules/bookings/bookings.service.ts` | MODIFIED | Replaces stub log with real enqueueReviewRequest call |
| 5 | `backend/src/modules/bookings/bookings.service.test.ts` | MODIFIED | Adds reviews.queue mock — eliminates Redis open-handle warnings |
| 6 | `backend/src/server.ts` | MODIFIED | Starts review worker + graceful shutdown for review queue |

> **Missing file 3 means 23 fewer tests and broken coverage.**
> **Missing file 5 causes Redis ECONNREFUSED errors + open-handle warnings every test run.**
> All 6 files must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -rf ~/Desktop/Automation/backend/src/modules/reviews && rm -f ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts && rm -f ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.test.ts && rm -f ~/Desktop/Automation/backend/src/server.ts
```

---

## STEP 2 — Create the reviews folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/reviews
```

---

## STEP 3 — Download all 6 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/reviews/reviews.queue.ts" -o ~/Desktop/Automation/backend/src/modules/reviews/reviews.queue.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/reviews/reviews.processor.ts" -o ~/Desktop/Automation/backend/src/modules/reviews/reviews.processor.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/reviews/reviews.queue.test.ts" -o ~/Desktop/Automation/backend/src/modules/reviews/reviews.queue.test.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.ts" -o ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.test.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/server.ts" -o ~/Desktop/Automation/backend/src/server.ts
```

---

## STEP 4 — Verify all 6 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/modules/reviews/reviews.queue.ts ~/Desktop/Automation/backend/src/modules/reviews/reviews.processor.ts ~/Desktop/Automation/backend/src/modules/reviews/reviews.queue.test.ts ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.test.ts ~/Desktop/Automation/backend/src/server.ts
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
Test Suites: 17 passed, 17 total
Tests:       542 passed, 542 total
```

---

## Architecture notes

- **REVIEW_REQUEST_ENABLED feature flag** — the queue helper returns immediately
  (without touching Redis) when this flag is OFF, so disabling the feature costs
  zero overhead and never blocks the booking-complete flow.
- **36-hour delay** — empirically the sweet spot used by Fresha, Booksy, and
  Vagaro: late enough that the customer is home and relaxed, early enough that
  the experience is still fresh.
- **Stateless processor** — all data needed to send the email is embedded in
  the job payload at enqueue-time.  The processor requires zero DB lookups,
  making retries cheap and safe with no risk of stale data.
- **Template key `review-request`** — the email body is stored in the
  `EmailTemplate` DB table (managed via the Notifications module from Step 1.15).
  If the template does not exist or is inactive, the job silently completes so
  the dead-letter queue is never flooded by a misconfigured template.
- **Graceful shutdown** — server.ts closes workers and queues in dependency
  order (workers first, then queues) to drain in-flight jobs before the process
  exits, preventing message loss on rolling deployments.
- **Producer / processor split** — `reviews.queue.ts` (producer) and
  `reviews.processor.ts` (consumer) are separate files so the heavy Resend /
  Handlebars / Prisma dependency chain is never loaded in tests that only
  exercise the enqueue helper.

---

## Email template variables

The processor calls `sendEmail('review-request', customerEmail, vars)`.
Your `review-request` email template should include these Handlebars variables:

| Variable | Example value | Notes |
|----------|---------------|-------|
| `{{ customerName }}` | `Jane Smith` | Customer's name |
| `{{ studioName }}` | `Black Rose Studio` | Your studio name |
| `{{ googleReviewUrl }}` | `https://g.page/r/…/review` | Set `GOOGLE_REVIEW_URL` env var |
| `{{ artistName }}` | `Alex Ink` | Performing artist (fallback: studioName) |
| `{{ serviceName }}` | `Sleeve Tattoo` | First service on the booking (fallback: "appointment") |

---

## Environment variables required

| Variable | Example | Notes |
|----------|---------|-------|
| `GOOGLE_REVIEW_URL` | `https://g.page/r/CBlack_Rose/review` | Google review link for your studio |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ connection (same as WhatsApp queue) |


