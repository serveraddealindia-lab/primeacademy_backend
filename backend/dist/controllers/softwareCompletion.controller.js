"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCompletion = exports.getCompletions = exports.createCompletion = void 0;
const models_1 = __importDefault(require("../models"));
const SoftwareCompletion_1 = require("../models/SoftwareCompletion");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
// POST /api/software-completions - Create software completion record
const createCompletion = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only faculty can create software completion records
        if (req.user.role !== User_1.UserRole.FACULTY && req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only faculty can create software completion records',
            });
            return;
        }
        const { studentId, batchId, softwareName, startDate, endDate, facultyId } = req.body;
        // Validation
        if (!studentId || !batchId || !softwareName || !startDate || !endDate || !facultyId) {
            res.status(400).json({
                status: 'error',
                message: 'studentId, batchId, softwareName, startDate, endDate, and facultyId are required',
            });
            return;
        }
        // Verify student exists
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
        // Verify faculty exists
        const faculty = await models_1.default.User.findByPk(facultyId);
        if (!faculty || faculty.role !== User_1.UserRole.FACULTY) {
            res.status(404).json({
                status: 'error',
                message: 'Faculty not found',
            });
            return;
        }
        // Verify student is enrolled in batch
        const enrollment = await models_1.default.Enrollment.findOne({
            where: { studentId, batchId },
        });
        if (!enrollment) {
            res.status(400).json({
                status: 'error',
                message: 'Student is not enrolled in this batch',
            });
            return;
        }
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid date format. Use YYYY-MM-DD',
            });
            return;
        }
        if (start > end) {
            res.status(400).json({
                status: 'error',
                message: 'Start date must be before or equal to end date',
            });
            return;
        }
        // Check if completion record already exists for this student-batch-software combination
        const existing = await models_1.default.SoftwareCompletion.findOne({
            where: {
                studentId,
                batchId,
                softwareName,
            },
        });
        if (existing) {
            res.status(400).json({
                status: 'error',
                message: 'Software completion record already exists for this student, batch, and software combination',
            });
            return;
        }
        // Create completion record
        const completion = await models_1.default.SoftwareCompletion.create({
            studentId,
            batchId,
            softwareName,
            startDate: start,
            endDate: end,
            facultyId,
            status: SoftwareCompletion_1.SoftwareCompletionStatus.IN_PROGRESS,
        });
        // Fetch with relations
        const completionWithDetails = await models_1.default.SoftwareCompletion.findByPk(completion.id, {
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
                    as: 'faculty',
                    attributes: ['id', 'name', 'email'],
                },
            ],
        });
        res.status(201).json({
            status: 'success',
            message: 'Software completion record created successfully',
            data: {
                completion: completionWithDetails,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Create completion error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating software completion record',
        });
    }
};
exports.createCompletion = createCompletion;
// GET /api/software-completions - Get all completion records
const getCompletions = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { studentId, batchId, facultyId, status } = req.query;
        const where = {};
        // Students can only see their own completions
        if (req.user.role === User_1.UserRole.STUDENT) {
            where.studentId = req.user.userId;
        }
        else if (studentId) {
            where.studentId = parseInt(studentId, 10);
        }
        // Faculty can see their own taught software
        if (req.user.role === User_1.UserRole.FACULTY && !facultyId) {
            where.facultyId = req.user.userId;
        }
        else if (facultyId) {
            where.facultyId = parseInt(facultyId, 10);
        }
        if (batchId) {
            where.batchId = parseInt(batchId, 10);
        }
        if (status) {
            where.status = status;
        }
        const completions = await models_1.default.SoftwareCompletion.findAll({
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
                    as: 'faculty',
                    attributes: ['id', 'name', 'email'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json({
            status: 'success',
            data: {
                completions,
                count: completions.length,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get completions error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching software completion records',
        });
    }
};
exports.getCompletions = getCompletions;
// PATCH /api/software-completions/:id - Update completion status
const updateCompletion = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only faculty can update completion records
        if (req.user.role !== User_1.UserRole.FACULTY && req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only faculty can update software completion records',
            });
            return;
        }
        const completionId = parseInt(req.params.id, 10);
        const { status, endDate } = req.body;
        if (isNaN(completionId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid completion ID',
            });
            return;
        }
        // Find completion
        const completion = await models_1.default.SoftwareCompletion.findByPk(completionId);
        if (!completion) {
            res.status(404).json({
                status: 'error',
                message: 'Software completion record not found',
            });
            return;
        }
        // Check if faculty is the assigned faculty (unless admin/superadmin)
        if (req.user.role === User_1.UserRole.FACULTY && completion.facultyId !== req.user.userId) {
            res.status(403).json({
                status: 'error',
                message: 'You can only update software completion records for software you are teaching',
            });
            return;
        }
        // Update fields
        if (status) {
            if (status === 'completed') {
                completion.status = SoftwareCompletion_1.SoftwareCompletionStatus.COMPLETED;
                completion.completedAt = new Date();
            }
            else if (status === 'in_progress') {
                completion.status = SoftwareCompletion_1.SoftwareCompletionStatus.IN_PROGRESS;
                completion.completedAt = null;
            }
        }
        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid date format. Use YYYY-MM-DD',
                });
                return;
            }
            completion.endDate = end;
        }
        await completion.save();
        // Fetch with relations
        const completionWithDetails = await models_1.default.SoftwareCompletion.findByPk(completion.id, {
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
                    as: 'faculty',
                    attributes: ['id', 'name', 'email'],
                },
            ],
        });
        res.status(200).json({
            status: 'success',
            message: 'Software completion record updated successfully',
            data: {
                completion: completionWithDetails,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Update completion error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating software completion record',
        });
    }
};
exports.updateCompletion = updateCompletion;
//# sourceMappingURL=softwareCompletion.controller.js.map