/**
 * Unit tests for calendar.service.ts — Step 1.28
 *
 * All external dependencies are mocked:
 *   - ../../lib/prisma     — database calls
 *   - ../../lib/google-calendar — OAuth2 client + calendar API
 *   - ../../config/businessType — getDefaultFlags() for feature flag control
 *
 * Coverage:
 *  ✓ getOAuthUrl       — ADMIN with artistId, ARTIST (own profile),
 *                        ADMIN missing artistId → 400, artist not found via prisma,
 *                        returns URL from generateAuthUrl
 *  ✓ handleOAuthCallback — success (tokens persisted), invalid state → 400,
 *                          artist not found → 404, token exchange failure → 502,
 *                          no refresh_token (warns but persists), code exchange
 *  ✓ getCalendarStatus — connected (has refreshToken), disconnected (no tokens),
 *                        artist not found → 404, ARTIST (own profile)
 *  ✓ disconnectCalendar — success clears tokens, not connected → 409,
 *                         artist not found → 404, ARTIST own profile
 *  ✓ syncCreateEvent   — success (creates event, stores eventId), flag off → skip,
 *                        artist no tokens → skip, booking not found → skip,
 *                        Google API error → logged, not thrown
 *  ✓ syncUpdateEvent   — success (updates event), no eventId → creates new,
 *                        flag off → skip, artist no tokens → skip,
 *                        booking not found → skip, Google API error → logged
 *  ✓ syncDeleteEvent   — success (deletes event, clears eventId), no eventId → skip,
 *                        flag off → skip, artist no tokens → skip,
 *                        booking not found → skip, Google API error → logged
 *
 * Total: 36 tests across 7 describes
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);
process.env['GOOGLE_CLIENT_ID']   = 'test-client-id';
process.env['GOOGLE_CLIENT_SECRET'] = 'test-client-secret';
process.env['GOOGLE_REDIRECT_URI']  = 'http://localhost:3000/api/calendar/callback';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockArtistFindFirst  = jest.fn();
const mockArtistFindUnique = jest.fn();
const mockArtistUpdate     = jest.fn();
const mockBookingFindUnique = jest.fn();
const mockBookingUpdate     = jest.fn();

const mockIsFeatureEnabled = jest.fn().mockResolvedValue(true);

jest.mock('../../middleware/requireFeature', () => ({
  isFeatureEnabled: (...a: unknown[]) => mockIsFeatureEnabled(...a),
  requireFeature:   jest.fn(() => (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next()),
}));

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

// ─── Mock google-calendar lib ─────────────────────────────────────────────────

const mockGenerateAuthUrl       = jest.fn().mockReturnValue('https://accounts.google.com/auth');
const mockGetToken              = jest.fn();
const mockBaseClientSetCreds    = jest.fn();
const mockGetOAuth2BaseClient   = jest.fn();
const mockBuildOAuth2Client     = jest.fn();
const mockCreateCalendarEvent   = jest.fn();
const mockUpdateCalendarEvent   = jest.fn();
const mockDeleteCalendarEvent   = jest.fn();

jest.mock('../../lib/google-calendar', () => ({
  getOAuth2BaseClient:        (...a: unknown[]) => mockGetOAuth2BaseClient(...a),
  buildOAuth2ClientForTokens: (...a: unknown[]) => mockBuildOAuth2Client(...a),
  createCalendarEvent:        (...a: unknown[]) => mockCreateCalendarEvent(...a),
  updateCalendarEvent:        (...a: unknown[]) => mockUpdateCalendarEvent(...a),
  deleteCalendarEvent:        (...a: unknown[]) => mockDeleteCalendarEvent(...a),
}));

// ─── Import service under test (after mocks) ─────────────────────────────────

import * as svc from './calendar.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const artistId  = 'artist_1';
const userId    = 'user_1';
const bookingId = 'booking_1';

const baseBooking = {
  id:              bookingId,
  startAt:         new Date('2026-04-15T10:00:00Z'),
  endAt:           new Date('2026-04-15T12:00:00Z'),
  notes:           'Sleeve piece',
  calendarEventId: null,
  artist: {
    id:                   artistId,
    calendarAccessToken:  'access_token',
    calendarRefreshToken: 'refresh_token',
    calendarTokenExpiresAt: new Date('2026-05-01T00:00:00Z'),
    user: { name: 'Alex Ink' },
  },
  customer: { name: 'Jane Smith', email: 'jane@example.com' },
  lead: null,
  services: [{ service: { name: 'Tattoo Session' } }],
};

const mockOAuth2Client = {
  generateAuthUrl: mockGenerateAuthUrl,
  getToken:        mockGetToken,
  setCredentials:  mockBaseClientSetCreds,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetOAuth2BaseClient.mockReturnValue(mockOAuth2Client);
  mockBuildOAuth2Client.mockReturnValue(mockOAuth2Client);
  mockCreateCalendarEvent.mockResolvedValue('google_event_id_1');
  mockUpdateCalendarEvent.mockResolvedValue(undefined);
  mockDeleteCalendarEvent.mockResolvedValue(undefined);
  mockArtistUpdate.mockResolvedValue({});
  mockBookingUpdate.mockResolvedValue({});
});

// ─────────────────────────────────────────────────────────────────────────────
// getOAuthUrl
// ─────────────────────────────────────────────────────────────────────────────

describe('getOAuthUrl', () => {
  it('ADMIN — returns auth URL for specified artistId', async () => {
    mockArtistFindUnique.mockResolvedValueOnce({ id: artistId, tenantId: 'tenant_1' });
    const result = await svc.getOAuthUrl(artistId, userId, 'ADMIN', 'tenant_1');
    expect(result.url).toBe('https://accounts.google.com/auth');
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        access_type: 'offline',
        prompt:      'consent',
        scope:       expect.arrayContaining(['https://www.googleapis.com/auth/calendar.events']),
        state:       expect.any(String),
      }),
    );
    // Verify state encodes the artistId
    const call = mockGenerateAuthUrl.mock.calls[0][0] as { state: string };
    const decoded = JSON.parse(Buffer.from(call.state, 'base64url').toString('utf-8')) as { artistId: string };
    expect(decoded.artistId).toBe(artistId);
  });

  it('ADMIN — throws 400 when artistId is missing', async () => {
    await expect(svc.getOAuthUrl(undefined, userId, 'ADMIN', null)).rejects.toMatchObject({
      statusCode: 400,
      code:   'ARTIST_ID_REQUIRED',
    });
  });

  it('ADMIN — throws 403 when artistId belongs to different tenant', async () => {
    mockArtistFindUnique.mockResolvedValueOnce({ id: artistId, tenantId: 'tenant_B' });
    await expect(svc.getOAuthUrl(artistId, userId, 'ADMIN', 'tenant_A')).rejects.toMatchObject({
      statusCode: 403,
      code:   'FORBIDDEN',
    });
  });

  it('ADMIN — SUPER_ADMIN (null tenantId) skips tenant check', async () => {
    const result = await svc.getOAuthUrl(artistId, userId, 'ADMIN', null);
    expect(result.url).toBe('https://accounts.google.com/auth');
    // No artist lookup needed for SUPER_ADMIN
    expect(mockArtistFindUnique).not.toHaveBeenCalled();
  });

  it('ARTIST — resolves own artist profile and returns auth URL', async () => {
    mockArtistFindFirst.mockResolvedValue({ id: artistId });
    const result = await svc.getOAuthUrl(undefined, userId, 'ARTIST', null);
    expect(result.url).toBe('https://accounts.google.com/auth');
    expect(mockArtistFindFirst).toHaveBeenCalledWith({ where: { userId }, select: { id: true } });
  });

  it('ARTIST — throws 404 when artist profile not found', async () => {
    mockArtistFindFirst.mockResolvedValue(null);
    await expect(svc.getOAuthUrl(undefined, userId, 'ARTIST', null)).rejects.toMatchObject({
      statusCode: 404,
      code:   'ARTIST_PROFILE_NOT_FOUND',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// handleOAuthCallback
// ─────────────────────────────────────────────────────────────────────────────

describe('handleOAuthCallback', () => {
  const validState = Buffer.from(JSON.stringify({ artistId })).toString('base64url');
  const tokens     = { access_token: 'new_access', refresh_token: 'new_refresh', expiry_date: 1_750_000_000_000 };

  beforeEach(() => {
    mockArtistFindUnique.mockResolvedValue({ id: artistId });
    mockGetToken.mockResolvedValue({ tokens });
  });

  it('success — persists tokens and returns artistId', async () => {
    const result = await svc.handleOAuthCallback('auth_code', validState);
    expect(result.artistId).toBe(artistId);
    expect(mockArtistFindUnique).toHaveBeenCalledWith({ where: { id: artistId }, select: { id: true } });
    expect(mockArtistUpdate).toHaveBeenCalledWith({
      where: { id: artistId },
      data:  {
        calendarAccessToken:    tokens.access_token,
        calendarRefreshToken:   tokens.refresh_token,
        calendarTokenExpiresAt: new Date(tokens.expiry_date),
      },
    });
  });

  it('throws 400 for invalid state (not base64url JSON)', async () => {
    await expect(svc.handleOAuthCallback('code', 'not-valid-base64!!!')).rejects.toMatchObject({
      statusCode: 400,
      code:   'INVALID_STATE',
    });
  });

  it('throws 400 for state missing artistId', async () => {
    const badState = Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64url');
    await expect(svc.handleOAuthCallback('code', badState)).rejects.toMatchObject({
      statusCode: 400,
      code:   'INVALID_STATE',
    });
  });

  it('throws 404 when artist not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);
    await expect(svc.handleOAuthCallback('code', validState)).rejects.toMatchObject({
      statusCode: 404,
      code:   'ARTIST_NOT_FOUND',
    });
  });

  it('throws 502 when Google token exchange fails', async () => {
    mockGetToken.mockRejectedValue(new Error('invalid_grant'));
    await expect(svc.handleOAuthCallback('bad_code', validState)).rejects.toMatchObject({
      statusCode: 502,
      code:   'OAUTH_TOKEN_EXCHANGE_FAILED',
    });
  });

  it('handles missing refresh_token gracefully (warns, still persists)', async () => {
    mockGetToken.mockResolvedValue({ tokens: { access_token: 'new_access', expiry_date: tokens.expiry_date } });
    const result = await svc.handleOAuthCallback('auth_code', validState);
    expect(result.artistId).toBe(artistId);
    // refresh_token should be stored as null
    expect(mockArtistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ calendarRefreshToken: null }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCalendarStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('getCalendarStatus', () => {
  it('returns connected=true when artist has refreshToken', async () => {
    mockArtistFindUnique.mockResolvedValue({
      calendarAccessToken:    'access',
      calendarRefreshToken:   'refresh',
      calendarTokenExpiresAt: new Date('2026-05-01'),
    });
    const result = await svc.getCalendarStatus(artistId, userId, 'ADMIN', null);
    expect(result.connected).toBe(true);
    expect(result.expiresAt).toEqual(new Date('2026-05-01'));
  });

  it('returns connected=false when artist has no refreshToken', async () => {
    mockArtistFindUnique.mockResolvedValue({
      calendarAccessToken:    null,
      calendarRefreshToken:   null,
      calendarTokenExpiresAt: null,
    });
    const result = await svc.getCalendarStatus(artistId, userId, 'ADMIN', null);
    expect(result.connected).toBe(false);
    expect(result.expiresAt).toBeNull();
  });

  it('throws 404 when artist not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);
    await expect(svc.getCalendarStatus(artistId, userId, 'ADMIN', null)).rejects.toMatchObject({
      statusCode: 404,
      code:   'ARTIST_NOT_FOUND',
    });
  });

  it('ARTIST — uses own profile', async () => {
    mockArtistFindFirst.mockResolvedValue({ id: artistId });
    mockArtistFindUnique.mockResolvedValue({
      calendarAccessToken:    'a',
      calendarRefreshToken:   'r',
      calendarTokenExpiresAt: null,
    });
    const result = await svc.getCalendarStatus(undefined, userId, 'ARTIST', null);
    expect(result.connected).toBe(true);
  });

  it('ADMIN — throws 403 when artistId belongs to different tenant', async () => {
    mockArtistFindUnique.mockResolvedValueOnce({ id: artistId, tenantId: 'tenant_B' });
    await expect(svc.getCalendarStatus(artistId, userId, 'ADMIN', 'tenant_A')).rejects.toMatchObject({
      statusCode: 403,
      code:   'FORBIDDEN',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// disconnectCalendar
// ─────────────────────────────────────────────────────────────────────────────

describe('disconnectCalendar', () => {
  it('success — clears tokens', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: artistId, calendarRefreshToken: 'refresh' });
    await svc.disconnectCalendar(artistId, userId, 'ADMIN', null);
    expect(mockArtistUpdate).toHaveBeenCalledWith({
      where: { id: artistId },
      data:  {
        calendarAccessToken:    null,
        calendarRefreshToken:   null,
        calendarTokenExpiresAt: null,
      },
    });
  });

  it('throws 409 when calendar is not connected', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: artistId, calendarRefreshToken: null });
    await expect(svc.disconnectCalendar(artistId, userId, 'ADMIN', null)).rejects.toMatchObject({
      statusCode: 409,
      code:   'CALENDAR_NOT_CONNECTED',
    });
  });

  it('throws 404 when artist not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);
    await expect(svc.disconnectCalendar(artistId, userId, 'ADMIN', null)).rejects.toMatchObject({
      statusCode: 404,
      code:   'ARTIST_NOT_FOUND',
    });
  });

  it('ARTIST — uses own profile', async () => {
    mockArtistFindFirst.mockResolvedValue({ id: artistId });
    mockArtistFindUnique.mockResolvedValue({ id: artistId, calendarRefreshToken: 'refresh' });
    await svc.disconnectCalendar(undefined, userId, 'ARTIST', null);
    expect(mockArtistUpdate).toHaveBeenCalled();
  });

  it('ADMIN — throws 403 when artistId belongs to different tenant', async () => {
    mockArtistFindUnique.mockResolvedValueOnce({ id: artistId, tenantId: 'tenant_B' });
    await expect(svc.disconnectCalendar(artistId, userId, 'ADMIN', 'tenant_A')).rejects.toMatchObject({
      statusCode: 403,
      code:   'FORBIDDEN',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// syncCreateEvent
// ─────────────────────────────────────────────────────────────────────────────

describe('syncCreateEvent', () => {
  it('success — creates event and stores calendarEventId', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    await svc.syncCreateEvent(bookingId);
    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      mockOAuth2Client,
      expect.objectContaining({
        summary:       expect.stringContaining('Jane Smith'),
        startAt:       baseBooking.startAt,
        endAt:         baseBooking.endAt,
        attendeeEmail: 'jane@example.com',
      }),
    );
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: bookingId },
      data:  { calendarEventId: 'google_event_id_1' },
    });
  });

  it('skips when CALENDAR_ENABLED flag is off', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(false);
    await svc.syncCreateEvent(bookingId);
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
    expect(mockBookingFindUnique).not.toHaveBeenCalled();
  });

  it('skips when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);
    await svc.syncCreateEvent(bookingId);
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
  });

  it('skips when artist has no calendar tokens', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...baseBooking,
      artist: { ...baseBooking.artist, calendarRefreshToken: null },
    });
    await svc.syncCreateEvent(bookingId);
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
  });

  it('does not throw when Google API errors — logs and swallows', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockCreateCalendarEvent.mockRejectedValue(new Error('Google API down'));
    await expect(svc.syncCreateEvent(bookingId)).resolves.toBeUndefined();
  });

  it('uses lead name/email when no customer', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...baseBooking,
      customer: null,
      lead: { name: 'Lead User', email: 'lead@example.com' },
    });
    await svc.syncCreateEvent(bookingId);
    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      mockOAuth2Client,
      expect.objectContaining({ attendeeEmail: 'lead@example.com' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// syncUpdateEvent
// ─────────────────────────────────────────────────────────────────────────────

describe('syncUpdateEvent', () => {
  const bookingWithEvent = { ...baseBooking, calendarEventId: 'existing_event_id' };

  it('success — updates existing calendar event', async () => {
    mockBookingFindUnique.mockResolvedValue(bookingWithEvent);
    await svc.syncUpdateEvent(bookingId);
    expect(mockUpdateCalendarEvent).toHaveBeenCalledWith(
      mockOAuth2Client,
      'existing_event_id',
      expect.objectContaining({ startAt: baseBooking.startAt }),
    );
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
  });

  it('creates new event when calendarEventId is null', async () => {
    mockBookingFindUnique.mockResolvedValue({ ...baseBooking, calendarEventId: null });
    await svc.syncUpdateEvent(bookingId);
    expect(mockCreateCalendarEvent).toHaveBeenCalled();
    expect(mockUpdateCalendarEvent).not.toHaveBeenCalled();
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: bookingId },
      data:  { calendarEventId: 'google_event_id_1' },
    });
  });

  it('skips when CALENDAR_ENABLED flag is off', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(false);
    await svc.syncUpdateEvent(bookingId);
    expect(mockUpdateCalendarEvent).not.toHaveBeenCalled();
  });

  it('skips when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);
    await svc.syncUpdateEvent(bookingId);
    expect(mockUpdateCalendarEvent).not.toHaveBeenCalled();
  });

  it('skips when artist has no calendar tokens', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...bookingWithEvent,
      artist: { ...baseBooking.artist, calendarRefreshToken: null },
    });
    await svc.syncUpdateEvent(bookingId);
    expect(mockUpdateCalendarEvent).not.toHaveBeenCalled();
  });

  it('does not throw on Google API error', async () => {
    mockBookingFindUnique.mockResolvedValue(bookingWithEvent);
    mockUpdateCalendarEvent.mockRejectedValue(new Error('rate limit'));
    await expect(svc.syncUpdateEvent(bookingId)).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// syncDeleteEvent
// ─────────────────────────────────────────────────────────────────────────────

describe('syncDeleteEvent', () => {
  const bookingWithEvent = {
    id:              bookingId,
    calendarEventId: 'event_to_delete',
    artist: {
      id:                   artistId,
      calendarAccessToken:  'access',
      calendarRefreshToken: 'refresh',
      calendarTokenExpiresAt: new Date('2026-05-01'),
    },
  };

  it('success — deletes event and clears calendarEventId', async () => {
    mockBookingFindUnique.mockResolvedValue(bookingWithEvent);
    await svc.syncDeleteEvent(bookingId);
    expect(mockDeleteCalendarEvent).toHaveBeenCalledWith(mockOAuth2Client, 'event_to_delete');
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: bookingId },
      data:  { calendarEventId: null },
    });
  });

  it('skips when CALENDAR_ENABLED flag is off', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(false);
    await svc.syncDeleteEvent(bookingId);
    expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
  });

  it('skips when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);
    await svc.syncDeleteEvent(bookingId);
    expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
  });

  it('skips when booking has no calendarEventId', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...bookingWithEvent,
      calendarEventId: null,
    });
    await svc.syncDeleteEvent(bookingId);
    expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
  });

  it('skips when artist has no calendar tokens', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...bookingWithEvent,
      artist: { ...bookingWithEvent.artist, calendarRefreshToken: null },
    });
    await svc.syncDeleteEvent(bookingId);
    expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();
  });

  it('does not throw on Google API error', async () => {
    mockBookingFindUnique.mockResolvedValue(bookingWithEvent);
    mockDeleteCalendarEvent.mockRejectedValue(new Error('forbidden'));
    await expect(svc.syncDeleteEvent(bookingId)).resolves.toBeUndefined();
  });
});
