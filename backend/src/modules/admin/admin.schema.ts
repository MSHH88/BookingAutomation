/**
 * Zod schemas for the Admin Panel API — Step 1.26
 *
 * All endpoints sit under /api/admin and require the ADMIN role.
 * Covers four resource areas:
 *
 *   Studio Settings
 *     GET    /api/admin/settings                 — fetch studio settings
 *     PATCH  /api/admin/settings                 — update studio settings
 *
 *   Feature Flags
 *     GET    /api/admin/feature-flags            — list all feature flags
 *     PATCH  /api/admin/feature-flags/:key       — toggle / update a flag
 *
 *   User Management
 *     GET    /api/admin/users                    — list users (paginated)
 *     PATCH  /api/admin/users/:id                — update user (role / isActive / name)
 *
 *   Artist Management
 *     GET    /api/admin/artists                  — list artists (paginated)
 *     PATCH  /api/admin/artists/:id              — update artist (isActive / commission)
 */
import { z } from 'zod';

// ─── Studio Settings ──────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/settings
 *
 * All fields are optional — only supplied fields are updated.
 * At least one field is required.
 */
export const updateSettingsSchema = z.object({
  body: z
    .object({
      /** Studio display name shown on all communications. */
      studioName: z.string().trim().min(1).max(200).optional(),

      /** Contact email for outgoing notifications. */
      studioEmail: z.string().email('studioEmail must be a valid email').nullable().optional(),

      /** Studio phone number. */
      studioPhone: z.string().trim().max(30).nullable().optional(),

      /** Full studio address. */
      studioAddress: z.string().trim().max(500).nullable().optional(),

      /**
       * IANA timezone identifier, e.g. "Europe/London", "America/New_York".
       * Used for slot display and appointment emails.
       */
      studioTimezone: z.string().trim().max(100).optional(),

      /**
       * ISO 4217 currency code, e.g. "GBP", "EUR", "USD".
       * Stored in upper-case; displayed on invoices and payment screens.
       */
      currency: z
        .string()
        .trim()
        .length(3, 'currency must be a 3-letter ISO 4217 code')
        .toUpperCase()
        .optional(),

      /**
       * Deposit as a percentage of the total booking amount (0–100).
       * Superseded by depositFixedAmount when both are set (business logic
       * in the booking service).
       */
      depositPercentage: z.number().min(0).max(100).optional(),

      /** Fixed deposit amount in studio currency. null = use percentage. */
      depositFixedAmount: z.number().min(0).nullable().optional(),

      /**
       * Minimum hours before an appointment that a customer may cancel/
       * reschedule without a fee.  0 = no window restriction.
       */
      cancellationHours: z.number().int().min(0).optional(),

      /**
       * Cancellation fee as a percentage of the booking total (0–100).
       * Applied when a customer cancels within the cancellation window.
       */
      cancellationFeePercent: z.number().min(0).max(100).optional(),

      /** Human-readable cancellation policy displayed to customers. */
      cancellationPolicyText: z.string().trim().max(2000).nullable().optional(),

      /** Maximum number of covers / bookings per time slot (for restaurants). */
      maxCoversPerSlot: z.number().int().min(1).nullable().optional(),

      /** Granularity for availability slots in minutes (5–120). */
      slotIntervalMinutes: z.number().int().min(5).max(120).optional(),

      /** Full URL of the Google Business review page. */
      googleReviewUrl: z
        .string()
        .url('googleReviewUrl must be a valid URL')
        .nullable()
        .optional(),

      /** Public URL of the customer-facing online booking page. */
      bookingPageUrl: z
        .string()
        .url('bookingPageUrl must be a valid URL')
        .nullable()
        .optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: 'At least one settings field must be provided',
    }),
});

export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>['body'];

// ─── Feature Flags ────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/feature-flags/:key
 *
 * Toggles or sets a feature flag by its unique key.
 */
export const updateFeatureFlagSchema = z.object({
  params: z.object({
    key: z.string().min(1, 'key is required'),
  }),
  body: z.object({
    isEnabled: z.boolean({ required_error: 'isEnabled is required' }),
  }),
});

export type UpdateFeatureFlagParams = z.infer<typeof updateFeatureFlagSchema>['params'];
export type UpdateFeatureFlagBody   = z.infer<typeof updateFeatureFlagSchema>['body'];

// ─── User Management ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 *
 * Paginated list of all users.  Filterable by role, isActive status, and
 * a free-text search across name and email.
 */
export const listUsersSchema = z.object({
  query: z.object({
    page:     z.string().optional(),
    limit:    z.string().optional(),

    /** Filter by exact role. */
    role:     z.enum(['SUPER_ADMIN', 'ADMIN', 'ARTIST', 'CUSTOMER']).optional(),

    /** Filter by account active state. */
    isActive: z.enum(['true', 'false']).optional(),

    /** Case-insensitive search across name and email. */
    search:   z.string().trim().max(100).optional(),
  }),
});

export type ListUsersQuery = z.infer<typeof listUsersSchema>['query'];

/**
 * PATCH /api/admin/users/:id
 *
 * Updates a user's role, active state, or display name.
 * At least one field is required.
 */
export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z
    .object({
      /** Promote or demote the user's access role. ADMIN users cannot assign SUPER_ADMIN via this endpoint. */
      role:     z.enum(['ADMIN', 'ARTIST', 'CUSTOMER']).optional(),

      /** Deactivate (false) or reactivate (true) the account. */
      isActive: z.boolean().optional(),

      /** Update display name. */
      name:     z.string().trim().min(1).max(200).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: 'At least one field (role, isActive, or name) must be provided',
    }),
});

export type UpdateUserParams = z.infer<typeof updateUserSchema>['params'];
export type UpdateUserBody   = z.infer<typeof updateUserSchema>['body'];

// ─── Artist Management ────────────────────────────────────────────────────────

/**
 * GET /api/admin/artists
 *
 * Paginated list of all artists with their user profile and commission info.
 * Filterable by active state.
 */
export const listArtistsAdminSchema = z.object({
  query: z.object({
    page:     z.string().optional(),
    limit:    z.string().optional(),

    /** Filter by artist active state. */
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

export type ListArtistsAdminQuery = z.infer<typeof listArtistsAdminSchema>['query'];

/**
 * PATCH /api/admin/artists/:id
 *
 * Updates an artist's active state or commission configuration.
 * At least one field is required.
 */
export const updateArtistAdminSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z
    .object({
      /** Activate or deactivate the artist profile. */
      isActive: z.boolean().optional(),

      /**
       * Commission rate (0–100).  null = remove commission override and use
       * the system default.
       */
      commissionRate: z.number().min(0).max(100).nullable().optional(),

      /**
       * How the commission rate is interpreted.
       * PERCENTAGE: commissionRate is treated as a percentage of revenue.
       * FLAT:        commissionRate is a fixed currency amount per booking.
       * null: remove commission type when clearing the commission.
       */
      commissionType: z.enum(['PERCENTAGE', 'FLAT']).nullable().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message:
        'At least one field (isActive, commissionRate, or commissionType) must be provided',
    }),
});

export type UpdateArtistAdminParams = z.infer<typeof updateArtistAdminSchema>['params'];
export type UpdateArtistAdminBody   = z.infer<typeof updateArtistAdminSchema>['body'];
