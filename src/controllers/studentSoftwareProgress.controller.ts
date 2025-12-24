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
      
      // Try more flexible matching for student names
      if (names.includes('studentName') || names.includes('name')) {
        for (const key in row) {
          const lowerKey = key.toLowerCase();
          if ((lowerKey.includes('student') && lowerKey.includes('name')) || 
              lowerKey.includes('full') && lowerKey.includes('name') ||
              lowerKey === 'student' || lowerKey === 'name') {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key];
            }
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
        // Support multiple possible phone column headers, including 'NUMBER' from the Excel sheet
        const phone = getValue(row, ['phone', 'phoneNumber', 'NUMBER', '__EMPTY_2', 'Phone', 'Phone Number']);
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

        // If student not found, create them automatically
        if (!student) {
          // Log row data for debugging (first 3 rows)
          if (i < 3) {
            logger.info(`Row ${i + 2} data keys: ${Object.keys(row).join(', ')}`);
            logger.info(`Row ${i + 2} data values: ${JSON.stringify(row)}`);
          }
          
          // Try to get student name from Excel first
          let studentName = getValue(row, ['studentName', 'name', 'Name', 'Student Name', 'Student_Name', 'Full Name', 'fullName']);
          
          // If no name in Excel, check if we already have a student with this phone in database with a proper name
          if (!studentName) {
            // Search for any existing user with this phone (not necessarily student role)
            const existingUserWithPhone = await db.User.findOne({
              where: { 
                phone: {
                  [Op.like]: `%${normalizedPhone}%`
                }
              },
            });
            
            if (existingUserWithPhone && existingUserWithPhone.name && !existingUserWithPhone.name.startsWith('Student_')) {
              studentName = existingUserWithPhone.name;
            } else {
              // Check if we have a student profile with documents that might contain the name
              const studentProfile = await db.StudentProfile.findOne({
                where: {
                  userId: existingUserWithPhone?.id
                },
                attributes: { exclude: ['serialNo'] }, // Exclude serialNo column
              });
              
              if (studentProfile && studentProfile.documents) {
                try {
                  const documents = typeof studentProfile.documents === 'string' 
                    ? JSON.parse(studentProfile.documents) 
                    : studentProfile.documents;
                  
                  // Look for name in documents
                  if (documents.studentName) {
                    studentName = documents.studentName;
                  } else if (documents.name) {
                    studentName = documents.name;
                  } else if (documents.fullName) {
                    studentName = documents.fullName;
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
              
              // If still no name found, use default
              if (!studentName) {
                studentName = `Student_${normalizedPhone}`;
              }
            }
          }
          
          // Log detected student name
          if (i < 3) {
            logger.info(`Row ${i + 2} detected student name: ${studentName}`);
          }
          
          logger.info(`Student not found with phone ${normalizedPhone}, creating new student with name: ${studentName}...`);
          try {
            // Create student automatically
            const newStudent = await db.User.create({
              name: studentName,
              email: getValue(row, ['email', 'Email']) || `student_${normalizedPhone}@primeacademy.local`,
              phone: normalizedPhone,
              role: UserRole.STUDENT,
              passwordHash: '$2b$10$dummyhashforstudents', // Default password
              isActive: true,
            });
            student = newStudent;
            logger.info(`Created new student with ID: ${student.id}, name: ${student.name}, phone: ${normalizedPhone}`);
          } catch (createError: any) {
            logger.error(`Failed to create student with phone ${normalizedPhone}:`, createError);
            result.failed++;
            result.errors.push({ row: i + 2, error: `Student not found and failed to create: ${phone}` });
            continue;
          }
        }

        // Get enrollment date - support multiple column names
        const enrollmentDate = parseExcelDate(getValue(row, [
          'DATE', 
          'enrollmentDate', 
          '__EMPTY', 
          'Enrollment Date',
          'Date'
        ]));

        // Get course info - support multiple column names
        const courseName = getValue(row, [
          'COMMON',
          'courseName', 
          '__EMPTY_6', 
          'Course Name',
          'Common'
        ]);
        const courseType = getValue(row, [
          'TYPE',
          'COURSE',
          'courseType', 
          '__EMPTY_3', 
          'Course Type',
          'Type',
          'Course'
        ]);
        const studentStatus = getValue(row, [
          'STATUS',
          'studentStatus', 
          '__EMPTY_4', 
          'Student Status',
          'Status'
        ]);
        const batchTiming = getValue(row, [
          'TIME',
          'batchTiming', 
          '__EMPTY_5', 
          'Batch Timing',
          'Time',
          '1st Software BATCH TIMING',
          '2nd Software BATCH TIMING',
          'Future Batch BATCH TIME'
        ]);
        
        // Get 1st Software details
        const firstSoftwareStartDate = parseExcelDate(getValue(row, ['1st Software START DATE', '1st Software Start Date']));
        const firstSoftwareEndDate = parseExcelDate(getValue(row, ['1st Software END DATE', '1st Software End Date']));
        const firstSoftwareFaculty = getValue(row, ['1st Software FACULTY', '1st Software Faculty']);
        const firstSoftwareStatus = getValue(row, ['1st Software CURRENT', '1st Software Current']);
        
        // Get 2nd Software details
        const secondSoftwareStartDate = parseExcelDate(getValue(row, ['2nd Software START DATE', '2nd Software Start Date']));
        const secondSoftwareEndDate = parseExcelDate(getValue(row, ['2nd Software END DATE', '2nd Software End Date']));
        const secondSoftwareFaculty = getValue(row, ['2nd Software FACULTY', '2nd Software Faculty']);
        const secondSoftwareStatus = getValue(row, ['2nd Software CURRENT', '2nd Software Current']);
        
        // Get Future Batch details
        // Future batch fields - stored in metadata for future use
        const futureBatchStartDate = parseExcelDate(getValue(row, ['Future Batch START DATE', 'Future Batch Start Date']));
        const futureBatchEndDate = parseExcelDate(getValue(row, ['Future Batch END DATE', 'Future Batch End Date']));
        const futureBatchTime = getValue(row, ['Future Batch BATCH TIME', 'Future Batch Batch Time']);
        const futureBatchSchedule = getValue(row, ['Future Batch MWF/TTS', 'Future Batch Schedule', 'MWF/TTS']);
        const futureBatchFaculty = getValue(row, ['Future Batch FACULTY', 'Future Batch Faculty']);
        
        // Store future batch info in metadata (currently not used but preserved for future features)
        const futureBatchMetadata = {
          startDate: futureBatchStartDate,
          endDate: futureBatchEndDate,
          time: futureBatchTime,
          schedule: futureBatchSchedule,
          faculty: futureBatchFaculty,
        };
        
        // Get software names early for matching
        const firstSoftwareName = getValue(row, ['1st Software', '__EMPTY_12', 'First Software']);
        const secondSoftwareName = getValue(row, ['2nd Software', 'Second Software']);

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

            // Determine batch dates and faculty from software sections if available
            let batchStartDate = null;
            let batchEndDate = null;
            let facultyName = null;
            
            // Check if this software matches 1st or 2nd software
            if (firstSoftwareName && softwareName.toLowerCase().includes(String(firstSoftwareName).toLowerCase().substring(0, 5))) {
              batchStartDate = firstSoftwareStartDate;
              batchEndDate = firstSoftwareEndDate;
              facultyName = firstSoftwareFaculty;
            } else if (secondSoftwareName && softwareName.toLowerCase().includes(String(secondSoftwareName).toLowerCase().substring(0, 5))) {
              batchStartDate = secondSoftwareStartDate;
              batchEndDate = secondSoftwareEndDate;
              facultyName = secondSoftwareFaculty;
            }
            
            // Get schedule if available
            const schedule = futureBatchSchedule || getValue(row, ['schedule', 'Schedule', 'MWF/TTS']);

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
                batchStartDate: batchStartDate || existing.batchStartDate,
                batchEndDate: batchEndDate || existing.batchEndDate,
                facultyName: facultyName || existing.facultyName,
                schedule: schedule || existing.schedule,
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
                batchStartDate,
                batchEndDate,
                facultyName,
                schedule,
              });
            }
          }
        }

        // Process software name columns (1st Software, 2nd Software, etc.)
        if (firstSoftwareName) {
          const existing = await db.StudentSoftwareProgress.findOne({
            where: { studentId: student.id, softwareName: String(firstSoftwareName).trim() },
          });

          // Use future batch metadata if available
          const metadata = Object.keys(futureBatchMetadata).some(key => futureBatchMetadata[key as keyof typeof futureBatchMetadata] !== null && futureBatchMetadata[key as keyof typeof futureBatchMetadata] !== undefined)
            ? { futureBatch: futureBatchMetadata }
            : undefined;

          if (!existing) {
            await db.StudentSoftwareProgress.create({
              studentId: student.id,
              softwareName: String(firstSoftwareName).trim(),
              status: firstSoftwareStatus || 'XX',
              enrollmentDate,
              courseName,
              courseType,
              studentStatus,
              batchTiming: firstSoftwareStartDate ? getValue(row, ['1st Software BATCH TIMING']) : batchTiming,
              batchStartDate: firstSoftwareStartDate,
              batchEndDate: firstSoftwareEndDate,
              facultyName: firstSoftwareFaculty,
              metadata,
            });
          } else {
            // Update existing with 1st software details
            await existing.update({
              batchStartDate: firstSoftwareStartDate || existing.batchStartDate,
              batchEndDate: firstSoftwareEndDate || existing.batchEndDate,
              facultyName: firstSoftwareFaculty || existing.facultyName,
              status: firstSoftwareStatus || existing.status,
              metadata: metadata || existing.metadata,
            });
          }
        }
        
        // Process 2nd Software
        if (secondSoftwareName) {
          const existing = await db.StudentSoftwareProgress.findOne({
            where: { studentId: student.id, softwareName: String(secondSoftwareName).trim() },
          });

          if (!existing) {
            await db.StudentSoftwareProgress.create({
              studentId: student.id,
              softwareName: String(secondSoftwareName).trim(),
              status: secondSoftwareStatus || 'XX',
              enrollmentDate,
              courseName,
              courseType,
              studentStatus,
              batchTiming: secondSoftwareStartDate ? getValue(row, ['2nd Software BATCH TIMING']) : batchTiming,
              batchStartDate: secondSoftwareStartDate,
              batchEndDate: secondSoftwareEndDate,
              facultyName: secondSoftwareFaculty,
            });
          } else {
            // Update existing with 2nd software details
            await existing.update({
              batchStartDate: secondSoftwareStartDate || existing.batchStartDate,
              batchEndDate: secondSoftwareEndDate || existing.batchEndDate,
              facultyName: secondSoftwareFaculty || existing.facultyName,
              status: secondSoftwareStatus || existing.status,
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

// GET /api/student-software-progress/download-template - Download Excel import template
export const downloadTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ status: 'error', message: 'Only admins can download template' });
      return;
    }

    logger.info('Creating studentwise Excel import template...');

    // Create sample data with all required fields for studentwise import
    // Matching the structure from the Excel template image
    const sampleData = [
      {
        // General Student Information
        DATE: '2024-01-15', // Enrollment Date
        NAME: 'John Doe',
        NUMBER: '9876543210', // Required: Phone number
        TYPE: 'Regular', // Course Type
        STATUS: 'Active', // Student Status
        TIME: '7 to 9', // Batch Timing
        COMMON: 'Graphic Design', // Course Name
        COURSE: 'Regular', // Course Type (alternative)
        PLUS: '', // Additional field
        
        // 1st Software Section
        '1st Software START DATE': '2024-01-20',
        '1st Software END DATE': '2024-03-20',
        '1st Software BATCH TIMING': '7 to 9',
        '1st Software FACULTY': 'Dr. Smith',
        '1st Software CURRENT': 'IP', // Status: XX, IP, NO, or Finished
        
        // 2nd Software Section
        '2nd Software START DATE': '2024-03-25',
        '2nd Software END DATE': '2024-05-25',
        '2nd Software BATCH TIMING': '8 to 12',
        '2nd Software FACULTY': 'Dr. Johnson',
        '2nd Software CURRENT': 'XX',
        
        // Future Batch Section
        'Future Batch START DATE': '2024-06-01',
        'Future Batch END DATE': '2024-08-01',
        'Future Batch BATCH TIME': '9 to 11',
        'Future Batch MWF/TTS': 'MWF', // Schedule: MWF or TTS
        'Future Batch FACULTY': 'Dr. Williams',
        'Future Batch RENT SOFT': '',
        
        // Software Status Columns (numeric codes) - Use XX, IP, NO, or Finished
        // These map to software codes in SOFTWARE_CODE_MAP
        '6': 'IP',   // Photoshop
        '7': 'XX',   // Illustrator
        '8': 'Finished', // InDesign
        '10': 'NO',  // CorelDraw
        '11': 'XX',  // Figma
        '12': 'XX',  // After Effects
        '13': 'XX',  // Premiere Pro
        '14': 'XX',  // Audition
        '15': 'XX',  // Blender
        '16': 'XX',  // 3ds Max
        '23': 'XX',  // Cinema 4D
        '24': 'XX',  // Maya
        '32': 'XX',  // SketchUp
        '33': 'XX',  // AutoCAD
        '48': 'XX',  // Revit
        '72': 'XX',  // Unity
        '89': 'XX',  // Unreal Engine
        '92': 'XX',  // DaVinci Resolve
        
        // Additional software name column (for custom software)
        '1st Software': 'Photoshop',
        '2nd Software': 'Illustrator',
      },
      {
        // Second example row
        DATE: '2024-02-01',
        NAME: 'Jane Smith',
        NUMBER: '9876543211',
        TYPE: 'A Plus',
        STATUS: 'Active',
        TIME: '8 to 12',
        COMMON: 'Video Editing',
        COURSE: 'A Plus',
        PLUS: '',
        '1st Software START DATE': '2024-02-05',
        '1st Software END DATE': '2024-04-05',
        '1st Software BATCH TIMING': '8 to 12',
        '1st Software FACULTY': 'Dr. Brown',
        '1st Software CURRENT': 'IP',
        '2nd Software START DATE': '',
        '2nd Software END DATE': '',
        '2nd Software BATCH TIMING': '',
        '2nd Software FACULTY': '',
        '2nd Software CURRENT': '',
        'Future Batch START DATE': '2024-04-10',
        'Future Batch END DATE': '2024-06-10',
        'Future Batch BATCH TIME': '9 to 11',
        'Future Batch MWF/TTS': 'TTS',
        'Future Batch FACULTY': 'Dr. Davis',
        'Future Batch RENT SOFT': '',
        '6': 'Finished',
        '7': 'Finished',
        '12': 'IP',
        '13': 'IP',
        '1st Software': 'After Effects',
        '2nd Software': 'Premiere Pro',
      },
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths for better readability
    // Column order: DATE, NAME, NUMBER, TYPE, STATUS, TIME, COMMON, COURSE, PLUS,
    // 1st Software (5 cols), 2nd Software (5 cols), Future Batch (6 cols),
    // Software codes (18 cols), 1st Software name, 2nd Software name
    const colWidths = [
      { wch: 12 }, // DATE
      { wch: 20 }, // NAME
      { wch: 15 }, // NUMBER
      { wch: 12 }, // TYPE
      { wch: 12 }, // STATUS
      { wch: 12 }, // TIME
      { wch: 20 }, // COMMON
      { wch: 12 }, // COURSE
      { wch: 10 }, // PLUS
      // 1st Software section (5 columns)
      { wch: 18 }, // 1st Software START DATE
      { wch: 18 }, // 1st Software END DATE
      { wch: 18 }, // 1st Software BATCH TIMING
      { wch: 18 }, // 1st Software FACULTY
      { wch: 15 }, // 1st Software CURRENT
      // 2nd Software section (5 columns)
      { wch: 18 }, // 2nd Software START DATE
      { wch: 18 }, // 2nd Software END DATE
      { wch: 18 }, // 2nd Software BATCH TIMING
      { wch: 18 }, // 2nd Software FACULTY
      { wch: 15 }, // 2nd Software CURRENT
      // Future Batch section (6 columns)
      { wch: 18 }, // Future Batch START DATE
      { wch: 18 }, // Future Batch END DATE
      { wch: 18 }, // Future Batch BATCH TIME
      { wch: 12 }, // Future Batch MWF/TTS
      { wch: 18 }, // Future Batch FACULTY
      { wch: 15 }, // Future Batch RENT SOFT
      // Software code columns (18 columns)
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      // Software name columns
      { wch: 20 }, // 1st Software
      { wch: 20 }, // 2nd Software
    ];
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Software Progress');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    logger.info(`Template generated, size: ${buffer.length} bytes`);

    // Set headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=studentwise_import_template.xlsx');
    res.setHeader('Content-Length', buffer.length.toString());

    // Send file
    res.send(buffer);
    logger.info('Template sent successfully');
  } catch (error: any) {
    logger.error('Download template error:', error);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        status: 'error',
        message: 'Internal server error while generating template',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
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
