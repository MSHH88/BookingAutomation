# Phase 9 — Scale & Growth (Multi-Location Support + Group Bookings)

**Phase 9 sub-phases:**  9.1 Multi-Location Support · 9.2 Group / Class Bookings

**Files changed:**
- 3 modified (`backend/prisma/schema.prisma`, `backend/src/app.ts`, `backend/src/config/businessType.ts`)
- 10 new files created (see full list in Step 4)

**New feature flags:** `MULTI_LOCATION_ENABLED`, `GROUP_BOOKING_ENABLED`  
**New DB models:** `Location`, `Session`, `SessionBooking`; new `locationId` field on `Artist`, `Service`, `Table`, `Booking`  
**Expected result:** 100 test suites, 1756/1756 tests, 0 TS errors.

---

## Step 1 — Open Terminal and navigate to your project

```bash
cd ~/Desktop/Automation/backend
```

---

## Step 2 — Create new directories

```bash
mkdir -p src/modules/locations
mkdir -p src/modules/sessions
```

*(These directories are new — `mkdir -p` is safe to run even if they already exist.)*

---

## Step 3 — Remove files that will be replaced (modified files)

```bash
# Modified existing files — remove before downloading fresh copies
rm -f prisma/schema.prisma
rm -f src/app.ts
rm -f src/config/businessType.ts
```

---

## Step 4 — Download all Phase 9 files

Run the commands below from inside `~/Desktop/Automation/backend`.  
Each command prints `OK` or `FAILED` — all must show `OK` before continuing.

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"
```

### 4a — Modified existing files (3 files)

```bash
curl -sfL -o prisma/schema.prisma                              "$BASE/prisma/schema.prisma"                                          && echo "OK  prisma/schema.prisma"                                          || echo "FAILED  prisma/schema.prisma"
curl -sfL -o src/app.ts                                        "$BASE/src/app.ts"                                                     && echo "OK  src/app.ts"                                                    || echo "FAILED  src/app.ts"
curl -sfL -o src/config/businessType.ts                        "$BASE/src/config/businessType.ts"                                     && echo "OK  src/config/businessType.ts"                                    || echo "FAILED  src/config/businessType.ts"
```

### 4b — New files: Phase 9.1 — Multi-Location Support (5 files)

```bash
curl -sfL -o src/modules/locations/locations.controller.ts     "$BASE/src/modules/locations/locations.controller.ts"                  && echo "OK  locations.controller.ts"                                       || echo "FAILED  locations.controller.ts"
curl -sfL -o src/modules/locations/locations.routes.ts         "$BASE/src/modules/locations/locations.routes.ts"                      && echo "OK  locations.routes.ts"                                           || echo "FAILED  locations.routes.ts"
curl -sfL -o src/modules/locations/locations.schema.ts         "$BASE/src/modules/locations/locations.schema.ts"                      && echo "OK  locations.schema.ts"                                           || echo "FAILED  locations.schema.ts"
curl -sfL -o src/modules/locations/locations.service.ts        "$BASE/src/modules/locations/locations.service.ts"                     && echo "OK  locations.service.ts"                                          || echo "FAILED  locations.service.ts"
curl -sfL -o src/modules/locations/locations.test.ts           "$BASE/src/modules/locations/locations.test.ts"                        && echo "OK  locations.test.ts"                                             || echo "FAILED  locations.test.ts"
```

### 4c — New files: Phase 9.2 — Group / Class Bookings (5 files)

```bash
curl -sfL -o src/modules/sessions/sessions.controller.ts       "$BASE/src/modules/sessions/sessions.controller.ts"                    && echo "OK  sessions.controller.ts"                                        || echo "FAILED  sessions.controller.ts"
curl -sfL -o src/modules/sessions/sessions.routes.ts           "$BASE/src/modules/sessions/sessions.routes.ts"                        && echo "OK  sessions.routes.ts"                                            || echo "FAILED  sessions.routes.ts"
curl -sfL -o src/modules/sessions/sessions.schema.ts           "$BASE/src/modules/sessions/sessions.schema.ts"                        && echo "OK  sessions.schema.ts"                                            || echo "FAILED  sessions.schema.ts"
curl -sfL -o src/modules/sessions/sessions.service.ts          "$BASE/src/modules/sessions/sessions.service.ts"                       && echo "OK  sessions.service.ts"                                           || echo "FAILED  sessions.service.ts"
curl -sfL -o src/modules/sessions/sessions.test.ts             "$BASE/src/modules/sessions/sessions.test.ts"                          && echo "OK  sessions.test.ts"                                              || echo "FAILED  sessions.test.ts"
```

---

## Step 5 — Install dependencies (no new packages in Phase 9)

Phase 9 introduces no new npm packages. Skip this step unless you are setting up from scratch.

---

## Step 6 — Generate Prisma client and run migration

```bash
npx prisma generate
npx prisma migrate dev --name phase9_multi_location_group_bookings
```

---

## Step 7 — Run the test suite

```bash
npm test
```

**Expected output:**

```
Test Suites: 100 passed, 100 total
Tests:       1756 passed, 1756 total
```

---

## Phase 9 — Complete file list

### Modified files (3)

| File | What changed |
|------|-------------|
| `backend/prisma/schema.prisma` | Added `Location`, `Session`, `SessionBooking` models; `locationId` field on `Artist`, `Service`, `Table`, `Booking`; `MULTI_LOCATION_ENABLED` and `GROUP_BOOKING_ENABLED` feature enums |
| `backend/src/app.ts` | Mounted `/api/locations` (Phase 9.1) and `/api/sessions` (Phase 9.2) |
| `backend/src/config/businessType.ts` | Added `MULTI_LOCATION_ENABLED`, `GROUP_BOOKING_ENABLED` flags to all business-type configs |

### New files — Phase 9.1 — Multi-Location Support (5)

| File | Description |
|------|-------------|
| `backend/src/modules/locations/locations.controller.ts` | HTTP handlers for location CRUD |
| `backend/src/modules/locations/locations.routes.ts` | Router for `/api/locations` — gated by `MULTI_LOCATION_ENABLED` |
| `backend/src/modules/locations/locations.schema.ts` | Zod schemas for location create/update/list |
| `backend/src/modules/locations/locations.service.ts` | Tenant-scoped CRUD service for `Location` |
| `backend/src/modules/locations/locations.test.ts` | Integration tests for all location endpoints |

### New files — Phase 9.2 — Group / Class Bookings (5)

| File | Description |
|------|-------------|
| `backend/src/modules/sessions/sessions.controller.ts` | HTTP handlers for session CRUD and spot booking |
| `backend/src/modules/sessions/sessions.routes.ts` | Router for `/api/sessions` — gated by `GROUP_BOOKING_ENABLED` |
| `backend/src/modules/sessions/sessions.schema.ts` | Zod schemas for session create/update/list/book/cancel |
| `backend/src/modules/sessions/sessions.service.ts` | Atomic capacity management, tenant + customer tenant validation; updateSession locationId cross-tenant guard + capacity→status sync (bug fix) |
| `backend/src/modules/sessions/sessions.test.ts` | Integration tests including customer cross-tenant guard, location cross-tenant guard, and capacity-driven status transitions (bug fix) |

---

## New API endpoints

### Phase 9.1 — Multi-Location  (`MULTI_LOCATION_ENABLED`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/locations` | ADMIN | List all locations for this tenant |
| POST | `/api/locations` | ADMIN | Create a new location |
| GET | `/api/locations/:id` | ADMIN | Get a single location |
| PATCH | `/api/locations/:id` | ADMIN | Update a location |
| DELETE | `/api/locations/:id` | ADMIN | Delete a location |

### Phase 9.2 — Group / Class Bookings  (`GROUP_BOOKING_ENABLED`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sessions` | ADMIN | List sessions (filterable by service/artist/location/status/date) |
| POST | `/api/sessions` | ADMIN | Create a new group session |
| GET | `/api/sessions/:id` | ADMIN | Get session with full attendee list |
| PATCH | `/api/sessions/:id` | ADMIN | Update session details or status |
| DELETE | `/api/sessions/:id` | ADMIN | Delete a session |
| POST | `/api/sessions/:id/book` | ADMIN | Book a customer spot (atomic capacity decrement) |
| GET | `/api/sessions/:id/bookings` | ADMIN | List all bookings for a session |
| DELETE | `/api/sessions/:id/bookings/:bookingId` | ADMIN | Cancel a session booking (reopens spot) |

---

## Delete / clean-up (to remove Phase 9 new files)

Run these from `~/Desktop/Automation/backend`:

```bash
# New files — Phase 9.1 Multi-Location
rm -f src/modules/locations/locations.controller.ts
rm -f src/modules/locations/locations.routes.ts
rm -f src/modules/locations/locations.schema.ts
rm -f src/modules/locations/locations.service.ts
rm -f src/modules/locations/locations.test.ts
rmdir --ignore-fail-on-non-empty src/modules/locations

# New files — Phase 9.2 Group Bookings
rm -f src/modules/sessions/sessions.controller.ts
rm -f src/modules/sessions/sessions.routes.ts
rm -f src/modules/sessions/sessions.schema.ts
rm -f src/modules/sessions/sessions.service.ts
rm -f src/modules/sessions/sessions.test.ts
rmdir --ignore-fail-on-non-empty src/modules/sessions
```

---

## Replace / outdated files (modified files)

The 3 files below were modified for Phase 9. If you need to replace an outdated local copy,
download the current version using the curl commands in Step 4a above.

> **Do not delete** `prisma/schema.prisma`, `src/app.ts`, or `src/config/businessType.ts`
> unless you intend to revert to the pre-Phase-9 state — they contain content from all earlier phases too.

| File | How to replace |
|------|----------------|
| `backend/prisma/schema.prisma` | `rm -f prisma/schema.prisma && curl … (Step 4a)` then re-run `npx prisma generate` |
| `backend/src/app.ts` | `rm -f src/app.ts && curl … (Step 4a)` |
| `backend/src/config/businessType.ts` | `rm -f src/config/businessType.ts && curl … (Step 4a)` |

