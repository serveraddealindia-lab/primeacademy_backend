import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

// __dirname is available in CommonJS

const uploadsRoot = path.join(__dirname, '../../uploads');
const generalUploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(uploadsRoot, 'general');

const ensureDirExists = (dirPath: string) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
};

// Ensure upload directories exist
ensureDirExists(uploadsRoot);
ensureDirExists(generalUploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDirExists(generalUploadDir);
    cb(null, generalUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `${Date.now()}-${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Only images (JPG, PNG, WEBP, GIF) are allowed.`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 10, // Max 10 files
  },
});

// POST /api/upload - Upload files
export const uploadFiles = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      res.status(400).json({
        status: 'error',
        message: 'No files uploaded',
      });
      return;
    }

    const files = Array.isArray(req.files) ? req.files : req.files.files || [];
    
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'No files uploaded',
      });
      return;
    }

    const uploadedFiles = files.map((file: Express.Multer.File) => {
      // Calculate relative path from uploads root
      const relativePath = path.relative(uploadsRoot, file.path);
      // Convert to URL-friendly path (forward slashes)
      const urlPath = relativePath.replace(/\\/g, '/');
      // Use relative URL that will work with the static middleware
      const url = `/uploads/${urlPath}`;
      
      logger.info(`File uploaded: ${file.originalname}`);
      logger.info(`File saved to: ${file.path}`);
      logger.info(`Relative path: ${relativePath}`);
      logger.info(`URL path: ${urlPath}`);
      logger.info(`Final URL: ${url}`);
      
      return {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        url: url,
        path: file.path, // For debugging
      };
    });

    const urls = uploadedFiles.map((f) => f.url);

    res.status(200).json({
      status: 'success',
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      data: {
        files: uploadedFiles,
        urls: urls,
        count: uploadedFiles.length,
      },
    });
  } catch (error: any) {
    logger.error('Upload files error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error while uploading files',
    });
  }
};

