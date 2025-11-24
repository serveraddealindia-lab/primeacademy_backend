"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveLeave = exports.getLeaves = exports.createLeave = void 0;
const models_1 = __importDefault(require("../models"));
const StudentLeave_1 = require("../models/StudentLeave");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
// POST /api/student-leaves - Create leave request
const createLeave = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { studentId, batchId, startDate, endDate, reason } = req.body;
        // Validation
        if (!studentId || !batchId || !startDate || !endDate) {
            res.status(400).json({
                status: 'error',
                message: 'studentId, batchId, startDate, and endDate are required',
            });
            return;
        }
        // Check if user is the student or an admin
        if (req.user.userId !== studentId && req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'You can only create leave requests for yourself unless you are an admin',
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
        // Create leave request
        const leave = await models_1.default.StudentLeave.create({
            studentId,
            batchId,
            startDate: start,
            endDate: end,
            reason: reason || null,
            status: StudentLeave_1.LeaveStatus.PENDING,
        });
        // Fetch with relations
        const leaveWithDetails = await models_1.default.StudentLeave.findByPk(leave.id, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title'],
                },
            ],
        });
        res.status(201).json({
            status: 'success',
            message: 'Leave request created successfully',
            data: {
                leave: leaveWithDetails,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Create leave error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating leave request',
        });
    }
};
exports.createLeave = createLeave;
// GET /api/student-leaves - Get all leave requests
const getLeaves = async (req, res) => {
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
        // Students can only see their own leaves
        if (req.user.role === User_1.UserRole.STUDENT) {
            where.studentId = req.user.userId;
        }
        else if (studentId) {
            where.studentId = parseInt(studentId, 10);
        }
        if (batchId) {
            where.batchId = parseInt(batchId, 10);
        }
        if (status) {
            where.status = status;
        }
        const leaves = await models_1.default.StudentLeave.findAll({
            where,
            include: [
                {
                    model: models_1.default.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email', 'phone'],
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
                    required: false,
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json({
            status: 'success',
            data: {
                leaves,
                count: leaves.length,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get leaves error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching leave requests',
        });
    }
};
exports.getLeaves = getLeaves;
// POST /api/student-leaves/:id/approve - Approve/Reject leave
const approveLeave = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only admins and superadmins can approve leaves
        if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can approve leave requests',
            });
            return;
        }
        const leaveId = parseInt(req.params.id, 10);
        const { approve, rejectionReason } = req.body;
        if (isNaN(leaveId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid leave ID',
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
        // Find leave
        const leave = await models_1.default.StudentLeave.findByPk(leaveId);
        if (!leave) {
            res.status(404).json({
                status: 'error',
                message: 'Leave request not found',
            });
            return;
        }
        // Update leave status
        leave.status = approve ? StudentLeave_1.LeaveStatus.APPROVED : StudentLeave_1.LeaveStatus.REJECTED;
        leave.approvedBy = req.user.userId;
        leave.approvedAt = new Date();
        if (!approve && rejectionReason) {
            leave.rejectionReason = rejectionReason;
        }
        await leave.save();
        // Fetch with relations
        const leaveWithDetails = await models_1.default.StudentLeave.findByPk(leave.id, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title'],
                },
                {
                    model: models_1.default.User,
                    as: 'approver',
                    attributes: ['id', 'name', 'email'],
                },
            ],
        });
        res.status(200).json({
            status: 'success',
            message: `Leave request ${approve ? 'approved' : 'rejected'} successfully`,
            data: {
                leave: leaveWithDetails,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Approve leave error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while processing leave request',
        });
    }
};
exports.approveLeave = approveLeave;
//# sourceMappingURL=studentLeave.controller.js.map