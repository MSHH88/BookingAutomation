/**
 * Tables service — Step 1.24
 *
 * Business logic for the Table Management API (restaurant type).
 * Gated by the `TABLE_SELECTION_ENABLED` feature flag at the route level.
 *
 * ── Table management ──────────────────────────────────────────────────────────
 *
 *   listTables           — public; returns active tables; optionally all tables for admin
 *   getTableAvailability — public; returns tables available for a given date/time/partySize
 *   createTable          — ADMIN only
 *   updateTable          — ADMIN only; 404 if missing
 *   deleteTable          — ADMIN only; soft-delete (isActive=false)
 *                          409 if table has active bookings (PENDING / CONFIRMED / RESCHEDULED)
 *
 * Availability logic:
 *   1. Load all active tables
 *   2. Compute the sitting window: [startAt, startAt + durationMinutes]
 *   3. Load all bookings with status PENDING/CONFIRMED/RESCHEDULED that overlap
 *      the window for the same table (Booking.tableId IS NOT NULL)
 *   4. Filter tables where capacity >= partySize and the table has no overlapping booking
 *   5. Return the available tables including positionX/Y for the CRM floor plan
 *
 * Soft-delete rationale:
 *   Tables that appear in historical bookings must remain queryable for reporting.
 *   deleteTable sets isActive=false rather than removing the row.
 */
import { Prisma } from '@prisma/client';

import { prisma }  from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import type {
  ListTablesQuery,
  ListTableAvailQuery,
  CreateTableBody,
  UpdateTableBody,
} from './tables.schema';

// ─── Default sitting duration ─────────────────────────────────────────────────

const DEFAULT_SITTING_DURATION_MINUTES = 120;

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/**
 * Full table detail — returned by all table endpoints.
 */
const tableSelect = {
  id:        true,
  name:      true,
  capacity:  true,
  location:  true,
  positionX: true,
  positionY: true,
  isActive:  true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TableSelect;

// ─── Table functions ──────────────────────────────────────────────────────────

/**
 * List tables.
 *
 * By default returns only active tables (isActive=true).
 * Admins may pass isActive=false to see deactivated tables.
 * Ordered by name ASC.
 */
export async function listTables(query: ListTablesQuery) {
  const isActive =
    query.isActive !== undefined ? query.isActive === 'true' : true;

  return prisma.table.findMany({
    where:   { isActive },
    select:  tableSelect,
    orderBy: { name: 'asc' },
  });
}

/**
 * Return tables that are available for the requested date/time and party size.
 *
 * A table is available when:
 *   1. It is active (isActive = true)
 *   2. Its capacity is >= the requested partySize
 *   3. No existing PENDING/CONFIRMED/RESCHEDULED booking occupies the table
 *      during the computed sitting window [startAt, endAt]
 *
 * The sitting window is:
 *   startAt = <date> + <time> (parsed as UTC for consistency with stored timestamps)
 *   endAt   = startAt + durationMinutes (default 120)
 */
export async function getTableAvailability(query: ListTableAvailQuery) {
  const durationMinutes =
    query.durationMinutes ?? DEFAULT_SITTING_DURATION_MINUTES;

  // Parse the requested date/time into a UTC Date
  const startAt = new Date(`${query.date}T${query.time}:00.000Z`);
  if (isNaN(startAt.getTime())) {
    throw new AppError(400, 'INVALID_DATETIME', 'Invalid date or time value');
  }
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  // All active tables with sufficient capacity
  const activeTables = await prisma.table.findMany({
    where:  { isActive: true, capacity: { gte: query.partySize } },
    select: { ...tableSelect, _count: false },
    orderBy: { name: 'asc' },
  });

  if (activeTables.length === 0) return [];

  // Find tables that are occupied during the requested window
  const occupiedBookings = await prisma.booking.findMany({
    where: {
      tableId: { in: activeTables.map((t) => t.id), not: null },
      status:  { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
      // Overlap check: existing booking starts before our endAt AND ends after our startAt
      startAt: { lt: endAt },
      endAt:   { gt: startAt },
    },
    select: { tableId: true },
  });

  const occupiedTableIds = new Set(
    occupiedBookings.map((b) => b.tableId).filter(Boolean) as string[],
  );

  return activeTables.filter((t) => !occupiedTableIds.has(t.id));
}

/**
 * Create a new table (ADMIN only).
 */
export async function createTable(body: CreateTableBody) {
  return prisma.table.create({
    data: {
      name:      body.name,
      capacity:  body.capacity,
      location:  body.location  ?? null,
      positionX: body.positionX ?? null,
      positionY: body.positionY ?? null,
      isActive:  body.isActive  ?? true,
    },
    select: tableSelect,
  });
}

/**
 * Partially update a table (ADMIN only).
 *
 * Throws 404 if the table does not exist.
 */
export async function updateTable(id: string, body: UpdateTableBody) {
  const existing = await prisma.table.findUnique({
    where:  { id },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(404, 'TABLE_NOT_FOUND', 'Table not found');
  }

  return prisma.table.update({
    where: { id },
    data: {
      ...(body.name      !== undefined && { name:      body.name }),
      ...(body.capacity  !== undefined && { capacity:  body.capacity }),
      ...(body.location  !== undefined && { location:  body.location  ?? null }),
      ...(body.positionX !== undefined && { positionX: body.positionX ?? null }),
      ...(body.positionY !== undefined && { positionY: body.positionY ?? null }),
      ...(body.isActive  !== undefined && { isActive:  body.isActive }),
    },
    select: tableSelect,
  });
}

/**
 * Soft-delete a table (ADMIN only).
 *
 * Sets isActive=false to preserve historical booking records.
 * Throws 404 if the table does not exist.
 * Throws 409 if the table has active (PENDING/CONFIRMED/RESCHEDULED) bookings.
 */
export async function deleteTable(id: string) {
  const existing = await prisma.table.findUnique({
    where:  { id },
    select: { id: true, name: true, isActive: true },
  });
  if (!existing) {
    throw new AppError(404, 'TABLE_NOT_FOUND', 'Table not found');
  }

  const activeBookingCount = await prisma.booking.count({
    where: {
      tableId: id,
      status:  { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
    },
  });

  if (activeBookingCount > 0) {
    throw new AppError(
      409,
      'TABLE_HAS_ACTIVE_BOOKINGS',
      `Cannot deactivate "${existing.name}" — it has ${activeBookingCount} active booking(s). ` +
        'Resolve all pending/confirmed bookings before deactivating this table.',
    );
  }

  await prisma.table.update({
    where: { id },
    data:  { isActive: false },
    select: { id: true },
  });

  logger.info('Table deactivated', { tableId: id, name: existing.name });
}
