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
import { invoiceRoutes } from './modules/invoices/invoices.routes';

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

// ─── 9. 404 — unknown route ───────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json(apiError('NOT_FOUND', 'Route not found'));
});

// ─── 10. Global error handler (MUST be last) ──────────────────────────────────
app.use(errorHandler);

export { app };
