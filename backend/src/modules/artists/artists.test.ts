/**
 * Integration tests for /api/artists — Step 1.22 / Step 1.24
 *
 * Exercises the full Express stack with mocked Prisma.  No real database or
 * network connections are made.
 *
 * Coverage:
 *  ✓ GET  /api/artists               — 200 list (public)
 *  ✓ GET  /api/artists/:slug         — 200 found, 404 not found
 *  ✓ POST /api/artists               — 201 ADMIN, 401 unauth, 403 non-ADMIN, 400 invalid
 *  ✓ PATCH /api/artists/:id          — 200 ADMIN, 200 own artist, 401 unauth
 *  ✓ DELETE /api/artists/:id         — 204 ADMIN, 403 non-ADMIN
 *  ✓ POST /api/artists/:id/styles    — 200 ADMIN replaces style assignments
 *  ✓ GET  /api/artists/:id/availability — 200 public
 *  ✓ PUT  /api/artists/:id/services  — 200 ADMIN sets services, 200 empty array removes all,
 *                                       401 unauth, 403 non-ADMIN, 404 artist not found
 *
 * 19 tests total
 */

jest.mock('../whatsapp/whatsapp.service', () => ({
  enqueueLeadInquiry:        jest.fn().mockResolvedValue(undefined),
  enqueueBookingConfirmed:   jest.fn().mockResolvedValue(undefined),
  enqueuePostVisitReview:    jest.fn().mockResolvedValue(undefined),
  enqueueRestaurantReminder: jest.fn().mockResolvedValue(undefined),
  testSendWhatsApp:          jest.fn().mockResolvedValue({ messageSid: 'SM_test' }),
}));

jest.mock('../reviews/reviews.queue', () => ({
  enqueueReviewRequest: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../reminders/reminders.queue', () => ({
  enqueueBookingReminder: jest.fn().mockResolvedValue(undefined),
  cancelBookingReminder:  jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user:   { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    artist: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      count:      jest.fn(),
    },
    tattooStyle: {
      findMany: jest.fn(),
    },
    artistStyle: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    artistService: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany:   jest.fn(),
    },
    service: {
      findMany: jest.fn(),
    },
    artistAvailability: {
      findMany:   jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.resolve(arg.map(() => ({})));
      if (typeof arg === 'function') return (arg as Function)({
        user:          { create: jest.fn().mockResolvedValue({ id: 'u_1', email: 'artist@example.com', name: 'Ace Artist', role: 'ARTIST' }) },
        artist:        { create: jest.fn().mockResolvedValue({ id: 'a_1', userId: 'u_1', slug: 'ace-artist' }) },
        artistService: { deleteMany: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}) },
      });
      return Promise.resolve(undefined);
    }),
  },
}));

jest.mock('../../lib/redis', () => ({
  getRedis: jest.fn(() => ({
    get:   jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    incr:  jest.fn().mockResolvedValue(1),
  })),
  isRedisHealthy: jest.fn(() => null),
  pingRedis:      jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';

import { app }    from '../../app';
import { prisma } from '../../lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = process.env['JWT_ACCESS_SECRET']!;

function makeToken(role: 'ADMIN' | 'ARTIST' | 'CUSTOMER' = 'CUSTOMER', userId = 'u_1', tenantId?: string) {
  return `Bearer ${jwt.sign({ sub: userId, email: 'test@example.com', role, tenantId: tenantId ?? null }, SECRET, { expiresIn: '15m' })}`;
}

const baseUser = {
  id: 'u_1', email: 'artist@example.com', name: 'Ace Artist',
  phone: null, passwordHash: '$2a$12$hash', role: 'ARTIST' as const,
  isActive: true, marketingConsent: false, gdprConsentAt: null,
  loyaltyBalance: 0, createdAt: new Date(), updatedAt: new Date(),
};

const baseArtist = {
  id: 'a_1', userId: 'u_1', slug: 'ace-artist', bio: 'Tattoo artist',
  profileImageUrl: null, portfolioImages: [], bufferMinutes: 30, slotDuration: 90,
  commissionRate: null, commissionType: null,
  calendarAccessToken: null, calendarRefreshToken: null, calendarTokenExpiresAt: null,
  isActive: true,
  user: baseUser,
  styles: [],
  services: [],
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/artists', () => {
  it('200 — returns empty list when no artists', async () => {
    (prisma.artist.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.artist.count    as jest.Mock).mockResolvedValue(0);

    const res = await request(app).get('/api/artists');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 — returns list of active artists', async () => {
    (prisma.artist.findMany as jest.Mock).mockResolvedValue([baseArtist]);
    (prisma.artist.count    as jest.Mock).mockResolvedValue(1);

    const res = await request(app).get('/api/artists');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe('ace-artist');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/artists/:slug', () => {
  it('200 — returns artist by slug', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(baseArtist);

    const res = await request(app).get('/api/artists/ace-artist');
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('ace-artist');
  });

  it('404 — unknown slug', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/artists/does-not-exist');
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/artists', () => {
  const validBody = {
    name: 'New Artist', email: 'newartist@example.com',
    password: 'ArtistPass1!', slug: 'new-artist',
  };

  it('201 — ADMIN creates artist', async () => {
    (prisma.user.findUnique   as jest.Mock).mockResolvedValue(null); // email available
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(null); // slug available

    const res = await request(app)
      .post('/api/artists')
      .set('Authorization', makeToken('ADMIN'))
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app).post('/api/artists').send(validBody);
    expect(res.status).toBe(401);
  });

  it('403 — CUSTOMER cannot create artist', async () => {
    const res = await request(app)
      .post('/api/artists')
      .set('Authorization', makeToken('CUSTOMER'))
      .send(validBody);

    expect(res.status).toBe(403);
  });

  it('201 — ADMIN creates artist with tenantId persisted on user and artist', async () => {
    const userCreateMock   = jest.fn().mockResolvedValue({ id: 'u_new', email: 'newartist@example.com', name: 'New Artist', role: 'ARTIST', tenantId: 'tenant_A' });
    const artistCreateMock = jest.fn().mockResolvedValue({ id: 'a_new', userId: 'u_new', slug: 'new-artist', tenantId: 'tenant_A' });

    (prisma.user.findUnique   as jest.Mock).mockResolvedValue(null);
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockImplementation((fn: Function) =>
      fn({ user: { create: userCreateMock }, artist: { create: artistCreateMock }, artistService: { deleteMany: jest.fn(), createMany: jest.fn() } }),
    );

    const res = await request(app)
      .post('/api/artists')
      .set('Authorization', makeToken('ADMIN', 'u_admin', 'tenant_A'))
      .send(validBody);

    expect(res.status).toBe(201);
    // Verify tenantId was passed to both create calls
    const userCallData   = userCreateMock.mock.calls[0][0].data;
    const artistCallData = artistCreateMock.mock.calls[0][0].data;
    expect(userCallData.tenantId).toBe('tenant_A');
    expect(artistCallData.tenantId).toBe('tenant_A');
  });


    const res = await request(app)
      .post('/api/artists')
      .set('Authorization', makeToken('ADMIN'))
      .send({ email: 'x@example.com' }); // missing name, password, slug

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/artists/:id', () => {
  it('200 — ADMIN updates any artist', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.artist.update as jest.Mock).mockResolvedValue({ ...baseArtist, bio: 'Updated bio' });

    const res = await request(app)
      .patch('/api/artists/a_1')
      .set('Authorization', makeToken('ADMIN'))
      .send({ bio: 'Updated bio' });

    expect(res.status).toBe(200);
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app).patch('/api/artists/a_1').send({ bio: 'x' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/artists/:id', () => {
  it('204 — ADMIN soft-deletes artist', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.artist.update as jest.Mock).mockResolvedValue({ ...baseArtist, isActive: false });

    const res = await request(app)
      .delete('/api/artists/a_1')
      .set('Authorization', makeToken('ADMIN'));

    expect(res.status).toBe(204);
  });

  it('403 — CUSTOMER cannot delete artist', async () => {
    const res = await request(app)
      .delete('/api/artists/a_1')
      .set('Authorization', makeToken('CUSTOMER'));

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/artists/:id/styles', () => {
  it('200 — ADMIN replaces style assignments', async () => {
    (prisma.artist.findUnique  as jest.Mock).mockResolvedValue({ ...baseArtist, userId: 'u_other' });
    (prisma.tattooStyle.findMany as jest.Mock).mockResolvedValue([
      { id: 'style_1' },
      { id: 'style_2' },
    ]);

    const res = await request(app)
      .post('/api/artists/a_1/styles')
      .set('Authorization', makeToken('ADMIN'))
      .send({ styleIds: ['style_1', 'style_2'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/artists/:id/availability', () => {
  it('200 — returns weekly schedule (public)', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(baseArtist);
    (prisma.artistAvailability.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/artists/a_1/availability');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/artists/:id/services', () => {
  const servicePayload = {
    services: [
      { serviceId: 's_1', customPrice: 55.00 },
      { serviceId: 's_2', customPrice: null },
    ],
  };

  const serviceRoster = [
    {
      serviceId: 's_1', customPrice: '55.00',
      service: { id: 's_1', name: 'Haircut', durationMinutes: 30, priceFrom: '45.00', isActive: true,
        category: { id: 'cat_1', name: 'Cuts' } },
    },
    {
      serviceId: 's_2', customPrice: null,
      service: { id: 's_2', name: 'Beard Trim', durationMinutes: 20, priceFrom: '25.00', isActive: true,
        category: { id: 'cat_1', name: 'Cuts' } },
    },
  ];

  it('200 — ADMIN sets services for an artist with price overrides', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue({ id: 'a_1' });
    (prisma.service.findMany as jest.Mock).mockResolvedValue([{ id: 's_1' }, { id: 's_2' }]);
    (prisma.artistService.findMany as jest.Mock).mockResolvedValue(serviceRoster);

    const res = await request(app)
      .put('/api/artists/a_1/services')
      .set('Authorization', makeToken('ADMIN'))
      .send(servicePayload);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('200 — empty array removes all services', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue({ id: 'a_1' });
    (prisma.artistService.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .put('/api/artists/a_1/services')
      .set('Authorization', makeToken('ADMIN'))
      .send({ services: [] });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app)
      .put('/api/artists/a_1/services')
      .send(servicePayload);
    expect(res.status).toBe(401);
  });

  it('403 — ARTIST cannot set another artist services', async () => {
    const res = await request(app)
      .put('/api/artists/a_1/services')
      .set('Authorization', makeToken('ARTIST'))
      .send(servicePayload);
    expect(res.status).toBe(403);
  });

  it('404 — artist not found', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/artists/bad_id/services')
      .set('Authorization', makeToken('ADMIN'))
      .send(servicePayload);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG 17 — tenant isolation for ADMIN mutations
// ─────────────────────────────────────────────────────────────────────────────

describe('BUG 17 — PATCH /api/artists/:id cross-tenant isolation', () => {
  const artistInTenantB = { ...baseArtist, tenantId: 'tenant_B' };

  it('403 — Tenant A ADMIN cannot update Tenant B artist', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(artistInTenantB);

    const res = await request(app)
      .patch('/api/artists/a_1')
      .set('Authorization', makeToken('ADMIN', 'u_admin', 'tenant_A'))
      .send({ bio: 'Hacked bio' });

    expect(res.status).toBe(403);
  });

  it('200 — Tenant A ADMIN can update Tenant A artist', async () => {
    const artistInTenantA = { ...baseArtist, tenantId: 'tenant_A' };
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(artistInTenantA);
    (prisma.artist.update as jest.Mock).mockResolvedValue({ ...artistInTenantA, bio: 'Updated' });

    const res = await request(app)
      .patch('/api/artists/a_1')
      .set('Authorization', makeToken('ADMIN', 'u_admin', 'tenant_A'))
      .send({ bio: 'Updated' });

    expect(res.status).toBe(200);
  });

  it('200 — SUPER_ADMIN (tenantId null) can update any artist cross-tenant', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(artistInTenantB);
    (prisma.artist.update as jest.Mock).mockResolvedValue({ ...artistInTenantB, bio: 'Updated' });

    const res = await request(app)
      .patch('/api/artists/a_1')
      .set('Authorization', makeToken('ADMIN', 'u_super'))
      .send({ bio: 'Updated' });

    expect(res.status).toBe(200);
  });
});

describe('BUG 17 — DELETE /api/artists/:id cross-tenant isolation', () => {
  const artistInTenantB = { ...baseArtist, tenantId: 'tenant_B' };

  it('403 — Tenant A ADMIN cannot delete Tenant B artist', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(artistInTenantB);

    const res = await request(app)
      .delete('/api/artists/a_1')
      .set('Authorization', makeToken('ADMIN', 'u_admin', 'tenant_A'));

    expect(res.status).toBe(403);
  });

  it('204 — Tenant A ADMIN can delete Tenant A artist', async () => {
    const artistInTenantA = { ...baseArtist, tenantId: 'tenant_A' };
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(artistInTenantA);
    (prisma.artist.update as jest.Mock).mockResolvedValue({ ...artistInTenantA, isActive: false });

    const res = await request(app)
      .delete('/api/artists/a_1')
      .set('Authorization', makeToken('ADMIN', 'u_admin', 'tenant_A'));

    expect(res.status).toBe(204);
  });
});

describe('BUG 17 — POST /api/artists/:id/styles cross-tenant isolation', () => {
  const artistInTenantB = { ...baseArtist, tenantId: 'tenant_B', userId: 'u_other' };

  it('403 — Tenant A ADMIN cannot assign styles for Tenant B artist', async () => {
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(artistInTenantB);

    const res = await request(app)
      .post('/api/artists/a_1/styles')
      .set('Authorization', makeToken('ADMIN', 'u_admin', 'tenant_A'))
      .send({ styleIds: [] });

    expect(res.status).toBe(403);
  });

  it('200 — Tenant A ADMIN can assign styles for Tenant A artist', async () => {
    const artistInTenantA = { ...baseArtist, tenantId: 'tenant_A', userId: 'u_other' };
    (prisma.artist.findUnique as jest.Mock).mockResolvedValue(artistInTenantA);

    const res = await request(app)
      .post('/api/artists/a_1/styles')
      .set('Authorization', makeToken('ADMIN', 'u_admin', 'tenant_A'))
      .send({ styleIds: [] });

    expect(res.status).toBe(200);
  });
});
