/**
 * Unit tests for notifications.service.ts — Step 1.15
 *
 * Prisma and Resend are fully mocked so these tests run without a live
 * database or email provider.
 *
 * Coverage:
 *  ✓ listTemplates
 *      — no filter: returns paginated list
 *      — isActive=true: passes filter to Prisma
 *      — isActive=false: passes filter to Prisma
 *      — pagination params forwarded correctly
 *
 *  ✓ getTemplateById
 *      — found → returns template detail
 *      — not found → 404 TEMPLATE_NOT_FOUND
 *
 *  ✓ createTemplate
 *      — success: creates and returns new template
 *      — duplicate key → 409 TEMPLATE_KEY_CONFLICT
 *
 *  ✓ updateTemplate
 *      — updates subject only
 *      — updates htmlBody only
 *      — updates variables only
 *      — updates isActive only
 *      — updates multiple fields at once
 *      — not found → 404 TEMPLATE_NOT_FOUND
 *
 *  ✓ deleteTemplate (soft-delete → isActive = false)
 *      — active template → deactivated, returns updated record
 *      — already inactive → 409 TEMPLATE_ALREADY_INACTIVE
 *      — not found → 404 TEMPLATE_NOT_FOUND
 *
 *  ✓ sendEmail (internal dispatch utility)
 *      — success: Handlebars variables substituted in subject + body
 *      — success: email sent via Resend with correct from / to / subject
 *      — template not found → 404 TEMPLATE_NOT_FOUND
 *      — template inactive → 409 TEMPLATE_INACTIVE
 *      — Resend error → 502 EMAIL_SEND_FAILED (error message propagated)
 *      — empty variables object → uses empty Handlebars context
 *      — plain template (no variables) → dispatched unchanged
 *
 *  ✓ sendTestEmail (admin test-send)
 *      — success: renders template + dispatches + returns { templateId, to, subject }
 *      — subject rendered with supplied variables
 *      — template not found → 404 TEMPLATE_NOT_FOUND
 *      — Resend error → 502 EMAIL_SEND_FAILED
 *      — inactive template can still be test-sent (no isActive guard in sendTestEmail)
 */

// ─── Env vars MUST be set before any module import ───────────────────────────

process.env['BUSINESS_TYPE']      = 'tattoo_studio';
process.env['DATABASE_URL']       = 'postgresql://test';
process.env['NODE_ENV']           = 'test';
process.env['JWT_ACCESS_SECRET']  = 'a'.repeat(32);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(32);
process.env['RESEND_API_KEY']     = 'test_key';
process.env['RESEND_FROM_EMAIL']  = 'noreply@test.io';
process.env['RESEND_FROM_NAME']   = 'Test Studio';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockTemplateFindUnique = jest.fn();
const mockTemplateFindFirst  = jest.fn();
const mockTemplateFindMany   = jest.fn();
const mockTemplateCount      = jest.fn();
const mockTemplateCreate     = jest.fn();
const mockTemplateUpdate     = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    emailTemplate: {
      findUnique: (...a: unknown[]) => mockTemplateFindUnique(...a),
      findFirst:  (...a: unknown[]) => mockTemplateFindFirst(...a),
      findMany:   (...a: unknown[]) => mockTemplateFindMany(...a),
      count:      (...a: unknown[]) => mockTemplateCount(...a),
      create:     (...a: unknown[]) => mockTemplateCreate(...a),
      update:     (...a: unknown[]) => mockTemplateUpdate(...a),
    },
  },
}));

// ─── Mock Resend ──────────────────────────────────────────────────────────────

const mockResendSend = jest.fn();

jest.mock('../../lib/resend', () => ({
  resend: {
    emails: {
      send: (...a: unknown[]) => mockResendSend(...a),
    },
  },
}));

// ─── Import service under test ────────────────────────────────────────────────

import * as notificationsService from './notifications.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const NOW = new Date('2026-04-07T10:00:00Z');

const baseTemplateDetail = {
  id:        'tpl_1',
  tenantId:  null as string | null,
  key:       'booking-confirmed',
  subject:   'Booking confirmed for {{customerName}}',
  htmlBody:  '<h1>Hello {{customerName}}, your booking is confirmed for {{bookingDate}}.</h1>',
  variables: ['customerName', 'bookingDate', 'artistName'],
  isActive:  true,
  updatedAt: NOW,
};

const baseTemplateListItem = {
  id:        'tpl_1',
  tenantId:  null as string | null,
  key:       'booking-confirmed',
  subject:   'Booking confirmed for {{customerName}}',
  variables: ['customerName', 'bookingDate', 'artistName'],
  isActive:  true,
  updatedAt: NOW,
};

// ─── beforeEach reset ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── listTemplates ────────────────────────────────────────────────────────────

describe('listTemplates', () => {
  it('returns a paginated list with no filter', async () => {
    mockTemplateCount.mockResolvedValue(1);
    mockTemplateFindMany.mockResolvedValue([baseTemplateListItem]);

    const result = await notificationsService.listTemplates(null, {});

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(mockTemplateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where:   expect.objectContaining({ tenantId: null }),
        orderBy: { key: 'asc' },
      }),
    );
  });

  it('passes isActive=true filter to Prisma', async () => {
    mockTemplateCount.mockResolvedValue(1);
    mockTemplateFindMany.mockResolvedValue([baseTemplateListItem]);

    await notificationsService.listTemplates(null, { isActive: true });

    expect(mockTemplateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
  });

  it('passes isActive=false filter to Prisma', async () => {
    mockTemplateCount.mockResolvedValue(0);
    mockTemplateFindMany.mockResolvedValue([]);

    await notificationsService.listTemplates(null, { isActive: false });

    expect(mockTemplateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: false }) }),
    );
  });

  it('forwards pagination params correctly', async () => {
    mockTemplateCount.mockResolvedValue(50);
    mockTemplateFindMany.mockResolvedValue([]);

    await notificationsService.listTemplates(null, { page: '3', limit: '5' });

    expect(mockTemplateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 }),
    );
  });
});

// ─── getTemplateById ──────────────────────────────────────────────────────────

describe('getTemplateById', () => {
  it('returns template detail when found', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(baseTemplateDetail);

    const result = await notificationsService.getTemplateById(null, 'tpl_1');

    expect(result).toEqual(baseTemplateDetail);
    expect(mockTemplateFindUnique).toHaveBeenCalledWith({
      where:  { id: 'tpl_1' },
      select: expect.objectContaining({ id: true, htmlBody: true }),
    });
  });

  it('throws 404 TEMPLATE_NOT_FOUND when template does not exist', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(null);

    await expect(notificationsService.getTemplateById(null, 'missing'))
      .rejects.toMatchObject({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND' });
  });
});

// ─── createTemplate ───────────────────────────────────────────────────────────

describe('createTemplate', () => {
  const createBody = {
    key:       'quote-sent',
    subject:   'Your quote is ready, {{customerName}}',
    htmlBody:  '<p>Hi {{customerName}}, your quote of {{price}} is ready.</p>',
    variables: ['customerName', 'price'],
    isActive:  true,
  };

  it('creates and returns a new template', async () => {
    mockTemplateFindFirst.mockResolvedValueOnce(null); // no duplicate
    mockTemplateCreate.mockResolvedValue({ ...baseTemplateDetail, key: 'quote-sent' });

    const result = await notificationsService.createTemplate(null, createBody);

    expect(result.key).toBe('quote-sent');
    expect(mockTemplateCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key:      'quote-sent',
        subject:  createBody.subject,
        htmlBody: createBody.htmlBody,
        isActive: true,
      }),
      select: expect.any(Object),
    });
  });

  it('throws 409 TEMPLATE_KEY_CONFLICT when key already exists', async () => {
    mockTemplateFindFirst.mockResolvedValueOnce({ id: 'tpl_existing' });

    await expect(notificationsService.createTemplate(null, createBody))
      .rejects.toMatchObject({ statusCode: 409, code: 'TEMPLATE_KEY_CONFLICT' });

    expect(mockTemplateCreate).not.toHaveBeenCalled();
  });
});

// ─── updateTemplate ───────────────────────────────────────────────────────────

describe('updateTemplate', () => {
  it('updates subject only', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce({ id: 'tpl_1', tenantId: null });
    mockTemplateUpdate.mockResolvedValue({ ...baseTemplateDetail, subject: 'New subject' });

    const result = await notificationsService.updateTemplate(null, 'tpl_1', { subject: 'New subject' });

    expect(result.subject).toBe('New subject');
    expect(mockTemplateUpdate).toHaveBeenCalledWith({
      where:  { id: 'tpl_1' },
      data:   { subject: 'New subject' },
      select: expect.objectContaining({ id: true, htmlBody: true }),
    });
  });

  it('updates htmlBody only', async () => {
    const newBody = '<h1>Updated content {{name}}</h1>';
    mockTemplateFindUnique.mockResolvedValueOnce({ id: 'tpl_1', tenantId: null });
    mockTemplateUpdate.mockResolvedValue({ ...baseTemplateDetail, htmlBody: newBody });

    const result = await notificationsService.updateTemplate(null, 'tpl_1', { htmlBody: newBody });

    expect(result.htmlBody).toBe(newBody);
    expect(mockTemplateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { htmlBody: newBody } }),
    );
  });

  it('updates variables only', async () => {
    const newVars = ['customerName', 'newVar'];
    mockTemplateFindUnique.mockResolvedValueOnce({ id: 'tpl_1', tenantId: null });
    mockTemplateUpdate.mockResolvedValue({ ...baseTemplateDetail, variables: newVars });

    const result = await notificationsService.updateTemplate(null, 'tpl_1', { variables: newVars });

    expect(result.variables).toEqual(newVars);
  });

  it('updates isActive only', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce({ id: 'tpl_1', tenantId: null });
    mockTemplateUpdate.mockResolvedValue({ ...baseTemplateDetail, isActive: false });

    const result = await notificationsService.updateTemplate(null, 'tpl_1', { isActive: false });

    expect(result.isActive).toBe(false);
    expect(mockTemplateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });

  it('updates multiple fields at once', async () => {
    const updatedTpl = { ...baseTemplateDetail, subject: 'New', isActive: false };
    mockTemplateFindUnique.mockResolvedValueOnce({ id: 'tpl_1', tenantId: null });
    mockTemplateUpdate.mockResolvedValue(updatedTpl);

    await notificationsService.updateTemplate(null, 'tpl_1', { subject: 'New', isActive: false });

    expect(mockTemplateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { subject: 'New', isActive: false } }),
    );
  });

  it('throws 404 TEMPLATE_NOT_FOUND when template does not exist', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(null);

    await expect(notificationsService.updateTemplate(null, 'missing', { subject: 'X' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND' });

    expect(mockTemplateUpdate).not.toHaveBeenCalled();
  });
});

// ─── deleteTemplate ───────────────────────────────────────────────────────────

describe('deleteTemplate', () => {
  it('deactivates an active template and returns updated record', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce({ id: 'tpl_1', tenantId: null, isActive: true });
    mockTemplateUpdate.mockResolvedValue({ ...baseTemplateDetail, isActive: false });

    const result = await notificationsService.deleteTemplate(null, 'tpl_1');

    expect(result.isActive).toBe(false);
    expect(mockTemplateUpdate).toHaveBeenCalledWith({
      where:  { id: 'tpl_1' },
      data:   { isActive: false },
      select: expect.objectContaining({ id: true, isActive: true }),
    });
  });

  it('throws 409 TEMPLATE_ALREADY_INACTIVE when already inactive', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce({ id: 'tpl_1', tenantId: null, isActive: false });

    await expect(notificationsService.deleteTemplate(null, 'tpl_1'))
      .rejects.toMatchObject({ statusCode: 409, code: 'TEMPLATE_ALREADY_INACTIVE' });

    expect(mockTemplateUpdate).not.toHaveBeenCalled();
  });

  it('throws 404 TEMPLATE_NOT_FOUND when template does not exist', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(null);

    await expect(notificationsService.deleteTemplate(null, 'missing'))
      .rejects.toMatchObject({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND' });
  });
});

// ─── sendEmail ────────────────────────────────────────────────────────────────

describe('sendEmail', () => {
  const template = {
    id:       'tpl_1',
    subject:  'Booking confirmed for {{customerName}}',
    htmlBody: '<h1>Hi {{customerName}}, your booking on {{bookingDate}} is confirmed.</h1>',
    isActive: true,
  };

  it('dispatches email with rendered Handlebars variables', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(template);
    mockResendSend.mockResolvedValue({ data: { id: 'resend_id' }, error: null });

    await notificationsService.sendEmail('booking-confirmed', 'jane@example.com', {
      customerName: 'Jane Smith',
      bookingDate:  '2026-04-10',
    });

    const sendCall = mockResendSend.mock.calls[0][0];
    expect(sendCall.subject).toBe('Booking confirmed for Jane Smith');
    expect(sendCall.html).toContain('Jane Smith');
    expect(sendCall.html).toContain('2026-04-10');
  });

  it('sends email to the correct recipient via Resend', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(template);
    mockResendSend.mockResolvedValue({ data: { id: 'resend_id' }, error: null });

    await notificationsService.sendEmail('booking-confirmed', 'customer@example.com', {
      customerName: 'Test Customer',
      bookingDate:  '2026-05-01',
    });

    const sendCall = mockResendSend.mock.calls[0][0];
    expect(sendCall.to).toEqual(['customer@example.com']);
    expect(sendCall.from).toContain('noreply@test.io');
  });

  it('throws 404 TEMPLATE_NOT_FOUND when key does not exist', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(null);

    await expect(
      notificationsService.sendEmail('nonexistent-key', 'x@x.com'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND' });

    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('throws 409 TEMPLATE_INACTIVE when template is inactive', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce({ ...template, isActive: false });

    await expect(
      notificationsService.sendEmail('booking-confirmed', 'x@x.com'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'TEMPLATE_INACTIVE' });

    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('throws 502 EMAIL_SEND_FAILED on Resend error and propagates message', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(template);
    mockResendSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });

    await expect(
      notificationsService.sendEmail('booking-confirmed', 'x@x.com', { customerName: 'A', bookingDate: 'B' }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code:       'EMAIL_SEND_FAILED',
      message:    expect.stringContaining('Invalid API key'),
    });
  });

  it('uses an empty Handlebars context when no variables supplied', async () => {
    const plainTemplate = {
      id:       'tpl_plain',
      subject:  'Welcome to the studio',
      htmlBody: '<p>Welcome to the studio!</p>',
      isActive: true,
    };
    mockTemplateFindUnique.mockResolvedValueOnce(plainTemplate);
    mockResendSend.mockResolvedValue({ data: { id: 'ok' }, error: null });

    await notificationsService.sendEmail('welcome', 'test@example.com');

    const sendCall = mockResendSend.mock.calls[0][0];
    expect(sendCall.subject).toBe('Welcome to the studio');
    expect(sendCall.html).toContain('Welcome to the studio!');
  });

  it('dispatches plain template without variable substitution', async () => {
    const simpleTemplate = {
      id:       'tpl_simple',
      subject:  'Account created',
      htmlBody: '<p>Your account has been created successfully.</p>',
      isActive: true,
    };
    mockTemplateFindUnique.mockResolvedValueOnce(simpleTemplate);
    mockResendSend.mockResolvedValue({ data: { id: 'ok' }, error: null });

    await notificationsService.sendEmail('account-created', 'new@user.com', {});

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const sendCall = mockResendSend.mock.calls[0][0];
    expect(sendCall.subject).toBe('Account created');
  });

  it('does not HTML-escape special characters in the rendered subject line', async () => {
    const specialTemplate = {
      id:       'tpl_special',
      subject:  'Booking confirmed for {{customerName}}',
      htmlBody: '<p>Hi {{customerName}},</p>',
      isActive: true,
    };
    mockTemplateFindUnique.mockResolvedValueOnce(specialTemplate);
    mockResendSend.mockResolvedValue({ data: { id: 'ok' }, error: null });

    await notificationsService.sendEmail('booking-confirmed', 'test@example.com', {
      customerName: "O'Brien & Co",
    });

    const sendCall = mockResendSend.mock.calls[0][0];
    // Subject is plain text — raw characters must appear, not HTML entities
    expect(sendCall.subject).toBe("Booking confirmed for O'Brien & Co");
    expect(sendCall.subject).not.toContain('&amp;');
    expect(sendCall.subject).not.toContain('&#x27;');
  });
});

// ─── sendTestEmail ────────────────────────────────────────────────────────────

describe('sendTestEmail', () => {
  const template = {
    id:       'tpl_1',
    tenantId: 'tenant_1',
    key:      'booking-confirmed',
    subject:  'Booking for {{customerName}}',
    htmlBody: '<h1>Hi {{customerName}}!</h1>',
    isActive: true,
  };

  it('dispatches test email and returns confirmation metadata', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(template);
    mockResendSend.mockResolvedValue({ data: { id: 'r1' }, error: null });

    const result = await notificationsService.sendTestEmail(null, 'tpl_1', {
      to:        'admin@studio.com',
      variables: { customerName: 'Admin Preview' },
    });

    expect(result).toEqual({
      templateId: 'tpl_1',
      to:         'admin@studio.com',
      subject:    'Booking for Admin Preview',
    });
  });

  it('renders subject with supplied variables', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(template);
    mockResendSend.mockResolvedValue({ data: { id: 'r2' }, error: null });

    const result = await notificationsService.sendTestEmail(null, 'tpl_1', {
      to:        'test@example.com',
      variables: { customerName: 'Test User' },
    });

    expect(result.subject).toBe('Booking for Test User');
    const sendCall = mockResendSend.mock.calls[0][0];
    expect(sendCall.to).toEqual(['test@example.com']);
  });

  it('throws 404 TEMPLATE_NOT_FOUND when template does not exist', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(null);

    await expect(
      notificationsService.sendTestEmail(null, 'missing', { to: 'x@x.com', variables: {} }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND' });
  });

  it('throws 502 EMAIL_SEND_FAILED on Resend error', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(template);
    mockResendSend.mockResolvedValue({ data: null, error: { message: 'API limit reached' } });

    await expect(
      notificationsService.sendTestEmail(null, 'tpl_1', {
        to:        'x@x.com',
        variables: { customerName: 'X' },
      }),
    ).rejects.toMatchObject({ statusCode: 502, code: 'EMAIL_SEND_FAILED' });
  });

  it('can test-send an inactive template (no isActive guard in sendTestEmail)', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce({ ...template, isActive: false });
    mockResendSend.mockResolvedValue({ data: { id: 'r3' }, error: null });

    const result = await notificationsService.sendTestEmail(null, 'tpl_1', {
      to:        'dev@studio.com',
      variables: { customerName: 'Dev' },
    });

    expect(result.to).toBe('dev@studio.com');
    expect(mockResendSend).toHaveBeenCalledTimes(1);
  });

  it('does not HTML-escape special characters in the rendered subject line', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce({
      ...template,
      subject:  'Test booking for {{name}}',
      htmlBody: '<p>Dear {{name}},</p>',
    });
    mockResendSend.mockResolvedValue({ data: { id: 'r4' }, error: null });

    const result = await notificationsService.sendTestEmail(null, 'tpl_1', {
      to:        'test@example.com',
      variables: { name: "Smith & O'Brien" },
    });

    // Subject is plain text — raw characters must appear, not HTML entities
    expect(result.subject).toBe("Test booking for Smith & O'Brien");
    expect(result.subject).not.toContain('&amp;');
    expect(result.subject).not.toContain('&#x27;');
  });

  it('throws 403 FORBIDDEN when template belongs to different tenant', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce({ ...template, tenantId: 'tenant_B' });

    await expect(
      notificationsService.sendTestEmail('tenant_A', 'tpl_1', {
        to:        'admin@studio.com',
        variables: { customerName: 'X' },
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN (null tenantId) can test-send any template', async () => {
    mockTemplateFindUnique.mockResolvedValueOnce(template);
    mockResendSend.mockResolvedValue({ data: { id: 'r5' }, error: null });

    const result = await notificationsService.sendTestEmail(null, 'tpl_1', {
      to:        'super@admin.com',
      variables: { customerName: 'Super' },
    });

    expect(result.templateId).toBe('tpl_1');
    expect(mockResendSend).toHaveBeenCalledTimes(1);
  });
});
