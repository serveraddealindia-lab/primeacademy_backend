import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// GET /api/users - Get all users (Admin/SuperAdmin only)
router.get(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  userController.getAllUsers
);

// PUT /api/users/:id/student-profile - Update student profile (must be before /:id)
router.put(
  '/:id/student-profile',
  verifyTokenMiddleware,
  userController.updateStudentProfile
);

// PUT /api/users/:id/faculty-profile - Update faculty profile (must be before /:id)
router.put(
  '/:id/faculty-profile',
  verifyTokenMiddleware,
  userController.updateFacultyProfile
);

// PUT /api/users/:id/employee-profile - Update employee profile (must be before /:id)
router.put(
  '/:id/employee-profile',
  verifyTokenMiddleware,
  userController.updateEmployeeProfile
);

// POST /api/users/:id/login-as → login as user (superadmin only) - Must be before /:id route
router.post(
  '/:id/login-as',
  verifyTokenMiddleware,
  checkRole(UserRole.SUPERADMIN),
  userController.loginAsUser
);

// GET /api/users/:id - Get user by ID
router.get(
  '/:id',
  verifyTokenMiddleware,
  userController.getUserById
);

// PUT /api/users/:id - Update user
router.put(
  '/:id',
  verifyTokenMiddleware,
  userController.updateUser
);

// DELETE /api/users/:id - Delete user (Admin/SuperAdmin only)
router.delete(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  userController.deleteUser
);

export default router;

