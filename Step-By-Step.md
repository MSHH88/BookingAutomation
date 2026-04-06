
---

# Step 1.12 — Availability API — Setup Guide

**What this step adds:**

A full Availability Management API that powers the booking widget. This is the engine every professional scheduling platform (Fresha, Booksy, Square Appointments) runs at its core:

1. **Weekly schedule management** — per-artist recurring timetable (ArtistAvailability).
2. **Availability block management** — date-specific closures, holidays, personal blocks (AvailabilityBlock).
3. **Real-time slot computation** — deterministic slot engine that subtracts breaks, blocks, and existing bookings and returns the exact time slots a customer can book.

## New files in this step — ALL 6 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/app.ts` | MODIFIED | Adds `/api/availability` route mount |
| 2 | `backend/src/modules/availability/availability.schema.ts` | NEW | Zod schemas |
| 3 | `backend/src/modules/availability/availability.service.ts` | NEW | Business logic + slot engine |
| 4 | `backend/src/modules/availability/availability.controller.ts` | NEW | HTTP handlers |
| 5 | `backend/src/modules/availability/availability.routes.ts` | NEW | Express router |
| 6 | `backend/src/modules/availability/availability.service.test.ts` | NEW | **37 unit tests — DO NOT SKIP** |

> **Missing file 6 means 37 fewer tests.** Every file must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -rf ~/Desktop/Automation/backend/src/modules/availability && rm -f ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 2 — Create the availability folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/availability
```

---

## STEP 3 — Download all 6 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" -o ~/Desktop/Automation/backend/src/app.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/availability/availability.schema.ts" -o ~/Desktop/Automation/backend/src/modules/availability/availability.schema.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/availability/availability.service.ts" -o ~/Desktop/Automation/backend/src/modules/availability/availability.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/availability/availability.controller.ts" -o ~/Desktop/Automation/backend/src/modules/availability/availability.controller.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/availability/availability.routes.ts" -o ~/Desktop/Automation/backend/src/modules/availability/availability.routes.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/availability/availability.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/availability/availability.service.test.ts
```

---

## STEP 4 — Verify all 6 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/app.ts ~/Desktop/Automation/backend/src/modules/availability/availability.schema.ts ~/Desktop/Automation/backend/src/modules/availability/availability.service.ts ~/Desktop/Automation/backend/src/modules/availability/availability.controller.ts ~/Desktop/Automation/backend/src/modules/availability/availability.routes.ts ~/Desktop/Automation/backend/src/modules/availability/availability.service.test.ts
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
Test Suites: 10 passed, 10 total
Tests:       302 passed, 302 total
```

---

## Endpoints added in this step

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/availability` | ARTIST / ADMIN | List artist's weekly recurring schedule |
| PUT | `/api/availability` | ARTIST / ADMIN | Full-replace upsert of weekly schedule (up to 7 days) |
| GET | `/api/availability/blocks` | ARTIST / ADMIN | Paginated list of availability blocks |
| POST | `/api/availability/blocks` | ARTIST / ADMIN | Create a block (holiday, vacation, early close, etc.) |
| DELETE | `/api/availability/blocks/:id` | ARTIST / ADMIN | Delete a block (ARTIST: own only; ADMIN: any) |
| GET | `/api/availability/slots` | **PUBLIC** | Compute available booking slots for a given artist + date |

---

## Slot computation algorithm (`GET /api/availability/slots`)

The slot engine is deterministic and returns only genuinely bookable time windows:

```
Input: artistId, date (YYYY-MM-DD), serviceId? (optional)

1. Load artist → slotDuration, bufferMinutes
2. If serviceId → use service.durationMinutes instead
3. Parse date as UTC midnight; derive dayOfWeek (0=Sun … 6=Sat)
4. Load ArtistAvailability for (artistId, dayOfWeek, isActive=true)
   → empty schedule = return []
5. Generate candidate slots from startTime → endTime (step = slotDuration + bufferMinutes)
6. Filter out slots that overlap the artist's break window (breakStart–breakEnd)
7. Load AvailabilityBlocks overlapping this date → remove conflicting slots
8. Load CONFIRMED/RESCHEDULED Bookings overlapping this date → remove conflicting slots
9. Return remaining slots as ISO UTC { startAt, endAt } pairs
```

---

## Role scoping

| Actor | Weekly schedule | Blocks | Slots |
|-------|----------------|--------|-------|
| ARTIST | Own artist only (auto-resolved from JWT) | Own artist only | Public (no auth) |
| ADMIN | Any artist (supply `?artistId=` / `body.artistId`) | Any artist | Public (no auth) |

