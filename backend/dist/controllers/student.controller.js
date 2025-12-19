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
/**
 * Parse date from Excel - handles Excel serial dates, various string formats, and Date objects
 * @param dateValue - Date value from Excel (can be number, string, or Date)
 * @returns Date object or null if invalid
 */
function parseExcelDate(dateValue) {
    if (!dateValue)
        return null;
    try {
        // If it's already a Date object
        if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? null : dateValue;
        }
        // If it's a number (Excel serial date)
        if (typeof dateValue === 'number') {
            // Excel serial date: days since January 1, 1900
            // JavaScript Date uses milliseconds since January 1, 1970
            // Excel epoch: January 1, 1900 = -2208988800000 ms
            // But Excel incorrectly treats 1900 as a leap year, so we need to adjust
            const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
            const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
            return isNaN(date.getTime()) ? null : date;
        }
        // If it's a string, try to parse it
        if (typeof dateValue === 'string') {
            const trimmed = dateValue.trim();
            if (!trimmed)
                return null;
            // Try ISO format first (YYYY-MM-DD)
            if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
                const date = new Date(trimmed);
                if (!isNaN(date.getTime()))
                    return date;
            }
            // Try DD/MM/YYYY format
            const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (ddmmyyyy) {
                const [, day, month, year] = ddmmyyyy;
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime()))
                    return date;
            }
            // Try MM/DD/YYYY format
            const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (mmddyyyy) {
                const [, month, day, year] = mmddyyyy;
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime()))
                    return date;
            }
            // Try generic Date parsing
            const date = new Date(trimmed);
            if (!isNaN(date.getTime()))
                return date;
        }
        return null;
    }
    catch (error) {
        logger_1.logger.warn(`Failed to parse date: ${dateValue}`, error);
        return null;
    }
}
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
        const { studentName, email, phone, whatsappNumber, dateOfAdmission, localAddress, permanentAddress, emergencyContactNumber, emergencyName, emergencyRelation, courseName, batchId, softwaresIncluded, totalDeal, bookingAmount, balanceAmount, emiPlan, emiPlanDate, emiInstallments, complimentarySoftware, complimentaryGift, hasReference, referenceDetails, counselorName, leadSource, walkinDate, masterFaculty, enrollmentDocuments, } = req.body;
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
            // Parse batch status fields if provided
            const parseBatchList = (value) => {
                if (!value || value === '')
                    return null;
                if (Array.isArray(value))
                    return value.filter((s) => s.trim().length > 0);
                if (typeof value === 'string') {
                    return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
                }
                return null;
            };
            const profileData = {
                userId: user.id,
                dob: dateOfAdmission ? new Date(dateOfAdmission) : null,
                address: localAddress || permanentAddress || null,
                softwareList: softwaresIncluded ? softwaresIncluded.split(',').map((s) => s.trim()).filter((s) => s) : null,
                enrollmentDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
                status: 'active',
                finishedBatches: req.body.finishedBatches ? parseBatchList(req.body.finishedBatches) : null,
                currentBatches: req.body.currentBatches ? parseBatchList(req.body.currentBatches) : null,
                pendingBatches: req.body.pendingBatches ? parseBatchList(req.body.pendingBatches) : null,
            };
            // Store additional fields in documents.enrollmentMetadata (matching bulk upload structure)
            const enrollmentMetadata = {};
            if (whatsappNumber)
                enrollmentMetadata.whatsappNumber = whatsappNumber;
            if (emergencyContactNumber || emergencyName || emergencyRelation) {
                enrollmentMetadata.emergencyContact = {
                    name: emergencyName || null,
                    number: emergencyContactNumber || null,
                    relation: emergencyRelation || null,
                };
            }
            if (courseName)
                enrollmentMetadata.courseName = courseName;
            if (totalDeal !== undefined)
                enrollmentMetadata.totalDeal = totalDeal;
            if (bookingAmount !== undefined)
                enrollmentMetadata.bookingAmount = bookingAmount;
            if (balanceAmount !== undefined)
                enrollmentMetadata.balanceAmount = balanceAmount;
            if (emiPlan !== undefined)
                enrollmentMetadata.emiPlan = emiPlan;
            if (emiPlanDate)
                enrollmentMetadata.emiPlanDate = emiPlanDate;
            if (emiInstallments && Array.isArray(emiInstallments) && emiInstallments.length > 0) {
                enrollmentMetadata.emiInstallments = emiInstallments;
            }
            if (complimentarySoftware)
                enrollmentMetadata.complimentarySoftware = complimentarySoftware;
            if (complimentaryGift)
                enrollmentMetadata.complimentaryGift = complimentaryGift;
            if (hasReference !== undefined)
                enrollmentMetadata.hasReference = hasReference;
            if (referenceDetails)
                enrollmentMetadata.referenceDetails = referenceDetails;
            if (counselorName)
                enrollmentMetadata.counselorName = counselorName;
            if (leadSource)
                enrollmentMetadata.leadSource = leadSource;
            if (walkinDate)
                enrollmentMetadata.walkinDate = walkinDate;
            if (masterFaculty)
                enrollmentMetadata.masterFaculty = masterFaculty;
            if (permanentAddress)
                enrollmentMetadata.permanentAddress = permanentAddress;
            if (localAddress)
                enrollmentMetadata.localAddress = localAddress;
            if (dateOfAdmission)
                enrollmentMetadata.dateOfAdmission = dateOfAdmission;
            if (enrollmentDocuments && Array.isArray(enrollmentDocuments) && enrollmentDocuments.length > 0) {
                enrollmentMetadata.enrollmentDocuments = enrollmentDocuments;
            }
            // Always store documents with enrollmentMetadata wrapper (matching bulk upload structure)
            profileData.documents = {
                enrollmentMetadata,
            };
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
                // Prepare paymentPlan from enrollment metadata
                const paymentPlan = {};
                if (totalDeal !== undefined)
                    paymentPlan.totalDeal = totalDeal;
                if (bookingAmount !== undefined)
                    paymentPlan.bookingAmount = bookingAmount;
                if (balanceAmount !== undefined)
                    paymentPlan.balanceAmount = balanceAmount;
                if (emiPlan !== undefined)
                    paymentPlan.emiPlan = emiPlan;
                if (emiPlanDate)
                    paymentPlan.emiPlanDate = emiPlanDate;
                if (emiInstallments && Array.isArray(emiInstallments) && emiInstallments.length > 0) {
                    paymentPlan.emiInstallments = emiInstallments;
                }
                enrollment = await models_1.default.Enrollment.create({
                    studentId: user.id,
                    batchId,
                    enrollmentDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
                    status: 'active',
                    paymentPlan: Object.keys(paymentPlan).length > 0 ? paymentPlan : null,
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
            logger_1.logger.error('Bulk enrollment: No file received');
            res.status(400).json({
                status: 'error',
                message: 'Excel file is required',
            });
            return;
        }
        logger_1.logger.info(`Bulk enrollment: File received - name: ${req.file.originalname}, size: ${req.file.size}, mimetype: ${req.file.mimetype}`);
        // Parse Excel file with date parsing enabled
        let workbook;
        try {
            workbook = XLSX.read(req.file.buffer, {
                type: 'buffer',
                cellDates: true, // Parse dates automatically as Date objects
            });
            logger_1.logger.info(`Bulk enrollment: Excel file parsed successfully - sheets: ${workbook.SheetNames.join(', ')}`);
        }
        catch (parseError) {
            logger_1.logger.error('Bulk enrollment: Failed to parse Excel file:', parseError);
            res.status(400).json({
                status: 'error',
                message: `Failed to parse Excel file: ${parseError.message}`,
            });
            return;
        }
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Log available columns for debugging
        const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null })[0];
        logger_1.logger.info(`Excel file columns detected: ${headerRow ? headerRow.join(', ') : 'No headers found'}`);
        const rows = XLSX.utils.sheet_to_json(worksheet, {
            raw: true, // Get raw values (Date objects for dates, numbers for numbers)
            defval: null, // Default value for empty cells
            blankrows: false, // Skip blank rows
        });
        logger_1.logger.info(`Total rows parsed from Excel: ${rows.length}`);
        if (rows.length > 0) {
            logger_1.logger.info(`First row sample keys: ${Object.keys(rows[0] || {}).join(', ')}`);
        }
        if (rows.length === 0) {
            res.status(400).json({
                status: 'error',
                message: 'Excel file is empty or has no data rows',
            });
            return;
        }
        // Helper function to get column value with multiple possible names (case-insensitive)
        const getColumnValue = (row, possibleNames) => {
            for (const name of possibleNames) {
                // Try exact match first
                if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                    return row[name];
                }
                // Try case-insensitive match
                const lowerName = name.toLowerCase();
                for (const key in row) {
                    if (key.toLowerCase() === lowerName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
                        return row[key];
                    }
                }
            }
            return null;
        };
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
                // Log row data for debugging (first row only)
                if (i === 0) {
                    logger_1.logger.info(`Row ${rowNumber} raw data:`, JSON.stringify(row, null, 2));
                    logger_1.logger.info(`Row ${rowNumber} available keys:`, Object.keys(row).join(', '));
                }
                // Get required fields with flexible column name matching
                const studentName = getColumnValue(row, ['studentName', 'Student Name', 'student_name', 'Name', 'name', 'StudentName']);
                const email = getColumnValue(row, ['email', 'Email', 'EMAIL', 'Email Address', 'emailAddress']);
                const phone = getColumnValue(row, ['phone', 'Phone', 'PHONE', 'phoneNumber', 'Phone Number', 'phone_number', 'PhoneNumber', 'Mobile', 'mobile', 'Mobile Number']);
                const dateOfAdmission = getColumnValue(row, ['dateOfAdmission', 'Date of Admission', 'date_of_admission', 'DateOfAdmission', 'admissionDate', 'Admission Date', 'AdmissionDate', 'Date', 'date']);
                // Validate required fields
                if (!studentName || !email || !phone || !dateOfAdmission) {
                    await transaction.rollback();
                    const missingFields = [];
                    if (!studentName)
                        missingFields.push('studentName');
                    if (!email)
                        missingFields.push('email');
                    if (!phone)
                        missingFields.push('phone');
                    if (!dateOfAdmission)
                        missingFields.push('dateOfAdmission');
                    // Log available columns for debugging
                    const availableColumns = Object.keys(row).join(', ');
                    const rowValues = Object.entries(row).map(([k, v]) => `${k}:${v}`).join(', ');
                    logger_1.logger.warn(`Row ${rowNumber} validation failed. Missing: ${missingFields.join(', ')}. Available: ${availableColumns}`);
                    logger_1.logger.warn(`Row ${rowNumber} values: ${rowValues}`);
                    result.failed++;
                    result.errors.push({
                        row: rowNumber,
                        email: email || 'N/A',
                        error: `Missing required fields: ${missingFields.join(', ')}. Available columns: ${availableColumns}`,
                    });
                    continue;
                }
                // Check if user already exists
                const existingUser = await models_1.default.User.findOne({
                    where: { email: email },
                    transaction
                });
                if (existingUser) {
                    await transaction.rollback();
                    result.failed++;
                    result.errors.push({
                        row: rowNumber,
                        email: email,
                        error: 'User with this email already exists',
                    });
                    continue;
                }
                // Generate default password (email prefix + '123')
                const defaultPassword = `${email.split('@')[0]}123`;
                const passwordHash = await bcrypt_1.default.hash(defaultPassword, 10);
                // Create user
                const user = await models_1.default.User.create({
                    name: studentName,
                    email: email,
                    phone: phone || null,
                    role: User_1.UserRole.STUDENT,
                    passwordHash,
                    isActive: true,
                }, { transaction });
                // Parse dateOfAdmission properly from Excel
                const parsedDateOfAdmission = parseExcelDate(dateOfAdmission);
                if (!parsedDateOfAdmission) {
                    await transaction.rollback();
                    result.failed++;
                    result.errors.push({
                        row: rowNumber,
                        email: email || 'N/A',
                        error: `Invalid dateOfAdmission format: ${dateOfAdmission}. Please use YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY format`,
                    });
                    continue;
                }
                // Format date as ISO string for storage in metadata (YYYY-MM-DD)
                const dateOfAdmissionISO = parsedDateOfAdmission.toISOString().split('T')[0];
                // Log for debugging (only in development)
                if (process.env.NODE_ENV === 'development') {
                    logger_1.logger.info(`Row ${rowNumber}: Parsed dateOfAdmission from "${dateOfAdmission}" to "${dateOfAdmissionISO}"`);
                }
                // Parse DOB if provided - check multiple possible column names
                let dobValue = getColumnValue(row, ['dob', 'DOB', 'dateOfBirth', 'Date of Birth', 'date_of_birth', 'DateOfBirth']);
                const parsedDob = dobValue ? parseExcelDate(dobValue) : null;
                if (dobValue && !parsedDob) {
                    logger_1.logger.warn(`Row ${rowNumber}: Failed to parse dob from "${dobValue}". Accepted formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, or Excel serial date`);
                }
                else if (parsedDob) {
                    logger_1.logger.info(`Row ${rowNumber}: Parsed dob from "${dobValue}" to "${parsedDob.toISOString().split('T')[0]}"`);
                }
                else {
                    logger_1.logger.info(`Row ${rowNumber}: No DOB provided`);
                }
                // Handle boolean fields (Excel might store as "Yes"/"No" or true/false)
                const parseBoolean = (value) => {
                    if (value === undefined || value === null || value === '')
                        return undefined;
                    if (typeof value === 'boolean')
                        return value;
                    if (typeof value === 'string') {
                        const lower = value.toLowerCase().trim();
                        return lower === 'yes' || lower === 'true' || lower === '1';
                    }
                    return Boolean(value);
                };
                // Prepare enrollment metadata
                const enrollmentMetadata = {
                    dateOfAdmission: dateOfAdmissionISO, // Store in metadata as well
                    whatsappNumber: row.whatsappNumber || row.phone || null,
                    courseName: row.courseName || null,
                    totalDeal: row.totalDeal ? (typeof row.totalDeal === 'string' ? parseFloat(row.totalDeal) : row.totalDeal) : null,
                    bookingAmount: row.bookingAmount ? (typeof row.bookingAmount === 'string' ? parseFloat(row.bookingAmount) : row.bookingAmount) : null,
                    balanceAmount: row.balanceAmount ? (typeof row.balanceAmount === 'string' ? parseFloat(row.balanceAmount) : row.balanceAmount) : null,
                    emiPlan: parseBoolean(row.emiPlan),
                    emiPlanDate: row.emiPlanDate ? (parseExcelDate(row.emiPlanDate)?.toISOString().split('T')[0] || null) : null,
                    emiInstallments: row.emiInstallments ? (typeof row.emiInstallments === 'string' ? (() => {
                        try {
                            return JSON.parse(row.emiInstallments);
                        }
                        catch (e) {
                            logger_1.logger.warn(`Row ${rowNumber}: Failed to parse emiInstallments JSON: ${row.emiInstallments}`);
                            return null;
                        }
                    })() : (Array.isArray(row.emiInstallments) ? row.emiInstallments : null)) : null,
                    complimentarySoftware: row.complimentarySoftware || null,
                    complimentaryGift: row.complimentaryGift || null,
                    hasReference: parseBoolean(row.hasReference),
                    referenceDetails: row.referenceDetails || null,
                    counselorName: row.counselorName || null,
                    leadSource: row.leadSource || null,
                    walkinDate: row.walkinDate ? (parseExcelDate(row.walkinDate)?.toISOString().split('T')[0] || null) : null,
                    masterFaculty: row.masterFaculty || null,
                    localAddress: row.localAddress || null,
                    permanentAddress: row.permanentAddress || null,
                };
                // Store emergency contact as nested object (matching the structure expected by the frontend)
                if (row.emergencyContactNumber || row.emergencyName || row.emergencyRelation) {
                    enrollmentMetadata.emergencyContact = {
                        number: row.emergencyContactNumber || null,
                        name: row.emergencyName || null,
                        relation: row.emergencyRelation || null,
                    };
                }
                const softwareList = row.softwaresIncluded
                    ? row.softwaresIncluded.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
                    : [];
                // Parse batch status fields (comma-separated software names)
                const parseBatchList = (value) => {
                    if (!value || value === '')
                        return null;
                    if (Array.isArray(value))
                        return value.filter((s) => s.trim().length > 0);
                    if (typeof value === 'string') {
                        return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
                    }
                    return null;
                };
                const finishedBatches = parseBatchList(row.finishedBatches || row.finished_batches);
                const currentBatches = parseBatchList(row.currentBatches || row.current_batches);
                const pendingBatches = parseBatchList(row.pendingBatches || row.pending_batches);
                // Create student profile
                if (models_1.default.StudentProfile) {
                    const profileData = {
                        userId: user.id,
                        dob: parsedDob, // Use parsed DOB
                        address: row.localAddress || null, // Store local address in address field (fallback for view)
                        documents: {
                            enrollmentMetadata,
                        },
                        softwareList: softwareList.length > 0 ? softwareList : null,
                        photoUrl: null,
                        enrollmentDate: parsedDateOfAdmission, // Use properly parsed date
                        status: 'active',
                        finishedBatches: finishedBatches && finishedBatches.length > 0 ? finishedBatches : null,
                        currentBatches: currentBatches && currentBatches.length > 0 ? currentBatches : null,
                        pendingBatches: pendingBatches && pendingBatches.length > 0 ? pendingBatches : null,
                    };
                    logger_1.logger.info(`Row ${rowNumber}: Creating student profile with dob: ${parsedDob ? parsedDob.toISOString().split('T')[0] : 'null'}, emergencyContact: ${enrollmentMetadata.emergencyContact ? JSON.stringify(enrollmentMetadata.emergencyContact) : 'null'}`);
                    await models_1.default.StudentProfile.create(profileData, { transaction });
                }
                await transaction.commit();
                result.success++;
            }
            catch (error) {
                await transaction.rollback();
                logger_1.logger.error(`Error processing row ${rowNumber}:`, error);
                logger_1.logger.error(`Row ${rowNumber} error stack:`, error.stack);
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
        logger_1.logger.error('Bulk enrollment error stack:', error.stack);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while processing bulk enrollment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Please check server logs for details',
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
        // Create sample data with all enrollment fields
        const sampleData = [
            {
                // Basic Information (Required)
                studentName: 'John Doe',
                email: 'john.doe@example.com',
                phone: '+1234567890',
                dateOfAdmission: '2024-01-15',
                dob: '1995-05-20', // Date of Birth
                // Contact Information
                whatsappNumber: '+1234567890',
                localAddress: '123 Main St, City, State',
                permanentAddress: '123 Main St, City, State',
                // Emergency Contact
                emergencyContactNumber: '+1234567891',
                emergencyName: 'Jane Doe',
                emergencyRelation: 'Mother',
                // Course Information
                courseName: 'Graphic Design',
                softwaresIncluded: 'Photoshop, Illustrator, InDesign',
                // Batch Status (comma-separated software names)
                finishedBatches: 'Photoshop, Illustrator', // Software from completed batches
                currentBatches: 'InDesign', // Software from currently active batches
                pendingBatches: 'After Effects, Premiere Pro', // Software from upcoming/pending batches (used for suggestions)
                // Financial Details
                totalDeal: 50000,
                bookingAmount: 10000,
                balanceAmount: 40000,
                emiPlan: 'Yes',
                emiPlanDate: '2024-02-15',
                // Additional Information
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