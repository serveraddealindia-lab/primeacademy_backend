import { Router } from 'express';
import multer from 'multer';
import * as studentController from '../controllers/student.controller';
import { verifyTokenMiddleware, checkRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';

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

// POST /students/enroll → Create student user, profile, and enrollment in one call
router.post(
  '/enroll',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentController.completeEnrollment
);

// POST /students/create-dummy → Create a dummy student with all details (for testing)
router.post(
  '/create-dummy',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentController.createDummyStudent
);

// POST /students/unified-import → Unified import for students (enrollment + software progress)
router.post(
  '/unified-import',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  upload.single('file'),
  studentController.unifiedStudentImport
);

// GET /students/template → Download unified student template (admin only)
router.get(
  '/template',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentController.downloadUnifiedTemplate
);

// POST /students/bulk-enroll → Bulk enroll students from Excel (admin only) - DEPRECATED, use unified-import
router.post(
  '/bulk-enroll',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  upload.single('file'),
  studentController.bulkEnrollStudents
);

// POST /students/create-three-dummy → Create 3 dummy students with different scenarios
router.post(
  '/create-three-dummy',
  verifyTokenMiddleware,
  checkRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  studentController.createThreeDummyStudents
);

// GET /students/all-software → Get all unique software from batches and profiles
router.get(
  '/all-software',
  verifyTokenMiddleware,
  studentController.getAllSoftware
);

// GET /students/course-names → Get all course names from Excel file
router.get(
  '/course-names',
  verifyTokenMiddleware,
  studentController.getCourseNames
);

export default router;

