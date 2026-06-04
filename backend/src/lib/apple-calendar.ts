/**
 * Apple iCloud Calendar client — Phase 7.2
 *
 * Uses the CalDAV protocol (RFC 4791) via the `tsdav` library to create,
 * update, and delete events on an artist's iCloud calendar.
 *
 * Apple iCloud CalDAV server: https://caldav.icloud.com
 *
 * Authentication:
 *   - AppleID (username) + app-specific password (token).
 *   - The artist provides their iCloud email and an app-specific password
 *     generated at https://appleid.apple.com/account/manage.
 *   - We store { appleCalDAVUrl, appleCalDAVToken } on the Artist model.
 *
 * Event format: iCalendar (.ics) strings built inline.
 *
 * Design mirrors google-calendar.ts:
 *   createAppleEvent / updateAppleEvent / deleteAppleEvent
 *   each accept a credentials object so they are easily mockable in tests.
 */

import { DAVClient }  from 'tsdav';
import { logger }     from '../utils/logger';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default iCloud CalDAV server root */
export const ICLOUD_CALDAV_URL = 'https://caldav.icloud.com';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppleCredentials {
  /** The artist's iCloud email address */
  username: string;
  /** App-specific password generated at appleid.apple.com */
  password: string;
  /** CalDAV calendar URL (discovered on first connect, stored on Artist) */
  calendarUrl?: string;
}

export interface AppleEventInput {
  uid:         string;   // unique identifier — store as booking.calendarEventId with "apple:" prefix
  summary:     string;
  description: string;
  startAt:     Date;
  endAt:       Date;
  attendeeEmail?: string;
  location?:   string;
}

// ─── ICS builder ─────────────────────────────────────────────────────────────

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildICS(event: AppleEventInput): string {
  const now = formatICSDate(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookingAutomation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${now}Z`,
    `DTSTART:${formatICSDate(event.startAt)}Z`,
    `DTEND:${formatICSDate(event.endAt)}Z`,
    `SUMMARY:${event.summary}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${event.location}`);
  }
  if (event.attendeeEmail) {
    lines.push(`ATTENDEE;ROLE=OPT-PARTICIPANT:mailto:${event.attendeeEmail}`);
  }

  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );

  return lines.join('\r\n');
}

// ─── DAVClient factory ────────────────────────────────────────────────────────

/**
 * Creates a tsdav DAVClient for the given iCloud credentials.
 * Exported for mocking in tests.
 */
export async function createDAVClient(creds: AppleCredentials): Promise<DAVClient> {
  const client = new DAVClient({
    serverUrl:    ICLOUD_CALDAV_URL,
    credentials:  {
      username: creds.username,
      password: creds.password,
    },
    authMethod:   'Basic',
    defaultAccountType: 'caldav',
  });

  await client.login();
  return client;
}

/** Discovers the primary calendar URL for an iCloud account. */
export async function discoverCalendarUrl(creds: AppleCredentials): Promise<string> {
  const client    = await createDAVClient(creds);
  const calendars = await client.fetchCalendars();

  const primary = calendars.find((c) => c.url) ?? calendars[0];
  if (!primary?.url) {
    throw new Error('[AppleCalendar] No calendars found for this iCloud account');
  }

  return primary.url;
}

// ─── Calendar event CRUD ──────────────────────────────────────────────────────

/**
 * Creates an iCloud calendar event.
 * @returns The UID used (same as event.uid).
 */
export async function createAppleEvent(
  creds: AppleCredentials,
  event: AppleEventInput,
): Promise<string> {
  const client      = await createDAVClient(creds);
  const calendarUrl = creds.calendarUrl ?? await discoverCalendarUrl(creds);
  const icsString   = buildICS(event);
  const filename    = `${event.uid}.ics`;

  const calendars = await client.fetchCalendars();
  const calendar  = calendars.find((c) => c.url === calendarUrl) ?? calendars[0];

  if (!calendar) {
    throw new Error('[AppleCalendar] Target calendar not found');
  }

  await client.createCalendarObject({
    calendar,
    iCalString: icsString,
    filename,
  });

  logger.info('Apple Calendar event created', { uid: event.uid });
  return event.uid;
}

/**
 * Updates an existing iCloud calendar event by UID.
 */
export async function updateAppleEvent(
  creds: AppleCredentials,
  event: AppleEventInput,
): Promise<void> {
  const client      = await createDAVClient(creds);
  const calendarUrl = creds.calendarUrl ?? await discoverCalendarUrl(creds);
  const icsString   = buildICS(event);

  const calendars = await client.fetchCalendars();
  const calendar  = calendars.find((c) => c.url === calendarUrl) ?? calendars[0];

  if (!calendar) {
    throw new Error('[AppleCalendar] Target calendar not found');
  }

  // Fetch existing objects to find the one with matching UID
  const objects = await client.fetchCalendarObjects({ calendar });
  const existing = objects.find((o) => o.url?.includes(event.uid));

  if (!existing) {
    // Fallback: create if not found
    logger.warn('[AppleCalendar] Event not found for update, creating instead', { uid: event.uid });
    await createAppleEvent(creds, event);
    return;
  }

  await client.updateCalendarObject({
    calendarObject: {
      ...existing,
      data: icsString,
    },
  });

  logger.info('Apple Calendar event updated', { uid: event.uid });
}

/**
 * Deletes an iCloud calendar event by UID.
 * Swallows not-found errors.
 */
export async function deleteAppleEvent(
  creds: AppleCredentials,
  uid:   string,
): Promise<void> {
  try {
    const client      = await createDAVClient(creds);
    const calendarUrl = creds.calendarUrl ?? await discoverCalendarUrl(creds);

    const calendars = await client.fetchCalendars();
    const calendar  = calendars.find((c) => c.url === calendarUrl) ?? calendars[0];

    if (!calendar) return;

    const objects = await client.fetchCalendarObjects({ calendar });
    const target  = objects.find((o) => o.url?.includes(uid));

    if (!target) {
      logger.warn('[AppleCalendar] Event not found during delete (already removed)', { uid });
      return;
    }

    await client.deleteCalendarObject({ calendarObject: target });
    logger.info('Apple Calendar event deleted', { uid });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 410) {
      logger.warn('[AppleCalendar] Event not found during delete', { uid });
      return;
    }
    throw err;
  }
}
