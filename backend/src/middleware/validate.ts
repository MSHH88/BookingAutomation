/**
 * Reusable Zod validation middleware.
 *
 * Validates { body, query, params } from the incoming request against a
 * Zod schema structured as { body?: z.ZodObject, query?: ..., params?: ... }.
 *
 * On success: replaces req.body/query/params with the validated (and
 * potentially transformed) data and calls next().
 * On failure: passes the ZodError to next() so the global errorHandler
 * converts it to a 400 VALIDATION_ERROR response.
 *
 * Usage (in a routes file):
 *   import { validate } from '../../middleware/validate';
 *   import { registerSchema } from './auth.schema';
 *   router.post('/register', validate(registerSchema), ctrl.register);
 */
import { Request, Response, NextFunction } from 'express';
import { z, ZodError, AnyZodObject } from 'zod';
import type { ParsedQs } from 'qs';

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      next(result.error as ZodError);
      return;
    }

    // Assign the validated (and coerced/trimmed) values back to the request
    // so controllers receive clean, typed data from all three sources.
    const data = result.data as z.infer<typeof schema>;
    if (data.body !== undefined) req.body = data.body as Record<string, unknown>;
    if (data.query !== undefined) req.query = data.query as ParsedQs;
    if (data.params !== undefined) req.params = data.params as Record<string, string>;

    next();
  };
}
