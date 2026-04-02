# BookingAutomation — Step-By-Step Guide

> Run every command from: `~/Desktop/Automation/backend` unless told otherwise.
> Copy and paste each block exactly. Wait for it to finish before running the next one.

---

## ✅ Step 1.1 — Done

## ✅ Step 1.2 — Done

---

## 🔄 Step 1.3 — Express App Setup

### Step 1 — Create required folders

```bash
cd ~/Desktop/Automation/backend
mkdir -p src/config src/errors src/lib src/middleware src/types src/utils
```

---

### Step 2 — Download all 13 files at once

Paste this entire block into Terminal and run it:

```bash
cd ~/Desktop/Automation/backend
curl -sfL -o src/app.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" && echo "OK 1/13 app.ts" || echo "FAILED: app.ts"
curl -sfL -o src/server.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/server.ts" && echo "OK 2/13 server.ts" || echo "FAILED: server.ts"
curl -sfL -o src/index.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/index.ts" && echo "OK 3/13 index.ts" || echo "FAILED: index.ts"
curl -sfL -o src/config/index.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/config/index.ts" && echo "OK 4/13 config/index.ts" || echo "FAILED: config/index.ts"
curl -sfL -o src/errors/AppError.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/errors/AppError.ts" && echo "OK 5/13 errors/AppError.ts" || echo "FAILED: errors/AppError.ts"
curl -sfL -o src/lib/prisma.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/prisma.ts" && echo "OK 6/13 lib/prisma.ts" || echo "FAILED: lib/prisma.ts"
curl -sfL -o src/lib/redis.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/redis.ts" && echo "OK 7/13 lib/redis.ts" || echo "FAILED: lib/redis.ts"
curl -sfL -o src/middleware/errorHandler.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/middleware/errorHandler.ts" && echo "OK 8/13 middleware/errorHandler.ts" || echo "FAILED: middleware/errorHandler.ts"
curl -sfL -o src/middleware/requestLogger.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/middleware/requestLogger.ts" && echo "OK 9/13 middleware/requestLogger.ts" || echo "FAILED: middleware/requestLogger.ts"
curl -sfL -o src/types/express.d.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/types/express.d.ts" && echo "OK 10/13 types/express.d.ts" || echo "FAILED: types/express.d.ts"
curl -sfL -o src/utils/apiResponse.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/utils/apiResponse.ts" && echo "OK 11/13 utils/apiResponse.ts" || echo "FAILED: utils/apiResponse.ts"
curl -sfL -o src/utils/logger.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/utils/logger.ts" && echo "OK 12/13 utils/logger.ts" || echo "FAILED: utils/logger.ts"
curl -sfL -o src/utils/paginate.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/utils/paginate.ts" && echo "OK 13/13 utils/paginate.ts" || echo "FAILED: utils/paginate.ts"
```

Expected output — all 13 lines must say OK:
```
OK 1/13 app.ts
OK 2/13 server.ts
OK 3/13 index.ts
OK 4/13 config/index.ts
OK 5/13 errors/AppError.ts
OK 6/13 lib/prisma.ts
OK 7/13 lib/redis.ts
OK 8/13 middleware/errorHandler.ts
OK 9/13 middleware/requestLogger.ts
OK 10/13 types/express.d.ts
OK 11/13 utils/apiResponse.ts
OK 12/13 utils/logger.ts
OK 13/13 utils/paginate.ts
```

> If any line says FAILED — paste it here and we'll fix it before continuing.

---

### Step 3 — Install dependencies

```bash
cd ~/Desktop/Automation/backend && npm install
```

Expected: finishes with no errors. Audit warnings are fine to ignore.

---

### Step 4 — Run tests

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected:
```
No tests found, exiting with code 0
```

---

### Step 5 — Type-check (must be silent)

```bash
cd ~/Desktop/Automation/backend && npm run typecheck
```

Expected: no output, exit code 0. Any output means a type error — paste it before continuing.

---

### Step 6 — Build check

```bash
cd ~/Desktop/Automation/backend && npm run build
```

Expected: compiles to `dist/` with no errors.

---

### Step 7 — Start the server

Make sure your `.env` has `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` filled in (from Step 1.2). Then:

```bash
cd ~/Desktop/Automation/backend && npm run dev
```

Expected:
```
🚀 Server running on port 3000
```

---

### Step 8 — Verify health endpoint (open a second Terminal tab)

```bash
curl http://localhost:3000/health
```

Expected:
```json
{"success":true,"data":{"status":"ok","timestamp":"...","env":"development"},"meta":null,"error":null}
```

---

### Step 9 — Verify 404 handler

```bash
curl http://localhost:3000/api/doesnotexist
```

Expected:
```json
{"success":false,"data":null,"meta":null,"error":{"code":"NOT_FOUND","message":"Route not found","details":null}}
```

---

All 9 steps passing = Step 1.3 complete. ✅
