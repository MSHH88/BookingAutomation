# Step 1.14 — File Upload Service — Setup Guide

**What this step adds:**

A production-grade, security-hardened File Upload API backed by Cloudinary CDN.
This is the upload engine every professional booking platform (Fresha, Booksy,
Vagaro, Square) requires before customers can submit reference images, before
artists can build portfolio galleries, and before any media appears on the site.

Two independent security layers protect every upload:

1. **Multer fileFilter** — rejects requests at the HTTP layer if the declared
   MIME type is not `image/jpeg`, `image/png`, or `image/webp`.
2. **Magic-byte validation** — reads the first bytes of each in-memory buffer to
   verify the file's actual content matches its MIME type.  This catches
   attackers who rename an `.exe` to `.jpg`.

Only after both guards pass are files streamed to Cloudinary's upload API.

## New files in this step — ALL 7 MUST BE DOWNLOADED

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `backend/src/app.ts` | MODIFIED | Adds `/api/uploads` route mount |
| 2 | `backend/src/middleware/errorHandler.ts` | MODIFIED | Adds `MulterError` handling → 400 |
| 3 | `backend/src/lib/cloudinary.ts` | NEW | Singleton Cloudinary v2 instance |
| 4 | `backend/src/middleware/upload.ts` | NEW | Multer memory storage, MIME whitelist, size/count limits |
| 5 | `backend/src/modules/uploads/uploads.service.ts` | NEW | Magic-byte validation + Cloudinary upload |
| 6 | `backend/src/modules/uploads/uploads.controller.ts` | NEW | HTTP handler |
| 7 | `backend/src/modules/uploads/uploads.routes.ts` | NEW | Express router |
| 8 | `backend/src/modules/uploads/uploads.service.test.ts` | NEW | **27 unit tests — DO NOT SKIP** |
| 9 | `backend/src/modules/services/services.schema.ts` | MODIFIED | BUG-3 fix: `optStr` now rejects empty strings |
| 10 | `backend/src/modules/services/services.service.test.ts` | MODIFIED | BUG-4 fix: JSDoc comment corrected |

> **Missing file 8 means 27 fewer tests.** Every file must be downloaded.

---

## STEP 1 — Delete old files (clean slate)

```bash
rm -rf ~/Desktop/Automation/backend/src/modules/uploads && rm -f ~/Desktop/Automation/backend/src/lib/cloudinary.ts && rm -f ~/Desktop/Automation/backend/src/middleware/upload.ts && rm -f ~/Desktop/Automation/backend/src/middleware/errorHandler.ts && rm -f ~/Desktop/Automation/backend/src/app.ts && rm -f ~/Desktop/Automation/backend/src/modules/services/services.schema.ts && rm -f ~/Desktop/Automation/backend/src/modules/services/services.service.test.ts
```

---

## STEP 2 — Create the uploads folder

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/uploads
```

---

## STEP 3 — Download all 10 files (one copy-paste block)

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" -o ~/Desktop/Automation/backend/src/app.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/middleware/errorHandler.ts" -o ~/Desktop/Automation/backend/src/middleware/errorHandler.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/cloudinary.ts" -o ~/Desktop/Automation/backend/src/lib/cloudinary.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/middleware/upload.ts" -o ~/Desktop/Automation/backend/src/middleware/upload.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/uploads/uploads.service.ts" -o ~/Desktop/Automation/backend/src/modules/uploads/uploads.service.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/uploads/uploads.controller.ts" -o ~/Desktop/Automation/backend/src/modules/uploads/uploads.controller.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/uploads/uploads.routes.ts" -o ~/Desktop/Automation/backend/src/modules/uploads/uploads.routes.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/uploads/uploads.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/uploads/uploads.service.test.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/services/services.schema.ts" -o ~/Desktop/Automation/backend/src/modules/services/services.schema.ts && curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/services/services.service.test.ts" -o ~/Desktop/Automation/backend/src/modules/services/services.service.test.ts
```

---

## STEP 4 — Verify all 10 files were downloaded (bytes > 0)

```bash
wc -c ~/Desktop/Automation/backend/src/app.ts ~/Desktop/Automation/backend/src/middleware/errorHandler.ts ~/Desktop/Automation/backend/src/lib/cloudinary.ts ~/Desktop/Automation/backend/src/middleware/upload.ts ~/Desktop/Automation/backend/src/modules/uploads/uploads.service.ts ~/Desktop/Automation/backend/src/modules/uploads/uploads.controller.ts ~/Desktop/Automation/backend/src/modules/uploads/uploads.routes.ts ~/Desktop/Automation/backend/src/modules/uploads/uploads.service.test.ts ~/Desktop/Automation/backend/src/modules/services/services.schema.ts ~/Desktop/Automation/backend/src/modules/services/services.service.test.ts
```

All 10 files must show a byte count > 0. If any shows 0 bytes or is missing, re-run STEP 3.

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
Test Suites: 12 passed, 12 total
Tests:       373 passed, 373 total
```

---

## Endpoint added in this step

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/uploads/images` | Auth (any role) | Upload 1–10 images; returns array of Cloudinary CDN URLs |

---

## Request format

```
POST /api/uploads/images
Content-Type: multipart/form-data
Authorization: Bearer <token>

Field name: images (repeat up to 10 times)
```

## Response

```json
{
  "success": true,
  "data": {
    "count": 2,
    "files": [
      {
        "url": "https://res.cloudinary.com/your-cloud/image/upload/uploads/abc123.jpg",
        "publicId": "uploads/abc123",
        "width": 1920,
        "height": 1080,
        "format": "jpg",
        "bytes": 204800
      }
    ]
  }
}
```

---

## Constraints & security

| Constraint | Value |
|------------|-------|
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Max file size | 10 MB per image |
| Max files per request | 10 |
| Security layer 1 | Multer fileFilter — rejects wrong MIME type at HTTP layer |
| Security layer 2 | Magic-byte validation — confirms buffer content matches MIME type |
| Cloudinary folder | `uploads/` |
| Auth required | Yes — any authenticated user (CUSTOMER, ARTIST, ADMIN) |

---

## Bug fixes also included in this step

| Bug | Fix |
|-----|-----|
| BUG-3 (services.schema.ts) | `optStr` now adds `.min(1)` — empty strings `""` are rejected on description fields |
| BUG-4 (services.service.test.ts) | JSDoc coverage comment corrected to match the actual test behavior |


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
