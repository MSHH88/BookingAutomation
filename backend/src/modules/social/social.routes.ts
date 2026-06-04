/**
 * Social booking link router — Phase 2.4
 *
 * | Method | Path                       | Auth   | Feature Flag          | Description                  |
 * |--------|----------------------------|--------|-----------------------|------------------------------|
 * | GET    | /api/social/booking-link   | ADMIN  | SOCIAL_BOOKING_ENABLED| Generate shareable URL       |
 * | GET    | /api/social/sources        | ADMIN  | SOCIAL_BOOKING_ENABLED| Booking source statistics    |
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './social.controller';
import { getBookingLinkSchema, getBookingSourcesSchema } from './social.schema';

const router = Router();

router.use(requireAuth);
router.use(requireFeature('SOCIAL_BOOKING_ENABLED'));

router.get(
  '/booking-link',
  requireRole('ADMIN'),
  validate(getBookingLinkSchema),
  ctrl.getBookingLink,
);

router.get(
  '/sources',
  requireRole('ADMIN'),
  validate(getBookingSourcesSchema),
  ctrl.getBookingSources,
);

export { router as socialRoutes };
