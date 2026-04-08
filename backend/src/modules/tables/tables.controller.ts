/**
 * Tables controller — Step 1.24
 *
 * One handler per endpoint. HTTP concerns only — request parsing, service
 * delegation, and response serialisation. All business logic lives in
 * tables.service.ts.
 */
import { Request, Response, NextFunction } from 'express';
import * as tablesService from './tables.service';
import { success }        from '../../utils/apiResponse';
import type {
  ListTablesQuery,
  ListTableAvailQuery,
  CreateTableBody,
  UpdateTableBody,
} from './tables.schema';

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/tables
 * Public — list tables. Defaults to active tables; pass ?isActive=false for all.
 */
export async function listTables(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tables = await tablesService.listTables(req.query as ListTablesQuery);
    res.json(success(tables));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tables/availability
 * Public — returns tables available for the given date, time, and party size.
 * Query: date (YYYY-MM-DD), time (HH:MM), partySize, [durationMinutes]
 */
export async function getTableAvailability(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListTableAvailQuery;
    const tables = await tablesService.getTableAvailability(query);
    res.json(success(tables));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tables
 * ADMIN — create a new table.
 */
export async function createTable(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const table = await tablesService.createTable(req.body as CreateTableBody);
    res.status(201).json(success(table));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/tables/:id
 * ADMIN — partially update a table.
 */
export async function updateTable(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const table = await tablesService.updateTable(id, req.body as UpdateTableBody);
    res.json(success(table));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/tables/:id
 * ADMIN — soft-delete (deactivate) a table.
 * Returns 204 No Content on success.
 */
export async function deleteTable(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await tablesService.deleteTable(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
