/**
 * Payroll controller — Phase 4.6
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';

import * as payrollService from './payroll.service';
import { success }         from '../../utils/apiResponse';
import { AppError }        from '../../errors/AppError';
import { prisma }          from '../../lib/prisma';
import type {
  GeneratePayrollBody,
  ListPayrollReportsQuery,
  MyEarningsQuery,
} from './payroll.schema';

/**
 * POST /api/payroll/generate
 */
export async function generatePayroll(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const body     = req.body as GeneratePayrollBody;
    const result   = await payrollService.generatePayroll(tenantId, body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payroll/reports
 */
export async function listReports(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const query    = req.query as unknown as ListPayrollReportsQuery;
    const result   = await payrollService.listReports(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payroll/reports/:id
 */
export async function getReport(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const { id }   = req.params;
    const result   = await payrollService.getReport(tenantId, id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payroll/my-earnings
 * Artist self-service — scoped to the calling artist.
 */
export async function getMyEarnings(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query  = req.query as unknown as MyEarningsQuery;

    const artist = await prisma.artist.findUnique({
      where:  { userId },
      select: { id: true },
    });

    if (!artist) {
      throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist profile not found for this user');
    }

    const result = await payrollService.getMyEarnings(artist.id, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
