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
    const studentId = parseNumber(req.query.studentId);
    const facultyId = parseNumber(req.query.facultyId);
    const software = typeof req.query.software === 'string' ? req.query.software : undefined;
    const dateRange = buildDateRange(req.query.from as string, req.query.to as string);

    // Build session WHERE clause
    const sessionWhere: Record<string, unknown> = {};
    if (batchId) sessionWhere.batchId = batchId;
    if (facultyId) sessionWhere.facultyId = facultyId;
    if (dateRange) sessionWhere.date = dateRange;

    // Batch include with optional software filter
    const batchInclude: any = {
      model: db.Batch,
      as: 'batch',
      attributes: ['id', 'title', 'software'],
      ...(software ? { where: { software } } : {}),
    };

    const attendanceRecords = await db.Attendance.findAll({
      where: {
        ...(studentId ? { studentId } : {}),
      },
      include: [
        {
          model: db.Session,
          as: 'session',
          where: Object.keys(sessionWhere).length > 0 ? sessionWhere : undefined,
          include: [batchInclude],
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

    const statsMap = new Map<number, {
      studentId: number;
      studentName: string;
      studentEmail: string;
      present: number;
      absent: number;
      late: number;
      online: number;
      manualPresent: number;
    }>();

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
          late: 0,
          online: 0,
          manualPresent: 0,
        });
      }
      const stat = statsMap.get(student.id)!;
      const status = recordJson.status as string;
      if (status === AttendanceStatus.ABSENT) {
        stat.absent += 1;
      } else if (status === AttendanceStatus.MANUAL_PRESENT) {
        stat.manualPresent += 1;
      } else if (status === 'late') {
        stat.late += 1;
      } else if (status === 'online') {
        stat.online += 1;
      } else {
        stat.present += 1;
      }
    });

    const rows = Array.from(statsMap.values()).map((stat) => {
      const total = stat.present + stat.absent + stat.late + stat.online + stat.manualPresent;
      const attendanceRate = total ? (((stat.present + stat.late + stat.online + stat.manualPresent) / total) * 100).toFixed(2) : '0.00';
      return { ...stat, total, attendanceRate };
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
    let student;
    try {
      student = await db.User.findOne({
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
            attributes: { exclude: ['serialNo'] }, // Exclude serialNo column
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
    } catch (queryError: any) {
      // If query fails due to missing column (like serialNo), try without specifying attributes
      if (queryError?.parent?.code === 'ER_BAD_FIELD_ERROR' || 
          queryError?.message?.includes('Unknown column') ||
          queryError?.message?.includes('serialNo')) {
        logger.warn(`Query failed due to missing column, retrying with raw query for student ${studentId}:`, queryError?.message);
        // Try again with raw query to get all available fields
        student = await db.User.findOne({
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
              attributes: { exclude: ['serialNo'] }, // Exclude serialNo column
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
          raw: false, // Keep as false to get proper model instances
        });
      } else {
        throw queryError;
      }
    }

    if (!student) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found or could not load student data',
      });
      return;
    }

    const studentJson = student.toJSON() as any;

    // Parse documents if it's a string (MySQL JSON fields sometimes come as strings)
    const studentProfile = studentJson.studentProfile;
    if (studentProfile?.documents && typeof studentProfile.documents === 'string') {
      try {
        studentProfile.documents = JSON.parse(studentProfile.documents);
      } catch (e) {
        logger.warn(`Failed to parse documents JSON for student ${studentId}:`, e);
        studentProfile.documents = null;
      }
    }
    
    // Ensure all profile fields are included even if some columns don't exist
    // This helps with backward compatibility when new columns are added
    const safeStudentProfile = studentProfile ? {
      id: studentProfile.id,
      userId: studentProfile.userId,
      dob: studentProfile.dob || null,
      address: studentProfile.address || null,
      documents: studentProfile.documents || null,
      photoUrl: studentProfile.photoUrl || null,
      softwareList: studentProfile.softwareList || null,
      enrollmentDate: studentProfile.enrollmentDate || null,
      status: studentProfile.status || null,
      finishedBatches: studentProfile.finishedBatches || null,
      currentBatches: studentProfile.currentBatches || null,
      pendingBatches: studentProfile.pendingBatches || null,
      createdAt: studentProfile.createdAt || null,
      updatedAt: studentProfile.updatedAt || null,
    } : null;

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
          if (safeStudentProfile?.documents) {
            const documents = safeStudentProfile.documents;
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
          studentProfile: safeStudentProfile,
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
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({ status: 'error', message: 'Only admins can view this report' });
      return;
    }

    // Step 1: Get ALL active students with their profile
    // NOTE: The system uses student_profiles.currentBatches (array of batchIds) to track active batch membership
    // The enrollments table is empty - batch tracking is done via currentBatches/finishedBatches fields
    const allStudents = await db.User.findAll({
      where: { role: UserRole.STUDENT, isActive: true },
      attributes: ['id', 'name', 'createdAt'],
      include: [
        {
          model: db.StudentProfile,
          as: 'studentProfile',
          attributes: ['id', 'status', 'enrollmentDate', 'softwareList', 'currentBatches', 'finishedBatches', 'documents'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    logger.info(`Total active students: ${allStudents.length}`);

    // Step 2: Filter - Active or Active Plus students with NO current batch (currentBatches is empty/null)
    const studentsWithoutActiveBatch = allStudents.filter((student: any) => {
      const profile = student.studentProfile || {};
      const profileStatus = (profile.status || '').toLowerCase().trim();

      // Only Active and Active Plus students
      if (profileStatus !== 'active' && profileStatus !== 'active plus') {
        return false;
      }

      // currentBatches is a JSON array of batchIds - student has no active batch if empty/null
      const currentBatches = profile.currentBatches;
      const hasCurrentBatch = Array.isArray(currentBatches) && currentBatches.length > 0;

      return !hasCurrentBatch;
    });

    logger.info(`Active/Active Plus students without active batch: ${studentsWithoutActiveBatch.length}`);

    // Step 3: For students who had past batches, look up batch + faculty via sessions table
    // Get all unique batchIds from finishedBatches
    const studentBatchIds: number[] = [];
    studentsWithoutActiveBatch.forEach((s: any) => {
      const profile = s.studentProfile || {};
      const finished = profile.finishedBatches;
      if (Array.isArray(finished)) {
        finished.forEach((bid: any) => {
          const id = parseInt(bid);
          if (!isNaN(id) && !studentBatchIds.includes(id)) studentBatchIds.push(id);
        });
      }
    });

    // Fetch batch details + faculty for those batch IDs
    const batchMap: Record<number, any> = {};
    if (studentBatchIds.length > 0) {
      const batches = await db.Batch.findAll({
        where: { id: studentBatchIds },
        attributes: ['id', 'title', 'software', 'endDate', 'status'],
        include: [
          {
            model: db.User,
            as: 'assignedFaculty',
            attributes: ['id', 'name'],
            through: { attributes: [] },
            required: false,
          },
        ],
      });
      batches.forEach((b: any) => {
        batchMap[b.id] = b;
      });
    }

    // Step 4: Build report rows
    const reportRows = studentsWithoutActiveBatch.map((s: any) => {
      const profile = s.studentProfile || {};
      const finishedBatches: any[] = Array.isArray(profile.finishedBatches) ? profile.finishedBatches : [];

      // Extract enrollment metadata from documents JSON (fallback source)
      let enrollmentMeta: any = {};
      try {
        const docs = typeof profile.documents === 'string' ? JSON.parse(profile.documents) : profile.documents;
        enrollmentMeta = docs?.enrollmentMetadata || {};
      } catch (_e) { enrollmentMeta = {}; }

      let lastBatchTitle = '-';
      let lastBatchFinishedDate = '-';
      let lastSoftwareAttended = '-';
      let lastBatchFaculty = '-';

      // Find most recently finished batch by endDate
      if (finishedBatches.length > 0) {
        const batchDetails = finishedBatches
          .map((bid: any) => batchMap[parseInt(bid)])
          .filter((b: any) => b && b.endDate);

        if (batchDetails.length > 0) {
          batchDetails.sort((a: any, b: any) =>
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
          );
          const lastBatch = batchDetails[0];
          lastBatchTitle = lastBatch.title || '-';
          lastSoftwareAttended = lastBatch.software || '-';
          lastBatchFinishedDate = new Date(lastBatch.endDate).toLocaleDateString('en-GB');
          if (Array.isArray(lastBatch.assignedFaculty) && lastBatch.assignedFaculty.length > 0) {
            lastBatchFaculty = lastBatch.assignedFaculty.map((f: any) => f.name).join(', ');
          }
        } else if (finishedBatches.length > 0) {
          lastSoftwareAttended = finishedBatches[finishedBatches.length - 1] || '-';
        }
      }

      // Fallback: use softwareList from profile if no batch data
      if (lastSoftwareAttended === '-' && Array.isArray(profile.softwareList) && profile.softwareList.length > 0) {
        lastSoftwareAttended = profile.softwareList.join(', ');
      }

      // Fallback: use masterFaculty from enrollment metadata
      if (lastBatchFaculty === '-' && enrollmentMeta.masterFaculty) {
        lastBatchFaculty = enrollmentMeta.masterFaculty;
      }

      return {
        id: s.id,
        name: s.name || '-',
        'Date of Joining (DOJ)': profile.enrollmentDate
          ? new Date(profile.enrollmentDate).toLocaleDateString('en-GB')
          : '-',
        'Status': profile.status || '-',
        'Last Batch': lastBatchTitle,
        'Last Software Attended': lastSoftwareAttended,
        'Last Batch Finished Date': lastBatchFinishedDate,
        'Last Batch Faculty': lastBatchFaculty,
      };
    });

    // CSV export support
    const format = req.query.format as string | undefined;
    if (format === 'csv') {
      const escape = (value: unknown) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const csvColumns = ['name', 'Date of Joining (DOJ)', 'Status', 'Last Batch', 'Last Software Attended', 'Last Batch Finished Date', 'Last Batch Faculty'];
      const headers = ['Name', 'Date of Joining (DOJ)', 'Status', 'Last Batch', 'Last Software Attended', 'Last Batch Finished Date', 'Last Batch Faculty'];
      const lines = [headers.join(',')];
      reportRows.forEach((row: any) => {
        lines.push(csvColumns.map((col) => escape(row[col] || '')).join(','));
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="students-without-batch.csv"');
      res.send(lines.join('\n'));
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        students: reportRows,
        totalCount: reportRows.length,
        totalActiveStudents: allStudents.length,
      },
    });
  } catch (error) {
    logger.error('Get students without batch error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error while fetching students' });
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

export const getFacultyOccupancy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { from, to, facultyId } = req.query;
    
    // Calculate date range - default to current month if not provided
    const startDate = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = to ? new Date(to as string) : new Date();
    
    // Calculate working days (excluding Sundays)
    let workingDays = 0;
    const tempDate = new Date(startDate);
    while (tempDate <= endDate) {
      if (tempDate.getDay() !== 0) workingDays++; // Exclude Sunday
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    // Working hours = 9 hours per working day
    const totalWorkingHours = workingDays * 9;
    
    // Build where clause for sessions
    const sessionWhere: Record<string, unknown> = {
      date: { [require('sequelize').Op.between]: [startDate, endDate] },
    };
    if (facultyId) sessionWhere.facultyId = Number(facultyId);
    
    // Get sessions with duration
    const sessions = await db.Session.findAll({
      where: sessionWhere,
      include: [{ model: db.User, as: 'faculty', attributes: ['id', 'name', 'email'] }],
      raw: true,
      nest: true,
    });
    
    // Get tasks with duration
    const taskWhere: Record<string, unknown> = {
      date: { [require('sequelize').Op.between]: [startDate, endDate] },
      status: { [require('sequelize').Op.in]: ['completed', 'approved'] },
    };
    if (facultyId) taskWhere.facultyId = Number(facultyId);
    
    // Get tasks with duration via raw query (no Task model)
    const facultyIdNum = facultyId ? Number(facultyId) : null;
    const taskQuery = `
      SELECT t.id, t.facultyId, t.date, t.time, t.endTime, t.workingHours, t.status, u.id as 'faculty.id', u.name as 'faculty.name', u.email as 'faculty.email'
      FROM tasks t
      LEFT JOIN users u ON t.facultyId = u.id
      WHERE t.date BETWEEN ? AND ?
      AND t.status IN ('completed', 'approved')
      ${facultyIdNum ? 'AND t.facultyId = ?' : ''}
    `;
    const taskParams: any[] = [startDate, endDate];
    if (facultyIdNum) taskParams.push(facultyIdNum);
    const [taskRows] = await db.sequelize.query(taskQuery, { replacements: taskParams });
    
    // Calculate hours per faculty
    const facultyMap = new Map<number, {
      facultyId: number;
      facultyName: string;
      sessionHours: number;
      taskHours: number;
    }>();
    
    // Process sessions
    sessions.forEach((session: any) => {
      if (!session.facultyId || !session.faculty) return;
      
      let durationHours = 0;
      if (session.actualStartAt && session.actualEndAt) {
        const start = new Date(session.actualStartAt);
        const end = new Date(session.actualEndAt);
        durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      } else if (session.startTime && session.endTime) {
        // Parse time strings like "10:00:00" and "12:00:00"
        const [sh, sm] = session.startTime.split(':').map(Number);
        const [eh, em] = session.endTime.split(':').map(Number);
        durationHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
      }
      
      if (durationHours < 0) durationHours = 0;
      
      const fid = session.facultyId;
      if (!facultyMap.has(fid)) {
        facultyMap.set(fid, {
          facultyId: fid,
          facultyName: session.faculty.name,
          sessionHours: 0,
          taskHours: 0,
        });
      }
      facultyMap.get(fid)!.sessionHours += durationHours;
    });
    
    // Process tasks
    (taskRows as any[]).forEach((task: any) => {
      if (!task.facultyId) return;
      
      let durationHours = 0;
      if (task.time && task.endTime) {
        // Parse time strings - endTime might be duration like "05:48" meaning 5h 48m
        const [sh, sm] = task.time.split(':').map(Number);
        const [eh, em] = task.endTime.split(':').map(Number);
        // If endTime < startTime, it's likely a duration format
        if (eh < sh || (eh === sh && em < sm)) {
          // Treat endTime as duration in hours:minutes
          durationHours = eh + em / 60;
        } else {
          durationHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
        }
      }
      if (task.workingHours && task.workingHours > 0) {
        durationHours = task.workingHours;
      }
      if (durationHours < 0) durationHours = 0;
      
      const fid = task.facultyId;
      if (!facultyMap.has(fid)) {
        facultyMap.set(fid, {
          facultyId: fid,
          facultyName: task['faculty.name'] || 'Unknown',
          sessionHours: 0,
          taskHours: 0,
        });
      }
      facultyMap.get(fid)!.taskHours += durationHours;
    });
    
    // Build rows
    const rows = Array.from(facultyMap.values()).map((f) => {
      const occupiedHours = f.sessionHours + f.taskHours;
      const workingHours = totalWorkingHours;
      const freeHours = Math.max(0, workingHours - occupiedHours);
      const occupancyPercent = workingHours > 0 ? ((occupiedHours / workingHours) * 100).toFixed(1) : '0.0';
      
      return {
        facultyId: f.facultyId,
        facultyName: f.facultyName,
        workingHours: workingHours.toFixed(1),
        sessionHours: f.sessionHours.toFixed(1),
        taskHours: f.taskHours.toFixed(1),
        freeTime: freeHours.toFixed(1),
        occupiedHours: occupiedHours.toFixed(1),
        occupancyPercent,
      };
    });
    
    // Calculate summary
    const totalSessionHours = rows.reduce((sum, r) => sum + parseFloat(r.sessionHours), 0);
    const totalTaskHours = rows.reduce((sum, r) => sum + parseFloat(r.taskHours), 0);
    const totalOccupiedHours = totalSessionHours + totalTaskHours;
    const totalFreeHours = Math.max(0, totalWorkingHours - totalOccupiedHours);
    
    res.status(200).json({
      status: 'success',
      data: {
        filters: {
          from: from as string | undefined,
          to: to as string | undefined,
          facultyId: facultyId ? Number(facultyId) : undefined,
        },
        rows,
        summary: {
          workingHours: totalWorkingHours.toFixed(1),
          occupiedHours: totalOccupiedHours.toFixed(1),
          freeHours: totalFreeHours.toFixed(1),
          occupancyPercent: totalWorkingHours > 0 ? ((totalOccupiedHours / totalWorkingHours) * 100).toFixed(1) : '0.0',
        },
      },
    });
  } catch (error) {
    logger.error('Get faculty occupancy error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching faculty occupancy',
    });
  }
};

export const getPendingPayments = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all students with their user info
    const students = await db.StudentProfile.findAll({
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
    });

    console.log('[PendingPayments] Total students:', students.length);
    console.log('[PendingPayments] First student ID:', students[0]?.id);
    console.log('[PendingPayments] First student userId:', students[0]?.userId);
    console.log('[PendingPayments] First student currentBatches:', students[0]?.currentBatches);
    console.log('[PendingPayments] First student softwareList:', students[0]?.softwareList);

    // Get all payment transactions
    const payments = await db.PaymentTransaction.findAll({
      attributes: ['id', 'studentId', 'amount', 'paidAmount', 'status', 'dueDate'],
    });

    console.log('[PendingPayments] Total payments:', payments.length);
    console.log('[PendingPayments] First payment:', JSON.stringify(payments[0], null, 2));
    console.log('[PendingPayments] Second payment:', JSON.stringify(payments[1], null, 2));
    console.log('[PendingPayments] Third payment:', JSON.stringify(payments[2], null, 2));
    
    // Log payment status distribution
    const statusCount: Record<string, number> = {};
    payments.forEach((p: any) => {
      statusCount[p.status] = (statusCount[p.status] || 0) + 1;
    });
    console.log('[PendingPayments] Payment status distribution:', statusCount);

    // Group payments by studentId (which is actually User.id)
    const paymentsByStudent: Record<number, any[]> = {};
    payments.forEach((payment: any) => {
      if (!paymentsByStudent[payment.studentId]) {
        paymentsByStudent[payment.studentId] = [];
      }
      paymentsByStudent[payment.studentId].push(payment);
    });

    console.log('[PendingPayments] Students with payments:', Object.keys(paymentsByStudent).length);

    // Calculate pending payments for each student
    const studentsWithPayments = students.map((student: any) => {
      // Use student.userId to match PaymentTransaction.studentId
      const studentPayments = paymentsByStudent[student.userId] || [];
      
      // Get total fees from student documents (enrollmentMetadata.totalDeal)
      let totalFees = 0;
      try {
        if (student.documents && typeof student.documents === 'string') {
          const docs = JSON.parse(student.documents);
          totalFees = Number(docs.enrollmentMetadata?.totalDeal || 0);
        } else if (student.documents && typeof student.documents === 'object') {
          totalFees = Number(student.documents.enrollmentMetadata?.totalDeal || 0);
        }
      } catch (e) {
        // If parsing fails, fallback to sum of payment amounts
        totalFees = 0;
      }
      
      // If no totalDeal found, fallback to sum of all payment amounts
      if (totalFees === 0) {
        totalFees = studentPayments.reduce((sum: number, p: any) => {
          return sum + Number(p.amount || 0);
        }, 0);
      }
      
      // Calculate total paid (only paid/partial status)
      const paidPayments = studentPayments.filter((p: any) => p.status === 'paid' || p.status === 'partial');
      const totalPaid = paidPayments.reduce((sum: number, p: any) => {
        // Use paidAmount if it exists and is > 0, otherwise use amount
        const amount = (p.paidAmount && p.paidAmount > 0) ? Number(p.paidAmount) : Number(p.amount || 0);
        return sum + amount;
      }, 0);
      
      // Calculate unpaid/pending amount (amount not yet received)
      const unpaidAmount = totalFees - totalPaid;
      
      return {
        id: student.id,
        studentName: student.user?.name || 'Unknown',
        studentEmail: student.user?.email || '',
        studentPhone: student.user?.phone || '',
        enrollmentNo: `STU-${student.id}`,
        batchName: (student.currentBatches && Array.isArray(student.currentBatches) && student.currentBatches.length > 0)
          ? student.currentBatches.join(', ')
          : 'No Batch',
        courseName: 'N/A', // Would need course association to get this
        totalAmount: totalFees,
        totalPaid,
        unpaidAmount,
        payments: studentPayments.map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          paidAmount: Number(p.paidAmount || 0),
          status: p.status,
          dueDate: p.dueDate,
        })),
        paymentCount: studentPayments.length,
        batchCount: (student.currentBatches && Array.isArray(student.currentBatches)) ? student.currentBatches.length : 0,
      };
    });

    // Log first student with payments for debugging
    const firstStudentWithPayments = studentsWithPayments.find((s: any) => s.paymentCount > 0);
    if (firstStudentWithPayments) {
      console.log('[PendingPayments] First student with payments:', JSON.stringify(firstStudentWithPayments, null, 2));
    }

    // Calculate summary statistics
    const totalStudents = studentsWithPayments.length;
    const totalPendingPayments = studentsWithPayments.filter(s => s.unpaidAmount > 0).length;
    const totalPendingAmount = studentsWithPayments.reduce((sum, s) => sum + (s.unpaidAmount || 0), 0);
    const totalPaidAmount = studentsWithPayments.reduce((sum, s) => sum + (s.totalPaid || 0), 0);

    console.log('[PendingPayments] Summary calculation:', {
      totalStudents,
      totalPendingPayments,
      totalPendingAmount,
      sampleStudent: studentsWithPayments.find((s: any) => s.paymentCount > 0),
    });

    res.status(200).json({
      status: 'success',
      data: {
        students: studentsWithPayments,
        totalCount: studentsWithPayments.length,
        summary: {
          totalStudents,
          totalPendingPayments,
          totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
          totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
          overdue: {
            count: 0, // Can be calculated based on due dates if needed
          },
          upcoming: {
            count: 0, // Can be calculated based on due dates if needed
          },
        },
      },
    });
  } catch (error) {
    logger.error('Get pending payments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching pending payments',
    });
  }
};

export const getPortfolioStatus = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all portfolios with student and user info
    const portfolios = await db.Portfolio.findAll({
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
    });

    const studentsWithPortfolio = portfolios.map((portfolio: any) => {
      const user = portfolio.student;
      
      return {
        id: portfolio.id,
        student: {
          name: user?.name || 'Unknown',
        },
        batch: {
          title: 'N/A',
        },
        status: portfolio.status,
        filesCount: [portfolio.pdfUrl, portfolio.youtubeUrl].filter(Boolean).length,
        hasPortfolio: !!portfolio.pdfUrl,
        hasYoutube: !!portfolio.youtubeUrl,
      };
    });

    // Calculate summary
    const total = studentsWithPortfolio.length;
    const pending = studentsWithPortfolio.filter((p: any) => p.status === 'pending').length;
    const approved = studentsWithPortfolio.filter((p: any) => p.status === 'approved').length;
    const rejected = studentsWithPortfolio.filter((p: any) => p.status === 'rejected').length;

    res.status(200).json({
      status: 'success',
      data: {
        portfolios: studentsWithPortfolio,
        totalCount: studentsWithPortfolio.length,
        summary: {
          total,
          pending,
          approved,
          rejected,
        },
      },
    });
  } catch (error) {
    logger.error('Get portfolio status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching portfolio status',
    });
  }
};

export const getAllAnalysisReports = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get total students
    const totalStudents = await db.StudentProfile.count();
    
    // Get active students (in batches) - students with currentBatches
    const studentsWithBatches = await db.StudentProfile.findAll({
      attributes: ['id', 'currentBatches'],
      where: {
        currentBatches: { [Op.ne]: null },
      },
    });
    const activeStudents = studentsWithBatches.filter((s: any) => 
      s.currentBatches && Array.isArray(s.currentBatches) && s.currentBatches.length > 0
    ).length;
    
    // Get total faculty
    const totalFaculty = await db.FacultyProfile.count();
    
    // Get total batches
    const totalBatches = await db.Batch.count();
    
    // Get active batches
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeBatches = await db.Batch.count({
      where: {
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today },
      },
    });

    // Get total sessions
    const totalSessions = await db.Session.count();

    // Get payment statistics
    const totalPayments = await db.PaymentTransaction.count();
    const pendingPayments = await db.PaymentTransaction.count({
      where: { status: 'pending' },
    });
    const paymentStats = await db.PaymentTransaction.findAll({
      attributes: [
        [db.Sequelize.fn('SUM', db.Sequelize.col('amount')), 'totalAmount'],
        [db.Sequelize.fn('SUM', db.Sequelize.literal(`CASE WHEN status = 'paid' THEN amount ELSE 0 END`)), 'paidAmount'],
        [db.Sequelize.fn('SUM', db.Sequelize.literal(`CASE WHEN status = 'pending' THEN amount ELSE 0 END`)), 'pendingAmount'],
      ],
      raw: true,
    }) as any[];

    // Get portfolio statistics
    const totalPortfolios = await db.Portfolio.count();
    const pendingPortfolios = await db.Portfolio.count({
      where: {
        [Op.or]: [
          { pdfUrl: null },
          { pdfUrl: '' },
          { youtubeUrl: null },
          { youtubeUrl: '' },
        ],
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        generatedAt: new Date().toISOString(),
        summary: {
          students: {
            total: totalStudents,
            withBatch: activeStudents,
            withoutBatch: totalStudents - activeStudents,
          },
          faculty: {
            total: totalFaculty,
          },
          batches: {
            total: totalBatches,
            active: activeBatches,
            ended: totalBatches - activeBatches,
          },
          sessions: {
            total: totalSessions,
          },
          payments: {
            total: totalPayments,
            pending: pendingPayments,
            totalAmount: parseFloat(paymentStats[0]?.totalAmount || '0'),
            paidAmount: parseFloat(paymentStats[0]?.paidAmount || '0'),
            pendingAmount: parseFloat(paymentStats[0]?.pendingAmount || '0'),
          },
          portfolios: {
            total: totalPortfolios,
            pending: pendingPortfolios,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Get all analysis reports error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching analysis reports',
    });
  }
};

export const getBatchDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, facultyId, days, batchName, minStudents, maxStudents, time } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build where clause for batch type (present vs future)
    const batchWhere: Record<string, unknown> = {};
    if (type === 'present') {
      // Present batches: startDate <= today AND endDate >= today
      batchWhere.startDate = { [require('sequelize').Op.lte]: today };
      batchWhere.endDate = { [require('sequelize').Op.gte]: today };
    } else if (type === 'future') {
      // Future batches: startDate > today
      batchWhere.startDate = { [require('sequelize').Op.gt]: today };
    }

    // Filter by batch name (search)
    if (batchName && typeof batchName === 'string') {
      batchWhere.title = { [require('sequelize').Op.like]: `%${batchName}%` };
    }

    // Get batches with faculty assignments
    const batches = await db.Batch.findAll({
      where: batchWhere,
      include: [
        {
          model: db.BatchFacultyAssignment,
          as: 'facultyAssignments',
          include: [{
            model: db.User,
            as: 'faculty',
            attributes: ['id', 'name', 'email'],
            ...(facultyId ? { where: { id: Number(facultyId) } } : {}),
          }],
        },
      ],
      order: [['startDate', 'ASC']],
    });

    // Get student counts per batch from enrollments table
    const enrollments = await db.Enrollment.findAll({
      attributes: ['batchId', [db.sequelize.fn('COUNT', db.sequelize.col('studentId')), 'studentCount']],
      group: ['batchId'],
      raw: true,
    });

    // Create a map of batchId -> studentCount
    const batchStudentCounts = new Map<number, number>();
    enrollments.forEach((e: any) => {
      batchStudentCounts.set(e.batchId, parseInt(e.studentCount) || 0);
    });

    // Build rows
    let rows = batches.map((batch: any) => {
      const b = batch.toJSON();
      
      // Parse schedule
      let scheduleObj: any = {};
      try {
        scheduleObj = typeof b.schedule === 'string' ? JSON.parse(b.schedule) : (b.schedule || {});
      } catch (e) {
        scheduleObj = {};
      }

      // Extract days and time from schedule
      const scheduleDays = Object.keys(scheduleObj).join(', ');
      const firstDay = Object.keys(scheduleObj)[0];
      const timeStr = firstDay && scheduleObj[firstDay] 
        ? `${scheduleObj[firstDay].startTime || ''} - ${scheduleObj[firstDay].endTime || ''}`
        : '-';

      // Get assigned faculty
      const assignedFaculty = (b.facultyAssignments || [])
        .filter((fa: any) => fa.faculty)
        .map((fa: any) => ({
          id: fa.faculty.id,
          name: fa.faculty.name,
          email: fa.faculty.email,
        }));

      return {
        batchId: b.id,
        batchName: b.title,
        software: b.software,
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status,
        numberOfStudents: batchStudentCounts.get(b.id) || 0,
        schedule: {
          days: scheduleDays,
          time: timeStr,
          raw: scheduleObj,
        },
        assignedFaculty,
      };
    });

    // Filter by faculty if provided
    if (facultyId) {
      const fid = Number(facultyId);
      rows = rows.filter((r: any) => r.assignedFaculty.some((f: any) => f.id === fid));
    }

    // Filter by days if provided
    if (days && typeof days === 'string') {
      const daysLower = days.toLowerCase();
      rows = rows.filter((r: any) => {
        const scheduleDaysLower = r.schedule.days.toLowerCase();
        return scheduleDaysLower.includes(daysLower) || 
               scheduleDaysLower.includes(daysLower.substring(0, 3));
      });
    }

    // Filter by time slot if provided
    if (time && typeof time === 'string') {
      rows = rows.filter((r: any) => {
        const timeStr = (r.schedule.time || '').toLowerCase();
        if (time === 'morning') {
          // Morning: before 12 PM (check for hours like 9, 10, 11)
          return /\b(9|10|11)\s*(am|a\.m\.|:)/i.test(timeStr) || 
                 timeStr.includes('am') && !/\b(12|1|2|3|4|5|6|7|8)\s*(pm|p\.m\.)/i.test(timeStr);
        } else if (time === 'afternoon') {
          // Afternoon: 12 PM - 5 PM
          return /\b(12|1|2|3|4|5)\s*(pm|p\.m\.|:)/i.test(timeStr);
        } else if (time === 'evening') {
          // Evening: after 5 PM
          return /\b(6|7|8|9|10|11)\s*(pm|p\.m\.|:)/i.test(timeStr);
        }
        return true;
      });
    }

    // Filter by min students
    if (minStudents) {
      const min = Number(minStudents);
      rows = rows.filter((r: any) => r.numberOfStudents >= min);
    }

    // Filter by max students
    if (maxStudents) {
      const max = Number(maxStudents);
      rows = rows.filter((r: any) => r.numberOfStudents <= max);
    }

    res.status(200).json({
      status: 'success',
      data: {
        filters: {
          type: type as string | undefined,
          facultyId: facultyId ? Number(facultyId) : undefined,
          days: days as string | undefined,
          batchName: batchName as string | undefined,
          minStudents: minStudents ? Number(minStudents) : undefined,
          maxStudents: maxStudents ? Number(maxStudents) : undefined,
          time: time as string | undefined,
        },
        rows,
        totalCount: rows.length,
      },
    });
  } catch (error) {
    logger.error('Get batch details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batch details',
    });
  }
};

export const getLecturePunchReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const facultyId = parseNumber(req.query.facultyId);
    const batchId = parseNumber(req.query.batchId);
    const software = typeof req.query.software === 'string' ? req.query.software : undefined;
    const daysFilter = typeof req.query.days === 'string' ? req.query.days : undefined;
    const dateRange = buildDateRange(req.query.from as string, req.query.to as string);

    const where: Record<string, unknown> = {};
    if (facultyId) where.facultyId = facultyId;
    if (batchId) where.batchId = batchId;
    if (dateRange) where.date = dateRange;

    let sessions = await db.Session.findAll({
      where,
      include: [
        { model: db.User, as: 'faculty', attributes: ['id', 'name', 'email'] },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software'],
          ...(software ? { where: { software } } : {}),
        },
      ],
      order: [['date', 'DESC'], ['actualStartAt', 'DESC']],
    });

    // Filter by days of week
    if (daysFilter) {
      const daysList = daysFilter.split(',').map((d: string) => d.trim().toUpperCase());
      const dayMap: Record<string, number> = {
        MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0,
        MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 0,
      };
      sessions = sessions.filter((session: any) => {
        const dayOfWeek = new Date(session.date).getDay();
        return daysList.some((day: string) => {
          const dayNum = dayMap[day] ?? parseInt(day);
          return dayNum === dayOfWeek;
        });
      });
    }

    const rows = sessions.map((s: any) => {
      const json = s.toJSON();
      return {
        sessionId: json.id,
        date: json.date,
        software: json.batch?.software ?? null,
        facultyName: json.faculty?.name ?? 'N/A',
        batchTitle: json.batch?.title ?? 'N/A',
        punchInAt: json.actualStartAt,
        punchOutAt: json.actualEndAt,
      };
    });

    if (maybeSendCsv(req, res, rows, 'lecture-punch-report.csv')) {
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        rows,
        summary: { sessions: rows.length },
      },
    });
  } catch (error) {
    logger.error('Lecture punch report error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate lecture punch report',
    });
  }
};

export const getBatchAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const batchId = parseNumber(req.query.batchId);
    const softwareFilter = req.query.software as string | undefined;
    const studentId = parseNumber(req.query.studentId);
    const facultyId = parseNumber(req.query.facultyId);
    const daysFilter = req.query.days as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const dateRange = buildDateRange(from, to);

    if (!batchId) {
      res.status(400).json({ status: 'error', message: 'batchId is required' });
      return;
    }

    const batch = await db.Batch.findByPk(batchId, {
      attributes: ['id', 'title', 'software', 'startDate', 'endDate'],
    });
    if (!batch) {
      res.status(404).json({ status: 'error', message: 'Batch not found' });
      return;
    }

    // Apply software filter — if batch software doesn't match, return empty
    if (softwareFilter && (batch as any).software !== softwareFilter) {
      res.status(200).json({
        status: 'success',
        data: {
          batch: { id: batch.id, title: batch.title, software: (batch as any).software },
          sessions: [],
          studentStatistics: [],
          totalSessions: 0,
          totalAttendances: 0,
        },
      });
      return;
    }

    const sessionWhere: any = { batchId };
    if (dateRange) sessionWhere.date = dateRange;
    if (facultyId) sessionWhere.facultyId = facultyId;

    let sessions = await db.Session.findAll({
      where: sessionWhere,
      include: [
        { model: db.Batch, as: 'batch', attributes: ['id', 'title', 'software'] },
        { model: db.User, as: 'faculty', attributes: ['id', 'name', 'email'] },
        {
          model: db.Attendance,
          as: 'attendances',
          required: false,
          where: studentId ? { studentId } : undefined,
          include: [
            { model: db.User, as: 'student', attributes: ['id', 'name', 'email'] },
            { model: db.User, as: 'marker', attributes: ['id', 'name'], required: false },
          ],
        },
      ],
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });

    // Filter by days of week
    if (daysFilter) {
      const daysList = daysFilter.split(',').map((d) => d.trim().toUpperCase());
      const dayMap: any = {
        MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0,
        MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 0,
      };
      sessions = sessions.filter((session: any) => {
        const dayOfWeek = new Date(session.date).getDay();
        return daysList.some((day) => {
          const dayNum = dayMap[day] ?? parseInt(day);
          return dayNum === dayOfWeek;
        });
      });
    }

    // Build session payload
    const sessionsPayload = sessions.map((s: any) => {
      const json = s.toJSON();
      const attendances = (json.attendances || []).map((a: any) => {
        let attendanceText = 'A';
        if (a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.MANUAL_PRESENT) {
          attendanceText = 'P';
        } else if (a.status === 'late') {
          attendanceText = 'LATE';
        } else if (a.status === 'online') {
          attendanceText = 'ONLINE';
        }
        return {
          id: a.id,
          studentId: a.studentId,
          studentName: a.student?.name || `Student ${a.studentId}`,
          studentEmail: a.student?.email || '',
          status: a.status,
          attendanceText,
          isManual: a.isManual,
          markedBy: a.marker ? { id: a.marker.id, name: a.marker.name } : undefined,
          markedAt: a.markedAt,
        };
      });
      return {
        session: {
          id: json.id,
          date: json.date,
          dayOfWeek: new Date(json.date).toLocaleDateString('en-US', { weekday: 'long' }),
          startTime: json.startTime,
          endTime: json.endTime,
          topic: json.topic,
          status: json.status,
          faculty: json.faculty?.name || 'N/A',
          software: json.batch?.software || 'N/A',
        },
        attendances,
      };
    });

    // Student statistics
    const statsMap = new Map<number, {
      studentId: number;
      studentName: string;
      present: number;
      absent: number;
      late: number;
      online: number;
      manualPresent: number;
    }>();

    sessionsPayload.forEach((row) => {
      row.attendances.forEach((a: any) => {
        if (!statsMap.has(a.studentId)) {
          statsMap.set(a.studentId, {
            studentId: a.studentId,
            studentName: a.studentName,
            present: 0,
            absent: 0,
            late: 0,
            online: 0,
            manualPresent: 0,
          });
        }
        const stat = statsMap.get(a.studentId)!;
        if (a.status === AttendanceStatus.ABSENT) stat.absent += 1;
        else if (a.status === 'late') stat.late += 1;
        else if (a.status === 'online') stat.online += 1;
        else if (a.status === AttendanceStatus.MANUAL_PRESENT) stat.manualPresent += 1;
        else stat.present += 1;
      });
    });

    const studentStatistics = Array.from(statsMap.values()).map((stat) => {
      const total = stat.present + stat.absent + stat.late + stat.online + stat.manualPresent;
      const attendanceRate = total ? ((stat.present / total) * 100).toFixed(2) : '0.00';
      return { ...stat, total, attendanceRate };
    });

    res.status(200).json({
      status: 'success',
      data: {
        batch: {
          id: batch.id,
          title: batch.title,
          software: (batch as any).software,
          startDate: (batch as any).startDate,
          endDate: (batch as any).endDate,
        },
        sessions: sessionsPayload,
        studentStatistics,
        totalSessions: sessionsPayload.length,
        totalAttendances: sessionsPayload.reduce((sum, r) => sum + r.attendances.length, 0),
      },
    });
  } catch (error) {
    logger.error('getBatchAttendance error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};


