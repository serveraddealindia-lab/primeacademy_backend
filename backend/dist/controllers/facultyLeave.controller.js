"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveLeave = exports.getLeaves = exports.createLeave = void 0;
const models_1 = __importDefault(require("../models"));
const FacultyLeave_1 = require("../models/FacultyLeave");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
// POST /api/faculty-leaves - Create leave request
const createLeave = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { facultyId, startDate, endDate, reason } = req.body;
        // Validation
        if (!facultyId || !startDate || !endDate) {
            res.status(400).json({
                status: 'error',
                message: 'facultyId, startDate, and endDate are required',
            });
            return;
        }
        // Check if user is the faculty or an admin
        if (req.user.userId !== facultyId && req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'You can only create leave requests for yourself unless you are an admin',
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
        const leave = await models_1.default.FacultyLeave.create({
            facultyId,
            startDate: start,
            endDate: end,
            reason: reason || null,
            status: FacultyLeave_1.LeaveStatus.PENDING,
        });
        // Fetch with relations
        const leaveWithDetails = await models_1.default.FacultyLeave.findByPk(leave.id, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'faculty',
                    attributes: ['id', 'name', 'email'],
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
// GET /api/faculty-leaves - Get all leave requests
const getLeaves = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { facultyId, status } = req.query;
        const where = {};
        // Faculty can only see their own leaves
        if (req.user.role === User_1.UserRole.FACULTY) {
            where.facultyId = req.user.userId;
        }
        else if (facultyId) {
            where.facultyId = parseInt(facultyId, 10);
        }
        if (status) {
            where.status = status;
        }
        const leaves = await models_1.default.FacultyLeave.findAll({
            where,
            include: [
                {
                    model: models_1.default.User,
                    as: 'faculty',
                    attributes: ['id', 'name', 'email', 'phone'],
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
// POST /api/faculty-leaves/:id/approve - Approve/Reject leave
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
        const leave = await models_1.default.FacultyLeave.findByPk(leaveId);
        if (!leave) {
            res.status(404).json({
                status: 'error',
                message: 'Leave request not found',
            });
            return;
        }
        // Update leave status
        leave.status = approve ? FacultyLeave_1.LeaveStatus.APPROVED : FacultyLeave_1.LeaveStatus.REJECTED;
        leave.approvedBy = req.user.userId;
        leave.approvedAt = new Date();
        if (!approve && rejectionReason) {
            leave.rejectionReason = rejectionReason;
        }
        await leave.save();
        // Fetch with relations
        const leaveWithDetails = await models_1.default.FacultyLeave.findByPk(leave.id, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'faculty',
                    attributes: ['id', 'name', 'email'],
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
//# sourceMappingURL=facultyLeave.controller.js.map