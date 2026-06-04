/**
 * Auth email BullMQ queue — password reset email jobs.
 */
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export const AUTH_EMAIL_QUEUE_NAME = 'auth-email' as const;

export interface PasswordResetJobData {
  email: string;
  name: string;
  resetToken: string;
  expiresAt: string; // ISO string
}

function createBullConnection(): Redis {
  return new Redis(config.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
}

export const authEmailQueue = new Queue<PasswordResetJobData>(AUTH_EMAIL_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 50 },
  },
});

export async function enqueuePasswordResetEmail(data: PasswordResetJobData): Promise<void> {
  try {
    await authEmailQueue.add('password-reset', data);
    logger.info('Password reset email job enqueued', { email: data.email });
  } catch (err) {
    logger.error('Failed to enqueue password reset email', { err, email: data.email });
    // Intentionally not re-thrown — caller should not fail if email queue is down
  }
}
