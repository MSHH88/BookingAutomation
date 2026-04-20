/**
 * Outlook Calendar service — Phase 7.1
 *
 * Microsoft Outlook / Exchange calendar sync for artists.
 * Mirrors calendar.service.ts (Google) pattern exactly.
 *
 * ── OAuth2 flow ───────────────────────────────────────────────────────────────
 *   1. Artist clicks "Connect Outlook Calendar".
 *   2. GET /api/calendar/outlook/auth-url → Microsoft consent URL.
 *   3. Microsoft redirects to GET /api/calendar/outlook/callback with code+state.
 *   4. Server exchanges code for tokens, persists on Artist.
 *
 * ── Event sync ────────────────────────────────────────────────────────────────
 *   Booking CONFIRMED    → syncOutlookCreateEvent
 *   Booking CANCELLED    → syncOutlookDeleteEvent
 *   Booking RESCHEDULED  → syncOutlookUpdateEvent
 *   All are fire-and-forget; errors are logged, never re-thrown.
 *
 * Tests: outlook-calendar.service.test.ts
 */

import { prisma }          from '../../lib/prisma';
import { config }          from '../../config';
import { AppError }        from '../../errors/AppError';
import { logger }          from '../../utils/logger';
import { isFeatureEnabled } from '../../middleware/requireFeature';
import {
  getOutlookAuthUrl,
  exchangeCodeForTokens,
  refreshOutlookToken,
  createOutlookEvent,
  updateOutlookEvent,
  deleteOutlookEvent,
  OutlookTokenSet,
} from '../../lib/outlook-calendar';

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

// ─── getOAuthUrl ──────────────────────────────────────────────────────────────

export async function getOutlookOAuthUrl(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
): Promise<{ url: string }> {
  const artistId = await resolveArtistId(queryArtistId, actorId, actorRole);
  const state    = Buffer.from(JSON.stringify({ artistId })).toString('base64url');
  const url      = getOutlookAuthUrl(state);
  return { url };
}

// ─── handleOAuthCallback ──────────────────────────────────────────────────────

export async function handleOutlookCallback(
  code:  string,
  state: string,
): Promise<{ artistId: string }> {
  let artistId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8')) as {
      artistId: string;
    };
    artistId = decoded.artistId;
    if (!artistId) throw new Error('artistId missing from state');
  } catch {
    throw new AppError(400, 'INVALID_STATE', 'Invalid OAuth2 state parameter');
  }

  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${artistId} not found`);
  }

  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    logger.error('Microsoft OAuth2 token exchange failed', { artistId, err });
    throw new AppError(502, 'OAUTH_TOKEN_EXCHANGE_FAILED', 'Failed to exchange authorisation code with Microsoft');
  }

  await prisma.artist.update({
    where: { id: artistId },
    data:  {
      microsoftAccessToken:  tokens.access_token,
      microsoftRefreshToken: tokens.refresh_token,
    },
  });

  logger.info('Outlook Calendar connected for artist', { artistId });
  return { artistId };
}

// ─── getStatus ────────────────────────────────────────────────────────────────

export async function getOutlookStatus(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
): Promise<{ connected: boolean }> {
  const artistId = await resolveArtistId(queryArtistId, actorId, actorRole);

  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { microsoftRefreshToken: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${artistId} not found`);
  }

  return { connected: !!artist.microsoftRefreshToken };
}

// ─── disconnect ───────────────────────────────────────────────────────────────

export async function disconnectOutlook(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
): Promise<void> {
  const artistId = await resolveArtistId(queryArtistId, actorId, actorRole);

  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { microsoftRefreshToken: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${artistId} not found`);
  }
  if (!artist.microsoftRefreshToken) {
    throw new AppError(409, 'OUTLOOK_NOT_CONNECTED', 'Outlook Calendar is not connected for this artist');
  }

  await prisma.artist.update({
    where: { id: artistId },
    data:  { microsoftAccessToken: null, microsoftRefreshToken: null },
  });

  logger.info('Outlook Calendar disconnected for artist', { artistId });
}

// ─── getTokensForArtist ───────────────────────────────────────────────────────

/** Retrieves and optionally refreshes Microsoft tokens for an artist. */
async function getValidTokens(
  artistId:      string,
  accessToken:   string | null,
  refreshToken:  string,
): Promise<OutlookTokenSet> {
  // Try to refresh when access token is null/expired
  if (!accessToken) {
    try {
      const refreshed = await refreshOutlookToken(refreshToken);
      await prisma.artist.update({
        where: { id: artistId },
        data:  {
          microsoftAccessToken:  refreshed.access_token,
          microsoftRefreshToken: refreshed.refresh_token ?? refreshToken,
        },
      });
      return {
        accessToken:  refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? refreshToken,
      };
    } catch (err) {
      logger.warn('Failed to refresh Microsoft access token', { artistId, err });
      return { accessToken: null, refreshToken };
    }
  }
  return { accessToken, refreshToken };
}

// ─── syncOutlookCreateEvent ───────────────────────────────────────────────────

export async function syncOutlookCreateEvent(bookingId: string): Promise<void> {
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
          id:                   true,
          microsoftAccessToken: true,
          microsoftRefreshToken: true,
          user: { select: { name: true } },
        },
      },
      customer: { select: { name: true, email: true } },
      lead:     { select: { name: true, email: true } },
      services: { select: { service: { select: { name: true } } }, take: 1 },
    },
  });

  if (!booking) {
    logger.warn('syncOutlookCreateEvent: booking not found', { bookingId });
    return;
  }

  if (!await isFeatureEnabled('OUTLOOK_CALENDAR_ENABLED', booking.tenantId ?? undefined)) return;

  try {
    const { artist } = booking;
    if (!artist.microsoftRefreshToken) {
      logger.debug('syncOutlookCreateEvent: artist has no Outlook tokens', { bookingId, artistId: artist.id });
      return;
    }

    const tokens = await getValidTokens(
      artist.id,
      artist.microsoftAccessToken,
      artist.microsoftRefreshToken,
    );
    if (!tokens.accessToken) return;

    const customerName  = booking.customer?.name ?? booking.lead?.name ?? 'Customer';
    const customerEmail = booking.customer?.email ?? booking.lead?.email;
    const serviceName   = booking.services[0]?.service?.name ?? 'Appointment';

    const eventId = await createOutlookEvent(tokens, {
      summary:       buildSummary(customerName, serviceName, config.STUDIO_NAME),
      description:   booking.notes ?? '',
      startAt:       booking.startAt,
      endAt:         booking.endAt,
      attendeeEmail: customerEmail,
    });

    // Re-use calendarEventId field: prefix with "outlook:" to distinguish from Google
    await prisma.booking.update({
      where: { id: bookingId },
      data:  { calendarEventId: `outlook:${eventId}` },
    });

    logger.info('syncOutlookCreateEvent: Outlook event created', { bookingId, eventId });
  } catch (err) {
    logger.error('syncOutlookCreateEvent failed', { bookingId, err });
  }
}

// ─── syncOutlookUpdateEvent ───────────────────────────────────────────────────

export async function syncOutlookUpdateEvent(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: {
      id:             true,
      tenantId:       true,
      startAt:        true,
      endAt:          true,
      notes:          true,
      calendarEventId: true,
      artist: {
        select: {
          id:                   true,
          microsoftAccessToken: true,
          microsoftRefreshToken: true,
          user: { select: { name: true } },
        },
      },
      customer: { select: { name: true, email: true } },
      lead:     { select: { name: true, email: true } },
      services: { select: { service: { select: { name: true } } }, take: 1 },
    },
  });

  if (!booking) {
    logger.warn('syncOutlookUpdateEvent: booking not found', { bookingId });
    return;
  }

  if (!await isFeatureEnabled('OUTLOOK_CALENDAR_ENABLED', booking.tenantId ?? undefined)) return;

  try {
    const { artist } = booking;
    if (!artist.microsoftRefreshToken) return;

    // Only act on Outlook events (prefixed)
    const rawEventId = booking.calendarEventId;
    if (!rawEventId?.startsWith('outlook:')) {
      // No Outlook event — create instead
      await syncOutlookCreateEvent(bookingId);
      return;
    }

    const eventId = rawEventId.replace('outlook:', '');
    const tokens  = await getValidTokens(artist.id, artist.microsoftAccessToken, artist.microsoftRefreshToken);
    if (!tokens.accessToken) return;

    const customerName  = booking.customer?.name ?? booking.lead?.name ?? 'Customer';
    const customerEmail = booking.customer?.email ?? booking.lead?.email;
    const serviceName   = booking.services[0]?.service?.name ?? 'Appointment';

    await updateOutlookEvent(tokens, eventId, {
      summary:       buildSummary(customerName, serviceName, config.STUDIO_NAME),
      description:   booking.notes ?? '',
      startAt:       booking.startAt,
      endAt:         booking.endAt,
      attendeeEmail: customerEmail,
    });

    logger.info('syncOutlookUpdateEvent: Outlook event updated', { bookingId, eventId });
  } catch (err) {
    logger.error('syncOutlookUpdateEvent failed', { bookingId, err });
  }
}

// ─── syncOutlookDeleteEvent ───────────────────────────────────────────────────

export async function syncOutlookDeleteEvent(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: {
      id:             true,
      tenantId:       true,
      calendarEventId: true,
      artist: {
        select: {
          id:                   true,
          microsoftAccessToken: true,
          microsoftRefreshToken: true,
        },
      },
    },
  });

  if (!booking) {
    logger.warn('syncOutlookDeleteEvent: booking not found', { bookingId });
    return;
  }

  if (!await isFeatureEnabled('OUTLOOK_CALENDAR_ENABLED', booking.tenantId ?? undefined)) return;

  try {
    const rawEventId = booking.calendarEventId;
    if (!rawEventId?.startsWith('outlook:')) return;

    const { artist } = booking;
    if (!artist.microsoftRefreshToken) return;

    const eventId = rawEventId.replace('outlook:', '');
    const tokens  = await getValidTokens(artist.id, artist.microsoftAccessToken, artist.microsoftRefreshToken);
    if (!tokens.accessToken) return;

    await deleteOutlookEvent(tokens, eventId);

    await prisma.booking.update({
      where: { id: bookingId },
      data:  { calendarEventId: null },
    });

    logger.info('syncOutlookDeleteEvent: Outlook event deleted', { bookingId, eventId });
  } catch (err) {
    logger.error('syncOutlookDeleteEvent failed', { bookingId, err });
  }
}
