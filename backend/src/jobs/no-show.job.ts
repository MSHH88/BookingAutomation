/**
 * No-show automation job — Phase 2.2
 *
 * BullMQ delayed job that fires after a booking's start time + grace period.
 * If the booking is still CONFIRMED (not checked-in / completed), it:
 *   1. Marks the booking as NO_SHOW
 *   2. Optionally charges a no-show fee via Stripe (if card on file + autoCharge)
 *   3. Sends a no-show notification to the customer
 *   4. Fires a webhook event
 *
 * Feature flag: NO_SHOW_AUTOMATION_ENABLED
 *
 * The job is enqueued by bookings.service.ts when a booking is CONFIRMED.
 * Delay = (startTime + gracePeriodMinutes) - now.
 */
import Redis                    from 'ioredis';
import { Queue, Worker, Job }   from 'bullmq';

import { config }  from '../config';
import { logger }  from '../utils/logger';
import { prisma }  from '../lib/prisma';
import { isFeatureEnabled } from '../middleware/requireFeature';
import { getStripe } from '../lib/stripe';
import { dispatchNotification } from '../lib/notification-dispatcher';
import { enqueueWebhookEvent }  from '../modules/webhooks/webhooks.queue';

// ─── Constants ────────────────────────────────────────────────────────────────

export const NO_SHOW_QUEUE_NAME = 'no-show-check' as const;

// ─── Job types ────────────────────────────────────────────────────────────────

export interface NoShowJobData {
  bookingId:    string;
  customerId:   string | null;
  artistId:     string;
  tenantId:     string | null;
  studioName:   string;
  customerName: string;
  phone:        string | null;
  email:        string;
  channel:      string;
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

export const noShowQueue = new Queue<NoShowJobData>(NO_SHOW_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts:          2,
    backoff:           { type: 'exponential', delay: 10000 },
    removeOnComplete:  { count: 100 },
    removeOnFail:      { count: 100 },
  },
});

// ─── Job processor ────────────────────────────────────────────────────────────

async function processNoShowCheck(job: Job<NoShowJobData>): Promise<void> {
  const data = job.data;

  // Runtime flag check — toggles take effect immediately without restart
  if (!(await isFeatureEnabled('NO_SHOW_AUTOMATION_ENABLED', data.tenantId))) {
    logger.debug('No-show check skipped — NO_SHOW_AUTOMATION_ENABLED is off', { bookingId: data.bookingId });
    return;
  }

  // 1. Re-fetch booking — may have been completed / cancelled since job was scheduled
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    select: {
      id:     true,
      status: true,
      tenantId: true,
      stripePaymentIntentId: true,
      customer: { select: { stripeCustomerId: true } },
    },
  });

  if (!booking) {
    logger.info('No-show check: booking not found — skipping', { bookingId: data.bookingId });
    return;
  }

  // Only fire on CONFIRMED bookings — anything else means the booking was handled
  if (booking.status !== 'CONFIRMED') {
    logger.info('No-show check: booking is no longer CONFIRMED — skipping', {
      bookingId: data.bookingId,
      status:    booking.status,
    });
    return;
  }

  // 2. Mark as NO_SHOW
  await prisma.booking.update({
    where: { id: data.bookingId },
    data:  { status: 'NO_SHOW' },
  });

  logger.info('Booking marked as NO_SHOW', { bookingId: data.bookingId });

  // 3. Attempt no-show fee charge if autoCharge is enabled
  const settings = booking.tenantId
    ? await prisma.studioSettings.findUnique({
        where:  { tenantId: booking.tenantId },
        select: { noShowAutoCharge: true, noShowFeeAmount: true, currency: true },
      })
    : await prisma.studioSettings.findFirst({
        select: { noShowAutoCharge: true, noShowFeeAmount: true, currency: true },
      });

  if (
    settings?.noShowAutoCharge &&
    settings.noShowFeeAmount &&
    Number(settings.noShowFeeAmount) > 0 &&
    booking.customer?.stripeCustomerId
  ) {
    try {
      const stripe = getStripe();
      const amountPence = Math.round(Number(settings.noShowFeeAmount) * 100);
      const currency    = (settings.currency ?? 'gbp').toLowerCase();

      // Find the customer's default payment method
      const stripeCustomer = await stripe.customers.retrieve(
        booking.customer.stripeCustomerId,
      ) as { deleted?: boolean; invoice_settings?: { default_payment_method?: string }; default_source?: string };

      // Guard against deleted Stripe customers
      if (stripeCustomer.deleted) {
        logger.warn('No-show fee skipped — Stripe customer deleted', {
          bookingId:        data.bookingId,
          stripeCustomerId: booking.customer.stripeCustomerId,
        });
      } else {
        const paymentMethod =
          (stripeCustomer.invoice_settings?.default_payment_method as string | undefined) ??
          (stripeCustomer.default_source as string | undefined);

        if (paymentMethod) {
          await stripe.paymentIntents.create({
            amount:          amountPence,
            currency,
            customer:        booking.customer.stripeCustomerId,
            payment_method:  paymentMethod,
            off_session:     true,
            confirm:         true,
            metadata:        { bookingId: data.bookingId, type: 'no_show_fee' },
            description:     `No-show fee for booking ${data.bookingId}`,
          });

          logger.info('No-show fee charged', {
            bookingId:   data.bookingId,
            amountPence,
            currency,
          });
        } else {
          logger.warn('No-show fee skipped — no payment method on file', {
            bookingId:          data.bookingId,
            stripeCustomerId:   booking.customer.stripeCustomerId,
          });
        }
      }
    } catch (err) {
      logger.error('No-show fee charge failed', {
        bookingId: data.bookingId,
        error:     err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 4. Send notification
  try {
    await dispatchNotification({
      templateKey:  'no-show',
      phone:        data.phone,
      email:        data.email,
      customerName: data.customerName,
      variables: {
        customerName: data.customerName,
        studioName:   data.studioName,
      },
      channel:  data.channel as 'WHATSAPP' | 'SMS' | 'EMAIL' | 'ALL',
      tenantId: data.tenantId ?? undefined,
    });
  } catch (err) {
    logger.error('No-show notification failed', {
      bookingId: data.bookingId,
      error:     err instanceof Error ? err.message : String(err),
    });
  }

  // 5. Fire webhook
  enqueueWebhookEvent('booking.no_show', {
    bookingId: data.bookingId,
    customerId: data.customerId,
    artistId: data.artistId,
  }).catch((err: unknown) => {
    logger.error('No-show webhook enqueue failed', {
      bookingId: data.bookingId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

// ─── Worker factory ───────────────────────────────────────────────────────────

let noShowWorker: Worker<NoShowJobData> | null = null;

export function startNoShowWorker(): Worker<NoShowJobData> {
  noShowWorker = new Worker<NoShowJobData>(NO_SHOW_QUEUE_NAME, processNoShowCheck, {
    connection:  createBullConnection(),
    concurrency: 5,
  });

  noShowWorker.on('completed', (job: Job<NoShowJobData>) => {
    logger.info('No-show check job completed', { jobId: job.id });
  });

  noShowWorker.on('failed', (job: Job<NoShowJobData> | undefined, error: Error) => {
    logger.error('No-show check job failed', { jobId: job?.id, error: error.message });
  });

  logger.info('No-show check worker started', { queue: NO_SHOW_QUEUE_NAME });
  return noShowWorker;
}

// ─── Enqueue helper ───────────────────────────────────────────────────────────

/**
 * Enqueue a no-show check job with the appropriate delay.
 * Called from bookings.service.ts when a booking is CONFIRMED.
 *
 * @param data    - Job payload
 * @param delayMs - Milliseconds until the job should fire
 */
export async function enqueueNoShowCheck(
  data:    NoShowJobData,
  delayMs: number,
): Promise<void> {
  try {
    await noShowQueue.add('no-show-check', data, { delay: delayMs });
    logger.info('No-show check job enqueued', {
      bookingId: data.bookingId,
      delayMs,
    });
  } catch (err) {
    logger.error('Failed to enqueue no-show check', {
      bookingId: data.bookingId,
      error:     err instanceof Error ? err.message : String(err),
    });
  }
}
