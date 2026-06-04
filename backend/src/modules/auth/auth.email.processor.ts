/**
 * Auth email BullMQ processor — sends password reset emails via Resend.
 */
import Redis from 'ioredis';
import { Worker, Job } from 'bullmq';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { resend } from '../../lib/resend';
import { AUTH_EMAIL_QUEUE_NAME, PasswordResetJobData } from './auth.email.queue';

function createBullConnection(): Redis {
  return new Redis(config.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
}

async function processPasswordReset(job: Job<PasswordResetJobData>): Promise<void> {
  const { email, name, resetToken } = job.data;
  const frontendUrl = config.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  await resend.emails.send({
    from: `${config.RESEND_FROM_NAME || config.STUDIO_NAME} <${config.RESEND_FROM_EMAIL || 'noreply@example.com'}>`,
    to: email,
    subject: 'Reset your password',
    html: `
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link expires in 1 hour. If you did not request a password reset, please ignore this email.</p>
      <p>The ${config.STUDIO_NAME} team</p>
    `,
  });

  logger.info('Password reset email sent', { email });
}

export function startAuthEmailWorker(): Worker<PasswordResetJobData> {
  const worker = new Worker<PasswordResetJobData>(
    AUTH_EMAIL_QUEUE_NAME,
    processPasswordReset,
    {
      connection: createBullConnection(),
      concurrency: 2,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error('Password reset email job failed', {
      jobId: job?.id,
      email: job?.data?.email,
      err,
    });
  });

  return worker;
}
