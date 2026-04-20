/**
 * Apple iCloud Calendar service — Phase 7.2
 *
 * CalDAV-based calendar sync for artists using iCloud Calendar.
 * Mirrors outlook-calendar.service.ts / calendar.service.ts patterns.
 *
 * ── Connection flow ───────────────────────────────────────────────────────────
 *   1. Artist provides iCloud email + app-specific password via:
 *      POST /api/calendar/apple/connect
 *   2. Server discovers the CalDAV calendar URL, stores credentials on Artist.
 *   3. Artist can check status via GET /api/calendar/apple/status.
 *   4. Artist can disconnect via DELETE /api/calendar/apple/disconnect.
 *
 * ── Event sync ────────────────────────────────────────────────────────────────
 *   Booking CONFIRMED    → syncAppleCreateEvent
 *   Booking CANCELLED    → syncAppleDeleteEvent
 *   Booking RESCHEDULED  → syncAppleUpdateEvent
 *
 * Tests: apple-calendar.service.test.ts
 */

import { randomUUID }     from 'crypto';
import { prisma }         from '../../lib/prisma';
import { config }         from '../../config';
import { AppError }       from '../../errors/AppError';
import { logger }         from '../../utils/logger';
import { isFeatureEnabled } from '../../middleware/requireFeature';
import {
  discoverCalendarUrl,
  createAppleEvent,
  updateAppleEvent,
  deleteAppleEvent,
  AppleCredentials,
} from '../../lib/apple-calendar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveArtistId(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
): Promise<string> {
  if (actorRole === 'ADMIN') {
    if (queryArtistId) return queryArtistId;
    throw new AppError(400, 'ARTIST_ID_REQUIRED', 'artistId query parameter is required for ADMIN callers');
  }

  const artist = await prisma.artist.findFirst({
    where:  { userId: actorId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_PROFILE_NOT_FOUND', 'Artist profile not found for this user');
  }
  return artist.id;
}

function buildSummary(customerName: string, serviceName: string, studioName: string): string {
  return `${customerName} — ${serviceName} @ ${studioName}`;
}

// ─── connect ──────────────────────────────────────────────────────────────────

/**
 * Stores Apple CalDAV credentials and discovers the calendar URL.
 * The appleCalDAVToken is stored in the format "username:password" (base64).
 */
export async function connectAppleCalendar(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
  username:      string,
  password:      string,
): Promise<{ connected: boolean; calendarUrl: string }> {
  const artistId = await resolveArtistId(queryArtistId, actorId, actorRole);

  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${artistId} not found`);
  }

  const creds: AppleCredentials = { username, password };

  let calendarUrl: string;
  try {
    calendarUrl = await discoverCalendarUrl(creds);
  } catch (err) {
    logger.error('Apple CalDAV: calendar discovery failed', { artistId, err });
    throw new AppError(502, 'APPLE_CALDAV_CONNECT_FAILED', 'Failed to connect to iCloud CalDAV — check your credentials and app-specific password');
  }

  // Store as base64-encoded "username:password" + separate URL
  const token = Buffer.from(`${username}:${password}`).toString('base64');

  await prisma.artist.update({
    where: { id: artistId },
    data:  {
      appleCalDAVUrl:   calendarUrl,
      appleCalDAVToken: token,
    },
  });

  logger.info('Apple Calendar connected for artist', { artistId, calendarUrl });
  return { connected: true, calendarUrl };
}

// ─── getStatus ────────────────────────────────────────────────────────────────

export async function getAppleStatus(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
): Promise<{ connected: boolean; calendarUrl: string | null }> {
  const artistId = await resolveArtistId(queryArtistId, actorId, actorRole);

  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { appleCalDAVToken: true, appleCalDAVUrl: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${artistId} not found`);
  }

  return {
    connected:   !!artist.appleCalDAVToken,
    calendarUrl: artist.appleCalDAVUrl,
  };
}

// ─── disconnect ───────────────────────────────────────────────────────────────

export async function disconnectApple(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
): Promise<void> {
  const artistId = await resolveArtistId(queryArtistId, actorId, actorRole);

  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { appleCalDAVToken: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${artistId} not found`);
  }
  if (!artist.appleCalDAVToken) {
    throw new AppError(409, 'APPLE_NOT_CONNECTED', 'Apple iCloud Calendar is not connected for this artist');
  }

  await prisma.artist.update({
    where: { id: artistId },
    data:  { appleCalDAVToken: null, appleCalDAVUrl: null },
  });

  logger.info('Apple Calendar disconnected for artist', { artistId });
}

// ─── getCredsForArtist ────────────────────────────────────────────────────────

function parseCreds(token: string, calendarUrl: string | null): AppleCredentials {
  const decoded = Buffer.from(token, 'base64').toString('utf-8');
  const colonIdx = decoded.indexOf(':');
  const username = decoded.slice(0, colonIdx);
  const password = decoded.slice(colonIdx + 1);
  return { username, password, calendarUrl: calendarUrl ?? undefined };
}

// ─── syncAppleCreateEvent ─────────────────────────────────────────────────────

export async function syncAppleCreateEvent(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: {
      id:      true,
      tenantId: true,
      startAt: true,
      endAt:   true,
      notes:   true,
      artist: {
        select: {
          id:               true,
          appleCalDAVToken: true,
          appleCalDAVUrl:   true,
          user: { select: { name: true } },
        },
      },
      customer: { select: { name: true, email: true } },
      lead:     { select: { name: true, email: true } },
      services: { select: { service: { select: { name: true } } }, take: 1 },
    },
  });

  if (!booking) {
    logger.warn('syncAppleCreateEvent: booking not found', { bookingId });
    return;
  }

  if (!await isFeatureEnabled('APPLE_CALENDAR_ENABLED', booking.tenantId ?? undefined)) return;

  try {
    const { artist } = booking;
    if (!artist.appleCalDAVToken) {
      logger.debug('syncAppleCreateEvent: artist has no Apple credentials', { bookingId, artistId: artist.id });
      return;
    }

    const creds         = parseCreds(artist.appleCalDAVToken, artist.appleCalDAVUrl);
    const uid           = randomUUID();
    const customerName  = booking.customer?.name ?? booking.lead?.name ?? 'Customer';
    const customerEmail = booking.customer?.email ?? booking.lead?.email;
    const serviceName   = booking.services[0]?.service?.name ?? 'Appointment';

    await createAppleEvent(creds, {
      uid,
      summary:       buildSummary(customerName, serviceName, config.STUDIO_NAME),
      description:   booking.notes ?? '',
      startAt:       booking.startAt,
      endAt:         booking.endAt,
      attendeeEmail: customerEmail,
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data:  { calendarEventId: `apple:${uid}` },
    });

    logger.info('syncAppleCreateEvent: Apple event created', { bookingId, uid });
  } catch (err) {
    logger.error('syncAppleCreateEvent failed', { bookingId, err });
  }
}

// ─── syncAppleUpdateEvent ─────────────────────────────────────────────────────

export async function syncAppleUpdateEvent(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: {
      id:              true,
      tenantId:        true,
      startAt:         true,
      endAt:           true,
      notes:           true,
      calendarEventId: true,
      artist: {
        select: {
          id:               true,
          appleCalDAVToken: true,
          appleCalDAVUrl:   true,
          user: { select: { name: true } },
        },
      },
      customer: { select: { name: true, email: true } },
      lead:     { select: { name: true, email: true } },
      services: { select: { service: { select: { name: true } } }, take: 1 },
    },
  });

  if (!booking) {
    logger.warn('syncAppleUpdateEvent: booking not found', { bookingId });
    return;
  }

  if (!await isFeatureEnabled('APPLE_CALENDAR_ENABLED', booking.tenantId ?? undefined)) return;

  try {
    const { artist } = booking;
    if (!artist.appleCalDAVToken) return;

    const rawEventId = booking.calendarEventId;
    if (!rawEventId?.startsWith('apple:')) {
      await syncAppleCreateEvent(bookingId);
      return;
    }

    const uid   = rawEventId.replace('apple:', '');
    const creds = parseCreds(artist.appleCalDAVToken, artist.appleCalDAVUrl);

    const customerName  = booking.customer?.name ?? booking.lead?.name ?? 'Customer';
    const customerEmail = booking.customer?.email ?? booking.lead?.email;
    const serviceName   = booking.services[0]?.service?.name ?? 'Appointment';

    await updateAppleEvent(creds, {
      uid,
      summary:       buildSummary(customerName, serviceName, config.STUDIO_NAME),
      description:   booking.notes ?? '',
      startAt:       booking.startAt,
      endAt:         booking.endAt,
      attendeeEmail: customerEmail,
    });

    logger.info('syncAppleUpdateEvent: Apple event updated', { bookingId, uid });
  } catch (err) {
    logger.error('syncAppleUpdateEvent failed', { bookingId, err });
  }
}

// ─── syncAppleDeleteEvent ─────────────────────────────────────────────────────

export async function syncAppleDeleteEvent(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: {
      id:              true,
      tenantId:        true,
      calendarEventId: true,
      artist: {
        select: {
          id:               true,
          appleCalDAVToken: true,
          appleCalDAVUrl:   true,
        },
      },
    },
  });

  if (!booking) {
    logger.warn('syncAppleDeleteEvent: booking not found', { bookingId });
    return;
  }

  if (!await isFeatureEnabled('APPLE_CALENDAR_ENABLED', booking.tenantId ?? undefined)) return;

  try {
    const rawEventId = booking.calendarEventId;
    if (!rawEventId?.startsWith('apple:')) return;

    const { artist } = booking;
    if (!artist.appleCalDAVToken) return;

    const uid   = rawEventId.replace('apple:', '');
    const creds = parseCreds(artist.appleCalDAVToken, artist.appleCalDAVUrl);

    await deleteAppleEvent(creds, uid);

    await prisma.booking.update({
      where: { id: bookingId },
      data:  { calendarEventId: null },
    });

    logger.info('syncAppleDeleteEvent: Apple event deleted', { bookingId, uid });
  } catch (err) {
    logger.error('syncAppleDeleteEvent failed', { bookingId, err });
  }
}
