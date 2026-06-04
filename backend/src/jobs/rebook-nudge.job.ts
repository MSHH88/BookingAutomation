/**
 * Rebooking nudge job — Phase 1, Step 1.7
 *
 * Scheduled as a delayed BullMQ job when a booking is marked COMPLETED.
 * After `service.rebookIntervalDays` days, checks if the customer has
 * rebooked. If not, sends a rebooking nudge via notification dispatcher.
 *
 * Feature flag: REBOOKING_NUDGES_ENABLED
 */
import Redis                    from 'ioredis';
import { Queue, Worker, Job }   from 'bullmq';

import { config }  from '../config';
import { logger }  from '../utils/logger';
import { prisma }  from '../lib/prisma';
import { isFeatureEnabled } from '../middleware/requireFeature';
import { dispatchNotification, ChannelPreference } from '../lib/notification-dispatcher';

// ─── Constants ────────────────────────────────────────────────────────────────

export const REBOOK_QUEUE_NAME = 'rebook-nudge' as const;

// ─── Job types ────────────────────────────────────────────────────────────────

export interface RebookNudgeJobData {
  bookingId: string;
  customerId: string;
  artistId: string;
  serviceId: string | null;
  tenantId: string | null;
  studioName: string;
  customerName: string;
  phone: string | null;
  email: string;
  serviceName: string;
  channel: string;
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

export const rebookQueue = new Queue<RebookNudgeJobData>(REBOOK_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts:          3,
    backoff:           { type: 'exponential', delay: 5000 },
    removeOnComplete:  { count: 50 },
    removeOnFail:      { count: 50 },
  },
});

// ─── Job processor ────────────────────────────────────────────────────────────

async function processRebookNudge(job: Job<RebookNudgeJobData>): Promise<void> {
  const data = job.data;

  // Runtime flag check — toggles take effect immediately without restart
  if (!(await isFeatureEnabled('REBOOKING_NUDGES_ENABLED', data.tenantId))) {
    logger.debug('Rebook nudge skipped — REBOOKING_NUDGES_ENABLED is off', { bookingId: data.bookingId });
    return;
  }

  // Check if customer has noRebookNudge set
  const customer = await prisma.user.findUnique({
    where: { id: data.customerId },
    select: { noRebookNudge: true, isActive: true, unsubscribed: true },
  });

  if (!customer || !customer.isActive || customer.noRebookNudge || customer.unsubscribed) {
    logger.info('Rebook nudge skipped — customer opted out or inactive', { customerId: data.customerId });
    return;
  }

  // Check if customer has already rebooked with the same artist
  const existingBooking = await prisma.booking.findFirst({
    where: {
      customerId: data.customerId,
      artistId: data.artistId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (existingBooking) {
    logger.info('Rebook nudge skipped — customer already has a future booking', {
      customerId: data.customerId,
      existingBookingId: existingBooking.id,
    });
    return;
  }

  await dispatchNotification({
    templateKey: 'rebook-nudge',
    phone: data.phone,
    email: data.email,
    customerName: data.customerName,
    variables: {
      customerName: data.customerName,
      studioName: data.studioName,
      serviceName: data.serviceName,
    },
    channel: data.channel as ChannelPreference,
    tenantId: data.tenantId ?? undefined,
  });

  logger.info('Rebook nudge sent', { bookingId: data.bookingId, customerId: data.customerId });
}

// ─── Worker factory ───────────────────────────────────────────────────────────

let rebookWorker: Worker<RebookNudgeJobData> | null = null;

export function startRebookWorker(): Worker<RebookNudgeJobData> {
  rebookWorker = new Worker<RebookNudgeJobData>(REBOOK_QUEUE_NAME, processRebookNudge, {
    connection: createBullConnection(),
    concurrency: 3,
  });

  rebookWorker.on('completed', (job: Job<RebookNudgeJobData>) => {
    logger.info('Rebook nudge job completed', { jobId: job.id });
  });

  rebookWorker.on('failed', (job: Job<RebookNudgeJobData> | undefined, error: Error) => {
    logger.error('Rebook nudge job failed', { jobId: job?.id, error: error.message });
  });

  logger.info('Rebook nudge worker started', { queue: REBOOK_QUEUE_NAME });
  return rebookWorker;
}

// ─── Enqueue helper ───────────────────────────────────────────────────────────

/**
 * Enqueue a rebook nudge job with delay.
 * Called from bookings.service.ts when a booking is marked COMPLETED.
 */
export async function enqueueRebookNudge(
  data: RebookNudgeJobData,
  delayMs: number,
): Promise<void> {
  try {
    await rebookQueue.add('rebook-nudge', data, { delay: delayMs });
    logger.info('Rebook nudge job enqueued', {
      bookingId: data.bookingId,
      delayMs,
    });
  } catch (err) {
    logger.error('Failed to enqueue rebook nudge', {
      bookingId: data.bookingId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
