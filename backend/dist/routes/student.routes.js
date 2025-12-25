"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const studentController = __importStar(require("../controllers/student.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
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
        }
        else {
            cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) and CSV files are allowed.'));
        }
    },
});
// POST /students/enroll → Create student user, profile, and enrollment in one call
router.post('/enroll', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), studentController.completeEnrollment);
// POST /students/create-dummy → Create a dummy student with all details (for testing)
router.post('/create-dummy', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), studentController.createDummyStudent);
// POST /students/unified-import → Unified import for students (enrollment + software progress)
router.post('/unified-import', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), upload.single('file'), studentController.unifiedStudentImport);
// GET /students/template → Download unified student template (admin only)
router.get('/template', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), studentController.downloadUnifiedTemplate);
// POST /students/bulk-enroll → Bulk enroll students from Excel (admin only) - DEPRECATED, use unified-import
router.post('/bulk-enroll', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), upload.single('file'), studentController.bulkEnrollStudents);
// POST /students/create-three-dummy → Create 3 dummy students with different scenarios
router.post('/create-three-dummy', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), studentController.createThreeDummyStudents);
// GET /students/all-software → Get all unique software from batches and profiles
router.get('/all-software', auth_middleware_1.verifyTokenMiddleware, studentController.getAllSoftware);
// GET /students/course-names → Get all course names from Excel file
router.get('/course-names', auth_middleware_1.verifyTokenMiddleware, studentController.getCourseNames);
// GET /students/:id/attendance → Get student's own attendance (students can view their own)
// IMPORTANT: This must be before any other /:id routes to avoid route conflicts
router.get('/:id/attendance', auth_middleware_1.verifyTokenMiddleware, studentController.getStudentAttendance);
exports.default = router;
//# sourceMappingURL=student.routes.js.map