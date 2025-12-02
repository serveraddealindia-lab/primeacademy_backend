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
        if (!userId || !employeeId) {
            res.status(400).json({
                status: 'error',
                message: 'User ID and Employee ID are required',
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
        // Create employee profile
        const employeeProfile = await models_1.default.EmployeeProfile.create({
            userId,
            employeeId,
            gender: profileData.gender,
            dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null,
            nationality: profileData.nationality || null,
            maritalStatus: profileData.maritalStatus,
            department: profileData.department || null,
            designation: profileData.designation || null,
            dateOfJoining: profileData.dateOfJoining ? new Date(profileData.dateOfJoining) : null,
            employmentType: profileData.employmentType,
            reportingManager: profileData.reportingManager || null,
            workLocation: profileData.workLocation || null,
            bankName: profileData.bankName || null,
            accountNumber: profileData.accountNumber || null,
            ifscCode: profileData.ifscCode || null,
            branch: profileData.branch || null,
            panNumber: profileData.panNumber || null,
            city: profileData.city || null,
            state: profileData.state || null,
            postalCode: profileData.postalCode || null,
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