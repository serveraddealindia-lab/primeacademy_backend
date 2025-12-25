import { Router, Request, Response } from 'express';
import { uploadMiddleware, uploadFiles } from '../controllers/upload.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Test route to verify upload endpoint is accessible
router.get('/', verifyTokenMiddleware, (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Upload endpoint is working',
    endpoint: 'POST /api/upload',
    staticPath: '/uploads',
    note: 'Uploaded files are served at /uploads/[path]',
  });
});

// Test route to verify static file serving
router.get('/test-static', verifyTokenMiddleware, (_req: Request, res: Response) => {
  const path = require('path');
  const fs = require('fs');
  const uploadsRoot = path.join(__dirname, '../../uploads');
  const generalUploadDir = path.join(uploadsRoot, 'general');
  
  let files: string[] = [];
  try {
    if (fs.existsSync(generalUploadDir)) {
      files = fs.readdirSync(generalUploadDir).slice(0, 5); // Get first 5 files
    }
  } catch (error) {
    // Ignore
  }
  
  res.json({
    status: 'success',
    message: 'Static file serving test',
    uploadsRoot,
    generalUploadDir,
    exists: fs.existsSync(generalUploadDir),
    fileCount: files.length,
    sampleFiles: files,
    note: 'Files should be accessible at http://localhost:3000/uploads/general/[filename]',
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
      return next();
    });
  },
  uploadFiles
);

export default router;

