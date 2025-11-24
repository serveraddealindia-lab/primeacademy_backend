import { Router } from 'express';
import * as batchController from '../controllers/batch.controller';
import * as batchProgressController from '../controllers/batchProgress.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

const router = Router();

// GET /batches → list all batches with related faculty and enrolled students
router.get('/', verifyTokenMiddleware, batchController.getAllBatches);

// GET /batches/progress → get batch-wise progress list with search and export
router.get('/progress', verifyTokenMiddleware, batchProgressController.getBatchProgress);

// POST /batches → create batch (admin only)
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  batchController.createBatch
);

// IMPORTANT: More specific routes must come before generic :id routes
// GET /batches/:id/candidates/suggest → suggest eligible students
router.get('/:id/candidates/suggest', verifyTokenMiddleware, batchController.suggestCandidates);

// GET /batches/:id/enrollments → get batch enrollments
router.get('/:id/enrollments', verifyTokenMiddleware, batchController.getBatchEnrollments);

// PUT /batches/:id/faculty → assign faculty to batch
router.put(
  '/:id/faculty',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  batchController.assignFacultyToBatch
);

// Generic routes for single batch operations (must come after specific routes)
// GET /batches/:id → get single batch by ID
router.get('/:id', verifyTokenMiddleware, batchController.getBatchById);

// PUT /batches/:id → update batch (admin only)
router.put(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  batchController.updateBatch
);

// DELETE /batches/:id → delete batch (admin only)
router.delete(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  batchController.deleteBatch
);

export default router;


