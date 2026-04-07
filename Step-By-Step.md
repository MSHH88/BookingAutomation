# Step 1.18 — Analytics & Reporting Dashboard — Setup Guide

**What this step adds:**

A production-grade Analytics & Reporting module that gives admins a
data-driven view of every key metric across the booking system — lead
funnel conversion, booking breakdown, revenue trends, and raw event
tracking.  Every top booking platform (Fresha, Booksy, Vagaro, Mindbody)
surfaces these exact six metric categories in their "Insights" dashboards.

The module provides:

1. **Event tracking** — `POST /api/analytics/events` (public, no auth)
   records any frontend event (page views, form interactions, etc.) and
   attaches it to a lead when a valid `leadId` is supplied.
2. **KPI overview** — `GET /api/analytics/overview` returns leads, bookings
   (by status), revenue totals, waitlist counts, and WhatsApp messages sent
   for a configurable date range (default: last 30 days).
3. **Lead funnel + attribution** — `GET /api/analytics/leads` returns the
   full NEW→LOST pipeline funnel, top UTM sources, countries, device types,
   and score statistics.
4. **Booking breakdown** — `GET /api/analytics/bookings` returns counts
   by status, artist, service and day-of-week, plus no-show and
   cancellation rates.
5. **Revenue metrics** — `GET /api/analytics/revenue` returns paid /
   outstanding / overdue totals, a monthly trend, and top-10 services by
   revenue.
6. **Raw event log** — `GET /api/analytics/events` returns a paginated,
   filterable log of every `AnalyticsEvent` row.

---

## New / modified files — ALL 2 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/app.ts` | MODIFIED | Mounts /api/analytics router |
| 2 | `backend/src/modules/analytics/analytics.schema.ts` | NEW | Zod schemas for all 6 endpoints |
| 3 | `backend/src/modules/analytics/analytics.service.ts` | NEW | All DB aggregations + trackEvent |
| 4 | `backend/src/modules/analytics/analytics.controller.ts` | NEW | HTTP handlers |
| 5 | `backend/src/modules/analytics/analytics.routes.ts` | NEW | Express router (6 endpoints) |
| 6 | `backend/src/modules/analytics/analytics.service.test.ts` | NEW | **38 unit tests — DO NOT SKIP** |

> **Missing file 6 means 38 fewer tests and broken coverage.** All 6 files must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -f ~/Desktop/Automation/backend/src/app.ts && rm -rf ~/Desktop/Automation/backend/src/modules/analytics
```

---

## STEP 2 — Create the analytics folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/analytics
```

---

## STEP 3 — Download all 6 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" -o ~/Desktop/Automation/backend/src/app.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/analytics/analytics.schema.ts" -o ~/Desktop/Automation/backend/src/modules/analytics/analytics.schema.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/analytics/analytics.service.ts" -o ~/Desktop/Automation/backend/src/modules/analytics/analytics.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/analytics/analytics.controller.ts" -o ~/Desktop/Automation/backend/src/modules/analytics/analytics.controller.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/analytics/analytics.routes.ts" -o ~/Desktop/Automation/backend/src/modules/analytics/analytics.routes.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/analytics/analytics.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/analytics/analytics.service.test.ts
```

---

## STEP 4 — Verify all 6 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/app.ts ~/Desktop/Automation/backend/src/modules/analytics/analytics.schema.ts ~/Desktop/Automation/backend/src/modules/analytics/analytics.service.ts ~/Desktop/Automation/backend/src/modules/analytics/analytics.controller.ts ~/Desktop/Automation/backend/src/modules/analytics/analytics.routes.ts ~/Desktop/Automation/backend/src/modules/analytics/analytics.service.test.ts
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
Test Suites: 16 passed, 16 total
Tests:       518 passed, 518 total
```

---

## Endpoints added in this step

| Method | Path | Auth | Feature Flag | Description |
|--------|------|------|--------------|-------------|
| POST | `/api/analytics/events` | None | ANALYTICS_ENABLED | Track a frontend event |
| GET  | `/api/analytics/overview` | ADMIN | ANALYTICS_ENABLED | KPI summary dashboard |
| GET  | `/api/analytics/leads` | ADMIN | ANALYTICS_ENABLED | Lead funnel + attribution |
| GET  | `/api/analytics/bookings` | ADMIN | ANALYTICS_ENABLED | Booking breakdown |
| GET  | `/api/analytics/revenue` | ADMIN | ANALYTICS_ENABLED | Revenue metrics + monthly trend |
| GET  | `/api/analytics/events` | ADMIN | ANALYTICS_ENABLED | Paginated raw event log |

---

## Query parameters

### All admin GET endpoints accept date range filters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `from` | ISO-8601 string | 30 days ago | Range start (inclusive) |
| `to` | ISO-8601 string | now | Range end (inclusive, set to end of day UTC) |

### GET /api/analytics/leads additional filters
| Parameter | Type | Description |
|-----------|------|-------------|
| `artistId` | CUID | Filter to a specific artist |
| `businessType` | string | Filter to a specific business type |

### GET /api/analytics/bookings additional filter
| Parameter | Type | Description |
|-----------|------|-------------|
| `artistId` | CUID | Filter to a specific artist |

### GET /api/analytics/events additional filters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `eventType` | string | — | Filter by event type (case-insensitive) |
| `leadId` | CUID | — | Filter to events linked to a specific lead |
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Results per page (max 100) |

---

## Architecture notes

- **ANALYTICS_ENABLED feature flag** — all 6 endpoints are gated so the
  module can be disabled per deployment with a single flag flip.
- **Public POST /events** — intentionally requires no authentication so
  the frontend can track anonymous visitor events (page views, form starts)
  before any user session exists.
- **Soft leadId link** — when `POST /events` receives an unknown `leadId`,
  the event is still persisted with `leadId = null` rather than returning a
  4xx.  This prevents stale frontend state from breaking tracking.
- **DB-side aggregations** — all counts and group-bys run in the database
  via Prisma `groupBy`.  JS post-processing is limited to formatting and
  name lookups.  This keeps queries fast even at millions of rows.
- **Single Promise.all per endpoint** — all DB round-trips within an
  endpoint execute concurrently, minimising latency for the dashboard.
- **UTC date arithmetic** — end-of-day filtering always uses `setUTCHours`
  so results are consistent regardless of server timezone.
- **30-day default range** — matches the default dashboard view of
  Fresha, Booksy and Vagaro.

---

## Request / Response examples

### Track a page view (anonymous)

```
POST /api/analytics/events
Content-Type: application/json

{
  "eventType": "page_view",
  "sessionId": "sess_abc123",
  "payload": { "page": "/booking" },
  "utmSource": "instagram",
  "utmMedium": "social"
}
```

Response `201 Created`:

```json
{
  "success": true,
  "data": { "recorded": true },
  "meta": null,
  "error": null
}
```

### Get KPI overview (admin)

```
GET /api/analytics/overview?from=2024-01-01&to=2024-01-31
Authorization: Bearer <admin_token>
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "period": { "from": "2024-01-01T00:00:00.000Z", "to": "2024-01-31T23:59:59.999Z" },
    "leads":    { "total": 120, "today": 4, "conversionRate": 28.3 },
    "bookings": { "total": 34, "today": 2, "pending": 5, "confirmed": 12, "completed": 15, "cancelled": 2, "noShow": 0 },
    "revenue":  { "totalPaid": 8450.00, "outstanding": 1200.00, "overdue": 350.00, "currency": "GBP" },
    "waitlist": { "active": 7, "notified": 2 },
    "whatsapp": { "messagesSent": 0 }
  },
  "meta": null,
  "error": null
}
```

