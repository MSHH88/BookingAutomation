/**
 * Outlook Calendar client — Phase 7.1
 *
 * Implements the Microsoft Graph API OAuth2 flow and calendar event CRUD
 * for Outlook / Exchange calendars. Mirrors the google-calendar.ts design:
 *
 * 1. **getAuthUrl** — generate Microsoft OAuth2 consent URL.
 * 2. **exchangeCodeForTokens** — exchange auth code for access + refresh tokens.
 * 3. **refreshAccessToken** — obtain a new access token from the refresh token.
 * 4. **createOutlookEvent / updateOutlookEvent / deleteOutlookEvent** — CRUD
 *    on the artist's default Outlook calendar via Microsoft Graph.
 *
 * Microsoft Graph endpoint: https://graph.microsoft.com/v1.0
 * OAuth2 endpoints: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/...
 *
 * Required env vars:
 *   MICROSOFT_CLIENT_ID      — Azure app registration client ID
 *   MICROSOFT_CLIENT_SECRET  — Azure app registration client secret
 *   MICROSOFT_REDIRECT_URI   — redirect URI registered in Azure portal
 *   MICROSOFT_TENANT_ID      — tenant ID (default: "common" for multi-tenant)
 */

import { config }  from '../config';
import { logger }  from '../utils/logger';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const SCOPES     = 'Calendars.ReadWrite offline_access';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OutlookTokenSet {
  accessToken:  string | null;
  refreshToken: string | null;
}

export interface OutlookEventInput {
  summary:        string;
  description:    string;
  startAt:        Date;
  endAt:          Date;
  attendeeEmail?: string;
  location?:      string;
}

export interface MicrosoftTokenResponse {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
  token_type:    string;
}

// ─── OAuth2 helpers ───────────────────────────────────────────────────────────

/** Returns the Microsoft OAuth2 consent URL for an artist. */
export function getOutlookAuthUrl(state: string): string {
  const tenantId   = config.MICROSOFT_TENANT_ID || 'common';
  const params = new URLSearchParams({
    client_id:     config.MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri:  config.MICROSOFT_REDIRECT_URI,
    scope:         SCOPES,
    response_mode: 'query',
    state,
    prompt:        'consent',   // always request refresh_token
  });

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

/** Exchanges an auth code for access + refresh tokens. */
export async function exchangeCodeForTokens(
  code: string,
): Promise<MicrosoftTokenResponse> {
  const tenantId = config.MICROSOFT_TENANT_ID || 'common';
  const url      = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id:     config.MICROSOFT_CLIENT_ID,
    client_secret: config.MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri:  config.MICROSOFT_REDIRECT_URI,
    grant_type:    'authorization_code',
    scope:         SCOPES,
  });

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[OutlookCalendar] Token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<MicrosoftTokenResponse>;
}

/** Refreshes an access token using a stored refresh token. */
export async function refreshOutlookToken(
  refreshToken: string,
): Promise<MicrosoftTokenResponse> {
  const tenantId = config.MICROSOFT_TENANT_ID || 'common';
  const url      = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id:     config.MICROSOFT_CLIENT_ID,
    client_secret: config.MICROSOFT_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
    scope:         SCOPES,
  });

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[OutlookCalendar] Token refresh failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<MicrosoftTokenResponse>;
}

// ─── Graph API helpers ────────────────────────────────────────────────────────

async function graphRequest<T>(
  method:      'GET' | 'POST' | 'PATCH' | 'DELETE',
  path:        string,
  accessToken: string,
  body?:       unknown,
): Promise<T | null> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (method === 'DELETE') return null;

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(
      new Error(`[OutlookCalendar] Graph API ${method} ${path} failed (${res.status}): ${text}`),
      { statusCode: res.status },
    );
  }

  if (res.status === 204) return null;

  return res.json() as Promise<T>;
}

// ─── Calendar event CRUD ──────────────────────────────────────────────────────

interface GraphEvent {
  id?: string;
}

/**
 * Creates an Outlook calendar event.
 * @returns The Graph event ID (store in Booking.calendarEventId).
 */
export async function createOutlookEvent(
  tokens: OutlookTokenSet,
  event:  OutlookEventInput,
): Promise<string> {
  const accessToken = await resolveAccessToken(tokens);

  const body = buildGraphEvent(event);

  const result = await graphRequest<GraphEvent>('POST', '/me/events', accessToken, body);
  const eventId = result?.id;

  if (!eventId) {
    throw new Error('[OutlookCalendar] Event created but no ID returned');
  }

  logger.info('Outlook Calendar event created', { eventId });
  return eventId;
}

/** Updates an existing Outlook calendar event. */
export async function updateOutlookEvent(
  tokens:  OutlookTokenSet,
  eventId: string,
  event:   OutlookEventInput,
): Promise<void> {
  const accessToken = await resolveAccessToken(tokens);
  const body        = buildGraphEvent(event);

  await graphRequest<void>('PATCH', `/me/events/${eventId}`, accessToken, body);
  logger.info('Outlook Calendar event updated', { eventId });
}

/** Deletes an Outlook calendar event. Swallows 404 errors. */
export async function deleteOutlookEvent(
  tokens:  OutlookTokenSet,
  eventId: string,
): Promise<void> {
  const accessToken = await resolveAccessToken(tokens);

  try {
    const res = await fetch(`${GRAPH_BASE}/me/events/${eventId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 404 || res.status === 410) {
      logger.warn('Outlook Calendar event not found during delete (already removed)', { eventId });
      return;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[OutlookCalendar] DELETE /me/events/${eventId} failed (${res.status}): ${text}`);
    }

    logger.info('Outlook Calendar event deleted', { eventId });
  } catch (err) {
    throw err;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Build Microsoft Graph event body from our internal event input. */
function buildGraphEvent(event: OutlookEventInput): object {
  return {
    subject: event.summary,
    body: {
      contentType: 'text',
      content:     event.description,
    },
    start: {
      dateTime: event.startAt.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: event.endAt.toISOString(),
      timeZone: 'UTC',
    },
    ...(event.location ? { location: { displayName: event.location } } : {}),
    ...(event.attendeeEmail
      ? {
          attendees: [{
            emailAddress: { address: event.attendeeEmail },
            type:         'optional',
          }],
        }
      : {}),
    isReminderOn: true,
    reminderMinutesBeforeStart: 60,
  };
}

/**
 * Resolves a valid access token.
 * For Phase 7, we rely on the service layer to have already refreshed the token
 * when needed. This function just ensures the token is not null.
 */
async function resolveAccessToken(tokens: OutlookTokenSet): Promise<string> {
  if (!tokens.accessToken) {
    throw new Error('[OutlookCalendar] No access token available');
  }
  return tokens.accessToken;
}
