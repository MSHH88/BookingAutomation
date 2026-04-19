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

## Step 1: Navigate to your backend folder

> ⚠️ **You MUST run this first.** Every command below uses paths relative to the `backend/` directory.
> If your repo is cloned elsewhere, replace `~/Desktop/Automation` with the actual path.

```bash
cd ~/Desktop/Automation/backend
```

Confirm you are in the right place:

```bash
pwd
# expected output ends with: .../BookingAutomation/backend
ls package.json
# expected output: package.json
```

---

## Step 2: Delete the 6 old test files

```bash
rm -f \
  src/modules/calendar/calendar.service.test.ts \
  src/modules/calendar/apple-calendar.service.test.ts \
  src/modules/calendar/outlook-calendar.service.test.ts \
  src/modules/webhooks/webhooks.service.test.ts \
  src/modules/features/features.test.ts \
  src/modules/sessions/sessions.test.ts \
  && echo "ALL OLD FILES DELETED"
```

---

## Step 3: Ensure target directories exist

```bash
mkdir -p \
  src/modules/calendar \
  src/modules/webhooks \
  src/modules/features \
  src/modules/sessions
```

---

## Step 4: Download the 6 fixed test files

> Each `curl` uses `--create-dirs` so the output directory is created automatically even if it is missing.

```bash
curl -fsSL --create-dirs \
  -o src/modules/calendar/calendar.service.test.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/calendar.service.test.ts" \
  && echo "OK 1/6 calendar.service.test.ts" || echo "FAILED: calendar.service.test.ts"

curl -fsSL --create-dirs \
  -o src/modules/calendar/apple-calendar.service.test.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/apple-calendar.service.test.ts" \
  && echo "OK 2/6 apple-calendar.service.test.ts" || echo "FAILED: apple-calendar.service.test.ts"

curl -fsSL --create-dirs \
  -o src/modules/calendar/outlook-calendar.service.test.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/calendar/outlook-calendar.service.test.ts" \
  && echo "OK 3/6 outlook-calendar.service.test.ts" || echo "FAILED: outlook-calendar.service.test.ts"

curl -fsSL --create-dirs \
  -o src/modules/webhooks/webhooks.service.test.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/webhooks/webhooks.service.test.ts" \
  && echo "OK 4/6 webhooks.service.test.ts" || echo "FAILED: webhooks.service.test.ts"

curl -fsSL --create-dirs \
  -o src/modules/features/features.test.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/features/features.test.ts" \
  && echo "OK 5/6 features.test.ts" || echo "FAILED: features.test.ts"

curl -fsSL --create-dirs \
  -o src/modules/sessions/sessions.test.ts \
  "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/sessions/sessions.test.ts" \
  && echo "OK 6/6 sessions.test.ts" || echo "FAILED: sessions.test.ts"
```

---

## Step 5: Verify

```bash
npm test -- --no-coverage --forceExit
```

**Expected result:**

```
Test Suites: 102 passed, 102 total
Tests:       1821 passed, 1821 total
Snapshots:   0 total
```
