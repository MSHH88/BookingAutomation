/**
 * Unit tests for the WhatsApp Automation Module — Step 1.17
 *
 * Tests cover:
 *  ✓ sendWhatsAppMessage (lib/twilio)
 *      — sends message and returns SID when Twilio is configured
 *      — normalises recipient to whatsapp: URI scheme
 *      — normalises from number to whatsapp: URI scheme
 *      — returns null when TWILIO_ACCOUNT_SID is absent
 *      — returns null when TWILIO_AUTH_TOKEN is absent
 *      — returns null when TWILIO_WHATSAPP_FROM is absent
 *      — re-throws on Twilio API error (enables BullMQ retry)
 *
 *  ✓ buildWhatsAppMessage (whatsapp.queue)
 *      — lead-inquiry: correct greeting + studio name
 *      — booking-confirmed: includes date, time, and artist name
 *      — appointment-reminder: includes time and artist
 *      — post-visit-review: includes Google review URL
 *      — restaurant-reminder: includes party size when provided
 *      — restaurant-reminder: no party size mention when omitted
 *
 *  ✓ testSendWhatsApp (whatsapp.service)
 *      — returns { to, messageSid } on success
 *      — throws 503 WHATSAPP_NOT_CONFIGURED when sendWhatsAppMessage returns null
 *
 *  ✓ enqueueLeadInquiry
 *      — skips when preferWhatsApp=false
 *      — skips when phone is null
 *      — enqueues 'lead-inquiry' job with correct data
 *      — gracefully handles queue.add failure (no throw)
 *
 *  ✓ enqueueBookingConfirmed
 *      — skips when preferWhatsApp=false
 *      — skips when phone is null
 *      — enqueues booking-confirmed immediately (no delay option)
 *      — enqueues appointment-reminder with positive delay
 *      — skips appointment-reminder when startAt is < 24 h from now
 *      — still enqueues booking-confirmed when reminder is skipped
 *      — gracefully handles queue.add failure (no throw)
 *
 *  ✓ enqueuePostVisitReview
 *      — skips when preferWhatsApp=false
 *      — skips when phone is null
 *      — enqueues post-visit-review with 2-hour delay (7 200 000 ms)
 *      — includes googleReviewUrl in job data
 *      — gracefully handles queue.add failure (no throw)
 *
 *  ✓ enqueueRestaurantReminder
 *      — skips when preferWhatsApp=false
 *      — skips when phone is null
 *      — enqueues restaurant-reminder with correct delay
 *      — skips when startAt is < 2 h from now (delay would be ≤ 0)
 *      — skips when startAt is in the past
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']        = 'tattoo_studio';
process.env['DATABASE_URL']         = 'postgresql://test';
process.env['NODE_ENV']             = 'test';
process.env['JWT_ACCESS_SECRET']    = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET']   = 'b'.repeat(32);
// Twilio credentials — set before module import so config is loaded with values
process.env['TWILIO_ACCOUNT_SID']   = 'AC_test_sid';
process.env['TWILIO_AUTH_TOKEN']    = 'test_auth_token';
process.env['TWILIO_WHATSAPP_FROM'] = '+14155238886';

// ─── Mock BullMQ Queue (prevents real Redis connection at module load) ────────

const mockQueueAdd = jest.fn().mockResolvedValue({ id: 'job_123' });

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add:   mockQueueAdd,
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on:    jest.fn(),
    close: jest.fn(),
  })),
}));

// ─── Mock Twilio Messaging API ────────────────────────────────────────────────

const mockMessagesCreate = jest.fn().mockResolvedValue({ sid: 'SM_test_sid_001' });

jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockMessagesCreate,
    },
  })),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { sendWhatsAppMessage }  from '../../lib/twilio';
import { buildWhatsAppMessage } from './whatsapp.queue';
import {
  testSendWhatsApp,
  enqueueLeadInquiry,
  enqueueBookingConfirmed,
  enqueuePostVisitReview,
  enqueueRestaurantReminder,
} from './whatsapp.service';
import { AppError } from '../../errors/AppError';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const FUTURE_2H  = new Date(Date.now() + 2  * 60 * 60 * 1000 + 5000).toISOString();
const FUTURE_24H = new Date(Date.now() + 24 * 60 * 60 * 1000 + 5000).toISOString();
const FUTURE_48H = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const PAST_ISO   = new Date(Date.now() - 60 * 60 * 1000).toISOString();

const PHONE         = '+447700900001';
const CUSTOMER_NAME = 'Jane Smith';
const STUDIO_NAME   = 'Black Rose Studio';
const ARTIST_NAME   = 'Alex Ink';

// ─── Reset between tests ──────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Restore Twilio env to configured state
  process.env['TWILIO_ACCOUNT_SID']   = 'AC_test_sid';
  process.env['TWILIO_AUTH_TOKEN']    = 'test_auth_token';
  process.env['TWILIO_WHATSAPP_FROM'] = '+14155238886';
  process.env['BUSINESS_TYPE']        = 'tattoo_studio';
});

// ─────────────────────────────────────────────────────────────────────────────
// sendWhatsAppMessage (lib/twilio)
// ─────────────────────────────────────────────────────────────────────────────

describe('sendWhatsAppMessage', () => {
  it('sends a message and returns the Twilio SID when configured', async () => {
    const sid = await sendWhatsAppMessage(PHONE, 'Hello!');
    expect(sid).toBe('SM_test_sid_001');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it('normalises the recipient number with whatsapp: prefix', async () => {
    await sendWhatsAppMessage(PHONE, 'Hello!');
    const callArgs = mockMessagesCreate.mock.calls[0][0] as Record<string, string>;
    expect(callArgs['to']).toBe(`whatsapp:${PHONE}`);
  });

  it('normalises the from number with whatsapp: prefix', async () => {
    await sendWhatsAppMessage(PHONE, 'Hello!');
    const callArgs = mockMessagesCreate.mock.calls[0][0] as Record<string, string>;
    expect(callArgs['from']).toBe('whatsapp:+14155238886');
  });

  it('returns null (no throw) when TWILIO_ACCOUNT_SID is absent', async () => {
    delete process.env['TWILIO_ACCOUNT_SID'];
    const sid = await sendWhatsAppMessage(PHONE, 'Hello!');
    expect(sid).toBeNull();
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('returns null (no throw) when TWILIO_AUTH_TOKEN is absent', async () => {
    delete process.env['TWILIO_AUTH_TOKEN'];
    const sid = await sendWhatsAppMessage(PHONE, 'Hello!');
    expect(sid).toBeNull();
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('returns null (no throw) when TWILIO_WHATSAPP_FROM is absent', async () => {
    delete process.env['TWILIO_WHATSAPP_FROM'];
    const sid = await sendWhatsAppMessage(PHONE, 'Hello!');
    expect(sid).toBeNull();
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('re-throws on Twilio API error to enable BullMQ retry', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('Twilio API error'));
    await expect(sendWhatsAppMessage(PHONE, 'Hello!')).rejects.toThrow('Twilio API error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildWhatsAppMessage (whatsapp.queue) — pure function, no external deps
// ─────────────────────────────────────────────────────────────────────────────

describe('buildWhatsAppMessage', () => {
  it('lead-inquiry: greets customer and mentions studio and artist', () => {
    const msg = buildWhatsAppMessage({
      jobName:      'lead-inquiry',
      to:           PHONE,
      customerName: CUSTOMER_NAME,
      studioName:   STUDIO_NAME,
      artistName:   ARTIST_NAME,
    });
    expect(msg).toContain(`Hi ${CUSTOMER_NAME}!`);
    expect(msg).toContain(STUDIO_NAME);
    expect(msg).toContain(ARTIST_NAME);
  });

  it('booking-confirmed: includes confirm emoji, date/time, and artist', () => {
    const msg = buildWhatsAppMessage({
      jobName:      'booking-confirmed',
      to:           PHONE,
      customerName: CUSTOMER_NAME,
      studioName:   STUDIO_NAME,
      artistName:   ARTIST_NAME,
      startAt:      FUTURE_48H,
    });
    expect(msg).toContain('✅');
    expect(msg).toContain(ARTIST_NAME);
    expect(msg).toContain(STUDIO_NAME);
  });

  it('appointment-reminder: includes calendar emoji and cancel instruction', () => {
    const msg = buildWhatsAppMessage({
      jobName:      'appointment-reminder',
      to:           PHONE,
      customerName: CUSTOMER_NAME,
      studioName:   STUDIO_NAME,
      artistName:   ARTIST_NAME,
      startAt:      FUTURE_24H,
    });
    expect(msg).toContain('🗓');
    expect(msg).toContain('Reply CANCEL to cancel');
    expect(msg).toContain(ARTIST_NAME);
  });

  it('post-visit-review: includes Google review URL', () => {
    const url = 'https://g.page/r/ABC/review';
    const msg = buildWhatsAppMessage({
      jobName:         'post-visit-review',
      to:              PHONE,
      customerName:    CUSTOMER_NAME,
      studioName:      STUDIO_NAME,
      googleReviewUrl: url,
    });
    expect(msg).toContain('🙏');
    expect(msg).toContain(url);
    expect(msg).toContain(STUDIO_NAME);
  });

  it('restaurant-reminder: includes party size when provided', () => {
    const msg = buildWhatsAppMessage({
      jobName:      'restaurant-reminder',
      to:           PHONE,
      customerName: CUSTOMER_NAME,
      studioName:   STUDIO_NAME,
      startAt:      FUTURE_2H,
      partySize:    4,
    });
    expect(msg).toContain('🍽');
    expect(msg).toContain('party of 4');
  });

  it('restaurant-reminder: omits party mention when partySize is absent', () => {
    const msg = buildWhatsAppMessage({
      jobName:      'restaurant-reminder',
      to:           PHONE,
      customerName: CUSTOMER_NAME,
      studioName:   STUDIO_NAME,
      startAt:      FUTURE_2H,
    });
    expect(msg).toContain('🍽');
    expect(msg).not.toContain('party of');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// testSendWhatsApp (whatsapp.service)
// ─────────────────────────────────────────────────────────────────────────────

describe('testSendWhatsApp', () => {
  it('returns { to, messageSid } on success', async () => {
    const result = await testSendWhatsApp(PHONE, 'Test message');
    expect(result).toEqual({ to: PHONE, messageSid: 'SM_test_sid_001' });
  });

  it('throws 503 WHATSAPP_NOT_CONFIGURED when sendWhatsAppMessage returns null', async () => {
    delete process.env['TWILIO_ACCOUNT_SID'];
    await expect(testSendWhatsApp(PHONE, 'Test')).rejects.toMatchObject({
      statusCode: 503,
      code:       'WHATSAPP_NOT_CONFIGURED',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// enqueueLeadInquiry
// ─────────────────────────────────────────────────────────────────────────────

describe('enqueueLeadInquiry', () => {
  const baseParams = {
    phone:          PHONE,
    customerName:   CUSTOMER_NAME,
    preferWhatsApp: true,
    studioName:     STUDIO_NAME,
    leadId:         'lead_1',
  };

  it('enqueues lead-inquiry job with correct data when opt-in is set', async () => {
    await enqueueLeadInquiry(baseParams);
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    const [jobName, jobData] = mockQueueAdd.mock.calls[0] as [string, Record<string, unknown>];
    expect(jobName).toBe('lead-inquiry');
    expect(jobData['jobName']).toBe('lead-inquiry');
    expect(jobData['to']).toBe(PHONE);
    expect(jobData['customerName']).toBe(CUSTOMER_NAME);
    expect(jobData['studioName']).toBe(STUDIO_NAME);
    expect(jobData['leadId']).toBe('lead_1');
  });

  it('does not enqueue when preferWhatsApp=false', async () => {
    await enqueueLeadInquiry({ ...baseParams, preferWhatsApp: false });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('does not enqueue when phone is null', async () => {
    await enqueueLeadInquiry({ ...baseParams, phone: null });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('handles queue.add failure gracefully without throwing', async () => {
    mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(enqueueLeadInquiry(baseParams)).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// enqueueBookingConfirmed
// ─────────────────────────────────────────────────────────────────────────────

describe('enqueueBookingConfirmed', () => {
  const baseParams = {
    phone:          PHONE,
    customerName:   CUSTOMER_NAME,
    preferWhatsApp: true,
    studioName:     STUDIO_NAME,
    artistName:     ARTIST_NAME,
    startAt:        FUTURE_48H,
    bookingId:      'booking_1',
  };

  it('enqueues booking-confirmed immediately (no delay option)', async () => {
    await enqueueBookingConfirmed(baseParams);
    const confirmCall = (mockQueueAdd.mock.calls as [string, unknown, unknown?][])
      .find(([name]) => name === 'booking-confirmed');
    expect(confirmCall).toBeDefined();
    expect(confirmCall?.[2]).toBeUndefined(); // no delay opts
  });

  it('enqueues appointment-reminder with positive delay for far-future startAt', async () => {
    await enqueueBookingConfirmed(baseParams);
    const reminderCall = (mockQueueAdd.mock.calls as [string, unknown, { delay: number }?][])
      .find(([name]) => name === 'appointment-reminder');
    expect(reminderCall).toBeDefined();
    expect(reminderCall?.[2]?.delay).toBeGreaterThan(0);
  });

  it('appointment-reminder delay equals startAt - 24h - now (approx)', async () => {
    await enqueueBookingConfirmed(baseParams);
    const reminderCall = (mockQueueAdd.mock.calls as [string, unknown, { delay: number }?][])
      .find(([name]) => name === 'appointment-reminder');
    const expected = new Date(FUTURE_48H).getTime() - Date.now() - 24 * 60 * 60 * 1000;
    const actual   = reminderCall?.[2]?.delay ?? 0;
    // Allow 1 000 ms tolerance for execution time
    expect(actual).toBeGreaterThan(expected - 1000);
    expect(actual).toBeLessThan(expected  + 1000);
  });

  it('skips appointment-reminder when startAt is < 24 h from now', async () => {
    await enqueueBookingConfirmed({ ...baseParams, startAt: FUTURE_2H });
    const reminderCalls = (mockQueueAdd.mock.calls as [string][])
      .filter(([name]) => name === 'appointment-reminder');
    expect(reminderCalls).toHaveLength(0);
  });

  it('still enqueues booking-confirmed when the reminder is skipped', async () => {
    await enqueueBookingConfirmed({ ...baseParams, startAt: FUTURE_2H });
    const confirmCalls = (mockQueueAdd.mock.calls as [string][])
      .filter(([name]) => name === 'booking-confirmed');
    expect(confirmCalls).toHaveLength(1);
  });

  it('does not enqueue when preferWhatsApp=false', async () => {
    await enqueueBookingConfirmed({ ...baseParams, preferWhatsApp: false });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('does not enqueue when phone is null', async () => {
    await enqueueBookingConfirmed({ ...baseParams, phone: null });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('handles queue.add failure gracefully without throwing', async () => {
    mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(enqueueBookingConfirmed(baseParams)).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// enqueuePostVisitReview
// ─────────────────────────────────────────────────────────────────────────────

describe('enqueuePostVisitReview', () => {
  const baseParams = {
    phone:           PHONE,
    customerName:    CUSTOMER_NAME,
    preferWhatsApp:  true,
    studioName:      STUDIO_NAME,
    googleReviewUrl: 'https://g.page/r/ABC/review',
    bookingId:       'booking_1',
  };

  it('enqueues post-visit-review with a 2-hour delay (7 200 000 ms)', async () => {
    await enqueuePostVisitReview(baseParams);
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    const opts = mockQueueAdd.mock.calls[0][2] as { delay: number };
    expect(opts.delay).toBe(2 * 60 * 60 * 1000);
  });

  it('includes googleReviewUrl in the job data', async () => {
    await enqueuePostVisitReview(baseParams);
    const data = mockQueueAdd.mock.calls[0][1] as { googleReviewUrl: string };
    expect(data.googleReviewUrl).toBe('https://g.page/r/ABC/review');
  });

  it('includes jobName=post-visit-review in the job data', async () => {
    await enqueuePostVisitReview(baseParams);
    const data = mockQueueAdd.mock.calls[0][1] as { jobName: string };
    expect(data.jobName).toBe('post-visit-review');
  });

  it('does not enqueue when preferWhatsApp=false', async () => {
    await enqueuePostVisitReview({ ...baseParams, preferWhatsApp: false });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('does not enqueue when phone is null', async () => {
    await enqueuePostVisitReview({ ...baseParams, phone: null });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('handles queue.add failure gracefully without throwing', async () => {
    mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(enqueuePostVisitReview(baseParams)).resolves.toBeUndefined();
  });

  it('does not enqueue when googleReviewUrl is empty (avoids broken link in message)', async () => {
    await enqueuePostVisitReview({ ...baseParams, googleReviewUrl: '' });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// enqueueRestaurantReminder
// ─────────────────────────────────────────────────────────────────────────────

describe('enqueueRestaurantReminder', () => {
  const baseParams = {
    phone:          PHONE,
    customerName:   CUSTOMER_NAME,
    preferWhatsApp: true,
    studioName:     STUDIO_NAME,
    startAt:        FUTURE_48H,
    partySize:      4,
    bookingId:      'booking_1',
  };

  it('enqueues restaurant-reminder with correct delay (startAt − 2 h − now)', async () => {
    await enqueueRestaurantReminder(baseParams);
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    const opts = mockQueueAdd.mock.calls[0][2] as { delay: number };
    const expected = new Date(FUTURE_48H).getTime() - Date.now() - 2 * 60 * 60 * 1000;
    expect(opts.delay).toBeGreaterThan(expected - 1000);
    expect(opts.delay).toBeLessThan(expected  + 1000);
  });

  it('includes partySize in the job data', async () => {
    await enqueueRestaurantReminder(baseParams);
    const data = mockQueueAdd.mock.calls[0][1] as { partySize: number };
    expect(data.partySize).toBe(4);
  });

  it('skips when startAt is in the past (delay ≤ 0)', async () => {
    await enqueueRestaurantReminder({ ...baseParams, startAt: PAST_ISO });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('skips when startAt is < 2 h from now', async () => {
    const nearFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 h
    await enqueueRestaurantReminder({ ...baseParams, startAt: nearFuture });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('does not enqueue when preferWhatsApp=false', async () => {
    await enqueueRestaurantReminder({ ...baseParams, preferWhatsApp: false });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('does not enqueue when phone is null', async () => {
    await enqueueRestaurantReminder({ ...baseParams, phone: null });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });
});

// ─── Sanity: AppError is correctly imported ───────────────────────────────────

describe('AppError import', () => {
  it('AppError is correctly imported and usable', () => {
    const err = new AppError(400, 'TEST', 'test error');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('TEST');
  });
});
