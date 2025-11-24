"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAttendance = exports.checkoutSession = exports.checkinSession = exports.createSession = exports.getSessions = void 0;
const models_1 = __importDefault(require("../models"));
const Session_1 = require("../models/Session");
const Attendance_1 = require("../models/Attendance");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const getSessions = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { facultyId, batchId, status } = req.query;
        // Build where clause
        const whereClause = {};
        if (facultyId) {
            const facultyIdNum = parseInt(facultyId, 10);
            if (isNaN(facultyIdNum)) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid facultyId',
                });
                return;
            }
            whereClause.facultyId = facultyIdNum;
        }
        if (batchId) {
            const batchIdNum = parseInt(batchId, 10);
            if (isNaN(batchIdNum)) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid batchId',
                });
                return;
            }
            whereClause.batchId = batchIdNum;
        }
        if (status && Object.values(Session_1.SessionStatus).includes(status)) {
            whereClause.status = status;
        }
        // Get sessions with batch information
        const sessions = await models_1.default.Session.findAll({
            where: whereClause,
            include: [
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title', 'status'],
                },
            ],
            order: [['date', 'DESC'], ['startTime', 'DESC']],
        });
        res.status(200).json({
            status: 'success',
            data: sessions,
        });
    }
    catch (error) {
        logger_1.logger.error('Get sessions error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching sessions',
        });
    }
};
exports.getSessions = getSessions;
const createSession = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { batchId, facultyId, date, startTime, endTime, topic, isBackup } = req.body;
        // Validation
        if (!batchId || !facultyId || !date || !startTime || !endTime) {
            res.status(400).json({
                status: 'error',
                message: 'batchId, facultyId, date, startTime, and endTime are required',
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
        // Verify faculty exists and has faculty role
        const faculty = await models_1.default.User.findByPk(facultyId);
        if (!faculty) {
            res.status(404).json({
                status: 'error',
                message: 'Faculty not found',
            });
            return;
        }
        if (faculty.role !== User_1.UserRole.FACULTY) {
            res.status(400).json({
                status: 'error',
                message: 'User is not a faculty member',
            });
            return;
        }
        // Validate date format
        const sessionDate = new Date(date);
        if (isNaN(sessionDate.getTime())) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid date format. Use YYYY-MM-DD',
            });
            return;
        }
        // Validate time format (HH:mm or HH:mm:ss)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid time format. Use HH:mm or HH:mm:ss',
            });
            return;
        }
        // Create session
        const session = await models_1.default.Session.create({
            batchId,
            facultyId,
            date: sessionDate,
            startTime,
            endTime,
            topic: topic || null,
            isBackup: isBackup || false,
            status: Session_1.SessionStatus.SCHEDULED,
        });
        res.status(201).json({
            status: 'success',
            message: 'Session created successfully',
            data: {
                session: {
                    id: session.id,
                    batchId: session.batchId,
                    facultyId: session.facultyId,
                    date: session.date,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    topic: session.topic,
                    isBackup: session.isBackup,
                    status: session.status,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Create session error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating session',
        });
    }
};
exports.createSession = createSession;
const checkinSession = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const sessionId = parseInt(req.params.id, 10);
        if (isNaN(sessionId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid session ID',
            });
            return;
        }
        // Find session
        const session = await models_1.default.Session.findByPk(sessionId);
        if (!session) {
            res.status(404).json({
                status: 'error',
                message: 'Session not found',
            });
            return;
        }
        // Check if session is in scheduled status
        if (session.status !== Session_1.SessionStatus.SCHEDULED) {
            res.status(400).json({
                status: 'error',
                message: `Cannot check-in. Session status must be 'scheduled'. Current status: ${session.status}`,
            });
            return;
        }
        // Check if user is the faculty for this session (faculty-only)
        if (session.facultyId !== req.user.userId) {
            res.status(403).json({
                status: 'error',
                message: 'Only the assigned faculty can check-in this session',
            });
            return;
        }
        // Verify faculty exists and is active (Prime Academy rule: cannot check-in without faculty)
        const faculty = await models_1.default.User.findByPk(session.facultyId);
        if (!faculty || !faculty.isActive) {
            res.status(400).json({
                status: 'error',
                message: 'Cannot check-in: Faculty is not available or inactive',
            });
            return;
        }
        // Update session status and actual start time
        session.status = Session_1.SessionStatus.ONGOING;
        session.actualStartAt = new Date();
        await session.save();
        res.status(200).json({
            status: 'success',
            message: 'Session checked in successfully',
            data: {
                session: {
                    id: session.id,
                    status: session.status,
                    actualStartAt: session.actualStartAt,
                    updatedAt: session.updatedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Check-in session error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error during check-in',
        });
    }
};
exports.checkinSession = checkinSession;
const checkoutSession = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const sessionId = parseInt(req.params.id, 10);
        if (isNaN(sessionId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid session ID',
            });
            return;
        }
        // Find session
        const session = await models_1.default.Session.findByPk(sessionId);
        if (!session) {
            res.status(404).json({
                status: 'error',
                message: 'Session not found',
            });
            return;
        }
        // Check if session is ongoing (Prime Academy rule: cannot end without check-out)
        if (session.status !== Session_1.SessionStatus.ONGOING) {
            res.status(400).json({
                status: 'error',
                message: `Cannot check-out. Session status must be 'ongoing'. Current status: ${session.status}`,
            });
            return;
        }
        // Check if user is the faculty for this session (faculty-only)
        if (session.facultyId !== req.user.userId) {
            res.status(403).json({
                status: 'error',
                message: 'Only the assigned faculty can check-out this session',
            });
            return;
        }
        // Check if session was checked in (Prime Academy rule: cannot end without check-out)
        if (!session.actualStartAt) {
            res.status(400).json({
                status: 'error',
                message: 'Cannot check-out: Session was never checked in',
            });
            return;
        }
        // Update session status and actual end time
        session.status = Session_1.SessionStatus.COMPLETED;
        session.actualEndAt = new Date();
        await session.save();
        res.status(200).json({
            status: 'success',
            message: 'Session checked out successfully',
            data: {
                session: {
                    id: session.id,
                    status: session.status,
                    actualStartAt: session.actualStartAt,
                    actualEndAt: session.actualEndAt,
                    updatedAt: session.updatedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Check-out session error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error during check-out',
        });
    }
};
exports.checkoutSession = checkoutSession;
const markAttendance = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const sessionId = parseInt(req.params.id, 10);
        const { studentId, status, isManual } = req.body;
        if (isNaN(sessionId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid session ID',
            });
            return;
        }
        // Validation
        if (!studentId || !status) {
            res.status(400).json({
                status: 'error',
                message: 'studentId and status are required',
            });
            return;
        }
        // Validate status
        if (!Object.values(Attendance_1.AttendanceStatus).includes(status)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid status. Allowed values: ' + Object.values(Attendance_1.AttendanceStatus).join(', '),
            });
            return;
        }
        // Find session
        const session = await models_1.default.Session.findByPk(sessionId);
        if (!session) {
            res.status(404).json({
                status: 'error',
                message: 'Session not found',
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
        // If status is 'manual_present', automatically set isManual=true and markedBy=facultyId
        const isManualAttendance = status === Attendance_1.AttendanceStatus.MANUAL_PRESENT;
        const markedByUserId = isManualAttendance ? session.facultyId : req.user.userId;
        // Check if attendance already exists
        const existingAttendance = await models_1.default.Attendance.findOne({
            where: {
                sessionId,
                studentId,
            },
        });
        let attendance;
        if (existingAttendance) {
            // Update existing attendance
            existingAttendance.status = status;
            existingAttendance.isManual = isManualAttendance || (isManual || false);
            existingAttendance.markedBy = markedByUserId;
            existingAttendance.markedAt = new Date();
            await existingAttendance.save();
            attendance = existingAttendance;
        }
        else {
            // Create new attendance record
            attendance = await models_1.default.Attendance.create({
                sessionId,
                studentId,
                status,
                isManual: isManualAttendance || (isManual || false),
                markedBy: markedByUserId,
                markedAt: new Date(),
            });
        }
        res.status(existingAttendance ? 200 : 201).json({
            status: 'success',
            message: existingAttendance ? 'Attendance updated successfully' : 'Attendance marked successfully',
            data: {
                attendance: {
                    id: attendance.id,
                    sessionId: attendance.sessionId,
                    studentId: attendance.studentId,
                    status: attendance.status,
                    isManual: attendance.isManual,
                    markedBy: attendance.markedBy,
                    markedAt: attendance.markedAt,
                    createdAt: attendance.createdAt,
                    updatedAt: attendance.updatedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Mark attendance error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while marking attendance',
        });
    }
};
exports.markAttendance = markAttendance;
//# sourceMappingURL=session.controller.js.map