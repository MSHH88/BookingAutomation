/**
 * Unit tests for quotes.service.ts — Step 1.8
 *
 * Prisma is fully mocked so these tests run without a live database.
 *
 * Coverage:
 *  ✓ createQuote     — ADMIN success, ARTIST success (auto-fills artistId),
 *                      default validUntil (7 days), lead not found → 404,
 *                      lead in BOOKED status → 409, ADMIN missing artistId → 400
 *  ✓ listQuotes      — ADMIN all, ADMIN with filters, ARTIST scoped to own,
 *                      date range filter
 *  ✓ getQuoteById    — ADMIN found, ARTIST found (own quote),
 *                      ARTIST forbidden (other artist's quote), not found → 404
 *  ✓ updateQuote     — success (DRAFT), non-DRAFT → 409,
 *                      ARTIST editing own: success,
 *                      ARTIST editing other: 403, not found → 404
 *  ✓ sendQuote       — DRAFT → SENT success, lead status updated to QUOTED,
 *                      non-DRAFT → 409, ARTIST forbidden on other's quote → 403,
 *                      not found → 404
 *  ✓ acceptQuote     — success (creates Booking + moves lead to BOOKED),
 *                      expired quote → 409 QUOTE_EXPIRED,
 *                      non-SENT quote → 409, not found → 404
 *  ✓ rejectQuote     — success, non-SENT quote → 409, not found → 404
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockQuoteCreate     = jest.fn();
const mockQuoteFindUnique = jest.fn();
const mockQuoteFindMany   = jest.fn();
const mockQuoteCount      = jest.fn();
const mockQuoteUpdate     = jest.fn();

const mockLeadFindUnique = jest.fn();
const mockLeadUpdateMany = jest.fn();
const mockLeadUpdate     = jest.fn();

const mockArtistFindFirst = jest.fn();

const mockBookingCreate = jest.fn();

const mockTransaction = jest.fn();

// quotes.service.ts imports enqueueWebhookEvent from webhooks.queue.ts which
// creates a module-level BullMQ Queue singleton.  Mock the entire module so
// tests run without a live Redis instance.
jest.mock('../webhooks/webhooks.queue', () => ({
  enqueueWebhookEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    quote: {
      create:     (...a: unknown[]) => mockQuoteCreate(...a),
      findUnique: (...a: unknown[]) => mockQuoteFindUnique(...a),
      findMany:   (...a: unknown[]) => mockQuoteFindMany(...a),
      count:      (...a: unknown[]) => mockQuoteCount(...a),
      update:     (...a: unknown[]) => mockQuoteUpdate(...a),
    },
    lead: {
      findUnique:  (...a: unknown[]) => mockLeadFindUnique(...a),
      update:      (...a: unknown[]) => mockLeadUpdate(...a),
      updateMany:  (...a: unknown[]) => mockLeadUpdateMany(...a),
    },
    artist: {
      findFirst: (...a: unknown[]) => mockArtistFindFirst(...a),
    },
    booking: {
      create: (...a: unknown[]) => mockBookingCreate(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as quotesService from './quotes.service';
import { AppError }       from '../../errors/AppError';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const PAST_DATE   = new Date(Date.now() - 24 * 60 * 60 * 1000);

const baseQuoteFull = {
  id:          'q_1',
  leadId:      'lead_1',
  artistId:    'artist_1',
  price:       250.00,
  hours:       4,
  notes:       'Full sleeve design',
  validUntil:  FUTURE_DATE,
  status:      'DRAFT',
  sentAt:      null,
  respondedAt: null,
  createdAt:   new Date('2026-04-04T10:00:00Z'),
  updatedAt:   new Date('2026-04-04T10:00:00Z'),
  lead:    { id: 'lead_1', name: 'Jane Smith', email: 'jane@example.com', phone: '+441234567890', status: 'NEW' },
  artist:  { id: 'artist_1', slug: 'alex-ink', user: { name: 'Alex Ink', email: 'alex@studio.com' } },
  booking: null,
};

const baseSentQuote = { ...baseQuoteFull, status: 'SENT', sentAt: new Date() };

const baseQuoteList = {
  id:         'q_1',
  leadId:     'lead_1',
  artistId:   'artist_1',
  price:      250.00,
  hours:      4,
  validUntil: FUTURE_DATE,
  status:     'DRAFT',
  sentAt:     null,
  createdAt:  new Date('2026-04-04T10:00:00Z'),
  updatedAt:  new Date('2026-04-04T10:00:00Z'),
  lead:   { id: 'lead_1', name: 'Jane Smith', email: 'jane@example.com' },
  artist: { id: 'artist_1', slug: 'alex-ink', user: { name: 'Alex Ink' } },
};

// ─── Reset mocks between tests ────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// createQuote
// ─────────────────────────────────────────────────────────────────────────────

describe('createQuote', () => {
  it('creates a DRAFT quote as ADMIN with artistId in body', async () => {
    mockLeadFindUnique.mockResolvedValue({ id: 'lead_1', status: 'NEW' });
    mockQuoteCreate.mockResolvedValue({ id: 'q_1' });
    mockQuoteFindUnique.mockResolvedValue(baseQuoteFull);

    const result = await quotesService.createQuote(
      { leadId: 'lead_1', artistId: 'artist_1', price: 250 },
      'admin_user',
      'ADMIN',
    );

    expect(mockLeadFindUnique).toHaveBeenCalledWith({ where: { id: 'lead_1' }, select: expect.any(Object) });
    expect(mockQuoteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ leadId: 'lead_1', artistId: 'artist_1', price: 250, status: 'DRAFT' }),
      }),
    );
    expect(result).toEqual(baseQuoteFull);
  });

  it('creates a DRAFT quote as ARTIST (auto-resolves artistId from profile)', async () => {
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockLeadFindUnique.mockResolvedValue({ id: 'lead_1', status: 'CONTACTED' });
    mockQuoteCreate.mockResolvedValue({ id: 'q_1' });
    mockQuoteFindUnique.mockResolvedValue(baseQuoteFull);

    const result = await quotesService.createQuote(
      { leadId: 'lead_1', price: 300, hours: 3, notes: 'Geometric back piece' },
      'artist_user_id',
      'ARTIST',
    );

    expect(mockArtistFindFirst).toHaveBeenCalledWith({ where: { userId: 'artist_user_id' }, select: { id: true } });
    expect(mockQuoteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ artistId: 'artist_1' }),
      }),
    );
    expect(result).toEqual(baseQuoteFull);
  });

  it('applies a default validUntil of 7 days when not supplied', async () => {
    mockLeadFindUnique.mockResolvedValue({ id: 'lead_1', status: 'NEW' });
    mockQuoteCreate.mockResolvedValue({ id: 'q_1' });
    mockQuoteFindUnique.mockResolvedValue(baseQuoteFull);

    const before = Date.now();
    await quotesService.createQuote({ leadId: 'lead_1', artistId: 'artist_1', price: 200 }, 'admin', 'ADMIN');
    const after  = Date.now();

    const createCall = mockQuoteCreate.mock.calls[0][0] as { data: { validUntil: Date } };
    const validUntil = createCall.data.validUntil.getTime();
    const sevenDays  = 7 * 24 * 60 * 60 * 1000;

    expect(validUntil).toBeGreaterThanOrEqual(before + sevenDays - 100);
    expect(validUntil).toBeLessThanOrEqual(after  + sevenDays + 100);
  });

  it('throws 404 when lead does not exist', async () => {
    mockLeadFindUnique.mockResolvedValue(null);

    await expect(
      quotesService.createQuote({ leadId: 'no_such_lead', artistId: 'artist_1', price: 100 }, 'admin', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('throws 409 when lead status is BOOKED', async () => {
    mockLeadFindUnique.mockResolvedValue({ id: 'lead_1', status: 'BOOKED' });

    await expect(
      quotesService.createQuote({ leadId: 'lead_1', artistId: 'artist_1', price: 100 }, 'admin', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('throws 409 for COMPLETED, CANCELLED, and LOST lead statuses', async () => {
    for (const status of ['COMPLETED', 'CANCELLED', 'LOST']) {
      mockLeadFindUnique.mockResolvedValue({ id: 'lead_1', status });
      await expect(
        quotesService.createQuote({ leadId: 'lead_1', artistId: 'artist_1', price: 100 }, 'admin', 'ADMIN'),
      ).rejects.toMatchObject({ statusCode: 409 });
    }
  });

  it('throws 400 when ADMIN does not supply artistId', async () => {
    await expect(
      quotesService.createQuote({ leadId: 'lead_1', price: 100 }, 'admin', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('throws 403 when ARTIST has no artist profile', async () => {
    mockArtistFindFirst.mockResolvedValue(null);

    await expect(
      quotesService.createQuote({ leadId: 'lead_1', price: 100 }, 'artist_user_id', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listQuotes
// ─────────────────────────────────────────────────────────────────────────────

describe('listQuotes', () => {
  it('ADMIN: returns all quotes without scoping', async () => {
    mockQuoteCount.mockResolvedValue(1);
    mockQuoteFindMany.mockResolvedValue([baseQuoteList]);

    const result = await quotesService.listQuotes({}, 'admin_user', 'ADMIN');

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    // ADMIN should not call findFirst to resolve artist
    expect(mockArtistFindFirst).not.toHaveBeenCalled();
  });

  it('ADMIN: filters by status', async () => {
    mockQuoteCount.mockResolvedValue(0);
    mockQuoteFindMany.mockResolvedValue([]);

    await quotesService.listQuotes({ status: 'SENT' }, 'admin_user', 'ADMIN');

    const findManyCall = mockQuoteFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(findManyCall.where).toMatchObject({ status: 'SENT' });
  });

  it('ADMIN: filters by artistId query param', async () => {
    mockQuoteCount.mockResolvedValue(0);
    mockQuoteFindMany.mockResolvedValue([]);

    await quotesService.listQuotes({ artistId: 'artist_2' }, 'admin_user', 'ADMIN');

    const findManyCall = mockQuoteFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(findManyCall.where).toMatchObject({ artistId: 'artist_2' });
  });

  it('ARTIST: automatically scoped to own quotes', async () => {
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockQuoteCount.mockResolvedValue(2);
    mockQuoteFindMany.mockResolvedValue([baseQuoteList, { ...baseQuoteList, id: 'q_2' }]);

    const result = await quotesService.listQuotes({}, 'artist_user_id', 'ARTIST');

    expect(mockArtistFindFirst).toHaveBeenCalledWith({ where: { userId: 'artist_user_id' }, select: { id: true } });
    const findManyCall = mockQuoteFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(findManyCall.where).toMatchObject({ artistId: 'artist_1' });
    expect(result.data).toHaveLength(2);
  });

  it('returns empty list when no quotes match', async () => {
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockQuoteCount.mockResolvedValue(0);
    mockQuoteFindMany.mockResolvedValue([]);

    const result = await quotesService.listQuotes({}, 'artist_user_id', 'ARTIST');

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getQuoteById
// ─────────────────────────────────────────────────────────────────────────────

describe('getQuoteById', () => {
  it('ADMIN: returns any quote', async () => {
    mockQuoteFindUnique.mockResolvedValue(baseQuoteFull);

    const result = await quotesService.getQuoteById('q_1', 'admin_user', 'ADMIN');

    expect(result).toEqual(baseQuoteFull);
    expect(mockArtistFindFirst).not.toHaveBeenCalled();
  });

  it('ARTIST: returns own quote', async () => {
    mockQuoteFindUnique.mockResolvedValue(baseQuoteFull);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });

    const result = await quotesService.getQuoteById('q_1', 'artist_user_id', 'ARTIST');

    expect(result).toEqual(baseQuoteFull);
  });

  it('ARTIST: throws 403 when accessing another artist\'s quote', async () => {
    mockQuoteFindUnique.mockResolvedValue({ ...baseQuoteFull, artistId: 'artist_99' });
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });

    await expect(
      quotesService.getQuoteById('q_1', 'artist_user_id', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws 404 when quote does not exist', async () => {
    mockQuoteFindUnique.mockResolvedValue(null);

    await expect(
      quotesService.getQuoteById('no_such_id', 'admin_user', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateQuote
// ─────────────────────────────────────────────────────────────────────────────

describe('updateQuote', () => {
  it('ADMIN: updates a DRAFT quote successfully', async () => {
    const draftQuote = { id: 'q_1', status: 'DRAFT', artistId: 'artist_1', leadId: 'lead_1' };
    mockQuoteFindUnique
      .mockResolvedValueOnce(draftQuote)            // ownership/status check
      .mockResolvedValueOnce({ ...baseQuoteFull, price: 300 }); // post-update fetch
    mockQuoteUpdate.mockResolvedValue({ id: 'q_1' });

    const result = await quotesService.updateQuote('q_1', { price: 300 }, 'admin_user', 'ADMIN');

    expect(mockQuoteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'q_1' },
        data:  expect.objectContaining({ price: 300 }),
      }),
    );
    expect(result.price).toBe(300);
  });

  it('ARTIST: updates own DRAFT quote successfully', async () => {
    const draftQuote = { id: 'q_1', status: 'DRAFT', artistId: 'artist_1', leadId: 'lead_1' };
    mockQuoteFindUnique
      .mockResolvedValueOnce(draftQuote)
      .mockResolvedValueOnce(baseQuoteFull);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockQuoteUpdate.mockResolvedValue({ id: 'q_1' });

    await quotesService.updateQuote('q_1', { hours: 5 }, 'artist_user_id', 'ARTIST');

    expect(mockQuoteUpdate).toHaveBeenCalled();
  });

  it('ARTIST: throws 403 when editing another artist\'s quote', async () => {
    const draftQuote = { id: 'q_1', status: 'DRAFT', artistId: 'artist_99', leadId: 'lead_1' };
    mockQuoteFindUnique.mockResolvedValueOnce(draftQuote);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });

    await expect(
      quotesService.updateQuote('q_1', { price: 500 }, 'artist_user_id', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws 409 when trying to edit a SENT quote', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce({
      id: 'q_1', status: 'SENT', artistId: 'artist_1', leadId: 'lead_1',
    });

    await expect(
      quotesService.updateQuote('q_1', { price: 300 }, 'admin_user', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('throws 404 when quote does not exist', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce(null);

    await expect(
      quotesService.updateQuote('no_id', { notes: 'test' }, 'admin_user', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('clears notes when empty string is provided', async () => {
    const draftQuote = { id: 'q_1', status: 'DRAFT', artistId: 'artist_1', leadId: 'lead_1' };
    mockQuoteFindUnique
      .mockResolvedValueOnce(draftQuote)
      .mockResolvedValueOnce({ ...baseQuoteFull, notes: null });
    mockQuoteUpdate.mockResolvedValue({ id: 'q_1' });

    await quotesService.updateQuote('q_1', { notes: '' }, 'admin_user', 'ADMIN');

    const updateCall = mockQuoteUpdate.mock.calls[0][0] as { data: { notes: unknown } };
    expect(updateCall.data.notes).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sendQuote
// ─────────────────────────────────────────────────────────────────────────────

describe('sendQuote', () => {
  it('transitions DRAFT → SENT and advances lead to QUOTED', async () => {
    const draftQuote = { id: 'q_1', status: 'DRAFT', artistId: 'artist_1', leadId: 'lead_1' };
    mockQuoteFindUnique
      .mockResolvedValueOnce(draftQuote)            // status check
      .mockResolvedValueOnce(baseSentQuote);         // post-send fetch
    mockQuoteUpdate.mockResolvedValue({ id: 'q_1' });
    mockLeadUpdateMany.mockResolvedValue({ count: 1 });

    const result = await quotesService.sendQuote('q_1', 'admin_user', 'ADMIN');

    expect(mockQuoteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SENT', sentAt: expect.any(Date) }),
      }),
    );
    expect(mockLeadUpdateMany).toHaveBeenCalledWith({
      where: { id: 'lead_1', status: { in: ['NEW', 'CONTACTED'] } },
      data:  { status: 'QUOTED' },
    });
    expect(result.status).toBe('SENT');
  });

  it('ARTIST: sends their own quote successfully', async () => {
    const draftQuote = { id: 'q_1', status: 'DRAFT', artistId: 'artist_1', leadId: 'lead_1' };
    mockQuoteFindUnique
      .mockResolvedValueOnce(draftQuote)
      .mockResolvedValueOnce(baseSentQuote);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockQuoteUpdate.mockResolvedValue({ id: 'q_1' });
    mockLeadUpdateMany.mockResolvedValue({ count: 1 });

    await quotesService.sendQuote('q_1', 'artist_user_id', 'ARTIST');

    expect(mockQuoteUpdate).toHaveBeenCalled();
  });

  it('ARTIST: throws 403 when sending another artist\'s quote', async () => {
    const draftQuote = { id: 'q_1', status: 'DRAFT', artistId: 'artist_99', leadId: 'lead_1' };
    mockQuoteFindUnique.mockResolvedValueOnce(draftQuote);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });

    await expect(
      quotesService.sendQuote('q_1', 'artist_user_id', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws 409 when quote is already SENT', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce({
      id: 'q_1', status: 'SENT', artistId: 'artist_1', leadId: 'lead_1',
    });

    await expect(
      quotesService.sendQuote('q_1', 'admin_user', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('throws 409 when quote is ACCEPTED', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce({
      id: 'q_1', status: 'ACCEPTED', artistId: 'artist_1', leadId: 'lead_1',
    });

    await expect(
      quotesService.sendQuote('q_1', 'admin_user', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 404 when quote does not exist', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce(null);

    await expect(
      quotesService.sendQuote('no_id', 'admin_user', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// acceptQuote
// ─────────────────────────────────────────────────────────────────────────────

describe('acceptQuote', () => {
  const acceptBody = {
    startAt: '2026-04-10T10:00:00Z',
    endAt:   '2026-04-10T14:00:00Z',
  };

  it('creates Booking and moves lead to BOOKED atomically', async () => {
    const sentQuote = {
      id:         'q_1',
      status:     'SENT',
      leadId:     'lead_1',
      artistId:   'artist_1',
      price:      250.00,
      hours:      4,
      validUntil: FUTURE_DATE,
    };
    const acceptedQuoteFull = { ...baseQuoteFull, status: 'ACCEPTED', respondedAt: new Date() };

    mockQuoteFindUnique
      .mockResolvedValueOnce(sentQuote)             // status/expiry check
      .mockResolvedValueOnce(acceptedQuoteFull);     // post-accept fetch

    // Simulate the $transaction callback
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        quote:   { update:  jest.fn().mockResolvedValue({ id: 'q_1', status: 'ACCEPTED' }) },
        booking: { create:  jest.fn().mockResolvedValue({ id: 'booking_1' }) },
        lead:    { update:  jest.fn().mockResolvedValue({ id: 'lead_1', status: 'BOOKED' }) },
      };
      return callback(txMock);
    });

    const result = await quotesService.acceptQuote('q_1', acceptBody);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('ACCEPTED');
  });

  it('passes correct Booking data (startAt, endAt, totalAmount, totalDurationMinutes)', async () => {
    const sentQuote = {
      id: 'q_1', status: 'SENT', leadId: 'lead_1', artistId: 'artist_1',
      price: 300.00, hours: 3, validUntil: FUTURE_DATE,
    };
    mockQuoteFindUnique
      .mockResolvedValueOnce(sentQuote)
      .mockResolvedValueOnce({ ...baseQuoteFull, status: 'ACCEPTED' });

    let capturedBookingData: unknown;
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        quote:   { update: jest.fn().mockResolvedValue({}) },
        booking: {
          create: jest.fn().mockImplementation((args: unknown) => {
            capturedBookingData = args;
            return { id: 'booking_1' };
          }),
        },
        lead: { update: jest.fn().mockResolvedValue({}) },
      };
      return callback(txMock);
    });

    await quotesService.acceptQuote('q_1', {
      startAt: '2026-04-10T10:00:00Z',
      endAt:   '2026-04-10T13:00:00Z',
    });

    expect(capturedBookingData).toMatchObject({
      data: expect.objectContaining({
        leadId:               'lead_1',
        quoteId:              'q_1',
        artistId:             'artist_1',
        totalAmount:          300.00,
        totalDurationMinutes: 180, // 3 hours × 60
        status:               'PENDING',
      }),
    });
  });

  it('throws 409 QUOTE_EXPIRED for an expired quote', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce({
      id: 'q_1', status: 'SENT', leadId: 'lead_1', artistId: 'artist_1',
      price: 200, hours: 2, validUntil: PAST_DATE,
    });

    await expect(
      quotesService.acceptQuote('q_1', acceptBody),
    ).rejects.toMatchObject({ statusCode: 409, code: 'QUOTE_EXPIRED' });

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('throws 409 when quote is DRAFT (not SENT)', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce({
      id: 'q_1', status: 'DRAFT', leadId: 'lead_1', artistId: 'artist_1',
      price: 200, hours: 2, validUntil: FUTURE_DATE,
    });

    await expect(
      quotesService.acceptQuote('q_1', acceptBody),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('throws 409 when quote is already ACCEPTED', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce({
      id: 'q_1', status: 'ACCEPTED', leadId: 'lead_1', artistId: 'artist_1',
      price: 200, hours: 2, validUntil: FUTURE_DATE,
    });

    await expect(
      quotesService.acceptQuote('q_1', acceptBody),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('throws 404 when quote does not exist', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce(null);

    await expect(
      quotesService.acceptQuote('no_id', acceptBody),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rejectQuote
// ─────────────────────────────────────────────────────────────────────────────

describe('rejectQuote', () => {
  it('transitions SENT → REJECTED and sets respondedAt', async () => {
    const sentQuote = { id: 'q_1', status: 'SENT', leadId: 'lead_1' };
    const rejectedFull = { ...baseQuoteFull, status: 'REJECTED', respondedAt: new Date() };

    mockQuoteFindUnique
      .mockResolvedValueOnce(sentQuote)
      .mockResolvedValueOnce(rejectedFull);
    mockQuoteUpdate.mockResolvedValue({ id: 'q_1' });

    const result = await quotesService.rejectQuote('q_1');

    expect(mockQuoteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED', respondedAt: expect.any(Date) }),
      }),
    );
    expect(result.status).toBe('REJECTED');
  });

  it('throws 409 when quote is DRAFT (not SENT)', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce({ id: 'q_1', status: 'DRAFT', leadId: 'lead_1' });

    await expect(quotesService.rejectQuote('q_1')).rejects.toMatchObject({
      statusCode: 409,
      code:       'CONFLICT',
    });
  });

  it('throws 409 when quote is already REJECTED', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce({ id: 'q_1', status: 'REJECTED', leadId: 'lead_1' });

    await expect(quotesService.rejectQuote('q_1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 404 when quote does not exist', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce(null);

    await expect(quotesService.rejectQuote('no_id')).rejects.toMatchObject({
      statusCode: 404,
      code:       'NOT_FOUND',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AppError shape validation
// ─────────────────────────────────────────────────────────────────────────────

describe('AppError shape', () => {
  it('errors thrown are instances of AppError', async () => {
    mockQuoteFindUnique.mockResolvedValueOnce(null);
    try {
      await quotesService.getQuoteById('no_id', 'admin', 'ADMIN');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
    }
  });
});
