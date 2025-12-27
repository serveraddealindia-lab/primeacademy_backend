"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFiles = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const logger_1 = require("../utils/logger");
// __dirname is available in CommonJS
// In production, __dirname is in dist/src/controllers, so we need to go up to backend root
// Use process.cwd() as base which should be the backend directory
const backendRoot = process.cwd();
const uploadsRoot = process.env.UPLOAD_ROOT
    ? path_1.default.resolve(process.env.UPLOAD_ROOT)
    : path_1.default.join(backendRoot, 'uploads');
const generalUploadDir = process.env.UPLOAD_DIR
    ? path_1.default.resolve(process.env.UPLOAD_DIR)
    : path_1.default.join(uploadsRoot, 'general');
const ensureDirExists = (dirPath) => {
    if (!(0, fs_1.existsSync)(dirPath)) {
        (0, fs_1.mkdirSync)(dirPath, { recursive: true });
    }
};
// Ensure upload directories exist
ensureDirExists(uploadsRoot);
ensureDirExists(generalUploadDir);
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        ensureDirExists(generalUploadDir);
        cb(null, generalUploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || '.jpg';
        const uniqueName = `${Date.now()}-${(0, crypto_1.randomUUID)()}${ext}`;
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
const fileFilter = (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type ${file.mimetype} is not allowed. Only images (JPG, PNG, WEBP, GIF) and PDF files are allowed.`));
    }
};
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 10, // Max 10 files
    },
});
// POST /api/upload - Upload files
const uploadFiles = async (req, res) => {
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
        logger_1.logger.info('=== UPLOAD DEBUG INFO ===');
        logger_1.logger.info(`process.cwd(): ${process.cwd()}`);
        logger_1.logger.info(`backendRoot: ${backendRoot}`);
        logger_1.logger.info(`uploadsRoot: ${uploadsRoot}`);
        logger_1.logger.info(`generalUploadDir: ${generalUploadDir}`);
        logger_1.logger.info(`generalUploadDir exists: ${(0, fs_1.existsSync)(generalUploadDir)}`);
        logger_1.logger.info('========================');
        const uploadedFiles = files.map((file) => {
            // Calculate relative path from uploads root
            // Normalize paths to handle Windows/Unix differences
            const normalizedFilepath = path_1.default.normalize(file.path);
            const normalizedUploadsRoot = path_1.default.normalize(uploadsRoot);
            // Get relative path
            let relativePath = path_1.default.relative(normalizedUploadsRoot, normalizedFilepath);
            // If relative path calculation fails (different drives on Windows), try alternative
            if (relativePath.startsWith('..') || path_1.default.isAbsolute(relativePath)) {
                // Try to extract path after 'uploads' directory
                const uploadsIndex = normalizedFilepath.toLowerCase().indexOf('uploads');
                if (uploadsIndex !== -1) {
                    relativePath = normalizedFilepath.substring(uploadsIndex + 'uploads'.length);
                    // Remove leading path separator
                    relativePath = relativePath.replace(/^[\\/]+/, '');
                }
                else {
                    // Fallback: assume it's in general subdirectory
                    relativePath = path_1.default.join('general', path_1.default.basename(normalizedFilepath));
                }
            }
            // Convert to URL-friendly path (forward slashes)
            const urlPath = relativePath.replace(/\\/g, '/');
            // Use relative URL that will work with the static middleware
            const url = `/uploads/${urlPath}`;
            // Verify file actually exists after save
            const fileExists = (0, fs_1.existsSync)(file.path);
            logger_1.logger.info(`File uploaded: ${file.originalname}`);
            logger_1.logger.info(`File saved to: ${file.path}`);
            logger_1.logger.info(`File exists after save: ${fileExists}`);
            logger_1.logger.info(`Uploads root: ${uploadsRoot}`);
            logger_1.logger.info(`Relative path: ${relativePath}`);
            logger_1.logger.info(`URL path: ${urlPath}`);
            logger_1.logger.info(`Final URL: ${url}`);
            if (!fileExists) {
                logger_1.logger.error(`WARNING: File was supposed to be saved to ${file.path} but it doesn't exist!`);
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
    }
    catch (error) {
        logger_1.logger.error('Upload files error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error while uploading files',
        });
    }
};
exports.uploadFiles = uploadFiles;
//# sourceMappingURL=upload.controller.js.map