found 0 vulnerabilities
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in 307ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate

Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "automation_dev", schema "public" at "localhost:5433"

Applying migration `20260413000000_init`

The following migration(s) have been applied:

migrations/
  └─ 20260413000000_init/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in 314ms


neilapacesaite@Neilas-MacBook-Pro backend % cd ~/Desktop/Automation/backend
npm test

> automation-backend@1.0.0 test
> jest --clearCache --silent && jest --passWithNoTests

Cleared /private/var/folders/lv/nzz8ww495y957l52cl56gs3r0000gn/T/jest_dx
 PASS  src/modules/waitlist/waitlist.service.test.ts (43.893 s)
 PASS  src/modules/payments/payments.service.test.ts (45.505 s)
 PASS  src/modules/notifications/notifications.service.test.ts (47.335 s)
 PASS  src/modules/services/services.service.test.ts (47.423 s)
 PASS  src/modules/quotes/quotes.service.test.ts (47.764 s)
 PASS  src/modules/analytics/analytics.service.test.ts (49.441 s)
 PASS  src/modules/bookings/bookings.service.test.ts (50.849 s)
 PASS  src/modules/availability/availability.service.test.ts (5.433 s)
 PASS  src/modules/leads/leads.service.test.ts (7.019 s)
 FAIL  src/modules/calendar/calendar.service.test.ts
  ● syncCreateEvent › skips when CALENDAR_ENABLED flag is off

    expect(jest.fn()).not.toHaveBeenCalled()

    Expected number of calls: 0
    Received number of calls: 1

    1: {"generateAuthUrl": [Function mockConstructor], "getToken": [Function mockConstructor], "setCredentials": [Function mockConstructor]}, {"attendeeEmail": "jane@example.com", "description": "Sleeve piece", "endAt": 2026-04-15T12:00:00.000Z, "startAt": 2026-04-15T10:00:00.000Z, "summary": "Jane Smith — Tattoo Session @ Test Studio"}

      398 |     });
      399 |     await svc.syncCreateEvent(bookingId);
    > 400 |     expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
          |                                         ^
      401 |     expect(mockBookingFindUnique).not.toHaveBeenCalled();
      402 |   });
      403 |

      at Object.<anonymous> (src/modules/calendar/calendar.service.test.ts:400:41)

  ● syncDeleteEvent › skips when CALENDAR_ENABLED flag is off

    expect(jest.fn()).not.toHaveBeenCalled()

    Expected number of calls: 0
    Received number of calls: 1

    1: {"generateAuthUrl": [Function mockConstructor], "getToken": [Function mockConstructor], "setCredentials": [Function mockConstructor]}, "event_to_delete"

      529 |     });
      530 |     await svc.syncDeleteEvent(bookingId);
    > 531 |     expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
          |                                         ^
      532 |   });
      533 |
      534 |   it('skips when booking not found', async () => {

      at Object.<anonymous> (src/modules/calendar/calendar.service.test.ts:531:41)

 PASS  src/modules/invoices/invoices.service.test.ts (5.013 s)
 FAIL  src/modules/sessions/sessions.test.ts
  ● Test suite failed to run

    src/modules/sessions/sessions.test.ts:633:1 - error TS1005: '}' expected.

    633 
        

      src/modules/sessions/sessions.test.ts:277:43
        277 describe('PATCH /api/sessions/:id', () => {
                                                      ~
        The parser expected to find a '}' to match the '{' token here.

 PASS  src/modules/reminders/reminders.queue.test.ts
 FAIL  src/modules/customers/customers.service.test.ts (5.23 s)
  ● cancelMyBooking › allows cancellation inside window when CANCELLATION_FEE_ENABLED is false

    TypeError: Cannot read properties of undefined (reading 'includes')

      88 |     // DB unavailable — fall back to static defaults
      89 |     const rawType = process.env['BUSINESS_TYPE'];
    > 90 |     const type: BusinessType = (BUSINESS_TYPES as readonly string[]).includes(rawType ?? '')
         |                                                                      ^
      91 |       ? (rawType as BusinessType)
      92 |       : activeBusinessType;
      93 |     enabled = getDefaultFlags(type)[flag] ?? false;

      at isFeatureEnabled (src/middleware/requireFeature.ts:90:70)
      at cancelMyBooking (src/modules/customers/customers.service.ts:260:23)
      at Object.<anonymous> (src/modules/customers/customers.service.test.ts:318:20)

  ● cancelMyBooking › cancels inside window and logs fee stub when CANCELLATION_FEE_ENABLED is true

    TypeError: Cannot read properties of undefined (reading 'includes')

      88 |     // DB unavailable — fall back to static defaults
      89 |     const rawType = process.env['BUSINESS_TYPE'];
    > 90 |     const type: BusinessType = (BUSINESS_TYPES as readonly string[]).includes(rawType ?? '')
         |                                                                      ^
      91 |       ? (rawType as BusinessType)
      92 |       : activeBusinessType;
      93 |     enabled = getDefaultFlags(type)[flag] ?? false;

      at isFeatureEnabled (src/middleware/requireFeature.ts:90:70)
      at cancelMyBooking (src/modules/customers/customers.service.ts:260:23)
      at Object.<anonymous> (src/modules/customers/customers.service.test.ts:332:20)

 PASS  src/modules/admin/admin.service.test.ts (8.153 s)
 PASS  src/modules/auth/auth.service.test.ts
 PASS  src/modules/whatsapp/whatsapp.service.test.ts (5.522 s)
  ● Console

    console.log
      prisma:error 
      Invalid `prisma.featureFlag.findFirst()` invocation in
      /Users/neilapacesaite/Desktop/Automation/backend/src/middleware/requireFeature.ts:74:38
      
        71 
        72 // Fall back to global row if no tenant-specific override was found
        73 if (row === null) {
      → 74   row = await prisma.featureFlag.findFirst(
      Can't reach database server at `test:5432`
      
      Please make sure your database server is running at `test:5432`.

      at Object.mc (node_modules/@prisma/client/runtime/library.js:21:432)

 FAIL  src/modules/capture/capture.service.test.ts (5.454 s)
  ● captureLeadPublic › forwards ipAddress to createLead

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: Any<Object>, "203.0.113.10"
    Received: {"artistId": undefined, "colorPreference": "Black & grey", "country": "GB", "description": "Looking for a sleeve tattoo", "deviceType": undefined, "email": "alice@example.com", "marketingConsent": false, "name": "Alice Ink", "pageVisited": "/contact", "phone": "+441234567890", "placement": {"area": "left_arm"}, "preferWhatsApp": false, "preferredDates": null, "referenceImages": [], "serviceId": undefined, "sessionId": undefined, "size": "Large", "source": "instagram", "styleId": undefined, "utmCampaign": undefined, "utmMedium": undefined, "utmSource": undefined, "website": undefined}, "203.0.113.10", null

    Number of calls: 1

      395 |   it('forwards ipAddress to createLead', async () => {
      396 |     await captureLeadPublic(baseBody, '203.0.113.10');
    > 397 |     expect(mockCreateLead).toHaveBeenCalledWith(
          |                            ^
      398 |       expect.any(Object),
      399 |       '203.0.113.10',
      400 |     );

      at Object.<anonymous> (src/modules/capture/capture.service.test.ts:397:28)

 PASS  src/modules/email-templates/email-templates.service.test.ts (5.541 s)
 PASS  src/modules/sms-templates/sms-templates.service.test.ts (5.54 s)
 FAIL  src/modules/calendar/outlook-calendar.service.test.ts
  ● syncOutlookCreateEvent › creates event and stores outlook-prefixed id

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 0

      250 |     await svc.syncOutlookCreateEvent(bookingId);
      251 |
    > 252 |     expect(mockCreateOutlookEvent).toHaveBeenCalledTimes(1);
          |                                    ^
      253 |     expect(mockBookingUpdate).toHaveBeenCalledWith({
      254 |       where: { id: bookingId },
      255 |       data:  { calendarEventId: 'outlook:ms-event-id-123' },

      at Object.<anonymous> (src/modules/calendar/outlook-calendar.service.test.ts:252:36)

  ● syncOutlookUpdateEvent › updates event when calendarEventId has outlook: prefix

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: ObjectContaining {"accessToken": "ms-access"}, "event-abc", ObjectContaining {"summary": StringContaining "John Smith"}

    Number of calls: 0

      297 |
      298 |     await svc.syncOutlookUpdateEvent(bookingId);
    > 299 |     expect(mockUpdateOutlookEvent).toHaveBeenCalledWith(
          |                                    ^
      300 |       expect.objectContaining({ accessToken: 'ms-access' }),
      301 |       'event-abc',
      302 |       expect.objectContaining({ summary: expect.stringContaining('John Smith') }),

      at Object.<anonymous> (src/modules/calendar/outlook-calendar.service.test.ts:299:36)

  ● syncOutlookUpdateEvent › creates new event when no outlook: prefix

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 0

      318 |
      319 |     await svc.syncOutlookUpdateEvent(bookingId);
    > 320 |     expect(mockCreateOutlookEvent).toHaveBeenCalledTimes(1);
          |                                    ^
      321 |   });
      322 | });
      323 |

      at Object.<anonymous> (src/modules/calendar/outlook-calendar.service.test.ts:320:36)

  ● syncOutlookDeleteEvent › deletes event and clears calendarEventId

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: ObjectContaining {"accessToken": "ms-access"}, "event-del"

    Number of calls: 0

      335 |     await svc.syncOutlookDeleteEvent(bookingId);
      336 |
    > 337 |     expect(mockDeleteOutlookEvent).toHaveBeenCalledWith(
          |                                    ^
      338 |       expect.objectContaining({ accessToken: 'ms-access' }),
      339 |       'event-del',
      340 |     );

      at Object.<anonymous> (src/modules/calendar/outlook-calendar.service.test.ts:337:36)

 PASS  src/modules/whatsapp-templates/whatsapp-templates.service.test.ts (6.412 s)
 PASS  src/modules/customer-stats/customer-stats.service.test.ts
 FAIL  src/modules/reviews/reviews.queue.test.ts
  ● enqueueReviewRequest › skips enqueueing when REVIEW_REQUEST_ENABLED flag is OFF

    expect(jest.fn()).not.toHaveBeenCalled()

    Expected number of calls: 0
    Received number of calls: 1

    1: "review-request", {"artistName": undefined, "bookingId": "clabcdefg0000000000000001", "customerEmail": "jane@example.com", "customerName": "Jane Smith", "googleReviewUrl": "https://g.page/r/CBlack_Rose/review", "serviceName": undefined, "studioName": "Black Rose Studio"}, {"delay": 129600000}

      193 |
      194 |     await enqueueReviewRequest(baseParams);
    > 195 |     expect(mockQueueAdd).not.toHaveBeenCalled();
          |                              ^
      196 |
      197 |     spy.mockRestore();
      198 |   });

      at Object.<anonymous> (src/modules/reviews/reviews.queue.test.ts:195:30)

 PASS  src/modules/uploads/uploads.service.test.ts
 PASS  src/modules/public/public.service.test.ts (7.153 s)
 FAIL  src/modules/webhooks/webhooks.service.test.ts
  ● Test suite failed to run

    src/modules/webhooks/webhooks.service.test.ts:120:30 - error TS2554: Expected 2 arguments, but got 1.

    120     const result = await svc.listWebhooks({ page: 1, limit: 20, isActive: undefined });
                                     ~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:103:3
        103   query: ListWebhooksQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:131:30 - error TS2554: Expected 2 arguments, but got 1.

    131     const result = await svc.listWebhooks({ page: 1, limit: 20, isActive: true });
                                     ~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:103:3
        103   query: ListWebhooksQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:143:30 - error TS2554: Expected 2 arguments, but got 1.

    143     const result = await svc.listWebhooks({ page: 1, limit: 20, isActive: undefined });
                                     ~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:103:3
        103   query: ListWebhooksQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:158:30 - error TS2554: Expected 2 arguments, but got 1.

    158     const result = await svc.getWebhookById('wh_1');
                                     ~~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:123:63
        123 export async function getWebhookById(tenantId: string | null, id: string): Promise<WebhookPublic> {
                                                                          ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:167:22 - error TS2554: Expected 2 arguments, but got 1.

    167     await expect(svc.getWebhookById('wh_missing')).rejects.toMatchObject({
                             ~~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:123:63
        123 export async function getWebhookById(tenantId: string | null, id: string): Promise<WebhookPublic> {
                                                                          ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:182:30 - error TS2554: Expected 2 arguments, but got 1.

    182     const result = await svc.createWebhook({
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:149:62
        149 export async function createWebhook(tenantId: string | null, data: CreateWebhookBody): Promise<WebhookWithSecret> {
                                                                         ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:206:30 - error TS2554: Expected 2 arguments, but got 1.

    206     const result = await svc.createWebhook({
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:149:62
        149 export async function createWebhook(tenantId: string | null, data: CreateWebhookBody): Promise<WebhookWithSecret> {
                                                                         ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:217:15 - error TS2554: Expected 2 arguments, but got 1.

    217     await svc.createWebhook({
                      ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:149:62
        149 export async function createWebhook(tenantId: string | null, data: CreateWebhookBody): Promise<WebhookWithSecret> {
                                                                         ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:240:30 - error TS2554: Expected 3 arguments, but got 2.

    240     const result = await svc.updateWebhook('wh_1', { url: 'https://new.example.com/hook' });
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:178:3
        178   data: UpdateWebhookBody,
              ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:252:30 - error TS2554: Expected 3 arguments, but got 2.

    252     const result = await svc.updateWebhook('wh_1', { events: ['payment.succeeded'] });
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:178:3
        178   data: UpdateWebhookBody,
              ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:261:30 - error TS2554: Expected 3 arguments, but got 2.

    261     const result = await svc.updateWebhook('wh_1', { isActive: false });
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:178:3
        178   data: UpdateWebhookBody,
              ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:270:30 - error TS2554: Expected 3 arguments, but got 2.

    270     const result = await svc.updateWebhook('wh_1', { description: null });
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:178:3
        178   data: UpdateWebhookBody,
              ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:278:22 - error TS2554: Expected 3 arguments, but got 2.

    278     await expect(svc.updateWebhook('wh_missing', { isActive: false })).rejects.toMatchObject({
                             ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:178:3
        178   data: UpdateWebhookBody,
              ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:303:22 - error TS2554: Expected 2 arguments, but got 1.

    303     await expect(svc.deleteWebhook('wh_1')).resolves.toBeUndefined();
                             ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:204:62
        204 export async function deleteWebhook(tenantId: string | null, id: string): Promise<void> {
                                                                         ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:310:22 - error TS2554: Expected 2 arguments, but got 1.

    310     await expect(svc.deleteWebhook('wh_missing')).rejects.toMatchObject({
                             ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:204:62
        204 export async function deleteWebhook(tenantId: string | null, id: string): Promise<void> {
                                                                         ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:327:30 - error TS2554: Expected 3 arguments, but got 2.

    327     const result = await svc.listWebhookDeliveries('wh_1', {
                                     ~~~~~~~~~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:222:3
        222   query:     ListDeliveriesQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:343:15 - error TS2554: Expected 3 arguments, but got 2.

    343     await svc.listWebhookDeliveries('wh_1', { page: 1, limit: 20, success: false });
                      ~~~~~~~~~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:222:3
        222   query:     ListDeliveriesQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:356:11 - error TS2554: Expected 3 arguments, but got 2.

    356       svc.listWebhookDeliveries('wh_missing', { page: 1, limit: 20, success: undefined }),
                  ~~~~~~~~~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:222:3
        222   query:     ListDeliveriesQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:372:30 - error TS2554: Expected 2 arguments, but got 1.

    372     const result = await svc.testWebhook('wh_1');
                                     ~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:251:60
        251 export async function testWebhook(tenantId: string | null, id: string): Promise<{ queued: true }> {
                                                                       ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:385:22 - error TS2554: Expected 2 arguments, but got 1.

    385     await expect(svc.testWebhook('wh_1')).rejects.toMatchObject({
                             ~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:251:60
        251 export async function testWebhook(tenantId: string | null, id: string): Promise<{ queued: true }> {
                                                                       ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:394:22 - error TS2554: Expected 2 arguments, but got 1.

    394     await expect(svc.testWebhook('wh_missing')).rejects.toMatchObject({
                             ~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:251:60
        251 export async function testWebhook(tenantId: string | null, id: string): Promise<{ queued: true }> {
                                                                       ~~~~~~~~~~
        An argument for 'id' was not provided.

 FAIL  src/modules/calendar/apple-calendar.service.test.ts
  ● syncAppleCreateEvent › creates event and stores apple-prefixed id

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 0

      231 |     await svc.syncAppleCreateEvent(bookingId);
      232 |
    > 233 |     expect(mockCreateAppleEvent).toHaveBeenCalledTimes(1);
          |                                  ^
      234 |     expect(mockBookingUpdate).toHaveBeenCalledWith({
      235 |       where: { id: bookingId },
      236 |       data:  { calendarEventId: 'apple:test-uuid-1234' },

      at Object.<anonymous> (src/modules/calendar/apple-calendar.service.test.ts:233:34)

  ● syncAppleUpdateEvent › updates event when calendarEventId has apple: prefix

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 0

      277 |
      278 |     await svc.syncAppleUpdateEvent(bookingId);
    > 279 |     expect(mockUpdateAppleEvent).toHaveBeenCalledTimes(1);
          |                                  ^
      280 |     expect(mockUpdateAppleEvent).toHaveBeenCalledWith(
      281 |       expect.objectContaining({ username: 'user@example.com' }),
      282 |       expect.objectContaining({ uid: 'test-uid-abc' }),

      at Object.<anonymous> (src/modules/calendar/apple-calendar.service.test.ts:279:34)

  ● syncAppleUpdateEvent › creates new event when no apple: prefix

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 0

      298 |
      299 |     await svc.syncAppleUpdateEvent(bookingId);
    > 300 |     expect(mockCreateAppleEvent).toHaveBeenCalledTimes(1);
          |                                  ^
      301 |   });
      302 | });
      303 |

      at Object.<anonymous> (src/modules/calendar/apple-calendar.service.test.ts:300:34)

  ● syncAppleDeleteEvent › deletes event and clears calendarEventId

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: ObjectContaining {"username": "user@example.com"}, "uid-to-delete"

    Number of calls: 0

      315 |     await svc.syncAppleDeleteEvent(bookingId);
      316 |
    > 317 |     expect(mockDeleteAppleEvent).toHaveBeenCalledWith(
          |                                  ^
      318 |       expect.objectContaining({ username: 'user@example.com' }),
      319 |       'uid-to-delete',
      320 |     );

      at Object.<anonymous> (src/modules/calendar/apple-calendar.service.test.ts:317:34)

 PASS  src/lib/pricing-engine.test.ts
 PASS  src/modules/tables/tables.service.test.ts
 PASS  src/modules/products/products.service.test.ts
 PASS  src/modules/forms/forms.service.test.ts
 PASS  src/modules/campaigns/campaigns.service.test.ts
 PASS  src/modules/recurring-bookings/recurring-bookings.service.test.ts
 PASS  src/modules/referrals/referrals.service.test.ts
 FAIL  src/modules/leads/leads.test.ts (186.547 s)
  ● POST /api/leads › 503 — LEAD_CAPTURE_ENABLED=false returns feature disabled

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 201

      112 |
      113 |     process.env['BUSINESS_TYPE'] = originalBT;
    > 114 |     expect(res.status).toBe(503);
          |                        ^
      115 |     expect(res.body.error.code).toBe('FEATURE_DISABLED');
      116 |   });
      117 | });

      at Object.<anonymous> (src/modules/leads/leads.test.ts:114:24)

 PASS  src/modules/email-templates/email-templates.test.ts (178.965 s)
 FAIL  src/modules/public/public.test.ts (183.162 s)
  ● /api/public › POST /api/public/businesses/:slug/bookings › 201 — creates booking

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 500

      215 |         });
      216 |
    > 217 |       expect(res.status).toBe(201);
          |                          ^
      218 |       expect(res.body.data.publicToken).toBe('d4e5f6a7-b8c9-0123-def0-123456789abc');
      219 |     });
      220 |

      at Object.<anonymous> (src/modules/public/public.test.ts:217:26)

  ● /api/public › PUBLIC_BOOKING_ENABLED=false › 503 — feature disabled

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      272 |
      273 |       const res = await request(app).get('/api/public/businesses/test-studio');
    > 274 |       expect(res.status).toBe(503);
          |                          ^
      275 |     });
      276 |   });
      277 | });

      at Object.<anonymous> (src/modules/public/public.test.ts:274:26)

 FAIL  src/modules/calendar/calendar.test.ts (203.129 s)
  ● GET /api/calendar/auth-url › 503 when CALENDAR_ENABLED feature flag is off

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      156 |         .get('/api/calendar/auth-url')
      157 |         .set('Authorization', makeToken('ARTIST'));
    > 158 |       expect(res.status).toBe(503);
          |                          ^
      159 |     });
      160 |   });
      161 | });

      at src/modules/calendar/calendar.test.ts:158:26
      at withBusinessType (src/modules/calendar/calendar.test.ts:95:9)
      at Object.<anonymous> (src/modules/calendar/calendar.test.ts:154:5)

  ● GET /api/calendar/status › 503 when CALENDAR_ENABLED feature flag is off

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      232 |         .get('/api/calendar/status')
      233 |         .set('Authorization', makeToken('ARTIST'));
    > 234 |       expect(res.status).toBe(503);
          |                          ^
      235 |     });
      236 |   });
      237 | });

      at src/modules/calendar/calendar.test.ts:234:26
      at withBusinessType (src/modules/calendar/calendar.test.ts:95:9)
      at Object.<anonymous> (src/modules/calendar/calendar.test.ts:230:5)

 PASS  src/modules/auth/auth.test.ts (230.226 s)
 FAIL  src/modules/waitlist/waitlist.test.ts (229.471 s)
  ● POST /api/waitlist › 503 — WAITING_LIST_ENABLED=false returns feature disabled

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 409

      141 |
      142 |     process.env['BUSINESS_TYPE'] = prev;
    > 143 |     expect(res.status).toBe(503);
          |                        ^
      144 |     expect(res.body.error.code).toBe('FEATURE_DISABLED');
      145 |   });
      146 | });

      at Object.<anonymous> (src/modules/waitlist/waitlist.test.ts:143:24)

 PASS  src/modules/artists/artists.test.ts (244.678 s)
 PASS  src/config/businessType.test.ts (61.524 s)
 PASS  src/modules/alerts/alerts.service.test.ts (91.577 s)
 PASS  src/modules/pos/pos.service.test.ts (106.255 s)
 PASS  src/modules/whatsapp-templates/whatsapp-templates.test.ts (130.357 s)
 PASS  src/modules/sms-templates/sms-templates.test.ts (127.397 s)
 PASS  src/modules/memberships/memberships.service.test.ts (11.976 s)
 FAIL  src/modules/pricing/pricing.test.ts (84.162 s)
  ● GET /api/pricing-rules › returns empty list when no rules

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      132 |       .set('Authorization', `Bearer ${adminToken}`);
      133 |
    > 134 |     expect(res.status).toBe(200);
          |                        ^
      135 |     expect(res.body.data).toEqual([]);
      136 |   });
      137 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:134:24)

  ● GET /api/pricing-rules › returns list of rules

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      143 |       .set('Authorization', `Bearer ${adminToken}`);
      144 |
    > 145 |     expect(res.status).toBe(200);
          |                        ^
      146 |     expect(res.body.data).toHaveLength(1);
      147 |     expect(res.body.data[0].id).toBe('rule_1');
      148 |   });

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:145:24)

  ● POST /api/pricing-rules › creates rule successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 503

      169 |       .send(validBody);
      170 |
    > 171 |     expect(res.status).toBe(201);
          |                        ^
      172 |     expect(res.body.data.id).toBe('rule_1');
      173 |   });
      174 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:171:24)

  ● POST /api/pricing-rules › returns 400 for invalid body (missing ruleType)

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 503

      179 |       .send({ adjustmentType: 'FLAT', adjustmentValue: 10 });
      180 |
    > 181 |     expect(res.status).toBe(400);
          |                        ^
      182 |   });
      183 |
      184 |   it('returns 404 when serviceId not found', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:181:24)

  ● POST /api/pricing-rules › returns 404 when serviceId not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      190 |       .send({ ...validBody, serviceId: 'nonexistent' });
      191 |
    > 192 |     expect(res.status).toBe(404);
          |                        ^
      193 |   });
      194 | });
      195 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:192:24)

  ● PATCH /api/pricing-rules/:id › updates rule successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      206 |       .send({ priority: 5 });
      207 |
    > 208 |     expect(res.status).toBe(200);
          |                        ^
      209 |   });
      210 |
      211 |   it('returns 404 when rule not found', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:208:24)

  ● PATCH /api/pricing-rules/:id › returns 404 when rule not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      217 |       .send({ priority: 5 });
      218 |
    > 219 |     expect(res.status).toBe(404);
          |                        ^
      220 |   });
      221 |
      222 |   it('returns 403 when rule belongs to different tenant', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:219:24)

  ● PATCH /api/pricing-rules/:id › returns 403 when rule belongs to different tenant

    expect(received).toBe(expected) // Object.is equality

    Expected: 403
    Received: 503

      228 |       .send({ priority: 5 });
      229 |
    > 230 |     expect(res.status).toBe(403);
          |                        ^
      231 |   });
      232 | });
      233 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:230:24)

  ● DELETE /api/pricing-rules/:id › deletes rule successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 204
    Received: 503

      243 |       .set('Authorization', `Bearer ${adminToken}`);
      244 |
    > 245 |     expect(res.status).toBe(204);
          |                        ^
      246 |   });
      247 |
      248 |   it('returns 404 when rule not found', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:245:24)

  ● DELETE /api/pricing-rules/:id › returns 404 when rule not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      253 |       .set('Authorization', `Bearer ${adminToken}`);
      254 |
    > 255 |     expect(res.status).toBe(404);
          |                        ^
      256 |   });
      257 | });
      258 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:255:24)

  ● GET /api/pricing-rules/calculate › returns calculated price

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      273 |       .query({ serviceId: 'svc_1', slotDateTime: '2025-06-07T10:00:00Z' });
      274 |
    > 275 |     expect(res.status).toBe(200);
          |                        ^
      276 |     expect(res.body.data.adjustedPrice).toBe(120);
      277 |   });
      278 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:275:24)

  ● GET /api/pricing-rules/calculate › returns 404 when service has no price

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      285 |       .query({ serviceId: 'svc_1', slotDateTime: '2025-06-07T10:00:00Z' });
      286 |
    > 287 |     expect(res.status).toBe(404);
          |                        ^
      288 |   });
      289 |
      290 |   it('returns 400 for invalid slotDateTime', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:287:24)

  ● GET /api/pricing-rules/calculate › returns 400 for invalid slotDateTime

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 503

      294 |       .query({ serviceId: 'svc_1', slotDateTime: 'not-a-date' });
      295 |
    > 296 |     expect(res.status).toBe(400);
          |                        ^
      297 |   });
      298 |
      299 |   it('returns 400 when serviceId missing', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:296:24)

  ● GET /api/pricing-rules/calculate › returns 400 when serviceId missing

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 503

      303 |       .query({ slotDateTime: '2025-06-07T10:00:00Z' });
      304 |
    > 305 |     expect(res.status).toBe(400);
          |                        ^
      306 |   });
      307 | });
      308 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:305:24)

 FAIL  src/modules/settings/settings.service.test.ts
  ● Test suite failed to run

    src/modules/settings/settings.service.test.ts:119:26 - error TS2554: Expected 1 arguments, but got 0.

    119     const result = await getCachedSettings();
                                 ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:131:26 - error TS2554: Expected 1 arguments, but got 0.

    131     const result = await getCachedSettings();
                                 ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:147:26 - error TS2554: Expected 1 arguments, but got 0.

    147     const result = await getCachedSettings();
                                 ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:158:26 - error TS2554: Expected 1 arguments, but got 0.

    158     const result = await getCachedSettings();
                                 ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:169:26 - error TS2554: Expected 1 arguments, but got 0.

    169     const result = await getCachedSettings();
                                 ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:178:11 - error TS2554: Expected 1 arguments, but got 0.

    178     await getCachedSettings();
                  ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:198:26 - error TS2554: Expected 2 arguments, but got 1.

    198     const result = await updateSettings({ studioName: 'Updated Studio' });
                                 ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.
    src/modules/settings/settings.service.test.ts:214:11 - error TS2554: Expected 2 arguments, but got 1.

    214     await updateSettings({ studioName: 'New Name' });
                  ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.
    src/modules/settings/settings.service.test.ts:224:26 - error TS2554: Expected 2 arguments, but got 1.

    224     const result = await updateSettings({
                                 ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.
    src/modules/settings/settings.service.test.ts:241:7 - error TS2554: Expected 2 arguments, but got 1.

    241       updateSettings({ currency: 'EUR' }),
              ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.
    src/modules/settings/settings.service.test.ts:255:11 - error TS2554: Expected 2 arguments, but got 1.

    255     await updateSettings({ currency: 'USD' });
                  ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.
    src/modules/settings/settings.service.test.ts:271:7 - error TS2554: Expected 2 arguments, but got 1.

    271       updateSettings({ studioName: 'Resilient Studio' }),
              ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.

 FAIL  src/modules/payments/payments.test.ts (138.938 s)
  ● POST /api/payments/create-intent › returns 503 when ONLINE_PAYMENT_ENABLED is false for business type

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 201

      158 |       .send({ bookingId: BOOKING_ID });
      159 |
    > 160 |     expect(res.status).toBe(503);
          |                        ^
      161 |     expect(res.body.error.code).toBe('FEATURE_DISABLED');
      162 |   });
      163 | });

      at Object.<anonymous> (src/modules/payments/payments.test.ts:160:24)

 PASS  src/modules/packages/packages.service.test.ts (8.943 s)
 PASS  src/modules/gift-cards/gift-cards.service.test.ts (8.947 s)
 FAIL  src/modules/bookings/bookings.test.ts (45.089 s)
  ● PATCH /api/bookings/:id/confirm › 200 — ARTIST confirms PENDING booking

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      179 |       .set('Authorization', makeToken('ARTIST'));
      180 |
    > 181 |     expect(res.status).toBe(200);
          |                        ^
      182 |     expect(res.body.data.status).toBe('CONFIRMED');
      183 |   });
      184 |

      at Object.<anonymous> (src/modules/bookings/bookings.test.ts:181:24)

  ● PATCH /api/bookings/:id/reschedule › 200 — ARTIST reschedules CONFIRMED booking

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      245 |       .send({ startAt: newDate.toISOString(), endAt: newEndDate.toISOString() });
      246 |
    > 247 |     expect(res.status).toBe(200);
          |                        ^
      248 |   });
      249 | });
      250 |

      at Object.<anonymous> (src/modules/bookings/bookings.test.ts:247:24)

 FAIL  src/modules/quotes/quotes.test.ts (47.863 s)
  ● POST /api/quotes › 503 — QUOTE_SYSTEM_ENABLED=false returns feature disabled

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 404

      122 |
      123 |     process.env['BUSINESS_TYPE'] = originalBT;
    > 124 |     expect(res.status).toBe(503);
          |                        ^
      125 |   });
      126 |
      127 |   it('400 — missing required fields', async () => {

      at Object.<anonymous> (src/modules/quotes/quotes.test.ts:124:24)

 PASS  src/modules/forms/forms.test.ts (44.083 s)
 PASS  src/modules/tenants/tenants.test.ts (38.902 s)
 PASS  src/modules/tenants/tenants.service.test.ts (50.583 s)
 PASS  src/modules/styles/styles.service.test.ts (68.445 s)
 PASS  src/modules/ai/ai.service.test.ts (70.713 s)
 FAIL  src/modules/availability/availability.test.ts (76.083 s)
  ● DELETE /api/availability/blocks/:id › 200 — ARTIST deletes own block

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 204

      192 |       .set('Authorization', makeToken('ARTIST'));
      193 |
    > 194 |     expect(res.status).toBe(200);
          |                        ^
      195 |   });
      196 |
      197 |   it('401 — unauthenticated', async () => {

      at Object.<anonymous> (src/modules/availability/availability.test.ts:194:24)

 FAIL  src/modules/locations/locations.test.ts (111.398 s)
  ● GET /api/locations › returns empty list when no locations

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      110 |       .set('Authorization', `Bearer ${adminToken}`);
      111 |
    > 112 |     expect(res.status).toBe(200);
          |                        ^
      113 |     expect(res.body.data).toEqual([]);
      114 |   });
      115 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:112:24)

  ● GET /api/locations › returns list of locations

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      121 |       .set('Authorization', `Bearer ${adminToken}`);
      122 |
    > 123 |     expect(res.status).toBe(200);
          |                        ^
      124 |     expect(res.body.data).toHaveLength(1);
      125 |     expect(res.body.data[0].id).toBe('loc_1');
      126 |   });

      at Object.<anonymous> (src/modules/locations/locations.test.ts:123:24)

  ● GET /api/locations › filters by isActive=true

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      133 |       .set('Authorization', `Bearer ${adminToken}`);
      134 |
    > 135 |     expect(res.status).toBe(200);
          |                        ^
      136 |     expect(mockLocationFindMany).toHaveBeenCalledWith(
      137 |       expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
      138 |     );

      at Object.<anonymous> (src/modules/locations/locations.test.ts:135:24)

  ● POST /api/locations › creates location successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 503

      157 |       .send(validBody);
      158 |
    > 159 |     expect(res.status).toBe(201);
          |                        ^
      160 |     expect(res.body.data.id).toBe('loc_1');
      161 |   });
      162 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:159:24)

  ● POST /api/locations › returns 400 when name is missing

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 503

      167 |       .send({ city: 'London' });
      168 |
    > 169 |     expect(res.status).toBe(400);
          |                        ^
      170 |   });
      171 | });
      172 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:169:24)

  ● GET /api/locations/:id › returns location by id

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      181 |       .set('Authorization', `Bearer ${adminToken}`);
      182 |
    > 183 |     expect(res.status).toBe(200);
          |                        ^
      184 |     expect(res.body.data.id).toBe('loc_1');
      185 |   });
      186 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:183:24)

  ● GET /api/locations/:id › returns 404 when location not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      192 |       .set('Authorization', `Bearer ${adminToken}`);
      193 |
    > 194 |     expect(res.status).toBe(404);
          |                        ^
      195 |   });
      196 |
      197 |   it('returns 403 when location belongs to different tenant', async () => {

      at Object.<anonymous> (src/modules/locations/locations.test.ts:194:24)

  ● GET /api/locations/:id › returns 403 when location belongs to different tenant

    expect(received).toBe(expected) // Object.is equality

    Expected: 403
    Received: 503

      202 |       .set('Authorization', `Bearer ${adminToken}`);
      203 |
    > 204 |     expect(res.status).toBe(403);
          |                        ^
      205 |   });
      206 | });
      207 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:204:24)

  ● PATCH /api/locations/:id › updates location successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      218 |       .send({ name: 'Updated Studio' });
      219 |
    > 220 |     expect(res.status).toBe(200);
          |                        ^
      221 |     expect(res.body.data.name).toBe('Updated Studio');
      222 |   });
      223 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:220:24)

  ● PATCH /api/locations/:id › returns 404 when location not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      230 |       .send({ name: 'X' });
      231 |
    > 232 |     expect(res.status).toBe(404);
          |                        ^
      233 |   });
      234 |
      235 |   it('returns 403 when location belongs to different tenant', async () => {

      at Object.<anonymous> (src/modules/locations/locations.test.ts:232:24)

  ● PATCH /api/locations/:id › returns 403 when location belongs to different tenant

    expect(received).toBe(expected) // Object.is equality

    Expected: 403
    Received: 503

      241 |       .send({ name: 'X' });
      242 |
    > 243 |     expect(res.status).toBe(403);
          |                        ^
      244 |   });
      245 | });
      246 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:243:24)

  ● DELETE /api/locations/:id › deletes location successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 204
    Received: 503

      256 |       .set('Authorization', `Bearer ${adminToken}`);
      257 |
    > 258 |     expect(res.status).toBe(204);
          |                        ^
      259 |   });
      260 |
      261 |   it('returns 404 when location not found', async () => {

      at Object.<anonymous> (src/modules/locations/locations.test.ts:258:24)

  ● DELETE /api/locations/:id › returns 404 when location not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      266 |       .set('Authorization', `Bearer ${adminToken}`);
      267 |
    > 268 |     expect(res.status).toBe(404);
          |                        ^
      269 |   });
      270 |
      271 |   it('returns 403 when location belongs to different tenant', async () => {

      at Object.<anonymous> (src/modules/locations/locations.test.ts:268:24)

  ● DELETE /api/locations/:id › returns 403 when location belongs to different tenant

    expect(received).toBe(expected) // Object.is equality

    Expected: 403
    Received: 503

      276 |       .set('Authorization', `Bearer ${adminToken}`);
      277 |
    > 278 |     expect(res.status).toBe(403);
          |                        ^
      279 |   });
      280 | });
      281 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:278:24)

 PASS  src/modules/analytics/analytics.test.ts (111.302 s)
 PASS  src/modules/settings/settings.test.ts (83.794 s)
 PASS  src/modules/roles/roles.service.test.ts (63.266 s)
 PASS  src/modules/health-flags/health-flags.service.test.ts (15.743 s)
 PASS  src/modules/booking-photos/booking-photos.service.test.ts (15.742 s)
 PASS  src/modules/rota/rota.service.test.ts (15.536 s)
 PASS  src/modules/referrals/referrals.test.ts (27.583 s)
 PASS  src/modules/services/services.test.ts (25.409 s)
 FAIL  src/modules/features/features.test.ts (26.787 s)
  ● LEAD_CAPTURE_ENABLED flag › restaurant — LEAD_CAPTURE_ENABLED=false → 503 FEATURE_DISABLED

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 400

      127 |       const res = await request(app).post('/api/leads').send(leadBody);
      128 |
    > 129 |       expect(res.status).toBe(503);
          |                          ^
      130 |       expect(res.body.success).toBe(false);
      131 |       expect(res.body.error.code).toBe('FEATURE_DISABLED');
      132 |     });

      at src/modules/features/features.test.ts:129:26
      at withBusinessType (src/modules/features/features.test.ts:72:5)
      at Object.<anonymous> (src/modules/features/features.test.ts:126:5)

 FAIL  src/modules/recurring-bookings/recurring-bookings.test.ts (30.276 s)
  ● Feature flag gating › 503 — when RECURRING_BOOKINGS_ENABLED is false

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      231 |     process.env['BUSINESS_TYPE'] = orig;
      232 |
    > 233 |     expect(res.status).toBe(503);
          |                        ^
      234 |   });
      235 | });
      236 |

      at Object.<anonymous> (src/modules/recurring-bookings/recurring-bookings.test.ts:233:24)

 PASS  src/modules/roles/roles.test.ts (24.455 s)
 PASS  src/modules/products/products.test.ts (32.111 s)
 FAIL  src/modules/campaigns/campaigns.test.ts (72.999 s)
  ● Feature flag gating › 503 — when CAMPAIGNS_ENABLED is false

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      222 |     process.env['BUSINESS_TYPE'] = orig;
      223 |
    > 224 |     expect(res.status).toBe(503);
          |                        ^
      225 |   });
      226 | });
      227 |

      at Object.<anonymous> (src/modules/campaigns/campaigns.test.ts:224:24)

 FAIL  src/modules/rota/rota.test.ts (83.015 s)
  ● DELETE /api/rota/shifts/:id › returns 200 on successful delete

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 204

      227 |       .set('Authorization', `Bearer ${makeToken('ADMIN')}`);
      228 |
    > 229 |     expect(res.status).toBe(200);
          |                        ^
      230 |     expect(res.body.data.deleted).toBe(true);
      231 |   });
      232 | });

      at Object.<anonymous> (src/modules/rota/rota.test.ts:229:24)

 PASS  src/modules/payroll/payroll.service.test.ts (87.089 s)
 PASS  src/modules/invoices/invoices.test.ts (95.778 s)
 PASS  src/modules/loyalty/loyalty.service.test.ts (85.49 s)
 PASS  src/modules/booking-photos/booking-photos.test.ts (112.16 s)
 PASS  src/modules/gift-cards/gift-cards.test.ts (126.088 s)
 PASS  src/modules/payroll/payroll.test.ts (68.385 s)
 PASS  src/modules/packages/packages.test.ts (53.491 s)
 PASS  src/modules/pos/pos.test.ts (56.628 s)
 PASS  src/jobs/birthday.job.test.ts (58.024 s)
 FAIL  src/middleware/auth.test.ts (39.984 s)
  ● requireAuth › calls next() and sets req.user for a valid Bearer token

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: called with 0 arguments

    Number of calls: 0

      84 |     requireAuth(req as Request, res, next);
      85 |
    > 86 |     expect(next).toHaveBeenCalledWith(); // called with no error
         |                  ^
      87 |     expect((req as unknown as { user: unknown }).user).toMatchObject({
      88 |       id:             'u1',
      89 |       email:          'test@example.com',

      at Object.<anonymous> (src/middleware/auth.test.ts:86:18)

  ● requireAuth › calls next(AppError 401) for an invalid/tampered token

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: Any<AppError>

    Number of calls: 0

      127 |     requireAuth(req, res, next);
      128 |
    > 129 |     expect(next).toHaveBeenCalledWith(expect.any(AppError));
          |                  ^
      130 |     const err = (next as jest.Mock).mock.calls[0][0] as AppError;
      131 |     expect(err.statusCode).toBe(401);
      132 |   });

      at Object.<anonymous> (src/middleware/auth.test.ts:129:18)

 PASS  src/jobs/rebook-nudge.job.test.ts (9.004 s)
 PASS  src/modules/styles/styles.test.ts (102.956 s)
 PASS  src/modules/health-flags/health-flags.test.ts (35.329 s)
 PASS  src/modules/memberships/memberships.test.ts (41.306 s)
 PASS  src/modules/whatsapp/whatsapp.queue.test.ts (15.064 s)
 PASS  src/modules/uploads/uploads.test.ts (48.454 s)
 FAIL  src/modules/social/social.test.ts (59.144 s)
  ● /api/social › SOCIAL_BOOKING_ENABLED=false › 503 — feature disabled

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      169 |         .set('Authorization', `Bearer ${makeToken('ADMIN')}`);
      170 |
    > 171 |       expect(res.status).toBe(503);
          |                          ^
      172 |     });
      173 |   });
      174 | });

      at Object.<anonymous> (src/modules/social/social.test.ts:171:26)

 PASS  src/modules/customer-stats/customer-stats.test.ts (49.771 s)
 PASS  src/modules/push/push.service.test.ts (41.748 s)
 PASS  src/middleware/requireLeadAccess.test.ts (51.388 s)
 PASS  src/jobs/ai-suggestion.job.test.ts (68.9 s)
 PASS  src/modules/artists/artist-media.service.test.ts (78.937 s)
 PASS  src/modules/social/social.service.test.ts (56.69 s)
 PASS  src/modules/alerts/alerts.test.ts (115.802 s)
 PASS  src/modules/loyalty/loyalty.test.ts (101.503 s)
 PASS  src/jobs/no-show.job.test.ts (51.519 s)
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Summary of all failing tests
 FAIL  src/modules/calendar/calendar.service.test.ts
  ● syncCreateEvent › skips when CALENDAR_ENABLED flag is off

    expect(jest.fn()).not.toHaveBeenCalled()

    Expected number of calls: 0
    Received number of calls: 1

    1: {"generateAuthUrl": [Function mockConstructor], "getToken": [Function mockConstructor], "setCredentials": [Function mockConstructor]}, {"attendeeEmail": "jane@example.com", "description": "Sleeve piece", "endAt": 2026-04-15T12:00:00.000Z, "startAt": 2026-04-15T10:00:00.000Z, "summary": "Jane Smith — Tattoo Session @ Test Studio"}

      398 |     });
      399 |     await svc.syncCreateEvent(bookingId);
    > 400 |     expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
          |                                         ^
      401 |     expect(mockBookingFindUnique).not.toHaveBeenCalled();
      402 |   });
      403 |

      at Object.<anonymous> (src/modules/calendar/calendar.service.test.ts:400:41)

  ● syncDeleteEvent › skips when CALENDAR_ENABLED flag is off

    expect(jest.fn()).not.toHaveBeenCalled()

    Expected number of calls: 0
    Received number of calls: 1

    1: {"generateAuthUrl": [Function mockConstructor], "getToken": [Function mockConstructor], "setCredentials": [Function mockConstructor]}, "event_to_delete"

      529 |     });
      530 |     await svc.syncDeleteEvent(bookingId);
    > 531 |     expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
          |                                         ^
      532 |   });
      533 |
      534 |   it('skips when booking not found', async () => {

      at Object.<anonymous> (src/modules/calendar/calendar.service.test.ts:531:41)

 FAIL  src/modules/sessions/sessions.test.ts
  ● Test suite failed to run

    src/modules/sessions/sessions.test.ts:633:1 - error TS1005: '}' expected.

    633 
        

      src/modules/sessions/sessions.test.ts:277:43
        277 describe('PATCH /api/sessions/:id', () => {
                                                      ~
        The parser expected to find a '}' to match the '{' token here.

 FAIL  src/modules/customers/customers.service.test.ts (5.23 s)
  ● cancelMyBooking › allows cancellation inside window when CANCELLATION_FEE_ENABLED is false

    TypeError: Cannot read properties of undefined (reading 'includes')

      88 |     // DB unavailable — fall back to static defaults
      89 |     const rawType = process.env['BUSINESS_TYPE'];
    > 90 |     const type: BusinessType = (BUSINESS_TYPES as readonly string[]).includes(rawType ?? '')
         |                                                                      ^
      91 |       ? (rawType as BusinessType)
      92 |       : activeBusinessType;
      93 |     enabled = getDefaultFlags(type)[flag] ?? false;

      at isFeatureEnabled (src/middleware/requireFeature.ts:90:70)
      at cancelMyBooking (src/modules/customers/customers.service.ts:260:23)
      at Object.<anonymous> (src/modules/customers/customers.service.test.ts:318:20)

  ● cancelMyBooking › cancels inside window and logs fee stub when CANCELLATION_FEE_ENABLED is true

    TypeError: Cannot read properties of undefined (reading 'includes')

      88 |     // DB unavailable — fall back to static defaults
      89 |     const rawType = process.env['BUSINESS_TYPE'];
    > 90 |     const type: BusinessType = (BUSINESS_TYPES as readonly string[]).includes(rawType ?? '')
         |                                                                      ^
      91 |       ? (rawType as BusinessType)
      92 |       : activeBusinessType;
      93 |     enabled = getDefaultFlags(type)[flag] ?? false;

      at isFeatureEnabled (src/middleware/requireFeature.ts:90:70)
      at cancelMyBooking (src/modules/customers/customers.service.ts:260:23)
      at Object.<anonymous> (src/modules/customers/customers.service.test.ts:332:20)

 FAIL  src/modules/capture/capture.service.test.ts (5.454 s)
  ● captureLeadPublic › forwards ipAddress to createLead

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: Any<Object>, "203.0.113.10"
    Received: {"artistId": undefined, "colorPreference": "Black & grey", "country": "GB", "description": "Looking for a sleeve tattoo", "deviceType": undefined, "email": "alice@example.com", "marketingConsent": false, "name": "Alice Ink", "pageVisited": "/contact", "phone": "+441234567890", "placement": {"area": "left_arm"}, "preferWhatsApp": false, "preferredDates": null, "referenceImages": [], "serviceId": undefined, "sessionId": undefined, "size": "Large", "source": "instagram", "styleId": undefined, "utmCampaign": undefined, "utmMedium": undefined, "utmSource": undefined, "website": undefined}, "203.0.113.10", null

    Number of calls: 1

      395 |   it('forwards ipAddress to createLead', async () => {
      396 |     await captureLeadPublic(baseBody, '203.0.113.10');
    > 397 |     expect(mockCreateLead).toHaveBeenCalledWith(
          |                            ^
      398 |       expect.any(Object),
      399 |       '203.0.113.10',
      400 |     );

      at Object.<anonymous> (src/modules/capture/capture.service.test.ts:397:28)

 FAIL  src/modules/calendar/outlook-calendar.service.test.ts
  ● syncOutlookCreateEvent › creates event and stores outlook-prefixed id

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 0

      250 |     await svc.syncOutlookCreateEvent(bookingId);
      251 |
    > 252 |     expect(mockCreateOutlookEvent).toHaveBeenCalledTimes(1);
          |                                    ^
      253 |     expect(mockBookingUpdate).toHaveBeenCalledWith({
      254 |       where: { id: bookingId },
      255 |       data:  { calendarEventId: 'outlook:ms-event-id-123' },

      at Object.<anonymous> (src/modules/calendar/outlook-calendar.service.test.ts:252:36)

  ● syncOutlookUpdateEvent › updates event when calendarEventId has outlook: prefix

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: ObjectContaining {"accessToken": "ms-access"}, "event-abc", ObjectContaining {"summary": StringContaining "John Smith"}

    Number of calls: 0

      297 |
      298 |     await svc.syncOutlookUpdateEvent(bookingId);
    > 299 |     expect(mockUpdateOutlookEvent).toHaveBeenCalledWith(
          |                                    ^
      300 |       expect.objectContaining({ accessToken: 'ms-access' }),
      301 |       'event-abc',
      302 |       expect.objectContaining({ summary: expect.stringContaining('John Smith') }),

      at Object.<anonymous> (src/modules/calendar/outlook-calendar.service.test.ts:299:36)

  ● syncOutlookUpdateEvent › creates new event when no outlook: prefix

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 0

      318 |
      319 |     await svc.syncOutlookUpdateEvent(bookingId);
    > 320 |     expect(mockCreateOutlookEvent).toHaveBeenCalledTimes(1);
          |                                    ^
      321 |   });
      322 | });
      323 |

      at Object.<anonymous> (src/modules/calendar/outlook-calendar.service.test.ts:320:36)

  ● syncOutlookDeleteEvent › deletes event and clears calendarEventId

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: ObjectContaining {"accessToken": "ms-access"}, "event-del"

    Number of calls: 0

      335 |     await svc.syncOutlookDeleteEvent(bookingId);
      336 |
    > 337 |     expect(mockDeleteOutlookEvent).toHaveBeenCalledWith(
          |                                    ^
      338 |       expect.objectContaining({ accessToken: 'ms-access' }),
      339 |       'event-del',
      340 |     );

      at Object.<anonymous> (src/modules/calendar/outlook-calendar.service.test.ts:337:36)

 FAIL  src/modules/reviews/reviews.queue.test.ts
  ● enqueueReviewRequest › skips enqueueing when REVIEW_REQUEST_ENABLED flag is OFF

    expect(jest.fn()).not.toHaveBeenCalled()

    Expected number of calls: 0
    Received number of calls: 1

    1: "review-request", {"artistName": undefined, "bookingId": "clabcdefg0000000000000001", "customerEmail": "jane@example.com", "customerName": "Jane Smith", "googleReviewUrl": "https://g.page/r/CBlack_Rose/review", "serviceName": undefined, "studioName": "Black Rose Studio"}, {"delay": 129600000}

      193 |
      194 |     await enqueueReviewRequest(baseParams);
    > 195 |     expect(mockQueueAdd).not.toHaveBeenCalled();
          |                              ^
      196 |
      197 |     spy.mockRestore();
      198 |   });

      at Object.<anonymous> (src/modules/reviews/reviews.queue.test.ts:195:30)

 FAIL  src/modules/webhooks/webhooks.service.test.ts
  ● Test suite failed to run

    src/modules/webhooks/webhooks.service.test.ts:120:30 - error TS2554: Expected 2 arguments, but got 1.

    120     const result = await svc.listWebhooks({ page: 1, limit: 20, isActive: undefined });
                                     ~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:103:3
        103   query: ListWebhooksQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:131:30 - error TS2554: Expected 2 arguments, but got 1.

    131     const result = await svc.listWebhooks({ page: 1, limit: 20, isActive: true });
                                     ~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:103:3
        103   query: ListWebhooksQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:143:30 - error TS2554: Expected 2 arguments, but got 1.

    143     const result = await svc.listWebhooks({ page: 1, limit: 20, isActive: undefined });
                                     ~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:103:3
        103   query: ListWebhooksQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:158:30 - error TS2554: Expected 2 arguments, but got 1.

    158     const result = await svc.getWebhookById('wh_1');
                                     ~~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:123:63
        123 export async function getWebhookById(tenantId: string | null, id: string): Promise<WebhookPublic> {
                                                                          ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:167:22 - error TS2554: Expected 2 arguments, but got 1.

    167     await expect(svc.getWebhookById('wh_missing')).rejects.toMatchObject({
                             ~~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:123:63
        123 export async function getWebhookById(tenantId: string | null, id: string): Promise<WebhookPublic> {
                                                                          ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:182:30 - error TS2554: Expected 2 arguments, but got 1.

    182     const result = await svc.createWebhook({
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:149:62
        149 export async function createWebhook(tenantId: string | null, data: CreateWebhookBody): Promise<WebhookWithSecret> {
                                                                         ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:206:30 - error TS2554: Expected 2 arguments, but got 1.

    206     const result = await svc.createWebhook({
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:149:62
        149 export async function createWebhook(tenantId: string | null, data: CreateWebhookBody): Promise<WebhookWithSecret> {
                                                                         ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:217:15 - error TS2554: Expected 2 arguments, but got 1.

    217     await svc.createWebhook({
                      ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:149:62
        149 export async function createWebhook(tenantId: string | null, data: CreateWebhookBody): Promise<WebhookWithSecret> {
                                                                         ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:240:30 - error TS2554: Expected 3 arguments, but got 2.

    240     const result = await svc.updateWebhook('wh_1', { url: 'https://new.example.com/hook' });
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:178:3
        178   data: UpdateWebhookBody,
              ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:252:30 - error TS2554: Expected 3 arguments, but got 2.

    252     const result = await svc.updateWebhook('wh_1', { events: ['payment.succeeded'] });
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:178:3
        178   data: UpdateWebhookBody,
              ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:261:30 - error TS2554: Expected 3 arguments, but got 2.

    261     const result = await svc.updateWebhook('wh_1', { isActive: false });
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:178:3
        178   data: UpdateWebhookBody,
              ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:270:30 - error TS2554: Expected 3 arguments, but got 2.

    270     const result = await svc.updateWebhook('wh_1', { description: null });
                                     ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:178:3
        178   data: UpdateWebhookBody,
              ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:278:22 - error TS2554: Expected 3 arguments, but got 2.

    278     await expect(svc.updateWebhook('wh_missing', { isActive: false })).rejects.toMatchObject({
                             ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:178:3
        178   data: UpdateWebhookBody,
              ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'data' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:303:22 - error TS2554: Expected 2 arguments, but got 1.

    303     await expect(svc.deleteWebhook('wh_1')).resolves.toBeUndefined();
                             ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:204:62
        204 export async function deleteWebhook(tenantId: string | null, id: string): Promise<void> {
                                                                         ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:310:22 - error TS2554: Expected 2 arguments, but got 1.

    310     await expect(svc.deleteWebhook('wh_missing')).rejects.toMatchObject({
                             ~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:204:62
        204 export async function deleteWebhook(tenantId: string | null, id: string): Promise<void> {
                                                                         ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:327:30 - error TS2554: Expected 3 arguments, but got 2.

    327     const result = await svc.listWebhookDeliveries('wh_1', {
                                     ~~~~~~~~~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:222:3
        222   query:     ListDeliveriesQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:343:15 - error TS2554: Expected 3 arguments, but got 2.

    343     await svc.listWebhookDeliveries('wh_1', { page: 1, limit: 20, success: false });
                      ~~~~~~~~~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:222:3
        222   query:     ListDeliveriesQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:356:11 - error TS2554: Expected 3 arguments, but got 2.

    356       svc.listWebhookDeliveries('wh_missing', { page: 1, limit: 20, success: undefined }),
                  ~~~~~~~~~~~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:222:3
        222   query:     ListDeliveriesQuery,
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'query' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:372:30 - error TS2554: Expected 2 arguments, but got 1.

    372     const result = await svc.testWebhook('wh_1');
                                     ~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:251:60
        251 export async function testWebhook(tenantId: string | null, id: string): Promise<{ queued: true }> {
                                                                       ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:385:22 - error TS2554: Expected 2 arguments, but got 1.

    385     await expect(svc.testWebhook('wh_1')).rejects.toMatchObject({
                             ~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:251:60
        251 export async function testWebhook(tenantId: string | null, id: string): Promise<{ queued: true }> {
                                                                       ~~~~~~~~~~
        An argument for 'id' was not provided.
    src/modules/webhooks/webhooks.service.test.ts:394:22 - error TS2554: Expected 2 arguments, but got 1.

    394     await expect(svc.testWebhook('wh_missing')).rejects.toMatchObject({
                             ~~~~~~~~~~~

      src/modules/webhooks/webhooks.service.ts:251:60
        251 export async function testWebhook(tenantId: string | null, id: string): Promise<{ queued: true }> {
                                                                       ~~~~~~~~~~
        An argument for 'id' was not provided.

 FAIL  src/modules/calendar/apple-calendar.service.test.ts
  ● syncAppleCreateEvent › creates event and stores apple-prefixed id

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 0

      231 |     await svc.syncAppleCreateEvent(bookingId);
      232 |
    > 233 |     expect(mockCreateAppleEvent).toHaveBeenCalledTimes(1);
          |                                  ^
      234 |     expect(mockBookingUpdate).toHaveBeenCalledWith({
      235 |       where: { id: bookingId },
      236 |       data:  { calendarEventId: 'apple:test-uuid-1234' },

      at Object.<anonymous> (src/modules/calendar/apple-calendar.service.test.ts:233:34)

  ● syncAppleUpdateEvent › updates event when calendarEventId has apple: prefix

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 0

      277 |
      278 |     await svc.syncAppleUpdateEvent(bookingId);
    > 279 |     expect(mockUpdateAppleEvent).toHaveBeenCalledTimes(1);
          |                                  ^
      280 |     expect(mockUpdateAppleEvent).toHaveBeenCalledWith(
      281 |       expect.objectContaining({ username: 'user@example.com' }),
      282 |       expect.objectContaining({ uid: 'test-uid-abc' }),

      at Object.<anonymous> (src/modules/calendar/apple-calendar.service.test.ts:279:34)

  ● syncAppleUpdateEvent › creates new event when no apple: prefix

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 0

      298 |
      299 |     await svc.syncAppleUpdateEvent(bookingId);
    > 300 |     expect(mockCreateAppleEvent).toHaveBeenCalledTimes(1);
          |                                  ^
      301 |   });
      302 | });
      303 |

      at Object.<anonymous> (src/modules/calendar/apple-calendar.service.test.ts:300:34)

  ● syncAppleDeleteEvent › deletes event and clears calendarEventId

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: ObjectContaining {"username": "user@example.com"}, "uid-to-delete"

    Number of calls: 0

      315 |     await svc.syncAppleDeleteEvent(bookingId);
      316 |
    > 317 |     expect(mockDeleteAppleEvent).toHaveBeenCalledWith(
          |                                  ^
      318 |       expect.objectContaining({ username: 'user@example.com' }),
      319 |       'uid-to-delete',
      320 |     );

      at Object.<anonymous> (src/modules/calendar/apple-calendar.service.test.ts:317:34)

 FAIL  src/modules/leads/leads.test.ts (186.547 s)
  ● POST /api/leads › 503 — LEAD_CAPTURE_ENABLED=false returns feature disabled

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 201

      112 |
      113 |     process.env['BUSINESS_TYPE'] = originalBT;
    > 114 |     expect(res.status).toBe(503);
          |                        ^
      115 |     expect(res.body.error.code).toBe('FEATURE_DISABLED');
      116 |   });
      117 | });

      at Object.<anonymous> (src/modules/leads/leads.test.ts:114:24)

 FAIL  src/modules/public/public.test.ts (183.162 s)
  ● /api/public › POST /api/public/businesses/:slug/bookings › 201 — creates booking

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 500

      215 |         });
      216 |
    > 217 |       expect(res.status).toBe(201);
          |                          ^
      218 |       expect(res.body.data.publicToken).toBe('d4e5f6a7-b8c9-0123-def0-123456789abc');
      219 |     });
      220 |

      at Object.<anonymous> (src/modules/public/public.test.ts:217:26)

  ● /api/public › PUBLIC_BOOKING_ENABLED=false › 503 — feature disabled

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      272 |
      273 |       const res = await request(app).get('/api/public/businesses/test-studio');
    > 274 |       expect(res.status).toBe(503);
          |                          ^
      275 |     });
      276 |   });
      277 | });

      at Object.<anonymous> (src/modules/public/public.test.ts:274:26)

 FAIL  src/modules/calendar/calendar.test.ts (203.129 s)
  ● GET /api/calendar/auth-url › 503 when CALENDAR_ENABLED feature flag is off

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      156 |         .get('/api/calendar/auth-url')
      157 |         .set('Authorization', makeToken('ARTIST'));
    > 158 |       expect(res.status).toBe(503);
          |                          ^
      159 |     });
      160 |   });
      161 | });

      at src/modules/calendar/calendar.test.ts:158:26
      at withBusinessType (src/modules/calendar/calendar.test.ts:95:9)
      at Object.<anonymous> (src/modules/calendar/calendar.test.ts:154:5)

  ● GET /api/calendar/status › 503 when CALENDAR_ENABLED feature flag is off

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      232 |         .get('/api/calendar/status')
      233 |         .set('Authorization', makeToken('ARTIST'));
    > 234 |       expect(res.status).toBe(503);
          |                          ^
      235 |     });
      236 |   });
      237 | });

      at src/modules/calendar/calendar.test.ts:234:26
      at withBusinessType (src/modules/calendar/calendar.test.ts:95:9)
      at Object.<anonymous> (src/modules/calendar/calendar.test.ts:230:5)

 FAIL  src/modules/waitlist/waitlist.test.ts (229.471 s)
  ● POST /api/waitlist › 503 — WAITING_LIST_ENABLED=false returns feature disabled

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 409

      141 |
      142 |     process.env['BUSINESS_TYPE'] = prev;
    > 143 |     expect(res.status).toBe(503);
          |                        ^
      144 |     expect(res.body.error.code).toBe('FEATURE_DISABLED');
      145 |   });
      146 | });

      at Object.<anonymous> (src/modules/waitlist/waitlist.test.ts:143:24)

 FAIL  src/modules/pricing/pricing.test.ts (84.162 s)
  ● GET /api/pricing-rules › returns empty list when no rules

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      132 |       .set('Authorization', `Bearer ${adminToken}`);
      133 |
    > 134 |     expect(res.status).toBe(200);
          |                        ^
      135 |     expect(res.body.data).toEqual([]);
      136 |   });
      137 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:134:24)

  ● GET /api/pricing-rules › returns list of rules

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      143 |       .set('Authorization', `Bearer ${adminToken}`);
      144 |
    > 145 |     expect(res.status).toBe(200);
          |                        ^
      146 |     expect(res.body.data).toHaveLength(1);
      147 |     expect(res.body.data[0].id).toBe('rule_1');
      148 |   });

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:145:24)

  ● POST /api/pricing-rules › creates rule successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 503

      169 |       .send(validBody);
      170 |
    > 171 |     expect(res.status).toBe(201);
          |                        ^
      172 |     expect(res.body.data.id).toBe('rule_1');
      173 |   });
      174 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:171:24)

  ● POST /api/pricing-rules › returns 400 for invalid body (missing ruleType)

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 503

      179 |       .send({ adjustmentType: 'FLAT', adjustmentValue: 10 });
      180 |
    > 181 |     expect(res.status).toBe(400);
          |                        ^
      182 |   });
      183 |
      184 |   it('returns 404 when serviceId not found', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:181:24)

  ● POST /api/pricing-rules › returns 404 when serviceId not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      190 |       .send({ ...validBody, serviceId: 'nonexistent' });
      191 |
    > 192 |     expect(res.status).toBe(404);
          |                        ^
      193 |   });
      194 | });
      195 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:192:24)

  ● PATCH /api/pricing-rules/:id › updates rule successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      206 |       .send({ priority: 5 });
      207 |
    > 208 |     expect(res.status).toBe(200);
          |                        ^
      209 |   });
      210 |
      211 |   it('returns 404 when rule not found', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:208:24)

  ● PATCH /api/pricing-rules/:id › returns 404 when rule not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      217 |       .send({ priority: 5 });
      218 |
    > 219 |     expect(res.status).toBe(404);
          |                        ^
      220 |   });
      221 |
      222 |   it('returns 403 when rule belongs to different tenant', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:219:24)

  ● PATCH /api/pricing-rules/:id › returns 403 when rule belongs to different tenant

    expect(received).toBe(expected) // Object.is equality

    Expected: 403
    Received: 503

      228 |       .send({ priority: 5 });
      229 |
    > 230 |     expect(res.status).toBe(403);
          |                        ^
      231 |   });
      232 | });
      233 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:230:24)

  ● DELETE /api/pricing-rules/:id › deletes rule successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 204
    Received: 503

      243 |       .set('Authorization', `Bearer ${adminToken}`);
      244 |
    > 245 |     expect(res.status).toBe(204);
          |                        ^
      246 |   });
      247 |
      248 |   it('returns 404 when rule not found', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:245:24)

  ● DELETE /api/pricing-rules/:id › returns 404 when rule not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      253 |       .set('Authorization', `Bearer ${adminToken}`);
      254 |
    > 255 |     expect(res.status).toBe(404);
          |                        ^
      256 |   });
      257 | });
      258 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:255:24)

  ● GET /api/pricing-rules/calculate › returns calculated price

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      273 |       .query({ serviceId: 'svc_1', slotDateTime: '2025-06-07T10:00:00Z' });
      274 |
    > 275 |     expect(res.status).toBe(200);
          |                        ^
      276 |     expect(res.body.data.adjustedPrice).toBe(120);
      277 |   });
      278 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:275:24)

  ● GET /api/pricing-rules/calculate › returns 404 when service has no price

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      285 |       .query({ serviceId: 'svc_1', slotDateTime: '2025-06-07T10:00:00Z' });
      286 |
    > 287 |     expect(res.status).toBe(404);
          |                        ^
      288 |   });
      289 |
      290 |   it('returns 400 for invalid slotDateTime', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:287:24)

  ● GET /api/pricing-rules/calculate › returns 400 for invalid slotDateTime

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 503

      294 |       .query({ serviceId: 'svc_1', slotDateTime: 'not-a-date' });
      295 |
    > 296 |     expect(res.status).toBe(400);
          |                        ^
      297 |   });
      298 |
      299 |   it('returns 400 when serviceId missing', async () => {

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:296:24)

  ● GET /api/pricing-rules/calculate › returns 400 when serviceId missing

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 503

      303 |       .query({ slotDateTime: '2025-06-07T10:00:00Z' });
      304 |
    > 305 |     expect(res.status).toBe(400);
          |                        ^
      306 |   });
      307 | });
      308 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:305:24)

 FAIL  src/modules/settings/settings.service.test.ts
  ● Test suite failed to run

    src/modules/settings/settings.service.test.ts:119:26 - error TS2554: Expected 1 arguments, but got 0.

    119     const result = await getCachedSettings();
                                 ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:131:26 - error TS2554: Expected 1 arguments, but got 0.

    131     const result = await getCachedSettings();
                                 ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:147:26 - error TS2554: Expected 1 arguments, but got 0.

    147     const result = await getCachedSettings();
                                 ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:158:26 - error TS2554: Expected 1 arguments, but got 0.

    158     const result = await getCachedSettings();
                                 ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:169:26 - error TS2554: Expected 1 arguments, but got 0.

    169     const result = await getCachedSettings();
                                 ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:178:11 - error TS2554: Expected 1 arguments, but got 0.

    178     await getCachedSettings();
                  ~~~~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:105:41
        105 export async function getCachedSettings(tenantId: string | null): Promise<PublicSettingsResult | null> {
                                                    ~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'tenantId' was not provided.
    src/modules/settings/settings.service.test.ts:198:26 - error TS2554: Expected 2 arguments, but got 1.

    198     const result = await updateSettings({ studioName: 'Updated Studio' });
                                 ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.
    src/modules/settings/settings.service.test.ts:214:11 - error TS2554: Expected 2 arguments, but got 1.

    214     await updateSettings({ studioName: 'New Name' });
                  ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.
    src/modules/settings/settings.service.test.ts:224:26 - error TS2554: Expected 2 arguments, but got 1.

    224     const result = await updateSettings({
                                 ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.
    src/modules/settings/settings.service.test.ts:241:7 - error TS2554: Expected 2 arguments, but got 1.

    241       updateSettings({ currency: 'EUR' }),
              ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.
    src/modules/settings/settings.service.test.ts:255:11 - error TS2554: Expected 2 arguments, but got 1.

    255     await updateSettings({ currency: 'USD' });
                  ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.
    src/modules/settings/settings.service.test.ts:271:7 - error TS2554: Expected 2 arguments, but got 1.

    271       updateSettings({ studioName: 'Resilient Studio' }),
              ~~~~~~~~~~~~~~

      src/modules/settings/settings.service.ts:157:3
        157   body: UpdateSettingsBody,
              ~~~~~~~~~~~~~~~~~~~~~~~~
        An argument for 'body' was not provided.

 FAIL  src/modules/payments/payments.test.ts (138.938 s)
  ● POST /api/payments/create-intent › returns 503 when ONLINE_PAYMENT_ENABLED is false for business type

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 201

      158 |       .send({ bookingId: BOOKING_ID });
      159 |
    > 160 |     expect(res.status).toBe(503);
          |                        ^
      161 |     expect(res.body.error.code).toBe('FEATURE_DISABLED');
      162 |   });
      163 | });

      at Object.<anonymous> (src/modules/payments/payments.test.ts:160:24)

 FAIL  src/modules/bookings/bookings.test.ts (45.089 s)
  ● PATCH /api/bookings/:id/confirm › 200 — ARTIST confirms PENDING booking

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      179 |       .set('Authorization', makeToken('ARTIST'));
      180 |
    > 181 |     expect(res.status).toBe(200);
          |                        ^
      182 |     expect(res.body.data.status).toBe('CONFIRMED');
      183 |   });
      184 |

      at Object.<anonymous> (src/modules/bookings/bookings.test.ts:181:24)

  ● PATCH /api/bookings/:id/reschedule › 200 — ARTIST reschedules CONFIRMED booking

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      245 |       .send({ startAt: newDate.toISOString(), endAt: newEndDate.toISOString() });
      246 |
    > 247 |     expect(res.status).toBe(200);
          |                        ^
      248 |   });
      249 | });
      250 |

      at Object.<anonymous> (src/modules/bookings/bookings.test.ts:247:24)

 FAIL  src/modules/quotes/quotes.test.ts (47.863 s)
  ● POST /api/quotes › 503 — QUOTE_SYSTEM_ENABLED=false returns feature disabled

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 404

      122 |
      123 |     process.env['BUSINESS_TYPE'] = originalBT;
    > 124 |     expect(res.status).toBe(503);
          |                        ^
      125 |   });
      126 |
      127 |   it('400 — missing required fields', async () => {

      at Object.<anonymous> (src/modules/quotes/quotes.test.ts:124:24)

 FAIL  src/modules/availability/availability.test.ts (76.083 s)
  ● DELETE /api/availability/blocks/:id › 200 — ARTIST deletes own block

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 204

      192 |       .set('Authorization', makeToken('ARTIST'));
      193 |
    > 194 |     expect(res.status).toBe(200);
          |                        ^
      195 |   });
      196 |
      197 |   it('401 — unauthenticated', async () => {

      at Object.<anonymous> (src/modules/availability/availability.test.ts:194:24)

 FAIL  src/modules/locations/locations.test.ts (111.398 s)
  ● GET /api/locations › returns empty list when no locations

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      110 |       .set('Authorization', `Bearer ${adminToken}`);
      111 |
    > 112 |     expect(res.status).toBe(200);
          |                        ^
      113 |     expect(res.body.data).toEqual([]);
      114 |   });
      115 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:112:24)

  ● GET /api/locations › returns list of locations

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      121 |       .set('Authorization', `Bearer ${adminToken}`);
      122 |
    > 123 |     expect(res.status).toBe(200);
          |                        ^
      124 |     expect(res.body.data).toHaveLength(1);
      125 |     expect(res.body.data[0].id).toBe('loc_1');
      126 |   });

      at Object.<anonymous> (src/modules/locations/locations.test.ts:123:24)

  ● GET /api/locations › filters by isActive=true

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      133 |       .set('Authorization', `Bearer ${adminToken}`);
      134 |
    > 135 |     expect(res.status).toBe(200);
          |                        ^
      136 |     expect(mockLocationFindMany).toHaveBeenCalledWith(
      137 |       expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
      138 |     );

      at Object.<anonymous> (src/modules/locations/locations.test.ts:135:24)

  ● POST /api/locations › creates location successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 503

      157 |       .send(validBody);
      158 |
    > 159 |     expect(res.status).toBe(201);
          |                        ^
      160 |     expect(res.body.data.id).toBe('loc_1');
      161 |   });
      162 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:159:24)

  ● POST /api/locations › returns 400 when name is missing

    expect(received).toBe(expected) // Object.is equality

    Expected: 400
    Received: 503

      167 |       .send({ city: 'London' });
      168 |
    > 169 |     expect(res.status).toBe(400);
          |                        ^
      170 |   });
      171 | });
      172 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:169:24)

  ● GET /api/locations/:id › returns location by id

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      181 |       .set('Authorization', `Bearer ${adminToken}`);
      182 |
    > 183 |     expect(res.status).toBe(200);
          |                        ^
      184 |     expect(res.body.data.id).toBe('loc_1');
      185 |   });
      186 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:183:24)

  ● GET /api/locations/:id › returns 404 when location not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      192 |       .set('Authorization', `Bearer ${adminToken}`);
      193 |
    > 194 |     expect(res.status).toBe(404);
          |                        ^
      195 |   });
      196 |
      197 |   it('returns 403 when location belongs to different tenant', async () => {

      at Object.<anonymous> (src/modules/locations/locations.test.ts:194:24)

  ● GET /api/locations/:id › returns 403 when location belongs to different tenant

    expect(received).toBe(expected) // Object.is equality

    Expected: 403
    Received: 503

      202 |       .set('Authorization', `Bearer ${adminToken}`);
      203 |
    > 204 |     expect(res.status).toBe(403);
          |                        ^
      205 |   });
      206 | });
      207 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:204:24)

  ● PATCH /api/locations/:id › updates location successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 503

      218 |       .send({ name: 'Updated Studio' });
      219 |
    > 220 |     expect(res.status).toBe(200);
          |                        ^
      221 |     expect(res.body.data.name).toBe('Updated Studio');
      222 |   });
      223 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:220:24)

  ● PATCH /api/locations/:id › returns 404 when location not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      230 |       .send({ name: 'X' });
      231 |
    > 232 |     expect(res.status).toBe(404);
          |                        ^
      233 |   });
      234 |
      235 |   it('returns 403 when location belongs to different tenant', async () => {

      at Object.<anonymous> (src/modules/locations/locations.test.ts:232:24)

  ● PATCH /api/locations/:id › returns 403 when location belongs to different tenant

    expect(received).toBe(expected) // Object.is equality

    Expected: 403
    Received: 503

      241 |       .send({ name: 'X' });
      242 |
    > 243 |     expect(res.status).toBe(403);
          |                        ^
      244 |   });
      245 | });
      246 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:243:24)

  ● DELETE /api/locations/:id › deletes location successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 204
    Received: 503

      256 |       .set('Authorization', `Bearer ${adminToken}`);
      257 |
    > 258 |     expect(res.status).toBe(204);
          |                        ^
      259 |   });
      260 |
      261 |   it('returns 404 when location not found', async () => {

      at Object.<anonymous> (src/modules/locations/locations.test.ts:258:24)

  ● DELETE /api/locations/:id › returns 404 when location not found

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 503

      266 |       .set('Authorization', `Bearer ${adminToken}`);
      267 |
    > 268 |     expect(res.status).toBe(404);
          |                        ^
      269 |   });
      270 |
      271 |   it('returns 403 when location belongs to different tenant', async () => {

      at Object.<anonymous> (src/modules/locations/locations.test.ts:268:24)

  ● DELETE /api/locations/:id › returns 403 when location belongs to different tenant

    expect(received).toBe(expected) // Object.is equality

    Expected: 403
    Received: 503

      276 |       .set('Authorization', `Bearer ${adminToken}`);
      277 |
    > 278 |     expect(res.status).toBe(403);
          |                        ^
      279 |   });
      280 | });
      281 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:278:24)

 FAIL  src/modules/features/features.test.ts (26.787 s)
  ● LEAD_CAPTURE_ENABLED flag › restaurant — LEAD_CAPTURE_ENABLED=false → 503 FEATURE_DISABLED

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 400

      127 |       const res = await request(app).post('/api/leads').send(leadBody);
      128 |
    > 129 |       expect(res.status).toBe(503);
          |                          ^
      130 |       expect(res.body.success).toBe(false);
      131 |       expect(res.body.error.code).toBe('FEATURE_DISABLED');
      132 |     });

      at src/modules/features/features.test.ts:129:26
      at withBusinessType (src/modules/features/features.test.ts:72:5)
      at Object.<anonymous> (src/modules/features/features.test.ts:126:5)

 FAIL  src/modules/recurring-bookings/recurring-bookings.test.ts (30.276 s)
  ● Feature flag gating › 503 — when RECURRING_BOOKINGS_ENABLED is false

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      231 |     process.env['BUSINESS_TYPE'] = orig;
      232 |
    > 233 |     expect(res.status).toBe(503);
          |                        ^
      234 |   });
      235 | });
      236 |

      at Object.<anonymous> (src/modules/recurring-bookings/recurring-bookings.test.ts:233:24)

 FAIL  src/modules/campaigns/campaigns.test.ts (72.999 s)
  ● Feature flag gating › 503 — when CAMPAIGNS_ENABLED is false

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      222 |     process.env['BUSINESS_TYPE'] = orig;
      223 |
    > 224 |     expect(res.status).toBe(503);
          |                        ^
      225 |   });
      226 | });
      227 |

      at Object.<anonymous> (src/modules/campaigns/campaigns.test.ts:224:24)

 FAIL  src/modules/rota/rota.test.ts (83.015 s)
  ● DELETE /api/rota/shifts/:id › returns 200 on successful delete

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 204

      227 |       .set('Authorization', `Bearer ${makeToken('ADMIN')}`);
      228 |
    > 229 |     expect(res.status).toBe(200);
          |                        ^
      230 |     expect(res.body.data.deleted).toBe(true);
      231 |   });
      232 | });

      at Object.<anonymous> (src/modules/rota/rota.test.ts:229:24)

 FAIL  src/middleware/auth.test.ts (39.984 s)
  ● requireAuth › calls next() and sets req.user for a valid Bearer token

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: called with 0 arguments

    Number of calls: 0

      84 |     requireAuth(req as Request, res, next);
      85 |
    > 86 |     expect(next).toHaveBeenCalledWith(); // called with no error
         |                  ^
      87 |     expect((req as unknown as { user: unknown }).user).toMatchObject({
      88 |       id:             'u1',
      89 |       email:          'test@example.com',

      at Object.<anonymous> (src/middleware/auth.test.ts:86:18)

  ● requireAuth › calls next(AppError 401) for an invalid/tampered token

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: Any<AppError>

    Number of calls: 0

      127 |     requireAuth(req, res, next);
      128 |
    > 129 |     expect(next).toHaveBeenCalledWith(expect.any(AppError));
          |                  ^
      130 |     const err = (next as jest.Mock).mock.calls[0][0] as AppError;
      131 |     expect(err.statusCode).toBe(401);
      132 |   });

      at Object.<anonymous> (src/middleware/auth.test.ts:129:18)

 FAIL  src/modules/social/social.test.ts (59.144 s)
  ● /api/social › SOCIAL_BOOKING_ENABLED=false › 503 — feature disabled

    expect(received).toBe(expected) // Object.is equality

    Expected: 503
    Received: 200

      169 |         .set('Authorization', `Bearer ${makeToken('ADMIN')}`);
      170 |
    > 171 |       expect(res.status).toBe(503);
          |                          ^
      172 |     });
      173 |   });
      174 | });

      at Object.<anonymous> (src/modules/social/social.test.ts:171:26)


Test Suites: 25 failed, 77 passed, 102 total
Tests:       60 failed, 1695 passed, 1755 total
Snapshots:   0 total
Time:        816.499 s
Ran all test suites.

