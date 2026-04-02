import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * requestLogger middleware.
 *
 * Must be mounted BEFORE all route handlers.
 *
 * Responsibilities:
 *  1. Assigns a UUID to `req.id` for log correlation.
 *  2. Records `req.startTime` to compute response duration.
 *  3. Sends `X-Request-Id` response header so clients can trace issues.
 *  4. Logs method, path, status code, and duration when the response finishes.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  req.id = uuidv4();
  req.startTime = Date.now();

  // Expose the correlation ID immediately so it's available in all subsequent logs
  res.setHeader('X-Request-Id', req.id);

  res.on('finish', () => {
    const durationMs = Date.now() - req.startTime;
    const meta = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP request', meta);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP request', meta);
    } else {
      logger.info('HTTP request', meta);
    }
  });

  next();
}
