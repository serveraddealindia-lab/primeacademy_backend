"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmployeeProfile = exports.getEmployeeProfile = void 0;
const models_1 = __importDefault(require("../models"));
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
// GET /api/employees/:userId - Get employee profile
const getEmployeeProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid user ID',
            });
            return;
        }
        // Users can view their own profile, or admins can view any profile
        if (req.user.userId !== userId && req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'You can only view your own profile unless you are an admin',
            });
            return;
        }
        const user = await models_1.default.User.findByPk(userId, {
            attributes: { exclude: ['passwordHash'] },
            include: models_1.default.EmployeeProfile ? [
                {
                    model: models_1.default.EmployeeProfile,
                    as: 'employeeProfile',
                    required: false,
                },
            ] : undefined,
        });
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        if (user.role !== User_1.UserRole.EMPLOYEE) {
            res.status(400).json({
                status: 'error',
                message: 'User is not an employee',
            });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: {
                employeeProfile: user.employeeProfile || null,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get employee profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching employee profile',
        });
    }
};
exports.getEmployeeProfile = getEmployeeProfile;
// POST /api/employees - Create employee profile
const createEmployeeProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only Admin or SuperAdmin can create employee profiles
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can create employee profiles',
            });
            return;
        }
        const { userId, employeeId, ...profileData } = req.body;
        // Validation - All fields required except documents
        const validationErrors = [];
        if (!userId) {
            validationErrors.push('User ID is required');
        }
        if (!employeeId || !employeeId.trim()) {
            validationErrors.push('Employee ID is required');
        }
        if (!profileData.gender || !profileData.gender.trim()) {
            validationErrors.push('Gender is required');
        }
        if (!profileData.dateOfBirth || !profileData.dateOfBirth.trim()) {
            validationErrors.push('Date of Birth is required');
        }
        else {
            const dobDate = new Date(profileData.dateOfBirth);
            if (isNaN(dobDate.getTime())) {
                validationErrors.push('Invalid date of birth format');
            }
            else {
                if (dobDate > new Date()) {
                    validationErrors.push('Date of birth cannot be in the future');
                }
                else {
                    // Check if age is at least 18
                    const today = new Date();
                    let age = today.getFullYear() - dobDate.getFullYear();
                    const monthDiff = today.getMonth() - dobDate.getMonth();
                    const dayDiff = today.getDate() - dobDate.getDate();
                    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                        age--;
                    }
                    if (age < 18) {
                        validationErrors.push('Employee must be at least 18 years old');
                    }
                }
            }
        }
        if (!profileData.nationality || !profileData.nationality.trim()) {
            validationErrors.push('Nationality is required');
        }
        if (!profileData.maritalStatus || !profileData.maritalStatus.trim()) {
            validationErrors.push('Marital Status is required');
        }
        if (!profileData.department || !profileData.department.trim()) {
            validationErrors.push('Department is required');
        }
        if (!profileData.designation || !profileData.designation.trim()) {
            validationErrors.push('Designation is required');
        }
        if (!profileData.dateOfJoining || !profileData.dateOfJoining.trim()) {
            validationErrors.push('Date of Joining is required');
        }
        if (!profileData.employmentType || !profileData.employmentType.trim()) {
            validationErrors.push('Employment Type is required');
        }
        if (!profileData.workLocation || !profileData.workLocation.trim()) {
            validationErrors.push('Work Location is required');
        }
        if (!profileData.bankName || !profileData.bankName.trim()) {
            validationErrors.push('Bank Name is required');
        }
        if (!profileData.accountNumber || !profileData.accountNumber.trim()) {
            validationErrors.push('Account Number is required');
        }
        if (!profileData.ifscCode || !profileData.ifscCode.trim()) {
            validationErrors.push('IFSC Code is required');
        }
        if (!profileData.branch || !profileData.branch.trim()) {
            validationErrors.push('Branch is required');
        }
        if (!profileData.panNumber || !profileData.panNumber.trim()) {
            validationErrors.push('PAN Number is required');
        }
        if (!profileData.city || !profileData.city.trim()) {
            validationErrors.push('City is required');
        }
        if (!profileData.state || !profileData.state.trim()) {
            validationErrors.push('State is required');
        }
        if (!profileData.postalCode || !profileData.postalCode.trim()) {
            validationErrors.push('Postal Code is required');
        }
        // Validate PAN format
        if (profileData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(profileData.panNumber.toUpperCase())) {
            validationErrors.push('Invalid PAN Number format. PAN should be 10 characters (e.g., ABCDE1234F)');
        }
        // Validate IFSC format
        if (profileData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(profileData.ifscCode.toUpperCase())) {
            validationErrors.push('Invalid IFSC Code format. IFSC should be 11 characters (e.g., ABCD0123456)');
        }
        if (validationErrors.length > 0) {
            res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: validationErrors,
            });
            return;
        }
        // Check if user exists and is an employee
        const user = await models_1.default.User.findByPk(userId);
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        if (user.role !== User_1.UserRole.EMPLOYEE) {
            res.status(400).json({
                status: 'error',
                message: 'User is not an employee',
            });
            return;
        }
        // Check if EmployeeProfile model exists
        if (!models_1.default.EmployeeProfile) {
            res.status(400).json({
                status: 'error',
                message: 'EmployeeProfile model is not available',
            });
            return;
        }
        // Check if profile already exists
        const existingProfile = await models_1.default.EmployeeProfile.findOne({ where: { userId } });
        if (existingProfile) {
            res.status(409).json({
                status: 'error',
                message: 'Employee profile already exists for this user',
            });
            return;
        }
        // Check if employeeId is already taken
        const existingEmployeeId = await models_1.default.EmployeeProfile.findOne({ where: { employeeId } });
        if (existingEmployeeId) {
            res.status(409).json({
                status: 'error',
                message: 'Employee ID already exists',
            });
            return;
        }
        // Prepare documents object for emergency contact only
        const documents = {};
        // Store emergency contact information if provided
        if (profileData.emergencyContactName || profileData.emergencyRelationship ||
            profileData.emergencyPhoneNumber || profileData.emergencyAlternatePhone) {
            documents.emergencyContact = {
                emergencyContactName: profileData.emergencyContactName?.trim() || null,
                emergencyRelationship: profileData.emergencyRelationship?.trim() || null,
                emergencyPhoneNumber: profileData.emergencyPhoneNumber?.trim() || null,
                emergencyAlternatePhone: profileData.emergencyAlternatePhone?.trim() || null,
            };
        }
        // Create employee profile
        const employeeProfile = await models_1.default.EmployeeProfile.create({
            userId,
            employeeId: employeeId.trim(),
            gender: profileData.gender.trim(),
            dateOfBirth: new Date(profileData.dateOfBirth.trim()),
            nationality: profileData.nationality.trim(),
            maritalStatus: profileData.maritalStatus.trim(),
            department: profileData.department.trim(),
            designation: profileData.designation.trim(),
            dateOfJoining: new Date(profileData.dateOfJoining.trim()),
            employmentType: profileData.employmentType.trim(),
            reportingManager: profileData.reportingManager?.trim() || null,
            workLocation: profileData.workLocation.trim(),
            bankName: profileData.bankName.trim(),
            accountNumber: profileData.accountNumber.trim(),
            ifscCode: profileData.ifscCode.trim().toUpperCase(),
            branch: profileData.branch.trim(),
            panNumber: profileData.panNumber.trim().toUpperCase(),
            address: profileData.address?.trim() || null,
            city: profileData.city.trim(),
            state: profileData.state.trim(),
            postalCode: profileData.postalCode.trim(),
            documents: Object.keys(documents).length > 0 ? documents : null,
        });
        // Fetch created profile with user
        const createdProfile = await models_1.default.EmployeeProfile.findByPk(employeeProfile.id, {
            include: models_1.default.User ? [
                {
                    model: models_1.default.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'role'],
                },
            ] : undefined,
        });
        res.status(201).json({
            status: 'success',
            message: 'Employee profile created successfully',
            data: {
                employeeProfile: createdProfile,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Create employee profile error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error while creating employee profile',
        });
    }
};
exports.createEmployeeProfile = createEmployeeProfile;
//# sourceMappingURL=employee.controller.js.map