import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// GET /api/employees/:userId - Get employee profile
router.get(
  '/:userId',
  verifyTokenMiddleware,
  employeeController.getEmployeeProfile
);

// POST /api/employees - Create employee profile (Admin/SuperAdmin only)
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  employeeController.createEmployeeProfile
);

export default router;




