import { Response } from 'express';
import * as XLSX from 'xlsx';
import { Op, Sequelize } from 'sequelize';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import db from '../models';
import { logger } from '../utils/logger';

/**
 * Parse date from Excel - handles Excel serial dates, various string formats, and Date objects
 */
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
      // Try various date formats
      const formats = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
        /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
        /^\d{1,2}-\w{3}-\d{2,4}$/, // D-MMM-YY or DD-MMM-YYYY
      ];
      
      for (const format of formats) {
        if (format.test(dateValue)) {
          const parsed = new Date(dateValue);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.warn(`Failed to parse date: ${dateValue}`, error);
    return null;
  }
}

/**
 * Normalize phone number for matching (remove spaces, dashes, country codes, etc.)
 */
function normalizePhone(phone: any): string | null {
  if (!phone && phone !== 0) return null;
  
  // Handle numeric values from Excel (convert to string)
  let phoneStr = typeof phone === 'number' ? phone.toString() : phone.toString().trim();
  
  // Skip if it's not a valid phone number (like "NUMBER" header)
  if (typeof phoneStr === 'string' && (phoneStr.toUpperCase() === 'NUMBER' || phoneStr.toUpperCase() === 'PHONE')) {
    return null;
  }
  
  // Remove all non-digit characters
  phoneStr = phoneStr.replace(/\D/g, '');
  
  // Skip if too short
  if (phoneStr.length < 5) {
    return null;
  }
  
  // Remove leading country codes (91 for India, 1 for US, etc.)
  if (phoneStr.length > 10) {
    // Remove leading 91 (India country code)
    if (phoneStr.startsWith('91') && phoneStr.length === 12) {
      phoneStr = phoneStr.substring(2);
    }
    // Remove leading 1 (US country code)
    else if (phoneStr.startsWith('1') && phoneStr.length === 11) {
      phoneStr = phoneStr.substring(1);
    }
    // If still longer than 10, take last 10 digits
    else if (phoneStr.length > 10) {
      phoneStr = phoneStr.substring(phoneStr.length - 10);
    }
  }
  
  return phoneStr.length >= 10 ? phoneStr : null;
}

/**
 * Find student by phone or name with flexible matching
 */
async function findStudentByPhoneOrName(phone: any, studentName: any): Promise<any> {
  if (!phone && !studentName) return null;
  
  const normalizedPhone = normalizePhone(phone);
  const trimmedName = studentName?.toString().trim();
  
  // Try exact phone match first
  if (normalizedPhone) {
    const studentByPhone = await db.User.findOne({
      where: {
        phone: normalizedPhone,
        role: UserRole.STUDENT,
      },
    });
    if (studentByPhone) return studentByPhone;
    
    // Try with original phone format
    const studentByOriginalPhone = await db.User.findOne({
      where: {
        phone: phone.toString().trim(),
        role: UserRole.STUDENT,
      },
    });
    if (studentByOriginalPhone) return studentByOriginalPhone;
    
    // Try with normalized phone in database (normalize all phone numbers in where clause)
    const allStudents = await db.User.findAll({
      where: {
        role: UserRole.STUDENT,
      },
      attributes: ['id', 'name', 'email', 'phone'],
    });
    
    for (const student of allStudents) {
      const dbNormalizedPhone = normalizePhone(student.phone);
      if (dbNormalizedPhone === normalizedPhone) {
        return student;
      }
    }
  }
  
  // Fallback: try matching by name (case-insensitive, partial match)
  // Using LOWER() for MySQL/MariaDB compatibility (iLike is PostgreSQL only)
  if (trimmedName && trimmedName.length > 2) {
    const searchPattern = `%${trimmedName.toLowerCase()}%`;
    const studentByName = await db.User.findOne({
      where: {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('name')),
            Op.like,
            searchPattern
          ),
          { role: UserRole.STUDENT },
        ],
      },
    });
    if (studentByName) return studentByName;
  }
  
  return null;
}

/**
 * Create a student if they don't exist
 */
async function createStudentIfNotExists(studentName: string, phone: string): Promise<any> {
  if (!studentName || !phone) return null;
  
  const trimmedName = studentName.toString().trim();
  const normalizedPhone = normalizePhone(phone);
  
  if (!trimmedName || !normalizedPhone) return null;
  
  // Skip header rows
  if (trimmedName.toUpperCase() === 'NAME' || trimmedName.toUpperCase() === 'STUDENT NAME') {
    return null;
  }
  if (normalizedPhone && (normalizedPhone === normalizePhone('NUMBER') || normalizedPhone === normalizePhone('PHONE'))) {
    return null;
  }
  
  // Check if student already exists
  const existing = await findStudentByPhoneOrName(phone, studentName);
  if (existing) return existing;
  
  try {
    // Generate email from phone
    const email = `student_${normalizedPhone}@primeacademy.local`;
    
    // Check if email already exists
    const existingByEmail = await db.User.findOne({
      where: { email },
    });
    if (existingByEmail) return existingByEmail;
    
    // Generate default password
    const defaultPassword = 'Student@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    // Create user
    const user = await db.User.create({
      name: trimmedName,
      email,
      phone: normalizedPhone,
      role: UserRole.STUDENT,
      passwordHash,
      isActive: true,
    });
    
    logger.info(`Auto-created student: ${trimmedName} (${normalizedPhone})`);
    return user;
  } catch (error: any) {
    logger.error(`Error creating student ${trimmedName}:`, error);
    return null;
  }
}

/**
 * Map software codes to names (based on Excel structure)
 */
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

/**
 * GET /api/student-software-progress
 * Get all student software progress records with filters
 */
export const getAllStudentSoftwareProgress = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can view student software progress',
      });
      return;
    }

    const {
      studentId,
      softwareName,
      status,
      courseName,
      page = '1',
      limit = '100',
    } = req.query;

    const where: any = {};
    if (studentId) where.studentId = parseInt(studentId as string, 10);
    if (softwareName) where.softwareName = { [Op.like]: `%${softwareName}%` };
    if (status) where.status = status;
    if (courseName) where.courseName = { [Op.like]: `%${courseName}%` };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await db.StudentSoftwareProgress.findAndCountAll({
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
          attributes: ['id', 'title', 'software', 'mode', 'status'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    res.status(200).json({
      status: 'success',
      data: {
        records: rows,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error('Get all student software progress error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/student-software-progress/:id
 * Get a single student software progress record
 */
export const getStudentSoftwareProgressById = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can view student software progress',
      });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid ID',
      });
      return;
    }

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
          attributes: ['id', 'title', 'software', 'mode', 'status'],
          required: false,
        },
      ],
    });

    if (!record) {
      res.status(404).json({
        status: 'error',
        message: 'Record not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { record },
    });
  } catch (error: any) {
    logger.error('Get student software progress by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/student-software-progress
 * Create a new student software progress record
 */
export const createStudentSoftwareProgress = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can create student software progress records',
      });
      return;
    }

    const {
      studentId,
      softwareName,
      softwareCode,
      status,
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
      metadata,
    } = req.body;

    if (!studentId || !softwareName) {
      res.status(400).json({
        status: 'error',
        message: 'Student ID and software name are required',
      });
      return;
    }

    // Check if student exists
    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student ID',
      });
      return;
    }

    // Check for duplicate
    const existing = await db.StudentSoftwareProgress.findOne({
      where: {
        studentId,
        softwareName,
      },
    });

    if (existing) {
      res.status(400).json({
        status: 'error',
        message: 'Record already exists for this student and software',
      });
      return;
    }

    const record = await db.StudentSoftwareProgress.create({
      studentId,
      softwareName,
      softwareCode: softwareCode || null,
      status: status || 'XX',
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : null,
      courseName: courseName || null,
      courseType: courseType || null,
      studentStatus: studentStatus || null,
      batchTiming: batchTiming || null,
      schedule: schedule || null,
      facultyName: facultyName || null,
      batchStartDate: batchStartDate ? new Date(batchStartDate) : null,
      batchEndDate: batchEndDate ? new Date(batchEndDate) : null,
      batchId: batchId || null,
      notes: notes || null,
      metadata: metadata || null,
    });

    const created = await db.StudentSoftwareProgress.findByPk(record.id, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode', 'status'],
          required: false,
        },
      ],
    });

    res.status(201).json({
      status: 'success',
      data: { record: created },
    });
  } catch (error: any) {
    logger.error('Create student software progress error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * PUT /api/student-software-progress/:id
 * Update a student software progress record
 */
export const updateStudentSoftwareProgress = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can update student software progress records',
      });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid ID',
      });
      return;
    }

    const record = await db.StudentSoftwareProgress.findByPk(id);
    if (!record) {
      res.status(404).json({
        status: 'error',
        message: 'Record not found',
      });
      return;
    }

    const {
      softwareName,
      softwareCode,
      status,
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
      metadata,
    } = req.body;

    // Update fields
    if (softwareName !== undefined) record.softwareName = softwareName;
    if (softwareCode !== undefined) record.softwareCode = softwareCode;
    if (status !== undefined) record.status = status;
    if (enrollmentDate !== undefined) record.enrollmentDate = enrollmentDate ? new Date(enrollmentDate) : null;
    if (courseName !== undefined) record.courseName = courseName;
    if (courseType !== undefined) record.courseType = courseType;
    if (studentStatus !== undefined) record.studentStatus = studentStatus;
    if (batchTiming !== undefined) record.batchTiming = batchTiming;
    if (schedule !== undefined) record.schedule = schedule;
    if (facultyName !== undefined) record.facultyName = facultyName;
    if (batchStartDate !== undefined) record.batchStartDate = batchStartDate ? new Date(batchStartDate) : null;
    if (batchEndDate !== undefined) record.batchEndDate = batchEndDate ? new Date(batchEndDate) : null;
    if (batchId !== undefined) record.batchId = batchId;
    if (notes !== undefined) record.notes = notes;
    if (metadata !== undefined) record.metadata = metadata;

    await record.save();

    const updated = await db.StudentSoftwareProgress.findByPk(record.id, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode', 'status'],
          required: false,
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      data: { record: updated },
    });
  } catch (error: any) {
    logger.error('Update student software progress error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * DELETE /api/student-software-progress/:id
 * Delete a student software progress record
 */
export const deleteStudentSoftwareProgress = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can delete student software progress records',
      });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid ID',
      });
      return;
    }

    const record = await db.StudentSoftwareProgress.findByPk(id);
    if (!record) {
      res.status(404).json({
        status: 'error',
        message: 'Record not found',
      });
      return;
    }

    await record.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Record deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete student software progress error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/student-software-progress/import-excel
 * Import student software progress from Excel file
 */
export const importExcel = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can import student software progress',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        status: 'error',
        message: 'Excel file is required',
      });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: 'buffer',
      cellDates: true,
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
    });

    if (rows.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Excel file is empty or has no data rows',
      });
      return;
    }

    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any;
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have a header

      try {
        // Extract student info
        const studentName = row['__EMPTY_1'] || row['Student Name'] || row['Name'];
        const phone = row['__EMPTY_2'] || row['Phone'] || row['Phone Number'];
        const enrollmentDateStr = row['__EMPTY'] || row['Enrollment Date'] || row['Date'];
        const courseName = row['__EMPTY_6'] || row['Course'] || row['Course Name'];
        const courseType = row['__EMPTY_3'] || row['Type'] || row['Course Type'];
        const studentStatus = row['__EMPTY_4'] || row['Status'];
        const batchTiming = row['__EMPTY_5'] || row['Timing'] || row['Batch Timing'];
        const schedule = row['__EMPTY_10'] || row['Schedule'];
        const facultyName = row['__EMPTY_11'] || row['Faculty'];
        const firstSoftwareStart = row['1st Software'] || row['First Software Start'];
        const firstSoftwareEnd = row['__EMPTY_8'] || row['First Software End'];
        const firstSoftwareName = row['__EMPTY_12'] || row['First Software Name'];
        const secondSoftwareName = row['__EMPTY_24'] || row['2nd Software'] || row['Second Software Name'];

        // Skip header rows
        const nameStr = studentName?.toString().trim().toUpperCase() || '';
        const phoneStr = phone?.toString().trim().toUpperCase() || '';
        if (nameStr === 'NAME' || nameStr === 'STUDENT NAME' || phoneStr === 'NUMBER' || phoneStr === 'PHONE' || phoneStr === 'PHONE NUMBER') {
          continue; // Skip header row
        }

        if (!studentName && !phone) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: 'Student name or phone is required',
          });
          continue;
        }

        // Find student by phone or name with flexible matching
        let student = await findStudentByPhoneOrName(phone, studentName);

        // If student not found, create them automatically
        if (!student) {
          student = await createStudentIfNotExists(studentName, phone);
        }

        if (!student) {
          result.failed++;
          const phoneDisplay = phone ? `phone: ${phone}` : '';
          const nameDisplay = studentName ? `name: ${studentName}` : '';
          result.errors.push({
            row: rowNumber,
            error: `Student not found and could not be created with ${phoneDisplay}${phoneDisplay && nameDisplay ? ' or ' : ''}${nameDisplay}`,
          });
          continue;
        }

        const enrollmentDate = parseExcelDate(enrollmentDateStr);
        const batchStartDate = parseExcelDate(firstSoftwareStart);
        const batchEndDate = parseExcelDate(firstSoftwareEnd);

        // Process software columns (numeric keys from Excel)
        const softwareColumns = ['6', '7', '8', '10', '11', '12', '13', '14', '15', '16', '23', '24', '32', '33', '48', '72', '89', '92'];
        
        for (const code of softwareColumns) {
          const status = row[code];
          if (status && (status === 'XX' || status === 'IP' || status === 'NO' || status === 'Finished')) {
            const softwareName = SOFTWARE_CODE_MAP[code] || `Software ${code}`;
            
            // Check if record exists
            const existing = await db.StudentSoftwareProgress.findOne({
              where: {
                studentId: student.id,
                softwareName,
              },
            });

            if (existing) {
              // Update existing
              existing.status = status;
              existing.enrollmentDate = enrollmentDate;
              existing.courseName = courseName;
              existing.courseType = courseType;
              existing.studentStatus = studentStatus;
              existing.batchTiming = batchTiming;
              existing.schedule = schedule;
              existing.facultyName = facultyName;
              existing.batchStartDate = batchStartDate;
              existing.batchEndDate = batchEndDate;
              existing.softwareCode = code;
              await existing.save();
            } else {
              // Create new
              await db.StudentSoftwareProgress.create({
                studentId: student.id,
                softwareName,
                softwareCode: code,
                status,
                enrollmentDate,
                courseName,
                courseType,
                studentStatus,
                batchTiming,
                schedule,
                facultyName,
                batchStartDate,
                batchEndDate,
                metadata: row, // Store entire row as metadata
              });
            }
          }
        }

        // Process first software if specified
        if (firstSoftwareName) {
          const existing = await db.StudentSoftwareProgress.findOne({
            where: {
              studentId: student.id,
              softwareName: firstSoftwareName,
            },
          });

          if (existing) {
            existing.batchStartDate = batchStartDate;
            existing.batchEndDate = batchEndDate;
            await existing.save();
          } else {
            await db.StudentSoftwareProgress.create({
              studentId: student.id,
              softwareName: firstSoftwareName,
              enrollmentDate,
              courseName,
              courseType,
              studentStatus,
              batchTiming,
              schedule,
              facultyName,
              batchStartDate,
              batchEndDate,
              status: 'IP',
            });
          }
        }

        // Process second software if specified
        if (secondSoftwareName) {
          const existing = await db.StudentSoftwareProgress.findOne({
            where: {
              studentId: student.id,
              softwareName: secondSoftwareName,
            },
          });

          if (!existing) {
            await db.StudentSoftwareProgress.create({
              studentId: student.id,
              softwareName: secondSoftwareName,
              enrollmentDate,
              courseName,
              courseType,
              studentStatus,
              batchTiming,
              schedule,
              facultyName,
              status: 'XX',
            });
          }
        }

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error',
        });
        logger.error(`Error processing row ${rowNumber}:`, error);
      }
    }

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    logger.error('Import Excel error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/student-software-progress/export-excel
 * Export student software progress to Excel file
 */
export const exportExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('Export Excel request received');
    
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
        message: 'Only admins can export student software progress',
      });
      return;
    }

    const { studentId, courseName, status } = req.query;
    logger.info('Export filters:', { studentId, courseName, status });

    const where: any = {};
    if (studentId) where.studentId = parseInt(studentId as string, 10);
    if (courseName) where.courseName = { [Op.like]: `%${courseName}%` };
    if (status) where.status = status;

    logger.info('Fetching records...');
    const records = await db.StudentSoftwareProgress.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false, // Allow null students (in case student was deleted)
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode', 'status'],
          required: false,
        },
      ],
      order: [['studentId', 'ASC'], ['softwareName', 'ASC']],
    });
    
    logger.info(`Found ${records.length} records`);

    // Group by student
    const studentMap = new Map();
    records.forEach((record: any) => {
      const studentId = record.studentId;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: record.student,
          softwareRecords: [],
        });
      }
      studentMap.get(studentId).softwareRecords.push(record);
    });

    // Helper function to safely format dates
    const formatDate = (date: any): string => {
      if (!date) return '';
      try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (e) {
        logger.warn('Error formatting date:', date, e);
        return '';
      }
    };

    // Build Excel data
    const excelData: any[] = [];
    
    if (records.length === 0) {
      // Return empty Excel file if no records
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([{ message: 'No data available' }]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Software Progress');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=student_software_progress.xlsx');
      res.setHeader('Content-Length', buffer.length.toString());
      res.send(buffer);
      return;
    }
    
    studentMap.forEach(({ student, softwareRecords }) => {
      // Skip if student is null (deleted student but records remain)
      if (!student || !softwareRecords || softwareRecords.length === 0) {
        return;
      }
      
      const firstRecord = softwareRecords[0];
      
      const row: any = {
        'Enrollment Date': formatDate(firstRecord.enrollmentDate),
        'Student Name': student?.name || 'N/A',
        'Phone': student?.phone || 'N/A',
        'Type': firstRecord.courseType || '',
        'Status': firstRecord.studentStatus || '',
        'Timing': firstRecord.batchTiming || '',
        'Course': firstRecord.courseName || '',
        '1st Software': formatDate(firstRecord.batchStartDate),
        '1st Software End': formatDate(firstRecord.batchEndDate),
        'Schedule': firstRecord.schedule || '',
        'Faculty': firstRecord.facultyName || '',
        '1st Software Name': firstRecord.softwareName || '',
        '2nd Software': softwareRecords.length > 1 ? softwareRecords[1].softwareName : '',
      };

      // Add software status columns
      softwareRecords.forEach((rec: any) => {
        if (rec.softwareCode) {
          row[rec.softwareCode] = rec.status || '';
        }
      });

      excelData.push(row);
    });

    // If no data after filtering, return empty file with message
    if (excelData.length === 0) {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([{ message: 'No data matches the selected filters' }]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Software Progress');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=student_software_progress.xlsx');
      res.send(buffer);
      return;
    }

    // Create workbook
    logger.info(`Creating Excel workbook with ${excelData.length} rows...`);
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Software Progress');

    logger.info('Generating buffer...');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    logger.info(`Buffer generated, size: ${buffer.length} bytes`);

    // Set headers BEFORE sending response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_software_progress.xlsx');
    res.setHeader('Content-Length', buffer.length.toString());

    // Send file
    logger.info('Sending file...');
    res.send(buffer);
    logger.info('Export completed successfully');
  } catch (error: any) {
    logger.error('Export Excel error:', error);
    logger.error('Export Excel error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Make sure to clear any headers that were set for file download
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        status: 'error',
        message: 'Internal server error while generating Excel file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    } else {
      logger.error('Headers already sent, cannot send error response');
    }
  }
};


