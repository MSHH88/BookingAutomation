/**
 * Zod schemas for all auth request bodies.
 *
 * Schemas are structured as { body: z.object({...}) } so they can be
 * used directly with the `validate` middleware, which parses
 * { body, query, params } from the incoming request.
 */
import { z } from 'zod';

// ─── Reusable fragments ───────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

// ─── Request schemas ──────────────────────────────────────────────────────────

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').trim(),
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    phone: z
      .string()
      .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number format')
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

/**
 * The refresh token may be sent in the request body (API / mobile clients)
 * or via the httpOnly cookie (browser clients).  The controller reads both.
 */
export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
  }),
});

export const updateMeSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(100).trim().optional(),
      email: z.string().email('Invalid email address').optional(),
      phone: z
        .string()
        .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number format')
        .optional()
        .nullable(),
      currentPassword: z.string().min(1).optional(),
      newPassword: passwordSchema.optional(),
    })
    .refine((d: { newPassword?: string; currentPassword?: string }) => !(d.newPassword && !d.currentPassword), {
      message: 'currentPassword is required when setting a new password',
      path: ['currentPassword'],
    }),
});

// ─── Inferred body types ──────────────────────────────────────────────────────

export type RegisterBody = z.infer<typeof registerSchema>['body'];
export type LoginBody = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>['body'];
export type UpdateMeBody = z.infer<typeof updateMeSchema>['body'];
