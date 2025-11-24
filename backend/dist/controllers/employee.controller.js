"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmployeeProfile = exports.getEmployeeProfile = exports.createEmployeeProfile = void 0;
const models_1 = __importDefault(require("../models"));
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const createEmployeeProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { userId, employeeId, gender, dateOfBirth, nationality, maritalStatus, department, designation, dateOfJoining, employmentType, reportingManager, workLocation, bankName, accountNumber, ifscCode, branch, panNumber, city, state, postalCode, } = req.body;
        // Validation
        if (!userId || !employeeId) {
            res.status(400).json({
                status: 'error',
                message: 'userId and employeeId are required',
            });
            return;
        }
        // Verify user exists and has employee role
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
                message: 'User must have an employee role to create an employee profile',
            });
            return;
        }
        // Check if employee profile already exists
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
            gender: gender || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            nationality: nationality || null,
            maritalStatus: maritalStatus || null,
            department: department || null,
            designation: designation || null,
            dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
            employmentType: employmentType || null,
            reportingManager: reportingManager || null,
            workLocation: workLocation || null,
            bankName: bankName || null,
            accountNumber: accountNumber || null,
            ifscCode: ifscCode || null,
            branch: branch || null,
            panNumber: panNumber || null,
            city: city || null,
            state: state || null,
            postalCode: postalCode || null,
        });
        res.status(201).json({
            status: 'success',
            message: 'Employee profile created successfully',
            data: {
                employeeProfile: {
                    id: employeeProfile.id,
                    userId: employeeProfile.userId,
                    employeeId: employeeProfile.employeeId,
                    gender: employeeProfile.gender,
                    dateOfBirth: employeeProfile.dateOfBirth,
                    nationality: employeeProfile.nationality,
                    maritalStatus: employeeProfile.maritalStatus,
                    department: employeeProfile.department,
                    designation: employeeProfile.designation,
                    dateOfJoining: employeeProfile.dateOfJoining,
                    employmentType: employeeProfile.employmentType,
                    reportingManager: employeeProfile.reportingManager,
                    workLocation: employeeProfile.workLocation,
                    bankName: employeeProfile.bankName,
                    accountNumber: employeeProfile.accountNumber,
                    ifscCode: employeeProfile.ifscCode,
                    branch: employeeProfile.branch,
                    panNumber: employeeProfile.panNumber,
                    city: employeeProfile.city,
                    state: employeeProfile.state,
                    postalCode: employeeProfile.postalCode,
                    createdAt: employeeProfile.createdAt,
                    updatedAt: employeeProfile.updatedAt,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                    },
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Create employee profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating employee profile',
        });
    }
};
exports.createEmployeeProfile = createEmployeeProfile;
const getEmployeeProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid user ID',
            });
            return;
        }
        // Employees can only view their own profile, unless they are admin/superadmin
        if (req.user.userId !== userId && req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'You can only view your own employee profile unless you are an admin',
            });
            return;
        }
        const employeeProfile = await models_1.default.EmployeeProfile.findOne({
            where: { userId },
            include: [
                {
                    model: models_1.default.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'role'],
                },
            ],
        });
        if (!employeeProfile) {
            res.status(404).json({
                status: 'error',
                message: 'Employee profile not found',
            });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: {
                employeeProfile: {
                    id: employeeProfile.id,
                    userId: employeeProfile.userId,
                    employeeId: employeeProfile.employeeId,
                    gender: employeeProfile.gender,
                    dateOfBirth: employeeProfile.dateOfBirth,
                    nationality: employeeProfile.nationality,
                    maritalStatus: employeeProfile.maritalStatus,
                    department: employeeProfile.department,
                    designation: employeeProfile.designation,
                    dateOfJoining: employeeProfile.dateOfJoining,
                    employmentType: employeeProfile.employmentType,
                    reportingManager: employeeProfile.reportingManager,
                    workLocation: employeeProfile.workLocation,
                    bankName: employeeProfile.bankName,
                    accountNumber: employeeProfile.accountNumber,
                    ifscCode: employeeProfile.ifscCode,
                    branch: employeeProfile.branch,
                    panNumber: employeeProfile.panNumber,
                    city: employeeProfile.city,
                    state: employeeProfile.state,
                    postalCode: employeeProfile.postalCode,
                    createdAt: employeeProfile.createdAt,
                    updatedAt: employeeProfile.updatedAt,
                    user: employeeProfile.user,
                },
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
// Update employee profile
const updateEmployeeProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid user ID',
            });
            return;
        }
        const { employeeId, gender, dateOfBirth, nationality, maritalStatus, department, designation, dateOfJoining, employmentType, reportingManager, workLocation, bankName, accountNumber, ifscCode, branch, panNumber, city, state, postalCode } = req.body;
        // Find employee profile
        const employeeProfile = await models_1.default.EmployeeProfile.findOne({ where: { userId } });
        if (!employeeProfile) {
            res.status(404).json({
                status: 'error',
                message: 'Employee profile not found',
            });
            return;
        }
        // Update profile
        await employeeProfile.update({
            employeeId: employeeId || employeeProfile.employeeId,
            gender: gender !== undefined ? gender : employeeProfile.gender,
            dateOfBirth: dateOfBirth || employeeProfile.dateOfBirth,
            nationality: nationality || employeeProfile.nationality,
            maritalStatus: maritalStatus || employeeProfile.maritalStatus,
            department: department || employeeProfile.department,
            designation: designation || employeeProfile.designation,
            dateOfJoining: dateOfJoining || employeeProfile.dateOfJoining,
            employmentType: employmentType || employeeProfile.employmentType,
            reportingManager: reportingManager || employeeProfile.reportingManager,
            workLocation: workLocation || employeeProfile.workLocation,
            bankName: bankName || employeeProfile.bankName,
            accountNumber: accountNumber || employeeProfile.accountNumber,
            ifscCode: ifscCode || employeeProfile.ifscCode,
            branch: branch || employeeProfile.branch,
            panNumber: panNumber || employeeProfile.panNumber,
            city: city || employeeProfile.city,
            state: state || employeeProfile.state,
            postalCode: postalCode || employeeProfile.postalCode,
        });
        // Fetch updated profile with user
        const updatedProfile = await models_1.default.EmployeeProfile.findByPk(employeeProfile.id, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive'],
                },
            ],
        });
        res.status(200).json({
            status: 'success',
            message: 'Employee profile updated successfully',
            data: {
                employeeProfile: updatedProfile,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Update employee profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating employee profile',
        });
    }
};
exports.updateEmployeeProfile = updateEmployeeProfile;
//# sourceMappingURL=employee.controller.js.map