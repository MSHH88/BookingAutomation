/**
 * Unit tests for the Review-Request Automation Module — Step 1.19
 *
 * Tests cover:
 *
 *  ✓ enqueueReviewRequest (reviews.queue)
 *      — enqueues job with the correct BullMQ job name
 *      — embeds all required fields in the job payload
 *      — uses the default 36-hour delay
 *      — respects a custom delayMs override
 *      — includes optional artistName when provided
 *      — includes optional serviceName when provided
 *      — skips enqueueing when REVIEW_REQUEST_ENABLED feature flag is OFF
 *      — skips enqueueing when customerEmail is empty string
 *      — handles queue.add failure gracefully without throwing
 *      — enqueueReviewRequest is exported and is a function
 *      — reviewQueue singleton is exported and has an add method
 *
 *  ✓ processReviewJob (reviews.processor)
 *      — calls sendEmail with the correct template key
 *      — sends the email to the customer address
 *      — passes all template variables to sendEmail
 *      — falls back to studioName when artistName is absent
 *      — falls back to "appointment" when serviceName is absent
 *      — completes silently (no throw) on TEMPLATE_NOT_FOUND
 *      — completes silently (no throw) on TEMPLATE_INACTIVE
 *      — re-throws on generic Resend/network errors (enables BullMQ retry)
 *      — re-throws on unexpected Error objects (enables BullMQ retry)
 *
 *  ✓ startReviewWorker (reviews.processor)
 *      — creates a BullMQ Worker on the correct queue name
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

const mockQueueAdd  = jest.fn().mockResolvedValue({ id: 'job_review_001' });
const mockWorkerOn  = jest.fn();
const mockWorkerClose = jest.fn();

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add:   mockQueueAdd,
    close: jest.fn(),
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
  resend: {
    emails: { send: jest.fn() },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { Worker } from 'bullmq';
import {
  enqueueReviewRequest,
  reviewQueue,
  REVIEW_JOB_NAME,
  REVIEW_DEFAULT_DELAY_MS,
  type ReviewJobData,
} from './reviews.queue';
import {
  processReviewJob,
  startReviewWorker,
  REVIEW_EMAIL_TEMPLATE_KEY,
} from './reviews.processor';
import { AppError } from '../../errors/AppError';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const BOOKING_ID     = 'clabcdefg0000000000000001';
const CUSTOMER_EMAIL = 'jane@example.com';
const CUSTOMER_NAME  = 'Jane Smith';
const STUDIO_NAME    = 'Black Rose Studio';
const REVIEW_URL     = 'https://g.page/r/CBlack_Rose/review';
const ARTIST_NAME    = 'Alex Ink';
const SERVICE_NAME   = 'Sleeve Tattoo';

const baseParams = {
  bookingId:       BOOKING_ID,
  customerEmail:   CUSTOMER_EMAIL,
  customerName:    CUSTOMER_NAME,
  studioName:      STUDIO_NAME,
  googleReviewUrl: REVIEW_URL,
};

/** Builds a minimal mock BullMQ Job for processReviewJob tests. */
function makeJob(data: ReviewJobData): Parameters<typeof processReviewJob>[0] {
  return {
    id:           'job_001',
    name:         REVIEW_JOB_NAME,
    data,
    attemptsMade: 0,
  } as unknown as Parameters<typeof processReviewJob>[0];
}

// ─── Reset between tests ──────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env['BUSINESS_TYPE'] = 'tattoo_studio';
});

// ─────────────────────────────────────────────────────────────────────────────
// enqueueReviewRequest
// ─────────────────────────────────────────────────────────────────────────────

describe('enqueueReviewRequest', () => {
  it('enqueues a review-request job with the correct job name', async () => {
    await enqueueReviewRequest(baseParams);
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    const [jobName] = mockQueueAdd.mock.calls[0] as [string, unknown, unknown];
    expect(jobName).toBe(REVIEW_JOB_NAME);
  });

  it('embeds all required fields in the job payload', async () => {
    await enqueueReviewRequest(baseParams);
    const [, jobData] = mockQueueAdd.mock.calls[0] as [string, ReviewJobData, unknown];
    expect(jobData.bookingId).toBe(BOOKING_ID);
    expect(jobData.customerEmail).toBe(CUSTOMER_EMAIL);
    expect(jobData.customerName).toBe(CUSTOMER_NAME);
    expect(jobData.studioName).toBe(STUDIO_NAME);
    expect(jobData.googleReviewUrl).toBe(REVIEW_URL);
  });

  it('uses the default 36-hour delay', async () => {
    await enqueueReviewRequest(baseParams);
    const [,, opts] = mockQueueAdd.mock.calls[0] as [string, ReviewJobData, { delay: number }];
    expect(opts.delay).toBe(REVIEW_DEFAULT_DELAY_MS);
  });

  it('respects a custom delayMs override', async () => {
    const CUSTOM_DELAY = 60_000; // 1 minute
    await enqueueReviewRequest({ ...baseParams, delayMs: CUSTOM_DELAY });
    const [,, opts] = mockQueueAdd.mock.calls[0] as [string, ReviewJobData, { delay: number }];
    expect(opts.delay).toBe(CUSTOM_DELAY);
  });

  it('includes artistName when provided', async () => {
    await enqueueReviewRequest({ ...baseParams, artistName: ARTIST_NAME });
    const [, jobData] = mockQueueAdd.mock.calls[0] as [string, ReviewJobData, unknown];
    expect(jobData.artistName).toBe(ARTIST_NAME);
  });

  it('includes serviceName when provided', async () => {
    await enqueueReviewRequest({ ...baseParams, serviceName: SERVICE_NAME });
    const [, jobData] = mockQueueAdd.mock.calls[0] as [string, ReviewJobData, unknown];
    expect(jobData.serviceName).toBe(SERVICE_NAME);
  });

  it('skips enqueueing when REVIEW_REQUEST_ENABLED flag is OFF', async () => {
    process.env['BUSINESS_TYPE'] = 'tattoo_studio';
    // Temporarily force REVIEW_REQUEST_ENABLED to false by using a mock
    // business type that doesn't have it — we spy on getDefaultFlags instead.
    const businessType = await import('../../config/businessType');
    const spy = jest
      .spyOn(businessType, 'getDefaultFlags')
      .mockReturnValueOnce({ ...businessType.getDefaultFlags(), REVIEW_REQUEST_ENABLED: false });

    await enqueueReviewRequest(baseParams);
    expect(mockQueueAdd).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('skips enqueueing when customerEmail is empty string', async () => {
    await enqueueReviewRequest({ ...baseParams, customerEmail: '' });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('handles queue.add failure gracefully without throwing', async () => {
    mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(enqueueReviewRequest(baseParams)).resolves.toBeUndefined();
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
  });

  it('is exported from the queue module (not undefined)', () => {
    expect(enqueueReviewRequest).toBeDefined();
    expect(typeof enqueueReviewRequest).toBe('function');
  });

  it('reviewQueue singleton is exported and has an add method', () => {
    expect(reviewQueue).toBeDefined();
    expect(typeof reviewQueue.add).toBe('function');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// processReviewJob
// ─────────────────────────────────────────────────────────────────────────────

describe('processReviewJob', () => {
  const baseJobData: ReviewJobData = {
    bookingId:       BOOKING_ID,
    customerEmail:   CUSTOMER_EMAIL,
    customerName:    CUSTOMER_NAME,
    studioName:      STUDIO_NAME,
    googleReviewUrl: REVIEW_URL,
    artistName:      ARTIST_NAME,
    serviceName:     SERVICE_NAME,
  };

  it('calls sendEmail with the review-request template key', async () => {
    await processReviewJob(makeJob(baseJobData));
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const [key] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(key).toBe(REVIEW_EMAIL_TEMPLATE_KEY);
    expect(REVIEW_EMAIL_TEMPLATE_KEY).toBe('review-request');
  });

  it('sends the email to the customer address', async () => {
    await processReviewJob(makeJob(baseJobData));
    const [, to] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(to).toBe(CUSTOMER_EMAIL);
  });

  it('passes all template variables to sendEmail', async () => {
    await processReviewJob(makeJob(baseJobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(vars['customerName']).toBe(CUSTOMER_NAME);
    expect(vars['studioName']).toBe(STUDIO_NAME);
    expect(vars['googleReviewUrl']).toBe(REVIEW_URL);
    expect(vars['artistName']).toBe(ARTIST_NAME);
    expect(vars['serviceName']).toBe(SERVICE_NAME);
  });

  it('falls back to studioName when artistName is absent', async () => {
    const jobData = { ...baseJobData, artistName: undefined };
    await processReviewJob(makeJob(jobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(vars['artistName']).toBe(STUDIO_NAME);
  });

  it('falls back to "appointment" when serviceName is absent', async () => {
    const jobData = { ...baseJobData, serviceName: undefined };
    await processReviewJob(makeJob(jobData));
    const [,, vars] = mockSendEmail.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(vars['serviceName']).toBe('appointment');
  });

  it('completes silently (no throw) on TEMPLATE_NOT_FOUND', async () => {
    mockSendEmail.mockRejectedValueOnce(
      new AppError(404, 'TEMPLATE_NOT_FOUND', "Email template 'review-request' not found"),
    );
    await expect(processReviewJob(makeJob(baseJobData))).resolves.toBeUndefined();
  });

  it('completes silently (no throw) on TEMPLATE_INACTIVE', async () => {
    mockSendEmail.mockRejectedValueOnce(
      new AppError(409, 'TEMPLATE_INACTIVE', "Email template 'review-request' is inactive"),
    );
    await expect(processReviewJob(makeJob(baseJobData))).resolves.toBeUndefined();
  });

  it('re-throws on generic Resend API errors (enables BullMQ retry)', async () => {
    mockSendEmail.mockRejectedValueOnce(
      new AppError(502, 'EMAIL_SEND_FAILED', 'Failed to send email: upstream error'),
    );
    await expect(processReviewJob(makeJob(baseJobData))).rejects.toMatchObject({
      code: 'EMAIL_SEND_FAILED',
    });
  });

  it('re-throws on unexpected Error objects (enables BullMQ retry)', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('Network timeout'));
    await expect(processReviewJob(makeJob(baseJobData))).rejects.toThrow('Network timeout');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// startReviewWorker
// ─────────────────────────────────────────────────────────────────────────────

describe('startReviewWorker', () => {
  it('creates a BullMQ Worker targeting the review-request queue', () => {
    startReviewWorker();
    expect(Worker).toHaveBeenCalledWith(
      'review-request',
      processReviewJob,
      expect.objectContaining({ concurrency: 3 }),
    );
  });

  it('registers "completed" and "failed" event listeners on the worker', () => {
    startReviewWorker();
    const registeredEvents = (mockWorkerOn.mock.calls as [string, unknown][])
      .map(([event]) => event);
    expect(registeredEvents).toContain('completed');
    expect(registeredEvents).toContain('failed');
  });

  it('returns the worker instance', () => {
    const worker = startReviewWorker();
    expect(worker).toBeDefined();
    expect(typeof worker.on).toBe('function');
  });
});
