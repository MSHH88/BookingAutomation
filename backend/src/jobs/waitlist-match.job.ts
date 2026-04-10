/**
 * Waitlist Match Job — Phase 5.4
 *
 * A BullMQ worker that handles delayed "check if notified waitlist entry
 * was claimed" jobs.
 *
 * When matchAndNotify() runs, it sets notificationExpiry on the entry. This
 * job is triggered after the expiry window to:
 *   1. If the entry is still NOTIFIED (customer didn't respond): mark as EXPIRED
 *      and call matchAndNotify() again to try the next candidate.
 *   2. If the entry is already BOOKED or CANCELLED: do nothing.
 *
 * Queue name: 'waitlist-match'
 * Job data:   { waitlistEntryId, bookingArtistId, bookingServiceId, bookingStartAt, tenantId }
 */
import { Worker, Queue } from 'bullmq';
import type { Job } from 'bullmq';

import { logger }    from '../utils/logger';
import { prisma }    from '../lib/prisma';
import { matchAndNotify } from '../modules/waitlist/waitlist.service';
import { getRedis }       from '../lib/redis';

// ─── Queue name ───────────────────────────────────────────────────────────────

export const WAITLIST_MATCH_QUEUE = 'waitlist-match';

// ─── Job data type ────────────────────────────────────────────────────────────

export interface WaitlistMatchJobData {
  waitlistEntryId:  string;
  bookingArtistId:  string;
  bookingServiceId: string | null;
  bookingStartAt:   string; // ISO 8601
  tenantId:         string;
  matchWindowMinutes?: number;
}

// ─── Queue instance ───────────────────────────────────────────────────────────

let waitlistMatchQueue: Queue | null = null;

export function getWaitlistMatchQueue(): Queue {
  if (!waitlistMatchQueue) {
    waitlistMatchQueue = new Queue(WAITLIST_MATCH_QUEUE, {
      connection: getRedis(),
    });
  }
  return waitlistMatchQueue;
}

/**
 * Enqueue a delayed job to check waitlist entry expiry.
 * Delay is set to matchWindowMinutes from now.
 */
export async function enqueueWaitlistMatchExpiry(
  data:  WaitlistMatchJobData,
  delayMs: number,
): Promise<void> {
  const queue = getWaitlistMatchQueue();
  await queue.add('check-expiry', data, { delay: delayMs });
  logger.debug('Waitlist match expiry job enqueued', {
    entryId: data.waitlistEntryId,
    delayMs,
  });
}

// ─── Worker ───────────────────────────────────────────────────────────────────

let worker: Worker | null = null;

export function startWaitlistMatchWorker(): void {
  if (worker) return; // already running

  worker = new Worker(
    WAITLIST_MATCH_QUEUE,
    async (job: Job<WaitlistMatchJobData>) => {
      const {
        waitlistEntryId,
        bookingArtistId,
        bookingServiceId,
        bookingStartAt,
        tenantId,
        matchWindowMinutes,
      } = job.data;

      logger.info('Waitlist match expiry check', { waitlistEntryId });

      // Check if the entry is still NOTIFIED (customer didn't respond)
      const entry = await prisma.waitlistEntry.findUnique({
        where:  { id: waitlistEntryId },
        select: { id: true, status: true },
      });

      if (!entry) {
        logger.warn('Waitlist entry not found for expiry check', { waitlistEntryId });
        return;
      }

      if (entry.status !== 'NOTIFIED') {
        // Entry was booked or cancelled — nothing to do
        logger.info('Waitlist entry already handled', {
          waitlistEntryId,
          status: entry.status,
        });
        return;
      }

      // Mark the entry as EXPIRED
      await prisma.waitlistEntry.update({
        where: { id: waitlistEntryId },
        data:  { status: 'EXPIRED' },
      });

      logger.info('Waitlist entry expired — trying next match', { waitlistEntryId });

      // Try the next best match
      await matchAndNotify({
        bookingArtistId,
        bookingServiceId,
        bookingStartAt:    new Date(bookingStartAt),
        tenantId,
        matchWindowMinutes,
      });
    },
    { connection: getRedis() },
  );

  worker.on('failed', (job, err) => {
    logger.error('Waitlist match job failed', {
      jobId: job?.id,
      error: err.message,
    });
  });

  logger.info('Waitlist match worker started');
}
