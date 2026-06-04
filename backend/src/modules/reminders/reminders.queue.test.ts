/**
 * Unit tests for the Appointment Reminder Automation Module — Step 1.20
 *
 * Tests cover:
 *
 *  ✓ enqueueBookingReminder (reminders.queue)
 *      — enqueues a job with the correct BullMQ job name
 *      — uses the deterministic jobId format `booking-reminder-{bookingId}`
 *      — embeds all required fields in the job payload
 *      — serialises bookingStartAt to ISO string in the payload
 *      — computes delay as bookingStartAt − now − REMINDER_DEFAULT_DELAY_MS
 *      — computed delay is bracketed by timestamps captured before/after the call
 *      — respects a custom delayMs override (bypasses "too soon" guard)
 *      — includes studioAddress when provided
 *      — defaults studioAddress to empty string when not provided
 *      — skips enqueueing when EMAIL_REMINDERS_ENABLED flag is OFF
 *      — skips enqueueing when customerEmail is empty string
 *      — skips enqueueing when computed delay is zero or negative (too soon)
 *      — handles queue.add failure gracefully without throwing
 *      — enqueueBookingReminder is exported and is a function
 *      — reminderQueue singleton is exported and has add and getJob methods
 *      — getReminderJobId returns the correct deterministic format
 *
 *  ✓ cancelBookingReminder (reminders.queue)
 *      — calls getJob with the correct deterministic jobId
 *      — calls job.remove() when a pending job is found
 *      — no-ops silently when the job does not exist (already fired)
 *      — skips when EMAIL_REMINDERS_ENABLED flag is OFF
 *      — handles getJob failure gracefully without throwing
 *      — handles job.remove failure gracefully without throwing
 *
 *  ✓ processReminderJob (reminders.processor)
 *      — calls sendEmail with the correct template key 'booking-reminder'
 *      — sends the email to the customer address
 *      — passes all expected template variables to sendEmail
 *      — formats bookingDate in en-GB locale with UTC timezone
 *      — formats bookingTime as HH:MM in UTC
 *      — completes silently (no throw) on TEMPLATE_NOT_FOUND
 *      — completes silently (no throw) on TEMPLATE_INACTIVE
 *      — re-throws on generic Error objects (enables BullMQ retry)
 *
 *  ✓ startReminderWorker (reminders.processor)
 *      — creates a BullMQ Worker on REMINDER_QUEUE_NAME
 *      — registers 'completed' and 'failed' event listeners
 *      — returns the worker instance
 */

// ─── Env vars MUST be set before any module import ────────────────────────────

process.env['BUSINESS_TYPE']     = 'tattoo_studio';
process.env['DATABASE_URL']      = 'postgresql://test';
process.env['NODE_ENV']          = 'test';
process.env['JWT_ACCESS_SECRET'] = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock BullMQ (prevents real Redis connections at module load) ─────────────

const mockJobRemove = jest.fn().mockResolvedValue(undefined);
const mockQueueAdd  = jest.fn().mockResolvedValue({ id: 'job_reminder_001' });
const mockQueueGetJob = jest.fn().mockResolvedValue(null); // default: no job found
const mockWorkerOn  = jest.fn();
const mockWorkerClose = jest.fn();

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add:    mockQueueAdd,
    getJob: mockQueueGetJob,
    close:  jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on:    mockWorkerOn,
    close: mockWorkerClose,
  })),
}));

// ─── Mock Resend / notifications.service ──────────────────────────────────────
// sendEmail is called by the processor; mock it to avoid real DB + Resend calls.

const mockSendEmail = jest.fn().mockResolvedValue(undefined);

jest.mock('../notifications/notifications.service', () => ({
  sendEmail: mockSendEmail,
}));

// ─── Mock Prisma (pulled in transitively by notifications.service import) ─────

jest.mock('../../lib/prisma', () => ({
  prisma: {
    emailTemplate: { findUnique: jest.fn() },
  },
}));

// ─── Mock Resend SDK ──────────────────────────────────────────────────────────

jest.mock('../../lib/resend', () => ({
  resend: { emails: { send: jest.fn() } },
}));

// ─── Mock ioredis (prevents network calls from queue/worker constructors) ─────

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on:         jest.fn(),
    disconnect: jest.fn(),
    quit:       jest.fn(),
    status:     'ready',
  }));
});

// ─── Imports (AFTER mocks) ────────────────────────────────────────────────────

import * as businessType from '../../config/businessType';
import {
  enqueueBookingReminder,
  cancelBookingReminder,
  getReminderJobId,
  reminderQueue,
  REMINDER_JOB_NAME,
  REMINDER_DEFAULT_DELAY_MS,
  type ReminderJobData,
} from './reminders.queue';
import {
  processReminderJob,
  startReminderWorker,
  REMINDER_EMAIL_TEMPLATE_KEY,
} from './reminders.processor';
import { AppError } from '../../errors/AppError';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const BOOKING_ID     = 'cla0000000000000000000001';
const CUSTOMER_EMAIL = 'jane@example.com';
const CUSTOMER_NAME  = 'Jane Smith';
const STUDIO_NAME    = 'Black Rose Studio';
const ARTIST_NAME    = 'Alex Ink';
const SERVICE_NAME   = 'Full Sleeve Tattoo';
const STUDIO_ADDRESS = '42 Ink Lane, London, EC1A 1AA';

/** A booking start time 48 h from now — well within the reminder window. */
const FUTURE_START = new Date(Date.now() + 48 * 60 * 60 * 1_000);

const baseParams: Parameters<typeof enqueueBookingReminder>[0] = {
  bookingId:      BOOKING_ID,
  bookingStartAt: FUTURE_START,
  customerEmail:  CUSTOMER_EMAIL,
  customerName:   CUSTOMER_NAME,
  studioName:     STUDIO_NAME,
  artistName:     ARTIST_NAME,
  serviceName:    SERVICE_NAME,
  delayMs:        5_000, // always use explicit delay so tests are time-stable
};

/** Builds a minimal mock BullMQ Job for processReminderJob tests. */
function makeJob(data: ReminderJobData): Parameters<typeof processReminderJob>[0] {
  return {
    id:           'job_reminder_001',
    name:         REMINDER_JOB_NAME,
    data,
    attemptsMade: 0,
  } as unknown as Parameters<typeof processReminderJob>[0];
}

// ─── Reset between tests ──────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env['BUSINESS_TYPE'] = 'tattoo_studio';
});

// ─────────────────────────────────────────────────────────────────────────────
// enqueueBookingReminder
// ─────────────────────────────────────────────────────────────────────────────

describe('enqueueBookingReminder', () => {
  it('enqueues a job with the correct BullMQ job name', async () => {
    await enqueueBookingReminder(baseParams);
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    const [jobName] = mockQueueAdd.mock.calls[0] as [string, unknown, unknown];
    expect(jobName).toBe(REMINDER_JOB_NAME);
    expect(REMINDER_JOB_NAME).toBe('booking-reminder');
  });

  it('uses the deterministic jobId booking-reminder-{bookingId}', async () => {
    await enqueueBookingReminder(baseParams);
    const [,, opts] = mockQueueAdd.mock.calls[0] as [string, ReminderJobData, { jobId: string }];
    expect(opts.jobId).toBe(`booking-reminder-${BOOKING_ID}`);
  });

  it('embeds all required fields in the job payload', async () => {
    await enqueueBookingReminder(baseParams);
    const [, jobData] = mockQueueAdd.mock.calls[0] as [string, ReminderJobData, unknown];
    expect(jobData.bookingId).toBe(BOOKING_ID);
    expect(jobData.customerEmail).toBe(CUSTOMER_EMAIL);
    expect(jobData.customerName).toBe(CUSTOMER_NAME);
    expect(jobData.studioName).toBe(STUDIO_NAME);
    expect(jobData.artistName).toBe(ARTIST_NAME);
    expect(jobData.serviceName).toBe(SERVICE_NAME);
  });

  it('serialises bookingStartAt to an ISO string in the payload', async () => {
    await enqueueBookingReminder(baseParams);
    const [, jobData] = mockQueueAdd.mock.calls[0] as [string, ReminderJobData, unknown];
    expect(typeof jobData.bookingStartAt).toBe('string');
    expect(jobData.bookingStartAt).toBe(FUTURE_START.toISOString());
  });

  it('computes delay as bookingStartAt.getTime() − Date.now() − REMINDER_DEFAULT_DELAY_MS', async () => {
    // Use a booking 72 h from now so computed delay is well above zero.
    const FAR_FUTURE_START = new Date(Date.now() + 72 * 60 * 60 * 1_000);
    // Remove the delayMs override so the computed-delay code path executes.
    const { delayMs: _omit, ...rest } = baseParams;

    const beforeCall = Date.now();
    await enqueueBookingReminder({ ...rest, bookingStartAt: FAR_FUTURE_START });
    const afterCall = Date.now();

    const [,, opts] = mockQueueAdd.mock.calls[0] as [string, ReminderJobData, { delay: number }];

    // The computed delay must fall inside the bracket
    //   [FAR_FUTURE_START − afterCall − REMINDER_DEFAULT_DELAY_MS,
    //    FAR_FUTURE_START − beforeCall − REMINDER_DEFAULT_DELAY_MS]
    // which collapses to ~172 800 000 ms (48 h) ± execution time.
    const expectedMax = FAR_FUTURE_START.getTime() - beforeCall - REMINDER_DEFAULT_DELAY_MS;
    const expectedMin = FAR_FUTURE_START.getTime() - afterCall  - REMINDER_DEFAULT_DELAY_MS;
    expect(opts.delay).toBeGreaterThanOrEqual(expectedMin);
    expect(opts.delay).toBeLessThanOrEqual(expectedMax);
  });

  it('respects a custom delayMs override', async () => {
    const CUSTOM_DELAY = 60_000; // 1 minute
    await enqueueBookingReminder({ ...baseParams, delayMs: CUSTOM_DELAY });
    const [,, opts] = mockQueueAdd.mock.calls[0] as [string, ReminderJobData, { delay: number }];
    expect(opts.delay).toBe(CUSTOM_DELAY);
  });

  it('includes studioAddress in the payload when provided', async () => {
    await enqueueBookingReminder({ ...baseParams, studioAddress: STUDIO_ADDRESS });
    const [, jobData] = mockQueueAdd.mock.calls[0] as [string, ReminderJobData, unknown];
    expect(jobData.studioAddress).toBe(STUDIO_ADDRESS);
  });

  it('defaults studioAddress to empty string when not provided', async () => {
    const { studioAddress: _omit, ...rest } = { ...baseParams, studioAddress: undefined };
    await enqueueBookingReminder(rest);
    const [, jobData] = mockQueueAdd.mock.calls[0] as [string, ReminderJobData, unknown];
    expect(jobData.studioAddress).toBe('');
  });

  it('skips enqueueing when EMAIL_REMINDERS_ENABLED flag is OFF', async () => {
    const spy = jest
      .spyOn(businessType, 'getDefaultFlags')
      .mockReturnValueOnce({ ...businessType.getDefaultFlags(), EMAIL_REMINDERS_ENABLED: false });

    await enqueueBookingReminder(baseParams);
    expect(mockQueueAdd).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('skips enqueueing when customerEmail is empty string', async () => {
    await enqueueBookingReminder({ ...baseParams, customerEmail: '' });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('skips enqueueing when computed delay is zero (booking starts exactly now + 24 h)', async () => {
    // Remove delayMs override so the computed path is exercised.
    // bookingStartAt = now + REMINDER_DEFAULT_DELAY_MS → computed delay = 0
    const tooSoon = new Date(Date.now() + REMINDER_DEFAULT_DELAY_MS);
    const { delayMs: _omit, ...rest } = baseParams;
    await enqueueBookingReminder({ ...rest, bookingStartAt: tooSoon });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('skips enqueueing when computed delay is negative (booking in the past)', async () => {
    const past = new Date(Date.now() - 1_000);
    const { delayMs: _omit, ...rest } = baseParams;
    await enqueueBookingReminder({ ...rest, bookingStartAt: past });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('handles queue.add failure gracefully without throwing', async () => {
    mockQueueAdd.mockRejectedValueOnce(new Error('Redis connection refused'));
    await expect(enqueueBookingReminder(baseParams)).resolves.toBeUndefined();
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
  });

  it('enqueueBookingReminder is exported and is a function', () => {
    expect(enqueueBookingReminder).toBeDefined();
    expect(typeof enqueueBookingReminder).toBe('function');
  });

  it('reminderQueue singleton is exported and has add and getJob methods', () => {
    expect(reminderQueue).toBeDefined();
    expect(typeof reminderQueue.add).toBe('function');
    expect(typeof reminderQueue.getJob).toBe('function');
  });

  it('getReminderJobId returns the correct deterministic format', () => {
    expect(getReminderJobId('abc123')).toBe('booking-reminder-abc123');
    expect(getReminderJobId(BOOKING_ID)).toBe(`booking-reminder-${BOOKING_ID}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cancelBookingReminder
// ─────────────────────────────────────────────────────────────────────────────

describe('cancelBookingReminder', () => {
  it('calls getJob with the correct deterministic jobId', async () => {
    await cancelBookingReminder(BOOKING_ID);
    expect(mockQueueGetJob).toHaveBeenCalledWith(`booking-reminder-${BOOKING_ID}`);
  });

  it('calls job.remove() when a pending job is found', async () => {
    mockQueueGetJob.mockResolvedValueOnce({ remove: mockJobRemove });
    await cancelBookingReminder(BOOKING_ID);
    expect(mockJobRemove).toHaveBeenCalledTimes(1);
  });

  it('no-ops silently when the job does not exist (getJob returns null)', async () => {
    mockQueueGetJob.mockResolvedValueOnce(null);
    await expect(cancelBookingReminder(BOOKING_ID)).resolves.toBeUndefined();
    expect(mockJobRemove).not.toHaveBeenCalled();
  });

  it('skips when EMAIL_REMINDERS_ENABLED flag is OFF', async () => {
    const spy = jest
      .spyOn(businessType, 'getDefaultFlags')
      .mockReturnValueOnce({ ...businessType.getDefaultFlags(), EMAIL_REMINDERS_ENABLED: false });

    await cancelBookingReminder(BOOKING_ID);
    expect(mockQueueGetJob).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('handles getJob failure gracefully without throwing', async () => {
    mockQueueGetJob.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(cancelBookingReminder(BOOKING_ID)).resolves.toBeUndefined();
  });

  it('handles job.remove failure gracefully without throwing', async () => {
    mockQueueGetJob.mockResolvedValueOnce({
      remove: jest.fn().mockRejectedValueOnce(new Error('Remove failed')),
    });
    await expect(cancelBookingReminder(BOOKING_ID)).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// processReminderJob
// ─────────────────────────────────────────────────────────────────────────────

describe('processReminderJob', () => {
  /** Fixed ISO start — Monday 14 April 2025 14:30 UTC */
  const FIXED_START_ISO = '2025-04-14T14:30:00.000Z';

  const baseJobData: ReminderJobData = {
    bookingId:      BOOKING_ID,
    bookingStartAt: FIXED_START_ISO,
    customerEmail:  CUSTOMER_EMAIL,
    customerName:   CUSTOMER_NAME,
    studioName:     STUDIO_NAME,
    artistName:     ARTIST_NAME,
    serviceName:    SERVICE_NAME,
    studioAddress:  STUDIO_ADDRESS,
  };

  it("calls sendEmail with the template key 'booking-reminder'", async () => {
    await processReminderJob(makeJob(baseJobData));
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const [key] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(key).toBe(REMINDER_EMAIL_TEMPLATE_KEY);
    expect(REMINDER_EMAIL_TEMPLATE_KEY).toBe('booking-reminder');
  });

  it('sends the email to the customer address', async () => {
    await processReminderJob(makeJob(baseJobData));
    const [, to] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(to).toBe(CUSTOMER_EMAIL);
  });

  it('passes customerName to sendEmail', async () => {
    await processReminderJob(makeJob(baseJobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(vars['customerName']).toBe(CUSTOMER_NAME);
  });

  it('passes studioName to sendEmail', async () => {
    await processReminderJob(makeJob(baseJobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(vars['studioName']).toBe(STUDIO_NAME);
  });

  it('passes artistName to sendEmail', async () => {
    await processReminderJob(makeJob(baseJobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(vars['artistName']).toBe(ARTIST_NAME);
  });

  it('passes serviceName to sendEmail', async () => {
    await processReminderJob(makeJob(baseJobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(vars['serviceName']).toBe(SERVICE_NAME);
  });

  it('passes studioAddress to sendEmail', async () => {
    await processReminderJob(makeJob(baseJobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(vars['studioAddress']).toBe(STUDIO_ADDRESS);
  });

  it('passes bookingId to sendEmail', async () => {
    await processReminderJob(makeJob(baseJobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(vars['bookingId']).toBe(BOOKING_ID);
  });

  it('formats bookingDate in en-GB locale with UTC timezone', async () => {
    await processReminderJob(makeJob(baseJobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    const expectedDate = new Date(FIXED_START_ISO).toLocaleDateString('en-GB', {
      weekday:  'long',
      year:     'numeric',
      month:    'long',
      day:      'numeric',
      timeZone: 'UTC',
    });
    expect(vars['bookingDate']).toBe(expectedDate);
  });

  it('formats bookingTime as HH:MM in UTC', async () => {
    await processReminderJob(makeJob(baseJobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    const expectedTime = new Date(FIXED_START_ISO).toLocaleTimeString('en-GB', {
      hour:     '2-digit',
      minute:   '2-digit',
      timeZone: 'UTC',
    });
    expect(vars['bookingTime']).toBe(expectedTime);
  });

  it('completes silently (no throw) on TEMPLATE_NOT_FOUND', async () => {
    mockSendEmail.mockRejectedValueOnce(
      new AppError(404, 'TEMPLATE_NOT_FOUND', 'Template not found'),
    );
    await expect(processReminderJob(makeJob(baseJobData))).resolves.toBeUndefined();
  });

  it('completes silently (no throw) on TEMPLATE_INACTIVE', async () => {
    mockSendEmail.mockRejectedValueOnce(
      new AppError(409, 'TEMPLATE_INACTIVE', 'Template is inactive'),
    );
    await expect(processReminderJob(makeJob(baseJobData))).resolves.toBeUndefined();
  });

  it('re-throws on generic Error to enable BullMQ retry', async () => {
    const networkError = new Error('Resend API timeout');
    mockSendEmail.mockRejectedValueOnce(networkError);
    await expect(processReminderJob(makeJob(baseJobData))).rejects.toThrow('Resend API timeout');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// startReminderWorker
// ─────────────────────────────────────────────────────────────────────────────

describe('startReminderWorker', () => {
  it('creates a BullMQ Worker on the correct queue name', () => {
    const { Worker } = jest.requireMock<{ Worker: jest.Mock }>('bullmq');
    startReminderWorker();
    expect(Worker).toHaveBeenCalledWith(
      'booking-reminder',
      expect.any(Function),
      expect.objectContaining({ concurrency: 5 }),
    );
  });

  it("registers a 'completed' event listener", () => {
    startReminderWorker();
    const completedCall = mockWorkerOn.mock.calls.find(
      (c: unknown[]) => c[0] === 'completed',
    );
    expect(completedCall).toBeDefined();
    expect(typeof completedCall![1]).toBe('function');
  });

  it("registers a 'failed' event listener", () => {
    startReminderWorker();
    const failedCall = mockWorkerOn.mock.calls.find(
      (c: unknown[]) => c[0] === 'failed',
    );
    expect(failedCall).toBeDefined();
    expect(typeof failedCall![1]).toBe('function');
  });

  it('returns the worker instance', () => {
    const worker = startReminderWorker();
    expect(worker).toBeDefined();
    expect(typeof worker.on).toBe('function');
  });
});
