/**
 * Styles service — all business logic for style/specialty management.
 *
 * Responsibilities:
 *  - List active (or all) styles with pagination
 *  - Fetch a single style by ID
 *  - Create a new style
 *  - Update an existing style
 *  - Soft-delete (isActive = false)
 *
 * The underlying Prisma model is `TattooStyle` (@@map("tattoo_styles")).
 * It is used generically for all 6 business types — the UI term ("Tattoo
 * Styles", "Hair Styles", etc.) is resolved by the LabelKey system.
 */
import type { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { paginate } from '../../utils/paginate';
import type {
  CreateStyleBody,
  UpdateStyleBody,
  ListStylesQuery,
} from './styles.schema';

// ─── Prisma select shape ──────────────────────────────────────────────────────

const styleSelect = {
  id: true,
  name: true,
  description: true,
  exampleImageUrl: true,
  isActive: true,
} as const;

// ─── Inferred return types ────────────────────────────────────────────────────

export type StyleRecord = Prisma.TattooStyleGetPayload<{ select: typeof styleSelect }>;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List styles with pagination.
 *
 * Public callers get only active styles by default.
 * Admin callers can pass `isActive=false` to see soft-deleted styles.
 */
export async function listStyles(query: ListStylesQuery, isAdmin = false) {
  const where: Prisma.TattooStyleWhereInput = {};

  if (!isAdmin) {
    // Public: always show active styles only
    where.isActive = true;
  } else if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true';
  }

  return paginate<StyleRecord>(
    prisma.tattooStyle,
    {
      where,
      select: styleSelect,
      orderBy: { name: 'asc' },
    },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Fetch a single style by ID.
 * Public callers only get active styles; admin callers see all.
 */
export async function getStyleById(id: string, isAdmin = false) {
  const style = await prisma.tattooStyle.findUnique({
    where: { id },
    select: styleSelect,
  });

  if (!style) {
    throw new AppError(404, 'NOT_FOUND', 'Style not found');
  }

  if (!isAdmin && !style.isActive) {
    throw new AppError(404, 'NOT_FOUND', 'Style not found');
  }

  return style;
}

/**
 * Create a new style.
 * Name must be unique (enforced by DB constraint; caught and re-thrown as 409).
 */
export async function createStyle(input: CreateStyleBody) {
  const existing = await prisma.tattooStyle.findUnique({
    where: { name: input.name },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, 'CONFLICT', `A style named '${input.name}' already exists`);
  }

  return prisma.tattooStyle.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      exampleImageUrl: input.exampleImageUrl ?? null,
    },
    select: styleSelect,
  });
}

/**
 * Update a style's fields.
 * If `name` is being changed, check for uniqueness conflict first.
 */
export async function updateStyle(id: string, input: UpdateStyleBody) {
  const style = await prisma.tattooStyle.findUnique({ where: { id } });
  if (!style) throw new AppError(404, 'NOT_FOUND', 'Style not found');

  // Check name uniqueness when renaming
  if (input.name !== undefined && input.name !== style.name) {
    const clash = await prisma.tattooStyle.findUnique({
      where: { name: input.name },
      select: { id: true },
    });
    if (clash) {
      throw new AppError(409, 'CONFLICT', `A style named '${input.name}' already exists`);
    }
  }

  return prisma.tattooStyle.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.exampleImageUrl !== undefined ? { exampleImageUrl: input.exampleImageUrl } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: styleSelect,
  });
}

/**
 * Soft-delete a style (isActive = false).
 * This does NOT remove the style from the DB — existing leads that reference
 * this style will still display correctly.
 */
export async function deleteStyle(id: string) {
  const style = await prisma.tattooStyle.findUnique({ where: { id } });
  if (!style) throw new AppError(404, 'NOT_FOUND', 'Style not found');

  await prisma.tattooStyle.update({
    where: { id },
    data: { isActive: false },
  });
}
