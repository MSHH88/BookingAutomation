# Phase 7 — Calendar & Integration Expansion  
# Phase 8 — Advanced Intelligence

**Phase 7 sub-phases:**  7.1 Outlook Calendar Sync · 7.2 Apple iCloud Calendar Sync  
**Phase 8 sub-phases:**  8.1 Dynamic / Surge Pricing · 8.2 AI-Powered Booking Suggestions

**Files changed:**  
- 5 modified  (`backend/package.json`, `backend/package-lock.json`, `backend/prisma/schema.prisma`, `backend/src/app.ts`, `backend/src/config/businessType.ts`, `backend/src/config/index.ts`, `backend/src/jobs/index.ts`, `backend/src/modules/bookings/bookings.service.ts`, `backend/src/modules/calendar/calendar.routes.ts`, `backend/src/modules/public/public.service.ts`)  
- 22 new files created (see full list in Step 4)

**New feature flags:** `OUTLOOK_CALENDAR_ENABLED`, `APPLE_CALENDAR_ENABLED`, `DYNAMIC_PRICING_ENABLED`, `AI_SUGGESTIONS_ENABLED`  
**New npm packages:** `@microsoft/microsoft-graph-client`, `tsdav`, `openai`  
**New DB models:** `PricingRule`, `AISuggestion`; new fields on `Artist`: `microsoftAccessToken`, `microsoftRefreshToken`, `appleCalDAVUrl`, `appleCalDAVToken`  
**Expected result:** 98 test suites, 1712/1712 tests, 0 TS errors.

---

## Step 1 — Open Terminal and navigate to your project

```bash
cd ~/Desktop/Automation/backend
```

---

## Step 2 — Create new directories

```bash
mkdir -p src/modules/ai
mkdir -p src/modules/pricing
mkdir -p src/modules/calendar
mkdir -p src/lib
mkdir -p src/jobs
```

*(Most of these directories already exist from previous phases — `mkdir -p` is safe to run even if they do.)*

---

## Step 3 — Remove files that will be replaced (modified files)

```bash
# Modified existing files — remove before downloading fresh copies
rm -f package.json
rm -f package-lock.json
rm -f prisma/schema.prisma
rm -f src/app.ts
rm -f src/config/businessType.ts
rm -f src/config/index.ts
rm -f src/jobs/index.ts
rm -f src/modules/bookings/bookings.service.ts
rm -f src/modules/calendar/calendar.routes.ts
rm -f src/modules/public/public.service.ts
```

---

## Step 4 — Download all Phase 7 + Phase 8 files

Run the commands below from inside `~/Desktop/Automation/backend`.  
Each command prints `OK` or `FAILED` — all must show `OK` before continuing.

### 4a — Modified existing files (10 files)

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

curl -sfL -o package.json                                      "$BASE/package.json"                                               && echo "OK  package.json"                                               || echo "FAILED  package.json"
curl -sfL -o package-lock.json                                 "$BASE/package-lock.json"                                          && echo "OK  package-lock.json"                                          || echo "FAILED  package-lock.json"
curl -sfL -o prisma/schema.prisma                              "$BASE/prisma/schema.prisma"                                       && echo "OK  prisma/schema.prisma"                                       || echo "FAILED  prisma/schema.prisma"
curl -sfL -o src/app.ts                                        "$BASE/src/app.ts"                                                 && echo "OK  src/app.ts"                                                 || echo "FAILED  src/app.ts"
curl -sfL -o src/config/businessType.ts                        "$BASE/src/config/businessType.ts"                                 && echo "OK  src/config/businessType.ts"                                 || echo "FAILED  src/config/businessType.ts"
curl -sfL -o src/config/index.ts                               "$BASE/src/config/index.ts"                                        && echo "OK  src/config/index.ts"                                        || echo "FAILED  src/config/index.ts"
curl -sfL -o src/jobs/index.ts                                 "$BASE/src/jobs/index.ts"                                          && echo "OK  src/jobs/index.ts"                                          || echo "FAILED  src/jobs/index.ts"
curl -sfL -o src/modules/bookings/bookings.service.ts          "$BASE/src/modules/bookings/bookings.service.ts"                   && echo "OK  src/modules/bookings/bookings.service.ts"                   || echo "FAILED  src/modules/bookings/bookings.service.ts"
curl -sfL -o src/modules/calendar/calendar.routes.ts           "$BASE/src/modules/calendar/calendar.routes.ts"                    && echo "OK  src/modules/calendar/calendar.routes.ts"                    || echo "FAILED  src/modules/calendar/calendar.routes.ts"
curl -sfL -o src/modules/public/public.service.ts              "$BASE/src/modules/public/public.service.ts"                       && echo "OK  src/modules/public/public.service.ts"                       || echo "FAILED  src/modules/public/public.service.ts"
```

### 4b — New files: Phase 7.1 — Outlook Calendar (4 files)

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

curl -sfL -o src/lib/outlook-calendar.ts                                         "$BASE/src/lib/outlook-calendar.ts"                                                && echo "OK  src/lib/outlook-calendar.ts"                                                || echo "FAILED  src/lib/outlook-calendar.ts"
curl -sfL -o src/modules/calendar/outlook-calendar.service.ts                    "$BASE/src/modules/calendar/outlook-calendar.service.ts"                           && echo "OK  src/modules/calendar/outlook-calendar.service.ts"                           || echo "FAILED  src/modules/calendar/outlook-calendar.service.ts"
curl -sfL -o src/modules/calendar/outlook-calendar.controller.ts                 "$BASE/src/modules/calendar/outlook-calendar.controller.ts"                        && echo "OK  src/modules/calendar/outlook-calendar.controller.ts"                        || echo "FAILED  src/modules/calendar/outlook-calendar.controller.ts"
curl -sfL -o src/modules/calendar/outlook-calendar.service.test.ts               "$BASE/src/modules/calendar/outlook-calendar.service.test.ts"                      && echo "OK  src/modules/calendar/outlook-calendar.service.test.ts"                      || echo "FAILED  src/modules/calendar/outlook-calendar.service.test.ts"
```

### 4c — New files: Phase 7.2 — Apple iCloud Calendar (4 files)

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

curl -sfL -o src/lib/apple-calendar.ts                                           "$BASE/src/lib/apple-calendar.ts"                                                  && echo "OK  src/lib/apple-calendar.ts"                                                  || echo "FAILED  src/lib/apple-calendar.ts"
curl -sfL -o src/modules/calendar/apple-calendar.service.ts                      "$BASE/src/modules/calendar/apple-calendar.service.ts"                             && echo "OK  src/modules/calendar/apple-calendar.service.ts"                             || echo "FAILED  src/modules/calendar/apple-calendar.service.ts"
curl -sfL -o src/modules/calendar/apple-calendar.controller.ts                   "$BASE/src/modules/calendar/apple-calendar.controller.ts"                          && echo "OK  src/modules/calendar/apple-calendar.controller.ts"                          || echo "FAILED  src/modules/calendar/apple-calendar.controller.ts"
curl -sfL -o src/modules/calendar/apple-calendar.service.test.ts                 "$BASE/src/modules/calendar/apple-calendar.service.test.ts"                        && echo "OK  src/modules/calendar/apple-calendar.service.test.ts"                        || echo "FAILED  src/modules/calendar/apple-calendar.service.test.ts"
```

### 4d — New files: Phase 8.1 — Dynamic Pricing (7 files)

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

curl -sfL -o src/lib/pricing-engine.ts                                           "$BASE/src/lib/pricing-engine.ts"                                                  && echo "OK  src/lib/pricing-engine.ts"                                                  || echo "FAILED  src/lib/pricing-engine.ts"
curl -sfL -o src/lib/pricing-engine.test.ts                                      "$BASE/src/lib/pricing-engine.test.ts"                                             && echo "OK  src/lib/pricing-engine.test.ts"                                             || echo "FAILED  src/lib/pricing-engine.test.ts"
curl -sfL -o src/modules/pricing/pricing.schema.ts                               "$BASE/src/modules/pricing/pricing.schema.ts"                                      && echo "OK  src/modules/pricing/pricing.schema.ts"                                      || echo "FAILED  src/modules/pricing/pricing.schema.ts"
curl -sfL -o src/modules/pricing/pricing.service.ts                              "$BASE/src/modules/pricing/pricing.service.ts"                                     && echo "OK  src/modules/pricing/pricing.service.ts"                                     || echo "FAILED  src/modules/pricing/pricing.service.ts"
curl -sfL -o src/modules/pricing/pricing.controller.ts                           "$BASE/src/modules/pricing/pricing.controller.ts"                                  && echo "OK  src/modules/pricing/pricing.controller.ts"                                  || echo "FAILED  src/modules/pricing/pricing.controller.ts"
curl -sfL -o src/modules/pricing/pricing.routes.ts                               "$BASE/src/modules/pricing/pricing.routes.ts"                                      && echo "OK  src/modules/pricing/pricing.routes.ts"                                      || echo "FAILED  src/modules/pricing/pricing.routes.ts"
curl -sfL -o src/modules/pricing/pricing.test.ts                                 "$BASE/src/modules/pricing/pricing.test.ts"                                        && echo "OK  src/modules/pricing/pricing.test.ts"                                        || echo "FAILED  src/modules/pricing/pricing.test.ts"
```

### 4e — New files: Phase 8.2 — AI Suggestions (7 files)

```bash
BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

curl -sfL -o src/lib/openai.ts                                                   "$BASE/src/lib/openai.ts"                                                          && echo "OK  src/lib/openai.ts"                                                          || echo "FAILED  src/lib/openai.ts"
curl -sfL -o src/jobs/ai-suggestion.job.ts                                       "$BASE/src/jobs/ai-suggestion.job.ts"                                              && echo "OK  src/jobs/ai-suggestion.job.ts"                                              || echo "FAILED  src/jobs/ai-suggestion.job.ts"
curl -sfL -o src/modules/ai/ai.schema.ts                                         "$BASE/src/modules/ai/ai.schema.ts"                                                && echo "OK  src/modules/ai/ai.schema.ts"                                                || echo "FAILED  src/modules/ai/ai.schema.ts"
curl -sfL -o src/modules/ai/ai.service.ts                                        "$BASE/src/modules/ai/ai.service.ts"                                               && echo "OK  src/modules/ai/ai.service.ts"                                               || echo "FAILED  src/modules/ai/ai.service.ts"
curl -sfL -o src/modules/ai/ai.controller.ts                                     "$BASE/src/modules/ai/ai.controller.ts"                                            && echo "OK  src/modules/ai/ai.controller.ts"                                            || echo "FAILED  src/modules/ai/ai.controller.ts"
curl -sfL -o src/modules/ai/ai.routes.ts                                         "$BASE/src/modules/ai/ai.routes.ts"                                                && echo "OK  src/modules/ai/ai.routes.ts"                                                || echo "FAILED  src/modules/ai/ai.routes.ts"
curl -sfL -o src/modules/ai/ai.service.test.ts                                   "$BASE/src/modules/ai/ai.service.test.ts"                                          && echo "OK  src/modules/ai/ai.service.test.ts"                                          || echo "FAILED  src/modules/ai/ai.service.test.ts"
```

---

## Step 5 — Install new npm packages

```bash
cd ~/Desktop/Automation/backend && npm install
```

This installs three new runtime packages and updates the lockfile:
- `@microsoft/microsoft-graph-client` — Microsoft Graph API client for Outlook Calendar
- `tsdav` — CalDAV client for Apple iCloud Calendar
- `openai` — OpenAI API client for AI suggestions

---

## Step 6 — Run Prisma migration

```bash
cd ~/Desktop/Automation/backend && npx prisma generate && npx prisma migrate dev --name phase7-8
```

This migration adds:
- **`PricingRule`** model (dynamic/surge pricing rules)
- **`AISuggestion`** model (AI-generated rebooking suggestions)
- Fields on **`Artist`**: `microsoftAccessToken`, `microsoftRefreshToken`, `appleCalDAVUrl`, `appleCalDAVToken`

---

## Step 7 — Run tests

```bash
cd ~/Desktop/Automation/backend && \
npx jest --clearCache --silent && \
npx jest --passWithNoTests
```

**Expected output:** 98 suites pass, 1712/1712 tests pass, 0 failures.

---

## Complete file list — Phase 7 + Phase 8

### Modified files (10)

| File | What changed |
|------|-------------|
| `backend/package.json` | Added `@microsoft/microsoft-graph-client`, `tsdav`, `openai` to dependencies |
| `backend/package-lock.json` | Updated lockfile for new packages |
| `backend/prisma/schema.prisma` | Added `PricingRule`, `AISuggestion` models; MS/Apple fields on `Artist` |
| `backend/src/app.ts` | Mounted `/api/pricing-rules` (Phase 8.1) and `/api/ai` (Phase 8.2) |
| `backend/src/config/businessType.ts` | Added `OUTLOOK_CALENDAR_ENABLED`, `APPLE_CALENDAR_ENABLED`, `DYNAMIC_PRICING_ENABLED`, `AI_SUGGESTIONS_ENABLED` flags |
| `backend/src/config/index.ts` | Added `MICROSOFT_CLIENT_ID/SECRET/REDIRECT_URI/TENANT_ID`, `OPENAI_API_KEY` env vars |
| `backend/src/jobs/index.ts` | Exported `startAISuggestionWorker` alongside existing workers |
| `backend/src/modules/bookings/bookings.service.ts` | Added Outlook/Apple sync calls + `enqueueAISuggestion` on booking completion |
| `backend/src/modules/calendar/calendar.routes.ts` | Added Outlook + Apple CalDAV endpoint groups |
| `backend/src/modules/public/public.service.ts` | Integrated pricing engine for slot price display |

### New files — Phase 7.1 — Outlook Calendar (4)

| File | Description |
|------|-------------|
| `backend/src/lib/outlook-calendar.ts` | Microsoft Graph OAuth2 flow + event CRUD |
| `backend/src/modules/calendar/outlook-calendar.service.ts` | Outlook connect/disconnect/sync service |
| `backend/src/modules/calendar/outlook-calendar.controller.ts` | HTTP handlers for Outlook endpoints |
| `backend/src/modules/calendar/outlook-calendar.service.test.ts` | Unit tests for Outlook service |

### New files — Phase 7.2 — Apple iCloud Calendar (4)

| File | Description |
|------|-------------|
| `backend/src/lib/apple-calendar.ts` | CalDAV (tsdav) client for iCloud events |
| `backend/src/modules/calendar/apple-calendar.service.ts` | Apple connect/disconnect/sync service |
| `backend/src/modules/calendar/apple-calendar.controller.ts` | HTTP handlers for Apple endpoints |
| `backend/src/modules/calendar/apple-calendar.service.test.ts` | Unit tests for Apple service |

### New files — Phase 8.1 — Dynamic Pricing (7)

| File | Description |
|------|-------------|
| `backend/src/lib/pricing-engine.ts` | Pure `calculatePrice()` function with rule matching |
| `backend/src/lib/pricing-engine.test.ts` | Comprehensive unit tests for all rule combinations |
| `backend/src/modules/pricing/pricing.schema.ts` | Zod schemas for pricing rule CRUD |
| `backend/src/modules/pricing/pricing.service.ts` | CRUD + price calculation service |
| `backend/src/modules/pricing/pricing.controller.ts` | HTTP handlers for pricing rule endpoints |
| `backend/src/modules/pricing/pricing.routes.ts` | Router for `/api/pricing-rules` |
| `backend/src/modules/pricing/pricing.test.ts` | Integration tests for pricing endpoints |

### New files — Phase 8.2 — AI Suggestions (7)

| File | Description |
|------|-------------|
| `backend/src/lib/openai.ts` | OpenAI client singleton + `generateSuggestion()` helper |
| `backend/src/jobs/ai-suggestion.job.ts` | BullMQ worker: generate AI message, persist AISuggestion |
| `backend/src/modules/ai/ai.schema.ts` | Zod schemas for AI suggestion CRUD |
| `backend/src/modules/ai/ai.service.ts` | List/get/send/dismiss suggestion service |
| `backend/src/modules/ai/ai.controller.ts` | HTTP handlers for AI suggestion endpoints |
| `backend/src/modules/ai/ai.routes.ts` | Router for `/api/ai` |
| `backend/src/modules/ai/ai.service.test.ts` | Unit tests for AI service |

---

## New API endpoints

### Phase 7.1 — Outlook Calendar  (`OUTLOOK_CALENDAR_ENABLED`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/calendar/outlook/auth-url` | ADMIN or ARTIST | Get Microsoft OAuth consent URL |
| GET | `/api/calendar/outlook/callback` | Public | Microsoft OAuth2 redirect handler |
| GET | `/api/calendar/outlook/status` | ADMIN or ARTIST | Check Outlook connection status |
| DELETE | `/api/calendar/outlook/disconnect` | ADMIN or ARTIST | Revoke Outlook tokens |

### Phase 7.2 — Apple iCloud Calendar  (`APPLE_CALENDAR_ENABLED`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/calendar/apple/connect` | ADMIN or ARTIST | Store iCloud credentials + discover CalDAV URL |
| GET | `/api/calendar/apple/status` | ADMIN or ARTIST | Check Apple connection status |
| DELETE | `/api/calendar/apple/disconnect` | ADMIN or ARTIST | Remove Apple CalDAV credentials |

### Phase 8.1 — Dynamic Pricing  (`DYNAMIC_PRICING_ENABLED`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/pricing-rules` | ADMIN | List all pricing rules |
| POST | `/api/pricing-rules` | ADMIN | Create a pricing rule |
| PATCH | `/api/pricing-rules/:id` | ADMIN | Update a pricing rule |
| DELETE | `/api/pricing-rules/:id` | ADMIN | Delete a pricing rule |
| GET | `/api/pricing-rules/calculate` | ADMIN | Preview price for a given slot |

### Phase 8.2 — AI Suggestions  (`AI_SUGGESTIONS_ENABLED`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/ai/suggestions` | ADMIN | List AI suggestions (paginated) |
| GET | `/api/ai/suggestions/:id` | ADMIN | Get a single suggestion |
| PATCH | `/api/ai/suggestions/:id` | ADMIN | Edit message / status |
| POST | `/api/ai/suggestions/:id/send` | ADMIN | Approve and send to customer |
| POST | `/api/ai/suggestions/:id/dismiss` | ADMIN | Dismiss a suggestion |

---

## Delete / clean-up (to remove Phase 7 + Phase 8)

Run these from `~/Desktop/Automation/backend`:

```bash
# New files — Phase 7.1 Outlook
rm -f src/lib/outlook-calendar.ts
rm -f src/modules/calendar/outlook-calendar.service.ts
rm -f src/modules/calendar/outlook-calendar.controller.ts
rm -f src/modules/calendar/outlook-calendar.service.test.ts

# New files — Phase 7.2 Apple
rm -f src/lib/apple-calendar.ts
rm -f src/modules/calendar/apple-calendar.service.ts
rm -f src/modules/calendar/apple-calendar.controller.ts
rm -f src/modules/calendar/apple-calendar.service.test.ts

# New files — Phase 8.1 Pricing
rm -f src/lib/pricing-engine.ts
rm -f src/lib/pricing-engine.test.ts
rm -f src/modules/pricing/pricing.schema.ts
rm -f src/modules/pricing/pricing.service.ts
rm -f src/modules/pricing/pricing.controller.ts
rm -f src/modules/pricing/pricing.routes.ts
rm -f src/modules/pricing/pricing.test.ts
rmdir --ignore-fail-on-non-empty src/modules/pricing

# New files — Phase 8.2 AI
rm -f src/lib/openai.ts
rm -f src/jobs/ai-suggestion.job.ts
rm -f src/modules/ai/ai.schema.ts
rm -f src/modules/ai/ai.service.ts
rm -f src/modules/ai/ai.controller.ts
rm -f src/modules/ai/ai.routes.ts
rm -f src/modules/ai/ai.service.test.ts
rmdir --ignore-fail-on-non-empty src/modules/ai
```

To revert the 10 modified files, download the Phase 6 versions from the `backend` folder of the previous commit, or restore via git:

```bash
git checkout HEAD~1 -- \
  backend/package.json \
  backend/package-lock.json \
  backend/prisma/schema.prisma \
  backend/src/app.ts \
  backend/src/config/businessType.ts \
  backend/src/config/index.ts \
  backend/src/jobs/index.ts \
  backend/src/modules/bookings/bookings.service.ts \
  backend/src/modules/calendar/calendar.routes.ts \
  backend/src/modules/public/public.service.ts
```
