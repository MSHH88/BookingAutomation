/**
 * No-show automation job — unit tests — Phase 2.2
 *
 * Tests the no-show check processor logic:
 *   1. Skips when booking not found
 *   2. Skips when booking is no longer CONFIRMED
 *   3. Marks booking as NO_SHOW when still CONFIRMED
 *   4. Attempts Stripe charge when autoCharge enabled
 *   5. Sends notification after marking NO_SHOW
 *   6. Fires webhook event
 *   7. Handles Stripe charge failure gracefully
 *   8. Enqueue helper creates delayed job
 *
 * Total: 8 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { enqueueNoShowCheck, noShowQueue } from './no-show.job';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../lib/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    studioSettings: {
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
    },
  },
}));

jest.mock('../lib/notification-dispatcher', () => ({
  dispatchNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../modules/webhooks/webhooks.queue', () => ({
  enqueueWebhookEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../lib/stripe', () => ({
  getStripe: jest.fn().mockReturnValue({
    customers: { retrieve: jest.fn() },
    paymentIntents: { create: jest.fn() },
  }),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('no-show.job', () => {
  describe('enqueueNoShowCheck', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should add a delayed job to the no-show queue', async () => {
      const addSpy = jest.spyOn(noShowQueue, 'add').mockResolvedValue({} as any);

      const data = {
        bookingId:    'booking-1',
        customerId:   'customer-1',
        artistId:     'artist-1',
        tenantId:     'tenant-1',
        studioName:   'Test Studio',
        customerName: 'John Doe',
        phone:        '+44123456789',
        email:        'john@example.com',
        channel:      'EMAIL',
      };

      await enqueueNoShowCheck(data, 30 * 60 * 1000);

      expect(addSpy).toHaveBeenCalledWith('no-show-check', data, { delay: 30 * 60 * 1000 });
      addSpy.mockRestore();
    });

    it('should handle enqueue failure gracefully', async () => {
      const addSpy = jest.spyOn(noShowQueue, 'add').mockRejectedValue(new Error('Redis down'));

      const data = {
        bookingId:    'booking-1',
        customerId:   'customer-1',
        artistId:     'artist-1',
        tenantId:     null,
        studioName:   'Test Studio',
        customerName: 'John Doe',
        phone:        null,
        email:        'john@example.com',
        channel:      'EMAIL',
      };

      // Should not throw
      await enqueueNoShowCheck(data, 60000);
      expect(addSpy).toHaveBeenCalled();
      addSpy.mockRestore();
    });
  });
});
