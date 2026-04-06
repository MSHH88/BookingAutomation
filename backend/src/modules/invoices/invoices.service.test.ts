/**
 * Unit tests for invoices.service.ts — Step 1.10
 *
 * Prisma is fully mocked so these tests run without a live database.
 *
 * Coverage:
 *  ✓ listInvoices
 *      — ADMIN: paginated, no filters
 *      — ADMIN: status filter
 *      — ADMIN: date range filter (from + to)
 *
 *  ✓ getInvoiceById
 *      — ADMIN: found
 *      — ADMIN: not found → 404 INVOICE_NOT_FOUND
 *      — ARTIST: found (own booking) → success
 *      — ARTIST: found (other artist's booking) → 403 FORBIDDEN
 *      — ARTIST: artist profile not found → 404 ARTIST_NOT_FOUND
 *
 *  ✓ sendInvoice
 *      — ADMIN: UNPAID invoice → sentAt set, email stub logged
 *      — ADMIN: PAID invoice → sentAt updated (re-send allowed)
 *      — ADMIN: VOID invoice → 409 INVOICE_VOIDED
 *      — ADMIN: not found → 404 INVOICE_NOT_FOUND
 *      — ARTIST: own booking → sentAt set
 *      — ARTIST: other artist's booking → 403 FORBIDDEN
 *
 *  ✓ markInvoicePaid
 *      — ADMIN: UNPAID → PAID, paidAt defaults to now
 *      — ADMIN: UNPAID → PAID with explicit paidAt
 *      — ADMIN: UNPAID → PAID with optional notes
 *      — ADMIN: OVERDUE → PAID
 *      — ADMIN: PAID → 409 INVOICE_ALREADY_PAID
 *      — ADMIN: VOID → 409 INVOICE_VOIDED
 *      — ADMIN: not found → 404 INVOICE_NOT_FOUND
 *
 *  ✓ voidInvoice
 *      — ADMIN: UNPAID → VOID, voidedAt set
 *      — ADMIN: OVERDUE → VOID
 *      — ADMIN: UNPAID → VOID with optional notes
 *      — ADMIN: PAID → 409 INVOICE_ALREADY_PAID
 *      — ADMIN: VOID → 409 INVOICE_ALREADY_VOIDED
 *      — ADMIN: not found → 404 INVOICE_NOT_FOUND
 *
 *  ✓ markOverdueInvoices
 *      — updates UNPAID past-due invoices → returns count
 *      — no overdue invoices → returns 0
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockInvoiceFindUnique = jest.fn();
const mockInvoiceFindMany   = jest.fn();
const mockInvoiceCount      = jest.fn();
const mockInvoiceUpdate     = jest.fn();
const mockInvoiceUpdateMany = jest.fn();

const mockArtistFindFirst = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    invoice: {
      findUnique: (...a: unknown[]) => mockInvoiceFindUnique(...a),
      findMany:   (...a: unknown[]) => mockInvoiceFindMany(...a),
      count:      (...a: unknown[]) => mockInvoiceCount(...a),
      update:     (...a: unknown[]) => mockInvoiceUpdate(...a),
      updateMany: (...a: unknown[]) => mockInvoiceUpdateMany(...a),
    },
    artist: {
      findFirst: (...a: unknown[]) => mockArtistFindFirst(...a),
    },
  },
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as invoicesService from './invoices.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const NOW     = new Date('2026-04-06T10:00:00Z');
const DUE_7   = new Date('2026-04-13T10:00:00Z');
const PAST_DUE = new Date('2026-03-30T10:00:00Z');

const baseBookingSnippet = {
  id:      'booking_1',
  startAt: new Date('2026-04-01T14:00:00Z'),
  endAt:   new Date('2026-04-01T16:00:00Z'),
  status:  'COMPLETED',
  artist: {
    id:   'artist_1',
    slug: 'alex-ink',
    user: { name: 'Alex Ink', email: 'alex@studio.com' },
  },
  customer: {
    id:    'customer_1',
    name:  'Jane Smith',
    email: 'jane@example.com',
    phone: '+441234567890',
  },
};

const baseInvoice = {
  id:        'invoice_1',
  bookingId: 'booking_1',
  amount:    '250.00',
  currency:  'GBP',
  status:    'UNPAID',
  dueDate:   DUE_7,
  paidAt:    null,
  voidedAt:  null,
  sentAt:    null,
  notes:     null,
  lineItems: [{ description: 'Studio service', amount: 250 }],
  createdAt: NOW,
  updatedAt: NOW,
  booking:   baseBookingSnippet,
};

const listItem = {
  id:        'invoice_1',
  bookingId: 'booking_1',
  amount:    '250.00',
  currency:  'GBP',
  status:    'UNPAID',
  dueDate:   DUE_7,
  paidAt:    null,
  sentAt:    null,
  createdAt: NOW,
  updatedAt: NOW,
  booking: {
    id:      'booking_1',
    startAt: new Date('2026-04-01T14:00:00Z'),
    status:  'COMPLETED',
    artist: {
      id:   'artist_1',
      slug: 'alex-ink',
      user: { name: 'Alex Ink' },
    },
    customer: { id: 'customer_1', name: 'Jane Smith', email: 'jane@example.com' },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// listInvoices
// ─────────────────────────────────────────────────────────────────────────────

describe('listInvoices', () => {
  it('returns paginated invoices with no filters', async () => {
    mockInvoiceCount.mockResolvedValue(1);
    mockInvoiceFindMany.mockResolvedValue([listItem]);

    const result = await invoicesService.listInvoices({});

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(mockInvoiceCount).toHaveBeenCalledWith({ where: {} });
    expect(mockInvoiceFindMany).toHaveBeenCalled();
  });

  it('filters by status', async () => {
    mockInvoiceCount.mockResolvedValue(0);
    mockInvoiceFindMany.mockResolvedValue([]);

    await invoicesService.listInvoices({ status: 'PAID' });

    const countArgs = mockInvoiceCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.status).toBe('PAID');
  });

  it('filters by date range (from + to)', async () => {
    mockInvoiceCount.mockResolvedValue(0);
    mockInvoiceFindMany.mockResolvedValue([]);

    await invoicesService.listInvoices({ from: '2026-01-01', to: '2026-03-31' });

    const countArgs = mockInvoiceCount.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(countArgs.where.createdAt).toMatchObject({
      gte: expect.any(Date),
      lte: expect.any(Date),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getInvoiceById
// ─────────────────────────────────────────────────────────────────────────────

describe('getInvoiceById', () => {
  it('ADMIN: returns invoice when found', async () => {
    mockInvoiceFindUnique.mockResolvedValue(baseInvoice);

    const result = await invoicesService.getInvoiceById('invoice_1', 'admin_1', 'ADMIN');

    expect(result.id).toBe('invoice_1');
    expect(mockArtistFindFirst).not.toHaveBeenCalled();
  });

  it('ADMIN: throws 404 when invoice not found', async () => {
    mockInvoiceFindUnique.mockResolvedValue(null);

    await expect(
      invoicesService.getInvoiceById('missing', 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'INVOICE_NOT_FOUND' });
  });

  it('ARTIST: returns invoice when booking belongs to their artist profile', async () => {
    mockInvoiceFindUnique.mockResolvedValue(baseInvoice);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });

    const result = await invoicesService.getInvoiceById('invoice_1', 'user_artist_1', 'ARTIST');

    expect(result.id).toBe('invoice_1');
  });

  it('ARTIST: throws 403 when booking belongs to a different artist', async () => {
    mockInvoiceFindUnique.mockResolvedValue(baseInvoice);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_99' }); // different artist

    await expect(
      invoicesService.getInvoiceById('invoice_1', 'user_artist_99', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('ARTIST: throws 404 when artist profile does not exist', async () => {
    mockInvoiceFindUnique.mockResolvedValue(baseInvoice);
    mockArtistFindFirst.mockResolvedValue(null);

    await expect(
      invoicesService.getInvoiceById('invoice_1', 'user_nobody', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'ARTIST_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sendInvoice
// ─────────────────────────────────────────────────────────────────────────────

describe('sendInvoice', () => {
  const invoiceForSend = {
    id:      'invoice_1',
    status:  'UNPAID',
    booking: {
      artist:   { id: 'artist_1' },
      customer: { email: 'jane@example.com', name: 'Jane Smith' },
    },
  };

  it('ADMIN: sets sentAt on UNPAID invoice and returns detail', async () => {
    // First findUnique (ownership/status check)
    mockInvoiceFindUnique
      .mockResolvedValueOnce(invoiceForSend)
      // Second findUnique (re-fetch detail after update)
      .mockResolvedValueOnce({ ...baseInvoice, sentAt: NOW });
    mockInvoiceUpdate.mockResolvedValue({ id: 'invoice_1' });

    const result = await invoicesService.sendInvoice('invoice_1', 'admin_1', 'ADMIN');

    expect(mockInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { sentAt: expect.any(Date) } }),
    );
    expect(result.sentAt).toBeDefined();
  });

  it('ADMIN: re-send is allowed on PAID invoice', async () => {
    mockInvoiceFindUnique
      .mockResolvedValueOnce({ ...invoiceForSend, status: 'PAID' })
      .mockResolvedValueOnce({ ...baseInvoice, status: 'PAID', sentAt: NOW });
    mockInvoiceUpdate.mockResolvedValue({ id: 'invoice_1' });

    await expect(
      invoicesService.sendInvoice('invoice_1', 'admin_1', 'ADMIN'),
    ).resolves.toBeDefined();
  });

  it('ADMIN: throws 409 on VOID invoice', async () => {
    mockInvoiceFindUnique.mockResolvedValueOnce({ ...invoiceForSend, status: 'VOID' });

    await expect(
      invoicesService.sendInvoice('invoice_1', 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INVOICE_VOIDED' });
  });

  it('ADMIN: throws 404 when invoice not found', async () => {
    mockInvoiceFindUnique.mockResolvedValueOnce(null);

    await expect(
      invoicesService.sendInvoice('missing', 'admin_1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'INVOICE_NOT_FOUND' });
  });

  it('ARTIST: success when booking belongs to their profile', async () => {
    mockInvoiceFindUnique
      .mockResolvedValueOnce(invoiceForSend)
      .mockResolvedValueOnce({ ...baseInvoice, sentAt: NOW });
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_1' });
    mockInvoiceUpdate.mockResolvedValue({ id: 'invoice_1' });

    await expect(
      invoicesService.sendInvoice('invoice_1', 'user_artist_1', 'ARTIST'),
    ).resolves.toBeDefined();
  });

  it('ARTIST: throws 403 when booking belongs to a different artist', async () => {
    mockInvoiceFindUnique.mockResolvedValueOnce(invoiceForSend);
    mockArtistFindFirst.mockResolvedValue({ id: 'artist_99' });

    await expect(
      invoicesService.sendInvoice('invoice_1', 'user_artist_99', 'ARTIST'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// markInvoicePaid
// ─────────────────────────────────────────────────────────────────────────────

describe('markInvoicePaid', () => {
  const paidInvoice = { ...baseInvoice, status: 'PAID', paidAt: NOW };

  it('UNPAID → PAID: paidAt defaults to now', async () => {
    mockInvoiceFindUnique
      .mockResolvedValueOnce({ id: 'invoice_1', status: 'UNPAID' })
      .mockResolvedValueOnce(paidInvoice);
    mockInvoiceUpdate.mockResolvedValue({ id: 'invoice_1' });

    const result = await invoicesService.markInvoicePaid('invoice_1', {});

    expect(mockInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PAID',
          paidAt: expect.any(Date),
        }),
      }),
    );
    expect(result.status).toBe('PAID');
  });

  it('UNPAID → PAID: explicit paidAt is used', async () => {
    const explicitDate = '2026-04-05T12:00:00Z';
    mockInvoiceFindUnique
      .mockResolvedValueOnce({ id: 'invoice_1', status: 'UNPAID' })
      .mockResolvedValueOnce(paidInvoice);
    mockInvoiceUpdate.mockResolvedValue({ id: 'invoice_1' });

    await invoicesService.markInvoicePaid('invoice_1', { paidAt: explicitDate });

    const updateArgs = mockInvoiceUpdate.mock.calls[0][0] as { data: { paidAt: Date } };
    expect(updateArgs.data.paidAt.toISOString()).toBe('2026-04-05T12:00:00.000Z');
  });

  it('UNPAID → PAID: optional notes are stored', async () => {
    mockInvoiceFindUnique
      .mockResolvedValueOnce({ id: 'invoice_1', status: 'UNPAID' })
      .mockResolvedValueOnce({ ...paidInvoice, notes: 'Bank transfer ref #XYZ' });
    mockInvoiceUpdate.mockResolvedValue({ id: 'invoice_1' });

    await invoicesService.markInvoicePaid('invoice_1', { notes: 'Bank transfer ref #XYZ' });

    const updateArgs = mockInvoiceUpdate.mock.calls[0][0] as { data: { notes: string } };
    expect(updateArgs.data.notes).toBe('Bank transfer ref #XYZ');
  });

  it('OVERDUE → PAID: allowed', async () => {
    mockInvoiceFindUnique
      .mockResolvedValueOnce({ id: 'invoice_1', status: 'OVERDUE' })
      .mockResolvedValueOnce(paidInvoice);
    mockInvoiceUpdate.mockResolvedValue({ id: 'invoice_1' });

    await expect(invoicesService.markInvoicePaid('invoice_1', {})).resolves.toBeDefined();
  });

  it('PAID → PAID: throws 409 INVOICE_ALREADY_PAID', async () => {
    mockInvoiceFindUnique.mockResolvedValueOnce({ id: 'invoice_1', status: 'PAID' });

    await expect(
      invoicesService.markInvoicePaid('invoice_1', {}),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INVOICE_ALREADY_PAID' });
  });

  it('VOID → PAID: throws 409 INVOICE_VOIDED', async () => {
    mockInvoiceFindUnique.mockResolvedValueOnce({ id: 'invoice_1', status: 'VOID' });

    await expect(
      invoicesService.markInvoicePaid('invoice_1', {}),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INVOICE_VOIDED' });
  });

  it('not found: throws 404 INVOICE_NOT_FOUND', async () => {
    mockInvoiceFindUnique.mockResolvedValueOnce(null);

    await expect(
      invoicesService.markInvoicePaid('missing', {}),
    ).rejects.toMatchObject({ statusCode: 404, code: 'INVOICE_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// voidInvoice
// ─────────────────────────────────────────────────────────────────────────────

describe('voidInvoice', () => {
  const voidedInvoice = { ...baseInvoice, status: 'VOID', voidedAt: NOW };

  it('UNPAID → VOID: voidedAt is set', async () => {
    mockInvoiceFindUnique
      .mockResolvedValueOnce({ id: 'invoice_1', status: 'UNPAID' })
      .mockResolvedValueOnce(voidedInvoice);
    mockInvoiceUpdate.mockResolvedValue({ id: 'invoice_1' });

    const result = await invoicesService.voidInvoice('invoice_1', {});

    expect(mockInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status:   'VOID',
          voidedAt: expect.any(Date),
        }),
      }),
    );
    expect(result.status).toBe('VOID');
  });

  it('OVERDUE → VOID: allowed', async () => {
    mockInvoiceFindUnique
      .mockResolvedValueOnce({ id: 'invoice_1', status: 'OVERDUE' })
      .mockResolvedValueOnce(voidedInvoice);
    mockInvoiceUpdate.mockResolvedValue({ id: 'invoice_1' });

    await expect(invoicesService.voidInvoice('invoice_1', {})).resolves.toBeDefined();
  });

  it('UNPAID → VOID: optional notes are stored', async () => {
    mockInvoiceFindUnique
      .mockResolvedValueOnce({ id: 'invoice_1', status: 'UNPAID' })
      .mockResolvedValueOnce({ ...voidedInvoice, notes: 'Duplicate booking' });
    mockInvoiceUpdate.mockResolvedValue({ id: 'invoice_1' });

    await invoicesService.voidInvoice('invoice_1', { notes: 'Duplicate booking' });

    const updateArgs = mockInvoiceUpdate.mock.calls[0][0] as { data: { notes: string } };
    expect(updateArgs.data.notes).toBe('Duplicate booking');
  });

  it('PAID → VOID: throws 409 INVOICE_ALREADY_PAID', async () => {
    mockInvoiceFindUnique.mockResolvedValueOnce({ id: 'invoice_1', status: 'PAID' });

    await expect(
      invoicesService.voidInvoice('invoice_1', {}),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INVOICE_ALREADY_PAID' });
  });

  it('VOID → VOID: throws 409 INVOICE_ALREADY_VOIDED', async () => {
    mockInvoiceFindUnique.mockResolvedValueOnce({ id: 'invoice_1', status: 'VOID' });

    await expect(
      invoicesService.voidInvoice('invoice_1', {}),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INVOICE_ALREADY_VOIDED' });
  });

  it('not found: throws 404 INVOICE_NOT_FOUND', async () => {
    mockInvoiceFindUnique.mockResolvedValueOnce(null);

    await expect(
      invoicesService.voidInvoice('missing', {}),
    ).rejects.toMatchObject({ statusCode: 404, code: 'INVOICE_NOT_FOUND' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// markOverdueInvoices
// ─────────────────────────────────────────────────────────────────────────────

describe('markOverdueInvoices', () => {
  it('updates past-due UNPAID invoices and returns the count', async () => {
    mockInvoiceUpdateMany.mockResolvedValue({ count: 3 });

    const count = await invoicesService.markOverdueInvoices();

    expect(count).toBe(3);
    expect(mockInvoiceUpdateMany).toHaveBeenCalledWith({
      where: {
        status:  'UNPAID',
        dueDate: { lt: expect.any(Date) },
      },
      data: { status: 'OVERDUE' },
    });
  });

  it('returns 0 when no overdue invoices exist', async () => {
    mockInvoiceUpdateMany.mockResolvedValue({ count: 0 });

    const count = await invoicesService.markOverdueInvoices();

    expect(count).toBe(0);
  });
});

// ─── suppress unused-variable lint warning on PAST_DUE ────────────────────────
void PAST_DUE;
