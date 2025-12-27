import { Router } from 'express';
import * as courseController from '../controllers/course.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// GET /api/courses - Get all courses
router.get('/', verifyTokenMiddleware, courseController.getAllCourses);

// GET /api/courses/:id - Get course by ID
router.get('/:id', verifyTokenMiddleware, courseController.getCourseById);

// POST /api/courses - Create course (admin only)
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  courseController.createCourse
);

// PUT /api/courses/:id - Update course (admin only)
router.put(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  courseController.updateCourse
);

// DELETE /api/courses/:id - Delete course (admin only)
router.delete(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  courseController.deleteCourse
);

export default router;



