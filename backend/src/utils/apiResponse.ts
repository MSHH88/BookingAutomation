/**
 * API response envelope helpers.
 *
 * Every response from the API uses one of these three shapes so clients
 * always have a predictable structure to parse.
 *
 * Success:    { success: true,  data: T,    meta: null,         error: null }
 * Paginated:  { success: true,  data: T[],  meta: PaginationMeta, error: null }
 * Error:      { success: false, data: null, meta: null,         error: {...} }
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: null;
  error: null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiPaginated<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
  error: null;
}

export interface ApiError {
  success: false;
  data: null;
  meta: null;
  error: {
    code: string;
    message: string;
    details: unknown;
  };
}

// ─── Builders ─────────────────────────────────────────────────────────────────

/** Wraps a single resource or plain value. */
export function success<T>(data: T): ApiSuccess<T> {
  return { success: true, data, meta: null, error: null };
}

/** Wraps a paginated list with its pagination metadata. */
export function paginated<T>(data: T[], meta: PaginationMeta): ApiPaginated<T> {
  return { success: true, data, meta, error: null };
}

/**
 * Wraps an error.
 *
 * @param code    - Machine-readable error code (e.g. "VALIDATION_ERROR")
 * @param message - Human-readable description
 * @param details - Optional structured details (e.g. Zod issue list)
 */
export function error(
  code: string,
  message: string,
  details: unknown = null,
): ApiError {
  return {
    success: false,
    data: null,
    meta: null,
    error: { code, message, details },
  };
}
