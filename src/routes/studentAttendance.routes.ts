import * as express from 'express';
import * as studentAttendanceController from '../controllers/studentAttendance.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';
import { attendanceUpload } from '../middleware/upload.middleware';

const router = express.Router();

// POST /student-attendance/punch-in → punch in
router.post(
  '/punch-in',
  verifyTokenMiddleware,
  attendanceUpload.single('photo'),
  studentAttendanceController.punchIn
);

// POST /student-attendance/punch-out → punch out
router.post(
  '/punch-out',
  verifyTokenMiddleware,
  attendanceUpload.single('photo'),
  studentAttendanceController.punchOut
);

// GET /student-attendance/today → get today's punch status
router.get('/today', verifyTokenMiddleware, studentAttendanceController.getTodayPunch);

// GET /student-attendance/history → get punch history
router.get('/history', verifyTokenMiddleware, studentAttendanceController.getStudentPunchHistory);

// POST /student-attendance/break-in → break in
router.post('/break-in', verifyTokenMiddleware, studentAttendanceController.breakIn);

// POST /student-attendance/break-out → break out
router.post('/break-out', verifyTokenMiddleware, studentAttendanceController.breakOut);

export default router;

