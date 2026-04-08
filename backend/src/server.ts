/**
 * HTTP server entry point.
 *
 * Responsibilities:
 *  - Import config FIRST so dotenv runs before any other module reads process.env
 *  - Create the http.Server wrapping the Express app
 *  - Start listening
 *  - Register SIGTERM / SIGINT handlers for graceful shutdown
 *  - Register uncaughtException / unhandledRejection safety nets
 */
import { config } from './config/index'; // Must be first — populates process.env
import http from 'http';
import { app } from './app';
import { logger } from './utils/logger';
import { prisma } from './lib/prisma';
import { disconnectRedis } from './lib/redis';
import { startWhatsAppWorker, whatsappQueue } from './modules/whatsapp/whatsapp.queue';
import { startReviewWorker }                  from './modules/reviews/reviews.processor';
import { reviewQueue }                        from './modules/reviews/reviews.queue';
import { startReminderWorker }                from './modules/reminders/reminders.processor';
import { reminderQueue }                      from './modules/reminders/reminders.queue';
import { startWebhookWorker, webhookQueue }   from './modules/webhooks/webhooks.queue';

// ─── Create server ────────────────────────────────────────────────────────────

const server = http.createServer(app);

// ─── Start BullMQ workers ─────────────────────────────────────────────────────
// Workers must be started before requests are served so that any delayed jobs
// recovered from Redis (e.g. review requests, WhatsApp reminders) are picked
// up immediately.  The returned Worker instances are stored for graceful shutdown.
const whatsappWorker = startWhatsAppWorker();
const reviewWorker   = startReviewWorker();
const reminderWorker = startReminderWorker();
const webhookWorker  = startWebhookWorker();

// ─── Start listening ──────────────────────────────────────────────────────────

server.listen(config.PORT, () => {
  logger.info('Server started', {
    port: config.PORT,
    env: config.NODE_ENV,
    pid: process.pid,
  });
});

// Handle server-level errors (e.g. EADDRINUSE) so the failure is diagnosed
// clearly before the process exits rather than routing through uncaughtException.
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${config.PORT} is already in use. Is another server process running?`, {
      code: err.code,
    });
  } else {
    logger.error('HTTP server error', { code: err.code, error: err.message });
  }
  process.exit(1);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

/**
 * Time (ms) we give in-flight requests to complete before forcibly closing.
 * Cloud providers (Kubernetes, ECS) send SIGTERM then wait ~30 s before SIGKILL,
 * so 10 s is a safe inner timeout.
 */
const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Guard against re-entrant shutdown calls.
 * Multiple signals (e.g. SIGTERM followed by SIGINT in a container) or an
 * uncaughtException firing during shutdown would otherwise call server.close()
 * and prisma.$disconnect() twice, causing harmless but noisy errors.
 */
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn(`Duplicate shutdown signal ignored: ${signal}`);
    return;
  }
  isShuttingDown = true;

  logger.info(`${signal} received — initiating graceful shutdown`);

  // 1. Stop accepting new TCP connections
  const closeHttp = new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  const timeout = new Promise<void>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS} ms`)),
      SHUTDOWN_TIMEOUT_MS,
    ),
  );

  try {
    await Promise.race([closeHttp, timeout]);
    logger.info('HTTP server closed');

    // 2. Stop the WhatsApp BullMQ Worker (wait for in-flight jobs to finish)
    await whatsappWorker.close();
    logger.info('WhatsApp worker closed');

    // 3. Close the WhatsApp BullMQ Queue (releases its Redis connection)
    await whatsappQueue.close();
    logger.info('WhatsApp queue closed');

    // 4. Stop the Review-Request BullMQ Worker
    await reviewWorker.close();
    logger.info('Review worker closed');

    // 5. Close the Review-Request BullMQ Queue
    await reviewQueue.close();
    logger.info('Review queue closed');

    // 6. Stop the Appointment Reminder BullMQ Worker
    await reminderWorker.close();
    logger.info('Reminder worker closed');

    // 7. Close the Appointment Reminder BullMQ Queue
    await reminderQueue.close();
    logger.info('Reminder queue closed');

    // 8. Stop the Webhook Delivery BullMQ Worker
    await webhookWorker.close();
    logger.info('Webhook worker closed');

    // 9. Close the Webhook Delivery BullMQ Queue
    await webhookQueue.close();
    logger.info('Webhook queue closed');

    // 10. Disconnect from Prisma (PostgreSQL connection pool)
    await prisma.$disconnect();
    logger.info('Prisma disconnected');

    // 11. Disconnect from Redis
    await disconnectRedis();
    logger.info('Redis disconnected');

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

// ─── Process signal handlers ──────────────────────────────────────────────────

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch((err: Error) => {
    logger.error('SIGTERM shutdown failed', { error: err.message });
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch((err: Error) => {
    logger.error('SIGINT shutdown failed', { error: err.message });
    process.exit(1);
  });
});

// ─── Safety nets ──────────────────────────────────────────────────────────────

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  gracefulShutdown('unhandledRejection').catch(() => process.exit(1));
});

export { server };
