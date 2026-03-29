import { Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';
import { AttendanceStatus } from '../models/Attendance';

const saveReport = async (reportType: string, reportName: string, generatedBy: number, data: any, parameters?: any, summary?: any) => {
  try {
    let recordCount = 0;
    
    // Calculate record count based on data structure
    if (Array.isArray(data)) {
      recordCount = data.length;
    } else if (data && typeof data === 'object') {
      // Count arrays in the data object
      const countArrays = (obj: any): number => {
        if (Array.isArray(obj)) return obj.length;
        if (typeof obj === 'object' && obj !== null) {
          return Object.values(obj).reduce((sum: number, val: any) => sum + countArrays(val), 0);
        }
        return 0;
      };
      recordCount = countArrays(data);
    }

    await db.Report.create({
      reportType,
      reportName,
      generatedBy,
      data,
      parameters,
      summary,
      recordCount,
      status: 'completed',
    });
  } catch (error) {
    logger.error(`Failed to save report ${reportType}:`, error);
  }
};

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
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

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

    const responseData = { rows, summary };

    // Save report to database
    await saveReport(
      'faculty-attendance',
      `Faculty Attendance Report`,
      req.user.userId,
      responseData,
      { facultyId, batchId, ...(dateRange && { from: dateRange[Op.gte], to: dateRange[Op.lte] }) },
      summary
    );

    res.status(200).json({
      status: 'success',
      data: responseData,
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
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const batchId = parseNumber(req.query.batchId);
    const studentId = parseNumber(req.query.studentId);
    const facultyId = parseNumber(req.query.facultyId);
    const software = typeof req.query.software === 'string' ? req.query.software : undefined;
    const dateRange = buildDateRange(req.query.from as string, req.query.to as string);

    const sessionWhere: Record<string, unknown> = {};
    if (batchId) sessionWhere.batchId = batchId;
    if (facultyId) sessionWhere.facultyId = facultyId;
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
          include: [{
            model: db.Batch,
            as: 'batch',
            attributes: ['id', 'title', 'software'],
            ...(software ? { where: { software } } : {}),
          }],
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
      manualPresent: number;
      A: number;
      P: number;
      LATE: number;
      ONLINE: number;
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
          manualPresent: 0,
          A: 0,
          P: 0,
          LATE: 0,
          ONLINE: 0,
        });
      }
      const stat = statsMap.get(student.id)!;
      if (recordJson.status === AttendanceStatus.ABSENT) {
        stat.absent += 1;
        stat.A += 1;
      } else if (recordJson.status === AttendanceStatus.MANUAL_PRESENT) {
        stat.manualPresent += 1;
        // Legacy DB does not distinguish LATE vs ONLINE, keep LATE by default.
        stat.LATE += 1;
      } else {
        stat.present += 1;
        stat.P += 1;
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

    const summary = {
      students: rows.length,
      averageRate:
        rows.length > 0
          ? (rows.reduce((sum, row) => sum + Number(row.attendanceRate), 0) / rows.length).toFixed(2)
          : '0.00',
    };

    const responseData = {
      batchId: batchId ?? null,
      rows,
      summary,
    };

    // Save report to database
    await saveReport(
      'student-attendance',
      `Student Attendance Report`,
      req.user.userId,
      responseData,
      { batchId, studentId, facultyId, software, ...(dateRange && { from: dateRange[Op.gte], to: dateRange[Op.lte] }) },
      summary
    );

    res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    logger.error('Student attendance report error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate student attendance report',
    });
  }
};

export const getLecturePunchReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const facultyId = parseNumber(req.query.facultyId);
    const batchId = parseNumber(req.query.batchId);
    const software = typeof req.query.software === 'string' ? req.query.software : undefined;
    const dateRange = buildDateRange(req.query.from as string, req.query.to as string);

    const where: Record<string, unknown> = {};
    if (facultyId) where.facultyId = facultyId;
    if (batchId) where.batchId = batchId;
    if (dateRange) where.date = dateRange;

    const sessions = await db.Session.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'faculty',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software'],
          ...(software ? { where: { software } } : {}),
        },
      ],
      order: [['date', 'DESC'], ['actualStartAt', 'DESC']],
    });

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
        summary: {
          sessions: rows.length,
        },
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

    // Allow faculty to view student list for task creation dropdown.
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.FACULTY) {
      res.status(403).json({
        status: 'error',
        message: 'Not allowed',
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
    logger.info('Fetching students without batch report');
    
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

    // Get all students (active)
    logger.info('Starting students without batch query...');
    const allStudents = await db.User.findAll({
      where: {
        role: UserRole.STUDENT,
        isActive: true,
      },
      attributes: ['id', 'name', 'email', 'phone', 'avatarUrl', 'createdAt'],
      include: [
        {
          model: db.StudentProfile,
          as: 'studentProfile',
          required: false,
        },
        {
          model: db.Enrollment,
          as: 'enrollments',
          required: false,
          include: [
            {
              model: db.Batch,
              as: 'batch',
              attributes: ['id', 'title', 'status', 'software', 'endDate'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    logger.info(`Found ${allStudents.length} total students`);

    // Filter students with no active enrollments
    const studentsWithoutBatch = allStudents
      .filter((student: any) => {
        const enrollments = student.enrollments || [];
        return enrollments.length === 0 || enrollments.every((e: any) => e.status !== 'active');
      })
      .map((student: any) => {
        const studentJson = student.toJSON ? student.toJSON() : student;
        const profile = studentJson.studentProfile;
        const enrollments = studentJson.enrollments || [];

        // Last batch finished date = max endDate among enrollments (if any)
        const finishedBatches = enrollments
          .map((e: any) => e.batch)
          .filter(Boolean)
          .filter((b: any) => b.endDate)
          .sort((a: any, b: any) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
        const lastFinished = finishedBatches[0] || null;

        // Last software attended = software of last finished batch (fallback null)
        const lastSoftwareAttended = lastFinished?.software ?? null;

        // Last batch faculty (best-effort): latest session for that batch (any faculty)
        // NOTE: executed lazily later via Promise.all to avoid N+1 in map
        return {
          id: studentJson.id,
          name: studentJson.name,
          email: studentJson.email,
          phone: studentJson.phone,
          doj: profile?.enrollmentDate || studentJson.createdAt,
          lastSoftwareAttended,
          lastBatchFinishedDate: lastFinished?.endDate || null,
          status: profile?.status || null,
          lastBatchFaculty: null as null | { id: number; name: string },
        };
      });

    // Enrich lastBatchFaculty (best-effort, limited to first 200 rows)
    const limited = studentsWithoutBatch.slice(0, 200);
    await Promise.all(
      limited.map(async (s: any) => {
        try {
          if (!s.lastBatchFinishedDate || !s.id) return;
          // Find latest ended enrollment batch for this student
          const enrollment = await db.Enrollment.findOne({
            where: { studentId: s.id },
            include: [{ model: db.Batch, as: 'batch', required: true }],
            order: [[{ model: db.Batch, as: 'batch' }, 'endDate', 'DESC']],
          });
          const batchId = enrollment?.batchId;
          if (!batchId) return;
          const lastSession = await db.Session.findOne({
            where: { batchId },
            include: [{ model: db.User, as: 'faculty', attributes: ['id', 'name'], required: false }],
            order: [['date', 'DESC'], ['actualStartAt', 'DESC']],
          });
          const fac = (lastSession as any)?.faculty;
          if (fac && fac.id && fac.name) {
            s.lastBatchFaculty = { id: fac.id, name: fac.name };
          }
        } catch (error) {
          // ignore enrichment failures silently
          console.error('Failed to enrich faculty for student:', s.id, error);
        }
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        students: studentsWithoutBatch,
        totalCount: studentsWithoutBatch.length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    
    logger.error('Get students without batch error:', error);
    logger.error('Error message:', errorMessage);
    logger.error('Stack trace:', errorStack);
    
    res.status(500).json({
      status: 'error',
      message: `Internal server error while fetching students: ${errorMessage}`,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
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
  };
};

// GET /reports/saved - Get all saved reports (Superadmin only)
export const getSavedReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { reportType, page = '1', limit = '20', from, to } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (reportType) where.reportType = reportType;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = from;
      if (to) where.createdAt[Op.lte] = to;
    }

    const reports = await db.Report.findAll({
      where,
      include: [{
        model: db.User,
        as: 'generator',
        attributes: ['id', 'name', 'email', 'role'],
      }],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
    });

    const total = await db.Report.count({ where });

    res.status(200).json({
      status: 'success',
      data: {
        reports,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get saved reports error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch saved reports',
    });
  }
};

// GET /reports/saved/:id - Get single saved report details (Superadmin only)
export const getSavedReportDetails = async (req: AuthRequest & { params: { id: string } }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const report = await db.Report.findByPk(req.params.id, {
      include: [{
        model: db.User,
        as: 'generator',
        attributes: ['id', 'name', 'email', 'role'],
      }],
    });

    if (!report) {
      res.status(404).json({
        status: 'error',
        message: 'Report not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    logger.error('Get saved report details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch report details',
    });
  }
};

// GET /reports/saved/:id/download - Download saved report as CSV (Superadmin only)
export const downloadSavedReportCSV = async (req: AuthRequest & { params: { id: string } }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const report = await db.Report.findByPk(req.params.id);
    if (!report) {
      res.status(404).json({
        status: 'error',
        message: 'Report not found',
      });
      return;
    }

    // Convert report data to CSV
    const reportData = report.data as any;
    let csvContent = '';
    
    // Add report metadata as comments
    csvContent += `# Report: ${report.reportName}\n`;
    csvContent += `# Type: ${report.reportType}\n`;
    csvContent += `# Generated: ${new Date(report.createdAt).toLocaleString()}\n`;
    csvContent += `# Records: ${report.recordCount || 'N/A'}\n`;
    csvContent += `\n`;
    
    // Handle different report types intelligently based on ACTUAL data structure
    if (report.reportType === 'batch-attendance') {
      // Batch Attendance Report - sessions array with nested attendances
      csvContent += 'Session Date,Session Time,Topic,Status,Student Name,Student Email,Attendance Status,Marked At,Marked By\n';
      let hasData = false;
      if (reportData.sessions && Array.isArray(reportData.sessions)) {
        reportData.sessions.forEach((session: any) => {
          if (session.session && session.attendances && Array.isArray(session.attendances)) {
            hasData = true;
            session.attendances.forEach((att: any) => {
              const date = session.session.date || '';
              const time = `${session.session.startTime || ''}-${session.session.endTime || ''}`;
              const topic = session.session.topic || '';
              const status = session.session.status || '';
              const studentName = att.studentName || '';
              const studentEmail = att.studentEmail || '';
              const attStatus = att.status || '';
              const markedAt = att.markedAt ? new Date(att.markedAt).toLocaleString() : '';
              const markedBy = att.markedBy?.name || '';
              csvContent += `${date},${time},${topic},${status},${studentName},${studentEmail},${attStatus},${markedAt},${markedBy}\n`;
            });
          }
        });
      }
      // Add summary at the end
      csvContent += `\n# Summary\n`;
      csvContent += `Total Sessions,${hasData ? reportData.totalSessions || 0 : 0}\n`;
      csvContent += `Total Attendances,${hasData ? reportData.totalAttendances || 0 : 0}\n`;
      csvContent += `Batch Title,${reportData.batch?.title || 'N/A'}\n`;
      csvContent += `Batch Start Date,${reportData.batch?.startDate ? new Date(reportData.batch.startDate).toLocaleDateString() : 'N/A'}\n`;
      csvContent += `Batch End Date,${reportData.batch?.endDate ? new Date(reportData.batch.endDate).toLocaleDateString() : 'N/A'}\n`;
      
    } else if (report.reportType === 'pending-payments') {
      // Pending Payments Report - matches EXACT data structure
      csvContent += 'Student Name,Email,Phone,Amount,Due Date,Is Overdue,Status,Created At\n';
      if (reportData.payments && Array.isArray(reportData.payments)) {
        reportData.payments.forEach((p: any) => {
          const student = p.student || {};
          const dueDate = p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '';
          const createdAt = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '';
          csvContent += `${student.name || ''},${student.email || ''},${student.phone || ''},${Number(p.amount || 0)},${dueDate},${p.isOverdue ? 'Yes' : 'No'},${p.status},${createdAt}\n`;
        });
      }
      // Add summary
      csvContent += `\n# Summary\n`;
      csvContent += `Total Pending Count,${reportData.summary?.totalPending || 0}\n`;
      csvContent += `Total Pending Amount,₹${reportData.summary?.totalPendingAmount || 0}\n`;
      csvContent += `Overdue Count,${reportData.summary?.overdue?.count || 0}\n`;
      csvContent += `Overdue Amount,₹${reportData.summary?.overdue?.amount || 0}\n`;
      csvContent += `Upcoming Count,${reportData.summary?.upcoming?.count || 0}\n`;
      csvContent += `Upcoming Amount,₹${reportData.summary?.upcoming?.amount || 0}\n`;
      
    } else if (report.reportType === 'portfolio-status') {
      // Portfolio Status Report
      csvContent += 'Student Name,Batch Title,Status,Files Count,Submitted At\n';
      if (reportData.portfolios && Array.isArray(reportData.portfolios)) {
        reportData.portfolios.forEach((p: any) => {
          const filesCount = Object.keys(p.files || {}).length;
          csvContent += `${p.student?.name || ''},${p.batch?.title || ''},${p.status || ''},${filesCount},${p.submittedAt || ''}\n`;
        });
      }
      
    } else if (report.reportType === 'faculty-occupancy') {
      // Faculty Occupancy Report
      csvContent += 'Faculty Name,Working Hours,Occupied Hours,Free Hours,Occupancy %\n';
      if (reportData.rows && Array.isArray(reportData.rows)) {
        reportData.rows.forEach((r: any) => {
          csvContent += `${r.facultyName || ''},${r.workingHours || 0},${r.occupiedHours || 0},${r.freeHours || 0},${r.occupancyPercent || 0}%\n`;
        });
      }
      // Add summary
      csvContent += `\n# Summary\n`;
      csvContent += `Working Hours,${reportData.summary?.workingHours || 0}\n`;
      csvContent += `Occupied Hours,${reportData.summary?.occupiedHours || 0}\n`;
      csvContent += `Free Hours,${reportData.summary?.freeHours || 0}\n`;
      csvContent += `Overall Occupancy %,${reportData.summary?.occupancyPercent || 0}%\n`;
      
    } else if (report.reportType === 'batch-details') {
      // Batch Details Report - matches actual data structure
      csvContent += 'Batch Name,Student Count,Schedule,Assigned Faculty\n';
      if (reportData.rows && Array.isArray(reportData.rows)) {
        reportData.rows.forEach((r: any) => {
          const scheduleStr = r.schedule ? JSON.stringify(r.schedule) : '';
          const facultyNames = (r.assignedFaculty || []).map((f: any) => f.name).join('; ');
          csvContent += `${r.batchName || ''},${r.numberOfStudents || 0},${scheduleStr},${facultyNames}\n`;
        });
      }
      
    } else if (report.reportType === 'all-analysis') {
      // All Analysis Report - Multiple sections with detailed data
      csvContent += '# STUDENTS SUMMARY\n';
      csvContent += `Total Students,${reportData.summary?.students?.total || 0}\n`;
      csvContent += `With Batch,${reportData.summary?.students?.withBatch || 0}\n`;
      csvContent += `Without Batch,${reportData.summary?.students?.withoutBatch || 0}\n`;
      csvContent += `\n# BATCHES SUMMARY\n`;
      csvContent += `Total Batches,${reportData.summary?.batches?.total || 0}\n`;
      csvContent += `Active Batches,${reportData.summary?.batches?.active || 0}\n`;
      csvContent += `Ended Batches,${reportData.summary?.batches?.ended || 0}\n`;
      csvContent += `\n# SESSIONS SUMMARY\n`;
      csvContent += `Total Sessions,${reportData.summary?.sessions?.total || 0}\n`;
      csvContent += `\n# PAYMENTS SUMMARY\n`;
      csvContent += `Total Transactions,${reportData.summary?.payments?.total || 0}\n`;
      csvContent += `Pending Transactions,${reportData.summary?.payments?.pending || 0}\n`;
      csvContent += `Total Amount,₹${reportData.summary?.payments?.totalAmount || 0}\n`;
      csvContent += `Paid Amount,₹${reportData.summary?.payments?.paidAmount || 0}\n`;
      csvContent += `Pending Amount,₹${reportData.summary?.payments?.pendingAmount || 0}\n`;
      csvContent += `\n# PORTFOLIOS SUMMARY\n`;
      csvContent += `Total Portfolios,${reportData.summary?.portfolios?.total || 0}\n`;
      csvContent += `Pending Portfolios,${reportData.summary?.portfolios?.pending || 0}\n`;
      csvContent += `Approved Portfolios,${reportData.summary?.portfolios?.approved || 0}\n`;
      csvContent += `Rejected Portfolios,${reportData.summary?.portfolios?.rejected || 0}\n`;
      csvContent += `\n# Report Generated At,${reportData.generatedAt ? new Date(reportData.generatedAt).toLocaleString() : ''}\n`;
      
    } else if (Array.isArray(reportData.rows) || Array.isArray(reportData.students)) {
      // Generic array-based report
      const rows = reportData.rows || reportData.students;
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        csvContent += headers.join(',') + '\n';
        rows.forEach((row: any) => {
          const values = headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          csvContent += values.join(',') + '\n';
        });
      }
    } else {
      // Fallback: Generic key-value export
      csvContent += 'Key,Value\n';
      Object.entries(reportData).forEach(([key, value]) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        csvContent += `"${key}","${stringValue.replace(/"/g, '""')}"\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportType}_${report.id}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Download saved report CSV error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download report',
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
  getLecturePunchReport,
  getSavedReports,
  getSavedReportDetails,
  downloadSavedReportCSV,
};


