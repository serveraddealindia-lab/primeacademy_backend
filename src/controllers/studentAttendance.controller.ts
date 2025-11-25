import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

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

    const { photo, fingerprint, location } = req.body as {
      photo?: string;
      fingerprint?: string;
      location?: Record<string, unknown>;
    };
    const locationData = (location ?? null) as Record<string, unknown> | null;

    if (existingPunch) {
      // Update existing record
      await existingPunch.update({
        punchInAt: new Date(),
        punchInPhoto: photo || null,
        punchInFingerprint: fingerprint || null,
        punchInLocation: locationData,
      });
    } else {
      // Create new record - using EmployeePunch model (can create StudentPunch model later)
      await db.EmployeePunch.create({
        userId: req.user.userId,
        date: todayString,
        punchInAt: new Date(),
        punchInPhoto: photo || null,
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

    const { photo, fingerprint, location } = req.body as {
      photo?: string;
      fingerprint?: string;
      location?: Record<string, unknown>;
    };
    const locationData = (location ?? null) as Record<string, unknown> | null;
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
      punchOutPhoto: photo || null,
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

export default {
  punchIn,
  punchOut,
  getTodayPunch,
  getStudentPunchHistory,
};

