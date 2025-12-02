import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

const adminOnly = requireAuth([UserRole.ADMIN, UserRole.SUPERADMIN]);

router.get('/', adminOnly, paymentController.getPayments);
router.get('/:paymentId', adminOnly, paymentController.getPaymentById);
router.get('/:paymentId/receipt', adminOnly, paymentController.downloadReceipt);
router.post('/', adminOnly, paymentController.createPayment);
router.put('/:paymentId', adminOnly, paymentController.updatePayment);

export default router;



