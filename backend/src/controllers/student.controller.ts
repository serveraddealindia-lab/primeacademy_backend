import { Response } from 'express';
import bcrypt from 'bcrypt';
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
  req: AuthRequest,
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

