"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadReportCSV = exports.getAllAnalysisReports = exports.getMonthwisePayments = exports.getBatchesByFaculty = exports.getStudentAttendance = exports.getStudentCurrentBatch = void 0;
const models_1 = __importDefault(require("../models"));
const User_1 = require("../models/User");
const PaymentTransaction_1 = require("../models/PaymentTransaction");
const Portfolio_1 = require("../models/Portfolio");
const logger_1 = require("../utils/logger");
const sequelize_1 = require("sequelize");
// Re-export all functions from main report controller
__exportStar(require("./report.controller"), exports);
// Get particular student's current batch
const getStudentCurrentBatch = async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId, 10);
        if (isNaN(studentId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid student ID',
            });
            return;
        }
        const student = await models_1.default.User.findByPk(studentId, {
            where: { role: User_1.UserRole.STUDENT },
            include: [
                {
                    model: models_1.default.Enrollment,
                    as: 'enrollments',
                    include: [
                        {
                            model: models_1.default.Batch,
                            as: 'batch',
                            include: [
                                {
                                    model: models_1.default.User,
                                    as: 'admin',
                                    attributes: ['id', 'name', 'email'],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        if (!student) {
            res.status(404).json({
                status: 'error',
                message: 'Student not found',
            });
            return;
        }
        // Get current active batch
        const currentBatch = student.enrollments
            ?.filter((enrollment) => {
            const batch = enrollment.batch;
            return batch && batch.status !== 'ended' && batch.status !== 'cancelled';
        })
            .map((enrollment) => ({
            enrollmentId: enrollment.id,
            enrollmentDate: enrollment.enrollmentDate,
            enrollmentStatus: enrollment.status,
            batch: {
                id: enrollment.batch.id,
                title: enrollment.batch.title,
                software: enrollment.batch.software,
                mode: enrollment.batch.mode,
                startDate: enrollment.batch.startDate,
                endDate: enrollment.batch.endDate,
                maxCapacity: enrollment.batch.maxCapacity,
                schedule: enrollment.batch.schedule,
                status: enrollment.batch.status,
                createdBy: enrollment.batch.admin,
            },
        }))[0] || null;
        res.status(200).json({
            status: 'success',
            data: {
                student: {
                    id: student.id,
                    name: student.name,
                    email: student.email,
                    phone: student.phone,
                },
                currentBatch,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get student current batch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching student current batch',
        });
    }
};
exports.getStudentCurrentBatch = getStudentCurrentBatch;
// Get particular student's attendance
const getStudentAttendance = async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId, 10);
        if (isNaN(studentId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid student ID',
            });
            return;
        }
        const { from, to } = req.query;
        const student = await models_1.default.User.findByPk(studentId, {
            where: { role: User_1.UserRole.STUDENT },
            attributes: ['id', 'name', 'email'],
        });
        if (!student) {
            res.status(404).json({
                status: 'error',
                message: 'Student not found',
            });
            return;
        }
        const whereClause = { studentId };
        if (from || to) {
            whereClause['$session.date$'] = {};
            if (from) {
                whereClause['$session.date$'][sequelize_1.Op.gte] = new Date(from);
            }
            if (to) {
                whereClause['$session.date$'][sequelize_1.Op.lte] = new Date(to);
            }
        }
        const attendances = await models_1.default.Attendance.findAll({
            where: whereClause,
            include: [
                {
                    model: models_1.default.Session,
                    as: 'session',
                    include: [
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
                },
            ],
            order: [[{ model: models_1.default.Session, as: 'session' }, 'date', 'DESC']],
        });
        const stats = {
            total: attendances.length,
            present: attendances.filter((a) => a.status === 'present').length,
            absent: attendances.filter((a) => a.status === 'absent').length,
            manualPresent: attendances.filter((a) => a.status === 'manual_present').length,
        };
        const attendanceRate = stats.total > 0 ? ((stats.present + stats.manualPresent) / stats.total * 100).toFixed(2) + '%' : '0%';
        res.status(200).json({
            status: 'success',
            data: {
                student: {
                    id: student.id,
                    name: student.name,
                    email: student.email,
                },
                dateRange: {
                    from: from || null,
                    to: to || null,
                },
                statistics: {
                    ...stats,
                    attendanceRate,
                },
                attendances: attendances.map((a) => ({
                    id: a.id,
                    session: {
                        id: a.session.id,
                        date: a.session.date,
                        startTime: a.session.startTime,
                        endTime: a.session.endTime,
                        topic: a.session.topic,
                        batch: a.session.batch,
                        faculty: a.session.faculty,
                    },
                    status: a.status,
                    isManual: a.isManual,
                    markedAt: a.markedAt,
                })),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get student attendance error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching student attendance',
        });
    }
};
exports.getStudentAttendance = getStudentAttendance;
// Get number of batches in particular duration by faculty
const getBatchesByFaculty = async (req, res) => {
    try {
        const { facultyId, from, to } = req.query;
        const whereClause = {};
        if (from) {
            whereClause.startDate = { [sequelize_1.Op.gte]: new Date(from) };
        }
        if (to) {
            whereClause.endDate = { [sequelize_1.Op.lte]: new Date(to) };
        }
        const batches = await models_1.default.Batch.findAll({
            where: whereClause,
            include: [
                {
                    model: models_1.default.Session,
                    as: 'sessions',
                    include: [
                        {
                            model: models_1.default.User,
                            as: 'faculty',
                            attributes: ['id', 'name', 'email'],
                        },
                    ],
                },
            ],
        });
        // Group by faculty
        const facultyStats = {};
        batches.forEach((batch) => {
            const sessions = batch.sessions || [];
            sessions.forEach((session) => {
                if (session.faculty) {
                    const fid = session.faculty.id;
                    if (!facultyStats[fid]) {
                        facultyStats[fid] = {
                            faculty: session.faculty,
                            batches: [],
                            totalSessions: 0,
                            totalHours: 0,
                        };
                    }
                    // Check if batch already counted for this faculty
                    if (!facultyStats[fid].batches.find((b) => b.id === batch.id)) {
                        facultyStats[fid].batches.push({
                            id: batch.id,
                            title: batch.title,
                            software: batch.software,
                            startDate: batch.startDate,
                            endDate: batch.endDate,
                        });
                    }
                    // Calculate hours
                    const [startHours, startMinutes] = session.startTime.split(':').map(Number);
                    const [endHours, endMinutes] = session.endTime.split(':').map(Number);
                    const startTotal = startHours * 60 + startMinutes;
                    const endTotal = endHours * 60 + endMinutes;
                    const hours = (endTotal - startTotal) / 60;
                    facultyStats[fid].totalSessions++;
                    facultyStats[fid].totalHours += hours;
                }
            });
        });
        // Filter by facultyId if provided
        let result = Object.values(facultyStats);
        if (facultyId) {
            const fid = parseInt(facultyId, 10);
            result = result.filter((stat) => stat.faculty.id === fid);
        }
        res.status(200).json({
            status: 'success',
            data: {
                dateRange: {
                    from: from || null,
                    to: to || null,
                },
                facultyStatistics: result.map((stat) => ({
                    faculty: stat.faculty,
                    batchCount: stat.batches.length,
                    batches: stat.batches,
                    totalSessions: stat.totalSessions,
                    totalHours: parseFloat(stat.totalHours.toFixed(2)),
                })),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get batches by faculty error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching batches by faculty',
        });
    }
};
exports.getBatchesByFaculty = getBatchesByFaculty;
// Get monthwise payment reports
const getMonthwisePayments = async (req, res) => {
    try {
        const { month, year } = req.query;
        const whereClause = {};
        if (month && year) {
            const startDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
            const endDate = new Date(parseInt(year, 10), parseInt(month, 10), 0, 23, 59, 59);
            whereClause.createdAt = { [sequelize_1.Op.between]: [startDate, endDate] };
        }
        else if (year) {
            const startDate = new Date(parseInt(year, 10), 0, 1);
            const endDate = new Date(parseInt(year, 10), 11, 31, 23, 59, 59);
            whereClause.createdAt = { [sequelize_1.Op.between]: [startDate, endDate] };
        }
        const payments = await models_1.default.PaymentTransaction.findAll({
            where: whereClause,
            include: [
                {
                    model: models_1.default.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email', 'phone'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        // Group by month
        const monthlyStats = {};
        payments.forEach((payment) => {
            const date = new Date(payment.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = {
                    month: monthLabel,
                    payments: [],
                    totalAmount: 0,
                    paid: 0,
                    pending: 0,
                };
            }
            const amount = parseFloat(payment.amount.toString());
            const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
            const remaining = Math.max(amount - paidAmount, 0);
            monthlyStats[monthKey].payments.push({
                id: payment.id,
                student: payment.student,
                amount,
                paidAmount,
                remainingAmount: remaining,
                status: payment.status,
                dueDate: payment.dueDate,
                createdAt: payment.createdAt,
            });
            monthlyStats[monthKey].totalAmount += amount;
            monthlyStats[monthKey].paid += paidAmount;
            monthlyStats[monthKey].pending += remaining;
        });
        res.status(200).json({
            status: 'success',
            data: {
                filter: {
                    month: month || null,
                    year: year || null,
                },
                monthlyStatistics: Object.values(monthlyStats).map((stat) => ({
                    ...stat,
                    totalAmount: parseFloat(stat.totalAmount.toFixed(2)),
                    paid: parseFloat(stat.paid.toFixed(2)),
                    pending: parseFloat(stat.pending.toFixed(2)),
                })),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get monthwise payments error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching monthwise payments',
        });
    }
};
exports.getMonthwisePayments = getMonthwisePayments;
// Get all analysis reports (comprehensive master report)
const getAllAnalysisReports = async (_req, res) => {
    try {
        // Get all data
        const [students, batches, sessions, payments, portfolios, enrollments] = await Promise.all([
            models_1.default.User.count({ where: { role: User_1.UserRole.STUDENT, isActive: true } }),
            models_1.default.Batch.count(),
            models_1.default.Session.count(),
            models_1.default.PaymentTransaction.count(),
            models_1.default.Portfolio.count(),
            models_1.default.Enrollment.count(),
        ]);
        const activeBatches = await models_1.default.Batch.count({ where: { status: { [sequelize_1.Op.ne]: 'ended' } } });
        const pendingPayments = await models_1.default.PaymentTransaction.count({
            where: {
                status: {
                    [sequelize_1.Op.or]: [PaymentTransaction_1.PaymentStatus.PENDING, PaymentTransaction_1.PaymentStatus.PARTIAL],
                },
            },
        });
        const pendingPortfolios = await models_1.default.Portfolio.count({ where: { status: Portfolio_1.PortfolioStatus.PENDING } });
        const totalPaymentAmount = await models_1.default.PaymentTransaction.sum('amount') || 0;
        const totalPaidAmount = await models_1.default.PaymentTransaction.sum('paidAmount') || 0;
        const pendingAmount = Math.max(totalPaymentAmount - totalPaidAmount, 0);
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    students: {
                        total: students,
                        withBatch: enrollments,
                        withoutBatch: students - enrollments,
                    },
                    batches: {
                        total: batches,
                        active: activeBatches,
                        ended: batches - activeBatches,
                    },
                    sessions: {
                        total: sessions,
                    },
                    payments: {
                        total: payments,
                        pending: pendingPayments,
                        totalAmount: parseFloat(totalPaymentAmount.toString()),
                        paidAmount: parseFloat(totalPaidAmount.toString()),
                        pendingAmount: parseFloat(pendingAmount.toString()),
                    },
                    portfolios: {
                        total: portfolios,
                        pending: pendingPortfolios,
                    },
                },
                generatedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get all analysis reports error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching analysis reports',
        });
    }
};
exports.getAllAnalysisReports = getAllAnalysisReports;
// Helper function to convert data to CSV
const convertToCSV = (data, headers) => {
    const csvRows = [headers.join(',')];
    data.forEach((row) => {
        const values = headers.map((header) => {
            const value = row[header] || '';
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        });
        csvRows.push(values.join(','));
    });
    return csvRows.join('\n');
};
// Download report as CSV
const downloadReportCSV = async (req, res) => {
    try {
        const { type } = req.query;
        let csvData = '';
        let filename = 'report.csv';
        switch (type) {
            case 'students-without-batch': {
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
                });
                const studentsWithoutBatch = students.filter((student) => {
                    const enrollments = student.enrollments || [];
                    const activeEnrollments = enrollments.filter((enrollment) => {
                        return enrollment.batch && enrollment.batch.status !== 'ended' && enrollment.batch.status !== 'cancelled';
                    });
                    return activeEnrollments.length === 0;
                });
                csvData = convertToCSV(studentsWithoutBatch.map((s) => ({
                    id: s.id,
                    name: s.name,
                    email: s.email,
                    phone: s.phone || '',
                    createdAt: s.createdAt,
                })), ['id', 'name', 'email', 'phone', 'createdAt']);
                filename = 'students-without-batch.csv';
                break;
            }
            case 'pending-payments': {
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
                });
                csvData = convertToCSV(payments.map((p) => ({
                    id: p.id,
                    studentName: p.student.name,
                    studentEmail: p.student.email,
                    studentPhone: p.student.phone || '',
                    amount: p.amount,
                    paidAmount: p.paidAmount || 0,
                    remainingAmount: Math.max(parseFloat(p.amount.toString()) - parseFloat(p.paidAmount?.toString() || '0'), 0),
                    dueDate: p.dueDate,
                    status: p.status,
                    isOverdue: new Date(p.dueDate) < new Date() ? 'Yes' : 'No',
                })), ['id', 'studentName', 'studentEmail', 'studentPhone', 'amount', 'paidAmount', 'remainingAmount', 'dueDate', 'status', 'isOverdue']);
                filename = 'pending-payments.csv';
                break;
            }
            case 'portfolio-status': {
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
                            attributes: ['id', 'title'],
                        },
                        {
                            model: models_1.default.User,
                            as: 'approver',
                            attributes: ['id', 'name', 'email'],
                            required: false,
                        },
                    ],
                });
                csvData = convertToCSV(portfolios.map((p) => ({
                    id: p.id,
                    studentName: p.student.name,
                    studentEmail: p.student.email,
                    batchTitle: p.batch.title,
                    status: p.status,
                    approvedBy: p.approver?.name || '',
                    approvedAt: p.approvedAt || '',
                    createdAt: p.createdAt,
                })), ['id', 'studentName', 'studentEmail', 'batchTitle', 'status', 'approvedBy', 'approvedAt', 'createdAt']);
                filename = 'portfolio-status.csv';
                break;
            }
            default:
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid report type',
                });
                return;
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvData);
    }
    catch (error) {
        logger_1.logger.error('Download report CSV error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while generating CSV',
        });
    }
};
exports.downloadReportCSV = downloadReportCSV;
//# sourceMappingURL=report-extended.controller.js.map