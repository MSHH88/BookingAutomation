/**
 * Bookings service — Step 1.9
 *
 * Handles all business logic for the Booking Management API.
 *
 * Booking status lifecycle:
 *   PENDING    → CONFIRMED   (conflict check → confirmedAt set)
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
 *  - Only PENDING bookings can be confirmed
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
): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: bookingDetailSelect,
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} not found`);
  }

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
): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: { ...bookingDetailSelect, artistId: true },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} not found`);
  }

  if (actorRole === 'ARTIST') {
    const artist = await prisma.artist.findFirst({
      where:  { userId: actorId },
      select: { id: true },
    });
    if (!artist || booking.artist.id !== artist.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only confirm your own bookings');
    }
  }

  if (booking.status !== 'PENDING') {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot confirm a booking with status ${booking.status}. Only PENDING bookings can be confirmed.`,
    );
  }

  // ── Conflict detection ────────────────────────────────────────────────────
  // Check CONFIRMED and RESCHEDULED bookings — both represent active time slots.
  const conflict = await prisma.booking.findFirst({
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

  const updated = await prisma.booking.update({
    where:  { id },
    data:   { status: 'CONFIRMED', confirmedAt: new Date() },
    select: bookingDetailSelect,
  });

  // ── Side-effects — log stubs (Phase 2 wires Resend + Google Calendar) ────
  logger.info('Email job queued (stub)', { job: 'booking-confirmed', bookingId: id });
  logger.info('Calendar event queued (stub)', { job: 'calendar-create', bookingId: id });

  // ── WhatsApp — Message 2 (confirmed) + Message 3 (reminder) ─────────────
  // Fire-and-forget: queue errors are caught inside the enqueue helpers.
  // WhatsApp opt-in is stored on the Lead record; skip when no lead is linked.
  void enqueueBookingConfirmed({
    phone:          updated.lead?.phone ?? updated.customer?.phone ?? null,
    customerName:   updated.customer?.name ?? updated.lead?.name ?? 'Customer',
    preferWhatsApp: updated.lead?.preferWhatsApp ?? false,
    studioName:     config.STUDIO_NAME,
    artistName:     updated.artist.user.name,
    startAt:        updated.startAt.toISOString(),
    bookingId:      id,
  });

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
): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: {
      ...bookingDetailSelect,
      artistId:    true,
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

  // ── Side-effects — log stubs (Phase 2 wires BullMQ) ──────────────────────
  logger.info('Email job queued (stub)', { job: 'review-request', bookingId: id, delayHours: 36 });

  // ── WhatsApp — Message 4 (post-visit review, +2 h) ───────────────────────
  // Fire-and-forget: queue errors are caught inside the enqueue helper.
  // WhatsApp opt-in is stored on the Lead record; skip when no lead is linked.
  void enqueuePostVisitReview({
    phone:           booking.lead?.phone ?? booking.customer?.phone ?? null,
    customerName:    booking.customer?.name ?? booking.lead?.name ?? 'Customer',
    preferWhatsApp:  booking.lead?.preferWhatsApp ?? false,
    studioName:      config.STUDIO_NAME,
    googleReviewUrl: config.GOOGLE_REVIEW_URL || '',
    bookingId:       id,
  });

  const updated = await prisma.booking.findUnique({
    where:  { id },
    select: bookingDetailSelect,
  });

  if (!updated) {
    throw new AppError(500, 'INTERNAL_ERROR', `Booking ${id} not found after completion`);
  }

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
): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: { ...bookingDetailSelect, artistId: true },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} not found`);
  }

  if (actorRole === 'ARTIST') {
    const artist = await prisma.artist.findFirst({
      where:  { userId: actorId },
      select: { id: true },
    });
    if (!artist || booking.artist.id !== artist.id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only cancel your own bookings');
    }
  }

  const cancellableStatuses: string[] = ['PENDING', 'CONFIRMED', 'RESCHEDULED'];
  if (!cancellableStatuses.includes(booking.status)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot cancel a booking with status ${booking.status}. Only PENDING, CONFIRMED, or RESCHEDULED bookings can be cancelled.`,
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
  logger.info('Calendar event queued (stub)', { job: 'calendar-delete', bookingId: id });

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
): Promise<BookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: { ...bookingDetailSelect, artistId: true },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} not found`);
  }

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

  // ── Conflict detection on new time slot ───────────────────────────────────
  // Check CONFIRMED and RESCHEDULED bookings — both represent active time slots.
  const conflict = await prisma.booking.findFirst({
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

  const updated = await prisma.booking.update({
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

  // ── Side-effects — log stubs (Phase 2 wires Resend + Google Calendar) ────
  logger.info('Email job queued (stub)', { job: 'booking-rescheduled', bookingId: id, newStart, newEnd });
  logger.info('Calendar event queued (stub)', { job: 'calendar-update', bookingId: id });

  return updated;
}
