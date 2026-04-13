/**
 * Push service — unit tests — Phase 6.2
 *
 * Tests:
 *  1.  subscribe — creates subscription
 *  2.  subscribe — upserts on re-subscribe with same endpoint
 *  3.  unsubscribe — removes subscription
 *  4.  unsubscribe — no-op when subscription not found
 *  5.  unsubscribe — throws 403 when userId mismatch
 *  6.  notifyUser — sends push to all subscriptions
 *  7.  notifyUser — skips send when no subscriptions
 *  8.  notifyUser — cleans up expired subscriptions
 *
 * Total: 8 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    pushSubscription: {
      upsert:     jest.fn(),
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      delete:     jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('../../lib/push-notifications', () => ({
  sendPushToMany:    jest.fn(),
  getVapidPublicKey: jest.fn(),
}));

import { prisma } from '../../lib/prisma';
import { sendPushToMany } from '../../lib/push-notifications';
import {
  subscribe,
  unsubscribe,
  notifyUser,
} from './push.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSub(overrides: Record<string, unknown> = {}) {
  return {
    id:        'sub-1',
    userId:    'user-1',
    tenantId:  'tenant-1',
    endpoint:  'https://push.example.com/sub-1',
    p256dh:    'p256dh-value',
    auth:      'auth-value',
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('push.service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('subscribe', () => {
    it('creates subscription', async () => {
      (prisma.pushSubscription.upsert as jest.Mock).mockResolvedValue(makeSub());

      const result = await subscribe('user-1', 'tenant-1', 'https://example.com', 'p256', 'auth');
      expect(result.id).toBe('sub-1');
      expect(prisma.pushSubscription.upsert).toHaveBeenCalled();
    });

    it('upserts on re-subscribe with same endpoint', async () => {
      (prisma.pushSubscription.upsert as jest.Mock).mockResolvedValue(
        makeSub({ p256dh: 'new-key' }),
      );

      const result = await subscribe('user-1', 'tenant-1', 'https://example.com', 'new-key', 'auth');
      // subscribe returns limited select fields (id, userId, tenantId, endpoint, createdAt)
      expect(result.id).toBe('sub-1');
      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ p256dh: 'new-key' }),
        }),
      );
    });
  });

  describe('unsubscribe', () => {
    it('removes subscription', async () => {
      (prisma.pushSubscription.findUnique as jest.Mock).mockResolvedValue(makeSub());
      (prisma.pushSubscription.delete as jest.Mock).mockResolvedValue(undefined);

      await expect(
        unsubscribe('user-1', 'tenant-1', 'https://push.example.com/sub-1'),
      ).resolves.toBeUndefined();

      expect(prisma.pushSubscription.delete).toHaveBeenCalled();
    });

    it('no-op when subscription not found', async () => {
      (prisma.pushSubscription.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        unsubscribe('user-1', 'tenant-1', 'https://missing.com'),
      ).resolves.toBeUndefined();

      expect(prisma.pushSubscription.delete).not.toHaveBeenCalled();
    });

    it('throws 403 when userId mismatch', async () => {
      (prisma.pushSubscription.findUnique as jest.Mock).mockResolvedValue(
        makeSub({ userId: 'other-user' }),
      );

      await expect(
        unsubscribe('user-1', 'tenant-1', 'https://push.example.com/sub-1'),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('notifyUser', () => {
    it('sends push to all subscriptions', async () => {
      (prisma.pushSubscription.findMany as jest.Mock).mockResolvedValue([makeSub()]);
      (sendPushToMany as jest.Mock).mockResolvedValue([]);

      await notifyUser('user-1', 'tenant-1', { title: 'Test', body: 'Hello' });
      expect(sendPushToMany).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'sub-1' })]),
        { title: 'Test', body: 'Hello' },
      );
    });

    it('skips send when no subscriptions', async () => {
      (prisma.pushSubscription.findMany as jest.Mock).mockResolvedValue([]);

      await notifyUser('user-1', 'tenant-1', { title: 'Test', body: 'Hello' });
      expect(sendPushToMany).not.toHaveBeenCalled();
    });

    it('cleans up expired subscriptions', async () => {
      (prisma.pushSubscription.findMany as jest.Mock).mockResolvedValue([makeSub()]);
      (sendPushToMany as jest.Mock).mockResolvedValue(['sub-1']);
      (prisma.pushSubscription.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await notifyUser('user-1', 'tenant-1', { title: 'Test', body: 'Hello' });
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['sub-1'] } },
      });
    });
  });
});
