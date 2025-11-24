"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentPunchHistory = exports.getTodayPunch = exports.punchOut = exports.punchIn = void 0;
const models_1 = __importDefault(require("../models"));
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const sequelize_1 = require("sequelize");
// Punch In for Students
const punchIn = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Allow all users except students to punch in (faculty, employees, admin, etc.)
        if (req.user.role === User_1.UserRole.STUDENT) {
            res.status(403).json({
                status: 'error',
                message: 'Students cannot use this attendance system',
            });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];
        // Check if already punched in today
        const existingPunch = await models_1.default.EmployeePunch.findOne({
            where: {
                userId: req.user.userId,
                date: todayString,
            },
        });
        if (existingPunch && existingPunch.punchInAt) {
            res.status(400).json({
                status: 'error',
                message: 'You have already punched in today',
            });
            return;
        }
        const { photo, fingerprint, location } = req.body;
        if (existingPunch) {
            // Update existing record
            await existingPunch.update({
                punchInAt: new Date(),
                punchInPhoto: photo || null,
                punchInFingerprint: fingerprint || null,
                punchInLocation: location || null,
            });
        }
        else {
            // Create new record - using EmployeePunch model (can create StudentPunch model later)
            await models_1.default.EmployeePunch.create({
                userId: req.user.userId,
                date: todayString,
                punchInAt: new Date(),
                punchInPhoto: photo || null,
                punchInFingerprint: fingerprint || null,
                punchInLocation: location || null,
                breaks: [],
            });
        }
        const updatedPunch = await models_1.default.EmployeePunch.findOne({
            where: {
                userId: req.user.userId,
                date: todayString,
            },
        });
        res.status(200).json({
            status: 'success',
            message: 'Punched in successfully',
            data: {
                punch: updatedPunch,
                punchInAt: updatedPunch?.punchInAt,
                location,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Student punch in error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while punching in',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        });
    }
};
exports.punchIn = punchIn;
// Punch Out for Students
const punchOut = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Allow all users except students to punch out (faculty, employees, admin, etc.)
        if (req.user.role === User_1.UserRole.STUDENT) {
            res.status(403).json({
                status: 'error',
                message: 'Students cannot use this attendance system',
            });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];
        // Find today's punch record
        const punch = await models_1.default.EmployeePunch.findOne({
            where: {
                userId: req.user.userId,
                date: todayString,
            },
        });
        if (!punch || !punch.punchInAt) {
            res.status(400).json({
                status: 'error',
                message: 'You must punch in first',
            });
            return;
        }
        if (punch.punchOutAt) {
            res.status(400).json({
                status: 'error',
                message: 'You have already punched out today',
            });
            return;
        }
        const { photo, fingerprint, location } = req.body;
        const punchOutTime = new Date();
        // Calculate effective working hours
        const punchInTime = new Date(punch.punchInAt);
        const totalMinutes = (punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60);
        // Subtract break time
        let breaks = [];
        if (punch.breaks) {
            if (Array.isArray(punch.breaks)) {
                breaks = punch.breaks;
            }
            else if (typeof punch.breaks === 'string') {
                try {
                    breaks = JSON.parse(punch.breaks);
                    if (!Array.isArray(breaks)) {
                        breaks = [breaks];
                    }
                }
                catch {
                    breaks = [];
                }
            }
        }
        let breakMinutes = 0;
        breaks.forEach((b) => {
            if (b.startTime && b.endTime) {
                const breakStart = new Date(b.startTime);
                const breakEnd = new Date(b.endTime);
                breakMinutes += (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
            }
        });
        const effectiveMinutes = totalMinutes - breakMinutes;
        const effectiveHours = effectiveMinutes / 60;
        // Update punch out
        await punch.update({
            punchOutAt: punchOutTime,
            punchOutPhoto: photo || null,
            punchOutFingerprint: fingerprint || null,
            punchOutLocation: location || null,
            effectiveWorkingHours: parseFloat(effectiveHours.toFixed(2)),
        });
        res.status(200).json({
            status: 'success',
            message: 'Punched out successfully',
            data: {
                punch,
                punchOutAt: punchOutTime,
                effectiveWorkingHours: parseFloat(effectiveHours.toFixed(2)),
                location,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Student punch out error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while punching out',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        });
    }
};
exports.punchOut = punchOut;
// Get today's punch status for student
const getTodayPunch = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];
        const punch = await models_1.default.EmployeePunch.findOne({
            where: {
                userId: req.user.userId,
                date: todayString,
            },
            include: [
                {
                    model: models_1.default.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email'],
                },
            ],
        });
        res.status(200).json({
            status: 'success',
            data: {
                punch: punch,
                hasPunchedIn: punch ? !!punch.punchInAt : false,
                hasPunchedOut: punch ? !!punch.punchOutAt : false,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get today punch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching punch status',
        });
    }
};
exports.getTodayPunch = getTodayPunch;
// Get student punch history
const getStudentPunchHistory = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { from, to } = req.query;
        const where = {
            userId: req.user.userId,
        };
        if (from || to) {
            const dateCondition = {};
            if (from) {
                dateCondition[sequelize_1.Op.gte] = from;
            }
            if (to) {
                dateCondition[sequelize_1.Op.lte] = to;
            }
            where.date = dateCondition;
        }
        const punches = await models_1.default.EmployeePunch.findAll({
            where,
            order: [['date', 'DESC']],
            include: [
                {
                    model: models_1.default.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email'],
                },
            ],
        });
        res.status(200).json({
            status: 'success',
            data: {
                punches,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get student punch history error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching punch history',
        });
    }
};
exports.getStudentPunchHistory = getStudentPunchHistory;
exports.default = {
    punchIn: exports.punchIn,
    punchOut: exports.punchOut,
    getTodayPunch: exports.getTodayPunch,
    getStudentPunchHistory: exports.getStudentPunchHistory,
};
//# sourceMappingURL=studentAttendance.controller.js.map