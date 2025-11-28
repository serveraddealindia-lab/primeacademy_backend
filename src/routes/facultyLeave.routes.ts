import { Router } from 'express';
import * as facultyLeaveController from '../controllers/facultyLeave.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /api/faculty-leaves - Create leave request
router.post(
  '/',
  verifyTokenMiddleware,
  facultyLeaveController.createLeave
);

// GET /api/faculty-leaves - Get all leave requests
router.get(
  '/',
  verifyTokenMiddleware,
  facultyLeaveController.getLeaves
);

// POST /api/faculty-leaves/:id/approve - Approve/Reject leave (Admin/SuperAdmin only)
router.post(
  '/:id/approve',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  facultyLeaveController.approveLeave
);

export default router;







