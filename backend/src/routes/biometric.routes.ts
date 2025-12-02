import { Router } from 'express';
import * as biometricController from '../modules/biometric/biometric.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /api/biometric/register-device - Register a new device (Admin/SuperAdmin only)
router.post(
  '/register-device',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  biometricController.registerDevice
);

// GET /api/biometric/devices - Get all devices (Admin/SuperAdmin only)
router.get(
  '/devices',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  biometricController.getDevices
);

// POST /api/biometric/device/:id/test-connection - Test device connection (Admin/SuperAdmin only)
router.post(
  '/device/:id/test-connection',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  biometricController.testConnection
);

// POST /api/biometric/device/:id/sync-now - Manually sync device (Admin/SuperAdmin only)
router.post(
  '/device/:id/sync-now',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  biometricController.syncNow
);

// PUT /api/biometric/device/:id - Update device (Admin/SuperAdmin only)
router.put(
  '/device/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  biometricController.updateDevice
);

// DELETE /api/biometric/device/:id - Delete device (SuperAdmin only)
router.delete(
  '/device/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.SUPERADMIN),
  biometricController.deleteDevice
);

// POST /api/biometric/push-log - Receive log from push-api device (Public endpoint, but validates device auth)
// Note: This endpoint should be accessible without user authentication, but validates device credentials
router.post('/push-log', biometricController.pushLog as any);

export default router;




