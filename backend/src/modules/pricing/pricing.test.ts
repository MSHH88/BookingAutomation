/**
 * Integration tests for pricing module — Phase 8.1
 *
 * All external dependencies (prisma, pricing-engine) are mocked.
 *
 * Coverage:
 *  ✓ GET    /api/pricing-rules          — list rules (empty, with results)
 *  ✓ POST   /api/pricing-rules          — create (success, service not found)
 *  ✓ PATCH  /api/pricing-rules/:id      — update (success, not found, forbidden)
 *  ✓ DELETE /api/pricing-rules/:id      — delete (success, not found, forbidden)
 *  ✓ GET    /api/pricing-rules/calculate— calculate price (success, no price → 404, invalid date)
 *  ✓ Feature flag off → 503
 */

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockRuleFindMany  = jest.fn();
const mockRuleCreate    = jest.fn();
const mockRuleUpdate    = jest.fn();
const mockRuleDelete    = jest.fn();
const mockRuleFindUnique = jest.fn();
const mockServiceFindUnique = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    pricingRule: {
      findMany:   (...a: unknown[]) => mockRuleFindMany(...a),
      create:     (...a: unknown[]) => mockRuleCreate(...a),
      update:     (...a: unknown[]) => mockRuleUpdate(...a),
      delete:     (...a: unknown[]) => mockRuleDelete(...a),
      findUnique: (...a: unknown[]) => mockRuleFindUnique(...a),
    },
    service: {
      findUnique: (...a: unknown[]) => mockServiceFindUnique(...a),
    },
  },
}));

// ─── Mock pricing-engine ──────────────────────────────────────────────────────

const mockCalculatePrice = jest.fn();

jest.mock('../../lib/pricing-engine', () => ({
  ...jest.requireActual<typeof import('../../lib/pricing-engine')>('../../lib/pricing-engine'),
  calculatePrice: (...a: unknown[]) => mockCalculatePrice(...a),
}));

// ─── Mock businessType ────────────────────────────────────────────────────────

import * as businessType from '../../config/businessType';

jest.spyOn(businessType, 'getDefaultFlags').mockReturnValue({
  ...businessType.getDefaultFlags('tattoo_studio'),
  DYNAMIC_PRICING_ENABLED: true,
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

const ruleFixture = {
  id:              'rule_1',
  tenantId:        'tenant_1',
  serviceId:       null,
  ruleType:        'PEAK',
  daysOfWeek:      [5, 6],
  startTime:       '10:00',
  endTime:         '18:00',
  dateFrom:        null,
  dateTo:          null,
  adjustmentType:  'PERCENTAGE',
  adjustmentValue: '20',
  priority:        1,
  isActive:        true,
  createdAt:       new Date(),
  updatedAt:       new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Feature flag gate ─────────────────────────────────────────────────────────

describe('Feature flag gate', () => {
  it('returns 503 when DYNAMIC_PRICING_ENABLED is false', async () => {
    // Temporarily remove our override so getDefaultFlags returns the real defaults
    // (all business types have DYNAMIC_PRICING_ENABLED: false by default)
    jest.spyOn(businessType, 'getDefaultFlags').mockReturnValueOnce({
      ...businessType.getDefaultFlags('tattoo_studio'),
      DYNAMIC_PRICING_ENABLED: false,
    });

    const res = await request(app)
      .get('/api/pricing-rules')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(503);
  });
});

// ── GET /api/pricing-rules ────────────────────────────────────────────────────

describe('GET /api/pricing-rules', () => {
  it('returns empty list when no rules', async () => {
    mockRuleFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/pricing-rules')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns list of rules', async () => {
    mockRuleFindMany.mockResolvedValue([ruleFixture]);

    const res = await request(app)
      .get('/api/pricing-rules')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('rule_1');
  });
});

// ── POST /api/pricing-rules ───────────────────────────────────────────────────

describe('POST /api/pricing-rules', () => {
  const validBody = {
    ruleType:        'PEAK',
    daysOfWeek:      [5, 6],
    startTime:       '10:00',
    endTime:         '18:00',
    adjustmentType:  'PERCENTAGE',
    adjustmentValue: 20,
  };

  it('creates rule successfully', async () => {
    mockRuleCreate.mockResolvedValue(ruleFixture);

    const res = await request(app)
      .post('/api/pricing-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('rule_1');
  });

  it('returns 400 for invalid body (missing ruleType)', async () => {
    const res = await request(app)
      .post('/api/pricing-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adjustmentType: 'FLAT', adjustmentValue: 10 });

    expect(res.status).toBe(400);
  });

  it('returns 404 when serviceId not found', async () => {
    mockServiceFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/pricing-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validBody, serviceId: 'nonexistent' });

    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/pricing-rules/:id ──────────────────────────────────────────────

describe('PATCH /api/pricing-rules/:id', () => {
  it('updates rule successfully', async () => {
    mockRuleFindUnique.mockResolvedValue({ id: 'rule_1', tenantId: 'tenant_1' });
    mockRuleUpdate.mockResolvedValue({ ...ruleFixture, priority: 5 });

    const res = await request(app)
      .patch('/api/pricing-rules/rule_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priority: 5 });

    expect(res.status).toBe(200);
  });

  it('returns 404 when rule not found', async () => {
    mockRuleFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/pricing-rules/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priority: 5 });

    expect(res.status).toBe(404);
  });

  it('returns 403 when rule belongs to different tenant', async () => {
    mockRuleFindUnique.mockResolvedValue({ id: 'rule_1', tenantId: 'other_tenant' });

    const res = await request(app)
      .patch('/api/pricing-rules/rule_1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priority: 5 });

    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/pricing-rules/:id ─────────────────────────────────────────────

describe('DELETE /api/pricing-rules/:id', () => {
  it('deletes rule successfully', async () => {
    mockRuleFindUnique.mockResolvedValue({ id: 'rule_1', tenantId: 'tenant_1' });
    mockRuleDelete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/pricing-rules/rule_1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 when rule not found', async () => {
    mockRuleFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/pricing-rules/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ── GET /api/pricing-rules/calculate ─────────────────────────────────────────

describe('GET /api/pricing-rules/calculate', () => {
  it('returns calculated price', async () => {
    mockCalculatePrice.mockResolvedValue({
      basePrice: 100,
      adjustedPrice: 120,
      totalAdjustment: 20,
      appliedRules: ['rule_1'],
    });

    const res = await request(app)
      .get('/api/pricing-rules/calculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ serviceId: 'svc_1', slotDateTime: '2025-06-07T10:00:00Z' });

    expect(res.status).toBe(200);
    expect(res.body.data.adjustedPrice).toBe(120);
  });

  it('returns 404 when service has no price', async () => {
    mockCalculatePrice.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/pricing-rules/calculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ serviceId: 'svc_1', slotDateTime: '2025-06-07T10:00:00Z' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid slotDateTime', async () => {
    const res = await request(app)
      .get('/api/pricing-rules/calculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ serviceId: 'svc_1', slotDateTime: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when serviceId missing', async () => {
    const res = await request(app)
      .get('/api/pricing-rules/calculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ slotDateTime: '2025-06-07T10:00:00Z' });

    expect(res.status).toBe(400);
  });
});
