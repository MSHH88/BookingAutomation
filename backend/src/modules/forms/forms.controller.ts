/**
 * Intake / Consent Forms controller — Phase 3.2
 *
 * HTTP concerns only: parse request, call service, send response.
 */
import { Request, Response, NextFunction } from 'express';
import { extractTenantId } from '../../utils/extractTenantId';

import * as formsService from './forms.service';
import { success }       from '../../utils/apiResponse';
import type { CreateFormBody, UpdateFormBody, SubmitPublicFormBody } from './forms.schema';

// ─── Admin Handlers ───────────────────────────────────────────────────────────

/** GET /api/forms — list all forms for tenant */
export async function listForms(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const forms    = await formsService.listForms(tenantId);
    res.json(success(forms));
  } catch (err) {
    next(err);
  }
}

/** GET /api/forms/:id — get form by ID */
export async function getFormById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = extractTenantId(req);
    const form     = await formsService.getFormById(id, tenantId);
    res.json(success(form));
  } catch (err) {
    next(err);
  }
}

/** POST /api/forms — create a new form */
export async function createForm(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = extractTenantId(req);
    const data     = req.body as CreateFormBody;
    const form     = await formsService.createForm(tenantId, data);
    res.status(201).json(success(form));
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/forms/:id — update a form */
export async function updateForm(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = extractTenantId(req);
    const data     = req.body as UpdateFormBody;
    const form     = await formsService.updateForm(id, tenantId, data);
    res.json(success(form));
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/forms/:id — soft-delete (deactivate) a form */
export async function deleteForm(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = extractTenantId(req);
    await formsService.deleteForm(id, tenantId);
    res.json(success({ message: 'Form deactivated' }));
  } catch (err) {
    next(err);
  }
}

/** GET /api/forms/:id/responses — list responses for a form */
export async function listFormResponses(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id }   = req.params as { id: string };
    const tenantId = extractTenantId(req);
    const responses = await formsService.listFormResponses(id, tenantId);
    res.json(success(responses));
  } catch (err) {
    next(err);
  }
}

// ─── Public Handlers ──────────────────────────────────────────────────────────

/** GET /api/forms/public/:bookingToken — get form for a booking (no auth) */
export async function getPublicForm(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { bookingToken } = req.params as { bookingToken: string };
    const result = await formsService.getPublicForm(bookingToken);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/** POST /api/forms/public/:bookingToken — submit form response (no auth) */
export async function submitPublicForm(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { bookingToken } = req.params as { bookingToken: string };
    const { answers }      = req.body as SubmitPublicFormBody;
    const response = await formsService.submitPublicForm(bookingToken, answers);
    res.status(201).json(success(response));
  } catch (err) {
    next(err);
  }
}
