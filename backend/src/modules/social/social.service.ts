/**
 * Social booking link service — Phase 2.4
 *
 * Generates shareable booking URLs for social media platforms and
 * provides booking source analytics.
 *
 * ─── What this module does ───────────────────────────────────────────────────
 *
 *   getBookingLink(tenantId, query)
 *     Generates a booking URL for the tenant with platform-specific UTM params.
 *     For Facebook: includes `?source=facebook` UTM.
 *     For Instagram: includes `?source=instagram` UTM.
 *     For generic: plain URL with `?source=direct`.
 *
 *   getBookingSources(tenantId, query)
 *     Aggregates booking counts grouped by source (DIRECT, INSTAGRAM, etc.)
 *     within an optional date range. Used in the CRM dashboard.
 */
import { Prisma } from '@prisma/client';

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import type { GetBookingLinkQuery, GetBookingSourcesQuery } from './social.schema';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/social/booking-link
 * Generates a shareable booking URL with platform-specific UTM params.
 */
export async function getBookingLink(tenantId: string, query: GetBookingLinkQuery) {
  // Fetch tenant slug for URL generation
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { slug: true, name: true },
  });

  if (!tenant) {
    throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }

  // Fetch booking page URL from settings (fallback to convention)
  const settings = await prisma.studioSettings.findUnique({
    where:  { tenantId },
    select: { bookingPageUrl: true },
  });

  const baseUrl = settings?.bookingPageUrl ?? `/book/${tenant.slug}`;
  const platform = query.platform ?? 'generic';

  // Build platform-specific URL
  let bookingUrl: string;
  let utmSource: string;

  switch (platform) {
    case 'instagram':
      utmSource = 'instagram';
      bookingUrl = `${baseUrl}?source=instagram&utm_source=instagram&utm_medium=social&utm_campaign=book_now`;
      break;
    case 'facebook':
      utmSource = 'facebook';
      bookingUrl = `${baseUrl}?source=facebook&utm_source=facebook&utm_medium=social&utm_campaign=book_now`;
      break;
    default:
      utmSource = 'direct';
      bookingUrl = `${baseUrl}?source=direct`;
      break;
  }

  logger.info('Booking link generated', { tenantSlug: tenant.slug, platform, utmSource });

  return {
    url:       bookingUrl,
    slug:      tenant.slug,
    platform,
    utmSource,
    studioName: tenant.name,
  };
}

/**
 * GET /api/social/sources
 * Aggregates booking counts by source within an optional date range.
 */
export async function getBookingSources(tenantId: string, query: GetBookingSourcesQuery) {
  const where: Prisma.BookingWhereInput = { tenantId };

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(query.from);
    if (query.to)   (where.createdAt as Prisma.DateTimeFilter).lte = new Date(query.to);
  }

  const sources = await prisma.booking.groupBy({
    by:     ['source'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const total = sources.reduce((sum, s) => sum + s._count.id, 0);

  return {
    total,
    sources: sources.map((s) => ({
      source:     s.source,
      count:      s._count.id,
      percentage: total > 0 ? Math.round((s._count.id / total) * 10000) / 100 : 0,
    })),
  };
}
