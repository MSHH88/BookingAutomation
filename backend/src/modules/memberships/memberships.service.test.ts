/**
 * Memberships service — unit tests — Phase 5.2
 *
 * Tests:
 *  1.  createMembership — creates plan with correct fields
 *  2.  getMembershipById — returns plan for correct tenant
 *  3.  getMembershipById — throws 404 for unknown plan
 *  4.  getMembershipById — throws 403 for wrong tenant
 *  5.  deleteMembership — soft-deletes by setting isActive = false
 *  6.  subscribeMember — creates CustomerMembership record
 *  7.  subscribeMember — throws 409 when already subscribed
 *  8.  subscribeMember — throws 400 for inactive plan
 *  9.  cancelSubscription — sets status CANCELLED
 * 10.  cancelSubscription — throws 409 when already cancelled
 * 11.  hasActiveMembership — returns true when active membership covers service
 * 12.  hasActiveMembership — returns false when no active membership
 * 13.  handleSubscriptionWebhook — sets PAST_DUE on invoice.payment_failed
 * 14.  handleSubscriptionWebhook — sets CANCELLED on customer.subscription.deleted
 *
 * Total: 14 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    membership: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    customerMembership: {
      create:      jest.fn(),
      findFirst:   jest.fn(),
      findMany:    jest.fn(),
      count:       jest.fn(),
      findUnique:  jest.fn(),
      update:      jest.fn(),
      updateMany:  jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import {
  createMembership,
  getMembershipById,
  deleteMembership,
  subscribeMember,
  cancelSubscription,
  hasActiveMembership,
  handleSubscriptionWebhook,
} from './memberships.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    id:               'mem-1',
    tenantId:         'tenant-1',
    name:             'Monthly Unlimited',
    price:            99,
    billingInterval:  'MONTHLY',
    includedServices: [],
    usageLimit:       null,
    isActive:         true,
    createdAt:        new Date('2024-01-01'),
    updatedAt:        new Date('2024-01-01'),
    ...overrides,
  };
}

function makeCustomerMembership(overrides: Record<string, unknown> = {}) {
  return {
    id:                   'cm-1',
    customerId:           'user-1',
    membershipId:         'mem-1',
    tenantId:             'tenant-1',
    stripeSubscriptionId: null,
    status:               'ACTIVE',
    currentPeriodEnd:     null,
    createdAt:            new Date('2024-01-01'),
    updatedAt:            new Date('2024-01-01'),
    membership: {
      id:               'mem-1',
      name:             'Monthly Unlimited',
      billingInterval:  'MONTHLY',
      includedServices: [],
      usageLimit:       null,
    },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('memberships.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createMembership ───────────────────────────────────────────────────────

  describe('createMembership', () => {
    it('creates plan with correct fields', async () => {
      (prisma.membership.create as jest.Mock).mockResolvedValue(makePlan());

      const result = await createMembership('tenant-1', {
        name:             'Monthly Unlimited',
        price:            99,
        billingInterval:  'MONTHLY',
        includedServices: [],
        isActive:         true,
      });

      expect(prisma.membership.create).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Monthly Unlimited');
    });
  });

  // ── getMembershipById ──────────────────────────────────────────────────────

  describe('getMembershipById', () => {
    it('returns plan for correct tenant', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(makePlan());
      const result = await getMembershipById('mem-1', 'tenant-1');
      expect(result.id).toBe('mem-1');
    });

    it('throws 404 for unknown plan', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(getMembershipById('unknown', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code:       'MEMBERSHIP_NOT_FOUND',
      });
    });

    it('throws 403 for wrong tenant', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(
        makePlan({ tenantId: 'other' }),
      );
      await expect(getMembershipById('mem-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  // ── deleteMembership ───────────────────────────────────────────────────────

  describe('deleteMembership', () => {
    it('soft-deletes by setting isActive = false', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.membership.update as jest.Mock).mockResolvedValue(makePlan({ isActive: false }));

      const result = await deleteMembership('mem-1', 'tenant-1');
      expect(result.isActive).toBe(false);
    });
  });

  // ── subscribeMember ────────────────────────────────────────────────────────

  describe('subscribeMember', () => {
    it('creates a CustomerMembership record', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      (prisma.customerMembership.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.customerMembership.create as jest.Mock).mockResolvedValue(makeCustomerMembership());

      const result = await subscribeMember('mem-1', { customerId: 'user-1' }, 'tenant-1');
      expect(result.status).toBe('ACTIVE');
    });

    it('throws 409 when customer already has an active subscription', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(makePlan());
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      (prisma.customerMembership.findFirst as jest.Mock).mockResolvedValue(makeCustomerMembership());

      await expect(
        subscribeMember('mem-1', { customerId: 'user-1' }, 'tenant-1'),
      ).rejects.toMatchObject({ statusCode: 409, code: 'MEMBERSHIP_ALREADY_ACTIVE' });
    });

    it('throws 400 for inactive plan', async () => {
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(
        makePlan({ isActive: false }),
      );
      await expect(
        subscribeMember('mem-1', { customerId: 'user-1' }, 'tenant-1'),
      ).rejects.toMatchObject({ statusCode: 400, code: 'MEMBERSHIP_INACTIVE' });
    });
  });

  // ── cancelSubscription ─────────────────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('sets status to CANCELLED', async () => {
      (prisma.customerMembership.findUnique as jest.Mock).mockResolvedValue(
        makeCustomerMembership(),
      );
      (prisma.customerMembership.update as jest.Mock).mockResolvedValue(
        makeCustomerMembership({ status: 'CANCELLED' }),
      );

      const result = await cancelSubscription('cm-1', 'tenant-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('throws 409 when already cancelled', async () => {
      (prisma.customerMembership.findUnique as jest.Mock).mockResolvedValue(
        makeCustomerMembership({ status: 'CANCELLED' }),
      );

      await expect(cancelSubscription('cm-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 409,
        code:       'MEMBERSHIP_ALREADY_CANCELLED',
      });
    });
  });

  // ── hasActiveMembership ────────────────────────────────────────────────────

  describe('hasActiveMembership', () => {
    it('returns true when active membership covers the service', async () => {
      (prisma.customerMembership.findMany as jest.Mock).mockResolvedValue([
        { membership: { includedServices: ['svc-1', 'svc-2'] } },
      ]);

      const result = await hasActiveMembership('user-1', 'tenant-1', 'svc-1');
      expect(result).toBe(true);
    });

    it('returns false when no active memberships', async () => {
      (prisma.customerMembership.findMany as jest.Mock).mockResolvedValue([]);

      const result = await hasActiveMembership('user-1', 'tenant-1', 'svc-1');
      expect(result).toBe(false);
    });
  });

  // ── handleSubscriptionWebhook ──────────────────────────────────────────────

  describe('handleSubscriptionWebhook', () => {
    it('sets PAST_DUE on invoice.payment_failed', async () => {
      (prisma.customerMembership.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const fakeInvoice = {
        subscription: 'sub_123',
        lines:        { data: [{ period: { end: 1700000000 } }] },
      } as unknown as any;

      await handleSubscriptionWebhook('invoice.payment_failed', fakeInvoice);

      expect(prisma.customerMembership.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_123' },
          data:  { status: 'PAST_DUE' },
        }),
      );
    });

    it('sets CANCELLED on customer.subscription.deleted', async () => {
      (prisma.customerMembership.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const fakeSub = { id: 'sub_123' } as unknown as any;
      await handleSubscriptionWebhook('customer.subscription.deleted', fakeSub);

      expect(prisma.customerMembership.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_123' },
          data:  { status: 'CANCELLED' },
        }),
      );
    });
  });
});
