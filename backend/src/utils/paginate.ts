import { PaginationMeta } from './apiResponse';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaginateParams {
  page?: number | string;
  limit?: number | string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export const MAX_PAGE_LIMIT = 100;
export const DEFAULT_PAGE_LIMIT = 20;

/**
 * Prisma model delegate shape required by `paginate()`.
 *
 * We use `any` here intentionally: Prisma generates per-model delegate types
 * that are not easily expressed generically. This is the standard pattern for
 * building generic Prisma utilities; callers remain fully type-safe.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDelegate = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  count(args?: any): Promise<number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findMany(args?: any): Promise<any[]>;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Executes a paginated Prisma query using a single `count` + `findMany` pair.
 *
 * @param delegate - Prisma model delegate (e.g. `prisma.user`)
 * @param args     - Standard Prisma query args (`where`, `orderBy`, `select`, `include`)
 *                   — do NOT include `skip` or `take`; those are injected by this helper.
 * @param params   - Pagination parameters (typically from `req.query`)
 *
 * @example
 * const result = await paginate<User>(
 *   prisma.user,
 *   { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
 *   { page: req.query.page, limit: req.query.limit },
 * );
 * res.json(paginated(result.data, result.meta));
 */
export async function paginate<T>(
  delegate: PrismaDelegate,
  args: Record<string, unknown>,
  params: PaginateParams,
): Promise<PaginatedResult<T>> {
  const page = Math.max(
    1,
    parseInt(String(params.page ?? 1), 10) || 1,
  );
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, parseInt(String(params.limit ?? DEFAULT_PAGE_LIMIT), 10) || DEFAULT_PAGE_LIMIT),
  );
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    delegate.count({ where: args['where'] }),
    delegate.findMany({ ...args, skip, take: limit }),
  ]);

  return {
    data: rows as T[],
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
