import { Router } from 'express';
import * as portfolioController from '../controllers/portfolio.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// GET /portfolios - Get all portfolios (with filters)
router.get(
  '/portfolios',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.FACULTY),
  portfolioController.getAllPortfolios
);

// GET /students/:id/portfolio - Get student portfolio
router.get(
  '/students/:id/portfolio',
  verifyTokenMiddleware,
  portfolioController.getStudentPortfolio
);

// POST /students/:id/portfolio - Upload/Update portfolio
router.post(
  '/students/:id/portfolio',
  verifyTokenMiddleware,
  portfolioController.uploadPortfolio
);

// POST /portfolio/:id/approve - Approve/Reject portfolio (Admin/SuperAdmin/Faculty)
router.post(
  '/portfolio/:id/approve',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.FACULTY),
  portfolioController.approvePortfolio
);

export default router;


