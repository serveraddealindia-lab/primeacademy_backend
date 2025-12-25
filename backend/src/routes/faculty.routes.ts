import { Router } from 'express';
import * as facultyController from '../controllers/faculty.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';

const router = Router();

// POST /api/faculty - Create faculty profile
router.post(
  '/',
  verifyTokenMiddleware,
  facultyController.createFaculty
);

// GET /api/faculty/:userId - Get faculty profile by user ID
router.get(
  '/:userId',
  verifyTokenMiddleware,
  facultyController.getFacultyProfile
);

// PUT /api/faculty/:id - Update faculty profile
router.put(
  '/:id',
  verifyTokenMiddleware,
  facultyController.updateFacultyProfile
);

export default router;




