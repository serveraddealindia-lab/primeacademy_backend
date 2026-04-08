import { Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

type TaskAttendanceStatus = 'A' | 'P' | 'LATE' | 'ONLINE';

const parseDateOnly = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
};

// Helper function to calculate working hours in minutes
const calculateWorkingHours = (startTime: string, endTime: string): number => {
  try {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Handle overnight sessions (if end time is before start time)
    let diff = endMinutes - startMinutes;
    if (diff < 0) {
      diff += 24 * 60; // Add 24 hours
    }
    
    return Math.max(0, diff);
  } catch (error) {
    logger.error('Error calculating working hours:', error);
    return 0;
  }
};

// Create Task - Faculty can create with description and time range
export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const facultyId = req.user.userId;
    const { subject, description, date, startTime, endTime, studentIds } = req.body as {
      subject: string;
      description?: string;
      date: string;
      startTime: string;
      endTime?: string;
      studentIds: number[];
    };

    if (!subject || !subject.trim()) {
      res.status(400).json({ status: 'error', message: 'Subject is required' });
      return;
    }

    const dateOnly = parseDateOnly(date);
    if (!dateOnly) {
      res.status(400).json({ status: 'error', message: 'Date must be YYYY-MM-DD' });
      return;
    }
    const dateValue = new Date(`${dateOnly}T00:00:00.000Z`);

    if (!startTime || typeof startTime !== 'string') {
      res.status(400).json({ status: 'error', message: 'Start time is required' });
      return;
    }

    // Validate endTime format if provided
    if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) {
      res.status(400).json({ status: 'error', message: 'End time must be in HH:MM format' });
      return;
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ status: 'error', message: 'At least one student is required' });
      return;
    }

    const transaction = await db.sequelize.transaction();
    try {
      // Calculate working hours if both times provided
      const workingHours = startTime && endTime ? calculateWorkingHours(startTime, endTime) : null;

      const task = await db.Task.create(
        {
          facultyId,
          subject: subject.trim(),
          description: description?.trim(),
          date: dateValue,
          startTime,
          endTime: endTime || null,
          workingHours,
          status: 'pending',
        } as any,
        { transaction }
      );

      // Validate students exist and link them
      const students = await db.User.findAll({
        where: { id: { [Op.in]: studentIds }, role: UserRole.STUDENT },
        attributes: ['id'],
        transaction,
      });

      const validStudentIds = students.map((s: any) => s.id);
      for (const sid of validStudentIds) {
        await db.TaskStudent.create(
          {
            taskId: task.id,
            studentId: sid,
            attendanceStatus: null,
          },
          { transaction }
        );
      }

      await transaction.commit();

      res.status(201).json({
        status: 'success',
        message: 'Task created successfully (pending admin approval)',
        data: { 
          taskId: task.id,
          workingHours: workingHours ? `${Math.floor(workingHours / 60)}h ${workingHours % 60}m` : null,
          workingHoursMinutes: workingHours,
        },
      });
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  } catch (error) {
    logger.error('Create task failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to create task' });
  }
};

// Approve Task - Superadmin only
export const approveTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Support both route formats: /approve/:taskId and /approve (with body)
    const taskId = req.params.taskId || req.body.taskId;

    if (!taskId) {
      res.status(400).json({ status: 'error', message: 'Task ID is required' });
      return;
    }

    const task = await db.Task.findByPk(taskId, {
      include: [{ model: db.User, as: 'faculty', attributes: ['id', 'name', 'email'] }],
    } as any);

    if (!task) {
      res.status(404).json({ status: 'error', message: 'Task not found' });
      return;
    }

    if (task.status !== 'pending') {
      res.status(400).json({ status: 'error', message: `Task is already ${task.status}` });
      return;
    }

    // Handle approve/reject from body (for /approve endpoint with payload)
    const shouldApprove = req.body.approve !== undefined ? req.body.approve : true;

    if (shouldApprove) {
      task.status = 'approved';
      task.approvedBy = req.user!.userId;
      task.approvedAt = new Date();
      await task.save();

      res.status(200).json({
        status: 'success',
        message: 'Task approved successfully',
        data: { taskId: task.id },
      });
    } else {
      // Reject - delete the task since there's no 'rejected' status
      await db.sequelize.transaction(async (transaction) => {
        await db.TaskStudent.destroy({ where: { taskId: task.id }, transaction });
        await task.destroy({ transaction });
      });

      res.status(200).json({
        status: 'success',
        message: 'Task rejected and deleted',
        data: { taskId: task.id },
      });
    }
  } catch (error) {
    logger.error('Approve task failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to approve task' });
  }
};

// Edit Task - Faculty can edit before starting
export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { subject, description, date, startTime, endTime, studentIds } = req.body as {
      subject?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      studentIds?: number[];
    };

    const task = await db.Task.findByPk(taskId, {
      include: [{ model: db.User, as: 'faculty', attributes: ['id', 'email'] }],
    } as any);

    if (!task) {
      res.status(404).json({ status: 'error', message: 'Task not found' });
      return;
    }

    // Only faculty who created or admin can edit
    if (task.facultyId !== req.user!.userId && req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPERADMIN) {
      res.status(403).json({ status: 'error', message: 'Not authorized to edit this task' });
      return;
    }

    // Can't edit after completion
    if (task.status === 'completed') {
      res.status(400).json({ status: 'error', message: 'Cannot edit completed task' });
      return;
    }

    const updates: any = {};
    if (subject) updates.subject = subject.trim();
    if (description !== undefined) updates.description = description.trim();
    if (date) {
      const dateOnly = parseDateOnly(date);
      if (dateOnly) updates.date = new Date(`${dateOnly}T00:00:00.000Z`);
    }
    if (startTime) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;

    await task.update(updates);

    // Update students if provided
    if (studentIds && Array.isArray(studentIds)) {
      const transaction = await db.sequelize.transaction();
      try {
      await db.TaskStudent.destroy({ where: { taskId }, transaction });
        
        const students = await db.User.findAll({
          where: { id: { [Op.in]: studentIds }, role: UserRole.STUDENT },
          attributes: ['id'],
          transaction,
        });

        for (const student of students) {
          await db.TaskStudent.create(
            {
              taskId: task.id,
              studentId: student.id,
              attendanceStatus: null,
            },
            { transaction }
          );
        }

        await transaction.commit();
      } catch (e) {
        await transaction.rollback();
        throw e;
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Task updated successfully',
      data: { taskId: task.id },
    });
  } catch (error) {
    logger.error('Update task failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to update task' });
  }
};

// Delete Task - Faculty can delete before completion
export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    const task = await db.Task.findByPk(taskId, {
      include: [{ model: db.User, as: 'faculty', attributes: ['id', 'email'] }],
    } as any);

    if (!task) {
      res.status(404).json({ status: 'error', message: 'Task not found' });
      return;
    }

    // Only faculty who created or admin can delete
    if (task.facultyId !== req.user!.userId && req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPERADMIN) {
      res.status(403).json({ status: 'error', message: 'Not authorized to delete this task' });
      return;
    }

    // Can't delete after completion
    if (task.status === 'completed') {
      res.status(400).json({ status: 'error', message: 'Cannot delete completed task' });
      return;
    }

    await db.sequelize.transaction(async (transaction) => {
      await db.TaskStudent.destroy({ where: { taskId }, transaction });
      await task.destroy({ transaction });
    });

    res.status(200).json({
      status: 'success',
      message: 'Task deleted successfully',
    });
  } catch (error) {
    logger.error('Delete task failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete task' });
  }
};

// Start Task Session - Like regular session start
export const startTaskSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    // Check if faculty has punched in today
    // Use a broader date range to handle timezone issues
    const currentTime = new Date();
    const startOfDay = new Date(currentTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentTime);
    endOfDay.setHours(23, 59, 59, 999);

    const todayPunch = await db.EmployeePunch.findOne({
      where: {
        userId: req.user!.userId,
        punchInAt: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay,
        },
      },
      order: [['createdAt', 'DESC']],
    });

    // Debug logging
    console.log('[Task Session Start Check] User:', req.user!.userId);
    console.log('  Checking range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());
    console.log('  Punch record:', todayPunch ? 'Found' : 'Not Found');
    console.log('  PunchInAt:', todayPunch?.punchInAt);
    console.log('  PunchOutAt:', todayPunch?.punchOutAt);

    if (!todayPunch || !todayPunch.punchInAt) {
      res.status(403).json({
        status: 'error',
        message: 'You must punch in before starting a task session. Please go to the Punch In/Out tab and punch in first.',
      });
      return;
    }

    const task = await db.Task.findByPk(taskId, {
      include: [
        { 
          model: db.User, 
          as: 'faculty', 
          attributes: ['id', 'name', 'email'],
          include: [{ model: db.FacultyProfile, as: 'facultyProfile' }]
        },
        { 
          model: db.TaskStudent, 
          as: 'taskStudents',
          include: [{ model: db.User, as: 'student', attributes: ['id', 'name', 'email'] }]
        },
      ],
    } as any);

    if (!task) {
      res.status(404).json({ status: 'error', message: 'Task not found' });
      return;
    }

    if (task.status !== 'approved') {
      res.status(400).json({ status: 'error', message: 'Task must be approved before starting' });
      return;
    }

    if (task.startedAt) {
      res.status(400).json({ status: 'error', message: 'Task session already started' });
      return;
    }

    task.startedAt = new Date();
    // Keep status as 'approved' until attendance is marked
    // Status will be changed to 'completed' when attendance is submitted
    await task.save();

    const taskStudents = await db.TaskStudent.findAll({
      where: { taskId },
      include: [{ model: db.User, as: 'student', attributes: ['id', 'name', 'email'] }],
    } as any);

    res.status(200).json({
      status: 'success',
      message: 'Task session started',
      data: {
        taskId: task.id,
        startedAt: task.startedAt,
        students: (taskStudents as any[]).map((ts) => ({
          studentId: ts.studentId,
          studentName: ts.student.name,
        })),
      },
    });
  } catch (error) {
    logger.error('Start task session failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to start task session' });
  }
};

// Mark Task Attendance - After session ends
export const markTaskAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { attendanceData } = req.body as {
      attendanceData: Array<{
        studentId: number;
        status: TaskAttendanceStatus;
      }>;
    };

    const task = await db.Task.findByPk(taskId, {
      include: [{ model: db.User, as: 'faculty' }],
    } as any);

    if (!task) {
      res.status(404).json({ status: 'error', message: 'Task not found' });
      return;
    }

    if (!task.startedAt) {
      res.status(400).json({ status: 'error', message: 'Task session not started yet' });
      return;
    }

    const transaction = await db.sequelize.transaction();
    try {
      for (const item of attendanceData) {
        await db.TaskStudent.update(
          {
            attendanceStatus: item.status,
            markedBy: req.user!.userId,
            markedAt: new Date(),
          },
          {
            where: { taskId, studentId: item.studentId },
            transaction,
          }
        );
      }

      task.stoppedAt = new Date();
      task.status = 'completed'; // Mark as completed when attendance is submitted
      await task.save({ transaction });

      await transaction.commit();

      res.status(200).json({
        status: 'success',
        message: 'Attendance marked successfully',
      });
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  } catch (error) {
    logger.error('Mark task attendance failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to mark attendance' });
  }
};

// Get Faculty Tasks
export const getFacultyTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const facultyId = req.user!.userId;
    const { status, startDate, endDate } = req.query;

    const where: any = { facultyId };
    if (status) where.status = status;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const tasks = await db.Task.findAll({
      where,
      include: [
        { model: db.User, as: 'faculty', attributes: ['id', 'name', 'email'] },
        { model: db.User, as: 'approver', attributes: ['id', 'name', 'email'] },
        {
          model: db.TaskStudent,
          as: 'taskStudents',
          include: [{ model: db.User, as: 'student', attributes: ['id', 'name', 'email'] }],
        },
      ],
      order: [['date', 'DESC'], ['startTime', 'ASC']],
    } as any);

    res.status(200).json({
      status: 'success',
      data: tasks,
    });
  } catch (error) {
    logger.error('Get faculty tasks failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch tasks' });
  }
};

// Get All Tasks (Admin/Superadmin)
export const getAllTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, facultyId, startDate, endDate } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (facultyId) where.facultyId = facultyId;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const tasks = await db.Task.findAll({
      where,
      include: [
        { model: db.User, as: 'faculty', attributes: ['id', 'name', 'email'] },
        { model: db.User, as: 'approver', attributes: ['id', 'name', 'email'] },
        {
          model: db.TaskStudent,
          as: 'taskStudents',
          include: [{ model: db.User, as: 'student', attributes: ['id', 'name', 'email'] }],
        },
      ],
      order: [['date', 'DESC'], ['startTime', 'ASC']],
    } as any);

    res.status(200).json({
      status: 'success',
      data: tasks,
    });
  } catch (error) {
    logger.error('Get all tasks failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch tasks' });
  }
};

