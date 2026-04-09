/**
 * Unit tests for recurring-bookings.service.ts — Phase 1, Step 1.8
 *
 * Prisma is fully mocked so these tests run without a live database.
 *
 * Coverage:
 *  ✓ listRecurringBookings
 *      — returns paginated results with no filters
 *      — filters by isActive
 *      — filters by customerId
 *      — applies tenant scoping
 *
 *  ✓ getRecurringBooking
 *      — returns record when found
 *      — throws 404 when not found
 *
 *  ✓ createRecurringBooking
 *      — creates record with all fields
 *      — creates record with optional fields omitted
 *
 *  ✓ updateRecurringBooking
 *      — updates intervalDays
 *      — updates nextBookingDate
 *      — updates isActive
 *      — throws 404 when record not found
 *
 *  ✓ deactivateRecurringBooking
 *      — sets isActive to false
 *      — throws 404 when record not found
 *      — deactivates already inactive record (idempotent)
 *
 * 15 tests total
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockFindFirst  = jest.fn();
const mockFindMany   = jest.fn();
const mockCount      = jest.fn();
const mockCreate     = jest.fn();
const mockUpdate     = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    recurringBooking: {
      findFirst:  (...a: unknown[]) => mockFindFirst(...a),
      findMany:   (...a: unknown[]) => mockFindMany(...a),
      count:      (...a: unknown[]) => mockCount(...a),
      create:     (...a: unknown[]) => mockCreate(...a),
      update:     (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

jest.mock('bullmq', () => ({
  Queue:  jest.fn().mockImplementation(() => ({ add: jest.fn(), close: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as service from './recurring-bookings.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const NOW = new Date('2026-04-06T10:00:00Z');

const baseRecord = {
  id:              'rb_1',
  tenantId:        'tenant_1',
  customerId:      'customer_1',
  serviceId:       'service_1',
  artistId:        'artist_1',
  intervalDays:    30,
  nextBookingDate: new Date('2026-05-06T10:00:00Z'),
  isActive:        true,
  createdAt:       NOW,
  updatedAt:       NOW,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// listRecurringBookings
// ─────────────────────────────────────────────────────────────────────────────

describe('listRecurringBookings', () => {
  it('returns paginated results with no filters', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([baseRecord]);

    const result = await service.listRecurringBookings('tenant_1', {});

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(mockCount).toHaveBeenCalled();
    expect(mockFindMany).toHaveBeenCalled();
  });

  it('filters by isActive', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await service.listRecurringBookings('tenant_1', { isActive: true });

    const countArgs = mockCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.isActive).toBe(true);
  });

  it('filters by customerId', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await service.listRecurringBookings('tenant_1', { customerId: 'customer_1' });

    const countArgs = mockCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.customerId).toBe('customer_1');
  });

  it('applies tenant scoping', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await service.listRecurringBookings('tenant_1', {});

    const countArgs = mockCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.tenantId).toBe('tenant_1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getRecurringBooking
// ─────────────────────────────────────────────────────────────────────────────

describe('getRecurringBooking', () => {
  it('returns record when found', async () => {
    mockFindFirst.mockResolvedValue(baseRecord);

    const result = await service.getRecurringBooking('tenant_1', 'rb_1');

    expect(result.id).toBe('rb_1');
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'rb_1', tenantId: 'tenant_1' }),
      }),
    );
  });

  it('throws 404 when not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      service.getRecurringBooking('tenant_1', 'missing'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'RECURRING_BOOKING_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createRecurringBooking
// ─────────────────────────────────────────────────────────────────────────────

describe('createRecurringBooking', () => {
  it('creates record with all fields', async () => {
    mockCreate.mockResolvedValue(baseRecord);

    const result = await service.createRecurringBooking('tenant_1', {
      customerId:      'customer_1',
      serviceId:       'service_1',
      artistId:        'artist_1',
      intervalDays:    30,
      nextBookingDate: '2026-05-06T10:00:00Z',
    });

    expect(result.id).toBe('rb_1');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId:     'tenant_1',
          customerId:   'customer_1',
          serviceId:    'service_1',
          artistId:     'artist_1',
          intervalDays: 30,
          isActive:     true,
        }),
      }),
    );
  });

  it('creates record with optional fields omitted', async () => {
    const minRecord = { ...baseRecord, serviceId: null, artistId: null };
    mockCreate.mockResolvedValue(minRecord);

    const result = await service.createRecurringBooking('tenant_1', {
      customerId:      'customer_1',
      intervalDays:    14,
      nextBookingDate: '2026-05-06T10:00:00Z',
    });

    expect(result.id).toBe('rb_1');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          serviceId: null,
          artistId:  null,
        }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateRecurringBooking
// ─────────────────────────────────────────────────────────────────────────────

describe('updateRecurringBooking', () => {
  it('updates intervalDays', async () => {
    mockFindFirst.mockResolvedValue(baseRecord);
    mockUpdate.mockResolvedValue({ ...baseRecord, intervalDays: 60 });

    const result = await service.updateRecurringBooking('tenant_1', 'rb_1', { intervalDays: 60 });

    expect(result.intervalDays).toBe(60);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ intervalDays: 60 }),
      }),
    );
  });

  it('updates nextBookingDate', async () => {
    const newDate = '2026-06-01T10:00:00Z';
    mockFindFirst.mockResolvedValue(baseRecord);
    mockUpdate.mockResolvedValue({ ...baseRecord, nextBookingDate: new Date(newDate) });

    const result = await service.updateRecurringBooking('tenant_1', 'rb_1', { nextBookingDate: newDate });

    expect(result.nextBookingDate).toEqual(new Date(newDate));
  });

  it('updates isActive', async () => {
    mockFindFirst.mockResolvedValue(baseRecord);
    mockUpdate.mockResolvedValue({ ...baseRecord, isActive: false });

    const result = await service.updateRecurringBooking('tenant_1', 'rb_1', { isActive: false });

    expect(result.isActive).toBe(false);
  });

  it('throws 404 when record not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      service.updateRecurringBooking('tenant_1', 'missing', { intervalDays: 60 }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'RECURRING_BOOKING_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deactivateRecurringBooking
// ─────────────────────────────────────────────────────────────────────────────

describe('deactivateRecurringBooking', () => {
  it('sets isActive to false', async () => {
    mockFindFirst.mockResolvedValue(baseRecord);
    mockUpdate.mockResolvedValue({ ...baseRecord, isActive: false });

    const result = await service.deactivateRecurringBooking('tenant_1', 'rb_1');

    expect(result.isActive).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false },
      }),
    );
  });

  it('throws 404 when record not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      service.deactivateRecurringBooking('tenant_1', 'missing'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'RECURRING_BOOKING_NOT_FOUND' });
  });

  it('deactivates already inactive record (idempotent)', async () => {
    const inactiveRecord = { ...baseRecord, isActive: false };
    mockFindFirst.mockResolvedValue(inactiveRecord);
    mockUpdate.mockResolvedValue(inactiveRecord);

    const result = await service.deactivateRecurringBooking('tenant_1', 'rb_1');

    expect(result.isActive).toBe(false);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
