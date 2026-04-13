/**
 * Integration tests for locations module — Phase 9.1
 *
 * All external dependencies (prisma) are mocked.
 *
 * Coverage:
 *  ✓ GET    /api/locations          — list locations (empty, with results)
 *  ✓ POST   /api/locations          — create (success, missing name)
 *  ✓ GET    /api/locations/:id      — get (success, not found, forbidden)
 *  ✓ PATCH  /api/locations/:id      — update (success, not found, forbidden)
 *  ✓ DELETE /api/locations/:id      — delete (success, not found, forbidden)
 *  ✓ Feature flag off → 503
 */

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockLocationFindMany  = jest.fn();
const mockLocationFindUnique = jest.fn();
const mockLocationCreate    = jest.fn();
const mockLocationUpdate    = jest.fn();
const mockLocationDelete    = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    location: {
      findMany:   (...a: unknown[]) => mockLocationFindMany(...a),
      findUnique: (...a: unknown[]) => mockLocationFindUnique(...a),
      create:     (...a: unknown[]) => mockLocationCreate(...a),
      update:     (...a: unknown[]) => mockLocationUpdate(...a),
      delete:     (...a: unknown[]) => mockLocationDelete(...a),
    },
  },
}));

// ─── Mock businessType ────────────────────────────────────────────────────────

import * as businessType from '../../config/businessType';

jest.spyOn(businessType, 'getDefaultFlags').mockReturnValue({
  ...businessType.getDefaultFlags('tattoo_studio'),
  MULTI_LOCATION_ENABLED: true,
  GROUP_BOOKING_ENABLED:  true,
});

// ─── Test setup ───────────────────────────────────────────────────────────────

import request from 'supertest';
import { app }  from '../../app';
import jwt      from 'jsonwebtoken';

function makeAdminToken(tenantId = 'tenant_1'): string {
  return jwt.sign(
    { sub: 'admin_user_1', role: 'ADMIN', tenantId },
    process.env['JWT_ACCESS_SECRET']!,
    { expiresIn: '1h' },
  );
}

const adminToken = makeAdminToken();

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const locationFixture = {
  id:        'loc_1',
  tenantId:  'tenant_1',
  name:      'Main Studio',
  address:   '123 High St',
  city:      'London',
  postcode:  'W1A 1AA',
  country:   'GB',
  phone:     '+44 20 0000 0000',
  timezone:  'Europe/London',
  isActive:  true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Feature flag guard ───────────────────────────────────────────────────────

describe('Feature flag guard', () => {
  it('returns 503 when MULTI_LOCATION_ENABLED is false', async () => {
    jest.spyOn(businessType, 'getDefaultFlags').mockReturnValueOnce({
      ...businessType.getDefaultFlags('tattoo_studio'),
      MULTI_LOCATION_ENABLED: false,
      GROUP_BOOKING_ENABLED:  false,
    });

    const res = await request(app)
      .get('/api/locations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(503);
  });
});

// ── GET /api/locations ────────────────────────────────────────────────────────

describe('GET /api/locations', () => {
  it('returns empty list when no locations', async () => {
    mockLocationFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/locations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns list of locations', async () => {
    mockLocationFindMany.mockResolvedValue([locationFixture]);

    const res = await request(app)
      .get('/api/locations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('loc_1');
  });

  it('filters by isActive=true', async () => {
    mockLocationFindMany.mockResolvedValue([locationFixture]);

    const res = await request(app)
      .get('/api/locations?isActive=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockLocationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
  });
});

// ── POST /api/locations ───────────────────────────────────────────────────────

describe('POST /api/locations', () => {
  const validBody = {
    name:     'Downtown Studio',
    city:     'London',
    timezone: 'Europe/London',
  };

  it('creates location successfully', async () => {
    mockLocationCreate.mockResolvedValue(locationFixture);

    const res = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('loc_1');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ city: 'London' });

    expect(res.status).toBe(400);
  });
});

// ── GET /api/locations/:id ────────────────────────────────────────────────────

describe('GET /api/locations/:id', () => {
  it('returns location by id', async () => {
    mockLocationFindUnique.mockResolvedValue(locationFixture);

    const res = await request(app)
      .get('/api/locations/loc_1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('loc_1');
  });

  it('returns 404 when location not found', async () => {
    mockLocationFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/locations/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when location belongs to different tenant', async () => {
    mockLocationFindUnique.mockResolvedValue({ ...locationFixture, tenantId: 'other_tenant' });

    const res = await request(app)
      .get('/api/locations/loc_1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/locations/:id ──────────────────────────────────────────────────

describe('PATCH /api/locations/:id', () => {
  it('updates location successfully', async () => {
    mockLocationFindUnique.mockResolvedValue({ id: 'loc_1', tenantId: 'tenant_1' });
    mockLocationUpdate.mockResolvedValue({ ...locationFixture, name: 'Updated Studio' });

    const res = await request(app)
      .patch('/api/locations/loc_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Studio' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Studio');
  });

  it('returns 404 when location not found', async () => {
    mockLocationFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/locations/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  it('returns 403 when location belongs to different tenant', async () => {
    mockLocationFindUnique.mockResolvedValue({ id: 'loc_1', tenantId: 'other_tenant' });

    const res = await request(app)
      .patch('/api/locations/loc_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' });

    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/locations/:id ─────────────────────────────────────────────────

describe('DELETE /api/locations/:id', () => {
  it('deletes location successfully', async () => {
    mockLocationFindUnique.mockResolvedValue({ id: 'loc_1', tenantId: 'tenant_1' });
    mockLocationDelete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/locations/loc_1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 when location not found', async () => {
    mockLocationFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/locations/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when location belongs to different tenant', async () => {
    mockLocationFindUnique.mockResolvedValue({ id: 'loc_1', tenantId: 'other_tenant' });

    const res = await request(app)
      .delete('/api/locations/loc_1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });
});
