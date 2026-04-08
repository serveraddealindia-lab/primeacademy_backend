import { Router } from 'express';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';
import * as taskReportController from '../controllers/taskReport.controller';

const router = Router();
const requireAuth = [verifyTokenMiddleware];

// Task reports - Admin/Faculty can view
router.get('/tasks', requireAuth, taskReportController.getTaskReport);
router.get('/tasks/:taskId/details', requireAuth, taskReportController.getTaskDetailsReport);

export default router;
