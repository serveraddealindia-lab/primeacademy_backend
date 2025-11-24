"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginAsUser = exports.updateStudentProfile = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = void 0;
const models_1 = __importDefault(require("../models"));
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const jwt_1 = require("../utils/jwt");
// GET /api/users - Get all users with optional filters
const getAllUsers = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only SuperAdmin and Admin can view all users
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can view all users',
            });
            return;
        }
        const { role, isActive, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        const where = {};
        if (role) {
            where.role = role;
        }
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }
        const includeOptions = [];
        // Only include profile models if they exist
        if (models_1.default.StudentProfile) {
            includeOptions.push({
                model: models_1.default.StudentProfile,
                as: 'studentProfile',
                required: false,
            });
        }
        if (models_1.default.FacultyProfile) {
            includeOptions.push({
                model: models_1.default.FacultyProfile,
                as: 'facultyProfile',
                required: false,
            });
        }
        if (models_1.default.EmployeeProfile) {
            includeOptions.push({
                model: models_1.default.EmployeeProfile,
                as: 'employeeProfile',
                required: false,
            });
        }
        const { count, rows: users } = await models_1.default.User.findAndCountAll({
            where,
            attributes: { exclude: ['passwordHash'] },
            include: includeOptions.length > 0 ? includeOptions : undefined,
            limit: limitNum,
            offset,
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json({
            status: 'success',
            data: {
                users,
                pagination: {
                    total: count,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(count / limitNum),
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get all users error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching users',
        });
    }
};
exports.getAllUsers = getAllUsers;
// GET /api/users/:id - Get user by ID
const getUserById = async (req, res) => {
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
        // Users can view their own profile, or admins can view any user
        if (req.user.userId !== userId && req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'You can only view your own profile unless you are an admin',
            });
            return;
        }
        const includeOptions = [];
        // Only include profile models if they exist
        if (models_1.default.StudentProfile) {
            includeOptions.push({
                model: models_1.default.StudentProfile,
                as: 'studentProfile',
                required: false,
            });
        }
        if (models_1.default.FacultyProfile) {
            includeOptions.push({
                model: models_1.default.FacultyProfile,
                as: 'facultyProfile',
                required: false,
            });
        }
        if (models_1.default.EmployeeProfile) {
            includeOptions.push({
                model: models_1.default.EmployeeProfile,
                as: 'employeeProfile',
                required: false,
            });
        }
        const user = await models_1.default.User.findByPk(userId, {
            attributes: { exclude: ['passwordHash'] },
            include: includeOptions.length > 0 ? includeOptions : undefined,
        });
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: {
                user,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get user by ID error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching user',
        });
    }
};
exports.getUserById = getUserById;
// PUT /api/users/:id - Update user
const updateUser = async (req, res) => {
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
        // Users can update their own profile (except role), or admins can update any user
        const isOwnProfile = req.user.userId === userId;
        const isAdmin = req.user.role === User_1.UserRole.SUPERADMIN || req.user.role === User_1.UserRole.ADMIN;
        if (!isOwnProfile && !isAdmin) {
            res.status(403).json({
                status: 'error',
                message: 'You can only update your own profile unless you are an admin',
            });
            return;
        }
        // Non-admins cannot change role
        if (req.body.role && !isAdmin) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can change user roles',
            });
            return;
        }
        const user = await models_1.default.User.findByPk(userId);
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        // Update user fields
        if (req.body.name !== undefined)
            user.name = req.body.name;
        if (req.body.email !== undefined)
            user.email = req.body.email;
        if (req.body.phone !== undefined)
            user.phone = req.body.phone;
        if (req.body.avatarUrl !== undefined)
            user.avatarUrl = req.body.avatarUrl;
        if (req.body.isActive !== undefined && isAdmin)
            user.isActive = req.body.isActive;
        if (req.body.role !== undefined && isAdmin)
            user.role = req.body.role;
        await user.save();
        // Fetch updated user with relations
        const includeOptions = [];
        if (models_1.default.StudentProfile) {
            includeOptions.push({ model: models_1.default.StudentProfile, as: 'studentProfile', required: false });
        }
        if (models_1.default.FacultyProfile) {
            includeOptions.push({ model: models_1.default.FacultyProfile, as: 'facultyProfile', required: false });
        }
        if (models_1.default.EmployeeProfile) {
            includeOptions.push({ model: models_1.default.EmployeeProfile, as: 'employeeProfile', required: false });
        }
        const updatedUser = await models_1.default.User.findByPk(userId, {
            attributes: { exclude: ['passwordHash'] },
            include: includeOptions.length > 0 ? includeOptions : undefined,
        });
        res.status(200).json({
            status: 'success',
            message: 'User updated successfully',
            data: {
                user: updatedUser,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Update user error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({
                status: 'error',
                message: 'Email already exists',
            });
            return;
        }
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating user',
        });
    }
};
exports.updateUser = updateUser;
// DELETE /api/users/:id - Delete user
const deleteUser = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only SuperAdmin and Admin can delete users
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can delete users',
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
        // Prevent deleting own account
        if (req.user.userId === userId) {
            res.status(400).json({
                status: 'error',
                message: 'You cannot delete your own account',
            });
            return;
        }
        const user = await models_1.default.User.findByPk(userId);
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        await user.destroy();
        res.status(200).json({
            status: 'success',
            message: 'User deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Delete user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while deleting user',
        });
    }
};
exports.deleteUser = deleteUser;
// PUT /api/users/:id/student-profile - Update student profile
const updateStudentProfile = async (req, res) => {
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
        // Users can update their own profile, or admins can update any profile
        const isOwnProfile = req.user.userId === userId;
        const isAdmin = req.user.role === User_1.UserRole.SUPERADMIN || req.user.role === User_1.UserRole.ADMIN;
        if (!isOwnProfile && !isAdmin) {
            res.status(403).json({
                status: 'error',
                message: 'You can only update your own profile unless you are an admin',
            });
            return;
        }
        const user = await models_1.default.User.findByPk(userId);
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        if (user.role !== User_1.UserRole.STUDENT) {
            res.status(400).json({
                status: 'error',
                message: 'User is not a student',
            });
            return;
        }
        // Check if StudentProfile model exists
        if (!models_1.default.StudentProfile) {
            res.status(400).json({
                status: 'error',
                message: 'StudentProfile model is not available',
            });
            return;
        }
        // Get or create student profile
        let studentProfile = await models_1.default.StudentProfile.findOne({ where: { userId } });
        if (!studentProfile) {
            studentProfile = await models_1.default.StudentProfile.create({ userId });
        }
        // Update profile fields
        if (req.body.dob !== undefined)
            studentProfile.dob = req.body.dob ? new Date(req.body.dob) : null;
        if (req.body.address !== undefined)
            studentProfile.address = req.body.address;
        if (req.body.photoUrl !== undefined)
            studentProfile.photoUrl = req.body.photoUrl;
        if (req.body.softwareList !== undefined)
            studentProfile.softwareList = req.body.softwareList;
        if (req.body.enrollmentDate !== undefined)
            studentProfile.enrollmentDate = req.body.enrollmentDate ? new Date(req.body.enrollmentDate) : null;
        if (req.body.status !== undefined)
            studentProfile.status = req.body.status;
        if (req.body.documents !== undefined)
            studentProfile.documents = req.body.documents;
        await studentProfile.save();
        // Fetch updated user with profile
        const updatedUser = await models_1.default.User.findByPk(userId, {
            attributes: { exclude: ['passwordHash'] },
            include: models_1.default.StudentProfile ? [
                {
                    model: models_1.default.StudentProfile,
                    as: 'studentProfile',
                    required: false,
                },
            ] : undefined,
        });
        res.status(200).json({
            status: 'success',
            message: 'Student profile updated successfully',
            data: {
                user: updatedUser,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Update student profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating student profile',
        });
    }
};
exports.updateStudentProfile = updateStudentProfile;
// POST /api/users/:id/login-as - Login as another user (SuperAdmin only)
const loginAsUser = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only SuperAdmin can login as other users
        if (req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only SuperAdmin can login as other users',
            });
            return;
        }
        const targetUserId = parseInt(req.params.id, 10);
        if (isNaN(targetUserId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid user ID',
            });
            return;
        }
        // Find target user
        const targetUser = await models_1.default.User.findByPk(targetUserId, {
            attributes: { exclude: ['passwordHash'] },
        });
        if (!targetUser) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        // Check if target user is active
        if (!targetUser.isActive) {
            res.status(400).json({
                status: 'error',
                message: 'Cannot login as inactive user',
            });
            return;
        }
        // Generate token for target user
        const token = (0, jwt_1.generateToken)({
            userId: targetUser.id,
            email: targetUser.email,
            role: targetUser.role,
        });
        res.status(200).json({
            status: 'success',
            message: 'Logged in as user successfully',
            data: {
                token,
                user: {
                    id: targetUser.id,
                    name: targetUser.name,
                    email: targetUser.email,
                    phone: targetUser.phone,
                    role: targetUser.role,
                    isActive: targetUser.isActive,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Login as user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while logging in as user',
        });
    }
};
exports.loginAsUser = loginAsUser;
//# sourceMappingURL=user.controller.js.map