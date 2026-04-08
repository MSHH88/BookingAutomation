# Step 1.25 — Customer Portal API

Adds the **`/api/me`** endpoint group — a full self-service portal for
logged-in customers to manage their own bookings, view their inquiry leads,
and update their profile.

**What this step delivers:**

- `GET  /api/me/bookings`                  — paginated list of own bookings (filterable by status, date range)
- `GET  /api/me/bookings/:id`              — single booking detail (own only)
- `POST /api/me/bookings/:id/cancel`       — cancel own upcoming booking (respects cancellation window; logs cancellation-fee stub when `CANCELLATION_FEE_ENABLED`)
- `POST /api/me/bookings/:id/reschedule`   — request reschedule (sets status → RESCHEDULED; staff notified via email stub; staff must re-confirm)
- `GET  /api/me/leads`                     — paginated list of own inquiry leads (matched by authenticated user email)
- `PATCH /api/me/profile`                  — update own name, phone, marketingConsent (sets `gdprConsentAt` on first consent)

**Security:**
- All routes require a valid JWT with at least `CUSTOMER` role
- Ownership is enforced at the **database level** via compound `where: { id, customerId }` — customers can never access another customer's records regardless of the id supplied

**Business rules:**
- Cancellation window: `CANCELLATION_WINDOW_HOURS` env var (default 24h). Cancellations and reschedule requests must be submitted outside this window. A cancellation inside the window when `CANCELLATION_FEE_ENABLED` triggers the fee log stub (Phase 2 wires Stripe).
- Reschedule does NOT auto-confirm — status changes to `RESCHEDULED` and staff must re-confirm the new slot.
- Cancellable / reschedulable statuses: `PENDING` | `CONFIRMED` | `RESCHEDULED`

---

## ALL 6 FILES MUST BE DOWNLOADED

| # | File | New / Modified |
|---|------|----------------|
| 1 | `backend/src/modules/customers/customers.schema.ts` | NEW |
| 2 | `backend/src/modules/customers/customers.service.ts` | NEW |
| 3 | `backend/src/modules/customers/customers.controller.ts` | NEW |
| 4 | `backend/src/modules/customers/customers.routes.ts` | NEW |
| 5 | `backend/src/modules/customers/customers.service.test.ts` | NEW |
| 6 | `backend/src/app.ts` | MODIFIED |

---

## STEP 1 — Delete stale copies of all files

```bash
rm -f ~/Desktop/Automation/backend/src/modules/customers/customers.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/customers/customers.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/customers/customers.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/customers/customers.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/customers/customers.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 2 — Create required directories

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/customers
```

---

## STEP 3 — Download all 6 files

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customers/customers.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/customers/customers.schema.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customers/customers.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/customers/customers.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customers/customers.controller.ts" \
  -o ~/Desktop/Automation/backend/src/modules/customers/customers.controller.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customers/customers.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/customers/customers.routes.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/customers/customers.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/customers/customers.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o ~/Desktop/Automation/backend/src/app.ts
```

---

## STEP 4 — Run the full test suite

> **No schema change, no migration required for this step.**

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 34 passed, 34 total
Tests:       847 passed, 847 total
```

> **All tests must pass with 0 failures.**
> Tests mock all database calls — no live Postgres or Redis required.

