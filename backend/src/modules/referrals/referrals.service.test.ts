/**
 * Referral tracking service — unit tests — Phase 3.5
 *
 * Tests:
 *  1. listReferrals — returns paginated referrals
 *  2. listReferrals — returns empty when no referrals
 *  3. getReferralById — returns referral for valid id
 *  4. getReferralById — throws 404 for unknown referral
 *  5. getReferralById — throws 403 for wrong tenant
 *  6. generateReferralCode — returns existing code if user already has one
 *  7. generateReferralCode — generates new code if user has none
 *  8. generateReferralCode — throws 404 for unknown user
 *  9. lookupReferralCode — returns referrer info for valid code
 * 10. lookupReferralCode — throws 404 for unknown code
 * 11. linkReferral — creates referral link
 * 12. linkReferral — throws 404 for unknown referrer code
 * 13. linkReferral — throws 404 for unknown referee
 * 14. linkReferral — throws 400 for self-referral
 * 15. linkReferral — throws 409 for duplicate referral
 * 16. processReward — marks referral as rewarded and credits loyalty
 * 17. processReward — throws 404 for unknown referral
 * 18. processReward — throws 409 if reward already issued
 *
 * Total: 18 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    referral: {
      findMany:  jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count:     jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
      update:     jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';
import {
  listReferrals,
  getReferralById,
  generateReferralCode,
  lookupReferralCode,
  linkReferral,
  processReward,
} from './referrals.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('referrals.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── listReferrals ─────────────────────────────────────────────────────────

  describe('listReferrals', () => {
    it('should return paginated referrals', async () => {
      const mockReferrals = [
        { id: 'ref-1', tenantId: 'tenant-1', referrerId: 'u-1', refereeId: 'u-2', referralCode: 'REF-ABCD1234', rewardIssued: false },
      ];
      (prisma.referral.findMany as jest.Mock).mockResolvedValue(mockReferrals);
      (prisma.referral.count as jest.Mock).mockResolvedValue(1);

      const result = await listReferrals('tenant-1', { page: 1, limit: 20 });

      expect(result.referrals).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(prisma.referral.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' }, skip: 0, take: 20 }),
      );
    });

    it('should return empty when no referrals', async () => {
      (prisma.referral.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.referral.count as jest.Mock).mockResolvedValue(0);

      const result = await listReferrals('tenant-1', { page: 1, limit: 20 });

      expect(result.referrals).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ── getReferralById ───────────────────────────────────────────────────────

  describe('getReferralById', () => {
    it('should return referral for valid id', async () => {
      const mockReferral = { id: 'ref-1', tenantId: 'tenant-1', referrerId: 'u-1', refereeId: 'u-2' };
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(mockReferral);

      const result = await getReferralById('ref-1', 'tenant-1');

      expect(result).toEqual(mockReferral);
    });

    it('should throw 404 for unknown referral', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getReferralById('bad-id', 'tenant-1')).rejects.toMatchObject({
        statusCode: 404,
        code: 'REFERRAL_NOT_FOUND',
      });
    });

    it('should throw 403 for wrong tenant', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref-1', tenantId: 'tenant-other', referrerId: 'u-1', refereeId: 'u-2',
      });

      await expect(getReferralById('ref-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('should throw 403 when referral has null tenantId', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref-1', tenantId: null, referrerId: 'u-1', refereeId: 'u-2',
      });

      await expect(getReferralById('ref-1', 'tenant-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  // ── generateReferralCode ──────────────────────────────────────────────────

  describe('generateReferralCode', () => {
    it('should return existing code if user already has one', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u-1', referralCode: 'REF-EXISTING1',
      });

      const result = await generateReferralCode('u-1');

      expect(result.referralCode).toBe('REF-EXISTING1');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should generate new code if user has none', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u-1', referralCode: null,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await generateReferralCode('u-1');

      expect(result.referralCode).toMatch(/^REF-[A-F0-9]{8}$/);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          data: { referralCode: expect.stringMatching(/^REF-[A-F0-9]{8}$/) },
        }),
      );
    });

    it('should throw 404 for unknown user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(generateReferralCode('bad-id')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });
  });

  // ── lookupReferralCode ────────────────────────────────────────────────────

  describe('lookupReferralCode', () => {
    it('should return referrer info for valid code', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'u-1', name: 'Jane Doe',
      });

      const result = await lookupReferralCode('REF-ABCD1234');

      expect(result).toEqual({ referrerId: 'u-1', referrerName: 'Jane Doe' });
    });

    it('should throw 404 for unknown code', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(lookupReferralCode('REF-INVALID')).rejects.toMatchObject({
        statusCode: 404,
        code: 'REFERRAL_CODE_NOT_FOUND',
      });
    });
  });

  // ── linkReferral ──────────────────────────────────────────────────────────

  describe('linkReferral', () => {
    it('should create referral link', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'u-1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-2' });
      (prisma.referral.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.referral.create as jest.Mock).mockResolvedValue({
        id: 'ref-1', tenantId: 'tenant-1', referrerId: 'u-1', refereeId: 'u-2',
        referralCode: 'REF-ABCD1234', rewardIssued: false,
      });

      const result = await linkReferral('tenant-1', { referrerCode: 'REF-ABCD1234', refereeId: 'u-2' });

      expect(result.id).toBe('ref-1');
      expect(prisma.referral.create).toHaveBeenCalled();
    });

    it('should throw 404 for unknown referrer code', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        linkReferral('tenant-1', { referrerCode: 'REF-BAD', refereeId: 'u-2' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'REFERRER_NOT_FOUND',
      });
    });

    it('should throw 404 for unknown referee', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'u-1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        linkReferral('tenant-1', { referrerCode: 'REF-ABCD1234', refereeId: 'u-bad' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'REFEREE_NOT_FOUND',
      });
    });

    it('should throw 400 for self-referral', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'u-1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-1' });

      await expect(
        linkReferral('tenant-1', { referrerCode: 'REF-ABCD1234', refereeId: 'u-1' }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'SELF_REFERRAL',
      });
    });

    it('should throw 409 for duplicate referral', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'u-1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u-2' });
      (prisma.referral.findFirst as jest.Mock).mockResolvedValue({ id: 'ref-existing' });

      await expect(
        linkReferral('tenant-1', { referrerCode: 'REF-ABCD1234', refereeId: 'u-2' }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_REFERRAL',
      });
    });
  });

  // ── processReward ─────────────────────────────────────────────────────────

  describe('processReward', () => {
    it('should mark referral as rewarded and credit loyalty balance', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref-1', tenantId: 'tenant-1', referrerId: 'u-1', rewardIssued: false,
      });
      (prisma.referral.update as jest.Mock).mockResolvedValue({
        id: 'ref-1', rewardIssued: true, rewardAmount: 25.5,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await processReward('ref-1', 'tenant-1', 25.5);

      expect(result.rewardIssued).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { loyaltyBalance: { increment: 26 } },
      });
    });

    it('should throw 404 for unknown referral', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(processReward('bad-id', 'tenant-1', 10)).rejects.toMatchObject({
        statusCode: 404,
        code: 'REFERRAL_NOT_FOUND',
      });
    });

    it('should throw 409 if reward already issued', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'ref-1', tenantId: 'tenant-1', referrerId: 'u-1', rewardIssued: true,
      });

      await expect(processReward('ref-1', 'tenant-1', 10)).rejects.toMatchObject({
        statusCode: 409,
        code: 'REWARD_ALREADY_ISSUED',
      });
    });
  });
});
