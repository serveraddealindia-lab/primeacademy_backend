"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvePortfolio = exports.uploadPortfolio = void 0;
const models_1 = __importDefault(require("../models"));
const Portfolio_1 = require("../models/Portfolio");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
// Helper function to validate URLs
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
// Helper function to validate YouTube URLs
const isValidYoutubeUrl = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
};
const uploadPortfolio = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const studentId = parseInt(req.params.id, 10);
        const { batchId, files, pdfUrl, youtubeUrl } = req.body;
        if (isNaN(studentId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid student ID',
            });
            return;
        }
        // Validation
        if (!batchId) {
            res.status(400).json({
                status: 'error',
                message: 'batchId is required',
            });
            return;
        }
        // At least one of files, pdfUrl, or youtubeUrl must be provided
        if (!files && !pdfUrl && !youtubeUrl) {
            res.status(400).json({
                status: 'error',
                message: 'At least one of files, pdfUrl, or youtubeUrl is required',
            });
            return;
        }
        // Validate files is an array if provided
        if (files && !Array.isArray(files)) {
            res.status(400).json({
                status: 'error',
                message: 'files must be an array of file URLs',
            });
            return;
        }
        // Validate URLs if provided
        if (pdfUrl && !isValidUrl(pdfUrl)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid PDF URL format',
            });
            return;
        }
        if (youtubeUrl && !isValidYoutubeUrl(youtubeUrl)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid YouTube URL format',
            });
            return;
        }
        // Check if user is the student or an admin
        if (req.user.userId !== studentId && req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'You can only upload portfolios for yourself unless you are an admin',
            });
            return;
        }
        // Verify student exists and is a student
        const student = await models_1.default.User.findByPk(studentId);
        if (!student || student.role !== User_1.UserRole.STUDENT) {
            res.status(404).json({
                status: 'error',
                message: 'Student not found',
            });
            return;
        }
        // Verify batch exists
        const batch = await models_1.default.Batch.findByPk(batchId);
        if (!batch) {
            res.status(404).json({
                status: 'error',
                message: 'Batch not found',
            });
            return;
        }
        // Check if student is enrolled in the batch
        const enrollment = await models_1.default.Enrollment.findOne({
            where: {
                studentId,
                batchId,
            },
        });
        if (!enrollment) {
            res.status(400).json({
                status: 'error',
                message: 'Student is not enrolled in this batch',
            });
            return;
        }
        // Check if portfolio already exists for this student-batch combination
        let portfolio = await models_1.default.Portfolio.findOne({
            where: {
                studentId,
                batchId,
            },
        });
        // Store files as JSON array
        const filesJson = files ? files : null;
        if (portfolio) {
            // Update existing portfolio
            if (filesJson)
                portfolio.files = filesJson;
            if (pdfUrl !== undefined)
                portfolio.pdfUrl = pdfUrl || null;
            if (youtubeUrl !== undefined)
                portfolio.youtubeUrl = youtubeUrl || null;
            portfolio.status = Portfolio_1.PortfolioStatus.PENDING; // Reset to pending when files are updated
            portfolio.approvedBy = null;
            portfolio.approvedAt = null;
            await portfolio.save();
        }
        else {
            // Create new portfolio
            portfolio = await models_1.default.Portfolio.create({
                studentId,
                batchId,
                files: filesJson,
                pdfUrl: pdfUrl || null,
                youtubeUrl: youtubeUrl || null,
                status: Portfolio_1.PortfolioStatus.PENDING,
            });
        }
        res.status(portfolio.createdAt === portfolio.updatedAt ? 201 : 200).json({
            status: 'success',
            message: portfolio.createdAt === portfolio.updatedAt ? 'Portfolio uploaded successfully' : 'Portfolio updated successfully',
            data: {
                portfolio: {
                    id: portfolio.id,
                    studentId: portfolio.studentId,
                    batchId: portfolio.batchId,
                    files: portfolio.files,
                    pdfUrl: portfolio.pdfUrl,
                    youtubeUrl: portfolio.youtubeUrl,
                    status: portfolio.status,
                    createdAt: portfolio.createdAt,
                    updatedAt: portfolio.updatedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Upload portfolio error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while uploading portfolio',
        });
    }
};
exports.uploadPortfolio = uploadPortfolio;
const approvePortfolio = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const portfolioId = parseInt(req.params.id, 10);
        const { approve } = req.body;
        if (isNaN(portfolioId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid portfolio ID',
            });
            return;
        }
        // Check if user is admin or superadmin (Admin/SuperAdmin only)
        if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins or superadmins can approve portfolios',
            });
            return;
        }
        if (typeof approve !== 'boolean') {
            res.status(400).json({
                status: 'error',
                message: 'approve field is required and must be a boolean',
            });
            return;
        }
        // Find portfolio
        const portfolio = await models_1.default.Portfolio.findByPk(portfolioId);
        if (!portfolio) {
            res.status(404).json({
                status: 'error',
                message: 'Portfolio not found',
            });
            return;
        }
        // Update portfolio status
        portfolio.status = approve ? Portfolio_1.PortfolioStatus.APPROVED : Portfolio_1.PortfolioStatus.REJECTED;
        portfolio.approvedBy = req.user.userId;
        portfolio.approvedAt = new Date();
        await portfolio.save();
        // Get student info for response
        const student = await models_1.default.User.findByPk(portfolio.studentId, {
            attributes: ['id', 'name', 'email'],
        });
        res.status(200).json({
            status: 'success',
            message: `Portfolio ${approve ? 'approved' : 'rejected'} successfully`,
            data: {
                portfolio: {
                    id: portfolio.id,
                    studentId: portfolio.studentId,
                    studentName: student?.name,
                    studentEmail: student?.email,
                    batchId: portfolio.batchId,
                    status: portfolio.status,
                    approvedBy: portfolio.approvedBy,
                    approvedAt: portfolio.approvedAt,
                    updatedAt: portfolio.updatedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Approve portfolio error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while approving portfolio',
        });
    }
};
exports.approvePortfolio = approvePortfolio;
//# sourceMappingURL=portfolio.controller.js.map