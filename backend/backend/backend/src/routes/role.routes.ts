import { Router } from 'express';
import * as roleController from '../controllers/role.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /api/roles - Create role (SuperAdmin only)
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.SUPERADMIN),
  roleController.createRole
);

// GET /api/roles - Get all roles (Admin/SuperAdmin only)
router.get(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  roleController.getRoles
);

// GET /api/roles/:id - Get single role (Admin/SuperAdmin only)
router.get(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  roleController.getRole
);

// PUT /api/roles/:id - Update role (SuperAdmin only)
router.put(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.SUPERADMIN),
  roleController.updateRole
);

// DELETE /api/roles/:id - Delete role (SuperAdmin only)
router.delete(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.SUPERADMIN),
  roleController.deleteRole
);

// User role assignment routes
// POST /api/roles/users/:id/assign - Assign role to user
router.post(
  '/users/:id/assign',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  roleController.assignRoleToUser
);

// DELETE /api/roles/users/:id/roles/:roleId - Unassign role from user
router.delete(
  '/users/:id/roles/:roleId',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  roleController.unassignRoleFromUser
);

// GET /api/roles/users/:id/roles - Get user roles
router.get(
  '/users/:id/roles',
  verifyTokenMiddleware,
  roleController.getUserRoles
);

export default router;

