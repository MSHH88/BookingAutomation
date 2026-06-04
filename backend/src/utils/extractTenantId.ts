/**
 * extractTenantId — tenant ID extraction utility.
 *
 * Replaces the `req.user!.tenantId!` non-null assertion pattern throughout
 * controllers. Reads the tenantId from the authenticated request user and
 * returns it as `string | null` rather than `string | null | undefined`.
 *
 * Usage:
 *   import { extractTenantId } from '../../utils/extractTenantId';
 *   const tenantId = extractTenantId(req);
 */
import type { Request } from 'express';

/**
 * Returns the tenantId from the authenticated request user.
 * Returns `null` when the user is a SUPER_ADMIN or for backward-compatible
 * single-tenant tokens.
 */
export function extractTenantId(req: Request): string | null {
  return req.user?.tenantId ?? null;
}
