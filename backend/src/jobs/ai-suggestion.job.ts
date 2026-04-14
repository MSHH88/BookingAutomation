/**
 * AI Suggestion job — Phase 8.2
 *
 * BullMQ job that generates AI-powered rebooking suggestions after a booking
 * is completed.
 *
 * Flow:
 *   1. bookings.service.ts enqueues an `ai-suggestion` job when a booking is
 *      marked COMPLETED (and AI_SUGGESTIONS_ENABLED is true).
 *   2. The worker fetches booking details, calls OpenAI to generate a message,
 *      and persists an AISuggestion record with status PENDING.
 *   3. Admins can review/approve suggestions via GET /api/ai/suggestions.
 *   4. Approved suggestions can be sent via POST /api/ai/suggestions/:id/send.
 *
 * Feature flag: AI_SUGGESTIONS_ENABLED
 */

import Redis                  from 'ioredis';
import { Queue, Worker, Job } from 'bullmq';

import { config }           from '../config';
import { logger }           from '../utils/logger';
import { prisma }           from '../lib/prisma';
import { isFeatureEnabled } from '../middleware/requireFeature';
import { generateSuggestion } from '../lib/openai';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AI_SUGGESTION_QUEUE_NAME = 'ai-suggestion' as const;

// ─── Job types ────────────────────────────────────────────────────────────────

export interface AISuggestionJobData {
  bookingId: string;
}

// ─── Redis connection ─────────────────────────────────────────────────────────

function createBullConnection(): Redis {
  const url = config.REDIS_URL || 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
    lazyConnect:          true,
  });
}

// ─── Queue (lazy singleton) ───────────────────────────────────────────────────

let _aiSuggestionQueue: Queue<AISuggestionJobData> | null = null;

export function getAISuggestionQueue(): Queue<AISuggestionJobData> {
  if (!_aiSuggestionQueue) {
    _aiSuggestionQueue = new Queue<AISuggestionJobData>(AI_SUGGESTION_QUEUE_NAME, {
      connection: createBullConnection(),
      defaultJobOptions: {
        attempts:          3,
        backoff:           { type: 'exponential', delay: 10000 },
        removeOnComplete:  { count: 50 },
        removeOnFail:      { count: 100 },
      },
    });
  }
  return _aiSuggestionQueue;
}

// ─── Enqueue ──────────────────────────────────────────────────────────────────

/** Enqueues an AI suggestion job for a completed booking (fire-and-forget). */
export function enqueueAISuggestion(bookingId: string): void {
  void isFeatureEnabled('AI_SUGGESTIONS_ENABLED').then((enabled) => {
    if (!enabled) return;
    void getAISuggestionQueue()
      .add('generate', { bookingId }, { delay: 5 * 60 * 1000 }) // 5 min delay
      .catch((err) => {
        logger.error('Failed to enqueue AI suggestion job', { bookingId, err });
      });
  });
}

// ─── Worker ───────────────────────────────────────────────────────────────────

async function processAISuggestionJob(job: Job<AISuggestionJobData>): Promise<void> {
  const { bookingId } = job.data;

  const enabled = await isFeatureEnabled('AI_SUGGESTIONS_ENABLED');
  if (!enabled) {
    logger.debug('AI suggestion job skipped — AI_SUGGESTIONS_ENABLED is off', { bookingId });
    return;
  }

  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: {
      id:        true,
      startAt:   true,
      tenantId:  true,
      customerId: true,
      customer:  { select: { name: true } },
      lead:      { select: { name: true } },
      services:  { select: { service: { select: { id: true, name: true } } }, take: 1 },
    },
  });

  if (!booking) {
    logger.warn('AI suggestion job: booking not found', { bookingId });
    return;
  }

  const customerId = booking.customerId;
  if (!customerId) {
    logger.debug('AI suggestion job: booking has no customer, skipping', { bookingId });
    return;
  }

  // Idempotency guard: skip if a suggestion was already created for this booking
  const existing = await prisma.aISuggestion.findFirst({
    where:  { bookingId },
    select: { id: true },
  });
  if (existing) {
    logger.debug('AI suggestion job: suggestion already exists, skipping', { bookingId });
    return;
  }

  const customerName = booking.customer?.name ?? booking.lead?.name ?? 'Valued Customer';
  const service      = booking.services[0]?.service;
  const serviceName  = service?.name ?? 'your recent appointment';
  const studioName   = config.STUDIO_NAME || 'our studio';

  let message: string;
  try {
    message = await generateSuggestion({
      customerName,
      serviceName,
      lastBookingAt: booking.startAt,
      studioName,
    });
  } catch (err) {
    logger.error('AI suggestion job: OpenAI generation failed', { bookingId, err });
    // Re-throw so BullMQ retries
    throw err;
  }

  await prisma.aISuggestion.create({
    data: {
      tenantId:   booking.tenantId,
      customerId,
      bookingId:  bookingId,
      message,
      serviceId:  service?.id ?? null,
      status:     'PENDING',
    },
  });

  logger.info('AI suggestion created', { bookingId, customerId });
}

// ─── Worker factory ───────────────────────────────────────────────────────────

/** Starts the AI suggestion BullMQ worker. */
export function startAISuggestionWorker(): Worker<AISuggestionJobData> {
  const worker = new Worker<AISuggestionJobData>(
    AI_SUGGESTION_QUEUE_NAME,
    processAISuggestionJob,
    {
      connection:  createBullConnection(),
      concurrency: 2,
    },
  );

  worker.on('completed', (job) => {
    logger.info('AI suggestion job completed', { jobId: job.id, bookingId: job.data.bookingId });
  });

  worker.on('failed', (job, err) => {
    logger.error('AI suggestion job failed', { jobId: job?.id, err });
  });

  return worker;
}
