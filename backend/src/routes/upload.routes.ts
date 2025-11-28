import { Router, Request, Response } from 'express';
import { uploadMiddleware, uploadFiles } from '../controllers/upload.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Test route to verify upload endpoint is accessible
router.get('/', verifyTokenMiddleware, (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Upload endpoint is working',
    endpoint: 'POST /api/upload',
  });
});

// POST /api/upload - Upload files (images)
router.post(
  '/',
  verifyTokenMiddleware,
  (req, res, next) => {
    uploadMiddleware.array('files', 10)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          status: 'error',
          message: err.message || 'File upload error',
        });
      }
      next();
    });
  },
  uploadFiles
);

export default router;

