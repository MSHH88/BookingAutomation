/**
 * Artists controller — one handler per endpoint.
 *
 * HTTP concerns only: parse request, call service, send response.
 * All business logic lives in artists.service.ts.
 */
import { Request, Response, NextFunction } from 'express';
import * as artistsService from './artists.service';
import { success, paginated } from '../../utils/apiResponse';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import type {
  CreateArtistBody,
  UpdateArtistBody,
  AssignStylesBody,
  SetAvailabilityBody,
  SetArtistServicesBody,
  ListArtistsQuery,
} from './artists.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAdmin(req: Request): boolean {
  return req.user?.role === 'ADMIN';
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/artists
 * Public: lists active artists.
 * Admin (with valid JWT + ADMIN role): can also filter by isActive.
 */
export async function listArtists(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as ListArtistsQuery;
    const result = await artistsService.listArtists(query, isAdmin(req));
    res.json(paginated(result.data, result.meta));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/artists/:slug
 * Returns a single artist by slug with portfolio + styles.
 * Public: only active artists.
 */
export async function getArtistBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { slug } = req.params as { slug: string };
    const artist = await artistsService.getArtistBySlug(slug, isAdmin(req));
    res.json(success(artist));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/artists
 * ADMIN only. Creates a User (role=ARTIST) + Artist profile.
 */
export async function createArtist(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as CreateArtistBody;
    const artist = await artistsService.createArtist(body);
    res.status(201).json(success(artist));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/artists/:id
 * ADMIN or own profile. Updates artist fields.
 */
export async function updateArtist(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body = req.body as UpdateArtistBody;
    const artist = await artistsService.updateArtist(
      id,
      body,
      req.user!.id,
      isAdmin(req),
    );
    res.json(success(artist));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/artists/:id
 * ADMIN only. Soft-deletes (isActive = false).
 */
export async function deleteArtist(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await artistsService.deleteArtist(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/artists/:id/styles
 * ADMIN or own. Replaces all style assignments.
 */
export async function assignStyles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body = req.body as AssignStylesBody;
    await artistsService.assignStyles(id, body, req.user!.id, isAdmin(req));
    res.json(success({ message: 'Styles updated successfully' }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/artists/:id/availability
 * Public. Returns active working-hours windows for the artist.
 */
export async function getAvailability(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const availability = await artistsService.getAvailability(id);
    res.json(success(availability));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/artists/:id/availability
 * ADMIN or own. Replaces all availability windows for the artist.
 */
export async function setAvailability(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body = req.body as SetAvailabilityBody;
    const availability = await artistsService.setAvailability(
      id,
      body,
      req.user!.id,
      isAdmin(req),
    );
    res.json(success(availability));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/artists/:id/services
 * ADMIN only. Atomically replaces the full set of services an artist offers,
 * with optional per-artist price overrides.
 */
export async function setArtistServices(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const body = req.body as SetArtistServicesBody;
    const services = await artistsService.setArtistServices(id, body);
    res.json(success(services));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/artists/me/schedule
 * Artist: returns own daily or weekly booking schedule.
 * Query: ?date=YYYY-MM-DD (optional) — single day; omit for 7-day window.
 */
export async function getMySchedule(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Resolve artistId from the JWT user
    const userId = req.user!.id;
    const date   = (req.query as { date?: string }).date;

    // Look up the Artist row for the authenticated user
    const artist = await prisma.artist.findUnique({
      where:  { userId },
      select: { id: true, tenantId: true },
    });

    if (!artist) {
      throw new AppError(404, 'NOT_FOUND', 'Artist profile not found');
    }

    const schedule = await artistsService.getMySchedule(artist.id, date);
    res.json(success(schedule));
  } catch (err) {
    next(err);
  }
}
