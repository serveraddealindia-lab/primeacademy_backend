import { Router } from 'express';
import * as studentController from '../controllers/student.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// POST /students/enroll → Create student user, profile, and enrollment in one call
router.post(
  '/enroll',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentController.completeEnrollment
);

// POST /students/create-dummy → Create a dummy student with all details (for testing)
router.post(
  '/create-dummy',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentController.createDummyStudent
);

export default router;

