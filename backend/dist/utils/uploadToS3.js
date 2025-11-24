"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLocalFile = exports.uploadMultipleToS3 = exports.uploadToS3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("./logger");
// AWS S3 Configuration
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
/**
 * Upload a file to AWS S3
 * @param options Upload options
 * @returns Promise with S3 file URL
 */
const uploadToS3 = async (options) => {
    try {
        const { filePath, originalName, folder = 'uploads' } = options;
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) {
            throw new Error('AWS_S3_BUCKET_NAME is not configured');
        }
        // Read file
        const fileContent = fs_1.default.readFileSync(filePath);
        // Generate unique filename
        const ext = path_1.default.extname(originalName);
        const fileName = `${folder}/${(0, uuid_1.v4)()}${ext}`;
        // Upload to S3
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: fileContent,
            ContentType: getContentType(ext),
            ACL: 'public-read', // Make file publicly accessible (or use 'private' for private files)
        });
        await s3Client.send(command);
        // Return S3 URL
        const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
        return s3Url;
    }
    catch (error) {
        throw new Error(`Failed to upload to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.uploadToS3 = uploadToS3;
/**
 * Upload multiple files to S3
 * @param files Array of file paths and names
 * @returns Promise with array of S3 URLs
 */
const uploadMultipleToS3 = async (files) => {
    try {
        const uploadPromises = files.map((file) => (0, exports.uploadToS3)({
            filePath: file.filePath,
            originalName: file.originalName,
            folder: file.folder,
        }));
        const urls = await Promise.all(uploadPromises);
        return urls;
    }
    catch (error) {
        throw new Error(`Failed to upload files to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.uploadMultipleToS3 = uploadMultipleToS3;
/**
 * Get content type based on file extension
 */
const getContentType = (ext) => {
    const contentTypes = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
    };
    return contentTypes[ext.toLowerCase()] || 'application/octet-stream';
};
/**
 * Delete local file after S3 upload (optional cleanup)
 */
const deleteLocalFile = (filePath) => {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (error) {
        logger_1.logger.error('Error deleting local file:', error);
    }
};
exports.deleteLocalFile = deleteLocalFile;
//# sourceMappingURL=uploadToS3.js.map