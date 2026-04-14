import Redis from 'ioredis';
import { logger } from '../utils/logger';

let client: Redis | null = null;

/** Tracks whether the last startup ping succeeded. */
let _redisHealthy: boolean | null = null;

function createClient(): Redis {
  const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

  const redis = new Redis(url, {
    /**
     * `null` = unlimited retries per request.
     * Required for BullMQ queue workers; safe for regular usage too
     * because our error handler / circuit-breaker logic sits above this.
     */
    maxRetriesPerRequest: null,
    /**
     * Skip the PING handshake on connection. Allows ioredis to connect
     * faster and avoids blocking startup when Redis is temporarily unavailable.
     */
    enableReadyCheck: false,
    /**
     * Don't attempt to connect until the first command is issued.
     * Prevents startup errors when Redis is optional (local dev without Docker).
     */
    lazyConnect: true,
  });

  redis.on('error', (err: Error) => {
    // Log through Winston so Redis errors appear in structured prod log streams
    // (Datadog, CloudWatch, etc.) rather than only raw stdout.
    logger.error(`[Redis] ${err.message}`, { errorName: err.name });
  });

  return redis;
}

/** Returns the singleton Redis client, initialising it on first call. */
export function getRedis(): Redis {
  if (!client) {
    client = createClient();
  }
  return client;
}

/**
 * Performs a PING health check against Redis.
 * Sets the internal health flag and logs a warning when Redis is unreachable.
 * Called once at application startup (server.ts).
 */
export async function pingRedis(): Promise<void> {
  try {
    const redis = getRedis();
    await redis.ping();
    _redisHealthy = true;
    logger.info('[Redis] Connection OK');
  } catch (err) {
    _redisHealthy = false;
    logger.warn('[Redis] Startup ping failed — Redis is unavailable. Queue and caching features are degraded.', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Returns `true` if the last startup ping succeeded, `false` if it failed,
 * or `null` if `pingRedis()` has not been called yet.
 */
export function isRedisHealthy(): boolean | null {
  return _redisHealthy;
}

/** Gracefully closes the Redis connection and clears the singleton. */
export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
