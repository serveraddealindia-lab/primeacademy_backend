import { Router } from 'express';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import * as taskController from '../controllers/task.controller';

const router = Router();
const requireAuth = [verifyTokenMiddleware];
const requireAdmin = [verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN)];

// Faculty routes - Create, Edit, Delete tasks
router.post('/create', requireAuth, taskController.createTask);
router.put('/update/:taskId', requireAuth, taskController.updateTask);
router.delete('/delete/:taskId', requireAuth, taskController.deleteTask);

// Start and mark attendance for tasks
router.post('/:taskId/start', requireAuth, taskController.startTaskSession);
router.post('/:taskId/attendance', requireAuth, taskController.markTaskAttendance);

// Get tasks
router.get('/faculty-dashboard', requireAuth, taskController.getFacultyTasks);
router.get('/faculty/my-tasks', requireAuth, taskController.getFacultyTasks);
router.get('/all', requireAdmin, taskController.getAllTasks);

// Admin approval routes
router.post('/approve', requireAdmin, taskController.approveTask);
router.post('/approve/:taskId', requireAdmin, taskController.approveTask);
router.post('/reject', requireAdmin, taskController.approveTask); // Uses same controller with approve=false

export default router;
