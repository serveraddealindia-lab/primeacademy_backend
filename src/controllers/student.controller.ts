import { Response } from 'express';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import db from '../models';
import { logger } from '../utils/logger';

interface CompleteEnrollmentBody {
  studentName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  dateOfAdmission: string;
  localAddress?: string;
  permanentAddress?: string;
  emergencyContactNumber?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  courseName?: string;
  batchId?: number;
  softwaresIncluded?: string;
  totalDeal?: number;
  bookingAmount?: number;
  balanceAmount?: number;
  emiPlan?: boolean;
  emiPlanDate?: string;
  complimentarySoftware?: string;
  complimentaryGift?: string;
  hasReference?: boolean;
  referenceDetails?: string;
  counselorName?: string;
  leadSource?: string;
  walkinDate?: string;
  masterFaculty?: string;
}

// POST /students/enroll → Create student user, profile, and enrollment in one call
export const completeEnrollment = async (
  req: AuthRequest & { body: CompleteEnrollmentBody },
  res: Response
): Promise<void> => {
  const transaction = await db.sequelize.transaction();
  
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can create enrollments
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can create student enrollments',
      });
      return;
    }

    const {
      studentName,
      email,
      phone,
      whatsappNumber,
      dateOfAdmission,
      localAddress,
      permanentAddress,
      emergencyContactNumber,
      emergencyName,
      emergencyRelation,
      courseName,
      batchId,
      softwaresIncluded,
      totalDeal,
      bookingAmount,
      balanceAmount,
      emiPlan,
      emiPlanDate,
      complimentarySoftware,
      complimentaryGift,
      hasReference,
      referenceDetails,
      counselorName,
      leadSource,
      walkinDate,
      masterFaculty,
    } = req.body;

    // Validation - Only studentName and phone are required
    if (!studentName || !studentName.trim()) {
      await transaction.rollback();
      res.status(400).json({
        status: 'error',
        message: 'Student name is required',
      });
      return;
    }
    
    if (!phone || !phone.trim()) {
      await transaction.rollback();
      res.status(400).json({
        status: 'error',
        message: 'Phone number is required',
      });
      return;
    }
    
    // Trim the values
    const trimmedStudentName = studentName.trim();
    const trimmedPhone = phone.trim();

    // Check if user already exists by email (if provided) or phone
    if (email?.trim()) {
      const existingUserByEmail = await db.User.findOne({ where: { email: email.trim() }, transaction });
      if (existingUserByEmail) {
        await transaction.rollback();
        res.status(409).json({
          status: 'error',
          message: 'User with this email already exists',
        });
        return;
      }
    }

    // Check if user already exists by phone
    const existingUserByPhone = await db.User.findOne({ where: { phone: trimmedPhone }, transaction });
    if (existingUserByPhone) {
      await transaction.rollback();
      res.status(409).json({
        status: 'error',
        message: 'User with this phone number already exists',
      });
      return;
    }

    // Generate a default password (can be changed later)
    const defaultPassword = 'Student@123'; // You might want to make this configurable
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // Generate email if not provided (use phone-based email)
    const finalEmail = email?.trim() || `student_${trimmedPhone.replace(/\D/g, '')}@primeacademy.local`;

    // Create user
    const user = await db.User.create(
      {
        name: trimmedStudentName,
        email: finalEmail,
        phone: trimmedPhone,
        role: UserRole.STUDENT,
        passwordHash,
        isActive: true,
      },
      { transaction }
    );

    // Create student profile if StudentProfile model exists
    if (db.StudentProfile) {
      const profileData: any = {
        userId: user.id,
        dob: dateOfAdmission ? new Date(dateOfAdmission) : null,
        address: localAddress || permanentAddress || null,
        softwareList: softwaresIncluded ? softwaresIncluded.split(',').map((s: string) => s.trim()).filter((s: string) => s) : null,
        enrollmentDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
        status: 'active',
      };

      // Store additional fields in documents JSON field (only if there are any)
      const additionalInfo: any = {};
      if (whatsappNumber) additionalInfo.whatsappNumber = whatsappNumber;
      if (emergencyContactNumber) {
        additionalInfo.emergencyContact = {
          name: emergencyName || null,
          number: emergencyContactNumber,
          relation: emergencyRelation || null,
        };
      }
      if (courseName) additionalInfo.courseName = courseName;
      if (totalDeal !== undefined) additionalInfo.totalDeal = totalDeal;
      if (bookingAmount !== undefined) additionalInfo.bookingAmount = bookingAmount;
      if (balanceAmount !== undefined) additionalInfo.balanceAmount = balanceAmount;
      if (emiPlan !== undefined) additionalInfo.emiPlan = emiPlan;
      if (emiPlanDate) additionalInfo.emiPlanDate = emiPlanDate;
      if (complimentarySoftware) additionalInfo.complimentarySoftware = complimentarySoftware;
      if (complimentaryGift) additionalInfo.complimentaryGift = complimentaryGift;
      if (hasReference !== undefined) additionalInfo.hasReference = hasReference;
      if (referenceDetails) additionalInfo.referenceDetails = referenceDetails;
      if (counselorName) additionalInfo.counselorName = counselorName;
      if (leadSource) additionalInfo.leadSource = leadSource;
      if (walkinDate) additionalInfo.walkinDate = walkinDate;
      if (masterFaculty) additionalInfo.masterFaculty = masterFaculty;
      if (permanentAddress) additionalInfo.permanentAddress = permanentAddress;
      if (localAddress) additionalInfo.localAddress = localAddress;

      if (Object.keys(additionalInfo).length > 0) {
        profileData.documents = additionalInfo;
      }

      await db.StudentProfile.create(profileData, { transaction });
    }

    // Create enrollment if batchId is provided
    let enrollment = null;
    if (batchId) {
      // Verify batch exists
      const batch = await db.Batch.findByPk(batchId, { transaction });
      if (!batch) {
        await transaction.rollback();
        res.status(404).json({
          status: 'error',
          message: 'Batch not found',
        });
        return;
      }

      // Check if student is already enrolled
      const existingEnrollment = await db.Enrollment.findOne({
        where: { studentId: user.id, batchId },
        transaction,
      });

      if (!existingEnrollment) {
        // Check batch capacity
        const currentEnrollments = await db.Enrollment.count({
          where: { batchId },
          transaction,
        });

        if (batch.maxCapacity && currentEnrollments >= batch.maxCapacity) {
          await transaction.rollback();
          res.status(400).json({
            status: 'error',
            message: `Batch has reached maximum capacity of ${batch.maxCapacity} students`,
          });
          return;
        }

        enrollment = await db.Enrollment.create(
          {
            studentId: user.id,
            batchId,
            enrollmentDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
            status: 'active',
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    logger.info(`Complete enrollment created: userId=${user.id}, email=${email}, batchId=${batchId || 'none'}`);

    res.status(201).json({
      status: 'success',
      message: 'Student enrolled successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        enrollment: enrollment
          ? {
              id: enrollment.id,
              studentId: enrollment.studentId,
              batchId: enrollment.batchId,
              enrollmentDate: enrollment.enrollmentDate,
              status: enrollment.status,
            }
          : undefined,
      },
    });
  } catch (error: any) {
    await transaction.rollback();
    logger.error('Complete enrollment error:', error);
    logger.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      errors: error?.errors,
    });
    res.status(500).json({
      status: 'error',
      message: error?.message || 'Internal server error while creating enrollment',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        details: error?.errors || error?.parent?.message,
      }),
    });
  }
};

// POST /students/create-dummy → Create a dummy student with all details
export const createDummyStudent = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Check if student already exists
    const existingStudent = await db.User.findOne({
      where: { email: 'john.doe@primeacademy.local' },
      transaction,
    });

    if (existingStudent) {
      await transaction.rollback();
      res.status(409).json({
        status: 'error',
        message: 'Dummy student already exists with email: john.doe@primeacademy.local',
      });
      return;
    }

    // Hash password
    const password = 'Student@123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await db.User.create(
      {
        name: 'John Doe',
        email: 'john.doe@primeacademy.local',
        phone: '+1234567890',
        role: UserRole.STUDENT,
        passwordHash,
        isActive: true,
        avatarUrl: 'https://ui-avatars.com/api/?name=John+Doe&background=orange&color=fff&size=200',
      },
      { transaction }
    );

    // Create student profile with all details
    let studentProfile = null;
    if (db.StudentProfile) {
      studentProfile = await db.StudentProfile.create(
        {
          userId: user.id,
          dob: new Date('2000-05-15'),
          address: '123 Main Street, City, State, ZIP Code, Country',
          photoUrl: 'https://ui-avatars.com/api/?name=John+Doe&background=orange&color=fff&size=400',
          softwareList: ['Photoshop', 'Illustrator', 'InDesign', 'Premiere Pro', 'After Effects'],
          enrollmentDate: new Date('2024-01-15'),
          status: 'active',
          documents: {
            whatsappNumber: '+1234567890',
            emergencyContactNumber: '+1987654321',
            emergencyName: 'Jane Doe',
            emergencyRelation: 'Mother',
            localAddress: '123 Main Street, City, State, ZIP Code',
            permanentAddress: '123 Main Street, City, State, ZIP Code',
            courseName: 'Graphic Design Master Course',
            totalDeal: 50000,
            bookingAmount: 10000,
            balanceAmount: 40000,
            emiPlan: true,
            emiPlanDate: '2024-02-01',
            complimentarySoftware: 'Adobe Creative Cloud',
            complimentaryGift: 'Design Tablet',
            hasReference: true,
            referenceDetails: 'Referred by friend',
            counselorName: 'Sarah Smith',
            leadSource: 'Website',
            walkinDate: '2024-01-10',
            masterFaculty: 'Prof. Michael Johnson',
          },
        },
        { transaction }
      );
    }

    // Try to enroll in a batch if any exists
    let enrollment = null;
    const firstBatch = await db.Batch.findOne({
      where: { status: 'active' },
      transaction,
    });

    if (firstBatch && db.Enrollment) {
      enrollment = await db.Enrollment.create(
        {
          studentId: user.id,
          batchId: firstBatch.id,
          enrollmentDate: new Date('2024-01-15'),
          status: 'active',
        },
        { transaction }
      );
    }

    await transaction.commit();
    
    res.status(201).json({
      status: 'success',
      message: 'Dummy student created successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        studentProfile: studentProfile ? {
          id: studentProfile.id,
          softwareList: studentProfile.softwareList,
          status: studentProfile.status,
        } : null,
        enrollment: enrollment ? {
          id: enrollment.id,
          batchId: enrollment.batchId,
        } : null,
        password: password, // Return password for testing
      },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating dummy student:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating dummy student',
    });
  }
};

// POST /students/create-three-dummy → Create 3 dummy students with different scenarios
export const createThreeDummyStudents = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Import the script function
    const createThreeDummyStudentsScript = (await import('../scripts/createThreeDummyStudents')).default;
    await createThreeDummyStudentsScript();
    
    res.status(201).json({
      status: 'success',
      message: '3 dummy students created successfully',
      data: {
        students: [
          { name: 'Alice Johnson', email: 'alice.johnson@primeacademy.local', scenario: 'Enrolled in future batch' },
          { name: 'Bob Smith', email: 'bob.smith@primeacademy.local', scenario: 'Multiple enrollments' },
          { name: 'Carol Williams', email: 'carol.williams@primeacademy.local', scenario: 'On leave with pending batch' },
        ],
        password: 'Student@123',
      },
    });
  } catch (error: any) {
    logger.error('Error creating three dummy students:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating dummy students',
      error: error.message,
    });
  }
};

// GET /students/all-software → Get all unique software from batches and student profiles
export const getAllSoftware = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Get all software from batches
    const batches = await db.Batch.findAll({
      attributes: ['software'],
      where: {
        software: { [Op.ne]: null },
      },
    });

    // Get all software from student profiles
    const studentProfiles = await db.StudentProfile.findAll({
      attributes: ['softwareList'],
      where: {
        softwareList: { [Op.ne]: null },
      },
    });

    // Collect all software
    const softwareSet = new Set<string>();

    // Extract from batches (comma-separated or single string)
    batches.forEach((batch: any) => {
      if (batch.software) {
        const softwareArray = batch.software.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        softwareArray.forEach((s: string) => softwareSet.add(s));
      }
    });

    // Extract from student profiles (array)
    studentProfiles.forEach((profile: any) => {
      if (profile.softwareList && Array.isArray(profile.softwareList)) {
        profile.softwareList.forEach((s: string) => {
          if (s && typeof s === 'string') {
            softwareSet.add(s.trim());
          }
        });
      }
    });

    // Convert to sorted array
    const allSoftware = Array.from(softwareSet).sort();

    res.status(200).json({
      status: 'success',
      data: {
        software: allSoftware,
        count: allSoftware.length,
      },
    });
  } catch (error) {
    logger.error('Get all software error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching software list',
    });
  }
};

// POST /students/bulk-enroll → Bulk enroll students from Excel (admin only)
export const bulkEnrollStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only SuperAdmin and Admin can bulk enroll
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can bulk enroll students',
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

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

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
      errors: [] as Array<{ row: number; email: string; error: string }>,
    };

    // Process each row (each row gets its own transaction for isolation)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any;
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have a header
      const transaction = await db.sequelize.transaction();

      try {
        // Validate required fields
        if (!row.studentName || !row.email || !row.phone || !row.dateOfAdmission) {
          await transaction.rollback();
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: row.email || 'N/A',
            error: 'Missing required fields: studentName, email, phone, or dateOfAdmission',
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await db.User.findOne({ 
          where: { email: row.email },
          transaction 
        });
        if (existingUser) {
          await transaction.rollback();
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'User with this email already exists',
          });
          continue;
        }

        // Generate default password (email prefix + '123')
        const defaultPassword = `${row.email.split('@')[0]}123`;
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        // Create user
        const user = await db.User.create({
          name: row.studentName,
          email: row.email,
          phone: row.phone || null,
          role: UserRole.STUDENT,
          passwordHash,
          isActive: true,
        }, { transaction });

        // Prepare enrollment metadata
        const enrollmentMetadata: any = {
          whatsappNumber: row.whatsappNumber || row.phone,
          emergencyContactNumber: row.emergencyContactNumber,
          emergencyName: row.emergencyName,
          emergencyRelation: row.emergencyRelation,
          courseName: row.courseName,
          totalDeal: row.totalDeal,
          bookingAmount: row.bookingAmount,
          balanceAmount: row.balanceAmount,
          emiPlan: row.emiPlan,
          emiPlanDate: row.emiPlanDate,
          complimentarySoftware: row.complimentarySoftware,
          complimentaryGift: row.complimentaryGift,
          hasReference: row.hasReference,
          referenceDetails: row.referenceDetails,
          counselorName: row.counselorName,
          leadSource: row.leadSource,
          walkinDate: row.walkinDate,
          masterFaculty: row.masterFaculty,
        };

        const softwareList = row.softwaresIncluded
          ? row.softwaresIncluded.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          : [];

        // Create student profile
        if (db.StudentProfile) {
          await db.StudentProfile.create({
            userId: user.id,
            dob: row.dateOfAdmission ? new Date(row.dateOfAdmission) : null,
            address: `${row.localAddress || ''} | Permanent: ${row.permanentAddress || ''}`.trim() || null,
            documents: {
              enrollmentMetadata,
            },
            softwareList: softwareList.length > 0 ? softwareList : null,
            photoUrl: null,
            enrollmentDate: row.dateOfAdmission ? new Date(row.dateOfAdmission) : new Date(),
            status: 'active',
          }, { transaction });
        }

        await transaction.commit();
        result.success++;
      } catch (error: any) {
        await transaction.rollback();
        logger.error(`Error processing row ${rowNumber}:`, error);
        result.failed++;
        result.errors.push({
          row: rowNumber,
          email: (row as any).email || 'N/A',
          error: error.message || 'Unknown error',
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Bulk enrollment completed. ${result.success} students enrolled, ${result.failed} failed.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Bulk enrollment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing bulk enrollment',
      error: error.message,
    });
  }
};

// GET /students/template → Download enrollment template (admin only)
export const downloadEnrollmentTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('Download template request received');
    
    if (!req.user) {
      logger.warn('Download template: Authentication required');
      res.setHeader('Content-Type', 'application/json');
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only SuperAdmin and Admin can download template
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      logger.warn(`Download template: Unauthorized role - ${req.user.role}`);
      res.setHeader('Content-Type', 'application/json');
      res.status(403).json({
        status: 'error',
        message: 'Only admins can download enrollment template',
      });
      return;
    }

    logger.info('Creating Excel template...');

    // Create sample data
    const sampleData = [
      {
        studentName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        whatsappNumber: '+1234567890',
        dateOfAdmission: '2024-01-15',
        localAddress: '123 Main St, City, State',
        permanentAddress: '123 Main St, City, State',
        emergencyContactNumber: '+1234567891',
        emergencyName: 'Jane Doe',
        emergencyRelation: 'Mother',
        courseName: 'Graphic Design',
        totalDeal: 50000,
        bookingAmount: 10000,
        balanceAmount: 40000,
        emiPlan: 'Yes',
        emiPlanDate: '2024-02-15',
        softwaresIncluded: 'Photoshop, Illustrator, InDesign',
        complimentarySoftware: 'Adobe Creative Cloud',
        complimentaryGift: 'Mouse Pad',
        hasReference: 'Yes',
        referenceDetails: 'Referred by friend',
        counselorName: 'Sarah Smith',
        leadSource: 'Walk-in',
        walkinDate: '2024-01-10',
        masterFaculty: 'Dr. John Smith',
      },
    ];

    // Create workbook
    logger.info('Creating workbook...');
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Enrollment');

    // Generate buffer
    logger.info('Generating buffer...');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    logger.info(`Buffer generated, size: ${buffer.length} bytes`);

    // Set headers BEFORE sending response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_enrollment_template.xlsx');
    res.setHeader('Content-Length', buffer.length.toString());

    // Send file
    logger.info('Sending file...');
    res.send(buffer);
    logger.info('Template sent successfully');
  } catch (error: any) {
    logger.error('Download template error:', error);
    logger.error('Download template error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Make sure to clear any headers that were set for file download
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        status: 'error',
        message: 'Internal server error while generating template',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    } else {
      logger.error('Headers already sent, cannot send error response');
    }
  }
};

