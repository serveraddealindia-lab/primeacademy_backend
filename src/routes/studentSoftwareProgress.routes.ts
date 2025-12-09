import { Router } from 'express';
import multer from 'multer';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import * as studentSoftwareProgressController from '../controllers/studentSoftwareProgress.controller';

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

// GET /api/student-software-progress - Get all records
router.get(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentSoftwareProgressController.getAllStudentSoftwareProgress
);

// GET /api/student-software-progress/export-excel - Export to Excel (MUST come before /:id route)
router.get(
  '/export-excel',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentSoftwareProgressController.exportExcel
);

// GET /api/student-software-progress/:id - Get single record
router.get(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentSoftwareProgressController.getStudentSoftwareProgressById
);

// POST /api/student-software-progress - Create new record
router.post(
  '/',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentSoftwareProgressController.createStudentSoftwareProgress
);

// PUT /api/student-software-progress/:id - Update record
router.put(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentSoftwareProgressController.updateStudentSoftwareProgress
);

// DELETE /api/student-software-progress/:id - Delete record
router.delete(
  '/:id',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentSoftwareProgressController.deleteStudentSoftwareProgress
);

// POST /api/student-software-progress/import-excel - Import from Excel
router.post(
  '/import-excel',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  upload.single('file'),
  studentSoftwareProgressController.importExcel
);

export default router;


