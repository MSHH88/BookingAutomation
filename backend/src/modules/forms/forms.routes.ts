/**
 * Intake / Consent Forms router — Phase 3.2
 *
 * | Method | Path                               | Auth   | Description                    |
 * |--------|------------------------------------|--------|--------------------------------|
 * | GET    | /api/forms                         | ADMIN  | List all forms for tenant      |
 * | GET    | /api/forms/:id                     | ADMIN  | Get form by ID                 |
 * | POST   | /api/forms                         | ADMIN  | Create a new form              |
 * | PATCH  | /api/forms/:id                     | ADMIN  | Update a form                  |
 * | DELETE | /api/forms/:id                     | ADMIN  | Deactivate a form              |
 * | GET    | /api/forms/:id/responses           | ADMIN  | List responses for a form      |
 * | GET    | /api/forms/public/:bookingToken    | Public | Get form for booking           |
 * | POST   | /api/forms/public/:bookingToken    | Public | Submit form response           |
 *
 * Admin routes require authentication + ADMIN role + INTAKE_FORMS_ENABLED flag.
 * Public routes have no auth requirement.
 */
import { Router } from 'express';

import { requireAuth }    from '../../middleware/auth';
import { requireRole }    from '../../middleware/requireRole';
import { requireFeature } from '../../middleware/requireFeature';
import { validate }       from '../../middleware/validate';
import * as ctrl from './forms.controller';
import {
  formByIdSchema,
  createFormSchema,
  updateFormSchema,
  listFormResponsesSchema,
  publicFormSchema,
  submitPublicFormSchema,
} from './forms.schema';

const router = Router();

// ── Public routes (no auth) ───────────────────────────────────────────────────

router.get(
  '/public/:bookingToken',
  validate(publicFormSchema),
  ctrl.getPublicForm,
);

router.post(
  '/public/:bookingToken',
  validate(submitPublicFormSchema),
  ctrl.submitPublicForm,
);

// ── Admin routes (auth + ADMIN + feature flag) ────────────────────────────────

router.use(requireAuth);
router.use(requireFeature('INTAKE_FORMS_ENABLED'));

router.get(
  '/',
  requireRole('ADMIN'),
  ctrl.listForms,
);

router.get(
  '/:id',
  requireRole('ADMIN'),
  validate(formByIdSchema),
  ctrl.getFormById,
);

router.post(
  '/',
  requireRole('ADMIN'),
  validate(createFormSchema),
  ctrl.createForm,
);

router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate(updateFormSchema),
  ctrl.updateForm,
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  validate(formByIdSchema),
  ctrl.deleteForm,
);

router.get(
  '/:id/responses',
  requireRole('ADMIN'),
  validate(listFormResponsesSchema),
  ctrl.listFormResponses,
);

export { router as formsRoutes };
