/**
 * AppError — represents all intentional, operational errors thrown in the application.
 *
 * The global errorHandler maps `AppError` instances directly to HTTP responses.
 * Non-operational errors (programming bugs) should NOT use this class; they are
 * caught by the errorHandler and returned as 500 INTERNAL_ERROR.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;
  /**
   * `isOperational = true`  → known, expected error (e.g. 404, 400, 403)
   * `isOperational = false` → unexpected programmer error treated as AppError
   */
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: unknown = null,
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    // Keeps the stack trace pointing at the call site, not this constructor
    Error.captureStackTrace(this, this.constructor);
  }
}
