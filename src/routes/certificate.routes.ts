import { Router } from 'express';
import * as certificateController from '../controllers/certificate.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// GET /api/certificates - Get all certificates
router.get('/', verifyTokenMiddleware, certificateController.getAllCertificates);

// GET /api/certificates/:id - Get certificate by ID
router.get('/:id', verifyTokenMiddleware, certificateController.getCertificateById);

// GET /api/certificates/:id/download - Download certificate PDF
router.get('/:id/download', verifyTokenMiddleware, certificateController.downloadCertificate);

// POST /api/certificates - Create certificate
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  certificateController.createCertificate
);

export default router;

