# Step 1.13 — Services Catalogue API — Setup Guide

**What this step adds:**

A full Services Catalogue API — the backbone every professional booking platform
(Fresha, Booksy, Square Appointments) requires before customers can book anything.
Without a service catalogue, the booking widget has nothing to show.

This step wires three data layers together:

1. **ServiceCategory** — logical buckets that group services (e.g. "Haircuts", "Colour Treatments").
2. **Service** — a bookable offering with duration, pricing, buffer time, and rebooking interval.
   The slot engine introduced in Step 1.12 automatically uses `durationMinutes` + `bufferMinutes`
   when computing available time slots.
3. **ArtistService** — a many-to-many join: each artist declares which services they offer.
   Public clients can filter the `/slots` endpoint (Step 1.12) by service — the duration is then
   taken directly from the service record rather than from the artist's generic default.

## New files in this step — ALL 6 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/app.ts` | MODIFIED | Adds `/api/services` route mount |
| 2 | `backend/src/modules/services/services.schema.ts` | NEW | Zod schemas for all 11 endpoints |
| 3 | `backend/src/modules/services/services.service.ts` | NEW | Business logic |
| 4 | `backend/src/modules/services/services.controller.ts` | NEW | HTTP handlers |
| 5 | `backend/src/modules/services/services.routes.ts` | NEW | Express router |
| 6 | `backend/src/modules/services/services.service.test.ts` | NEW | **44 unit tests — DO NOT SKIP** |

> **Missing file 6 means 44 fewer tests.** Every file must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -rf ~/Desktop/Automation/backend/src/modules/services && rm -f ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 2 — Create the services folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/services
```

---

## STEP 3 — Download all 6 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" -o ~/Desktop/Automation/backend/src/app.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/services/services.schema.ts" -o ~/Desktop/Automation/backend/src/modules/services/services.schema.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/services/services.service.ts" -o ~/Desktop/Automation/backend/src/modules/services/services.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/services/services.controller.ts" -o ~/Desktop/Automation/backend/src/modules/services/services.controller.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/services/services.routes.ts" -o ~/Desktop/Automation/backend/src/modules/services/services.routes.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/services/services.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/services/services.service.test.ts
```

---

## STEP 4 — Verify all 6 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/app.ts ~/Desktop/Automation/backend/src/modules/services/services.schema.ts ~/Desktop/Automation/backend/src/modules/services/services.service.ts ~/Desktop/Automation/backend/src/modules/services/services.controller.ts ~/Desktop/Automation/backend/src/modules/services/services.routes.ts ~/Desktop/Automation/backend/src/modules/services/services.service.test.ts
```

All 6 files must show a byte count > 0. If any shows 0 bytes or the file is missing, re-run STEP 3.

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
Test Suites: 11 passed, 11 total
Tests:       346 passed, 346 total
```

---

## Endpoints added in this step

### ServiceCategory endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/services/categories` | PUBLIC | List all service categories (filter by isActive) |
| POST | `/api/services/categories` | ADMIN | Create a service category |
| PATCH | `/api/services/categories/:id` | ADMIN | Update a service category |
| DELETE | `/api/services/categories/:id` | ADMIN | Delete a category (409 if it has services) |

### Service endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/services` | PUBLIC | Paginated list (filter by categoryId, artistId, isActive, search) |
| GET | `/api/services/:id` | PUBLIC | Get a single service with full artist roster |
| POST | `/api/services` | ADMIN | Create a service |
| PATCH | `/api/services/:id` | ADMIN | Update a service |
| DELETE | `/api/services/:id` | ADMIN | Deactivate a service (soft-delete; 409 if active bookings) |

### Artist-service link endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/services/:id/link` | ARTIST / ADMIN | Link an artist to a service (idempotent) |
| DELETE | `/api/services/:id/link` | ARTIST / ADMIN | Unlink an artist from a service |

> **ARTIST** role: always links/unlinks their own profile. The `artistId` body field is ignored.
> **ADMIN** role: must supply `artistId` in the request body.

---

## Business rules summary

| Rule | Detail |
|------|--------|
| Feature flag | All routes require `SERVICE_MENU_ENABLED = true` |
| Soft delete | `DELETE /api/services/:id` sets `isActive = false`; the row is never removed to preserve booking history |
| Category delete | Hard-deletes the category only when no services reference it (409 otherwise) |
| Active booking guard | Cannot deactivate a service that has PENDING / CONFIRMED / RESCHEDULED bookings (409) |
| Link idempotency | Linking an already-linked artist is a no-op — no error, no duplicate row |
| Inactive service | Cannot link an artist to an inactive service (400) |
