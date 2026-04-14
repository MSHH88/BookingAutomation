/**
 * Memberships controller — Phase 5.2
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';

import * as membershipsService from './memberships.service';
import { success }             from '../../utils/apiResponse';
import { AppError }            from '../../errors/AppError';
import type {
  CreateMembershipBody,
  UpdateMembershipBody,
  ListMembershipsQuery,
  SubscribeBody,
  ListCustomerMembershipsQuery,
} from './memberships.schema';

// ─── Plan CRUD ─────────────────────────────────────────────────────────────────

export async function createMembership(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const body     = req.body as CreateMembershipBody;
    const result   = await membershipsService.createMembership(tenantId, body);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function listMemberships(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const query    = req.query as unknown as ListMembershipsQuery;
    const result   = await membershipsService.listMemberships(tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function getMembershipById(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const { id }   = req.params as { id: string };
    const result   = await membershipsService.getMembershipById(id, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function updateMembership(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const { id }   = req.params as { id: string };
    const body     = req.body as UpdateMembershipBody;
    const result   = await membershipsService.updateMembership(id, tenantId, body);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function deleteMembership(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const { id }   = req.params as { id: string };
    const result   = await membershipsService.deleteMembership(id, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── Subscriptions ─────────────────────────────────────────────────────────────

export async function subscribeMember(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const { id }   = req.params as { id: string };
    const body     = req.body as SubscribeBody;
    const result   = await membershipsService.subscribeMember(id, body, tenantId);
    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscription(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const { subId } = req.params as { subId: string };
    const result   = await membershipsService.cancelSubscription(subId, tenantId);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── Customer views ────────────────────────────────────────────────────────────

export async function listCustomerMemberships(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const { customerId } = req.params as { customerId: string };
    const query          = req.query as unknown as ListCustomerMembershipsQuery;
    const result         = await membershipsService.listCustomerMemberships(customerId, tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

export async function getMyMemberships(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const customerId = req.user!.id;
    const tenantId   = req.user?.tenantId ?? null;
    if (tenantId === null) throw new AppError(400, 'TENANT_REQUIRED', 'A tenant context is required for this operation');
    const query      = req.query as unknown as ListCustomerMembershipsQuery;
    const result     = await membershipsService.listCustomerMemberships(customerId, tenantId, query);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}
