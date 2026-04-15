/**
 * Unit tests for the WhatsApp queue processor — BUG 3 fix
 *
 * Tests cover:
 *  ✓ processWhatsAppJob uses DB template when one exists
 *  ✓ processWhatsAppJob falls back to buildWhatsAppMessage when no template
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock BullMQ (prevents real Redis connection at module load) ──────────────

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add:   jest.fn().mockResolvedValue({ id: 'job_123' }),
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on:    jest.fn(),
    close: jest.fn(),
  })),
}));

// ─── Mock Twilio ──────────────────────────────────────────────────────────────

const mockSendWhatsApp = jest.fn().mockResolvedValue({ sid: 'SM_test' });
jest.mock('../../lib/twilio', () => ({
  sendWhatsAppMessage: (...a: unknown[]) => mockSendWhatsApp(...a),
}));

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockFindFirst = jest.fn();
jest.mock('../../lib/prisma', () => ({
  prisma: {
    whatsAppTemplate: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
    },
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { buildWhatsAppMessage } from './whatsapp.queue';
import type { WhatsAppJobData } from './whatsapp.queue';

// We need to import the processWhatsAppJob indirectly. Since it's not exported,
// we can test via the startWhatsAppWorker or by importing the module and calling
// the processor. However, processWhatsAppJob is private (not exported).
// We'll re-export it for testing by accessing the module internals.
// Actually, let's test the behavior through a different approach: we know the
// Worker constructor receives the processor. We can capture it from the mock.

import { Worker } from 'bullmq';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseJobData: WhatsAppJobData = {
  jobName:      'booking-confirmed',
  to:           '+447700900001',
  customerName: 'Jane Smith',
  studioName:   'Black Rose Studio',
  artistName:   'Alex Ink',
  bookingId:    'booking_1',
  startAt:      '2026-05-01T14:00:00Z',
  service:      'tattoo session',
  tenantId:     'tenant_1',
};

// ─── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WhatsApp queue processor (DB template integration)', () => {
  // Start the worker to capture the processor function
  let processor: (job: { data: WhatsAppJobData }) => Promise<void>;

  beforeAll(() => {
    // Import startWhatsAppWorker which registers the processor with the Worker mock
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { startWhatsAppWorker } = require('./whatsapp.queue');
    startWhatsAppWorker();

    // The Worker mock captures the processor as the second argument
    const WorkerMock = Worker as unknown as jest.Mock;
    const lastCall = WorkerMock.mock.calls[WorkerMock.mock.calls.length - 1];
    processor = lastCall[1];
  });

  it('uses DB template when an active template exists for the tenant', async () => {
    mockFindFirst.mockResolvedValueOnce({
      body: 'Hi {{customerName}}, your {{service}} is confirmed at {{studioName}}!',
    });

    await processor({ data: baseJobData });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { key: 'booking-confirmed', tenantId: 'tenant_1', isActive: true },
      select: { body: true },
    });
    expect(mockSendWhatsApp).toHaveBeenCalledWith(
      '+447700900001',
      'Hi Jane Smith, your tattoo session is confirmed at Black Rose Studio!',
    );
  });

  it('falls back to buildWhatsAppMessage when no template exists', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    await processor({ data: baseJobData });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { key: 'booking-confirmed', tenantId: 'tenant_1', isActive: true },
      select: { body: true },
    });

    // Should use the hardcoded message builder
    const expected = buildWhatsAppMessage(baseJobData);
    expect(mockSendWhatsApp).toHaveBeenCalledWith('+447700900001', expected);
  });

  it('uses null tenantId when tenantId is not provided in job data', async () => {
    const jobDataNoTenant: WhatsAppJobData = { ...baseJobData, tenantId: undefined };
    mockFindFirst.mockResolvedValueOnce(null);

    await processor({ data: jobDataNoTenant });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { key: 'booking-confirmed', tenantId: null, isActive: true },
      select: { body: true },
    });
  });
});
