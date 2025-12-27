import { Router } from 'express';
import * as batchExtensionController from '../controllers/batchExtension.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /api/batch-extensions - Create extension request (Admin/SuperAdmin only)
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  batchExtensionController.createExtension
);

// GET /api/batch-extensions - Get all extension requests
router.get(
  '/',
  verifyTokenMiddleware,
  batchExtensionController.getExtensions
);

// POST /api/batch-extensions/:id/approve - Approve/Reject extension
router.post(
  '/:id/approve',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  batchExtensionController.approveExtension
);

export default router;






