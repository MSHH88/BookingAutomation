/**
 * CRM alerts service — Phase 2.5
 *
 * Aggregates warnings from multiple data sources into a unified alert API.
 * The frontend CRM renders these as banners, badges, and toast notifications.
 *
 * ─── What this module does ───────────────────────────────────────────────────
 *
 *   getBookingAlerts(bookingId, tenantId)
 *     Returns alerts for a specific booking:
 *     - DEPOSIT_PENDING: booking in AWAITING_DEPOSIT status
 *     - NO_SHOW_TIMER: booking past start time and still CONFIRMED
 *     - OVERDUE_INVOICE: invoice OVERDUE for this booking
 *
 *   getCustomerAlerts(customerId, tenantId)
 *     Returns alerts for a customer:
 *     - REBOOK_DUE: last booking > 30 days ago with no future booking
 *     - CARD_NOT_ON_FILE: customer has no Stripe payment method
 *     - BIRTHDAY_TODAY: customer's birthday is today
 *     - HEALTH_FLAG: customer has active health flags (future)
 *
 *   getDashboardAlerts(tenantId, query)
 *     Returns global dashboard alerts:
 *     - OVERDUE_INVOICE: count of overdue invoices
 *     - DEPOSIT_PENDING: count of bookings awaiting deposit
 *     - WAITLIST_MATCH: waitlist entries with available slots
 *     - NO_SHOW_TIMER: bookings past start time, still CONFIRMED
 */
import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import type { Alert, GetDashboardAlertsQuery } from './alerts.schema';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/alerts/booking/:id
 * Returns alerts for a specific booking.
 */
export async function getBookingAlerts(bookingId: string, tenantId: string): Promise<Alert[]> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id:        true,
      status:    true,
      startAt:   true,
      tenantId:  true,
      depositAmount:   true,
      depositPaidAt:   true,
      invoice:   { select: { id: true, status: true, dueDate: true } },
    },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  // Verify tenant access
  if (booking.tenantId && booking.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this booking');
  }

  const alerts: Alert[] = [];

  // DEPOSIT_PENDING: booking awaiting deposit
  if (booking.status === 'AWAITING_DEPOSIT') {
    alerts.push({
      type:       'DEPOSIT_PENDING',
      severity:   'AMBER',
      message:    'Customer has not yet paid the deposit for this booking.',
      entityId:   booking.id,
      entityType: 'Booking',
    });
  }

  // NO_SHOW_TIMER: booking past start time and still CONFIRMED
  if (booking.status === 'CONFIRMED' && new Date(booking.startAt) < new Date()) {
    alerts.push({
      type:       'NO_SHOW_TIMER',
      severity:   'RED',
      message:    'Booking start time has passed — customer may be a no-show.',
      entityId:   booking.id,
      entityType: 'Booking',
    });
  }

  // OVERDUE_INVOICE
  if (booking.invoice && booking.invoice.status === 'OVERDUE') {
    alerts.push({
      type:       'OVERDUE_INVOICE',
      severity:   'RED',
      message:    `Invoice is overdue (due ${new Date(booking.invoice.dueDate).toISOString().slice(0, 10)}).`,
      entityId:   booking.invoice.id,
      entityType: 'Invoice',
    });
  }

  return alerts;
}

/**
 * GET /api/alerts/customer/:id
 * Returns alerts for a specific customer.
 */
export async function getCustomerAlerts(customerId: string, tenantId: string): Promise<Alert[]> {
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: {
      id:               true,
      name:             true,
      tenantId:         true,
      dateOfBirth:      true,
      stripeCustomerId: true,
    },
  });

  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  if (customer.tenantId && customer.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this customer');
  }

  const alerts: Alert[] = [];

  // REBOOK_DUE: last booking > 30 days ago with no future booking
  const lastBooking = await prisma.booking.findFirst({
    where: { customerId, tenantId, status: { in: ['COMPLETED'] } },
    orderBy: { completedAt: 'desc' },
    select: { id: true, completedAt: true },
  });

  const futureBooking = await prisma.booking.findFirst({
    where: { customerId, tenantId, status: { in: ['PENDING', 'CONFIRMED', 'AWAITING_DEPOSIT'] }, startAt: { gt: new Date() } },
    select: { id: true },
  });

  if (lastBooking?.completedAt && !futureBooking) {
    const daysSinceCompletion = Math.floor(
      (Date.now() - new Date(lastBooking.completedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCompletion > 30) {
      alerts.push({
        type:       'REBOOK_DUE',
        severity:   'AMBER',
        message:    `Last visit was ${daysSinceCompletion} days ago. Consider sending a rebooking nudge.`,
        entityId:   customer.id,
        entityType: 'Customer',
      });
    }
  }

  // CARD_NOT_ON_FILE
  if (!customer.stripeCustomerId) {
    alerts.push({
      type:       'CARD_NOT_ON_FILE',
      severity:   'AMBER',
      message:    'Customer does not have a payment method on file.',
      entityId:   customer.id,
      entityType: 'Customer',
    });
  }

  // BIRTHDAY_TODAY
  if (customer.dateOfBirth) {
    const today = new Date();
    const dob   = new Date(customer.dateOfBirth);
    if (dob.getUTCMonth() === today.getUTCMonth() && dob.getUTCDate() === today.getUTCDate()) {
      alerts.push({
        type:       'BIRTHDAY_TODAY',
        severity:   'GREEN',
        message:    `Today is ${customer.name}'s birthday! 🎂`,
        entityId:   customer.id,
        entityType: 'Customer',
      });
    }
  }

  return alerts;
}

/**
 * GET /api/alerts/dashboard
 * Returns global dashboard alerts for the admin CRM.
 */
export async function getDashboardAlerts(
  tenantId: string,
  query: GetDashboardAlertsQuery,
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // OVERDUE_INVOICE count
  const overdueInvoices = await prisma.invoice.count({
    where: {
      status: 'OVERDUE',
      booking: { tenantId },
    },
  });

  if (overdueInvoices > 0) {
    alerts.push({
      type:       'OVERDUE_INVOICE',
      severity:   'RED',
      message:    `${overdueInvoices} overdue invoice${overdueInvoices > 1 ? 's' : ''} require attention.`,
      entityId:   null,
      entityType: null,
    });
  }

  // DEPOSIT_PENDING count
  const pendingDeposits = await prisma.booking.count({
    where: { tenantId, status: 'AWAITING_DEPOSIT' },
  });

  if (pendingDeposits > 0) {
    alerts.push({
      type:       'DEPOSIT_PENDING',
      severity:   'AMBER',
      message:    `${pendingDeposits} booking${pendingDeposits > 1 ? 's' : ''} awaiting deposit payment.`,
      entityId:   null,
      entityType: null,
    });
  }

  // WAITLIST_MATCH: active waitlist entries
  const waitlistCount = await prisma.waitlistEntry.count({
    where: { tenantId, status: 'WAITING' },
  });

  if (waitlistCount > 0) {
    alerts.push({
      type:       'WAITLIST_MATCH',
      severity:   'GREEN',
      message:    `${waitlistCount} customer${waitlistCount > 1 ? 's' : ''} on the waitlist.`,
      entityId:   null,
      entityType: null,
    });
  }

  // NO_SHOW_TIMER: bookings past start time, still CONFIRMED
  const potentialNoShows = await prisma.booking.count({
    where: {
      tenantId,
      status:  'CONFIRMED',
      startAt: { lt: new Date() },
    },
  });

  if (potentialNoShows > 0) {
    alerts.push({
      type:       'NO_SHOW_TIMER',
      severity:   'RED',
      message:    `${potentialNoShows} booking${potentialNoShows > 1 ? 's' : ''} may be no-shows (past start time).`,
      entityId:   null,
      entityType: null,
    });
  }

  // Filter by severity if requested
  if (query.severity) {
    return alerts.filter((a) => a.severity === query.severity);
  }

  return alerts;
}
