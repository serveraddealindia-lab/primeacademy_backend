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
exports.resetUserPassword = exports.getModulesList = exports.loginAsUser = exports.updateEmployeeProfile = exports.updateFacultyProfile = exports.updateStudentProfile = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
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
        let limitNum = parseInt(limit, 10);
        // Cap limit at 10000 to prevent performance issues
        if (limitNum > 10000) {
            limitNum = 10000;
            logger_1.logger.warn(`Limit capped at 10000, requested: ${limit}`);
        }
        // If limit is very high, don't use pagination
        const offset = limitNum > 1000 ? 0 : (pageNum - 1) * limitNum;
        const where = {};
        if (role) {
            where.role = role;
        }
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }
        const includeOptions = [];
        // Only include profile models if they exist and are defined
        // Include profiles based on the role being queried for better performance
        try {
            if (role === 'student' || !role) {
                if (models_1.default.StudentProfile && typeof models_1.default.StudentProfile !== 'undefined') {
                    includeOptions.push({
                        model: models_1.default.StudentProfile,
                        as: 'studentProfile',
                        required: false,
                        attributes: { exclude: ['serialNo'] }, // Exclude serialNo column
                    });
                }
            }
        }
        catch (e) {
            logger_1.logger.warn('StudentProfile model not available for include:', e);
        }
        try {
            if (role === 'faculty' || !role) {
                if (models_1.default.FacultyProfile && typeof models_1.default.FacultyProfile !== 'undefined') {
                    includeOptions.push({
                        model: models_1.default.FacultyProfile,
                        as: 'facultyProfile',
                        required: false,
                    });
                }
            }
        }
        catch (e) {
            logger_1.logger.warn('FacultyProfile model not available for include:', e);
        }
        try {
            if (role === 'employee' || !role) {
                if (models_1.default.EmployeeProfile && typeof models_1.default.EmployeeProfile !== 'undefined') {
                    includeOptions.push({
                        model: models_1.default.EmployeeProfile,
                        as: 'employeeProfile',
                        required: false,
                    });
                }
            }
        }
        catch (e) {
            logger_1.logger.warn('EmployeeProfile model not available for include:', e);
        }
        const queryOptions = {
            where,
            attributes: { exclude: ['passwordHash'] },
            limit: limitNum,
            offset,
            order: [['createdAt', 'DESC']],
        };
        // Only add include if we have valid options
        if (includeOptions.length > 0) {
            queryOptions.include = includeOptions;
        }
        logger_1.logger.info(`Querying users with options: ${JSON.stringify({ where, limit: limitNum, offset, includeCount: includeOptions.length })}`);
        let count;
        let users;
        try {
            const result = await models_1.default.User.findAndCountAll(queryOptions);
            count = result.count;
            users = result.rows;
        }
        catch (queryError) {
            logger_1.logger.error('Database query error in getAllUsers:', queryError);
            logger_1.logger.error('Query options:', JSON.stringify(queryOptions, null, 2));
            // Try without includes if query fails
            if (includeOptions.length > 0) {
                logger_1.logger.info('Retrying query without includes...');
                const simpleQueryOptions = {
                    where,
                    attributes: { exclude: ['passwordHash'] },
                    limit: limitNum,
                    offset,
                    order: [['createdAt', 'DESC']],
                };
                const result = await models_1.default.User.findAndCountAll(simpleQueryOptions);
                count = result.count;
                users = result.rows;
                logger_1.logger.warn('Query succeeded without includes. Profile data may be missing.');
            }
            else {
                throw queryError;
            }
        }
        logger_1.logger.info(`Get all users: Found ${count} users with role=${role}, isActive=${isActive}`);
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
        logger_1.logger.error('Error stack:', error?.stack);
        logger_1.logger.error('Error message:', error?.message);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching users',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
        // Only include profile models if they exist and are defined
        try {
            if (models_1.default.StudentProfile && typeof models_1.default.StudentProfile !== 'undefined') {
                includeOptions.push({
                    model: models_1.default.StudentProfile,
                    as: 'studentProfile',
                    required: false,
                });
            }
        }
        catch (e) {
            logger_1.logger.warn('StudentProfile model not available for include:', e?.message);
        }
        try {
            if (models_1.default.FacultyProfile && typeof models_1.default.FacultyProfile !== 'undefined') {
                includeOptions.push({
                    model: models_1.default.FacultyProfile,
                    as: 'facultyProfile',
                    required: false,
                });
            }
        }
        catch (e) {
            logger_1.logger.warn('FacultyProfile model not available for include:', e?.message);
        }
        try {
            if (models_1.default.EmployeeProfile && typeof models_1.default.EmployeeProfile !== 'undefined') {
                includeOptions.push({
                    model: models_1.default.EmployeeProfile,
                    as: 'employeeProfile',
                    required: false,
                });
            }
        }
        catch (e) {
            logger_1.logger.warn('EmployeeProfile model not available for include:', e?.message);
        }
        // Include enrollments for students
        try {
            if (models_1.default.Enrollment && typeof models_1.default.Enrollment !== 'undefined') {
                includeOptions.push({
                    model: models_1.default.Enrollment,
                    as: 'enrollments',
                    required: false,
                    include: [
                        {
                            model: models_1.default.Batch,
                            as: 'batch',
                            attributes: ['id', 'title', 'software', 'mode', 'status', 'schedule'],
                            required: false,
                        },
                    ],
                });
            }
        }
        catch (e) {
            logger_1.logger.warn('Enrollment model not available for include:', e?.message);
        }
        const queryOptions = {
            attributes: { exclude: ['passwordHash'] },
        };
        // Only add include if we have valid options
        if (includeOptions.length > 0) {
            queryOptions.include = includeOptions;
        }
        logger_1.logger.info(`Fetching user ${userId} with includes: ${includeOptions.map((inc) => inc.as).join(', ')}`);
        let user;
        try {
            user = await models_1.default.User.findByPk(userId, queryOptions);
        }
        catch (queryError) {
            logger_1.logger.error('Database query error in getUserById:', queryError);
            logger_1.logger.error('Query error details:', {
                message: queryError?.message,
                sql: queryError?.sql,
                original: queryError?.original,
            });
            // Try without includes if query fails
            try {
                logger_1.logger.warn('Retrying getUserById without includes due to query error');
                user = await models_1.default.User.findByPk(userId, {
                    attributes: { exclude: ['passwordHash'] },
                });
                // Try to fetch profile separately if user is found
                if (user) {
                    // Fetch employee profile
                    if (user.role === 'employee' && models_1.default.EmployeeProfile) {
                        try {
                            const employeeProfile = await models_1.default.EmployeeProfile.findOne({ where: { userId: user.id } });
                            if (employeeProfile) {
                                const profileJson = employeeProfile.toJSON ? employeeProfile.toJSON() : employeeProfile;
                                // Parse documents if it's a string (MySQL JSON fields sometimes come as strings)
                                if (profileJson.documents && typeof profileJson.documents === 'string') {
                                    try {
                                        profileJson.documents = JSON.parse(profileJson.documents);
                                    }
                                    catch (e) {
                                        logger_1.logger.warn(`Failed to parse documents JSON for employee ${user.id}:`, e);
                                        profileJson.documents = null;
                                    }
                                }
                                user.employeeProfile = profileJson;
                            }
                        }
                        catch (profileError) {
                            logger_1.logger.warn('Failed to fetch employee profile separately:', profileError?.message);
                        }
                    }
                    // Fetch student profile
                    if (user.role === 'student' && models_1.default.StudentProfile) {
                        try {
                            const studentProfile = await models_1.default.StudentProfile.findOne({
                                where: { userId: user.id },
                                attributes: { exclude: ['serialNo'] } // Exclude serialNo column
                            });
                            if (studentProfile) {
                                user.studentProfile = studentProfile;
                            }
                        }
                        catch (profileError) {
                            logger_1.logger.warn('Failed to fetch student profile separately:', profileError?.message);
                        }
                    }
                    // Fetch faculty profile
                    if (user.role === 'faculty' && models_1.default.FacultyProfile) {
                        try {
                            const facultyProfile = await models_1.default.FacultyProfile.findOne({ where: { userId: user.id } });
                            if (facultyProfile) {
                                const profileJson = facultyProfile.toJSON ? facultyProfile.toJSON() : facultyProfile;
                                // Parse documents if it's a string (MySQL JSON fields sometimes come as strings)
                                if (profileJson.documents && typeof profileJson.documents === 'string') {
                                    try {
                                        profileJson.documents = JSON.parse(profileJson.documents);
                                    }
                                    catch (e) {
                                        logger_1.logger.warn(`Failed to parse documents JSON for faculty ${user.id}:`, e);
                                        profileJson.documents = null;
                                    }
                                }
                                // Parse expertise if it's a string
                                if (profileJson.expertise && typeof profileJson.expertise === 'string') {
                                    try {
                                        profileJson.expertise = JSON.parse(profileJson.expertise);
                                    }
                                    catch (e) {
                                        logger_1.logger.warn(`Failed to parse expertise JSON for faculty ${user.id}:`, e);
                                        // Keep as string if parsing fails
                                    }
                                }
                                // Parse availability if it's a string
                                if (profileJson.availability && typeof profileJson.availability === 'string') {
                                    try {
                                        profileJson.availability = JSON.parse(profileJson.availability);
                                    }
                                    catch (e) {
                                        logger_1.logger.warn(`Failed to parse availability JSON for faculty ${user.id}:`, e);
                                        // Keep as string if parsing fails
                                    }
                                }
                                user.facultyProfile = profileJson;
                            }
                        }
                        catch (profileError) {
                            logger_1.logger.warn('Failed to fetch faculty profile separately:', profileError?.message);
                        }
                    }
                    // Fetch enrollments separately for students
                    if (user.role === 'student' && models_1.default.Enrollment) {
                        try {
                            const enrollments = await models_1.default.Enrollment.findAll({
                                where: { studentId: user.id },
                                include: models_1.default.Batch ? [
                                    {
                                        model: models_1.default.Batch,
                                        as: 'batch',
                                        attributes: ['id', 'title', 'software', 'mode', 'status', 'schedule'],
                                        required: false,
                                    },
                                ] : undefined,
                                limit: 50, // Limit to prevent huge queries
                            });
                            if (enrollments && enrollments.length > 0) {
                                user.enrollments = enrollments;
                            }
                        }
                        catch (enrollmentError) {
                            logger_1.logger.warn('Failed to fetch enrollments separately:', enrollmentError?.message);
                        }
                    }
                }
            }
            catch (fallbackError) {
                logger_1.logger.error('Fallback query also failed:', fallbackError);
                throw new Error(`Failed to fetch user: ${fallbackError.message}`);
            }
        }
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        // Parse JSON fields for profiles if included
        const userJson = user.toJSON ? user.toJSON() : user;
        // Parse faculty profile JSON fields
        if (userJson.facultyProfile) {
            const profile = userJson.facultyProfile;
            // Parse documents if it's a string (MySQL JSON fields sometimes come as strings)
            if (profile.documents && typeof profile.documents === 'string') {
                try {
                    profile.documents = JSON.parse(profile.documents);
                }
                catch (e) {
                    logger_1.logger.warn(`Failed to parse documents JSON for faculty ${userJson.id}:`, e);
                    profile.documents = null;
                }
            }
            // Parse expertise if it's a string
            if (profile.expertise && typeof profile.expertise === 'string') {
                try {
                    profile.expertise = JSON.parse(profile.expertise);
                }
                catch (e) {
                    logger_1.logger.warn(`Failed to parse expertise JSON for faculty ${userJson.id}:`, e);
                    // Keep as string if parsing fails
                }
            }
            // Parse availability if it's a string
            if (profile.availability && typeof profile.availability === 'string') {
                try {
                    profile.availability = JSON.parse(profile.availability);
                }
                catch (e) {
                    logger_1.logger.warn(`Failed to parse availability JSON for faculty ${userJson.id}:`, e);
                    // Keep as string if parsing fails
                }
            }
            userJson.facultyProfile = profile;
        }
        // Parse employee profile JSON fields
        if (userJson.employeeProfile) {
            const profile = userJson.employeeProfile;
            // Parse documents if it's a string (MySQL JSON fields sometimes come as strings)
            if (profile.documents && typeof profile.documents === 'string') {
                try {
                    profile.documents = JSON.parse(profile.documents);
                }
                catch (e) {
                    logger_1.logger.warn(`Failed to parse documents JSON for employee ${userJson.id}:`, e);
                    profile.documents = null;
                }
            }
            userJson.employeeProfile = profile;
        }
        res.status(200).json({
            status: 'success',
            data: {
                user: userJson,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get user by ID error:', error);
        logger_1.logger.error('Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
        });
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching user',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
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
        try {
            if (models_1.default.StudentProfile) {
                includeOptions.push({
                    model: models_1.default.StudentProfile,
                    as: 'studentProfile',
                    required: false,
                    attributes: { exclude: ['serialNo'] } // Exclude serialNo column
                });
            }
        }
        catch (e) {
            // StudentProfile not available
        }
        try {
            if (models_1.default.FacultyProfile) {
                includeOptions.push({ model: models_1.default.FacultyProfile, as: 'facultyProfile', required: false });
            }
        }
        catch (e) {
            // FacultyProfile not available
        }
        try {
            if (models_1.default.EmployeeProfile) {
                includeOptions.push({ model: models_1.default.EmployeeProfile, as: 'employeeProfile', required: false });
            }
        }
        catch (e) {
            // EmployeeProfile not available
        }
        let updatedUser;
        try {
            updatedUser = await models_1.default.User.findByPk(userId, {
                attributes: { exclude: ['passwordHash'] },
                include: includeOptions.length > 0 ? includeOptions : undefined,
            });
        }
        catch (queryError) {
            logger_1.logger.error('Error fetching updated user with relations:', queryError);
            // Fallback: fetch without relations
            updatedUser = await models_1.default.User.findByPk(userId, {
                attributes: { exclude: ['passwordHash'] },
            });
        }
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
        logger_1.logger.error('Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
            code: error?.parent?.code,
            sql: error?.parent?.sql,
        });
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
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
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
        let studentProfile = await models_1.default.StudentProfile.findOne({
            where: { userId },
            attributes: { exclude: ['serialNo'] } // Exclude serialNo column
        });
        if (!studentProfile) {
            const profileData = { userId };
            studentProfile = await models_1.default.StudentProfile.create(profileData);
        }
        if (req.body.dob !== undefined) {
            if (req.body.dob) {
                const dobDate = new Date(req.body.dob);
                if (isNaN(dobDate.getTime())) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Invalid date of birth format',
                    });
                    return;
                }
                if (dobDate > new Date()) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Date of birth cannot be in the future',
                    });
                    return;
                }
                // Check if age is at least 18
                const today = new Date();
                let age = today.getFullYear() - dobDate.getFullYear();
                const monthDiff = today.getMonth() - dobDate.getMonth();
                const dayDiff = today.getDate() - dobDate.getDate();
                if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                    age--;
                }
                if (age < 18) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Student must be at least 18 years old',
                    });
                    return;
                }
            }
            studentProfile.dob = req.body.dob ? new Date(req.body.dob) : null;
        }
        if (req.body.address !== undefined)
            studentProfile.address = req.body.address;
        if (req.body.photoUrl !== undefined)
            studentProfile.photoUrl = req.body.photoUrl;
        if (req.body.softwareList !== undefined) {
            // Handle softwareList - ensure it's an array or null
            if (req.body.softwareList === null || req.body.softwareList === '') {
                studentProfile.softwareList = null;
            }
            else if (Array.isArray(req.body.softwareList)) {
                // Filter out empty strings and trim
                const filtered = req.body.softwareList
                    .map((s) => typeof s === 'string' ? s.trim() : String(s).trim())
                    .filter((s) => s.length > 0);
                studentProfile.softwareList = filtered.length > 0 ? filtered : null;
            }
            else if (typeof req.body.softwareList === 'string') {
                // Handle comma-separated string
                const softwareArray = req.body.softwareList
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
                studentProfile.softwareList = softwareArray.length > 0 ? softwareArray : null;
            }
            else {
                studentProfile.softwareList = null;
            }
        }
        if (req.body.enrollmentDate !== undefined)
            studentProfile.enrollmentDate = req.body.enrollmentDate ? new Date(req.body.enrollmentDate) : null;
        if (req.body.status !== undefined)
            studentProfile.status = req.body.status;
        if (req.body.documents !== undefined)
            studentProfile.documents = req.body.documents;
        // Save the profile
        await studentProfile.save();
        // Fetch updated user with profile
        const updatedUser = await models_1.default.User.findByPk(userId, {
            attributes: { exclude: ['passwordHash'] },
            include: models_1.default.StudentProfile ? [
                {
                    model: models_1.default.StudentProfile,
                    as: 'studentProfile',
                    required: false,
                    attributes: { exclude: ['serialNo'] }, // Exclude serialNo column
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
        logger_1.logger.error('Error details:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
            userId: req.params.id,
            body: req.body ? {
                hasDob: !!req.body.dob,
                hasAddress: !!req.body.address,
                hasPhotoUrl: !!req.body.photoUrl,
                hasSoftwareList: !!req.body.softwareList,
                hasEnrollmentDate: !!req.body.enrollmentDate,
                hasStatus: !!req.body.status,
                hasDocuments: !!req.body.documents,
                documentsType: req.body.documents ? typeof req.body.documents : 'undefined',
                softwareListType: req.body.softwareList ? typeof req.body.softwareList : 'undefined',
            } : 'No body',
        });
        // Check for specific error types
        if (error?.name === 'SequelizeValidationError') {
            const validationErrors = error.errors?.map((e) => `${e.path}: ${e.message}`).join(', ') || 'Validation error';
            res.status(400).json({
                status: 'error',
                message: `Validation error: ${validationErrors}`,
                errors: error.errors,
            });
            return;
        }
        if (error?.name === 'SequelizeDatabaseError') {
            res.status(400).json({
                status: 'error',
                message: `Database error: ${error?.parent?.sqlMessage || error.message}`,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
            return;
        }
        if (error?.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors?.[0]?.path || 'field';
            res.status(400).json({
                status: 'error',
                message: `A profile with this ${field} already exists`,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
            return;
        }
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating student profile',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        });
    }
};
exports.updateStudentProfile = updateStudentProfile;
// PUT /api/users/:id/faculty-profile - Update faculty profile
const updateFacultyProfile = async (req, res) => {
    try {
        // Log incoming request for debugging
        logger_1.logger.info('Faculty profile update request received:', {
            userId: req.params.id,
            bodyKeys: req.body ? Object.keys(req.body) : [],
            hasDocuments: !!req.body?.documents,
            hasExpertise: !!req.body?.expertise,
            hasAvailability: !!req.body?.availability,
            hasSoftwareProficiency: !!req.body?.softwareProficiency,
            documentsType: req.body?.documents ? typeof req.body.documents : 'undefined',
        });
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
        if (user.role !== User_1.UserRole.FACULTY) {
            res.status(400).json({
                status: 'error',
                message: 'User is not a faculty member',
            });
            return;
        }
        // Check if FacultyProfile model exists
        if (!models_1.default.FacultyProfile) {
            res.status(400).json({
                status: 'error',
                message: 'FacultyProfile model is not available',
            });
            return;
        }
        // Get or create faculty profile
        let facultyProfile = await models_1.default.FacultyProfile.findOne({ where: { userId } });
        if (!facultyProfile) {
            try {
                logger_1.logger.info('Creating new faculty profile for user:', userId);
                facultyProfile = await models_1.default.FacultyProfile.create({ userId });
                logger_1.logger.info('Faculty profile created:', { profileId: facultyProfile.id, userId });
            }
            catch (createError) {
                // If creation fails (e.g., due to unique constraint), try to find it again
                if (createError?.name === 'SequelizeUniqueConstraintError') {
                    logger_1.logger.warn('Faculty profile already exists, fetching it:', createError);
                    facultyProfile = await models_1.default.FacultyProfile.findOne({ where: { userId } });
                    if (!facultyProfile) {
                        logger_1.logger.error('Failed to create or find faculty profile after unique constraint error');
                        throw new Error('Failed to create or find faculty profile');
                    }
                }
                else {
                    logger_1.logger.error('Error creating faculty profile:', createError);
                    logger_1.logger.error('Create error details:', {
                        message: createError?.message,
                        name: createError?.name,
                        code: createError?.parent?.code,
                        sql: createError?.parent?.sql,
                    });
                    throw createError;
                }
            }
        }
        else {
            logger_1.logger.info('Found existing faculty profile:', { profileId: facultyProfile.id, userId });
        }
        // Track if any fields are being updated
        let hasUpdates = false;
        // Extract dateOfBirth from top level or from documents.personalInfo
        let dateOfBirthValue = req.body.dateOfBirth;
        if (dateOfBirthValue === undefined && req.body.documents?.personalInfo?.dateOfBirth) {
            dateOfBirthValue = req.body.documents.personalInfo.dateOfBirth;
        }
        // Update profile fields
        if (dateOfBirthValue !== undefined) {
            hasUpdates = true;
            if (dateOfBirthValue) {
                // Handle both string and Date formats
                let dobDate;
                if (typeof dateOfBirthValue === 'string') {
                    // If it's already in YYYY-MM-DD format, use it directly
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirthValue)) {
                        dobDate = new Date(dateOfBirthValue + 'T00:00:00'); // Add time to avoid timezone issues
                    }
                    else {
                        dobDate = new Date(dateOfBirthValue);
                    }
                }
                else {
                    dobDate = new Date(dateOfBirthValue);
                }
                if (isNaN(dobDate.getTime())) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Invalid date of birth format',
                    });
                    return;
                }
                if (dobDate > new Date()) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Date of birth cannot be in the future',
                    });
                    return;
                }
                // Check if age is at least 18
                const today = new Date();
                let age = today.getFullYear() - dobDate.getFullYear();
                const monthDiff = today.getMonth() - dobDate.getMonth();
                const dayDiff = today.getDate() - dobDate.getDate();
                if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                    age--;
                }
                if (age < 18) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Faculty must be at least 18 years old',
                    });
                    return;
                }
                // Set dateOfBirth - Sequelize DATEONLY accepts Date objects or YYYY-MM-DD strings
                // Format as YYYY-MM-DD string for DATEONLY type to ensure compatibility
                const year = dobDate.getFullYear();
                const month = String(dobDate.getMonth() + 1).padStart(2, '0');
                const day = String(dobDate.getDate()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;
                // Check if dateOfBirth column exists before trying to set it
                try {
                    // Try to set the dateOfBirth field
                    if ('dateOfBirth' in facultyProfile) {
                        facultyProfile.dateOfBirth = formattedDate;
                    }
                    else {
                        logger_1.logger.warn('dateOfBirth column does not exist in faculty_profiles table. Migration may not have been run.');
                        // Don't fail, just log a warning
                    }
                }
                catch (error) {
                    logger_1.logger.error('Error setting dateOfBirth:', error);
                    // If column doesn't exist, log but don't fail the entire update
                    if (error.message && error.message.includes('dateOfBirth')) {
                        logger_1.logger.warn('dateOfBirth column may not exist. Please run migration: 20251223000000-add-dateOfBirth-to-faculty-profiles');
                    }
                    else {
                        throw error; // Re-throw if it's a different error
                    }
                }
                // Also ensure dateOfBirth is stored in documents.personalInfo for frontend compatibility
                if (facultyProfile.documents && typeof facultyProfile.documents === 'object') {
                    if (!facultyProfile.documents.personalInfo) {
                        facultyProfile.documents.personalInfo = {};
                    }
                    facultyProfile.documents.personalInfo.dateOfBirth = formattedDate;
                }
                else if (!facultyProfile.documents) {
                    // If documents doesn't exist, create it with personalInfo
                    facultyProfile.documents = {
                        personalInfo: {
                            dateOfBirth: formattedDate,
                        },
                    };
                }
            }
            else {
                // Set to null if explicitly provided as empty
                if ('dateOfBirth' in facultyProfile) {
                    facultyProfile.dateOfBirth = null;
                }
                // Also remove from documents.personalInfo
                if (facultyProfile.documents && typeof facultyProfile.documents === 'object' && facultyProfile.documents.personalInfo) {
                    facultyProfile.documents.personalInfo.dateOfBirth = null;
                }
            }
        }
        if (req.body.expertise !== undefined) {
            hasUpdates = true;
            // Handle both string and object formats
            if (typeof req.body.expertise === 'string') {
                facultyProfile.expertise = { description: req.body.expertise };
            }
            else if (req.body.expertise !== null) {
                facultyProfile.expertise = req.body.expertise;
            }
            else {
                facultyProfile.expertise = null;
            }
        }
        if (req.body.availability !== undefined) {
            hasUpdates = true;
            // Handle both string and object formats
            if (typeof req.body.availability === 'string') {
                facultyProfile.availability = { schedule: req.body.availability };
            }
            else if (req.body.availability !== null) {
                facultyProfile.availability = req.body.availability;
            }
            else {
                facultyProfile.availability = null;
            }
        }
        // Handle documents field - ensure it's a valid object
        if (req.body.documents !== undefined) {
            hasUpdates = true;
            try {
                let documentsData = req.body.documents;
                // If documents is a string, try to parse it
                if (typeof documentsData === 'string') {
                    try {
                        documentsData = JSON.parse(documentsData);
                    }
                    catch (parseError) {
                        logger_1.logger.warn('Failed to parse documents string:', parseError);
                        documentsData = {};
                    }
                }
                // Ensure documents is an object or null
                if (documentsData === null) {
                    facultyProfile.documents = null;
                }
                else if (typeof documentsData === 'object' && !Array.isArray(documentsData)) {
                    // Deep clone to avoid circular references and ensure it's serializable
                    try {
                        // Use JSON parse/stringify to ensure clean serializable object
                        // This removes any circular references, functions, undefined values, etc.
                        const serialized = JSON.parse(JSON.stringify(documentsData, (_key, value) => {
                            // Remove undefined values
                            if (value === undefined) {
                                return null;
                            }
                            // Remove functions
                            if (typeof value === 'function') {
                                return null;
                            }
                            // Handle Date objects
                            if (value instanceof Date) {
                                return value.toISOString();
                            }
                            return value;
                        }));
                        facultyProfile.documents = serialized;
                    }
                    catch (serializeError) {
                        logger_1.logger.error('Error serializing documents:', serializeError);
                        logger_1.logger.error('Serialize error message:', serializeError?.message);
                        // If serialization fails, try to clean the object manually
                        const cleaned = {};
                        try {
                            for (const key in documentsData) {
                                if (documentsData.hasOwnProperty(key)) {
                                    try {
                                        const value = documentsData[key];
                                        // Only include serializable values
                                        if (value !== undefined && typeof value !== 'function') {
                                            if (value instanceof Date) {
                                                cleaned[key] = value.toISOString();
                                            }
                                            else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                                                // Recursively clean nested objects
                                                try {
                                                    cleaned[key] = JSON.parse(JSON.stringify(value));
                                                }
                                                catch (e) {
                                                    logger_1.logger.warn(`Skipping non-serializable nested object: ${key}`);
                                                }
                                            }
                                            else {
                                                cleaned[key] = value;
                                            }
                                        }
                                    }
                                    catch (e) {
                                        logger_1.logger.warn(`Skipping non-serializable key: ${key}`);
                                    }
                                }
                            }
                            facultyProfile.documents = cleaned;
                        }
                        catch (cleanError) {
                            logger_1.logger.error('Error cleaning documents:', cleanError);
                            // If cleaning also fails, keep existing documents or use empty object
                            if (!facultyProfile.documents) {
                                facultyProfile.documents = {};
                            }
                        }
                    }
                }
                else {
                    logger_1.logger.warn('Invalid documents format, using empty object');
                    facultyProfile.documents = {};
                }
            }
            catch (docError) {
                logger_1.logger.error('Error processing documents field:', docError);
                logger_1.logger.error('Error message:', docError?.message);
                logger_1.logger.error('Error stack:', docError?.stack);
                // Keep existing documents if there's an error
                if (!facultyProfile.documents) {
                    facultyProfile.documents = {};
                }
            }
        }
        // Handle softwareProficiency if sent separately (though it should be in documents)
        if (req.body.softwareProficiency !== undefined && req.body.documents === undefined) {
            hasUpdates = true;
            // If documents not provided, merge softwareProficiency into existing documents
            const existingDocuments = facultyProfile.documents || {};
            try {
                // Ensure we can serialize the merged documents
                const merged = {
                    ...(typeof existingDocuments === 'object' && existingDocuments !== null ? existingDocuments : {}),
                    softwareProficiency: req.body.softwareProficiency,
                };
                // Validate it can be serialized
                JSON.stringify(merged);
                facultyProfile.documents = merged;
            }
            catch (mergeError) {
                logger_1.logger.error('Error merging softwareProficiency into documents:', mergeError);
                // If merge fails, just set softwareProficiency directly
                facultyProfile.documents = {
                    softwareProficiency: req.body.softwareProficiency,
                };
            }
        }
        // Ensure documents is valid JSON before saving
        if (facultyProfile.documents !== null && facultyProfile.documents !== undefined) {
            try {
                // Validate that documents can be serialized to JSON
                JSON.stringify(facultyProfile.documents);
            }
            catch (jsonError) {
                logger_1.logger.error('Documents field is not JSON serializable, resetting to empty object:', jsonError);
                facultyProfile.documents = {};
            }
        }
        // Check if we have any updates to save
        if (!hasUpdates) {
            logger_1.logger.warn('No fields to update in faculty profile');
            // Still return success but fetch the current profile
            const currentUser = await models_1.default.User.findByPk(userId, {
                attributes: { exclude: ['passwordHash'] },
                include: models_1.default.FacultyProfile ? [
                    {
                        model: models_1.default.FacultyProfile,
                        as: 'facultyProfile',
                        required: false,
                    },
                ] : undefined,
            });
            res.status(200).json({
                status: 'success',
                message: 'No changes to update',
                data: {
                    user: currentUser,
                },
            });
            return;
        }
        // Log what we're about to save for debugging
        logger_1.logger.info('Saving faculty profile:', {
            userId,
            profileId: facultyProfile.id,
            hasExpertise: !!facultyProfile.expertise,
            hasAvailability: !!facultyProfile.availability,
            hasDocuments: !!facultyProfile.documents,
            hasDateOfBirth: !!facultyProfile.dateOfBirth,
            documentsKeys: facultyProfile.documents ? Object.keys(facultyProfile.documents) : [],
            expertiseType: facultyProfile.expertise ? typeof facultyProfile.expertise : 'null',
            availabilityType: facultyProfile.availability ? typeof facultyProfile.availability : 'null',
        });
        // Log the actual values before save (truncated for large objects)
        try {
            const logData = {
                userId,
                profileId: facultyProfile.id,
                dateOfBirth: facultyProfile.dateOfBirth,
                expertise: facultyProfile.expertise ? (typeof facultyProfile.expertise === 'string' ? facultyProfile.expertise.substring(0, 100) : JSON.stringify(facultyProfile.expertise).substring(0, 100)) : null,
                availability: facultyProfile.availability ? (typeof facultyProfile.availability === 'string' ? facultyProfile.availability.substring(0, 100) : JSON.stringify(facultyProfile.availability).substring(0, 100)) : null,
                documentsSize: facultyProfile.documents ? JSON.stringify(facultyProfile.documents).length : 0,
            };
            logger_1.logger.info('Faculty profile data before save:', logData);
        }
        catch (logError) {
            logger_1.logger.warn('Error logging profile data:', logError);
        }
        try {
            const savedProfile = await facultyProfile.save();
            logger_1.logger.info('Faculty profile saved successfully:', {
                userId,
                profileId: savedProfile.id,
                updatedAt: savedProfile.updatedAt,
            });
        }
        catch (saveError) {
            logger_1.logger.error('Error saving faculty profile:', saveError);
            logger_1.logger.error('Save error details:', {
                message: saveError?.message,
                name: saveError?.name,
                code: saveError?.parent?.code,
                sql: saveError?.parent?.sql,
                sqlState: saveError?.parent?.sqlState,
                sqlMessage: saveError?.parent?.sqlMessage,
                errors: saveError?.errors,
            });
            // Check if error is due to missing dateOfBirth column
            const errorMessage = (saveError?.parent?.sqlMessage || saveError?.message || '').toLowerCase();
            const isDateOfBirthError = (errorMessage.includes("dateofbirth") || errorMessage.includes("date_of_birth")) &&
                errorMessage.includes("unknown column");
            // Check if error is due to missing documents column
            const isDocumentsError = (errorMessage.includes("documents") || errorMessage.includes("`documents`")) &&
                errorMessage.includes("unknown column");
            if (isDocumentsError && facultyProfile.documents !== undefined) {
                logger_1.logger.warn('documents column does not exist in database. Removing from update and retrying...');
                // Get all changed fields except documents
                const changedFields = facultyProfile.changed() || [];
                const fieldsToSave = changedFields.filter((field) => field !== 'documents');
                // Remove documents from the model instance
                delete facultyProfile.documents;
                // Also remove it from changed fields tracking
                if (facultyProfile.changed('documents')) {
                    facultyProfile.setDataValue('documents', undefined);
                }
                try {
                    // Retry save without documents - use fields option to only save changed fields (excluding documents)
                    const defaultFields = ['expertise', 'availability', 'dateOfBirth', 'updatedAt'];
                    const fieldsToUpdate = fieldsToSave.length > 0 ? fieldsToSave : defaultFields;
                    const savedProfile = await facultyProfile.save({ fields: fieldsToUpdate });
                    logger_1.logger.info('Faculty profile saved successfully after removing documents:', {
                        userId,
                        profileId: savedProfile.id,
                        updatedAt: savedProfile.updatedAt,
                    });
                    logger_1.logger.warn('Please run migration: 20251222000000-add-documents-to-faculty-profiles to add the documents column');
                    // Continue with the rest of the function - don't return or throw
                }
                catch (retryError) {
                    logger_1.logger.error('Error saving faculty profile after retry:', retryError);
                    // If retry also fails, handle it as a regular database error
                    if (retryError?.name === 'SequelizeDatabaseError') {
                        res.status(400).json({
                            status: 'error',
                            message: `Database error: ${retryError?.parent?.sqlMessage || retryError.message}. Please run migration: 20251222000000-add-documents-to-faculty-profiles`,
                            error: process.env.NODE_ENV === 'development' ? retryError.message : undefined,
                        });
                        return;
                    }
                    throw retryError;
                }
            }
            else if (isDateOfBirthError && facultyProfile.dateOfBirth !== undefined) {
                logger_1.logger.warn('dateOfBirth column does not exist in database. Removing from update and retrying...');
                // Get all changed fields except dateOfBirth
                const changedFields = facultyProfile.changed() || [];
                const fieldsToSave = changedFields.filter((field) => field !== 'dateOfBirth');
                // Remove dateOfBirth from the model instance
                delete facultyProfile.dateOfBirth;
                // Also remove it from changed fields tracking
                if (facultyProfile.changed('dateOfBirth')) {
                    facultyProfile.setDataValue('dateOfBirth', undefined);
                }
                try {
                    // Retry save without dateOfBirth - use fields option to only save changed fields (excluding dateOfBirth)
                    const defaultFields = ['expertise', 'availability', 'documents', 'updatedAt'];
                    const fieldsToUpdate = fieldsToSave.length > 0 ? fieldsToSave : defaultFields;
                    const savedProfile = await facultyProfile.save({ fields: fieldsToUpdate });
                    logger_1.logger.info('Faculty profile saved successfully after removing dateOfBirth:', {
                        userId,
                        profileId: savedProfile.id,
                        updatedAt: savedProfile.updatedAt,
                    });
                    logger_1.logger.warn('Please run migration: 20251223000000-add-dateOfBirth-to-faculty-profiles to add the dateOfBirth column');
                    // Continue with the rest of the function - don't return or throw
                }
                catch (retryError) {
                    logger_1.logger.error('Error saving faculty profile after retry:', retryError);
                    // If retry also fails, handle it as a regular database error
                    if (retryError?.name === 'SequelizeDatabaseError') {
                        res.status(400).json({
                            status: 'error',
                            message: `Database error: ${retryError?.parent?.sqlMessage || retryError.message}`,
                            error: process.env.NODE_ENV === 'development' ? retryError.message : undefined,
                        });
                        return;
                    }
                    throw retryError;
                }
            }
            else {
                // Provide more specific error messages
                if (saveError?.name === 'SequelizeValidationError') {
                    const validationErrors = saveError.errors?.map((e) => e.message).join(', ') || 'Validation error';
                    res.status(400).json({
                        status: 'error',
                        message: `Validation error: ${validationErrors}`,
                        errors: saveError.errors,
                    });
                    return;
                }
                if (saveError?.name === 'SequelizeDatabaseError') {
                    res.status(400).json({
                        status: 'error',
                        message: `Database error: ${saveError?.parent?.sqlMessage || saveError.message}`,
                        error: process.env.NODE_ENV === 'development' ? saveError.message : undefined,
                    });
                    return;
                }
                throw saveError;
            }
        }
        // Reload the profile to ensure we have the latest data
        try {
            await facultyProfile.reload();
            logger_1.logger.info('Faculty profile reloaded after save:', {
                profileId: facultyProfile.id,
                hasDocuments: !!facultyProfile.documents,
                documentsKeys: facultyProfile.documents ? Object.keys(facultyProfile.documents) : [],
            });
        }
        catch (reloadError) {
            logger_1.logger.warn('Error reloading faculty profile:', reloadError);
            // Continue anyway, we'll fetch it with the user
        }
        // Fetch updated user with profile
        let updatedUser;
        try {
            updatedUser = await models_1.default.User.findByPk(userId, {
                attributes: { exclude: ['passwordHash'] },
                include: models_1.default.FacultyProfile ? [
                    {
                        model: models_1.default.FacultyProfile,
                        as: 'facultyProfile',
                        required: false,
                    },
                ] : undefined,
            });
            if (updatedUser) {
                logger_1.logger.info('Updated user fetched:', {
                    userId: updatedUser.id,
                    hasFacultyProfile: !!updatedUser.facultyProfile,
                    profileId: updatedUser.facultyProfile?.id,
                });
            }
        }
        catch (queryError) {
            logger_1.logger.error('Error fetching updated user with profile:', queryError);
            // Fallback: fetch without profile
            updatedUser = await models_1.default.User.findByPk(userId, {
                attributes: { exclude: ['passwordHash'] },
            });
        }
        if (!updatedUser) {
            logger_1.logger.error('Failed to fetch updated user after save');
            res.status(500).json({
                status: 'error',
                message: 'Profile updated but failed to fetch updated user data',
            });
            return;
        }
        // Ensure the profile is included in the response
        if (!updatedUser.facultyProfile && facultyProfile) {
            // Manually attach the profile if it wasn't included
            updatedUser.facultyProfile = facultyProfile;
        }
        logger_1.logger.info('Sending success response for faculty profile update');
        res.status(200).json({
            status: 'success',
            message: 'Faculty profile updated successfully',
            data: {
                user: updatedUser,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Update faculty profile error:', error);
        logger_1.logger.error('Error details:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
            userId: req.params.id,
            body: req.body ? {
                hasDateOfBirth: !!req.body.dateOfBirth,
                hasExpertise: !!req.body.expertise,
                hasAvailability: !!req.body.availability,
                hasDocuments: !!req.body.documents,
                documentsType: req.body.documents ? typeof req.body.documents : 'undefined',
                documentsKeys: req.body.documents && typeof req.body.documents === 'object' ? Object.keys(req.body.documents) : [],
            } : 'No body',
        });
        // Check for specific error types
        if (error?.name === 'SequelizeValidationError') {
            const validationErrors = error.errors?.map((e) => `${e.path}: ${e.message}`).join(', ') || 'Validation error';
            res.status(400).json({
                status: 'error',
                message: `Validation error: ${validationErrors}`,
                errors: error.errors,
            });
            return;
        }
        if (error?.name === 'SequelizeDatabaseError') {
            res.status(400).json({
                status: 'error',
                message: `Database error: ${error?.parent?.sqlMessage || error.message}`,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
            return;
        }
        if (error?.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({
                status: 'error',
                message: 'A profile with this information already exists',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
            return;
        }
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating faculty profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};
exports.updateFacultyProfile = updateFacultyProfile;
// PUT /api/users/:id/employee-profile - Update employee profile
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
        // Get or create employee profile
        let employeeProfile = await models_1.default.EmployeeProfile.findOne({ where: { userId } });
        if (!employeeProfile) {
            const generatedEmployeeId = (req.body.employeeId ? String(req.body.employeeId) : `EMP-${userId}-${Date.now()}`);
            employeeProfile = await models_1.default.EmployeeProfile.create({
                userId,
                employeeId: generatedEmployeeId,
            });
        }
        // Update profile fields
        if (req.body.employeeId !== undefined)
            employeeProfile.employeeId = req.body.employeeId;
        if (req.body.gender !== undefined)
            employeeProfile.gender = req.body.gender;
        if (req.body.dateOfBirth !== undefined) {
            if (req.body.dateOfBirth) {
                const dobDate = new Date(req.body.dateOfBirth);
                if (isNaN(dobDate.getTime())) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Invalid date of birth format',
                    });
                    return;
                }
                if (dobDate > new Date()) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Date of birth cannot be in the future',
                    });
                    return;
                }
                // Check if age is at least 18
                const today = new Date();
                let age = today.getFullYear() - dobDate.getFullYear();
                const monthDiff = today.getMonth() - dobDate.getMonth();
                const dayDiff = today.getDate() - dobDate.getDate();
                if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                    age--;
                }
                if (age < 18) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Employee must be at least 18 years old',
                    });
                    return;
                }
            }
            employeeProfile.dateOfBirth = req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null;
        }
        if (req.body.nationality !== undefined)
            employeeProfile.nationality = req.body.nationality;
        if (req.body.maritalStatus !== undefined)
            employeeProfile.maritalStatus = req.body.maritalStatus;
        if (req.body.department !== undefined)
            employeeProfile.department = req.body.department;
        if (req.body.designation !== undefined)
            employeeProfile.designation = req.body.designation;
        if (req.body.dateOfJoining !== undefined)
            employeeProfile.dateOfJoining = req.body.dateOfJoining ? new Date(req.body.dateOfJoining) : null;
        if (req.body.employmentType !== undefined)
            employeeProfile.employmentType = req.body.employmentType;
        if (req.body.reportingManager !== undefined)
            employeeProfile.reportingManager = req.body.reportingManager;
        if (req.body.workLocation !== undefined)
            employeeProfile.workLocation = req.body.workLocation;
        if (req.body.bankName !== undefined)
            employeeProfile.bankName = req.body.bankName;
        if (req.body.accountNumber !== undefined)
            employeeProfile.accountNumber = req.body.accountNumber;
        if (req.body.ifscCode !== undefined)
            employeeProfile.ifscCode = req.body.ifscCode;
        if (req.body.branch !== undefined)
            employeeProfile.branch = req.body.branch;
        if (req.body.panNumber !== undefined)
            employeeProfile.panNumber = req.body.panNumber;
        if (req.body.address !== undefined)
            employeeProfile.address = req.body.address;
        if (req.body.city !== undefined)
            employeeProfile.city = req.body.city;
        if (req.body.state !== undefined)
            employeeProfile.state = req.body.state;
        if (req.body.postalCode !== undefined)
            employeeProfile.postalCode = req.body.postalCode;
        // Handle documents field (e.g., emergencyContact, photo, etc.)
        if (req.body.documents !== undefined) {
            try {
                let documentsData = req.body.documents;
                // If documents is a string, try to parse it
                if (typeof documentsData === 'string') {
                    try {
                        documentsData = JSON.parse(documentsData);
                    }
                    catch (parseError) {
                        logger_1.logger.warn('Failed to parse employee documents string:', parseError);
                        documentsData = {};
                    }
                }
                // Ensure documents is an object or null
                if (documentsData === null || (typeof documentsData === 'object' && !Array.isArray(documentsData))) {
                    try {
                        const serialized = JSON.parse(JSON.stringify(documentsData));
                        employeeProfile.documents = serialized;
                    }
                    catch (serializeError) {
                        logger_1.logger.error('Error serializing employee documents:', serializeError);
                        const cleaned = Object.keys(documentsData).reduce((acc, key) => {
                            try {
                                const value = documentsData[key];
                                if (value !== undefined && typeof value !== 'function') {
                                    acc[key] = value;
                                }
                            }
                            catch {
                                logger_1.logger.warn(`Skipping non-serializable employee documents key: ${key}`);
                            }
                            return acc;
                        }, {});
                        employeeProfile.documents = cleaned;
                    }
                }
                else {
                    logger_1.logger.warn('Invalid employee documents format, using empty object');
                    employeeProfile.documents = {};
                }
            }
            catch (docError) {
                logger_1.logger.error('Error processing employee documents field:', docError);
                logger_1.logger.error('Employee documents data that caused error:', JSON.stringify(req.body.documents, null, 2));
                if (!employeeProfile.documents) {
                    employeeProfile.documents = {};
                }
            }
        }
        await employeeProfile.save();
        // Fetch updated user with profile
        const updatedUser = await models_1.default.User.findByPk(userId, {
            attributes: { exclude: ['passwordHash'] },
            include: models_1.default.EmployeeProfile ? [
                {
                    model: models_1.default.EmployeeProfile,
                    as: 'employeeProfile',
                    required: false,
                },
            ] : undefined,
        });
        res.status(200).json({
            status: 'success',
            message: 'Employee profile updated successfully',
            data: {
                user: updatedUser,
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
// GET /api/users/modules/list - Get list of available modules
const getModulesList = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Module labels mapping
        const moduleLabels = {
            batches: 'Batches',
            students: 'Students',
            faculty: 'Faculty',
            employees: 'Employees',
            sessions: 'Sessions',
            attendance: 'Attendance',
            payments: 'Payments',
            portfolios: 'Portfolios',
            reports: 'Reports',
            approvals: 'Approvals',
            users: 'Users',
            software_completions: 'Software Completions',
            student_leaves: 'Student Leaves',
            batch_extensions: 'Batch Extensions',
            employee_leaves: 'Employee Leaves',
            faculty_leaves: 'Faculty Leaves',
        };
        // Get all modules from RolePermission enum
        const { Module } = await Promise.resolve().then(() => __importStar(require('../models/RolePermission')));
        const modules = Object.values(Module).map((module) => ({
            value: module,
            label: moduleLabels[module] || module.charAt(0).toUpperCase() + module.slice(1).replace(/_/g, ' '),
        }));
        res.status(200).json({
            status: 'success',
            data: {
                modules,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get modules list error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching modules list',
        });
    }
};
exports.getModulesList = getModulesList;
// POST /api/users/:id/reset-password - Reset user password (Admin/SuperAdmin only)
const resetUserPassword = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only Admin or SuperAdmin can reset passwords
        if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can reset user passwords',
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
        const user = await models_1.default.User.findByPk(userId);
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        // Generate a new password if not provided
        let newPassword;
        if (req.body.newPassword) {
            if (req.body.newPassword.length < 6) {
                res.status(400).json({
                    status: 'error',
                    message: 'Password must be at least 6 characters long',
                });
                return;
            }
            newPassword = req.body.newPassword;
        }
        else {
            // Generate a random password
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
            newPassword = '';
            for (let i = 0; i < 12; i++) {
                newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        // Hash the new password
        const saltRounds = 10;
        const passwordHash = await bcrypt_1.default.hash(newPassword, saltRounds);
        // Update user password
        user.passwordHash = passwordHash;
        await user.save();
        logger_1.logger.info(`Password reset for user ${user.id} (${user.email}) by admin ${req.user.userId}`);
        res.status(200).json({
            status: 'success',
            message: 'Password reset successfully',
            data: {
                newPassword: newPassword, // Return the new password so admin can share it with user
                userId: user.id,
                email: user.email,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Reset password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while resetting password',
        });
    }
};
exports.resetUserPassword = resetUserPassword;
//# sourceMappingURL=user.controller.js.map