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

  // ── Retention & automation ────────────────────────────────────────────────
  'WAITING_LIST_ENABLED',       // waitlist when artist / slot fully booked
  'LOYALTY_ENABLED',            // loyalty points accumulation and redemption

  // ── Compliance & forms ────────────────────────────────────────────────────
  'GDPR_ENABLED',               // GDPR consent capture on booking / registration

  // ── Tips & restaurant-specific ────────────────────────────────────────────
  'COVERS_MANAGEMENT_ENABLED',  // max covers per time-slot pacing (restaurant)

  // ── Reporting ────────────────────────────────────────────────────────────
  'DAILY_REPORT_ENABLED',       // automated daily/weekly summary email to owner

  // ── Phase 1: Messaging foundation ──────────────────────────────────────
  'SMS_ENABLED',                    // SMS messaging channel (Twilio SMS)
  'BIRTHDAY_AUTOMATION_ENABLED',    // automated birthday messages
  'REBOOKING_NUDGES_ENABLED',       // automated rebook nudge after service
  'RECURRING_BOOKINGS_ENABLED',     // recurring / subscription bookings
  'CAMPAIGNS_ENABLED',              // bulk messaging campaigns

  // ── Phase 2: Booking Completeness ─────────────────────────────────────
  'PUBLIC_BOOKING_ENABLED',         // public booking widget (no auth, CAPTCHA)
  'SOCIAL_BOOKING_ENABLED',         // social media "Book Now" link generation
  'NO_SHOW_AUTOMATION_ENABLED',     // automated no-show detection and charging

  // ── Phase 3: Customer Profile & Safety ─────────────────────────────────
  'HEALTH_FLAGS_ENABLED',           // customer allergy/health flag management
  'INTAKE_FORMS_ENABLED',           // intake/consent forms before booking
  'BOOKING_PHOTOS_ENABLED',         // before/after photo uploads per booking
  'REFERRALS_ENABLED',              // customer referral tracking and rewards

  // ── Phase 4: Financial & POS ────────────────────────────────────────────
  'TIPS_ENABLED',                   // tip/gratuity collection at checkout
  'GIFT_CARDS_ENABLED',             // sell and redeem gift cards / vouchers
  'INVENTORY_ENABLED',              // product inventory management and stock alerts
  'POS_ENABLED',                    // point-of-sale walk-in checkout mode
  'STRIPE_TERMINAL_ENABLED',        // Stripe Terminal / card reader support
  'PAYROLL_ENABLED',                // staff payroll and commission tracking

  // ── Phase 5: Packages, Loyalty & Retention ──────────────────────────────
  'PACKAGES_ENABLED',               // service packages / bundles for customers
  'MEMBERSHIPS_ENABLED',            // recurring memberships with Stripe Subscriptions

  // ── Phase 6: Staff & HR ────────────────────────────────────────────────
  'ROTA_ENABLED',                   // staff rota / shift scheduling
  'STAFF_APP_ENABLED',              // staff mobile PWA push notifications + schedule

  // ── Phase 7: Calendar & Integration Expansion ─────────────────────────
  'OUTLOOK_CALENDAR_ENABLED',       // Microsoft Outlook / Exchange calendar sync
  'APPLE_CALENDAR_ENABLED',         // Apple iCloud CalDAV calendar sync

  // ── Phase 8: Advanced Intelligence ────────────────────────────────────
  'DYNAMIC_PRICING_ENABLED',        // surge / off-peak dynamic pricing rules
  'AI_SUGGESTIONS_ENABLED',         // AI-powered rebooking / upsell suggestions

  // ── Phase 9: Scale & Growth ────────────────────────────────────────────
  'MULTI_LOCATION_ENABLED',         // multi-location support — each artist/service/booking scoped to a location
  'GROUP_BOOKING_ENABLED',          // group / class bookings — session model with capacity management
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
    SMS_REMINDERS_ENABLED:      true,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       true,
    ONLINE_PAYMENT_ENABLED:     true,
    CANCELLATION_FEE_ENABLED:   false,
    WAITING_LIST_ENABLED:       false,
    LOYALTY_ENABLED:            true,
    GDPR_ENABLED:               true,
    COVERS_MANAGEMENT_ENABLED:  false,
    DAILY_REPORT_ENABLED:       false,
    SMS_ENABLED:                true,
    BIRTHDAY_AUTOMATION_ENABLED: true,
    REBOOKING_NUDGES_ENABLED:   true,
    RECURRING_BOOKINGS_ENABLED: true,
    CAMPAIGNS_ENABLED:          true,
    PUBLIC_BOOKING_ENABLED:     true,
    SOCIAL_BOOKING_ENABLED:     true,
    NO_SHOW_AUTOMATION_ENABLED: true,
    HEALTH_FLAGS_ENABLED:       true,
    INTAKE_FORMS_ENABLED:       true,
    BOOKING_PHOTOS_ENABLED:     true,
    REFERRALS_ENABLED:          true,
    TIPS_ENABLED:               true,
    GIFT_CARDS_ENABLED:         true,
    INVENTORY_ENABLED:          true,
    POS_ENABLED:                true,
    STRIPE_TERMINAL_ENABLED:    false,
    PAYROLL_ENABLED:            true,
    PACKAGES_ENABLED:           true,
    MEMBERSHIPS_ENABLED:        false,
    ROTA_ENABLED:               true,
    STAFF_APP_ENABLED:          true,
    OUTLOOK_CALENDAR_ENABLED:   false,
    APPLE_CALENDAR_ENABLED:     false,
    DYNAMIC_PRICING_ENABLED:    false,
    AI_SUGGESTIONS_ENABLED:     false,
    MULTI_LOCATION_ENABLED:     false,
    GROUP_BOOKING_ENABLED:      false,
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
    SMS_REMINDERS_ENABLED:      true,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       false,
    ONLINE_PAYMENT_ENABLED:     true,
    CANCELLATION_FEE_ENABLED:   false,
    WAITING_LIST_ENABLED:       true,
    LOYALTY_ENABLED:            true,
    GDPR_ENABLED:               true,
    COVERS_MANAGEMENT_ENABLED:  false,
    DAILY_REPORT_ENABLED:       false,
    SMS_ENABLED:                true,
    BIRTHDAY_AUTOMATION_ENABLED: true,
    REBOOKING_NUDGES_ENABLED:   true,
    RECURRING_BOOKINGS_ENABLED: true,
    CAMPAIGNS_ENABLED:          true,
    PUBLIC_BOOKING_ENABLED:     true,
    SOCIAL_BOOKING_ENABLED:     true,
    NO_SHOW_AUTOMATION_ENABLED: true,
    HEALTH_FLAGS_ENABLED:       true,
    INTAKE_FORMS_ENABLED:       false,
    BOOKING_PHOTOS_ENABLED:     true,
    REFERRALS_ENABLED:          true,
    TIPS_ENABLED:               true,
    GIFT_CARDS_ENABLED:         true,
    INVENTORY_ENABLED:          true,
    POS_ENABLED:                true,
    STRIPE_TERMINAL_ENABLED:    false,
    PAYROLL_ENABLED:            true,
    PACKAGES_ENABLED:           true,
    MEMBERSHIPS_ENABLED:        true,
    ROTA_ENABLED:               true,
    STAFF_APP_ENABLED:          true,
    OUTLOOK_CALENDAR_ENABLED:   false,
    APPLE_CALENDAR_ENABLED:     false,
    DYNAMIC_PRICING_ENABLED:    false,
    AI_SUGGESTIONS_ENABLED:     false,
    MULTI_LOCATION_ENABLED:     false,
    GROUP_BOOKING_ENABLED:      false,
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
    SMS_REMINDERS_ENABLED:      true,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       false,
    ONLINE_PAYMENT_ENABLED:     true,
    CANCELLATION_FEE_ENABLED:   false,
    WAITING_LIST_ENABLED:       true,
    LOYALTY_ENABLED:            true,
    GDPR_ENABLED:               true,
    COVERS_MANAGEMENT_ENABLED:  false,
    DAILY_REPORT_ENABLED:       false,
    SMS_ENABLED:                true,
    BIRTHDAY_AUTOMATION_ENABLED: true,
    REBOOKING_NUDGES_ENABLED:   true,
    RECURRING_BOOKINGS_ENABLED: true,
    CAMPAIGNS_ENABLED:          true,
    PUBLIC_BOOKING_ENABLED:     true,
    SOCIAL_BOOKING_ENABLED:     true,
    NO_SHOW_AUTOMATION_ENABLED: true,
    HEALTH_FLAGS_ENABLED:       false,
    INTAKE_FORMS_ENABLED:       false,
    BOOKING_PHOTOS_ENABLED:     true,
    REFERRALS_ENABLED:          true,
    TIPS_ENABLED:               true,
    GIFT_CARDS_ENABLED:         false,
    INVENTORY_ENABLED:          false,
    POS_ENABLED:                true,
    STRIPE_TERMINAL_ENABLED:    false,
    PAYROLL_ENABLED:            true,
    PACKAGES_ENABLED:           true,
    MEMBERSHIPS_ENABLED:        false,
    ROTA_ENABLED:               true,
    STAFF_APP_ENABLED:          true,
    OUTLOOK_CALENDAR_ENABLED:   false,
    APPLE_CALENDAR_ENABLED:     false,
    DYNAMIC_PRICING_ENABLED:    false,
    AI_SUGGESTIONS_ENABLED:     false,
    MULTI_LOCATION_ENABLED:     false,
    GROUP_BOOKING_ENABLED:      false,
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
    SMS_REMINDERS_ENABLED:      true,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       false,
    ONLINE_PAYMENT_ENABLED:     true,
    CANCELLATION_FEE_ENABLED:   false,
    WAITING_LIST_ENABLED:       true,
    LOYALTY_ENABLED:            true,
    GDPR_ENABLED:               true,
    COVERS_MANAGEMENT_ENABLED:  false,
    DAILY_REPORT_ENABLED:       false,
    SMS_ENABLED:                true,
    BIRTHDAY_AUTOMATION_ENABLED: true,
    REBOOKING_NUDGES_ENABLED:   true,
    RECURRING_BOOKINGS_ENABLED: true,
    CAMPAIGNS_ENABLED:          true,
    PUBLIC_BOOKING_ENABLED:     true,
    SOCIAL_BOOKING_ENABLED:     true,
    NO_SHOW_AUTOMATION_ENABLED: true,
    HEALTH_FLAGS_ENABLED:       true,
    INTAKE_FORMS_ENABLED:       true,
    BOOKING_PHOTOS_ENABLED:     true,
    REFERRALS_ENABLED:          true,
    TIPS_ENABLED:               true,
    GIFT_CARDS_ENABLED:         true,
    INVENTORY_ENABLED:          true,
    POS_ENABLED:                true,
    STRIPE_TERMINAL_ENABLED:    false,
    PAYROLL_ENABLED:            false,
    PACKAGES_ENABLED:           true,
    MEMBERSHIPS_ENABLED:        false,
    ROTA_ENABLED:               true,
    STAFF_APP_ENABLED:          true,
    OUTLOOK_CALENDAR_ENABLED:   false,
    APPLE_CALENDAR_ENABLED:     false,
    DYNAMIC_PRICING_ENABLED:    false,
    AI_SUGGESTIONS_ENABLED:     false,
    MULTI_LOCATION_ENABLED:     false,
    GROUP_BOOKING_ENABLED:      false,
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
    SMS_REMINDERS_ENABLED:      true,
    WHATSAPP_CONTACT_ENABLED:   true,
    REVIEW_REQUEST_ENABLED:     true,
    ANALYTICS_ENABLED:          true,
    LEAD_SCORING_ENABLED:       false,
    ONLINE_PAYMENT_ENABLED:     true,
    CANCELLATION_FEE_ENABLED:   false,
    WAITING_LIST_ENABLED:       false,
    LOYALTY_ENABLED:            true,
    GDPR_ENABLED:               true,
    COVERS_MANAGEMENT_ENABLED:  false,
    DAILY_REPORT_ENABLED:       false,
    SMS_ENABLED:                true,
    BIRTHDAY_AUTOMATION_ENABLED: true,
    REBOOKING_NUDGES_ENABLED:   true,
    RECURRING_BOOKINGS_ENABLED: true,
    CAMPAIGNS_ENABLED:          true,
    PUBLIC_BOOKING_ENABLED:     true,
    SOCIAL_BOOKING_ENABLED:     true,
    NO_SHOW_AUTOMATION_ENABLED: true,
    HEALTH_FLAGS_ENABLED:       true,
    INTAKE_FORMS_ENABLED:       true,
    BOOKING_PHOTOS_ENABLED:     true,
    REFERRALS_ENABLED:          true,
    TIPS_ENABLED:               true,
    GIFT_CARDS_ENABLED:         true,
    INVENTORY_ENABLED:          true,
    POS_ENABLED:                true,
    STRIPE_TERMINAL_ENABLED:    false,
    PAYROLL_ENABLED:            true,
    PACKAGES_ENABLED:           true,
    MEMBERSHIPS_ENABLED:        true,
    ROTA_ENABLED:               true,
    STAFF_APP_ENABLED:          true,
    OUTLOOK_CALENDAR_ENABLED:   false,
    APPLE_CALENDAR_ENABLED:     false,
    DYNAMIC_PRICING_ENABLED:    false,
    AI_SUGGESTIONS_ENABLED:     false,
    MULTI_LOCATION_ENABLED:     false,
    GROUP_BOOKING_ENABLED:      false,
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
    WAITING_LIST_ENABLED:       true,
    LOYALTY_ENABLED:            false,
    GDPR_ENABLED:               true,
    COVERS_MANAGEMENT_ENABLED:  true,
    DAILY_REPORT_ENABLED:       false,
    SMS_ENABLED:                false,
    BIRTHDAY_AUTOMATION_ENABLED: false,
    REBOOKING_NUDGES_ENABLED:   false,
    RECURRING_BOOKINGS_ENABLED: false,
    CAMPAIGNS_ENABLED:          false,
    PUBLIC_BOOKING_ENABLED:     true,
    SOCIAL_BOOKING_ENABLED:     false,
    NO_SHOW_AUTOMATION_ENABLED: false,
    HEALTH_FLAGS_ENABLED:       false,
    INTAKE_FORMS_ENABLED:       false,
    BOOKING_PHOTOS_ENABLED:     false,
    REFERRALS_ENABLED:          true,
    TIPS_ENABLED:               true,
    GIFT_CARDS_ENABLED:         true,
    INVENTORY_ENABLED:          true,
    POS_ENABLED:                true,
    STRIPE_TERMINAL_ENABLED:    false,
    PAYROLL_ENABLED:            false,
    PACKAGES_ENABLED:           false,
    MEMBERSHIPS_ENABLED:        false,
    ROTA_ENABLED:               true,
    STAFF_APP_ENABLED:          true,
    OUTLOOK_CALENDAR_ENABLED:   false,
    APPLE_CALENDAR_ENABLED:     false,
    DYNAMIC_PRICING_ENABLED:    false,
    AI_SUGGESTIONS_ENABLED:     false,
    MULTI_LOCATION_ENABLED:     false,
    GROUP_BOOKING_ENABLED:      false,
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
  // ═══════════════════════════════════════════════════════════════════════════
  // TATTOO STUDIO — 42 services across 7 categories
  // ═══════════════════════════════════════════════════════════════════════════
  tattoo_studio: [
    {
      name: 'Custom Tattoo',
      description: 'Fully custom hand-drawn original designs',
      services: [
        { name: 'Custom Tattoo — Tiny (up to 1")', description: 'Finger, wrist, behind ear', durationMinutes: 60, priceFrom: null, isActive: true },
        { name: 'Custom Tattoo — Small (1"–3")', description: 'Palm-sized piece', durationMinutes: 90, priceFrom: null, isActive: true },
        { name: 'Custom Tattoo — Medium (3"–6")', description: 'Forearm / calf size', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Custom Tattoo — Large (6"–10")', description: 'Thigh / shoulder piece', durationMinutes: 300, priceFrom: null, isActive: true },
        { name: 'Custom Tattoo — XL (10"+)', description: 'Chest panel, back panel, thigh panel', durationMinutes: 420, priceFrom: null, isActive: true },
        { name: 'Half Sleeve', description: 'Elbow to wrist or shoulder to elbow', durationMinutes: 480, priceFrom: null, isActive: true },
        { name: 'Full Sleeve', description: 'Full arm from shoulder to wrist', durationMinutes: 600, priceFrom: null, isActive: true },
        { name: 'Full Leg Sleeve', description: 'Hip to ankle', durationMinutes: 600, priceFrom: null, isActive: true },
        { name: 'Chest Piece', description: 'Full chest or chest panel', durationMinutes: 480, priceFrom: null, isActive: true },
        { name: 'Back Piece', description: 'Full back tattoo — multiple sessions', durationMinutes: 600, priceFrom: null, isActive: true },
        { name: 'Ribcage / Side Piece', description: 'Ribcage or side of torso', durationMinutes: 300, priceFrom: null, isActive: true },
        { name: 'Throat / Neck Tattoo', description: 'Neck or throat placement', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Hand / Knuckles Tattoo', description: 'Hand or knuckle placement', durationMinutes: 90, priceFrom: null, isActive: true },
        { name: 'Face Tattoo', description: 'Face or head placement — 18+ only', durationMinutes: 120, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Flash Tattoo',
      description: 'Pre-designed ready-to-tattoo walk-in pieces',
      services: [
        { name: 'Flash — Tiny', description: 'Pre-drawn tiny design, book & go', durationMinutes: 45, priceFrom: 60, isActive: true },
        { name: 'Flash — Small', description: 'Pre-drawn small design', durationMinutes: 75, priceFrom: 100, isActive: true },
        { name: 'Flash — Medium', description: 'Pre-drawn medium design', durationMinutes: 150, priceFrom: 180, isActive: true },
        { name: 'Flash Day Slot', description: 'Full day flash event — one slot', durationMinutes: 480, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Tattoo Style — Specialist',
      description: 'Specific style specialism — artists booked by style',
      services: [
        { name: 'Fine Line / Micro Realism', description: 'Ultra-fine needle, delicate detail', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Blackwork / Blackout', description: 'Bold solid black work', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Geometric / Dotwork', description: 'Mathematical patterns, mandalas, stippling', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Realism / Photorealism', description: 'Portraits, animals, hyperrealistic', durationMinutes: 300, priceFrom: null, isActive: true },
        { name: 'Watercolour', description: 'Painterly washes of colour', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Neo-Traditional', description: 'Bold lines, rich colour, decorative', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Traditional / Old School', description: 'Classic bold outlines and colours', durationMinutes: 150, priceFrom: null, isActive: true },
        { name: 'Japanese / Irezumi', description: 'Full Japanese traditional style', durationMinutes: 360, priceFrom: null, isActive: true },
        { name: 'Tribal', description: 'Polynesian, Maori, Celtic tribal', durationMinutes: 240, priceFrom: null, isActive: true },
        { name: 'Script / Lettering / Calligraphy', description: 'Words, quotes, signatures', durationMinutes: 90, priceFrom: null, isActive: true },
        { name: 'New School / Cartoon', description: 'Bold, cartoonish, vivid colour', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Illustrative', description: 'Drawing / illustration style', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Ornamental / Mandala', description: 'Decorative ornamental pieces', durationMinutes: 240, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Cover Up & Rework',
      description: 'Fixing, covering, or refreshing existing tattoos',
      services: [
        { name: 'Cover Up — Small', description: 'Cover existing small tattoo', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Cover Up — Large', description: 'Cover existing large tattoo', durationMinutes: 360, priceFrom: null, isActive: true },
        { name: 'Rework / Blast Over', description: 'Tattoo over or incorporating existing work', durationMinutes: 240, priceFrom: null, isActive: true },
        { name: 'Touch Up', description: 'Refresh faded lines and colour', durationMinutes: 60, priceFrom: 60, isActive: true },
        { name: 'Colour Pack (single session top-up)', description: 'Pack colour into healed work', durationMinutes: 90, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Consultation',
      description: 'Design and planning sessions',
      services: [
        { name: 'Initial Design Consultation', description: 'First meeting — brief + moodboard', durationMinutes: 30, priceFrom: null, isActive: true },
        { name: 'Design Revision Consultation', description: 'Review and adjust design draft', durationMinutes: 30, priceFrom: null, isActive: true },
        { name: 'Cover Up Consultation', description: 'Assess existing tattoo + plan cover', durationMinutes: 30, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Piercing',
      description: 'Professional body piercing services',
      services: [
        { name: 'Earlobe Piercing (single)', description: '', durationMinutes: 15, priceFrom: 20, isActive: true },
        { name: 'Earlobe Piercing (pair)', description: '', durationMinutes: 15, priceFrom: 35, isActive: true },
        { name: 'Cartilage / Helix Piercing', description: '', durationMinutes: 15, priceFrom: 25, isActive: true },
        { name: 'Tragus Piercing', description: '', durationMinutes: 15, priceFrom: 30, isActive: true },
        { name: 'Daith Piercing', description: '', durationMinutes: 20, priceFrom: 35, isActive: true },
        { name: 'Industrial / Scaffold Piercing', description: 'Two-hole bar piercing', durationMinutes: 20, priceFrom: 40, isActive: true },
        { name: 'Septum Piercing', description: '', durationMinutes: 15, priceFrom: 30, isActive: true },
        { name: 'Nostril Piercing', description: '', durationMinutes: 15, priceFrom: 25, isActive: true },
        { name: 'Eyebrow Piercing', description: '', durationMinutes: 15, priceFrom: 30, isActive: true },
        { name: 'Lip / Labret Piercing', description: '', durationMinutes: 15, priceFrom: 30, isActive: true },
        { name: 'Tongue Piercing', description: '', durationMinutes: 15, priceFrom: 35, isActive: true },
        { name: 'Navel / Belly Button Piercing', description: '', durationMinutes: 15, priceFrom: 30, isActive: true },
        { name: 'Nipple Piercing (single)', description: '', durationMinutes: 15, priceFrom: 35, isActive: true },
        { name: 'Nipple Piercing (pair)', description: '', durationMinutes: 15, priceFrom: 60, isActive: true },
        { name: 'Surface Piercing', description: 'Collarbone, nape, wrist, etc.', durationMinutes: 20, priceFrom: 40, isActive: true },
        { name: 'Dermal / Microdermal Anchor', description: 'Single-point surface anchor', durationMinutes: 20, priceFrom: 45, isActive: true },
        { name: 'Jewellery Change / Downsize', description: 'Swap starter jewellery for smaller post', durationMinutes: 15, priceFrom: 10, isActive: true },
      ],
    },
    {
      name: 'Tattoo Removal Prep',
      description: 'Lightening treatments to prep for cover-up or full removal',
      services: [
        { name: 'Laser Lightening Session (small)', description: 'Single laser session to lighten small tattoo', durationMinutes: 30, priceFrom: 80, isActive: true },
        { name: 'Laser Lightening Session (medium)', description: '', durationMinutes: 45, priceFrom: 120, isActive: true },
        { name: 'Laser Lightening Session (large)', description: '', durationMinutes: 60, priceFrom: 180, isActive: true },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // HAIR SALON — 58 services across 9 categories
  // ═══════════════════════════════════════════════════════════════════════════
  hair_salon: [
    {
      name: 'Cut & Finish',
      description: 'Haircuts, styling, and blowdries',
      services: [
        { name: "Women's Cut & Blowdry", description: 'Wash, cut, blowdry and style', durationMinutes: 60, priceFrom: 45, isActive: true },
        { name: "Women's Dry Cut", description: 'Scissor cut on dry hair only', durationMinutes: 45, priceFrom: 35, isActive: true },
        { name: "Women's Restyle", description: 'Major length change or new style', durationMinutes: 75, priceFrom: 55, isActive: true },
        { name: "Long Hair Cut & Blowdry", description: 'Shoulder length or longer', durationMinutes: 75, priceFrom: 55, isActive: true },
        { name: "Men's Cut & Style", description: 'Wash, cut, and style', durationMinutes: 35, priceFrom: 28, isActive: true },
        { name: "Children's Cut (under 12)", description: '', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: "Teen Cut (12–17)", description: '', durationMinutes: 45, priceFrom: 30, isActive: true },
        { name: 'Fringe Trim', description: 'Fringe only, no wash required', durationMinutes: 15, priceFrom: 10, isActive: true },
        { name: 'Blowout / Blowdry Only', description: 'Wash and blowdry, no cut', durationMinutes: 45, priceFrom: 35, isActive: true },
        { name: 'Express Blowdry', description: 'Quick blowdry no styling tools', durationMinutes: 30, priceFrom: 25, isActive: true },
        { name: 'Hair Straightening (iron)', description: 'Blowdry + flat-iron finish', durationMinutes: 60, priceFrom: 40, isActive: true },
        { name: 'Curls / Wave Set', description: 'Wand or roller set finish', durationMinutes: 60, priceFrom: 40, isActive: true },
      ],
    },
    {
      name: 'Colour — Singles',
      description: 'All-over, root, and toner services',
      services: [
        { name: 'Full Colour (short hair)', description: 'All-over single colour, short', durationMinutes: 75, priceFrom: 55, isActive: true },
        { name: 'Full Colour (long hair)', description: 'All-over single colour, long', durationMinutes: 90, priceFrom: 75, isActive: true },
        { name: 'Root Touch-Up', description: 'Roots only colour retouch', durationMinutes: 60, priceFrom: 45, isActive: true },
        { name: 'Grey Blending', description: 'Soft blend grey roots into colour', durationMinutes: 90, priceFrom: 65, isActive: true },
        { name: 'Toner / Gloss', description: 'In-salon toner to refresh vibrancy', durationMinutes: 30, priceFrom: 30, isActive: true },
        { name: 'Colour Correction', description: 'Major colour repair — price on consultation', durationMinutes: 300, priceFrom: null, isActive: true },
        { name: 'Fashion / Vivid Colour', description: 'Bold fashion colours — pink, blue, etc.', durationMinutes: 120, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Colour — Highlights & Balayage',
      description: 'Foil highlights, balayage, and ombre techniques',
      services: [
        { name: 'Highlights — Full Head', description: 'Full head foil highlights', durationMinutes: 120, priceFrom: 90, isActive: true },
        { name: 'Highlights — Half Head', description: 'Top section foil highlights', durationMinutes: 90, priceFrom: 70, isActive: true },
        { name: 'Highlights — T-Section', description: 'Parting and crown highlights', durationMinutes: 75, priceFrom: 55, isActive: true },
        { name: 'Baby Lights', description: 'Very fine, delicate foil highlights', durationMinutes: 120, priceFrom: 95, isActive: true },
        { name: 'Balayage (short/medium)', description: 'Freehand painted highlights', durationMinutes: 120, priceFrom: 100, isActive: true },
        { name: 'Balayage (long)', description: 'Freehand painted highlights — long hair', durationMinutes: 150, priceFrom: 130, isActive: true },
        { name: 'Ombre', description: 'Dark-to-light gradient fade', durationMinutes: 120, priceFrom: 100, isActive: true },
        { name: 'Sombre (Soft Ombre)', description: 'Subtle natural-looking ombre', durationMinutes: 120, priceFrom: 100, isActive: true },
        { name: 'Foilayage', description: 'Balayage placed in foils for lift', durationMinutes: 150, priceFrom: 130, isActive: true },
        { name: 'Sun-Kissed Look', description: 'Natural summer beach tones', durationMinutes: 120, priceFrom: 100, isActive: true },
        { name: 'Colour Melt', description: 'Seamless blended colour tones', durationMinutes: 120, priceFrom: 110, isActive: true },
      ],
    },
    {
      name: 'Perms & Chemical Straightening',
      description: 'Permanent wave and smoothing services',
      services: [
        { name: 'Classic Perm (short)', description: 'Permanent wave, short hair', durationMinutes: 120, priceFrom: 80, isActive: true },
        { name: 'Classic Perm (long)', description: 'Permanent wave, long hair', durationMinutes: 150, priceFrom: 110, isActive: true },
        { name: 'Body Wave', description: 'Looser soft waves perm', durationMinutes: 120, priceFrom: 90, isActive: true },
        { name: 'Relaxer / Chemical Straightener', description: 'Permanently straightens curly hair', durationMinutes: 120, priceFrom: 90, isActive: true },
        { name: 'Keratin Treatment', description: 'Smoothing treatment — frizz control', durationMinutes: 180, priceFrom: 150, isActive: true },
        { name: 'Brazilian Blowout', description: 'Semi-permanent smoothing', durationMinutes: 180, priceFrom: 175, isActive: true },
        { name: 'Japanese Straightening', description: 'Permanent bone straight result', durationMinutes: 240, priceFrom: 200, isActive: true },
      ],
    },
    {
      name: 'Hair Treatments',
      description: 'Conditioning, scalp, and repair treatments',
      services: [
        { name: 'Deep Conditioning Mask', description: 'Intensive moisture treatment', durationMinutes: 30, priceFrom: 25, isActive: true },
        { name: 'Olaplex Treatment', description: 'Bond repair and strengthening', durationMinutes: 30, priceFrom: 30, isActive: true },
        { name: 'Protein Treatment', description: 'Strengthen and reduce breakage', durationMinutes: 30, priceFrom: 30, isActive: true },
        { name: 'Scalp Treatment', description: 'Targeted scalp health treatment', durationMinutes: 45, priceFrom: 35, isActive: true },
        { name: 'Scalp Massage', description: 'Relaxing scalp and pressure point massage', durationMinutes: 20, priceFrom: 20, isActive: true },
        { name: 'Hot Oil Treatment', description: 'Warm oil conditioning treatment', durationMinutes: 30, priceFrom: 25, isActive: true },
        { name: 'Dandruff / Scalp Detox', description: 'Clarifying scalp treatment', durationMinutes: 45, priceFrom: 40, isActive: true },
        { name: 'Trichology Consultation', description: 'Hair and scalp health assessment', durationMinutes: 45, priceFrom: 50, isActive: true },
      ],
    },
    {
      name: 'Hair Extensions',
      description: 'Semi-permanent and temporary extension services',
      services: [
        { name: 'Tape-In Extensions (full)', description: 'Full set of tape-in extensions', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Tape-In Extensions (removal)', description: 'Remove and condition existing tape-ins', durationMinutes: 60, priceFrom: 60, isActive: true },
        { name: 'Micro Bead / Nano Ring Extensions', description: 'Full set micro bead installation', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Fusion / Bonded Extensions', description: 'Keratin bond full set installation', durationMinutes: 240, priceFrom: null, isActive: true },
        { name: 'Extension Maintenance / Move-Up', description: 'Reposition grown-out extensions', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Extension Removal', description: 'Safe removal of all extension types', durationMinutes: 90, priceFrom: 60, isActive: true },
        { name: 'Clip-In Extension Fitting Consultation', description: 'Colour match + application tutorial', durationMinutes: 30, priceFrom: 30, isActive: true },
      ],
    },
    {
      name: 'Braiding & Natural Hair',
      description: 'Protective styles and natural hair services',
      services: [
        { name: 'Box Braids (short)', description: '', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Box Braids (long)', description: '', durationMinutes: 300, priceFrom: null, isActive: true },
        { name: 'Cornrows (simple)', description: 'Standard cornrow pattern', durationMinutes: 90, priceFrom: 60, isActive: true },
        { name: 'Cornrows (complex pattern)', description: 'Intricate design cornrows', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Micro Braids', description: 'Very small individual braids', durationMinutes: 360, priceFrom: null, isActive: true },
        { name: 'Twist Braids / Senegalese Twists', description: '', durationMinutes: 240, priceFrom: null, isActive: true },
        { name: 'Loc Maintenance', description: 'Retwist and tighten dreadlocks', durationMinutes: 120, priceFrom: 80, isActive: true },
        { name: 'Loc Starter Set', description: 'Initial loc installation', durationMinutes: 300, priceFrom: null, isActive: true },
        { name: 'Afro Trim & Shape', description: 'Shape and trim natural afro', durationMinutes: 45, priceFrom: 35, isActive: true },
        { name: 'Natural Hair Blowout', description: 'Blowout stretch for natural hair', durationMinutes: 60, priceFrom: 50, isActive: true },
      ],
    },
    {
      name: 'Special Occasions & Bridal',
      description: 'Event, wedding, and photoshoot styling',
      services: [
        { name: 'Bridal Hair (bride)', description: 'Full bridal styling on the day', durationMinutes: 120, priceFrom: 150, isActive: true },
        { name: 'Bridal Hair Trial', description: 'Pre-wedding styling trial run', durationMinutes: 90, priceFrom: 100, isActive: true },
        { name: 'Bridesmaid Hair', description: 'Single bridesmaid styling', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Prom / Occasion Updo', description: 'Formal updo for events', durationMinutes: 75, priceFrom: 75, isActive: true },
        { name: 'Vintage / Retro Set & Style', description: 'Waves, pin curls, vintage finish', durationMinutes: 90, priceFrom: 80, isActive: true },
        { name: 'Half Up / Half Down Style', description: 'Part up, part down styling', durationMinutes: 60, priceFrom: 55, isActive: true },
        { name: 'Blow Wave / Beach Waves', description: 'Casual beachy wave finish', durationMinutes: 60, priceFrom: 45, isActive: true },
        { name: 'Photoshoot / Editorial Styling', description: 'On-set or shoot styling', durationMinutes: 120, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Packages & Combos',
      description: 'Popular service combinations',
      services: [
        { name: 'Cut + Full Colour + Blowdry', description: '', durationMinutes: 150, priceFrom: 110, isActive: true },
        { name: 'Cut + Highlights + Toner + Blowdry', description: '', durationMinutes: 180, priceFrom: 150, isActive: true },
        { name: 'Balayage + Toner + Blowdry', description: '', durationMinutes: 180, priceFrom: 145, isActive: true },
        { name: 'Colour + Olaplex + Blowdry', description: '', durationMinutes: 120, priceFrom: 100, isActive: true },
        { name: 'Cut + Scalp Treatment + Blowdry', description: '', durationMinutes: 90, priceFrom: 75, isActive: true },
        { name: 'Full Pamper (Cut + Colour + Treatment)', description: 'Full salon experience package', durationMinutes: 210, priceFrom: 160, isActive: true },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // BARBER — 52 services across 7 categories
  // ═══════════════════════════════════════════════════════════════════════════
  barber: [
    {
      name: 'Haircut',
      description: 'All haircut and style services',
      services: [
        { name: 'Clipper Cut (all over)', description: 'Machine all over, same grade', durationMinutes: 20, priceFrom: 15, isActive: true },
        { name: 'Scissors Cut', description: 'Scissor-only cut, no clippers', durationMinutes: 35, priceFrom: 22, isActive: true },
        { name: 'Clipper + Scissors (blend)', description: 'Clipper sides, scissor top', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Low Fade', description: 'Fade starting at the ear', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Mid Fade', description: 'Fade starting at the temple', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'High Fade', description: 'Fade starting high on the head', durationMinutes: 30, priceFrom: 22, isActive: true },
        { name: 'Skin Fade / Bald Fade', description: 'Zero / bald fade to skin', durationMinutes: 35, priceFrom: 22, isActive: true },
        { name: 'Drop Fade', description: 'Curved drop fade behind the ear', durationMinutes: 35, priceFrom: 22, isActive: true },
        { name: 'Temple Fade', description: 'Faded temples, natural top', durationMinutes: 25, priceFrom: 18, isActive: true },
        { name: 'Taper', description: 'Classic tapered neckline and sides', durationMinutes: 25, priceFrom: 18, isActive: true },
        { name: 'Buzz Cut', description: 'Single uniform clipper grade all over', durationMinutes: 15, priceFrom: 12, isActive: true },
        { name: 'Undercut', description: 'Short clipped sides, longer top', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Textured Crop', description: 'Short textured crop finish', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Quiff / Pompadour', description: 'Styled volume on top', durationMinutes: 35, priceFrom: 22, isActive: true },
        { name: 'Comb Over', description: 'Side-parted comb over', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Caesar Cut', description: 'Short horizontal fringe, forward style', durationMinutes: 25, priceFrom: 18, isActive: true },
        { name: 'French Crop', description: 'Short sides, textured fringe on top', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Mohawk / Faux Hawk', description: 'Shaved sides with styled centre strip', durationMinutes: 30, priceFrom: 22, isActive: true },
        { name: 'Kids Cut (under 12)', description: 'Children\'s haircut', durationMinutes: 20, priceFrom: 12, isActive: true },
        { name: "OAP Cut (65+)", description: 'Senior discount haircut', durationMinutes: 25, priceFrom: 12, isActive: true },
      ],
    },
    {
      name: 'Beard & Shave',
      description: 'All beard grooming and shave services',
      services: [
        { name: 'Beard Trim', description: 'Shape and tidy beard length', durationMinutes: 15, priceFrom: 10, isActive: true },
        { name: 'Beard Shape Up / Edge Up', description: 'Define neckline, cheek line, moustache', durationMinutes: 20, priceFrom: 12, isActive: true },
        { name: 'Full Beard Groom', description: 'Wash, trim, shape, wax and condition', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Hot Towel Shave (full face)', description: 'Lather, straight-razor, hot towels', durationMinutes: 35, priceFrom: 25, isActive: true },
        { name: 'Neck Shave (back of neck)', description: 'Clean up neckline', durationMinutes: 10, priceFrom: 6, isActive: true },
        { name: 'Moustache Trim & Shape', description: 'Moustache only trim and shape', durationMinutes: 10, priceFrom: 6, isActive: true },
        { name: 'Goatee Trim & Shape', description: 'Goatee precision shaping', durationMinutes: 15, priceFrom: 8, isActive: true },
        { name: 'Designer Stubble', description: 'Precision stubble length control', durationMinutes: 15, priceFrom: 10, isActive: true },
        { name: 'Beard Conditioning Treatment', description: 'Deep condition + beard oil treatment', durationMinutes: 20, priceFrom: 12, isActive: true },
      ],
    },
    {
      name: 'Hair Colour & Tint',
      description: 'Colour, highlights, and tinting for men',
      services: [
        { name: 'Full Colour', description: 'All-over single colour', durationMinutes: 60, priceFrom: 35, isActive: true },
        { name: 'Root Touch-Up / Grey Blending', description: 'Blend grey roots', durationMinutes: 45, priceFrom: 25, isActive: true },
        { name: 'Bleach & Tone', description: 'Lighten and tone hair', durationMinutes: 90, priceFrom: 55, isActive: true },
        { name: 'Highlights / Streaks', description: 'Foil highlights for men', durationMinutes: 75, priceFrom: 45, isActive: true },
        { name: 'Toner / Gloss', description: 'Refresh tone and shine', durationMinutes: 20, priceFrom: 15, isActive: true },
        { name: 'Beard Tint / Beard Colour', description: 'Colour the beard to match or contrast', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Beard Bleach', description: 'Lighten beard hair', durationMinutes: 45, priceFrom: 30, isActive: true },
      ],
    },
    {
      name: 'Perms & Texturisers',
      description: 'Wave and texture chemical services',
      services: [
        { name: 'Perm', description: 'Permanent wave or curl', durationMinutes: 90, priceFrom: 60, isActive: true },
        { name: 'Texturiser', description: 'Loosen natural curl pattern slightly', durationMinutes: 60, priceFrom: 40, isActive: true },
        { name: 'Relaxer', description: 'Chemically straighten curly hair', durationMinutes: 60, priceFrom: 45, isActive: true },
      ],
    },
    {
      name: 'Scalp & Hair Treatments',
      description: 'Health and wellness treatments for hair and scalp',
      services: [
        { name: 'Scalp Treatment', description: 'Exfoliate and nourish scalp', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Dandruff Treatment', description: 'Anti-dandruff scalp care', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Hot Oil Treatment', description: 'Warm conditioning oil treatment', durationMinutes: 20, priceFrom: 15, isActive: true },
        { name: 'Hair Mask / Deep Conditioning', description: '', durationMinutes: 20, priceFrom: 12, isActive: true },
      ],
    },
    {
      name: 'Face & Grooming Extras',
      description: 'Add-on face and grooming services',
      services: [
        { name: 'Eyebrow Trim', description: 'Shape and trim brows', durationMinutes: 10, priceFrom: 5, isActive: true },
        { name: 'Eyebrow Wax / Thread', description: 'Wax or thread brow shaping', durationMinutes: 15, priceFrom: 8, isActive: true },
        { name: 'Nose Hair Wax', description: 'Nose hair wax removal', durationMinutes: 10, priceFrom: 6, isActive: true },
        { name: 'Ear Hair Wax', description: 'Ear hair wax removal', durationMinutes: 10, priceFrom: 6, isActive: true },
        { name: 'Line Up / Edge Up (only)', description: 'Hairline edge-up, no cut', durationMinutes: 15, priceFrom: 8, isActive: true },
        { name: 'Face Mask', description: 'Refreshing face mask treatment', durationMinutes: 15, priceFrom: 8, isActive: true },
      ],
    },
    {
      name: 'Combo Deals',
      description: 'Popular haircut + beard combinations',
      services: [
        { name: 'Cut + Beard Trim', description: '', durationMinutes: 40, priceFrom: 25, isActive: true },
        { name: 'Cut + Beard Shape Up', description: '', durationMinutes: 45, priceFrom: 28, isActive: true },
        { name: 'Cut + Full Beard Groom', description: '', durationMinutes: 55, priceFrom: 36, isActive: true },
        { name: 'Cut + Hot Towel Shave', description: '', durationMinutes: 55, priceFrom: 40, isActive: true },
        { name: 'Cut + Colour (hair)', description: '', durationMinutes: 80, priceFrom: 50, isActive: true },
        { name: 'Cut + Beard Tint', description: '', durationMinutes: 55, priceFrom: 32, isActive: true },
        { name: 'Cut + Beard + Colour', description: '', durationMinutes: 90, priceFrom: 60, isActive: true },
        { name: 'Full Groom (cut + beard groom + hot towel)', description: 'Complete premium groom', durationMinutes: 75, priceFrom: 55, isActive: true },
        { name: 'Cut + Scalp Treatment', description: '', durationMinutes: 50, priceFrom: 32, isActive: true },
        { name: 'Teen Groom (cut + beard + edge up)', description: '', durationMinutes: 50, priceFrom: 30, isActive: true },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // NAIL SALON — 66 services across 8 categories
  // ═══════════════════════════════════════════════════════════════════════════
  nail_salon: [
    {
      name: 'Manicure',
      description: 'Hand and fingernail services',
      services: [
        { name: 'Classic Manicure', description: 'Shape, buff, cuticle care, polish', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Gel Manicure', description: 'Gel polish application, long-lasting', durationMinutes: 45, priceFrom: 30, isActive: true },
        { name: 'Shellac Manicure', description: 'CND Shellac gel polish service', durationMinutes: 45, priceFrom: 32, isActive: true },
        { name: 'Dip Powder Manicure', description: 'Dipping powder colour application', durationMinutes: 60, priceFrom: 38, isActive: true },
        { name: 'BIAB (Builder in a Bottle)', description: 'Strengthening gel overlay', durationMinutes: 60, priceFrom: 38, isActive: true },
        { name: "Men's Manicure", description: 'Shape, buff, hand massage — no colour', durationMinutes: 30, priceFrom: 22, isActive: true },
        { name: 'Nail Hardener Treatment', description: 'Strengthen weak or damaged nails', durationMinutes: 30, priceFrom: 18, isActive: true },
        { name: 'Mini Manicure (express)', description: 'Shape, buff and polish only', durationMinutes: 20, priceFrom: 12, isActive: true },
        { name: 'Luxury Manicure', description: 'Classic mani + scrub + mask + massage', durationMinutes: 60, priceFrom: 45, isActive: true },
        { name: 'Gel Removal (fingers)', description: 'Safe soak-off gel removal', durationMinutes: 20, priceFrom: 10, isActive: true },
        { name: 'Acrylic Removal', description: 'Safe soak-off acrylic removal', durationMinutes: 30, priceFrom: 15, isActive: true },
      ],
    },
    {
      name: 'Nail Extensions & Overlays',
      description: 'Acrylic, gel, and polygel extensions',
      services: [
        { name: 'Acrylic Full Set (natural tips)', description: 'Acrylic full set on tips', durationMinutes: 90, priceFrom: 45, isActive: true },
        { name: 'Acrylic Full Set (sculpted)', description: 'Sculpted acrylic on form, no tips', durationMinutes: 100, priceFrom: 55, isActive: true },
        { name: 'Acrylic Infill / Rebalance', description: 'Fill grown-out acrylic', durationMinutes: 60, priceFrom: 32, isActive: true },
        { name: 'Acrylic Overlay (natural nails)', description: 'Acrylic over natural nails for strength', durationMinutes: 75, priceFrom: 40, isActive: true },
        { name: 'Gel Extensions (full set)', description: 'Hard gel extensions', durationMinutes: 90, priceFrom: 50, isActive: true },
        { name: 'Gel Extensions Infill', description: 'Fill grown-out gel extensions', durationMinutes: 60, priceFrom: 35, isActive: true },
        { name: 'Polygel Full Set', description: 'Polygel hybrid extension system', durationMinutes: 90, priceFrom: 55, isActive: true },
        { name: 'Polygel Infill', description: 'Polygel infill service', durationMinutes: 60, priceFrom: 38, isActive: true },
        { name: 'Extension Removal (full)', description: 'Remove all extensions safely', durationMinutes: 35, priceFrom: 15, isActive: true },
        { name: 'Shape Change / File Down', description: 'Reshape nails to different shape', durationMinutes: 20, priceFrom: 10, isActive: true },
      ],
    },
    {
      name: 'Pedicure',
      description: 'Foot and toenail services',
      services: [
        { name: 'Classic Pedicure', description: 'Soak, shape, cuticle care, polish', durationMinutes: 45, priceFrom: 28, isActive: true },
        { name: 'Gel Pedicure', description: 'Gel polish on toenails', durationMinutes: 60, priceFrom: 38, isActive: true },
        { name: 'Shellac Pedicure', description: 'CND Shellac on toenails', durationMinutes: 60, priceFrom: 40, isActive: true },
        { name: 'Luxury Spa Pedicure', description: 'Extended treatment + scrub + mask + massage', durationMinutes: 75, priceFrom: 55, isActive: true },
        { name: 'Express Pedicure', description: 'Quick tidy, shape and polish', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: "Men's Pedicure", description: 'Shape, buff, foot massage — no colour', durationMinutes: 45, priceFrom: 30, isActive: true },
        { name: 'Medical Pedicure', description: 'Callus removal + nail care — no colour', durationMinutes: 60, priceFrom: 45, isActive: true },
        { name: 'Callus Removal (feet)', description: 'Professional callus and hard skin removal', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Gel Removal (toes)', description: 'Safe soak-off gel removal on toes', durationMinutes: 20, priceFrom: 10, isActive: true },
      ],
    },
    {
      name: 'Nail Art',
      description: 'Decorative nail art and design services',
      services: [
        { name: 'Nail Art — 1 Accent Nail', description: 'Design on one feature nail', durationMinutes: 15, priceFrom: 5, isActive: true },
        { name: 'Nail Art — Per Nail', description: 'Custom art on each nail individually', durationMinutes: 10, priceFrom: 4, isActive: true },
        { name: 'Nail Art — Full Set', description: 'Design on all nails, full set', durationMinutes: 60, priceFrom: 30, isActive: true },
        { name: 'French Tips (classic)', description: 'Classic white French tip finish', durationMinutes: 20, priceFrom: 8, isActive: true },
        { name: 'French Tips (coloured / reverse)', description: 'Coloured or reverse French tip', durationMinutes: 20, priceFrom: 10, isActive: true },
        { name: 'Ombre / Gradient', description: 'Two-colour gradient fade', durationMinutes: 30, priceFrom: 15, isActive: true },
        { name: 'Chrome / Mirror Effect', description: 'Chrome powder mirror finish', durationMinutes: 20, priceFrom: 12, isActive: true },
        { name: 'Glitter / Foil', description: 'Glitter or foil design elements', durationMinutes: 15, priceFrom: 8, isActive: true },
        { name: 'Encapsulation (flowers, shells, etc.)', description: 'Elements set inside acrylic/gel', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: '3D Nail Art', description: 'Dimensional sculpted art on nails', durationMinutes: 45, priceFrom: 25, isActive: true },
        { name: 'Stamping / Sticker Designs', description: 'Stamp or sticker-based nail art', durationMinutes: 20, priceFrom: 8, isActive: true },
        { name: 'Hand-Painted Bespoke Art', description: 'Fully custom hand-painted design', durationMinutes: 90, priceFrom: null, isActive: true },
        { name: 'Marble Effect', description: 'Marble swirl nail design', durationMinutes: 30, priceFrom: 15, isActive: true },
        { name: 'Animal Print (leopard, zebra, etc.)', description: '', durationMinutes: 30, priceFrom: 12, isActive: true },
      ],
    },
    {
      name: 'Eyelash Services',
      description: 'Lash extensions and lash treatments',
      services: [
        { name: 'Classic Lash Extensions', description: 'One lash per natural lash', durationMinutes: 90, priceFrom: 65, isActive: true },
        { name: 'Hybrid Lash Extensions', description: 'Mix of classic and volume', durationMinutes: 100, priceFrom: 80, isActive: true },
        { name: 'Russian Volume Lash Extensions', description: '2D–6D fan lashes', durationMinutes: 120, priceFrom: 95, isActive: true },
        { name: 'Mega Volume Lash Extensions', description: '6D–20D ultra volume', durationMinutes: 150, priceFrom: 120, isActive: true },
        { name: 'Lash Infill / Maintenance (2–3 weeks)', description: 'Infill appointment', durationMinutes: 60, priceFrom: 45, isActive: true },
        { name: 'Lash Removal', description: 'Safe professional lash removal', durationMinutes: 30, priceFrom: 20, isActive: true },
        { name: 'Lash Lift & Tint', description: 'Lift and tint natural lashes', durationMinutes: 60, priceFrom: 50, isActive: true },
        { name: 'Lash Tint (only)', description: 'Tint natural lashes darker', durationMinutes: 20, priceFrom: 15, isActive: true },
      ],
    },
    {
      name: 'Waxing',
      description: 'Body hair waxing services',
      services: [
        { name: 'Eyebrow Wax', description: '', durationMinutes: 15, priceFrom: 10, isActive: true },
        { name: 'Upper Lip Wax', description: '', durationMinutes: 10, priceFrom: 8, isActive: true },
        { name: 'Chin Wax', description: '', durationMinutes: 10, priceFrom: 8, isActive: true },
        { name: 'Full Face Wax', description: 'Brow + lip + chin + cheeks + side', durationMinutes: 30, priceFrom: 28, isActive: true },
        { name: 'Underarm Wax', description: '', durationMinutes: 15, priceFrom: 12, isActive: true },
        { name: 'Half Arm Wax', description: 'Lower arm only', durationMinutes: 20, priceFrom: 15, isActive: true },
        { name: 'Full Arm Wax', description: '', durationMinutes: 30, priceFrom: 22, isActive: true },
        { name: 'Half Leg Wax', description: 'Below the knee', durationMinutes: 25, priceFrom: 18, isActive: true },
        { name: 'Full Leg Wax', description: '', durationMinutes: 45, priceFrom: 32, isActive: true },
        { name: 'Bikini Line Wax', description: 'Bikini line tidy', durationMinutes: 20, priceFrom: 18, isActive: true },
        { name: 'Extended Bikini / High Bikini', description: '', durationMinutes: 25, priceFrom: 25, isActive: true },
        { name: 'Brazilian Wax', description: 'Almost all hair removed, strip left', durationMinutes: 30, priceFrom: 35, isActive: true },
        { name: 'Hollywood Wax', description: 'Full hair removal front to back', durationMinutes: 30, priceFrom: 40, isActive: true },
        { name: 'Back Wax (female)', description: '', durationMinutes: 30, priceFrom: 25, isActive: true },
      ],
    },
    {
      name: 'Threading',
      description: 'Eyebrow and face threading services',
      services: [
        { name: 'Eyebrow Thread & Shape', description: '', durationMinutes: 15, priceFrom: 10, isActive: true },
        { name: 'Upper Lip Thread', description: '', durationMinutes: 10, priceFrom: 7, isActive: true },
        { name: 'Chin Thread', description: '', durationMinutes: 10, priceFrom: 7, isActive: true },
        { name: 'Forehead Thread', description: '', durationMinutes: 10, priceFrom: 8, isActive: true },
        { name: 'Side Burns Thread', description: '', durationMinutes: 10, priceFrom: 8, isActive: true },
        { name: 'Full Face Thread', description: 'Complete face threading', durationMinutes: 30, priceFrom: 28, isActive: true },
      ],
    },
    {
      name: 'Packages & Combos',
      description: 'Popular combined services',
      services: [
        { name: 'Mani + Pedi (classic)', description: 'Classic manicure + classic pedicure', durationMinutes: 75, priceFrom: 45, isActive: true },
        { name: 'Gel Mani + Gel Pedi', description: '', durationMinutes: 105, priceFrom: 65, isActive: true },
        { name: 'Acrylic Set + Gel Pedi', description: '', durationMinutes: 135, priceFrom: 80, isActive: true },
        { name: 'Lash Lift + Brow Wax', description: '', durationMinutes: 75, priceFrom: 55, isActive: true },
        { name: 'Full Pamper (mani + pedi + lash tint + brow)', description: '', durationMinutes: 150, priceFrom: 90, isActive: true },
        { name: 'Gel Mani + Lash Extensions', description: '', durationMinutes: 135, priceFrom: 95, isActive: true },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // MASSEUSE / SPA — 56 services across 8 categories
  // ═══════════════════════════════════════════════════════════════════════════
  masseuse: [
    {
      name: 'Relaxation Massage',
      description: 'Full-body relaxation and stress-relief massages',
      services: [
        { name: 'Swedish Massage (30 min)', description: 'Light-medium pressure, full body', durationMinutes: 30, priceFrom: 35, isActive: true },
        { name: 'Swedish Massage (60 min)', description: '', durationMinutes: 60, priceFrom: 60, isActive: true },
        { name: 'Swedish Massage (90 min)', description: '', durationMinutes: 90, priceFrom: 85, isActive: true },
        { name: 'Swedish Massage (120 min)', description: '', durationMinutes: 120, priceFrom: 110, isActive: true },
        { name: 'Aromatherapy Massage (60 min)', description: 'Essential oils + Swedish technique', durationMinutes: 60, priceFrom: 65, isActive: true },
        { name: 'Aromatherapy Massage (90 min)', description: '', durationMinutes: 90, priceFrom: 90, isActive: true },
        { name: 'Hot Stone Massage (60 min)', description: 'Heated basalt stones + relaxation', durationMinutes: 60, priceFrom: 75, isActive: true },
        { name: 'Hot Stone Massage (90 min)', description: '', durationMinutes: 90, priceFrom: 100, isActive: true },
        { name: 'Balinese Massage (60 min)', description: 'Stretching, kneading, pressure, aromatherapy', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Balinese Massage (90 min)', description: '', durationMinutes: 90, priceFrom: 95, isActive: true },
        { name: 'Hawaiian Lomi Lomi (60 min)', description: 'Long flowing strokes, forearm technique', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Hawaiian Lomi Lomi (90 min)', description: '', durationMinutes: 90, priceFrom: 95, isActive: true },
        { name: 'Himalayan Salt Stone Massage (75 min)', description: 'Warm salt stone massage detox', durationMinutes: 75, priceFrom: 85, isActive: true },
        { name: 'Candle Massage (60 min)', description: 'Warm massage candle wax technique', durationMinutes: 60, priceFrom: 70, isActive: true },
      ],
    },
    {
      name: 'Therapeutic & Deep Tissue',
      description: 'Pain relief, muscle work, and remedial massage',
      services: [
        { name: 'Deep Tissue Massage (30 min)', description: 'Firm pressure targeting tight muscles', durationMinutes: 30, priceFrom: 40, isActive: true },
        { name: 'Deep Tissue Massage (60 min)', description: '', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Deep Tissue Massage (90 min)', description: '', durationMinutes: 90, priceFrom: 95, isActive: true },
        { name: 'Remedial Massage (60 min)', description: 'Targeted therapy for specific injuries/conditions', durationMinutes: 60, priceFrom: 75, isActive: true },
        { name: 'Remedial Massage (90 min)', description: '', durationMinutes: 90, priceFrom: 100, isActive: true },
        { name: 'Sports Massage — Pre Event (45 min)', description: 'Warm up muscles before competition', durationMinutes: 45, priceFrom: 55, isActive: true },
        { name: 'Sports Massage — Post Event (45 min)', description: 'Recovery and flush-out after activity', durationMinutes: 45, priceFrom: 55, isActive: true },
        { name: 'Sports Massage (60 min)', description: 'Combined pre/post or maintenance', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Sports Massage (90 min)', description: '', durationMinutes: 90, priceFrom: 95, isActive: true },
        { name: 'Trigger Point Therapy (45 min)', description: 'Targeted pressure on trigger points', durationMinutes: 45, priceFrom: 55, isActive: true },
        { name: 'Myofascial Release (60 min)', description: 'Connective tissue fascial release', durationMinutes: 60, priceFrom: 75, isActive: true },
        { name: 'Neuromuscular Therapy (60 min)', description: 'Nerve and muscle pain relief', durationMinutes: 60, priceFrom: 75, isActive: true },
        { name: 'Cupping Therapy (45 min)', description: 'Suction cup myofascial release', durationMinutes: 45, priceFrom: 60, isActive: true },
        { name: 'Dry Needling (30 min)', description: 'Thin needles into trigger points', durationMinutes: 30, priceFrom: 55, isActive: true },
      ],
    },
    {
      name: 'Eastern & Traditional',
      description: 'Asian and traditional therapeutic modalities',
      services: [
        { name: 'Thai Massage (60 min)', description: 'Clothed, floor-based stretching and pressure', durationMinutes: 60, priceFrom: 65, isActive: true },
        { name: 'Thai Massage (90 min)', description: '', durationMinutes: 90, priceFrom: 90, isActive: true },
        { name: 'Thai Massage (120 min)', description: '', durationMinutes: 120, priceFrom: 115, isActive: true },
        { name: 'Thai Foot Massage (45 min)', description: 'Foot and lower leg Thai technique', durationMinutes: 45, priceFrom: 50, isActive: true },
        { name: 'Thai Foot Massage (60 min)', description: '', durationMinutes: 60, priceFrom: 65, isActive: true },
        { name: 'Shiatsu (60 min)', description: 'Japanese pressure-point energy work', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Shiatsu (90 min)', description: '', durationMinutes: 90, priceFrom: 95, isActive: true },
        { name: 'Tuina / Chinese Therapeutic Massage (60 min)', description: 'Traditional Chinese bodywork', durationMinutes: 60, priceFrom: 65, isActive: true },
        { name: 'Bamboo Massage (60 min)', description: 'Warm bamboo stick massage technique', durationMinutes: 60, priceFrom: 70, isActive: true },
      ],
    },
    {
      name: 'Specialist Treatments',
      description: 'Specialised and targeted massage therapies',
      services: [
        { name: 'Pregnancy Massage (60 min)', description: 'Side-lying, safe for all trimesters', durationMinutes: 60, priceFrom: 65, isActive: true },
        { name: 'Postnatal Massage (60 min)', description: 'Recovery massage after birth', durationMinutes: 60, priceFrom: 65, isActive: true },
        { name: 'Reflexology (45 min)', description: 'Foot pressure-point zone therapy', durationMinutes: 45, priceFrom: 50, isActive: true },
        { name: 'Reflexology (60 min)', description: '', durationMinutes: 60, priceFrom: 65, isActive: true },
        { name: 'Indian Head Massage (30 min)', description: 'Head, neck, shoulders pressure work', durationMinutes: 30, priceFrom: 35, isActive: true },
        { name: 'Indian Head Massage (45 min)', description: '', durationMinutes: 45, priceFrom: 50, isActive: true },
        { name: 'Lymphatic Drainage (60 min)', description: 'Gentle manual detox technique', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Lymphatic Drainage (90 min)', description: '', durationMinutes: 90, priceFrom: 95, isActive: true },
        { name: 'Craniosacral Therapy (60 min)', description: 'Gentle skull-to-sacrum realignment', durationMinutes: 60, priceFrom: 75, isActive: true },
        { name: 'Reiki (60 min)', description: 'Energy healing session', durationMinutes: 60, priceFrom: 60, isActive: true },
        { name: 'Chair Massage (30 min)', description: 'Seated workplace massage — upper body', durationMinutes: 30, priceFrom: 30, isActive: true },
        { name: 'Couples Massage (60 min)', description: 'Side-by-side massage for two', durationMinutes: 60, priceFrom: 120, isActive: true },
        { name: 'Couples Massage (90 min)', description: '', durationMinutes: 90, priceFrom: 160, isActive: true },
      ],
    },
    {
      name: 'Facial Treatments',
      description: 'Skin-focused facial therapies',
      services: [
        { name: 'Classic Facial (60 min)', description: 'Cleanse, tone, exfoliate, mask, moisturise', durationMinutes: 60, priceFrom: 60, isActive: true },
        { name: 'Anti-Ageing Facial (75 min)', description: 'Lifting and firming treatment', durationMinutes: 75, priceFrom: 80, isActive: true },
        { name: 'Deep Cleansing Facial (60 min)', description: 'Extraction + purifying mask', durationMinutes: 60, priceFrom: 65, isActive: true },
        { name: 'HydraFacial (60 min)', description: 'Cleanse, extract, hydrate with machine', durationMinutes: 60, priceFrom: 100, isActive: true },
        { name: 'LED Light Therapy (30 min)', description: 'Red/blue/infrared skin treatment', durationMinutes: 30, priceFrom: 45, isActive: true },
        { name: 'Microdermabrasion (45 min)', description: 'Crystal exfoliation skin renewal', durationMinutes: 45, priceFrom: 70, isActive: true },
      ],
    },
    {
      name: 'Body Treatments',
      description: 'Full-body scrubs, wraps, and exfoliation',
      services: [
        { name: 'Full Body Scrub (45 min)', description: 'Exfoliating salt or sugar scrub', durationMinutes: 45, priceFrom: 55, isActive: true },
        { name: 'Full Body Wrap (60 min)', description: 'Detox or nourishing body wrap', durationMinutes: 60, priceFrom: 70, isActive: true },
        { name: 'Hot Stone Exfoliation (60 min)', description: 'Stone + scrub full body treatment', durationMinutes: 60, priceFrom: 75, isActive: true },
        { name: 'Back Treatment / Back Facial (45 min)', description: 'Cleanse and treat back skin', durationMinutes: 45, priceFrom: 55, isActive: true },
      ],
    },
    {
      name: 'Spa Packages',
      description: 'Multi-treatment spa day and half-day packages',
      services: [
        { name: 'Mini Spa (90 min) — Massage + Facial', description: 'Swedish + classic facial', durationMinutes: 90, priceFrom: 110, isActive: true },
        { name: 'Half-Day Spa (3 hrs)', description: 'Massage + facial + body scrub', durationMinutes: 180, priceFrom: 180, isActive: true },
        { name: 'Full Spa Day (5 hrs)', description: 'Full programme — multiple treatments', durationMinutes: 300, priceFrom: 280, isActive: true },
        { name: "Couples' Retreat (2 hrs)", description: 'Side-by-side massage + facial for two', durationMinutes: 120, priceFrom: 220, isActive: true },
        { name: 'Relax & Restore Package', description: 'Deep tissue + hot stone + reflexology', durationMinutes: 150, priceFrom: 160, isActive: true },
        { name: 'Hen / Bridal Spa Package', description: 'Group spa experience', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Birthday Spa Package', description: 'Celebration treatment bundle', durationMinutes: 120, priceFrom: 130, isActive: true },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT — 32 services across 6 categories
  // ═══════════════════════════════════════════════════════════════════════════
  restaurant: [
    {
      name: 'Standard Dining',
      description: 'Regular table reservations',
      services: [
        { name: 'Breakfast / Morning Sitting', description: 'Morning breakfast reservation', durationMinutes: 60, priceFrom: null, isActive: true },
        { name: 'Brunch (weekend)', description: 'Weekend brunch sitting', durationMinutes: 90, priceFrom: null, isActive: true },
        { name: 'Lunch Sitting', description: 'Standard lunch table', durationMinutes: 90, priceFrom: null, isActive: true },
        { name: 'Afternoon Tea', description: 'Traditional afternoon tea reservation', durationMinutes: 90, priceFrom: 30, isActive: true },
        { name: 'Early Bird Dinner', description: 'Early dinner sitting (typically 5–7pm)', durationMinutes: 90, priceFrom: null, isActive: true },
        { name: 'Dinner Sitting', description: 'Standard evening table', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Late Dining', description: 'Late evening reservation', durationMinutes: 120, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Set Menus & Experiences',
      description: 'Tasting menus and curated dining experiences',
      services: [
        { name: '3-Course Set Menu', description: 'Starter, main, dessert', durationMinutes: 90, priceFrom: 35, isActive: true },
        { name: '5-Course Tasting Menu', description: 'Five curated chef courses', durationMinutes: 120, priceFrom: 65, isActive: true },
        { name: '7-Course Tasting Menu', description: 'Full tasting menu experience', durationMinutes: 150, priceFrom: 95, isActive: true },
        { name: 'Sunday Roast', description: 'Traditional Sunday lunch', durationMinutes: 120, priceFrom: 25, isActive: true },
        { name: "Chef's Table Experience", description: 'Exclusive seats at the pass — custom menu', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Wine Pairing Dinner', description: 'Tasting menu with sommelier wine pairings', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Cocktail Pairing Dinner', description: 'Menu paired with craft cocktails', durationMinutes: 150, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Private Dining',
      description: 'Exclusive and semi-private space bookings',
      services: [
        { name: 'Private Dining Room (exclusive)', description: 'Exclusive hire of private room', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Semi-Private Section', description: 'Screened-off section of the restaurant', durationMinutes: 150, priceFrom: null, isActive: true },
        { name: 'Outdoor Terrace Exclusive', description: 'Exclusive use of outdoor terrace', durationMinutes: 150, priceFrom: null, isActive: true },
        { name: 'Bar / Lounge Hire', description: 'Exclusive use of bar area', durationMinutes: 180, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Group Bookings',
      description: 'Larger party and group reservations',
      services: [
        { name: 'Small Group (5–8 guests)', description: 'Group table — small party', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Medium Group (9–20 guests)', description: 'Pre-order menu required', durationMinutes: 150, priceFrom: null, isActive: true },
        { name: 'Large Group (21–50 guests)', description: 'Set menu + deposit required', durationMinutes: 180, priceFrom: null, isActive: true },
        { name: 'Corporate Lunch / Business Dining', description: 'Professional group lunch', durationMinutes: 90, priceFrom: null, isActive: true },
        { name: 'Corporate Dinner', description: 'Business evening dinner', durationMinutes: 150, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Special Occasions',
      description: 'Celebrations and milestone events',
      services: [
        { name: 'Birthday Celebration', description: 'Cake, balloon, or decoration add-on', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Anniversary Dinner', description: 'Champagne or special menu add-on', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: "Valentine's Dinner", description: 'Romantic special occasion dinner', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: "Mother's / Father's Day Lunch", description: 'Seasonal occasion lunch', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Christmas Party Dinner', description: 'Festive group Christmas dinner', durationMinutes: 150, priceFrom: null, isActive: true },
        { name: "New Year's Eve Dinner", description: 'Special NYE seated dinner event', durationMinutes: 240, priceFrom: null, isActive: true },
        { name: 'Wedding Rehearsal Dinner', description: 'Pre-wedding party dinner', durationMinutes: 150, priceFrom: null, isActive: true },
        { name: 'Baby Shower / Gender Reveal', description: '', durationMinutes: 120, priceFrom: null, isActive: true },
        { name: 'Hen / Stag Party Dinner', description: '', durationMinutes: 150, priceFrom: null, isActive: true },
      ],
    },
    {
      name: 'Events & Experiences',
      description: 'Participatory and hosted experience bookings',
      services: [
        { name: 'Cooking Class', description: 'Hands-on chef-led cooking session', durationMinutes: 180, priceFrom: 75, isActive: true },
        { name: 'Cocktail Making Class', description: 'Bartender-led cocktail experience', durationMinutes: 120, priceFrom: 55, isActive: true },
        { name: 'Wine Tasting Evening', description: 'Guided wine tasting with sommelier', durationMinutes: 120, priceFrom: 45, isActive: true },
        { name: 'Gin / Whisky Tasting', description: 'Spirits tasting experience', durationMinutes: 90, priceFrom: 40, isActive: true },
        { name: 'Cheese & Wine Evening', description: 'Paired cheese and wine experience', durationMinutes: 120, priceFrom: 45, isActive: true },
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
