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
| BUG-A (uploads.service.ts) | `error ?? !result` → `error \|\| !result` — uses logical OR (truthiness) not nullish coalescing |
| BUG-B (uploads.service.test.ts) | JSDoc coverage comment now lists all 27 test cases accurately |

