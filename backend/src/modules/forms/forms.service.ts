/**
 * Intake / Consent Forms service — Phase 3.2
 *
 * Business logic for managing intake and consent forms.
 *
 * ─── What this module does ────────────────────────────────────────────────────
 *
 *   listForms(tenantId)
 *     Returns all active forms for a tenant.
 *
 *   getFormById(id, tenantId)
 *     Returns a single form, verifying tenant access.
 *
 *   createForm(tenantId, data)
 *     Creates a new form for the tenant.
 *
 *   updateForm(id, tenantId, data)
 *     Updates a form, verifying tenant access.
 *
 *   deleteForm(id, tenantId)
 *     Soft-deletes a form (sets isActive = false), verifying tenant access.
 *
 *   listFormResponses(formId, tenantId)
 *     Lists all responses for a given form, verifying tenant access.
 *
 *   getPublicForm(bookingToken)
 *     Returns the form associated with a booking's service (public, no auth).
 *
 *   submitPublicForm(bookingToken, answers)
 *     Submits a form response for a booking (public, no auth).
 *     Updates booking status from AWAITING_FORM to PENDING.
 */
import { Prisma }   from '@prisma/client';
import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import type { CreateFormBody, UpdateFormBody } from './forms.schema';

// ─── Admin API ────────────────────────────────────────────────────────────────

/** List all active forms for a tenant. */
export async function listForms(tenantId: string | null) {
  return prisma.form.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

/** Get a single form by ID, verifying tenant access. */
export async function getFormById(id: string, tenantId: string | null) {
  const form = await prisma.form.findUnique({ where: { id } });

  if (!form) {
    throw new AppError(404, 'FORM_NOT_FOUND', 'Form not found');
  }

  if (form.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this form');
  }

  return form;
}

/** Create a new form for a tenant. */
export async function createForm(tenantId: string | null, data: CreateFormBody) {
  return prisma.form.create({
    data: {
      tenantId,
      name:         data.name,
      serviceTypes: data.serviceTypes,
      fields:       data.fields as unknown as Prisma.InputJsonValue,
      isActive:     data.isActive ?? true,
    },
  });
}

/** Update a form, verifying tenant access. */
export async function updateForm(id: string, tenantId: string | null, data: UpdateFormBody) {
  const existing = await prisma.form.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, 'FORM_NOT_FOUND', 'Form not found');
  }

  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this form');
  }

  return prisma.form.update({
    where: { id },
    data: {
      ...(data.name         !== undefined && { name: data.name }),
      ...(data.serviceTypes !== undefined && { serviceTypes: data.serviceTypes }),
      ...(data.fields       !== undefined && { fields: data.fields as unknown as Prisma.InputJsonValue }),
      ...(data.isActive     !== undefined && { isActive: data.isActive }),
    },
  });
}

/** Soft-delete a form (set isActive = false), verifying tenant access. */
export async function deleteForm(id: string, tenantId: string | null) {
  const existing = await prisma.form.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, 'FORM_NOT_FOUND', 'Form not found');
  }

  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this form');
  }

  return prisma.form.update({
    where: { id },
    data: { isActive: false },
  });
}

/** List all responses for a given form, verifying tenant access. */
export async function listFormResponses(formId: string, tenantId: string | null) {
  // Verify the form exists and belongs to this tenant
  const form = await prisma.form.findUnique({ where: { id: formId } });

  if (!form) {
    throw new AppError(404, 'FORM_NOT_FOUND', 'Form not found');
  }

  if (form.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied to this form');
  }

  return prisma.formResponse.findMany({
    where: { formId },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Look up a booking by its public token and return the matching form. */
export async function getPublicForm(bookingToken: string) {
  const booking = await prisma.booking.findUnique({
    where: { publicToken: bookingToken },
    select: {
      id:        true,
      tenantId:  true,
      service:   { select: { id: true, category: { select: { name: true } } } },
    },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  const categoryName = booking.service?.category?.name;

  if (!categoryName) {
    throw new AppError(404, 'FORM_NOT_FOUND', 'No form associated with this booking');
  }

  const form = await prisma.form.findFirst({
    where: {
      tenantId: booking.tenantId,
      isActive: true,
      serviceTypes: { has: categoryName },
    },
  });

  if (!form) {
    throw new AppError(404, 'FORM_NOT_FOUND', 'No form associated with this booking');
  }

  return { form, bookingId: booking.id };
}

/** Submit a public form response and transition booking status if needed. */
export async function submitPublicForm(bookingToken: string, answers: Record<string, unknown>) {
  const booking = await prisma.booking.findUnique({
    where: { publicToken: bookingToken },
    select: {
      id:         true,
      tenantId:   true,
      customerId: true,
      status:     true,
      service:    { select: { category: { select: { name: true } } } },
    },
  });

  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  const categoryName = booking.service?.category?.name;

  if (!categoryName) {
    throw new AppError(404, 'FORM_NOT_FOUND', 'No form associated with this booking');
  }

  const form = await prisma.form.findFirst({
    where: {
      tenantId: booking.tenantId,
      isActive: true,
      serviceTypes: { has: categoryName },
    },
  });

  if (!form) {
    throw new AppError(404, 'FORM_NOT_FOUND', 'No form associated with this booking');
  }

  // Prevent duplicate submissions
  const existingResponse = await prisma.formResponse.findFirst({
    where: { formId: form.id, bookingId: booking.id },
  });

  if (existingResponse) {
    throw new AppError(409, 'FORM_ALREADY_SUBMITTED', 'Form has already been submitted for this booking');
  }

  const response = await prisma.formResponse.create({
    data: {
      formId:      form.id,
      bookingId:   booking.id,
      customerId:  booking.customerId,
      tenantId:    booking.tenantId,
      answers:     answers as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });

  // Transition booking from AWAITING_FORM → PENDING
  if (booking.status === 'AWAITING_FORM') {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'PENDING' },
    });
  }

  return response;
}
