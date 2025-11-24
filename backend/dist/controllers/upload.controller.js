"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFiles = void 0;
const logger_1 = require("../utils/logger");
const uploadFiles = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Handle multer files (can be array or object with field names)
        const uploadedFiles = Array.isArray(req.files)
            ? req.files
            : req.files
                ? Object.values(req.files).flat()
                : [];
        if (uploadedFiles.length === 0) {
            res.status(400).json({
                status: 'error',
                message: 'No files uploaded',
            });
            return;
        }
        // Generate file URLs
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const fileUrls = uploadedFiles.map((file) => {
            // Return URL path relative to API base
            return `${baseUrl}/uploads/${file.filename}`;
        });
        // Format response with file details
        const files = uploadedFiles.map((file) => ({
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            url: `${baseUrl}/uploads/${file.filename}`,
        }));
        res.status(200).json({
            status: 'success',
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            data: {
                files,
                urls: fileUrls,
                count: files.length,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Upload files error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while uploading files',
        });
    }
};
exports.uploadFiles = uploadFiles;
//# sourceMappingURL=upload.controller.js.map