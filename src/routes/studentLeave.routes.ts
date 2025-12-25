import { Router } from 'express';
import * as studentLeaveController from '../controllers/studentLeave.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /api/student-leaves - Create leave request
router.post(
  '/',
  verifyTokenMiddleware,
  studentLeaveController.createLeave
);

// GET /api/student-leaves - Get all leave requests
router.get(
  '/',
  verifyTokenMiddleware,
  studentLeaveController.getLeaves
);

// POST /api/student-leaves/:id/approve - Approve/Reject leave (Admin/SuperAdmin only)
router.post(
  '/:id/approve',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentLeaveController.approveLeave
);

export default router;






