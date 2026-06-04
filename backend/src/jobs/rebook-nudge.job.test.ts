/**
 * Unit tests for rebook-nudge.job.ts — Phase 1 (Messaging Foundation)
 *
 * All external dependencies are mocked:
 *   - ../lib/prisma              — database calls
 *   - ../lib/notification-dispatcher — notification dispatch
 *   - ../utils/logger            — silenced in tests
 *
 * Coverage:
 *  ✓ enqueueRebookNudge
 *      — enqueues job with correct data
 *      — enqueues job with correct delay
 *      — logs error on queue failure (doesn't throw)
 *      — includes bookingId in log
 *      — passes all required fields to the queue
 *      — handles zero delay
 *
 * Total: 6 tests across 1 describe
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── BullMQ mock ─────────────────────────────────────────────────────────────

const mockAdd = jest.fn();

jest.mock('bullmq', () => ({
  Queue:  jest.fn().mockImplementation(() => ({
    add: (...a: unknown[]) => mockAdd(...a),
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ on: jest.fn() })));

// ─── Prisma mock ──────────────────────────────────────────────────────────────

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    booking: { findFirst: jest.fn() },
  },
}));

// ─── Notification dispatcher mock ────────────────────────────────────────────

jest.mock('../lib/notification-dispatcher', () => ({
  dispatchNotification: jest.fn().mockResolvedValue(undefined),
}));

// ─── Logger mock ─────────────────────────────────────────────────────────────

const mockLogInfo  = jest.fn();
const mockLogError = jest.fn();

jest.mock('../utils/logger', () => ({
  logger: {
    warn:  jest.fn(),
    error: (...a: unknown[]) => mockLogError(...a),
    info:  (...a: unknown[]) => mockLogInfo(...a),
    debug: jest.fn(),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { enqueueRebookNudge, RebookNudgeJobData } from './rebook-nudge.job';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const nudgeData: RebookNudgeJobData = {
  bookingId:    'bk_1',
  customerId:   'u_1',
  artistId:     'a_1',
  serviceId:    's_1',
  tenantId:     'tenant_1',
  studioName:   'The Ink Spot',
  customerName: 'Jane Doe',
  phone:        '+61400000000',
  email:        'jane@test.com',
  serviceName:  'Tattoo Session',
  channel:      'SMS',
};

// ─────────────────────────────────────────────────────────────────────────────
// enqueueRebookNudge
// ─────────────────────────────────────────────────────────────────────────────

describe('enqueueRebookNudge', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enqueues job with correct data', async () => {
    mockAdd.mockResolvedValue({ id: 'job_1' });

    await enqueueRebookNudge(nudgeData, 86400000);

    expect(mockAdd).toHaveBeenCalledWith(
      'rebook-nudge',
      nudgeData,
      { delay: 86400000 },
    );
  });

  it('enqueues job with correct delay', async () => {
    mockAdd.mockResolvedValue({ id: 'job_1' });
    const delayMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    await enqueueRebookNudge(nudgeData, delayMs);

    expect(mockAdd).toHaveBeenCalledWith(
      'rebook-nudge',
      expect.any(Object),
      { delay: delayMs },
    );
  });

  it('logs error on queue failure (doesn\'t throw)', async () => {
    mockAdd.mockRejectedValue(new Error('Redis unavailable'));

    await expect(
      enqueueRebookNudge(nudgeData, 86400000),
    ).resolves.toBeUndefined();

    expect(mockLogError).toHaveBeenCalledWith(
      'Failed to enqueue rebook nudge',
      expect.objectContaining({ bookingId: 'bk_1' }),
    );
  });

  it('includes bookingId in log', async () => {
    mockAdd.mockResolvedValue({ id: 'job_1' });

    await enqueueRebookNudge(nudgeData, 86400000);

    expect(mockLogInfo).toHaveBeenCalledWith(
      'Rebook nudge job enqueued',
      expect.objectContaining({ bookingId: 'bk_1' }),
    );
  });

  it('passes all required fields to the queue', async () => {
    mockAdd.mockResolvedValue({ id: 'job_1' });

    await enqueueRebookNudge(nudgeData, 1000);

    const [, jobData] = mockAdd.mock.calls[0];
    expect(jobData).toMatchObject({
      bookingId:    'bk_1',
      customerId:   'u_1',
      artistId:     'a_1',
      customerName: 'Jane Doe',
      phone:        '+61400000000',
      email:        'jane@test.com',
      serviceName:  'Tattoo Session',
      channel:      'SMS',
    });
  });

  it('handles zero delay', async () => {
    mockAdd.mockResolvedValue({ id: 'job_1' });

    await enqueueRebookNudge(nudgeData, 0);

    expect(mockAdd).toHaveBeenCalledWith(
      'rebook-nudge',
      nudgeData,
      { delay: 0 },
    );
  });
});
