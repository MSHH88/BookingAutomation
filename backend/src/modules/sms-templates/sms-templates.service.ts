/**
 * SMS Templates service — Phase 1 (Messaging Foundation)
 *
 * Business logic for the SMS Templates admin API.
 *
 * Redis caching strategy:
 *   - Key pattern: `sms_template:{tenantId}:{key}`
 *   - TTL: 5 minutes (300 seconds)
 *   - Cache is populated on `getTemplateByKey` miss, invalidated on `updateTemplate`
 *   - Redis failures are non-fatal (fire-and-forget): the service falls through
 *     to DB on read failure, and logs-but-continues on write/delete failure.
 *
 * Rendering:
 *   Uses the shared template-renderer for plain-text {{variable}} interpolation
 *   (no Handlebars — SMS is plain text only).
 *
 * Functions:
 *   listTemplates       — paginated list for tenant, ordered by key asc
 *   getTemplateByKey    — Redis-cached lookup, falls back to DB
 *   updateTemplate      — update + invalidate cache
 *   renderSmsTemplate   — load template + interpolate variables
 *   previewTemplate     — render with sample variables
 */
import { prisma } from '../../lib/prisma';
import { getRedis } from '../../lib/redis';
import { AppError } from '../../errors/AppError';
import { logger } from '../../utils/logger';
import { paginate } from '../../utils/paginate';
import { renderTemplate as interpolate } from '../../lib/template-renderer';
import type { PaginateParams, PaginatedResult } from '../../utils/paginate';
import type { ListSmsTemplatesQuery, UpdateSmsTemplateBody } from './sms-templates.schema';

// ─── Cache configuration ──────────────────────────────────────────────────────

const CACHE_PREFIX = 'sms_template';
const CACHE_TTL = 300; // seconds (5 minutes)

/** Builds the Redis cache key for a specific template. */
function cacheKey(tenantId: string, key: string): string {
  return `${CACHE_PREFIX}:${tenantId}:${key}`;
}

// ─── listTemplates ────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of SMS templates for a tenant.
 *
 * Supports optional `isActive` filter.
 * Results are ordered by key ascending for stable pagination.
 *
 * @param tenantId - The tenant the templates belong to.
 * @param query    - Query parameters: isActive, page, limit.
 */
export async function listTemplates(
  tenantId: string,
  query: ListSmsTemplatesQuery,
): Promise<PaginatedResult<unknown>> {
  const where: Record<string, unknown> = { tenantId };

  if (query.isActive !== undefined) {
    where['isActive'] = query.isActive === 'true';
  }

  const params: PaginateParams = {
    page: query.page,
    limit: query.limit,
  };

  return paginate(
    prisma.smsTemplate,
    { where, orderBy: { key: 'asc' } },
    params,
  );
}

// ─── getTemplateByKey ─────────────────────────────────────────────────────────

/**
 * Fetches a single SMS template by tenant + key.
 *
 * Cache strategy:
 *  1. Attempt Redis GET.
 *  2. On hit → parse and return.
 *  3. On miss → query DB, populate cache, return.
 *  4. Redis errors are non-fatal.
 *
 * @throws AppError 404 when no template matches the tenant + key combination.
 */
export async function getTemplateByKey(
  tenantId: string,
  key: string,
): Promise<Record<string, unknown>> {
  const redis = getRedis();
  const ck = cacheKey(tenantId, key);

  // 1 — Try cache
  try {
    const cached = await redis.get(ck);
    if (cached !== null) {
      return JSON.parse(cached) as Record<string, unknown>;
    }
  } catch (err) {
    logger.warn('[SmsTemplates] Redis GET failed, falling through to DB', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2 — Cache miss: fetch from DB
  const template = await prisma.smsTemplate.findFirst({
    where: { tenantId, key },
  });

  if (!template) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', `SMS template '${key}' not found`);
  }

  // 3 — Populate cache (non-fatal on error)
  try {
    await redis.set(ck, JSON.stringify(template), 'EX', CACHE_TTL);
  } catch (err) {
    logger.warn('[SmsTemplates] Redis SET failed, continuing without cache', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return template as unknown as Record<string, unknown>;
}

// ─── updateTemplate ───────────────────────────────────────────────────────────

/**
 * Updates an existing SMS template and invalidates the Redis cache.
 *
 * Only supplied fields are overwritten; absent fields are left unchanged.
 *
 * @throws AppError 404 when no template matches the tenant + key combination.
 */
export async function updateTemplate(
  tenantId: string,
  key: string,
  body: UpdateSmsTemplateBody,
): Promise<Record<string, unknown>> {
  // Verify the template exists
  const existing = await prisma.smsTemplate.findFirst({
    where: { tenantId, key },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', `SMS template '${key}' not found`);
  }

  const updated = await prisma.smsTemplate.update({
    where: { id: existing.id },
    data: body,
  });

  // Invalidate cache (non-fatal)
  try {
    const redis = getRedis();
    await redis.del(cacheKey(tenantId, key));
  } catch (err) {
    logger.warn('[SmsTemplates] Redis DEL failed after update, cache may be stale', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return updated as unknown as Record<string, unknown>;
}

// ─── renderSmsTemplate ────────────────────────────────────────────────────────

/**
 * Loads an SMS template by key and interpolates the provided variables.
 *
 * Uses the shared `renderTemplate` from `../../lib/template-renderer` for safe
 * {{variable}} interpolation (no Handlebars helpers/partials — SMS is plain text).
 *
 * @param tenantId  - The tenant the template belongs to.
 * @param key       - Template key identifier.
 * @param variables - Key-value map of variable names to their string values.
 * @returns The rendered message string.
 * @throws AppError 404 when no template matches the tenant + key combination.
 */
export async function renderSmsTemplate(
  tenantId: string,
  key: string,
  variables: Record<string, string>,
): Promise<string> {
  const template = await getTemplateByKey(tenantId, key);
  return interpolate(template['body'] as string, variables);
}

// ─── previewTemplate ──────────────────────────────────────────────────────────

/**
 * Renders a preview of an SMS template with sample variables.
 *
 * Same as `renderSmsTemplate` but explicitly named for the preview endpoint,
 * returning both the rendered text and template metadata.
 *
 * @param tenantId  - The tenant the template belongs to.
 * @param key       - Template key identifier.
 * @param variables - Key-value map of variable names to their string values.
 * @returns Object with the rendered preview and template key.
 * @throws AppError 404 when no template matches.
 */
export async function previewTemplate(
  tenantId: string,
  key: string,
  variables: Record<string, string>,
): Promise<{ key: string; rendered: string }> {
  const rendered = await renderSmsTemplate(tenantId, key, variables);
  return { key, rendered };
}
