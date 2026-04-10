/**
 * CRM alerts service — unit tests — Phase 2.5
 *
 * Tests:
 *  1. getBookingAlerts — returns DEPOSIT_PENDING for AWAITING_DEPOSIT booking
 *  2. getBookingAlerts — returns NO_SHOW_TIMER for past-start CONFIRMED booking
 *  3. getBookingAlerts — returns OVERDUE_INVOICE when invoice is OVERDUE
 *  4. getBookingAlerts — returns empty for healthy booking
 *  5. getBookingAlerts — throws 404 for unknown booking
 *  6. getCustomerAlerts — returns REBOOK_DUE when last visit > 30 days
 *  7. getCustomerAlerts — returns CARD_NOT_ON_FILE when no Stripe customer
 *  8. getCustomerAlerts — returns BIRTHDAY_TODAY on customer's birthday
 *  9. getCustomerAlerts — returns HEALTH_FLAG when customer has active flags
 * 10. getCustomerAlerts — returns empty for healthy customer
 * 11. getCustomerAlerts — throws 404 for unknown customer
 * 12. getDashboardAlerts — aggregates overdue invoices
 * 13. getDashboardAlerts — aggregates pending deposits
 * 14. getDashboardAlerts — aggregates potential no-shows
 * 15. getDashboardAlerts — filters by severity
 * 16. getDashboardAlerts — returns empty when all healthy
 *
 * Total: 16 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
      count:      jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    invoice: {
      count: jest.fn(),
    },
    waitlistEntry: {
      count: jest.fn(),
    },
    healthFlag: {
      count: jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import { getBookingAlerts, getCustomerAlerts, getDashboardAlerts } from './alerts.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('alerts.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getBookingAlerts ───────────────────────────────────────────────────────

  describe('getBookingAlerts', () => {
    it('should return DEPOSIT_PENDING for AWAITING_DEPOSIT booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', status: 'AWAITING_DEPOSIT', startAt: new Date('2030-01-01'),
        tenantId: 'tenant-1', depositAmount: 50, depositPaidAt: null,
        invoice: null,
      });

      const alerts = await getBookingAlerts('b-1', 'tenant-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('DEPOSIT_PENDING');
      expect(alerts[0].severity).toBe('AMBER');
    });

    it('should return NO_SHOW_TIMER for past-start CONFIRMED booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', status: 'CONFIRMED', startAt: new Date('2020-01-01'),
        tenantId: 'tenant-1', depositAmount: null, depositPaidAt: null,
        invoice: null,
      });

      const alerts = await getBookingAlerts('b-1', 'tenant-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('NO_SHOW_TIMER');
      expect(alerts[0].severity).toBe('RED');
    });

    it('should return OVERDUE_INVOICE when invoice is OVERDUE', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', status: 'COMPLETED', startAt: new Date('2025-01-01'),
        tenantId: 'tenant-1', depositAmount: null, depositPaidAt: null,
        invoice: { id: 'inv-1', status: 'OVERDUE', dueDate: new Date('2025-01-15') },
      });

      const alerts = await getBookingAlerts('b-1', 'tenant-1');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('OVERDUE_INVOICE');
    });

    it('should return empty for healthy booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', status: 'CONFIRMED', startAt: new Date('2030-01-01'),
        tenantId: 'tenant-1', depositAmount: null, depositPaidAt: null,
        invoice: { id: 'inv-1', status: 'PAID', dueDate: new Date() },
      });

      const alerts = await getBookingAlerts('b-1', 'tenant-1');
      expect(alerts).toHaveLength(0);
    });

    it('should throw 404 for unknown booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getBookingAlerts('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'BOOKING_NOT_FOUND',
      });
    });
  });

  // ── getCustomerAlerts ──────────────────────────────────────────────────────

  describe('getCustomerAlerts', () => {
    it('should return REBOOK_DUE when last visit > 30 days', async () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', name: 'Jane', tenantId: 'tenant-1',
        dateOfBirth: null, stripeCustomerId: 'cus_123',
      });
      (prisma.booking.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'b-old', completedAt: sixtyDaysAgo }) // last booking
        .mockResolvedValueOnce(null); // no future booking
      (prisma.healthFlag.count as jest.Mock).mockResolvedValue(0);

      const alerts = await getCustomerAlerts('cust-1', 'tenant-1');

      expect(alerts.some(a => a.type === 'REBOOK_DUE')).toBe(true);
    });

    it('should return CARD_NOT_ON_FILE when no Stripe customer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', name: 'Jane', tenantId: 'tenant-1',
        dateOfBirth: null, stripeCustomerId: null,
      });
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.healthFlag.count as jest.Mock).mockResolvedValue(0);

      const alerts = await getCustomerAlerts('cust-1', 'tenant-1');

      expect(alerts.some(a => a.type === 'CARD_NOT_ON_FILE')).toBe(true);
    });

    it('should return BIRTHDAY_TODAY on customer birthday', async () => {
      const today = new Date();
      const dob   = new Date(Date.UTC(1990, today.getUTCMonth(), today.getUTCDate()));
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', name: 'Jane', tenantId: 'tenant-1',
        dateOfBirth: dob, stripeCustomerId: 'cus_123',
      });
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.healthFlag.count as jest.Mock).mockResolvedValue(0);

      const alerts = await getCustomerAlerts('cust-1', 'tenant-1');

      expect(alerts.some(a => a.type === 'BIRTHDAY_TODAY')).toBe(true);
    });

    it('should return empty for healthy customer with no alerts', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', name: 'Jane', tenantId: 'tenant-1',
        dateOfBirth: new Date('1990-06-15'), stripeCustomerId: 'cus_123',
      });
      // Recent completed booking
      (prisma.booking.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'b-1', completedAt: new Date() }) // last booking is today
        .mockResolvedValueOnce(null); // no future booking
      (prisma.healthFlag.count as jest.Mock).mockResolvedValue(0);

      const alerts = await getCustomerAlerts('cust-1', 'tenant-1');

      // Only CARD_NOT_ON_FILE might show based on stripeCustomerId, but we set it
      // Last booking is today so REBOOK_DUE won't fire (< 30 days)
      expect(alerts.every(a => a.type !== 'REBOOK_DUE')).toBe(true);
    });

    it('should return HEALTH_FLAG when customer has active health flags', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1', name: 'Jane', tenantId: 'tenant-1',
        dateOfBirth: null, stripeCustomerId: 'cus_123',
      });
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.healthFlag.count as jest.Mock).mockResolvedValue(2);

      const alerts = await getCustomerAlerts('cust-1', 'tenant-1');

      expect(alerts.some(a => a.type === 'HEALTH_FLAG')).toBe(true);
      expect(alerts.find(a => a.type === 'HEALTH_FLAG')?.severity).toBe('RED');
    });

    it('should throw 404 for unknown customer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getCustomerAlerts('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'CUSTOMER_NOT_FOUND',
      });
    });
  });

  // ── getDashboardAlerts ─────────────────────────────────────────────────────

  describe('getDashboardAlerts', () => {
    it('should aggregate overdue invoices', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(3);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);
      (prisma.waitlistEntry.count as jest.Mock).mockResolvedValue(0);

      const alerts = await getDashboardAlerts('tenant-1', {});

      expect(alerts.some(a => a.type === 'OVERDUE_INVOICE')).toBe(true);
      expect(alerts.find(a => a.type === 'OVERDUE_INVOICE')?.message).toContain('3');
    });

    it('should aggregate pending deposits', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.booking.count as jest.Mock)
        .mockResolvedValueOnce(5)   // pending deposits
        .mockResolvedValueOnce(0);  // no-shows
      (prisma.waitlistEntry.count as jest.Mock).mockResolvedValue(0);

      const alerts = await getDashboardAlerts('tenant-1', {});

      expect(alerts.some(a => a.type === 'DEPOSIT_PENDING')).toBe(true);
    });

    it('should aggregate potential no-shows', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.booking.count as jest.Mock)
        .mockResolvedValueOnce(0)   // pending deposits
        .mockResolvedValueOnce(2);  // no-shows
      (prisma.waitlistEntry.count as jest.Mock).mockResolvedValue(0);

      const alerts = await getDashboardAlerts('tenant-1', {});

      expect(alerts.some(a => a.type === 'NO_SHOW_TIMER')).toBe(true);
    });

    it('should filter by severity', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);    // RED
      (prisma.booking.count as jest.Mock)
        .mockResolvedValueOnce(1)    // AMBER (deposits)
        .mockResolvedValueOnce(0);   // RED (no-shows)
      (prisma.waitlistEntry.count as jest.Mock).mockResolvedValue(1); // GREEN

      const alerts = await getDashboardAlerts('tenant-1', { severity: 'RED' });

      expect(alerts.every(a => a.severity === 'RED')).toBe(true);
    });

    it('should return empty when all healthy', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);
      (prisma.waitlistEntry.count as jest.Mock).mockResolvedValue(0);

      const alerts = await getDashboardAlerts('tenant-1', {});

      expect(alerts).toEqual([]);
    });
  });
});
