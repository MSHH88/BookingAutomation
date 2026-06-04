/**
 * AI router — Phase 8.2
 *
 * | Method | Path                              | Auth  | Feature Flag          | Description                         |
 * |--------|-----------------------------------|-------|-----------------------|-------------------------------------|
 * | GET    | /api/ai/suggestions               | ADMIN | AI_SUGGESTIONS_ENABLED| List AI suggestions (paginated)     |
 * | GET    | /api/ai/suggestions/:id           | ADMIN | AI_SUGGESTIONS_ENABLED| Get a single suggestion             |
 * | PATCH  | /api/ai/suggestions/:id           | ADMIN | AI_SUGGESTIONS_ENABLED| Update message / status             |
 * | POST   | /api/ai/suggestions/:id/send      | ADMIN | AI_SUGGESTIONS_ENABLED| Send suggestion to customer         |
 * | POST   | /api/ai/suggestions/:id/dismiss   | ADMIN | AI_SUGGESTIONS_ENABLED| Dismiss suggestion                  |
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl          from './ai.controller';
import {
  listAISuggestionsSchema,
  aiSuggestionIdSchema,
  updateAISuggestionSchema,
} from './ai.schema';

const router = Router();

// All routes require ADMIN + feature flag
router.use(requireAuth, requireRole('ADMIN'), requireFeature('AI_SUGGESTIONS_ENABLED'));

/**
 * GET /api/ai/suggestions
 * List AI suggestions for this tenant (paginated, filterable).
 */
router.get(
  '/suggestions',
  validate(listAISuggestionsSchema),
  ctrl.listSuggestions,
);

/**
 * POST /api/ai/suggestions/:id/send
 * Send suggestion to the customer. Must be before /:id to avoid conflict.
 */
router.post(
  '/suggestions/:id/send',
  validate(aiSuggestionIdSchema),
  ctrl.sendSuggestion,
);

/**
 * POST /api/ai/suggestions/:id/dismiss
 * Dismiss a suggestion. Must be before /:id to avoid conflict.
 */
router.post(
  '/suggestions/:id/dismiss',
  validate(aiSuggestionIdSchema),
  ctrl.dismissSuggestion,
);

/**
 * GET /api/ai/suggestions/:id
 * Get a single suggestion.
 */
router.get(
  '/suggestions/:id',
  validate(aiSuggestionIdSchema),
  ctrl.getSuggestion,
);

/**
 * PATCH /api/ai/suggestions/:id
 * Update suggestion message or status.
 */
router.patch(
  '/suggestions/:id',
  validate(updateAISuggestionSchema),
  ctrl.updateSuggestion,
);

export { router as aiRoutes };
