"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBatchHistory = exports.submitSessionAttendance = exports.endSession = exports.startSession = exports.getFacultyAssignedBatches = exports.getFacultyAssignmentsDebug = void 0;
const User_1 = require("../models/User");
const models_1 = __importDefault(require("../models"));
const Session_1 = require("../models/Session");
const Attendance_1 = require("../models/Attendance");
const logger_1 = require("../utils/logger");
const sequelize_1 = require("sequelize");
const mapUiStatusToDb = (status) => {
    switch (status) {
        case 'absent':
            return Attendance_1.AttendanceStatus.ABSENT;
        case 'late':
            return Attendance_1.AttendanceStatus.MANUAL_PRESENT;
        case 'present':
        default:
            return Attendance_1.AttendanceStatus.PRESENT;
    }
};
const mapDbStatusToUi = (status) => {
    switch (status) {
        case Attendance_1.AttendanceStatus.ABSENT:
            return 'absent';
        case Attendance_1.AttendanceStatus.MANUAL_PRESENT:
            return 'late';
        case Attendance_1.AttendanceStatus.PRESENT:
        default:
            return 'present';
    }
};
const todayDate = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
};
const todayDateString = () => todayDate().toISOString().split('T')[0];
const ensureFacultyAccess = async (userId, batchId, role) => {
    if (role === User_1.UserRole.SUPERADMIN || role === User_1.UserRole.ADMIN) {
        return;
    }
    const assignment = await models_1.default.BatchFacultyAssignment.findOne({
        where: { facultyId: userId, batchId },
    });
    if (!assignment) {
        const error = new Error('You are not assigned to this batch');
        error.name = 'UNAUTHORIZED_BATCH';
        throw error;
    }
};
// Debug endpoint to check faculty assignments
const getFacultyAssignmentsDebug = async (req, res) => {
    try {
        const facultyId = parseInt(req.params.facultyId, 10);
        if (isNaN(facultyId)) {
            res.status(400).json({ status: 'error', message: 'Invalid faculty ID' });
            return;
        }
        const faculty = await models_1.default.User.findOne({
            where: { id: facultyId, role: User_1.UserRole.FACULTY },
            attributes: ['id', 'email', 'name', 'role'],
        });
        if (!faculty) {
            res.status(404).json({ status: 'error', message: 'Faculty not found' });
            return;
        }
        const assignments = await models_1.default.BatchFacultyAssignment.findAll({
            where: { facultyId },
            include: [
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    required: false,
                },
            ],
        });
        res.status(200).json({
            status: 'success',
            data: {
                faculty: {
                    id: faculty.id,
                    email: faculty.email,
                    name: faculty.name,
                },
                assignments: assignments.map((a) => {
                    const assignmentJson = a.toJSON();
                    return {
                        assignmentId: a.id,
                        batchId: a.batchId,
                        facultyId: a.facultyId,
                        batch: assignmentJson.batch || null,
                    };
                }),
                totalAssignments: assignments.length,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get faculty assignments debug error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};
exports.getFacultyAssignmentsDebug = getFacultyAssignmentsDebug;
const getFacultyAssignedBatches = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        logger_1.logger.info(`Fetching assigned batches for faculty userId: ${req.user.userId}, email: ${req.user.email}`);
        // Verify the user exists and get their actual ID
        const facultyUser = await models_1.default.User.findOne({
            where: { id: req.user.userId },
            attributes: ['id', 'email', 'name', 'role'],
        });
        if (!facultyUser) {
            logger_1.logger.error(`Faculty user not found: userId=${req.user.userId}`);
            res.status(404).json({
                status: 'error',
                message: 'Faculty user not found',
            });
            return;
        }
        logger_1.logger.info(`Faculty user verified: id=${facultyUser.id}, email=${facultyUser.email}, role=${facultyUser.role}`);
        // Check all assignments for this faculty (for debugging)
        const allAssignments = await models_1.default.BatchFacultyAssignment.findAll({
            where: { facultyId: facultyUser.id },
            attributes: ['id', 'batchId', 'facultyId', 'createdAt'],
        });
        logger_1.logger.info(`Total assignments found in database for faculty ${facultyUser.id}: ${allAssignments.length}`);
        if (allAssignments.length > 0) {
            logger_1.logger.info(`Assignment batch IDs: ${allAssignments.map(a => a.batchId).join(', ')}`);
            // Verify batches exist
            const batchIds = allAssignments.map(a => a.batchId);
            const existingBatches = await models_1.default.Batch.findAll({
                where: { id: { [sequelize_1.Op.in]: batchIds } },
                attributes: ['id', 'title', 'status'],
            });
            logger_1.logger.info(`Existing batches: ${existingBatches.map(b => `${b.id}:${b.title}:${b.status}`).join(', ')}`);
            const missingBatchIds = batchIds.filter(id => !existingBatches.find(b => b.id === id));
            if (missingBatchIds.length > 0) {
                logger_1.logger.warn(`Assignments reference non-existent batches: ${missingBatchIds.join(', ')}`);
            }
        }
        else {
            // Check if there are any assignments with this email (in case of ID mismatch)
            const userByEmail = await models_1.default.User.findOne({
                where: { email: facultyUser.email, role: User_1.UserRole.FACULTY },
                attributes: ['id', 'email'],
            });
            if (userByEmail && userByEmail.id !== facultyUser.id) {
                logger_1.logger.warn(`Email ${facultyUser.email} matches different user ID: ${userByEmail.id} (current: ${facultyUser.id})`);
                const assignmentsByEmail = await models_1.default.BatchFacultyAssignment.findAll({
                    where: { facultyId: userByEmail.id },
                    attributes: ['id', 'batchId', 'facultyId'],
                });
                logger_1.logger.info(`Found ${assignmentsByEmail.length} assignments for user ID ${userByEmail.id} (by email)`);
            }
        }
        // Get all assignments first
        const assignments = await models_1.default.BatchFacultyAssignment.findAll({
            where: { facultyId: facultyUser.id },
            order: [['createdAt', 'DESC']],
        });
        logger_1.logger.info(`Found ${assignments.length} batch assignments for faculty ${facultyUser.id}`);
        if (assignments.length === 0) {
            logger_1.logger.info(`No batch assignments found for faculty ${req.user.userId}`);
            res.status(200).json({
                status: 'success',
                data: [],
            });
            return;
        }
        // Get batch IDs
        const batchIds = assignments.map((assignment) => assignment.batchId);
        // Fetch all batches separately to ensure we get them
        const batches = await models_1.default.Batch.findAll({
            where: { id: { [sequelize_1.Op.in]: batchIds } },
            order: [['createdAt', 'DESC']],
        });
        logger_1.logger.info(`Found ${batches.length} batches for faculty ${facultyUser.id} out of ${batchIds.length} assigned batch IDs`);
        // Create a map of batchId -> batch for quick lookup
        const batchMap = new Map(batches.map(b => [b.id, b]));
        // Filter assignments to only those with valid batches
        const validAssignments = assignments.filter((assignment) => {
            return batchMap.has(assignment.batchId);
        });
        if (validAssignments.length === 0) {
            logger_1.logger.warn(`No valid batches found for ${validAssignments.length} assignments. Batch IDs: ${batchIds.join(', ')}`);
            res.status(200).json({
                status: 'success',
                data: [],
            });
            return;
        }
        const startOfDay = todayDate();
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        const activeSessions = batchIds.length === 0
            ? []
            : await models_1.default.Session.findAll({
                where: {
                    batchId: { [sequelize_1.Op.in]: batchIds },
                    facultyId: req.user.userId,
                    status: Session_1.SessionStatus.ONGOING,
                    actualEndAt: null,
                    date: {
                        [sequelize_1.Op.gte]: startOfDay,
                        [sequelize_1.Op.lt]: endOfDay,
                    },
                },
            });
        const data = validAssignments
            .map((assignment) => {
            const batch = batchMap.get(assignment.batchId);
            if (!batch) {
                logger_1.logger.warn(`Assignment ${assignment.id} has no batch in map, skipping`);
                return null;
            }
            const session = activeSessions.find((s) => s.batchId === assignment.batchId) || null;
            return {
                batch: {
                    id: batch.id,
                    title: batch.title,
                    software: batch.software,
                    mode: batch.mode,
                    startDate: batch.startDate,
                    endDate: batch.endDate,
                    maxCapacity: batch.maxCapacity,
                    schedule: batch.schedule,
                    status: batch.status,
                    createdAt: batch.createdAt,
                    updatedAt: batch.updatedAt,
                },
                activeSession: session ? {
                    id: session.id,
                    batchId: session.batchId,
                    facultyId: session.facultyId,
                    date: session.date,
                    topic: session.topic,
                    status: session.status,
                    actualStartAt: session.actualStartAt,
                    actualEndAt: session.actualEndAt,
                } : null,
            };
        })
            .filter((item) => item !== null);
        logger_1.logger.info(`Returning ${data.length} batches for faculty ${req.user.userId}`);
        res.status(200).json({
            status: 'success',
            data,
        });
    }
    catch (error) {
        logger_1.logger.error('Get faculty assigned batches failed', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch assigned batches',
            error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
        });
    }
};
exports.getFacultyAssignedBatches = getFacultyAssignedBatches;
const startSession = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const batchId = Number(req.params.batchId);
        if (Number.isNaN(batchId)) {
            res.status(400).json({ status: 'error', message: 'Invalid batch ID' });
            return;
        }
        await ensureFacultyAccess(req.user.userId, batchId, req.user.role);
        // Get batch to check schedule
        const batch = await models_1.default.Batch.findByPk(batchId);
        if (!batch) {
            res.status(404).json({ status: 'error', message: 'Batch not found' });
            return;
        }
        const now = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todaySchedule = batch.schedule && typeof batch.schedule === 'object'
            ? batch.schedule[dayNames[now.getDay()]]
            : undefined;
        const scheduledStartTime = todaySchedule?.startTime ?? '00:00:00';
        const scheduledEndTime = todaySchedule?.endTime ?? '00:00:00';
        // Check if faculty has ANY active session across ALL batches
        // Faculty can only have one active session at a time
        const anyActiveSession = await models_1.default.Session.findOne({
            where: {
                facultyId: req.user.userId,
                date: todayDateString(),
                actualEndAt: null,
                actualStartAt: { [sequelize_1.Op.ne]: null },
            },
            include: [
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title'],
                },
            ],
        });
        if (anyActiveSession) {
            res.status(400).json({
                status: 'error',
                message: `You already have an active session running for batch "${anyActiveSession.batch?.title || 'Unknown'}" (Batch #${anyActiveSession.batchId}). Please end that session before starting a new one.`,
            });
            return;
        }
        // Check for open session in this specific batch (for resuming)
        const openSession = await models_1.default.Session.findOne({
            where: {
                batchId,
                facultyId: req.user.userId,
                date: todayDateString(),
                actualEndAt: null,
            },
        });
        if (openSession && openSession.actualStartAt) {
            res.status(400).json({
                status: 'error',
                message: 'You already have an ongoing session for this batch today',
            });
            return;
        }
        let session = openSession;
        if (session) {
            session = await session.update({
                actualStartAt: now,
                status: Session_1.SessionStatus.ONGOING,
                startTime: scheduledStartTime,
                endTime: scheduledEndTime,
            });
        }
        else {
            session = await models_1.default.Session.create({
                batchId,
                facultyId: req.user.userId,
                date: todayDate(),
                startTime: scheduledStartTime,
                endTime: scheduledEndTime,
                topic: req.body.topic ?? null,
                status: Session_1.SessionStatus.ONGOING,
                actualStartAt: now,
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Session started',
            data: session,
        });
    }
    catch (error) {
        logger_1.logger.error('Start session failed', error);
        if (error instanceof Error && error.name === 'UNAUTHORIZED_BATCH') {
            res.status(403).json({ status: 'error', message: error.message });
            return;
        }
        res.status(500).json({
            status: 'error',
            message: 'Failed to start session',
        });
    }
};
exports.startSession = startSession;
const endSession = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const sessionId = Number(req.params.sessionId);
        if (Number.isNaN(sessionId)) {
            res.status(400).json({ status: 'error', message: 'Invalid session ID' });
            return;
        }
        const session = await models_1.default.Session.findByPk(sessionId);
        if (!session) {
            res.status(404).json({ status: 'error', message: 'Session not found' });
            return;
        }
        await ensureFacultyAccess(req.user.userId, session.batchId, req.user.role);
        if (!session.actualStartAt) {
            res.status(400).json({ status: 'error', message: 'Session has not been started yet' });
            return;
        }
        if (session.actualEndAt) {
            res.status(400).json({ status: 'error', message: 'Session already ended' });
            return;
        }
        const updatedSession = await session.update({
            actualEndAt: new Date(),
            status: Session_1.SessionStatus.COMPLETED,
        });
        res.status(200).json({
            status: 'success',
            message: 'Session ended',
            data: updatedSession,
        });
    }
    catch (error) {
        logger_1.logger.error('End session failed', error);
        if (error instanceof Error && error.name === 'UNAUTHORIZED_BATCH') {
            res.status(403).json({ status: 'error', message: error.message });
            return;
        }
        res.status(500).json({
            status: 'error',
            message: 'Failed to end session',
        });
    }
};
exports.endSession = endSession;
const submitSessionAttendance = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const sessionId = Number(req.params.sessionId);
        if (Number.isNaN(sessionId)) {
            res.status(400).json({ status: 'error', message: 'Invalid session ID' });
            return;
        }
        const { attendance } = req.body;
        if (!Array.isArray(attendance) || attendance.length === 0) {
            res.status(400).json({ status: 'error', message: 'Attendance payload required' });
            return;
        }
        const session = await models_1.default.Session.findByPk(sessionId);
        if (!session) {
            res.status(404).json({ status: 'error', message: 'Session not found' });
            return;
        }
        await ensureFacultyAccess(req.user.userId, session.batchId, req.user.role);
        if (!session.actualStartAt) {
            res.status(400).json({ status: 'error', message: 'Start the session before marking attendance' });
            return;
        }
        const studentIds = attendance.map((record) => record.studentId);
        const enrolledStudents = await models_1.default.Enrollment.findAll({
            where: {
                batchId: session.batchId,
                studentId: { [sequelize_1.Op.in]: studentIds },
            },
        });
        const allowedStudentIds = new Set(enrolledStudents.map((enroll) => enroll.studentId));
        const transaction = await models_1.default.sequelize.transaction();
        try {
            const results = [];
            for (const record of attendance) {
                if (!allowedStudentIds.has(record.studentId)) {
                    continue;
                }
                const uiStatus = record.status ?? (record.present ? 'present' : 'absent');
                const dbStatus = mapUiStatusToDb(uiStatus);
                await models_1.default.Attendance.upsert({
                    sessionId: session.id,
                    studentId: record.studentId,
                    status: dbStatus,
                    isManual: true,
                    markedBy: req.user.userId,
                    markedAt: new Date(),
                }, { transaction });
                results.push({ studentId: record.studentId, status: uiStatus });
            }
            await transaction.commit();
            res.status(200).json({
                status: 'success',
                message: 'Attendance submitted',
                data: results,
            });
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    catch (error) {
        logger_1.logger.error('Submit attendance failed', error);
        if (error instanceof Error && error.name === 'UNAUTHORIZED_BATCH') {
            res.status(403).json({ status: 'error', message: error.message });
            return;
        }
        res.status(500).json({
            status: 'error',
            message: 'Failed to submit attendance',
        });
    }
};
exports.submitSessionAttendance = submitSessionAttendance;
// GET /sessions/batch/:batchId/history → Get batch session history
const getBatchHistory = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const batchId = Number(req.params.batchId);
        if (Number.isNaN(batchId)) {
            res.status(400).json({ status: 'error', message: 'Invalid batch ID' });
            return;
        }
        // Verify faculty has access to this batch
        await ensureFacultyAccess(req.user.userId, batchId, req.user.role);
        const sessions = await models_1.default.Session.findAll({
            where: {
                batchId,
                facultyId: req.user.userId,
            },
            include: [
                {
                    model: models_1.default.Attendance,
                    as: 'attendances',
                    include: [
                        {
                            model: models_1.default.User,
                            as: 'student',
                            attributes: ['id', 'name', 'email'],
                        },
                    ],
                },
            ],
            order: [['date', 'DESC'], ['actualStartAt', 'DESC']],
            limit: 100, // Limit to last 100 sessions
        });
        const history = sessions.map((session) => {
            const sessionData = session.toJSON();
            const attendances = sessionData.attendances || [];
            const presentCount = attendances.filter((a) => a.status === Attendance_1.AttendanceStatus.PRESENT || a.status === Attendance_1.AttendanceStatus.MANUAL_PRESENT).length;
            const absentCount = attendances.filter((a) => a.status === Attendance_1.AttendanceStatus.ABSENT).length;
            const lateCount = attendances.filter((a) => a.status === Attendance_1.AttendanceStatus.MANUAL_PRESENT).length;
            return {
                id: session.id,
                date: session.date,
                topic: sessionData.topic,
                status: session.status,
                actualStartAt: sessionData.actualStartAt,
                actualEndAt: sessionData.actualEndAt,
                attendance: {
                    total: attendances.length,
                    present: presentCount,
                    absent: absentCount,
                    late: lateCount,
                    students: attendances.map((a) => ({
                        studentId: a.studentId,
                        studentName: a.student?.name || 'Unknown',
                        studentEmail: a.student?.email || '',
                        status: mapDbStatusToUi(a.status),
                        markedAt: a.markedAt,
                    })),
                },
            };
        });
        res.status(200).json({
            status: 'success',
            data: history,
        });
    }
    catch (error) {
        logger_1.logger.error('Get batch history failed', error);
        if (error instanceof Error && error.name === 'UNAUTHORIZED_BATCH') {
            res.status(403).json({ status: 'error', message: error.message });
            return;
        }
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch batch history',
        });
    }
};
exports.getBatchHistory = getBatchHistory;
exports.default = {
    getFacultyAssignedBatches: exports.getFacultyAssignedBatches,
    getFacultyAssignmentsDebug: exports.getFacultyAssignmentsDebug,
    startSession: exports.startSession,
    endSession: exports.endSession,
    submitSessionAttendance: exports.submitSessionAttendance,
    getBatchHistory: exports.getBatchHistory,
};
//# sourceMappingURL=session.controller.js.map