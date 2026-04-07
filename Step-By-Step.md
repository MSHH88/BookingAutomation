# Step 1.16 — Waitlist Module — Setup Guide

**What this step adds:**

A production-grade Waitlist system that captures customer interest when a
desired artist or time slot is fully booked.  Every top booking platform
(Fresha, Booksy, Mindbody, Acuity) includes a waitlist as a core feature —
it converts "sorry, fully booked" into a revenue opportunity by automatically
queueing interested customers and notifying them when a slot opens.

The module provides:

1. **Public Join Endpoint** — customers add themselves to the waitlist without
   logging in.  Email + artist deduplication prevents spam.
2. **Admin Queue Management** — paginated list with status/artist/email filters,
   full entry detail, manual status transitions, and hard-delete.
3. **Slot-Available Notifications** — admin triggers a personalised email
   (template: `waitlist-slot-available`) with a configurable response window
   (default 72 h).  DB state is updated **before** the email is sent, so the
   notification record is never lost even if the send fails.
4. **Status Lifecycle** — `WAITING → NOTIFIED → BOOKED` (success path);
   `CANCELLED` and `EXPIRED` for non-converting entries.  `EXPIRED` entries
   can be re-activated to `WAITING` to re-enter the queue.

## New files in this step — ALL 6 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/app.ts` | MODIFIED | Adds `/api/waitlist` route mount |
| 2 | `backend/src/modules/waitlist/waitlist.schema.ts` | NEW | Zod schemas for all 6 endpoints |
| 3 | `backend/src/modules/waitlist/waitlist.service.ts` | NEW | Business logic + DB access |
| 4 | `backend/src/modules/waitlist/waitlist.controller.ts` | NEW | HTTP handlers |
| 5 | `backend/src/modules/waitlist/waitlist.routes.ts` | NEW | Express router (6 endpoints) |
| 6 | `backend/src/modules/waitlist/waitlist.service.test.ts` | NEW | **35 unit tests — DO NOT SKIP** |

> **Missing file 6 means 35 fewer tests.** Every file must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -f ~/Desktop/Automation/backend/src/app.ts && rm -rf ~/Desktop/Automation/backend/src/modules/waitlist
```

---

## STEP 2 — Create the waitlist folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/waitlist
```

---

## STEP 3 — Download all 6 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" -o ~/Desktop/Automation/backend/src/app.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.schema.ts" -o ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.schema.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.service.ts" -o ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.controller.ts" -o ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.controller.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.routes.ts" -o ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.routes.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.service.test.ts
```

---

## STEP 4 — Verify all 6 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/app.ts ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.schema.ts ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.service.ts ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.controller.ts ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.routes.ts ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.service.test.ts
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
Test Suites: 14 passed, 14 total
Tests:       439 passed, 439 total
```

---

## Endpoints added in this step

| Method | Path | Auth | Feature Flag | Description |
|--------|------|------|--------------|-------------|
| POST | `/api/waitlist` | PUBLIC | WAITING_LIST_ENABLED | Join the waitlist |
| GET | `/api/waitlist` | ADMIN | WAITING_LIST_ENABLED | List all entries (paginated, filtered) |
| PATCH | `/api/waitlist/:id/status` | ADMIN | WAITING_LIST_ENABLED | Manually transition entry status |
| POST | `/api/waitlist/:id/notify` | ADMIN | WAITING_LIST_ENABLED | Send slot-available email notification |
| GET | `/api/waitlist/:id` | ADMIN | WAITING_LIST_ENABLED | Get full entry detail |
| DELETE | `/api/waitlist/:id` | ADMIN | WAITING_LIST_ENABLED | Hard-delete a waitlist entry |

---

## Status lifecycle

```
WAITING ──► NOTIFIED ──► BOOKED      (customer responds and books)
   │            └──────► EXPIRED     (customer didn't respond in time)
   │            └──────► CANCELLED   (admin/customer cancels)
   └──────────────────── CANCELLED
   └──────────────────── EXPIRED
EXPIRED ──► WAITING                  (re-activate into the queue)
```

| Status | Meaning |
|--------|---------|
| `WAITING` | Newly joined; slot not yet available |
| `NOTIFIED` | Admin sent slot-available email; `expiresAt` is set |
| `BOOKED` | Customer responded and completed a booking (terminal) |
| `EXPIRED` | Customer did not respond before `expiresAt` (re-activatable) |
| `CANCELLED` | Removed by admin or customer (terminal) |

---

## Notification email

The `POST /:id/notify` endpoint sends the template with key
`waitlist-slot-available` (must be created via the Notifications API from
Step 1.15 before use).  If the template is missing or inactive, the DB
state (`notifiedAt`, `expiresAt`, `status = NOTIFIED`) is still persisted
and a warning is logged.

### Suggested template variables

| Variable | Example value |
|----------|---------------|
| `customerName` | "Jane Smith" |
| `artistId` | "artist_123" |
| `serviceId` | "svc_456" |
| `requestedDate` | "2026-05-01" |
| `expiresInHours` | "72" |
| `expiresAt` | "2026-04-10T10:00:00.000Z" |
| `customMessage` | "Alex has a Saturday slot open!" |

### Create the template

```
POST /api/notifications/templates
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "key": "waitlist-slot-available",
  "subject": "Good news {{customerName}} — a slot just opened up!",
  "htmlBody": "<h1>Hi {{customerName}},</h1><p>A slot is now available. You have {{expiresInHours}} hours to book before it goes to the next person.</p>{{#if customMessage}}<p>{{customMessage}}</p>{{/if}}",
  "variables": ["customerName", "artistId", "serviceId", "requestedDate", "expiresInHours", "expiresAt", "customMessage"],
  "isActive": true
}
```

---

## Request / Response examples

### Join the waitlist (public)

```
POST /api/waitlist
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+44 7700 900001",
  "artistId": "cuid_artist",
  "serviceId": "cuid_service",
  "requestedDate": "2026-05-01T14:00:00Z",
  "notes": "Prefer afternoons. Interested in a blackwork sleeve."
}
```

Response `201 Created`:

```json
{
  "success": true,
  "data": {
    "id": "cuid_wl_abc123",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+44 7700 900001",
    "artistId": "cuid_artist",
    "serviceId": "cuid_service",
    "bookingId": null,
    "requestedDate": "2026-05-01T14:00:00.000Z",
    "notes": "Prefer afternoons. Interested in a blackwork sleeve.",
    "status": "WAITING",
    "notifiedAt": null,
    "expiresAt": null,
    "createdAt": "2026-04-07T10:00:00.000Z",
    "updatedAt": "2026-04-07T10:00:00.000Z"
  },
  "meta": null,
  "error": null
}
```

### Send slot-available notification

```
POST /api/waitlist/cuid_wl_abc123/notify
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "expiresInHours": 48,
  "customMessage": "Alex has a Saturday 2pm slot available this weekend."
}
```

---

## Architecture notes

- **Deduplication** — `POST /api/waitlist` rejects 409 if the same email
  already has a WAITING or NOTIFIED entry for the same `artistId`
- **Best-effort email** — DB state persists even when the email send fails
- **Hard-delete** — waitlist entries are hard-deleted (no audit-trail requirement)
- **Feature flag** — all 6 endpoints are gated by `WAITING_LIST_ENABLED`
- **Public endpoint** — `POST /` bypasses auth but is still gated by the flag
- **Phase 2 BullMQ** — notify will enqueue a job for retry semantics and
  auto-expiry via scheduled jobs

