import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import db from '../models';
import { SessionStatus } from '../models/Session';
import { AttendanceStatus } from '../models/Attendance';
import { logger } from '../utils/logger';
import { Op, Transaction } from 'sequelize';

type UiAttendanceStatus = 'present' | 'absent' | 'late' | 'online';

const mapUiStatusToDb = (status: UiAttendanceStatus): AttendanceStatus => {
  switch (status) {
    case 'absent':
      return AttendanceStatus.ABSENT;
    case 'late':
    case 'online':
      return AttendanceStatus.MANUAL_PRESENT;
    case 'present':
    default:
      return AttendanceStatus.PRESENT;
  }
};

const mapDbStatusToUi = (status: AttendanceStatus): UiAttendanceStatus => {
  switch (status) {
    case AttendanceStatus.ABSENT:
      return 'absent';
    case AttendanceStatus.MANUAL_PRESENT:
      return 'late';
    case AttendanceStatus.PRESENT:
    default:
      return 'present';
  }
};

const todayDate = (): Date => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const todayDateString = (): string => todayDate().toISOString().split('T')[0];

const ensureFacultyAccess = async (userId: number, batchId: number, role: UserRole): Promise<void> => {
  if (role === UserRole.SUPERADMIN || role === UserRole.ADMIN) {
    return;
  }

  const assignment = await db.BatchFacultyAssignment.findOne({
    where: { facultyId: userId, batchId },
  });

  if (!assignment) {
    const error = new Error('You are not assigned to this batch');
    error.name = 'UNAUTHORIZED_BATCH';
    throw error;
  }
};

// Debug endpoint to check faculty assignments
export const getFacultyAssignmentsDebug = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const facultyId = parseInt(req.params.facultyId, 10);
    if (isNaN(facultyId)) {
      res.status(400).json({ status: 'error', message: 'Invalid faculty ID' });
      return;
    }

    const faculty = await db.User.findOne({
      where: { id: facultyId, role: UserRole.FACULTY },
      attributes: ['id', 'email', 'name', 'role'],
    });

    if (!faculty) {
      res.status(404).json({ status: 'error', message: 'Faculty not found' });
      return;
    }

    const assignments = await db.BatchFacultyAssignment.findAll({
      where: { facultyId },
      include: [
        {
          model: db.Batch,
          as: 'batch',
          required: false,
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      data: {
        faculty: {
          id: faculty.id,
          email: faculty.email,
          name: faculty.name,
        },
        assignments: assignments.map((a) => {
          const assignmentJson = a.toJSON() as any;
          return {
            assignmentId: a.id,
            batchId: a.batchId,
            facultyId: a.facultyId,
            batch: assignmentJson.batch || null,
          };
        }),
        totalAssignments: assignments.length,
      },
    });
  } catch (error) {
    logger.error('Get faculty assignments debug error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

export const getFacultyAssignedBatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    logger.info(`Fetching assigned batches for faculty userId: ${req.user.userId}, email: ${req.user.email}`);

    // Verify the user exists and get their actual ID
    const facultyUser = await db.User.findOne({
      where: { id: req.user.userId },
      attributes: ['id', 'email', 'name', 'role'],
    });

    if (!facultyUser) {
      logger.error(`Faculty user not found: userId=${req.user.userId}`);
      res.status(404).json({
        status: 'error',
        message: 'Faculty user not found',
      });
      return;
    }

    logger.info(`Faculty user verified: id=${facultyUser.id}, email=${facultyUser.email}, role=${facultyUser.role}`);

    // Check all assignments for this faculty (for debugging)
    const allAssignments = await db.BatchFacultyAssignment.findAll({
      where: { facultyId: facultyUser.id },
      attributes: ['id', 'batchId', 'facultyId', 'createdAt'],
    });
    logger.info(`Total assignments found in database for faculty ${facultyUser.id}: ${allAssignments.length}`);
    if (allAssignments.length > 0) {
      logger.info(`Assignment batch IDs: ${allAssignments.map(a => a.batchId).join(', ')}`);
      
      // Verify batches exist
      const batchIds = allAssignments.map(a => a.batchId);
      const existingBatches = await db.Batch.findAll({
        where: { id: { [Op.in]: batchIds } },
        attributes: ['id', 'title', 'status'],
      });
      logger.info(`Existing batches: ${existingBatches.map(b => `${b.id}:${b.title}:${b.status}`).join(', ')}`);
      const missingBatchIds = batchIds.filter(id => !existingBatches.find(b => b.id === id));
      if (missingBatchIds.length > 0) {
        logger.warn(`Assignments reference non-existent batches: ${missingBatchIds.join(', ')}`);
      }
    } else {
      // Check if there are any assignments with this email (in case of ID mismatch)
      const userByEmail = await db.User.findOne({
        where: { email: facultyUser.email, role: UserRole.FACULTY },
        attributes: ['id', 'email'],
      });
      if (userByEmail && userByEmail.id !== facultyUser.id) {
        logger.warn(`Email ${facultyUser.email} matches different user ID: ${userByEmail.id} (current: ${facultyUser.id})`);
        const assignmentsByEmail = await db.BatchFacultyAssignment.findAll({
          where: { facultyId: userByEmail.id },
          attributes: ['id', 'batchId', 'facultyId'],
        });
        logger.info(`Found ${assignmentsByEmail.length} assignments for user ID ${userByEmail.id} (by email)`);
      }
    }

    // Get all assignments first
    const assignments = await db.BatchFacultyAssignment.findAll({
      where: { facultyId: facultyUser.id },
      order: [['createdAt', 'DESC']],
    });

    logger.info(`Found ${assignments.length} batch assignments for faculty ${facultyUser.id}`);

    if (assignments.length === 0) {
      logger.info(`No batch assignments found for faculty ${req.user.userId}`);
      res.status(200).json({
        status: 'success',
        data: [],
      });
      return;
    }

    // Get batch IDs
    const batchIds = assignments.map((assignment) => assignment.batchId);
    
    // Fetch all batches separately to ensure we get them
    const batches = await db.Batch.findAll({
      where: { id: { [Op.in]: batchIds } },
      order: [['createdAt', 'DESC']],
    });

    logger.info(`Found ${batches.length} batches for faculty ${facultyUser.id} out of ${batchIds.length} assigned batch IDs`);

    // Create a map of batchId -> batch for quick lookup
    const batchMap = new Map(batches.map(b => [b.id, b]));

    // Filter assignments to only those with valid batches
    const validAssignments = assignments.filter((assignment) => {
      return batchMap.has(assignment.batchId);
    });

    if (validAssignments.length === 0) {
      logger.warn(`No valid batches found for ${validAssignments.length} assignments. Batch IDs: ${batchIds.join(', ')}`);
      res.status(200).json({
        status: 'success',
        data: [],
      });
      return;
    }
    const startOfDay = todayDate();
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const activeSessions =
      batchIds.length === 0
        ? []
        : await db.Session.findAll({
            where: {
              batchId: { [Op.in]: batchIds },
              facultyId: req.user.userId,
              status: SessionStatus.ONGOING,
              actualEndAt: null,
              date: {
                [Op.gte]: startOfDay,
                [Op.lt]: endOfDay,
              },
            },
          });

    const data = validAssignments
      .map((assignment) => {
        const batch = batchMap.get(assignment.batchId);
        
        if (!batch) {
          logger.warn(`Assignment ${assignment.id} has no batch in map, skipping`);
          return null;
        }

        const session = activeSessions.find((s) => s.batchId === assignment.batchId) || null;
        return {
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
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt,
          },
          activeSession: session ? {
            id: session.id,
            batchId: session.batchId,
            facultyId: session.facultyId,
            date: session.date,
            topic: (session as any).topic,
            status: session.status,
            actualStartAt: (session as any).actualStartAt,
            actualEndAt: (session as any).actualEndAt,
          } : null,
        };
      })
      .filter((item) => item !== null);

    logger.info(`Returning ${data.length} batches for faculty ${req.user.userId}`);

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    logger.error('Get faculty assigned batches failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch assigned batches',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
    });
  }
};

export const startSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const batchId = Number(req.params.batchId);
    if (Number.isNaN(batchId)) {
      res.status(400).json({ status: 'error', message: 'Invalid batch ID' });
      return;
    }

    await ensureFacultyAccess(req.user.userId, batchId, req.user.role);

    // Get batch to check schedule
    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({ status: 'error', message: 'Batch not found' });
      return;
    }

    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todaySchedule =
      batch.schedule && typeof batch.schedule === 'object'
        ? batch.schedule[dayNames[now.getDay()]]
        : undefined;
    const scheduledStartTime = todaySchedule?.startTime ?? '00:00:00';
    const scheduledEndTime = todaySchedule?.endTime ?? '00:00:00';

    // Check if faculty has ANY active session across ALL batches
    // Faculty can only have one active session at a time
    const anyActiveSession = await db.Session.findOne({
      where: {
        facultyId: req.user.userId,
        date: todayDateString(),
        actualEndAt: null,
        actualStartAt: { [Op.ne]: null },
      },
      include: [
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title'],
        },
      ],
    });

    if (anyActiveSession) {
      res.status(400).json({
        status: 'error',
        message: `You already have an active session running for batch "${(anyActiveSession as any).batch?.title || 'Unknown'}" (Batch #${anyActiveSession.batchId}). Please end that session before starting a new one.`,
      });
      return;
    }

    // Check for open session in this specific batch (for resuming)
    const openSession = await db.Session.findOne({
      where: {
        batchId,
        facultyId: req.user.userId,
        date: todayDateString(),
        actualEndAt: null,
      },
    });

    if (openSession && openSession.actualStartAt) {
      res.status(400).json({
        status: 'error',
        message: 'You already have an ongoing session for this batch today',
      });
      return;
    }
    let session = openSession;

    if (session) {
      session = await session.update({
        actualStartAt: now,
        status: SessionStatus.ONGOING,
        startTime: scheduledStartTime,
        endTime: scheduledEndTime,
      });
    } else {
      session = await db.Session.create({
        batchId,
        facultyId: req.user.userId,
        date: todayDate(),
        startTime: scheduledStartTime,
        endTime: scheduledEndTime,
        topic: req.body.topic ?? null,
        status: SessionStatus.ONGOING,
        actualStartAt: now,
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Session started',
      data: session,
    });
  } catch (error) {
    logger.error('Start session failed', error);
    if (error instanceof Error && error.name === 'UNAUTHORIZED_BATCH') {
      res.status(403).json({ status: 'error', message: error.message });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to start session',
    });
  }
};

export const endSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const sessionId = Number(req.params.sessionId);
    if (Number.isNaN(sessionId)) {
      res.status(400).json({ status: 'error', message: 'Invalid session ID' });
      return;
    }

    const session = await db.Session.findByPk(sessionId);

    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }

    await ensureFacultyAccess(req.user.userId, session.batchId, req.user.role);

    if (!session.actualStartAt) {
      res.status(400).json({ status: 'error', message: 'Session has not been started yet' });
      return;
    }

    if (session.actualEndAt) {
      res.status(400).json({ status: 'error', message: 'Session already ended' });
      return;
    }

    const updatedSession = await session.update({
      actualEndAt: new Date(),
      status: SessionStatus.COMPLETED,
    });

    res.status(200).json({
      status: 'success',
      message: 'Session ended',
      data: updatedSession,
    });
  } catch (error) {
    logger.error('End session failed', error);
    if (error instanceof Error && error.name === 'UNAUTHORIZED_BATCH') {
      res.status(403).json({ status: 'error', message: error.message });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to end session',
    });
  }
};

export const submitSessionAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const sessionId = Number(req.params.sessionId);
    if (Number.isNaN(sessionId)) {
      res.status(400).json({ status: 'error', message: 'Invalid session ID' });
      return;
    }

    const { attendance } = req.body as {
      attendance: Array<{ studentId: number; status?: UiAttendanceStatus; present?: boolean }>;
    };

    if (!Array.isArray(attendance) || attendance.length === 0) {
      res.status(400).json({ status: 'error', message: 'Attendance payload required' });
      return;
    }

    const session = await db.Session.findByPk(sessionId);
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }

    await ensureFacultyAccess(req.user.userId, session.batchId, req.user.role);

    if (!session.actualStartAt) {
      res.status(400).json({ status: 'error', message: 'Start the session before marking attendance' });
      return;
    }

    const studentIds = attendance.map((record) => record.studentId);

    const enrolledStudents = await db.Enrollment.findAll({
      where: {
        batchId: session.batchId,
        studentId: { [Op.in]: studentIds },
      },
    });
    const allowedStudentIds = new Set(enrolledStudents.map((enroll) => enroll.studentId));

    const transaction: Transaction = await db.sequelize.transaction();
    try {
      const results: Array<{ studentId: number; status: UiAttendanceStatus }> = [];

      for (const record of attendance) {
        if (!allowedStudentIds.has(record.studentId)) {
          continue;
        }

        const uiStatus: UiAttendanceStatus =
          record.status ?? (record.present ? 'present' : 'absent');
        const dbStatus = mapUiStatusToDb(uiStatus);
        await db.Attendance.upsert(
          {
            sessionId: session.id,
            studentId: record.studentId,
            status: dbStatus,
            isManual: true,
            markedBy: req.user.userId,
            markedAt: new Date(),
          },
          { transaction }
        );

        results.push({ studentId: record.studentId, status: uiStatus });
      }

      await transaction.commit();

      res.status(200).json({
        status: 'success',
        message: 'Attendance submitted',
        data: results,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Submit attendance failed', error);
    if (error instanceof Error && error.name === 'UNAUTHORIZED_BATCH') {
      res.status(403).json({ status: 'error', message: error.message });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to submit attendance',
    });
  }
};

// GET /sessions/batch/:batchId/history → Get batch session history
export const getBatchHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const batchId = Number(req.params.batchId);
    if (Number.isNaN(batchId)) {
      res.status(400).json({ status: 'error', message: 'Invalid batch ID' });
      return;
    }

    // Verify faculty has access to this batch
    await ensureFacultyAccess(req.user.userId, batchId, req.user.role);

    const sessions = await db.Session.findAll({
      where: {
        batchId,
        facultyId: req.user.userId,
      },
      include: [
        {
          model: db.Attendance,
          as: 'attendances',
          include: [
            {
              model: db.User,
              as: 'student',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
      ],
      order: [['date', 'DESC'], ['actualStartAt', 'DESC']],
      limit: 100, // Limit to last 100 sessions
    });

    const history = sessions.map((session) => {
      const sessionData = session.toJSON() as any;
      const attendances = sessionData.attendances || [];
      const presentCount = attendances.filter(
        (a: any) =>
          a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.MANUAL_PRESENT
      ).length;
      const absentCount = attendances.filter((a: any) => a.status === AttendanceStatus.ABSENT).length;
      const lateCount = attendances.filter((a: any) => a.status === AttendanceStatus.MANUAL_PRESENT).length;

      return {
        id: session.id,
        date: session.date,
        topic: sessionData.topic,
        status: session.status,
        actualStartAt: sessionData.actualStartAt,
        actualEndAt: sessionData.actualEndAt,
        attendance: {
          total: attendances.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          students: attendances.map((a: any) => ({
            studentId: a.studentId,
            studentName: a.student?.name || 'Unknown',
            studentEmail: a.student?.email || '',
            status: mapDbStatusToUi(a.status as AttendanceStatus),
            markedAt: a.markedAt,
          })),
        },
      };
    });

    res.status(200).json({
      status: 'success',
      data: history,
    });
  } catch (error) {
    logger.error('Get batch history failed', error);
    if (error instanceof Error && error.name === 'UNAUTHORIZED_BATCH') {
      res.status(403).json({ status: 'error', message: error.message });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch batch history',
    });
  }
};

export default {
  getFacultyAssignedBatches,
  getFacultyAssignmentsDebug,
  startSession,
  endSession,
  submitSessionAttendance,
  getBatchHistory,
};


