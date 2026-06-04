/**
 * Email Templates service — Phase 1 (Messaging Foundation)
 *
 * Business logic for the Email Templates admin API.
 *
 * Redis caching strategy:
 *   - Key pattern: `email_template:{tenantId}:{key}`
 *   - TTL: 5 minutes (300 seconds)
 *   - Cache is populated on `getTemplateByKey` miss, invalidated on `updateTemplate`
 *   - Redis failures are non-fatal (fire-and-forget): the service falls through
 *     to DB on read failure, and logs-but-continues on write/delete failure.
 *
 * Rendering:
 *   Uses Handlebars for HTML rendering (supports expressions, escaping).
 *   Subject lines are rendered with the shared template-renderer (plain text).
 *
 * Functions:
 *   listTemplates     — paginated list for tenant, ordered by key asc (4 tests)
 *   getTemplateByKey  — Redis-cached lookup, falls back to DB (5 tests)
 *   updateTemplate    — update + invalidate cache (4 tests)
 *   renderEmailTemplate — load template + render subject and htmlBody (3 tests)
 *   previewTemplate   — render with sample variables (3 tests)
 *
 * Total: 19 unit tests across 5 describes
 */
import Handlebars from 'handlebars';

import { prisma } from '../../lib/prisma';
import { getRedis } from '../../lib/redis';
import { AppError } from '../../errors/AppError';
import { logger } from '../../utils/logger';
import { paginate } from '../../utils/paginate';
import { renderTemplate as interpolate } from '../../lib/template-renderer';
import type { PaginateParams, PaginatedResult } from '../../utils/paginate';
import type { ListEmailTemplatesQuery, UpdateEmailTemplateBody } from './email-templates.schema';

// ─── Cache configuration ──────────────────────────────────────────────────────

const CACHE_PREFIX = 'email_template';
const CACHE_TTL = 300; // seconds (5 minutes)

/** Builds the Redis cache key for a specific template. */
function cacheKey(tenantId: string, key: string): string {
  return `${CACHE_PREFIX}:${tenantId}:${key}`;
}

// ─── listTemplates ────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of email templates for a tenant.
 *
 * Supports optional `isActive` filter.
 * Results are ordered by key ascending for stable pagination.
 *
 * @param tenantId - The tenant the templates belong to.
 * @param query    - Query parameters: isActive, page, limit.
 */
export async function listTemplates(
  tenantId: string,
  query: ListEmailTemplatesQuery,
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
    prisma.emailTemplate,
    { where, orderBy: { key: 'asc' } },
    params,
  );
}

// ─── getTemplateByKey ─────────────────────────────────────────────────────────

/**
 * Fetches a single email template by tenant + key.
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
    logger.warn('[EmailTemplates] Redis GET failed, falling through to DB', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2 — Cache miss: fetch from DB
  const template = await prisma.emailTemplate.findFirst({
    where: { tenantId, key },
  });

  if (!template) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Email template '${key}' not found`);
  }

  // 3 — Populate cache (non-fatal on error)
  try {
    await redis.set(ck, JSON.stringify(template), 'EX', CACHE_TTL);
  } catch (err) {
    logger.warn('[EmailTemplates] Redis SET failed, continuing without cache', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return template as unknown as Record<string, unknown>;
}

// ─── updateTemplate ───────────────────────────────────────────────────────────

/**
 * Updates an existing email template and invalidates the Redis cache.
 *
 * Only supplied fields are overwritten; absent fields are left unchanged.
 *
 * @throws AppError 404 when no template matches the tenant + key combination.
 */
export async function updateTemplate(
  tenantId: string,
  key: string,
  body: UpdateEmailTemplateBody,
): Promise<Record<string, unknown>> {
  // Verify the template exists
  const existing = await prisma.emailTemplate.findFirst({
    where: { tenantId, key },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Email template '${key}' not found`);
  }

  const updated = await prisma.emailTemplate.update({
    where: { id: existing.id },
    data: body,
  });

  // Invalidate cache (non-fatal)
  try {
    const redis = getRedis();
    await redis.del(cacheKey(tenantId, key));
  } catch (err) {
    logger.warn('[EmailTemplates] Redis DEL failed after update, cache may be stale', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return updated as unknown as Record<string, unknown>;
}

// ─── renderEmailTemplate ──────────────────────────────────────────────────────

/**
 * Loads an email template by key and renders both subject and htmlBody.
 *
 * - Subject is rendered with the shared plain-text `renderTemplate` from
 *   `../../lib/template-renderer` (no HTML escaping needed for subject lines).
 * - htmlBody is rendered with Handlebars, which auto-escapes HTML special
 *   characters in variable values to prevent XSS.
 *
 * @param tenantId  - The tenant the template belongs to.
 * @param key       - Template key identifier.
 * @param variables - Key-value map of variable names to their string values.
 * @returns Rendered subject and htmlBody.
 * @throws AppError 404 when no template matches the tenant + key combination.
 */
export async function renderEmailTemplate(
  tenantId: string,
  key: string,
  variables: Record<string, string>,
): Promise<{ subject: string; htmlBody: string }> {
  const template = await getTemplateByKey(tenantId, key);

  // Subject — plain text interpolation
  const subject = interpolate(template['subject'] as string, variables);

  // HTML body — Handlebars (auto-escapes by default)
  const hbsTemplate = Handlebars.compile(template['htmlBody'] as string);
  const htmlBody = hbsTemplate(variables);

  return { subject, htmlBody };
}

// ─── previewTemplate ──────────────────────────────────────────────────────────

/**
 * Renders a preview of an email template with sample variables.
 *
 * Returns the template key, rendered subject, and rendered HTML body.
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
): Promise<{ key: string; subject: string; htmlBody: string }> {
  const rendered = await renderEmailTemplate(tenantId, key, variables);
  return { key, ...rendered };
}
