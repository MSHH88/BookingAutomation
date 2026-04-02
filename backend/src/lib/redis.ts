import Redis from 'ioredis';

let client: Redis | null = null;

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
    // Log but don't crash — Redis being unavailable degrades caching/queues,
    // but the core API remains functional.
    console.error(`[Redis] ${err.message}`);
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

/** Gracefully closes the Redis connection and clears the singleton. */
export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
