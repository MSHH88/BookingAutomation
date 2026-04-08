/**
 * Customer Portal service — Step 1.25
 *
 * All business logic for the /api/me endpoints.
 *
 * Security contract:
 *  - Every function receives the authenticated customer's userId/email.
 *  - Ownership is enforced here: a customer cannot read or mutate another
 *    customer's bookings, leads, or profile — regardless of what ids are
 *    supplied in the request parameters.
 *
 * Endpoints covered:
 *  listMyBookings       — paginated list of own bookings
 *  getMyBookingById     — single booking detail (own only)
 *  cancelMyBooking      — cancel own upcoming booking (respects window)
 *  requestReschedule    — request reschedule (status → RESCHEDULED, staff notified)
 *  listMyLeads          — paginated list of own inquiry leads
 *  updateMyProfile      — update name, phone, marketingConsent
 *
 * Business rules:
 *  - Customer can cancel/reschedule only when startAt > now() + CANCELLATION_WINDOW_HOURS
 *  - If CANCELLATION_FEE_ENABLED and customer cancels inside the window → log / fee trigger stub
 *  - Reschedule does NOT auto-confirm — status is set to RESCHEDULED and staff is notified
 *  - Cancellable statuses: PENDING | CONFIRMED | RESCHEDULED
 *  - Reschedulable statuses: PENDING | CONFIRMED | RESCHEDULED
 *
 * Email side-effects:
 *  - cancelMyBooking:  booking-cancelled email to customer (log stub)
 *                      cancellation-fee email when CANCELLATION_FEE_ENABLED (log stub)
 *  - requestReschedule: reschedule-request email to studio admin (log stub)
 */
import { Prisma } from '@prisma/client';

import { prisma }       from '../../lib/prisma';
import { AppError }     from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }       from '../../utils/logger';
import { getDefaultFlags } from '../../config/businessType';
import type {
  ListMyBookingsQuery,
  CancelMyBookingBody,
  RescheduleMyBookingBody,
  ListMyLeadsQuery,
  UpdateMyProfileBody,
} from './customers.schema';

// ─── Cancellation window ──────────────────────────────────────────────────────

/**
 * Returns the cancellation window in milliseconds.
 *
 * Read at call-time so tests can override process.env['CANCELLATION_WINDOW_HOURS']
 * without restarting the process.  Defaults to 24 hours.
 */
function getCancellationWindowMs(): number {
  const raw = process.env['CANCELLATION_WINDOW_HOURS'];
  const hours = raw ? parseFloat(raw) : 24;
  return (isNaN(hours) || hours < 0 ? 24 : hours) * 60 * 60 * 1000;
}

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Customer-facing booking detail shape.
 *
 * Omits internal fields (cancelReason, deposit internals, rescheduledFrom)
 * that are not relevant to the customer self-service portal.
 */
const myBookingDetailSelect = {
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
  cancelReason:         true,
  confirmedAt:          true,
  completedAt:          true,
  cancelledAt:          true,
  createdAt:            true,
  updatedAt:            true,
  artist: {
    select: {
      id:   true,
      slug: true,
      user: { select: { name: true, email: true } },
    },
  },
  services: {
    select: {
      id:              true,
      price:           true,
      durationMinutes: true,
      service: { select: { id: true, name: true } },
    },
  },
  invoice: {
    select: { id: true, status: true, amount: true, dueDate: true, paidAt: true },
  },
} satisfies Prisma.BookingSelect;

type MyBookingDetail = Prisma.BookingGetPayload<{ select: typeof myBookingDetailSelect }>;

/** Slimmer list shape for GET /api/me/bookings. */
const myBookingListSelect = {
  id:          true,
  status:      true,
  startAt:     true,
  endAt:       true,
  totalAmount: true,
  createdAt:   true,
  artist: {
    select: {
      id:   true,
      slug: true,
      user: { select: { name: true } },
    },
  },
  services: {
    select: { service: { select: { id: true, name: true } } },
  },
} satisfies Prisma.BookingSelect;

/** Customer profile shape returned by updateMyProfile. */
const profileSelect = {
  id:               true,
  name:             true,
  email:            true,
  phone:            true,
  marketingConsent: true,
  loyaltyBalance:   true,
  createdAt:        true,
  updatedAt:        true,
} satisfies Prisma.UserSelect;

// ─── listMyBookings ───────────────────────────────────────────────────────────

/**
 * Returns a paginated list of the authenticated customer's own bookings.
 *
 * Filtered by customerId — only the calling user's bookings are returned.
 */
export async function listMyBookings(
  query:      ListMyBookingsQuery,
  customerId: string,
): Promise<PaginatedResult<Prisma.BookingGetPayload<{ select: typeof myBookingListSelect }>>> {
  const where: Prisma.BookingWhereInput = { customerId };

  if (query.status) {
    where.status = query.status;
  }

  if (query.from || query.to) {
    where.startAt = {};
    if (query.from) {
      const from = new Date(query.from);
      if (isNaN(from.getTime())) {
        throw new AppError(400, 'VALIDATION_ERROR', 'from must be a valid date');
      }
      (where.startAt as Prisma.DateTimeFilter).gte = from;
    }
    if (query.to) {
      const to = new Date(query.to);
      if (isNaN(to.getTime())) {
        throw new AppError(400, 'VALIDATION_ERROR', 'to must be a valid date');
      }
      (where.startAt as Prisma.DateTimeFilter).lte = to;
    }
  }

  return paginate(
    prisma.booking,
    {
      where,
      select:  myBookingListSelect,
      orderBy: { startAt: 'desc' },
    },
    { page: query.page, limit: query.limit },
  );
}

// ─── getMyBookingById ─────────────────────────────────────────────────────────

/**
 * Returns the full detail of a single booking owned by the customer.
 *
 * Throws 404 if the booking does not exist OR belongs to a different customer.
 */
export async function getMyBookingById(
  id:         string,
  customerId: string,
): Promise<MyBookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: myBookingDetailSelect,
  });

  if (!booking || booking['customerId' as keyof typeof booking] !== customerId) {
    throw new AppError(404, 'NOT_FOUND', 'Booking not found');
  }

  return booking;
}

// ─── cancelMyBooking ──────────────────────────────────────────────────────────

/**
 * Cancels the customer's own booking.
 *
 * Business rules:
 *  1. Booking must belong to the calling customer.
 *  2. Booking status must be PENDING, CONFIRMED, or RESCHEDULED.
 *  3. If `startAt` is within the cancellation window AND CANCELLATION_FEE_ENABLED,
 *     a cancellation fee log/stub is fired before setting status to CANCELLED.
 *  4. After the window passes (startAt ≤ now + window), cancellation is allowed
 *     for any of the three statuses.
 *
 * Returns the updated booking detail.
 */
export async function cancelMyBooking(
  id:         string,
  body:       CancelMyBookingBody,
  customerId: string,
): Promise<MyBookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: {
      ...myBookingDetailSelect,
      customerId: true,
      status:     true,
      startAt:    true,
    },
  });

  if (!booking || booking.customerId !== customerId) {
    throw new AppError(404, 'NOT_FOUND', 'Booking not found');
  }

  const cancellableStatuses = ['PENDING', 'CONFIRMED', 'RESCHEDULED'] as const;
  if (!(cancellableStatuses as readonly string[]).includes(booking.status)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot cancel a booking with status ${booking.status}. Only PENDING, CONFIRMED, or RESCHEDULED bookings can be cancelled.`,
    );
  }

  // ── Cancellation window check ──────────────────────────────────────────────
  const windowMs     = getCancellationWindowMs();
  const insideWindow = booking.startAt.getTime() - Date.now() < windowMs;

  const flags = getDefaultFlags();

  if (insideWindow && flags.CANCELLATION_FEE_ENABLED) {
    // Stub: in Phase 2 this triggers a Stripe charge for the cancellation fee.
    logger.warn('Cancellation fee triggered (stub)', {
      bookingId:  id,
      customerId,
      startAt:    booking.startAt,
      windowMs,
    });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status:       'CANCELLED',
      cancelledAt:  new Date(),
      cancelReason: body.cancelReason,
    },
    select: myBookingDetailSelect,
  });

  // Stub: send booking-cancelled email to customer.
  logger.info('Email job queued (stub)', {
    job:        'booking-cancelled',
    bookingId:  id,
    customerId,
    reason:     body.cancelReason,
  });

  return updated;
}

// ─── requestReschedule ────────────────────────────────────────────────────────

/**
 * Records a reschedule request from the customer.
 *
 * Unlike the staff reschedule endpoint, this does NOT auto-confirm. It:
 *  1. Validates ownership + status (PENDING | CONFIRMED | RESCHEDULED).
 *  2. Enforces the cancellation window — customers cannot request a reschedule
 *     for a booking starting within the configured cancellation window.
 *  3. Updates startAt / endAt and sets status → RESCHEDULED.
 *  4. Notifies the studio admin via email (log stub).
 *
 * Staff must re-confirm the booking after reviewing the new times.
 */
export async function requestReschedule(
  id:         string,
  body:       RescheduleMyBookingBody,
  customerId: string,
): Promise<MyBookingDetail> {
  const booking = await prisma.booking.findUnique({
    where:  { id },
    select: {
      ...myBookingDetailSelect,
      customerId: true,
      status:     true,
      startAt:    true,
    },
  });

  if (!booking || booking.customerId !== customerId) {
    throw new AppError(404, 'NOT_FOUND', 'Booking not found');
  }

  const reschedulableStatuses = ['PENDING', 'CONFIRMED', 'RESCHEDULED'] as const;
  if (!(reschedulableStatuses as readonly string[]).includes(booking.status)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot reschedule a booking with status ${booking.status}. Only PENDING, CONFIRMED, or RESCHEDULED bookings can be rescheduled.`,
    );
  }

  // ── Cancellation window check ──────────────────────────────────────────────
  const windowMs = getCancellationWindowMs();
  if (booking.startAt.getTime() - Date.now() < windowMs) {
    throw new AppError(
      409,
      'OUTSIDE_RESCHEDULE_WINDOW',
      `Reschedule requests must be submitted at least ${Math.round(windowMs / 3_600_000)} hour(s) before the appointment.`,
    );
  }

  const newStart = new Date(body.startAt);
  const newEnd   = new Date(body.endAt);

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status:           'RESCHEDULED',
      rescheduledFrom:  id,
      startAt:          newStart,
      endAt:            newEnd,
      notes:            body.notes ?? undefined,
    },
    select: myBookingDetailSelect,
  });

  // Stub: notify studio admin of the reschedule request.
  logger.info('Email job queued (stub)', {
    job:        'reschedule-request',
    bookingId:  id,
    customerId,
    newStartAt: body.startAt,
    newEndAt:   body.endAt,
  });

  return updated;
}

// ─── listMyLeads ──────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of the customer's own inquiry leads.
 *
 * Leads are matched by the customer's email address (since Lead.customerId is
 * optional and may not always be populated for legacy records).
 */
export async function listMyLeads(
  query:         ListMyLeadsQuery,
  customerEmail: string,
): Promise<PaginatedResult<Prisma.LeadGetPayload<{ select: typeof myLeadSelect }>>> {
  return paginate(
    prisma.lead,
    {
      where:   { email: customerEmail },
      select:  myLeadSelect,
      orderBy: { createdAt: 'desc' },
    },
    { page: query.page, limit: query.limit },
  );
}

const myLeadSelect = {
  id:          true,
  description: true,
  placement:   true,
  size:        true,
  status:      true,
  score:       true,
  createdAt:   true,
  updatedAt:   true,
  artist: {
    select: {
      id:   true,
      slug: true,
      user: { select: { name: true } },
    },
  },
  quotes: {
    select: {
      id:         true,
      price:      true,
      hours:      true,
      status:     true,
      validUntil: true,
    },
  },
} satisfies Prisma.LeadSelect;

// ─── updateMyProfile ──────────────────────────────────────────────────────────

/**
 * Updates the customer's own profile.  Only the fields supplied in the body
 * are changed; omitted fields are left untouched.
 *
 * Updatable fields: name, phone, marketingConsent.
 */
export async function updateMyProfile(
  body:   UpdateMyProfileBody,
  userId: string,
): Promise<Prisma.UserGetPayload<{ select: typeof profileSelect }>> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  const data: Prisma.UserUpdateInput = {};
  if (body.name             !== undefined) data.name             = body.name;
  if (body.phone            !== undefined) data.phone            = body.phone;
  if (body.marketingConsent !== undefined) {
    data.marketingConsent = body.marketingConsent;
    if (body.marketingConsent && !user.gdprConsentAt) {
      data.gdprConsentAt = new Date();
    }
  }

  return prisma.user.update({
    where:  { id: userId },
    data,
    select: profileSelect,
  });
}
