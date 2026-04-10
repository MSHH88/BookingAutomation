# Birthday Test Fix (1 file)

**Bug fixed:** `alerts.service.test.ts` — The birthday test used `new Date(1990, month, day)` (local time constructor) but passed UTC month/day values. When the machine's timezone offset causes a day boundary crossing, the UTC date of the DOB doesn't match `today.getUTCDate()`, so the birthday check fails. Fixed to use `Date.UTC()` for timezone-safe DOB creation.

**Files changed:** 1 (modified)
**Expected result after fix:** 64 suites, all tests pass, 0 failures.

---

## Step 1 — Open Terminal and go to your backend folder

```bash
cd ~/Desktop/Automation/backend
```

---

## Step 2 — Delete the old test file

```bash
cd ~/Desktop/Automation/backend && \
rm -f src/modules/alerts/alerts.service.test.ts
```

---

## Step 3 — Download the fixed test file

```bash
cd ~/Desktop/Automation/backend

curl -sfL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/alerts/alerts.service.test.ts" \
  -o src/modules/alerts/alerts.service.test.ts \
  && echo "OK  1/1  src/modules/alerts/alerts.service.test.ts" \
  || echo "FAILED  1/1  src/modules/alerts/alerts.service.test.ts"
```

You should see **`OK`**. If it says **`FAILED`**, re-run the curl line.

---

## Step 4 — Run tests to verify the fix

```bash
cd ~/Desktop/Automation/backend
npx jest --forceExit
```

**Expected result:** **64 suites, all tests pass, 0 failures.**

---

## What was changed

| # | Path | What changed |
|---|------|--------------|
| 1 | `src/modules/alerts/alerts.service.test.ts` | Line 152: `new Date(1990, today.getUTCMonth(), today.getUTCDate())` → `new Date(Date.UTC(1990, today.getUTCMonth(), today.getUTCDate()))` — fixes timezone mismatch in BIRTHDAY_TODAY test |
