/**
 * Invoice overdue automation job — AUDIT-023
 *
 * BullMQ repeatable job that runs daily at 02:00 AM UTC.
 * Calls markOverdueInvoices() to transition all UNPAID invoices past their
 * dueDate to OVERDUE status.
 *
 * Feature flag: INVOICE_AUTOMATION_ENABLED
 *
 * Safe to run multiple times — already-OVERDUE invoices are not re-processed
 * because markOverdueInvoices() filters for status = 'UNPAID' only.
 */
import Redis                    from 'ioredis';
import { Queue, Worker, Job }   from 'bullmq';

import { config }              from '../config';
import { logger }              from '../utils/logger';
import { isFeatureEnabled }    from '../middleware/requireFeature';
import { markOverdueInvoices } from '../modules/invoices/invoices.service';

// ─── Constants ────────────────────────────────────────────────────────────────

export const INVOICE_OVERDUE_QUEUE_NAME = 'invoice-overdue' as const;

// ─── Job types ────────────────────────────────────────────────────────────────

export interface InvoiceOverdueJobData {
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

export const invoiceOverdueQueue = new Queue<InvoiceOverdueJobData>(INVOICE_OVERDUE_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts:          3,
    backoff:           { type: 'exponential', delay: 5000 },
    removeOnComplete:  { count: 30 },
    removeOnFail:      { count: 30 },
  },
});

// ─── Job processor ────────────────────────────────────────────────────────────

export async function processInvoiceOverdueJob(_job: Job<InvoiceOverdueJobData>): Promise<void> {
  // Runtime flag check — toggles take effect immediately without restart
  if (!(await isFeatureEnabled('INVOICE_AUTOMATION_ENABLED'))) {
    logger.debug('Invoice overdue job skipped — INVOICE_AUTOMATION_ENABLED is off');
    return;
  }

  logger.info('Processing invoice overdue check');

  const count = await markOverdueInvoices();

  logger.info('Invoice overdue check completed', { updatedCount: count });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let invoiceOverdueWorker: Worker<InvoiceOverdueJobData> | null = null;

export async function setupInvoiceOverdueJob(): Promise<void> {
  // Remove existing repeatable jobs to prevent duplicates
  const repeatableJobs = await invoiceOverdueQueue.getRepeatableJobs();
  for (const rj of repeatableJobs) {
    await invoiceOverdueQueue.removeRepeatableByKey(rj.key);
  }

  // Schedule daily at 02:00 AM UTC
  await invoiceOverdueQueue.add(
    'daily-invoice-overdue-check',
    { runDate: new Date().toISOString() },
    {
      repeat: { pattern: '0 2 * * *' },
      jobId: 'invoice-overdue-daily',
    },
  );

  invoiceOverdueWorker = new Worker<InvoiceOverdueJobData>(
    INVOICE_OVERDUE_QUEUE_NAME,
    processInvoiceOverdueJob,
    {
      connection: createBullConnection(),
      concurrency: 1,
    },
  );

  invoiceOverdueWorker.on('completed', (job: Job<InvoiceOverdueJobData>) => {
    logger.info('Invoice overdue job completed', { jobId: job.id });
  });

  invoiceOverdueWorker.on('failed', (job: Job<InvoiceOverdueJobData> | undefined, error: Error) => {
    logger.error('Invoice overdue job failed', { jobId: job?.id, error: error.message });
  });
}
