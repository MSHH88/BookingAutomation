/**
 * Google Calendar client — Step 1.28
 *
 * Provides a thin, test-friendly wrapper around the Google Calendar v3 API
 * and the OAuth2 flow needed to obtain artist credentials.
 *
 * Design decisions:
 *
 * 1. **Lazy singleton** (`getOAuth2BaseClient`)
 *    The base OAuth2 client is created once on first call so unit tests can
 *    mock `../../lib/google-calendar` before any module imports it.  The
 *    `_resetOAuth2BaseClient()` helper wipes the singleton between tests.
 *
 * 2. **Per-request OAuth2 client** (`buildOAuth2ClientForTokens`)
 *    Each service call that acts on behalf of an artist builds a fresh
 *    OAuth2 client pre-loaded with that artist's stored tokens.  The client
 *    automatically refreshes the access token when it expires; the refreshed
 *    tokens are surfaced via the `tokens` event so callers can persist the
 *    new access token back to the DB.
 *
 * 3. **Pure helper functions** (createEvent / updateEvent / deleteEvent)
 *    These accept an already-configured `OAuth2Client` so they are trivially
 *    mockable in unit tests and avoid coupling to `process.env` at call time.
 *
 * 4. **Fire-and-forget safety**
 *    Callers (`bookings.service.ts`) wrap these in `void` and catch errors
 *    internally so a calendar API failure never causes an HTTP 5xx response
 *    to the end user.
 *
 * Industry references:
 *   Acuity Scheduling, Fresha, and Booksy all use the Google Calendar API to
 *   two-way sync appointments, giving artists/practitioners a single view of
 *   their schedule without manual copy-paste.
 */
import { OAuth2Client, Credentials } from 'google-auth-library';
import { calendar, calendar_v3 }    from '@googleapis/calendar';

import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenSet {
  accessToken:        string | null;
  refreshToken:       string | null;
  tokenExpiresAt:     Date   | null;
}

export interface CalendarEventInput {
  summary:     string;          // Event title, e.g. "Jane Smith — Tattoo Session"
  description: string;          // Booking notes / service details
  startAt:     Date;
  endAt:       Date;
  attendeeEmail?: string;       // Customer / lead email (optional)
  location?:   string;          // Studio address (from StudioSettings)
}

// ─── Base OAuth2 client singleton ────────────────────────────────────────────

let _baseClient: OAuth2Client | null = null;

/**
 * Returns the base OAuth2 client (no tokens loaded).
 * Used only to generate the consent URL or exchange an auth code for tokens.
 */
export function getOAuth2BaseClient(): OAuth2Client {
  if (_baseClient) return _baseClient;

  const clientId     = process.env['GOOGLE_CLIENT_ID']     ?? '';
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'] ?? '';
  const redirectUri  = process.env['GOOGLE_REDIRECT_URI']  ?? '';

  _baseClient = new OAuth2Client(clientId, clientSecret, redirectUri);
  return _baseClient;
}

/** Wipes the singleton — call in `beforeEach` to isolate tests. */
export function _resetOAuth2BaseClient(): void {
  _baseClient = null;
}

// ─── Per-artist OAuth2 client ─────────────────────────────────────────────────

/**
 * Builds a fresh OAuth2Client pre-loaded with the artist's stored token set.
 *
 * The returned client will:
 *  - Automatically refresh the access token when it expires.
 *  - Fire the `tokens` event with the new `Credentials` so the caller can
 *    persist the refreshed access token (and, on first refresh, a new
 *    refresh token) back to the DB.
 *
 * @param tokens    Artist's stored token set
 * @param onRefresh Optional callback — called with the new Credentials
 *                  whenever Google issues a fresh access token.
 */
export function buildOAuth2ClientForTokens(
  tokens:    TokenSet,
  onRefresh?: (creds: Credentials) => void,
): OAuth2Client {
  const clientId     = process.env['GOOGLE_CLIENT_ID']     ?? '';
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'] ?? '';
  const redirectUri  = process.env['GOOGLE_REDIRECT_URI']  ?? '';

  const client = new OAuth2Client(clientId, clientSecret, redirectUri);

  client.setCredentials({
    access_token:  tokens.accessToken  ?? undefined,
    refresh_token: tokens.refreshToken ?? undefined,
    expiry_date:   tokens.tokenExpiresAt ? tokens.tokenExpiresAt.getTime() : undefined,
  });

  if (onRefresh) {
    client.on('tokens', (creds: Credentials) => {
      onRefresh(creds);
    });
  }

  return client;
}

// ─── Calendar event CRUD ──────────────────────────────────────────────────────

/**
 * Creates a Google Calendar event on the artist's primary calendar.
 *
 * @returns The Google event ID (store in Booking.calendarEventId).
 */
export async function createCalendarEvent(
  auth:  OAuth2Client,
  event: CalendarEventInput,
): Promise<string> {
  const cal = calendar({ version: 'v3', auth });

  const resource: calendar_v3.Schema$Event = {
    summary:     event.summary,
    description: event.description,
    start: { dateTime: event.startAt.toISOString(), timeZone: 'UTC' },
    end:   { dateTime: event.endAt.toISOString(),   timeZone: 'UTC' },
    ...(event.location ? { location: event.location } : {}),
    ...(event.attendeeEmail
      ? { attendees: [{ email: event.attendeeEmail }] }
      : {}),
    reminders: {
      useDefault: false,
      overrides:  [{ method: 'popup', minutes: 60 }],
    },
  };

  const res = await cal.events.insert({
    calendarId: 'primary',
    sendNotifications: false, // Booking system sends its own emails
    requestBody: resource,
  });

  const eventId = res.data.id;
  if (!eventId) {
    throw new Error('[GoogleCalendar] Event created but no ID returned');
  }

  logger.info('Google Calendar event created', { eventId });
  return eventId;
}

/**
 * Updates an existing Google Calendar event (title, times, attendees).
 */
export async function updateCalendarEvent(
  auth:    OAuth2Client,
  eventId: string,
  event:   CalendarEventInput,
): Promise<void> {
  const cal = calendar({ version: 'v3', auth });

  const resource: calendar_v3.Schema$Event = {
    summary:     event.summary,
    description: event.description,
    start: { dateTime: event.startAt.toISOString(), timeZone: 'UTC' },
    end:   { dateTime: event.endAt.toISOString(),   timeZone: 'UTC' },
    ...(event.location ? { location: event.location } : {}),
    ...(event.attendeeEmail
      ? { attendees: [{ email: event.attendeeEmail }] }
      : {}),
  };

  await cal.events.update({
    calendarId: 'primary',
    eventId,
    sendNotifications: false,
    requestBody: resource,
  });

  logger.info('Google Calendar event updated', { eventId });
}

/**
 * Deletes a Google Calendar event.
 * Swallows 404 errors (event already removed) so this is safe to call
 * even when the event may have been manually deleted by the artist.
 */
export async function deleteCalendarEvent(
  auth:    OAuth2Client,
  eventId: string,
): Promise<void> {
  const cal = calendar({ version: 'v3', auth });

  try {
    await cal.events.delete({
      calendarId: 'primary',
      eventId,
      sendNotifications: false,
    });
    logger.info('Google Calendar event deleted', { eventId });
  } catch (err: unknown) {
    // 404 = event was already deleted manually; not an error
    const status = (err as { code?: number }).code;
    if (status === 404 || status === 410) {
      logger.warn('Google Calendar event not found during delete (already removed)', { eventId });
      return;
    }
    throw err;
  }
}
