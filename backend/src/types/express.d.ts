/**
 * Augments the Express Request type with custom properties
 * added by our requestLogger middleware.
 *
 * Using `express-serve-static-core` is the correct target because
 * @types/express re-exports its Request interface from there.
 */
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    /** Unique request ID (UUID v4) — set by requestLogger, returned in X-Request-Id header */
    id: string;
    /** Epoch ms when the request arrived — set by requestLogger, used to compute response duration */
    startTime: number;
  }
}
