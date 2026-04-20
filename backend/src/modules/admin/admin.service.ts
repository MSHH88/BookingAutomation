/**
 * Admin Panel service — Step 1.26
 *
 * All business logic for the /api/admin endpoints.
 *
 * Security contract:
 *  - Every exported function may only be called from admin-protected routes.
 *  - The router enforces ADMIN role via requireRole('ADMIN') before any of
 *    these functions are reached.
 *
 * Endpoints covered:
 *   getStudioSettings       — fetch current studio settings (null if not seeded)
 *   updateStudioSettings    — upsert studio settings; studioName required on create
 *   listFeatureFlags        — return all feature flags ordered alphabetically
 *   updateFeatureFlag       — toggle/set a single feature flag by its unique key
 *   listUsers               — paginated user list with role/isActive/search filters
 *   updateUser              — update role, isActive, or name of a user
 *   listArtistsAdmin        — paginated artist list with isActive filter
 *   updateArtistAdmin       — update isActive or commission config of an artist
 *
 * Data ownership / invariants:
 *  - StudioSettings is scoped by tenantId (@unique).  We use findUnique by
 *    tenantId; a null tenantId is rejected with 403 to prevent cross-tenant reads.
 *  - FeatureFlag rows are keyed by `key` (unique).  update() throws P2025 which
 *    is caught here and re-thrown as AppError 404 for a clean API response.
 *  - User and Artist updates first fetch the record so the 404 message is
 *    resource-specific rather than the generic global handler message.
 */
import { Prisma } from '@prisma/client';

import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { bumpRbacVersion, forgotPassword } from '../auth/auth.service';
import { paginate, PaginatedResult } from '../../utils/paginate';
import type {
  UpdateSettingsBody,
  UpdateFeatureFlagBody,
  ListUsersQuery,
  UpdateUserBody,
  ListArtistsAdminQuery,
  UpdateArtistAdminBody,
} from './admin.schema';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

/** Full studio settings object returned to the admin. */
const settingsSelect = {
  id:                     true,
  studioName:             true,
  studioEmail:            true,
  studioPhone:            true,
  studioAddress:          true,
  studioTimezone:         true,
  currency:               true,
  depositPercentage:      true,
  depositFixedAmount:     true,
  cancellationHours:      true,
  cancellationFeePercent: true,
  cancellationPolicyText: true,
  maxCoversPerSlot:       true,
  slotIntervalMinutes:    true,
  googleReviewUrl:        true,
  bookingPageUrl:         true,
  updatedAt:              true,
} satisfies Prisma.StudioSettingsSelect;

type StudioSettingsResult = Prisma.StudioSettingsGetPayload<{
  select: typeof settingsSelect;
}>;

/** Feature flag row returned to the admin. */
const featureFlagSelect = {
  id:          true,
  key:         true,
  label:       true,
  description: true,
  isEnabled:   true,
  updatedAt:   true,
} satisfies Prisma.FeatureFlagSelect;

type FeatureFlagResult = Prisma.FeatureFlagGetPayload<{
  select: typeof featureFlagSelect;
}>;

/** User summary for the admin user list. */
const userListSelect = {
  id:               true,
  email:            true,
  name:             true,
  phone:            true,
  role:             true,
  isActive:         true,
  loyaltyBalance:   true,
  marketingConsent: true,
  createdAt:        true,
  updatedAt:        true,
} satisfies Prisma.UserSelect;

type UserListItem = Prisma.UserGetPayload<{ select: typeof userListSelect }>;

/** Artist summary for the admin artist list. */
const artistListSelect = {
  id:             true,
  slug:           true,
  isActive:       true,
  commissionRate: true,
  commissionType: true,
  bufferMinutes:  true,
  slotDuration:   true,
  user: {
    select: {
      id:    true,
      name:  true,
      email: true,
      phone: true,
    },
  },
} satisfies Prisma.ArtistSelect;

type ArtistListItem = Prisma.ArtistGetPayload<{ select: typeof artistListSelect }>;

// ─── Studio Settings ──────────────────────────────────────────────────────────

/**
 * Returns the studio settings row for the given tenant, or null if the studio
 * has not been configured yet (e.g. fresh deployment before the seed has run).
 *
 * @throws AppError 403 — when tenantId is null (SUPER_ADMIN without tenant context).
 */
export async function getStudioSettings(tenantId: string | null): Promise<StudioSettingsResult | null> {
  if (tenantId === null) {
    throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
  }
  return prisma.studioSettings.findUnique({ where: { tenantId }, select: settingsSelect });
}

/**
 * Updates the studio settings row for the given tenant.  If no row exists yet
 * (fresh deployment), a new row is created and `studioName` is required.
 *
 * Fields not present in `body` are left unchanged when updating.
 *
 * @throws AppError 403 — when tenantId is null (SUPER_ADMIN without tenant context).
 * @throws AppError 400 — studioName required when creating for the first time.
 */
export async function updateStudioSettings(
  body:     UpdateSettingsBody,
  tenantId: string | null,
): Promise<StudioSettingsResult> {
  if (tenantId === null) {
    throw new AppError(403, 'FORBIDDEN', 'Tenant context required');
  }

  const existing = await prisma.studioSettings.findUnique({ where: { tenantId }, select: { id: true } });

  if (existing) {
    return prisma.studioSettings.update({
      where:  { id: existing.id },
      data:   body as Prisma.StudioSettingsUpdateInput,
      select: settingsSelect,
    });
  }

  // First-time setup — studioName is the only truly required field; everything
  // else has a database-level default.
  if (!body.studioName) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'studioName is required when creating studio settings for the first time',
    );
  }

  return prisma.studioSettings.create({
    data:   { ...(body as Prisma.StudioSettingsUncheckedCreateInput), tenantId },
    select: settingsSelect,
  });
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

/**
 * Returns feature flags ordered alphabetically by key.
 *
 * Scoping rules:
 *   - tenantId provided → return global rows + that tenant's override rows
 *   - tenantId null/undefined → return only global rows (SUPER_ADMIN view)
 */
export async function listFeatureFlags(tenantId?: string | null): Promise<FeatureFlagResult[]> {
  const where = tenantId
    ? { OR: [{ tenantId: null as string | null }, { tenantId }] }
    : { tenantId: null as string | null };

  return prisma.featureFlag.findMany({
    where,
    select:  featureFlagSelect,
    orderBy: { key: 'asc' },
  });
}

/**
 * Enables or disables a feature flag identified by its unique key.
 *
 * When `tenantId` is provided, a per-tenant override row is upserted —
 * creating it if it does not exist, or updating it if it does.
 * When `tenantId` is omitted (null/undefined), the global flag row is updated.
 *
 * @throws AppError 404 — global flag with the given key does not exist.
 */
export async function updateFeatureFlag(
  key:      string,
  body:     UpdateFeatureFlagBody,
  tenantId?: string | null,
): Promise<FeatureFlagResult> {
  if (tenantId) {
    // Per-tenant override: upsert so the row is created on first use
    return prisma.featureFlag.upsert({
      where:  { key_tenantId: { key, tenantId } },
      update: { isEnabled: body.isEnabled },
      create: { key, tenantId, label: key, isEnabled: body.isEnabled },
      select: featureFlagSelect,
    });
  }

  // Global flag: must already exist (seeded at startup)
  const flag = await prisma.featureFlag.findFirst({ where: { key, tenantId: null } });

  if (!flag) {
    throw new AppError(404, 'NOT_FOUND', `Feature flag "${key}" not found`);
  }

  return prisma.featureFlag.update({
    where:  { id: flag.id },
    data:   { isEnabled: body.isEnabled },
    select: featureFlagSelect,
  });
}

// ─── User Management ──────────────────────────────────────────────────────────

/**
 * Returns a paginated list of all users.
 *
 * Supports optional filters:
 *  - role     — exact role match
 *  - isActive — boolean after Zod coercion
 *  - search   — case-insensitive substring match on name OR email
 */
export async function listUsers(
  query: ListUsersQuery,
  tenantId: string | null,
): Promise<PaginatedResult<UserListItem>> {
  const where: Prisma.UserWhereInput = {};

  if (tenantId !== null) where.tenantId = tenantId;

  if (query.role) {
    where.role = query.role;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (query.search) {
    where.OR = [
      { name:  { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return paginate(
    prisma.user,
    {
      where,
      select:  userListSelect,
      orderBy: { createdAt: 'desc' },
    },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Updates a user's role, active state, or display name.
 *
 * When `body.role` is present, the caller must either be SUPER_ADMIN or have
 * `canAssignRoles === true`.  This prevents privilege escalation through the
 * admin user management endpoint.
 *
 * @throws AppError 404 — user with the given id does not exist.
 * @throws AppError 403 — cross-tenant access or missing canAssignRoles permission.
 */
export async function updateUser(
  id:       string,
  body:     UpdateUserBody,
  tenantId: string | null,
  callerRole: string = 'ADMIN',
  callerCanAssignRoles: boolean = false,
): Promise<UserListItem> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  if (tenantId !== null && user.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'User not in your tenant');
  }

  // Guard: role changes require SUPER_ADMIN or canAssignRoles permission
  if (body.role !== undefined && callerRole !== 'SUPER_ADMIN' && !callerCanAssignRoles) {
    throw new AppError(403, 'FORBIDDEN', 'Missing permission: canAssignRoles');
  }

  const data: Prisma.UserUpdateInput = {};
  if (body.role     !== undefined) data.role     = body.role;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.name     !== undefined) data.name     = body.name;

  const updated = await prisma.user.update({
    where:  { id },
    data,
    select: userListSelect,
  });

  // Invalidate outstanding access tokens when RBAC-relevant fields changed.
  // BUG 23: also bump on isActive changes so deactivated users cannot continue
  // using their existing access tokens until the 15-minute expiry.
  if (body.role !== undefined || body.isActive !== undefined) {
    await bumpRbacVersion(id);
  }

  return updated;
}

/**
 * BUG 24: Sends a password reset link to the user identified by `id`.
 *
 * SUPER_ADMIN-only access-recovery utility. Looks up the user by id (404 if
 * missing) and re-uses the existing `forgotPassword` flow on the user's email
 * so a reset token is generated and the password-reset email is enqueued.
 *
 * Does not return the reset token — the link is delivered exclusively via the
 * standard reset-email channel.
 *
 * @throws AppError 404 — user with the given id does not exist.
 */
export async function sendPasswordResetLinkForUserId(id: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  // Reuse existing self-service flow: same token generation, single-use
  // semantics, mailer enqueue. forgotPassword silently no-ops for inactive
  // accounts, which matches the desired behaviour here.
  await forgotPassword(user.email);
}

// ─── Artist Management ────────────────────────────────────────────────────────

/**
 * Returns a paginated list of artists with their user profile and commission.
 *
 * Supports optional filter:
 *  - isActive — boolean after Zod coercion
 */
export async function listArtistsAdmin(
  query:    ListArtistsAdminQuery,
  tenantId: string | null,
): Promise<PaginatedResult<ArtistListItem>> {
  const where: Prisma.ArtistWhereInput = {};

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (tenantId !== null) {
    where.tenantId = tenantId;
  }

  return paginate(
    prisma.artist,
    {
      where,
      select:  artistListSelect,
      orderBy: { user: { name: 'asc' } },
    },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Updates an artist's active state or commission configuration.
 *
 * @throws AppError 404 — artist with the given id does not exist.
 */
export async function updateArtistAdmin(
  id:       string,
  body:     UpdateArtistAdminBody,
  tenantId: string | null,
): Promise<ArtistListItem> {
  const artist = await prisma.artist.findUnique({ where: { id }, include: { user: { select: { tenantId: true } } } });

  if (!artist) {
    throw new AppError(404, 'NOT_FOUND', 'Artist not found');
  }

  if (tenantId !== null && artist.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', 'Artist not in your tenant');
  }

  const data: Prisma.ArtistUpdateInput = {};
  if (body.isActive        !== undefined) data.isActive        = body.isActive;
  if (body.commissionRate  !== undefined) data.commissionRate  = body.commissionRate;
  if (body.commissionType  !== undefined) data.commissionType  = body.commissionType;

  return prisma.artist.update({
    where:  { id },
    data,
    select: artistListSelect,
  });
}
