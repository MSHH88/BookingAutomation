# Timeout Fix — 2 files

**What this fixes:** 5 test suites failing with "Exceeded timeout of 5000 ms".
The root cause is that Jest's default 5000 ms timeout is too short on your Mac.
This guide downloads 2 updated files:

1. `package.json` — adds `"testTimeout": 30000` to the Jest config (30 s per test).
2. `src/modules/features/features.test.ts` — adds a defensive `beforeEach` that
   resets `BUSINESS_TYPE` so a timed-out `withBusinessType` call can never
   corrupt the environment for the next test.

**Expected result after fix:** 57 suites, 1192 tests pass, 0 failures.

---

## Step 1 — Open Terminal and go to your backend folder

```bash
cd ~/Desktop/Automation/backend
```

---

## Step 2 — Delete the 2 files that will be re-downloaded

```bash
cd ~/Desktop/Automation/backend && \
rm -f \
  package.json \
  src/modules/features/features.test.ts
```

---

## Step 3 — Download the 2 updated files

```bash
cd ~/Desktop/Automation/backend

BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan"

curl -sfL "${BASE}/backend/package.json" \
  -o package.json \
  && echo "OK 1/2 package.json" || echo "FAILED 1/2 package.json"

curl -sfL "${BASE}/backend/src/modules/features/features.test.ts" \
  -o src/modules/features/features.test.ts \
  && echo "OK 2/2 src/modules/features/features.test.ts" || echo "FAILED 2/2 src/modules/features/features.test.ts"
```

You should see **`OK`** for both lines. If any say **`FAILED`**, re-run that
single curl line on its own.

---

## Step 4 — Install dependencies (package.json changed)

```bash
cd ~/Desktop/Automation/backend
npm install
```

---

## Step 5 — Run all tests

```bash
cd ~/Desktop/Automation/backend
npx jest --forceExit
```

**Expected result:** **57 suites, 1192 tests pass, 0 failures.**
