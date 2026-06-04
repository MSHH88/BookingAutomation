/**
 * Rota module — Zod validation schemas — Phase 6.1
 *
 * Endpoints:
 *   GET    /api/rota/week?from=YYYY-MM-DD  — weekly rota grid (all artists)
 *   GET    /api/rota/shifts               — list shifts (ADMIN)
 *   POST   /api/rota/shifts               — create shift (ADMIN)
 *   GET    /api/rota/shifts/:id           — get shift (ADMIN)
 *   PATCH  /api/rota/shifts/:id           — update shift (ADMIN)
 *   DELETE /api/rota/shifts/:id           — delete shift (ADMIN)
 *   POST   /api/rota/shifts/:id/override  — one-off override (ADMIN)
 */
import { z } from 'zod';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Validates HH:MM 24-hour time string */
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format (24-hour)');

// ─── GET /api/rota/week ───────────────────────────────────────────────────────

export const weekRotaQuerySchema = z.object({
  query: z.object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be in YYYY-MM-DD format'),
  }),
});

// ─── GET /api/rota/shifts ─────────────────────────────────────────────────────

export const listShiftsQuerySchema = z.object({
  query: z.object({
    artistId: z.string().trim().max(50).optional(),
  }),
});

// ─── POST /api/rota/shifts ────────────────────────────────────────────────────

export const createShiftSchema = z.object({
  body: z
    .object({
      artistId:      z.string().trim().min(1, 'artistId is required'),
      dayOfWeek:     z.number().int().min(0).max(6),
      startTime:     timeString,
      endTime:       timeString,
      isRecurring:   z.boolean().optional(),
      effectiveFrom: z.string().datetime({ message: 'effectiveFrom must be an ISO datetime' }),
      effectiveUntil: z
        .string()
        .datetime({ message: 'effectiveUntil must be an ISO datetime' })
        .optional(),
    })
    .refine(
      (b) => b.startTime < b.endTime,
      { message: 'startTime must be before endTime', path: ['endTime'] },
    ),
});

// ─── GET/PATCH/DELETE /api/rota/shifts/:id ────────────────────────────────────

export const shiftIdParamSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
});

const updateShiftBody = z.object({
  dayOfWeek:     z.number().int().min(0).max(6).optional(),
  startTime:     timeString.optional(),
  endTime:       timeString.optional(),
  isRecurring:   z.boolean().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().nullable().optional(),
});
type UpdateShiftBodyRaw = z.infer<typeof updateShiftBody>;

export const updateShiftSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
  body: updateShiftBody.refine(
    (b: UpdateShiftBodyRaw) => Object.keys(b).length > 0,
    { message: 'At least one field is required' },
  ),
});

// ─── POST /api/rota/shifts/:id/override ──────────────────────────────────────

export const createOverrideSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
  body: z
    .object({
      date:      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
      isOff:     z.boolean().optional(),
      startTime: timeString.optional(),
      endTime:   timeString.optional(),
    })
    .refine(
      (b) => {
        if (b.isOff) return true;
        return b.startTime !== undefined && b.endTime !== undefined;
      },
      { message: 'startTime and endTime are required unless isOff is true' },
    )
    .refine(
      (b) => {
        if (b.isOff || !b.startTime || !b.endTime) return true;
        return b.startTime < b.endTime;
      },
      { message: 'startTime must be before endTime', path: ['endTime'] },
    ),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type WeekRotaQuery    = z.infer<typeof weekRotaQuerySchema>['query'];
export type ListShiftsQuery  = z.infer<typeof listShiftsQuerySchema>['query'];
export type CreateShiftBody  = z.infer<typeof createShiftSchema>['body'];
export type UpdateShiftBody  = z.infer<typeof updateShiftSchema>['body'];
export type CreateOverrideBody = z.infer<typeof createOverrideSchema>['body'];
