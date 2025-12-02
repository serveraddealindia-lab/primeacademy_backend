import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

if (process.env.NODE_ENV === 'development') {
  logger.info('Registering auth routes...');
}

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', verifyTokenMiddleware, authController.getMe);
router.post('/impersonate/:userId', verifyTokenMiddleware, authController.impersonateUser);

if (process.env.NODE_ENV === 'development') {
  logger.info('Impersonate route registered: POST /impersonate/:userId');
}

export default router;







