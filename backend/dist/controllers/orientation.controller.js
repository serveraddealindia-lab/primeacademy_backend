"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBulkOrientationStatus = exports.acceptOrientation = exports.getStudentOrientation = void 0;
const models_1 = __importDefault(require("../models"));
const StudentOrientation_1 = require("../models/StudentOrientation");
const logger_1 = require("../utils/logger");
// GET /api/orientation/:studentId - Get orientation status for a student
const getStudentOrientation = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const studentId = Number(req.params.studentId);
        if (Number.isNaN(studentId)) {
            res.status(400).json({ status: 'error', message: 'Invalid student id' });
            return;
        }
        // Check if student exists
        const student = await models_1.default.User.findByPk(studentId);
        if (!student || student.role !== 'student') {
            res.status(404).json({
                status: 'error',
                message: 'Student not found',
            });
            return;
        }
        // Students can only view their own orientation, admins can view any
        if (req.user.role === 'student' && req.user.userId !== studentId) {
            res.status(403).json({
                status: 'error',
                message: 'You can only view your own orientation status',
            });
            return;
        }
        // Get orientation records for this student
        const orientations = await models_1.default.StudentOrientation.findAll({
            where: { studentId },
            order: [['language', 'ASC']],
        });
        // Format response
        const orientationStatus = {
            english: orientations.find((o) => o.language === StudentOrientation_1.OrientationLanguage.ENGLISH) || {
                accepted: false,
                acceptedAt: null,
            },
            gujarati: orientations.find((o) => o.language === StudentOrientation_1.OrientationLanguage.GUJARATI) || {
                accepted: false,
                acceptedAt: null,
            },
        };
        // Student is eligible if at least one orientation is accepted
        const isEligible = orientationStatus.english.accepted || orientationStatus.gujarati.accepted;
        res.status(200).json({
            status: 'success',
            data: {
                studentId,
                isEligible,
                orientations: {
                    english: {
                        accepted: orientationStatus.english.accepted,
                        acceptedAt: orientationStatus.english.acceptedAt,
                    },
                    gujarati: {
                        accepted: orientationStatus.gujarati.accepted,
                        acceptedAt: orientationStatus.gujarati.acceptedAt,
                    },
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get student orientation error', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get orientation status',
        });
    }
};
exports.getStudentOrientation = getStudentOrientation;
// POST /api/orientation/:studentId/accept - Accept orientation for a student
const acceptOrientation = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const studentId = Number(req.params.studentId);
        if (Number.isNaN(studentId)) {
            res.status(400).json({ status: 'error', message: 'Invalid student id' });
            return;
        }
        const { language } = req.body;
        if (!language || !Object.values(StudentOrientation_1.OrientationLanguage).includes(language)) {
            res.status(400).json({
                status: 'error',
                message: `Invalid language. Allowed values: ${Object.values(StudentOrientation_1.OrientationLanguage).join(', ')}`,
            });
            return;
        }
        // Check if student exists
        const student = await models_1.default.User.findByPk(studentId);
        if (!student || student.role !== 'student') {
            res.status(404).json({
                status: 'error',
                message: 'Student not found',
            });
            return;
        }
        // Students can only accept their own orientation, admins can accept for any student
        if (req.user.role === 'student' && req.user.userId !== studentId) {
            res.status(403).json({
                status: 'error',
                message: 'You can only accept your own orientation',
            });
            return;
        }
        // Find or create orientation record
        const [orientation, created] = await models_1.default.StudentOrientation.findOrCreate({
            where: {
                studentId,
                language: language,
            },
            defaults: {
                studentId,
                language: language,
                accepted: true,
                acceptedAt: new Date(),
            },
        });
        // If record already exists, update it
        if (!created) {
            orientation.accepted = true;
            orientation.acceptedAt = new Date();
            await orientation.save();
        }
        // Get updated orientation status
        const orientations = await models_1.default.StudentOrientation.findAll({
            where: { studentId },
            order: [['language', 'ASC']],
        });
        const orientationStatus = {
            english: orientations.find((o) => o.language === StudentOrientation_1.OrientationLanguage.ENGLISH) || {
                accepted: false,
                acceptedAt: null,
            },
            gujarati: orientations.find((o) => o.language === StudentOrientation_1.OrientationLanguage.GUJARATI) || {
                accepted: false,
                acceptedAt: null,
            },
        };
        const isEligible = orientationStatus.english.accepted || orientationStatus.gujarati.accepted;
        logger_1.logger.info(`Orientation accepted: studentId=${studentId}, language=${language}`);
        res.status(200).json({
            status: 'success',
            message: 'Orientation accepted successfully',
            data: {
                studentId,
                isEligible,
                orientations: {
                    english: {
                        accepted: orientationStatus.english.accepted,
                        acceptedAt: orientationStatus.english.acceptedAt,
                    },
                    gujarati: {
                        accepted: orientationStatus.gujarati.accepted,
                        acceptedAt: orientationStatus.gujarati.acceptedAt,
                    },
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Accept orientation error', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to accept orientation',
        });
    }
};
exports.acceptOrientation = acceptOrientation;
// GET /api/orientation/bulk-status - Get orientation status for multiple students (for bulk upload)
const getBulkOrientationStatus = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { studentIds } = req.query;
        if (!studentIds || typeof studentIds !== 'string') {
            res.status(400).json({
                status: 'error',
                message: 'studentIds query parameter is required (comma-separated)',
            });
            return;
        }
        const ids = studentIds
            .split(',')
            .map((id) => Number(id.trim()))
            .filter((id) => !Number.isNaN(id));
        if (ids.length === 0) {
            res.status(400).json({
                status: 'error',
                message: 'No valid student IDs provided',
            });
            return;
        }
        // Get orientation records for all students
        const orientations = await models_1.default.StudentOrientation.findAll({
            where: {
                studentId: ids,
            },
            order: [['studentId', 'ASC'], ['language', 'ASC']],
        });
        // Group by student ID
        const statusMap = {};
        ids.forEach((id) => {
            statusMap[id] = {
                english: false,
                gujarati: false,
                isEligible: false,
            };
        });
        orientations.forEach((orientation) => {
            if (!statusMap[orientation.studentId]) {
                statusMap[orientation.studentId] = {
                    english: false,
                    gujarati: false,
                    isEligible: false,
                };
            }
            if (orientation.language === StudentOrientation_1.OrientationLanguage.ENGLISH) {
                statusMap[orientation.studentId].english = orientation.accepted;
            }
            else if (orientation.language === StudentOrientation_1.OrientationLanguage.GUJARATI) {
                statusMap[orientation.studentId].gujarati = orientation.accepted;
            }
            statusMap[orientation.studentId].isEligible =
                statusMap[orientation.studentId].english || statusMap[orientation.studentId].gujarati;
        });
        res.status(200).json({
            status: 'success',
            data: {
                statusMap,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get bulk orientation status error', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get bulk orientation status',
        });
    }
};
exports.getBulkOrientationStatus = getBulkOrientationStatus;
//# sourceMappingURL=orientation.controller.js.map