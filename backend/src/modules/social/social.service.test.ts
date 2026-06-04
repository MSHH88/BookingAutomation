/**
 * Social booking link service — unit tests — Phase 2.4
 *
 * Tests:
 *  1. getBookingLink — generates generic URL
 *  2. getBookingLink — generates instagram URL with UTM params
 *  3. getBookingLink — generates facebook URL with UTM params
 *  4. getBookingLink — throws 404 for unknown tenant
 *  5. getBookingLink — falls back to /book/:slug when no bookingPageUrl
 *  6. getBookingSources — aggregates sources
 *  7. getBookingSources — handles empty results
 *
 * Total: 7 tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: jest.fn() },
    studioSettings: { findUnique: jest.fn() },
    booking: { groupBy: jest.fn() },
  },
}));

import { prisma } from '../../lib/prisma';
import { getBookingLink, getBookingSources } from './social.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('social.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getBookingLink ─────────────────────────────────────────────────────────

  describe('getBookingLink', () => {
    const mockTenant = { slug: 'ink-masters', name: 'Ink Masters' };

    it('should generate a generic booking URL', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.studioSettings.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getBookingLink('tenant-1', { platform: 'generic' });

      expect(result.url).toContain('/book/ink-masters');
      expect(result.url).toContain('source=direct');
      expect(result.platform).toBe('generic');
    });

    it('should generate an Instagram URL with UTM params', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.studioSettings.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getBookingLink('tenant-1', { platform: 'instagram' });

      expect(result.url).toContain('source=instagram');
      expect(result.url).toContain('utm_source=instagram');
      expect(result.platform).toBe('instagram');
    });

    it('should generate a Facebook URL with UTM params', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.studioSettings.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getBookingLink('tenant-1', { platform: 'facebook' });

      expect(result.url).toContain('source=facebook');
      expect(result.url).toContain('utm_source=facebook');
    });

    it('should throw 404 for unknown tenant', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getBookingLink('bad-id', {})).rejects.toMatchObject({
        statusCode: 404,
        code: 'TENANT_NOT_FOUND',
      });
    });

    it('should use bookingPageUrl from settings when available', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prisma.studioSettings.findUnique as jest.Mock).mockResolvedValue({
        bookingPageUrl: 'https://book.inkmasters.com',
      });

      const result = await getBookingLink('tenant-1', { platform: 'instagram' });

      expect(result.url).toContain('https://book.inkmasters.com');
    });
  });

  // ── getBookingSources ──────────────────────────────────────────────────────

  describe('getBookingSources', () => {
    it('should aggregate booking sources', async () => {
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([
        { source: 'WIDGET', _count: { id: 30 } },
        { source: 'INSTAGRAM', _count: { id: 15 } },
        { source: 'DIRECT', _count: { id: 5 } },
      ]);

      const result = await getBookingSources('tenant-1', {});

      expect(result.total).toBe(50);
      expect(result.sources).toHaveLength(3);
      expect(result.sources[0].source).toBe('WIDGET');
      expect(result.sources[0].percentage).toBe(60);
    });

    it('should handle empty results', async () => {
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await getBookingSources('tenant-1', {});

      expect(result.total).toBe(0);
      expect(result.sources).toEqual([]);
    });
  });
});
