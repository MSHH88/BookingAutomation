import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client.
 *
 * In development with hot-reload (tsx watch), module re-evaluation would create
 * a new PrismaClient on every file change, exhausting the connection pool.
 * Caching the instance on `global` prevents that.
 */
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
