import { Response } from 'express';
import { Op, Transaction } from 'sequelize';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

type TaskAttendanceStatus = 'A' | 'P' | 'LATE' | 'ONLINE';

const parseDateOnly = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Basic YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const facultyId = req.user.userId;
    const { subject, date, time, studentIds } = req.body as {
      subject: string;
      date: string;
      time: string;
      studentIds: number[];
    };

    if (!subject || !subject.trim()) {
      res.status(400).json({ status: 'error', message: 'subject is required' });
      return;
    }
    const dateOnly = parseDateOnly(date);
    if (!dateOnly) {
      res.status(400).json({ status: 'error', message: 'date must be YYYY-MM-DD' });
      return;
    }
    const dateValue = new Date(`${dateOnly}T00:00:00.000Z`);
    if (!time || typeof time !== 'string') {
      res.status(400).json({ status: 'error', message: 'time is required' });
      return;
    }
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ status: 'error', message: 'studentIds must be a non-empty array' });
      return;
    }

    const transaction: Transaction = await db.sequelize.transaction();
    try {
      const task = await db.Task.create(
        {
          facultyId,
          subject: subject.trim(),
          date: dateValue,
          time,
          status: 'pending',
        } as any,
        { transaction }
      );

      // Validate students exist
      const students = await db.User.findAll({
        // Do not filter by isActive; inactive students can still be part of a batch/task in many academies.
        where: { id: { [Op.in]: studentIds }, role: UserRole.STUDENT },
        attributes: ['id'],
        transaction,
      });
      const allowedIds = new Set(students.map((s: any) => s.id));
      const allowAllFromRequest = allowedIds.size === 0;

      for (const sid of studentIds) {
        if (!allowAllFromRequest && !allowedIds.has(sid)) continue;
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
        message: 'Task created (pending approval)',
        data: { taskId: task.id },
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

export const approveTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { taskId, approve } = req.body as { taskId: number; approve: boolean };

    if (!taskId || Number.isNaN(Number(taskId))) {
      res.status(400).json({ status: 'error', message: 'taskId is required' });
      return;
    }

    const task = await db.Task.findByPk(taskId);
    if (!task) {
      res.status(404).json({ status: 'error', message: 'Task not found' });
      return;
    }

    if (approve) {
      await task.update({
        status: 'approved',
        approvedBy: req.user.userId,
        approvedAt: new Date(),
      });
    } else {
      // Keep simple: rejecting deletes the task to avoid clutter; no data loss to lectures
      await db.TaskStudent.destroy({ where: { taskId: task.id } });
      await task.destroy();
    }

    res.status(200).json({
      status: 'success',
      message: approve ? 'Task approved' : 'Task rejected',
    });
  } catch (error) {
    logger.error('Approve task failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to approve task' });
  }
};

export const getFacultyDashboardTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const from = parseDateOnly(req.query.from);
    const to = parseDateOnly(req.query.to);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const where: any = {};
    // Faculty scope: faculty sees only their tasks; admins can view all
    if (req.user.role === UserRole.FACULTY) {
      where.facultyId = req.user.userId;
    }
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }
    if (status) {
      where.status = status;
    }

    const tasks = await db.Task.findAll({
      where,
      include: [
        {
          model: db.TaskStudent,
          as: 'taskStudents',
          include: [{ model: db.User, as: 'student', attributes: ['id', 'name', 'email'] }],
        },
      ],
      order: [['date', 'DESC'], ['time', 'ASC']],
    });

    res.status(200).json({
      status: 'success',
      data: tasks,
    });
  } catch (error) {
    logger.error('Get faculty dashboard tasks failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch tasks' });
  }
};

export const submitTaskAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { taskId, attendance } = req.body as {
      taskId: number;
      attendance: Array<{ studentId: number; status: TaskAttendanceStatus | null }>;
    };

    if (!taskId || Number.isNaN(Number(taskId))) {
      res.status(400).json({ status: 'error', message: 'taskId is required' });
      return;
    }
    if (!Array.isArray(attendance) || attendance.length === 0) {
      res.status(400).json({ status: 'error', message: 'attendance is required' });
      return;
    }

    const task = await db.Task.findByPk(taskId);
    if (!task) {
      res.status(404).json({ status: 'error', message: 'Task not found' });
      return;
    }

    if (req.user.role === UserRole.FACULTY && task.facultyId !== req.user.userId) {
      res.status(403).json({ status: 'error', message: 'Not allowed' });
      return;
    }

    if (task.status !== 'approved') {
      res.status(400).json({ status: 'error', message: 'Task must be approved before submitting attendance' });
      return;
    }

    const allowedLinks = await db.TaskStudent.findAll({ where: { taskId } });
    const allowedStudentIds = new Set(allowedLinks.map((l: any) => l.studentId));

    // Map payload by studentId for strict validation
    const payloadMap = new Map<number, TaskAttendanceStatus | null>();
    for (const rec of attendance) {
      payloadMap.set(rec.studentId, rec.status);
    }

    // STRICT: task cannot be completed unless every linked student has a non-null attendance status
    for (const sid of allowedStudentIds) {
      if (!payloadMap.has(sid) || payloadMap.get(sid) === null || payloadMap.get(sid) === undefined) {
        res.status(400).json({
          status: 'error',
          message: 'Attendance for all task students is required before completing the task',
        });
        return;
      }
    }

    const transaction: Transaction = await db.sequelize.transaction();
    try {
      for (const sid of allowedStudentIds) {
        const status = payloadMap.get(sid);
        if (!allowedStudentIds.has(sid)) continue;
        await db.TaskStudent.update(
          {
            attendanceStatus: status,
            markedBy: req.user.userId,
            markedAt: new Date(),
          },
          { where: { taskId, studentId: sid }, transaction }
        );
      }

      await task.update({ status: 'completed', completedAt: new Date() }, { transaction });

      await transaction.commit();

      res.status(200).json({ status: 'success', message: 'Task attendance submitted and task completed' });
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  } catch (error) {
    logger.error('Submit task attendance failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit task attendance' });
  }
};

