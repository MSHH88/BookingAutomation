/**
 * Leads controller — one handler per endpoint.
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic and DB access lives in leads.service.ts.
 *
 * The CSV export endpoint sets the correct Content-Disposition and
 * Content-Type headers so the browser triggers a file download.
 */
import { Request, Response, NextFunction } from 'express';

import * as leadsService from './leads.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  CreateLeadBody,
  ListLeadsQuery,
  ExportLeadsQuery,
  UpdateLeadStatusBody,
  UpdateLeadScoreBody,
} from './leads.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract real client IP, respecting X-Forwarded-For in production. */
function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) {
    return forwarded[0]?.split(',')[0]?.trim();
  }
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim();
  }
  return req.socket.remoteAddress;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/leads
 * Public. Receives a customer inquiry and creates a Lead record.
 * Gated by requireFeature('LEAD_CAPTURE_ENABLED') in the router.
 */
export async function createLead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body      = req.body as CreateLeadBody;
    const ipAddress = getClientIp(req);
    const lead      = await leadsService.createLead(body, ipAddress);
    res.status(201).json(success(lead));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads
 * ADMIN only. Returns a paginated list of leads with optional filters.
 */
export async function listLeads(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = req.query as ListLeadsQuery;
    const result = await leadsService.listLeads(query);
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads/export
 * ADMIN only. Streams all leads as a CSV file download.
 *
 * NOTE: This route MUST be registered before `GET /api/leads/:id` in the
 * router so that 'export' is matched as a literal path, not an `:id` param.
 */
export async function exportLeads(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as ExportLeadsQuery;
    const { csv, filename } = await leadsService.exportLeadsCsv(query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads/:id
 * ADMIN only. Returns full lead detail including quotes and analytics events.
 */
export async function getLeadById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const lead   = await leadsService.getLeadById(id);
    res.json(success(lead));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/leads/:id/status
 * ADMIN only. Advances or terminates a lead through the CRM pipeline.
 */
export async function updateLeadStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body   = req.body as UpdateLeadStatusBody;
    const lead   = await leadsService.updateLeadStatus(id, body);
    res.json(success(lead));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/leads/:id/score
 * ADMIN only. Sets the CRM quality score (0–100) for a lead.
 */
export async function updateLeadScore(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body   = req.body as UpdateLeadScoreBody;
    const lead   = await leadsService.updateLeadScore(id, body);
    res.json(success(lead));
  } catch (err) {
    next(err);
  }
}
