/**
 * Rota controller — Phase 6.1
 */
import { Request, Response, NextFunction } from 'express';

import * as rotaService from './rota.service';
import { success }         from '../../utils/apiResponse';
import type {
  WeekRotaQuery,
  ListShiftsQuery,
  CreateShiftBody,
  UpdateShiftBody,
  CreateOverrideBody,
} from './rota.schema';

export async function getWeekRota(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const { from } = req.query as WeekRotaQuery;
    const rota = await rotaService.getWeekRota(tenantId, from);
    res.json(success(rota));
  } catch (err) {
    next(err);
  }
}

export async function listShifts(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId  = req.user!.tenantId!;
    const { artistId } = req.query as ListShiftsQuery;
    const shifts = await rotaService.listShifts(tenantId, artistId);
    res.json(success(shifts));
  } catch (err) {
    next(err);
  }
}

export async function createShift(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const body     = req.body as CreateShiftBody;
    const shift    = await rotaService.createShift(tenantId, body);
    res.status(201).json(success(shift));
  } catch (err) {
    next(err);
  }
}

export async function getShift(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const { id }   = req.params as { id: string };
    const shift    = await rotaService.getShift(id, tenantId);
    res.json(success(shift));
  } catch (err) {
    next(err);
  }
}

export async function updateShift(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const { id }   = req.params as { id: string };
    const body     = req.body as UpdateShiftBody;
    const shift    = await rotaService.updateShift(id, tenantId, body);
    res.json(success(shift));
  } catch (err) {
    next(err);
  }
}

export async function deleteShift(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const { id }   = req.params as { id: string };
    await rotaService.deleteShift(id, tenantId);
    res.json(success({ deleted: true }));
  } catch (err) {
    next(err);
  }
}

export async function createOverride(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId!;
    const { id }   = req.params as { id: string };
    const body     = req.body as CreateOverrideBody;
    const override = await rotaService.createOverride(id, tenantId, body);
    res.status(201).json(success(override));
  } catch (err) {
    next(err);
  }
}
