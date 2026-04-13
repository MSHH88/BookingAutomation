import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { config } from './config/index';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { success, error as apiError } from './utils/apiResponse';
import { AppError } from './errors/AppError';
import { authRoutes }  from './modules/auth/auth.routes';
import { artistRoutes } from './modules/artists/artists.routes';
import { styleRoutes }  from './modules/styles/styles.routes';
import { leadRoutes }   from './modules/leads/leads.routes';
import { quoteRoutes }   from './modules/quotes/quotes.routes';
import { bookingRoutes } from './modules/bookings/bookings.routes';
import { invoiceRoutes }  from './modules/invoices/invoices.routes';
import { captureRoutes }       from './modules/capture/capture.routes';
import { availabilityRoutes }  from './modules/availability/availability.routes';
import { serviceRoutes }       from './modules/services/services.routes';
import { uploadRoutes }        from './modules/uploads/uploads.routes';
import { notificationRoutes }  from './modules/notifications/notifications.routes';
import { waitlistRoutes }      from './modules/waitlist/waitlist.routes';
import { whatsappRoutes }      from './modules/whatsapp/whatsapp.routes';
import { analyticsRoutes }    from './modules/analytics/analytics.routes';
import { paymentsRoutes }     from './modules/payments/payments.routes';
import { tableRoutes }        from './modules/tables/tables.routes';
import { customerRoutes }     from './modules/customers/customers.routes';
import { adminRoutes }        from './modules/admin/admin.routes';
import { webhookRoutes }      from './modules/webhooks/webhooks.routes';
import { calendarRoutes }     from './modules/calendar/calendar.routes';
import { settingsRoutes }     from './modules/settings/settings.routes';
import { rolesRoutes }        from './modules/roles/roles.routes';
import { tenantRoutes }       from './modules/tenants/tenants.routes';
import { messagesRoutes }         from './modules/messages/messages.routes';
import { recurringBookingRoutes } from './modules/recurring-bookings/recurring-bookings.routes';
import { campaignRoutes }          from './modules/campaigns/campaigns.routes';
import { publicRoutes }            from './modules/public/public.routes';
import { socialRoutes }            from './modules/social/social.routes';
import { alertsRoutes }            from './modules/alerts/alerts.routes';
import { healthFlagsRoutes }       from './modules/health-flags/health-flags.routes';
import { formsRoutes }             from './modules/forms/forms.routes';
import { bookingPhotosRoutes }     from './modules/booking-photos/booking-photos.routes';
import { customerStatsRoutes }     from './modules/customer-stats/customer-stats.routes';
import { referralRoutes }          from './modules/referrals/referrals.routes';
import { giftCardsRoutes }         from './modules/gift-cards/gift-cards.routes';
import { productsRoutes }          from './modules/products/products.routes';
import { posRoutes }               from './modules/pos/pos.routes';
import { payrollRoutes }           from './modules/payroll/payroll.routes';
import {
  packagesRoutes,
  customerPackagesRoutes,
  myPackagesRoutes,
}                                  from './modules/packages/packages.routes';
import {
  membershipsRoutes,
  customerMembershipsRoutes,
  myMembershipsRoutes,
}                                  from './modules/memberships/memberships.routes';
import { loyaltyRoutes }           from './modules/loyalty/loyalty.routes';
import { rotaRoutes }              from './modules/rota/rota.routes';              // Phase 6.1
import { pushRoutes }              from './modules/push/push.routes';              // Phase 6.2
import { pricingRoutes }           from './modules/pricing/pricing.routes';        // Phase 8.1
import { aiRoutes }                from './modules/ai/ai.routes';                  // Phase 8.2
import { locationRoutes }          from './modules/locations/locations.routes';    // Phase 9.1
import { sessionRoutes }           from './modules/sessions/sessions.routes';      // Phase 9.2

const app = express();

// ─── Trust proxy ──────────────────────────────────────────────────────────────
// When running behind a reverse proxy (nginx, AWS ALB, etc.) in production,
// Express must trust the X-Forwarded-For header to get the real client IP.
if (config.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ─── 1. Security headers (helmet) ─────────────────────────────────────────────
app.use(helmet());

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (Postman, server-to-server, curl)
      if (!origin) return callback(null, true);
      if (config.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(
        new AppError(403, 'CORS_REJECTED', 'Origin not allowed by CORS policy'),
      );
    },
    credentials: true, // Required for httpOnly refresh-token cookies (Step 1.4+)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-Id'],
  }),
);

// ─── 3. Rate limiting ─────────────────────────────────────────────────────────
// /health is skipped so load-balancer probes never consume quota or trigger 429.
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // max requests per window per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req: Request) => req.path === '/health',
  handler: (_req: Request, res: Response) => {
    res.status(429).json(
      apiError('RATE_LIMIT_EXCEEDED', 'Too many requests — please try again later.'),
    );
  },
});
app.use(globalRateLimiter);

// ─── 4. Cookie parser ─────────────────────────────────────────────────────────
// Must come before body parser so cookies are available in all route handlers.
// Required for reading the httpOnly refreshToken cookie on /api/auth/refresh.
//
// CSRF note: Traditional CSRF tokens are not needed here because:
//  (a) The refresh-token cookie is set with SameSite=Strict — browsers will NOT
//      attach it to cross-origin requests, neutralising CSRF at the browser level.
//  (b) All state-changing, sensitive endpoints (/api/auth/logout, all /api/*
//      protected routes) additionally require an Authorization: Bearer <jwt>
//      header, which a CSRF attacker cannot forge.
//  (c) The API only accepts Content-Type: application/json bodies; browsers
//      cannot submit that type cross-origin without a CORS pre-flight, which our
//      CORS policy will reject for unknown origins.
app.use(cookieParser());

// ─── 5. Body parsers ──────────────────────────────────────────────────────────
// The Stripe webhook endpoint needs the RAW, un-parsed request body so that
// stripe.webhooks.constructEvent() can verify the HMAC signature.  We mount
// express.raw() on that specific path BEFORE express.json() so the webhook
// body is preserved as a Buffer, while every other route still gets parsed JSON.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// ─── 6. Request logger + correlation ID ──────────────────────────────────────
app.use(requestLogger);

// ─── 7. Health check ──────────────────────────────────────────────────────────
// Placed after security/CORS/body-parser middleware but exempt from rate limiting
// (via the skip function above) so load-balancer health probes are always served.
app.get('/health', (_req: Request, res: Response) => {
  res.json(
    success({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: config.NODE_ENV,
    }),
  );
});

// ─── 8. API route mounts ──────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);       // Step 1.4
app.use('/api/artists',  artistRoutes);     // Step 1.5
app.use('/api/styles',   styleRoutes);      // Step 1.6
app.use('/api/leads',    leadRoutes);       // Step 1.7
app.use('/api/quotes',   quoteRoutes);      // Step 1.8
app.use('/api/bookings', bookingRoutes);    // Step 1.9
app.use('/api/invoices', invoiceRoutes);    // Step 1.10
app.use('/api/capture',       captureRoutes);      // Step 1.11
app.use('/api/availability',  availabilityRoutes); // Step 1.12
app.use('/api/services',      serviceRoutes);      // Step 1.13
app.use('/api/uploads',       uploadRoutes);       // Step 1.14
app.use('/api/notifications', notificationRoutes); // Step 1.15
app.use('/api/waitlist',      waitlistRoutes);     // Step 1.16
app.use('/api/whatsapp',      whatsappRoutes);     // Step 1.17
app.use('/api/analytics',    analyticsRoutes);    // Step 1.18
app.use('/api/payments',     paymentsRoutes);      // Step 1.23
app.use('/api/tables',       tableRoutes);         // Step 1.24
app.use('/api/me',           customerRoutes);      // Step 1.25
app.use('/api/admin',        adminRoutes);          // Step 1.26
app.use('/api/webhooks',     webhookRoutes);        // Step 1.27
app.use('/api/calendar',     calendarRoutes);       // Step 1.28
app.use('/api/settings',     settingsRoutes);       // Step 1.29
app.use('/api/roles',        rolesRoutes);          // Phase 0 — Roles Management
app.use('/api/tenants',      tenantRoutes);         // Phase 0 — Multi-tenancy
app.use('/api/messages',           messagesRoutes);         // Phase 1 — Unified messages router
app.use('/api/recurring-bookings', recurringBookingRoutes); // Phase 1 — Recurring Bookings
app.use('/api/campaigns',          campaignRoutes);          // Phase 1 — Campaigns
app.use('/api/public',             publicRoutes);             // Phase 2 — Public Booking Widget
app.use('/api/social',             socialRoutes);             // Phase 2 — Social Booking Links
app.use('/api/alerts',             alertsRoutes);             // Phase 2 — CRM Alerts
app.use('/api/health-flags',      healthFlagsRoutes);        // Phase 3 — Health Flags
app.use('/api/forms',             formsRoutes);               // Phase 3 — Intake/Consent Forms
app.use('/api/booking-photos',    bookingPhotosRoutes);         // Phase 3 — Booking Photos
app.use('/api/customer-stats',   customerStatsRoutes);          // Phase 3 — Customer Stats/LTV
app.use('/api/referrals',        referralRoutes);               // Phase 3 — Referral Tracking
app.use('/api/gift-cards',       giftCardsRoutes);              // Phase 4 — Gift Cards
app.use('/api/products',         productsRoutes);               // Phase 4 — Inventory Management
app.use('/api/pos',              posRoutes);                    // Phase 4 — POS Mode
app.use('/api/payroll',          payrollRoutes);                 // Phase 4 — Staff Payroll
app.use('/api/packages',         packagesRoutes);               // Phase 5 — Service Packages
app.use('/api/customers/:customerId/packages', customerPackagesRoutes);  // Phase 5 — Customer packages (admin)
app.use('/api/memberships',      membershipsRoutes);            // Phase 5 — Memberships
app.use('/api/customers/:customerId/memberships', customerMembershipsRoutes); // Phase 5 — Customer memberships (admin)
app.use('/api/loyalty',          loyaltyRoutes);                // Phase 5 — Loyalty Points
app.use('/api/me/packages',      myPackagesRoutes);             // Phase 5 — My packages (customer portal)
app.use('/api/me/memberships',   myMembershipsRoutes);          // Phase 5 — My memberships (customer portal)
app.use('/api/rota',             rotaRoutes);                   // Phase 6.1 — Staff Rota
app.use('/api/push',             pushRoutes);                   // Phase 6.2 — Staff PWA Push Notifications
app.use('/api/pricing-rules',    pricingRoutes);                // Phase 8.1 — Dynamic Pricing
app.use('/api/ai',               aiRoutes);                     // Phase 8.2 — AI Suggestions
app.use('/api/locations',        locationRoutes);               // Phase 9.1 — Multi-Location
app.use('/api/sessions',         sessionRoutes);                // Phase 9.2 — Group/Class Bookings

// ─── 9. 404 — unknown route ───────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json(apiError('NOT_FOUND', 'Route not found'));
});

// ─── 10. Global error handler (MUST be last) ──────────────────────────────────
app.use(errorHandler);

export { app };
