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
    // Use raw SQL directly since Sequelize query is not working in production
    // This ensures we get students even if Sequelize has issues
    let students: any[] = [];
    
    try {
      // Use raw SQL query with proper column aliases (MySQL doesn't like dots in aliases)
      const [rawStudents]: any = await db.sequelize.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.phone,
          u.avatarUrl,
          u.isActive,
          u.createdAt,
          u.updatedAt,
          sp.id as profile_id,
          sp.userId as profile_userId,
          sp.dob as profile_dob,
          sp.address as profile_address,
          sp.documents as profile_documents,
          sp.photoUrl as profile_photoUrl,
          sp.softwareList as profile_softwareList,
          sp.enrollmentDate as profile_enrollmentDate,
          sp.status as profile_status,
          sp.finishedBatches as profile_finishedBatches,
          sp.currentBatches as profile_currentBatches,
          sp.pendingBatches as profile_pendingBatches,
          sp.createdAt as profile_createdAt,
          sp.updatedAt as profile_updatedAt
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.userId
        WHERE LOWER(u.role) = 'student'
        ORDER BY u.createdAt DESC
      `);
      
      logger.info(`Raw SQL query executed: Found ${rawStudents.length} students`);
      
      // Transform raw SQL results to match Sequelize format
      students = rawStudents.map((row: any) => {
        const student: any = {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          avatarUrl: row.avatarUrl,
          isActive: row.isActive === 1 || row.isActive === true, // Convert MySQL boolean
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          role: 'student',
          studentProfile: row.profile_id ? {
            id: row.profile_id,
            userId: row.profile_userId,
            dob: row.profile_dob,
            address: row.profile_address,
            documents: row.profile_documents,
            photoUrl: row.profile_photoUrl,
            softwareList: row.profile_softwareList,
            enrollmentDate: row.profile_enrollmentDate,
            status: row.profile_status,
            finishedBatches: row.profile_finishedBatches,
            currentBatches: row.profile_currentBatches,
            pendingBatches: row.profile_pendingBatches,
            createdAt: row.profile_createdAt,
            updatedAt: row.profile_updatedAt,
          } : null,
        };
        return student;
      });
      
      logger.info(`Raw SQL query: Transformed ${students.length} students`);
    } catch (sqlError) {
      logger.error('Raw SQL query failed:', sqlError);
      // Try Sequelize as fallback
      try {
        logger.info('Trying Sequelize query as fallback...');
        students = await db.User.findAll({
          where: {
            role: UserRole.STUDENT,
          },
          attributes: ['id', 'name', 'email', 'phone', 'avatarUrl', 'isActive', 'createdAt', 'updatedAt'],
          include: [
            {
              model: db.StudentProfile,
              as: 'studentProfile',
              required: false,
            },
          ],
          order: [['createdAt', 'DESC']],
        });
        logger.info(`Sequelize fallback: Found ${students.length} students`);
      } catch (sequelizeError) {
        logger.error('Both raw SQL and Sequelize queries failed:', sequelizeError);
        throw sequelizeError;
      }
    }
    
    // Log details about each student for debugging
    if (students.length > 0) {
      students.slice(0, 5).forEach((student: any) => {
        logger.info(`Student sample: id=${student.id}, name=${student.name}, email=${student.email}, role=${student.role || 'student'}, isActive=${student.isActive}, hasProfile=${!!student.studentProfile}`);
      });
    } else {
      logger.warn('No students found in database with role STUDENT');
      // Check if there are any users at all
      const allUsers = await db.User.count();
      const studentUsers = await db.User.count({ where: { role: UserRole.STUDENT } });
      logger.info(`Total users in database: ${allUsers}, Students with role '${UserRole.STUDENT}': ${studentUsers}`);
      
      // Also check with raw SQL to see if there are students with different case
      try {
        const [rawResults]: any = await db.sequelize.query(
          `SELECT COUNT(*) as count, role FROM users WHERE LOWER(role) = 'student' GROUP BY role`
        );
        logger.info('Raw SQL check - Students by role (case-insensitive):', rawResults);
        
        // Also check recent users
        const [recentUsers]: any = await db.sequelize.query(
          `SELECT id, name, email, role, isActive, createdAt FROM users ORDER BY createdAt DESC LIMIT 10`
        );
        logger.info('Recent users (last 10):', recentUsers);
      } catch (sqlError) {
        logger.error('Error running raw SQL check:', sqlError);
      }
    }

    logger.info(`Get all students: Found ${students.length} students`);

    // Transform students to response format
    const transformedStudents = students.map((student) => {
      // Handle both Sequelize models and plain objects from raw SQL
      let studentJson: any;
      let studentProfile: any;
      
      if (student && typeof student.toJSON === 'function') {
        // Sequelize model
        studentJson = student.toJSON();
        studentProfile = studentJson.studentProfile;
      } else {
        // Plain object from raw SQL
        studentJson = student;
        studentProfile = student.studentProfile;
      }
      
      // Parse documents if it's a string (MySQL JSON fields sometimes come as strings)
      if (studentProfile?.documents) {
        if (typeof studentProfile.documents === 'string') {
          try {
            studentProfile.documents = JSON.parse(studentProfile.documents);
          } catch (e) {
            logger.warn(`Failed to parse documents JSON for student ${studentJson.id}:`, e);
            studentProfile.documents = null;
          }
        }
      }

      // Parse JSON arrays if they're strings
      if (studentProfile?.softwareList && typeof studentProfile.softwareList === 'string') {
        try {
          studentProfile.softwareList = JSON.parse(studentProfile.softwareList);
        } catch (e) {
          studentProfile.softwareList = [];
        }
      }
      if (studentProfile?.finishedBatches && typeof studentProfile.finishedBatches === 'string') {
        try {
          studentProfile.finishedBatches = JSON.parse(studentProfile.finishedBatches);
        } catch (e) {
          studentProfile.finishedBatches = [];
        }
      }
      if (studentProfile?.currentBatches && typeof studentProfile.currentBatches === 'string') {
        try {
          studentProfile.currentBatches = JSON.parse(studentProfile.currentBatches);
        } catch (e) {
          studentProfile.currentBatches = [];
        }
      }
      if (studentProfile?.pendingBatches && typeof studentProfile.pendingBatches === 'string') {
        try {
          studentProfile.pendingBatches = JSON.parse(studentProfile.pendingBatches);
        } catch (e) {
          studentProfile.pendingBatches = [];
        }
      }

      return {
        id: studentJson.id,
        name: studentJson.name,
        email: studentJson.email,
        phone: studentJson.phone,
        avatarUrl: studentJson.avatarUrl,
        isActive: studentJson.isActive,
        createdAt: studentJson.createdAt,
        updatedAt: studentJson.updatedAt,
        studentProfile: studentProfile ? {
          id: studentProfile.id,
          userId: studentProfile.userId,
          dob: studentProfile.dob,
          address: studentProfile.address,
          documents: studentProfile.documents,
          photoUrl: studentProfile.photoUrl,
          softwareList: studentProfile.softwareList || [],
          enrollmentDate: studentProfile.enrollmentDate,
          status: studentProfile.status,
          finishedBatches: studentProfile.finishedBatches || [],
          currentBatches: studentProfile.currentBatches || [],
          pendingBatches: studentProfile.pendingBatches || [],
          createdAt: studentProfile.createdAt,
          updatedAt: studentProfile.updatedAt,
        } : null,
      };
    });

    logger.info(`Transformed ${transformedStudents.length} students for response`);

    res.status(200).json({
      status: 'success',
      data: {
        students: transformedStudents,
        totalCount: transformedStudents.length,
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
              attributes: ['id', 'title', 'software', 'mode', 'status', 'schedule', 'courseId'],
              include: (db.Course ? [{
                model: db.Course,
                as: 'course',
                attributes: ['id', 'name', 'software'],
                required: false,
              }] : []) as any[],
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

    // Parse documents if it's a string (MySQL JSON fields sometimes come as strings)
    let studentProfile = studentJson.studentProfile;
    if (studentProfile?.documents && typeof studentProfile.documents === 'string') {
      try {
        studentProfile.documents = JSON.parse(studentProfile.documents);
      } catch (e) {
        logger.warn(`Failed to parse documents JSON for student ${studentId}:`, e);
        studentProfile.documents = null;
      }
    }

    // Enrich enrollments with paymentPlan from enrollmentMetadata if available
    const enrichedEnrollments = await Promise.all(
      (studentJson.enrollments || []).map(async (enrollment: any) => {
        const enrollmentData: any = {
          id: enrollment.id,
          status: enrollment.status,
          enrollmentDate: enrollment.enrollmentDate,
          paymentPlan: enrollment.paymentPlan || null,
          batch: enrollment.batch
            ? {
                id: enrollment.batch.id,
                title: enrollment.batch.title,
                software: enrollment.batch.software,
                mode: enrollment.batch.mode,
                status: enrollment.batch.status,
                schedule: enrollment.batch.schedule,
                courseId: enrollment.batch.courseId,
                course: enrollment.batch.course || null,
              }
            : null,
        };

        // If paymentPlan doesn't exist, try to get from studentProfile documents
        if (!enrollmentData.paymentPlan || Object.keys(enrollmentData.paymentPlan).length === 0) {
          if (studentProfile?.documents) {
            const documents = studentProfile.documents;
            const metadata = documents?.enrollmentMetadata;
            if (metadata) {
              enrollmentData.paymentPlan = {
                totalDeal: metadata.totalDeal !== undefined && metadata.totalDeal !== null ? Number(metadata.totalDeal) : null,
                bookingAmount: metadata.bookingAmount !== undefined && metadata.bookingAmount !== null ? Number(metadata.bookingAmount) : null,
                balanceAmount: metadata.balanceAmount !== undefined && metadata.balanceAmount !== null ? Number(metadata.balanceAmount) : null,
                emiPlan: metadata.emiPlan || false,
                emiPlanDate: metadata.emiPlanDate || null,
                emiInstallments: metadata.emiInstallments || null,
              };
            }
          }
        }

        return enrollmentData;
      })
    );

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
          studentProfile: studentProfile || null,
          enrollments: enrichedEnrollments,
        },
      },
    });
  } catch (error: any) {
    logger.error('Get student details error:', error);
    logger.error('Error stack:', error?.stack);
    logger.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      sqlState: error?.parent?.sqlState,
      sqlMessage: error?.parent?.sqlMessage,
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching student details',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
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

// GET /attendance-reports/students-without-batch → Students without any batch enrollment
export const getStudentsWithoutBatch = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can view this report',
      });
      return;
    }

    // Get all students
    const allStudents = await db.User.findAll({
      where: {
        role: UserRole.STUDENT,
        isActive: true,
      },
      attributes: ['id', 'name', 'email', 'phone', 'avatarUrl', 'createdAt'],
      include: [
        {
          model: db.Enrollment,
          as: 'enrollments',
          required: false,
          include: [
            {
              model: db.Batch,
              as: 'batch',
              attributes: ['id', 'title', 'status'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Filter students with no active enrollments
    const studentsWithoutBatch = allStudents
      .filter((student: any) => {
        const enrollments = student.enrollments || [];
        return enrollments.length === 0 || enrollments.every((e: any) => e.status !== 'active');
      })
      .map((student: any) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        createdAt: student.createdAt,
        enrollments: (student.enrollments || []).map((e: any) => ({
          id: e.id,
          batch: e.batch ? {
            id: e.batch.id,
            title: e.batch.title,
            status: e.batch.status,
          } : null,
        })),
      }));

    res.status(200).json({
      status: 'success',
      data: {
        students: studentsWithoutBatch,
        totalCount: studentsWithoutBatch.length,
      },
    });
  } catch (error) {
    logger.error('Get students without batch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching students',
    });
  }
};

// GET /reports/students-enrolled-batch-not-started → Students enrolled but batch not started
export const getStudentsEnrolledBatchNotStarted = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can view this report',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all enrollments where batch startDate is in the future
    // First get all active enrollments, then filter by batch start date
    const allEnrollments = await db.Enrollment.findAll({
      where: {
        status: 'active',
      },
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone', 'avatarUrl'],
          where: {
            role: UserRole.STUDENT,
            isActive: true,
          },
          required: true,
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode', 'startDate', 'endDate', 'status', 'schedule'],
          required: true,
        },
      ],
      order: [['enrollmentDate', 'DESC']],
    });

    // Filter enrollments where batch startDate is in the future
    const enrollments = allEnrollments.filter((enrollment: any) => {
      if (!enrollment.batch || !enrollment.student) return false;
      const batchStartDate = new Date(enrollment.batch.startDate);
      batchStartDate.setHours(0, 0, 0, 0);
      return batchStartDate > today;
    });

    const students = enrollments
      .filter((e: any) => e.batch && e.student)
      .map((enrollment: any) => ({
        id: enrollment.student.id,
        name: enrollment.student.name,
        email: enrollment.student.email,
        phone: enrollment.student.phone,
        avatarUrl: enrollment.student.avatarUrl,
        enrollmentId: enrollment.id,
        enrollmentDate: enrollment.enrollmentDate,
        batch: {
          id: enrollment.batch.id,
          title: enrollment.batch.title,
          software: enrollment.batch.software,
          mode: enrollment.batch.mode,
          startDate: enrollment.batch.startDate,
          endDate: enrollment.batch.endDate,
          status: enrollment.batch.status,
          schedule: enrollment.batch.schedule,
        },
      }));

    res.status(200).json({
      status: 'success',
      data: {
        students,
        totalCount: students.length,
      },
    });
  } catch (error) {
    logger.error('Get students enrolled batch not started error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching students',
    });
  }
};

// Helper function to check if two time ranges overlap
const isTimeOverlapping = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const parseTime = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    return hour24 * 60 + minutes;
  };

  const start1Min = parseTime(start1);
  const end1Min = parseTime(end1);
  const start2Min = parseTime(start2);
  const end2Min = parseTime(end2);

  return start1Min < end2Min && start2Min < end1Min;
};

// Helper function to check time conflicts between batches
const checkTimeConflicts = (batches: any[]): boolean => {
  for (let i = 0; i < batches.length; i++) {
    for (let j = i + 1; j < batches.length; j++) {
      const batch1 = batches[i];
      const batch2 = batches[j];
      
      if (!batch1.schedule || !batch2.schedule) continue;
      
      // Check if batches have overlapping days and times
      const schedule1 = batch1.schedule;
      const schedule2 = batch2.schedule;
      
      for (const day in schedule1) {
        if (schedule2[day]) {
          const time1 = schedule1[day];
          const time2 = schedule2[day];
          
          if (time1.startTime && time1.endTime && time2.startTime && time2.endTime) {
            // Check if times overlap
            if (isTimeOverlapping(time1.startTime, time1.endTime, time2.startTime, time2.endTime)) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
};

// GET /reports/students-multiple-courses-conflict → Students enrolled in 2+ courses with conflicts
export const getStudentsMultipleCoursesConflict = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can view this report',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all students with multiple active enrollments
    const allEnrollments = await db.Enrollment.findAll({
      where: {
        status: 'active',
      },
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone', 'avatarUrl'],
          where: {
            role: UserRole.STUDENT,
            isActive: true,
          },
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode', 'startDate', 'endDate', 'status', 'schedule'],
          where: {
            [Op.or]: [
              { startDate: { [Op.lte]: today }, endDate: { [Op.gte]: today } }, // Currently running
              { startDate: { [Op.gt]: today } }, // Future batches
            ],
          },
        },
      ],
      order: [['enrollmentDate', 'DESC']],
    });

    // Group by student
    const studentEnrollmentsMap = new Map<number, any[]>();
    allEnrollments.forEach((enrollment: any) => {
      if (enrollment.batch && enrollment.student) {
        const studentId = enrollment.student.id;
        if (!studentEnrollmentsMap.has(studentId)) {
          studentEnrollmentsMap.set(studentId, []);
        }
        studentEnrollmentsMap.get(studentId)!.push(enrollment);
      }
    });

    // Find students with 2+ enrollments
    const conflictStudents: any[] = [];
    studentEnrollmentsMap.forEach((enrollments) => {
      if (enrollments.length >= 2) {
        const student = enrollments[0].student;
        const batches = enrollments.map((e: any) => ({
          id: e.batch.id,
          title: e.batch.title,
          software: e.batch.software,
          mode: e.batch.mode,
          startDate: e.batch.startDate,
          endDate: e.batch.endDate,
          status: e.batch.status,
          schedule: e.batch.schedule,
          enrollmentId: e.id,
          enrollmentDate: e.enrollmentDate,
        }));

        // Check for time conflicts
        const hasTimeConflict = checkTimeConflicts(batches);
        const runningBatches = batches.filter((b: any) => {
          const startDate = new Date(b.startDate);
          const endDate = new Date(b.endDate);
          return startDate <= today && endDate >= today;
        });
        const futureBatches = batches.filter((b: any) => {
          const startDate = new Date(b.startDate);
          return startDate > today;
        });

        conflictStudents.push({
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          avatarUrl: student.avatarUrl,
          batches,
          runningBatches: runningBatches.length,
          futureBatches: futureBatches.length,
          hasTimeConflict,
          totalEnrollments: enrollments.length,
        });
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        students: conflictStudents,
        totalCount: conflictStudents.length,
      },
    });
  } catch (error) {
    logger.error('Get students multiple courses conflict error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching students',
    });
  }
};

// GET /reports/students-on-leave-pending-batches → Students on leave with pending batches
export const getStudentsOnLeavePendingBatches = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can view this report',
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active student leaves
    const activeLeaves = await db.StudentLeave.findAll({
      where: {
        status: 'approved',
        [Op.or]: [
          { startDate: { [Op.lte]: today }, endDate: { [Op.gte]: today } }, // Currently on leave
          { startDate: { [Op.gt]: today } }, // Future leave
        ],
      },
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone', 'avatarUrl'],
          where: {
            role: UserRole.STUDENT,
            isActive: true,
          },
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode', 'startDate', 'endDate', 'status', 'schedule'],
        },
      ],
      order: [['startDate', 'DESC']],
    });

    // Get all enrollments for students on leave
    const studentIdsOnLeave = [...new Set(activeLeaves.map((leave: any) => leave.studentId))];
    
    const allEnrollments = await db.Enrollment.findAll({
      where: {
        status: 'active',
        studentId: {
          [Op.in]: studentIdsOnLeave,
        },
      },
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone', 'avatarUrl'],
          where: {
            role: UserRole.STUDENT,
            isActive: true,
          },
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode', 'startDate', 'endDate', 'status', 'schedule'],
        },
      ],
      order: [['enrollmentDate', 'DESC']],
    });

    // Group by student
    const studentDataMap = new Map<number, any>();
    
    activeLeaves.forEach((leave: any) => {
      if (leave.student && leave.batch) {
        const studentId = leave.student.id;
        if (!studentDataMap.has(studentId)) {
          studentDataMap.set(studentId, {
            id: leave.student.id,
            name: leave.student.name,
            email: leave.student.email,
            phone: leave.student.phone,
            avatarUrl: leave.student.avatarUrl,
            leaves: [],
            pendingBatches: [],
          });
        }
        const studentData = studentDataMap.get(studentId)!;
        studentData.leaves.push({
          id: leave.id,
          batchId: leave.batchId,
          batchTitle: leave.batch.title,
          startDate: leave.startDate,
          endDate: leave.endDate,
          reason: leave.reason,
          status: leave.status,
        });
      }
    });

    // Add enrollments that are not covered by leaves (pending batches)
    allEnrollments.forEach((enrollment: any) => {
      if (enrollment.batch && enrollment.student) {
        const studentId = enrollment.student.id;
        const studentData = studentDataMap.get(studentId);
        if (studentData) {
          // Check if this batch is covered by a leave
          const isCoveredByLeave = studentData.leaves.some((leave: any) => leave.batchId === enrollment.batchId);
          if (!isCoveredByLeave) {
            const batchStartDate = new Date(enrollment.batch.startDate);
            const batchEndDate = new Date(enrollment.batch.endDate);
            
            // Check if batch is running or future
            if (batchStartDate <= today && batchEndDate >= today) {
              // Currently running batch
              studentData.pendingBatches.push({
                id: enrollment.batch.id,
                title: enrollment.batch.title,
                software: enrollment.batch.software,
                mode: enrollment.batch.mode,
                startDate: enrollment.batch.startDate,
                endDate: enrollment.batch.endDate,
                status: enrollment.batch.status,
                schedule: enrollment.batch.schedule,
                enrollmentId: enrollment.id,
                enrollmentDate: enrollment.enrollmentDate,
                isRunning: true,
              });
            } else if (batchStartDate > today) {
              // Future batch
              studentData.pendingBatches.push({
                id: enrollment.batch.id,
                title: enrollment.batch.title,
                software: enrollment.batch.software,
                mode: enrollment.batch.mode,
                startDate: enrollment.batch.startDate,
                endDate: enrollment.batch.endDate,
                status: enrollment.batch.status,
                schedule: enrollment.batch.schedule,
                enrollmentId: enrollment.id,
                enrollmentDate: enrollment.enrollmentDate,
                isRunning: false,
              });
            }
          }
        }
      }
    });

    // Filter to only students with pending batches
    const studentsWithPendingBatches = Array.from(studentDataMap.values())
      .filter((student) => student.pendingBatches.length > 0)
      .map((student) => ({
        ...student,
        totalLeaves: student.leaves.length,
        totalPendingBatches: student.pendingBatches.length,
      }));

    res.status(200).json({
      status: 'success',
      data: {
        students: studentsWithPendingBatches,
        totalCount: studentsWithPendingBatches.length,
      },
    });
  } catch (error) {
    logger.error('Get students on leave pending batches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching students',
    });
  }
};

export default {
  getAllStudents,
  getStudentDetails,
  getFacultyAttendanceReport,
  getStudentAttendanceReport,
  getPunchSummaryReport,
  getStudentsWithoutBatch,
  getStudentsEnrolledBatchNotStarted,
  getStudentsMultipleCoursesConflict,
  getStudentsOnLeavePendingBatches,
};


