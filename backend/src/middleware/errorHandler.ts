import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
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
 *  PrismaClientValidationError       → 400 BAD_REQUEST       (invalid query arguments)
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
  // req.id may be undefined if the error was thrown before requestLogger ran
  // (e.g. a CORS rejection). Use a safe fallback so logs are always valid.
  const requestId = req.id || '<no-request-id>';

  // ── Multer file-upload errors ─────────────────────────────────────────────
  // Thrown when the Multer middleware rejects a file due to size, count, or
  // field-name limits.  All Multer limit errors map to 400 Bad Request so the
  // client knows exactly what constraint was violated.
  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE:        `File too large — maximum size is 10 MB per image.`,
      LIMIT_FILE_COUNT:       `Too many files — a maximum of 10 images per request is allowed.`,
      LIMIT_UNEXPECTED_FILE:  `Unexpected field name. Use the "images" multipart field.`,
      LIMIT_PART_COUNT:       `Too many form parts in the multipart request.`,
      LIMIT_FIELD_KEY:        `Field name too long.`,
      LIMIT_FIELD_VALUE:      `Field value too long.`,
      LIMIT_FIELD_COUNT:      `Too many fields in the multipart request.`,
    };
    res.status(400).json(
      apiError(
        'UPLOAD_LIMIT_EXCEEDED',
        messages[err.code] ?? `Upload error: ${err.message}`,
      ),
    );
    return;
  }

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

  // ── Prisma validation errors (invalid query arguments) ────────────────────
  // Thrown when Prisma receives arguments that don't match the schema
  // (e.g. wrong field type). This is always a client/developer error → 400.
  if (err instanceof Prisma.PrismaClientValidationError) {
    res
      .status(400)
      .json(apiError('BAD_REQUEST', 'Invalid request — check your request body and parameters'));
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
        // Unknown Prisma error — fall through to the generic 500 handler below
        break;
    }
  }

  // ── Operational application errors ────────────────────────────────────────
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational AppError', {
        requestId,
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
    requestId,
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
