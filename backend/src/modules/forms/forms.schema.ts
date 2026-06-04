/**
 * Intake / Consent Forms schemas — Phase 3.2
 *
 * Zod validation schemas for the forms module API.
 *
 * Endpoints:
 *   GET    /api/forms                       — list all forms for tenant
 *   GET    /api/forms/:id                   — get form by ID
 *   POST   /api/forms                       — create a new form
 *   PATCH  /api/forms/:id                   — update a form
 *   DELETE /api/forms/:id                   — deactivate a form
 *   GET    /api/forms/:id/responses         — list responses for a form
 *   GET    /api/forms/public/:bookingToken  — get form for a booking (public)
 *   POST   /api/forms/public/:bookingToken  — submit form response (public)
 */
import { z } from 'zod';

// ─── Field types ──────────────────────────────────────────────────────────────

export const FIELD_TYPES = ['text', 'checkbox', 'dropdown', 'date', 'signature'] as const;

export const formFieldSchema = z.object({
  name:     z.string().min(1),
  type:     z.enum(FIELD_TYPES),
  label:    z.string().min(1),
  required: z.boolean(),
  options:  z.array(z.string()).optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;

// ─── GET /api/forms/:id  &  DELETE /api/forms/:id ─────────────────────────────

export const formByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── POST /api/forms ──────────────────────────────────────────────────────────

export const createFormSchema = z.object({
  body: z.object({
    name:         z.string().min(1, 'name is required'),
    serviceTypes: z.array(z.string()).default([]),
    fields:       z.array(formFieldSchema).min(1, 'at least one field is required'),
    isActive:     z.boolean().optional(),
  }),
});

export type CreateFormBody = z.infer<typeof createFormSchema>['body'];

// ─── PATCH /api/forms/:id ─────────────────────────────────────────────────────

export const updateFormSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z.object({
    name:         z.string().min(1).optional(),
    serviceTypes: z.array(z.string()).optional(),
    fields:       z.array(formFieldSchema).min(1).optional(),
    isActive:     z.boolean().optional(),
  }),
});

export type UpdateFormBody = z.infer<typeof updateFormSchema>['body'];

// ─── GET /api/forms/:id/responses ─────────────────────────────────────────────

export const listFormResponsesSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

// ─── GET / POST /api/forms/public/:bookingToken ───────────────────────────────

export const publicFormSchema = z.object({
  params: z.object({
    bookingToken: z.string().min(1, 'bookingToken is required'),
  }),
});

export const submitPublicFormSchema = z.object({
  params: z.object({
    bookingToken: z.string().min(1, 'bookingToken is required'),
  }),
  body: z.object({
    answers: z.record(z.unknown()),
  }),
});

export type SubmitPublicFormBody = z.infer<typeof submitPublicFormSchema>['body'];
