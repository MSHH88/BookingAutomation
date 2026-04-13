# FIX — web-push missing module (`error TS2307`)

**Root cause:** Phase 6 added `web-push` (runtime) and `@types/web-push` (dev) to `package.json`
and `package-lock.json`, but the Phase 6 Step-By-Step guide did not include downloading these
two files or running `npm install`. As a result, running `npx jest` after following that guide
produced:

```
src/lib/push-notifications.ts:18:21 - error TS2307:
Cannot find module 'web-push' or its corresponding type declarations.
```

**Fix:** download the updated `package.json` and `package-lock.json`, then run `npm install`.  
**Files changed:** 2 modified (`package.json`, `package-lock.json`)  
**Expected result:** 0 TypeScript errors, 93/93 test suites pass (1606/1606 tests).

---

## Step 1 — Open Terminal and go to your backend folder

```bash
cd ~/Desktop/Automation/backend
```

---

## Step 2 — Replace outdated package files

The two files below were updated during Phase 6 to add the `web-push` dependency but were
missing from the Phase 6 guide. Remove the old copies before downloading fresh ones.

```bash
cd ~/Desktop/Automation/backend && \
rm -f package.json && \
rm -f package-lock.json
```

---

## Step 3 — Download updated package files (1/2 and 2/2)

```bash
curl -sfL -o package.json "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/package.json" && echo "OK 1/2 package.json" || echo "FAILED 1/2 package.json"
curl -sfL -o package-lock.json "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/package-lock.json" && echo "OK 2/2 package-lock.json" || echo "FAILED 2/2 package-lock.json"
```

---

## Step 4 — Install dependencies

```bash
cd ~/Desktop/Automation/backend && \
npm install
```

This installs `web-push@^3.6.7` (runtime) and `@types/web-push@^3.6.4` (TypeScript types)
along with all other project dependencies declared in the updated lockfile.

---

## Step 5 — Run tests

```bash
cd ~/Desktop/Automation/backend && \
npx jest --clearCache --silent && \
npx jest --passWithNoTests
```

**Expected output:** 93 suites pass, 1606/1606 tests pass, 0 failures.

---

## What changed in each file

| File | Change type | What was updated |
|------|-------------|-----------------|
| `backend/package.json` | Modified | Added `"web-push": "^3.6.7"` to `dependencies`; added `"@types/web-push": "^3.6.4"` to `devDependencies` |
| `backend/package-lock.json` | Modified | Added resolved entries for `web-push@3.6.7` and `@types/web-push@3.6.4` and their transitive dependencies |

---

## Delete / clean-up (if you want to revert this fix)

No new files were created by this fix. The two modified files cannot be safely deleted
(they are required for the project). If you need to revert:

```bash
# Revert to the previous package.json and package-lock.json via git
git checkout HEAD~1 -- backend/package.json backend/package-lock.json
cd ~/Desktop/Automation/backend && npm install
```
