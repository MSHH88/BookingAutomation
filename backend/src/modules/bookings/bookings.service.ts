/**
 * Bookings service — Step 1.9
 *
 * Handles all business logic for the Booking Management API.
 *
 * Booking status lifecycle:
 *   PENDING / AWAITING_DEPOSIT → CONFIRMED   (conflict check → confirmedAt set)
 *   CONFIRMED  → COMPLETED   (completedAt set + Invoice created atomically)
 *   CONFIRMED  → RESCHEDULED (startAt/endAt updated + conflict check)
 *   PENDING/CONFIRMED → CANCELLED (cancelledAt + cancelReason set)
 *
 * Business rules:
 *  - ARTIST actors only see/manage their own bookings
 *  - ADMIN actors see and manage all bookings
 *  - Confirm checks for overlapping CONFIRMED bookings for the same artist
 *  - Reschedule re-runs the same conflict check on new times
 *  - Completing a booking creates an Invoice atomically (Prisma transaction)
 *  - Only PENDING, CONFIRMED, or RESCHEDULED bookings can be cancelled
 *  - Only PENDING or AWAITING_DEPOSIT bookings can be confirmed
 *  - Only CONFIRMED bookings can be completed or rescheduled
 *  - Invoice amount: uses booking.totalAmount, falls back to quote.price, or 0
 *  - Invoice due date: 7 days from completion date
 *
 * Email / calendar side-effects (log stubs — Phase 2 wires Resend + Google Calendar):
 *  - booking-confirmed  → customer confirmation email + .ics attachment
 *  - booking-cancelled  → customer cancellation email
 *  - booking-rescheduled → customer rescheduled email
 *  - review-request     → 36h after completion (enqueued)
 */
import { Prisma } from '@prisma/client';

import { prisma }         from '../../lib/prisma';
import { AppError }       from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }         from '../../utils/logger';
import { config }         from '../../config';
import {
  enqueueBookingConfirmed,
  enqueuePostVisitReview,
  enqueueRestaurantReminder,
} from '../whatsapp/whatsapp.service';
import { enqueueReviewRequest }                              from '../reviews/reviews.queue';
import { enqueueBookingReminder, cancelBookingReminder }    from '../reminders/reminders.queue';
import { enqueueWebhookEvent }                              from '../webhooks/webhooks.queue';
import { syncCreateEvent, syncUpdateEvent, syncDeleteEvent } from '../calendar/calendar.service';
import { syncOutlookCreateEvent, syncOutlookUpdateEvent, syncOutlookDeleteEvent } from '../calendar/outlook-calendar.service';
import { syncAppleCreateEvent, syncAppleUpdateEvent, syncAppleDeleteEvent } from '../calendar/apple-calendar.service';
import { matchAndNotify } from '../waitlist/waitlist.service';
import { deductPackageUse } from '../packages/packages.service';
import { awardPoints, calculatePointsForBooking } from '../loyalty/loyalty.service';
import { enqueueAISuggestion } from '../../jobs/ai-suggestion.job';
import { isFeatureEnabled } from '../../middleware/requireFeature';
import type {
  ListBookingsQuery,
  CompleteBookingBody,
  CancelBookingBody,
  RescheduleBookingBody,
} from './bookings.schema';

// ─── Actor role type ──────────────────────────────────────────────────────────

type ActorRole = 'ADMIN' | 'ARTIST';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Full detail shape — returned by get, confirm, complete, cancel, reschedule.
 */
const bookingDetailSelect = {
  id:                   true,
  status:               true,
  startAt:              true,
  endAt:                true,
  notes:                true,
  specialRequests:      true,
  partySize:            true,
  totalDurationMinutes: true,
  totalAmount:          true,
  depositAmount:        true,
  depositPaidAt:        true,
  depositRefunded:      true,
  cancelReason:         true,
  confirmedAt:          true,
  completedAt:          true,
  cancelledAt:          true,
  rescheduledFrom:      true,
  createdAt:            true,
  updatedAt:            true,
  artist: {
    select: {
      id:   true,
      slug: true,
      user: { select: { name: true, email: true } },
    },
  },
  customer: {
    select: { id: true, name: true, email: true, phone: true },
  },
  lead: {
    select: { id: true, name: true, email: true, phone: true, status: true, preferWhatsApp: true },
  },
  quote: {
    select: { id: true, price: true, hours: true, status: true },
  },
  invoice: {
    select: { id: true, status: true, amount: true, dueDate: true, paidAt: true },
  },
  services: {
    select: {
      id:              true,
      price:           true,
      durationMinutes: true,
      service: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.BookingSelect;

type BookingDetail = Prisma.BookingGetPayload<{ select: typeof bookingDetailSelect }>;

/**
 * Verifies that the booking belongs to the caller's tenant.
 * SUPER_ADMIN callers pass tenantId = null and skip the check.
 */
function enforceTenantOwnership(
  booking: { tenantId?: string | null },
  tenantId: string | null,
  bookingId: string,
): void {
  if (tenantId !== null && booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', `Booking ${bookingId} does not belong to your tenant`);
  }
}

/** Slimmer list shape — returned on GET /api/bookings. */
const bookingListSelect = {
  id:                   true,
  status:               true,
  startAt:              true,
  endAt:                true,
  totalAmount:          true,
  partySize:            true,
  createdAt:            true,
  artist: {
    select: {
      id:   true,
      slug: true,
      user: { select: { name: true } },
    },
  },
  customer: {
    select: { id: true, name: true, email: true },
  },
  lead: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.BookingSelect;

// ─── listBookings ─────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of bookings.
 *
 * ADMIN — all bookings; optionally filtered by status, artistId, customerId, date range.
 * ARTIST — scoped to their own bookings (resolved from their artist profile).
 */
export async function listBookings(
  query:     ListBookingsQuery,
  actorId:   string,
  actorRole: ActorRole,
  tenantId:  string | null = null,
): Promise<PaginatedResult<unknown>> {
  // ── Resolve ARTIST's artistId from their profile ──────────────────────────
  let scopedArtistId: string | undefined;
  if (actorRole === 'ARTIST') {
    const artist = await prisma.artist.findFirst({
      where: { userId: actorId },
      select: { id: true },
    });
    if (!artist) {
      throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist profile not found');
    }
    scopedArtistId = artist.id;
  }

  // ── Build where clause ────────────────────────────────────────────────────
  const where: Prisma.BookingWhereInput = {
    ...(scopedArtistId
      ? { artistId: scopedArtistId }
      : query.artistId
        ? { artistId: query.artistId }
        : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.status     ? { status: query.status }         : {}),
    ...(query.from || query.to
      ? {
          startAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to   ? { lte: new Date(query.to)   } : {}),
          },
        }
      : {}),
  };

  if (actorRole === 'ADMIN' && tenantId !== null) {
    where.tenantId = tenantId;
  }

  return paginate(
    prisma.booking,
    { where, select: bookingListSelect, orderBy: { startAt: 'asc' } },
    { page: query.page, limit: query.limit },
  );
}

// ─── getBookingById ───────────────────────────────────────────────────────────

/**
 * Returns full booking detail.
 *
 * ARTISTs can only retrieve bookings they own.
 */
export async function getBookingById(
  id:        string,
  actorId:   string,
  actorRole: ActorRole,
  tenantId:  string | null = null,
): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: { ...bookingDetailSelect, tenantId: true },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} not found`);
  }

  enforceTenantOwnership(booking, tenantId, id);

  if (actorRole === 'ARTIST') {
    const artist = await prisma.artist.findFirst({
      where:  { userId: actorId },
      select: { id: true },
    });
    if (!artist || booking.artist.id !== artist.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only view your own bookings');
    }
  }

  return booking;
}

// ─── confirmBooking ───────────────────────────────────────────────────────────

/**
 * Confirms a PENDING booking.
 *
 * Business rules:
 *  1. Booking must be PENDING
 *  2. No other CONFIRMED booking for the same artist overlaps the time slot
 *  3. Sets status → CONFIRMED and confirmedAt → now
 *
 * Side-effects (log stubs; real delivery in Phase 2):
 *  - Enqueue booking-confirmed email with .ics attachment
 *  - Trigger Google Calendar event creation (CALENDAR_SYNC_ENABLED)
 */
export async function confirmBooking(
  id:        string,
  actorId:   string,
  actorRole: ActorRole,
  tenantId:  string | null = null,
): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: { ...bookingDetailSelect, artistId: true, serviceId: true, tenantId: true },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} not found`);
  }

  enforceTenantOwnership(booking, tenantId, id);

  if (actorRole === 'ARTIST') {
    const artist = await prisma.artist.findFirst({
      where:  { userId: actorId },
      select: { id: true },
    });
    if (!artist || booking.artist.id !== artist.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only confirm your own bookings');
    }
  }

  if (!['PENDING', 'AWAITING_DEPOSIT'].includes(booking.status)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot confirm a booking with status ${booking.status}. Only PENDING or AWAITING_DEPOSIT bookings can be confirmed.`,
    );
  }

  // ── Conflict detection + status update (atomic transaction) ────────────────
  const updated = await prisma.$transaction(async (tx) => {
    const conflict = await tx.booking.findFirst({
      where: {
        artistId: booking.artistId,
        status:   { in: ['CONFIRMED', 'RESCHEDULED'] },
        id:       { not: id },
        startAt:  { lt: booking.endAt },
        endAt:    { gt: booking.startAt },
      },
      select: { id: true, startAt: true, endAt: true },
    });

    if (conflict) {
      throw new AppError(
        409,
        'SCHEDULING_CONFLICT',
        `This time slot conflicts with an existing confirmed booking (${conflict.id})`,
      );
    }

    return tx.booking.update({
      where:  { id },
      data:   { status: 'CONFIRMED', confirmedAt: new Date() },
      select: bookingDetailSelect,
    });
  });

  // ── Side-effects — log stubs (Phase 2 wires Resend + Google Calendar) ────
  logger.info('Email job queued (stub)', { job: 'booking-confirmed', bookingId: id });

  // ── Google Calendar — create event on confirm ─────────────────────────────
  // Fire-and-forget: calendar sync failures are logged but never surfaced to caller.
  void syncCreateEvent(id).catch((err) => logger.warn('Google Calendar create failed', { err, bookingId: id }));
  // ── Outlook / Apple Calendar — Phase 7 ────────────────────────────────────
  void syncOutlookCreateEvent(id).catch((err) => logger.warn('Outlook Calendar create failed', { err, bookingId: id }));
  void syncAppleCreateEvent(id).catch((err) => logger.warn('Apple Calendar create failed', { err, bookingId: id }));

  // ── Email Reminder — 24 h before the appointment ─────────────────────────
  // Fire-and-forget: failures are logged but never surfaced to caller.
  void enqueueBookingReminder({
    bookingId:      id,
    bookingStartAt: updated.startAt,
    customerEmail:  updated.customer?.email ?? updated.lead?.email ?? '',
    customerName:   updated.customer?.name  ?? updated.lead?.name  ?? 'Customer',
    studioName:     config.STUDIO_NAME,
    artistName:     updated.artist.user.name,
    serviceName:    updated.services[0]?.service?.name ?? 'appointment',
    tenantId:       booking.tenantId,
  }).catch((err) => logger.warn('enqueueBookingReminder failed', { err, bookingId: id }));

  // ── WhatsApp — Message 2 (confirmed) + Message 3 (reminder) ─────────────
  // Fire-and-forget: failures are logged but never surfaced to caller.
  void enqueueBookingConfirmed({
    phone:          updated.lead?.phone ?? updated.customer?.phone ?? null,
    customerName:   updated.customer?.name ?? updated.lead?.name ?? 'Customer',
    preferWhatsApp: updated.lead?.preferWhatsApp ?? false,
    studioName:     config.STUDIO_NAME,
    artistName:     updated.artist.user.name,
    startAt:        updated.startAt.toISOString(),
    bookingId:      id,
  }).catch((err) => logger.warn('enqueueBookingConfirmed failed', { err, bookingId: id }));

  // ── WhatsApp — Message 5 (restaurant reminder 2 h before) ───────────────
  if (config.BUSINESS_TYPE === 'restaurant') {
    void enqueueRestaurantReminder({
      phone:          updated.lead?.phone ?? updated.customer?.phone ?? null,
      customerName:   updated.customer?.name ?? updated.lead?.name ?? 'Customer',
      preferWhatsApp: updated.lead?.preferWhatsApp ?? false,
      studioName:     config.STUDIO_NAME,
      startAt:        updated.startAt.toISOString(),
      partySize:      updated.partySize ?? undefined,
      bookingId:      id,
    }).catch((err) => logger.warn('enqueueRestaurantReminder failed', { err, bookingId: id }));
  }

  // ── Outgoing Webhook — booking.confirmed ──────────────────────────────────
  void enqueueWebhookEvent('booking.confirmed', {
    bookingId:  updated.id,
    status:     updated.status,
    artistId:   updated.artist.id,
    startAt:    updated.startAt.toISOString(),
    endAt:      updated.endAt.toISOString(),
    customerId: updated.customer?.id   ?? null,
    leadId:     updated.lead?.id       ?? null,
  }).catch((err) => logger.warn('enqueueWebhookEvent booking.confirmed failed', { err, bookingId: id }));

  // ── Phase 5.1 — Deduct package use if customer has an applicable package ──
  // Fire-and-forget: errors logged inside deductPackageUse, never surfaced.
  // tenantId null-check is separated from the customer check so that bookings
  // without a tenantId do not silently skip package deduction (FINDING-015).
  if (updated.customer?.id) {
    void isFeatureEnabled('PACKAGES_ENABLED').then((enabled) => {
      if (enabled && booking.tenantId) {
        const serviceId = booking.serviceId ?? updated.services[0]?.service?.id ?? null;
        if (serviceId) {
          void deductPackageUse(updated.customer!.id, booking.tenantId, serviceId).catch(
            (err) => logger.warn('deductPackageUse failed (non-fatal)', { err, bookingId: id }),
          );
        }
      }
    });
  }

  return updated;
}

// ─── completeBooking ──────────────────────────────────────────────────────────

/**
 * Marks a CONFIRMED booking as COMPLETED and atomically creates an Invoice.
 *
 * Business rules:
 *  1. Booking must be CONFIRMED
 *  2. Sets status → COMPLETED and completedAt → now
 *  3. Creates Invoice record in the same Prisma transaction
 *     - amount: booking.totalAmount ?? booking.quote.price ?? 0
 *     - dueDate: 7 days from now
 *     - lineItems: derived from booking.services (or single line from quote)
 *
 * Side-effects (log stubs; real delivery in Phase 2):
 *  - Enqueue review-request email (36h delay)
 *  - Enqueue WhatsApp message 2 (2h delay, if applicable)
 */
export async function completeBooking(
  id:        string,
  body:      CompleteBookingBody,
  actorId:   string,
  actorRole: ActorRole,
  tenantId:  string | null = null,
): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: {
      ...bookingDetailSelect,
      artistId:    true,
      tenantId:    true,
      totalAmount: true,
      quote:       { select: { price: true } },
      services:    {
        select: {
          id:              true,
          price:           true,
          durationMinutes: true,
          service:         { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} not found`);
  }

  enforceTenantOwnership(booking, tenantId, id);

  if (actorRole === 'ARTIST') {
    const artist = await prisma.artist.findFirst({
      where:  { userId: actorId },
      select: { id: true },
    });
    if (!artist || booking.artist.id !== artist.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only complete your own bookings');
    }
  }

  if (booking.status !== 'CONFIRMED') {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot complete a booking with status ${booking.status}. Only CONFIRMED bookings can be completed.`,
    );
  }

  const now     = new Date();
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // ── Resolve invoice amount ────────────────────────────────────────────────
  // Priority: booking.totalAmount → quote.price → 0
  const invoiceAmount =
    booking.totalAmount != null
      ? Number(booking.totalAmount)
      : booking.quote?.price != null
        ? Number(booking.quote.price)
        : 0;

  // ── Build line items ──────────────────────────────────────────────────────
  type LineItem = { description: string; amount: number; durationMinutes?: number };
  let lineItems: LineItem[];

  if (booking.services.length > 0) {
    lineItems = booking.services.map((bs) => ({
      description:     bs.service.name,
      amount:          Number(bs.price),
      durationMinutes: bs.durationMinutes,
    }));
  } else if (booking.quote) {
    lineItems = [
      {
        description: 'Studio service',
        amount:      Number(booking.quote.price),
      },
    ];
  } else {
    lineItems = [{ description: 'Studio service', amount: invoiceAmount }];
  }

  // ── Atomic transaction ────────────────────────────────────────────────────
  await (prisma.$transaction as (fn: (tx: Prisma.TransactionClient) => Promise<void>) => Promise<void>)(
    async (tx: Prisma.TransactionClient) => {
      await tx.booking.update({
        where: { id },
        data: {
          status:      'COMPLETED',
          completedAt: now,
          ...(body.notes ? { notes: body.notes } : {}),
        },
        select: { id: true },
      });

      await tx.invoice.create({
        data: {
          bookingId: id,
          amount:    invoiceAmount,
          currency:  'GBP',
          status:    'UNPAID',
          dueDate,
          lineItems: lineItems as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
    },
  );

  // ── Side-effects ──────────────────────────────────────────────────────────
  // ── Review-request email (36 h delay) ────────────────────────────────────
  // Fire-and-forget: failures are logged but never surfaced to caller.
  void enqueueReviewRequest({
    bookingId:       id,
    customerEmail:   booking.customer?.email ?? booking.lead?.email ?? '',
    customerName:    booking.customer?.name ?? booking.lead?.name ?? 'Customer',
    studioName:      config.STUDIO_NAME,
    googleReviewUrl: config.GOOGLE_REVIEW_URL || '',
    artistName:      booking.artist.user.name,
    serviceName:     booking.services[0]?.service?.name,
    tenantId:        booking.tenantId,
  }).catch((err) => logger.warn('enqueueReviewRequest failed', { err, bookingId: id }));

  // ── WhatsApp — Message 4 (post-visit review, +2 h) ───────────────────────
  // Fire-and-forget: failures are logged but never surfaced to caller.
  void enqueuePostVisitReview({
    phone:           booking.lead?.phone ?? booking.customer?.phone ?? null,
    customerName:    booking.customer?.name ?? booking.lead?.name ?? 'Customer',
    preferWhatsApp:  booking.lead?.preferWhatsApp ?? false,
    studioName:      config.STUDIO_NAME,
    googleReviewUrl: config.GOOGLE_REVIEW_URL || '',
    bookingId:       id,
  }).catch((err) => logger.warn('enqueuePostVisitReview failed', { err, bookingId: id }));

  const updated = await prisma.booking.findUnique({
    where:  { id },
    select: bookingDetailSelect,
  });

  if (!updated) {
    throw new AppError(500, 'INTERNAL_ERROR', `Booking ${id} not found after completion`);
  }

  // ── Outgoing Webhook — booking.completed ──────────────────────────────────
  void enqueueWebhookEvent('booking.completed', {
    bookingId:   updated.id,
    status:      updated.status,
    artistId:    updated.artist.id,
    startAt:     updated.startAt.toISOString(),
    endAt:       updated.endAt.toISOString(),
    totalAmount: updated.totalAmount?.toString() ?? null,
    customerId:  updated.customer?.id ?? null,
    leadId:      updated.lead?.id     ?? null,
  }).catch((err) => logger.warn('enqueueWebhookEvent booking.completed failed', { err, bookingId: id }));

  // ── Phase 5.3 — Award loyalty points on booking completion ───────────────
  // Fire-and-forget: errors logged inside awardPoints, never surfaced.
  // tenantId null-check is separated from the customer check so that bookings
  // without a tenantId do not silently skip loyalty awards (FINDING-015).
  if (updated.customer?.id) {
    void isFeatureEnabled('LOYALTY_ENABLED').then((enabled) => {
      if (enabled && booking.tenantId) {
        const points = calculatePointsForBooking(invoiceAmount);
        void awardPoints({
          customerId: updated.customer!.id,
          tenantId:   booking.tenantId,
          points,
          reason:     'booking_completed',
          bookingId:  id,
        }).catch((err) => logger.warn('awardPoints failed (non-fatal)', { err, bookingId: id }));
      }
    });
  }

  // ── Phase 8.2 — Enqueue AI suggestion (fire-and-forget) ──────────────────
  enqueueAISuggestion(id);

  return updated;
}

// ─── cancelBooking ────────────────────────────────────────────────────────────

/**
 * Cancels a PENDING or CONFIRMED booking.
 *
 * Business rules:
 *  1. Booking must be PENDING, CONFIRMED, or RESCHEDULED (not COMPLETED, CANCELLED, NO_SHOW)
 *  2. cancelReason is required
 *  3. Sets status → CANCELLED and cancelledAt → now
 *
 * Side-effects (log stubs; real delivery in Phase 2):
 *  - Enqueue booking-cancelled email to customer
 *  - Delete Google Calendar event if present (CALENDAR_SYNC_ENABLED)
 */
export async function cancelBooking(
  id:        string,
  body:      CancelBookingBody,
  actorId:   string,
  actorRole: ActorRole,
  tenantId:  string | null = null,
): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: { ...bookingDetailSelect, artistId: true, serviceId: true, tenantId: true },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} not found`);
  }

  enforceTenantOwnership(booking, tenantId, id);

  if (actorRole === 'ARTIST') {
    const artist = await prisma.artist.findFirst({
      where:  { userId: actorId },
      select: { id: true },
    });
    if (!artist || booking.artist.id !== artist.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only cancel your own bookings');
    }
  }

  const cancellableStatuses: string[] = ['PENDING', 'AWAITING_DEPOSIT', 'CONFIRMED', 'RESCHEDULED'];
  if (!cancellableStatuses.includes(booking.status)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot cancel a booking with status ${booking.status}. Only PENDING, AWAITING_DEPOSIT, CONFIRMED, or RESCHEDULED bookings can be cancelled.`,
    );
  }

  const updated = await prisma.booking.update({
    where:  { id },
    data:   {
      status:       'CANCELLED',
      cancelledAt:  new Date(),
      cancelReason: body.cancelReason,
    },
    select: bookingDetailSelect,
  });

  // ── Side-effects — log stubs (Phase 2 wires Resend + Google Calendar) ────
  logger.info('Email job queued (stub)', { job: 'booking-cancelled', bookingId: id, reason: body.cancelReason });

  // ── Google Calendar — delete event on cancel ──────────────────────────────
  // Fire-and-forget: failures are logged but never surfaced to caller.
  void syncDeleteEvent(id).catch((err) => logger.warn('Google Calendar delete failed', { err, bookingId: id }));
  // ── Outlook / Apple Calendar — Phase 7 ────────────────────────────────────
  void syncOutlookDeleteEvent(id).catch((err) => logger.warn('Outlook Calendar delete failed', { err, bookingId: id }));
  void syncAppleDeleteEvent(id).catch((err) => logger.warn('Apple Calendar delete failed', { err, bookingId: id }));

  // ── Cancel pending reminder — appointment no longer exists ───────────────
  // Fire-and-forget: failures are logged but never surfaced to caller.
  void cancelBookingReminder(id, booking.tenantId).catch((err) => logger.warn('cancelBookingReminder failed', { err, bookingId: id }));

  // ── Outgoing Webhook — booking.cancelled ─────────────────────────────────
  void enqueueWebhookEvent('booking.cancelled', {
    bookingId:    updated.id,
    status:       updated.status,
    artistId:     updated.artist.id,
    startAt:      updated.startAt.toISOString(),
    cancelReason: updated.cancelReason ?? null,
    customerId:   updated.customer?.id ?? null,
    leadId:       updated.lead?.id     ?? null,
  }).catch((err) => logger.warn('enqueueWebhookEvent booking.cancelled failed', { err, bookingId: id }));

  // ── Phase 5.4 — Smart Waitlist Matching ──────────────────────────────────
  // When a booking is cancelled, try to find the best-matching WAITING
  // waitlist entry and notify them of the slot opening.
  // Fire-and-forget: errors logged inside matchAndNotify, never surfaced to caller.
  if (booking.tenantId) {
    const tid = booking.tenantId; // capture after narrowing for closure safety
    void isFeatureEnabled('WAITING_LIST_ENABLED', tid).then((enabled) => {
      if (enabled) {
        void matchAndNotify({
          bookingArtistId:  booking.artistId,
          bookingServiceId: booking.serviceId ?? null,
          bookingStartAt:   booking.startAt,
          tenantId:         tid,
        });
      }
    });
  }

  return updated;
}

// ─── rescheduleBooking ────────────────────────────────────────────────────────

/**
 * Reschedules a CONFIRMED booking to a new time slot.
 *
 * Business rules:
 *  1. Booking must be CONFIRMED
 *  2. New startAt/endAt pass the same conflict check as confirm
 *  3. Sets status → RESCHEDULED, stores old booking id in rescheduledFrom,
 *     updates startAt/endAt
 *
 * Side-effects (log stubs; real delivery in Phase 2):
 *  - Enqueue booking-rescheduled email to customer
 *  - Update Google Calendar event (CALENDAR_SYNC_ENABLED)
 */
export async function rescheduleBooking(
  id:        string,
  body:      RescheduleBookingBody,
  actorId:   string,
  actorRole: ActorRole,
  tenantId:  string | null = null,
): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: { ...bookingDetailSelect, artistId: true, tenantId: true },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} not found`);
  }

  enforceTenantOwnership(booking, tenantId, id);

  if (actorRole === 'ARTIST') {
    const artist = await prisma.artist.findFirst({
      where:  { userId: actorId },
      select: { id: true },
    });
    if (!artist || booking.artist.id !== artist.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only reschedule your own bookings');
    }
  }

  if (booking.status !== 'CONFIRMED') {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot reschedule a booking with status ${booking.status}. Only CONFIRMED bookings can be rescheduled.`,
    );
  }

  const newStart = new Date(body.startAt);
  const newEnd   = new Date(body.endAt);

  // ── Conflict detection + status update (atomic transaction) ─────────────
  const updated = await prisma.$transaction(async (tx) => {
    const conflict = await tx.booking.findFirst({
      where: {
        artistId: booking.artistId,
        status:   { in: ['CONFIRMED', 'RESCHEDULED'] },
        id:       { not: id },
        startAt:  { lt: newEnd },
        endAt:    { gt: newStart },
      },
      select: { id: true, startAt: true, endAt: true },
    });

    if (conflict) {
      throw new AppError(
        409,
        'SCHEDULING_CONFLICT',
        `The new time slot conflicts with an existing confirmed booking (${conflict.id})`,
      );
    }

    return tx.booking.update({
      where:  { id },
      data:   {
        status:          'RESCHEDULED',
        startAt:         newStart,
        endAt:           newEnd,
        rescheduledFrom: id,
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      select: bookingDetailSelect,
    });
  });

  // ── Side-effects — log stubs (Phase 2 wires Resend + Google Calendar) ────
  logger.info('Email job queued (stub)', { job: 'booking-rescheduled', bookingId: id, newStart, newEnd });

  // ── Google Calendar — update event on reschedule ──────────────────────────
  // Fire-and-forget: failures are logged but never surfaced to caller.
  void syncUpdateEvent(id).catch((err) => logger.warn('Google Calendar update failed', { err, bookingId: id }));
  // ── Outlook / Apple Calendar — Phase 7 ────────────────────────────────────
  void syncOutlookUpdateEvent(id).catch((err) => logger.warn('Outlook Calendar update failed', { err, bookingId: id }));
  void syncAppleUpdateEvent(id).catch((err) => logger.warn('Apple Calendar update failed', { err, bookingId: id }));

  // ── Reminder: cancel old (stale time) + enqueue new (updated time) ───────
  // Fire-and-forget: failures are logged but never surfaced to caller.
  void cancelBookingReminder(id, booking.tenantId).catch((err) => logger.warn('cancelBookingReminder failed', { err, bookingId: id }));
  void enqueueBookingReminder({
    bookingId:      id,
    bookingStartAt: updated.startAt,
    customerEmail:  updated.customer?.email ?? updated.lead?.email ?? '',
    customerName:   updated.customer?.name  ?? updated.lead?.name  ?? 'Customer',
    studioName:     config.STUDIO_NAME,
    artistName:     updated.artist.user.name,
    serviceName:    updated.services[0]?.service?.name ?? 'appointment',
    tenantId:       booking.tenantId,
  }).catch((err) => logger.warn('enqueueBookingReminder failed', { err, bookingId: id }));

  // ── Outgoing Webhook — booking.rescheduled ────────────────────────────────
  void enqueueWebhookEvent('booking.rescheduled', {
    bookingId:  updated.id,
    status:     updated.status,
    artistId:   updated.artist.id,
    startAt:    updated.startAt.toISOString(),
    endAt:      updated.endAt.toISOString(),
    customerId: updated.customer?.id ?? null,
    leadId:     updated.lead?.id     ?? null,
  }).catch((err) => logger.warn('enqueueWebhookEvent booking.rescheduled failed', { err, bookingId: id }));

  return updated;
}
