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
exports.buildAttendanceRelativePath = exports.attendanceUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
const crypto_1 = require("crypto");
// __dirname is available in CommonJS
const uploadsRoot = path.join(__dirname, '../../uploads');
const attendanceUploadDir = process.env.ATTENDANCE_UPLOAD_DIR
    ? path.resolve(process.env.ATTENDANCE_UPLOAD_DIR)
    : path.join(uploadsRoot, 'attendance');
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
        const ext = path.extname(file.originalname) || '.jpg';
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
const buildAttendanceRelativePath = (filename) => path.posix.join('attendance', filename);
exports.buildAttendanceRelativePath = buildAttendanceRelativePath;
//# sourceMappingURL=upload.middleware.js.map