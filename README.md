Last login: Sun Apr 19 14:22:21 on ttys000
neilapacesaite@Neilas-MacBook-Pro ~ % cd ~/Desktop/Automation/backend && \
rm -f \
  src/modules/pricing/pricing.test.ts \
  src/modules/locations/locations.test.ts \
  src/modules/public/public.test.ts \
&& echo "3 OLD TEST FILES DELETED"
3 OLD TEST FILES DELETED
neilapacesaite@Neilas-MacBook-Pro backend % mkdir -p \
  src/modules/pricing \
  src/modules/locations \
  src/modules/public
neilapacesaite@Neilas-MacBook-Pro backend % BASE="https://raw.githubusercontent.com/MSHH88/BookingAutomation/copilot/create-detailed-automation-plan/backend"

curl -fsSL --create-dirs -o src/modules/pricing/pricing.test.ts   "$BASE/src/modules/pricing/pricing.test.ts"   && echo "OK 1/3 pricing.test.ts"   || echo "FAIL 1/3 pricing.test.ts"
curl -fsSL --create-dirs -o src/modules/locations/locations.test.ts "$BASE/src/modules/locations/locations.test.ts" && echo "OK 2/3 locations.test.ts" || echo "FAIL 2/3 locations.test.ts"
curl -fsSL --create-dirs -o src/modules/public/public.test.ts      "$BASE/src/modules/public/public.test.ts"      && echo "OK 3/3 public.test.ts"    || echo "FAIL 3/3 public.test.ts"
OK 1/3 pricing.test.ts
OK 2/3 locations.test.ts
OK 3/3 public.test.ts
neilapacesaite@Neilas-MacBook-Pro backend % npm test -- --no-coverage --forceExit

> automation-backend@1.0.0 test
> jest --clearCache --silent && jest --passWithNoTests --no-coverage --forceExit

Cleared /private/var/folders/lv/nzz8ww495y957l52cl56gs3r0000gn/T/jest_dx
 PASS  src/modules/quotes/quotes.service.test.ts (77.261 s)
 PASS  src/modules/waitlist/waitlist.service.test.ts (121.807 s)
 PASS  src/modules/services/services.service.test.ts (148.426 s)
 PASS  src/modules/notifications/notifications.service.test.ts (164.302 s)
 PASS  src/modules/payments/payments.service.test.ts (177.685 s)
 PASS  src/modules/analytics/analytics.service.test.ts (178.866 s)
 PASS  src/modules/leads/leads.service.test.ts (97.648 s)
 PASS  src/modules/admin/admin.service.test.ts (34.412 s)
 PASS  src/modules/availability/availability.service.test.ts (55.421 s)
 PASS  src/modules/bookings/bookings.service.test.ts (189.844 s)
 PASS  src/modules/invoices/invoices.service.test.ts (32.988 s)
 PASS  src/modules/customers/customers.service.test.ts (21.637 s)
 PASS  src/modules/calendar/calendar.service.test.ts (24.953 s)
 PASS  src/modules/reminders/reminders.queue.test.ts (17.101 s)
 PASS  src/modules/capture/capture.service.test.ts (21.362 s)
 PASS  src/modules/email-templates/email-templates.service.test.ts (13.119 s)
 PASS  src/modules/sms-templates/sms-templates.service.test.ts (13.115 s)
 PASS  src/modules/calendar/outlook-calendar.service.test.ts (6.934 s)
 PASS  src/modules/whatsapp-templates/whatsapp-templates.service.test.ts (14.429 s)
 PASS  src/modules/customer-stats/customer-stats.service.test.ts (15.123 s)
 PASS  src/modules/public/public.service.test.ts (21.78 s)
 PASS  src/modules/auth/auth.service.test.ts (44.744 s)
 PASS  src/modules/reviews/reviews.queue.test.ts (46.191 s)
 PASS  src/modules/uploads/uploads.service.test.ts (19.685 s)
 PASS  src/modules/calendar/apple-calendar.service.test.ts (54.756 s)
 PASS  src/modules/webhooks/webhooks.service.test.ts (73.36 s)
 PASS  src/modules/tables/tables.service.test.ts (26.839 s)
 PASS  src/lib/pricing-engine.test.ts (14.698 s)
 PASS  src/modules/products/products.service.test.ts (42.577 s)
 PASS  src/modules/forms/forms.service.test.ts (51.176 s)
 PASS  src/modules/calendar/calendar.test.ts (55.115 s)
 PASS  src/modules/leads/leads.test.ts (131.787 s)
 PASS  src/modules/artists/artists.test.ts (202.772 s)
 PASS  src/modules/waitlist/waitlist.test.ts (115.654 s)
 PASS  src/modules/sessions/sessions.test.ts (276.084 s)
 PASS  src/modules/campaigns/campaigns.service.test.ts (12.682 s)
 PASS  src/modules/referrals/referrals.service.test.ts (18.203 s)
 FAIL  src/modules/auth/auth.test.ts (283.053 s)
  ● POST /api/auth/forgot-password › 200 — known email creates reset token silently

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      294 |   });
      295 |
    > 296 |   it('200 — known email creates reset token silently', async () => {
          |   ^
      297 |     (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      298 |     (prisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      299 |     (prisma.passwordResetToken.create    as jest.Mock).mockResolvedValue({

      at src/modules/auth/auth.test.ts:296:3
      at Object.<anonymous> (src/modules/auth/auth.test.ts:283:1)

 PASS  src/modules/public/public.test.ts (47.682 s)
 PASS  src/modules/payments/payments.test.ts (47.433 s)
 PASS  src/modules/recurring-bookings/recurring-bookings.service.test.ts (69.054 s)
 PASS  src/modules/bookings/bookings.test.ts (81.399 s)
 PASS  src/modules/pricing/pricing.test.ts (59.008 s)
 PASS  src/modules/pos/pos.service.test.ts (24.411 s)
 PASS  src/modules/whatsapp-templates/whatsapp-templates.test.ts (54.146 s)
 PASS  src/modules/sms-templates/sms-templates.test.ts (60.421 s)
 PASS  src/modules/alerts/alerts.service.test.ts (20.213 s)
 PASS  src/config/businessType.test.ts (11.451 s)
 PASS  src/modules/email-templates/email-templates.test.ts (82.928 s)
 PASS  src/modules/memberships/memberships.service.test.ts (8.268 s)
 PASS  src/modules/settings/settings.service.test.ts (7.208 s)
 PASS  src/modules/packages/packages.service.test.ts (6.838 s)
 PASS  src/modules/gift-cards/gift-cards.service.test.ts (14.554 s)
 PASS  src/modules/locations/locations.test.ts (27.557 s)
 PASS  src/modules/forms/forms.test.ts (39.965 s)
 PASS  src/modules/analytics/analytics.test.ts (39.426 s)
 PASS  src/modules/quotes/quotes.test.ts (86.807 s)
 PASS  src/modules/styles/styles.service.test.ts (33.124 s)
 PASS  src/modules/tenants/tenants.service.test.ts (73.999 s)
 PASS  src/modules/ai/ai.service.test.ts (72.651 s)
 PASS  src/modules/tenants/tenants.test.ts (78.006 s)
 PASS  src/modules/referrals/referrals.test.ts (67.617 s)
 PASS  src/modules/availability/availability.test.ts (99.531 s)
 PASS  src/modules/services/services.test.ts (23.282 s)
 PASS  src/modules/features/features.test.ts (21.708 s)
 PASS  src/modules/settings/settings.test.ts (24.907 s)
 PASS  src/modules/roles/roles.service.test.ts (11.795 s)
 PASS  src/modules/recurring-bookings/recurring-bookings.test.ts (24.062 s)
 PASS  src/modules/products/products.test.ts (23.343 s)
 PASS  src/modules/health-flags/health-flags.service.test.ts (20.648 s)
 PASS  src/modules/booking-photos/booking-photos.service.test.ts (29.151 s)
 PASS  src/modules/roles/roles.test.ts (34.001 s)
 PASS  src/modules/campaigns/campaigns.test.ts (41.949 s)
 FAIL  src/modules/whatsapp/whatsapp.service.test.ts (561.604 s)
  ● enqueueLeadInquiry › enqueues lead-inquiry job with correct data when opt-in is set

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      297 |   };
      298 |
    > 299 |   it('enqueues lead-inquiry job with correct data when opt-in is set', async () => {
          |   ^
      300 |     await enqueueLeadInquiry(baseParams);
      301 |     expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      302 |     const [jobName, jobData] = mockQueueAdd.mock.calls[0] as [string, Record<string, unknown>];

      at src/modules/whatsapp/whatsapp.service.test.ts:299:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:290:1)

  ● enqueueLeadInquiry › handles queue.add failure gracefully without throwing

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      319 |   });
      320 |
    > 321 |   it('handles queue.add failure gracefully without throwing', async () => {
          |   ^
      322 |     mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'));
      323 |     await expect(enqueueLeadInquiry(baseParams)).resolves.toBeUndefined();
      324 |   });

      at src/modules/whatsapp/whatsapp.service.test.ts:321:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:290:1)

  ● enqueueBookingConfirmed › enqueues booking-confirmed immediately (no delay option)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      340 |   };
      341 |
    > 342 |   it('enqueues booking-confirmed immediately (no delay option)', async () => {
          |   ^
      343 |     await enqueueBookingConfirmed(baseParams);
      344 |     const confirmCall = (mockQueueAdd.mock.calls as [string, unknown, unknown?][])
      345 |       .find(([name]) => name === 'booking-confirmed');

      at src/modules/whatsapp/whatsapp.service.test.ts:342:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueueBookingConfirmed › enqueues appointment-reminder with positive delay for far-future startAt

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      348 |   });
      349 |
    > 350 |   it('enqueues appointment-reminder with positive delay for far-future startAt', async () => {
          |   ^
      351 |     await enqueueBookingConfirmed(baseParams);
      352 |     const reminderCall = (mockQueueAdd.mock.calls as [string, unknown, { delay: number }?][])
      353 |       .find(([name]) => name === 'appointment-reminder');

      at src/modules/whatsapp/whatsapp.service.test.ts:350:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueueBookingConfirmed › appointment-reminder delay equals startAt - 24h - now (approx)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      356 |   });
      357 |
    > 358 |   it('appointment-reminder delay equals startAt - 24h - now (approx)', async () => {
          |   ^
      359 |     await enqueueBookingConfirmed(baseParams);
      360 |     const reminderCall = (mockQueueAdd.mock.calls as [string, unknown, { delay: number }?][])
      361 |       .find(([name]) => name === 'appointment-reminder');

      at src/modules/whatsapp/whatsapp.service.test.ts:358:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueueBookingConfirmed › skips appointment-reminder when startAt is < 24 h from now

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      367 |   });
      368 |
    > 369 |   it('skips appointment-reminder when startAt is < 24 h from now', async () => {
          |   ^
      370 |     await enqueueBookingConfirmed({ ...baseParams, startAt: FUTURE_2H });
      371 |     const reminderCalls = (mockQueueAdd.mock.calls as [string][])
      372 |       .filter(([name]) => name === 'appointment-reminder');

      at src/modules/whatsapp/whatsapp.service.test.ts:369:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueueBookingConfirmed › still enqueues booking-confirmed when the reminder is skipped

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      374 |   });
      375 |
    > 376 |   it('still enqueues booking-confirmed when the reminder is skipped', async () => {
          |   ^
      377 |     await enqueueBookingConfirmed({ ...baseParams, startAt: FUTURE_2H });
      378 |     const confirmCalls = (mockQueueAdd.mock.calls as [string][])
      379 |       .filter(([name]) => name === 'booking-confirmed');

      at src/modules/whatsapp/whatsapp.service.test.ts:376:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueueBookingConfirmed › handles queue.add failure gracefully without throwing

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      391 |   });
      392 |
    > 393 |   it('handles queue.add failure gracefully without throwing', async () => {
          |   ^
      394 |     mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'));
      395 |     await expect(enqueueBookingConfirmed(baseParams)).resolves.toBeUndefined();
      396 |   });

      at src/modules/whatsapp/whatsapp.service.test.ts:393:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueuePostVisitReview › enqueues post-visit-review with a 2-hour delay (7 200 000 ms)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      411 |   };
      412 |
    > 413 |   it('enqueues post-visit-review with a 2-hour delay (7 200 000 ms)', async () => {
          |   ^
      414 |     await enqueuePostVisitReview(baseParams);
      415 |     expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      416 |     const opts = mockQueueAdd.mock.calls[0][2] as { delay: number };

      at src/modules/whatsapp/whatsapp.service.test.ts:413:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:403:1)

  ● enqueuePostVisitReview › includes googleReviewUrl in the job data

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      418 |   });
      419 |
    > 420 |   it('includes googleReviewUrl in the job data', async () => {
          |   ^
      421 |     await enqueuePostVisitReview(baseParams);
      422 |     const data = mockQueueAdd.mock.calls[0][1] as { googleReviewUrl: string };
      423 |     expect(data.googleReviewUrl).toBe('https://g.page/r/ABC/review');

      at src/modules/whatsapp/whatsapp.service.test.ts:420:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:403:1)

  ● enqueuePostVisitReview › includes jobName=post-visit-review in the job data

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      424 |   });
      425 |
    > 426 |   it('includes jobName=post-visit-review in the job data', async () => {
          |   ^
      427 |     await enqueuePostVisitReview(baseParams);
      428 |     const data = mockQueueAdd.mock.calls[0][1] as { jobName: string };
      429 |     expect(data.jobName).toBe('post-visit-review');

      at src/modules/whatsapp/whatsapp.service.test.ts:426:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:403:1)

  ● enqueuePostVisitReview › handles queue.add failure gracefully without throwing

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      440 |   });
      441 |
    > 442 |   it('handles queue.add failure gracefully without throwing', async () => {
          |   ^
      443 |     mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'));
      444 |     await expect(enqueuePostVisitReview(baseParams)).resolves.toBeUndefined();
      445 |   });

      at src/modules/whatsapp/whatsapp.service.test.ts:442:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:403:1)

  ● enqueuePostVisitReview › does not enqueue when googleReviewUrl is empty (avoids broken link in message)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      445 |   });
      446 |
    > 447 |   it('does not enqueue when googleReviewUrl is empty (avoids broken link in message)', async () => {
          |   ^
      448 |     await enqueuePostVisitReview({ ...baseParams, googleReviewUrl: '' });
      449 |     expect(mockQueueAdd).not.toHaveBeenCalled();
      450 |   });

      at src/modules/whatsapp/whatsapp.service.test.ts:447:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:403:1)

  ● enqueueRestaurantReminder › enqueues restaurant-reminder with correct delay (startAt − 2 h − now)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      466 |   };
      467 |
    > 468 |   it('enqueues restaurant-reminder with correct delay (startAt − 2 h − now)', async () => {
          |   ^
      469 |     await enqueueRestaurantReminder(baseParams);
      470 |     expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      471 |     const opts = mockQueueAdd.mock.calls[0][2] as { delay: number };

      at src/modules/whatsapp/whatsapp.service.test.ts:468:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:457:1)

  ● enqueueRestaurantReminder › includes partySize in the job data

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      475 |   });
      476 |
    > 477 |   it('includes partySize in the job data', async () => {
          |   ^
      478 |     await enqueueRestaurantReminder(baseParams);
      479 |     const data = mockQueueAdd.mock.calls[0][1] as { partySize: number };
      480 |     expect(data.partySize).toBe(4);

      at src/modules/whatsapp/whatsapp.service.test.ts:477:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:457:1)

  ● enqueueRestaurantReminder › skips when startAt is in the past (delay ≤ 0)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      481 |   });
      482 |
    > 483 |   it('skips when startAt is in the past (delay ≤ 0)', async () => {
          |   ^
      484 |     await enqueueRestaurantReminder({ ...baseParams, startAt: PAST_ISO });
      485 |     expect(mockQueueAdd).not.toHaveBeenCalled();
      486 |   });

      at src/modules/whatsapp/whatsapp.service.test.ts:483:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:457:1)

  ● enqueueRestaurantReminder › skips when startAt is < 2 h from now

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      486 |   });
      487 |
    > 488 |   it('skips when startAt is < 2 h from now', async () => {
          |   ^
      489 |     const nearFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 h
      490 |     await enqueueRestaurantReminder({ ...baseParams, startAt: nearFuture });
      491 |     expect(mockQueueAdd).not.toHaveBeenCalled();

      at src/modules/whatsapp/whatsapp.service.test.ts:488:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:457:1)

 PASS  src/modules/rota/rota.test.ts (52.292 s)
 PASS  src/modules/invoices/invoices.test.ts (46.497 s)
 PASS  src/modules/rota/rota.service.test.ts (63.613 s)
 PASS  src/modules/payroll/payroll.service.test.ts (31.969 s)
 PASS  src/modules/booking-photos/booking-photos.test.ts (63.976 s)
 PASS  src/modules/gift-cards/gift-cards.test.ts (63.525 s)
 PASS  src/modules/loyalty/loyalty.service.test.ts (46.434 s)
 PASS  src/modules/styles/styles.test.ts (74.661 s)
 PASS  src/middleware/auth.test.ts (85.059 s)
 PASS  src/jobs/birthday.job.test.ts (85.522 s)
 PASS  src/modules/memberships/memberships.test.ts (64.164 s)
 PASS  src/modules/payroll/payroll.test.ts (123.564 s)
 PASS  src/modules/packages/packages.test.ts (122.222 s)
 PASS  src/modules/health-flags/health-flags.test.ts (61.986 s)
 PASS  src/modules/uploads/uploads.test.ts (20.659 s)
 PASS  src/modules/pos/pos.test.ts (109.59 s)
 PASS  src/modules/whatsapp/whatsapp.queue.test.ts (8.267 s)
 PASS  src/jobs/rebook-nudge.job.test.ts (16.574 s)
 PASS  src/jobs/ai-suggestion.job.test.ts
 PASS  src/modules/artists/artist-media.service.test.ts (5.643 s)
 PASS  src/modules/social/social.test.ts (26.539 s)
 PASS  src/modules/alerts/alerts.test.ts (23.312 s)
 PASS  src/middleware/requireLeadAccess.test.ts
 PASS  src/modules/social/social.service.test.ts (5.386 s)
 PASS  src/modules/customer-stats/customer-stats.test.ts (24.461 s)
 PASS  src/modules/push/push.service.test.ts (11.576 s)
 PASS  src/modules/loyalty/loyalty.test.ts (21.884 s)
 PASS  src/jobs/no-show.job.test.ts (12.846 s)
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Summary of all failing tests
 FAIL  src/modules/auth/auth.test.ts (283.053 s)
  ● POST /api/auth/forgot-password › 200 — known email creates reset token silently

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      294 |   });
      295 |
    > 296 |   it('200 — known email creates reset token silently', async () => {
          |   ^
      297 |     (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      298 |     (prisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      299 |     (prisma.passwordResetToken.create    as jest.Mock).mockResolvedValue({

      at src/modules/auth/auth.test.ts:296:3
      at Object.<anonymous> (src/modules/auth/auth.test.ts:283:1)

 FAIL  src/modules/whatsapp/whatsapp.service.test.ts (561.604 s)
  ● enqueueLeadInquiry › enqueues lead-inquiry job with correct data when opt-in is set

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      297 |   };
      298 |
    > 299 |   it('enqueues lead-inquiry job with correct data when opt-in is set', async () => {
          |   ^
      300 |     await enqueueLeadInquiry(baseParams);
      301 |     expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      302 |     const [jobName, jobData] = mockQueueAdd.mock.calls[0] as [string, Record<string, unknown>];

      at src/modules/whatsapp/whatsapp.service.test.ts:299:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:290:1)

  ● enqueueLeadInquiry › handles queue.add failure gracefully without throwing

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      319 |   });
      320 |
    > 321 |   it('handles queue.add failure gracefully without throwing', async () => {
          |   ^
      322 |     mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'));
      323 |     await expect(enqueueLeadInquiry(baseParams)).resolves.toBeUndefined();
      324 |   });

      at src/modules/whatsapp/whatsapp.service.test.ts:321:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:290:1)

  ● enqueueBookingConfirmed › enqueues booking-confirmed immediately (no delay option)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      340 |   };
      341 |
    > 342 |   it('enqueues booking-confirmed immediately (no delay option)', async () => {
          |   ^
      343 |     await enqueueBookingConfirmed(baseParams);
      344 |     const confirmCall = (mockQueueAdd.mock.calls as [string, unknown, unknown?][])
      345 |       .find(([name]) => name === 'booking-confirmed');

      at src/modules/whatsapp/whatsapp.service.test.ts:342:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueueBookingConfirmed › enqueues appointment-reminder with positive delay for far-future startAt

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      348 |   });
      349 |
    > 350 |   it('enqueues appointment-reminder with positive delay for far-future startAt', async () => {
          |   ^
      351 |     await enqueueBookingConfirmed(baseParams);
      352 |     const reminderCall = (mockQueueAdd.mock.calls as [string, unknown, { delay: number }?][])
      353 |       .find(([name]) => name === 'appointment-reminder');

      at src/modules/whatsapp/whatsapp.service.test.ts:350:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueueBookingConfirmed › appointment-reminder delay equals startAt - 24h - now (approx)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      356 |   });
      357 |
    > 358 |   it('appointment-reminder delay equals startAt - 24h - now (approx)', async () => {
          |   ^
      359 |     await enqueueBookingConfirmed(baseParams);
      360 |     const reminderCall = (mockQueueAdd.mock.calls as [string, unknown, { delay: number }?][])
      361 |       .find(([name]) => name === 'appointment-reminder');

      at src/modules/whatsapp/whatsapp.service.test.ts:358:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueueBookingConfirmed › skips appointment-reminder when startAt is < 24 h from now

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      367 |   });
      368 |
    > 369 |   it('skips appointment-reminder when startAt is < 24 h from now', async () => {
          |   ^
      370 |     await enqueueBookingConfirmed({ ...baseParams, startAt: FUTURE_2H });
      371 |     const reminderCalls = (mockQueueAdd.mock.calls as [string][])
      372 |       .filter(([name]) => name === 'appointment-reminder');

      at src/modules/whatsapp/whatsapp.service.test.ts:369:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueueBookingConfirmed › still enqueues booking-confirmed when the reminder is skipped

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      374 |   });
      375 |
    > 376 |   it('still enqueues booking-confirmed when the reminder is skipped', async () => {
          |   ^
      377 |     await enqueueBookingConfirmed({ ...baseParams, startAt: FUTURE_2H });
      378 |     const confirmCalls = (mockQueueAdd.mock.calls as [string][])
      379 |       .filter(([name]) => name === 'booking-confirmed');

      at src/modules/whatsapp/whatsapp.service.test.ts:376:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueueBookingConfirmed › handles queue.add failure gracefully without throwing

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      391 |   });
      392 |
    > 393 |   it('handles queue.add failure gracefully without throwing', async () => {
          |   ^
      394 |     mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'));
      395 |     await expect(enqueueBookingConfirmed(baseParams)).resolves.toBeUndefined();
      396 |   });

      at src/modules/whatsapp/whatsapp.service.test.ts:393:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:331:1)

  ● enqueuePostVisitReview › enqueues post-visit-review with a 2-hour delay (7 200 000 ms)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      411 |   };
      412 |
    > 413 |   it('enqueues post-visit-review with a 2-hour delay (7 200 000 ms)', async () => {
          |   ^
      414 |     await enqueuePostVisitReview(baseParams);
      415 |     expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      416 |     const opts = mockQueueAdd.mock.calls[0][2] as { delay: number };

      at src/modules/whatsapp/whatsapp.service.test.ts:413:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:403:1)

  ● enqueuePostVisitReview › includes googleReviewUrl in the job data

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      418 |   });
      419 |
    > 420 |   it('includes googleReviewUrl in the job data', async () => {
          |   ^
      421 |     await enqueuePostVisitReview(baseParams);
      422 |     const data = mockQueueAdd.mock.calls[0][1] as { googleReviewUrl: string };
      423 |     expect(data.googleReviewUrl).toBe('https://g.page/r/ABC/review');

      at src/modules/whatsapp/whatsapp.service.test.ts:420:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:403:1)

  ● enqueuePostVisitReview › includes jobName=post-visit-review in the job data

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      424 |   });
      425 |
    > 426 |   it('includes jobName=post-visit-review in the job data', async () => {
          |   ^
      427 |     await enqueuePostVisitReview(baseParams);
      428 |     const data = mockQueueAdd.mock.calls[0][1] as { jobName: string };
      429 |     expect(data.jobName).toBe('post-visit-review');

      at src/modules/whatsapp/whatsapp.service.test.ts:426:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:403:1)

  ● enqueuePostVisitReview › handles queue.add failure gracefully without throwing

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      440 |   });
      441 |
    > 442 |   it('handles queue.add failure gracefully without throwing', async () => {
          |   ^
      443 |     mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'));
      444 |     await expect(enqueuePostVisitReview(baseParams)).resolves.toBeUndefined();
      445 |   });

      at src/modules/whatsapp/whatsapp.service.test.ts:442:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:403:1)

  ● enqueuePostVisitReview › does not enqueue when googleReviewUrl is empty (avoids broken link in message)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      445 |   });
      446 |
    > 447 |   it('does not enqueue when googleReviewUrl is empty (avoids broken link in message)', async () => {
          |   ^
      448 |     await enqueuePostVisitReview({ ...baseParams, googleReviewUrl: '' });
      449 |     expect(mockQueueAdd).not.toHaveBeenCalled();
      450 |   });

      at src/modules/whatsapp/whatsapp.service.test.ts:447:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:403:1)

  ● enqueueRestaurantReminder › enqueues restaurant-reminder with correct delay (startAt − 2 h − now)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      466 |   };
      467 |
    > 468 |   it('enqueues restaurant-reminder with correct delay (startAt − 2 h − now)', async () => {
          |   ^
      469 |     await enqueueRestaurantReminder(baseParams);
      470 |     expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      471 |     const opts = mockQueueAdd.mock.calls[0][2] as { delay: number };

      at src/modules/whatsapp/whatsapp.service.test.ts:468:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:457:1)

  ● enqueueRestaurantReminder › includes partySize in the job data

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      475 |   });
      476 |
    > 477 |   it('includes partySize in the job data', async () => {
          |   ^
      478 |     await enqueueRestaurantReminder(baseParams);
      479 |     const data = mockQueueAdd.mock.calls[0][1] as { partySize: number };
      480 |     expect(data.partySize).toBe(4);

      at src/modules/whatsapp/whatsapp.service.test.ts:477:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:457:1)

  ● enqueueRestaurantReminder › skips when startAt is in the past (delay ≤ 0)

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      481 |   });
      482 |
    > 483 |   it('skips when startAt is in the past (delay ≤ 0)', async () => {
          |   ^
      484 |     await enqueueRestaurantReminder({ ...baseParams, startAt: PAST_ISO });
      485 |     expect(mockQueueAdd).not.toHaveBeenCalled();
      486 |   });

      at src/modules/whatsapp/whatsapp.service.test.ts:483:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:457:1)

  ● enqueueRestaurantReminder › skips when startAt is < 2 h from now

    thrown: "Exceeded timeout of 30000 ms for a test.
    Add a timeout value to this test to increase the timeout, if this is a long-running test. See https://jestjs.io/docs/api#testname-fn-timeout."

      486 |   });
      487 |
    > 488 |   it('skips when startAt is < 2 h from now', async () => {
          |   ^
      489 |     const nearFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 h
      490 |     await enqueueRestaurantReminder({ ...baseParams, startAt: nearFuture });
      491 |     expect(mockQueueAdd).not.toHaveBeenCalled();

      at src/modules/whatsapp/whatsapp.service.test.ts:488:3
      at Object.<anonymous> (src/modules/whatsapp/whatsapp.service.test.ts:457:1)


Test Suites: 2 failed, 100 passed, 102 total
Tests:       18 failed, 1803 passed, 1821 total
Snapshots:   0 total
Time:        914.018 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
neilapacesaite@Neilas-MacBook-Pro backend % 
