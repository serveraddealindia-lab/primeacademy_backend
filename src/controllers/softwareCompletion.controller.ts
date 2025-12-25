import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { SoftwareCompletionStatus } from '../models/SoftwareCompletion';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

interface CreateCompletionBody {
  studentId: number;
  batchId: number;
  softwareName: string;
  startDate: string;
  endDate: string;
  facultyId: number;
}

interface UpdateCompletionParams {
  id: string;
}

interface UpdateCompletionBody {
  status?: 'in_progress' | 'completed';
  endDate?: string;
}

// POST /api/software-completions - Create software completion record
export const createCompletion = async (
  req: AuthRequest & { body: CreateCompletionBody },
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

    // Only faculty can create software completion records
    if (req.user.role !== UserRole.FACULTY && req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only faculty can create software completion records',
      });
      return;
    }

    const { studentId, batchId, softwareName, startDate, endDate, facultyId } = req.body;

    // Validation
    if (!studentId || !batchId || !softwareName || !startDate || !endDate || !facultyId) {
      res.status(400).json({
        status: 'error',
        message: 'studentId, batchId, softwareName, startDate, endDate, and facultyId are required',
      });
      return;
    }

    // Verify student exists
    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    // Verify batch exists
    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    // Verify faculty exists
    const faculty = await db.User.findByPk(facultyId);
    if (!faculty || faculty.role !== UserRole.FACULTY) {
      res.status(404).json({
        status: 'error',
        message: 'Faculty not found',
      });
      return;
    }

    // Verify student is enrolled in batch
    const enrollment = await db.Enrollment.findOne({
      where: { studentId, batchId },
    });
    if (!enrollment) {
      res.status(400).json({
        status: 'error',
        message: 'Student is not enrolled in this batch',
      });
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    if (start > end) {
      res.status(400).json({
        status: 'error',
        message: 'Start date must be before or equal to end date',
      });
      return;
    }

    // Check if completion record already exists for this student-batch-software combination
    const existing = await db.SoftwareCompletion.findOne({
      where: {
        studentId,
        batchId,
        softwareName,
      },
    });

    if (existing) {
      res.status(400).json({
        status: 'error',
        message: 'Software completion record already exists for this student, batch, and software combination',
      });
      return;
    }

    // Create completion record
    const completion = await db.SoftwareCompletion.create({
      studentId,
      batchId,
      softwareName,
      startDate: start,
      endDate: end,
      facultyId,
      status: SoftwareCompletionStatus.IN_PROGRESS,
    });

    // Fetch with relations
    const completionWithDetails = await db.SoftwareCompletion.findByPk(completion.id, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software'],
        },
        {
          model: db.User,
          as: 'faculty',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(201).json({
      status: 'success',
      message: 'Software completion record created successfully',
      data: {
        completion: completionWithDetails,
      },
    });
  } catch (error) {
    logger.error('Create completion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating software completion record',
    });
  }
};

// GET /api/software-completions - Get all completion records
export const getCompletions = async (
  req: AuthRequest & { query: { studentId?: string; batchId?: string; facultyId?: string; status?: string } },
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

    const { studentId, batchId, facultyId, status } = req.query;
    const where: any = {};

    // Students can only see their own completions
    if (req.user.role === UserRole.STUDENT) {
      where.studentId = req.user.userId;
    } else if (studentId) {
      where.studentId = parseInt(studentId, 10);
    }

    // Faculty can see their own taught software
    if (req.user.role === UserRole.FACULTY && !facultyId) {
      where.facultyId = req.user.userId;
    } else if (facultyId) {
      where.facultyId = parseInt(facultyId, 10);
    }

    if (batchId) {
      where.batchId = parseInt(batchId, 10);
    }

    if (status) {
      where.status = status;
    }

    const completions = await db.SoftwareCompletion.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software'],
        },
        {
          model: db.User,
          as: 'faculty',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        completions,
        count: completions.length,
      },
    });
  } catch (error) {
    logger.error('Get completions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching software completion records',
    });
  }
};

// PATCH /api/software-completions/:id - Update completion status
export const updateCompletion = async (
  req: AuthRequest & { params: UpdateCompletionParams; body: UpdateCompletionBody },
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

    // Only faculty can update completion records
    if (req.user.role !== UserRole.FACULTY && req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only faculty can update software completion records',
      });
      return;
    }

    const completionId = parseInt(req.params.id, 10);
    const { status, endDate } = req.body;

    if (isNaN(completionId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid completion ID',
      });
      return;
    }

    // Find completion
    const completion = await db.SoftwareCompletion.findByPk(completionId);
    if (!completion) {
      res.status(404).json({
        status: 'error',
        message: 'Software completion record not found',
      });
      return;
    }

    // Check if faculty is the assigned faculty (unless admin/superadmin)
    if (req.user.role === UserRole.FACULTY && completion.facultyId !== req.user.userId) {
      res.status(403).json({
        status: 'error',
        message: 'You can only update software completion records for software you are teaching',
      });
      return;
    }

    // Update fields
    if (status) {
      if (status === 'completed') {
        completion.status = SoftwareCompletionStatus.COMPLETED;
        completion.completedAt = new Date();
      } else if (status === 'in_progress') {
        completion.status = SoftwareCompletionStatus.IN_PROGRESS;
        completion.completedAt = null;
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid date format. Use YYYY-MM-DD',
        });
        return;
      }
      completion.endDate = end;
    }

    await completion.save();

    // Fetch with relations
    const completionWithDetails = await db.SoftwareCompletion.findByPk(completion.id, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software'],
        },
        {
          model: db.User,
          as: 'faculty',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      message: 'Software completion record updated successfully',
      data: {
        completion: completionWithDetails,
      },
    });
  } catch (error) {
    logger.error('Update completion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating software completion record',
    });
  }
};






