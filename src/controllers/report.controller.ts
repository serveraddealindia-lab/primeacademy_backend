import { Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { AttendanceStatus } from '../models/Attendance';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

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
      data: data as any,
      parameters: parameters as any,
      summary: summary as any,
      recordCount,
      status: 'completed',
    });
  } catch (error) {
    logger.error(`Failed to save report ${reportType}:`, error);
  }
};

const parseNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return parseNumber(value[0]);
  if (typeof value === 'object') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

const buildDateRange = (from?: string, to?: string) => {
  if (!from && !to) return undefined;
  const range: any = {};
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;
  return range;
};

const sessionDurationHours = (session: any): number => {
  const start = session.actualStartAt ? new Date(session.actualStartAt) : null;
  const end = session.actualEndAt ? new Date(session.actualEndAt) : null;
  if (start && end && end > start) return (end.getTime() - start.getTime()) / 36e5;
  // fallback to scheduled time if present
  const st = typeof session.startTime === 'string' ? session.startTime : null;
  const et = typeof session.endTime === 'string' ? session.endTime : null;
  if (st && et) {
    const [sh, sm] = st.split(':').map(Number);
    const [eh, em] = et.split(':').map(Number);
    if (![sh, sm, eh, em].some((n) => Number.isNaN(n))) {
      const mins = eh * 60 + em - (sh * 60 + sm);
      if (mins > 0) return mins / 60;
    }
  }
  return 1; // safe default
};

export const getBatchAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const batchId = parseNumber(req.query.batchId);
    if (!batchId) {
      res.status(400).json({ status: 'error', message: 'batchId is required' });
      return;
    }

    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const dateRange = buildDateRange(from, to);
    const facultyId = parseNumber(req.query.facultyId);
    const studentId = parseNumber(req.query.studentId);

    const sessionWhere: any = { batchId };
    if (dateRange) sessionWhere.date = dateRange;
    if (facultyId) sessionWhere.facultyId = facultyId;

    const batch = await db.Batch.findByPk(batchId, { attributes: ['id', 'title', 'startDate', 'endDate'] });
    if (!batch) {
      res.status(404).json({ status: 'error', message: 'Batch not found' });
      return;
    }

    const sessions = await db.Session.findAll({
      where: sessionWhere,
      include: [
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

    const sessionsPayload = sessions.map((s: any) => {
      const json = s.toJSON();
      return {
        session: {
          id: json.id,
          date: json.date,
          startTime: json.startTime,
          endTime: json.endTime,
          topic: json.topic,
          status: json.status,
        },
        attendances: (json.attendances || []).map((a: any) => ({
          id: a.id,
          studentId: a.studentId,
          studentName: a.student?.name || `Student ${a.studentId}`,
          studentEmail: a.student?.email || '',
          status: a.status,
          isManual: a.isManual,
          markedBy: a.marker ? { id: a.marker.id, name: a.marker.name } : undefined,
          markedAt: a.markedAt,
        })),
      };
    });

    // Student statistics
    const statsMap = new Map<number, { studentId: number; present: number; absent: number; manualPresent: number }>();
    sessionsPayload.forEach((row) => {
      row.attendances.forEach((a: any) => {
        if (!statsMap.has(a.studentId)) {
          statsMap.set(a.studentId, { studentId: a.studentId, present: 0, absent: 0, manualPresent: 0 });
        }
        const stat = statsMap.get(a.studentId)!;
        if (a.status === AttendanceStatus.ABSENT) stat.absent += 1;
        else if (a.status === AttendanceStatus.MANUAL_PRESENT) stat.manualPresent += 1;
        else stat.present += 1;
      });
    });

    const studentStatistics = Array.from(statsMap.values()).map((stat) => {
      const total = stat.present + stat.absent + stat.manualPresent;
      const attendanceRate = total ? ((stat.present / total) * 100).toFixed(2) : '0.00';
      return { ...stat, total, attendanceRate };
    });

    const responseData = {
      batch: { id: batch.id, title: batch.title, startDate: (batch as any).startDate, endDate: (batch as any).endDate },
      dateRange: from || to ? { from: from || '', to: to || '' } : undefined,
      sessions: sessionsPayload,
      studentStatistics,
      totalSessions: sessionsPayload.length,
      totalAttendances: sessionsPayload.reduce((sum, r) => sum + r.attendances.length, 0),
    };

    // Save report to database
    await saveReport(
      'batch-attendance',
      `Batch Attendance - ${batch.title}`,
      req.user.userId,
      responseData,
      { batchId, from, to, facultyId, studentId },
      { totalSessions: sessionsPayload.length, totalAttendances: responseData.totalAttendances }
    );

    res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    logger.error('Batch attendance report failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate batch attendance report' });
  }
};

export const getPendingPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const payments = await db.PaymentTransaction.findAll({
      where: { status: 'pending' },
      include: [{ model: db.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'] }],
      order: [['dueDate', 'ASC']],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = payments.map((p: any) => {
      const due = p.dueDate ? new Date(p.dueDate) : null;
      const isOverdue = !!(due && due < today);
      return {
        id: p.id,
        student: p.student ? { id: p.student.id, name: p.student.name, email: p.student.email, phone: p.student.phone } : { id: p.studentId, name: 'Unknown', email: '', phone: '' },
        amount: Number(p.amount || 0),
        dueDate: p.dueDate,
        status: p.status,
        isOverdue,
        createdAt: p.createdAt,
      };
    });

    const totalPendingAmount = rows.reduce((sum, r) => sum + r.amount, 0);
    const overdueRows = rows.filter((r) => r.isOverdue);
    const upcomingRows = rows.filter((r) => !r.isOverdue);

    const responseData = {
      payments: rows,
      summary: {
        totalPending: rows.length,
        totalPendingAmount: totalPendingAmount.toFixed(2),
        overdue: { count: overdueRows.length, amount: overdueRows.reduce((s, r) => s + r.amount, 0).toFixed(2) },
        upcoming: { count: upcomingRows.length, amount: upcomingRows.reduce((s, r) => s + r.amount, 0).toFixed(2) },
      },
    };

    // Save report to database
    await saveReport(
      'pending-payments',
      'Pending Payments Report',
      req.user.userId,
      responseData,
      {},
      responseData.summary
    );

    res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    logger.error('Pending payments report failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate pending payments report' });
  }
};

export const getPortfolioStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const portfolios = await db.Portfolio.findAll({
      include: [
        { model: db.User, as: 'student', attributes: ['id', 'name', 'email'] },
        { model: db.Batch, as: 'batch', attributes: ['id', 'title', 'status'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const rows = portfolios.map((p: any) => {
      const json = p.toJSON();
      return {
        id: json.id,
        student: json.student,
        batch: json.batch,
        status: json.status,
        files: json.files || {},
        approvedBy: json.approvedBy ?? null,
        approvedAt: json.approvedAt ?? null,
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
      };
    });

    const summary = {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
    };

    const responseData = {
      portfolios: rows,
      summary,
      byStatus: {
        pending: rows.filter((r) => r.status === 'pending').map((r) => ({ id: r.id, studentName: r.student?.name, batchTitle: r.batch?.title, createdAt: r.createdAt })),
        approved: rows.filter((r) => r.status === 'approved').map((r) => ({ id: r.id, studentName: r.student?.name, batchTitle: r.batch?.title, approvedAt: r.approvedAt || r.updatedAt })),
        rejected: rows.filter((r) => r.status === 'rejected').map((r) => ({ id: r.id, studentName: r.student?.name, batchTitle: r.batch?.title, updatedAt: r.updatedAt })),
      },
    };

    // Save report to database
    await saveReport(
      'portfolio-status',
      'Portfolio Status Report',
      req.user.userId,
      responseData,
      {},
      summary
    );

    res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    logger.error('Portfolio status report failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate portfolio status report' });
  }
};

export const getAllAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const studentsTotal = await db.User.count({ where: { role: UserRole.STUDENT } });

    const batchesTotal = await db.Batch.count();
    const batchesActive = await db.Batch.count({ where: { status: 'active' } });
    const batchesEnded = await db.Batch.count({ where: { status: 'ended' } });
    const sessionsTotal = await db.Session.count();

    const paymentsTotal = await db.PaymentTransaction.count();
    const paymentsPending = await db.PaymentTransaction.count({ where: { status: 'pending' } });
    const paymentsRows = await db.PaymentTransaction.findAll({ attributes: ['amount', 'status'] });
    const totalAmount = paymentsRows.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const paidAmount = paymentsRows.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const pendingAmount = paymentsRows.filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const portfoliosTotal = await db.Portfolio.count();
    const portfoliosPending = await db.Portfolio.count({ where: { status: 'pending' } });

    const responseData = {
      summary: {
        students: {
          total: studentsTotal,
          withBatch: studentsTotal - (await db.User.count({ where: { role: UserRole.STUDENT, id: { [Op.notIn]: db.sequelize.literal('(SELECT DISTINCT studentId FROM enrollments)') } } }).catch(() => 0)),
          withoutBatch: 0, // frontend already uses dedicated report
        },
        batches: { total: batchesTotal, active: batchesActive, ended: batchesEnded },
        sessions: { total: sessionsTotal },
        payments: { total: paymentsTotal, pending: paymentsPending, totalAmount, paidAmount, pendingAmount },
        portfolios: { total: portfoliosTotal, pending: portfoliosPending },
      },
      generatedAt: new Date().toISOString(),
    };

    // Save report to database
    await saveReport(
      'all-analysis',
      'Complete System Analysis',
      req.user.userId,
      responseData,
      {},
      responseData.summary
    );

    res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    logger.error('All analysis report failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate analysis report' });
  }
};

export const getFacultyOccupancyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('Fetching faculty occupancy report');
    
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const facultyId = parseNumber(req.query.facultyId);
    const from = (req.query.from as string | undefined) || dateOnly(new Date(Date.now() - 7 * 24 * 3600 * 1000));
    const to = (req.query.to as string | undefined) || dateOnly(new Date());

    const dateRange = buildDateRange(from, to);

    const facultyWhere: any = { role: UserRole.FACULTY };
    if (facultyId) facultyWhere.id = facultyId;
    const faculty = await db.User.findAll({ where: facultyWhere, attributes: ['id', 'name', 'email'] });

    const sessions = await db.Session.findAll({
      where: {
        ...(facultyId ? { facultyId } : {}),
        date: dateRange,
        status: { [Op.in]: ['ongoing', 'completed'] },
      },
    });

    const tasks = await db.Task.findAll({
      where: {
        ...(facultyId ? { facultyId } : {}),
        date: dateRange,
        status: { [Op.in]: ['approved', 'completed'] },
      },
    });

    // Standard working hours: 9 hours per day for faculty
    const numberOfDays = Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const standardWorkingHoursPerDay = 9;
    const totalWorkingHours = numberOfDays * standardWorkingHoursPerDay;

    // Calculate occupied hours from sessions and tasks
    const occupiedByFaculty = new Map<number, number>();
    sessions.forEach((s: any) => {
      if (!s.facultyId) return;
      occupiedByFaculty.set(s.facultyId, (occupiedByFaculty.get(s.facultyId) || 0) + sessionDurationHours(s));
    });
    tasks.forEach((t: any) => {
      if (!t.facultyId) return;
      occupiedByFaculty.set(t.facultyId, (occupiedByFaculty.get(t.facultyId) || 0) + 1); // default 1 hour per task
    });

    const rows = faculty.map((f: any) => {
      const occupied = occupiedByFaculty.get(f.id) || 0;
      const free = Math.max(0, totalWorkingHours - occupied);
      const pct = totalWorkingHours > 0 ? (occupied / totalWorkingHours) * 100 : 0;
      return {
        facultyId: f.id,
        facultyName: f.name,
        workingHours: Number(totalWorkingHours.toFixed(2)),
        occupiedHours: Number(occupied.toFixed(2)),
        freeTime: Number(free.toFixed(2)),
        occupancyPercent: Number(pct.toFixed(2)),
      };
    });

    const responseData = { from, to, totalDays: numberOfDays, workingHoursPerDay: standardWorkingHoursPerDay, totalWorkingHours, rows };

    // Save report to database
    await saveReport(
      'faculty-occupancy',
      `Faculty Occupancy Report (${from} to ${to})`,
      req.user.userId,
      responseData,
      { facultyId, from, to },
      { totalFaculty: rows.length, avgOccupancy: rows.reduce((sum, r) => sum + r.occupancyPercent, 0) / (rows.length || 1) }
    );

    res.status(200).json({ status: 'success', data: responseData });
  } catch (error) {
    logger.error('Faculty occupancy report failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate faculty occupancy report' });
  }
};

export const getBatchDetailsReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('Fetching batch details report with type:', req.query.type);
    
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const type = (req.query.type as string | undefined) || 'present';
    const facultyId = parseNumber(req.query.facultyId);
    const daysFilter = req.query.days as string | undefined;

    // Get ALL batches regardless of type for complete visibility
    const where: any = {};
    if (type === 'future') {
      where.startDate = { [Op.gt]: new Date() };
    } else if (type === 'past') {
      where.endDate = { [Op.lt]: new Date() };
    }
    // 'present' or default shows currently running batches

    const batches = await db.Batch.findAll({
      where,
      include: [
        {
          model: db.BatchFacultyAssignment,
          as: 'facultyAssignments',
          required: false,
          where: facultyId ? { facultyId } : undefined,
          include: [{ model: db.User, as: 'faculty', attributes: ['id', 'name', 'email'] }],
        },
        { 
          model: db.Enrollment, 
          as: 'enrollments', 
          required: false, 
          attributes: ['id', 'studentId'],
          include: [{
            model: db.User,
            as: 'student',
            attributes: ['id', 'name', 'email'],
            required: false
          }]
        },
      ],
      order: [['startDate', 'ASC']],
    });

    const rows = batches.map((b: any) => {
      const json = b.toJSON();
      const assignedFaculty = (json.facultyAssignments || []).map((fa: any) => fa.faculty).filter(Boolean);
      
      // Parse schedule object
      const scheduleObj = json.schedule || {};
      const scheduleDays = typeof scheduleObj === 'string' ? scheduleObj : (scheduleObj?.days || '-');
      const scheduleTime = scheduleObj?.time || '-';
      
      // Get unique students count
      const studentEnrollments = (json.enrollments || []).filter((e: any) => e.studentId);
      const uniqueStudents = new Set(studentEnrollments.map((e: any) => e.studentId));
      
      return {
        batchId: json.id,
        batchName: json.title,
        numberOfStudents: uniqueStudents.size,
        schedule: {
          days: scheduleDays,
          time: scheduleTime
        },
        assignedFaculty: assignedFaculty.length ? assignedFaculty.map((f: any) => ({ id: f.id, name: f.name })) : [],
      };
    });

    const responseData = { type, rows };

    // Save report to database
    await saveReport(
      'batch-details',
      `Batch Details Report (${type})`,
      req.user.userId,
      responseData,
      { type, facultyId, days: daysFilter },
      { totalBatches: rows.length, totalStudents: rows.reduce((sum, r) => sum + r.numberOfStudents, 0) }
    );

    res.status(200).json({ status: 'success', data: responseData });
  } catch (error) {
    logger.error('Batch details report failed', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate batch details report' });
  }
};

