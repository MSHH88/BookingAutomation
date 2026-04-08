# Step 1.27 — Outgoing Webhook System

Adds a full **outgoing webhook delivery system** so any external service can
subscribe to real-time business events fired by the studio backend.

**What this step delivers:**

- `GET    /api/webhooks`                    — paginated list of registered webhooks
- `POST   /api/webhooks`                    — register a new webhook (secret returned once)
- `GET    /api/webhooks/:id`                — get webhook details (secret excluded)
- `PATCH  /api/webhooks/:id`                — partially update a webhook
- `DELETE /api/webhooks/:id`                — permanently delete webhook + all delivery history
- `GET    /api/webhooks/:id/deliveries`     — paginated delivery history
- `POST   /api/webhooks/:id/test`           — enqueue a test delivery to verify connectivity

**Event types supported:**

| Event                | Fired when                                           |
|----------------------|------------------------------------------------------|
| `booking.created`    | Quote converted → booking                            |
| `booking.confirmed`  | Booking status → CONFIRMED                           |
| `booking.cancelled`  | Booking status → CANCELLED                           |
| `booking.completed`  | Booking status → COMPLETED                           |
| `booking.rescheduled`| Booking start/end time changed                       |
| `lead.created`       | New lead submitted via capture form                  |
| `lead.status_changed`| Lead status updated by staff                         |
| `payment.succeeded`  | Stripe `payment_intent.succeeded` received           |
| `payment.refunded`   | Stripe `charge.refunded` received                    |

**Security:**
- All routes require a valid JWT with the `ADMIN` role
- Every delivery is signed with `X-BookingAutomation-Signature: sha256=<hmac-sha256-hex>`
- The signing secret is generated automatically (32 random bytes / 64 hex chars) and returned **only once** on creation — callers must store it securely

**Delivery mechanics:**
- Deliveries are enqueued via BullMQ (3 attempts, exponential back-off starting at 5 s)
- Each delivery result is recorded in `webhook_deliveries` for audit/replay
- A Redis outage never causes HTTP 5xx — `enqueueWebhookEvent` swallows errors and logs a warning

**Schema changes:**
- New model `Webhook` (`webhooks` table)
- New model `WebhookDelivery` (`webhook_deliveries` table)
- Requires `prisma migrate deploy` (or `prisma db push` in dev)

---

## ALL 17 FILES MUST BE DOWNLOADED

| # | File | New / Modified |
|---|------|----------------|
| 1  | `backend/prisma/schema.prisma`                               | MODIFIED |
| 2  | `backend/src/app.ts`                                         | MODIFIED |
| 3  | `backend/src/server.ts`                                      | MODIFIED |
| 4  | `backend/src/modules/webhooks/webhooks.schema.ts`            | NEW |
| 5  | `backend/src/modules/webhooks/webhooks.service.ts`           | NEW |
| 6  | `backend/src/modules/webhooks/webhooks.controller.ts`        | NEW |
| 7  | `backend/src/modules/webhooks/webhooks.routes.ts`            | NEW |
| 8  | `backend/src/modules/webhooks/webhooks.queue.ts`             | NEW |
| 9  | `backend/src/modules/webhooks/webhooks.service.test.ts`      | NEW |
| 10 | `backend/src/modules/bookings/bookings.service.ts`           | MODIFIED |
| 11 | `backend/src/modules/bookings/bookings.service.test.ts`      | MODIFIED |
| 12 | `backend/src/modules/leads/leads.service.ts`                 | MODIFIED |
| 13 | `backend/src/modules/leads/leads.service.test.ts`            | MODIFIED |
| 14 | `backend/src/modules/payments/payments.service.ts`           | MODIFIED |
| 15 | `backend/src/modules/payments/payments.service.test.ts`      | MODIFIED |
| 16 | `backend/src/modules/quotes/quotes.service.ts`               | MODIFIED |
| 17 | `backend/src/modules/quotes/quotes.service.test.ts`          | MODIFIED |

---

## STEP 1 — Delete stale copies of all files

```bash
rm -f ~/Desktop/Automation/backend/prisma/schema.prisma && \
rm -f ~/Desktop/Automation/backend/src/app.ts && \
rm -f ~/Desktop/Automation/backend/src/server.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.schema.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.controller.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.routes.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.queue.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/leads/leads.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/leads/leads.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/payments/payments.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/payments/payments.service.test.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/quotes/quotes.service.ts && \
rm -f ~/Desktop/Automation/backend/src/modules/quotes/quotes.service.test.ts
```

---

## STEP 2 — Create required directories

```bash
mkdir -p ~/Desktop/Automation/backend/src/modules/webhooks
```

---

## STEP 3 — Download all 17 files

```bash
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/prisma/schema.prisma" \
  -o ~/Desktop/Automation/backend/prisma/schema.prisma && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/app.ts" \
  -o ~/Desktop/Automation/backend/src/app.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/server.ts" \
  -o ~/Desktop/Automation/backend/src/server.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/webhooks/webhooks.schema.ts" \
  -o ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.schema.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/webhooks/webhooks.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/webhooks/webhooks.controller.ts" \
  -o ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.controller.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/webhooks/webhooks.routes.ts" \
  -o ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.routes.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/webhooks/webhooks.queue.ts" \
  -o ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.queue.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/webhooks/webhooks.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/webhooks/webhooks.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/bookings/bookings.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/bookings/bookings.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/leads/leads.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/leads/leads.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/leads/leads.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/leads/leads.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/payments/payments.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/payments/payments.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/payments/payments.service.test.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.service.ts" \
  -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.service.ts && \
curl -fsSL "https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend/src/modules/quotes/quotes.service.test.ts" \
  -o ~/Desktop/Automation/backend/src/modules/quotes/quotes.service.test.ts
```

---

## STEP 4 — Run the Prisma migration

> **Schema change:** Two new tables (`webhooks`, `webhook_deliveries`) are added.

```bash
cd ~/Desktop/Automation/backend && npx prisma migrate dev --name add_webhooks
```

> Or in production / against a live database:

```bash
cd ~/Desktop/Automation/backend && npx prisma migrate deploy
```

---

## STEP 5 — Run the full test suite

```bash
cd ~/Desktop/Automation/backend && npm test
```

Expected output:

```
Test Suites: 36 passed, 36 total
Tests:       899 passed, 899 total
```

> **All tests must pass with 0 failures.**
> Tests mock all database calls — no live Postgres or Redis required.
