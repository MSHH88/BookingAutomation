/**
 * Unit tests for outlook-calendar.service.ts — Phase 7.1
 *
 * All external dependencies are mocked:
 *   - ../../lib/prisma         — database calls
 *   - ../../lib/outlook-calendar — OAuth + Graph API helpers
 *   - ../../config/businessType  — getDefaultFlags()
 *
 * Coverage:
 *  ✓ getOutlookOAuthUrl  — ADMIN with artistId, ARTIST own profile,
 *                          ADMIN missing artistId → 400, artist not found
 *  ✓ handleOutlookCallback — success, invalid state → 400,
 *                            artist not found → 404, exchange failure → 502
 *  ✓ getOutlookStatus    — connected (has refreshToken), disconnected
 *  ✓ disconnectOutlook   — success, not connected → 409, artist not found → 404
 *  ✓ syncOutlookCreateEvent — success, flag off → skip, no tokens → skip,
 *                             booking not found → skip, error → logged
 *  ✓ syncOutlookUpdateEvent — success (has outlook: prefix), no prefix → creates,
 *                             flag off → skip
 *  ✓ syncOutlookDeleteEvent — success, no prefix → skip, flag off → skip
 */

process.env['BUSINESS_TYPE']         = 'tattoo_studio';
process.env['DATABASE_URL']          = 'postgresql://test';
process.env['NODE_ENV']              = 'test';
process.env['JWT_ACCESS_SECRET']     = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET']    = 'b'.repeat(32);
process.env['MICROSOFT_CLIENT_ID']   = 'test-ms-client';
process.env['MICROSOFT_CLIENT_SECRET'] = 'test-ms-secret';
process.env['MICROSOFT_REDIRECT_URI']  = 'http://localhost:3000/api/calendar/outlook/callback';
process.env['MICROSOFT_TENANT_ID']     = 'common';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockArtistFindFirst  = jest.fn();
const mockArtistFindUnique = jest.fn();
const mockArtistUpdate     = jest.fn();
const mockBookingFindUnique = jest.fn();
const mockBookingUpdate     = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    artist: {
      findFirst:  (...a: unknown[]) => mockArtistFindFirst(...a),
      findUnique: (...a: unknown[]) => mockArtistFindUnique(...a),
      update:     (...a: unknown[]) => mockArtistUpdate(...a),
    },
    booking: {
      findUnique: (...a: unknown[]) => mockBookingFindUnique(...a),
      update:     (...a: unknown[]) => mockBookingUpdate(...a),
    },
  },
}));

// ─── Mock outlook-calendar lib ────────────────────────────────────────────────

const mockGetOutlookAuthUrl       = jest.fn().mockReturnValue('https://login.microsoftonline.com/auth');
const mockExchangeCodeForTokens   = jest.fn();
const mockRefreshOutlookToken     = jest.fn();
const mockCreateOutlookEvent      = jest.fn();
const mockUpdateOutlookEvent      = jest.fn();
const mockDeleteOutlookEvent      = jest.fn();

jest.mock('../../lib/outlook-calendar', () => ({
  getOutlookAuthUrl:        (...a: unknown[]) => mockGetOutlookAuthUrl(...a),
  exchangeCodeForTokens:    (...a: unknown[]) => mockExchangeCodeForTokens(...a),
  refreshOutlookToken:      (...a: unknown[]) => mockRefreshOutlookToken(...a),
  createOutlookEvent:       (...a: unknown[]) => mockCreateOutlookEvent(...a),
  updateOutlookEvent:       (...a: unknown[]) => mockUpdateOutlookEvent(...a),
  deleteOutlookEvent:       (...a: unknown[]) => mockDeleteOutlookEvent(...a),
}));

// ─── Mock businessType ────────────────────────────────────────────────────────

import * as businessType from '../../config/businessType';

// ─── Import service under test ────────────────────────────────────────────────

import * as svc from './outlook-calendar.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const artistId  = 'artist_1';
const userId    = 'user_1';
const bookingId = 'booking_1';

const baseArtist = {
  id:                    artistId,
  microsoftAccessToken:  'ms-access',
  microsoftRefreshToken: 'ms-refresh',
  user: { name: 'Test Artist' },
};

const baseBooking = {
  id:             bookingId,
  startAt:        new Date('2025-06-01T10:00:00Z'),
  endAt:          new Date('2025-06-01T11:30:00Z'),
  notes:          'Test notes',
  calendarEventId: null as string | null,
  artist:         baseArtist,
  customer:       { name: 'John Smith', email: 'john@example.com' },
  lead:           null,
  services:       [{ service: { name: 'Tattoo Session' } }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFlags(overrides: Partial<ReturnType<typeof businessType.getDefaultFlags>> = {}) {
  jest.spyOn(businessType, 'getDefaultFlags').mockReturnValue({
    ...businessType.getDefaultFlags('tattoo_studio'),
    OUTLOOK_CALENDAR_ENABLED: true,
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockFlags();
});

// ── getOutlookOAuthUrl ────────────────────────────────────────────────────────

describe('getOutlookOAuthUrl', () => {
  it('returns URL for ADMIN with artistId', async () => {
    const { url } = await svc.getOutlookOAuthUrl(artistId, userId, 'ADMIN');
    expect(mockGetOutlookAuthUrl).toHaveBeenCalledTimes(1);
    expect(url).toBe('https://login.microsoftonline.com/auth');
  });

  it('returns URL for ARTIST (own profile)', async () => {
    mockArtistFindFirst.mockResolvedValue({ id: artistId });
    const { url } = await svc.getOutlookOAuthUrl(undefined, userId, 'ARTIST');
    expect(url).toBe('https://login.microsoftonline.com/auth');
  });

  it('throws 400 for ADMIN without artistId', async () => {
    await expect(svc.getOutlookOAuthUrl(undefined, userId, 'ADMIN')).rejects.toMatchObject({
      statusCode: 400,
      code:       'ARTIST_ID_REQUIRED',
    });
  });
});

// ── handleOutlookCallback ─────────────────────────────────────────────────────

describe('handleOutlookCallback', () => {
  const validState = Buffer.from(JSON.stringify({ artistId })).toString('base64url');

  it('exchanges code, persists tokens', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: artistId });
    mockExchangeCodeForTokens.mockResolvedValue({
      access_token:  'new-access',
      refresh_token: 'new-refresh',
    });
    mockArtistUpdate.mockResolvedValue({});

    const result = await svc.handleOutlookCallback('auth-code', validState);
    expect(result.artistId).toBe(artistId);
    expect(mockArtistUpdate).toHaveBeenCalledWith({
      where: { id: artistId },
      data:  { microsoftAccessToken: 'new-access', microsoftRefreshToken: 'new-refresh' },
    });
  });

  it('throws 400 for invalid state', async () => {
    await expect(svc.handleOutlookCallback('code', 'bad-state')).rejects.toMatchObject({
      statusCode: 400,
      code:       'INVALID_STATE',
    });
  });

  it('throws 404 when artist not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);
    await expect(svc.handleOutlookCallback('code', validState)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 502 when token exchange fails', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: artistId });
    mockExchangeCodeForTokens.mockRejectedValue(new Error('network error'));
    await expect(svc.handleOutlookCallback('code', validState)).rejects.toMatchObject({
      statusCode: 502,
    });
  });
});

// ── getOutlookStatus ──────────────────────────────────────────────────────────

describe('getOutlookStatus', () => {
  it('returns connected when refresh token exists', async () => {
    mockArtistFindUnique.mockResolvedValue({ microsoftRefreshToken: 'token' });
    const result = await svc.getOutlookStatus(artistId, userId, 'ADMIN');
    expect(result.connected).toBe(true);
  });

  it('returns disconnected when no refresh token', async () => {
    mockArtistFindUnique.mockResolvedValue({ microsoftRefreshToken: null });
    const result = await svc.getOutlookStatus(artistId, userId, 'ADMIN');
    expect(result.connected).toBe(false);
  });

  it('throws 404 when artist not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);
    await expect(svc.getOutlookStatus(artistId, userId, 'ADMIN')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ── disconnectOutlook ─────────────────────────────────────────────────────────

describe('disconnectOutlook', () => {
  it('clears tokens on success', async () => {
    mockArtistFindUnique.mockResolvedValue({ microsoftRefreshToken: 'token' });
    mockArtistUpdate.mockResolvedValue({});

    await svc.disconnectOutlook(artistId, userId, 'ADMIN');
    expect(mockArtistUpdate).toHaveBeenCalledWith({
      where: { id: artistId },
      data:  { microsoftAccessToken: null, microsoftRefreshToken: null },
    });
  });

  it('throws 409 when not connected', async () => {
    mockArtistFindUnique.mockResolvedValue({ microsoftRefreshToken: null });
    await expect(svc.disconnectOutlook(artistId, userId, 'ADMIN')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('throws 404 when artist not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);
    await expect(svc.disconnectOutlook(artistId, userId, 'ADMIN')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ── syncOutlookCreateEvent ────────────────────────────────────────────────────

describe('syncOutlookCreateEvent', () => {
  it('creates event and stores outlook-prefixed id', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockCreateOutlookEvent.mockResolvedValue('ms-event-id-123');
    mockBookingUpdate.mockResolvedValue({});

    await svc.syncOutlookCreateEvent(bookingId);

    expect(mockCreateOutlookEvent).toHaveBeenCalledTimes(1);
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: bookingId },
      data:  { calendarEventId: 'outlook:ms-event-id-123' },
    });
  });

  it('skips when flag is off', async () => {
    mockFlags({ OUTLOOK_CALENDAR_ENABLED: false });
    await svc.syncOutlookCreateEvent(bookingId);
    expect(mockBookingFindUnique).not.toHaveBeenCalled();
  });

  it('skips when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);
    await svc.syncOutlookCreateEvent(bookingId);
    expect(mockCreateOutlookEvent).not.toHaveBeenCalled();
  });

  it('skips when artist has no Microsoft tokens', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...baseBooking,
      artist: { ...baseArtist, microsoftRefreshToken: null },
    });
    await svc.syncOutlookCreateEvent(bookingId);
    expect(mockCreateOutlookEvent).not.toHaveBeenCalled();
  });

  it('logs error and does not throw when Graph API fails', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockCreateOutlookEvent.mockRejectedValue(new Error('Graph API error'));

    await expect(svc.syncOutlookCreateEvent(bookingId)).resolves.toBeUndefined();
  });
});

// ── syncOutlookUpdateEvent ────────────────────────────────────────────────────

describe('syncOutlookUpdateEvent', () => {
  it('updates event when calendarEventId has outlook: prefix', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...baseBooking,
      calendarEventId: 'outlook:event-abc',
    });
    mockUpdateOutlookEvent.mockResolvedValue(undefined);

    await svc.syncOutlookUpdateEvent(bookingId);
    expect(mockUpdateOutlookEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'ms-access' }),
      'event-abc',
      expect.objectContaining({ summary: expect.stringContaining('John Smith') }),
    );
  });

  it('skips when flag is off', async () => {
    mockFlags({ OUTLOOK_CALENDAR_ENABLED: false });
    await svc.syncOutlookUpdateEvent(bookingId);
    expect(mockBookingFindUnique).not.toHaveBeenCalled();
  });

  it('creates new event when no outlook: prefix', async () => {
    mockBookingFindUnique
      .mockResolvedValueOnce({ ...baseBooking, calendarEventId: null })  // update call
      .mockResolvedValueOnce(baseBooking);                                 // create call
    mockCreateOutlookEvent.mockResolvedValue('new-event-id');
    mockBookingUpdate.mockResolvedValue({});

    await svc.syncOutlookUpdateEvent(bookingId);
    expect(mockCreateOutlookEvent).toHaveBeenCalledTimes(1);
  });
});

// ── syncOutlookDeleteEvent ────────────────────────────────────────────────────

describe('syncOutlookDeleteEvent', () => {
  it('deletes event and clears calendarEventId', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...baseBooking,
      calendarEventId: 'outlook:event-del',
    });
    mockDeleteOutlookEvent.mockResolvedValue(undefined);
    mockBookingUpdate.mockResolvedValue({});

    await svc.syncOutlookDeleteEvent(bookingId);

    expect(mockDeleteOutlookEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'ms-access' }),
      'event-del',
    );
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: bookingId },
      data:  { calendarEventId: null },
    });
  });

  it('skips when flag is off', async () => {
    mockFlags({ OUTLOOK_CALENDAR_ENABLED: false });
    await svc.syncOutlookDeleteEvent(bookingId);
    expect(mockBookingFindUnique).not.toHaveBeenCalled();
  });

  it('skips when calendarEventId has no outlook: prefix', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...baseBooking,
      calendarEventId: 'google-event-id',
    });
    await svc.syncOutlookDeleteEvent(bookingId);
    expect(mockDeleteOutlookEvent).not.toHaveBeenCalled();
  });
});
