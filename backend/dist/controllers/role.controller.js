"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRoles = exports.unassignRoleFromUser = exports.assignRoleToUser = exports.deleteRole = exports.updateRole = exports.getRole = exports.getRoles = exports.createRole = void 0;
const models_1 = __importDefault(require("../models"));
const User_1 = require("../models/User");
const RolePermission_1 = require("../models/RolePermission");
const logger_1 = require("../utils/logger");
// POST /api/roles - Create role
const createRole = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only superadmin can create roles
        if (req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only superadmin can create roles',
            });
            return;
        }
        const { name, description, permissions } = req.body;
        if (!name || name.trim() === '') {
            res.status(400).json({
                status: 'error',
                message: 'Role name is required',
            });
            return;
        }
        // Check if role with same name exists
        const existingRole = await models_1.default.Role.findOne({ where: { name: name.trim() } });
        if (existingRole) {
            res.status(400).json({
                status: 'error',
                message: 'Role with this name already exists',
            });
            return;
        }
        // Create role
        const role = await models_1.default.Role.create({
            name: name.trim(),
            description: description || null,
            isSystem: false,
            isActive: true,
        });
        // Create permissions if provided
        if (permissions && Array.isArray(permissions)) {
            const validModules = Object.values(RolePermission_1.Module);
            for (const perm of permissions) {
                if (!validModules.includes(perm.module)) {
                    continue; // Skip invalid modules
                }
                await models_1.default.RolePermission.create({
                    roleId: role.id,
                    module: perm.module,
                    canView: perm.canView || false,
                    canAdd: perm.canAdd || false,
                    canEdit: perm.canEdit || false,
                    canDelete: perm.canDelete || false,
                });
            }
        }
        // Fetch role with permissions
        const roleWithPermissions = await models_1.default.Role.findByPk(role.id, {
            include: [
                {
                    model: models_1.default.RolePermission,
                    as: 'rolePermissions',
                },
            ],
        });
        res.status(201).json({
            status: 'success',
            message: 'Role created successfully',
            data: {
                role: roleWithPermissions,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Create role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating role',
        });
    }
};
exports.createRole = createRole;
// GET /api/roles - Get all roles
const getRoles = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only superadmin and admin can view roles
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can view roles',
            });
            return;
        }
        const roles = await models_1.default.Role.findAll({
            include: [
                {
                    model: models_1.default.RolePermission,
                    as: 'rolePermissions',
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json({
            status: 'success',
            data: {
                roles,
                count: roles.length,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get roles error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching roles',
        });
    }
};
exports.getRoles = getRoles;
// GET /api/roles/:id - Get single role
const getRole = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only superadmin and admin can view roles
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can view roles',
            });
            return;
        }
        const roleId = parseInt(req.params.id, 10);
        if (isNaN(roleId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid role ID',
            });
            return;
        }
        const role = await models_1.default.Role.findByPk(roleId, {
            include: [
                {
                    model: models_1.default.RolePermission,
                    as: 'rolePermissions',
                },
            ],
        });
        if (!role) {
            res.status(404).json({
                status: 'error',
                message: 'Role not found',
            });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: {
                role,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching role',
        });
    }
};
exports.getRole = getRole;
// PUT /api/roles/:id - Update role
const updateRole = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only superadmin can update roles
        if (req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only superadmin can update roles',
            });
            return;
        }
        const roleId = parseInt(req.params.id, 10);
        if (isNaN(roleId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid role ID',
            });
            return;
        }
        const role = await models_1.default.Role.findByPk(roleId);
        if (!role) {
            res.status(404).json({
                status: 'error',
                message: 'Role not found',
            });
            return;
        }
        // Prevent updating system roles
        if (role.isSystem) {
            res.status(403).json({
                status: 'error',
                message: 'Cannot update system roles',
            });
            return;
        }
        const { name, description, isActive, permissions } = req.body;
        // Update role fields
        if (name !== undefined) {
            if (name.trim() === '') {
                res.status(400).json({
                    status: 'error',
                    message: 'Role name cannot be empty',
                });
                return;
            }
            // Check if another role with same name exists
            const existingRole = await models_1.default.Role.findOne({
                where: { name: name.trim() },
            });
            if (existingRole && existingRole.id !== roleId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Role with this name already exists',
                });
                return;
            }
            role.name = name.trim();
        }
        if (description !== undefined) {
            role.description = description || null;
        }
        if (isActive !== undefined) {
            role.isActive = isActive;
        }
        await role.save();
        // Update permissions if provided
        if (permissions && Array.isArray(permissions)) {
            // Delete existing permissions
            await models_1.default.RolePermission.destroy({ where: { roleId: role.id } });
            // Create new permissions
            const validModules = Object.values(RolePermission_1.Module);
            for (const perm of permissions) {
                if (!validModules.includes(perm.module)) {
                    continue; // Skip invalid modules
                }
                await models_1.default.RolePermission.create({
                    roleId: role.id,
                    module: perm.module,
                    canView: perm.canView || false,
                    canAdd: perm.canAdd || false,
                    canEdit: perm.canEdit || false,
                    canDelete: perm.canDelete || false,
                });
            }
        }
        // Fetch updated role with permissions
        const updatedRole = await models_1.default.Role.findByPk(role.id, {
            include: [
                {
                    model: models_1.default.RolePermission,
                    as: 'rolePermissions',
                },
            ],
        });
        res.status(200).json({
            status: 'success',
            message: 'Role updated successfully',
            data: {
                role: updatedRole,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Update role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while updating role',
        });
    }
};
exports.updateRole = updateRole;
// DELETE /api/roles/:id - Delete role
const deleteRole = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only superadmin can delete roles
        if (req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only superadmin can delete roles',
            });
            return;
        }
        const roleId = parseInt(req.params.id, 10);
        if (isNaN(roleId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid role ID',
            });
            return;
        }
        const role = await models_1.default.Role.findByPk(roleId);
        if (!role) {
            res.status(404).json({
                status: 'error',
                message: 'Role not found',
            });
            return;
        }
        // Prevent deleting system roles
        if (role.isSystem) {
            res.status(403).json({
                status: 'error',
                message: 'Cannot delete system roles',
            });
            return;
        }
        // Check if role is assigned to any users
        const userCount = await models_1.default.UserRole.count({ where: { roleId: role.id } });
        if (userCount > 0) {
            res.status(400).json({
                status: 'error',
                message: `Cannot delete role. It is assigned to ${userCount} user(s). Please unassign the role first.`,
            });
            return;
        }
        await role.destroy();
        res.status(200).json({
            status: 'success',
            message: 'Role deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Delete role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while deleting role',
        });
    }
};
exports.deleteRole = deleteRole;
// POST /api/users/:id/assign-role - Assign role to user
const assignRoleToUser = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only superadmin and admin can assign roles
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can assign roles',
            });
            return;
        }
        const userId = parseInt(req.params.id, 10);
        const { roleId } = req.body;
        if (isNaN(userId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid user ID',
            });
            return;
        }
        if (!roleId || isNaN(roleId)) {
            res.status(400).json({
                status: 'error',
                message: 'Role ID is required',
            });
            return;
        }
        // Check if user exists
        const user = await models_1.default.User.findByPk(userId);
        if (!user) {
            res.status(404).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        // Check if role exists
        const role = await models_1.default.Role.findByPk(roleId);
        if (!role) {
            res.status(404).json({
                status: 'error',
                message: 'Role not found',
            });
            return;
        }
        // Check if role is already assigned
        const existingAssignment = await models_1.default.UserRole.findOne({
            where: { userId, roleId },
        });
        if (existingAssignment) {
            res.status(400).json({
                status: 'error',
                message: 'Role is already assigned to this user',
            });
            return;
        }
        // Assign role
        await models_1.default.UserRole.create({ userId, roleId });
        // Fetch user with roles
        const userWithRoles = await models_1.default.User.findByPk(userId, {
            include: [
                {
                    model: models_1.default.Role,
                    as: 'roles',
                    through: { attributes: [] },
                    include: [
                        {
                            model: models_1.default.RolePermission,
                            as: 'rolePermissions',
                        },
                    ],
                },
            ],
        });
        res.status(200).json({
            status: 'success',
            message: 'Role assigned successfully',
            data: {
                user: userWithRoles,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Assign role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while assigning role',
        });
    }
};
exports.assignRoleToUser = assignRoleToUser;
// DELETE /api/users/:id/roles/:roleId - Unassign role from user
const unassignRoleFromUser = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only superadmin and admin can unassign roles
        if (req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only admins can unassign roles',
            });
            return;
        }
        const userId = parseInt(req.params.id, 10);
        const roleId = parseInt(req.params.roleId, 10);
        if (isNaN(userId) || isNaN(roleId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid user ID or role ID',
            });
            return;
        }
        // Check if assignment exists
        const assignment = await models_1.default.UserRole.findOne({
            where: { userId, roleId },
        });
        if (!assignment) {
            res.status(404).json({
                status: 'error',
                message: 'Role assignment not found',
            });
            return;
        }
        await assignment.destroy();
        res.status(200).json({
            status: 'success',
            message: 'Role unassigned successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Unassign role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while unassigning role',
        });
    }
};
exports.unassignRoleFromUser = unassignRoleFromUser;
// GET /api/users/:id/roles - Get user roles
const getUserRoles = async (req, res) => {
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
        // Users can view their own roles, or admins can view any user's roles
        if (req.user.userId !== userId && req.user.role !== User_1.UserRole.SUPERADMIN && req.user.role !== User_1.UserRole.ADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'You can only view your own roles',
            });
            return;
        }
        const userRoles = await models_1.default.UserRole.findAll({
            where: { userId },
            include: [
                {
                    model: models_1.default.Role,
                    as: 'role',
                    include: [
                        {
                            model: models_1.default.RolePermission,
                            as: 'rolePermissions',
                        },
                    ],
                },
            ],
        });
        res.status(200).json({
            status: 'success',
            data: {
                roles: userRoles.map((ur) => ur.role),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get user roles error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching user roles',
        });
    }
};
exports.getUserRoles = getUserRoles;
//# sourceMappingURL=role.controller.js.map