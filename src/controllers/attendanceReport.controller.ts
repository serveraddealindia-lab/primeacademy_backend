import { Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';
import { AttendanceStatus } from '../models/Attendance';

const parseNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return parseNumber(value[0]);
  }

  if (typeof value === 'object') {
    return undefined;
  }

  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const buildDateRange = (from?: string, to?: string) => {
  if (!from && !to) return undefined;
  const range: Record<string | symbol, string> = {};
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;
  return range;
};

const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) {
    return 'message\nNo data';
  }
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escape(row[header])).join(','));
  });
  return lines.join('\n');
};

const maybeSendCsv = (
  req: AuthRequest,
  res: Response,
  rows: Record<string, unknown>[],
  filename: string
): boolean => {
  const format = req.query.format;
  if (format === 'csv') {
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    return true;
  }
  return false;
};

export const getFacultyAttendanceReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const facultyId = parseNumber(req.query.facultyId);
    const batchId = parseNumber(req.query.batchId);
    const dateRange = buildDateRange(req.query.from as string, req.query.to as string);

    const sessionWhere: Record<string, unknown> = {};
    if (facultyId) sessionWhere.facultyId = facultyId;
    if (batchId) sessionWhere.batchId = batchId;
    if (dateRange) sessionWhere.date = dateRange;

    const sessions = await db.Session.findAll({
      where: sessionWhere,
      include: [
        { model: db.Batch, as: 'batch', attributes: ['id', 'title'] },
        { model: db.User, as: 'faculty', attributes: ['id', 'name', 'email'] },
        { model: db.Attendance, as: 'attendances', attributes: ['status'] },
      ],
      order: [['date', 'DESC']],
    });

    const rows = sessions.map((session) => {
      const sessionJson = session.toJSON() as any;
      const attendances = (sessionJson.attendances as Array<{ status: AttendanceStatus }> | undefined) || [];
      const present = attendances.filter(
        (att) => att.status === AttendanceStatus.PRESENT || att.status === AttendanceStatus.MANUAL_PRESENT
      ).length;
      const absent = attendances.filter((att) => att.status === AttendanceStatus.ABSENT).length;
      const total = present + absent;
      const rate = total ? ((present / total) * 100).toFixed(2) : '0.00';
      return {
        sessionId: session.id,
        date: session.date,
        batchTitle: sessionJson.batch?.title ?? 'N/A',
        facultyName: sessionJson.faculty?.name ?? 'N/A',
        present,
        absent,
        total,
        attendanceRate: rate,
      };
    });

    if (maybeSendCsv(req, res, rows, 'faculty-attendance.csv')) {
      return;
    }

    const summary = {
      sessions: rows.length,
      totalPresent: rows.reduce((sum, row) => sum + Number(row.present), 0),
      totalAbsent: rows.reduce((sum, row) => sum + Number(row.absent), 0),
      averageRate:
        rows.length > 0
          ? (rows.reduce((sum, row) => sum + Number(row.attendanceRate), 0) / rows.length).toFixed(2)
          : '0.00',
    };

    res.status(200).json({
      status: 'success',
      data: {
        rows,
        summary,
      },
    });
  } catch (error) {
    logger.error('Faculty attendance report error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate faculty attendance report',
    });
  }
};

export const getStudentAttendanceReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = parseNumber(req.query.batchId);
    if (!batchId) {
      res.status(400).json({
        status: 'error',
        message: 'batchId is required',
      });
      return;
    }

    const studentId = parseNumber(req.query.studentId);
    const dateRange = buildDateRange(req.query.from as string, req.query.to as string);

    const sessionWhere: Record<string, unknown> = { batchId };
    if (dateRange) sessionWhere.date = dateRange;

    const attendanceRecords = await db.Attendance.findAll({
      where: {
        ...(studentId ? { studentId } : {}),
      },
      include: [
        {
          model: db.Session,
          as: 'session',
          where: sessionWhere,
          include: [{ model: db.Batch, as: 'batch', attributes: ['id', 'title'] }],
          required: true,
        },
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [[{ model: db.Session, as: 'session' }, 'date', 'DESC']],
    });

    const statsMap = new Map<number, { studentId: number; studentName: string; studentEmail: string; present: number; absent: number; manualPresent: number }>();

    attendanceRecords.forEach((record) => {
      const recordJson = record.toJSON() as any;
      const student = recordJson.student;
      if (!student) return;
      if (!statsMap.has(student.id)) {
        statsMap.set(student.id, {
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          present: 0,
          absent: 0,
          manualPresent: 0,
        });
      }
      const stat = statsMap.get(student.id)!;
      if (recordJson.status === AttendanceStatus.ABSENT) {
        stat.absent += 1;
      } else if (recordJson.status === AttendanceStatus.MANUAL_PRESENT) {
        stat.manualPresent += 1;
      } else {
        stat.present += 1;
      }
    });

    const rows = Array.from(statsMap.values()).map((stat) => {
      const total = stat.present + stat.absent + stat.manualPresent;
      const attendanceRate = total ? ((stat.present / total) * 100).toFixed(2) : '0.00';
      return {
        ...stat,
        total,
        attendanceRate,
      };
    });

    if (maybeSendCsv(req, res, rows, 'student-attendance.csv')) {
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        batchId,
        rows,
        summary: {
          students: rows.length,
          averageRate:
            rows.length > 0
              ? (rows.reduce((sum, row) => sum + Number(row.attendanceRate), 0) / rows.length).toFixed(2)
              : '0.00',
        },
      },
    });
  } catch (error) {
    logger.error('Student attendance report error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate student attendance report',
    });
  }
};

// GET /reports/all-students → Get all students (for student management and batch creation)
export const getAllStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can view all students
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can view all students',
      });
      return;
    }

    // Get all students (no pagination limit for student management)
    const students = await db.User.findAll({
      where: {
        role: UserRole.STUDENT,
      },
      attributes: ['id', 'name', 'email', 'phone', 'avatarUrl', 'isActive', 'createdAt'],
      include: [
        {
          model: db.StudentProfile,
          as: 'studentProfile',
          required: false,
          attributes: ['id', 'softwareList', 'status'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    logger.info(`Get all students: Found ${students.length} students`);

    res.status(200).json({
      status: 'success',
      data: {
        students: students.map((student) => ({
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          avatarUrl: student.avatarUrl,
          isActive: student.isActive,
          createdAt: student.createdAt,
          softwareList: (student as any).studentProfile?.softwareList || [],
          profileStatus: (student as any).studentProfile?.status || null,
        })),
        totalCount: students.length,
      },
    });
  } catch (error) {
    logger.error('Get all students error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching students',
    });
  }
};

// GET /attendance-reports/students/:studentId/details → Detailed student info
export const getStudentDetails = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can view student details',
      });
      return;
    }

    const studentId = parseInt(req.params.studentId, 10);
    if (Number.isNaN(studentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student ID',
      });
      return;
    }

    // First check if user exists
    const user = await db.User.findByPk(studentId, {
      attributes: ['id', 'name', 'email', 'phone', 'avatarUrl', 'isActive', 'role', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Check if user is a student
    if (user.role !== UserRole.STUDENT) {
      res.status(400).json({
        status: 'error',
        message: `User with ID ${studentId} is not a student. Current role: ${user.role}`,
      });
      return;
    }

    // Now fetch with all associations
    const student = await db.User.findOne({
      where: {
        id: studentId,
        role: UserRole.STUDENT,
      },
      attributes: ['id', 'name', 'email', 'phone', 'avatarUrl', 'isActive', 'createdAt', 'updatedAt'],
      include: [
        {
          model: db.StudentProfile,
          as: 'studentProfile',
          required: false,
        },
        {
          model: db.Enrollment,
          as: 'enrollments',
          include: [
            {
              model: db.Batch,
              as: 'batch',
              attributes: ['id', 'title', 'software', 'mode', 'status', 'schedule'],
            },
          ],
        },
      ],
    });

    if (!student) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found or could not load student data',
      });
      return;
    }

    const studentJson = student.toJSON() as any;

    res.status(200).json({
      status: 'success',
      data: {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          avatarUrl: student.avatarUrl,
          isActive: student.isActive,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
          studentProfile: studentJson.studentProfile || null,
          enrollments:
            studentJson.enrollments?.map((enrollment: any) => ({
              id: enrollment.id,
              status: enrollment.status,
              enrollmentDate: enrollment.enrollmentDate,
              batch: enrollment.batch
                ? {
                    id: enrollment.batch.id,
                    title: enrollment.batch.title,
                    software: enrollment.batch.software,
                    mode: enrollment.batch.mode,
                    status: enrollment.batch.status,
                    schedule: enrollment.batch.schedule,
                  }
                : null,
            })) || [],
        },
      },
    });
  } catch (error) {
    logger.error('Get student details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching student details',
    });
  }
};

export const getPunchSummaryReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseNumber(req.query.userId);
    const role = req.query.role as string | undefined;
    const dateRange = buildDateRange(req.query.from as string, req.query.to as string);

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (dateRange) where.date = dateRange;

    const punches = await db.EmployeePunch.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role'],
          ...(role ? { where: { role } } : {}),
        },
      ],
      order: [['date', 'DESC']],
    });

    const rows = punches.map((punch) => {
      const punchJson = punch.toJSON() as any;
      const durationHours = punch.effectiveWorkingHours ? Number(punch.effectiveWorkingHours) : 0;
      return {
        date: punch.date,
        userName: punchJson.user?.name ?? 'N/A',
        role: punchJson.user?.role ?? '-',
        punchInAt: punch.punchInAt,
        punchOutAt: punch.punchOutAt,
        hours: durationHours.toFixed(2),
      };
    });

    if (maybeSendCsv(req, res, rows, 'punch-summary.csv')) {
      return;
    }

    const totalHours = rows.reduce((sum, row) => sum + Number(row.hours), 0);

    res.status(200).json({
      status: 'success',
      data: {
        rows,
        summary: {
          punches: rows.length,
          totalHours: totalHours.toFixed(2),
        },
      },
    });
  } catch (error) {
    logger.error('Punch summary report error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate punch summary report',
    });
  }
};

export default {
  getAllStudents,
  getStudentDetails,
  getFacultyAttendanceReport,
  getStudentAttendanceReport,
  getPunchSummaryReport,
};


