"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvePortfolio = exports.uploadPortfolio = exports.getStudentPortfolio = exports.getAllPortfolios = void 0;
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
// GET /portfolios - Get all portfolios (with filters)
const getAllPortfolios = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { studentId, batchId, status } = req.query;
        const where = {};
        // If student, only show their own portfolios (ignore query param studentId for security)
        if (req.user.role === User_1.UserRole.STUDENT) {
            where.studentId = req.user.userId;
            // Allow students to see all their portfolios (pending, approved, rejected)
            // Status filter can be applied via query parameter if needed
            if (status)
                where.status = status;
            if (batchId)
                where.batchId = parseInt(batchId, 10);
        }
        else {
            // For admins/faculty, allow query params
            if (studentId)
                where.studentId = parseInt(studentId, 10);
            if (batchId)
                where.batchId = parseInt(batchId, 10);
            if (status)
                where.status = status;
        }
        // If faculty, only show portfolios for batches they're assigned to
        if (req.user.role === User_1.UserRole.FACULTY) {
            const facultyAssignments = await models_1.default.BatchFacultyAssignment.findAll({
                where: { facultyId: req.user.userId },
                attributes: ['batchId'],
            });
            const assignedBatchIds = facultyAssignments.map((a) => a.batchId);
            if (assignedBatchIds.length === 0) {
                res.status(200).json({
                    status: 'success',
                    data: {
                        portfolios: [],
                    },
                });
                return;
            }
            where.batchId = assignedBatchIds;
        }
        // Log query details for debugging
        logger_1.logger.info('Fetching portfolios with where clause:', {
            where,
            userRole: req.user.role,
            userId: req.user.userId,
        });
        const portfolios = await models_1.default.Portfolio.findAll({
            where,
            include: [
                {
                    model: models_1.default.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title', 'software'],
                },
                {
                    model: models_1.default.User,
                    as: 'approver',
                    attributes: ['id', 'name', 'email'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        logger_1.logger.info(`Found ${portfolios.length} portfolios for user ${req.user.userId} (${req.user.role})`);
        // Log first portfolio details for debugging
        if (portfolios.length > 0) {
            const firstPortfolio = portfolios[0];
            logger_1.logger.info('Sample portfolio:', {
                id: firstPortfolio.id,
                studentId: firstPortfolio.studentId,
                status: firstPortfolio.status,
                hasFiles: !!firstPortfolio.files,
                filesType: typeof firstPortfolio.files,
            });
        }
        // Ensure files are properly serialized (Sequelize JSON fields might need parsing)
        const serializedPortfolios = portfolios.map((portfolio) => {
            const portfolioData = portfolio.toJSON();
            // If files is a string, try to parse it
            if (portfolioData.files && typeof portfolioData.files === 'string') {
                try {
                    portfolioData.files = JSON.parse(portfolioData.files);
                }
                catch (e) {
                    logger_1.logger.warn(`Failed to parse portfolio files for portfolio ${portfolioData.id}:`, e);
                }
            }
            return portfolioData;
        });
        logger_1.logger.info(`Returning ${serializedPortfolios.length} serialized portfolios`);
        res.status(200).json({
            status: 'success',
            data: {
                portfolios: serializedPortfolios,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get all portfolios error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching portfolios',
        });
    }
};
exports.getAllPortfolios = getAllPortfolios;
// GET /students/:id/portfolio - Get student portfolio
const getStudentPortfolio = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const studentId = parseInt(req.params.id, 10);
        if (isNaN(studentId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid student ID',
            });
            return;
        }
        // Check if user is the student, admin, or faculty assigned to student's batches
        if (req.user.userId !== studentId && req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            if (req.user.role === User_1.UserRole.FACULTY) {
                // Check if faculty is assigned to any batch that this student is enrolled in
                const enrollments = await models_1.default.Enrollment.findAll({
                    where: { studentId },
                    include: [
                        {
                            model: models_1.default.Batch,
                            as: 'batch',
                            include: [
                                {
                                    model: models_1.default.BatchFacultyAssignment,
                                    as: 'facultyAssignments',
                                    where: { facultyId: req.user.userId },
                                    required: true,
                                },
                            ],
                        },
                    ],
                });
                if (enrollments.length === 0) {
                    res.status(403).json({
                        status: 'error',
                        message: 'You can only view portfolios for students in your assigned batches',
                    });
                    return;
                }
            }
            else {
                res.status(403).json({
                    status: 'error',
                    message: 'You can only view your own portfolio unless you are an admin or faculty',
                });
                return;
            }
        }
        const portfolio = await models_1.default.Portfolio.findOne({
            where: { studentId },
            include: [
                {
                    model: models_1.default.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title', 'software'],
                },
                {
                    model: models_1.default.User,
                    as: 'approver',
                    attributes: ['id', 'name', 'email'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        if (!portfolio) {
            res.status(404).json({
                status: 'error',
                message: 'Portfolio not found',
            });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: {
                portfolio,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get student portfolio error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching portfolio',
        });
    }
};
exports.getStudentPortfolio = getStudentPortfolio;
// POST /students/:id/portfolio - Upload/Update portfolio
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
// POST /portfolio/:id/approve - Approve/Reject portfolio
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
        // Check if user is admin, superadmin, or faculty assigned to the batch
        if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.FACULTY) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins, superadmins, or faculty can approve portfolios',
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
        // If faculty, check if they're assigned to this batch
        if (req.user.role === User_1.UserRole.FACULTY) {
            const assignment = await models_1.default.BatchFacultyAssignment.findOne({
                where: {
                    batchId: portfolio.batchId,
                    facultyId: req.user.userId,
                },
            });
            if (!assignment) {
                res.status(403).json({
                    status: 'error',
                    message: 'You can only approve portfolios for batches you are assigned to',
                });
                return;
            }
        }
        if (typeof approve !== 'boolean') {
            res.status(400).json({
                status: 'error',
                message: 'approve field is required and must be a boolean',
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