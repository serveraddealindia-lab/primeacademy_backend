import { Router } from 'express';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import * as reportController from '../controllers/report.controller';
import * as attendanceReportController from '../controllers/attendanceReport.controller';

const router = Router();
const requireAdmin = [verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN)];

router.get('/batch-attendance', requireAdmin, reportController.getBatchAttendance);
router.get('/pending-payments', requireAdmin, reportController.getPendingPayments);
router.get('/portfolio-status', requireAdmin, reportController.getPortfolioStatus);
router.get('/all-analysis', requireAdmin, reportController.getAllAnalysis);

router.get('/faculty-occupancy', requireAdmin, reportController.getFacultyOccupancyReport);
router.get('/batch-details', requireAdmin, reportController.getBatchDetailsReport);

// Saved reports endpoints (Superadmin only)
router.get('/saved', requireAdmin, (req: any, res: any) => attendanceReportController.getSavedReports(req, res));
router.get('/saved/:id', requireAdmin, (req: any, res: any) => attendanceReportController.getSavedReportDetails(req, res));
router.get('/saved/:id/download', requireAdmin, (req: any, res: any) => attendanceReportController.downloadSavedReportCSV(req, res));

export default router;

