/**
 * Augments the Express Request type with custom properties added by our
 * middleware stack.
 *
 * Using `express-serve-static-core` is the correct target because
 * @types/express re-exports its Request interface from there.
 */
import 'express';
import type { Role } from '@prisma/client';

declare module 'express-serve-static-core' {
  interface Request {
    /** Unique request ID (UUID v4) — set by requestLogger, returned in X-Request-Id header */
    id: string;
    /** Epoch ms when the request arrived — set by requestLogger, used to compute response duration */
    startTime: number;
    /**
     * Decoded JWT payload — set by requireAuth middleware.
     * Undefined on public (unauthenticated) routes.
     */
    user?: {
      /** User's Prisma cuid */
      id: string;
      email: string;
      role: Role;
    };
    /**
     * Parsed cookies — populated by the cookie-parser middleware.
     * Individual values are strings or undefined.
     */
    cookies: Record<string, string | undefined>;
  }
}
