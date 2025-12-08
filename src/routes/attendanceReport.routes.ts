import express from 'express';
import * as attendanceReportController from '../controllers/attendanceReport.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = express.Router();
const requireSuperAdmin = [verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN)];

router.get('/all-students', requireSuperAdmin, attendanceReportController.getAllStudents);
router.get('/students/:studentId/details', requireSuperAdmin, attendanceReportController.getStudentDetails);
router.get('/faculty', requireSuperAdmin, attendanceReportController.getFacultyAttendanceReport);
router.get('/students', requireSuperAdmin, attendanceReportController.getStudentAttendanceReport);
router.get('/punches', requireSuperAdmin, attendanceReportController.getPunchSummaryReport);
router.get('/students-without-batch', requireSuperAdmin, attendanceReportController.getStudentsWithoutBatch);
router.get('/students-enrolled-batch-not-started', requireSuperAdmin, attendanceReportController.getStudentsEnrolledBatchNotStarted);
router.get('/students-multiple-courses-conflict', requireSuperAdmin, attendanceReportController.getStudentsMultipleCoursesConflict);
router.get('/students-on-leave-pending-batches', requireSuperAdmin, attendanceReportController.getStudentsOnLeavePendingBatches);
router.get('/students-wise', requireSuperAdmin, attendanceReportController.getStudentsWise);

export default router;



