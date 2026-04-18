/**
 * Unit tests for apple-calendar.service.ts — Phase 7.2
 *
 * All external dependencies are mocked:
 *   - ../../lib/prisma          — database calls
 *   - ../../lib/apple-calendar  — CalDAV helpers
 *   - ../../config/businessType — getDefaultFlags()
 *
 * Coverage:
 *  ✓ connectAppleCalendar — success (discovers URL, stores token),
 *                           artist not found → 404, CalDAV failure → 502
 *  ✓ getAppleStatus       — connected, disconnected, artist not found → 404
 *  ✓ disconnectApple      — success, not connected → 409, not found → 404
 *  ✓ syncAppleCreateEvent — success, flag off → skip, no token → skip,
 *                           booking not found → skip, error → logged
 *  ✓ syncAppleUpdateEvent — updates (has apple: prefix), no prefix → creates,
 *                           flag off → skip
 *  ✓ syncAppleDeleteEvent — deletes, no prefix → skip, flag off → skip
 */

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

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

// ─── Mock apple-calendar lib ──────────────────────────────────────────────────

const mockDiscoverCalendarUrl = jest.fn();
const mockCreateAppleEvent    = jest.fn();
const mockUpdateAppleEvent    = jest.fn();
const mockDeleteAppleEvent    = jest.fn();

jest.mock('../../lib/apple-calendar', () => ({
  discoverCalendarUrl: (...a: unknown[]) => mockDiscoverCalendarUrl(...a),
  createAppleEvent:    (...a: unknown[]) => mockCreateAppleEvent(...a),
  updateAppleEvent:    (...a: unknown[]) => mockUpdateAppleEvent(...a),
  deleteAppleEvent:    (...a: unknown[]) => mockDeleteAppleEvent(...a),
}));

// ─── Mock crypto (randomUUID) ─────────────────────────────────────────────────

jest.mock('crypto', () => ({
  ...jest.requireActual<typeof import('crypto')>('crypto'),
  randomUUID: () => 'test-uuid-1234',
}));

// ─── Mock businessType ────────────────────────────────────────────────────────

import * as businessType from '../../config/businessType';

// ─── Import service under test ────────────────────────────────────────────────

import * as svc from './apple-calendar.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const artistId  = 'artist_1';
const userId    = 'user_1';
const bookingId = 'booking_1';

// Stored token is base64("user@example.com:app-pass")
const storedToken = Buffer.from('user@example.com:app-pass').toString('base64');

const baseArtist = {
  id:               artistId,
  appleCalDAVToken: storedToken,
  appleCalDAVUrl:   'https://caldav.icloud.com/calendars/primary',
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
  const flags = {
    ...businessType.getDefaultFlags('tattoo_studio'),
    APPLE_CALENDAR_ENABLED: true,
    ...overrides,
  };
  jest.spyOn(businessType, 'getDefaultFlags').mockReturnValue(flags);
  mockIsFeatureEnabled.mockImplementation(async (flag: string) =>
    (flags as Record<string, boolean>)[flag] ?? true,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockFlags();
});

// ── connectAppleCalendar ──────────────────────────────────────────────────────

describe('connectAppleCalendar', () => {
  it('discovers calendar URL and stores token', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: artistId });
    mockDiscoverCalendarUrl.mockResolvedValue('https://caldav.icloud.com/cal/primary');
    mockArtistUpdate.mockResolvedValue({});

    const result = await svc.connectAppleCalendar(
      artistId, userId, 'ADMIN', 'user@icloud.com', 'app-pass',
    );

    expect(result.connected).toBe(true);
    expect(result.calendarUrl).toBe('https://caldav.icloud.com/cal/primary');
    expect(mockArtistUpdate).toHaveBeenCalledWith({
      where: { id: artistId },
      data:  {
        appleCalDAVUrl:   'https://caldav.icloud.com/cal/primary',
        appleCalDAVToken: expect.any(String),
      },
    });
  });

  it('throws 404 when artist not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);
    await expect(
      svc.connectAppleCalendar(artistId, userId, 'ADMIN', 'user@icloud.com', 'pass'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 502 when CalDAV discovery fails', async () => {
    mockArtistFindUnique.mockResolvedValue({ id: artistId });
    mockDiscoverCalendarUrl.mockRejectedValue(new Error('CalDAV error'));
    await expect(
      svc.connectAppleCalendar(artistId, userId, 'ADMIN', 'user@icloud.com', 'pass'),
    ).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws 400 for ADMIN without artistId', async () => {
    await expect(
      svc.connectAppleCalendar(undefined, userId, 'ADMIN', 'user@icloud.com', 'pass'),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ── getAppleStatus ────────────────────────────────────────────────────────────

describe('getAppleStatus', () => {
  it('returns connected when token exists', async () => {
    mockArtistFindUnique.mockResolvedValue({
      appleCalDAVToken: storedToken,
      appleCalDAVUrl:   'https://caldav.icloud.com/cal',
    });
    const result = await svc.getAppleStatus(artistId, userId, 'ADMIN');
    expect(result.connected).toBe(true);
  });

  it('returns disconnected when no token', async () => {
    mockArtistFindUnique.mockResolvedValue({ appleCalDAVToken: null, appleCalDAVUrl: null });
    const result = await svc.getAppleStatus(artistId, userId, 'ADMIN');
    expect(result.connected).toBe(false);
  });

  it('throws 404 when artist not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);
    await expect(svc.getAppleStatus(artistId, userId, 'ADMIN')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ── disconnectApple ───────────────────────────────────────────────────────────

describe('disconnectApple', () => {
  it('clears token and url on success', async () => {
    mockArtistFindUnique.mockResolvedValue({ appleCalDAVToken: storedToken });
    mockArtistUpdate.mockResolvedValue({});

    await svc.disconnectApple(artistId, userId, 'ADMIN');
    expect(mockArtistUpdate).toHaveBeenCalledWith({
      where: { id: artistId },
      data:  { appleCalDAVToken: null, appleCalDAVUrl: null },
    });
  });

  it('throws 409 when not connected', async () => {
    mockArtistFindUnique.mockResolvedValue({ appleCalDAVToken: null });
    await expect(svc.disconnectApple(artistId, userId, 'ADMIN')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('throws 404 when artist not found', async () => {
    mockArtistFindUnique.mockResolvedValue(null);
    await expect(svc.disconnectApple(artistId, userId, 'ADMIN')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ── syncAppleCreateEvent ──────────────────────────────────────────────────────

describe('syncAppleCreateEvent', () => {
  it('creates event and stores apple-prefixed id', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockCreateAppleEvent.mockResolvedValue('test-uuid-1234');
    mockBookingUpdate.mockResolvedValue({});

    await svc.syncAppleCreateEvent(bookingId);

    expect(mockCreateAppleEvent).toHaveBeenCalledTimes(1);
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: bookingId },
      data:  { calendarEventId: 'apple:test-uuid-1234' },
    });
  });

  it('skips when flag is off', async () => {
    mockFlags({ APPLE_CALENDAR_ENABLED: false });
    await svc.syncAppleCreateEvent(bookingId);
    expect(mockBookingFindUnique).not.toHaveBeenCalled();
  });

  it('skips when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);
    await svc.syncAppleCreateEvent(bookingId);
    expect(mockCreateAppleEvent).not.toHaveBeenCalled();
  });

  it('skips when artist has no Apple token', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...baseBooking,
      artist: { ...baseArtist, appleCalDAVToken: null },
    });
    await svc.syncAppleCreateEvent(bookingId);
    expect(mockCreateAppleEvent).not.toHaveBeenCalled();
  });

  it('logs error and does not throw when CalDAV fails', async () => {
    mockBookingFindUnique.mockResolvedValue(baseBooking);
    mockCreateAppleEvent.mockRejectedValue(new Error('CalDAV error'));
    await expect(svc.syncAppleCreateEvent(bookingId)).resolves.toBeUndefined();
  });
});

// ── syncAppleUpdateEvent ──────────────────────────────────────────────────────

describe('syncAppleUpdateEvent', () => {
  it('updates event when calendarEventId has apple: prefix', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...baseBooking,
      calendarEventId: 'apple:test-uid-abc',
    });
    mockUpdateAppleEvent.mockResolvedValue(undefined);

    await svc.syncAppleUpdateEvent(bookingId);
    expect(mockUpdateAppleEvent).toHaveBeenCalledTimes(1);
    expect(mockUpdateAppleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'user@example.com' }),
      expect.objectContaining({ uid: 'test-uid-abc' }),
    );
  });

  it('skips when flag is off', async () => {
    mockFlags({ APPLE_CALENDAR_ENABLED: false });
    await svc.syncAppleUpdateEvent(bookingId);
    expect(mockBookingFindUnique).not.toHaveBeenCalled();
  });

  it('creates new event when no apple: prefix', async () => {
    mockBookingFindUnique
      .mockResolvedValueOnce({ ...baseBooking, calendarEventId: null })
      .mockResolvedValueOnce(baseBooking);
    mockCreateAppleEvent.mockResolvedValue('test-uuid-1234');
    mockBookingUpdate.mockResolvedValue({});

    await svc.syncAppleUpdateEvent(bookingId);
    expect(mockCreateAppleEvent).toHaveBeenCalledTimes(1);
  });
});

// ── syncAppleDeleteEvent ──────────────────────────────────────────────────────

describe('syncAppleDeleteEvent', () => {
  it('deletes event and clears calendarEventId', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...baseBooking,
      calendarEventId: 'apple:uid-to-delete',
    });
    mockDeleteAppleEvent.mockResolvedValue(undefined);
    mockBookingUpdate.mockResolvedValue({});

    await svc.syncAppleDeleteEvent(bookingId);

    expect(mockDeleteAppleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'user@example.com' }),
      'uid-to-delete',
    );
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: bookingId },
      data:  { calendarEventId: null },
    });
  });

  it('skips when flag is off', async () => {
    mockFlags({ APPLE_CALENDAR_ENABLED: false });
    await svc.syncAppleDeleteEvent(bookingId);
    expect(mockBookingFindUnique).not.toHaveBeenCalled();
  });

  it('skips when calendarEventId has no apple: prefix', async () => {
    mockBookingFindUnique.mockResolvedValue({
      ...baseBooking,
      calendarEventId: 'outlook:event-id',
    });
    await svc.syncAppleDeleteEvent(bookingId);
    expect(mockDeleteAppleEvent).not.toHaveBeenCalled();
  });
});
