/**
 * Public booking widget service — Phase 2.3
 *
 * Business logic for the public (no-auth) booking endpoints.
 * All functions take a tenant slug rather than JWT-based tenantId.
 *
 * ─── What this module does ───────────────────────────────────────────────────
 *
 *   getBusinessInfo(slug)         → studio name, address, settings, services
 *   getBusinessServices(slug)     → active services with categories and prices
 *   getBusinessArtists(slug, q)   → artists, optionally filtered by serviceId
 *   getBusinessSlots(slug, q)     → available time slots for a date/service/artist
 *   createPublicBooking(slug, b)  → anonymous booking with auto-created Customer
 *   getBookingByToken(token)      → booking lookup by public token (no auth)
 *
 * ─── Security ─────────────────────────────────────────────────────────────────
 *   - All functions are public (no JWT). Rate limiting + CAPTCHA on the router.
 *   - Booking creation generates a unique publicToken (UUID v4) for self-service.
 *   - Deposit enforcement: when DEPOSIT_REQUIRED, booking starts in AWAITING_DEPOSIT.
 */
import { randomUUID } from 'crypto';
import { Prisma }     from '@prisma/client';

import { prisma }       from '../../lib/prisma';
import { AppError }     from '../../errors/AppError';
import { logger }       from '../../utils/logger';
import { getDefaultFlags } from '../../config/businessType';
import { enqueueWebhookEvent } from '../webhooks/webhooks.queue';
import type {
  GetBusinessArtistsQuery,
  GetBusinessSlotsQuery,
  CreatePublicBookingBody,
} from './public.schema';

// ─── Internal: resolve tenant by slug ─────────────────────────────────────────

async function resolveTenant(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id:           true,
      slug:         true,
      name:         true,
      businessType: true,
      isActive:     true,
    },
  });

  if (!tenant || !tenant.isActive) {
    throw new AppError(404, 'BUSINESS_NOT_FOUND', `No active business found for slug "${slug}"`);
  }

  return tenant;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/public/businesses/:slug
 * Returns public studio info: name, address, settings.
 */
export async function getBusinessInfo(slug: string) {
  const tenant = await resolveTenant(slug);

  const settings = await prisma.studioSettings.findUnique({
    where: { tenantId: tenant.id },
    select: {
      studioName:        true,
      studioEmail:       true,
      studioPhone:       true,
      studioAddress:     true,
      studioTimezone:    true,
      currency:          true,
      slotIntervalMinutes: true,
      bookingPageUrl:    true,
    },
  });

  return {
    slug:         tenant.slug,
    name:         settings?.studioName ?? tenant.name,
    businessType: tenant.businessType,
    email:        settings?.studioEmail ?? null,
    phone:        settings?.studioPhone ?? null,
    address:      settings?.studioAddress ?? null,
    timezone:     settings?.studioTimezone ?? 'Europe/London',
    currency:     settings?.currency ?? 'GBP',
  };
}

/**
 * GET /api/public/businesses/:slug/services
 * Returns active services with categories and prices.
 */
export async function getBusinessServices(slug: string) {
  const tenant = await resolveTenant(slug);

  const services = await prisma.service.findMany({
    where:   { tenantId: tenant.id, isActive: true },
    select: {
      id:              true,
      name:            true,
      description:     true,
      durationMinutes: true,
      priceFrom:       true,
      category:        { select: { id: true, name: true } },
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
  });

  return services;
}

/**
 * GET /api/public/businesses/:slug/artists
 * Returns active artists, optionally filtered by serviceId.
 */
export async function getBusinessArtists(slug: string, query: GetBusinessArtistsQuery) {
  const tenant = await resolveTenant(slug);

  const where: Prisma.ArtistWhereInput = {
    tenantId: tenant.id,
    isActive: true,
  };

  if (query.serviceId) {
    where.services = { some: { serviceId: query.serviceId } };
  }

  const artists = await prisma.artist.findMany({
    where,
    select: {
      id:              true,
      slug:            true,
      bio:             true,
      profileImageUrl: true,
      user:            { select: { name: true } },
      services:        { select: { serviceId: true, customPrice: true } },
    },
    orderBy: { slug: 'asc' },
  });

  return artists;
}

/**
 * GET /api/public/businesses/:slug/slots
 * Returns available time slots for a given date, service, and artist.
 */
export async function getBusinessSlots(slug: string, query: GetBusinessSlotsQuery) {
  const tenant = await resolveTenant(slug);

  // Validate artist belongs to tenant
  const artist = await prisma.artist.findFirst({
    where: { id: query.artistId, tenantId: tenant.id, isActive: true },
    select: { id: true, slotDuration: true, bufferMinutes: true },
  });

  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist not found for this business');
  }

  // Validate service belongs to tenant
  const service = await prisma.service.findFirst({
    where: { id: query.serviceId, tenantId: tenant.id, isActive: true },
    select: { id: true, durationMinutes: true, bufferMinutes: true },
  });

  if (!service) {
    throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found for this business');
  }

  // Parse date and get day of week (0=Sunday)
  const dateStr = query.date;
  const dateObj = new Date(`${dateStr}T00:00:00Z`);
  const dayOfWeek = dateObj.getUTCDay();

  // Get artist availability for that day
  const schedule = await prisma.artistAvailability.findUnique({
    where: { artistId_dayOfWeek: { artistId: artist.id, dayOfWeek } },
    select: { startTime: true, endTime: true, breakStart: true, breakEnd: true, isActive: true },
  });

  if (!schedule || !schedule.isActive) {
    return []; // Artist not available on this day
  }

  // Generate candidate slots
  const slotDuration = service.durationMinutes;
  const buffer       = service.bufferMinutes ?? 0;
  const stepMinutes  = slotDuration + buffer;

  const dayStart = parseTimeToMinutes(schedule.startTime);
  const dayEnd   = parseTimeToMinutes(schedule.endTime);
  const breakStartMin = schedule.breakStart ? parseTimeToMinutes(schedule.breakStart) : null;
  const breakEndMin   = schedule.breakEnd   ? parseTimeToMinutes(schedule.breakEnd)   : null;

  const candidates: Array<{ startAt: string; endAt: string }> = [];

  for (let m = dayStart; m + slotDuration <= dayEnd; m += stepMinutes) {
    const slotStart = m;
    const slotEnd   = m + slotDuration;

    // Skip slots that overlap break
    if (breakStartMin !== null && breakEndMin !== null) {
      if (slotStart < breakEndMin && slotEnd > breakStartMin) continue;
    }

    const startAt = minutesToIso(dateStr, slotStart);
    const endAt   = minutesToIso(dateStr, slotEnd);
    candidates.push({ startAt, endAt });
  }

  // Remove slots that overlap existing CONFIRMED or RESCHEDULED bookings
  const existingBookings = await prisma.booking.findMany({
    where: {
      artistId: artist.id,
      status:   { in: ['CONFIRMED', 'RESCHEDULED', 'AWAITING_DEPOSIT'] },
      startAt:  { lt: new Date(`${dateStr}T23:59:59Z`) },
      endAt:    { gt: new Date(`${dateStr}T00:00:00Z`) },
    },
    select: { startAt: true, endAt: true },
  });

  // Remove slots that overlap availability blocks
  const blocks = await prisma.availabilityBlock.findMany({
    where: {
      artistId: artist.id,
      startAt:  { lt: new Date(`${dateStr}T23:59:59Z`) },
      endAt:    { gt: new Date(`${dateStr}T00:00:00Z`) },
    },
    select: { startAt: true, endAt: true },
  });

  const allBlocked = [...existingBookings, ...blocks];

  const available = candidates.filter((slot) => {
    const sStart = new Date(slot.startAt).getTime();
    const sEnd   = new Date(slot.endAt).getTime();

    return !allBlocked.some((b) => {
      const bStart = new Date(b.startAt).getTime();
      const bEnd   = new Date(b.endAt).getTime();
      return sStart < bEnd && sEnd > bStart;
    });
  });

  return available;
}

/**
 * POST /api/public/businesses/:slug/bookings
 * Creates an anonymous booking. Auto-creates or matches Customer by phone/email.
 */
export async function createPublicBooking(slug: string, body: CreatePublicBookingBody) {
  const tenant = await resolveTenant(slug);

  // Validate artist belongs to tenant
  const artist = await prisma.artist.findFirst({
    where: { id: body.artistId, tenantId: tenant.id, isActive: true },
    select: { id: true },
  });

  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist not found for this business');
  }

  // Validate service belongs to tenant
  const service = await prisma.service.findFirst({
    where: { id: body.serviceId, tenantId: tenant.id, isActive: true },
    select: { id: true, durationMinutes: true, priceFrom: true },
  });

  if (!service) {
    throw new AppError(404, 'SERVICE_NOT_FOUND', 'Service not found for this business');
  }

  // Validate artist provides this service
  const artistService = await prisma.artistService.findFirst({
    where: { artistId: body.artistId, serviceId: body.serviceId },
  });

  if (!artistService) {
    throw new AppError(400, 'ARTIST_SERVICE_MISMATCH', 'Artist does not provide this service');
  }

  // Validate booking duration matches service duration
  const requestedDurationMs = new Date(body.endAt).getTime() - new Date(body.startAt).getTime();
  const expectedDurationMs  = service.durationMinutes * 60 * 1000;
  if (requestedDurationMs !== expectedDurationMs) {
    throw new AppError(
      400,
      'DURATION_MISMATCH',
      `Booking duration must be ${service.durationMinutes} minutes`,
    );
  }

  // Find or create customer by email
  let customer = await prisma.user.findFirst({
    where: { email: body.email, tenantId: tenant.id, role: 'CUSTOMER' },
    select: { id: true },
  });

  if (!customer) {
    customer = await prisma.user.create({
      data: {
        email:        body.email,
        name:         body.name,
        phone:        body.phone,
        passwordHash: '', // Public customers don't have passwords
        role:         'CUSTOMER',
        tenantId:     tenant.id,
      },
      select: { id: true },
    });
  }

  // Check deposit enforcement
  const flags = getDefaultFlags();
  const depositRequired = flags['DEPOSIT_REQUIRED'];
  const initialStatus = depositRequired ? 'AWAITING_DEPOSIT' : 'PENDING';

  // Generate public token for self-service lookup
  const publicToken = randomUUID();

  // Calculate total amount from service price
  const totalAmount = service.priceFrom ? Number(service.priceFrom) : null;

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      tenantId:             tenant.id,
      artistId:             body.artistId,
      serviceId:            body.serviceId,
      customerId:           customer.id,
      startAt:              new Date(body.startAt),
      endAt:                new Date(body.endAt),
      status:               initialStatus,
      publicToken,
      source:               body.source ?? 'WIDGET',
      notes:                body.notes ?? null,
      partySize:            body.partySize ?? null,
      tableId:              body.tableId ?? null,
      totalAmount:          totalAmount,
      totalDurationMinutes: service.durationMinutes,
    },
    select: {
      id:           true,
      status:       true,
      publicToken:  true,
      startAt:      true,
      endAt:        true,
      source:       true,
      createdAt:    true,
      artist:       { select: { id: true, slug: true, user: { select: { name: true } } } },
      service:      { select: { id: true, name: true, durationMinutes: true, priceFrom: true } },
    },
  });

  // Fire webhook
  enqueueWebhookEvent('booking.created', {
    bookingId:  booking.id,
    source:     booking.source,
    tenantSlug: slug,
  }).catch((err: unknown) => {
    logger.error('Public booking webhook failed', {
      bookingId: booking.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  logger.info('Public booking created', {
    bookingId: booking.id,
    tenantSlug: slug,
    source: booking.source,
    status: booking.status,
  });

  return {
    ...booking,
    depositRequired,
  };
}

/**
 * GET /api/public/bookings/:token
 * Lookup a booking by its public token. No auth required.
 */
export async function getBookingByToken(token: string) {
  // Validate UUID format to prevent enumeration attacks
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    throw new AppError(400, 'INVALID_TOKEN', 'Invalid token format');
  }

  const booking = await prisma.booking.findUnique({
    where: { publicToken: token },
    select: {
      id:           true,
      status:       true,
      startAt:      true,
      endAt:        true,
      notes:        true,
      depositAmount:   true,
      depositPaidAt:   true,
      publicToken:     true,
      source:          true,
      confirmedAt:     true,
      cancelledAt:     true,
      cancelReason:    true,
      createdAt:       true,
      artist:   { select: { id: true, slug: true, user: { select: { name: true } } } },
      service:  { select: { id: true, name: true, durationMinutes: true, priceFrom: true } },
      tenant:   { select: { slug: true, name: true } },
    },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'No booking found for this token');
  }

  return booking;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToIso(dateStr: string, minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${dateStr}T${h}:${m}:00Z`;
}
