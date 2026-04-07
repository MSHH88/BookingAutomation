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
import type {
  TrackEventBody,
  OverviewQuery,
  LeadsAnalyticsQuery,
  BookingsAnalyticsQuery,
  RevenueAnalyticsQuery,
  EventsListQuery,
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
    const query  = req.query as unknown as OverviewQuery;
    const result = await analyticsService.getOverview(query);
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
    const query  = req.query as unknown as LeadsAnalyticsQuery;
    const result = await analyticsService.getLeadsAnalytics(query);
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
    const query  = req.query as unknown as BookingsAnalyticsQuery;
    const result = await analyticsService.getBookingsAnalytics(query);
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
    const query  = req.query as unknown as RevenueAnalyticsQuery;
    const result = await analyticsService.getRevenueAnalytics(query);
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
