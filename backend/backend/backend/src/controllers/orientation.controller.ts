import { Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { OrientationLanguage } from '../models/StudentOrientation';
import { logger } from '../utils/logger';

// GET /api/orientation/:studentId - Get orientation status for a student
export const getStudentOrientation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const studentId = Number(req.params.studentId);
    if (Number.isNaN(studentId)) {
      res.status(400).json({ status: 'error', message: 'Invalid student id' });
      return;
    }

    // Check if student exists
    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== 'student') {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    // Students can only view their own orientation, admins can view any
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own orientation status',
      });
      return;
    }

    // Get orientation records for this student
    const orientations = await db.StudentOrientation.findAll({
      where: { studentId },
      order: [['language', 'ASC']],
    });

    // Format response
    const orientationStatus = {
      english: orientations.find((o) => o.language === OrientationLanguage.ENGLISH) || {
        accepted: false,
        acceptedAt: null,
      },
      gujarati: orientations.find((o) => o.language === OrientationLanguage.GUJARATI) || {
        accepted: false,
        acceptedAt: null,
      },
    };

    // Student is eligible if at least one orientation is accepted
    const isEligible = orientationStatus.english.accepted || orientationStatus.gujarati.accepted;

    res.status(200).json({
      status: 'success',
      data: {
        studentId,
        isEligible,
        orientations: {
          english: {
            accepted: orientationStatus.english.accepted,
            acceptedAt: orientationStatus.english.acceptedAt,
          },
          gujarati: {
            accepted: orientationStatus.gujarati.accepted,
            acceptedAt: orientationStatus.gujarati.acceptedAt,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Get student orientation error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get orientation status',
    });
  }
};

// POST /api/orientation/:studentId/accept - Accept orientation for a student
export const acceptOrientation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const studentId = Number(req.params.studentId);
    if (Number.isNaN(studentId)) {
      res.status(400).json({ status: 'error', message: 'Invalid student id' });
      return;
    }

    const { language } = req.body;

    if (!language || !Object.values(OrientationLanguage).includes(language)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid language. Allowed values: ${Object.values(OrientationLanguage).join(', ')}`,
      });
      return;
    }

    // Check if student exists
    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== 'student') {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    // Students can only accept their own orientation, admins can accept for any student
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      res.status(403).json({
        status: 'error',
        message: 'You can only accept your own orientation',
      });
      return;
    }

    // Find or create orientation record
    const [orientation, created] = await db.StudentOrientation.findOrCreate({
      where: {
        studentId,
        language: language as OrientationLanguage,
      },
      defaults: {
        studentId,
        language: language as OrientationLanguage,
        accepted: true,
        acceptedAt: new Date(),
      },
    });

    // If record already exists, update it
    if (!created) {
      orientation.accepted = true;
      orientation.acceptedAt = new Date();
      await orientation.save();
    }

    // Get updated orientation status
    const orientations = await db.StudentOrientation.findAll({
      where: { studentId },
      order: [['language', 'ASC']],
    });

    const orientationStatus = {
      english: orientations.find((o) => o.language === OrientationLanguage.ENGLISH) || {
        accepted: false,
        acceptedAt: null,
      },
      gujarati: orientations.find((o) => o.language === OrientationLanguage.GUJARATI) || {
        accepted: false,
        acceptedAt: null,
      },
    };

    const isEligible = orientationStatus.english.accepted || orientationStatus.gujarati.accepted;

    logger.info(`Orientation accepted: studentId=${studentId}, language=${language}`);

    res.status(200).json({
      status: 'success',
      message: 'Orientation accepted successfully',
      data: {
        studentId,
        isEligible,
        orientations: {
          english: {
            accepted: orientationStatus.english.accepted,
            acceptedAt: orientationStatus.english.acceptedAt,
          },
          gujarati: {
            accepted: orientationStatus.gujarati.accepted,
            acceptedAt: orientationStatus.gujarati.acceptedAt,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Accept orientation error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to accept orientation',
    });
  }
};

// GET /api/orientation/bulk-status - Get orientation status for multiple students (for bulk upload)
export const getBulkOrientationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { studentIds } = req.query;

    if (!studentIds || typeof studentIds !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'studentIds query parameter is required (comma-separated)',
      });
      return;
    }

    const ids = studentIds
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id));

    if (ids.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'No valid student IDs provided',
      });
      return;
    }

    // Get orientation records for all students
    const orientations = await db.StudentOrientation.findAll({
      where: {
        studentId: ids,
      },
      order: [['studentId', 'ASC'], ['language', 'ASC']],
    });

    // Group by student ID
    const statusMap: Record<number, { english: boolean; gujarati: boolean; isEligible: boolean }> = {};

    ids.forEach((id) => {
      statusMap[id] = {
        english: false,
        gujarati: false,
        isEligible: false,
      };
    });

    orientations.forEach((orientation) => {
      if (!statusMap[orientation.studentId]) {
        statusMap[orientation.studentId] = {
          english: false,
          gujarati: false,
          isEligible: false,
        };
      }

      if (orientation.language === OrientationLanguage.ENGLISH) {
        statusMap[orientation.studentId].english = orientation.accepted;
      } else if (orientation.language === OrientationLanguage.GUJARATI) {
        statusMap[orientation.studentId].gujarati = orientation.accepted;
      }

      statusMap[orientation.studentId].isEligible =
        statusMap[orientation.studentId].english || statusMap[orientation.studentId].gujarati;
    });

    res.status(200).json({
      status: 'success',
      data: {
        statusMap,
      },
    });
  } catch (error) {
    logger.error('Get bulk orientation status error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get bulk orientation status',
    });
  }
};

