# Step 1.29 — Studio Settings API

Adds a **dedicated Studio Settings API** — a public `GET /api/settings` endpoint
(served from Redis cache) plus an ADMIN-only `PATCH /api/settings` endpoint.
Powers email templates, booking confirmations, invoices, and WhatsApp messages
without requiring `.env` changes — studio owners manage all business details
from the CRM.

**What this step delivers:**

- `GET   /api/settings` — Public. Returns a customer-safe subset of StudioSettings (served from Redis cache, 5-minute TTL)
- `PATCH /api/settings` — ADMIN only. Updates the settings row and invalidates the cache.

**Public fields exposed (no auth required):**

| DB field               | Description                                   |
|------------------------|-----------------------------------------------|
| `studioName`           | Business display name                         |
| `studioEmail`          | Contact / reply-to email                      |
| `studioPhone`          | Contact phone                                 |
| `studioAddress`        | Full address (shown on invoices)              |
| `studioTimezone`       | IANA timezone (e.g. "Europe/London")          |
| `currency`             | ISO 4217 code (e.g. "GBP", "USD")             |
| `cancellationPolicyText` | Displayed to customers at booking confirmation |
| `googleReviewUrl`      | Google Business review link                   |
| `bookingPageUrl`       | Public booking page URL                       |

Financial fields (`depositPercentage`, `cancellationFeePercent`, etc.) are **not** exposed
on the public endpoint — they are only returned in the ADMIN PATCH response.

**Caching:**
- Redis key `settings:public`, TTL = 300 s (5 minutes)
- Cache is invalidated immediately on every successful PATCH
- Redis failures are **non-fatal** — service falls through to DB on read failure,
  and logs-but-continues on write/delete failure

**Business rules:**
- `studioName` is required when creating the settings row for the first time
  (fresh deployment before seed has run)
- All other fields are optional on update

**No schema migration required** — the `StudioSettings` model and all its fields
already exist from Step 1.2 and were seeded in Step 1.16.

---

## ALL 7 FILES MUST BE DOWNLOADED

| # | File | New / Modified |
|---|------|----------------|
| 1 | `backend/src/modules/settings/settings.schema.ts`       | NEW |
| 2 | `backend/src/modules/settings/settings.service.ts`      | NEW |
| 3 | `backend/src/modules/settings/settings.controller.ts`   | NEW |
| 4 | `backend/src/modules/settings/settings.routes.ts`       | NEW |
| 5 | `backend/src/modules/settings/settings.service.test.ts` | NEW |
| 6 | `backend/src/modules/settings/settings.test.ts`         | NEW |
| 7 | `backend/src/app.ts`                                    | MODIFIED |

---

## STEP 1 — Delete stale copies of all files

```bash
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/settings/settings.test.ts && \
rm -f ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 2 — Create required directory

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/settings
```

---

## STEP 3 — Download all 7 files

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.schema.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.controller.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.controller.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.routes.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/settings/settings.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/settings/settings.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 4 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 40 passed, 40 total
Tests:       972 passed, 972 total
```

> **All tests must pass with 0 failures.**
> Tests mock all database and Redis calls — no live Postgres or Redis required.

---

# Step 1.28 — Google Calendar Sync

Adds **live Google Calendar sync** for every artist/practitioner.  When a booking
is confirmed, rescheduled, or cancelled the system automatically creates, updates,
or deletes the corresponding event on the artist's Google Calendar — the same
approach used by Acuity Scheduling, Booksy, and Fresha.

**What this step delivers:**

- `GET  /api/calendar/auth-url`      — generate the Google OAuth2 consent URL (ADMIN / ARTIST)
- `GET  /api/calendar/callback`      — public OAuth2 callback; exchanges code, stores tokens
- `GET  /api/calendar/status`        — check whether an artist's calendar is connected (ADMIN / ARTIST)
- `DELETE /api/calendar/disconnect`  — revoke the integration and clear stored tokens (ADMIN / ARTIST)

**Booking side-effects (replacing Phase 1 stubs):**

| Event              | Calendar action                                     |
|--------------------|-----------------------------------------------------|
| Booking CONFIRMED  | Create event → store `calendarEventId` on Booking  |
| Booking RESCHEDULED | Update event (new start/end/title)                 |
| Booking CANCELLED  | Delete event → clear `calendarEventId`              |

**Feature flag:** `CALENDAR_ENABLED` (already seeded in DB — no migration needed).  
All sync calls are **fire-and-forget**; a Google outage never causes an HTTP 5xx.

**Token refresh:** `buildOAuth2ClientForTokens` registers a `tokens` listener.
When Google issues a new access token, the refreshed credentials are persisted
back to the `artists` table automatically.

**Security:**
- All OAuth-initiating and status routes require a valid JWT (`ADMIN` or `ARTIST`)
- The `/callback` endpoint is intentionally public — Google redirects the
  browser there; no Authorization header is available at that point
- The `state` parameter (Base64url-encoded JSON `{ artistId }`) binds the
  callback to the correct Artist record without storing server-side session state
- `code` is **optional** in the callback schema so that Google's
  `error=access_denied` redirect (which carries no `code`) is handled gracefully
  rather than rejected by schema validation before the controller runs

**No schema migration required** — `Booking.calendarEventId` and the three
`Artist.calendar*` columns already exist from earlier steps.

**Bug fixes included (audit complete — 0 bugs remaining):**
- BUG-A: `callbackSchema` required `code` but Google omits it on denial — made optional, controller guards `!code` after the `error` check
- BUG-B: `deleteCalendarEvent` used `GaxiosError.code` (typed `string | number`) for 404/410 detection — fixed to use `GaxiosError.status` (always a number, the dedicated HTTP status field)
- BUG-C: JSDoc test count in `calendar.service.ts` corrected (37 → 36)
- GAP-A: Added missing `calendar.test.ts` routes integration test (15 tests covering all 4 endpoints, including the OAuth denial path)

---

## ALL 10 FILES MUST BE DOWNLOADED

| # | File | New / Modified |
|---|------|----------------|
| 1  | `backend/src/lib/google-calendar.ts`                          | NEW |
| 2  | `backend/src/modules/calendar/calendar.schema.ts`             | NEW |
| 3  | `backend/src/modules/calendar/calendar.service.ts`            | NEW |
| 4  | `backend/src/modules/calendar/calendar.controller.ts`         | NEW |
| 5  | `backend/src/modules/calendar/calendar.routes.ts`             | NEW |
| 6  | `backend/src/modules/calendar/calendar.service.test.ts`       | NEW |
| 7  | `backend/src/modules/calendar/calendar.test.ts`               | NEW |
| 8  | `backend/src/modules/bookings/bookings.service.ts`            | MODIFIED |
| 9  | `backend/src/modules/bookings/bookings.service.test.ts`       | MODIFIED |
| 10 | `backend/src/app.ts`                                          | MODIFIED |

---

## STEP 1 — Delete stale copies of all files

```bash
rm -f ~/Desktop/Automation/backend/src/lib/google-calendar.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 2 — Create required directories

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/calendar
```

---

## STEP 3 — Download all 10 files

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/google-calendar.ts" \
  -o ~/Desktop/Automation/backend/src/lib/google-calendar.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/calendar.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/calendar/calendar.schema.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/calendar.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/calendar/calendar.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/calendar.controller.ts" \
  -o ~/Desktop/Automation/backend/src/modules/calendar/calendar.controller.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/calendar.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/calendar/calendar.routes.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/calendar.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/calendar/calendar.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/calendar.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/calendar/calendar.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 4 — Set the Google Calendar environment variables

In your `~/Desktop/Automation/backend/.env` file, add or verify these lines:

```env
# Google Calendar OAuth2 — set up at https://console.cloud.google.com
GOOGLE_CLIENT_ID=REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=REPLACE_WITH_YOUR_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://YOUR_DOMAIN/api/calendar/callback
```

> In development you can use `http://localhost:3000/api/calendar/callback`.  
> Add this URI to your OAuth2 Client's **Authorised redirect URIs** in Google Cloud Console.

---

## STEP 5 — Enable the CALENDAR_ENABLED feature flag (if not already on)

The flag is seeded by default.  To check / enable it via the admin API:

```bash
# Check current value
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  http://localhost:3000/api/admin/feature-flags | jq '.data[] | select(.key == "CALENDAR_ENABLED")'

# Enable it
curl -s -X PATCH \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"value": true}' \
  http://localhost:3000/api/admin/feature-flags/CALENDAR_ENABLED
```

---

## STEP 6 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 38 passed, 38 total
Tests:       950 passed, 950 total
```

> **All tests must pass with 0 failures.**
> Tests mock all database and Google API calls — no live Postgres, Redis, or Google credentials required.

