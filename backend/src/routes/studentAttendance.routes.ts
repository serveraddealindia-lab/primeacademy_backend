import express from 'express';
import * as studentAttendanceController from '../controllers/studentAttendance.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// POST /student-attendance/punch-in → punch in
router.post('/punch-in', verifyTokenMiddleware, studentAttendanceController.punchIn);

// POST /student-attendance/punch-out → punch out
router.post('/punch-out', verifyTokenMiddleware, studentAttendanceController.punchOut);

// GET /student-attendance/today → get today's punch status
router.get('/today', verifyTokenMiddleware, studentAttendanceController.getTodayPunch);

// GET /student-attendance/history → get punch history
router.get('/history', verifyTokenMiddleware, studentAttendanceController.getStudentPunchHistory);

export default router;

