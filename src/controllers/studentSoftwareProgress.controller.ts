import { Response } from 'express';
import * as XLSX from 'xlsx';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import db from '../models';
import { logger } from '../utils/logger';

// Software code to name mapping
const SOFTWARE_CODE_MAP: Record<string, string> = {
  '6': 'Photoshop',
  '7': 'Illustrator',
  '8': 'InDesign',
  '10': 'CorelDraw',
  '11': 'Figma',
  '12': 'After Effects',
  '13': 'Premiere Pro',
  '14': 'Audition',
  '15': 'Blender',
  '16': '3ds Max',
  '23': 'Cinema 4D',
  '24': 'Maya',
  '32': 'SketchUp',
  '33': 'AutoCAD',
  '48': 'Revit',
  '72': 'Unity',
  '89': 'Unreal Engine',
  '92': 'DaVinci Resolve',
};

// Parse Excel date
function parseExcelDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  try {
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      return isNaN(date.getTime()) ? null : date;
    }
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// GET /api/student-software-progress - Get all records
export const getStudentSoftwareProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ status: 'error', message: 'Only admins can view software progress' });
      return;
    }

    const { studentId, softwareName, status, courseName, page = '1', limit = '100' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};
    if (studentId) where.studentId = parseInt(studentId as string);
    if (softwareName) where.softwareName = { [Op.like]: `%${softwareName}%` };
    if (status) where.status = status;
    if (courseName) where.courseName = { [Op.like]: `%${courseName}%` };

    const { rows, count } = await db.StudentSoftwareProgress.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title'],
          required: false,
        },
      ],
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      status: 'success',
      data: {
        records: rows,
        totalCount: count,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching student software progress:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// GET /api/student-software-progress/:id - Get single record
export const getStudentSoftwareProgressById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const record = await db.StudentSoftwareProgress.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title'],
          required: false,
        },
      ],
    });

    if (!record) {
      res.status(404).json({ status: 'error', message: 'Record not found' });
      return;
    }

    res.json({ status: 'success', data: record });
  } catch (error: any) {
    logger.error('Error fetching student software progress by ID:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// POST /api/student-software-progress - Create record
export const createStudentSoftwareProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ status: 'error', message: 'Only admins can create software progress' });
      return;
    }

    const {
      studentId,
      softwareName,
      softwareCode,
      status = 'XX',
      enrollmentDate,
      courseName,
      courseType,
      studentStatus,
      batchTiming,
      schedule,
      facultyName,
      batchStartDate,
      batchEndDate,
      batchId,
      notes,
    } = req.body;

    if (!studentId || !softwareName) {
      res.status(400).json({ status: 'error', message: 'studentId and softwareName are required' });
      return;
    }

    // Check if student exists
    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== 'student') {
      res.status(400).json({ status: 'error', message: 'Invalid student ID' });
      return;
    }

    // Check for duplicate
    const existing = await db.StudentSoftwareProgress.findOne({
      where: { studentId, softwareName },
    });

    if (existing) {
      res.status(400).json({ status: 'error', message: 'Record already exists for this student and software' });
      return;
    }

    const record = await db.StudentSoftwareProgress.create({
      studentId,
      softwareName,
      softwareCode,
      status,
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : null,
      courseName,
      courseType,
      studentStatus,
      batchTiming,
      schedule,
      facultyName,
      batchStartDate: batchStartDate ? new Date(batchStartDate) : null,
      batchEndDate: batchEndDate ? new Date(batchEndDate) : null,
      batchId,
      notes,
    });

    res.status(201).json({ status: 'success', data: record });
  } catch (error: any) {
    logger.error('Error creating student software progress:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// PUT /api/student-software-progress/:id - Update record
export const updateStudentSoftwareProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ status: 'error', message: 'Only admins can update software progress' });
      return;
    }

    const { id } = req.params;
    const record = await db.StudentSoftwareProgress.findByPk(id);

    if (!record) {
      res.status(404).json({ status: 'error', message: 'Record not found' });
      return;
    }

    const updateData: any = {};
    if (req.body.softwareName !== undefined) updateData.softwareName = req.body.softwareName;
    if (req.body.softwareCode !== undefined) updateData.softwareCode = req.body.softwareCode;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.enrollmentDate !== undefined) updateData.enrollmentDate = req.body.enrollmentDate ? new Date(req.body.enrollmentDate) : null;
    if (req.body.courseName !== undefined) updateData.courseName = req.body.courseName;
    if (req.body.courseType !== undefined) updateData.courseType = req.body.courseType;
    if (req.body.studentStatus !== undefined) updateData.studentStatus = req.body.studentStatus;
    if (req.body.batchTiming !== undefined) updateData.batchTiming = req.body.batchTiming;
    if (req.body.schedule !== undefined) updateData.schedule = req.body.schedule;
    if (req.body.facultyName !== undefined) updateData.facultyName = req.body.facultyName;
    if (req.body.batchStartDate !== undefined) updateData.batchStartDate = req.body.batchStartDate ? new Date(req.body.batchStartDate) : null;
    if (req.body.batchEndDate !== undefined) updateData.batchEndDate = req.body.batchEndDate ? new Date(req.body.batchEndDate) : null;
    if (req.body.batchId !== undefined) updateData.batchId = req.body.batchId;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    await record.update(updateData);

    res.json({ status: 'success', data: record });
  } catch (error: any) {
    logger.error('Error updating student software progress:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// DELETE /api/student-software-progress/:id - Delete record
export const deleteStudentSoftwareProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ status: 'error', message: 'Only admins can delete software progress' });
      return;
    }

    const { id } = req.params;
    const record = await db.StudentSoftwareProgress.findByPk(id);

    if (!record) {
      res.status(404).json({ status: 'error', message: 'Record not found' });
      return;
    }

    await record.destroy();

    res.json({ status: 'success', message: 'Record deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting student software progress:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// DELETE /api/student-software-progress - Delete all records
export const deleteAllStudentSoftwareProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    // Only SuperAdmin can delete all records
    if (req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({ status: 'error', message: 'Only superadmin can delete all records' });
      return;
    }

    // Get count before deletion
    const count = await db.StudentSoftwareProgress.count();

    // Delete all records
    await db.StudentSoftwareProgress.destroy({
      where: {},
      truncate: false, // Use DELETE instead of TRUNCATE to maintain auto-increment
    });

    logger.info(`All student software progress records deleted by user ${req.user.userId}. Total deleted: ${count}`);

    res.json({ 
      status: 'success', 
      message: `All ${count} records deleted successfully`,
      deletedCount: count
    });
  } catch (error: any) {
    logger.error('Error deleting all student software progress:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// POST /api/student-software-progress/import-excel - Import from Excel
export const importExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ status: 'error', message: 'Only admins can import Excel' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ status: 'error', message: 'Excel file is required' });
      return;
    }

    logger.info(`Excel import: File received - ${req.file.originalname}, size: ${req.file.size}`);

    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    } catch (parseError: any) {
      logger.error('Failed to parse Excel file:', parseError);
      res.status(400).json({ status: 'error', message: `Failed to parse Excel file: ${parseError.message}` });
      return;
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null, blankrows: false });

    if (rows.length === 0) {
      res.status(400).json({ status: 'error', message: 'Excel file is empty' });
      return;
    }

    const result = { success: 0, failed: 0, errors: [] as Array<{ row: number; error: string }> };

    // Helper to get column value
    const getValue = (row: any, names: string[]): any => {
      for (const name of names) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return row[name];
        }
        const lowerName = name.toLowerCase();
        for (const key in row) {
          if (key.toLowerCase() === lowerName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return row[key];
          }
        }
      }
      return null;
    };

    // Helper function to normalize phone number (remove spaces, dashes, etc.)
    const normalizePhone = (phone: any): string => {
      if (!phone) return '';
      // Convert to string and remove all non-digit characters except +
      let normalized = String(phone).trim();
      // Remove spaces, dashes, parentheses, dots, slashes, plus signs
      normalized = normalized.replace(/[\s\-\(\)\.\/\+]/g, '');
      // Remove leading zeros if length > 10
      if (normalized.length > 10 && normalized.startsWith('0')) {
        normalized = normalized.substring(1);
      }
      return normalized;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any;
      try {
        // Get student by phone number
        const phone = getValue(row, ['phone', 'phoneNumber', '__EMPTY_2', 'Phone', 'Phone Number']);
        if (!phone) {
          result.failed++;
          result.errors.push({ row: i + 2, error: 'Phone number is required' });
          continue;
        }

        // Skip if phone is "NUMBER" (likely header row)
        if (String(phone).trim().toUpperCase() === 'NUMBER') {
          result.failed++;
          result.errors.push({ row: i + 2, error: 'Invalid phone number (header row detected)' });
          continue;
        }

        // Normalize phone number for search
        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone || normalizedPhone.length < 10) {
          result.failed++;
          result.errors.push({ row: i + 2, error: `Invalid phone number format: ${phone}` });
          continue;
        }

        // Search with normalized phone - try exact match first, then try with LIKE for partial matches
        let student = await db.User.findOne({
          where: { 
            phone: normalizedPhone, 
            role: 'student' 
          },
        });

        // If not found, try searching with normalized phone in database (handle cases where DB has formatting)
        if (!student) {
          // Use Sequelize function to normalize database phone for comparison
          const allStudents = await db.User.findAll({
            where: { role: 'student' },
            attributes: ['id', 'name', 'email', 'phone'],
          });

          // Find student by comparing normalized phones
          student = allStudents.find((s) => {
            if (!s.phone) return false;
            const dbNormalized = normalizePhone(s.phone);
            return dbNormalized === normalizedPhone;
          }) as any;
        }

        if (!student) {
          result.failed++;
          result.errors.push({ row: i + 2, error: `Student not found with phone: ${phone}` });
          continue;
        }

        // Get enrollment date
        const enrollmentDate = parseExcelDate(getValue(row, ['enrollmentDate', '__EMPTY', 'Enrollment Date']));

        // Get course info
        const courseName = getValue(row, ['courseName', '__EMPTY_6', 'Course Name']);
        const courseType = getValue(row, ['courseType', '__EMPTY_3', 'Course Type']);
        const studentStatus = getValue(row, ['studentStatus', '__EMPTY_4', 'Student Status']);
        const batchTiming = getValue(row, ['batchTiming', '__EMPTY_5', 'Batch Timing']);

        // Process software status columns (numeric codes)
        const softwareColumns = ['6', '7', '8', '10', '11', '12', '13', '14', '15', '16', '23', '24', '32', '33', '48', '72', '89', '92'];
        
        for (const code of softwareColumns) {
          const statusValue = row[code];
          if (statusValue && (statusValue === 'XX' || statusValue === 'IP' || statusValue === 'NO' || statusValue === 'Finished')) {
            const softwareName = SOFTWARE_CODE_MAP[code] || `Software ${code}`;
            
            // Check if record exists
            const existing = await db.StudentSoftwareProgress.findOne({
              where: { studentId: student.id, softwareName },
            });

            if (existing) {
              // Update existing
              await existing.update({
                status: statusValue,
                enrollmentDate,
                courseName,
                courseType,
                studentStatus,
                batchTiming,
                softwareCode: code,
              });
            } else {
              // Create new
              await db.StudentSoftwareProgress.create({
                studentId: student.id,
                softwareName,
                softwareCode: code,
                status: statusValue,
                enrollmentDate,
                courseName,
                courseType,
                studentStatus,
                batchTiming,
              });
            }
          }
        }

        // Process software name columns (1st Software, 2nd Software, etc.)
        const firstSoftwareName = getValue(row, ['1st Software', '__EMPTY_12', 'First Software']);
        if (firstSoftwareName) {
          const existing = await db.StudentSoftwareProgress.findOne({
            where: { studentId: student.id, softwareName: String(firstSoftwareName).trim() },
          });

          if (!existing) {
            await db.StudentSoftwareProgress.create({
              studentId: student.id,
              softwareName: String(firstSoftwareName).trim(),
              status: 'XX',
              enrollmentDate,
              courseName,
              courseType,
              studentStatus,
              batchTiming,
            });
          }
        }

        result.success++;
      } catch (error: any) {
        logger.error(`Error processing row ${i + 2}:`, error);
        result.failed++;
        result.errors.push({ row: i + 2, error: error.message || 'Unknown error' });
      }
    }

    res.json({
      status: 'success',
      data: {
        success: result.success,
        failed: result.failed,
        errors: result.errors.slice(0, 50), // Limit errors to first 50
      },
    });
  } catch (error: any) {
    logger.error('Error importing Excel:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// GET /api/student-software-progress/export-excel - Export to Excel
export const exportExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ status: 'error', message: 'Only admins can export Excel' });
      return;
    }

    const { studentId, courseName, status } = req.query;
    const where: any = {};
    if (studentId) where.studentId = parseInt(studentId as string);
    if (courseName) where.courseName = { [Op.like]: `%${courseName}%` };
    if (status) where.status = status;

    const records = await db.StudentSoftwareProgress.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
      order: [['studentId', 'ASC'], ['softwareName', 'ASC']],
    });

    // Group by student for better organization
    const studentGroups: Record<number, any[]> = {};
    records.forEach((record: any) => {
      const studentId = record.studentId;
      if (!studentGroups[studentId]) {
        studentGroups[studentId] = [];
      }
      studentGroups[studentId].push(record);
    });

    // Create Excel workbook - one row per student with all software
    const worksheetData: any[] = [];
    
    Object.values(studentGroups).forEach((studentRecords: any[]) => {
      const firstRecord = studentRecords[0];
      
      // Organize software by status
      const currentSoftware = studentRecords.filter(r => r.status === 'IP').map(r => r.softwareName).join(', ');
      const pendingSoftware = studentRecords.filter(r => r.status === 'XX').map(r => r.softwareName).join(', ');
      const finishedSoftware = studentRecords.filter(r => r.status === 'Finished').map(r => r.softwareName).join(', ');
      const notApplicableSoftware = studentRecords.filter(r => r.status === 'NO').map(r => r.softwareName).join(', ');
      
      // Count by status
      const currentCount = studentRecords.filter(r => r.status === 'IP').length;
      const pendingCount = studentRecords.filter(r => r.status === 'XX').length;
      const finishedCount = studentRecords.filter(r => r.status === 'Finished').length;
      const notApplicableCount = studentRecords.filter(r => r.status === 'NO').length;
      const totalCount = studentRecords.length;
      
      // Helper function to get full status description
      const getStatusDescription = (status: string): string => {
        switch (status) {
          case 'IP':
            return 'In Progress';
          case 'XX':
            return 'Not Started';
          case 'Finished':
            return 'Completed';
          case 'NO':
            return 'Not Applicable';
          default:
            return status;
        }
      };
      
      // List all software with status (using full descriptions)
      const allSoftwareList = studentRecords.map(r => 
        `${r.softwareName} (${r.softwareCode || 'N/A'}) - ${getStatusDescription(r.status)}`
      ).join(' | ');
      
      worksheetData.push({
        'Student ID': firstRecord.studentId,
        'Student Name': firstRecord.student?.name || '',
        'Phone Number': firstRecord.student?.phone || '',
        'Email': firstRecord.student?.email || '',
        'Enrollment Date': firstRecord.enrollmentDate ? new Date(firstRecord.enrollmentDate).toLocaleDateString() : '',
        'Course Name': firstRecord.courseName || '',
        'Course Type': firstRecord.courseType || '',
        'Student Status': firstRecord.studentStatus || '',
        'Batch Timing': firstRecord.batchTiming || '',
        'Total Software': totalCount,
        'In Progress Count': currentCount,
        'Not Started Count': pendingCount,
        'Completed Count': finishedCount,
        'Not Applicable Count': notApplicableCount,
        'In Progress Software': currentSoftware || '-',
        'Not Started Software': pendingSoftware || '-',
        'Completed Software': finishedSoftware || '-',
        'Not Applicable Software': notApplicableSoftware || '-',
        'All Software with Status': allSoftwareList,
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Software Progress');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=student-software-progress-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    logger.error('Error exporting Excel:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
