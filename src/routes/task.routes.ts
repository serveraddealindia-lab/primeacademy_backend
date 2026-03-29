import { Router } from 'express';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import * as taskController from '../controllers/task.controller';

const router = Router();

router.post('/create', verifyTokenMiddleware, checkRole(UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN), taskController.createTask);
// Approval roles can be expanded later via approval hierarchy; allow admin too by default.
router.post('/approve', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), taskController.approveTask);
router.get('/faculty-dashboard', verifyTokenMiddleware, checkRole(UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN), taskController.getFacultyDashboardTasks);
router.post('/attendance', verifyTokenMiddleware, checkRole(UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN), taskController.submitTaskAttendance);

export default router;

