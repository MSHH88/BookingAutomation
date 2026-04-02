import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import { error as apiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { config } from '../config/index';

/**
 * Global Express error handler.
 *
 * Must be the LAST middleware registered in app.ts (after all routes).
 * Express identifies it as an error handler because it accepts four parameters.
 *
 * Error mapping:
 *  ZodError                          → 400 VALIDATION_ERROR  (with field-level details)
 *  PrismaClientKnownRequestError
 *    P2025 (not found)               → 404 NOT_FOUND
 *    P2002 (unique constraint)       → 409 CONFLICT
 *    P2003 (foreign key constraint)  → 400 BAD_REQUEST
 *  AppError                          → statusCode / code from the error itself
 *  Everything else                   → 500 INTERNAL_ERROR (details hidden in production)
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction, // Required signature for Express error handlers
): void {
  // ── Zod validation errors ──────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json(
      apiError(
        'VALIDATION_ERROR',
        'Request validation failed',
        err.issues.map((issue) => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
          code: issue.code,
        })),
      ),
    );
    return;
  }

  // ── Known Prisma request errors ───────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2025': // Record to update/delete not found
        res.status(404).json(apiError('NOT_FOUND', 'Resource not found'));
        return;
      case 'P2002': // Unique constraint violation
        res.status(409).json(apiError('CONFLICT', 'Resource already exists'));
        return;
      case 'P2003': // Foreign key constraint violation
        res
          .status(400)
          .json(apiError('BAD_REQUEST', 'Invalid reference — related record not found'));
        return;
      default:
        // Fall through to the generic handler below
        break;
    }
  }

  // ── Operational application errors ────────────────────────────────────────
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational AppError', {
        requestId: req.id,
        error: err.message,
        stack: err.stack,
      });
    }
    res
      .status(err.statusCode)
      .json(apiError(err.code, err.message, err.details));
    return;
  }

  // ── Unknown / programmer errors ────────────────────────────────────────────
  const errorObj = err instanceof Error ? err : new Error(String(err));

  logger.error('Unhandled error', {
    requestId: req.id,
    error: errorObj.message,
    stack: errorObj.stack,
  });

  res.status(500).json(
    apiError(
      'INTERNAL_ERROR',
      config.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : errorObj.message,
      config.NODE_ENV === 'production' ? null : errorObj.stack,
    ),
  );
}
