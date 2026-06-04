/**
 * Unit tests for customers.service.ts — Step 1.25
 *
 * Prisma is fully mocked so these tests run without a live database.
 * businessType module is mocked to control CANCELLATION_FEE_ENABLED in isolation.
 * logger is mocked to spy on fee-stub log calls.
 *
 * Coverage:
 *  ✓ listMyBookings
 *      — returns own bookings paginated (defaults)
 *      — filters by status when provided
 *      — filters by from date
 *      — filters by to date
 *      — throws 400 for invalid from date
 *      — throws 400 for invalid to date
 *
 *  ✓ getMyBookingById
 *      — found and belongs to customer (findFirst compound where)
 *      — not found (wrong id) → 404
 *      — booking belongs to different customer → 404 (DB returns null)
 *
 *  ✓ cancelMyBooking
 *      — PENDING booking (outside window) → CANCELLED
 *      — CONFIRMED booking (outside window) → CANCELLED
 *      — RESCHEDULED booking (outside window) → CANCELLED
 *      — booking inside window, CANCELLATION_FEE_ENABLED false → cancelled, no fee log
 *      — booking inside window, CANCELLATION_FEE_ENABLED true → cancelled + logger.warn fires
 *      — COMPLETED booking → 409 INVALID_STATUS_TRANSITION
 *      — CANCELLED booking → 409 INVALID_STATUS_TRANSITION
 *      — booking not found → 404
 *      — booking belongs to different customer → 404
 *
 *  ✓ requestReschedule
 *      — PENDING booking (outside window) → RESCHEDULED
 *      — CONFIRMED booking (outside window) → RESCHEDULED
 *      — booking inside window → 409 OUTSIDE_RESCHEDULE_WINDOW
 *      — COMPLETED booking → 409 INVALID_STATUS_TRANSITION
 *      — CANCELLED booking → 409 INVALID_STATUS_TRANSITION
 *      — booking not found → 404
 *      — booking belongs to different customer → 404
 *
 *  ✓ listMyLeads
 *      — returns own leads by email (paginated)
 *      — returns empty list when no leads match
 *
 *  ✓ updateMyProfile
 *      — updates name only
 *      — updates phone only
 *      — updates marketingConsent → gdprConsentAt set when first consent
 *      — updates marketingConsent false → gdprConsentAt not changed
 *      — updates all fields together
 *      — user not found → 404
 *
 * Total: 33 tests
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockBookingFindFirst  = jest.fn();
const mockBookingFindUnique = jest.fn();
const mockBookingFindMany   = jest.fn();
const mockBookingCount      = jest.fn();
const mockBookingUpdate     = jest.fn();

const mockLeadFindMany = jest.fn();
const mockLeadCount    = jest.fn();

const mockUserFindUnique = jest.fn();
const mockUserUpdate     = jest.fn();

jest.mock('../../lib/redis', () => ({
  getRedis: jest.fn(() => ({
    get:   jest.fn().mockRejectedValue(new Error('mock')),
    setex: jest.fn().mockRejectedValue(new Error('mock')),
    incr:  jest.fn().mockResolvedValue(1),
  })),
  isRedisHealthy: jest.fn(() => false),
  pingRedis:      jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    booking: {
      findFirst:  (...a: unknown[]) => mockBookingFindFirst(...a),
      findUnique: (...a: unknown[]) => mockBookingFindUnique(...a),
      findMany:   (...a: unknown[]) => mockBookingFindMany(...a),
      count:      (...a: unknown[]) => mockBookingCount(...a),
      update:     (...a: unknown[]) => mockBookingUpdate(...a),
    },
    lead: {
      findMany: (...a: unknown[]) => mockLeadFindMany(...a),
      count:    (...a: unknown[]) => mockLeadCount(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update:     (...a: unknown[]) => mockUserUpdate(...a),
    },
  },
}));

// ─── Mock businessType (needed to test CANCELLATION_FEE_ENABLED branch) ──────

const mockGetDefaultFlags = jest.fn();
jest.mock('../../config/businessType', () => ({
  getDefaultFlags:    (...a: unknown[]) => mockGetDefaultFlags(...a),
  BUSINESS_TYPES:     ['tattoo_studio', 'barbershop', 'hair_salon', 'nail_salon', 'beauty_salon', 'restaurant'],
  activeBusinessType: 'tattoo_studio',
}));

// ─── Mock logger (needed to spy on warn in fee-enabled test) ──────────────────

const mockLoggerWarn = jest.fn();
const mockLoggerInfo = jest.fn();
jest.mock('../../utils/logger', () => ({
  logger: {
    warn:  (...a: unknown[]) => mockLoggerWarn(...a),
    info:  (...a: unknown[]) => mockLoggerInfo(...a),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── Import service under test ────────────────────────────────────────────────

import {
  listMyBookings,
  getMyBookingById,
  cancelMyBooking,
  requestReschedule,
  listMyLeads,
  updateMyProfile,
} from './customers.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CUSTOMER_ID = 'cust_01';
const OTHER_ID    = 'cust_99';

/** A booking start time that is 72 hours in the future (outside 24h window). */
const FUTURE_FAR  = new Date(Date.now() + 72 * 60 * 60 * 1000);
/** A booking start time that is 6 hours in the future (inside 24h window). */
const FUTURE_NEAR = new Date(Date.now() +  6 * 60 * 60 * 1000);

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id:                   'booking_01',
    status:               'CONFIRMED',
    startAt:              FUTURE_FAR,
    endAt:                new Date(FUTURE_FAR.getTime() + 90 * 60 * 1000),
    notes:                null,
    specialRequests:      null,
    partySize:            null,
    totalDurationMinutes: 90,
    totalAmount:          null,
    depositAmount:        null,
    depositPaidAt:        null,
    cancelReason:         null,
    confirmedAt:          new Date(),
    completedAt:          null,
    cancelledAt:          null,
    createdAt:            new Date(),
    updatedAt:            new Date(),
    customerId:           CUSTOMER_ID,
    artist:               { id: 'artist_01', slug: 'alex', user: { name: 'Alex' } },
    services:             [],
    invoice:              null,
    ...overrides,
  };
}

// ─── listMyBookings ───────────────────────────────────────────────────────────

describe('listMyBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBookingCount.mockResolvedValue(1);
    mockBookingFindMany.mockResolvedValue([makeBooking()]);
  });

  it('returns own bookings paginated with defaults', async () => {
    const result = await listMyBookings({}, CUSTOMER_ID);

    expect(mockBookingCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: CUSTOMER_ID } }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('adds status filter when provided', async () => {
    await listMyBookings({ status: 'CONFIRMED' }, CUSTOMER_ID);

    expect(mockBookingCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: CUSTOMER_ID, status: 'CONFIRMED' } }),
    );
  });

  it('adds from filter when provided', async () => {
    await listMyBookings({ from: '2026-01-01T00:00:00Z' }, CUSTOMER_ID);

    const where = mockBookingCount.mock.calls[0][0].where;
    expect(where.startAt).toMatchObject({ gte: new Date('2026-01-01T00:00:00Z') });
  });

  it('adds to filter when provided', async () => {
    await listMyBookings({ to: '2026-12-31T23:59:59Z' }, CUSTOMER_ID);

    const where = mockBookingCount.mock.calls[0][0].where;
    expect(where.startAt).toMatchObject({ lte: new Date('2026-12-31T23:59:59Z') });
  });

  it('throws 400 for invalid from date', async () => {
    await expect(listMyBookings({ from: 'not-a-date' }, CUSTOMER_ID)).rejects.toMatchObject({
      statusCode: 400,
      code:       'VALIDATION_ERROR',
    });
  });

  it('throws 400 for invalid to date', async () => {
    await expect(listMyBookings({ to: 'not-a-date' }, CUSTOMER_ID)).rejects.toMatchObject({
      statusCode: 400,
      code:       'VALIDATION_ERROR',
    });
  });
});

// ─── getMyBookingById ─────────────────────────────────────────────────────────

describe('getMyBookingById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns booking when it belongs to the customer', async () => {
    // findFirst with where:{id, customerId} returns the booking when it matches
    mockBookingFindFirst.mockResolvedValue(makeBooking());

    const booking = await getMyBookingById('booking_01', CUSTOMER_ID);

    expect(mockBookingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'booking_01', customerId: CUSTOMER_ID } }),
    );
    expect(booking.id).toBe('booking_01');
  });

  it('throws 404 when booking is not found', async () => {
    // findFirst returns null when no record matches the compound where clause
    mockBookingFindFirst.mockResolvedValue(null);

    await expect(getMyBookingById('bad_id', CUSTOMER_ID)).rejects.toMatchObject({
      statusCode: 404,
      code:       'NOT_FOUND',
    });
  });

  it('throws 404 when booking belongs to a different customer', async () => {
    // findFirst returns null when customerId does not match — ownership enforced at DB level
    mockBookingFindFirst.mockResolvedValue(null);

    await expect(getMyBookingById('booking_01', CUSTOMER_ID)).rejects.toMatchObject({
      statusCode: 404,
      code:       'NOT_FOUND',
    });
  });
});

// ─── cancelMyBooking ──────────────────────────────────────────────────────────

describe('cancelMyBooking', () => {
  const body = { cancelReason: 'Changed my mind' };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['CANCELLATION_WINDOW_HOURS'];
    // Default: no cancellation fee (mirrors all current business-type defaults)
    mockGetDefaultFlags.mockReturnValue({ CANCELLATION_FEE_ENABLED: false });
  });

  afterAll(() => {
    delete process.env['CANCELLATION_WINDOW_HOURS'];
  });

  it('cancels a PENDING booking that is outside the window', async () => {
    const booking = makeBooking({ status: 'PENDING', startAt: FUTURE_FAR });
    mockBookingFindUnique.mockResolvedValue(booking);
    mockBookingUpdate.mockResolvedValue({ ...booking, status: 'CANCELLED', cancelledAt: new Date() });

    const result = await cancelMyBooking('booking_01', body, CUSTOMER_ID);

    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED', cancelReason: body.cancelReason }),
      }),
    );
    expect(result.status).toBe('CANCELLED');
  });

  it('cancels a CONFIRMED booking that is outside the window', async () => {
    const booking = makeBooking({ status: 'CONFIRMED', startAt: FUTURE_FAR });
    mockBookingFindUnique.mockResolvedValue(booking);
    mockBookingUpdate.mockResolvedValue({ ...booking, status: 'CANCELLED' });

    const result = await cancelMyBooking('booking_01', body, CUSTOMER_ID);

    expect(result.status).toBe('CANCELLED');
  });

  it('cancels a RESCHEDULED booking that is outside the window', async () => {
    const booking = makeBooking({ status: 'RESCHEDULED', startAt: FUTURE_FAR });
    mockBookingFindUnique.mockResolvedValue(booking);
    mockBookingUpdate.mockResolvedValue({ ...booking, status: 'CANCELLED' });

    const result = await cancelMyBooking('booking_01', body, CUSTOMER_ID);

    expect(result.status).toBe('CANCELLED');
  });

  it('allows cancellation inside window when CANCELLATION_FEE_ENABLED is false', async () => {
    // Default flag mock (CANCELLATION_FEE_ENABLED: false) set in beforeEach
    const booking = makeBooking({ status: 'CONFIRMED', startAt: FUTURE_NEAR });
    mockBookingFindUnique.mockResolvedValue(booking);
    mockBookingUpdate.mockResolvedValue({ ...booking, status: 'CANCELLED' });

    const result = await cancelMyBooking('booking_01', body, CUSTOMER_ID);

    expect(result.status).toBe('CANCELLED');
    // Fee warning must NOT fire when flag is false
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('cancels inside window and logs fee stub when CANCELLATION_FEE_ENABLED is true', async () => {
    // Arrange: CANCELLATION_FEE_ENABLED true + booking inside the 24h window
    mockGetDefaultFlags.mockReturnValue({ CANCELLATION_FEE_ENABLED: true });
    const booking = makeBooking({ status: 'CONFIRMED', startAt: FUTURE_NEAR });
    mockBookingFindUnique.mockResolvedValue(booking);
    mockBookingUpdate.mockResolvedValue({ ...booking, status: 'CANCELLED' });

    const result = await cancelMyBooking('booking_01', body, CUSTOMER_ID);

    // Booking is still cancelled — the fee is logged but does not block cancellation
    expect(result.status).toBe('CANCELLED');
    // Fee stub must fire when inside the window AND CANCELLATION_FEE_ENABLED is true
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Cancellation fee triggered (stub)',
      expect.objectContaining({ bookingId: 'booking_01', customerId: CUSTOMER_ID }),
    );
  });

  it('throws 409 when booking status is COMPLETED', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: 'COMPLETED' }));

    await expect(cancelMyBooking('booking_01', body, CUSTOMER_ID)).rejects.toMatchObject({
      statusCode: 409,
      code:       'INVALID_STATUS_TRANSITION',
    });
  });

  it('throws 409 when booking status is CANCELLED', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: 'CANCELLED' }));

    await expect(cancelMyBooking('booking_01', body, CUSTOMER_ID)).rejects.toMatchObject({
      statusCode: 409,
      code:       'INVALID_STATUS_TRANSITION',
    });
  });

  it('throws 404 when booking is not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(cancelMyBooking('bad_id', body, CUSTOMER_ID)).rejects.toMatchObject({
      statusCode: 404,
      code:       'NOT_FOUND',
    });
  });

  it('throws 404 when booking belongs to a different customer', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking({ customerId: OTHER_ID }));

    await expect(cancelMyBooking('booking_01', body, CUSTOMER_ID)).rejects.toMatchObject({
      statusCode: 404,
      code:       'NOT_FOUND',
    });
  });
});

// ─── requestReschedule ────────────────────────────────────────────────────────

describe('requestReschedule', () => {
  const FAR_FUTURE_START = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days
  const FAR_FUTURE_END   = new Date(FAR_FUTURE_START.getTime() + 90 * 60 * 1000);

  const rescheduleBody = {
    startAt: FAR_FUTURE_START.toISOString(),
    endAt:   FAR_FUTURE_END.toISOString(),
    notes:   'Works better for me',
  };

  beforeEach(() => jest.clearAllMocks());

  it('rescheduling a PENDING booking (outside window) sets status to RESCHEDULED', async () => {
    const booking = makeBooking({ status: 'PENDING', startAt: FUTURE_FAR });
    mockBookingFindUnique.mockResolvedValue(booking);
    mockBookingUpdate.mockResolvedValue({ ...booking, status: 'RESCHEDULED', startAt: FAR_FUTURE_START });

    const result = await requestReschedule('booking_01', rescheduleBody, CUSTOMER_ID);

    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'RESCHEDULED' }),
      }),
    );
    expect(result.status).toBe('RESCHEDULED');
  });

  it('rescheduling a CONFIRMED booking (outside window) sets status to RESCHEDULED', async () => {
    const booking = makeBooking({ status: 'CONFIRMED', startAt: FUTURE_FAR });
    mockBookingFindUnique.mockResolvedValue(booking);
    mockBookingUpdate.mockResolvedValue({ ...booking, status: 'RESCHEDULED' });

    const result = await requestReschedule('booking_01', rescheduleBody, CUSTOMER_ID);

    expect(result.status).toBe('RESCHEDULED');
  });

  it('throws 409 when booking startAt is inside the cancellation window', async () => {
    const booking = makeBooking({ status: 'CONFIRMED', startAt: FUTURE_NEAR });
    mockBookingFindUnique.mockResolvedValue(booking);

    await expect(
      requestReschedule('booking_01', rescheduleBody, CUSTOMER_ID),
    ).rejects.toMatchObject({
      statusCode: 409,
      code:       'OUTSIDE_RESCHEDULE_WINDOW',
    });
  });

  it('throws 409 when booking status is COMPLETED', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: 'COMPLETED', startAt: FUTURE_FAR }));

    await expect(
      requestReschedule('booking_01', rescheduleBody, CUSTOMER_ID),
    ).rejects.toMatchObject({
      statusCode: 409,
      code:       'INVALID_STATUS_TRANSITION',
    });
  });

  it('throws 409 when booking status is CANCELLED', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking({ status: 'CANCELLED', startAt: FUTURE_FAR }));

    await expect(
      requestReschedule('booking_01', rescheduleBody, CUSTOMER_ID),
    ).rejects.toMatchObject({
      statusCode: 409,
      code:       'INVALID_STATUS_TRANSITION',
    });
  });

  it('throws 404 when booking is not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    await expect(
      requestReschedule('bad_id', rescheduleBody, CUSTOMER_ID),
    ).rejects.toMatchObject({
      statusCode: 404,
      code:       'NOT_FOUND',
    });
  });

  it('throws 404 when booking belongs to a different customer', async () => {
    mockBookingFindUnique.mockResolvedValue(makeBooking({ customerId: OTHER_ID, startAt: FUTURE_FAR }));

    await expect(
      requestReschedule('booking_01', rescheduleBody, CUSTOMER_ID),
    ).rejects.toMatchObject({
      statusCode: 404,
      code:       'NOT_FOUND',
    });
  });
});

// ─── listMyLeads ──────────────────────────────────────────────────────────────

describe('listMyLeads', () => {
  const EMAIL = 'customer@example.com';

  beforeEach(() => jest.clearAllMocks());

  it('returns own leads by email (paginated)', async () => {
    mockLeadCount.mockResolvedValue(2);
    mockLeadFindMany.mockResolvedValue([
      { id: 'lead_01', description: 'Dragon sleeve', status: 'NEW', score: 0, createdAt: new Date(), updatedAt: new Date(), artist: null, quotes: [], placement: null, size: null },
      { id: 'lead_02', description: 'Shoulder piece', status: 'QUOTED', score: 70, createdAt: new Date(), updatedAt: new Date(), artist: null, quotes: [], placement: null, size: null },
    ]);

    const result = await listMyLeads({}, EMAIL);

    expect(mockLeadCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: EMAIL } }),
    );
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });

  it('returns an empty list when no leads match the email', async () => {
    mockLeadCount.mockResolvedValue(0);
    mockLeadFindMany.mockResolvedValue([]);

    const result = await listMyLeads({}, 'unknown@example.com');

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

// ─── updateMyProfile ──────────────────────────────────────────────────────────

describe('updateMyProfile', () => {
  const USER_ID = 'user_01';

  function makeUser(overrides: Record<string, unknown> = {}) {
    return {
      id:               USER_ID,
      email:            'customer@example.com',
      name:             'Alice',
      phone:            '+447700900000',
      marketingConsent: false,
      gdprConsentAt:    null,
      loyaltyBalance:   0,
      createdAt:        new Date(),
      updatedAt:        new Date(),
      ...overrides,
    };
  }

  beforeEach(() => jest.clearAllMocks());

  it('updates name only', async () => {
    mockUserFindUnique.mockResolvedValue(makeUser());
    mockUserUpdate.mockResolvedValue(makeUser({ name: 'Alicia' }));

    const result = await updateMyProfile({ name: 'Alicia' }, USER_ID);

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Alicia' } }),
    );
    expect(result.name).toBe('Alicia');
  });

  it('updates phone only', async () => {
    mockUserFindUnique.mockResolvedValue(makeUser());
    mockUserUpdate.mockResolvedValue(makeUser({ phone: '+447700900001' }));

    await updateMyProfile({ phone: '+447700900001' }, USER_ID);

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: '+447700900001' } }),
    );
  });

  it('sets gdprConsentAt when marketingConsent first turned on', async () => {
    mockUserFindUnique.mockResolvedValue(makeUser({ marketingConsent: false, gdprConsentAt: null }));
    const now = new Date();
    mockUserUpdate.mockResolvedValue(makeUser({ marketingConsent: true, gdprConsentAt: now }));

    await updateMyProfile({ marketingConsent: true }, USER_ID);

    const updateData = mockUserUpdate.mock.calls[0][0].data;
    expect(updateData.marketingConsent).toBe(true);
    expect(updateData.gdprConsentAt).toBeInstanceOf(Date);
  });

  it('does not change gdprConsentAt when marketingConsent set to false', async () => {
    const existing = new Date('2025-01-01');
    mockUserFindUnique.mockResolvedValue(makeUser({ marketingConsent: true, gdprConsentAt: existing }));
    mockUserUpdate.mockResolvedValue(makeUser({ marketingConsent: false, gdprConsentAt: existing }));

    await updateMyProfile({ marketingConsent: false }, USER_ID);

    const updateData = mockUserUpdate.mock.calls[0][0].data;
    expect(updateData.gdprConsentAt).toBeUndefined();
  });

  it('updates all fields together', async () => {
    mockUserFindUnique.mockResolvedValue(makeUser());
    mockUserUpdate.mockResolvedValue(makeUser({ name: 'Bob', phone: '+441234567890', marketingConsent: true }));

    await updateMyProfile({ name: 'Bob', phone: '+441234567890', marketingConsent: true }, USER_ID);

    const updateData = mockUserUpdate.mock.calls[0][0].data;
    expect(updateData).toMatchObject({ name: 'Bob', phone: '+441234567890', marketingConsent: true });
  });

  it('throws 404 when user is not found', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    await expect(updateMyProfile({ name: 'Ghost' }, USER_ID)).rejects.toMatchObject({
      statusCode: 404,
      code:       'NOT_FOUND',
    });
  });
});
