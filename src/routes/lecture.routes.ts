import { Router } from 'express';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import * as lectureController from '../controllers/lecture.controller';

const router = Router();

const requireFaculty = [verifyTokenMiddleware, checkRole(UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN)];

// PATCH /api/lectures/add-delay-reason
router.patch('/add-delay-reason', requireFaculty, lectureController.addDelayReason);

export default router;

