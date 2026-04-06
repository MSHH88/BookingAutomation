/**
 * Zod schemas for the Availability API — Step 1.12
 *
 * Endpoints:
 *   GET    /api/availability              — list artist's weekly schedule
 *   PUT    /api/availability              — upsert artist's weekly schedule (full replace)
 *   GET    /api/availability/blocks       — list availability blocks (paginated)
 *   POST   /api/availability/blocks       — create an availability block
 *   DELETE /api/availability/blocks/:id   — delete an availability block
 *   GET    /api/availability/slots        — compute available booking slots (public)
 *
 * Role scoping:
 *   ARTIST — manages own availability; artistId is auto-resolved from the JWT.
 *   ADMIN  — manages any artist's availability; artistId is required in body / query.
 *   PUBLIC — read-only slot computation (GET /slots, no auth required).
 */
import { z } from 'zod';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** HH:MM time string, e.g. "09:00" or "18:30". */
const timeString = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .regex(
      /^([01]\d|2[0-3]):[0-5]\d$/,
      `${label} must be in HH:MM 24-hour format (e.g. "09:00")`,
    );

/** ISO 8601 date-time string with UTC offset or Z suffix. */
const isoDateTime = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .datetime({
      offset:  true,
      message: `${label} must be a valid ISO 8601 date-time (e.g. "2026-06-15T09:00:00Z")`,
    });

/** YYYY-MM-DD calendar date string. */
const isoDate = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .regex(
      /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/,
      `${label} must be a valid calendar date in YYYY-MM-DD format`,
    );

// ─── GET /api/availability ────────────────────────────────────────────────────

export const listScheduleSchema = z.object({
  query: z.object({
    artistId: z.string().trim().max(50).optional(),
  }),
});

export type ListScheduleQuery = z.infer<typeof listScheduleSchema>['query'];

// ─── PUT /api/availability ────────────────────────────────────────────────────

/** A single day's schedule entry. */
export const scheduleEntrySchema = z
  .object({
    dayOfWeek:  z.number().int().min(0, 'dayOfWeek must be 0–6').max(6, 'dayOfWeek must be 0–6'),
    startTime:  timeString('startTime'),
    endTime:    timeString('endTime'),
    breakStart: timeString('breakStart').optional(),
    breakEnd:   timeString('breakEnd').optional(),
    isActive:   z.boolean().default(true),
  })
  .refine(
    (d) => {
      const toMins = (t: string) =>
        parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
      return toMins(d.endTime) > toMins(d.startTime);
    },
    { message: 'endTime must be after startTime', path: ['endTime'] },
  )
  .refine(
    (d) => {
      // Both present or both absent
      const hasStart = d.breakStart !== undefined;
      const hasEnd   = d.breakEnd   !== undefined;
      return hasStart === hasEnd;
    },
    { message: 'breakStart and breakEnd must both be provided or both omitted' },
  )
  .refine(
    (d) => {
      if (!d.breakStart || !d.breakEnd) return true;
      const toMins = (t: string) =>
        parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
      return toMins(d.breakEnd) > toMins(d.breakStart);
    },
    { message: 'breakEnd must be after breakStart', path: ['breakEnd'] },
  );

export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;

export const upsertScheduleSchema = z.object({
  body: z.object({
    artistId: z.string().trim().max(50).optional(),
    schedule: z
      .array(scheduleEntrySchema)
      .min(1, 'schedule must contain at least one entry')
      .max(7, 'schedule cannot contain more than 7 entries (one per day)')
      .refine(
        (entries) => {
          const days = entries.map((e) => e.dayOfWeek);
          return days.length === new Set(days).size;
        },
        { message: 'Each dayOfWeek value must appear at most once' },
      ),
  }),
});

export type UpsertScheduleBody = z.infer<typeof upsertScheduleSchema>['body'];

// ─── GET /api/availability/blocks ─────────────────────────────────────────────

export const listBlocksSchema = z.object({
  query: z.object({
    artistId: z.string().trim().max(50).optional(),
    from:     z.string().optional(),
    to:       z.string().optional(),
    page:     z.string().optional(),
    limit:    z.string().optional(),
  }),
});

export type ListBlocksQuery = z.infer<typeof listBlocksSchema>['query'];

// ─── POST /api/availability/blocks ────────────────────────────────────────────

export const createBlockSchema = z.object({
  body: z
    .object({
      artistId: z.string().trim().max(50).optional(),
      startAt:  isoDateTime('startAt'),
      endAt:    isoDateTime('endAt'),
      reason:   z.string().trim().max(500).optional(),
    })
    .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
      message: 'endAt must be after startAt',
      path:    ['endAt'],
    }),
});

export type CreateBlockBody = z.infer<typeof createBlockSchema>['body'];

// ─── DELETE /api/availability/blocks/:id ──────────────────────────────────────

export const deleteBlockSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── GET /api/availability/slots ──────────────────────────────────────────────

export const getSlotsSchema = z.object({
  query: z.object({
    artistId:  z.string().trim().min(1, 'artistId is required').max(50),
    date:      isoDate('date'),
    serviceId: z.string().trim().max(50).optional(),
  }),
});

export type GetSlotsQuery = z.infer<typeof getSlotsSchema>['query'];

// ─── Shared response shapes ────────────────────────────────────────────────────

export interface ScheduleDay {
  id:         string;
  artistId:   string;
  dayOfWeek:  number;
  startTime:  string;
  endTime:    string;
  breakStart: string | null;
  breakEnd:   string | null;
  isActive:   boolean;
}

export interface AvailabilityBlockItem {
  id:        string;
  artistId:  string;
  startAt:   Date;
  endAt:     Date;
  reason:    string | null;
  createdAt: Date;
}

export interface AvailableSlot {
  /** ISO UTC date-time string for the slot start. */
  startAt: string;
  /** ISO UTC date-time string for the slot end. */
  endAt: string;
}
