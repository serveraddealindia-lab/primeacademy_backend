"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModules = exports.updateUserPermissions = exports.getUserPermissions = void 0;
const User_1 = require("../models/User");
const Permission_1 = require("../models/Permission");
const models_1 = __importDefault(require("../models"));
const logger_1 = require("../utils/logger");
// Get permissions for a user
const getUserPermissions = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const userId = parseInt(req.params.id, 10);
        // Users can view their own permissions, or admins can view any user's permissions
        if (req.user.userId !== userId && req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'You can only view your own permissions',
            });
            return;
        }
        const permissions = await models_1.default.Permission.findAll({
            where: { userId },
            order: [['module', 'ASC']],
        });
        res.status(200).json({
            status: 'success',
            data: {
                permissions,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get user permissions error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching permissions',
        });
    }
};
exports.getUserPermissions = getUserPermissions;
// Update permissions for a user
const updateUserPermissions = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only SuperAdmin and Admin can update permissions
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can update permissions',
            });
            return;
        }
        const userId = parseInt(req.params.id, 10);
        // Check if user exists
        const user = await models_1.default.User.findByPk(userId);
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        // Prevent modifying SuperAdmin permissions
        if (user.role === User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Cannot modify SuperAdmin permissions',
            });
            return;
        }
        const { permissions } = req.body;
        if (!Array.isArray(permissions)) {
            res.status(400).json({
                status: 'error',
                message: 'Permissions must be an array',
            });
            return;
        }
        // Validate modules
        const validModules = Object.values(Permission_1.Module);
        for (const perm of permissions) {
            if (!validModules.includes(perm.module)) {
                res.status(400).json({
                    status: 'error',
                    message: `Invalid module: ${perm.module}. Allowed modules: ${validModules.join(', ')}`,
                });
                return;
            }
        }
        // Update or create permissions
        const updatedPermissions = [];
        for (const perm of permissions) {
            const [permission, created] = await models_1.default.Permission.findOrCreate({
                where: {
                    userId,
                    module: perm.module,
                },
                defaults: {
                    userId,
                    module: perm.module,
                    canView: perm.canView || false,
                    canAdd: perm.canAdd || false,
                    canEdit: perm.canEdit || false,
                    canDelete: perm.canDelete || false,
                },
            });
            if (!created) {
                await permission.update({
                    canView: perm.canView || false,
                    canAdd: perm.canAdd || false,
                    canEdit: perm.canEdit || false,
                    canDelete: perm.canDelete || false,
                });
            }
            updatedPermissions.push(permission);
        }
        res.status(200).json({
            status: 'success',
            message: 'Permissions updated successfully',
            data: {
                permissions: updatedPermissions,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Update user permissions error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating permissions',
        });
    }
};
exports.updateUserPermissions = updateUserPermissions;
// Get all available modules
const getModules = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const modules = Object.values(Permission_1.Module).map((module) => ({
            value: module,
            label: module
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
        }));
        res.status(200).json({
            status: 'success',
            data: {
                modules,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get modules error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching modules',
        });
    }
};
exports.getModules = getModules;
//# sourceMappingURL=permission.controller.js.map