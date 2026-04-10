/**
 * Health Flags controller — Phase 3.1
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';

import * as healthFlagsService from './health-flags.service';
import { success }             from '../../utils/apiResponse';
import type { CreateHealthFlagBody } from './health-flags.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/health-flags/:customerId
 * Returns all health flags for a customer.
 */
export async function listHealthFlags(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { customerId } = req.params as { customerId: string };
    const tenantId       = req.user!.tenantId!;
    const flags          = await healthFlagsService.listHealthFlags(customerId, tenantId);
    res.json(success(flags));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/health-flags/:customerId
 * Creates a new health flag for a customer.
 */
export async function createHealthFlag(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { customerId } = req.params as { customerId: string };
    const tenantId       = req.user!.tenantId!;
    const body           = req.body as CreateHealthFlagBody;
    const flag           = await healthFlagsService.createHealthFlag(customerId, tenantId, body);
    res.status(201).json(success(flag));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/health-flags/:customerId/:flagId
 * Deletes a health flag by ID.
 */
export async function deleteHealthFlag(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { customerId, flagId } = req.params as { customerId: string; flagId: string };
    const tenantId               = req.user!.tenantId!;
    const result                 = await healthFlagsService.deleteHealthFlag(customerId, flagId, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
