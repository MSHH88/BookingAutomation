/**
 * Augments the Express Request type with custom properties added by our
 * middleware stack.
 *
 * Using `express-serve-static-core` is the correct target because
 * @types/express re-exports its Request interface from there.
 *
 * NOTE: We intentionally do NOT import Role from @prisma/client here.
 * Importing from @prisma/client in a declaration file means the entire
 * augmentation silently fails when prisma client is not yet generated
 * (e.g. fresh clone before `npm install`), producing the misleading error
 * "Property 'user' does not exist on type 'Request'".
 * The string-literal union below is structurally identical to the Prisma enum
 * and avoids that dependency.
 */
import 'express';

/** Mirror of the Prisma Role enum — kept in sync with prisma/schema.prisma */
type AppRole = 'ADMIN' | 'ARTIST' | 'CUSTOMER';

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
      role: AppRole;
    };
    /**
     * Parsed cookies — populated by the cookie-parser middleware.
     * Individual values are strings or undefined.
     */
    cookies: Record<string, string | undefined>;
  }
}
