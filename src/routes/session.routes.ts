import express from 'express';
import * as sessionController from '../controllers/session.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = express.Router();

const requireFaculty = [verifyTokenMiddleware, checkRole(UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN)];

router.get('/faculty/assigned', requireFaculty, sessionController.getFacultyAssignedBatches);

// Debug endpoint to check faculty assignments (admin only)
router.get('/faculty/:facultyId/assignments', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), sessionController.getFacultyAssignmentsDebug);

// Get batch history
router.get('/batch/:batchId/history', requireFaculty, sessionController.getBatchHistory);

router.post('/:batchId/start', requireFaculty, sessionController.startSession);

router.post('/:sessionId/end', requireFaculty, sessionController.endSession);

router.post('/:sessionId/attendance', requireFaculty, sessionController.submitSessionAttendance);

export default router;



