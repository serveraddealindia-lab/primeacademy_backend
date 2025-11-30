import { Router } from 'express';
import * as orientationController from '../controllers/orientation.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication - allow all authenticated users (students, admins, etc.)
// Students can view and accept their own orientation
// Admins can view and manage any student's orientation
router.get('/:studentId', requireAuth([UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPERADMIN]), orientationController.getStudentOrientation);
router.post('/:studentId/accept', requireAuth([UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPERADMIN]), orientationController.acceptOrientation);
router.get('/bulk/status', requireAuth([UserRole.ADMIN, UserRole.SUPERADMIN]), orientationController.getBulkOrientationStatus);

export default router;

