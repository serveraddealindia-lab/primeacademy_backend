import { Router } from 'express';
import * as biometricController from '../modules/biometric/biometric.controller';
import * as eBioServerController from '../modules/biometric/eBioServer.controller';
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

// eBioServer Integration Routes

// POST /api/biometric/eBioServer/webhook - Handle webhook from eBioServer (Public endpoint)
router.post('/eBioServer/webhook', eBioServerController.handleWebhook as any);

// POST /api/biometric/eBioServer/device - Register a new eBioServer device (Admin/SuperAdmin only)
router.post(
  '/eBioServer/device',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  eBioServerController.registerDevice
);

// POST /api/biometric/eBioServer/device/:id/sync-templates - Sync employee templates (Admin/SuperAdmin only)
router.post(
  '/eBioServer/device/:id/sync-templates',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  eBioServerController.syncTemplates as any
);

// POST /api/biometric/eBioServer/device/:id/push-employees - Push employees to device (Admin/SuperAdmin only)
router.post(
  '/eBioServer/device/:id/push-employees',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  eBioServerController.pushEmployees as any
);

// GET /api/biometric/eBioServer/device/:id/employees - Fetch employees from device (Admin/SuperAdmin only)
router.get(
  '/eBioServer/device/:id/employees',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  eBioServerController.getEmployees as any
);

export default router;




