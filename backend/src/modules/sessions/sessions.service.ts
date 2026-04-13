/**
 * Sessions service — Phase 9.2
 *
 * CRUD operations for Session and SessionBooking records.
 * Booking a spot atomically decrements available capacity.
 * When a session becomes full it automatically switches to FULL status.
 * When a booking is cancelled the session reopens if it was FULL.
 *
 * Tests: sessions.test.ts
 */

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import type {
  CreateSessionBody,
  UpdateSessionBody,
  ListSessionsQuery,
} from './sessions.schema';

// ─── list ─────────────────────────────────────────────────────────────────────

export async function listSessions(
  tenantId: string | null,
  query: ListSessionsQuery,
) {
  return prisma.session.findMany({
    where: {
      tenantId,
      ...(query.serviceId  ? { serviceId:  query.serviceId  } : {}),
      ...(query.artistId   ? { artistId:   query.artistId   } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(query.status     ? { status:     query.status     } : {}),
      ...(query.from || query.to
        ? {
            startTime: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to   ? { lte: query.to   } : {}),
            },
          }
        : {}),
    },
    include: {
      service:  { select: { id: true, name: true } },
      artist:   { select: { id: true, slug: true } },
      location: { select: { id: true, name: true } },
    },
    orderBy: { startTime: 'asc' },
  });
}

// ─── getById ──────────────────────────────────────────────────────────────────

export async function getSessionById(
  tenantId: string | null,
  id: string,
) {
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      service:  { select: { id: true, name: true } },
      artist:   { select: { id: true, slug: true } },
      location: { select: { id: true, name: true } },
      bookings: {
        include: { customer: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', `Session ${id} not found`);
  }
  if (session.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Session does not belong to this tenant');
  }
  return session;
}

// ─── create ───────────────────────────────────────────────────────────────────

export async function createSession(
  tenantId: string | null,
  body: CreateSessionBody,
) {
  // Validate service belongs to this tenant
  const service = await prisma.service.findUnique({
    where:  { id: body.serviceId },
    select: { id: true, tenantId: true },
  });
  if (!service) {
    throw new AppError(404, 'SERVICE_NOT_FOUND', `Service ${body.serviceId} not found`);
  }
  if (service.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Service does not belong to this tenant');
  }

  // Validate artist belongs to this tenant
  const artist = await prisma.artist.findUnique({
    where:  { id: body.artistId },
    select: { id: true, tenantId: true },
  });
  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist ${body.artistId} not found`);
  }
  if (artist.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Artist does not belong to this tenant');
  }

  // Validate location if provided
  if (body.locationId) {
    const location = await prisma.location.findUnique({
      where:  { id: body.locationId },
      select: { id: true, tenantId: true },
    });
    if (!location) {
      throw new AppError(404, 'LOCATION_NOT_FOUND', `Location ${body.locationId} not found`);
    }
    if (location.tenantId !== tenantId) {
      throw new AppError(403, 'FORBIDDEN', 'Location does not belong to this tenant');
    }
  }

  const session = await prisma.session.create({
    data: {
      tenantId,
      serviceId:  body.serviceId,
      artistId:   body.artistId,
      locationId: body.locationId ?? null,
      startTime:  body.startTime,
      endTime:    body.endTime,
      capacity:   body.capacity,
      notes:      body.notes ?? null,
    },
  });

  logger.info('Session created', { sessionId: session.id, tenantId });
  return session;
}

// ─── update ───────────────────────────────────────────────────────────────────

export async function updateSession(
  tenantId: string | null,
  id: string,
  body: UpdateSessionBody,
) {
  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'SESSION_NOT_FOUND', `Session ${id} not found`);
  }
  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Session does not belong to this tenant');
  }
  if (existing.status === 'CANCELLED') {
    throw new AppError(409, 'SESSION_CANCELLED', 'Cannot update a cancelled session');
  }

  const session = await prisma.session.update({
    where: { id },
    data: {
      ...(body.locationId !== undefined ? { locationId: body.locationId } : {}),
      ...(body.startTime  !== undefined ? { startTime:  body.startTime  } : {}),
      ...(body.endTime    !== undefined ? { endTime:    body.endTime    } : {}),
      ...(body.capacity   !== undefined ? { capacity:   body.capacity   } : {}),
      ...(body.status     !== undefined ? { status:     body.status     } : {}),
      ...(body.notes      !== undefined ? { notes:      body.notes      } : {}),
    },
  });

  logger.info('Session updated', { sessionId: id, tenantId });
  return session;
}

// ─── delete ───────────────────────────────────────────────────────────────────

export async function deleteSession(
  tenantId: string | null,
  id: string,
) {
  const existing = await prisma.session.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'SESSION_NOT_FOUND', `Session ${id} not found`);
  }
  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Session does not belong to this tenant');
  }

  await prisma.session.delete({ where: { id } });
  logger.info('Session deleted', { sessionId: id, tenantId });
}

// ─── bookSpot ─────────────────────────────────────────────────────────────────

export async function bookSessionSpot(
  tenantId:   string | null,
  sessionId:  string,
  customerId: string,
) {
  // Fetch session inside a transaction for atomic capacity decrement
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }
    if (session.tenantId !== tenantId) {
      throw new AppError(403, 'FORBIDDEN', 'Session does not belong to this tenant');
    }
    if (session.status === 'CANCELLED') {
      throw new AppError(409, 'SESSION_CANCELLED', 'Session is cancelled');
    }
    if (session.status === 'FULL') {
      throw new AppError(409, 'SESSION_FULL', 'Session is fully booked');
    }

    // Validate customer belongs to this tenant
    const customer = await tx.user.findUnique({
      where:  { id: customerId },
      select: { id: true, tenantId: true },
    });
    if (!customer) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer ${customerId} not found`);
    }
    if (customer.tenantId !== tenantId) {
      throw new AppError(403, 'FORBIDDEN', 'Customer does not belong to this tenant');
    }

    // Check for duplicate booking
    const existing = await tx.sessionBooking.findUnique({
      where: { sessionId_customerId: { sessionId, customerId } },
    });
    if (existing) {
      if (existing.status === 'CONFIRMED') {
        throw new AppError(409, 'ALREADY_BOOKED', 'Customer already has a booking for this session');
      }
      // Re-confirm a cancelled booking
      const rebooking = await tx.sessionBooking.update({
        where: { id: existing.id },
        data: { status: 'CONFIRMED' },
      });
      // Increment attendees
      const newAttendees = session.currentAttendees + 1;
      await tx.session.update({
        where: { id: sessionId },
        data:  {
          currentAttendees: newAttendees,
          ...(newAttendees >= session.capacity ? { status: 'FULL' } : {}),
        },
      });
      logger.info('Session spot re-booked', { sessionId, customerId });
      return rebooking;
    }

    const booking = await tx.sessionBooking.create({
      data: { sessionId, customerId, tenantId, status: 'CONFIRMED' },
    });

    const newAttendees = session.currentAttendees + 1;
    await tx.session.update({
      where: { id: sessionId },
      data:  {
        currentAttendees: newAttendees,
        ...(newAttendees >= session.capacity ? { status: 'FULL' } : {}),
      },
    });

    logger.info('Session spot booked', { sessionId, customerId });
    return booking;
  });

  return result;
}

// ─── cancelBooking ────────────────────────────────────────────────────────────

export async function cancelSessionBooking(
  tenantId:  string | null,
  sessionId: string,
  bookingId: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }
    if (session.tenantId !== tenantId) {
      throw new AppError(403, 'FORBIDDEN', 'Session does not belong to this tenant');
    }

    const booking = await tx.sessionBooking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.sessionId !== sessionId) {
      throw new AppError(404, 'SESSION_BOOKING_NOT_FOUND', `Session booking ${bookingId} not found`);
    }
    if (booking.status === 'CANCELLED') {
      throw new AppError(409, 'ALREADY_CANCELLED', 'Booking is already cancelled');
    }

    const updated = await tx.sessionBooking.update({
      where: { id: bookingId },
      data:  { status: 'CANCELLED' },
    });

    const newAttendees = Math.max(0, session.currentAttendees - 1);
    await tx.session.update({
      where: { id: sessionId },
      data:  {
        currentAttendees: newAttendees,
        // Reopen session if it was full and we just freed a spot
        ...(session.status === 'FULL' ? { status: 'OPEN' } : {}),
      },
    });

    logger.info('Session booking cancelled', { sessionId, bookingId });
    return updated;
  });

  return result;
}

// ─── listBookings ─────────────────────────────────────────────────────────────

export async function listSessionBookings(
  tenantId:  string | null,
  sessionId: string,
) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', `Session ${sessionId} not found`);
  }
  if (session.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Session does not belong to this tenant');
  }

  return prisma.sessionBooking.findMany({
    where: { sessionId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}
