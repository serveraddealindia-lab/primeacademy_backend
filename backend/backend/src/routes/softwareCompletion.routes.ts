import { Router } from 'express';
import * as softwareCompletionController from '../controllers/softwareCompletion.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /api/software-completions - Create completion record (Faculty/Admin/SuperAdmin only)
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN),
  softwareCompletionController.createCompletion
);

// GET /api/software-completions - Get all completion records
router.get(
  '/',
  verifyTokenMiddleware,
  softwareCompletionController.getCompletions
);

// PATCH /api/software-completions/:id - Update completion status (Faculty/Admin/SuperAdmin only)
router.patch(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN),
  softwareCompletionController.updateCompletion
);

export default router;






