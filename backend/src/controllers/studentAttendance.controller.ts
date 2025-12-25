import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';
import path from 'path';
import { buildAttendanceRelativePath } from '../middleware/upload.middleware';

const parseLocationPayload = (rawLocation: unknown): Record<string, unknown> | null => {
  if (!rawLocation) {
    return null;
  }

  if (typeof rawLocation === 'string') {
    try {
      // Try to parse as JSON string
      const parsed = JSON.parse(rawLocation);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      // If parsing fails, return null
      return null;
    }
  }

  if (typeof rawLocation === 'object' && rawLocation !== null && !Array.isArray(rawLocation)) {
    return rawLocation as Record<string, unknown>;
  }

  return null;
};

const resolvePhotoPath = (file?: Express.Multer.File, base64Payload?: string): string | null => {
  if (file) {
    return buildAttendanceRelativePath(file.filename);
  }

  if (base64Payload) {
    return base64Payload;
  }

  return null;
};

const getPublicPhotoUrl = (storedPath?: string | null): string | null => {
  if (!storedPath) {
    return null;
  }

  const normalizedPath = storedPath.replace(/\\/g, '/');
  return path.posix.join('/uploads', normalizedPath);
};

// Punch In for Students
export const punchIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Allow all users except students to punch in (faculty, employees, admin, etc.)
    if (req.user.role === UserRole.STUDENT) {
      res.status(403).json({
        status: 'error',
        message: 'Students cannot use this attendance system',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    // Check if already punched in today
    const existingPunch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
    });

    if (existingPunch && existingPunch.punchInAt) {
      res.status(400).json({
        status: 'error',
        message: 'You have already punched in today',
      });
      return;
    }

    const fingerprint = typeof req.body.fingerprint === 'string' ? req.body.fingerprint : undefined;
    const locationData = parseLocationPayload(req.body.location);
    // Handle photo: check req.file first (from Multer), then req.body.photo (base64 string)
    const photoPath = resolvePhotoPath(
      req.file,
      typeof req.body.photo === 'string' && !req.file ? req.body.photo : undefined
    );

    if (existingPunch) {
      // Update existing record
      await existingPunch.update({
        punchInAt: new Date(),
        punchInPhoto: photoPath,
        punchInFingerprint: fingerprint || null,
        punchInLocation: locationData,
      });
    } else {
      // Create new record - using EmployeePunch model (can create StudentPunch model later)
      await db.EmployeePunch.create({
        userId: req.user.userId,
        date: todayString,
        punchInAt: new Date(),
        punchInPhoto: photoPath,
        punchInFingerprint: fingerprint || null,
        punchInLocation: locationData,
        breaks: [] as Record<string, unknown>[],
      });
    }

    const updatedPunch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Punched in successfully',
      data: {
        punch: updatedPunch,
        punchInAt: updatedPunch?.punchInAt,
        location: locationData,
        punchInPhotoUrl: getPublicPhotoUrl(updatedPunch?.punchInPhoto ?? photoPath),
      },
    });
  } catch (error) {
    logger.error('Student punch in error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while punching in',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
};

// Punch Out for Students
export const punchOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Allow all users except students to punch out (faculty, employees, admin, etc.)
    if (req.user.role === UserRole.STUDENT) {
      res.status(403).json({
        status: 'error',
        message: 'Students cannot use this attendance system',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    // Find today's punch record
    const punch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
    });

    if (!punch || !punch.punchInAt) {
      res.status(400).json({
        status: 'error',
        message: 'You must punch in first',
      });
      return;
    }

    if (punch.punchOutAt) {
      res.status(400).json({
        status: 'error',
        message: 'You have already punched out today',
      });
      return;
    }

    const fingerprint = typeof req.body.fingerprint === 'string' ? req.body.fingerprint : undefined;
    const locationData = parseLocationPayload(req.body.location);
    // Handle photo: check req.file first (from Multer), then req.body.photo (base64 string)
    const photoPath = resolvePhotoPath(
      req.file,
      typeof req.body.photo === 'string' && !req.file ? req.body.photo : undefined
    );
    const punchOutTime = new Date();

    // Calculate effective working hours
    const punchInTime = new Date(punch.punchInAt);
    const totalMinutes = (punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60);

    // Subtract break time
    let breaks: Array<{ startTime?: string; endTime?: string }> = [];
    if (punch.breaks) {
      if (Array.isArray(punch.breaks)) {
        breaks = punch.breaks;
      } else if (typeof punch.breaks === 'string') {
        try {
          breaks = JSON.parse(punch.breaks);
          if (!Array.isArray(breaks)) {
            breaks = [breaks];
          }
        } catch {
          breaks = [];
        }
      }
    }

    let breakMinutes = 0;
    breaks.forEach((b) => {
      if (b.startTime && b.endTime) {
        const breakStart = new Date(b.startTime);
        const breakEnd = new Date(b.endTime);
        breakMinutes += (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
      }
    });

    const effectiveMinutes = totalMinutes - breakMinutes;
    const effectiveHours = effectiveMinutes / 60;

    // Update punch out
    await punch.update({
      punchOutAt: punchOutTime,
      punchOutPhoto: photoPath,
      punchOutFingerprint: fingerprint || null,
      punchOutLocation: locationData,
      effectiveWorkingHours: parseFloat(effectiveHours.toFixed(2)),
    });

    res.status(200).json({
      status: 'success',
      message: 'Punched out successfully',
      data: {
        punch,
        punchOutAt: punchOutTime,
        effectiveWorkingHours: parseFloat(effectiveHours.toFixed(2)),
        location: locationData,
        punchOutPhotoUrl: getPublicPhotoUrl(punch?.punchOutPhoto ?? photoPath),
      },
    });
  } catch (error) {
    logger.error('Student punch out error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while punching out',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
};

// Get today's punch status for student
export const getTodayPunch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const punch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      data: {
        punch: punch,
        hasPunchedIn: punch ? !!punch.punchInAt : false,
        hasPunchedOut: punch ? !!punch.punchOutAt : false,
      },
    });
  } catch (error) {
    logger.error('Get today punch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching punch status',
    });
  }
};

// Get student punch history
export const getStudentPunchHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { from, to } = req.query;
    const where: any = {
      userId: req.user.userId,
    };

    if (from || to) {
      const dateCondition: any = {};
      if (from) {
        dateCondition[Op.gte] = from;
      }
      if (to) {
        dateCondition[Op.lte] = to;
      }
      where.date = dateCondition;
    }

    const punches = await db.EmployeePunch.findAll({
      where,
      order: [['date', 'DESC']],
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      data: {
        punches,
      },
    });
  } catch (error) {
    logger.error('Get student punch history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching punch history',
    });
  }
};

// Break In
export const breakIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.role === UserRole.STUDENT) {
      res.status(403).json({
        status: 'error',
        message: 'Students cannot use this attendance system',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const punch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
    });

    if (!punch || !punch.punchInAt) {
      res.status(400).json({
        status: 'error',
        message: 'You must punch in first',
      });
      return;
    }

    if (punch.punchOutAt) {
      res.status(400).json({
        status: 'error',
        message: 'You have already punched out today',
      });
      return;
    }

    // Get existing breaks
    let breaks: Array<{ startTime?: string; endTime?: string; reason?: string }> = [];
    if (punch.breaks) {
      if (Array.isArray(punch.breaks)) {
        breaks = punch.breaks;
      } else if (typeof punch.breaks === 'string') {
        try {
          breaks = JSON.parse(punch.breaks);
          if (!Array.isArray(breaks)) {
            breaks = [breaks];
          }
        } catch {
          breaks = [];
        }
      }
    }

    // Check if there's an active break (break out not done)
    const activeBreak = breaks.find(b => b.startTime && !b.endTime);
    if (activeBreak) {
      res.status(400).json({
        status: 'error',
        message: 'You are already on a break. Please break out first.',
      });
      return;
    }

    // Add new break
    const breakReason = typeof req.body.reason === 'string' ? req.body.reason : undefined;
    breaks.push({
      startTime: new Date().toISOString(),
      endTime: undefined,
      reason: breakReason || undefined,
    });

    await punch.update({
      breaks,
    });

    res.status(200).json({
      status: 'success',
      message: 'Break started successfully',
      data: {
        punch,
        breakStartTime: new Date().toISOString(),
        reason: breakReason,
      },
    });
  } catch (error) {
    logger.error('Break in error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while starting break',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
};

// Break Out
export const breakOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.role === UserRole.STUDENT) {
      res.status(403).json({
        status: 'error',
        message: 'Students cannot use this attendance system',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const punch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user.userId,
        date: todayString,
      },
    });

    if (!punch || !punch.punchInAt) {
      res.status(400).json({
        status: 'error',
        message: 'You must punch in first',
      });
      return;
    }

    if (punch.punchOutAt) {
      res.status(400).json({
        status: 'error',
        message: 'You have already punched out today',
      });
      return;
    }

    // Get existing breaks
    let breaks: Array<{ startTime?: string; endTime?: string; reason?: string }> = [];
    if (punch.breaks) {
      if (Array.isArray(punch.breaks)) {
        breaks = punch.breaks;
      } else if (typeof punch.breaks === 'string') {
        try {
          breaks = JSON.parse(punch.breaks);
          if (!Array.isArray(breaks)) {
            breaks = [breaks];
          }
        } catch {
          breaks = [];
        }
      }
    }

    // Find active break
    const activeBreakIndex = breaks.findIndex(b => b.startTime && !b.endTime);
    if (activeBreakIndex === -1) {
      res.status(400).json({
        status: 'error',
        message: 'No active break found. Please break in first.',
      });
      return;
    }

    // End the break
    breaks[activeBreakIndex].endTime = new Date().toISOString();

    await punch.update({
      breaks,
    });

    // Calculate total break time
    let totalBreakMinutes = 0;
    breaks.forEach((b) => {
      if (b.startTime && b.endTime) {
        const breakStart = new Date(b.startTime);
        const breakEnd = new Date(b.endTime);
        totalBreakMinutes += (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Break ended successfully',
      data: {
        punch,
        breakEndTime: new Date().toISOString(),
        totalBreakMinutes: Math.round(totalBreakMinutes),
        totalBreakHours: parseFloat((totalBreakMinutes / 60).toFixed(2)),
      },
    });
  } catch (error) {
    logger.error('Break out error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while ending break',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
};

export default {
  punchIn,
  punchOut,
  getTodayPunch,
  getStudentPunchHistory,
  breakIn,
  breakOut,
};

