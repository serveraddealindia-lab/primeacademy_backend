import { Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { BatchMode } from '../models/Batch';
import { UserRole } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

// POST /batches → Create batch (admin only)
export const createBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { title, software, mode, startDate, endDate, maxCapacity, schedule, status } = req.body;

    // Validation
    if (!title || !mode || !startDate || !endDate || !maxCapacity) {
      res.status(400).json({
        status: 'error',
        message: 'Title, mode, startDate, endDate, and maxCapacity are required',
      });
      return;
    }

    // Validate mode
    if (!Object.values(BatchMode).includes(mode)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid mode. Allowed values: ${Object.values(BatchMode).join(', ')}`,
      });
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid date format',
      });
      return;
    }

    if (start >= end) {
      res.status(400).json({
        status: 'error',
        message: 'Start date must be before end date',
      });
      return;
    }

    if (maxCapacity < 1) {
      res.status(400).json({
        status: 'error',
        message: 'Max capacity must be at least 1',
      });
      return;
    }

    // Create batch
    const batch = await db.Batch.create({
      title,
      software: software || null,
      mode,
      startDate: start,
      endDate: end,
      maxCapacity,
      schedule: schedule || null,
      status: status || null,
      createdByAdminId: req.user.userId,
    });

    res.status(201).json({
      status: 'success',
      message: 'Batch created successfully',
      data: {
        batch: {
          id: batch.id,
          title: batch.title,
          software: batch.software,
          mode: batch.mode,
          startDate: batch.startDate,
          endDate: batch.endDate,
          maxCapacity: batch.maxCapacity,
          schedule: batch.schedule,
          status: batch.status,
          createdByAdminId: batch.createdByAdminId,
          createdAt: batch.createdAt,
          updatedAt: batch.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Create batch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating batch',
    });
  }
};

// GET /batches/:id/candidates/suggest → Suggest eligible students for batch
export const suggestCandidates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    // Find batch
    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    if (!batch.software) {
      res.status(400).json({
        status: 'error',
        message: 'Batch must have software specified to suggest candidates',
      });
      return;
    }

    const batchSoftware = batch.software.toLowerCase();
    const batchStartDate = new Date(batch.startDate);
    const batchEndDate = new Date(batch.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active students with matching software
    const allStudents = await db.User.findAll({
      where: {
        role: UserRole.STUDENT,
        isActive: true,
      },
      include: [
        {
          model: db.StudentProfile,
          as: 'studentProfile',
          required: true,
          attributes: ['id', 'softwareList'],
        },
      ],
      attributes: ['id', 'name', 'email', 'phone'],
    });

    // Filter students who have selected the matching software
    const studentsWithMatchingSoftware = allStudents.filter((student) => {
      const softwareList = student.studentProfile?.softwareList;
      if (!softwareList || !Array.isArray(softwareList)) {
        return false;
      }
      return softwareList.some((s: string) => s.toLowerCase() === batchSoftware);
    });

    // Get payment transactions for all candidate students
    const studentIds = studentsWithMatchingSoftware.map((s) => s.id);
    const payments = await db.PaymentTransaction.findAll({
      where: {
        studentId: studentIds,
        status: 'pending',
      },
      attributes: ['studentId', 'dueDate', 'amount'],
    });

    // Get all enrollments for candidate students to check for conflicts
    const existingEnrollments = await db.Enrollment.findAll({
      where: {
        studentId: studentIds,
      },
      include: [
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'startDate', 'endDate', 'status'],
        },
      ],
    });

    // Get all sessions in the date range to check for time conflicts
    const existingSessions = await db.Session.findAll({
      where: {
        date: {
          [Op.between]: [batchStartDate, batchEndDate],
        },
      },
      include: [
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'startDate', 'endDate'],
          include: [
            {
              model: db.Enrollment,
              as: 'enrollments',
              where: {
                studentId: studentIds,
              },
              attributes: ['studentId'],
              required: false,
            },
          ],
        },
      ],
    });

    // Process each candidate student
    const candidates = studentsWithMatchingSoftware.map((student) => {
      const studentId = student.id;

      // Check for overdue payments
      const overduePayments = payments
        .filter((payment) => {
          const dueDate = new Date(payment.dueDate);
          return dueDate < today;
        })
        .filter((payment) => payment.studentId === studentId);

      const hasOverdueFees = overduePayments.length > 0;
      const totalOverdueAmount = overduePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      // Check for conflicting enrollments (overlapping batch dates)
      const conflictingEnrollments = existingEnrollments.filter((enrollment) => {
        if (enrollment.studentId !== studentId) return false;
        const enrollmentBatch = (enrollment as any).batch;
        if (!enrollmentBatch) return false;
        if (enrollmentBatch.id === batchId) return false; // Exclude current batch
        if (enrollmentBatch.status === 'ended' || enrollmentBatch.status === 'cancelled') return false;

        const otherStart = new Date(enrollmentBatch.startDate);
        const otherEnd = new Date(enrollmentBatch.endDate);

        // Check if date ranges overlap
        return batchStartDate <= otherEnd && batchEndDate >= otherStart;
      });

      // Check for conflicting sessions
      const conflictingSessions = existingSessions.filter((session) => {
        const sessionBatch = (session as any).batch;
        if (!sessionBatch || !sessionBatch.enrollments) return false;
        return sessionBatch.enrollments.some((enrollment: any) => enrollment.studentId === studentId);
      });

      const isBusy = conflictingEnrollments.length > 0 || conflictingSessions.length > 0;

      // Determine candidate status
      let status = 'available';
      let statusMessage = 'Available for enrollment';

      if (hasOverdueFees) {
        status = 'fees_overdue';
        statusMessage = `Fees overdue (₹${totalOverdueAmount.toFixed(2)})`;
      } else if (isBusy) {
        status = 'busy';
        const conflictDetails: string[] = [];
        if (conflictingEnrollments.length > 0) {
          conflictDetails.push(`${conflictingEnrollments.length} batch(es)`);
        }
        if (conflictingSessions.length > 0) {
          conflictDetails.push(`${conflictingSessions.length} session(s)`);
        }
        statusMessage = `Busy - ${conflictDetails.join(', ')}`;
      }

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone || '-',
        status,
        statusMessage,
        hasOverdueFees,
        totalOverdueAmount: hasOverdueFees ? totalOverdueAmount : 0,
        conflictingBatches: conflictingEnrollments
          .map((enrollment) => (enrollment as any).batch)
          .filter((enrollmentBatch): enrollmentBatch is { id: number; title: string; startDate: Date; endDate: Date } => !!enrollmentBatch)
          .map((enrollmentBatch) => ({
            id: enrollmentBatch.id,
            title: enrollmentBatch.title,
            startDate: enrollmentBatch.startDate,
            endDate: enrollmentBatch.endDate,
          })),
        conflictingSessionsCount: conflictingSessions.length,
      };
    });

    // Sort candidates: available first, then busy, then fees_overdue
    const statusOrder: { [key: string]: number } = { available: 1, busy: 2, fees_overdue: 3 };
    candidates.sort((a, b) => {
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

    res.status(200).json({
      status: 'success',
      data: {
        batch: {
          id: batch.id,
          title: batch.title,
          software: batch.software,
          startDate: batch.startDate,
          endDate: batch.endDate,
          schedule: batch.schedule,
        },
        candidates,
        totalCount: candidates.length,
        summary: {
          available: candidates.filter((c) => c.status === 'available').length,
          busy: candidates.filter((c) => c.status === 'busy').length,
          feesOverdue: candidates.filter((c) => c.status === 'fees_overdue').length,
        },
      },
    });
  } catch (error) {
    logger.error('Suggest candidates error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while suggesting candidates',
    });
  }
};

// GET /batches/:id/enrollments → Get batch enrollments
export const getBatchEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
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

    // Get enrollments with student information
    const enrollments = await db.Enrollment.findAll({
      where: { batchId },
      include: [
        {
          model: db.User,
          as: 'student',
          where: {
            role: UserRole.STUDENT,
            isActive: true,
          },
          attributes: ['id', 'name', 'email', 'phone'],
          required: true,
        },
      ],
      order: [['enrollmentDate', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: enrollments,
    });
  } catch (error) {
    logger.error('Get batch enrollments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batch enrollments',
    });
  }
};

// GET /batches → List all batches with related faculty and enrolled students
export const getAllBatches = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all batches with related data
    const batches = await db.Batch.findAll({
      include: [
        {
          model: db.User,
          as: 'admin',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: db.Enrollment,
          as: 'enrollments',
          include: [
            {
              model: db.User,
              as: 'student',
              attributes: ['id', 'name', 'email', 'phone'],
            },
          ],
        },
        {
          model: db.Session,
          as: 'sessions',
          include: [
            {
              model: db.User,
              as: 'faculty',
              attributes: ['id', 'name', 'email'],
            },
          ],
          attributes: ['id', 'facultyId', 'date', 'status'],
        },
        {
          model: db.User,
          as: 'assignedFaculty',
          attributes: ['id', 'name', 'email'],
          through: { attributes: [] },
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Transform the data to show faculty information from sessions
    const batchesWithFaculty = batches.map((batch: any) => {
      const facultyMap = new Map();
      if (batch.assignedFaculty && Array.isArray(batch.assignedFaculty)) {
        batch.assignedFaculty.forEach((faculty: any) => {
          if (faculty?.id) {
            facultyMap.set(faculty.id, faculty);
          }
        });
      }
      if (batch.sessions) {
        batch.sessions
          .filter((s: any) => s.faculty)
          .forEach((session: any) => {
            if (session.faculty?.id) {
              facultyMap.set(session.faculty.id, session.faculty);
            }
          });
      }
      const facultyMembers = Array.from(facultyMap.values());

      return {
        id: batch.id,
        title: batch.title,
        software: batch.software,
        mode: batch.mode,
        startDate: batch.startDate,
        endDate: batch.endDate,
        maxCapacity: batch.maxCapacity,
        currentEnrollment: batch.enrollments?.length || 0,
        schedule: batch.schedule,
        status: batch.status,
        createdBy: batch.admin
          ? {
              id: batch.admin.id,
              name: batch.admin.name,
              email: batch.admin.email,
            }
          : null,
        faculty: facultyMembers,
        enrolledStudents: batch.enrollments?.map((enrollment: any) => ({
          id: enrollment.student?.id,
          name: enrollment.student?.name,
          email: enrollment.student?.email,
          phone: enrollment.student?.phone,
          enrollmentDate: enrollment.enrollmentDate,
          enrollmentStatus: enrollment.status,
        })) || [],
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      };
    });

    res.status(200).json({
      status: 'success',
      data: batchesWithFaculty,
      count: batchesWithFaculty.length,
    });
  } catch (error) {
    logger.error('Get all batches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batches',
    });
  }
};

// GET /batches/:id → Get single batch by ID
export const getBatchById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    const batch = await db.Batch.findByPk(batchId, {
      include: [
        {
          model: db.User,
          as: 'admin',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: db.Enrollment,
          as: 'enrollments',
          include: [
            {
              model: db.User,
              as: 'student',
              attributes: ['id', 'name', 'email', 'phone'],
            },
          ],
        },
        {
          model: db.Session,
          as: 'sessions',
          include: [
            {
              model: db.User,
              as: 'faculty',
              attributes: ['id', 'name', 'email'],
            },
          ],
          attributes: ['id', 'facultyId', 'date', 'status'],
        },
        {
          model: db.User,
          as: 'assignedFaculty',
          attributes: ['id', 'name', 'email'],
          through: { attributes: [] },
          required: false,
        },
      ],
    });

    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    // Transform the data
    const batchData = {
      id: batch.id,
      title: batch.title,
      software: batch.software,
      mode: batch.mode,
      startDate: batch.startDate,
      endDate: batch.endDate,
      maxCapacity: batch.maxCapacity,
      currentEnrollment: (batch as any).enrollments?.length || 0,
      schedule: batch.schedule,
      status: batch.status,
      createdBy: (batch as any).admin
        ? {
            id: (batch as any).admin.id,
            name: (batch as any).admin.name,
            email: (batch as any).admin.email,
          }
        : null,
      faculty: (() => {
        const facultyMap = new Map();
        if ((batch as any).assignedFaculty) {
          (batch as any).assignedFaculty.forEach((faculty: any) => {
            if (faculty?.id) {
              facultyMap.set(faculty.id, faculty);
            }
          });
        }
        if ((batch as any).sessions) {
          (batch as any).sessions
            .filter((s: any) => s.faculty)
            .forEach((session: any) => {
              if (session.faculty?.id) {
                facultyMap.set(session.faculty.id, session.faculty);
              }
            });
        }
        return Array.from(facultyMap.values());
      })(),
      enrolledStudents: (batch as any).enrollments?.map((enrollment: any) => ({
        id: enrollment.student?.id,
        name: enrollment.student?.name,
        email: enrollment.student?.email,
        phone: enrollment.student?.phone,
        enrollmentDate: enrollment.enrollmentDate,
        enrollmentStatus: enrollment.status,
      })) || [],
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };

    res.status(200).json({
      status: 'success',
      data: {
        batch: batchData,
      },
    });
  } catch (error) {
    logger.error('Get batch by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batch',
    });
  }
};

// PUT /batches/:id → Update batch (admin only)
export const updateBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can update batches
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can update batches',
      });
      return;
    }

    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    const { title, software, mode, startDate, endDate, maxCapacity, schedule, status } = req.body;

    // Validate mode if provided
    if (mode && !Object.values(BatchMode).includes(mode)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid mode. Allowed values: ${Object.values(BatchMode).join(', ')}`,
      });
      return;
    }

    // Validate dates if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(batch.startDate);
      const end = endDate ? new Date(endDate) : new Date(batch.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid date format',
        });
        return;
      }
      if (start >= end) {
        res.status(400).json({
          status: 'error',
          message: 'Start date must be before end date',
        });
        return;
      }
    }

    // Validate maxCapacity if provided
    if (maxCapacity !== undefined && maxCapacity < 1) {
      res.status(400).json({
        status: 'error',
        message: 'Max capacity must be at least 1',
      });
      return;
    }

    // Update batch
    await batch.update({
      title: title !== undefined ? title : batch.title,
      software: software !== undefined ? software : batch.software,
      mode: mode !== undefined ? mode : batch.mode,
      startDate: startDate ? new Date(startDate) : batch.startDate,
      endDate: endDate ? new Date(endDate) : batch.endDate,
      maxCapacity: maxCapacity !== undefined ? maxCapacity : batch.maxCapacity,
      schedule: schedule !== undefined ? schedule : batch.schedule,
      status: status !== undefined ? status : batch.status,
    });

    res.status(200).json({
      status: 'success',
      message: 'Batch updated successfully',
      data: {
        batch: {
          id: batch.id,
          title: batch.title,
          software: batch.software,
          mode: batch.mode,
          startDate: batch.startDate,
          endDate: batch.endDate,
          maxCapacity: batch.maxCapacity,
          schedule: batch.schedule,
          status: batch.status,
          updatedAt: batch.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Update batch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating batch',
    });
  }
};

// DELETE /batches/:id → Delete batch (admin only)
export const deleteBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can delete batches
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can delete batches',
      });
      return;
    }

    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    // Check if batch has enrollments
    const enrollments = await db.Enrollment.count({ where: { batchId } });
    if (enrollments > 0) {
      res.status(400).json({
        status: 'error',
        message: `Cannot delete batch with ${enrollments} enrollment(s). Please remove enrollments first.`,
      });
      return;
    }

    await batch.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Batch deleted successfully',
    });
  } catch (error) {
    logger.error('Delete batch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting batch',
    });
  }
};

// PUT /batches/:id/faculty → Assign faculty to batch
export const assignFacultyToBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can assign faculty to batches',
      });
      return;
    }

    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    if (!req.body || !Array.isArray(req.body.facultyIds)) {
      res.status(400).json({
        status: 'error',
        message: 'facultyIds array is required',
      });
      return;
    }

    const facultyIds = req.body.facultyIds as Array<string | number>;
    const normalizedIds = facultyIds.map((value): number => Number(value));
    if (normalizedIds.some((facultyId) => Number.isNaN(facultyId) || facultyId <= 0)) {
      res.status(400).json({
        status: 'error',
        message: 'facultyIds must be an array of valid numeric IDs',
      });
      return;
    }

    const uniqueFacultyIds = Array.from(new Set(normalizedIds));

    if (uniqueFacultyIds.length > 0) {
      const facultyMembers = await db.User.findAll({
        where: {
          id: uniqueFacultyIds,
          role: UserRole.FACULTY,
          isActive: true,
        },
        attributes: ['id', 'name', 'email', 'phone'],
      });

      if (facultyMembers.length !== uniqueFacultyIds.length) {
        const foundIds = new Set(facultyMembers.map((f) => f.id));
        const missingIds = uniqueFacultyIds.filter((id) => !foundIds.has(id));
        res.status(400).json({
          status: 'error',
          message: `Invalid faculty IDs: ${missingIds.join(', ')}`,
        });
        return;
      }
    }

    const transaction = await db.sequelize.transaction();
    try {
      await db.BatchFacultyAssignment.destroy({
        where: { batchId },
        transaction,
      });

      if (uniqueFacultyIds.length > 0) {
        const rows = uniqueFacultyIds.map((facultyId) => ({
          batchId,
          facultyId,
        }));
        await db.BatchFacultyAssignment.bulkCreate(rows, { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    const assignedFaculty =
      uniqueFacultyIds.length > 0
        ? await db.User.findAll({
            where: { id: uniqueFacultyIds },
            attributes: ['id', 'name', 'email', 'phone'],
          })
        : [];

    res.status(200).json({
      status: 'success',
      message: 'Faculty allocation updated successfully',
      data: {
        batch: {
          id: batch.id,
          title: batch.title,
        },
        assignedFaculty,
      },
    });
  } catch (error) {
    logger.error('Assign faculty to batch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while assigning faculty to batch',
    });
  }
};




