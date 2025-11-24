"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPortfolioStatus = exports.getPendingPayments = exports.getBatchAttendance = exports.getStudentsWithoutBatch = exports.getAllStudents = void 0;
const models_1 = __importDefault(require("../models"));
const User_1 = require("../models/User");
const PaymentTransaction_1 = require("../models/PaymentTransaction");
const Portfolio_1 = require("../models/Portfolio");
const logger_1 = require("../utils/logger");
const sequelize_1 = require("sequelize");
const getAllStudents = async (_req, res) => {
    try {
        // Get all active students
        const students = await models_1.default.User.findAll({
            where: {
                role: User_1.UserRole.STUDENT,
                isActive: true,
            },
            attributes: ['id', 'name', 'email', 'phone', 'createdAt'],
            order: [['name', 'ASC']],
        });
        // Format response
        const formattedStudents = students.map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email,
            phone: student.phone,
            createdAt: student.createdAt,
        }));
        res.status(200).json({
            status: 'success',
            data: {
                students: formattedStudents,
                totalCount: formattedStudents.length,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get all students error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching students',
        });
    }
};
exports.getAllStudents = getAllStudents;
const getStudentsWithoutBatch = async (_req, res) => {
    try {
        // Get all students who don't have any active enrollment
        const students = await models_1.default.User.findAll({
            where: {
                role: User_1.UserRole.STUDENT,
                isActive: true,
            },
            include: [
                {
                    model: models_1.default.Enrollment,
                    as: 'enrollments',
                    required: false,
                    include: [
                        {
                            model: models_1.default.Batch,
                            as: 'batch',
                            attributes: ['id', 'title', 'status'],
                        },
                    ],
                },
            ],
            attributes: ['id', 'name', 'email', 'phone', 'createdAt'],
        });
        // Filter students without any enrollment or with only inactive batches
        const studentsWithoutBatch = students.filter((student) => {
            const enrollments = student.enrollments || [];
            const activeEnrollments = enrollments.filter((enrollment) => {
                return enrollment.batch && enrollment.batch.status !== 'ended' && enrollment.batch.status !== 'cancelled';
            });
            return activeEnrollments.length === 0;
        });
        // Format response
        const formattedStudents = studentsWithoutBatch.map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email,
            phone: student.phone,
            createdAt: student.createdAt,
            enrollments: student.enrollments || [],
        }));
        res.status(200).json({
            status: 'success',
            data: {
                students: formattedStudents,
                totalCount: formattedStudents.length,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get students without batch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching students without batch',
        });
    }
};
exports.getStudentsWithoutBatch = getStudentsWithoutBatch;
const getBatchAttendance = async (req, res) => {
    try {
        const { batchId, from, to } = req.query;
        if (!batchId) {
            res.status(400).json({
                status: 'error',
                message: 'batchId query parameter is required',
            });
            return;
        }
        const batchIdNum = parseInt(batchId, 10);
        if (isNaN(batchIdNum)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid batchId',
            });
            return;
        }
        // Verify batch exists
        const batch = await models_1.default.Batch.findByPk(batchIdNum);
        if (!batch) {
            res.status(404).json({
                status: 'error',
                message: 'Batch not found',
            });
            return;
        }
        // Build session filter
        const sessionWhere = { batchId: batchIdNum };
        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid from date format. Use YYYY-MM-DD',
                });
                return;
            }
            sessionWhere.date = { [sequelize_1.Op.gte]: fromDate };
        }
        if (to) {
            const toDate = new Date(to);
            if (isNaN(toDate.getTime())) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid to date format. Use YYYY-MM-DD',
                });
                return;
            }
            if (from) {
                sessionWhere.date = {
                    ...sessionWhere.date,
                    [sequelize_1.Op.lte]: toDate,
                };
            }
            else {
                sessionWhere.date = { [sequelize_1.Op.lte]: toDate };
            }
        }
        // Get sessions for this batch (and date range if provided)
        const sessions = await models_1.default.Session.findAll({
            where: sessionWhere,
            attributes: ['id'],
        });
        const sessionIds = sessions.map((s) => s.id);
        if (sessionIds.length === 0) {
            // No sessions in date range
            res.status(200).json({
                status: 'success',
                data: {
                    batch: {
                        id: batch.id,
                        title: batch.title,
                        startDate: batch.startDate,
                        endDate: batch.endDate,
                    },
                    dateRange: {
                        from: from || null,
                        to: to || null,
                    },
                    sessions: [],
                    studentStatistics: [],
                    totalSessions: 0,
                    totalAttendances: 0,
                },
            });
            return;
        }
        // Build attendance filter
        const whereClause = {
            sessionId: { [sequelize_1.Op.in]: sessionIds },
        };
        // Get attendance records
        const attendances = await models_1.default.Attendance.findAll({
            where: whereClause,
            include: [
                {
                    model: models_1.default.Session,
                    as: 'session',
                    attributes: ['id', 'date', 'startTime', 'endTime', 'topic', 'status'],
                },
                {
                    model: models_1.default.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: models_1.default.User,
                    as: 'marker',
                    attributes: ['id', 'name', 'email'],
                    required: false,
                },
            ],
            order: [
                [{ model: models_1.default.Session, as: 'session' }, 'date', 'ASC'],
                [{ model: models_1.default.Session, as: 'session' }, 'startTime', 'ASC'],
            ],
        });
        // Group by session and calculate statistics
        const attendanceBySession = {};
        const studentStats = {};
        attendances.forEach((attendance) => {
            const sessionId = attendance.sessionId;
            const studentId = attendance.studentId;
            // Initialize session if not exists
            if (!attendanceBySession[sessionId]) {
                attendanceBySession[sessionId] = {
                    session: {
                        id: attendance.session.id,
                        date: attendance.session.date,
                        startTime: attendance.session.startTime,
                        endTime: attendance.session.endTime,
                        topic: attendance.session.topic,
                        status: attendance.session.status,
                    },
                    attendances: [],
                };
            }
            // Initialize student stats if not exists
            if (!studentStats[studentId]) {
                studentStats[studentId] = { present: 0, absent: 0, manualPresent: 0, total: 0 };
            }
            // Add attendance record
            attendanceBySession[sessionId].attendances.push({
                id: attendance.id,
                studentId: attendance.student.id,
                studentName: attendance.student.name,
                studentEmail: attendance.student.email,
                status: attendance.status,
                isManual: attendance.isManual,
                markedBy: attendance.marker ? {
                    id: attendance.marker.id,
                    name: attendance.marker.name,
                } : null,
                markedAt: attendance.markedAt,
            });
            // Update student stats
            studentStats[studentId].total++;
            if (attendance.status === 'present') {
                studentStats[studentId].present++;
            }
            else if (attendance.status === 'absent') {
                studentStats[studentId].absent++;
            }
            else if (attendance.status === 'manual_present') {
                studentStats[studentId].manualPresent++;
            }
        });
        // Format response
        const sessionsList = Object.values(attendanceBySession);
        const studentStatsList = Object.entries(studentStats).map(([studentId, stats]) => ({
            studentId: parseInt(studentId, 10),
            ...stats,
            attendanceRate: stats.total > 0 ? ((stats.present + stats.manualPresent) / stats.total * 100).toFixed(2) + '%' : '0%',
        }));
        // Calculate attendance statistics
        const totalSessions = sessions.length;
        const totalAttendanceCount = attendances.length;
        // Count present (including manual_present) attendances
        const presentCount = attendances.filter((a) => a.status === 'present' || a.status === 'manual_present').length;
        // Calculate attendance percentage
        const attendancePercentage = totalAttendanceCount > 0
            ? ((presentCount / totalAttendanceCount) * 100).toFixed(2) + '%'
            : '0%';
        res.status(200).json({
            status: 'success',
            data: {
                batch: {
                    id: batch.id,
                    title: batch.title,
                    startDate: batch.startDate,
                    endDate: batch.endDate,
                },
                dateRange: {
                    from: from || null,
                    to: to || null,
                },
                statistics: {
                    totalSessions,
                    totalAttendanceCount,
                    attendancePercentage,
                    presentCount,
                    absentCount: attendances.filter((a) => a.status === 'absent').length,
                },
                sessions: sessionsList,
                studentStatistics: studentStatsList,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get batch attendance error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching batch attendance',
        });
    }
};
exports.getBatchAttendance = getBatchAttendance;
const getPendingPayments = async (_req, res) => {
    try {
        // Get all pending payment transactions
        const payments = await models_1.default.PaymentTransaction.findAll({
            where: {
                status: {
                    [sequelize_1.Op.or]: [PaymentTransaction_1.PaymentStatus.PENDING, PaymentTransaction_1.PaymentStatus.PARTIAL],
                },
            },
            include: [
                {
                    model: models_1.default.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email', 'phone'],
                },
            ],
            order: [['dueDate', 'ASC']],
        });
        // Calculate summary
        const totalPendingAmount = payments.reduce((sum, payment) => {
            const amount = parseFloat(payment.amount.toString());
            const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
            const remaining = Math.max(amount - paidAmount, 0);
            return sum + remaining;
        }, 0);
        // Group by overdue and upcoming
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue = payments.filter((payment) => {
            const dueDate = new Date(payment.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const remaining = parseFloat(payment.amount.toString()) - parseFloat(payment.paidAmount?.toString() || '0');
            return dueDate < today && remaining > 0;
        });
        const upcoming = payments.filter((payment) => {
            const dueDate = new Date(payment.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const remaining = parseFloat(payment.amount.toString()) - parseFloat(payment.paidAmount?.toString() || '0');
            return dueDate >= today && remaining > 0;
        });
        // Format response
        const formattedPayments = payments
            .map((payment) => {
            const amount = parseFloat(payment.amount.toString());
            const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
            const remaining = Math.max(amount - paidAmount, 0);
            if (remaining <= 0) {
                return null;
            }
            return {
                id: payment.id,
                student: {
                    id: payment.student.id,
                    name: payment.student.name,
                    email: payment.student.email,
                    phone: payment.student.phone,
                },
                amount,
                paidAmount,
                remainingAmount: remaining,
                dueDate: payment.dueDate,
                status: payment.status,
                isOverdue: new Date(payment.dueDate) < today,
                receiptUrl: payment.receiptUrl,
                createdAt: payment.createdAt,
            };
        })
            .filter(Boolean);
        res.status(200).json({
            status: 'success',
            data: {
                payments: formattedPayments,
                summary: {
                    totalPending: formattedPayments.length,
                    totalPendingAmount: totalPendingAmount.toFixed(2),
                    overdue: {
                        count: overdue.length,
                        amount: overdue
                            .reduce((sum, payment) => {
                            const amount = parseFloat(payment.amount.toString());
                            const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
                            return sum + Math.max(amount - paidAmount, 0);
                        }, 0)
                            .toFixed(2),
                    },
                    upcoming: {
                        count: upcoming.length,
                        amount: upcoming
                            .reduce((sum, payment) => {
                            const amount = parseFloat(payment.amount.toString());
                            const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
                            return sum + Math.max(amount - paidAmount, 0);
                        }, 0)
                            .toFixed(2),
                    },
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get pending payments error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching pending payments',
        });
    }
};
exports.getPendingPayments = getPendingPayments;
const getPortfolioStatus = async (_req, res) => {
    try {
        // Get all portfolios with their status
        const portfolios = await models_1.default.Portfolio.findAll({
            include: [
                {
                    model: models_1.default.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title', 'status'],
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
        // Group by status
        const byStatus = {
            [Portfolio_1.PortfolioStatus.PENDING]: [],
            [Portfolio_1.PortfolioStatus.APPROVED]: [],
            [Portfolio_1.PortfolioStatus.REJECTED]: [],
        };
        portfolios.forEach((portfolio) => {
            byStatus[portfolio.status].push(portfolio);
        });
        // Format response
        const formattedPortfolios = portfolios.map((portfolio) => ({
            id: portfolio.id,
            student: {
                id: portfolio.student.id,
                name: portfolio.student.name,
                email: portfolio.student.email,
            },
            batch: {
                id: portfolio.batch.id,
                title: portfolio.batch.title,
                status: portfolio.batch.status,
            },
            status: portfolio.status,
            files: portfolio.files,
            approvedBy: portfolio.approver ? {
                id: portfolio.approver.id,
                name: portfolio.approver.name,
                email: portfolio.approver.email,
            } : null,
            approvedAt: portfolio.approvedAt,
            createdAt: portfolio.createdAt,
            updatedAt: portfolio.updatedAt,
        }));
        res.status(200).json({
            status: 'success',
            data: {
                portfolios: formattedPortfolios,
                summary: {
                    total: portfolios.length,
                    pending: byStatus[Portfolio_1.PortfolioStatus.PENDING].length,
                    approved: byStatus[Portfolio_1.PortfolioStatus.APPROVED].length,
                    rejected: byStatus[Portfolio_1.PortfolioStatus.REJECTED].length,
                },
                byStatus: {
                    pending: byStatus[Portfolio_1.PortfolioStatus.PENDING].map((p) => ({
                        id: p.id,
                        studentName: p.student.name,
                        batchTitle: p.batch.title,
                        createdAt: p.createdAt,
                    })),
                    approved: byStatus[Portfolio_1.PortfolioStatus.APPROVED].map((p) => ({
                        id: p.id,
                        studentName: p.student.name,
                        batchTitle: p.batch.title,
                        approvedAt: p.approvedAt,
                    })),
                    rejected: byStatus[Portfolio_1.PortfolioStatus.REJECTED].map((p) => ({
                        id: p.id,
                        studentName: p.student.name,
                        batchTitle: p.batch.title,
                        updatedAt: p.updatedAt,
                    })),
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get portfolio status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching portfolio status',
        });
    }
};
exports.getPortfolioStatus = getPortfolioStatus;
// Extended report functions
// Extended report functions - see report-extended.controller.ts for implementation
//# sourceMappingURL=report.controller.js.map