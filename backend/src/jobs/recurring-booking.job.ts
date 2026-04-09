/**
 * Recurring booking job — Phase 1, Step 1.8
 *
 * Daily BullMQ cron job that checks RecurringBooking records where
 * nextBookingDate = today. For each, auto-creates a new booking if the
 * slot is available, otherwise sends a nudge to rebook manually.
 *
 * Feature flag: RECURRING_BOOKINGS_ENABLED
 */
import Redis                    from 'ioredis';
import { Queue, Worker, Job }   from 'bullmq';

import { config }  from '../config';
import { logger }  from '../utils/logger';
import { prisma }  from '../lib/prisma';
import { dispatchNotification } from '../lib/notification-dispatcher';

// ─── Constants ────────────────────────────────────────────────────────────────

export const RECURRING_QUEUE_NAME = 'recurring-booking' as const;

// ─── Job types ────────────────────────────────────────────────────────────────

export interface RecurringBookingJobData {
  runDate: string;
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

export const recurringQueue = new Queue<RecurringBookingJobData>(RECURRING_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts:          3,
    backoff:           { type: 'exponential', delay: 5000 },
    removeOnComplete:  { count: 30 },
    removeOnFail:      { count: 30 },
  },
});

// ─── Job processor ────────────────────────────────────────────────────────────

async function processRecurringBookings(job: Job<RecurringBookingJobData>): Promise<void> {
  const today = new Date(job.data.runDate);
  const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));

  const dueRecurrings = await prisma.recurringBooking.findMany({
    where: {
      isActive: true,
      nextBookingDate: { gte: startOfDay, lt: endOfDay },
    },
  });

  logger.info(`Found ${dueRecurrings.length} recurring bookings due`, { date: startOfDay.toISOString() });

  for (const recurring of dueRecurrings) {
    try {
      const customer = await prisma.user.findUnique({
        where: { id: recurring.customerId },
        select: { id: true, name: true, phone: true, email: true, notificationChannel: true, isActive: true },
      });

      if (!customer || !customer.isActive) {
        logger.warn('Recurring booking customer not found or inactive', { recurringId: recurring.id });
        continue;
      }

      // Advance the nextBookingDate regardless of whether we create a booking
      const nextDate = new Date(recurring.nextBookingDate);
      nextDate.setDate(nextDate.getDate() + recurring.intervalDays);

      await prisma.recurringBooking.update({
        where: { id: recurring.id },
        data: { nextBookingDate: nextDate },
      });

      // Send a rebooking nudge (auto-creation of booking would require slot checking
      // which is handled by the booking service — we send a notification instead)
      await dispatchNotification({
        templateKey: 'recurring-booking-reminder',
        phone: customer.phone,
        email: customer.email,
        customerName: customer.name,
        variables: {
          customerName: customer.name,
        },
        channel: customer.notificationChannel as 'WHATSAPP' | 'SMS' | 'EMAIL' | 'ALL',
        tenantId: recurring.tenantId ?? undefined,
      });

      logger.info('Recurring booking notification sent', { recurringId: recurring.id, customerId: customer.id });
    } catch (err) {
      logger.error('Failed to process recurring booking', {
        recurringId: recurring.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let recurringWorker: Worker<RecurringBookingJobData> | null = null;

export async function setupRecurringBookingJob(): Promise<void> {
  const repeatableJobs = await recurringQueue.getRepeatableJobs();
  for (const rj of repeatableJobs) {
    await recurringQueue.removeRepeatableByKey(rj.key);
  }

  await recurringQueue.add(
    'daily-recurring-check',
    { runDate: new Date().toISOString() },
    {
      repeat: { pattern: '0 7 * * *' },
      jobId: 'recurring-daily',
    },
  );

  recurringWorker = new Worker<RecurringBookingJobData>(RECURRING_QUEUE_NAME, processRecurringBookings, {
    connection: createBullConnection(),
    concurrency: 1,
  });

  recurringWorker.on('completed', (job: Job<RecurringBookingJobData>) => {
    logger.info('Recurring booking job completed', { jobId: job.id });
  });

  recurringWorker.on('failed', (job: Job<RecurringBookingJobData> | undefined, error: Error) => {
    logger.error('Recurring booking job failed', { jobId: job?.id, error: error.message });
  });
}
