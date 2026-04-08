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

**No schema migration required** — `Booking.calendarEventId` and the three
`Artist.calendar*` columns already exist from earlier steps.

---

## ALL 9 FILES MUST BE DOWNLOADED

| # | File | New / Modified |
|---|------|----------------|
| 1  | `backend/src/lib/google-calendar.ts`                          | NEW |
| 2  | `backend/src/modules/calendar/calendar.schema.ts`             | NEW |
| 3  | `backend/src/modules/calendar/calendar.service.ts`            | NEW |
| 4  | `backend/src/modules/calendar/calendar.controller.ts`         | NEW |
| 5  | `backend/src/modules/calendar/calendar.routes.ts`             | NEW |
| 6  | `backend/src/modules/calendar/calendar.service.test.ts`       | NEW |
| 7  | `backend/src/modules/bookings/bookings.service.ts`            | MODIFIED |
| 8  | `backend/src/modules/bookings/bookings.service.test.ts`       | MODIFIED |
| 9  | `backend/src/app.ts`                                          | MODIFIED |

---

## STEP 1 — Delete stale copies of all files

```bash
rm -f ~/Desktop/Automation/backend/src/lib/google-calendar.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/calendar/calendar.service.test.ts && \
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

## STEP 3 — Download all 9 files

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
Test Suites: 37 passed, 37 total
Tests:       935 passed, 935 total
```

> **All tests must pass with 0 failures.**
> Tests mock all database and Google API calls — no live Postgres, Redis, or Google credentials required.

