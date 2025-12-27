import { Router } from 'express';
import { verifyTokenMiddleware, checkRole, AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { Response } from 'express';

const router = Router();

// Example: Protected route that requires authentication (any role)
router.get('/protected', verifyTokenMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    status: 'success',
    message: 'This is a protected route',
    user: req.user,
  });
});

// Example: Admin-only route
router.get('/admin-only', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), (req: AuthRequest, res: Response) => {
  res.json({
    status: 'success',
    message: 'This route is only accessible to admins',
    user: req.user,
  });
});

// Example: Faculty-only route
router.get('/faculty-only', verifyTokenMiddleware, checkRole(UserRole.FACULTY), (req: AuthRequest, res: Response) => {
  res.json({
    status: 'success',
    message: 'This route is only accessible to faculty',
    user: req.user,
  });
});

// Example: Student-only route
router.get('/student-only', verifyTokenMiddleware, checkRole(UserRole.STUDENT), (req: AuthRequest, res: Response) => {
  res.json({
    status: 'success',
    message: 'This route is only accessible to students',
    user: req.user,
  });
});

export default router;

