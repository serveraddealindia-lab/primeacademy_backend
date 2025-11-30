import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

// __dirname is available in CommonJS

const uploadsRoot = path.join(__dirname, '../../uploads');
const attendanceUploadDir = process.env.ATTENDANCE_UPLOAD_DIR
  ? path.resolve(process.env.ATTENDANCE_UPLOAD_DIR)
  : path.join(uploadsRoot, 'attendance');

const ensureDirExists = (dirPath: string) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDirExists(attendanceUploadDir);
    cb(null, attendanceUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, or WEBP images are allowed for attendance uploads.'));
  }
};

export const attendanceUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

export const buildAttendanceRelativePath = (filename: string): string =>
  path.posix.join('attendance', filename);


