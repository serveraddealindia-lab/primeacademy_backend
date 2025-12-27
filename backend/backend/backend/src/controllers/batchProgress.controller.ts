import { Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { SessionStatus } from '../models/Session';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

// GET /api/batches/progress → Get batch-wise progress list
export const getBatchProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { search, format = 'json' } = req.query;

    // Validate format parameter
    if (format && !['json', 'csv', 'pdf'].includes(format as string)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid format parameter. Allowed values: json, csv, pdf',
      });
      return;
    }

    // Build search filter
    const batchWhere: any = {};
    if (search && typeof search === 'string' && search.trim()) {
      batchWhere[Op.or] = [
        { title: { [Op.like]: `%${search.trim()}%` } },
        { software: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    // Get all batches with sessions and enrollments
    const batches = await db.Batch.findAll({
      where: batchWhere,
      include: [
        {
          model: db.Session,
          as: 'sessions',
          attributes: ['id', 'status', 'facultyId'],
          include: [
            {
              model: db.User,
              as: 'faculty',
              attributes: ['id', 'name', 'email'],
              required: false,
            },
          ],
          required: false,
        },
        {
          model: db.Enrollment,
          as: 'enrollments',
          include: [
            {
              model: db.User,
              as: 'student',
              attributes: ['id', 'name', 'email'],
              required: true,
            },
          ],
          required: false,
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

    // Calculate progress for each batch
    const batchProgressList = batches.map((batch: any) => {
      const sessions = batch.sessions || [];
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(
        (s: any) => s.status === SessionStatus.COMPLETED
      ).length;
      const progressPercentage =
        totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

      // Get unique faculty members from sessions
      const facultyMap = new Map();
      const assignedFaculty = batch.assignedFaculty || [];
      assignedFaculty.forEach((faculty: any) => {
        if (faculty?.id) {
          facultyMap.set(faculty.id, faculty);
        }
      });
      sessions.forEach((session: any) => {
        if (session.faculty && session.faculty.id) {
          facultyMap.set(session.faculty.id, session.faculty);
        }
      });

      // Get enrollments
      const enrollments = batch.enrollments || [];
      const students = enrollments.map((enrollment: any) => ({
        id: enrollment.student?.id,
        name: enrollment.student?.name,
        email: enrollment.student?.email,
      }));

      const faculty = Array.from(facultyMap.values());

      return {
        id: batch.id,
        title: batch.title,
        software: batch.software,
        mode: batch.mode,
        startDate: batch.startDate,
        endDate: batch.endDate,
        status: batch.status,
        totalSessions,
        completedSessions,
        progressPercentage,
        studentCount: students.length,
        faculty,
        facultyCount: faculty.length,
      };
    });

    const batchesWithFaculty = batchProgressList;

    // Handle different export formats
    if (format === 'csv') {
      return exportToCSV(batchesWithFaculty, res);
    } else if (format === 'pdf') {
      return exportToPDF(batchesWithFaculty, res);
    }

    // Return JSON response
    res.status(200).json({
      status: 'success',
      data: {
        batches: batchesWithFaculty,
        totalCount: batchesWithFaculty.length,
      },
    });
  } catch (error) {
    logger.error('Get batch progress error:', error);
    // If it's a validation error, return 400
    if ((error as any).name === 'SequelizeValidationError' || (error as any).name === 'SequelizeDatabaseError') {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request parameters',
        details: (error as Error).message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batch progress',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
};

// Export to CSV
function exportToCSV(batches: any[], res: Response): void {
  const headers = [
    'Batch ID',
    'Title',
    'Software',
    'Mode',
    'Start Date',
    'End Date',
    'Status',
    'Total Sessions',
    'Completed Sessions',
    'Progress %',
    'Student Count',
    'Faculty Count',
    'Faculty Names',
  ];

  const rows = batches.map((batch) => [
    batch.id,
    batch.title,
    batch.software || '',
    batch.mode,
    new Date(batch.startDate).toLocaleDateString(),
    new Date(batch.endDate).toLocaleDateString(),
    batch.status || '',
    batch.totalSessions,
    batch.completedSessions,
    `${batch.progressPercentage}%`,
    batch.studentCount,
    batch.facultyCount,
    batch.faculty.map((f: any) => f.name).join('; '),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=batch-progress-${Date.now()}.csv`);
  res.status(200).send(csvContent);
}

// Export to PDF (simplified - returns JSON for now, can be enhanced with PDF library)
function exportToPDF(batches: any[], res: Response): void {
  // For now, we'll return a JSON response that can be converted to PDF on the frontend
  // In production, you might want to use a library like pdfkit or puppeteer
  res.status(200).json({
    status: 'success',
    message: 'PDF export not yet implemented. Please use CSV export or JSON format.',
    data: {
      batches,
      totalCount: batches.length,
    },
  });
}




