/**
 * Intake / Consent Forms service — unit tests — Phase 3.2
 *
 * Tests:
 *  1. listForms — returns active forms for tenant
 *  2. listForms — returns empty when none exist
 *  3. getFormById — returns form when found
 *  4. getFormById — throws 404 when not found
 *  5. getFormById — throws 403 for wrong tenant
 *  6. createForm — creates and returns form
 *  7. updateForm — updates and returns form
 *  8. updateForm — throws 404 when not found
 *  9. updateForm — throws 403 for wrong tenant
 * 10. deleteForm — soft-deletes (deactivates) form
 * 11. deleteForm — throws 404 when not found
 * 12. listFormResponses — returns responses for a form
 * 13. listFormResponses — throws 404 when form not found
 * 14. getPublicForm — returns form via booking token
 * 15. getPublicForm — throws 404 for unknown booking
 * 16. getPublicForm — throws 404 when no matching form
 * 17. submitPublicForm — creates response and transitions AWAITING_FORM
 * 18. submitPublicForm — creates response without transition for other statuses
 *
 * Total: 18 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    form: {
      findMany:  jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    formResponse: {
      findMany:  jest.fn(),
      findFirst: jest.fn(),
      create:    jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import {
  listForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  listFormResponses,
  getPublicForm,
  submitPublicForm,
} from './forms.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('forms.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleForm = {
    id: 'form-1',
    tenantId: 'tenant-1',
    name: 'Tattoo Consent',
    serviceTypes: ['Tattoo'],
    fields: [{ name: 'allergies', type: 'text', label: 'Allergies?', required: true }],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ── listForms ─────────────────────────────────────────────────────────────

  describe('listForms', () => {
    it('should return active forms for tenant', async () => {
      (prisma.form.findMany as jest.Mock).mockResolvedValue([sampleForm]);

      const result = await listForms('tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Tattoo Consent');
      expect(prisma.form.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty when none exist', async () => {
      (prisma.form.findMany as jest.Mock).mockResolvedValue([]);

      const result = await listForms('tenant-1');

      expect(result).toEqual([]);
    });
  });

  // ── getFormById ───────────────────────────────────────────────────────────

  describe('getFormById', () => {
    it('should return form when found', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(sampleForm);

      const result = await getFormById('form-1', 'tenant-1');

      expect(result.id).toBe('form-1');
    });

    it('should throw 404 when not found', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getFormById('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'FORM_NOT_FOUND',
      });
    });

    it('should throw 403 for wrong tenant', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue({ ...sampleForm, tenantId: 'other-tenant' });

      await expect(getFormById('form-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  // ── createForm ────────────────────────────────────────────────────────────

  describe('createForm', () => {
    it('should create and return form', async () => {
      (prisma.form.create as jest.Mock).mockResolvedValue(sampleForm);

      const result = await createForm('tenant-1', {
        name: 'Tattoo Consent',
        serviceTypes: ['Tattoo'],
        fields: [{ name: 'allergies', type: 'text', label: 'Allergies?', required: true }],
      });

      expect(result.name).toBe('Tattoo Consent');
      expect(prisma.form.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── updateForm ────────────────────────────────────────────────────────────

  describe('updateForm', () => {
    it('should update and return form', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(sampleForm);
      (prisma.form.update as jest.Mock).mockResolvedValue({ ...sampleForm, name: 'Updated' });

      const result = await updateForm('form-1', 'tenant-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw 404 when not found', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updateForm('bad-id', 'tenant-1', { name: 'X' })).rejects.toMatchObject({
        statusCode: 404,
        code: 'FORM_NOT_FOUND',
      });
    });

    it('should throw 403 for wrong tenant', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue({ ...sampleForm, tenantId: 'other-tenant' });

      await expect(updateForm('form-1', 'tenant-1', { name: 'X' })).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  // ── deleteForm ────────────────────────────────────────────────────────────

  describe('deleteForm', () => {
    it('should soft-delete (deactivate) form', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(sampleForm);
      (prisma.form.update as jest.Mock).mockResolvedValue({ ...sampleForm, isActive: false });

      const result = await deleteForm('form-1', 'tenant-1');

      expect(result.isActive).toBe(false);
      expect(prisma.form.update).toHaveBeenCalledWith({
        where: { id: 'form-1' },
        data: { isActive: false },
      });
    });

    it('should throw 404 when not found', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteForm('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'FORM_NOT_FOUND',
      });
    });
  });

  // ── listFormResponses ─────────────────────────────────────────────────────

  describe('listFormResponses', () => {
    it('should return responses for a form', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(sampleForm);
      (prisma.formResponse.findMany as jest.Mock).mockResolvedValue([
        { id: 'resp-1', formId: 'form-1', answers: { allergies: 'None' } },
      ]);

      const result = await listFormResponses('form-1', 'tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('resp-1');
    });

    it('should throw 404 when form not found', async () => {
      (prisma.form.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(listFormResponses('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'FORM_NOT_FOUND',
      });
    });
  });

  // ── getPublicForm ─────────────────────────────────────────────────────────

  describe('getPublicForm', () => {
    it('should return form via booking token', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1',
        service: { id: 'svc-1', category: { name: 'Tattoo' } },
      });
      (prisma.form.findFirst as jest.Mock).mockResolvedValue(sampleForm);

      const result = await getPublicForm('tok-123');

      expect(result.form.id).toBe('form-1');
      expect(result.bookingId).toBe('b-1');
    });

    it('should throw 404 for unknown booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getPublicForm('bad-tok')).rejects.toMatchObject({
        statusCode: 404,
        code: 'BOOKING_NOT_FOUND',
      });
    });

    it('should throw 404 when no matching form', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1',
        service: { id: 'svc-1', category: { name: 'Tattoo' } },
      });
      (prisma.form.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(getPublicForm('tok-123')).rejects.toMatchObject({
        statusCode: 404,
        code: 'FORM_NOT_FOUND',
      });
    });
  });

  // ── submitPublicForm ──────────────────────────────────────────────────────

  describe('submitPublicForm', () => {
    it('should create response and transition AWAITING_FORM to PENDING', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1', customerId: 'cust-1', status: 'AWAITING_FORM',
        service: { category: { name: 'Tattoo' } },
      });
      (prisma.form.findFirst as jest.Mock).mockResolvedValue(sampleForm);
      (prisma.formResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.formResponse.create as jest.Mock).mockResolvedValue({
        id: 'resp-1', formId: 'form-1', bookingId: 'b-1', answers: { allergies: 'None' },
      });
      (prisma.booking.update as jest.Mock).mockResolvedValue({});

      const result = await submitPublicForm('tok-123', { allergies: 'None' });

      expect(result.id).toBe('resp-1');
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: { status: 'PENDING' },
      });
    });

    it('should create response without transition for other statuses', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1', customerId: 'cust-1', status: 'CONFIRMED',
        service: { category: { name: 'Tattoo' } },
      });
      (prisma.form.findFirst as jest.Mock).mockResolvedValue(sampleForm);
      (prisma.formResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.formResponse.create as jest.Mock).mockResolvedValue({
        id: 'resp-2', formId: 'form-1', bookingId: 'b-1', answers: { allergies: 'None' },
      });

      const result = await submitPublicForm('tok-123', { allergies: 'None' });

      expect(result.id).toBe('resp-2');
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('should throw 409 for duplicate form submission', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', tenantId: 'tenant-1', customerId: 'cust-1', status: 'CONFIRMED',
        service: { category: { name: 'Tattoo' } },
      });
      (prisma.form.findFirst as jest.Mock).mockResolvedValue(sampleForm);
      (prisma.formResponse.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-resp' });

      await expect(submitPublicForm('tok-123', { allergies: 'None' })).rejects.toMatchObject({
        statusCode: 409,
        code: 'FORM_ALREADY_SUBMITTED',
      });

      expect(prisma.formResponse.create).not.toHaveBeenCalled();
    });
  });
});
