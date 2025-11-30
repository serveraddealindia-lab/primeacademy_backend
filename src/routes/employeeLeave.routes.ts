import { Router } from 'express';
import * as employeeLeaveController from '../controllers/employeeLeave.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /api/employee-leaves - Create leave request
router.post(
  '/',
  verifyTokenMiddleware,
  employeeLeaveController.createLeave
);

// GET /api/employee-leaves - Get all leave requests
router.get(
  '/',
  verifyTokenMiddleware,
  employeeLeaveController.getLeaves
);

// POST /api/employee-leaves/:id/approve - Approve/Reject leave (Admin/SuperAdmin only)
router.post(
  '/:id/approve',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  employeeLeaveController.approveLeave
);

export default router;









