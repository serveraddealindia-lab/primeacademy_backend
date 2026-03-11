import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { UserRole } from '../models/User';
import { Module } from '../models/RolePermission';
import { logger } from '../utils/logger';

interface CreateRoleBody {
  name: string;
  description?: string;
  permissions?: Array<{
    module: Module;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>;
}

interface UpdateRoleBody {
  name?: string;
  description?: string;
  isActive?: boolean;
  permissions?: Array<{
    module: Module;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>;
}

interface AssignRoleBody {
  roleId: number;
}

// POST /api/roles - Create role
export const createRole = async (
  req: AuthRequest & { body: CreateRoleBody },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only superadmin can create roles
    if (req.user.role !== UserRole.SUPERADMIN) {
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
    const existingRole = await db.Role.findOne({ where: { name: name.trim() } });
    if (existingRole) {
      res.status(400).json({
        status: 'error',
        message: 'Role with this name already exists',
      });
      return;
    }

    // Create role
    const role = await db.Role.create({
      name: name.trim(),
      description: description || null,
      isSystem: false,
      isActive: true,
    });

    // Create permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const validModules = Object.values(Module);
      for (const perm of permissions) {
        if (!validModules.includes(perm.module)) {
          continue; // Skip invalid modules
        }
        await db.RolePermission.create({
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
    const roleWithPermissions = await db.Role.findByPk(role.id, {
      include: [
        {
          model: db.RolePermission,
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
  } catch (error) {
    logger.error('Create role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating role',
    });
  }
};

// GET /api/roles - Get all roles
export const getRoles = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only superadmin and admin can view roles
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can view roles',
      });
      return;
    }

    const roles = await db.Role.findAll({
      include: [
        {
          model: db.RolePermission,
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
  } catch (error) {
    logger.error('Get roles error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching roles',
    });
  }
};

// GET /api/roles/:id - Get single role
export const getRole = async (
  req: AuthRequest & { params: { id: string } },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only superadmin and admin can view roles
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
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

    const role = await db.Role.findByPk(roleId, {
      include: [
        {
          model: db.RolePermission,
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
  } catch (error) {
    logger.error('Get role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching role',
    });
  }
};

// PUT /api/roles/:id - Update role
export const updateRole = async (
  req: AuthRequest & { params: { id: string }; body: UpdateRoleBody },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only superadmin can update roles
    if (req.user.role !== UserRole.SUPERADMIN) {
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

    const role = await db.Role.findByPk(roleId);
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
      const existingRole = await db.Role.findOne({
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
      await db.RolePermission.destroy({ where: { roleId: role.id } });

      // Create new permissions
      const validModules = Object.values(Module);
      for (const perm of permissions) {
        if (!validModules.includes(perm.module)) {
          continue; // Skip invalid modules
        }
        await db.RolePermission.create({
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
    const updatedRole = await db.Role.findByPk(role.id, {
      include: [
        {
          model: db.RolePermission,
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
  } catch (error) {
    logger.error('Update role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating role',
    });
  }
};

// DELETE /api/roles/:id - Delete role
export const deleteRole = async (
  req: AuthRequest & { params: { id: string } },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only superadmin can delete roles
    if (req.user.role !== UserRole.SUPERADMIN) {
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

    const role = await db.Role.findByPk(roleId);
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
    const userCount = await db.UserRole.count({ where: { roleId: role.id } });
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
  } catch (error) {
    logger.error('Delete role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting role',
    });
  }
};

// POST /api/users/:id/assign-role - Assign role to user
export const assignRoleToUser = async (
  req: AuthRequest & { params: { id: string }; body: AssignRoleBody },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only superadmin and admin can assign roles
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
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
    const user = await db.User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Check if role exists
    const role = await db.Role.findByPk(roleId);
    if (!role) {
      res.status(404).json({
        status: 'error',
        message: 'Role not found',
      });
      return;
    }

    // Check if role is already assigned
    const existingAssignment = await db.UserRole.findOne({
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
    await db.UserRole.create({ userId, roleId });

    // Fetch user with roles
    const userWithRoles = await db.User.findByPk(userId, {
      include: [
        {
          model: db.Role,
          as: 'roles',
          through: { attributes: [] },
          include: [
            {
              model: db.RolePermission,
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
  } catch (error) {
    logger.error('Assign role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while assigning role',
    });
  }
};

// DELETE /api/users/:id/roles/:roleId - Unassign role from user
export const unassignRoleFromUser = async (
  req: AuthRequest & { params: { id: string; roleId: string } },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only superadmin and admin can unassign roles
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
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
    const assignment = await db.UserRole.findOne({
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
  } catch (error) {
    logger.error('Unassign role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while unassigning role',
    });
  }
};

// GET /api/users/:id/roles - Get user roles
export const getUserRoles = async (
  req: AuthRequest & { params: { id: string } },
  res: Response
): Promise<void> => {
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
    if (req.user.userId !== userId && req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own roles',
      });
      return;
    }

    const userRoles = await db.UserRole.findAll({
      where: { userId },
      include: [
        {
          model: db.Role,
          as: 'role',
          include: [
            {
              model: db.RolePermission,
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
  } catch (error) {
    logger.error('Get user roles error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching user roles',
    });
  }
};










