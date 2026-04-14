/**
 * Analytics controller — Step 1.18
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic lives in analytics.service.ts.
 *
 * Auth / feature-flag enforcement is done at the router level.
 */
import { Request, Response, NextFunction } from 'express';

import * as analyticsService  from './analytics.service';
import { success, paginated } from '../../utils/apiResponse';
import { prisma }             from '../../lib/prisma';
import { AppError }           from '../../errors/AppError';
import type {
  TrackEventBody,
  OverviewQuery,
  LeadsAnalyticsQuery,
  BookingsAnalyticsQuery,
  RevenueAnalyticsQuery,
  EventsListQuery,
  ArtistsAnalyticsQuery,
  ServicesAnalyticsQuery,
  CustomersAnalyticsQuery,
  MyPerformanceQuery,
} from './analytics.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/analytics/events
 * Public — no auth required, gated by ANALYTICS_ENABLED feature flag.
 *
 * Records a single AnalyticsEvent row for frontend instrumentation.
 * The real client IP and User-Agent are extracted from the request so
 * the frontend does not need to supply them explicitly.
 */
export async function track(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body      = req.body as TrackEventBody;
    const ipAddress = (req.ip ?? req.socket.remoteAddress) || undefined;
    const userAgent = req.headers['user-agent'] || undefined;
    const result    = await analyticsService.trackEvent(body, ipAddress, userAgent);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/overview
 * ADMIN only.
 *
 * Returns a KPI summary across leads, bookings, revenue and waitlist.
 */
export async function overview(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query    = req.query as unknown as OverviewQuery;
    const tenantId = req.user?.tenantId ?? null;
    const result   = await analyticsService.getOverview(query, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/leads
 * ADMIN only.
 *
 * Returns lead funnel, attribution by source / country / device,
 * and score statistics for the requested period.
 */
export async function leads(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query    = req.query as unknown as LeadsAnalyticsQuery;
    const tenantId = req.user?.tenantId ?? null;
    const result   = await analyticsService.getLeadsAnalytics(query, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/bookings
 * ADMIN only.
 *
 * Returns booking stats by status, artist, service and day-of-week,
 * plus no-show and cancellation rates.
 */
export async function bookings(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query    = req.query as unknown as BookingsAnalyticsQuery;
    const tenantId = req.user?.tenantId ?? null;
    const result   = await analyticsService.getBookingsAnalytics(query, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/revenue
 * ADMIN only.
 *
 * Returns invoice revenue breakdown (paid / outstanding / overdue),
 * monthly trend and top-10 services by revenue.
 */
export async function revenue(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query    = req.query as unknown as RevenueAnalyticsQuery;
    const tenantId = req.user?.tenantId ?? null;
    const result   = await analyticsService.getRevenueAnalytics(query, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/events
 * ADMIN only.
 *
 * Returns a paginated, filterable log of raw AnalyticsEvent rows.
 */
export async function events(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = req.query as unknown as EventsListQuery;
    const result = await analyticsService.listEvents(query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/artists
 * ADMIN only. Revenue, commission, bookings per artist.
 */
export async function artists(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const query    = req.query as unknown as ArtistsAnalyticsQuery;
    const result   = await analyticsService.getArtistsAnalytics(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/services
 * ADMIN only. Revenue per service type.
 */
export async function services(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const query    = req.query as unknown as ServicesAnalyticsQuery;
    const result   = await analyticsService.getServicesAnalytics(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/customers
 * ADMIN only. New vs returning, top spenders, LTV distribution.
 */
export async function customers(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const query    = req.query as unknown as CustomersAnalyticsQuery;
    const result   = await analyticsService.getCustomersAnalytics(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/my-performance
 * ARTIST role — artist self-service performance stats.
 */
export async function myPerformance(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query  = req.query as unknown as MyPerformanceQuery;

    const artist = await prisma.artist.findUnique({
      where:  { userId },
      select: { id: true },
    });

    if (!artist) {
      throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist profile not found for this user');
    }

    const result = await analyticsService.getArtistPerformance(artist.id, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
