"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignFacultyToBatch = exports.deleteBatch = exports.updateBatch = exports.getBatchById = exports.getAllBatches = exports.getBatchEnrollments = exports.suggestCandidates = exports.createBatch = void 0;
const sequelize_1 = require("sequelize");
const models_1 = __importDefault(require("../models"));
const Batch_1 = require("../models/Batch");
const User_1 = require("../models/User");
const PaymentTransaction_1 = require("../models/PaymentTransaction");
const logger_1 = require("../utils/logger");
// POST /batches → Create batch (admin only)
const createBatch = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { title, software, mode, startDate, endDate, maxCapacity, schedule, status, facultyIds, studentIds } = req.body;
        // Validation
        if (!title || !mode || !startDate || !endDate || !maxCapacity) {
            res.status(400).json({
                status: 'error',
                message: 'Title, mode, startDate, endDate, and maxCapacity are required',
            });
            return;
        }
        // Validate mode
        if (!Object.values(Batch_1.BatchMode).includes(mode)) {
            res.status(400).json({
                status: 'error',
                message: `Invalid mode. Allowed values: ${Object.values(Batch_1.BatchMode).join(', ')}`,
            });
            return;
        }
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid date format',
            });
            return;
        }
        if (start >= end) {
            res.status(400).json({
                status: 'error',
                message: 'Start date must be before end date',
            });
            return;
        }
        if (maxCapacity < 1) {
            res.status(400).json({
                status: 'error',
                message: 'Max capacity must be at least 1',
            });
            return;
        }
        // Validate faculty IDs - REQUIRED
        logger_1.logger.info(`Create batch request - facultyIds received: ${JSON.stringify(facultyIds)}, type: ${typeof facultyIds}, isArray: ${Array.isArray(facultyIds)}`);
        if (!facultyIds || !Array.isArray(facultyIds) || facultyIds.length === 0) {
            logger_1.logger.warn(`Create batch failed - no faculty IDs provided or invalid format`);
            res.status(400).json({
                status: 'error',
                message: 'At least one faculty member must be assigned to the batch',
            });
            return;
        }
        let normalizedFacultyIds = facultyIds
            .map((id) => Number(id))
            .filter((id) => !Number.isNaN(id) && id > 0);
        logger_1.logger.info(`Create batch - normalized faculty IDs: ${normalizedFacultyIds.join(', ')}`);
        if (normalizedFacultyIds.length === 0) {
            res.status(400).json({
                status: 'error',
                message: 'At least one valid faculty member must be assigned to the batch',
            });
            return;
        }
        const uniqueFacultyIds = Array.from(new Set(normalizedFacultyIds));
        logger_1.logger.info(`Create batch - unique faculty IDs: ${uniqueFacultyIds.join(', ')}`);
        const facultyMembers = await models_1.default.User.findAll({
            where: {
                id: uniqueFacultyIds,
                role: User_1.UserRole.FACULTY,
                isActive: true,
            },
            attributes: ['id'],
        });
        if (facultyMembers.length !== uniqueFacultyIds.length) {
            const foundIds = new Set(facultyMembers.map((f) => f.id));
            const missingIds = uniqueFacultyIds.filter((id) => !foundIds.has(id));
            res.status(400).json({
                status: 'error',
                message: `Invalid or inactive faculty IDs: ${missingIds.join(', ')}`,
            });
            return;
        }
        normalizedFacultyIds = uniqueFacultyIds;
        // Validate students if provided
        let normalizedStudentIds = [];
        if (studentIds !== undefined) {
            if (!Array.isArray(studentIds)) {
                res.status(400).json({
                    status: 'error',
                    message: 'studentIds must be an array of student IDs',
                });
                return;
            }
            normalizedStudentIds = studentIds
                .map((id) => Number(id))
                .filter((id) => !Number.isNaN(id) && id > 0);
            if (normalizedStudentIds.length > 0) {
                const uniqueStudentIds = Array.from(new Set(normalizedStudentIds));
                const students = await models_1.default.User.findAll({
                    where: {
                        id: uniqueStudentIds,
                        role: User_1.UserRole.STUDENT,
                        isActive: true,
                    },
                    attributes: ['id'],
                });
                if (students.length !== uniqueStudentIds.length) {
                    const foundIds = new Set(students.map((s) => s.id));
                    const missingIds = uniqueStudentIds.filter((id) => !foundIds.has(id));
                    res.status(400).json({
                        status: 'error',
                        message: `Invalid or inactive student IDs: ${missingIds.join(', ')}`,
                    });
                    return;
                }
                normalizedStudentIds = uniqueStudentIds;
            }
        }
        // Create batch with transaction
        const transaction = await models_1.default.sequelize.transaction();
        try {
            const batch = await models_1.default.Batch.create({
                title,
                software: software || null,
                mode,
                startDate: start,
                endDate: end,
                maxCapacity,
                schedule: schedule || null,
                status: status || null,
                createdByAdminId: req.user.userId,
            }, { transaction });
            // Assign faculty if provided
            if (normalizedFacultyIds.length > 0) {
                const facultyAssignments = normalizedFacultyIds.map((facultyId) => ({
                    batchId: batch.id,
                    facultyId,
                }));
                const createdAssignments = await models_1.default.BatchFacultyAssignment.bulkCreate(facultyAssignments, { transaction });
                logger_1.logger.info(`Created ${createdAssignments.length} faculty assignments for batch ${batch.id}: facultyIds=${normalizedFacultyIds.join(', ')}`);
            }
            // Enroll students if provided
            if (normalizedStudentIds.length > 0) {
                const enrollmentRows = normalizedStudentIds.map((studentId) => ({
                    studentId,
                    batchId: batch.id,
                    enrollmentDate: new Date(),
                    status: 'active',
                }));
                await models_1.default.Enrollment.bulkCreate(enrollmentRows, {
                    transaction,
                    ignoreDuplicates: true,
                });
                logger_1.logger.info(`Enrolled ${enrollmentRows.length} students into batch ${batch.id}`);
            }
            await transaction.commit();
            // Fetch assigned faculty for response
            const assignedFaculty = normalizedFacultyIds.length > 0
                ? await models_1.default.User.findAll({
                    where: { id: normalizedFacultyIds },
                    attributes: ['id', 'name', 'email', 'phone'],
                })
                : [];
            res.status(201).json({
                status: 'success',
                message: 'Batch created successfully',
                data: {
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
                        createdByAdminId: batch.createdByAdminId,
                        createdAt: batch.createdAt,
                        updatedAt: batch.updatedAt,
                    },
                    assignedFaculty,
                    enrolledStudents: normalizedStudentIds.length
                        ? await models_1.default.Enrollment.findAll({
                            where: { batchId: batch.id },
                            include: [
                                {
                                    model: models_1.default.User,
                                    as: 'student',
                                    attributes: ['id', 'name', 'email', 'phone'],
                                },
                            ],
                        })
                        : [],
                },
            });
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    catch (error) {
        logger_1.logger.error('Create batch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating batch',
        });
    }
};
exports.createBatch = createBatch;
// GET /batches/:id/candidates/suggest → Suggest eligible students for batch
const suggestCandidates = async (req, res) => {
    try {
        const batchId = parseInt(req.params.id, 10);
        if (isNaN(batchId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid batch ID',
            });
            return;
        }
        // Find batch
        const batch = await models_1.default.Batch.findByPk(batchId);
        if (!batch) {
            res.status(404).json({
                status: 'error',
                message: 'Batch not found',
            });
            return;
        }
        if (!batch.software) {
            res.status(400).json({
                status: 'error',
                message: 'Batch must have software specified to suggest candidates',
            });
            return;
        }
        const batchSoftware = batch.software.toLowerCase();
        const batchStartDate = new Date(batch.startDate);
        const batchEndDate = new Date(batch.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Get all active students with matching software
        const allStudents = await models_1.default.User.findAll({
            where: {
                role: User_1.UserRole.STUDENT,
                isActive: true,
            },
            include: [
                {
                    model: models_1.default.StudentProfile,
                    as: 'studentProfile',
                    required: true,
                    attributes: ['id', 'softwareList'],
                },
            ],
            attributes: ['id', 'name', 'email', 'phone'],
        });
        // Filter students who have selected the matching software
        const studentsWithMatchingSoftware = allStudents.filter((student) => {
            const softwareList = student.studentProfile?.softwareList;
            if (!softwareList || !Array.isArray(softwareList)) {
                return false;
            }
            return softwareList.some((s) => s.toLowerCase() === batchSoftware);
        });
        // Get payment transactions for all candidate students
        const studentIds = studentsWithMatchingSoftware.map((s) => s.id);
        const payments = studentIds.length > 0
            ? await models_1.default.PaymentTransaction.findAll({
                where: {
                    studentId: { [sequelize_1.Op.in]: studentIds },
                    status: {
                        [sequelize_1.Op.in]: [PaymentTransaction_1.PaymentStatus.PENDING, PaymentTransaction_1.PaymentStatus.PARTIAL, PaymentTransaction_1.PaymentStatus.OVERDUE],
                    },
                },
                attributes: ['studentId', 'dueDate', 'amount', 'status'],
            })
            : [];
        const disqualifiedStudentIds = new Set(payments.map((payment) => payment.studentId));
        const eligibleStudents = studentsWithMatchingSoftware.filter((student) => !disqualifiedStudentIds.has(student.id));
        // Get all enrollments for candidate students to check for conflicts
        const existingEnrollments = await models_1.default.Enrollment.findAll({
            where: {
                studentId: studentIds,
            },
            include: [
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title', 'startDate', 'endDate', 'status'],
                },
            ],
        });
        // Get all sessions in the date range to check for time conflicts
        const existingSessions = await models_1.default.Session.findAll({
            where: {
                date: {
                    [sequelize_1.Op.between]: [batchStartDate, batchEndDate],
                },
            },
            include: [
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title', 'startDate', 'endDate'],
                    include: [
                        {
                            model: models_1.default.Enrollment,
                            as: 'enrollments',
                            where: {
                                studentId: studentIds,
                            },
                            attributes: ['studentId'],
                            required: false,
                        },
                    ],
                },
            ],
        });
        // Process each candidate student
        const candidates = eligibleStudents.map((student) => {
            const studentId = student.id;
            // Check for overdue payments
            const overduePayments = payments
                .filter((payment) => {
                const dueDate = new Date(payment.dueDate);
                return dueDate < today;
            })
                .filter((payment) => payment.studentId === studentId);
            const hasOverdueFees = overduePayments.length > 0;
            const totalOverdueAmount = overduePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
            // Check for conflicting enrollments (overlapping batch dates)
            const conflictingEnrollments = existingEnrollments.filter((enrollment) => {
                if (enrollment.studentId !== studentId)
                    return false;
                const enrollmentBatch = enrollment.batch;
                if (!enrollmentBatch)
                    return false;
                if (enrollmentBatch.id === batchId)
                    return false; // Exclude current batch
                if (enrollmentBatch.status === 'ended' || enrollmentBatch.status === 'cancelled')
                    return false;
                const otherStart = new Date(enrollmentBatch.startDate);
                const otherEnd = new Date(enrollmentBatch.endDate);
                // Check if date ranges overlap
                return batchStartDate <= otherEnd && batchEndDate >= otherStart;
            });
            // Check for conflicting sessions
            const conflictingSessions = existingSessions.filter((session) => {
                const sessionBatch = session.batch;
                if (!sessionBatch || !sessionBatch.enrollments)
                    return false;
                return sessionBatch.enrollments.some((enrollment) => enrollment.studentId === studentId);
            });
            const isBusy = conflictingEnrollments.length > 0 || conflictingSessions.length > 0;
            // Determine candidate status
            let status = 'available';
            let statusMessage = 'Available for enrollment';
            if (hasOverdueFees) {
                status = 'fees_overdue';
                statusMessage = `Fees overdue (₹${totalOverdueAmount.toFixed(2)})`;
            }
            else if (isBusy) {
                status = 'busy';
                const conflictDetails = [];
                if (conflictingEnrollments.length > 0) {
                    conflictDetails.push(`${conflictingEnrollments.length} batch(es)`);
                }
                if (conflictingSessions.length > 0) {
                    conflictDetails.push(`${conflictingSessions.length} session(s)`);
                }
                statusMessage = `Busy - ${conflictDetails.join(', ')}`;
            }
            return {
                id: student.id,
                name: student.name,
                email: student.email,
                phone: student.phone || '-',
                status,
                statusMessage,
                hasOverdueFees,
                totalOverdueAmount: hasOverdueFees ? totalOverdueAmount : 0,
                conflictingBatches: conflictingEnrollments
                    .map((enrollment) => enrollment.batch)
                    .filter((enrollmentBatch) => !!enrollmentBatch)
                    .map((enrollmentBatch) => ({
                    id: enrollmentBatch.id,
                    title: enrollmentBatch.title,
                    startDate: enrollmentBatch.startDate,
                    endDate: enrollmentBatch.endDate,
                })),
                conflictingSessionsCount: conflictingSessions.length,
            };
        });
        // Sort candidates: available first, then busy, then fees_overdue
        const statusOrder = { available: 1, busy: 2, fees_overdue: 3 };
        candidates.sort((a, b) => {
            return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        });
        res.status(200).json({
            status: 'success',
            data: {
                batch: {
                    id: batch.id,
                    title: batch.title,
                    software: batch.software,
                    startDate: batch.startDate,
                    endDate: batch.endDate,
                    schedule: batch.schedule,
                },
                candidates,
                totalCount: candidates.length,
                summary: {
                    available: candidates.filter((c) => c.status === 'available').length,
                    busy: candidates.filter((c) => c.status === 'busy').length,
                    feesOverdue: candidates.filter((c) => c.status === 'fees_overdue').length,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Suggest candidates error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while suggesting candidates',
        });
    }
};
exports.suggestCandidates = suggestCandidates;
// GET /batches/:id/enrollments → Get batch enrollments
const getBatchEnrollments = async (req, res) => {
    try {
        const batchId = parseInt(req.params.id, 10);
        if (isNaN(batchId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid batch ID',
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
        // Get enrollments with student information
        const enrollments = await models_1.default.Enrollment.findAll({
            where: { batchId },
            include: [
                {
                    model: models_1.default.User,
                    as: 'student',
                    where: {
                        role: User_1.UserRole.STUDENT,
                        isActive: true,
                    },
                    attributes: ['id', 'name', 'email', 'phone'],
                    required: true,
                },
            ],
            order: [['enrollmentDate', 'DESC']],
        });
        res.status(200).json({
            status: 'success',
            data: enrollments,
        });
    }
    catch (error) {
        logger_1.logger.error('Get batch enrollments error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching batch enrollments',
        });
    }
};
exports.getBatchEnrollments = getBatchEnrollments;
// GET /batches → List all batches with related faculty and enrolled students
const getAllBatches = async (req, res) => {
    try {
        // If faculty, only show batches they're assigned to
        const where = {};
        if (req.user?.role === User_1.UserRole.FACULTY) {
            const facultyAssignments = await models_1.default.BatchFacultyAssignment.findAll({
                where: { facultyId: req.user.userId },
                attributes: ['batchId'],
            });
            const assignedBatchIds = facultyAssignments.map((a) => a.batchId);
            if (assignedBatchIds.length === 0) {
                res.status(200).json({
                    status: 'success',
                    data: [],
                    count: 0,
                });
                return;
            }
            where.id = { [sequelize_1.Op.in]: assignedBatchIds };
        }
        // Get all batches with related data
        const batches = await models_1.default.Batch.findAll({
            where: Object.keys(where).length > 0 ? where : undefined,
            include: [
                {
                    model: models_1.default.User,
                    as: 'admin',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: models_1.default.Enrollment,
                    as: 'enrollments',
                    include: [
                        {
                            model: models_1.default.User,
                            as: 'student',
                            attributes: ['id', 'name', 'email', 'phone'],
                        },
                    ],
                },
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
                    attributes: ['id', 'facultyId', 'date', 'status'],
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
        // Transform the data to show faculty information from sessions
        const batchesWithFaculty = batches.map((batch) => {
            const facultyMap = new Map();
            if (batch.assignedFaculty && Array.isArray(batch.assignedFaculty)) {
                batch.assignedFaculty.forEach((faculty) => {
                    if (faculty?.id) {
                        facultyMap.set(faculty.id, faculty);
                    }
                });
            }
            if (batch.sessions) {
                batch.sessions
                    .filter((s) => s.faculty)
                    .forEach((session) => {
                    if (session.faculty?.id) {
                        facultyMap.set(session.faculty.id, session.faculty);
                    }
                });
            }
            const facultyMembers = Array.from(facultyMap.values());
            return {
                id: batch.id,
                title: batch.title,
                software: batch.software,
                mode: batch.mode,
                startDate: batch.startDate,
                endDate: batch.endDate,
                maxCapacity: batch.maxCapacity,
                currentEnrollment: batch.enrollments?.length || 0,
                schedule: batch.schedule,
                status: batch.status,
                createdBy: batch.admin
                    ? {
                        id: batch.admin.id,
                        name: batch.admin.name,
                        email: batch.admin.email,
                    }
                    : null,
                assignedFaculty: facultyMembers,
                enrollments: batch.enrollments?.map((enrollment) => ({
                    id: enrollment.student?.id,
                    name: enrollment.student?.name,
                    email: enrollment.student?.email,
                    phone: enrollment.student?.phone,
                    enrollmentDate: enrollment.enrollmentDate,
                    enrollmentStatus: enrollment.status,
                })) || [],
                createdAt: batch.createdAt,
                updatedAt: batch.updatedAt,
            };
        });
        res.status(200).json({
            status: 'success',
            data: batchesWithFaculty,
            count: batchesWithFaculty.length,
        });
    }
    catch (error) {
        logger_1.logger.error('Get all batches error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching batches',
        });
    }
};
exports.getAllBatches = getAllBatches;
// GET /batches/:id → Get single batch by ID
const getBatchById = async (req, res) => {
    try {
        const batchId = parseInt(req.params.id, 10);
        if (isNaN(batchId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid batch ID',
            });
            return;
        }
        const batch = await models_1.default.Batch.findByPk(batchId, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'admin',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: models_1.default.Enrollment,
                    as: 'enrollments',
                    include: [
                        {
                            model: models_1.default.User,
                            as: 'student',
                            attributes: ['id', 'name', 'email', 'phone'],
                        },
                    ],
                },
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
                    attributes: ['id', 'facultyId', 'date', 'status'],
                },
                {
                    model: models_1.default.User,
                    as: 'assignedFaculty',
                    attributes: ['id', 'name', 'email'],
                    through: { attributes: [] },
                    required: false,
                },
            ],
        });
        if (!batch) {
            res.status(404).json({
                status: 'error',
                message: 'Batch not found',
            });
            return;
        }
        // Transform the data
        const batchData = {
            id: batch.id,
            title: batch.title,
            software: batch.software,
            mode: batch.mode,
            startDate: batch.startDate,
            endDate: batch.endDate,
            maxCapacity: batch.maxCapacity,
            currentEnrollment: batch.enrollments?.length || 0,
            schedule: batch.schedule,
            status: batch.status,
            createdBy: batch.admin
                ? {
                    id: batch.admin.id,
                    name: batch.admin.name,
                    email: batch.admin.email,
                }
                : null,
            assignedFaculty: (() => {
                const facultyMap = new Map();
                if (batch.assignedFaculty) {
                    batch.assignedFaculty.forEach((faculty) => {
                        if (faculty?.id) {
                            facultyMap.set(faculty.id, faculty);
                        }
                    });
                }
                if (batch.sessions) {
                    batch.sessions
                        .filter((s) => s.faculty)
                        .forEach((session) => {
                        if (session.faculty?.id) {
                            facultyMap.set(session.faculty.id, session.faculty);
                        }
                    });
                }
                return Array.from(facultyMap.values());
            })(),
            enrollments: batch.enrollments?.map((enrollment) => ({
                id: enrollment.student?.id,
                name: enrollment.student?.name,
                email: enrollment.student?.email,
                phone: enrollment.student?.phone,
                enrollmentDate: enrollment.enrollmentDate,
                enrollmentStatus: enrollment.status,
            })) || [],
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt,
        };
        res.status(200).json({
            status: 'success',
            data: {
                batch: batchData,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get batch by ID error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching batch',
        });
    }
};
exports.getBatchById = getBatchById;
// PUT /batches/:id → Update batch (admin only)
const updateBatch = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only Admin or SuperAdmin can update batches
        if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can update batches',
            });
            return;
        }
        const batchId = parseInt(req.params.id, 10);
        if (isNaN(batchId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid batch ID',
            });
            return;
        }
        const batch = await models_1.default.Batch.findByPk(batchId);
        if (!batch) {
            res.status(404).json({
                status: 'error',
                message: 'Batch not found',
            });
            return;
        }
        const { title, software, mode, startDate, endDate, maxCapacity, schedule, status, facultyIds, studentIds, } = req.body;
        // Validate mode if provided
        if (mode && !Object.values(Batch_1.BatchMode).includes(mode)) {
            res.status(400).json({
                status: 'error',
                message: `Invalid mode. Allowed values: ${Object.values(Batch_1.BatchMode).join(', ')}`,
            });
            return;
        }
        // Validate dates if provided
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : new Date(batch.startDate);
            const end = endDate ? new Date(endDate) : new Date(batch.endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid date format',
                });
                return;
            }
            if (start >= end) {
                res.status(400).json({
                    status: 'error',
                    message: 'Start date must be before end date',
                });
                return;
            }
        }
        // Validate maxCapacity if provided
        if (maxCapacity !== undefined && maxCapacity < 1) {
            res.status(400).json({
                status: 'error',
                message: 'Max capacity must be at least 1',
            });
            return;
        }
        // Validate and process faculty IDs if provided
        logger_1.logger.info(`Update batch ${req.params.id} - facultyIds received: ${JSON.stringify(facultyIds)}, studentIds received: ${JSON.stringify(studentIds)}`);
        let normalizedFacultyIds = null;
        let normalizedStudentIds = null;
        if (facultyIds !== undefined) {
            if (!Array.isArray(facultyIds) || facultyIds.length === 0) {
                res.status(400).json({
                    status: 'error',
                    message: 'At least one faculty member must be assigned to the batch',
                });
                return;
            }
            const ids = facultyIds
                .map((id) => Number(id))
                .filter((id) => !Number.isNaN(id) && id > 0);
            if (ids.length === 0) {
                res.status(400).json({
                    status: 'error',
                    message: 'At least one valid faculty member must be assigned to the batch',
                });
                return;
            }
            const uniqueFacultyIds = Array.from(new Set(ids));
            const facultyMembers = await models_1.default.User.findAll({
                where: {
                    id: uniqueFacultyIds,
                    role: User_1.UserRole.FACULTY,
                    isActive: true,
                },
                attributes: ['id'],
            });
            if (facultyMembers.length !== uniqueFacultyIds.length) {
                const foundIds = new Set(facultyMembers.map((f) => f.id));
                const missingIds = uniqueFacultyIds.filter((id) => !foundIds.has(id));
                res.status(400).json({
                    status: 'error',
                    message: `Invalid or inactive faculty IDs: ${missingIds.join(', ')}`,
                });
                return;
            }
            normalizedFacultyIds = uniqueFacultyIds;
        }
        if (studentIds !== undefined) {
            if (!Array.isArray(studentIds)) {
                res.status(400).json({
                    status: 'error',
                    message: 'studentIds must be an array of student IDs',
                });
                return;
            }
            const ids = studentIds
                .map((id) => Number(id))
                .filter((id) => !Number.isNaN(id) && id > 0);
            if (ids.length > 0) {
                const uniqueStudentIds = Array.from(new Set(ids));
                const students = await models_1.default.User.findAll({
                    where: {
                        id: uniqueStudentIds,
                        role: User_1.UserRole.STUDENT,
                        isActive: true,
                    },
                    attributes: ['id'],
                });
                if (students.length !== uniqueStudentIds.length) {
                    const foundIds = new Set(students.map((s) => s.id));
                    const missingIds = uniqueStudentIds.filter((id) => !foundIds.has(id));
                    res.status(400).json({
                        status: 'error',
                        message: `Invalid or inactive student IDs: ${missingIds.join(', ')}`,
                    });
                    return;
                }
                normalizedStudentIds = uniqueStudentIds;
            }
            else {
                normalizedStudentIds = [];
            }
        }
        // Update batch with transaction
        const transaction = await models_1.default.sequelize.transaction();
        try {
            await batch.update({
                title: title !== undefined ? title : batch.title,
                software: software !== undefined ? software : batch.software,
                mode: mode !== undefined ? mode : batch.mode,
                startDate: startDate ? new Date(startDate) : batch.startDate,
                endDate: endDate ? new Date(endDate) : batch.endDate,
                maxCapacity: maxCapacity !== undefined ? maxCapacity : batch.maxCapacity,
                schedule: schedule !== undefined ? schedule : batch.schedule,
                status: status !== undefined ? status : batch.status,
            }, { transaction });
            // Update faculty assignments if provided
            if (normalizedFacultyIds !== null) {
                const deletedCount = await models_1.default.BatchFacultyAssignment.destroy({
                    where: { batchId: batch.id },
                    transaction,
                });
                logger_1.logger.info(`Deleted ${deletedCount} existing faculty assignments for batch ${batch.id}`);
                if (normalizedFacultyIds.length > 0) {
                    const facultyAssignments = normalizedFacultyIds.map((facultyId) => ({
                        batchId: batch.id,
                        facultyId,
                    }));
                    const createdAssignments = await models_1.default.BatchFacultyAssignment.bulkCreate(facultyAssignments, { transaction });
                    logger_1.logger.info(`Created ${createdAssignments.length} new faculty assignments for batch ${batch.id}: facultyIds=${normalizedFacultyIds.join(', ')}`);
                }
                else {
                    logger_1.logger.info(`No faculty assignments to create for batch ${batch.id} (array was empty)`);
                }
            }
            if (normalizedStudentIds !== null) {
                const existingEnrollments = await models_1.default.Enrollment.findAll({
                    where: { batchId: batch.id },
                    attributes: ['studentId'],
                    transaction,
                });
                const existingIds = existingEnrollments.map((e) => e.studentId);
                const finalIds = normalizedStudentIds;
                const toRemove = existingIds.filter((id) => !finalIds.includes(id));
                if (toRemove.length > 0) {
                    await models_1.default.Enrollment.destroy({
                        where: {
                            batchId: batch.id,
                            studentId: { [sequelize_1.Op.in]: toRemove },
                        },
                        transaction,
                    });
                }
                const toAdd = finalIds.filter((id) => !existingIds.includes(id));
                if (toAdd.length > 0) {
                    const enrollmentRows = toAdd.map((studentId) => ({
                        studentId,
                        batchId: batch.id,
                        enrollmentDate: new Date(),
                        status: 'active',
                    }));
                    await models_1.default.Enrollment.bulkCreate(enrollmentRows, {
                        transaction,
                        ignoreDuplicates: true,
                    });
                }
            }
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
        const updatedBatch = await models_1.default.Batch.findByPk(batch.id, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'assignedFaculty',
                    attributes: ['id', 'name', 'email', 'phone'],
                    through: { attributes: [] },
                },
                {
                    model: models_1.default.Enrollment,
                    as: 'enrollments',
                    include: [
                        {
                            model: models_1.default.User,
                            as: 'student',
                            attributes: ['id', 'name', 'email', 'phone'],
                        },
                    ],
                },
            ],
        });
        const assignedFaculty = updatedBatch?.assignedFaculty?.map((faculty) => ({
            id: faculty.id,
            name: faculty.name,
            email: faculty.email,
            phone: faculty.phone,
        })) || [];
        const enrolledStudents = updatedBatch?.enrollments?.map((enrollment) => ({
            id: enrollment.student?.id,
            name: enrollment.student?.name,
            email: enrollment.student?.email,
            phone: enrollment.student?.phone,
            enrollmentDate: enrollment.enrollmentDate,
            enrollmentStatus: enrollment.status,
        })) || [];
        res.status(200).json({
            status: 'success',
            message: 'Batch updated successfully',
            data: {
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
                    updatedAt: batch.updatedAt,
                },
                assignedFaculty,
                enrolledStudents,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Update batch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating batch',
        });
    }
};
exports.updateBatch = updateBatch;
// DELETE /batches/:id → Delete batch (admin only)
const deleteBatch = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only Admin or SuperAdmin can delete batches
        if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can delete batches',
            });
            return;
        }
        const batchId = parseInt(req.params.id, 10);
        if (isNaN(batchId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid batch ID',
            });
            return;
        }
        const batch = await models_1.default.Batch.findByPk(batchId);
        if (!batch) {
            res.status(404).json({
                status: 'error',
                message: 'Batch not found',
            });
            return;
        }
        // Check if batch has enrollments
        const enrollments = await models_1.default.Enrollment.count({ where: { batchId } });
        if (enrollments > 0) {
            res.status(400).json({
                status: 'error',
                message: `Cannot delete batch with ${enrollments} enrollment(s). Please remove enrollments first.`,
            });
            return;
        }
        await batch.destroy();
        res.status(200).json({
            status: 'success',
            message: 'Batch deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Delete batch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while deleting batch',
        });
    }
};
exports.deleteBatch = deleteBatch;
// PUT /batches/:id/faculty → Assign faculty to batch
const assignFacultyToBatch = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can assign faculty to batches',
            });
            return;
        }
        const batchId = parseInt(req.params.id, 10);
        if (isNaN(batchId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid batch ID',
            });
            return;
        }
        const batch = await models_1.default.Batch.findByPk(batchId);
        if (!batch) {
            res.status(404).json({
                status: 'error',
                message: 'Batch not found',
            });
            return;
        }
        if (!req.body || !Array.isArray(req.body.facultyIds)) {
            res.status(400).json({
                status: 'error',
                message: 'facultyIds array is required',
            });
            return;
        }
        const facultyIds = req.body.facultyIds;
        const normalizedIds = facultyIds.map((value) => Number(value));
        if (normalizedIds.some((facultyId) => Number.isNaN(facultyId) || facultyId <= 0)) {
            res.status(400).json({
                status: 'error',
                message: 'facultyIds must be an array of valid numeric IDs',
            });
            return;
        }
        const uniqueFacultyIds = Array.from(new Set(normalizedIds));
        if (uniqueFacultyIds.length > 0) {
            const facultyMembers = await models_1.default.User.findAll({
                where: {
                    id: uniqueFacultyIds,
                    role: User_1.UserRole.FACULTY,
                    isActive: true,
                },
                attributes: ['id', 'name', 'email', 'phone'],
            });
            if (facultyMembers.length !== uniqueFacultyIds.length) {
                const foundIds = new Set(facultyMembers.map((f) => f.id));
                const missingIds = uniqueFacultyIds.filter((id) => !foundIds.has(id));
                res.status(400).json({
                    status: 'error',
                    message: `Invalid faculty IDs: ${missingIds.join(', ')}`,
                });
                return;
            }
        }
        const transaction = await models_1.default.sequelize.transaction();
        try {
            await models_1.default.BatchFacultyAssignment.destroy({
                where: { batchId },
                transaction,
            });
            if (uniqueFacultyIds.length > 0) {
                const rows = uniqueFacultyIds.map((facultyId) => ({
                    batchId,
                    facultyId,
                }));
                await models_1.default.BatchFacultyAssignment.bulkCreate(rows, { transaction });
            }
            await transaction.commit();
        }
        catch (err) {
            await transaction.rollback();
            throw err;
        }
        const assignedFaculty = uniqueFacultyIds.length > 0
            ? await models_1.default.User.findAll({
                where: { id: uniqueFacultyIds },
                attributes: ['id', 'name', 'email', 'phone'],
            })
            : [];
        res.status(200).json({
            status: 'success',
            message: 'Faculty allocation updated successfully',
            data: {
                batch: {
                    id: batch.id,
                    title: batch.title,
                },
                assignedFaculty,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Assign faculty to batch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while assigning faculty to batch',
        });
    }
};
exports.assignFacultyToBatch = assignFacultyToBatch;
//# sourceMappingURL=batch.controller.js.map