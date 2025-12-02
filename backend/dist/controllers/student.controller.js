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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadEnrollmentTemplate = exports.bulkEnrollStudents = exports.getAllSoftware = exports.createThreeDummyStudents = exports.createDummyStudent = exports.completeEnrollment = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const XLSX = __importStar(require("xlsx"));
const sequelize_1 = require("sequelize");
const User_1 = require("../models/User");
const models_1 = __importDefault(require("../models"));
const logger_1 = require("../utils/logger");
// POST /students/enroll → Create student user, profile, and enrollment in one call
const completeEnrollment = async (req, res) => {
    const transaction = await models_1.default.sequelize.transaction();
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only Admin or SuperAdmin can create enrollments
        if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can create student enrollments',
            });
            return;
        }
        const { studentName, email, phone, whatsappNumber, dateOfAdmission, localAddress, permanentAddress, emergencyContactNumber, emergencyName, emergencyRelation, courseName, batchId, softwaresIncluded, totalDeal, bookingAmount, balanceAmount, emiPlan, emiPlanDate, complimentarySoftware, complimentaryGift, hasReference, referenceDetails, counselorName, leadSource, walkinDate, masterFaculty, } = req.body;
        // Validation - Only studentName and phone are required
        if (!studentName || !studentName.trim()) {
            await transaction.rollback();
            res.status(400).json({
                status: 'error',
                message: 'Student name is required',
            });
            return;
        }
        if (!phone || !phone.trim()) {
            await transaction.rollback();
            res.status(400).json({
                status: 'error',
                message: 'Phone number is required',
            });
            return;
        }
        // Trim the values
        const trimmedStudentName = studentName.trim();
        const trimmedPhone = phone.trim();
        // Check if user already exists by email (if provided) or phone
        if (email?.trim()) {
            const existingUserByEmail = await models_1.default.User.findOne({ where: { email: email.trim() }, transaction });
            if (existingUserByEmail) {
                await transaction.rollback();
                res.status(409).json({
                    status: 'error',
                    message: 'User with this email already exists',
                });
                return;
            }
        }
        // Check if user already exists by phone
        const existingUserByPhone = await models_1.default.User.findOne({ where: { phone: trimmedPhone }, transaction });
        if (existingUserByPhone) {
            await transaction.rollback();
            res.status(409).json({
                status: 'error',
                message: 'User with this phone number already exists',
            });
            return;
        }
        // Generate a default password (can be changed later)
        const defaultPassword = 'Student@123'; // You might want to make this configurable
        const saltRounds = 10;
        const passwordHash = await bcrypt_1.default.hash(defaultPassword, saltRounds);
        // Generate email if not provided (use phone-based email)
        const finalEmail = email?.trim() || `student_${trimmedPhone.replace(/\D/g, '')}@primeacademy.local`;
        // Create user
        const user = await models_1.default.User.create({
            name: trimmedStudentName,
            email: finalEmail,
            phone: trimmedPhone,
            role: User_1.UserRole.STUDENT,
            passwordHash,
            isActive: true,
        }, { transaction });
        // Create student profile if StudentProfile model exists
        if (models_1.default.StudentProfile) {
            const profileData = {
                userId: user.id,
                dob: dateOfAdmission ? new Date(dateOfAdmission) : null,
                address: localAddress || permanentAddress || null,
                softwareList: softwaresIncluded ? softwaresIncluded.split(',').map((s) => s.trim()).filter((s) => s) : null,
                enrollmentDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
                status: 'active',
            };
            // Store additional fields in documents JSON field (only if there are any)
            const additionalInfo = {};
            if (whatsappNumber)
                additionalInfo.whatsappNumber = whatsappNumber;
            if (emergencyContactNumber) {
                additionalInfo.emergencyContact = {
                    name: emergencyName || null,
                    number: emergencyContactNumber,
                    relation: emergencyRelation || null,
                };
            }
            if (courseName)
                additionalInfo.courseName = courseName;
            if (totalDeal !== undefined)
                additionalInfo.totalDeal = totalDeal;
            if (bookingAmount !== undefined)
                additionalInfo.bookingAmount = bookingAmount;
            if (balanceAmount !== undefined)
                additionalInfo.balanceAmount = balanceAmount;
            if (emiPlan !== undefined)
                additionalInfo.emiPlan = emiPlan;
            if (emiPlanDate)
                additionalInfo.emiPlanDate = emiPlanDate;
            if (complimentarySoftware)
                additionalInfo.complimentarySoftware = complimentarySoftware;
            if (complimentaryGift)
                additionalInfo.complimentaryGift = complimentaryGift;
            if (hasReference !== undefined)
                additionalInfo.hasReference = hasReference;
            if (referenceDetails)
                additionalInfo.referenceDetails = referenceDetails;
            if (counselorName)
                additionalInfo.counselorName = counselorName;
            if (leadSource)
                additionalInfo.leadSource = leadSource;
            if (walkinDate)
                additionalInfo.walkinDate = walkinDate;
            if (masterFaculty)
                additionalInfo.masterFaculty = masterFaculty;
            if (permanentAddress)
                additionalInfo.permanentAddress = permanentAddress;
            if (localAddress)
                additionalInfo.localAddress = localAddress;
            if (Object.keys(additionalInfo).length > 0) {
                profileData.documents = additionalInfo;
            }
            await models_1.default.StudentProfile.create(profileData, { transaction });
        }
        // Create enrollment if batchId is provided
        let enrollment = null;
        if (batchId) {
            // Verify batch exists
            const batch = await models_1.default.Batch.findByPk(batchId, { transaction });
            if (!batch) {
                await transaction.rollback();
                res.status(404).json({
                    status: 'error',
                    message: 'Batch not found',
                });
                return;
            }
            // Check if student is already enrolled
            const existingEnrollment = await models_1.default.Enrollment.findOne({
                where: { studentId: user.id, batchId },
                transaction,
            });
            if (!existingEnrollment) {
                // Check batch capacity
                const currentEnrollments = await models_1.default.Enrollment.count({
                    where: { batchId },
                    transaction,
                });
                if (batch.maxCapacity && currentEnrollments >= batch.maxCapacity) {
                    await transaction.rollback();
                    res.status(400).json({
                        status: 'error',
                        message: `Batch has reached maximum capacity of ${batch.maxCapacity} students`,
                    });
                    return;
                }
                enrollment = await models_1.default.Enrollment.create({
                    studentId: user.id,
                    batchId,
                    enrollmentDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
                    status: 'active',
                }, { transaction });
            }
        }
        await transaction.commit();
        logger_1.logger.info(`Complete enrollment created: userId=${user.id}, email=${email}, batchId=${batchId || 'none'}`);
        res.status(201).json({
            status: 'success',
            message: 'Student enrolled successfully',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
                enrollment: enrollment
                    ? {
                        id: enrollment.id,
                        studentId: enrollment.studentId,
                        batchId: enrollment.batchId,
                        enrollmentDate: enrollment.enrollmentDate,
                        status: enrollment.status,
                    }
                    : undefined,
            },
        });
    }
    catch (error) {
        await transaction.rollback();
        logger_1.logger.error('Complete enrollment error:', error);
        logger_1.logger.error('Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
            errors: error?.errors,
        });
        res.status(500).json({
            status: 'error',
            message: error?.message || 'Internal server error while creating enrollment',
            ...(process.env.NODE_ENV === 'development' && {
                error: error.message,
                details: error?.errors || error?.parent?.message,
            }),
        });
    }
};
exports.completeEnrollment = completeEnrollment;
// POST /students/create-dummy → Create a dummy student with all details
const createDummyStudent = async (_req, res) => {
    const transaction = await models_1.default.sequelize.transaction();
    try {
        // Check if student already exists
        const existingStudent = await models_1.default.User.findOne({
            where: { email: 'john.doe@primeacademy.local' },
            transaction,
        });
        if (existingStudent) {
            await transaction.rollback();
            res.status(409).json({
                status: 'error',
                message: 'Dummy student already exists with email: john.doe@primeacademy.local',
            });
            return;
        }
        // Hash password
        const password = 'Student@123';
        const saltRounds = 10;
        const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        // Create user
        const user = await models_1.default.User.create({
            name: 'John Doe',
            email: 'john.doe@primeacademy.local',
            phone: '+1234567890',
            role: User_1.UserRole.STUDENT,
            passwordHash,
            isActive: true,
            avatarUrl: 'https://ui-avatars.com/api/?name=John+Doe&background=orange&color=fff&size=200',
        }, { transaction });
        // Create student profile with all details
        let studentProfile = null;
        if (models_1.default.StudentProfile) {
            studentProfile = await models_1.default.StudentProfile.create({
                userId: user.id,
                dob: new Date('2000-05-15'),
                address: '123 Main Street, City, State, ZIP Code, Country',
                photoUrl: 'https://ui-avatars.com/api/?name=John+Doe&background=orange&color=fff&size=400',
                softwareList: ['Photoshop', 'Illustrator', 'InDesign', 'Premiere Pro', 'After Effects'],
                enrollmentDate: new Date('2024-01-15'),
                status: 'active',
                documents: {
                    whatsappNumber: '+1234567890',
                    emergencyContactNumber: '+1987654321',
                    emergencyName: 'Jane Doe',
                    emergencyRelation: 'Mother',
                    localAddress: '123 Main Street, City, State, ZIP Code',
                    permanentAddress: '123 Main Street, City, State, ZIP Code',
                    courseName: 'Graphic Design Master Course',
                    totalDeal: 50000,
                    bookingAmount: 10000,
                    balanceAmount: 40000,
                    emiPlan: true,
                    emiPlanDate: '2024-02-01',
                    complimentarySoftware: 'Adobe Creative Cloud',
                    complimentaryGift: 'Design Tablet',
                    hasReference: true,
                    referenceDetails: 'Referred by friend',
                    counselorName: 'Sarah Smith',
                    leadSource: 'Website',
                    walkinDate: '2024-01-10',
                    masterFaculty: 'Prof. Michael Johnson',
                },
            }, { transaction });
        }
        // Try to enroll in a batch if any exists
        let enrollment = null;
        const firstBatch = await models_1.default.Batch.findOne({
            where: { status: 'active' },
            transaction,
        });
        if (firstBatch && models_1.default.Enrollment) {
            enrollment = await models_1.default.Enrollment.create({
                studentId: user.id,
                batchId: firstBatch.id,
                enrollmentDate: new Date('2024-01-15'),
                status: 'active',
            }, { transaction });
        }
        await transaction.commit();
        res.status(201).json({
            status: 'success',
            message: 'Dummy student created successfully',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                },
                studentProfile: studentProfile ? {
                    id: studentProfile.id,
                    softwareList: studentProfile.softwareList,
                    status: studentProfile.status,
                } : null,
                enrollment: enrollment ? {
                    id: enrollment.id,
                    batchId: enrollment.batchId,
                } : null,
                password: password, // Return password for testing
            },
        });
    }
    catch (error) {
        await transaction.rollback();
        logger_1.logger.error('Error creating dummy student:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating dummy student',
        });
    }
};
exports.createDummyStudent = createDummyStudent;
// POST /students/create-three-dummy → Create 3 dummy students with different scenarios
const createThreeDummyStudents = async (_req, res) => {
    try {
        // Import the script function
        const createThreeDummyStudentsScript = (await Promise.resolve().then(() => __importStar(require('../scripts/createThreeDummyStudents')))).default;
        await createThreeDummyStudentsScript();
        res.status(201).json({
            status: 'success',
            message: '3 dummy students created successfully',
            data: {
                students: [
                    { name: 'Alice Johnson', email: 'alice.johnson@primeacademy.local', scenario: 'Enrolled in future batch' },
                    { name: 'Bob Smith', email: 'bob.smith@primeacademy.local', scenario: 'Multiple enrollments' },
                    { name: 'Carol Williams', email: 'carol.williams@primeacademy.local', scenario: 'On leave with pending batch' },
                ],
                password: 'Student@123',
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating three dummy students:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating dummy students',
            error: error.message,
        });
    }
};
exports.createThreeDummyStudents = createThreeDummyStudents;
// GET /students/all-software → Get all unique software from batches and student profiles
const getAllSoftware = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Get all software from batches
        const batches = await models_1.default.Batch.findAll({
            attributes: ['software'],
            where: {
                software: { [sequelize_1.Op.ne]: null },
            },
        });
        // Get all software from student profiles
        const studentProfiles = await models_1.default.StudentProfile.findAll({
            attributes: ['softwareList'],
            where: {
                softwareList: { [sequelize_1.Op.ne]: null },
            },
        });
        // Collect all software
        const softwareSet = new Set();
        // Extract from batches (comma-separated or single string)
        batches.forEach((batch) => {
            if (batch.software) {
                const softwareArray = batch.software.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
                softwareArray.forEach((s) => softwareSet.add(s));
            }
        });
        // Extract from student profiles (array)
        studentProfiles.forEach((profile) => {
            if (profile.softwareList && Array.isArray(profile.softwareList)) {
                profile.softwareList.forEach((s) => {
                    if (s && typeof s === 'string') {
                        softwareSet.add(s.trim());
                    }
                });
            }
        });
        // Convert to sorted array
        const allSoftware = Array.from(softwareSet).sort();
        res.status(200).json({
            status: 'success',
            data: {
                software: allSoftware,
                count: allSoftware.length,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get all software error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching software list',
        });
    }
};
exports.getAllSoftware = getAllSoftware;
// POST /students/bulk-enroll → Bulk enroll students from Excel (admin only)
const bulkEnrollStudents = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only SuperAdmin and Admin can bulk enroll
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can bulk enroll students',
            });
            return;
        }
        if (!req.file) {
            res.status(400).json({
                status: 'error',
                message: 'Excel file is required',
            });
            return;
        }
        // Parse Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);
        if (rows.length === 0) {
            res.status(400).json({
                status: 'error',
                message: 'Excel file is empty or has no data rows',
            });
            return;
        }
        const result = {
            success: 0,
            failed: 0,
            errors: [],
        };
        // Process each row (each row gets its own transaction for isolation)
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have a header
            const transaction = await models_1.default.sequelize.transaction();
            try {
                // Validate required fields
                if (!row.studentName || !row.email || !row.phone || !row.dateOfAdmission) {
                    await transaction.rollback();
                    result.failed++;
                    result.errors.push({
                        row: rowNumber,
                        email: row.email || 'N/A',
                        error: 'Missing required fields: studentName, email, phone, or dateOfAdmission',
                    });
                    continue;
                }
                // Check if user already exists
                const existingUser = await models_1.default.User.findOne({
                    where: { email: row.email },
                    transaction
                });
                if (existingUser) {
                    await transaction.rollback();
                    result.failed++;
                    result.errors.push({
                        row: rowNumber,
                        email: row.email,
                        error: 'User with this email already exists',
                    });
                    continue;
                }
                // Generate default password (email prefix + '123')
                const defaultPassword = `${row.email.split('@')[0]}123`;
                const passwordHash = await bcrypt_1.default.hash(defaultPassword, 10);
                // Create user
                const user = await models_1.default.User.create({
                    name: row.studentName,
                    email: row.email,
                    phone: row.phone || null,
                    role: User_1.UserRole.STUDENT,
                    passwordHash,
                    isActive: true,
                }, { transaction });
                // Prepare enrollment metadata
                const enrollmentMetadata = {
                    whatsappNumber: row.whatsappNumber || row.phone,
                    emergencyContactNumber: row.emergencyContactNumber,
                    emergencyName: row.emergencyName,
                    emergencyRelation: row.emergencyRelation,
                    courseName: row.courseName,
                    totalDeal: row.totalDeal,
                    bookingAmount: row.bookingAmount,
                    balanceAmount: row.balanceAmount,
                    emiPlan: row.emiPlan,
                    emiPlanDate: row.emiPlanDate,
                    complimentarySoftware: row.complimentarySoftware,
                    complimentaryGift: row.complimentaryGift,
                    hasReference: row.hasReference,
                    referenceDetails: row.referenceDetails,
                    counselorName: row.counselorName,
                    leadSource: row.leadSource,
                    walkinDate: row.walkinDate,
                    masterFaculty: row.masterFaculty,
                };
                const softwareList = row.softwaresIncluded
                    ? row.softwaresIncluded.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
                    : [];
                // Create student profile
                if (models_1.default.StudentProfile) {
                    await models_1.default.StudentProfile.create({
                        userId: user.id,
                        dob: row.dateOfAdmission ? new Date(row.dateOfAdmission) : null,
                        address: `${row.localAddress || ''} | Permanent: ${row.permanentAddress || ''}`.trim() || null,
                        documents: {
                            enrollmentMetadata,
                        },
                        softwareList: softwareList.length > 0 ? softwareList : null,
                        photoUrl: null,
                        enrollmentDate: row.dateOfAdmission ? new Date(row.dateOfAdmission) : new Date(),
                        status: 'active',
                    }, { transaction });
                }
                await transaction.commit();
                result.success++;
            }
            catch (error) {
                await transaction.rollback();
                logger_1.logger.error(`Error processing row ${rowNumber}:`, error);
                result.failed++;
                result.errors.push({
                    row: rowNumber,
                    email: row.email || 'N/A',
                    error: error.message || 'Unknown error',
                });
            }
        }
        res.status(200).json({
            status: 'success',
            message: `Bulk enrollment completed. ${result.success} students enrolled, ${result.failed} failed.`,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('Bulk enrollment error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while processing bulk enrollment',
            error: error.message,
        });
    }
};
exports.bulkEnrollStudents = bulkEnrollStudents;
// GET /students/template → Download enrollment template (admin only)
const downloadEnrollmentTemplate = async (req, res) => {
    try {
        logger_1.logger.info('Download template request received');
        if (!req.user) {
            logger_1.logger.warn('Download template: Authentication required');
            res.setHeader('Content-Type', 'application/json');
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only SuperAdmin and Admin can download template
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            logger_1.logger.warn(`Download template: Unauthorized role - ${req.user.role}`);
            res.setHeader('Content-Type', 'application/json');
            res.status(403).json({
                status: 'error',
                message: 'Only admins can download enrollment template',
            });
            return;
        }
        logger_1.logger.info('Creating Excel template...');
        // Create sample data
        const sampleData = [
            {
                studentName: 'John Doe',
                email: 'john.doe@example.com',
                phone: '+1234567890',
                whatsappNumber: '+1234567890',
                dateOfAdmission: '2024-01-15',
                localAddress: '123 Main St, City, State',
                permanentAddress: '123 Main St, City, State',
                emergencyContactNumber: '+1234567891',
                emergencyName: 'Jane Doe',
                emergencyRelation: 'Mother',
                courseName: 'Graphic Design',
                totalDeal: 50000,
                bookingAmount: 10000,
                balanceAmount: 40000,
                emiPlan: 'Yes',
                emiPlanDate: '2024-02-15',
                softwaresIncluded: 'Photoshop, Illustrator, InDesign',
                complimentarySoftware: 'Adobe Creative Cloud',
                complimentaryGift: 'Mouse Pad',
                hasReference: 'Yes',
                referenceDetails: 'Referred by friend',
                counselorName: 'Sarah Smith',
                leadSource: 'Walk-in',
                walkinDate: '2024-01-10',
                masterFaculty: 'Dr. John Smith',
            },
        ];
        // Create workbook
        logger_1.logger.info('Creating workbook...');
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Enrollment');
        // Generate buffer
        logger_1.logger.info('Generating buffer...');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        logger_1.logger.info(`Buffer generated, size: ${buffer.length} bytes`);
        // Set headers BEFORE sending response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=student_enrollment_template.xlsx');
        res.setHeader('Content-Length', buffer.length.toString());
        // Send file
        logger_1.logger.info('Sending file...');
        res.send(buffer);
        logger_1.logger.info('Template sent successfully');
    }
    catch (error) {
        logger_1.logger.error('Download template error:', error);
        logger_1.logger.error('Download template error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
        });
        // Make sure to clear any headers that were set for file download
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            res.status(500).json({
                status: 'error',
                message: 'Internal server error while generating template',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
        else {
            logger_1.logger.error('Headers already sent, cannot send error response');
        }
    }
};
exports.downloadEnrollmentTemplate = downloadEnrollmentTemplate;
//# sourceMappingURL=student.controller.js.map