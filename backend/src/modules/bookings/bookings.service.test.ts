/**
 * Unit tests for bookings.service.ts — Step 1.9
 *
 * Prisma is fully mocked so these tests run without a live database.
 *
 * Coverage:
 *  ✓ listBookings    — ADMIN all, ADMIN with status filter, ADMIN date range,
 *                      ADMIN artistId filter, ARTIST scoped to own,
 *                      ARTIST profile not found → 404
 *  ✓ getBookingById  — ADMIN found, ARTIST found (own), ARTIST forbidden (other),
 *                      not found → 404
 *  ✓ confirmBooking  — PENDING success, non-PENDING → 409 INVALID_STATUS_TRANSITION,
 *                      scheduling conflict → 409 SCHEDULING_CONFLICT,
 *                      ARTIST own: success, ARTIST other: 403, not found → 404
 *  ✓ completeBooking — CONFIRMED success + Invoice created (totalAmount path),
 *                      fallback to quote.price, fallback to 0,
 *                      non-CONFIRMED → 409, ARTIST own: success,
 *                      ARTIST other: 403, not found → 404
 *  ✓ cancelBooking   — PENDING success, CONFIRMED success,
 *                      COMPLETED → 409, CANCELLED → 409,
 *                      ARTIST own: success, ARTIST other: 403, not found → 404
 *  ✓ rescheduleBooking — CONFIRMED success, conflict → 409,
 *                        non-CONFIRMED → 409, ARTIST own: success,
 *                        ARTIST other: 403, not found → 404
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockBookingFindUnique = jest.fn();
const mockBookingFindMany   = jest.fn();
const mockBookingFindFirst  = jest.fn();
const mockBookingCount      = jest.fn();
const mockBookingUpdate     = jest.fn();

const mockArtistFindFirst = jest.fn();

const mockInvoiceCreate = jest.fn();

const mockTransaction = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: (...a: unknown[]) => mockBookingFindUnique(...a),
      findMany:   (...a: unknown[]) => mockBookingFindMany(...a),
      findFirst:  (...a: unknown[]) => mockBookingFindFirst(...a),
      count:      (...a: unknown[]) => mockBookingCount(...a),
      update:     (...a: unknown[]) => mockBookingUpdate(...a),
    },
    artist: {
      findFirst: (...a: unknown[]) => mockArtistFindFirst(...a),
    },
    invoice: {
      create: (...a: unknown[]) => mockInvoiceCreate(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

// ─── Mock WhatsApp service (prevents real BullMQ/Redis imports) ───────────────

jest.mock('../whatsapp/whatsapp.service', () => ({
  enqueueBookingConfirmed:   jest.fn().mockResolvedValue(undefined),
  enqueuePostVisitReview:    jest.fn().mockResolvedValue(undefined),
  enqueueRestaurantReminder: jest.fn().mockResolvedValue(undefined),
}));

// ─── Mock Review-request queue (prevents real BullMQ/Redis imports) ──────────
// bookings.service.ts imports enqueueReviewRequest from reviews.queue.ts which
// creates a module-level BullMQ Queue singleton.  Without this mock the real
// Queue constructor runs, opening a Redis connection and causing
// "worker process failed to exit gracefully" warnings in the test output.

jest.mock('../reviews/reviews.queue', () => ({
  enqueueReviewRequest: jest.fn().mockResolvedValue(undefined),
}));

// bookings.service.ts imports enqueueBookingReminder/cancelBookingReminder from
// reminders.queue.ts, which opens a Redis connection at module load.  Mock the
// entire module so tests run without a live Redis instance.
jest.mock('../reminders/reminders.queue', () => ({
  enqueueBookingReminder: jest.fn().mockResolvedValue(undefined),
  cancelBookingReminder:  jest.fn().mockResolvedValue(undefined),
}));

// bookings.service.ts imports enqueueWebhookEvent from webhooks.queue.ts which
// creates a module-level BullMQ Queue singleton.  Mock the entire module so
// tests run without a live Redis instance.
jest.mock('../webhooks/webhooks.queue', () => ({
  enqueueWebhookEvent: jest.fn().mockResolvedValue(undefined),
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as bookingsService from './bookings.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const FUTURE_START = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const FUTURE_END   = new Date(FUTURE_START.getTime() + 2 * 60 * 60 * 1000);
const NEW_START    = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
const NEW_END      = new Date(NEW_START.getTime() + 2 * 60 * 60 * 1000);

const baseBooking = {
  id:                   'booking_1',
  status:               'PENDING' as const,
  startAt:              FUTURE_START,
  endAt:                FUTURE_END,
  artistId:             'artist_1',
  notes:                null,
  specialRequests:      null,
  partySize:            null,
  totalDurationMinutes: 120,
  totalAmount:          '250.00',
  depositAmount:        null,
  depositPaidAt:        null,
  depositRefunded:      false,
  cancelReason:         null,
  confirmedAt:          null,
  completedAt:          null,
  cancelledAt:          null,
  rescheduledFrom:      null,
  createdAt:            new Date('2026-04-05T10:00:00Z'),
  updatedAt:            new Date('2026-04-05T10:00:00Z'),
  artist:  { id: 'artist_1', slug: 'alex-ink', user: { name: 'Alex Ink', email: 'alex@studio.com' } },
  customer: { id: 'customer_1', name: 'Jane Smith', email: 'jane@example.com', phone: '+441234567890' },
  lead:    { id: 'lead_1', name: 'Jane Smith', email: 'jane@example.com', phone: '+441234567890', status: 'BOOKED' },
  quote:   { id: 'quote_1', price: '250.00', hours: 4, status: 'ACCEPTED' },
  invoice: null,
  services: [],
};

const confirmedBooking   = { ...baseBooking, status: 'CONFIRMED'   as const, confirmedAt: new Date() };
const rescheduledBooking = { ...confirmedBooking, status: 'RESCHEDULED' as const, startAt: NEW_START, endAt: NEW_END, rescheduledFrom: 'booking_1' };

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// listBookings
// ─────────────────────────────────────────────────────────────────────────────

describe('listBookings', () => {
  const listItem = {
    id:         'booking_1',
    status:     'PENDING',
    startAt:    FUTURE_START,
    endAt:      FUTURE_END,
    totalAmount: '250.00',
    partySize:   null,
    createdAt:   new Date('2026-04-05T10:00:00Z'),
    artist:      { id: 'artist_1', slug: 'alex-ink', user: { name: 'Alex Ink' } },
    customer:    { id: 'customer_1', name: 'Jane Smith', email: 'jane@example.com' },
    lead:        { id: 'lead_1', name: 'Jane Smith', email: 'jane@example.com' },
  };

  it('ADMIN — returns all bookings (no filter)', async () => {
    mockBookingCount.mockResolvedValue(1);
    mockBookingFindMany.mockResolvedValue([listItem]);

    const result = await bookingsService.listBookings({}, 'admin_1', 'ADMIN');

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(mockBookingCount).toHaveBeenCalledWith({ where: {} });
  });

  it('ADMIN — filters by status', async () => {
    mockBookingCount.mockResolvedValue(1);
    mockBookingFindMany.mockResolvedValue([listItem]);

    await bookingsService.listBookings({ status: 'PENDING' }, 'admin_1', 'ADMIN');

    expect(mockBookingCount).toHaveBeenCalledWith({ where: { status: 'PENDING' } });
  });

  it('ADMIN — filters by artistId', async () => {
    mockBookingCount.mockResolvedValue(1);
    mockBookingFindMany.mockResolvedValue([listItem]);

    await bookingsService.listBookings({ artistId: 'artist_1' }, 'admin_1', 'ADMIN');

    expect(mockBookingCount).toHaveBeenCalledWith({ where: { artistId: 'artist_1' } });
  });

  it('ADMIN — filters by date range', async () => {
    mockBookingCount.mockResolvedValue(1);
    mockBookingFindMany.mockResolvedValue([listItem]);

    await bookingsService.listBookings(
      { from: '2026-04-01T00:00:00Z', to: '2026-04-30T23:59:59Z' },
      'admin_1',
      'ADMIN',
    );

    expect(mockBookingCount).toHaveBeenCalledWith({
      where: {
        startAt: {
          gte: new Date('2026-04-01T00:00:00Z'),
          lte: new Date('2026-04-30T23:59:59Z'),
        },
      },
    });
  });

  it('ARTIST — scopes to own bookings', async () => {
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockBookingCount.mockResolvedValue(1);
    mockBookingFindMany.mockResolvedValue([listItem]);

    await bookingsService.listBookings({}, 'user_1', 'ARTIST');

    expect(mockArtistFindFirst).toHaveBeenCalledWith({
      where:  { userId: 'user_1' },
      select: { id: true },
    });
    expect(mockBookingCount).toHaveBeenCalledWith({ where: { artistId: 'artist_1' } });
  });

  it('ARTIST — throws 404 if artist profile not found', async () => {
    mockArtistFindFirst.mockResolvedValue(null);

    await expect(
      bookingsService.listBookings({}, 'user_no_profile', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'ARTIST_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBookingById
// ─────────────────────────────────────────────────────────────────────────────

describe('getBookingById', () => {
  it('ADMIN — returns booking detail', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);

    const result = await bookingsService.getBookingById('booking_1', 'admin_1', 'ADMIN');

    expect(result.id).toBe('booking_1');
    expect(mockBookingFindUnique).toHaveBeenCalledWith({
      where:  { id: 'booking_1' },
      select: expect.any(Object),
    });
  });

  it('returns 404 if booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(
      bookingsService.getBookingById('ghost', 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });

  it('ARTIST — returns own booking', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });

    const result = await bookingsService.getBookingById('booking_1', 'user_1', 'ARTIST');

    expect(result.id).toBe('booking_1');
  });

  it('ARTIST — throws 403 for another artist\'s booking', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_999' });

    await expect(
      bookingsService.getBookingById('booking_1', 'user_999', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// confirmBooking
// ─────────────────────────────────────────────────────────────────────────────

describe('confirmBooking', () => {
  const confirmedResult = { ...baseBooking, status: 'CONFIRMED', confirmedAt: new Date() };

  it('ADMIN — confirms a PENDING booking', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockBookingFindFirst.mockResolvedValue(null); // no conflict
    mockBookingUpdate.mockResolvedValue(confirmedResult);

    const result = await bookingsService.confirmBooking('booking_1', 'admin_1', 'ADMIN');

    expect(result.status).toBe('CONFIRMED');
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where:  { id: 'booking_1' },
      data:   { status: 'CONFIRMED', confirmedAt: expect.any(Date) },
      select: expect.any(Object),
    });
  });

  it('throws 409 INVALID_STATUS_TRANSITION if booking is not PENDING', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...baseBooking, status: 'CONFIRMED' });

    await expect(
      bookingsService.confirmBooking('booking_1', 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INVALID_STATUS_TRANSITION' });
  });

  it('throws 409 SCHEDULING_CONFLICT if overlapping CONFIRMED booking exists', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockBookingFindFirst.mockResolvedValue({
      id:      'booking_conflict',
      startAt: FUTURE_START,
      endAt:   FUTURE_END,
    });

    await expect(
      bookingsService.confirmBooking('booking_1', 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'SCHEDULING_CONFLICT' });
  });

  it('throws 409 SCHEDULING_CONFLICT if overlapping RESCHEDULED booking exists (BUG-2)', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockBookingFindFirst.mockResolvedValue({
      id:      'booking_rescheduled_conflict',
      startAt: FUTURE_START,
      endAt:   FUTURE_END,
    });

    await expect(
      bookingsService.confirmBooking('booking_1', 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'SCHEDULING_CONFLICT' });
  });

  it('ARTIST — confirms own booking', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockBookingFindFirst.mockResolvedValue(null);
    mockBookingUpdate.mockResolvedValue(confirmedResult);

    const result = await bookingsService.confirmBooking('booking_1', 'user_1', 'ARTIST');

    expect(result.status).toBe('CONFIRMED');
  });

  it('ARTIST — throws 403 for another artist\'s booking', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_999' });

    await expect(
      bookingsService.confirmBooking('booking_1', 'user_999', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws 404 if booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(
      bookingsService.confirmBooking('ghost', 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// completeBooking
// ─────────────────────────────────────────────────────────────────────────────

describe('completeBooking', () => {
  const completeBody = { notes: 'Great session' };

  const completedResult = {
    ...confirmedBooking,
    status:      'COMPLETED',
    completedAt: new Date(),
    invoice: { id: 'inv_1', status: 'UNPAID', amount: '250.00', dueDate: new Date(), paidAt: null },
  };

  it('ADMIN — completes a CONFIRMED booking and creates Invoice', async () => {
    mockBookingFindUnique.mockResolvedValue(confirmedBooking);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        booking: { update: jest.fn().mockResolvedValue({ id: 'booking_1' }) },
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv_1' }) },
      });
    });
    mockBookingFindUnique.mockResolvedValueOnce(confirmedBooking)
      .mockResolvedValueOnce(completedResult);

    const result = await bookingsService.completeBooking('booking_1', completeBody, 'admin_1', 'ADMIN');

    expect(result.status).toBe('COMPLETED');
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('uses quote.price when totalAmount is null', async () => {
    const bookingNoAmount = {
      ...confirmedBooking,
      totalAmount: null,
      quote: { ...confirmedBooking.quote, price: '300.00' },
    };
    mockBookingFindUnique.mockResolvedValueOnce(bookingNoAmount)
      .mockResolvedValueOnce({ ...bookingNoAmount, status: 'COMPLETED', completedAt: new Date() });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        booking: { update: jest.fn().mockResolvedValue({ id: 'booking_1' }) },
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv_1' }) },
      });
    });

    const result = await bookingsService.completeBooking('booking_1', {}, 'admin_1', 'ADMIN');

    expect(result.status).toBe('COMPLETED');
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('uses 0 when both totalAmount and quote.price are null', async () => {
    const bookingNoAmounts = {
      ...confirmedBooking,
      totalAmount: null,
      quote:       null,
    };
    mockBookingFindUnique.mockResolvedValueOnce(bookingNoAmounts)
      .mockResolvedValueOnce({ ...bookingNoAmounts, status: 'COMPLETED', completedAt: new Date() });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        booking: { update: jest.fn().mockResolvedValue({ id: 'booking_1' }) },
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv_1' }) },
      });
    });

    const result = await bookingsService.completeBooking('booking_1', {}, 'admin_1', 'ADMIN');

    expect(result.status).toBe('COMPLETED');
  });

  it('throws 409 if booking is not CONFIRMED', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking); // PENDING

    await expect(
      bookingsService.completeBooking('booking_1', {}, 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INVALID_STATUS_TRANSITION' });
  });

  it('ARTIST — completes own booking', async () => {
    mockBookingFindUnique.mockResolvedValueOnce(confirmedBooking)
      .mockResolvedValueOnce(completedResult);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        booking: { update: jest.fn().mockResolvedValue({ id: 'booking_1' }) },
        invoice: { create: jest.fn().mockResolvedValue({ id: 'inv_1' }) },
      });
    });

    const result = await bookingsService.completeBooking('booking_1', {}, 'user_1', 'ARTIST');

    expect(result.status).toBe('COMPLETED');
  });

  it('ARTIST — throws 403 for another artist\'s booking', async () => {
    mockBookingFindUnique.mockResolvedValue(confirmedBooking);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_999' });

    await expect(
      bookingsService.completeBooking('booking_1', {}, 'user_999', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws 404 if booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(
      bookingsService.completeBooking('ghost', {}, 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cancelBooking
// ─────────────────────────────────────────────────────────────────────────────

describe('cancelBooking', () => {
  const cancelBody = { cancelReason: 'Customer requested cancellation' };

  const cancelledResult = {
    ...baseBooking,
    status:       'CANCELLED',
    cancelledAt:  new Date(),
    cancelReason: 'Customer requested cancellation',
  };

  it('ADMIN — cancels a PENDING booking', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockBookingUpdate.mockResolvedValue(cancelledResult);

    const result = await bookingsService.cancelBooking('booking_1', cancelBody, 'admin_1', 'ADMIN');

    expect(result.status).toBe('CANCELLED');
    expect(result.cancelReason).toBe('Customer requested cancellation');
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where:  { id: 'booking_1' },
      data:   {
        status:       'CANCELLED',
        cancelledAt:  expect.any(Date),
        cancelReason: 'Customer requested cancellation',
      },
      select: expect.any(Object),
    });
  });

  it('cancels a CONFIRMED booking', async () => {
    mockBookingFindUnique.mockResolvedValue(confirmedBooking);
    mockBookingUpdate.mockResolvedValue({ ...cancelledResult });

    const result = await bookingsService.cancelBooking('booking_1', cancelBody, 'admin_1', 'ADMIN');

    expect(result.status).toBe('CANCELLED');
  });

  it('cancels a RESCHEDULED booking (BUG-1)', async () => {
    mockBookingFindUnique.mockResolvedValue(rescheduledBooking);
    mockBookingUpdate.mockResolvedValue({ ...cancelledResult });

    const result = await bookingsService.cancelBooking('booking_1', cancelBody, 'admin_1', 'ADMIN');

    expect(result.status).toBe('CANCELLED');
  });

  it('throws 409 if booking is already COMPLETED', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...baseBooking, status: 'COMPLETED' });

    await expect(
      bookingsService.cancelBooking('booking_1', cancelBody, 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INVALID_STATUS_TRANSITION' });
  });

  it('throws 409 if booking is already CANCELLED', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...baseBooking, status: 'CANCELLED' });

    await expect(
      bookingsService.cancelBooking('booking_1', cancelBody, 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INVALID_STATUS_TRANSITION' });
  });

  it('ARTIST — cancels own booking', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockBookingUpdate.mockResolvedValue(cancelledResult);

    const result = await bookingsService.cancelBooking('booking_1', cancelBody, 'user_1', 'ARTIST');

    expect(result.status).toBe('CANCELLED');
  });

  it('ARTIST — throws 403 for another artist\'s booking', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_999' });

    await expect(
      bookingsService.cancelBooking('booking_1', cancelBody, 'user_999', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws 404 if booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(
      bookingsService.cancelBooking('ghost', cancelBody, 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rescheduleBooking
// ─────────────────────────────────────────────────────────────────────────────

describe('rescheduleBooking', () => {
  const rescheduleBody = {
    startAt: NEW_START.toISOString(),
    endAt:   NEW_END.toISOString(),
    notes:   'Moved to next week',
  };

  const rescheduledResult = {
    ...confirmedBooking,
    status:          'RESCHEDULED',
    startAt:         NEW_START,
    endAt:           NEW_END,
    rescheduledFrom: 'booking_1',
    notes:           'Moved to next week',
  };

  it('ADMIN — reschedules a CONFIRMED booking', async () => {
    mockBookingFindUnique.mockResolvedValue(confirmedBooking);
    mockBookingFindFirst.mockResolvedValue(null); // no conflict
    mockBookingUpdate.mockResolvedValue(rescheduledResult);

    const result = await bookingsService.rescheduleBooking(
      'booking_1', rescheduleBody, 'admin_1', 'ADMIN',
    );

    expect(result.status).toBe('RESCHEDULED');
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking_1' },
      data:  {
        status:          'RESCHEDULED',
        startAt:         new Date(rescheduleBody.startAt),
        endAt:           new Date(rescheduleBody.endAt),
        rescheduledFrom: 'booking_1',
        notes:           'Moved to next week',
      },
      select: expect.any(Object),
    });
  });

  it('throws 409 SCHEDULING_CONFLICT if new time slot conflicts', async () => {
    mockBookingFindUnique.mockResolvedValue(confirmedBooking);
    mockBookingFindFirst.mockResolvedValue({
      id:      'booking_conflict',
      startAt: NEW_START,
      endAt:   NEW_END,
    });

    await expect(
      bookingsService.rescheduleBooking('booking_1', rescheduleBody, 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'SCHEDULING_CONFLICT' });
  });

  it('throws 409 SCHEDULING_CONFLICT if new slot overlaps a RESCHEDULED booking (BUG-2)', async () => {
    mockBookingFindUnique.mockResolvedValue(confirmedBooking);
    mockBookingFindFirst.mockResolvedValue({
      id:      'booking_rescheduled_conflict',
      startAt: NEW_START,
      endAt:   NEW_END,
    });

    await expect(
      bookingsService.rescheduleBooking('booking_1', rescheduleBody, 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'SCHEDULING_CONFLICT' });
  });

  it('throws 409 if booking is not CONFIRMED', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking); // PENDING

    await expect(
      bookingsService.rescheduleBooking('booking_1', rescheduleBody, 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INVALID_STATUS_TRANSITION' });
  });

  it('ARTIST — reschedules own booking', async () => {
    mockBookingFindUnique.mockResolvedValue(confirmedBooking);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockBookingFindFirst.mockResolvedValue(null);
    mockBookingUpdate.mockResolvedValue(rescheduledResult);

    const result = await bookingsService.rescheduleBooking(
      'booking_1', rescheduleBody, 'user_1', 'ARTIST',
    );

    expect(result.status).toBe('RESCHEDULED');
  });

  it('ARTIST — throws 403 for another artist\'s booking', async () => {
    mockBookingFindUnique.mockResolvedValue(confirmedBooking);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_999' });

    await expect(
      bookingsService.rescheduleBooking('booking_1', rescheduleBody, 'user_999', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws 404 if booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(
      bookingsService.rescheduleBooking('ghost', rescheduleBody, 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });
});
