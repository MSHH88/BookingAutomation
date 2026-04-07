/**
 * Unit tests for waitlist.service.ts — Step 1.16
 *
 * Prisma and the notifications sendEmail function are fully mocked so these
 * tests run without a live database or email provider.
 *
 * Coverage:
 *  ✓ joinWaitlist
 *      — success: creates entry, returns full detail
 *      — duplicate (WAITING): same email + artistId → 409 WAITLIST_DUPLICATE
 *      — duplicate (NOTIFIED): same email + artistId → 409 WAITLIST_DUPLICATE
 *      — no conflict when same email but BOOKED status → creates new entry
 *      — no conflict when same email but different artistId → creates new entry
 *      — requestedDate ISO string correctly converted to Date
 *
 *  ✓ listWaitlist
 *      — no filter: returns paginated list ordered newest-first
 *      — status=WAITING filter passed to Prisma
 *      — artistId filter passed to Prisma
 *      — email filter passed to Prisma
 *      — pagination params forwarded correctly
 *
 *  ✓ getWaitlistEntryById
 *      — found → returns full detail
 *      — not found → 404 WAITLIST_ENTRY_NOT_FOUND
 *
 *  ✓ updateWaitlistStatus
 *      — WAITING → NOTIFIED (valid)
 *      — WAITING → BOOKED (valid)
 *      — WAITING → CANCELLED (valid)
 *      — WAITING → EXPIRED (valid)
 *      — NOTIFIED → BOOKED (valid)
 *      — NOTIFIED → EXPIRED (valid)
 *      — BOOKED → WAITING (invalid) → 409 WAITLIST_INVALID_TRANSITION
 *      — CANCELLED → WAITING (invalid) → 409 WAITLIST_INVALID_TRANSITION
 *      — EXPIRED → WAITING (valid — re-activation)
 *      — not found → 404 WAITLIST_ENTRY_NOT_FOUND
 *
 *  ✓ notifyWaitlistEntry
 *      — WAITING entry: status becomes NOTIFIED, notifiedAt + expiresAt set
 *      — NOTIFIED entry: can re-notify (updates expiresAt window)
 *      — expiresAt = now + expiresInHours (default 72 h)
 *      — custom expiresInHours (24 h) applied correctly
 *      — sendEmail called with correct template key and variables
 *      — email fails: DB update preserved, returns updated entry (best-effort)
 *      — BOOKED entry → 409 WAITLIST_CANNOT_NOTIFY
 *      — EXPIRED entry → 409 WAITLIST_CANNOT_NOTIFY
 *      — not found → 404 WAITLIST_ENTRY_NOT_FOUND
 *
 *  ✓ deleteWaitlistEntry
 *      — success: Prisma delete called, returns { id }
 *      — not found → 404 WAITLIST_ENTRY_NOT_FOUND
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);
process.env['RESEND_API_KEY']     = 'test_key';
process.env['RESEND_FROM_EMAIL']  = 'noreply@test.io';
process.env['RESEND_FROM_NAME']   = 'Test Studio';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockWaitlistFindUnique = jest.fn();
const mockWaitlistFindFirst  = jest.fn();
const mockWaitlistFindMany   = jest.fn();
const mockWaitlistCount      = jest.fn();
const mockWaitlistCreate     = jest.fn();
const mockWaitlistUpdate     = jest.fn();
const mockWaitlistDelete     = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    waitlistEntry: {
      findUnique: (...a: unknown[]) => mockWaitlistFindUnique(...a),
      findFirst:  (...a: unknown[]) => mockWaitlistFindFirst(...a),
      findMany:   (...a: unknown[]) => mockWaitlistFindMany(...a),
      count:      (...a: unknown[]) => mockWaitlistCount(...a),
      create:     (...a: unknown[]) => mockWaitlistCreate(...a),
      update:     (...a: unknown[]) => mockWaitlistUpdate(...a),
      delete:     (...a: unknown[]) => mockWaitlistDelete(...a),
    },
  },
}));

// ─── Mock notifications.service sendEmail ─────────────────────────────────────

const mockSendEmail = jest.fn();

jest.mock('../notifications/notifications.service', () => ({
  sendEmail: (...a: unknown[]) => mockSendEmail(...a),
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as waitlistService from './waitlist.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const NOW = new Date('2026-04-07T10:00:00Z');

const baseEntry = {
  id:            'wl_1',
  name:          'Jane Smith',
  email:         'jane@example.com',
  phone:         '+44 7700 900001',
  artistId:      'artist_1',
  serviceId:     'svc_1',
  bookingId:     null,
  requestedDate: new Date('2026-05-01T00:00:00Z'),
  notes:         'Prefer afternoon slots',
  status:        'WAITING' as const,
  notifiedAt:    null,
  expiresAt:     null,
  createdAt:     NOW,
  updatedAt:     NOW,
};

const baseListItem = {
  id:            'wl_1',
  name:          'Jane Smith',
  email:         'jane@example.com',
  phone:         '+44 7700 900001',
  artistId:      'artist_1',
  serviceId:     'svc_1',
  requestedDate: new Date('2026-05-01T00:00:00Z'),
  status:        'WAITING' as const,
  notifiedAt:    null,
  expiresAt:     null,
  createdAt:     NOW,
};

// ─── beforeEach reset ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── joinWaitlist ─────────────────────────────────────────────────────────────

describe('joinWaitlist', () => {
  const joinBody = {
    name:          'Jane Smith',
    email:         'jane@example.com',
    phone:         '+44 7700 900001',
    artistId:      'artist_1',
    serviceId:     'svc_1',
    requestedDate: '2026-05-01T00:00:00Z',
    notes:         'Prefer afternoon slots',
  };

  it('creates and returns a waitlist entry on success', async () => {
    mockWaitlistFindFirst.mockResolvedValueOnce(null);  // no duplicate
    mockWaitlistCreate.mockResolvedValue(baseEntry);

    const result = await waitlistService.joinWaitlist(joinBody, '127.0.0.1');

    expect(result).toEqual(baseEntry);
    expect(mockWaitlistCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name:  'Jane Smith',
          email: 'jane@example.com',
          phone: '+44 7700 900001',
        }),
        select: expect.objectContaining({ id: true, status: true }),
      }),
    );
  });

  it('throws 409 WAITLIST_DUPLICATE when same email+artistId has WAITING status', async () => {
    mockWaitlistFindFirst.mockResolvedValueOnce({ id: 'wl_existing' });

    await expect(
      waitlistService.joinWaitlist(joinBody),
    ).rejects.toMatchObject({ statusCode: 409, code: 'WAITLIST_DUPLICATE' });

    expect(mockWaitlistCreate).not.toHaveBeenCalled();
  });

  it('throws 409 WAITLIST_DUPLICATE when same email+artistId has NOTIFIED status', async () => {
    mockWaitlistFindFirst.mockResolvedValueOnce({ id: 'wl_notified' });

    await expect(
      waitlistService.joinWaitlist({ ...joinBody, email: 'notified@example.com' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'WAITLIST_DUPLICATE' });
  });

  it('creates entry when same email has a BOOKED status (terminal — can rejoin)', async () => {
    mockWaitlistFindFirst.mockResolvedValueOnce(null);  // findFirst returns no active duplicate
    mockWaitlistCreate.mockResolvedValue({ ...baseEntry, status: 'WAITING' });

    const result = await waitlistService.joinWaitlist(joinBody);

    expect(mockWaitlistCreate).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('WAITING');
  });

  it('creates entry when same email but different artistId', async () => {
    mockWaitlistFindFirst.mockResolvedValueOnce(null);  // different artistId → no conflict
    mockWaitlistCreate.mockResolvedValue({ ...baseEntry, artistId: 'artist_2' });

    const result = await waitlistService.joinWaitlist({ ...joinBody, artistId: 'artist_2' });

    expect(mockWaitlistCreate).toHaveBeenCalledTimes(1);
    expect(result.artistId).toBe('artist_2');
  });

  it('correctly converts requestedDate ISO string to a Date object', async () => {
    mockWaitlistFindFirst.mockResolvedValueOnce(null);
    mockWaitlistCreate.mockResolvedValue(baseEntry);

    await waitlistService.joinWaitlist(joinBody);

    const createCall = mockWaitlistCreate.mock.calls[0][0];
    expect(createCall.data.requestedDate).toBeInstanceOf(Date);
    expect(createCall.data.requestedDate.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });
});

// ─── listWaitlist ─────────────────────────────────────────────────────────────

describe('listWaitlist', () => {
  it('returns a paginated list with no filter', async () => {
    mockWaitlistCount.mockResolvedValue(1);
    mockWaitlistFindMany.mockResolvedValue([baseListItem]);

    const result = await waitlistService.listWaitlist({});

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(mockWaitlistFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where:   {},
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('passes status=WAITING filter to Prisma', async () => {
    mockWaitlistCount.mockResolvedValue(2);
    mockWaitlistFindMany.mockResolvedValue([baseListItem]);

    await waitlistService.listWaitlist({ status: 'WAITING' });

    expect(mockWaitlistFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'WAITING' } }),
    );
  });

  it('passes artistId filter to Prisma', async () => {
    mockWaitlistCount.mockResolvedValue(1);
    mockWaitlistFindMany.mockResolvedValue([baseListItem]);

    await waitlistService.listWaitlist({ artistId: 'artist_1' });

    expect(mockWaitlistFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { artistId: 'artist_1' } }),
    );
  });

  it('passes email filter to Prisma', async () => {
    mockWaitlistCount.mockResolvedValue(1);
    mockWaitlistFindMany.mockResolvedValue([baseListItem]);

    await waitlistService.listWaitlist({ email: 'jane@example.com' });

    expect(mockWaitlistFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'jane@example.com' } }),
    );
  });

  it('forwards pagination params correctly', async () => {
    mockWaitlistCount.mockResolvedValue(50);
    mockWaitlistFindMany.mockResolvedValue([]);

    await waitlistService.listWaitlist({ page: '3', limit: '5' });

    expect(mockWaitlistFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 }),
    );
  });
});

// ─── getWaitlistEntryById ─────────────────────────────────────────────────────

describe('getWaitlistEntryById', () => {
  it('returns full detail when entry exists', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce(baseEntry);

    const result = await waitlistService.getWaitlistEntryById('wl_1');

    expect(result).toEqual(baseEntry);
    expect(mockWaitlistFindUnique).toHaveBeenCalledWith({
      where:  { id: 'wl_1' },
      select: expect.objectContaining({ id: true, status: true, notes: true }),
    });
  });

  it('throws 404 WAITLIST_ENTRY_NOT_FOUND when entry does not exist', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce(null);

    await expect(waitlistService.getWaitlistEntryById('missing'))
      .rejects.toMatchObject({ statusCode: 404, code: 'WAITLIST_ENTRY_NOT_FOUND' });
  });
});

// ─── updateWaitlistStatus ─────────────────────────────────────────────────────

describe('updateWaitlistStatus', () => {
  it('transitions WAITING → NOTIFIED successfully', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ id: 'wl_1', status: 'WAITING' });
    mockWaitlistUpdate.mockResolvedValue({ ...baseEntry, status: 'NOTIFIED' });

    const result = await waitlistService.updateWaitlistStatus('wl_1', { status: 'NOTIFIED' });

    expect(result.status).toBe('NOTIFIED');
    expect(mockWaitlistUpdate).toHaveBeenCalledWith({
      where:  { id: 'wl_1' },
      data:   { status: 'NOTIFIED' },
      select: expect.objectContaining({ id: true, status: true }),
    });
  });

  it('transitions WAITING → BOOKED successfully', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ id: 'wl_1', status: 'WAITING' });
    mockWaitlistUpdate.mockResolvedValue({ ...baseEntry, status: 'BOOKED' });

    const result = await waitlistService.updateWaitlistStatus('wl_1', { status: 'BOOKED' });

    expect(result.status).toBe('BOOKED');
  });

  it('transitions WAITING → CANCELLED successfully', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ id: 'wl_1', status: 'WAITING' });
    mockWaitlistUpdate.mockResolvedValue({ ...baseEntry, status: 'CANCELLED' });

    const result = await waitlistService.updateWaitlistStatus('wl_1', { status: 'CANCELLED' });

    expect(result.status).toBe('CANCELLED');
  });

  it('transitions WAITING → EXPIRED successfully', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ id: 'wl_1', status: 'WAITING' });
    mockWaitlistUpdate.mockResolvedValue({ ...baseEntry, status: 'EXPIRED' });

    const result = await waitlistService.updateWaitlistStatus('wl_1', { status: 'EXPIRED' });

    expect(result.status).toBe('EXPIRED');
  });

  it('transitions NOTIFIED → BOOKED successfully', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ id: 'wl_1', status: 'NOTIFIED' });
    mockWaitlistUpdate.mockResolvedValue({ ...baseEntry, status: 'BOOKED' });

    const result = await waitlistService.updateWaitlistStatus('wl_1', { status: 'BOOKED' });

    expect(result.status).toBe('BOOKED');
  });

  it('transitions NOTIFIED → EXPIRED successfully', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ id: 'wl_1', status: 'NOTIFIED' });
    mockWaitlistUpdate.mockResolvedValue({ ...baseEntry, status: 'EXPIRED' });

    const result = await waitlistService.updateWaitlistStatus('wl_1', { status: 'EXPIRED' });

    expect(result.status).toBe('EXPIRED');
  });

  it('throws 409 WAITLIST_INVALID_TRANSITION for BOOKED → WAITING (terminal)', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ id: 'wl_1', status: 'BOOKED' });

    await expect(
      waitlistService.updateWaitlistStatus('wl_1', { status: 'WAITING' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'WAITLIST_INVALID_TRANSITION' });

    expect(mockWaitlistUpdate).not.toHaveBeenCalled();
  });

  it('throws 409 WAITLIST_INVALID_TRANSITION for CANCELLED → WAITING (terminal)', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ id: 'wl_1', status: 'CANCELLED' });

    await expect(
      waitlistService.updateWaitlistStatus('wl_1', { status: 'WAITING' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'WAITLIST_INVALID_TRANSITION' });

    expect(mockWaitlistUpdate).not.toHaveBeenCalled();
  });

  it('transitions EXPIRED → WAITING (re-activation)', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ id: 'wl_1', status: 'EXPIRED' });
    mockWaitlistUpdate.mockResolvedValue({ ...baseEntry, status: 'WAITING' });

    const result = await waitlistService.updateWaitlistStatus('wl_1', { status: 'WAITING' });

    expect(result.status).toBe('WAITING');
  });

  it('throws 404 WAITLIST_ENTRY_NOT_FOUND when entry does not exist', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce(null);

    await expect(
      waitlistService.updateWaitlistStatus('missing', { status: 'NOTIFIED' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'WAITLIST_ENTRY_NOT_FOUND' });

    expect(mockWaitlistUpdate).not.toHaveBeenCalled();
  });
});

// ─── notifyWaitlistEntry ──────────────────────────────────────────────────────

describe('notifyWaitlistEntry', () => {
  const notifiedEntry = {
    ...baseEntry,
    status:     'NOTIFIED' as const,
    notifiedAt: NOW,
    expiresAt:  new Date(NOW.getTime() + 72 * 60 * 60 * 1000),
  };

  it('updates WAITING entry to NOTIFIED with notifiedAt + expiresAt set', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce(baseEntry);  // WAITING
    mockWaitlistUpdate.mockResolvedValue(notifiedEntry);
    mockSendEmail.mockResolvedValue(undefined);

    const result = await waitlistService.notifyWaitlistEntry('wl_1', { expiresInHours: 72 });

    expect(result.status).toBe('NOTIFIED');
    expect(result.notifiedAt).not.toBeNull();
    expect(result.expiresAt).not.toBeNull();
    expect(mockWaitlistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'wl_1' },
        data:  expect.objectContaining({
          status:     'NOTIFIED',
          notifiedAt: expect.any(Date),
          expiresAt:  expect.any(Date),
        }),
      }),
    );
  });

  it('can re-notify a NOTIFIED entry (updates expiresAt window)', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ ...baseEntry, status: 'NOTIFIED' });
    mockWaitlistUpdate.mockResolvedValue(notifiedEntry);
    mockSendEmail.mockResolvedValue(undefined);

    await waitlistService.notifyWaitlistEntry('wl_1', { expiresInHours: 48 });

    expect(mockWaitlistUpdate).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it('calculates expiresAt as now + expiresInHours (default 72 h)', async () => {
    const before = Date.now();
    mockWaitlistFindUnique.mockResolvedValueOnce(baseEntry);
    mockWaitlistUpdate.mockResolvedValue(notifiedEntry);
    mockSendEmail.mockResolvedValue(undefined);

    await waitlistService.notifyWaitlistEntry('wl_1', { expiresInHours: 72 });

    const after     = Date.now();
    const updateArg = mockWaitlistUpdate.mock.calls[0][0].data;
    const expiresMs = updateArg.expiresAt.getTime();
    const notifiedMs = updateArg.notifiedAt.getTime();

    // expiresAt must be exactly notifiedAt + 72 h
    expect(expiresMs - notifiedMs).toBe(72 * 60 * 60 * 1000);
    // notifiedAt must be within the test execution window
    expect(notifiedMs).toBeGreaterThanOrEqual(before);
    expect(notifiedMs).toBeLessThanOrEqual(after);
  });

  it('applies custom expiresInHours (24 h) correctly', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce(baseEntry);
    mockWaitlistUpdate.mockResolvedValue({
      ...notifiedEntry,
      expiresAt: new Date(NOW.getTime() + 24 * 60 * 60 * 1000),
    });
    mockSendEmail.mockResolvedValue(undefined);

    await waitlistService.notifyWaitlistEntry('wl_1', { expiresInHours: 24 });

    const updateArg = mockWaitlistUpdate.mock.calls[0][0].data;
    expect(updateArg.expiresAt.getTime() - updateArg.notifiedAt.getTime())
      .toBe(24 * 60 * 60 * 1000);
  });

  it('calls sendEmail with template key and correct variables', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce(baseEntry);
    mockWaitlistUpdate.mockResolvedValue(notifiedEntry);
    mockSendEmail.mockResolvedValue(undefined);

    await waitlistService.notifyWaitlistEntry('wl_1', {
      expiresInHours: 72,
      customMessage:  'Alex has a slot open Saturday!',
    });

    expect(mockSendEmail).toHaveBeenCalledWith(
      'waitlist-slot-available',
      'jane@example.com',
      expect.objectContaining({
        customerName:  'Jane Smith',
        expiresInHours: '72',
        customMessage:  'Alex has a slot open Saturday!',
      }),
    );
  });

  it('returns updated entry even when sendEmail fails (best-effort)', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce(baseEntry);
    mockWaitlistUpdate.mockResolvedValue(notifiedEntry);
    mockSendEmail.mockRejectedValue(new Error('Template not found'));

    // Should NOT throw — email failure is best-effort
    const result = await waitlistService.notifyWaitlistEntry('wl_1', { expiresInHours: 72 });

    expect(result.status).toBe('NOTIFIED');
    expect(mockWaitlistUpdate).toHaveBeenCalledTimes(1);
  });

  it('throws 409 WAITLIST_CANNOT_NOTIFY for BOOKED entry', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ ...baseEntry, status: 'BOOKED' });

    await expect(
      waitlistService.notifyWaitlistEntry('wl_1', { expiresInHours: 72 }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'WAITLIST_CANNOT_NOTIFY' });

    expect(mockWaitlistUpdate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('throws 409 WAITLIST_CANNOT_NOTIFY for EXPIRED entry', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ ...baseEntry, status: 'EXPIRED' });

    await expect(
      waitlistService.notifyWaitlistEntry('wl_1', { expiresInHours: 72 }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'WAITLIST_CANNOT_NOTIFY' });

    expect(mockWaitlistUpdate).not.toHaveBeenCalled();
  });

  it('throws 404 WAITLIST_ENTRY_NOT_FOUND when entry does not exist', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce(null);

    await expect(
      waitlistService.notifyWaitlistEntry('missing', { expiresInHours: 72 }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'WAITLIST_ENTRY_NOT_FOUND' });

    expect(mockWaitlistUpdate).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

// ─── deleteWaitlistEntry ──────────────────────────────────────────────────────

describe('deleteWaitlistEntry', () => {
  it('deletes the entry and returns { id }', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce({ id: 'wl_1' });
    mockWaitlistDelete.mockResolvedValue({ id: 'wl_1' });

    const result = await waitlistService.deleteWaitlistEntry('wl_1');

    expect(result).toEqual({ id: 'wl_1' });
    expect(mockWaitlistDelete).toHaveBeenCalledWith({ where: { id: 'wl_1' } });
  });

  it('throws 404 WAITLIST_ENTRY_NOT_FOUND when entry does not exist', async () => {
    mockWaitlistFindUnique.mockResolvedValueOnce(null);

    await expect(waitlistService.deleteWaitlistEntry('missing'))
      .rejects.toMatchObject({ statusCode: 404, code: 'WAITLIST_ENTRY_NOT_FOUND' });

    expect(mockWaitlistDelete).not.toHaveBeenCalled();
  });
});
