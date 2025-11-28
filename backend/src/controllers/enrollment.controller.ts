import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import db from '../models';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

interface CreateEnrollmentBody {
  studentId: number;
  batchId: number;
  enrollmentDate?: string;
  status?: string;
  paymentPlan?: Record<string, unknown>;
}

interface UpdateEnrollmentBody {
  status?: string;
  paymentPlan?: Record<string, unknown>;
}

// POST /enrollments → Create enrollment
export const createEnrollment = async (req: AuthRequest & { body: CreateEnrollmentBody }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can create enrollments
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can create enrollments',
      });
      return;
    }

    const { studentId, batchId, enrollmentDate, status, paymentPlan } = req.body;

    // Validation
    if (!studentId || !batchId) {
      res.status(400).json({
        status: 'error',
        message: 'studentId and batchId are required',
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

    if (!student.isActive) {
      res.status(400).json({
        status: 'error',
        message: 'Student account is inactive',
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

    // Check if student is already enrolled in this batch
    const existingEnrollment = await db.Enrollment.findOne({
      where: {
        studentId,
        batchId,
      },
    });

    if (existingEnrollment) {
      res.status(400).json({
        status: 'error',
        message: 'Student is already enrolled in this batch',
      });
      return;
    }

    // Check batch capacity
    const currentEnrollments = await db.Enrollment.count({
      where: { batchId },
    });

    if (batch.maxCapacity && currentEnrollments >= batch.maxCapacity) {
      res.status(400).json({
        status: 'error',
        message: `Batch has reached maximum capacity of ${batch.maxCapacity} students`,
      });
      return;
    }

    // Create enrollment
    const enrollment = await db.Enrollment.create({
      studentId,
      batchId,
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      status: status || 'active',
      paymentPlan: paymentPlan || null,
    });

    // Fetch enrollment with relations
    const enrollmentWithDetails = await db.Enrollment.findByPk(enrollment.id, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode'],
        },
      ],
    });

    logger.info(`Enrollment created: studentId=${studentId}, batchId=${batchId}`);

    res.status(201).json({
      status: 'success',
      message: 'Student enrolled successfully',
      data: enrollmentWithDetails,
    });
  } catch (error) {
    logger.error('Create enrollment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating enrollment',
    });
  }
};

// GET /enrollments → Get all enrollments (with filters)
export const getAllEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { studentId, batchId, status } = req.query;

    const where: any = {};

    if (studentId) {
      where.studentId = parseInt(studentId as string, 10);
    }

    if (batchId) {
      where.batchId = parseInt(batchId as string, 10);
    }

    if (status) {
      where.status = status;
    }

    // If faculty, only show enrollments for batches they're assigned to
    if (req.user.role === UserRole.FACULTY) {
      const facultyAssignments = await db.BatchFacultyAssignment.findAll({
        where: { facultyId: req.user.userId },
        attributes: ['batchId'],
      });
      const assignedBatchIds = facultyAssignments.map((a: any) => a.batchId);
      if (assignedBatchIds.length === 0) {
        res.status(200).json({
          status: 'success',
          data: [],
          count: 0,
        });
        return;
      }
      where.batchId = where.batchId
        ? { [Op.and]: [{ [Op.eq]: where.batchId }, { [Op.in]: assignedBatchIds }] }
        : { [Op.in]: assignedBatchIds };
    }

    const enrollments = await db.Enrollment.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode'],
        },
      ],
      order: [['enrollmentDate', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: enrollments,
      count: enrollments.length,
    });
  } catch (error) {
    logger.error('Get all enrollments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching enrollments',
    });
  }
};

// GET /enrollments/:id → Get single enrollment by ID
export const getEnrollmentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const enrollmentId = parseInt(req.params.id, 10);
    if (isNaN(enrollmentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid enrollment ID',
      });
      return;
    }

    const enrollment = await db.Enrollment.findByPk(enrollmentId, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode'],
        },
      ],
    });

    if (!enrollment) {
      res.status(404).json({
        status: 'error',
        message: 'Enrollment not found',
      });
      return;
    }

    // If faculty, verify they have access to this batch
    if (req.user.role === UserRole.FACULTY) {
      const assignment = await db.BatchFacultyAssignment.findOne({
        where: {
          batchId: enrollment.batchId,
          facultyId: req.user.userId,
        },
      });

      if (!assignment) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have access to this enrollment',
        });
        return;
      }
    }

    res.status(200).json({
      status: 'success',
      data: enrollment,
    });
  } catch (error) {
    logger.error('Get enrollment by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching enrollment',
    });
  }
};

// PUT /enrollments/:id → Update enrollment
export const updateEnrollment = async (req: AuthRequest & { body: UpdateEnrollmentBody }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can update enrollments
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can update enrollments',
      });
      return;
    }

    const enrollmentId = parseInt(req.params.id, 10);
    if (isNaN(enrollmentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid enrollment ID',
      });
      return;
    }

    const enrollment = await db.Enrollment.findByPk(enrollmentId);
    if (!enrollment) {
      res.status(404).json({
        status: 'error',
        message: 'Enrollment not found',
      });
      return;
    }

    const { status, paymentPlan } = req.body;

    // Update enrollment
    await enrollment.update({
      status: status !== undefined ? status : enrollment.status,
      paymentPlan: paymentPlan !== undefined ? paymentPlan : enrollment.paymentPlan,
    });

    // Fetch updated enrollment with relations
    const updatedEnrollment = await db.Enrollment.findByPk(enrollment.id, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode'],
        },
      ],
    });

    logger.info(`Enrollment updated: enrollmentId=${enrollmentId}`);

    res.status(200).json({
      status: 'success',
      message: 'Enrollment updated successfully',
      data: updatedEnrollment,
    });
  } catch (error) {
    logger.error('Update enrollment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating enrollment',
    });
  }
};

// DELETE /enrollments/:id → Delete enrollment
export const deleteEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can delete enrollments
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can delete enrollments',
      });
      return;
    }

    const enrollmentId = parseInt(req.params.id, 10);
    if (isNaN(enrollmentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid enrollment ID',
      });
      return;
    }

    const enrollment = await db.Enrollment.findByPk(enrollmentId);
    if (!enrollment) {
      res.status(404).json({
        status: 'error',
        message: 'Enrollment not found',
      });
      return;
    }

    await enrollment.destroy();

    logger.info(`Enrollment deleted: enrollmentId=${enrollmentId}`);

    res.status(200).json({
      status: 'success',
      message: 'Enrollment deleted successfully',
    });
  } catch (error) {
    logger.error('Delete enrollment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting enrollment',
    });
  }
};

export default {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
};


