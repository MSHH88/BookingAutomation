/**
 * Campaigns service — Phase 1, Step 1.9
 *
 * Handles all business logic for the Campaigns module.
 *
 * Campaign lifecycle:
 *   DRAFT     → SCHEDULED  (updateCampaign with status: 'SCHEDULED' + scheduledAt)
 *   DRAFT     → CANCELLED  (updateCampaign with status: 'CANCELLED')
 *   SCHEDULED → SENDING    (campaign.job processes at scheduledAt)
 *   SCHEDULED → CANCELLED  (updateCampaign with status: 'CANCELLED')
 *   SENDING   → SENT       (campaign.job completes delivery)
 *   SENT      — terminal state
 *   CANCELLED — terminal state
 *
 * Rules:
 *   - Only DRAFT campaigns can have their content fields edited.
 *   - SCHEDULED campaigns can only be CANCELLED (not edited).
 *   - When status transitions to SCHEDULED, a BullMQ job is enqueued
 *     with delay = scheduledAt - now.
 *
 * Functions:
 *   listCampaigns     — paginated list with optional status filter
 *   getCampaign       — single record by ID, scoped to tenant; 404 if not found
 *   createCampaign    — create a new campaign as DRAFT
 *   updateCampaign    — edit/schedule/cancel; enforces lifecycle rules
 *   getCampaignStats  — return campaign delivery stats JSON; 404 if not found
 *
 * Feature flag: CAMPAIGNS_ENABLED
 */
import { Prisma } from '@prisma/client';

import { prisma }                    from '../../lib/prisma';
import { AppError }                  from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }                    from '../../utils/logger';
import { enqueueCampaign }           from '../../jobs/campaign.job';
import type {
  ListCampaignsQuery,
  CreateCampaignBody,
  UpdateCampaignBody,
} from './campaigns.schema';

// ─── Prisma select shape ──────────────────────────────────────────────────────

const campaignSelect = {
  id:             true,
  tenantId:       true,
  name:           true,
  channel:        true,
  templateKey:    true,
  audienceFilter: true,
  scheduledAt:    true,
  status:         true,
  stats:          true,
  createdAt:      true,
  updatedAt:      true,
} satisfies Prisma.CampaignSelect;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List campaigns for a tenant.
 *
 * Optional filter: status (DRAFT, SCHEDULED, SENDING, SENT, CANCELLED).
 * Returns paginated results ordered by createdAt descending.
 */
export async function listCampaigns(
  tenantId: string | null,
  query: ListCampaignsQuery,
): Promise<PaginatedResult<Prisma.CampaignGetPayload<{ select: typeof campaignSelect }>>> {
  const where: Prisma.CampaignWhereInput = {};

  if (tenantId) where.tenantId = tenantId;
  if (query.status) where.status = query.status;

  return paginate(
    prisma.campaign,
    { where, select: campaignSelect, orderBy: { createdAt: 'desc' } },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Get a single campaign by ID.
 *
 * Scoped to tenant. Throws 404 if not found.
 */
export async function getCampaign(
  tenantId: string | null,
  id: string,
): Promise<Prisma.CampaignGetPayload<{ select: typeof campaignSelect }>> {
  const where: Prisma.CampaignWhereInput = { id };
  if (tenantId) where.tenantId = tenantId;

  const record = await prisma.campaign.findFirst({
    where,
    select: campaignSelect,
  });

  if (!record) {
    throw new AppError(404, 'CAMPAIGN_NOT_FOUND', `Campaign '${id}' not found`);
  }

  return record;
}

/**
 * Create a new campaign.
 *
 * Always created as DRAFT. Content can be edited until scheduled.
 */
export async function createCampaign(
  tenantId: string | null,
  body: CreateCampaignBody,
): Promise<Prisma.CampaignGetPayload<{ select: typeof campaignSelect }>> {
  const record = await prisma.campaign.create({
    data: {
      tenantId,
      name:           body.name,
      channel:        body.channel,
      templateKey:    body.templateKey,
      audienceFilter: body.audienceFilter as unknown as Prisma.InputJsonValue,
      scheduledAt:    body.scheduledAt ? new Date(body.scheduledAt) : null,
      status:         'DRAFT',
    },
    select: campaignSelect,
  });

  logger.info('Campaign created', { id: record.id, tenantId, name: body.name });

  return record;
}

/**
 * Update a campaign — edit content, schedule, or cancel.
 *
 * Rules enforced:
 *   - DRAFT: all content fields + status (→ SCHEDULED or CANCELLED) can be changed.
 *   - SCHEDULED: only status → CANCELLED is allowed (no content edits).
 *   - SENDING / SENT / CANCELLED: no changes allowed.
 *
 * When status transitions to SCHEDULED and scheduledAt is set, a BullMQ job
 * is enqueued with the appropriate delay.
 */
export async function updateCampaign(
  tenantId: string | null,
  id: string,
  body: UpdateCampaignBody,
): Promise<Prisma.CampaignGetPayload<{ select: typeof campaignSelect }>> {
  const existing = await getCampaign(tenantId, id);
  const currentStatus = existing.status as string;

  // ── Terminal states: no changes allowed ────────────────────────────────────
  if (['SENDING', 'SENT', 'CANCELLED'].includes(currentStatus)) {
    throw new AppError(
      409,
      'CAMPAIGN_NOT_EDITABLE',
      `Campaign with status '${currentStatus}' cannot be modified`,
    );
  }

  // ── SCHEDULED: only allow cancellation ────────────────────────────────────
  if (currentStatus === 'SCHEDULED') {
    if (body.status !== 'CANCELLED') {
      throw new AppError(
        409,
        'CAMPAIGN_NOT_EDITABLE',
        'Scheduled campaigns can only be cancelled',
      );
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data:  { status: 'CANCELLED' },
      select: campaignSelect,
    });

    logger.info('Campaign cancelled', { id, tenantId });
    return updated;
  }

  // ── DRAFT: full editing allowed ───────────────────────────────────────────
  const data: Prisma.CampaignUpdateInput = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.channel !== undefined) data.channel = body.channel;
  if (body.templateKey !== undefined) data.templateKey = body.templateKey;
  if (body.audienceFilter !== undefined) {
    data.audienceFilter = body.audienceFilter as unknown as Prisma.InputJsonValue;
  }
  if (body.scheduledAt !== undefined) {
    data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  }
  if (body.status !== undefined) data.status = body.status;

  const updated = await prisma.campaign.update({
    where: { id },
    data,
    select: campaignSelect,
  });

  // ── If transitioning to SCHEDULED, enqueue the campaign job ───────────────
  if (body.status === 'SCHEDULED' && updated.scheduledAt) {
    const delayMs = Math.max(0, new Date(updated.scheduledAt).getTime() - Date.now());
    await enqueueCampaign(id, delayMs);
    logger.info('Campaign scheduled', { id, tenantId, scheduledAt: updated.scheduledAt, delayMs });
  }

  logger.info('Campaign updated', { id, tenantId });

  return updated;
}

/**
 * Get delivery stats for a campaign.
 *
 * Returns the `stats` JSON field. Throws 404 if not found.
 */
export async function getCampaignStats(
  tenantId: string | null,
  id: string,
): Promise<unknown> {
  const record = await getCampaign(tenantId, id);
  return record.stats;
}
