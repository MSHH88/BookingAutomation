# Step-By-Step Guide — Test Fix Sync

> **Branch:** `copilot/create-detailed-automation-plan`
> **Owner/Repo:** `MSHH88/BookingAutomation`
> **Goal:** Replace only the 6 test files that were fixed to reach **1821 tests / 0 failures**

---

## What was fixed and why

| # | Root Cause | Files Fixed |
|---|---|---|
| 1 | `calendar.service.test.ts` had an unused `import * as businessType` — TS6133 compile error caused the whole suite (40 tests) to not run | `calendar.service.test.ts` |
| 2 | `apple-calendar.service.test.ts` + `outlook-calendar.service.test.ts` — `mockFlags({ FLAG: false })` only patched `getDefaultFlags`, but the service now calls `isFeatureEnabled()` from `requireFeature`. The `mockIsFeatureEnabled` mock was never updated, so "skips when flag is off" tests always called the real path | `apple-calendar.service.test.ts`, `outlook-calendar.service.test.ts` |
| 3 | `webhooks.service.test.ts` — service gained tenant-ownership checks; mock fixtures returned `{ id: 'wh_1' }` without `tenantId`, causing 403 on every call that passed `tenantId: null` | `webhooks.service.test.ts` |
| 4 | `features.test.ts` — `isRedisHealthy: () => false` made the `/health` route return 503 "degraded" instead of 200; the test asserted 200 | `features.test.ts` |
| 5 | `sessions.test.ts` — no Redis mock at all (real Redis connection attempt → test hangs/timeout); no `featureFlag` in prisma mock; missing `count` on `session`/`sessionBooking` mocks; no `beforeEach(clearAllMocks)` causing stale call records | `sessions.test.ts` |

---

## Files to delete then re-download (6 files only)

```bash
# ── Step 1: Delete the 6 old test files ──────────────────────────────────────
rm backend/src/modules/calendar/calendar.service.test.ts
rm backend/src/modules/calendar/apple-calendar.service.test.ts
rm backend/src/modules/calendar/outlook-calendar.service.test.ts
rm backend/src/modules/webhooks/webhooks.service.test.ts
rm backend/src/modules/features/features.test.ts
rm backend/src/modules/sessions/sessions.test.ts
```

```bash
# ── Step 2: Download the 6 fixed test files ───────────────────────────────────

BRANCH="copilot/create-detailed-automation-plan"
REPO="MSHH88/BookingAutomation"
RAW="https://raw.githubusercontent.com/${REPO}/${BRANCH}"

curl -fsSL "${RAW}/backend/src/modules/calendar/calendar.service.test.ts" \
  -o backend/src/modules/calendar/calendar.service.test.ts

curl -fsSL "${RAW}/backend/src/modules/calendar/apple-calendar.service.test.ts" \
  -o backend/src/modules/calendar/apple-calendar.service.test.ts

curl -fsSL "${RAW}/backend/src/modules/calendar/outlook-calendar.service.test.ts" \
  -o backend/src/modules/calendar/outlook-calendar.service.test.ts

curl -fsSL "${RAW}/backend/src/modules/webhooks/webhooks.service.test.ts" \
  -o backend/src/modules/webhooks/webhooks.service.test.ts

curl -fsSL "${RAW}/backend/src/modules/features/features.test.ts" \
  -o backend/src/modules/features/features.test.ts

curl -fsSL "${RAW}/backend/src/modules/sessions/sessions.test.ts" \
  -o backend/src/modules/sessions/sessions.test.ts
```

---

## Step 3: Verify

```bash
cd backend
npm test -- --no-coverage --forceExit
```

**Expected result:**

```
Test Suites: 102 passed, 102 total
Tests:       1821 passed, 1821 total
Snapshots:   0 total
```
