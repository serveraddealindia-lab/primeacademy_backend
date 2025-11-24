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
exports.downloadEnrollmentTemplate = exports.bulkEnrollStudents = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const XLSX = __importStar(require("xlsx"));
const User_1 = require("../models/User");
const models_1 = __importDefault(require("../models"));
const logger_1 = require("../utils/logger");
// Bulk enrollment from Excel
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
        // Process each row
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have a header
            try {
                // Validate required fields
                if (!row.studentName || !row.email || !row.phone || !row.dateOfAdmission) {
                    result.failed++;
                    result.errors.push({
                        row: rowNumber,
                        email: row.email || 'N/A',
                        error: 'Missing required fields: studentName, email, phone, or dateOfAdmission',
                    });
                    continue;
                }
                // Check if user already exists
                const existingUser = await models_1.default.User.findOne({ where: { email: row.email } });
                if (existingUser) {
                    result.failed++;
                    result.errors.push({
                        row: rowNumber,
                        email: row.email,
                        error: 'User with this email already exists',
                    });
                    continue;
                }
                // Generate default password (email + '123')
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
                });
                // Prepare enrollment metadata
                const enrollmentMetadata = {
                    whatsappNumber: row.whatsappNumber || row.phone,
                    emergencyContact: {
                        number: row.emergencyContactNumber || row.phone,
                        name: row.emergencyName || 'N/A',
                        relation: row.emergencyRelation || 'N/A',
                    },
                    courseName: row.courseName || 'N/A',
                    financialDetails: {
                        totalDeal: parseFloat(String(row.totalDeal || 0)),
                        bookingAmount: parseFloat(String(row.bookingAmount || 0)),
                        balanceAmount: parseFloat(String(row.balanceAmount || 0)),
                        emiPlan: row.emiPlan?.toLowerCase() === 'yes',
                        emiPlanDate: row.emiPlanDate || null,
                    },
                    complimentarySoftware: row.complimentarySoftware || 'None',
                    complimentaryGift: row.complimentaryGift || null,
                    reference: row.hasReference?.toLowerCase() === 'yes' ? row.referenceDetails : null,
                    counselorName: row.counselorName || 'N/A',
                    leadSource: row.leadSource || 'N/A',
                    walkinDate: row.walkinDate || row.dateOfAdmission,
                    masterFaculty: row.masterFaculty || 'N/A',
                };
                // Parse software list
                const softwareList = row.softwaresIncluded
                    ? row.softwaresIncluded.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
                    : [];
                // Create student profile
                await models_1.default.StudentProfile.create({
                    userId: user.id,
                    dateOfBirth: row.dateOfAdmission ? new Date(row.dateOfAdmission) : null,
                    address: `${row.localAddress || ''} | Permanent: ${row.permanentAddress || ''}`,
                    documents: {
                        enrollmentMetadata,
                    },
                    software: softwareList,
                    photoUrl: null,
                });
                result.success++;
            }
            catch (error) {
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
// Download enrollment template
const downloadEnrollmentTemplate = async (req, res) => {
    try {
        if (!req.user) {
            // Set proper content type for error response
            res.setHeader('Content-Type', 'application/json');
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only SuperAdmin and Admin can download template
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            // Set proper content type for error response
            res.setHeader('Content-Type', 'application/json');
            res.status(403).json({
                status: 'error',
                message: 'Only admins can download enrollment template',
            });
            return;
        }
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
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Enrollment');
        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        // Set headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=student_enrollment_template.xlsx');
        // Send file
        res.send(buffer);
    }
    catch (error) {
        logger_1.logger.error('Download template error:', error);
        // Make sure to clear any headers that were set for file download
        res.removeHeader('Content-Type');
        res.removeHeader('Content-Disposition');
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while generating template',
            error: error.message,
        });
    }
};
exports.downloadEnrollmentTemplate = downloadEnrollmentTemplate;
//# sourceMappingURL=student.controller.js.map