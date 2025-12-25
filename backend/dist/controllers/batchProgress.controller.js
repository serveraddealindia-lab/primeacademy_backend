"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBatchProgress = void 0;
const sequelize_1 = require("sequelize");
const models_1 = __importDefault(require("../models"));
const Session_1 = require("../models/Session");
const logger_1 = require("../utils/logger");
// GET /api/batches/progress → Get batch-wise progress list
const getBatchProgress = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { search, format = 'json' } = req.query;
        // Validate format parameter
        if (format && !['json', 'csv', 'pdf'].includes(format)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid format parameter. Allowed values: json, csv, pdf',
            });
            return;
        }
        // Build search filter
        const batchWhere = {};
        if (search && typeof search === 'string' && search.trim()) {
            batchWhere[sequelize_1.Op.or] = [
                { title: { [sequelize_1.Op.like]: `%${search.trim()}%` } },
                { software: { [sequelize_1.Op.like]: `%${search.trim()}%` } },
            ];
        }
        // Get all batches with sessions and enrollments
        const batches = await models_1.default.Batch.findAll({
            where: batchWhere,
            include: [
                {
                    model: models_1.default.Session,
                    as: 'sessions',
                    attributes: ['id', 'status', 'facultyId'],
                    include: [
                        {
                            model: models_1.default.User,
                            as: 'faculty',
                            attributes: ['id', 'name', 'email'],
                            required: false,
                        },
                    ],
                    required: false,
                },
                {
                    model: models_1.default.Enrollment,
                    as: 'enrollments',
                    include: [
                        {
                            model: models_1.default.User,
                            as: 'student',
                            attributes: ['id', 'name', 'email'],
                            required: true,
                        },
                    ],
                    required: false,
                },
                {
                    model: models_1.default.User,
                    as: 'assignedFaculty',
                    attributes: ['id', 'name', 'email'],
                    through: { attributes: [] },
                    required: false,
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        // Calculate progress for each batch
        const batchProgressList = batches.map((batch) => {
            const sessions = batch.sessions || [];
            const totalSessions = sessions.length;
            const completedSessions = sessions.filter((s) => s.status === Session_1.SessionStatus.COMPLETED).length;
            const progressPercentage = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
            // Get unique faculty members from sessions
            const facultyMap = new Map();
            const assignedFaculty = batch.assignedFaculty || [];
            assignedFaculty.forEach((faculty) => {
                if (faculty?.id) {
                    facultyMap.set(faculty.id, faculty);
                }
            });
            sessions.forEach((session) => {
                if (session.faculty && session.faculty.id) {
                    facultyMap.set(session.faculty.id, session.faculty);
                }
            });
            // Get enrollments
            const enrollments = batch.enrollments || [];
            const students = enrollments.map((enrollment) => ({
                id: enrollment.student?.id,
                name: enrollment.student?.name,
                email: enrollment.student?.email,
            }));
            const faculty = Array.from(facultyMap.values());
            return {
                id: batch.id,
                title: batch.title,
                software: batch.software,
                mode: batch.mode,
                startDate: batch.startDate,
                endDate: batch.endDate,
                status: batch.status,
                totalSessions,
                completedSessions,
                progressPercentage,
                studentCount: students.length,
                faculty,
                facultyCount: faculty.length,
            };
        });
        const batchesWithFaculty = batchProgressList;
        // Handle different export formats
        if (format === 'csv') {
            return exportToCSV(batchesWithFaculty, res);
        }
        else if (format === 'pdf') {
            return exportToPDF(batchesWithFaculty, res);
        }
        // Return JSON response
        res.status(200).json({
            status: 'success',
            data: {
                batches: batchesWithFaculty,
                totalCount: batchesWithFaculty.length,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get batch progress error:', error);
        // If it's a validation error, return 400
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeDatabaseError') {
            res.status(400).json({
                status: 'error',
                message: 'Invalid request parameters',
                details: error.message,
            });
            return;
        }
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching batch progress',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};
exports.getBatchProgress = getBatchProgress;
// Export to CSV
function exportToCSV(batches, res) {
    const headers = [
        'Batch ID',
        'Title',
        'Software',
        'Mode',
        'Start Date',
        'End Date',
        'Status',
        'Total Sessions',
        'Completed Sessions',
        'Progress %',
        'Student Count',
        'Faculty Count',
        'Faculty Names',
    ];
    const rows = batches.map((batch) => [
        batch.id,
        batch.title,
        batch.software || '',
        batch.mode,
        new Date(batch.startDate).toLocaleDateString(),
        new Date(batch.endDate).toLocaleDateString(),
        batch.status || '',
        batch.totalSessions,
        batch.completedSessions,
        `${batch.progressPercentage}%`,
        batch.studentCount,
        batch.facultyCount,
        batch.faculty.map((f) => f.name).join('; '),
    ]);
    const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=batch-progress-${Date.now()}.csv`);
    res.status(200).send(csvContent);
}
// Export to PDF (simplified - returns JSON for now, can be enhanced with PDF library)
function exportToPDF(batches, res) {
    // For now, we'll return a JSON response that can be converted to PDF on the frontend
    // In production, you might want to use a library like pdfkit or puppeteer
    res.status(200).json({
        status: 'success',
        message: 'PDF export not yet implemented. Please use CSV export or JSON format.',
        data: {
            batches,
            totalCount: batches.length,
        },
    });
}
//# sourceMappingURL=batchProgress.controller.js.map