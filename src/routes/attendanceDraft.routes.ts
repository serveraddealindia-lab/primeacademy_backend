import { Router } from 'express';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import * as attendanceDraftController from '../controllers/attendanceDraft.controller';

const router = Router();

const requireFaculty = [verifyTokenMiddleware, checkRole(UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN)];

// PATCH /api/attendance/save-draft
router.patch('/save-draft', requireFaculty, attendanceDraftController.saveDraft);

// GET /api/attendance/draft?sessionId=123
router.get('/draft', requireFaculty, attendanceDraftController.getDraft);

export default router;

