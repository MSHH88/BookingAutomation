/**
 * Analytics router — Step 1.18
 *
 * | Method | Path                        | Auth  | Feature Flag       | Description                        |
 * |--------|-----------------------------|-------|--------------------|------------------------------------|
 * | POST   | /api/analytics/events       | None  | ANALYTICS_ENABLED  | Track a frontend event             |
 * | GET    | /api/analytics/overview     | ADMIN | ANALYTICS_ENABLED  | KPI summary dashboard              |
 * | GET    | /api/analytics/leads        | ADMIN | ANALYTICS_ENABLED  | Lead funnel + attribution          |
 * | GET    | /api/analytics/bookings     | ADMIN | ANALYTICS_ENABLED  | Booking breakdown                  |
 * | GET    | /api/analytics/revenue      | ADMIN | ANALYTICS_ENABLED  | Revenue metrics + monthly trend    |
 * | GET    | /api/analytics/events       | ADMIN | ANALYTICS_ENABLED  | Paginated raw event log            |
 *
 * Architecture:
 *   - All routes are gated behind the ANALYTICS_ENABLED feature flag.
 *   - POST /events is intentionally public (no requireAuth) so the frontend
 *     can track events before the user is logged in.
 *   - All GET routes require ADMIN role.
 *   - Query validation uses the `validate` middleware so schema errors return
 *     a consistent 422 VALIDATION_ERROR response.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl          from './analytics.controller';
import {
  trackEventSchema,
  overviewQuerySchema,
  leadsAnalyticsQuerySchema,
  bookingsAnalyticsQuerySchema,
  revenueAnalyticsQuerySchema,
  eventsListQuerySchema,
  artistsAnalyticsQuerySchema,
  servicesAnalyticsQuerySchema,
  customersAnalyticsQuerySchema,
  myPerformanceQuerySchema,
} from './analytics.schema';

const router = Router();

// ── All analytics routes require the ANALYTICS_ENABLED feature flag ───────────
router.use(requireFeature('ANALYTICS_ENABLED'));

// ── Public — POST /api/analytics/events ──────────────────────────────────────
/**
 * POST /api/analytics/events
 * No auth required — allows tracking events from anonymous visitors.
 * The event type is automatically normalised to SCREAMING_SNAKE_CASE.
 */
router.post(
  '/events',
  validate(trackEventSchema),
  ctrl.track,
);

// ── Admin-only routes ─────────────────────────────────────────────────────────
router.use(requireAuth);

/**
 * GET /api/analytics/my-performance
 * ARTIST role only — must come before requireRole('ADMIN').
 */
router.get(
  '/my-performance',
  requireRole('ARTIST'),
  validate(myPerformanceQuerySchema),
  ctrl.myPerformance,
);

router.use(requireRole('ADMIN'));

/**
 * GET /api/analytics/overview
 * Query: { from?, to? }
 * Returns a KPI summary: leads, bookings, revenue, waitlist, and WhatsApp
 * message counts for the requested date range (default: last 30 days).
 */
router.get(
  '/overview',
  validate(overviewQuerySchema),
  ctrl.overview,
);

/**
 * GET /api/analytics/leads
 * Query: { from?, to?, artistId?, businessType? }
 * Returns lead funnel breakdown, top UTM sources, countries, device types,
 * and score statistics.
 */
router.get(
  '/leads',
  validate(leadsAnalyticsQuerySchema),
  ctrl.leads,
);

/**
 * GET /api/analytics/bookings
 * Query: { from?, to?, artistId? }
 * Returns booking counts by status, artist, service, day-of-week,
 * average duration, and no-show / cancellation rates.
 */
router.get(
  '/bookings',
  validate(bookingsAnalyticsQuerySchema),
  ctrl.bookings,
);

/**
 * GET /api/analytics/revenue
 * Query: { from?, to? }
 * Returns invoice summary (paid / outstanding / overdue), monthly revenue
 * trend, top-10 services by revenue, and average invoice value.
 */
router.get(
  '/revenue',
  validate(revenueAnalyticsQuerySchema),
  ctrl.revenue,
);

/**
 * GET /api/analytics/events
 * Query: { from?, to?, eventType?, leadId?, page?, limit? }
 * Returns a paginated, filterable log of raw AnalyticsEvent rows.
 */
router.get(
  '/events',
  validate(eventsListQuerySchema),
  ctrl.events,
);

/**
 * GET /api/analytics/artists
 * ADMIN only. Revenue, commission, bookings per artist.
 */
router.get(
  '/artists',
  validate(artistsAnalyticsQuerySchema),
  ctrl.artists,
);

/**
 * GET /api/analytics/services
 * ADMIN only. Revenue per service type.
 */
router.get(
  '/services',
  validate(servicesAnalyticsQuerySchema),
  ctrl.services,
);

/**
 * GET /api/analytics/customers
 * ADMIN only. New vs returning, top spenders, LTV distribution.
 */
router.get(
  '/customers',
  validate(customersAnalyticsQuerySchema),
  ctrl.customers,
);

export { router as analyticsRoutes };
