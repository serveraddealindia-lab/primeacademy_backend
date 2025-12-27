import { Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

// __dirname is available in CommonJS
// In production, __dirname is in dist/src/controllers, so we need to go up to backend root
// Use process.cwd() as base which should be the backend directory
const backendRoot = process.cwd();
const uploadsRoot = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : path.join(backendRoot, 'uploads');
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
  'application/pdf',
];

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Only images (JPG, PNG, WEBP, GIF) and PDF files are allowed.`));
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

    // Log path information for debugging
    logger.info('=== UPLOAD DEBUG INFO ===');
    logger.info(`process.cwd(): ${process.cwd()}`);
    logger.info(`backendRoot: ${backendRoot}`);
    logger.info(`uploadsRoot: ${uploadsRoot}`);
    logger.info(`generalUploadDir: ${generalUploadDir}`);
    logger.info(`generalUploadDir exists: ${existsSync(generalUploadDir)}`);
    logger.info('========================');

    const uploadedFiles = files.map((file: Express.Multer.File) => {
      // Calculate relative path from uploads root
      // Normalize paths to handle Windows/Unix differences
      const normalizedFilepath = path.normalize(file.path);
      const normalizedUploadsRoot = path.normalize(uploadsRoot);
      
      // Get relative path
      let relativePath = path.relative(normalizedUploadsRoot, normalizedFilepath);
      
      // If relative path calculation fails (different drives on Windows), try alternative
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        // Try to extract path after 'uploads' directory
        const uploadsIndex = normalizedFilepath.toLowerCase().indexOf('uploads');
        if (uploadsIndex !== -1) {
          relativePath = normalizedFilepath.substring(uploadsIndex + 'uploads'.length);
          // Remove leading path separator
          relativePath = relativePath.replace(/^[\\/]+/, '');
        } else {
          // Fallback: assume it's in general subdirectory
          relativePath = path.join('general', path.basename(normalizedFilepath));
        }
      }
      
      // Convert to URL-friendly path (forward slashes)
      const urlPath = relativePath.replace(/\\/g, '/');
      // Use relative URL that will work with the static middleware
      const url = `/uploads/${urlPath}`;
      
      // Verify file actually exists after save
      const fileExists = existsSync(file.path);
      
      logger.info(`File uploaded: ${file.originalname}`);
      logger.info(`File saved to: ${file.path}`);
      logger.info(`File exists after save: ${fileExists}`);
      logger.info(`Uploads root: ${uploadsRoot}`);
      logger.info(`Relative path: ${relativePath}`);
      logger.info(`URL path: ${urlPath}`);
      logger.info(`Final URL: ${url}`);
      
      if (!fileExists) {
        logger.error(`WARNING: File was supposed to be saved to ${file.path} but it doesn't exist!`);
      }
      
      return {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        url: url,
        path: file.path, // For debugging
        fileExists: fileExists, // Add this for debugging
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

