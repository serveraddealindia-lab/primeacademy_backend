"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_controller_1 = require("../controllers/upload.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Test route to verify upload endpoint is accessible
router.get('/', auth_middleware_1.verifyTokenMiddleware, (_req, res) => {
    res.json({
        status: 'success',
        message: 'Upload endpoint is working',
        endpoint: 'POST /api/upload',
        staticPath: '/uploads',
        note: 'Uploaded files are served at /uploads/[path]',
    });
});
// Test route to verify static file serving
router.get('/test-static', auth_middleware_1.verifyTokenMiddleware, (_req, res) => {
    const path = require('path');
    const fs = require('fs');
    // Use process.cwd() to match upload.controller.ts path calculation
    const backendRoot = process.cwd();
    const uploadsRoot = process.env.UPLOAD_ROOT
        ? path.resolve(process.env.UPLOAD_ROOT)
        : path.join(backendRoot, 'uploads');
    const generalUploadDir = process.env.UPLOAD_DIR
        ? path.resolve(process.env.UPLOAD_DIR)
        : path.join(uploadsRoot, 'general');
    let files = [];
    try {
        if (fs.existsSync(generalUploadDir)) {
            files = fs.readdirSync(generalUploadDir).slice(0, 5); // Get first 5 files
        }
    }
    catch (error) {
        // Ignore
    }
    res.json({
        status: 'success',
        message: 'Static file serving test',
        uploadsRoot,
        generalUploadDir,
        backendRoot,
        exists: fs.existsSync(generalUploadDir),
        fileCount: files.length,
        sampleFiles: files,
        note: 'Files should be accessible at http://localhost:3001/uploads/general/[filename]',
    });
});
// POST /api/upload - Upload files (images)
router.post('/', auth_middleware_1.verifyTokenMiddleware, (req, res, next) => {
    upload_controller_1.uploadMiddleware.array('files', 10)(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                status: 'error',
                message: err.message || 'File upload error',
            });
        }
        return next();
    });
}, upload_controller_1.uploadFiles);
exports.default = router;
//# sourceMappingURL=upload.routes.js.map