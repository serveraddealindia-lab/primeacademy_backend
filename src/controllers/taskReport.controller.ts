import { Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

// Get Task Report with detailed data
export const getTaskReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { facultyId, startDate, endDate, status } = req.query;

    const where: any = {};
    if (facultyId) where.facultyId = facultyId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const tasks = await db.Task.findAll({
      where,
      include: [
        { 
          model: db.User, 
          as: 'faculty', 
          attributes: ['id', 'name', 'email'] 
        },
        { 
          model: db.User, 
          as: 'approver', 
          attributes: ['id', 'name', 'email'] 
        },
        {
          model: db.TaskStudent,
          as: 'taskStudents',
          include: [
            { 
              model: db.User, 
              as: 'student', 
              attributes: ['id', 'name', 'email'] 
            }
          ],
        },
      ],
      order: [['date', 'DESC'], ['startTime', 'ASC']],
    } as any);

    // Calculate statistics
    const totalTasks = tasks.length;
    const approvedTasks = tasks.filter((t: any) => t.status === 'approved').length;
    const pendingTasks = tasks.filter((t: any) => t.status === 'pending').length;
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;

    // Calculate total hours spent on tasks
    let totalHours = 0;
    tasks.forEach((task: any) => {
      if (task.startedAt && task.stoppedAt) {
        const started = new Date(task.startedAt);
        const stopped = new Date(task.stoppedAt);
        const diffMs = stopped.getTime() - started.getTime();
        totalHours += diffMs / (1000 * 60 * 60);
      } else if (task.startTime && task.endTime) {
        const startParts = task.startTime.split(':');
        const endParts = task.endTime.split(':');
        const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
        totalHours += (endMinutes - startMinutes) / 60;
      }
    });

    // Group by faculty
    const facultySummary: any = {};
    tasks.forEach((task: any) => {
      const fid = task.facultyId;
      if (!facultySummary[fid]) {
        facultySummary[fid] = {
          facultyId: fid,
          facultyName: task.faculty?.name || 'Unknown',
          totalTasks: 0,
          approvedTasks: 0,
          pendingTasks: 0,
          completedTasks: 0,
          totalHours: 0,
        };
      }

      facultySummary[fid].totalTasks++;
      if (task.status === 'approved') facultySummary[fid].approvedTasks++;
      if (task.status === 'pending') facultySummary[fid].pendingTasks++;
      if (task.status === 'completed') facultySummary[fid].completedTasks++;

      if (task.startedAt && task.stoppedAt) {
        const started = new Date(task.startedAt);
        const stopped = new Date(task.stoppedAt);
        const diffMs = stopped.getTime() - started.getTime();
        facultySummary[fid].totalHours += diffMs / (1000 * 60 * 60);
      } else if (task.startTime && task.endTime) {
        const startParts = task.startTime.split(':');
        const endParts = task.endTime.split(':');
        const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
        facultySummary[fid].totalHours += (endMinutes - startMinutes) / 60;
      }
    });

    const responseData = {
      tasks,
      summary: {
        totalTasks,
        approvedTasks,
        pendingTasks,
        completedTasks,
        totalHours: Number(totalHours.toFixed(2)),
      },
      facultySummary: Object.values(facultySummary).map((f: any) => ({
        ...f,
        totalHours: Number(f.totalHours.toFixed(2)),
      })),
    };

    res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    logger.error('Get task report failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch task report' });
  }
};

// Get Task Details Report (Single Task)
export const getTaskDetailsReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    const taskWithDetails = await db.Task.findByPk(taskId, {
      include: [
        { 
          model: db.User, 
          as: 'faculty', 
          attributes: ['id', 'name', 'email', 'phone'] 
        },
        { 
          model: db.User, 
          as: 'approver', 
          attributes: ['id', 'name', 'email'] 
        },
        {
          model: db.TaskStudent,
          as: 'taskStudents',
          include: [
            { 
              model: db.User, 
              as: 'student', 
              attributes: ['id', 'name', 'email', 'phone'] 
            }
          ],
        },
      ],
    } as any);

    if (!taskWithDetails) {
      res.status(404).json({ status: 'error', message: 'Task not found' });
      return;
    }

    const task = taskWithDetails as any; // Type assertion for included associations

    // Calculate task duration
    let durationHours = 0;
    if (task.startedAt && task.stoppedAt) {
      const started = new Date(task.startedAt);
      const stopped = new Date(task.stoppedAt);
      const diffMs = stopped.getTime() - started.getTime();
      durationHours = diffMs / (1000 * 60 * 60);
    } else if (task.startTime && task.endTime) {
      const startParts = task.startTime.split(':');
      const endParts = task.endTime.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      durationHours = (endMinutes - startMinutes) / 60;
    }

    // Attendance breakdown
    const attendanceBreakdown = {
      present: 0,
      absent: 0,
      late: 0,
      online: 0,
      notMarked: 0,
    };

    (task.taskStudents as any[]).forEach((ts) => {
      if (!ts.attendanceStatus) {
        attendanceBreakdown.notMarked++;
      } else if (ts.attendanceStatus === 'P') {
        attendanceBreakdown.present++;
      } else if (ts.attendanceStatus === 'A') {
        attendanceBreakdown.absent++;
      } else if (ts.attendanceStatus === 'LATE') {
        attendanceBreakdown.late++;
      } else if (ts.attendanceStatus === 'ONLINE') {
        attendanceBreakdown.online++;
      }
    });

    const responseData = {
      task: {
        id: task.id,
        subject: task.subject,
        description: task.description,
        date: task.date,
        startTime: task.startTime,
        endTime: task.endTime,
        startedAt: task.startedAt,
        stoppedAt: task.stoppedAt,
        durationHours: Number(durationHours.toFixed(2)),
        status: task.status,
        faculty: task.faculty,
        approver: task.approver,
        approvedAt: task.approvedAt,
      },
      students: (task.taskStudents as any[]).map((ts) => ({
        studentId: ts.studentId,
        studentName: ts.student.name,
        studentEmail: ts.student.email,
        attendanceStatus: ts.attendanceStatus,
        markedAt: ts.markedAt,
      })),
      attendanceSummary: {
        totalStudents: (task.taskStudents as any[]).length,
        ...attendanceBreakdown,
      },
    };

    res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    logger.error('Get task details report failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch task details' });
  }
};
