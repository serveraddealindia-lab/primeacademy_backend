import { Router } from 'express';
import * as enrollmentController from '../controllers/enrollment.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /enrollments → Create enrollment (Admin/SuperAdmin only)
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  enrollmentController.createEnrollment
);

// GET /enrollments → Get all enrollments (with optional filters: studentId, batchId, status)
router.get('/', verifyTokenMiddleware, enrollmentController.getAllEnrollments);

// GET /enrollments/:id → Get single enrollment by ID
router.get('/:id', verifyTokenMiddleware, enrollmentController.getEnrollmentById);

// PUT /enrollments/:id → Update enrollment (Admin/SuperAdmin only)
router.put(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  enrollmentController.updateEnrollment
);

// DELETE /enrollments/:id → Delete enrollment (Admin/SuperAdmin only)
router.delete(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  enrollmentController.deleteEnrollment
);

export default router;





