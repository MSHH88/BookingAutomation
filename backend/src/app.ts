import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { config } from './config/index';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { success, error as apiError } from './utils/apiResponse';
import { AppError } from './errors/AppError';

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

// ─── 4. Body parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ─── 5. Request logger + correlation ID ──────────────────────────────────────
app.use(requestLogger);

// ─── 6. Health check ──────────────────────────────────────────────────────────
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

// ─── 7. API route mounts (added per step) ────────────────────────────────────
// app.use('/api/auth',     authRoutes);      // Step 1.4
// app.use('/api/artists',  artistRoutes);    // Step 1.5
// app.use('/api/leads',    leadRoutes);      // Step 1.6
// …

// ─── 8. 404 — unknown route ───────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json(apiError('NOT_FOUND', 'Route not found'));
});

// ─── 9. Global error handler (MUST be last) ───────────────────────────────────
app.use(errorHandler);

export { app };
