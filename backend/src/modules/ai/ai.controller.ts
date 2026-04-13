/**
 * AI controller — Phase 8.2
 *
 * HTTP handlers for AI suggestion management.
 */
import { Request, Response, NextFunction } from 'express';
import * as svc from './ai.service';
import { success, paginated } from '../../utils/apiResponse';
import type {
  ListAISuggestionsQuery,
  AISuggestionIdParams,
  UpdateAISuggestionBody,
} from './ai.schema';

// ─── listSuggestions ──────────────────────────────────────────────────────────

export async function listSuggestions(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = req.query as unknown as ListAISuggestionsQuery;
    const result = await svc.listSuggestions(req.user!.tenantId ?? null, query);
    res.json(paginated(result.items, {
      total:      result.total,
      page:       result.page,
      limit:      result.limit,
      totalPages: result.totalPages,
    }));
  } catch (err) {
    next(err);
  }
}

// ─── getSuggestion ────────────────────────────────────────────────────────────

export async function getSuggestion(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AISuggestionIdParams;
    const result = await svc.getSuggestion(req.user!.tenantId ?? null, id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── updateSuggestion ─────────────────────────────────────────────────────────

export async function updateSuggestion(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AISuggestionIdParams;
    const body   = req.body  as unknown as UpdateAISuggestionBody;
    const result = await svc.updateSuggestion(req.user!.tenantId ?? null, id, body);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ─── sendSuggestion ───────────────────────────────────────────────────────────

export async function sendSuggestion(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AISuggestionIdParams;
    await svc.sendSuggestion(req.user!.tenantId ?? null, id);
    res.json(success({ sent: true }));
  } catch (err) {
    next(err);
  }
}

// ─── dismissSuggestion ────────────────────────────────────────────────────────

export async function dismissSuggestion(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AISuggestionIdParams;
    await svc.dismissSuggestion(req.user!.tenantId ?? null, id);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}

