import { Router } from 'express';
import multer from 'multer';
import * as paymentController from '../controllers/payment.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) and CSV files are allowed.'));
    }
  },
});

// GET routes
// Allow students to view their own payments - access control handled in controller
router.get('/', verifyTokenMiddleware, paymentController.getPayments);
router.get('/:paymentId/receipt', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), paymentController.downloadReceipt);
router.get('/:paymentId', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), paymentController.getPaymentById);

// POST routes - specific routes before parameterized ones
router.post('/bulk-upload', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), upload.single('file'), paymentController.bulkUploadPayments);
router.post('/:paymentId/generate-receipt', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), paymentController.generateReceipt);
router.post('/', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), paymentController.createPayment);

// PUT routes
router.put('/:paymentId', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), paymentController.updatePayment);

// DELETE routes - only superadmin can delete payments
router.delete('/:paymentId', verifyTokenMiddleware, checkRole(UserRole.SUPERADMIN), paymentController.deletePayment);

export default router;



