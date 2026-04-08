# Step 1.22 — Addendum: Missing Test Files

**Situation:** You ran `npm test` and got **28 suites / 694 tests**.  
The complete suite is **30 suites / 739 tests**.  
Two test files were not included in the original download:

| # | Missing file | Tests |
|---|-------------|-------|
| 1 | `backend/src/modules/auth/auth.test.ts` | 25 |
| 2 | `backend/src/modules/waitlist/waitlist.test.ts` | 25 |

---

## STEP 1 — Delete any stale copies of the two missing files

```bash
rm -f ~/Desktop/Automation/backend/src/modules/auth/auth.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.test.ts
```

---

## STEP 2 — Create required directories (if not already present)

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/auth && \
mkdir -p ~/Desktop/Automation/backend/src/modules/waitlist
```

---

## STEP 3 — Download both missing files

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/auth/auth.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/auth/auth.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/waitlist/waitlist.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.test.ts
```

---

## STEP 4 — Verify both files downloaded (bytes > 0)

```bash
wc -c \
  ~/Desktop/Automation/backend/src/modules/auth/auth.test.ts \
  ~/Desktop/Automation/backend/src/modules/waitlist/waitlist.test.ts
```

Both files must show a byte count > 0. If either shows 0 or is missing,
re-run STEP 3 for the affected file.

---

## STEP 5 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 30 passed, 30 total
Tests:       739 passed, 739 total
```

> **All 739 tests must pass with 0 failures.**

