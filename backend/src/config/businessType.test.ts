/**
 * Unit tests for src/config/businessType.ts
 *
 * Validates:
 *  - All 6 business types return complete, non-empty label maps
 *  - Specific label spot-checks for each type
 *  - Feature flag defaults are complete (every key present) for each type
 *  - Service catalogue templates are non-empty for each type
 *  - isBusinessType() type guard
 *  - getLabels() / getDefaultFlags() / getServiceTemplate() helpers
 *  - FEATURE_FLAG_KEYS completeness (every key appears in every type's defaults)
 */

// ─── Force test BUSINESS_TYPE so module-level validation passes ───────────────
process.env['BUSINESS_TYPE'] = 'tattoo_studio';
process.env['NODE_ENV'] = 'test';

import {
  BUSINESS_TYPES,
  LABEL_KEYS,
  FEATURE_FLAG_KEYS,
  businessLabels,
  defaultFeatureFlags,
  getLabels,
  getDefaultFlags,
  getServiceTemplate,
  isBusinessType,
} from './businessType';

// ─── isBusinessType ───────────────────────────────────────────────────────────

describe('isBusinessType', () => {
  it('returns true for all valid types', () => {
    for (const t of BUSINESS_TYPES) {
      expect(isBusinessType(t)).toBe(true);
    }
  });

  it('returns false for unknown strings', () => {
    expect(isBusinessType('gym')).toBe(false);
    expect(isBusinessType('')).toBe(false);
    expect(isBusinessType(null)).toBe(false);
    expect(isBusinessType(42)).toBe(false);
  });
});

// ─── businessLabels — completeness ───────────────────────────────────────────

describe('businessLabels', () => {
  it('contains an entry for every supported business type', () => {
    for (const type of BUSINESS_TYPES) {
      expect(businessLabels).toHaveProperty(type);
    }
  });

  it('every type has every label key defined and non-empty', () => {
    for (const type of BUSINESS_TYPES) {
      for (const key of LABEL_KEYS) {
        const value = businessLabels[type][key];
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── businessLabels — spot checks per type ────────────────────────────────────

describe('businessLabels spot checks', () => {
  it('tattoo_studio has correct key labels', () => {
    const l = getLabels('tattoo_studio');
    expect(l.artists).toBe('Artists');
    expect(l.styles).toBe('Tattoo Styles');
    expect(l.portfolio).toBe('Portfolio');
    expect(l.quote).toBe('Quote');
    expect(l.mannequin).toBe('Body Placement');
    expect(l.booking).toBe('Booking');
    expect(l.services).toBe('Services');
    expect(l.client).toBe('Client');
    expect(l.deposit).toBe('Deposit');
  });

  it('hair_salon has correct key labels', () => {
    const l = getLabels('hair_salon');
    expect(l.artists).toBe('Stylists');
    expect(l.styles).toBe('Hair Styles');
    expect(l.portfolio).toBe('Gallery');
    expect(l.quote).toBe('Estimate');
    expect(l.mannequin).toBe('N/A');
    expect(l.services).toBe('Treatments');
    expect(l.appointment).toBe('Appointment');
  });

  it('barber has correct key labels', () => {
    const l = getLabels('barber');
    expect(l.artists).toBe('Barbers');
    expect(l.styles).toBe('Cuts & Styles');
    expect(l.mannequin).toBe('N/A');
    expect(l.services).toBe('Services');
    expect(l.review).toBe('Rate your cut');
  });

  it('nail_salon has correct key labels', () => {
    const l = getLabels('nail_salon');
    expect(l.artists).toBe('Nail Artists');
    expect(l.styles).toBe('Nail Styles');
    expect(l.mannequin).toBe('N/A');
    expect(l.services).toBe('Nail Services');
    expect(l.appointment).toBe('Appointment');
  });

  it('masseuse has correct key labels', () => {
    const l = getLabels('masseuse');
    expect(l.artists).toBe('Therapists');
    expect(l.styles).toBe('Massage Types');
    expect(l.booking).toBe('Session');
    expect(l.appointment).toBe('Session');
    expect(l.deposit).toBe('Prepayment');
    expect(l.services).toBe('Treatments');
  });

  it('restaurant has correct key labels', () => {
    const l = getLabels('restaurant');
    expect(l.artists).toBe('Staff');
    expect(l.styles).toBe('Menu');
    expect(l.quote).toBe('N/A');
    expect(l.mannequin).toBe('N/A');
    expect(l.booking).toBe('Reservation');
    expect(l.client).toBe('Guest');
    expect(l.clients).toBe('Guests');
    expect(l.appointment).toBe('Reservation');
    expect(l.serviceCategory).toBe('Menu Section');
    expect(l.service).toBe('Dish');
  });
});

// ─── defaultFeatureFlags — completeness ──────────────────────────────────────

describe('defaultFeatureFlags', () => {
  it('contains an entry for every supported business type', () => {
    for (const type of BUSINESS_TYPES) {
      expect(defaultFeatureFlags).toHaveProperty(type);
    }
  });

  it('every type has every feature flag key defined as a boolean', () => {
    for (const type of BUSINESS_TYPES) {
      for (const flag of FEATURE_FLAG_KEYS) {
        const value = defaultFeatureFlags[type][flag];
        expect(typeof value).toBe('boolean');
      }
    }
  });
});

// ─── defaultFeatureFlags — business-logic checks ─────────────────────────────

describe('defaultFeatureFlags business logic', () => {
  it('tattoo_studio has QUOTE_SYSTEM_ENABLED and MANNEQUIN_ENABLED = true', () => {
    const flags = getDefaultFlags('tattoo_studio');
    expect(flags.QUOTE_SYSTEM_ENABLED).toBe(true);
    expect(flags.MANNEQUIN_ENABLED).toBe(true);
  });

  it('non-tattoo types have MANNEQUIN_ENABLED = false', () => {
    for (const type of BUSINESS_TYPES) {
      if (type === 'tattoo_studio') continue;
      expect(getDefaultFlags(type).MANNEQUIN_ENABLED).toBe(false);
    }
  });

  it('restaurant has TABLE_SELECTION_ENABLED and PARTY_SIZE_ENABLED = true', () => {
    const flags = getDefaultFlags('restaurant');
    expect(flags.TABLE_SELECTION_ENABLED).toBe(true);
    expect(flags.PARTY_SIZE_ENABLED).toBe(true);
  });

  it('non-restaurant types have TABLE_SELECTION_ENABLED = false', () => {
    for (const type of BUSINESS_TYPES) {
      if (type === 'restaurant') continue;
      expect(getDefaultFlags(type).TABLE_SELECTION_ENABLED).toBe(false);
    }
  });

  it('SERVICE_MENU_ENABLED = true for barber, hair_salon, nail_salon, masseuse, restaurant', () => {
    const serviceMenuTypes = ['barber', 'hair_salon', 'nail_salon', 'masseuse', 'restaurant'] as const;
    for (const t of serviceMenuTypes) {
      expect(getDefaultFlags(t).SERVICE_MENU_ENABLED).toBe(true);
    }
  });

  it('all types have BOOKING_ENABLED = true by default', () => {
    for (const type of BUSINESS_TYPES) {
      expect(getDefaultFlags(type).BOOKING_ENABLED).toBe(true);
    }
  });

  it('all types have EMAIL_REMINDERS_ENABLED = true by default', () => {
    for (const type of BUSINESS_TYPES) {
      expect(getDefaultFlags(type).EMAIL_REMINDERS_ENABLED).toBe(true);
    }
  });

  it('all types have REVIEW_REQUEST_ENABLED = true by default', () => {
    for (const type of BUSINESS_TYPES) {
      expect(getDefaultFlags(type).REVIEW_REQUEST_ENABLED).toBe(true);
    }
  });
});

// ─── serviceCatalogTemplates ──────────────────────────────────────────────────

describe('serviceCatalogTemplates', () => {
  it('every business type has a non-empty catalogue', () => {
    for (const type of BUSINESS_TYPES) {
      const template = getServiceTemplate(type);
      expect(template.length).toBeGreaterThan(0);
    }
  });

  it('every category has at least one service', () => {
    for (const type of BUSINESS_TYPES) {
      for (const category of getServiceTemplate(type)) {
        expect(category.services.length).toBeGreaterThan(0);
        expect(category.name).toBeTruthy();
      }
    }
  });

  it('every service has a name, durationMinutes ≥ 5, and isActive=true', () => {
    for (const type of BUSINESS_TYPES) {
      for (const category of getServiceTemplate(type)) {
        for (const service of category.services) {
          expect(service.name.length).toBeGreaterThan(0);
          expect(service.durationMinutes).toBeGreaterThanOrEqual(5);
          expect(service.isActive).toBe(true);
        }
      }
    }
  });

  it('tattoo_studio catalogue includes Custom Tattoo and Flash Tattoo categories', () => {
    const categories = getServiceTemplate('tattoo_studio').map((c) => c.name);
    expect(categories).toContain('Custom Tattoo');
    expect(categories).toContain('Flash Tattoo');
  });

  it('barber catalogue includes Haircut, Beard, and Combo Deals categories', () => {
    const categories = getServiceTemplate('barber').map((c) => c.name);
    expect(categories).toContain('Haircut');
    expect(categories).toContain('Beard');
    expect(categories).toContain('Combo Deals');
  });

  it('nail_salon catalogue includes Manicure, Pedicure, Nail Art and Extensions', () => {
    const categories = getServiceTemplate('nail_salon').map((c) => c.name);
    expect(categories).toContain('Manicure');
    expect(categories).toContain('Pedicure');
    expect(categories).toContain('Nail Art');
    expect(categories).toContain('Extensions');
  });

  it('masseuse catalogue includes Relaxation, Therapeutic, and Specialist', () => {
    const categories = getServiceTemplate('masseuse').map((c) => c.name);
    expect(categories).toContain('Relaxation');
    expect(categories).toContain('Therapeutic');
    expect(categories).toContain('Specialist');
  });

  it('restaurant catalogue includes Table Reservations and Private Dining', () => {
    const categories = getServiceTemplate('restaurant').map((c) => c.name);
    expect(categories).toContain('Table Reservations');
    expect(categories).toContain('Private Dining');
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

describe('getLabels / getDefaultFlags / getServiceTemplate', () => {
  it('getLabels() with no args returns active type labels (tattoo_studio in test)', () => {
    const labels = getLabels();
    expect(labels.artists).toBe('Artists'); // tattoo_studio default
  });

  it('getLabels(type) returns correct labels for the given type', () => {
    expect(getLabels('restaurant').booking).toBe('Reservation');
    expect(getLabels('masseuse').booking).toBe('Session');
  });

  it('getDefaultFlags() with no args returns active type flags (tattoo_studio)', () => {
    const flags = getDefaultFlags();
    expect(flags.MANNEQUIN_ENABLED).toBe(true);
    expect(flags.TABLE_SELECTION_ENABLED).toBe(false);
  });

  it('getServiceTemplate() with no args returns active type catalogue', () => {
    const template = getServiceTemplate();
    expect(template.length).toBeGreaterThan(0);
  });
});
