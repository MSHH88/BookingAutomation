# Step 1.24 — Service & Table Management API

Adds the `PUT /api/artists/:id/services` bulk-assignment endpoint (with per-artist price overrides)
and a complete Table Management API for restaurant deployments.

**What this step delivers:**

- `PUT  /api/artists/:id/services`    — ADMIN atomically replaces the full list of services an artist offers (with optional `customPrice` overrides per artist)
- `GET  /api/tables`                  — public list of active tables (with floor-plan positions)
- `GET  /api/tables/availability`     — tables available for a given `?date=&time=&partySize=&durationMinutes=`
- `POST /api/tables`                  — ADMIN creates a table
- `PATCH /api/tables/:id`             — ADMIN partially updates a table (name, capacity, location, floor-plan position, active status)
- `DELETE /api/tables/:id`            — ADMIN soft-deletes a table (409 if active bookings exist)

**Feature flag:** `TABLE_SELECTION_ENABLED`
- All `/api/tables` routes are gated by this flag
- Set to `true` for `restaurant` deployments; `false` for all others (no tables needed)

**Schema changes:**
- `ArtistService.customPrice Decimal?` — per-artist price override (null = use `Service.priceFrom`)
- `Table.positionX Float?` / `Table.positionY Float?` — floor-plan coordinates for the CRM drag-and-drop layout editor

**Availability logic (`GET /api/tables/availability`):**
1. Load active tables with `capacity >= partySize`
2. Compute the sitting window: `[startAt, startAt + durationMinutes]` (default 120 min)
3. Load PENDING/CONFIRMED/RESCHEDULED bookings whose time window overlaps
4. Return tables with no overlapping booking — includes `positionX/Y` for floor-plan rendering

---

## ALL 11 FILES MUST BE DOWNLOADED

| # | File | New / Modified |
|---|------|----------------|
| 1 | `backend/prisma/schema.prisma` | MODIFIED |
| 2 | `backend/src/modules/artists/artists.schema.ts` | MODIFIED |
| 3 | `backend/src/modules/artists/artists.service.ts` | MODIFIED |
| 4 | `backend/src/modules/artists/artists.controller.ts` | MODIFIED |
| 5 | `backend/src/modules/artists/artists.routes.ts` | MODIFIED |
| 6 | `backend/src/modules/artists/artists.test.ts` | MODIFIED |
| 7 | `backend/src/modules/tables/tables.schema.ts` | NEW |
| 8 | `backend/src/modules/tables/tables.service.ts` | NEW |
| 9 | `backend/src/modules/tables/tables.controller.ts` | NEW |
| 10 | `backend/src/modules/tables/tables.routes.ts` | NEW |
| 11 | `backend/src/modules/tables/tables.service.test.ts` | NEW |
| 12 | `backend/src/app.ts` | MODIFIED |

---

## STEP 1 — Delete stale copies of all files

```bash
rm -f ~/Desktop/Automation/backend/prisma/schema.prisma && \
rm -f ~/Desktop/Automation/backend/src/modules/artists/artists.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/artists/artists.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/artists/artists.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/artists/artists.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/artists/artists.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tables/tables.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tables/tables.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tables/tables.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tables/tables.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/tables/tables.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 2 — Create required directories

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/tables
```

---

## STEP 3 — Download all 12 files

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/schema.prisma" \
  -o ~/Desktop/Automation/backend/prisma/schema.prisma && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artists.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/artists/artists.schema.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artists.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/artists/artists.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artists.controller.ts" \
  -o ~/Desktop/Automation/backend/src/modules/artists/artists.controller.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artists.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/artists/artists.routes.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artists.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/artists/artists.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/tables/tables.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tables/tables.schema.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/tables/tables.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tables/tables.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/tables/tables.controller.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tables/tables.controller.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/tables/tables.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tables/tables.routes.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/tables/tables.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/tables/tables.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 4 — Regenerate the Prisma client

The schema adds `customPrice` to `ArtistService` and `positionX`/`positionY` to `Table`.
Regenerate so TypeScript picks up the new fields:

```bash
cd ~/Desktop/Automation/backend && npx prisma generate
```

---

## STEP 5 — Run the database migration (live PostgreSQL only)

> **Skip if you are only running tests** — tests mock all database calls and do not need a live connection.

**Pre-requisite:** Docker Postgres container must be running.

```bash
cd ~/Desktop/Automation/backend && npx prisma migrate dev --name add-artist-service-custom-price-and-table-positions
```

Expected output ends with:
```
The following migration(s) have been applied:
20xxxxxx_add-artist-service-custom-price-and-table-positions
✔ Generated Prisma Client
```

---

## STEP 6 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 33 passed, 33 total
Tests:       812 passed, 812 total
```

> **All tests must pass with 0 failures.**
> Tests mock all database calls — no live Postgres or Stripe keys required.
