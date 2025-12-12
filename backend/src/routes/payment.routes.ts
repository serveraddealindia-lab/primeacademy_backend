import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

router.get('/', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), paymentController.getPayments);
router.get('/:paymentId', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), paymentController.getPaymentById);
router.get('/:paymentId/receipt', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), paymentController.downloadReceipt);
router.post('/', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), paymentController.createPayment);
router.put('/:paymentId', verifyTokenMiddleware, checkRole(UserRole.ADMIN, UserRole.SUPERADMIN), paymentController.updatePayment);

export default router;



