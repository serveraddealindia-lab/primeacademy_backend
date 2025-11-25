import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';
import { UserRole } from '../models/User';
import db from '../models';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, role, password } = req.body;

    if (!name || !email || !role || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Name, email, role, and password are required',
      });
      return;
    }

    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid role. Allowed roles: ${Object.values(UserRole).join(', ')}`,
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

    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      res.status(409).json({
        status: 'error',
        message: 'User with this email already exists',
      });
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await db.User.create({
      name,
      email,
      phone: phone || null,
      role,
      passwordHash,
      isActive: true,
    });

    const token = generateToken({
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
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration',
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
      return;
    }

    const user = await db.User.findOne({ where: { email } });
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
      return;
    }

    const token = generateToken({
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
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during login',
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const user = await db.User.findByPk(req.user.userId, {
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
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

export const impersonateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.role !== UserRole.SUPERADMIN) {
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

    const targetUser = await db.User.findByPk(targetUserId);
    if (!targetUser) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    if (targetUser.role === UserRole.SUPERADMIN && targetUser.id !== req.user.userId) {
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

    const originalUserData = await db.User.findByPk(req.user.userId, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!originalUserData) {
      res.status(404).json({
        status: 'error',
        message: 'Original user not found',
      });
      return;
    }

    const token = generateToken({
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
    });

    const originalToken = generateToken({
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
  } catch (error) {
    logger.error('Impersonate user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during impersonation',
    });
  }
};


