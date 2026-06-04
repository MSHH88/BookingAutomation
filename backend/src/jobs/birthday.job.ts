/**
 * Birthday automation job — Phase 1, Step 1.6
 *
 * BullMQ repeatable job that runs daily at 8:00 AM UTC.
 * Queries all customers whose dateOfBirth matches today (month + day)
 * and sends a birthday message via the notification dispatcher.
 *
 * Feature flag: BIRTHDAY_AUTOMATION_ENABLED
 */
import Redis                    from 'ioredis';
import { Queue, Worker, Job }   from 'bullmq';

import { config }  from '../config';
import { logger }  from '../utils/logger';
import { prisma }  from '../lib/prisma';
import { isFeatureEnabled } from '../middleware/requireFeature';
import { dispatchNotification, ChannelPreference } from '../lib/notification-dispatcher';

// ─── Constants ────────────────────────────────────────────────────────────────

export const BIRTHDAY_QUEUE_NAME = 'birthday-automation' as const;

// ─── Job types ────────────────────────────────────────────────────────────────

export interface BirthdayJobData {
  runDate: string; // ISO date string
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

export const birthdayQueue = new Queue<BirthdayJobData>(BIRTHDAY_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts:          3,
    backoff:           { type: 'exponential', delay: 5000 },
    removeOnComplete:  { count: 30 },
    removeOnFail:      { count: 30 },
  },
});

// ─── Birthday customer query ──────────────────────────────────────────────────

/**
 * Returns customers whose dateOfBirth matches the given month/day.
 *
 * Uses application-layer filtering after fetching eligible customers from the
 * DB, because Prisma doesn't support date-part extraction natively. This works
 * across all database engines.
 */
export async function findBirthdayCustomers(month: number, day: number): Promise<Array<{
  id: string;
  name: string;
  phone: string | null;
  email: string;
  tenantId: string | null;
  notificationChannel: string;
}>> {
  const users = await prisma.user.findMany({
    where: {
      role: 'CUSTOMER',
      isActive: true,
      dateOfBirth: { not: null },
      unsubscribed: false,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      tenantId: true,
      dateOfBirth: true,
      notificationChannel: true,
    },
  });

  // Filter by month/day in application layer (works across all DB engines)
  return users.filter(u => {
    if (!u.dateOfBirth) return false;
    const dob = new Date(u.dateOfBirth);
    return dob.getUTCMonth() + 1 === month && dob.getUTCDate() === day;
  }).map(u => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    tenantId: u.tenantId,
    notificationChannel: u.notificationChannel,
  }));
}

// ─── Job processor ────────────────────────────────────────────────────────────

async function processBirthdayJob(job: Job<BirthdayJobData>): Promise<void> {
  // Runtime flag check — toggles take effect immediately without restart
  if (!(await isFeatureEnabled('BIRTHDAY_AUTOMATION_ENABLED'))) {
    logger.debug('Birthday job skipped — BIRTHDAY_AUTOMATION_ENABLED is off');
    return;
  }

  const runDate = new Date(job.data.runDate);
  const month = runDate.getUTCMonth() + 1;
  const day = runDate.getUTCDate();

  logger.info('Processing birthday automation', { month, day });

  const customers = await findBirthdayCustomers(month, day);
  logger.info(`Found ${customers.length} birthday customers`, { month, day });

  for (const customer of customers) {
    try {
      // Per-tenant flag check — skip customers whose tenant has disabled birthday automation
      if (!(await isFeatureEnabled('BIRTHDAY_AUTOMATION_ENABLED', customer.tenantId))) {
        logger.debug('Birthday message skipped — BIRTHDAY_AUTOMATION_ENABLED off for tenant', {
          customerId: customer.id, tenantId: customer.tenantId,
        });
        continue;
      }

      await dispatchNotification({
        templateKey: 'birthday-greeting',
        phone: customer.phone,
        email: customer.email,
        customerName: customer.name,
        variables: {
          customerName: customer.name,
        },
        channel: customer.notificationChannel as ChannelPreference,
        tenantId: customer.tenantId ?? undefined,
      });
    } catch (err) {
      logger.error('Birthday message failed for customer', {
        customerId: customer.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let birthdayWorker: Worker<BirthdayJobData> | null = null;

export async function setupBirthdayJob(): Promise<void> {
  // Remove existing repeatable jobs to prevent duplicates
  const repeatableJobs = await birthdayQueue.getRepeatableJobs();
  for (const rj of repeatableJobs) {
    await birthdayQueue.removeRepeatableByKey(rj.key);
  }

  // Schedule daily at 8:00 AM UTC
  await birthdayQueue.add(
    'daily-birthday-check',
    { runDate: new Date().toISOString() },
    {
      repeat: { pattern: '0 8 * * *' },
      jobId: 'birthday-daily',
    },
  );

  birthdayWorker = new Worker<BirthdayJobData>(BIRTHDAY_QUEUE_NAME, processBirthdayJob, {
    connection: createBullConnection(),
    concurrency: 1,
  });

  birthdayWorker.on('completed', (job: Job<BirthdayJobData>) => {
    logger.info('Birthday job completed', { jobId: job.id });
  });

  birthdayWorker.on('failed', (job: Job<BirthdayJobData> | undefined, error: Error) => {
    logger.error('Birthday job failed', { jobId: job?.id, error: error.message });
  });
}
