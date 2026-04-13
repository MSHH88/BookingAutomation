# PHASE 6 — Staff & HR

**Sub-phases:** 6.1 Staff Rota/Shift Scheduling, 6.2 Staff Mobile App PWA API Support, 6.3 CRM Services Section, 6.4 CRM Artist Media Management  
**Files changed:** 20 total (6 modified + 14 new)  
**Feature flags added:** `ROTA_ENABLED`, `STAFF_APP_ENABLED`  
**Expected result:** all tests pass, 0 failures.

---

## Step 1 — Open Terminal and go to your backend folder

```bash
cd ~/Desktop/Automation/backend
```

---

## Step 2 — Create new module directories

```bash
cd ~/Desktop/Automation/backend && \
mkdir -p src/modules/rota && \
mkdir -p src/modules/push
```

---

## Step 3 — Remove files that will be re-created (modified files)

```bash
cd ~/Desktop/Automation/backend && \
rm -f prisma/schema.prisma && \
rm -f src/app.ts && \
rm -f src/config/businessType.ts && \
rm -f src/modules/artists/artists.service.ts && \
rm -f src/modules/artists/artists.controller.ts && \
rm -f src/modules/artists/artists.routes.ts
```

---

## Step 4 — Download all files (1/20 to 20/20)

```bash
curl -sfL -o prisma/schema.prisma "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/schema.prisma" && echo "OK 1/20 schema.prisma" || echo "FAILED 1/20 schema.prisma"
curl -sfL -o src/app.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" && echo "OK 2/20 app.ts" || echo "FAILED 2/20 app.ts"
curl -sfL -o src/config/businessType.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/config/businessType.ts" && echo "OK 3/20 businessType.ts" || echo "FAILED 3/20 businessType.ts"
curl -sfL -o src/modules/artists/artists.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artists.service.ts" && echo "OK 4/20 artists.service.ts" || echo "FAILED 4/20 artists.service.ts"
curl -sfL -o src/modules/artists/artists.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artists.controller.ts" && echo "OK 5/20 artists.controller.ts" || echo "FAILED 5/20 artists.controller.ts"
curl -sfL -o src/modules/artists/artists.routes.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artists.routes.ts" && echo "OK 6/20 artists.routes.ts" || echo "FAILED 6/20 artists.routes.ts"
curl -sfL -o src/lib/push-notifications.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/lib/push-notifications.ts" && echo "OK 7/20 push-notifications.ts" || echo "FAILED 7/20 push-notifications.ts"
curl -sfL -o src/modules/rota/rota.schema.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/rota/rota.schema.ts" && echo "OK 8/20 rota.schema.ts" || echo "FAILED 8/20 rota.schema.ts"
curl -sfL -o src/modules/rota/rota.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/rota/rota.service.ts" && echo "OK 9/20 rota.service.ts" || echo "FAILED 9/20 rota.service.ts"
curl -sfL -o src/modules/rota/rota.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/rota/rota.controller.ts" && echo "OK 10/20 rota.controller.ts" || echo "FAILED 10/20 rota.controller.ts"
curl -sfL -o src/modules/rota/rota.routes.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/rota/rota.routes.ts" && echo "OK 11/20 rota.routes.ts" || echo "FAILED 11/20 rota.routes.ts"
curl -sfL -o src/modules/rota/rota.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/rota/rota.service.test.ts" && echo "OK 12/20 rota.service.test.ts" || echo "FAILED 12/20 rota.service.test.ts"
curl -sfL -o src/modules/rota/rota.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/rota/rota.test.ts" && echo "OK 13/20 rota.test.ts" || echo "FAILED 13/20 rota.test.ts"
curl -sfL -o src/modules/push/push.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/push/push.service.ts" && echo "OK 14/20 push.service.ts" || echo "FAILED 14/20 push.service.ts"
curl -sfL -o src/modules/push/push.routes.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/push/push.routes.ts" && echo "OK 15/20 push.routes.ts" || echo "FAILED 15/20 push.routes.ts"
curl -sfL -o src/modules/push/push.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/push/push.service.test.ts" && echo "OK 16/20 push.service.test.ts" || echo "FAILED 16/20 push.service.test.ts"
curl -sfL -o src/modules/artists/artist-media.service.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artist-media.service.ts" && echo "OK 17/20 artist-media.service.ts" || echo "FAILED 17/20 artist-media.service.ts"
curl -sfL -o src/modules/artists/artist-media.controller.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artist-media.controller.ts" && echo "OK 18/20 artist-media.controller.ts" || echo "FAILED 18/20 artist-media.controller.ts"
curl -sfL -o src/modules/artists/artist-media.service.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/artists/artist-media.service.test.ts" && echo "OK 19/20 artist-media.service.test.ts" || echo "FAILED 19/20 artist-media.service.test.ts"
curl -sfL -o src/modules/services/services.test.ts "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/services/services.test.ts" && echo "OK 20/20 services.test.ts" || echo "FAILED 20/20 services.test.ts"
```

---

## Step 5 — Apply Prisma migration

```bash
cd ~/Desktop/Automation/backend && \
npx prisma generate && \
npx prisma migrate dev --name phase6_rota_push_media
```

---

## Step 6 — Run tests

```bash
cd ~/Desktop/Automation/backend && \
npx jest --clearCache --silent && \
npx jest --passWithNoTests
```

**Expected output:** all suites pass, 0 failures.
