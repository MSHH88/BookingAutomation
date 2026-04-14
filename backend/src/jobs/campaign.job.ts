/**
 * Campaign processing job — Phase 1, Step 1.9
 *
 * Processes scheduled campaigns at their scheduledAt time.
 * Resolves audience filter, fans out individual messages per customer.
 *
 * Feature flag: CAMPAIGNS_ENABLED
 */
import Redis                    from 'ioredis';
import { Queue, Worker, Job }   from 'bullmq';

import { config }  from '../config';
import { logger }  from '../utils/logger';
import { prisma }  from '../lib/prisma';
import { isFeatureEnabled } from '../middleware/requireFeature';
import { dispatchNotification, ChannelPreference } from '../lib/notification-dispatcher';

// ─── Constants ────────────────────────────────────────────────────────────────

export const CAMPAIGN_QUEUE_NAME = 'campaign' as const;

// ─── Job types ────────────────────────────────────────────────────────────────

export interface CampaignJobData {
  campaignId: string;
}

// ─── Redis connection factory ─────────────────────────────────────────────────

function createBullConnection(): Redis {
  const url = config.REDIS_URL || 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
    lazyConnect:          true,
  });
}

// ─── Queue instance ───────────────────────────────────────────────────────────

export const campaignQueue = new Queue<CampaignJobData>(CAMPAIGN_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts:          3,
    backoff:           { type: 'exponential', delay: 10000 },
    removeOnComplete:  { count: 50 },
    removeOnFail:      { count: 50 },
  },
});

// ─── Audience resolution ──────────────────────────────────────────────────────

interface AudienceFilter {
  type: 'ALL' | 'INACTIVE_30_DAYS' | 'BIRTHDAY_THIS_MONTH' | 'TOP_SPENDERS' | 'BY_SERVICE_TYPE';
  serviceType?: string;
}

async function resolveAudience(tenantId: string | null, filter: AudienceFilter): Promise<Array<{
  id: string;
  name: string;
  phone: string | null;
  email: string;
  notificationChannel: string;
}>> {
  const baseWhere: Record<string, unknown> = {
    role: 'CUSTOMER',
    isActive: true,
    unsubscribed: false,
  };

  if (tenantId) {
    baseWhere['tenantId'] = tenantId;
  }

  switch (filter.type) {
    case 'INACTIVE_30_DAYS': {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      // Get customers who haven't booked in 30+ days
      const activeCustomerIds = await prisma.booking.findMany({
        where: {
          tenantId: tenantId ?? undefined,
          startAt: { gte: thirtyDaysAgo },
          customerId: { not: null },
        },
        select: { customerId: true },
        distinct: ['customerId'],
      });
      const activeIds = activeCustomerIds.map(b => b.customerId).filter(Boolean) as string[];
      if (activeIds.length > 0) {
        baseWhere['id'] = { notIn: activeIds };
      }
      break;
    }
    case 'BIRTHDAY_THIS_MONTH': {
      baseWhere['dateOfBirth'] = { not: null };
      // We filter application-side for exact month match after the query
      break;
    }
    case 'TOP_SPENDERS':
    case 'BY_SERVICE_TYPE':
      // These filter types are reserved for future implementation.
      // For now, they fall through to 'ALL' with a warning log.
      logger.warn(`Campaign filter type '${filter.type}' not yet implemented, using ALL`, { filterType: filter.type });
      break;
    case 'ALL':
    default:
      break;
  }

  const users = await prisma.user.findMany({
    where: baseWhere,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      notificationChannel: true,
      dateOfBirth: true,
    },
  });

  // Post-query filter for BIRTHDAY_THIS_MONTH: only keep users whose
  // birth month matches the current UTC month.
  if (filter.type === 'BIRTHDAY_THIS_MONTH') {
    const currentMonth = new Date().getUTCMonth(); // 0–11
    return users.filter(u => {
      if (!u.dateOfBirth) return false;
      return new Date(u.dateOfBirth).getUTCMonth() === currentMonth;
    });
  }

  return users;
}

// ─── Job processor ────────────────────────────────────────────────────────────

async function processCampaign(job: Job<CampaignJobData>): Promise<void> {
  // Runtime flag check — toggles take effect immediately without restart
  if (!(await isFeatureEnabled('CAMPAIGNS_ENABLED'))) {
    logger.debug('Campaign job skipped — CAMPAIGNS_ENABLED is off');
    return;
  }

  const { campaignId } = job.data;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    logger.error('Campaign not found', { campaignId });
    return;
  }

  if (campaign.status !== 'SCHEDULED' && campaign.status !== 'SENDING') {
    logger.info('Campaign not in sendable state', { campaignId, status: campaign.status });
    return;
  }

  // Mark as SENDING
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'SENDING' },
  });

  const filter = (campaign.audienceFilter as unknown as AudienceFilter) ?? { type: 'ALL' };
  const audience = await resolveAudience(campaign.tenantId, filter);

  logger.info('Campaign audience resolved', { campaignId, audienceSize: audience.length });

  let delivered = 0;
  let failed = 0;

  for (const customer of audience) {
    try {
      await dispatchNotification({
        templateKey: campaign.templateKey,
        phone: customer.phone,
        email: customer.email,
        customerName: customer.name,
        variables: { customerName: customer.name },
        channel: campaign.channel as ChannelPreference,
        tenantId: campaign.tenantId ?? undefined,
      });
      delivered++;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('Campaign dispatch failed for customer', {
        campaignId,
        customerId: customer.id,
        error: errMsg,
      });
      failed++;
    }
  }

  // Update campaign stats and status
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'SENT',
      stats: { delivered, failed, total: audience.length },
    },
  });

  logger.info('Campaign completed', { campaignId, delivered, failed, total: audience.length });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let campaignWorker: Worker<CampaignJobData> | null = null;

export async function setupCampaignJob(): Promise<void> {
  campaignWorker = new Worker<CampaignJobData>(CAMPAIGN_QUEUE_NAME, processCampaign, {
    connection: createBullConnection(),
    concurrency: 1,
  });

  campaignWorker.on('completed', (job: Job<CampaignJobData>) => {
    logger.info('Campaign job completed', { jobId: job.id, campaignId: job.data.campaignId });
  });

  campaignWorker.on('failed', (job: Job<CampaignJobData> | undefined, error: Error) => {
    logger.error('Campaign job failed', { jobId: job?.id, error: error.message });
  });

  logger.info('Campaign worker started', { queue: CAMPAIGN_QUEUE_NAME });
}

// ─── Enqueue helper ───────────────────────────────────────────────────────────

/**
 * Enqueue a campaign for processing.
 */
export async function enqueueCampaign(campaignId: string, delayMs?: number): Promise<void> {
  await campaignQueue.add('process-campaign', { campaignId }, delayMs ? { delay: delayMs } : undefined);
  logger.info('Campaign job enqueued', { campaignId, delayMs });
}
