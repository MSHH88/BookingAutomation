/**
 * Recurring Bookings service — Phase 1, Step 1.8
 *
 * Handles all business logic for the Recurring Bookings module.
 *
 * Recurring bookings allow customers to set up automatic rebooking at
 * fixed intervals. The `nextBookingDate` is advanced by `intervalDays`
 * each time a booking is created by the recurring-booking job.
 *
 * Functions:
 *   listRecurringBookings  — paginated list with optional isActive / customerId filters
 *   getRecurringBooking    — single record by ID, scoped to tenant; 404 if not found
 *   createRecurringBooking — create a new recurring booking record
 *   updateRecurringBooking — update intervalDays / nextBookingDate / isActive; 404 if not found
 *   deactivateRecurringBooking — set isActive = false (soft delete); 404 if not found
 *
 * Feature flag: RECURRING_BOOKINGS_ENABLED
 */
import { Prisma } from '@prisma/client';

import { prisma }                    from '../../lib/prisma';
import { AppError }                  from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }                    from '../../utils/logger';
import type {
  ListRecurringQuery,
  CreateRecurringBody,
  UpdateRecurringBody,
} from './recurring-bookings.schema';

// ─── Prisma select shape ──────────────────────────────────────────────────────

const recurringBookingSelect = {
  id:              true,
  tenantId:        true,
  customerId:      true,
  serviceId:       true,
  artistId:        true,
  intervalDays:    true,
  nextBookingDate: true,
  isActive:        true,
  createdAt:       true,
  updatedAt:       true,
} satisfies Prisma.RecurringBookingSelect;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List recurring bookings for a tenant.
 *
 * Optional filters:
 *   isActive   — true/false
 *   customerId — filter by customer
 *
 * Returns paginated results ordered by nextBookingDate ascending.
 */
export async function listRecurringBookings(
  tenantId: string | null,
  query: ListRecurringQuery,
): Promise<PaginatedResult<Prisma.RecurringBookingGetPayload<{ select: typeof recurringBookingSelect }>>> {
  const where: Prisma.RecurringBookingWhereInput = {};

  if (tenantId) where.tenantId = tenantId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.customerId) where.customerId = query.customerId;

  return paginate(
    prisma.recurringBooking,
    { where, select: recurringBookingSelect, orderBy: { nextBookingDate: 'asc' } },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Get a single recurring booking by ID.
 *
 * Scoped to tenant. Throws 404 if not found.
 */
export async function getRecurringBooking(
  tenantId: string | null,
  id: string,
): Promise<Prisma.RecurringBookingGetPayload<{ select: typeof recurringBookingSelect }>> {
  const where: Prisma.RecurringBookingWhereInput = { id };
  if (tenantId) where.tenantId = tenantId;

  const record = await prisma.recurringBooking.findFirst({
    where,
    select: recurringBookingSelect,
  });

  if (!record) {
    throw new AppError(404, 'RECURRING_BOOKING_NOT_FOUND', `Recurring booking '${id}' not found`);
  }

  return record;
}

/**
 * Create a new recurring booking.
 *
 * The record is created as active by default.
 */
export async function createRecurringBooking(
  tenantId: string | null,
  body: CreateRecurringBody,
): Promise<Prisma.RecurringBookingGetPayload<{ select: typeof recurringBookingSelect }>> {
  const record = await prisma.recurringBooking.create({
    data: {
      tenantId,
      customerId:      body.customerId,
      serviceId:       body.serviceId ?? null,
      artistId:        body.artistId ?? null,
      intervalDays:    body.intervalDays,
      nextBookingDate: new Date(body.nextBookingDate),
      isActive:        true,
    },
    select: recurringBookingSelect,
  });

  logger.info('Recurring booking created', { id: record.id, tenantId, customerId: body.customerId });

  return record;
}

/**
 * Update a recurring booking.
 *
 * Allowed fields: intervalDays, nextBookingDate, isActive.
 * Throws 404 if not found.
 */
export async function updateRecurringBooking(
  tenantId: string | null,
  id: string,
  body: UpdateRecurringBody,
): Promise<Prisma.RecurringBookingGetPayload<{ select: typeof recurringBookingSelect }>> {
  // Verify existence + tenant scoping
  await getRecurringBooking(tenantId, id);

  const data: Prisma.RecurringBookingUpdateInput = {};
  if (body.intervalDays !== undefined) data.intervalDays = body.intervalDays;
  if (body.nextBookingDate !== undefined) data.nextBookingDate = new Date(body.nextBookingDate);
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const updated = await prisma.recurringBooking.update({
    where: { id },
    data,
    select: recurringBookingSelect,
  });

  logger.info('Recurring booking updated', { id, tenantId });

  return updated;
}

/**
 * Deactivate a recurring booking (soft delete).
 *
 * Sets isActive = false. Throws 404 if not found.
 */
export async function deactivateRecurringBooking(
  tenantId: string | null,
  id: string,
): Promise<Prisma.RecurringBookingGetPayload<{ select: typeof recurringBookingSelect }>> {
  // Verify existence + tenant scoping
  await getRecurringBooking(tenantId, id);

  const updated = await prisma.recurringBooking.update({
    where: { id },
    data:  { isActive: false },
    select: recurringBookingSelect,
  });

  logger.info('Recurring booking deactivated', { id, tenantId });

  return updated;
}
