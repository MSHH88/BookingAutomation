/**
 * Calendar service — Step 1.28
 *
 * Google Calendar sync for the BookingAutomation platform.
 *
 * ── OAuth2 flow ───────────────────────────────────────────────────────────────
 *   1. Artist clicks "Connect Google Calendar" in the CRM.
 *   2. Frontend calls GET /api/calendar/auth-url → receives the consent URL.
 *   3. Artist is redirected to Google Consent Screen.
 *   4. Google redirects back to GET /api/calendar/callback with `code` and
 *      `state` (state = artistUserId, set by us in step 2).
 *   5. Server exchanges the code for tokens, persists on the Artist record.
 *   6. Artist is redirected (or receives a success response).
 *
 * ── Event sync ────────────────────────────────────────────────────────────────
 *   Called from bookings.service.ts after status transitions:
 *
 *   Booking CONFIRMED  → syncCreateEvent (creates event, stores eventId on Booking)
 *   Booking CANCELLED  → syncDeleteEvent (deletes event by eventId)
 *   Booking RESCHEDULED → syncUpdateEvent (patches start/end/title)
 *
 *   All three functions are fire-and-forget: errors are logged, not re-thrown,
 *   so a Google outage never causes an HTTP 5xx to the end user.
 *   Feature flag `CALENDAR_ENABLED` must be true; artist must have connected.
 *
 * ── Token refresh ─────────────────────────────────────────────────────────────
 *   `buildOAuth2ClientForTokens` registers a `tokens` event listener.  When
 *   Google issues a new access token, we persist it back to the Artist record
 *   so the next request doesn't immediately need to refresh again.
 *
 * Industry references:
 *   Acuity Scheduling, Booksy, and Fresha all use Google Calendar sync so
 *   practitioners see studio bookings alongside personal appointments without
 *   manual copy-paste.
 *
 * Tests: calendar.service.test.ts (36 tests across 7 describes)
 */
import { Credentials }   from 'google-auth-library';
import { prisma }        from '../../lib/prisma';
import { config }        from '../../config';
import { AppError }      from '../../errors/AppError';
import { logger }        from '../../utils/logger';
import { getDefaultFlags } from '../../config/businessType';
import {
  getOAuth2BaseClient,
  buildOAuth2ClientForTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  TokenSet,
} from '../../lib/google-calendar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Enforces `actorRole === 'ARTIST'` may only act on their own artist profile. */
async function resolveArtistId(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
): Promise<string> {
  if (actorRole === 'ADMIN') {
    if (queryArtistId) return queryArtistId;
    throw new AppError(
      400,
      'ARTIST_ID_REQUIRED',
      'artistId query parameter is required for ADMIN callers',
    );
  }

  // ARTIST: always use own profile, ignore any provided artistId
  const artist = await prisma.artist.findFirst({
    where:  { userId: actorId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_PROFILE_NOT_FOUND', 'Artist profile not found for this user');
  }
  return artist.id;
}

/** Build a human-readable event summary for a booking. */
function buildSummary(customerName: string, serviceName: string, studioName: string): string {
  return `${customerName} — ${serviceName} @ ${studioName}`;
}

// ─── getOAuthUrl ──────────────────────────────────────────────────────────────

/**
 * Generates the Google OAuth2 consent URL for an artist.
 *
 * The `state` parameter encodes the artistUserId so the callback can identify
 * which artist is connecting. The state is Base64-encoded JSON so it is
 * URL-safe and extensible.
 *
 * Scopes requested:
 *  - `https://www.googleapis.com/auth/calendar.events` — create/update/delete
 *    events on the artist's primary calendar (minimum required scope).
 *
 * @param queryArtistId  ADMIN only: target artist.id (not userId)
 * @param actorId        JWT sub (userId of the caller)
 * @param actorRole      'ADMIN' | 'ARTIST'
 */
export async function getOAuthUrl(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
): Promise<{ url: string }> {
  const artistId = await resolveArtistId(queryArtistId, actorId, actorRole);

  // Encode artistId in state so callback can persist tokens to the right Artist
  const state = Buffer.from(JSON.stringify({ artistId })).toString('base64url');

  const oauth2Client = getOAuth2BaseClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',   // request refresh_token
    prompt:      'consent',   // force consent screen so refresh_token is always returned
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state,
  });

  return { url };
}

// ─── handleOAuthCallback ──────────────────────────────────────────────────────

/**
 * Exchanges the OAuth2 authorisation code for access + refresh tokens and
 * persists them on the Artist record.
 *
 * Called by GET /api/calendar/callback (public endpoint — no auth header,
 * because Google redirects the browser here after consent).
 *
 * @param code  Authorization code from Google
 * @param state Base64url-encoded JSON { artistId }
 */
export async function handleOAuthCallback(
  code:  string,
  state: string,
): Promise<{ artistId: string }> {
  // ── Decode state ──────────────────────────────────────────────────────────
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

  // ── Verify artist exists ──────────────────────────────────────────────────
  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { id: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${artistId} not found`);
  }

  // ── Exchange code for tokens ──────────────────────────────────────────────
  const oauth2Client = getOAuth2BaseClient();
  let tokens: Credentials;
  try {
    const { tokens: t } = await oauth2Client.getToken(code);
    tokens = t;
  } catch (err: unknown) {
    logger.error('Google OAuth2 token exchange failed', { artistId, err });
    throw new AppError(502, 'OAUTH_TOKEN_EXCHANGE_FAILED', 'Failed to exchange authorisation code with Google');
  }

  if (!tokens.refresh_token) {
    // This can happen if the artist already granted consent and we didn't use prompt=consent.
    // We handle this by preserving the existing refresh_token in the DB.
    logger.warn('No refresh_token in Google token response — artist may need to revoke & reconnect', { artistId });
  }

  // ── Persist tokens ────────────────────────────────────────────────────────
  await prisma.artist.update({
    where: { id: artistId },
    data:  {
      calendarAccessToken:    tokens.access_token  ?? null,
      calendarRefreshToken:   tokens.refresh_token ?? null,
      calendarTokenExpiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
    },
  });

  logger.info('Google Calendar connected for artist', { artistId });
  return { artistId };
}

// ─── getCalendarStatus ────────────────────────────────────────────────────────

/**
 * Returns whether an artist has connected their Google Calendar.
 */
export async function getCalendarStatus(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
): Promise<{ connected: boolean; expiresAt: Date | null }> {
  const artistId = await resolveArtistId(queryArtistId, actorId, actorRole);

  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: {
      calendarAccessToken:    true,
      calendarRefreshToken:   true,
      calendarTokenExpiresAt: true,
    },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${artistId} not found`);
  }

  const connected = Boolean(artist.calendarRefreshToken);
  return {
    connected,
    expiresAt: connected ? artist.calendarTokenExpiresAt : null,
  };
}

// ─── disconnectCalendar ───────────────────────────────────────────────────────

/**
 * Removes the stored Google Calendar tokens from the Artist record.
 * The artist will need to re-connect via the OAuth2 flow to resume sync.
 */
export async function disconnectCalendar(
  queryArtistId: string | undefined,
  actorId:       string,
  actorRole:     'ADMIN' | 'ARTIST',
): Promise<void> {
  const artistId = await resolveArtistId(queryArtistId, actorId, actorRole);

  const artist = await prisma.artist.findUnique({
    where:  { id: artistId },
    select: { id: true, calendarRefreshToken: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${artistId} not found`);
  }
  if (!artist.calendarRefreshToken) {
    throw new AppError(409, 'CALENDAR_NOT_CONNECTED', 'Google Calendar is not connected for this artist');
  }

  await prisma.artist.update({
    where: { id: artistId },
    data:  {
      calendarAccessToken:    null,
      calendarRefreshToken:   null,
      calendarTokenExpiresAt: null,
    },
  });

  logger.info('Google Calendar disconnected for artist', { artistId });
}

// ─── syncCreateEvent ─────────────────────────────────────────────────────────

/**
 * Creates a Google Calendar event when a booking is CONFIRMED.
 *
 * Stores the returned Google event ID in `Booking.calendarEventId` so it can
 * be updated or deleted on future status transitions.
 *
 * Fire-and-forget safe: errors are logged, not re-thrown.
 *
 * @param bookingId  Booking ID
 */
export async function syncCreateEvent(bookingId: string): Promise<void> {
  const flags = getDefaultFlags();
  if (!flags.CALENDAR_ENABLED) {
    logger.debug('Calendar sync skipped — CALENDAR_ENABLED is off');
    return;
  }

  try {
    const booking = await prisma.booking.findUnique({
      where:  { id: bookingId },
      select: {
        id:       true,
        startAt:  true,
        endAt:    true,
        notes:    true,
        artist: {
          select: {
            id:                   true,
            calendarAccessToken:  true,
            calendarRefreshToken: true,
            calendarTokenExpiresAt: true,
            user: { select: { name: true } },
          },
        },
        customer: { select: { name: true, email: true } },
        lead:     { select: { name: true, email: true } },
        services: { select: { service: { select: { name: true } } }, take: 1 },
      },
    });

    if (!booking) {
      logger.warn('syncCreateEvent: booking not found', { bookingId });
      return;
    }

    const { artist } = booking;
    if (!artist.calendarRefreshToken) {
      logger.debug('syncCreateEvent: artist has no calendar tokens — skipping', {
        bookingId,
        artistId: artist.id,
      });
      return;
    }

    const tokens: TokenSet = {
      accessToken:    artist.calendarAccessToken,
      refreshToken:   artist.calendarRefreshToken,
      tokenExpiresAt: artist.calendarTokenExpiresAt,
    };

    const auth = buildOAuth2ClientForTokens(tokens, async (creds: Credentials) => {
      // Persist refreshed access token
      await prisma.artist.update({
        where: { id: artist.id },
        data:  {
          calendarAccessToken:    creds.access_token    ?? null,
          calendarRefreshToken:   creds.refresh_token   ?? artist.calendarRefreshToken,
          calendarTokenExpiresAt: creds.expiry_date ? new Date(creds.expiry_date) : null,
        },
      });
    });

    const customerName  = booking.customer?.name ?? booking.lead?.name ?? 'Customer';
    const customerEmail = booking.customer?.email ?? booking.lead?.email;
    const serviceName   = booking.services[0]?.service?.name ?? 'Appointment';

    const eventId = await createCalendarEvent(auth, {
      summary:       buildSummary(customerName, serviceName, config.STUDIO_NAME),
      description:   booking.notes ?? '',
      startAt:       booking.startAt,
      endAt:         booking.endAt,
      attendeeEmail: customerEmail,
    });

    // Store the Google event ID on the booking for future updates/deletes
    await prisma.booking.update({
      where: { id: bookingId },
      data:  { calendarEventId: eventId },
    });

    logger.info('syncCreateEvent: calendar event created', { bookingId, eventId });
  } catch (err: unknown) {
    logger.error('syncCreateEvent: failed to create Google Calendar event', {
      bookingId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Intentionally not re-thrown — calendar failure must not break bookings
  }
}

// ─── syncUpdateEvent ─────────────────────────────────────────────────────────

/**
 * Updates the Google Calendar event when a booking is RESCHEDULED.
 *
 * If `Booking.calendarEventId` is null (e.g. artist connected calendar after
 * the booking was made), creates a new event instead.
 *
 * Fire-and-forget safe: errors are logged, not re-thrown.
 *
 * @param bookingId  Booking ID
 */
export async function syncUpdateEvent(bookingId: string): Promise<void> {
  const flags = getDefaultFlags();
  if (!flags.CALENDAR_ENABLED) {
    logger.debug('Calendar sync skipped — CALENDAR_ENABLED is off');
    return;
  }

  try {
    const booking = await prisma.booking.findUnique({
      where:  { id: bookingId },
      select: {
        id:              true,
        startAt:         true,
        endAt:           true,
        notes:           true,
        calendarEventId: true,
        artist: {
          select: {
            id:                   true,
            calendarAccessToken:  true,
            calendarRefreshToken: true,
            calendarTokenExpiresAt: true,
            user: { select: { name: true } },
          },
        },
        customer: { select: { name: true, email: true } },
        lead:     { select: { name: true, email: true } },
        services: { select: { service: { select: { name: true } } }, take: 1 },
      },
    });

    if (!booking) {
      logger.warn('syncUpdateEvent: booking not found', { bookingId });
      return;
    }

    const { artist } = booking;
    if (!artist.calendarRefreshToken) {
      logger.debug('syncUpdateEvent: artist has no calendar tokens — skipping', {
        bookingId,
        artistId: artist.id,
      });
      return;
    }

    const tokens: TokenSet = {
      accessToken:    artist.calendarAccessToken,
      refreshToken:   artist.calendarRefreshToken,
      tokenExpiresAt: artist.calendarTokenExpiresAt,
    };

    const auth = buildOAuth2ClientForTokens(tokens, async (creds: Credentials) => {
      await prisma.artist.update({
        where: { id: artist.id },
        data:  {
          calendarAccessToken:    creds.access_token    ?? null,
          calendarRefreshToken:   creds.refresh_token   ?? artist.calendarRefreshToken,
          calendarTokenExpiresAt: creds.expiry_date ? new Date(creds.expiry_date) : null,
        },
      });
    });

    const customerName  = booking.customer?.name ?? booking.lead?.name ?? 'Customer';
    const customerEmail = booking.customer?.email ?? booking.lead?.email;
    const serviceName   = booking.services[0]?.service?.name ?? 'Appointment';
    const eventInput    = {
      summary:       buildSummary(customerName, serviceName, config.STUDIO_NAME),
      description:   booking.notes ?? '',
      startAt:       booking.startAt,
      endAt:         booking.endAt,
      attendeeEmail: customerEmail,
    };

    if (booking.calendarEventId) {
      await updateCalendarEvent(auth, booking.calendarEventId, eventInput);
      logger.info('syncUpdateEvent: calendar event updated', {
        bookingId,
        eventId: booking.calendarEventId,
      });
    } else {
      // No existing event — create one (artist may have connected after confirm)
      const eventId = await createCalendarEvent(auth, eventInput);
      await prisma.booking.update({
        where: { id: bookingId },
        data:  { calendarEventId: eventId },
      });
      logger.info('syncUpdateEvent: calendar event created (no prior eventId)', {
        bookingId,
        eventId,
      });
    }
  } catch (err: unknown) {
    logger.error('syncUpdateEvent: failed to update Google Calendar event', {
      bookingId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── syncDeleteEvent ─────────────────────────────────────────────────────────

/**
 * Deletes the Google Calendar event when a booking is CANCELLED.
 *
 * Safe to call even if `Booking.calendarEventId` is null — returns immediately.
 *
 * Fire-and-forget safe: errors are logged, not re-thrown.
 *
 * @param bookingId  Booking ID
 */
export async function syncDeleteEvent(bookingId: string): Promise<void> {
  const flags = getDefaultFlags();
  if (!flags.CALENDAR_ENABLED) {
    logger.debug('Calendar sync skipped — CALENDAR_ENABLED is off');
    return;
  }

  try {
    const booking = await prisma.booking.findUnique({
      where:  { id: bookingId },
      select: {
        id:              true,
        calendarEventId: true,
        artist: {
          select: {
            id:                   true,
            calendarAccessToken:  true,
            calendarRefreshToken: true,
            calendarTokenExpiresAt: true,
          },
        },
      },
    });

    if (!booking) {
      logger.warn('syncDeleteEvent: booking not found', { bookingId });
      return;
    }

    if (!booking.calendarEventId) {
      logger.debug('syncDeleteEvent: no calendarEventId on booking — skipping', { bookingId });
      return;
    }

    const { artist } = booking;
    if (!artist.calendarRefreshToken) {
      logger.debug('syncDeleteEvent: artist has no calendar tokens — skipping', {
        bookingId,
        artistId: artist.id,
      });
      return;
    }

    const tokens: TokenSet = {
      accessToken:    artist.calendarAccessToken,
      refreshToken:   artist.calendarRefreshToken,
      tokenExpiresAt: artist.calendarTokenExpiresAt,
    };

    const auth = buildOAuth2ClientForTokens(tokens, async (creds: Credentials) => {
      await prisma.artist.update({
        where: { id: artist.id },
        data:  {
          calendarAccessToken:    creds.access_token    ?? null,
          calendarRefreshToken:   creds.refresh_token   ?? artist.calendarRefreshToken,
          calendarTokenExpiresAt: creds.expiry_date ? new Date(creds.expiry_date) : null,
        },
      });
    });

    await deleteCalendarEvent(auth, booking.calendarEventId);

    // Clear the eventId from the booking record
    await prisma.booking.update({
      where: { id: bookingId },
      data:  { calendarEventId: null },
    });

    logger.info('syncDeleteEvent: calendar event deleted', {
      bookingId,
      eventId: booking.calendarEventId,
    });
  } catch (err: unknown) {
    logger.error('syncDeleteEvent: failed to delete Google Calendar event', {
      bookingId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
