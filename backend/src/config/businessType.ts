/**
 * Business Type Configuration — Step 1.4b
 *
 * Reads `BUSINESS_TYPE` from the environment and exports:
 *
 *   1. `BUSINESS_TYPES`         — exhaustive tuple of all valid type keys
 *   2. `BusinessType`           — TypeScript union derived from the tuple
 *   3. `LabelKey`               — every translatable UI string key
 *   4. `businessLabels`         — full label map { type → { key → string } }
 *   5. `getLabels(type?)`       — helper that returns labels for the active type
 *   6. `FeatureFlagKey`         — every feature flag key used in the system
 *   7. `defaultFeatureFlags`    — per-type on/off defaults used by the seed script
 *   8. `getDefaultFlags(type?)` — helper that returns flag defaults for the active type
 *   9. `ServiceCatalogTemplate` — default service categories + services for each type
 *  10. `getServiceTemplate(type?)` — helper that returns the catalog template
 *
 * Validated at import time — process exits with a descriptive error if
 * BUSINESS_TYPE is missing or not one of the supported values.
 *
 * ─── Supported types ─────────────────────────────────────────────────────────
 *   tattoo_studio | hair_salon | barber | nail_salon | masseuse | restaurant
 *
 * ─── All UI label keys ───────────────────────────────────────────────────────
 *   artists, artist, styles, style, portfolio, quote, mannequin,
 *   booking, services, service, serviceCategory, client, clients,
 *   deposit, appointment, review
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export const BUSINESS_TYPES = [
  'tattoo_studio',
  'hair_salon',
  'barber',
  'nail_salon',
  'masseuse',
  'restaurant',
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

/**
 * Every translatable UI string key used across routes, email templates,
 * CRM views, and the customer-facing frontend.
 *
 * Add a new key here and TypeScript will require you to fill every
 * business type in the label map below.
 */
export const LABEL_KEYS = [
  'artists',         // plural staff noun  — "Artists" / "Stylists" / "Barbers"
  'artist',          // singular           — "Artist" / "Stylist" / "Barber"
  'styles',          // plural service cat — "Tattoo Styles" / "Hair Styles" / "Menu"
  'style',           // singular           — "Tattoo Style" / "Hair Style"
  'portfolio',       // gallery label      — "Portfolio" / "Gallery"
  'quote',           // price quote label  — "Quote" / "Estimate" / "N/A"
  'mannequin',       // body map label     — "Body Placement" / "N/A"
  'booking',         // booking noun       — "Booking" / "Appointment" / "Reservation"
  'services',        // service menu plural — "Services" / "Treatments" / "Menu"
  'service',         // singular service   — "Service" / "Treatment" / "Item"
  'serviceCategory', // category noun      — "Category" / "Section"
  'client',          // singular customer  — "Client" / "Guest"
  'clients',         // plural             — "Clients" / "Guests"
  'deposit',         // payment advance    — "Deposit" / "Prepayment"
  'appointment',     // calendar entry     — "Appointment" / "Reservation" / "Session"
  'review',          // post-service ask   — "Leave a review" / "Rate your experience"
] as const;

export type LabelKey = (typeof LABEL_KEYS)[number];

/** Full label map for a business type. */
export type LabelMap = Record<LabelKey, string>;

/** Full label map for all supported business types. */
export type BusinessLabelMap = Record<BusinessType, LabelMap>;

// ─── Label definitions ────────────────────────────────────────────────────────

/**
 * Every label for every business type.
 *
 * "N/A" means the concept does not apply to that business type and should
 * be hidden in the UI / excluded from email templates.
 */
export const businessLabels: BusinessLabelMap = {
  tattoo_studio: {
    artists:         'Artists',
    artist:          'Artist',
    styles:          'Tattoo Styles',
    style:           'Tattoo Style',
    portfolio:       'Portfolio',
    quote:           'Quote',
    mannequin:       'Body Placement',
    booking:         'Booking',
    services:        'Services',
    service:         'Service',
    serviceCategory: 'Category',
    client:          'Client',
    clients:         'Clients',
    deposit:         'Deposit',
    appointment:     'Appointment',
    review:          'Leave a review for your artist',
  },

  hair_salon: {
    artists:         'Stylists',
    artist:          'Stylist',
    styles:          'Hair Styles',
    style:           'Hair Style',
    portfolio:       'Gallery',
    quote:           'Estimate',
    mannequin:       'N/A',
    booking:         'Appointment',
    services:        'Treatments',
    service:         'Treatment',
    serviceCategory: 'Category',
    client:          'Client',
    clients:         'Clients',
    deposit:         'Deposit',
    appointment:     'Appointment',
    review:          'Rate your experience',
  },

  barber: {
    artists:         'Barbers',
    artist:          'Barber',
    styles:          'Cuts & Styles',
    style:           'Cut / Style',
    portfolio:       'Gallery',
    quote:           'Estimate',
    mannequin:       'N/A',
    booking:         'Appointment',
    services:        'Services',
    service:         'Service',
    serviceCategory: 'Category',
    client:          'Client',
    clients:         'Clients',
    deposit:         'Deposit',
    appointment:     'Appointment',
    review:          'Rate your cut',
  },

  nail_salon: {
    artists:         'Nail Artists',
    artist:          'Nail Artist',
    styles:          'Nail Styles',
    style:           'Nail Style',
    portfolio:       'Gallery',
    quote:           'Estimate',
    mannequin:       'N/A',
    booking:         'Appointment',
    services:        'Nail Services',
    service:         'Nail Service',
    serviceCategory: 'Category',
    client:          'Client',
    clients:         'Clients',
    deposit:         'Deposit',
    appointment:     'Appointment',
    review:          'Rate your nails',
  },

  masseuse: {
    artists:         'Therapists',
    artist:          'Therapist',
    styles:          'Massage Types',
    style:           'Massage Type',
    portfolio:       'Gallery',
    quote:           'Estimate',
    mannequin:       'N/A',
    booking:         'Session',
    services:        'Treatments',
    service:         'Treatment',
    serviceCategory: 'Category',
    client:          'Client',
    clients:         'Clients',
    deposit:         'Prepayment',
    appointment:     'Session',
    review:          'Rate your session',
  },

  restaurant: {
    artists:         'Staff',
    artist:          'Staff Member',
    styles:          'Menu',
    style:           'Menu Item',
    portfolio:       'Photo Gallery',
    quote:           'N/A',
    mannequin:       'N/A',
    booking:         'Reservation',
    services:        'Menu',
    service:         'Dish',
    serviceCategory: 'Menu Section',
    client:          'Guest',
    clients:         'Guests',
    deposit:         'Prepayment',
    appointment:     'Reservation',
    review:          'Rate your dining experience',
  },
};

// ─── Feature flags ────────────────────────────────────────────────────────────

/**
 * Every feature flag key in the system.
 *
 * These keys match the `key` field of the `FeatureFlag` database model (Step 1.2).
 * The seed script uses `getDefaultFlags()` to know which flags to create
 * and whether they should be ON or OFF at first deployment.
 *
 * All flags can be toggled in the CRM without a redeploy.
 */
export const FEATURE_FLAG_KEYS = [
  // ── Core booking & calendar ─────────────────────────────────────────────
  'BOOKING_ENABLED',            // master switch — disables all bookings when OFF
  'CALENDAR_ENABLED',           // Google Calendar sync for confirmed bookings
  'ICS_DOWNLOAD_ENABLED',       // allow customer to download .ics file
  'DEPOSIT_REQUIRED',           // force deposit collection before confirming
  'DEPOSIT_PARTIAL_ENABLED',    // allow configurable % deposit (vs fixed amount)

  // ── Lead & quote flow ───────────────────────────────────────────────────
  'LEAD_CAPTURE_ENABLED',       // public inquiry form (tattoo / salons / barber)
  'QUOTE_SYSTEM_ENABLED',       // artist sends price quote before booking
  'INSTANT_BOOKING_ENABLED',    // skip lead form — customer books directly

  // ── Body placement (tattoo only) ─────────────────────────────────────────
  'MANNEQUIN_ENABLED',          // 3D body placement map on inquiry form
  'REFERENCE_IMAGES_ENABLED',   // customer can upload reference photos

  // ── Service catalogue ────────────────────────────────────────────────────
  'SERVICE_MENU_ENABLED',       // show typed service categories & prices
  'PRICE_LIST_VISIBLE',         // display prices publicly vs "from" only

  // ── Table & restaurant specifics ─────────────────────────────────────────
  'TABLE_SELECTION_ENABLED',    // visual table map for restaurant
  'PARTY_SIZE_ENABLED',         // ask for party size during reservation
  'SPECIAL_REQUESTS_ENABLED',   // free-text special requests on reservation

  // ── Portfolio & gallery ──────────────────────────────────────────────────
  'PORTFOLIO_ENABLED',          // artist / stylist portfolio visible on site
  'GALLERY_UPLOAD_ENABLED',     // staff can upload gallery images via CRM

  // ── Communication & automation ───────────────────────────────────────────
  'EMAIL_REMINDERS_ENABLED',    // automated email reminder before appointment
  'SMS_REMINDERS_ENABLED',      // SMS reminder (Twilio)
  'WHATSAPP_CONTACT_ENABLED',   // WhatsApp message automation (Twilio)
  'REVIEW_REQUEST_ENABLED',     // post-appointment review request email/WA

  // ── Analytics & leads ────────────────────────────────────────────────────
  'ANALYTICS_ENABLED',          // first-party AnalyticsEvent tracking
  'LEAD_SCORING_ENABLED',       // AI/rule-based lead score visible in CRM

  // ── Payments ─────────────────────────────────────────────────────────────
  'ONLINE_PAYMENT_ENABLED',     // Stripe payment collection (deposit or full)
  'CANCELLATION_FEE_ENABLED',   // enforce cancellation fee per policy
  'GIFT_VOUCHER_ENABLED',       // sell/redeem gift vouchers

  // ── Retention & automation ────────────────────────────────────────────────
  'WAITING_LIST_ENABLED',       // waitlist when artist / slot fully booked
  'RECURRING_BOOKING_ENABLED',  // allow recurring / subscription bookings
  'REBOOK_REMINDER_ENABLED',    // automated rebook reminder after service
  'LOYALTY_ENABLED',            // loyalty points accumulation and redemption

  // ── Compliance & forms ────────────────────────────────────────────────────
  'FORMS_ENABLED',              // intake / consent forms (hair, tattoo, massage)
  'GDPR_ENABLED',               // GDPR consent capture on booking / registration

  // ── Tips & restaurant-specific ────────────────────────────────────────────
  'TIP_COLLECTION_ENABLED',     // optional tip/gratuity on checkout
  'COVERS_MANAGEMENT_ENABLED',  // max covers per time-slot pacing (restaurant)

  // ── Reporting ────────────────────────────────────────────────────────────
  'DAILY_REPORT_ENABLED',       // automated daily/weekly summary email to owner
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

/** On/off defaults for every flag, per business type. */
export type FeatureFlagDefaults = Record<FeatureFlagKey, boolean>;

export type BusinessFeatureFlagMap = Record<BusinessType, FeatureFlagDefaults>;

/**
 * Default feature flag state for each business type.
 *
 * These are applied when the seed script runs for the first time.
 * Studio owners can toggle any flag in the CRM at any time.
 */
export const defaultFeatureFlags: BusinessFeatureFlagMap = {
  tattoo_studio: {
    BOOKING_ENABLED:            true,
    CALENDAR_ENABLED:           true,
    ICS_DOWNLOAD_ENABLED:       true,
    DEPOSIT_REQUIRED:           false,
    DEPOSIT_PARTIAL_ENABLED:    true,
    LEAD_CAPTURE_ENABLED:       true,
    QUOTE_SYSTEM_ENABLED:       true,
    INSTANT_BOOKING_ENABLED:    false,
    MANNEQUIN_ENABLED:          true,
    REFERENCE_IMAGES_ENABLED:   true,
    SERVICE_MENU_ENABLED:       false,
    PRICE_LIST_VISIBLE:         false,
    TABLE_SELECTION_ENABLED:    false,
    PARTY_SIZE_ENABLED:         false,
    SPECIAL_REQUESTS_ENABLED:   true,
    PORTFOLIO_ENABLED:          true,
    GALLERY_UPLOAD_ENABLED:     true,
    EMAIL_REMINDERS_ENABLED:    true,
    SMS_REMINDERS_ENABLED:      false,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       true,
    ONLINE_PAYMENT_ENABLED:     false,
    CANCELLATION_FEE_ENABLED:   false,
    GIFT_VOUCHER_ENABLED:       false,
    WAITING_LIST_ENABLED:       false,
    RECURRING_BOOKING_ENABLED:  false,
    REBOOK_REMINDER_ENABLED:    false,
    LOYALTY_ENABLED:            false,
    FORMS_ENABLED:              true,
    GDPR_ENABLED:               true,
    TIP_COLLECTION_ENABLED:     false,
    COVERS_MANAGEMENT_ENABLED:  false,
    DAILY_REPORT_ENABLED:       false,
  },

  hair_salon: {
    BOOKING_ENABLED:            true,
    CALENDAR_ENABLED:           true,
    ICS_DOWNLOAD_ENABLED:       true,
    DEPOSIT_REQUIRED:           false,
    DEPOSIT_PARTIAL_ENABLED:    true,
    LEAD_CAPTURE_ENABLED:       true,
    QUOTE_SYSTEM_ENABLED:       false,
    INSTANT_BOOKING_ENABLED:    true,
    MANNEQUIN_ENABLED:          false,
    REFERENCE_IMAGES_ENABLED:   true,
    SERVICE_MENU_ENABLED:       true,
    PRICE_LIST_VISIBLE:         true,
    TABLE_SELECTION_ENABLED:    false,
    PARTY_SIZE_ENABLED:         false,
    SPECIAL_REQUESTS_ENABLED:   true,
    PORTFOLIO_ENABLED:          true,
    GALLERY_UPLOAD_ENABLED:     true,
    EMAIL_REMINDERS_ENABLED:    true,
    SMS_REMINDERS_ENABLED:      false,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       false,
    ONLINE_PAYMENT_ENABLED:     false,
    CANCELLATION_FEE_ENABLED:   false,
    GIFT_VOUCHER_ENABLED:       false,
    WAITING_LIST_ENABLED:       true,
    RECURRING_BOOKING_ENABLED:  true,
    REBOOK_REMINDER_ENABLED:    true,
    LOYALTY_ENABLED:            false,
    FORMS_ENABLED:              false,
    GDPR_ENABLED:               true,
    TIP_COLLECTION_ENABLED:     false,
    COVERS_MANAGEMENT_ENABLED:  false,
    DAILY_REPORT_ENABLED:       false,
  },

  barber: {
    BOOKING_ENABLED:            true,
    CALENDAR_ENABLED:           true,
    ICS_DOWNLOAD_ENABLED:       true,
    DEPOSIT_REQUIRED:           false,
    DEPOSIT_PARTIAL_ENABLED:    false,
    LEAD_CAPTURE_ENABLED:       true,
    QUOTE_SYSTEM_ENABLED:       false,
    INSTANT_BOOKING_ENABLED:    true,
    MANNEQUIN_ENABLED:          false,
    REFERENCE_IMAGES_ENABLED:   false,
    SERVICE_MENU_ENABLED:       true,
    PRICE_LIST_VISIBLE:         true,
    TABLE_SELECTION_ENABLED:    false,
    PARTY_SIZE_ENABLED:         false,
    SPECIAL_REQUESTS_ENABLED:   true,
    PORTFOLIO_ENABLED:          true,
    GALLERY_UPLOAD_ENABLED:     true,
    EMAIL_REMINDERS_ENABLED:    true,
    SMS_REMINDERS_ENABLED:      false,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       false,
    ONLINE_PAYMENT_ENABLED:     false,
    CANCELLATION_FEE_ENABLED:   false,
    GIFT_VOUCHER_ENABLED:       false,
    WAITING_LIST_ENABLED:       true,
    RECURRING_BOOKING_ENABLED:  true,
    REBOOK_REMINDER_ENABLED:    true,
    LOYALTY_ENABLED:            false,
    FORMS_ENABLED:              false,
    GDPR_ENABLED:               true,
    TIP_COLLECTION_ENABLED:     false,
    COVERS_MANAGEMENT_ENABLED:  false,
    DAILY_REPORT_ENABLED:       false,
  },

  nail_salon: {
    BOOKING_ENABLED:            true,
    CALENDAR_ENABLED:           true,
    ICS_DOWNLOAD_ENABLED:       true,
    DEPOSIT_REQUIRED:           false,
    DEPOSIT_PARTIAL_ENABLED:    true,
    LEAD_CAPTURE_ENABLED:       true,
    QUOTE_SYSTEM_ENABLED:       false,
    INSTANT_BOOKING_ENABLED:    true,
    MANNEQUIN_ENABLED:          false,
    REFERENCE_IMAGES_ENABLED:   true,
    SERVICE_MENU_ENABLED:       true,
    PRICE_LIST_VISIBLE:         true,
    TABLE_SELECTION_ENABLED:    false,
    PARTY_SIZE_ENABLED:         false,
    SPECIAL_REQUESTS_ENABLED:   true,
    PORTFOLIO_ENABLED:          true,
    GALLERY_UPLOAD_ENABLED:     true,
    EMAIL_REMINDERS_ENABLED:    true,
    SMS_REMINDERS_ENABLED:      false,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       false,
    ONLINE_PAYMENT_ENABLED:     false,
    CANCELLATION_FEE_ENABLED:   false,
    GIFT_VOUCHER_ENABLED:       false,
    WAITING_LIST_ENABLED:       true,
    RECURRING_BOOKING_ENABLED:  true,
    REBOOK_REMINDER_ENABLED:    true,
    LOYALTY_ENABLED:            false,
    FORMS_ENABLED:              false,
    GDPR_ENABLED:               true,
    TIP_COLLECTION_ENABLED:     false,
    COVERS_MANAGEMENT_ENABLED:  false,
    DAILY_REPORT_ENABLED:       false,
  },

  masseuse: {
    BOOKING_ENABLED:            true,
    CALENDAR_ENABLED:           true,
    ICS_DOWNLOAD_ENABLED:       true,
    DEPOSIT_REQUIRED:           false,
    DEPOSIT_PARTIAL_ENABLED:    true,
    LEAD_CAPTURE_ENABLED:       true,
    QUOTE_SYSTEM_ENABLED:       false,
    INSTANT_BOOKING_ENABLED:    true,
    MANNEQUIN_ENABLED:          false,
    REFERENCE_IMAGES_ENABLED:   false,
    SERVICE_MENU_ENABLED:       true,
    PRICE_LIST_VISIBLE:         true,
    TABLE_SELECTION_ENABLED:    false,
    PARTY_SIZE_ENABLED:         false,
    SPECIAL_REQUESTS_ENABLED:   true,
    PORTFOLIO_ENABLED:          true,
    GALLERY_UPLOAD_ENABLED:     false,
    EMAIL_REMINDERS_ENABLED:    true,
    SMS_REMINDERS_ENABLED:      false,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       false,
    ONLINE_PAYMENT_ENABLED:     false,
    CANCELLATION_FEE_ENABLED:   false,
    GIFT_VOUCHER_ENABLED:       false,
    WAITING_LIST_ENABLED:       false,
    RECURRING_BOOKING_ENABLED:  true,
    REBOOK_REMINDER_ENABLED:    true,
    LOYALTY_ENABLED:            false,
    FORMS_ENABLED:              true,
    GDPR_ENABLED:               true,
    TIP_COLLECTION_ENABLED:     false,
    COVERS_MANAGEMENT_ENABLED:  false,
    DAILY_REPORT_ENABLED:       false,
  },

  restaurant: {
    BOOKING_ENABLED:            true,
    CALENDAR_ENABLED:           false,
    ICS_DOWNLOAD_ENABLED:       true,
    DEPOSIT_REQUIRED:           false,
    DEPOSIT_PARTIAL_ENABLED:    true,
    LEAD_CAPTURE_ENABLED:       false,
    QUOTE_SYSTEM_ENABLED:       false,
    INSTANT_BOOKING_ENABLED:    true,
    MANNEQUIN_ENABLED:          false,
    REFERENCE_IMAGES_ENABLED:   false,
    SERVICE_MENU_ENABLED:       true,
    PRICE_LIST_VISIBLE:         true,
    TABLE_SELECTION_ENABLED:    true,
    PARTY_SIZE_ENABLED:         true,
    SPECIAL_REQUESTS_ENABLED:   true,
    PORTFOLIO_ENABLED:          true,
    GALLERY_UPLOAD_ENABLED:     true,
    EMAIL_REMINDERS_ENABLED:    true,
    SMS_REMINDERS_ENABLED:      false,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       false,
    ONLINE_PAYMENT_ENABLED:     false,
    CANCELLATION_FEE_ENABLED:   false,
    GIFT_VOUCHER_ENABLED:       false,
    WAITING_LIST_ENABLED:       true,
    RECURRING_BOOKING_ENABLED:  false,
    REBOOK_REMINDER_ENABLED:    false,
    LOYALTY_ENABLED:            false,
    FORMS_ENABLED:              false,
    GDPR_ENABLED:               true,
    TIP_COLLECTION_ENABLED:     true,
    COVERS_MANAGEMENT_ENABLED:  true,
    DAILY_REPORT_ENABLED:       false,
  },
};

// ─── Service catalogue templates ──────────────────────────────────────────────

/**
 * A service within a catalogue category.
 *
 * `durationMinutes` and `priceFrom` are starter values; the studio owner
 * edits them in the CRM.  `priceFrom: null` = price on request.
 */
export interface ServiceTemplate {
  name: string;
  description: string;
  durationMinutes: number;
  priceFrom: number | null;  // null = contact for price
  isActive: boolean;
}

/** A grouping of related services. */
export interface ServiceCategoryTemplate {
  name: string;
  description: string;
  services: ServiceTemplate[];
}

/** Full service catalogue template for one business type. */
export type ServiceCatalogTemplate = ServiceCategoryTemplate[];

export type BusinessServiceCatalogMap = Record<BusinessType, ServiceCatalogTemplate>;

/**
 * Default service catalogue templates.
 *
 * These are SEED DATA — they give a new studio a sensible starting point.
 * Every service, price, and duration is fully editable in the CRM.
 * Services can be added, removed, or disabled at any time.
 *
 * `priceFrom: null` means "price on request / custom quote".
 */
export const serviceCatalogTemplates: BusinessServiceCatalogMap = {
  tattoo_studio: [
    {
      name: 'Custom Tattoo',
      description: 'Fully custom hand-drawn designs',
      services: [
        { name: 'Small (up to 3")', description: 'Palm-sized piece', durationMinutes: 90, priceFrom: null, isActive: true },
        { name: 'Medium (3"–6")', description: 'Forearm / calf size', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Large (6"+)', description: 'Half sleeve or larger', durationMinutes: 360, priceFrom: null, isActive: true },
        { name: 'Full Sleeve', description: 'Full arm or leg sleeve', durationMinutes: 480, priceFrom: null, isActive: true },
        { name: 'Full Back', description: 'Back piece', durationMinutes: 480, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Flash Tattoo',
      description: 'Pre-designed ready-to-book pieces',
      services: [
        { name: 'Flash Small', description: 'Pre-designed small flash', durationMinutes: 60, priceFrom: 80, isActive: true },
        { name: 'Flash Medium', description: 'Pre-designed medium flash', durationMinutes: 120, priceFrom: 150, isActive: true },
      ],
    },
    {
      name: 'Touch Up',
      description: 'Colour or line refreshing on existing tattoos',
      services: [
        { name: 'Touch Up', description: 'Refresh existing lines / colour', durationMinutes: 60, priceFrom: 60, isActive: true },
      ],
    },
  ],

  hair_salon: [
    {
      name: 'Cut & Finish',
      description: 'Haircuts and styling',
      services: [
        { name: 'Women\'s Cut & Blowdry', description: '', durationMinutes: 60, priceFrom: 45, isActive: true },
        { name: 'Men\'s Cut', description: '', durationMinutes: 30, priceFrom: 25, isActive: true },
        { name: 'Fringe Trim', description: '', durationMinutes: 15, priceFrom: 10, isActive: true },
        { name: 'Blowout / Blowdry', description: 'Style and blowdry only', durationMinutes: 45, priceFrom: 35, isActive: true },
        { name: 'Updo / Special Occasion', description: '', durationMinutes: 90, priceFrom: 75, isActive: true },
      ],
    },
    {
      name: 'Colour',
      description: 'Hair colour services',
      services: [
        { name: 'Full Colour', description: 'All-over single colour', durationMinutes: 90, priceFrom: 65, isActive: true },
        { name: 'Highlights (full head)', description: '', durationMinutes: 120, priceFrom: 90, isActive: true },
        { name: 'Highlights (half head)', description: '', durationMinutes: 90, priceFrom: 70, isActive: true },
        { name: 'Balayage', description: 'Freehand colour technique', durationMinutes: 150, priceFrom: 110, isActive: true },
        { name: 'Toner / Gloss', description: '', durationMinutes: 30, priceFrom: 30, isActive: true },
        { name: 'Colour Correction', description: 'Major colour repair', durationMinutes: 240, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Treatments',
      description: 'Conditioning and smoothing treatments',
      services: [
        { name: 'Keratin Treatment', description: 'Smoothing / frizz control', durationMinutes: 180, priceFrom: 150, isActive: true },
        { name: 'Deep Conditioning', description: '', durationMinutes: 30, priceFrom: 25, isActive: true },
        { name: 'Scalp Treatment', description: '', durationMinutes: 45, priceFrom: 35, isActive: true },
        { name: 'Brazilian Blowout', description: '', durationMinutes: 180, priceFrom: 175, isActive: true },
      ],
    },
  ],

  barber: [
    {
      name: 'Haircut',
      description: 'All haircut services',
      services: [
        { name: 'Clipper Cut', description: 'Machine all over', durationMinutes: 20, priceFrom: 15, isActive: true },
        { name: 'Scissors Cut', description: 'Scissor-only cut', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Fade', description: 'Graduated fade', durationMinutes: 25, priceFrom: 18, isActive: true },
        { name: 'Skin Fade', description: 'Zero / bald fade', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Taper', description: 'Classic tapered sides', durationMinutes: 25, priceFrom: 18, isActive: true },
        { name: 'Kids Cut (under 12)', description: '', durationMinutes: 20, priceFrom: 12, isActive: true },
      ],
    },
    {
      name: 'Beard',
      description: 'All beard grooming services',
      services: [
        { name: 'Beard Trim', description: 'Shape and tidy beard', durationMinutes: 15, priceFrom: 10, isActive: true },
        { name: 'Beard Shape Up', description: 'Define neckline and cheek line', durationMinutes: 20, priceFrom: 12, isActive: true },
        { name: 'Full Beard Groom', description: 'Wash, trim, shape, and condition', durationMinutes: 30, priceFrom: 18, isActive: true },
        { name: 'Clean Shave (cut-throat)', description: 'Traditional hot-towel shave', durationMinutes: 30, priceFrom: 22, isActive: true },
      ],
    },
    {
      name: 'Combo Deals',
      description: 'Haircut + beard combinations',
      services: [
        { name: 'Cut + Beard Trim', description: '', durationMinutes: 40, priceFrom: 23, isActive: true },
        { name: 'Cut + Full Beard Groom', description: '', durationMinutes: 50, priceFrom: 32, isActive: true },
        { name: 'Cut + Hot Towel Shave', description: '', durationMinutes: 50, priceFrom: 35, isActive: true },
      ],
    },
    {
      name: 'Extras',
      description: 'Add-on services',
      services: [
        { name: 'Eyebrow Trim', description: '', durationMinutes: 10, priceFrom: 5, isActive: true },
        { name: 'Line Up / Edge Up', description: 'Hair line-up only', durationMinutes: 15, priceFrom: 8, isActive: true },
        { name: 'Colour (Full)', description: 'All-over hair colour', durationMinutes: 60, priceFrom: 35, isActive: true },
      ],
    },
  ],

  nail_salon: [
    {
      name: 'Manicure',
      description: 'Hand and nail care services',
      services: [
        { name: 'Classic Manicure', description: 'Shape, buff, polish', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Gel Manicure', description: 'Long-lasting gel polish', durationMinutes: 45, priceFrom: 30, isActive: true },
        { name: 'Acrylic Full Set', description: 'Acrylic nail extensions', durationMinutes: 90, priceFrom: 45, isActive: true },
        { name: 'Acrylic Infill', description: 'Infill / rebalance', durationMinutes: 60, priceFrom: 30, isActive: true },
        { name: 'Gel Removal', description: '', durationMinutes: 20, priceFrom: 10, isActive: true },
        { name: 'BIAB (Builder in a Bottle)', description: 'Strengthening overlay', durationMinutes: 60, priceFrom: 35, isActive: true },
      ],
    },
    {
      name: 'Pedicure',
      description: 'Foot and toenail care services',
      services: [
        { name: 'Classic Pedicure', description: 'Soak, shape, polish', durationMinutes: 45, priceFrom: 28, isActive: true },
        { name: 'Gel Pedicure', description: 'Gel polish on toes', durationMinutes: 60, priceFrom: 38, isActive: true },
        { name: 'Luxury Pedicure', description: 'Extended treatment + massage', durationMinutes: 75, priceFrom: 50, isActive: true },
      ],
    },
    {
      name: 'Nail Art',
      description: 'Decorative nail designs',
      services: [
        { name: 'Nail Art (per nail)', description: 'Custom art on individual nails', durationMinutes: 5, priceFrom: 3, isActive: true },
        { name: 'French Tips', description: 'Classic French manicure finish', durationMinutes: 15, priceFrom: 8, isActive: true },
        { name: 'Ombre / Gradient', description: '', durationMinutes: 30, priceFrom: 15, isActive: true },
        { name: 'Chrome / Mirror Effect', description: '', durationMinutes: 20, priceFrom: 12, isActive: true },
        { name: 'Custom Design (full set)', description: 'Fully bespoke nail art', durationMinutes: 90, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Extensions',
      description: 'Nail extension services',
      services: [
        { name: 'Gel Extensions (full set)', description: '', durationMinutes: 90, priceFrom: 50, isActive: true },
        { name: 'Polygel Full Set', description: '', durationMinutes: 90, priceFrom: 55, isActive: true },
        { name: 'Extensions Infill', description: '', durationMinutes: 60, priceFrom: 35, isActive: true },
        { name: 'Extension Removal', description: '', durationMinutes: 30, priceFrom: 15, isActive: true },
      ],
    },
  ],

  masseuse: [
    {
      name: 'Relaxation',
      description: 'Stress-relief and general relaxation massages',
      services: [
        { name: 'Swedish Massage (30 min)', description: 'Light-medium pressure full body', durationMinutes: 30, priceFrom: 35, isActive: true },
        { name: 'Swedish Massage (60 min)', description: '', durationMinutes: 60, priceFrom: 60, isActive: true },
        { name: 'Swedish Massage (90 min)', description: '', durationMinutes: 90, priceFrom: 85, isActive: true },
        { name: 'Aromatherapy Massage (60 min)', description: 'Essential oils + Swedish technique', durationMinutes: 60, priceFrom: 65, isActive: true },
        { name: 'Hot Stone Massage (75 min)', description: 'Heated basalt stones + full body', durationMinutes: 75, priceFrom: 80, isActive: true },
      ],
    },
    {
      name: 'Therapeutic',
      description: 'Pain relief and deep tissue work',
      services: [
        { name: 'Deep Tissue (60 min)', description: 'Firm pressure, muscle release', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Deep Tissue (90 min)', description: '', durationMinutes: 90, priceFrom: 95, isActive: true },
        { name: 'Sports Massage (60 min)', description: 'Pre/post event + injury prevention', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Trigger Point Therapy (45 min)', description: '', durationMinutes: 45, priceFrom: 55, isActive: true },
        { name: 'Myofascial Release (60 min)', description: 'Connective tissue release', durationMinutes: 60, priceFrom: 75, isActive: true },
      ],
    },
    {
      name: 'Specialist',
      description: 'Targeted and specialist treatments',
      services: [
        { name: 'Pregnancy Massage (60 min)', description: 'Safe for all trimesters', durationMinutes: 60, priceFrom: 65, isActive: true },
        { name: 'Reflexology (45 min)', description: 'Foot pressure-point therapy', durationMinutes: 45, priceFrom: 50, isActive: true },
        { name: 'Indian Head Massage (30 min)', description: 'Head, neck and shoulder focus', durationMinutes: 30, priceFrom: 35, isActive: true },
        { name: 'Lymphatic Drainage (60 min)', description: 'Gentle detox technique', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Couples Massage (60 min)', description: 'Side-by-side massages', durationMinutes: 60, priceFrom: 120, isActive: true },
      ],
    },
  ],

  restaurant: [
    {
      name: 'Table Reservations',
      description: 'Standard dining reservation',
      services: [
        { name: 'Lunch Sitting', description: 'Standard lunch reservation', durationMinutes: 90, priceFrom: null, isActive: true },
        { name: 'Dinner Sitting', description: 'Standard dinner reservation', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Brunch', description: 'Weekend brunch', durationMinutes: 90, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Private Dining',
      description: 'Exclusive and large-group bookings',
      services: [
        { name: 'Private Dining Room', description: 'Exclusive use of private room', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Large Group (8+)', description: 'Group reservation — deposit required', durationMinutes: 150, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Special Occasions',
      description: 'Celebrations and events',
      services: [
        { name: 'Birthday Celebration', description: 'Cake + decoration add-on available', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Anniversary Dinner', description: 'Special menu or champagne add-on', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Business Lunch', description: '', durationMinutes: 90, priceFrom: null, isActive: true },
      ],
    },
  ],
};

// ─── Active business type ─────────────────────────────────────────────────────

/**
 * Returns true if the provided string is one of the supported business types.
 */
export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === 'string' && (BUSINESS_TYPES as readonly string[]).includes(value);
}

/**
 * The active business type, read from `BUSINESS_TYPE` env var.
 *
 * Validated at module-import time — process exits on invalid value.
 * Defaults to `tattoo_studio` in test mode so test suites don't
 * require a configured env var.
 */
const rawBusinessType =
  process.env['NODE_ENV'] === 'test' && !process.env['BUSINESS_TYPE']
    ? 'tattoo_studio'
    : process.env['BUSINESS_TYPE'];

if (!isBusinessType(rawBusinessType)) {
  console.error(
    `[BusinessType] Invalid or missing BUSINESS_TYPE: "${rawBusinessType ?? ''}"\n` +
      `  Must be one of: ${BUSINESS_TYPES.join(', ')}\n` +
      `  Set BUSINESS_TYPE in your .env file.`,
  );
  process.exit(1);
}

export const activeBusinessType: BusinessType = rawBusinessType;

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Returns the label map for the given business type (or the active type
 * if no argument is provided).
 *
 * @example
 *   const { artists, booking } = getLabels();  // active type
 *   const { artists } = getLabels('barber');   // explicit type
 */
export function getLabels(type: BusinessType = activeBusinessType): LabelMap {
  return businessLabels[type];
}

/**
 * Returns the feature flag defaults for the given business type (or the
 * active type if no argument is provided).
 *
 * Used by the database seed script to create initial FeatureFlag records.
 */
export function getDefaultFlags(type: BusinessType = activeBusinessType): FeatureFlagDefaults {
  return defaultFeatureFlags[type];
}

/**
 * Returns the service catalogue template for the given business type (or
 * the active type if no argument is provided).
 *
 * Used by the database seed script to pre-populate the service catalogue.
 */
export function getServiceTemplate(type: BusinessType = activeBusinessType): ServiceCatalogTemplate {
  return serviceCatalogTemplates[type];
}
