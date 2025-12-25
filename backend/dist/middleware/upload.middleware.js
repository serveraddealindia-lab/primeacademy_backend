"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAttendanceRelativePath = exports.attendanceUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const crypto_1 = require("crypto");
// __dirname is available in CommonJS
const uploadsRoot = path_1.default.join(__dirname, '../../uploads');
const attendanceUploadDir = process.env.ATTENDANCE_UPLOAD_DIR
    ? path_1.default.resolve(process.env.ATTENDANCE_UPLOAD_DIR)
    : path_1.default.join(uploadsRoot, 'attendance');
const ensureDirExists = (dirPath) => {
    if (!(0, fs_1.existsSync)(dirPath)) {
        (0, fs_1.mkdirSync)(dirPath, { recursive: true });
    }
};
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        ensureDirExists(attendanceUploadDir);
        cb(null, attendanceUploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || '.jpg';
        cb(null, `${Date.now()}-${(0, crypto_1.randomUUID)()}${ext}`);
    },
});
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const fileFilter = (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Only JPG, PNG, or WEBP images are allowed for attendance uploads.'));
    }
};
exports.attendanceUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
});
const buildAttendanceRelativePath = (filename) => path_1.default.posix.join('attendance', filename);
exports.buildAttendanceRelativePath = buildAttendanceRelativePath;
//# sourceMappingURL=upload.middleware.js.map