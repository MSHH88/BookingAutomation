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

