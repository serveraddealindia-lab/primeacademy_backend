"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.impersonateUser = exports.getMe = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("../utils/jwt");
const User_1 = require("../models/User");
const models_1 = __importDefault(require("../models"));
const logger_1 = require("../utils/logger");
const register = async (req, res) => {
    try {
        const { name, email, phone, role, password } = req.body;
        if (!name || !email || !role || !password) {
            res.status(400).json({
                status: 'error',
                message: 'Name, email, role, and password are required',
            });
            return;
        }
        if (!Object.values(User_1.UserRole).includes(role)) {
            res.status(400).json({
                status: 'error',
                message: `Invalid role. Allowed roles: ${Object.values(User_1.UserRole).join(', ')}`,
            });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({
                status: 'error',
                message: 'Password must be at least 6 characters long',
            });
            return;
        }
        const existingUser = await models_1.default.User.findOne({ where: { email } });
        if (existingUser) {
            res.status(409).json({
                status: 'error',
                message: 'User with this email already exists',
            });
            return;
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        const user = await models_1.default.User.create({
            name,
            email,
            phone: phone || null,
            role,
            passwordHash,
            isActive: true,
        });
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    avatarUrl: user.avatarUrl,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error during registration',
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                status: 'error',
                message: 'Email and password are required',
            });
            return;
        }
        const user = await models_1.default.User.findOne({ where: { email } });
        if (!user) {
            res.status(401).json({
                status: 'error',
                message: 'Invalid email or password',
            });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({
                status: 'error',
                message: 'User account is inactive',
            });
            return;
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            res.status(401).json({
                status: 'error',
                message: 'Invalid email or password',
            });
            return;
        }
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        res.status(200).json({
            status: 'success',
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    avatarUrl: user.avatarUrl,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error during login',
        });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const user = await models_1.default.User.findByPk(req.user.userId, {
            attributes: { exclude: ['passwordHash'] },
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
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    avatarUrl: user.avatarUrl,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get me error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};
exports.getMe = getMe;
const impersonateUser = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        if (req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only superadmin can impersonate users',
            });
            return;
        }
        const targetUserId = parseInt(req.params.userId, 10);
        if (isNaN(targetUserId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid user ID',
            });
            return;
        }
        const targetUser = await models_1.default.User.findByPk(targetUserId);
        if (!targetUser) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        if (targetUser.role === User_1.UserRole.SUPERADMIN && targetUser.id !== req.user.userId) {
            res.status(403).json({
                status: 'error',
                message: 'Cannot impersonate another superadmin',
            });
            return;
        }
        if (!targetUser.isActive) {
            res.status(400).json({
                status: 'error',
                message: 'Cannot impersonate an inactive user',
            });
            return;
        }
        const originalUserData = await models_1.default.User.findByPk(req.user.userId, {
            attributes: { exclude: ['passwordHash'] },
        });
        if (!originalUserData) {
            res.status(404).json({
                status: 'error',
                message: 'Original user not found',
            });
            return;
        }
        const token = (0, jwt_1.generateToken)({
            userId: targetUser.id,
            email: targetUser.email,
            role: targetUser.role,
        });
        const originalToken = (0, jwt_1.generateToken)({
            userId: originalUserData.id,
            email: originalUserData.email,
            role: originalUserData.role,
        });
        res.status(200).json({
            status: 'success',
            message: 'Impersonation successful',
            data: {
                token,
                user: {
                    id: targetUser.id,
                    name: targetUser.name,
                    email: targetUser.email,
                    phone: targetUser.phone,
                    role: targetUser.role,
                    avatarUrl: targetUser.avatarUrl,
                    isActive: targetUser.isActive,
                    createdAt: targetUser.createdAt,
                },
                originalUser: {
                    id: originalUserData.id,
                    email: originalUserData.email,
                    role: originalUserData.role,
                    name: originalUserData.name,
                    phone: originalUserData.phone,
                    avatarUrl: originalUserData.avatarUrl,
                    isActive: originalUserData.isActive,
                },
                originalToken,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Impersonate user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error during impersonation',
        });
    }
};
exports.impersonateUser = impersonateUser;
//# sourceMappingURL=auth.controller.js.map