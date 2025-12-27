import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { UserRole } from '../models/User';
import db from '../models';

// Extend Express Request to include user property
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const verifyTokenMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        message: 'No token provided. Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Token is required',
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);

    // Check if user exists and is active
    const user = await db.User.findByPk(decoded.userId);

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'User not found',
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

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({
        status: 'error',
        message: error.message || 'Invalid token',
      });
    } else {
      res.status(401).json({
        status: 'error',
        message: 'Authentication failed',
      });
    }
  }
};

export const checkRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions. Required roles: ' + allowedRoles.join(', '),
      });
      return;
    }

    next();
  };
};

// Helper middleware that combines verifyToken and checkRole
export const requireAuth = (allowedRoles?: UserRole[]) => {
  return [
    verifyTokenMiddleware,
    ...(allowedRoles ? [checkRole(...allowedRoles)] : []),
  ];
};

