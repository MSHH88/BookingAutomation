/**
 * Recurring booking job — unit tests
 *
 * Defense-in-depth: processor skips notification when customer's tenant does
 * not match recurring booking's tenant.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

const mockRecurringFindMany = jest.fn();
const mockRecurringUpdate   = jest.fn();
const mockUserFindUnique    = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    recurringBooking: {
      findMany: (...a: unknown[]) => mockRecurringFindMany(...a),
      update:   (...a: unknown[]) => mockRecurringUpdate(...a),
    },
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
    },
  },
}));

const mockDispatch = jest.fn().mockResolvedValue(undefined);
jest.mock('../lib/notification-dispatcher', () => ({
  dispatchNotification: (...a: unknown[]) => mockDispatch(...a),
}));

jest.mock('../middleware/requireFeature', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(true),
}));

jest.mock('bullmq', () => ({
  Queue:  jest.fn().mockImplementation(() => ({ add: jest.fn(), close: jest.fn(), getRepeatableJobs: jest.fn().mockResolvedValue([]) })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

import { processRecurringBookings } from './recurring-booking.job';

beforeEach(() => {
  jest.clearAllMocks();
  mockRecurringUpdate.mockResolvedValue({});
});

describe('processRecurringBookings', () => {
  const fakeJob = { data: { runDate: '2026-04-20T00:00:00Z' } } as any;

  it('sends notification when customer tenant matches recurring tenant', async () => {
    mockRecurringFindMany.mockResolvedValue([
      { id: 'rb_1', tenantId: 'tenant_a', customerId: 'cust_1', nextBookingDate: new Date('2026-04-20'), intervalDays: 30 },
    ]);
    mockUserFindUnique.mockResolvedValue({
      id: 'cust_1', tenantId: 'tenant_a', name: 'Alice', phone: null, email: 'a@x.com', notificationChannel: 'EMAIL', isActive: true,
    });

    await processRecurringBookings(fakeJob);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('skips notification when customer belongs to a different tenant', async () => {
    mockRecurringFindMany.mockResolvedValue([
      { id: 'rb_1', tenantId: 'tenant_a', customerId: 'cust_1', nextBookingDate: new Date('2026-04-20'), intervalDays: 30 },
    ]);
    mockUserFindUnique.mockResolvedValue({
      id: 'cust_1', tenantId: 'tenant_b', name: 'Eve', phone: null, email: 'e@x.com', notificationChannel: 'EMAIL', isActive: true,
    });

    await processRecurringBookings(fakeJob);

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
