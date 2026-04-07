/**
 * Waitlist service — Step 1.16
 *
 * Manages the `WaitlistEntry` Prisma model.  When a desired booking slot is
 * unavailable, customers register interest via the public join endpoint.
 * Admins manage the queue, trigger slot-available email notifications, and
 * advance entries through the status lifecycle.
 *
 * ── Status lifecycle ──────────────────────────────────────────────────────────
 *   WAITING   — newly joined; awaiting slot availability
 *   NOTIFIED  — admin triggered a slot-available email; expiresAt is set
 *   BOOKED    — customer responded and made a booking  (terminal)
 *   EXPIRED   — customer did not respond before expiresAt (re-activatable)
 *   CANCELLED — admin or customer removed the entry     (terminal)
 *
 * ── Deduplication ─────────────────────────────────────────────────────────────
 *   A second join for the same email + artistId combination is rejected with
 *   409 WAITLIST_DUPLICATE when an active (WAITING or NOTIFIED) entry already
 *   exists.  Different artistId (or no artistId) creates a new entry.
 *
 * ── Email notifications ────────────────────────────────────────────────────────
 *   `notifyWaitlistEntry` calls sendEmail('waitlist-slot-available', ...).
 *   The DB state (notifiedAt, expiresAt, status = NOTIFIED) is persisted
 *   BEFORE the email is sent — if the send fails, the record is still updated
 *   and the error is logged as a warning so the admin can retry.
 *
 * Industry reference:
 *   Fresha, Booksy, and Mindbody maintain a first-in-first-notified queue.
 *   When a cancellation opens a slot, the system notifies the next WAITING
 *   entry with a configurable expiry window (typically 24–72 h).
 */
import { Prisma, WaitlistStatus } from '@prisma/client';

import { prisma }                    from '../../lib/prisma';
import { AppError }                  from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }                    from '../../utils/logger';
import { sendEmail }                 from '../notifications/notifications.service';
import type {
  JoinWaitlistBody,
  ListWaitlistQuery,
  UpdateWaitlistStatusBody,
  NotifyWaitlistEntryBody,
} from './waitlist.schema';
import { VALID_WAITLIST_TRANSITIONS } from './waitlist.schema';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Full detail shape — returned by all admin mutation endpoints and GET /:id.
 */
const waitlistDetailSelect = {
  id:            true,
  name:          true,
  email:         true,
  phone:         true,
  artistId:      true,
  serviceId:     true,
  bookingId:     true,
  requestedDate: true,
  notes:         true,
  status:        true,
  notifiedAt:    true,
  expiresAt:     true,
  createdAt:     true,
  updatedAt:     true,
} satisfies Prisma.WaitlistEntrySelect;

/**
 * Slim list shape — returned by GET /api/waitlist.
 * Omits notes and bookingId to keep list payloads compact.
 */
const waitlistListSelect = {
  id:            true,
  name:          true,
  email:         true,
  phone:         true,
  artistId:      true,
  serviceId:     true,
  requestedDate: true,
  status:        true,
  notifiedAt:    true,
  expiresAt:     true,
  createdAt:     true,
} satisfies Prisma.WaitlistEntrySelect;

// ─── Inferred return types ────────────────────────────────────────────────────

export type WaitlistDetail   = Prisma.WaitlistEntryGetPayload<{ select: typeof waitlistDetailSelect }>;
export type WaitlistListItem = Prisma.WaitlistEntryGetPayload<{ select: typeof waitlistListSelect }>;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add a customer to the waitlist (PUBLIC endpoint — no authentication required).
 *
 * Deduplication:
 *   Rejects 409 WAITLIST_DUPLICATE if the same email already has a WAITING or
 *   NOTIFIED entry for the same artistId (or no artist if none is provided).
 *
 * @param body      - Validated join body
 * @param ipAddress - Caller IP from req.ip, logged for abuse-pattern detection
 */
export async function joinWaitlist(
  body:       JoinWaitlistBody,
  ipAddress?: string,
): Promise<WaitlistDetail> {
  // ── Deduplication check ───────────────────────────────────────────────────
  const duplicate = await prisma.waitlistEntry.findFirst({
    where: {
      email:    body.email,
      artistId: body.artistId ?? null,
      status:   { in: ['WAITING', 'NOTIFIED'] },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new AppError(
      409,
      'WAITLIST_DUPLICATE',
      'This email is already on the waitlist for this artist',
    );
  }

  const entry = await prisma.waitlistEntry.create({
    data: {
      name:          body.name,
      email:         body.email,
      phone:         body.phone,
      artistId:      body.artistId,
      serviceId:     body.serviceId,
      requestedDate: body.requestedDate ? new Date(body.requestedDate) : undefined,
      notes:         body.notes,
    },
    select: waitlistDetailSelect,
  });

  logger.info('Waitlist entry created', {
    entryId:   entry.id,
    email:     entry.email,
    artistId:  entry.artistId,
    ipAddress: ipAddress ?? 'unknown',
  });

  return entry;
}

/**
 * Paginated list of all waitlist entries (ADMIN only).
 *
 * Supports optional filters: status, artistId, email.
 * Ordered newest-first so recently joined entries appear at the top.
 */
export async function listWaitlist(
  query: ListWaitlistQuery,
): Promise<PaginatedResult<WaitlistListItem>> {
  const where: Prisma.WaitlistEntryWhereInput = {};

  if (query.status)   where.status   = query.status as WaitlistStatus;
  if (query.artistId) where.artistId = query.artistId;
  if (query.email)    where.email    = query.email;

  return paginate<WaitlistListItem>(
    prisma.waitlistEntry,
    { where, select: waitlistListSelect, orderBy: { createdAt: 'desc' } },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Fetch a single waitlist entry by its database ID (ADMIN only).
 *
 * Throws 404 when the entry does not exist.
 */
export async function getWaitlistEntryById(id: string): Promise<WaitlistDetail> {
  const entry = await prisma.waitlistEntry.findUnique({
    where:  { id },
    select: waitlistDetailSelect,
  });

  if (!entry) {
    throw new AppError(404, 'WAITLIST_ENTRY_NOT_FOUND', `Waitlist entry '${id}' not found`);
  }

  return entry;
}

/**
 * Manually update the status of a waitlist entry (ADMIN only).
 *
 * Valid transitions are enforced by VALID_WAITLIST_TRANSITIONS.
 * Throws 409 WAITLIST_INVALID_TRANSITION when the transition is not permitted
 * from the current status.
 *
 * Use this endpoint to:
 *   - Mark an entry as BOOKED when the customer books by phone/walk-in
 *   - Cancel an entry on customer request
 *   - Manually expire or re-activate an entry
 */
export async function updateWaitlistStatus(
  id:   string,
  body: UpdateWaitlistStatusBody,
): Promise<WaitlistDetail> {
  const existing = await prisma.waitlistEntry.findUnique({
    where:  { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new AppError(404, 'WAITLIST_ENTRY_NOT_FOUND', `Waitlist entry '${id}' not found`);
  }

  const allowed = VALID_WAITLIST_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(body.status)) {
    throw new AppError(
      409,
      'WAITLIST_INVALID_TRANSITION',
      `Cannot transition from ${existing.status} to ${body.status}`,
    );
  }

  const updated = await prisma.waitlistEntry.update({
    where:  { id },
    data:   { status: body.status as WaitlistStatus },
    select: waitlistDetailSelect,
  });

  logger.info('Waitlist status updated', {
    entryId: id,
    from:    existing.status,
    to:      body.status,
  });

  return updated;
}

/**
 * Send a slot-available notification email to a waitlisted customer (ADMIN only).
 *
 * Steps:
 *   1. Load entry — must be WAITING or NOTIFIED (other statuses throw 409)
 *   2. Persist the notification state: status = NOTIFIED, notifiedAt = now(),
 *      expiresAt = now() + expiresInHours
 *   3. Best-effort email send via sendEmail('waitlist-slot-available')
 *      If the template is missing or inactive, the DB update is kept and
 *      the error is logged as a warning — the admin can resend later.
 *
 * @param id   - Waitlist entry database ID
 * @param body - { expiresInHours, customMessage? }
 */
export async function notifyWaitlistEntry(
  id:   string,
  body: NotifyWaitlistEntryBody,
): Promise<WaitlistDetail> {
  const entry = await prisma.waitlistEntry.findUnique({
    where:  { id },
    select: waitlistDetailSelect,
  });

  if (!entry) {
    throw new AppError(404, 'WAITLIST_ENTRY_NOT_FOUND', `Waitlist entry '${id}' not found`);
  }

  const notifiableStatuses: WaitlistStatus[] = ['WAITING', 'NOTIFIED'];
  if (!notifiableStatuses.includes(entry.status)) {
    throw new AppError(
      409,
      'WAITLIST_CANNOT_NOTIFY',
      `Waitlist entry has status '${entry.status}' — can only notify WAITING or NOTIFIED entries`,
    );
  }

  const now       = new Date();
  const expiresAt = new Date(now.getTime() + body.expiresInHours * 60 * 60 * 1000);

  // ── Persist FIRST so the notification record is never lost ───────────────
  const updated = await prisma.waitlistEntry.update({
    where:  { id },
    data:   {
      status:     'NOTIFIED' as WaitlistStatus,
      notifiedAt: now,
      expiresAt,
    },
    select: waitlistDetailSelect,
  });

  logger.info('Waitlist entry notified', {
    entryId:        id,
    email:          entry.email,
    expiresAt:      expiresAt.toISOString(),
    expiresInHours: body.expiresInHours,
  });

  // ── Best-effort email dispatch ────────────────────────────────────────────
  try {
    await sendEmail('waitlist-slot-available', entry.email, {
      customerName:   entry.name,
      artistId:       entry.artistId   ?? '',
      serviceId:      entry.serviceId  ?? '',
      requestedDate:  entry.requestedDate
        ? entry.requestedDate.toISOString().slice(0, 10)
        : '',
      expiresInHours: String(body.expiresInHours),
      customMessage:  body.customMessage ?? '',
    });
  } catch (emailError) {
    // Best-effort: DB state is already updated. Log and continue.
    logger.warn('Waitlist notification email failed to send', {
      entryId: id,
      email:   entry.email,
      error:   emailError instanceof Error ? emailError.message : String(emailError),
    });
  }

  return updated;
}

/**
 * Hard-delete a waitlist entry (ADMIN only).
 *
 * Unlike email templates, waitlist entries are hard-deleted — there is no
 * audit-trail requirement for declined or cancelled waitlist interest.
 *
 * Throws 404 when the entry does not exist.
 */
export async function deleteWaitlistEntry(id: string): Promise<{ id: string }> {
  const existing = await prisma.waitlistEntry.findUnique({
    where:  { id },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(404, 'WAITLIST_ENTRY_NOT_FOUND', `Waitlist entry '${id}' not found`);
  }

  await prisma.waitlistEntry.delete({ where: { id } });

  logger.info('Waitlist entry deleted', { entryId: id });

  return { id };
}
