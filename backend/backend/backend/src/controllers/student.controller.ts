import { Response } from 'express';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { Op } from 'sequelize';
import * as path from 'path';
import * as fs from 'fs';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { PaymentStatus } from '../models/PaymentTransaction';
import db from '../models';
import { logger } from '../utils/logger';

/**
 * Parse date from Excel - handles Excel serial dates, various string formats, and Date objects
 * @param dateValue - Date value from Excel (can be number, string, or Date)
 * @returns Date object or null if invalid
 */
function parseExcelDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    
    // If it's a number (Excel serial date)
    if (typeof dateValue === 'number') {
      // Excel serial date: days since January 1, 1900
      // JavaScript Date uses milliseconds since January 1, 1970
      // Excel epoch: January 1, 1900 = -2208988800000 ms
      // But Excel incorrectly treats 1900 as a leap year, so we need to adjust
      const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
      const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      if (!trimmed) return null;
      
      // Try ISO format first (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) return date;
      }
      
      // Try DD/MM/YYYY format
      const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      }
      
      // Try MM/DD/YYYY format (fallback, but prefer DD/MM/YYYY)
      const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mmddyyyy) {
        // Check if it's likely MM/DD/YYYY (month > 12) or DD/MM/YYYY (day > 12)
        const first = parseInt(mmddyyyy[1]);
        const second = parseInt(mmddyyyy[2]);
        if (first > 12 && second <= 12) {
          // First is day, second is month - DD/MM/YYYY
          const [, day, month, year] = mmddyyyy;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) return date;
        } else if (first <= 12 && second > 12) {
          // First is month, second is day - MM/DD/YYYY
          const [, month, day, year] = mmddyyyy;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) return date;
        } else {
          // Ambiguous - try DD/MM/YYYY first (preferred format)
          const [, day, month, year] = mmddyyyy;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) return date;
        }
      }
      
      // Try generic Date parsing
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) return date;
    }
    
    return null;
  } catch (error) {
    logger.warn(`Failed to parse date: ${dateValue}`, error);
    return null;
  }
}

interface CompleteEnrollmentBody {
  studentName: string;
  email: string; // Required
  phone: string;
  whatsappNumber?: string;
  dateOfAdmission: string; // Required
  localAddress?: string;
  permanentAddress?: string;
  emergencyContactNumber?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  courseName?: string;
  batchId?: number;
  softwaresIncluded?: string;
  totalDeal: number; // Required - student registration not possible without deal amount
  bookingAmount?: number;
  balanceAmount?: number;
  emiPlan?: boolean;
  emiPlanDate?: string;
  emiInstallments?: Array<{
    month: number;
    amount: number;
    dueDate?: string;
  }>;
  complimentarySoftware?: string;
  complimentaryGift?: string;
  hasReference?: boolean;
  referenceDetails?: string;
  counselorName?: string;
  leadSource?: string;
  walkinDate?: string;
  masterFaculty?: string;
  enrollmentDocuments?: string[]; // Array of document URLs
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
      emiInstallments,
      complimentarySoftware,
      complimentaryGift,
      hasReference,
      referenceDetails,
      counselorName,
      leadSource,
      walkinDate,
      masterFaculty,
      enrollmentDocuments,
    } = req.body;

    // Validation - All enrollment fields are required
    const validationErrors: string[] = [];
    
    // Helper function to safely check string values
    const isEmptyString = (value: any): boolean => {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') return !value.trim();
      if (typeof value === 'number') return false; // Numbers are not empty
      if (Array.isArray(value)) return value.length === 0;
      return !value;
    };
    
    // Log received data for debugging (in production, only log structure, not sensitive data)
    logger.info('Complete enrollment request received:', {
      hasStudentName: !!studentName,
      hasEmail: !!email,
      hasPhone: !!phone,
      hasWhatsappNumber: !!whatsappNumber,
      hasDateOfAdmission: !!dateOfAdmission,
      hasBatchId: !!batchId,
      hasCourseName: !!courseName,
      hasSoftwaresIncluded: !!softwaresIncluded,
      totalDealType: typeof totalDeal,
      bookingAmountType: typeof bookingAmount,
      balanceAmountType: typeof balanceAmount,
    });
    
    if (isEmptyString(studentName)) {
      validationErrors.push('Student name is required');
    }
    
    if (isEmptyString(email)) {
      validationErrors.push('Email is required');
    } else {
      const emailStr = String(email).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        validationErrors.push('Please enter a valid email address');
      }
    }
    
    if (isEmptyString(phone)) {
      validationErrors.push('Phone number is required');
    } else {
      const phoneStr = String(phone);
      const phoneCleaned = phoneStr.replace(/\D/g, '');
      if (phoneCleaned.length !== 10) {
        validationErrors.push('Please enter a valid 10-digit phone number');
      }
    }
    
    if (isEmptyString(whatsappNumber)) {
      validationErrors.push('WhatsApp number is required');
    } else {
      const whatsappStr = String(whatsappNumber || '');
      // Remove country code if present (e.g., +91, 91)
      let whatsappCleaned = whatsappStr.replace(/^\+?91\s*/, '').replace(/\D/g, '');
      // If still has country code pattern, remove it
      if (whatsappCleaned.length > 10) {
        whatsappCleaned = whatsappCleaned.slice(-10); // Take last 10 digits
      }
      if (whatsappCleaned.length !== 10) {
        validationErrors.push('Please enter a valid 10-digit WhatsApp number');
      }
    }
    
    if (isEmptyString(dateOfAdmission)) {
      validationErrors.push('Date of Admission is required');
    } else {
      // Validate date format (should be YYYY-MM-DD from frontend conversion)
      const dateStr = String(dateOfAdmission).trim();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStr)) {
        validationErrors.push('Date of Admission must be in valid format');
      }
    }
    
    if (isEmptyString(localAddress)) {
      validationErrors.push('Local Address is required');
    }
    
    if (isEmptyString(permanentAddress)) {
      validationErrors.push('Permanent Address is required');
    }
    
    if (isEmptyString(emergencyContactNumber)) {
      validationErrors.push('Emergency Contact Number is required');
    } else {
      const emergencyStr = String(emergencyContactNumber);
      const emergencyPhoneCleaned = emergencyStr.replace(/\D/g, '');
      if (emergencyPhoneCleaned.length !== 10) {
        validationErrors.push('Please enter a valid 10-digit emergency contact number');
      }
    }
    
    if (isEmptyString(emergencyName)) {
      validationErrors.push('Emergency Contact Name is required');
    }
    
    if (isEmptyString(emergencyRelation)) {
      validationErrors.push('Emergency Contact Relation is required');
    }
    
    if (isEmptyString(courseName)) {
      validationErrors.push('Course Name is required');
    }
    
    // Batch ID is optional - student can be enrolled without being assigned to a batch
    // But if provided, it must be valid
    if (batchId !== null && batchId !== undefined) {
      const batchIdNum = typeof batchId === 'string' ? parseInt(batchId, 10) : Number(batchId);
      if (isNaN(batchIdNum) || batchIdNum <= 0) {
        validationErrors.push('Batch ID must be a valid positive number');
      }
    }
    
    if (isEmptyString(softwaresIncluded)) {
      validationErrors.push('At least one software must be selected');
    }
    
    // Handle number fields - they might come as strings or numbers
    // Total Deal Amount is COMPULSORY - student registration not possible without it
    if (totalDeal === null || totalDeal === undefined) {
      validationErrors.push('Total Deal Amount is required. Student registration cannot proceed without a deal amount.');
    } else {
      const totalDealNum = typeof totalDeal === 'string' 
        ? parseFloat(String(totalDeal).replace(/[^\d.-]/g, '')) 
        : Number(totalDeal);
      if (isNaN(totalDealNum) || totalDealNum <= 0) {
        validationErrors.push('Total Deal Amount must be greater than 0');
      }
    }
    
    const bookingAmountNum = bookingAmount !== null && bookingAmount !== undefined
      ? (typeof bookingAmount === 'string' ? parseFloat(String(bookingAmount).replace(/[^\d.-]/g, '')) : Number(bookingAmount))
      : 0;
    if (bookingAmount === null || bookingAmount === undefined || isNaN(bookingAmountNum) || bookingAmountNum < 0) {
      validationErrors.push('Booking Amount is required and must be 0 or greater');
    }
    
    const balanceAmountNum = balanceAmount !== null && balanceAmount !== undefined
      ? (typeof balanceAmount === 'string' ? parseFloat(String(balanceAmount).replace(/[^\d.-]/g, '')) : Number(balanceAmount))
      : 0;
    if (balanceAmount === null || balanceAmount === undefined || isNaN(balanceAmountNum) || balanceAmountNum < 0) {
      validationErrors.push('Balance Amount is required and must be 0 or greater');
    }
    
    // Validate booking amount doesn't exceed total deal
    if (bookingAmountNum && totalDealNum && bookingAmountNum > totalDealNum) {
      validationErrors.push(`Booking Amount (${bookingAmountNum}) cannot be greater than Total Deal Amount (${totalDealNum})`);
    }
    
    // Validate balance + booking = total deal (with tolerance for floating point)
    // Only validate if all three values are provided and valid
    if (balanceAmountNum > 0 && totalDealNum > 0 && bookingAmountNum >= 0) {
      const sum = balanceAmountNum + bookingAmountNum;
      const difference = Math.abs(sum - totalDealNum);
      // Allow small difference due to floating point precision (0.01)
      if (difference > 0.01) {
        validationErrors.push(`Balance Amount (${balanceAmountNum}) + Booking Amount (${bookingAmountNum}) = ${sum}, but Total Deal Amount is ${totalDealNum}. The sum must equal the total deal.`);
      }
    }
    
    if (emiPlan) {
      if (isEmptyString(emiPlanDate)) {
        validationErrors.push('EMI Plan Date is required when EMI Plan is selected');
      } else {
        const emiDateStr = String(emiPlanDate).trim();
        const emiDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!emiDateRegex.test(emiDateStr)) {
          validationErrors.push('EMI Plan Date must be in valid format');
        }
      }
    }
    
    if (isEmptyString(counselorName)) {
      validationErrors.push('Employee Name is required');
    }
    
    if (isEmptyString(leadSource)) {
      validationErrors.push('Lead Source is required');
    }
    
    // Auto-fill current date if Walk-in is selected and date is empty
    let finalWalkinDate = walkinDate;
    const leadSourceStr = String(leadSource || '').trim();
    if (leadSourceStr === 'Walk-in' && isEmptyString(walkinDate)) {
      // Auto-fill with current date
      const today = new Date();
      finalWalkinDate = today.toISOString().split('T')[0];
    } else if (walkinDate) {
      const walkinDateStr = String(walkinDate).trim();
      const walkinDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!walkinDateRegex.test(walkinDateStr)) {
        validationErrors.push('Walk-in Date must be in valid format');
      }
    }
    
    if (isEmptyString(masterFaculty)) {
      validationErrors.push('Faculty is required');
    }
    
    if (validationErrors.length > 0) {
      await transaction.rollback();
      logger.warn('Student enrollment validation failed:', {
        errorCount: validationErrors.length,
        errors: validationErrors,
        receivedData: {
          hasStudentName: !!studentName,
          studentName: studentName,
          hasEmail: !!email,
          email: email,
          hasPhone: !!phone,
          phone: phone,
          hasWhatsappNumber: !!whatsappNumber,
          whatsappNumber: whatsappNumber,
          hasDateOfAdmission: !!dateOfAdmission,
          dateOfAdmission: dateOfAdmission,
          hasBatchId: !!batchId,
          batchId: batchId,
          hasCourseName: !!courseName,
          courseName: courseName,
          hasSoftwaresIncluded: !!softwaresIncluded,
          softwaresIncluded: softwaresIncluded,
          totalDeal: totalDeal,
          totalDealType: typeof totalDeal,
          bookingAmount: bookingAmount,
          bookingAmountType: typeof bookingAmount,
          balanceAmount: balanceAmount,
          balanceAmountType: typeof balanceAmount,
          hasCounselorName: !!counselorName,
          counselorName: counselorName,
          hasLeadSource: !!leadSource,
          leadSource: leadSource,
          hasMasterFaculty: !!masterFaculty,
          masterFaculty: masterFaculty,
        },
      });
      res.status(400).json({
        status: 'error',
        message: `Validation failed: ${validationErrors.join('; ')}`,
        errors: validationErrors,
      });
      return;
    }
    
    // Trim the values (safely convert to string first)
    const trimmedStudentName = String(studentName || '').trim();
    const trimmedPhone = String(phone || '').trim();
    const trimmedEmail = String(email || '').trim();

    // Normalize phone number (remove all non-digit characters for comparison)
    const normalizedPhone = trimmedPhone.replace(/\D/g, '');

    // Check if user already exists by email OR phone (both must be unique)
    // For email: case-insensitive match
    const existingUserByEmail = await db.User.findOne({ 
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('email')),
        db.sequelize.fn('LOWER', trimmedEmail)
      ), 
      transaction 
    });
    
    // For phone: normalize and compare
    // Get all users with phone numbers and check normalized phone numbers
    const allUsersWithPhone = await db.User.findAll({ 
      where: {
        phone: { [Op.ne]: null }
      },
      attributes: ['id', 'name', 'email', 'phone'],
      transaction 
    });
    
    const existingUserByPhone = allUsersWithPhone.find(user => {
      if (!user.phone) return false;
      const userNormalizedPhone = String(user.phone).replace(/\D/g, '');
      const matches = userNormalizedPhone === normalizedPhone && userNormalizedPhone.length > 0;
      if (matches) {
        logger.info(`Duplicate phone found: Input phone "${trimmedPhone}" (normalized: "${normalizedPhone}") matches existing user ${user.id} with phone "${user.phone}" (normalized: "${userNormalizedPhone}")`);
      }
      return matches;
    });

    // Log for debugging
    if (existingUserByEmail) {
      logger.info(`Duplicate email found: "${trimmedEmail}" matches existing user ${existingUserByEmail.id} (${existingUserByEmail.name})`);
    }

    // If either email or phone already exists, return error with student ID for editing
    if (existingUserByEmail || existingUserByPhone) {
      await transaction.rollback();
      const existingUser = existingUserByEmail || existingUserByPhone;
      const conflictType = existingUserByEmail && existingUserByPhone 
        ? 'email and phone number' 
        : existingUserByEmail 
        ? 'email' 
        : 'phone number';
      
      logger.warn(`Enrollment blocked: Student "${trimmedStudentName}" tried to register with existing ${conflictType}. Existing student ID: ${existingUser?.id}`);
      
      res.status(409).json({
        status: 'error',
        message: `A student with this ${conflictType} already exists. Please edit the existing profile instead of creating a new one.`,
        existingStudentId: existingUser?.id || null,
        existingStudentName: existingUser?.name || null,
        conflictType: conflictType,
      });
      return;
    }

    // Generate a default password (can be changed later)
    const defaultPassword = 'Student@123'; // You might want to make this configurable
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // Email is now required, so use the provided email
    const finalEmail = email.trim();

    // Extract photo URL from enrollmentDocuments (first image file)
    let photoUrl: string | undefined = undefined;
    if (enrollmentDocuments && Array.isArray(enrollmentDocuments) && enrollmentDocuments.length > 0) {
      // Find first image file (not PDF)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const photoDoc = enrollmentDocuments.find(doc => {
        if (!doc || typeof doc !== 'string') return false;
        const lowerDoc = doc.toLowerCase();
        return imageExtensions.some(ext => lowerDoc.includes(ext));
      });
      if (photoDoc) {
        photoUrl = photoDoc;
      }
    }

    // Create user
    const user = await db.User.create(
      {
        name: trimmedStudentName,
        email: finalEmail,
        phone: trimmedPhone,
        role: UserRole.STUDENT,
        passwordHash,
        isActive: true,
        avatarUrl: photoUrl, // Set avatarUrl from photo
      },
      { transaction }
    );
    
    logger.info(`Created student user: id=${user.id}, name=${user.name}, email=${user.email}, role=${user.role}, isActive=${user.isActive}`);

    // Create student profile if StudentProfile model exists
    if (db.StudentProfile) {
      // Parse batch status fields if provided
      const parseBatchList = (value: any): string[] | null => {
        if (!value || value === '') return null;
        if (Array.isArray(value)) return value.filter((s: string) => s.trim().length > 0);
        if (typeof value === 'string') {
          return value.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        }
        return null;
      };

      const profileData: any = {
        userId: user.id,
        dob: dateOfAdmission ? new Date(dateOfAdmission) : null,
        address: localAddress || permanentAddress || null,
        photoUrl: photoUrl, // Set photoUrl from extracted photo
        softwareList: softwaresIncluded && softwaresIncluded.trim() 
          ? softwaresIncluded.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) 
          : null,
        enrollmentDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
        status: 'active',
        finishedBatches: req.body.finishedBatches ? parseBatchList(req.body.finishedBatches) : null,
        currentBatches: req.body.currentBatches ? parseBatchList(req.body.currentBatches) : null,
        pendingBatches: req.body.pendingBatches ? parseBatchList(req.body.pendingBatches) : null,
      };

      // Store additional fields in documents.enrollmentMetadata (matching bulk upload structure)
      const enrollmentMetadata: any = {};
      if (whatsappNumber) enrollmentMetadata.whatsappNumber = whatsappNumber;
      if (emergencyContactNumber || emergencyName || emergencyRelation) {
        enrollmentMetadata.emergencyContact = {
          name: emergencyName || null,
          number: emergencyContactNumber || null,
          relation: emergencyRelation || null,
        };
      }
      if (courseName) enrollmentMetadata.courseName = courseName;
      if (totalDeal !== undefined) enrollmentMetadata.totalDeal = totalDeal;
      if (bookingAmount !== undefined) enrollmentMetadata.bookingAmount = bookingAmount;
      if (balanceAmount !== undefined) enrollmentMetadata.balanceAmount = balanceAmount;
      if (emiPlan !== undefined) enrollmentMetadata.emiPlan = emiPlan;
      if (emiPlanDate) enrollmentMetadata.emiPlanDate = emiPlanDate;
      if (emiInstallments && Array.isArray(emiInstallments) && emiInstallments.length > 0) {
        enrollmentMetadata.emiInstallments = emiInstallments;
      }
      if (complimentarySoftware) enrollmentMetadata.complimentarySoftware = complimentarySoftware;
      if (complimentaryGift) enrollmentMetadata.complimentaryGift = complimentaryGift;
      if (hasReference !== undefined) enrollmentMetadata.hasReference = hasReference;
      if (referenceDetails) enrollmentMetadata.referenceDetails = referenceDetails;
      if (counselorName) enrollmentMetadata.counselorName = counselorName;
      if (leadSource) enrollmentMetadata.leadSource = leadSource;
      if (finalWalkinDate) enrollmentMetadata.walkinDate = finalWalkinDate;
      if (masterFaculty) enrollmentMetadata.masterFaculty = masterFaculty;
      if (permanentAddress) enrollmentMetadata.permanentAddress = permanentAddress;
      if (localAddress) enrollmentMetadata.localAddress = localAddress;
      if (dateOfAdmission) enrollmentMetadata.dateOfAdmission = dateOfAdmission;
      if (enrollmentDocuments && Array.isArray(enrollmentDocuments) && enrollmentDocuments.length > 0) {
        enrollmentMetadata.enrollmentDocuments = enrollmentDocuments;
      }

      // Always store documents with enrollmentMetadata wrapper (matching bulk upload structure)
      profileData.documents = {
        enrollmentMetadata,
      };

      const studentProfile = await db.StudentProfile.create(profileData, { transaction });
      logger.info(`Created student profile: userId=${user.id}, profileId=${studentProfile.id}, status=${studentProfile.status}`);
    } else {
      logger.warn(`StudentProfile model not found - profile not created for userId=${user.id}`);
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

        // Prepare paymentPlan from enrollment metadata
        const paymentPlan: any = {};
        if (totalDeal !== undefined) paymentPlan.totalDeal = totalDeal;
        if (bookingAmount !== undefined) paymentPlan.bookingAmount = bookingAmount;
        if (balanceAmount !== undefined) paymentPlan.balanceAmount = balanceAmount;
        if (emiPlan !== undefined) paymentPlan.emiPlan = emiPlan;
        if (emiPlanDate) paymentPlan.emiPlanDate = emiPlanDate;
        if (emiInstallments && Array.isArray(emiInstallments) && emiInstallments.length > 0) {
          paymentPlan.emiInstallments = emiInstallments;
        }

        enrollment = await db.Enrollment.create(
          {
            studentId: user.id,
            batchId,
            enrollmentDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
            status: 'active',
            paymentPlan: Object.keys(paymentPlan).length > 0 ? paymentPlan : null,
          },
          { transaction }
        );

        // Create payment transactions based on enrollment payment details
        if (enrollment && (bookingAmount || (emiPlan && emiInstallments && emiInstallments.length > 0))) {
          // Create payment for booking amount (if provided)
          if (bookingAmount && bookingAmount > 0) {
            try {
              await db.PaymentTransaction.create(
                {
                  studentId: user.id,
                  enrollmentId: enrollment.id,
                  amount: bookingAmount,
                  paidAmount: bookingAmount, // Booking amount is considered as paid
                  dueDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
                  status: PaymentStatus.PAID,
                  notes: 'Initial booking amount from enrollment',
                },
                { transaction }
              );
              logger.info(`Created booking payment: studentId=${user.id}, enrollmentId=${enrollment.id}, amount=${bookingAmount}`);
            } catch (paymentError: any) {
              logger.error('Error creating booking payment:', paymentError);
              // Don't fail enrollment if payment creation fails, but log it
            }
          }

          // Create payment transactions for EMI installments (if EMI plan is enabled)
          if (emiPlan && emiInstallments && Array.isArray(emiInstallments) && emiInstallments.length > 0) {
            for (const installment of emiInstallments) {
              if (installment.amount && installment.amount > 0) {
                try {
                  const dueDate = installment.dueDate 
                    ? new Date(installment.dueDate) 
                    : (emiPlanDate ? new Date(emiPlanDate) : new Date());
                  
                  await db.PaymentTransaction.create(
                    {
                      studentId: user.id,
                      enrollmentId: enrollment.id,
                      amount: installment.amount,
                      paidAmount: 0,
                      dueDate: dueDate,
                      status: PaymentStatus.PENDING,
                      notes: `EMI Installment - Month ${installment.month || 'N/A'}`,
                    },
                    { transaction }
                  );
                  logger.info(`Created EMI payment: studentId=${user.id}, enrollmentId=${enrollment.id}, amount=${installment.amount}, month=${installment.month}`);
                } catch (paymentError: any) {
                  logger.error(`Error creating EMI payment for month ${installment.month}:`, paymentError);
                  // Continue creating other installments even if one fails
                }
              }
            }
          }
        }
      }
    }

    await transaction.commit();
    
    logger.info(`Transaction committed successfully for student enrollment: userId=${user.id}, email=${email}, batchId=${batchId || 'none'}`);

    // Verify the student was created correctly by querying it back
    try {
      const verifyUser = await db.User.findByPk(user.id, {
        include: [
          {
            model: db.StudentProfile,
            as: 'studentProfile',
            required: false,
          },
        ],
      });
      
      if (verifyUser) {
        logger.info(`Verified student exists: id=${verifyUser.id}, name=${verifyUser.name}, role=${verifyUser.role}, isActive=${verifyUser.isActive}, hasProfile=${!!verifyUser.studentProfile}`);
      } else {
        logger.error(`CRITICAL: Student not found after creation! userId=${user.id}`);
      }
    } catch (verifyError) {
      logger.error(`Error verifying student after creation:`, verifyError);
    }

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

// GET /students/course-names → Get all course names from Excel file
export const getCourseNames = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Try multiple possible paths for the Excel file
    const possiblePaths = [
      path.join(process.cwd(), 'Course Name & Softwares .xlsx'),
      path.join(process.cwd(), 'backend', 'Course Name & Softwares .xlsx'),
      path.join(__dirname, '../../Course Name & Softwares .xlsx'),
      path.join(__dirname, '../../../Course Name & Softwares .xlsx'),
    ];

    let excelFilePath: string | null = null;
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        excelFilePath = filePath;
        logger.info(`Found Excel file at: ${filePath}`);
        break;
      }
    }

    if (!excelFilePath) {
      logger.error('Course Name Excel file not found in any of the expected locations');
      res.status(404).json({
        status: 'error',
        message: 'Course Name Excel file not found',
      });
      return;
    }

    // Read the Excel file
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.readFile(excelFilePath);
      logger.info(`Excel file loaded successfully. Sheets: ${workbook.SheetNames.join(', ')}`);
    } catch (parseError: any) {
      logger.error('Failed to read Excel file:', parseError);
      res.status(400).json({
        status: 'error',
        message: `Failed to read Excel file: ${parseError.message}`,
      });
      return;
    }

    // Get the first sheet (or try to find a sheet with course names)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet || !worksheet['!ref']) {
      res.status(400).json({
        status: 'error',
        message: 'Excel sheet is empty or has no data',
      });
      return;
    }
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Extract course names from the first row (header row) - these are the column headers
    const courseNamesSet = new Set<string>();
    
    // Read the first row (row 0) which contains the column headers
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v !== undefined && cell.v !== null) {
        const courseName = String(cell.v).trim();
        // Only add non-empty course names
        if (courseName.length > 0) {
          courseNamesSet.add(courseName);
        }
      }
    }

    // Convert to sorted array
    const courseNames = Array.from(courseNamesSet).sort();

    if (courseNames.length === 0) {
      logger.warn('No course names found in Excel file');
      res.status(400).json({
        status: 'error',
        message: 'No course names found in Excel file',
      });
      return;
    }

    logger.info(`Found ${courseNames.length} unique course names`);

    res.status(200).json({
      status: 'success',
      data: {
        courseNames,
        count: courseNames.length,
      },
    });
  } catch (error: any) {
    logger.error('Get course names error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching course names',
      error: error.message,
    });
  }
};

// POST /students/unified-import → Unified import for students (enrollment + software progress)
export const unifiedStudentImport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only SuperAdmin and Admin can import
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can import students',
      });
      return;
    }

    if (!req.file) {
      logger.error('Unified import: No file received');
      res.status(400).json({
        status: 'error',
        message: 'Excel file is required',
      });
      return;
    }

    logger.info(`Unified import: File received - name: ${req.file.originalname}, size: ${req.file.size}`);

    // Parse Excel file
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { 
        type: 'buffer',
        cellDates: true,
      });
      logger.info(`Unified import: Excel file parsed successfully - sheets: ${workbook.SheetNames.join(', ')}`);
    } catch (parseError: any) {
      logger.error('Unified import: Failed to parse Excel file:', parseError);
      res.status(400).json({
        status: 'error',
        message: `Failed to parse Excel file: ${parseError.message}`,
      });
      return;
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: null,
      blankrows: false,
    });

    if (rows.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Excel file is empty or has no data rows',
      });
      return;
    }

    // Helper function to get column value
    const getValue = (row: any, possibleNames: string[]): any => {
      for (const name of possibleNames) {
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

    // Helper to normalize phone number
    const normalizePhone = (phone: any): string => {
      if (!phone) return '';
      let normalized = String(phone).trim();
      normalized = normalized.replace(/[\s\-\(\)\.\/\+]/g, '');
      if (normalized.length > 10 && normalized.startsWith('0')) {
        normalized = normalized.substring(1);
      }
      return normalized;
    };

    // Software code mapping (from studentSoftwareProgress controller)
    const SOFTWARE_CODE_MAP: Record<string, string> = {
      '6': 'Photoshop', '7': 'Illustrator', '8': 'InDesign', '10': 'CorelDraw',
      '11': 'Figma', '12': 'After Effects', '13': 'Premiere Pro', '14': 'Audition',
      '15': 'Blender', '16': '3ds Max', '23': 'Cinema 4D', '24': 'Maya',
      '32': 'SketchUp', '33': 'AutoCAD', '48': 'Revit', '72': 'Unity',
      '89': 'Unreal Engine', '92': 'DaVinci Resolve',
    };

    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any;
      const rowNumber = i + 2;
      const transaction = await db.sequelize.transaction();

      try {
        // Get student identification - phone is primary, email is secondary
        // Support all field name variations
        const phone = getValue(row, ['phone', 'Phone', 'PHONE', 'phoneNumber', 'Phone Number', 'NUMBER', 'number', 'Mobile', 'mobile']);
        const email = getValue(row, ['email', 'Email', 'EMAIL', 'Email Address']);
        const studentName = getValue(row, ['studentName', 'Student Name', 'Name', 'NAME', 'name', 'student_name']);

        // Validate required fields
        if (!phone && !email) {
          await transaction.rollback();
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: 'Phone number or Email is required',
          });
          continue;
        }

        // Normalize phone if provided
        const normalizedPhone = phone ? normalizePhone(phone) : null;
        if (phone && (!normalizedPhone || normalizedPhone.length < 10)) {
          await transaction.rollback();
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: `Invalid phone number format: ${phone}`,
          });
          continue;
        }

        // Find or create student
        let student = null;
        if (normalizedPhone) {
          student = await db.User.findOne({
            where: { 
              phone: normalizedPhone, 
              role: 'student' 
            },
            transaction
          });
        }
        
        if (!student && email) {
          student = await db.User.findOne({
            where: { 
              email: email,
              role: 'student' 
            },
            transaction
          });
        }

        // Create student if not found
        if (!student) {
          const finalName = studentName || `Student_${normalizedPhone || email?.split('@')[0] || 'Unknown'}`;
          const finalEmail = email || `student_${normalizedPhone || Date.now()}@primeacademy.local`;
          const finalPhone = normalizedPhone || null;

          // Generate default password
          const defaultPassword = `${finalEmail.split('@')[0]}123`;
          const passwordHash = await bcrypt.hash(defaultPassword, 10);

          student = await db.User.create({
            name: finalName,
            email: finalEmail,
            phone: finalPhone,
            role: UserRole.STUDENT,
            passwordHash,
            isActive: true,
          }, { transaction });

          logger.info(`Created new student: ID=${student.id}, name=${finalName}, phone=${finalPhone}`);
        } else {
          // Update student if name/email/phone changed
          const updates: any = {};
          if (studentName && student.name !== studentName) updates.name = studentName;
          if (email && student.email !== email) updates.email = email;
          if (normalizedPhone && student.phone !== normalizedPhone) updates.phone = normalizedPhone;
          if (Object.keys(updates).length > 0) {
            await student.update(updates, { transaction });
          }
        }

        // ========== PROCESS ENROLLMENT DATA ==========
        // Support all date field name variations
        const dateOfAdmission = getValue(row, ['dateOfAdmission', 'Date of Admission', 'DATE', 'date', 'Date', 'enrollmentDate', 'Enrollment Date']);
        const parsedDateOfAdmission = dateOfAdmission ? parseExcelDate(dateOfAdmission) : null;

        const dobValue = getValue(row, ['dob', 'DOB', 'dateOfBirth', 'Date of Birth']);
        const parsedDob = dobValue ? parseExcelDate(dobValue) : null;

        // Parse boolean fields
        const parseBoolean = (value: any): boolean | undefined => {
          if (value === undefined || value === null || value === '') return undefined;
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'yes' || lower === 'true' || lower === '1';
          }
          return Boolean(value);
        };

        // Prepare enrollment metadata
        const enrollmentMetadata: any = {
          dateOfAdmission: parsedDateOfAdmission ? parsedDateOfAdmission.toISOString().split('T')[0] : null,
          whatsappNumber: getValue(row, ['whatsappNumber', 'WhatsApp Number', 'whatsapp']) || normalizedPhone || null,
          localAddress: getValue(row, ['localAddress', 'Local Address', 'local_address']),
          permanentAddress: getValue(row, ['permanentAddress', 'Permanent Address', 'permanent_address']),
          courseName: getValue(row, ['courseName', 'Course Name', 'COMMON', 'Common', 'New COURSE', 'New Course']),
          totalDeal: getValue(row, ['totalDeal', 'Total Deal', 'total_deal']) ? 
            (typeof getValue(row, ['totalDeal', 'Total Deal']) === 'string' ? 
              parseFloat(getValue(row, ['totalDeal', 'Total Deal'])) : 
              getValue(row, ['totalDeal', 'Total Deal'])) : null,
          bookingAmount: getValue(row, ['bookingAmount', 'Booking Amount', 'booking_amount']) ?
            (typeof getValue(row, ['bookingAmount', 'Booking Amount']) === 'string' ?
              parseFloat(getValue(row, ['bookingAmount', 'Booking Amount'])) :
              getValue(row, ['bookingAmount', 'Booking Amount'])) : null,
          balanceAmount: getValue(row, ['balanceAmount', 'Balance Amount', 'balance_amount']) ?
            (typeof getValue(row, ['balanceAmount', 'Balance Amount']) === 'string' ?
              parseFloat(getValue(row, ['balanceAmount', 'Balance Amount'])) :
              getValue(row, ['balanceAmount', 'Balance Amount'])) : null,
          emiPlan: parseBoolean(getValue(row, ['emiPlan', 'EMI Plan', 'emi_plan'])),
          emiPlanDate: getValue(row, ['emiPlanDate', 'EMI Plan Date', 'emi_plan_date']) ?
            (parseExcelDate(getValue(row, ['emiPlanDate', 'EMI Plan Date']))?.toISOString().split('T')[0] || null) : null,
          complimentarySoftware: getValue(row, ['complimentarySoftware', 'Complimentary Software']),
          complimentaryGift: getValue(row, ['complimentaryGift', 'Complimentary Gift']),
          hasReference: parseBoolean(getValue(row, ['hasReference', 'Has Reference', 'has_reference'])),
          referenceDetails: getValue(row, ['referenceDetails', 'Reference Details', 'reference_details']),
          counselorName: getValue(row, ['counselorName', 'Counselor Name', 'counselor_name']),
          leadSource: getValue(row, ['leadSource', 'Lead Source', 'lead_source']),
          walkinDate: getValue(row, ['walkinDate', 'Walk-in Date', 'walkin_date']) ?
            (parseExcelDate(getValue(row, ['walkinDate', 'Walk-in Date']))?.toISOString().split('T')[0] || null) : null,
          masterFaculty: getValue(row, ['masterFaculty', 'Master Faculty', 'master_faculty']),
        };

        // Emergency contact
        if (getValue(row, ['emergencyContactNumber', 'Emergency Contact Number']) || 
            getValue(row, ['emergencyName', 'Emergency Name']) || 
            getValue(row, ['emergencyRelation', 'Emergency Relation'])) {
          enrollmentMetadata.emergencyContact = {
            number: getValue(row, ['emergencyContactNumber', 'Emergency Contact Number']),
            name: getValue(row, ['emergencyName', 'Emergency Name']),
            relation: getValue(row, ['emergencyRelation', 'Emergency Relation']),
          };
        }

        // Software list and batch status
        const softwareList = getValue(row, ['softwaresIncluded', 'Softwares Included', 'softwares_included']) ?
          String(getValue(row, ['softwaresIncluded', 'Softwares Included'])).split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];

        const parseBatchList = (value: any): string[] | null => {
          if (!value || value === '') return null;
          if (Array.isArray(value)) return value.filter((s: string) => s.trim().length > 0);
          if (typeof value === 'string') {
            return value.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          }
          return null;
        };

        const finishedBatches = parseBatchList(getValue(row, ['finishedBatches', 'Finished Batches', 'finished_batches']));
        const currentBatches = parseBatchList(getValue(row, ['currentBatches', 'Current Batches', 'current_batches']));
        const pendingBatches = parseBatchList(getValue(row, ['pendingBatches', 'Pending Batches', 'pending_batches']));

        // Create or update student profile
        if (db.StudentProfile) {
          let studentProfile = await db.StudentProfile.findOne({
            where: { userId: student.id },
            attributes: { exclude: ['serialNo'] }, // Exclude serialNo column
            transaction
          });

          const profileData: any = {
            userId: student.id,
            dob: parsedDob,
            address: getValue(row, ['localAddress', 'Local Address']) || null,
            documents: {
              enrollmentMetadata,
            },
            softwareList: softwareList.length > 0 ? softwareList : null,
            enrollmentDate: parsedDateOfAdmission,
            status: 'active',
            finishedBatches: finishedBatches && finishedBatches.length > 0 ? finishedBatches : null,
            currentBatches: currentBatches && currentBatches.length > 0 ? currentBatches : null,
            pendingBatches: pendingBatches && pendingBatches.length > 0 ? pendingBatches : null,
          };

          if (studentProfile) {
            await studentProfile.update(profileData, { transaction });
          } else {
            await db.StudentProfile.create(profileData, { transaction });
          }
        }

        // ========== PROCESS SOFTWARE PROGRESS DATA ==========
        // Get course info - support all field name variations
        const courseName = getValue(row, ['courseName', 'Course Name', 'COMMON', 'Common', 'New COURSE', 'New Course']);
        const courseType = getValue(row, ['courseType', 'Course Type', 'TYPE', 'Type', 'COURSE', 'Course', 'Tyoe']);
        const studentStatus = getValue(row, ['studentStatus', 'Student Status', 'STATUS', 'Status']);
        const batchTiming = getValue(row, ['batchTiming', 'Batch Timing', 'TIME', 'Time', 'TIME COMMITMENT', 'Time Commitment']);

        // Get software section details - support all field name variations
        const firstSoftwareStartDate = parseExcelDate(getValue(row, ['1st Software START DATE', '1st Software Start Date', 'Start Dt', 'Start Date']));
        const firstSoftwareEndDate = parseExcelDate(getValue(row, ['1st Software END DATE', '1st Software End Date', 'End']));
        const firstSoftwareBatchTime = getValue(row, ['1st Software BATCH TIMING', '1st Software Batch Timing', 'Batch Time', '1st Software BATCH TIME']);
        const firstSoftwareFaculty = getValue(row, ['1st Software FACULTY', '1st Software Faculty', 'FACULTY']);
        const firstSoftwareStatus = getValue(row, ['1st Software CURRENT', '1st Software Current', 'CURRENT SOFTARE']);
        const firstSoftwareName = getValue(row, ['1st Software', 'First Software']);

        const secondSoftwareStartDate = parseExcelDate(getValue(row, ['2nd Software START DATE', '2nd Software Start Date', 'START DATE']));
        const secondSoftwareEndDate = parseExcelDate(getValue(row, ['2nd Software END DATE', '2nd Software End Date', 'END DATE']));
        const secondSoftwareBatchTime = getValue(row, ['2nd Software BATCH TIMING', '2nd Software Batch Timing', 'BATCH TIME', '2nd Software BATCH TIME']);
        const secondSoftwareFaculty = getValue(row, ['2nd Software FACULTY', '2nd Software Faculty', 'FACULTY']);
        const secondSoftwareStatus = getValue(row, ['2nd Software CURRENT', '2nd Software Current', 'CURRENT SOFTARE']);
        const secondSoftwareName = getValue(row, ['2nd Software', 'Second Software']);

        // Future batch fields - stored in metadata for future use
        const futureBatchStartDate = parseExcelDate(getValue(row, ['Future Batch START DATE', 'Future Batch Start Date']));
        const futureBatchEndDate = parseExcelDate(getValue(row, ['Future Batch END DATE', 'Future Batch End Date']));
        const futureBatchTime = getValue(row, ['Future Batch BATCH TIME', 'Future Batch Batch Time', 'BATCH TIME']);
        const futureBatchSchedule = getValue(row, ['Future Batch MWF/TTS', 'Future Batch Schedule', 'MWF/TTS']);
        const futureBatchFaculty = getValue(row, ['Future Batch FACULTY', 'Future Batch Faculty']);
        const futureBatchRemark = getValue(row, ['REMARK', 'Remark']);
        const nextSoftware = getValue(row, ['NEXT SOFTWARE', 'Next Software']);
        
        // Store future batch info in metadata (currently not used but preserved for future features)
        const futureBatchMetadata = {
          startDate: futureBatchStartDate,
          endDate: futureBatchEndDate,
          time: futureBatchTime,
          schedule: futureBatchSchedule,
          faculty: futureBatchFaculty,
          remark: futureBatchRemark,
          nextSoftware,
        };

        // Process software status columns (numeric codes)
        const softwareColumns = ['6', '7', '8', '10', '11', '12', '13', '14', '15', '16', '23', '24', '32', '33', '48', '72', '89', '92'];
        
        // Also process software name columns
        const softwareNameColumns = [
          'PHOTOSHOP', 'ILLUSTRATOR + Indegn', 'COREL', 'Figma ', 'XD', 'ANIMATE CC',
          'PREMIERE AUDITION', 'AFTER EFFECT', 'HTML Java DW CSS', 'Ar. MAX + Vray ', 'MAX',
          'FUSION', 'REAL FLOW', 'FUME FX', 'NUKE', 'THINKING PARTICAL', 'RAY FIRE',
          'MOCHA', 'SILHOUETTE', 'PF TRACK', 'VUE', 'HOUDNI', 'FCP', 'MAYA',
          'CAD  UNITY', 'MUDBOX ', 'UNITY GAME DESIGN', 'Z-BRUSH', 'LUMION', 'SKETCHUP',
          'UNREAL', 'BLENDER PRO', 'CINEAMA 4D', 'SUBSTANCE PAINTER', '3D EQUALIZER',
          'Photography ', 'Auto-Cad', 'Wordpress', 'Vuforia SDK', 'Davinci '
        ];
        
        for (const code of softwareColumns) {
          const statusValue = row[code];
          if (statusValue && (statusValue === 'XX' || statusValue === 'IP' || statusValue === 'NO' || statusValue === 'Finished')) {
            const softwareName = SOFTWARE_CODE_MAP[code] || `Software ${code}`;
            
            // Determine batch dates and faculty
            let batchStartDate = null;
            let batchEndDate = null;
            let facultyName = null;
            
            if (firstSoftwareName && softwareName.toLowerCase().includes(String(firstSoftwareName).toLowerCase().substring(0, 5))) {
              batchStartDate = firstSoftwareStartDate;
              batchEndDate = firstSoftwareEndDate;
              facultyName = firstSoftwareFaculty;
            } else if (secondSoftwareName && softwareName.toLowerCase().includes(String(secondSoftwareName).toLowerCase().substring(0, 5))) {
              batchStartDate = secondSoftwareStartDate;
              batchEndDate = secondSoftwareEndDate;
              facultyName = secondSoftwareFaculty;
            }
            
            const schedule = futureBatchSchedule || getValue(row, ['schedule', 'Schedule', 'MWF/TTS']);

            const existing = await db.StudentSoftwareProgress.findOne({
              where: { studentId: student.id, softwareName },
              transaction
            });

            if (existing) {
              await existing.update({
                status: statusValue,
                enrollmentDate: parsedDateOfAdmission,
                courseName,
                courseType,
                studentStatus,
                batchTiming,
                softwareCode: code,
                batchStartDate: batchStartDate || existing.batchStartDate,
                batchEndDate: batchEndDate || existing.batchEndDate,
                facultyName: facultyName || existing.facultyName,
                schedule: schedule || existing.schedule,
              }, { transaction });
            } else {
              await db.StudentSoftwareProgress.create({
                studentId: student.id,
                softwareName,
                softwareCode: code,
                status: statusValue,
                enrollmentDate: parsedDateOfAdmission,
                courseName,
                courseType,
                studentStatus,
                batchTiming,
                batchStartDate,
                batchEndDate,
                facultyName,
                schedule,
              }, { transaction });
            }
          }
        }

        // Process 1st Software name column
        if (firstSoftwareName) {
          const existing = await db.StudentSoftwareProgress.findOne({
            where: { studentId: student.id, softwareName: String(firstSoftwareName).trim() },
            transaction
          });

          if (!existing) {
            await db.StudentSoftwareProgress.create({
              studentId: student.id,
              softwareName: String(firstSoftwareName).trim(),
              status: firstSoftwareStatus || 'XX',
              enrollmentDate: parsedDateOfAdmission,
              courseName,
              courseType,
              studentStatus,
              batchTiming: firstSoftwareBatchTime || getValue(row, ['1st Software BATCH TIMING']) || batchTiming,
              batchStartDate: firstSoftwareStartDate,
              batchEndDate: firstSoftwareEndDate,
              facultyName: firstSoftwareFaculty,
            }, { transaction });
          } else {
            await existing.update({
              batchStartDate: firstSoftwareStartDate || existing.batchStartDate,
              batchEndDate: firstSoftwareEndDate || existing.batchEndDate,
              facultyName: firstSoftwareFaculty || existing.facultyName,
              status: firstSoftwareStatus || existing.status,
            }, { transaction });
          }
        }

        // Process 2nd Software name column
        if (secondSoftwareName) {
          const existing = await db.StudentSoftwareProgress.findOne({
            where: { studentId: student.id, softwareName: String(secondSoftwareName).trim() },
            transaction
          });

          if (!existing) {
            await db.StudentSoftwareProgress.create({
              studentId: student.id,
              softwareName: String(secondSoftwareName).trim(),
              status: secondSoftwareStatus || 'XX',
              enrollmentDate: parsedDateOfAdmission,
              courseName,
              courseType,
              studentStatus,
              batchTiming: secondSoftwareBatchTime || getValue(row, ['2nd Software BATCH TIMING']) || batchTiming,
              batchStartDate: secondSoftwareStartDate,
              batchEndDate: secondSoftwareEndDate,
              facultyName: secondSoftwareFaculty,
            }, { transaction });
          } else {
            await existing.update({
              batchStartDate: secondSoftwareStartDate || existing.batchStartDate,
              batchEndDate: secondSoftwareEndDate || existing.batchEndDate,
              facultyName: secondSoftwareFaculty || existing.facultyName,
              status: secondSoftwareStatus || existing.status,
            }, { transaction });
          }
        }

        // Process software name columns (e.g., PHOTOSHOP, ILLUSTRATOR + Indegn, etc.)
        for (const softwareNameCol of softwareNameColumns) {
          const statusValue = row[softwareNameCol];
          if (statusValue && (statusValue === 'XX' || statusValue === 'IP' || statusValue === 'NO' || statusValue === 'Finished')) {
            const softwareName = softwareNameCol.trim();
            
            // Determine batch dates and faculty from software sections
            let batchStartDate = null;
            let batchEndDate = null;
            let facultyName = null;
            let batchTimingValue = batchTiming;
            
            // Check if this matches 1st or 2nd software
            if (firstSoftwareName && softwareName.toLowerCase().includes(String(firstSoftwareName).toLowerCase().substring(0, 5))) {
              batchStartDate = firstSoftwareStartDate;
              batchEndDate = firstSoftwareEndDate;
              facultyName = firstSoftwareFaculty;
              batchTimingValue = firstSoftwareBatchTime || batchTiming;
            } else if (secondSoftwareName && softwareName.toLowerCase().includes(String(secondSoftwareName).toLowerCase().substring(0, 5))) {
              batchStartDate = secondSoftwareStartDate;
              batchEndDate = secondSoftwareEndDate;
              facultyName = secondSoftwareFaculty;
              batchTimingValue = secondSoftwareBatchTime || batchTiming;
            }
            
            const schedule = futureBatchSchedule || getValue(row, ['schedule', 'Schedule', 'MWF/TTS']);

            const existing = await db.StudentSoftwareProgress.findOne({
              where: { studentId: student.id, softwareName },
              transaction
            });

            // Use future batch metadata if available
            const metadata = Object.keys(futureBatchMetadata).some(key => futureBatchMetadata[key as keyof typeof futureBatchMetadata] !== null && futureBatchMetadata[key as keyof typeof futureBatchMetadata] !== undefined)
              ? { futureBatch: futureBatchMetadata }
              : undefined;

            if (existing) {
              await existing.update({
                status: statusValue,
                enrollmentDate: parsedDateOfAdmission,
                courseName,
                courseType,
                studentStatus,
                batchTiming: batchTimingValue,
                batchStartDate: batchStartDate || existing.batchStartDate,
                batchEndDate: batchEndDate || existing.batchEndDate,
                facultyName: facultyName || existing.facultyName,
                schedule: schedule || existing.schedule,
                metadata: metadata || existing.metadata,
              }, { transaction });
            } else {
              await db.StudentSoftwareProgress.create({
                studentId: student.id,
                softwareName,
                status: statusValue,
                enrollmentDate: parsedDateOfAdmission,
                courseName,
                courseType,
                studentStatus,
                batchTiming: batchTimingValue,
                batchStartDate,
                batchEndDate,
                facultyName,
                schedule,
                metadata,
              }, { transaction });
            }
          }
        }

        await transaction.commit();
        result.success++;
      } catch (error: any) {
        await transaction.rollback();
        logger.error(`Error processing row ${rowNumber}:`, error);
        result.failed++;
        result.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error',
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Unified import completed. ${result.success} students processed, ${result.failed} failed.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Unified import error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing unified import',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please check server logs for details',
    });
  }
};

// POST /students/bulk-enroll → Bulk enroll students from Excel (admin only) - DEPRECATED, use unified-import
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
      logger.error('Bulk enrollment: No file received');
      res.status(400).json({
        status: 'error',
        message: 'Excel file is required',
      });
      return;
    }

    logger.info(`Bulk enrollment: File received - name: ${req.file.originalname}, size: ${req.file.size}, mimetype: ${req.file.mimetype}`);

    // Parse Excel file with date parsing enabled
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { 
      type: 'buffer',
      cellDates: true, // Parse dates automatically as Date objects
    });
      logger.info(`Bulk enrollment: Excel file parsed successfully - sheets: ${workbook.SheetNames.join(', ')}`);
    } catch (parseError: any) {
      logger.error('Bulk enrollment: Failed to parse Excel file:', parseError);
      res.status(400).json({
        status: 'error',
        message: `Failed to parse Excel file: ${parseError.message}`,
      });
      return;
    }
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Log available columns for debugging
    const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null })[0] as any[];
    logger.info(`Excel file columns detected: ${headerRow ? headerRow.join(', ') : 'No headers found'}`);
    
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      raw: true, // Get raw values (Date objects for dates, numbers for numbers)
      defval: null, // Default value for empty cells
      blankrows: false, // Skip blank rows
    });
    
    logger.info(`Total rows parsed from Excel: ${rows.length}`);
    if (rows.length > 0) {
      logger.info(`First row sample keys: ${Object.keys(rows[0] || {}).join(', ')}`);
    }

    if (rows.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Excel file is empty or has no data rows',
      });
      return;
    }

    // Helper function to get column value with multiple possible names (case-insensitive)
    const getColumnValue = (row: any, possibleNames: string[]): any => {
      for (const name of possibleNames) {
        // Try exact match first
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return row[name];
        }
        // Try case-insensitive match
        const lowerName = name.toLowerCase();
        for (const key in row) {
          if (key.toLowerCase() === lowerName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return row[key];
          }
        }
      }
      return null;
    };

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
        // Log row data for debugging (first row only)
        if (i === 0) {
          logger.info(`Row ${rowNumber} raw data:`, JSON.stringify(row, null, 2));
          logger.info(`Row ${rowNumber} available keys:`, Object.keys(row).join(', '));
        }
        
        // Get required fields with flexible column name matching
        const studentName = getColumnValue(row, ['studentName', 'Student Name', 'student_name', 'Name', 'name', 'StudentName']);
        const email = getColumnValue(row, ['email', 'Email', 'EMAIL', 'Email Address', 'emailAddress']);
        const phone = getColumnValue(row, ['phone', 'Phone', 'PHONE', 'phoneNumber', 'Phone Number', 'phone_number', 'PhoneNumber', 'Mobile', 'mobile', 'Mobile Number']);
        const dateOfAdmission = getColumnValue(row, ['dateOfAdmission', 'Date of Admission', 'date_of_admission', 'DateOfAdmission', 'admissionDate', 'Admission Date', 'AdmissionDate', 'Date', 'date']);

        // Validate required fields
        if (!studentName || !email || !phone || !dateOfAdmission) {
          await transaction.rollback();
          const missingFields: string[] = [];
          if (!studentName) missingFields.push('studentName');
          if (!email) missingFields.push('email');
          if (!phone) missingFields.push('phone');
          if (!dateOfAdmission) missingFields.push('dateOfAdmission');
          
          // Log available columns for debugging
          const availableColumns = Object.keys(row).join(', ');
          const rowValues = Object.entries(row).map(([k, v]) => `${k}:${v}`).join(', ');
          
          logger.warn(`Row ${rowNumber} validation failed. Missing: ${missingFields.join(', ')}. Available: ${availableColumns}`);
          logger.warn(`Row ${rowNumber} values: ${rowValues}`);
          
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: email || 'N/A',
            error: `Missing required fields: ${missingFields.join(', ')}. Available columns: ${availableColumns}`,
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await db.User.findOne({ 
          where: { email: email },
          transaction 
        });
        if (existingUser) {
          await transaction.rollback();
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: email,
            error: 'User with this email already exists',
          });
          continue;
        }

        // Generate default password (email prefix + '123')
        const defaultPassword = `${email.split('@')[0]}123`;
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        // Create user
        const user = await db.User.create({
          name: studentName,
          email: email,
          phone: phone || null,
          role: UserRole.STUDENT,
          passwordHash,
          isActive: true,
        }, { transaction });

        // Parse dateOfAdmission properly from Excel
        const parsedDateOfAdmission = parseExcelDate(dateOfAdmission);
        if (!parsedDateOfAdmission) {
          await transaction.rollback();
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: email || 'N/A',
            error: `Invalid dateOfAdmission format: ${dateOfAdmission}. Please use DD/MM/YYYY or YYYY-MM-DD format`,
          });
          continue;
        }

        // Format date as ISO string for storage in metadata (YYYY-MM-DD)
        const dateOfAdmissionISO = parsedDateOfAdmission.toISOString().split('T')[0];
        
        // Log for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          logger.info(`Row ${rowNumber}: Parsed dateOfAdmission from "${dateOfAdmission}" to "${dateOfAdmissionISO}"`);
        }

        // Parse DOB if provided - check multiple possible column names
        let dobValue = getColumnValue(row, ['dob', 'DOB', 'dateOfBirth', 'Date of Birth', 'date_of_birth', 'DateOfBirth']);
        const parsedDob = dobValue ? parseExcelDate(dobValue) : null;
        
        if (dobValue && !parsedDob) {
          logger.warn(`Row ${rowNumber}: Failed to parse dob from "${dobValue}". Accepted formats: DD/MM/YYYY, YYYY-MM-DD, or Excel serial date`);
        } else if (parsedDob) {
          logger.info(`Row ${rowNumber}: Parsed dob from "${dobValue}" to "${parsedDob.toISOString().split('T')[0]}"`);
        } else {
          logger.info(`Row ${rowNumber}: No DOB provided`);
        }

        // Handle boolean fields (Excel might store as "Yes"/"No" or true/false)
        const parseBoolean = (value: any): boolean | undefined => {
          if (value === undefined || value === null || value === '') return undefined;
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'yes' || lower === 'true' || lower === '1';
          }
          return Boolean(value);
        };

        // Prepare enrollment metadata
        const enrollmentMetadata: any = {
          dateOfAdmission: dateOfAdmissionISO, // Store in metadata as well
          whatsappNumber: row.whatsappNumber || row.phone || null,
          courseName: row.courseName || null,
          totalDeal: row.totalDeal ? (typeof row.totalDeal === 'string' ? parseFloat(row.totalDeal) : row.totalDeal) : null,
          bookingAmount: row.bookingAmount ? (typeof row.bookingAmount === 'string' ? parseFloat(row.bookingAmount) : row.bookingAmount) : null,
          balanceAmount: row.balanceAmount ? (typeof row.balanceAmount === 'string' ? parseFloat(row.balanceAmount) : row.balanceAmount) : null,
          emiPlan: parseBoolean(row.emiPlan),
          emiPlanDate: row.emiPlanDate ? (parseExcelDate(row.emiPlanDate)?.toISOString().split('T')[0] || null) : null,
          emiInstallments: row.emiInstallments ? (typeof row.emiInstallments === 'string' ? (() => {
            try {
              return JSON.parse(row.emiInstallments);
            } catch (e) {
              logger.warn(`Row ${rowNumber}: Failed to parse emiInstallments JSON: ${row.emiInstallments}`);
              return null;
            }
          })() : (Array.isArray(row.emiInstallments) ? row.emiInstallments : null)) : null,
          complimentarySoftware: row.complimentarySoftware || null,
          complimentaryGift: row.complimentaryGift || null,
          hasReference: parseBoolean(row.hasReference),
          referenceDetails: row.referenceDetails || null,
          counselorName: row.counselorName || null,
          leadSource: row.leadSource || null,
          walkinDate: row.walkinDate ? (parseExcelDate(row.walkinDate)?.toISOString().split('T')[0] || null) : null,
          masterFaculty: row.masterFaculty || null,
          localAddress: row.localAddress || null,
          permanentAddress: row.permanentAddress || null,
        };

        // Store emergency contact as nested object (matching the structure expected by the frontend)
        if (row.emergencyContactNumber || row.emergencyName || row.emergencyRelation) {
          enrollmentMetadata.emergencyContact = {
            number: row.emergencyContactNumber || null,
            name: row.emergencyName || null,
            relation: row.emergencyRelation || null,
          };
        }

        const softwareList = row.softwaresIncluded
          ? row.softwaresIncluded.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          : [];

        // Parse batch status fields (comma-separated software names)
        const parseBatchList = (value: any): string[] | null => {
          if (!value || value === '') return null;
          if (Array.isArray(value)) return value.filter((s: string) => s.trim().length > 0);
          if (typeof value === 'string') {
            return value.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          }
          return null;
        };

        const finishedBatches = parseBatchList(row.finishedBatches || row.finished_batches);
        const currentBatches = parseBatchList(row.currentBatches || row.current_batches);
        const pendingBatches = parseBatchList(row.pendingBatches || row.pending_batches);

        // Create student profile
        if (db.StudentProfile) {
          const profileData: any = {
            userId: user.id,
            dob: parsedDob, // Use parsed DOB
            address: row.localAddress || null, // Store local address in address field (fallback for view)
            documents: {
              enrollmentMetadata,
            },
            softwareList: softwareList.length > 0 ? softwareList : null,
            photoUrl: null,
            enrollmentDate: parsedDateOfAdmission, // Use properly parsed date
            status: 'active',
            finishedBatches: finishedBatches && finishedBatches.length > 0 ? finishedBatches : null,
            currentBatches: currentBatches && currentBatches.length > 0 ? currentBatches : null,
            pendingBatches: pendingBatches && pendingBatches.length > 0 ? pendingBatches : null,
          };

          logger.info(`Row ${rowNumber}: Creating student profile with dob: ${parsedDob ? parsedDob.toISOString().split('T')[0] : 'null'}, emergencyContact: ${enrollmentMetadata.emergencyContact ? JSON.stringify(enrollmentMetadata.emergencyContact) : 'null'}`);

          await db.StudentProfile.create(profileData, { transaction });
        }

        await transaction.commit();
        result.success++;
      } catch (error: any) {
        await transaction.rollback();
        logger.error(`Error processing row ${rowNumber}:`, error);
        logger.error(`Row ${rowNumber} error stack:`, error.stack);
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
    logger.error('Bulk enrollment error stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing bulk enrollment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please check server logs for details',
    });
  }
};

// GET /students/template → Download unified student template (admin only)
// GET /students/:id/attendance - Get student's own attendance (students can view their own)
export const getStudentAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const studentId = parseInt(req.params.id, 10);
    if (Number.isNaN(studentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student ID',
      });
      return;
    }

    // Check if user is the student themselves or an admin
    const isStudent = req.user.role === UserRole.STUDENT;
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERADMIN;

    if (isStudent && req.user.userId !== studentId) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own attendance',
      });
      return;
    }

    if (!isStudent && !isAdmin) {
      res.status(403).json({
        status: 'error',
        message: 'Only students and admins can view attendance',
      });
      return;
    }

    // Get date filters
    const { from, to } = req.query;
    const where: any = { studentId };

    // Build date filter if provided
    if (from || to) {
      where['$session.date$'] = {};
      if (from) {
        where['$session.date$'][Op.gte] = new Date(from as string);
      }
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999); // End of day
        where['$session.date$'][Op.lte] = toDate;
      }
    }

    const attendances = await db.Attendance.findAll({
      where,
      include: [
        {
          model: db.Session,
          as: 'session',
          required: true,
          include: [
            {
              model: db.Batch,
              as: 'batch',
              attributes: ['id', 'title', 'software'],
              required: false,
            },
          ],
        },
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
      ],
      order: [[{ model: db.Session, as: 'session' }, 'date', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        attendances: attendances.map((attendance: any) => {
          const att = attendance.toJSON();
          return {
            id: att.id,
            sessionId: att.sessionId,
            studentId: att.studentId,
            status: att.status,
            isManual: att.isManual,
            markedBy: att.markedBy,
            markedAt: att.markedAt,
            createdAt: att.createdAt,
            updatedAt: att.updatedAt,
            session: att.session ? {
              id: att.session.id,
              date: att.session.date,
              topic: att.session.topic,
              batchId: att.session.batchId,
              batch: att.session.batch,
            } : null,
            student: att.student,
          };
        }),
      },
    });
  } catch (error) {
    logger.error('Get student attendance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch student attendance',
    });
  }
};

export const downloadUnifiedTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('Download unified template request received');
    
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
        message: 'Only admins can download template',
      });
      return;
    }

    logger.info('Creating unified Excel template with ALL fields...');

    // Create comprehensive sample data with ALL fields from enrollment and software progress
    // Merged duplicate fields (e.g., DATE/dateOfAdmission, NAME/studentName, NUMBER/phone, etc.)
    // DATE must be the FIRST column
    const sampleData = [
      {
        // ========== BASIC STUDENT INFORMATION (DATE FIRST) ==========
        DATE: '2024-01-15',              // FIRST COLUMN - Merged: DATE, dateOfAdmission
        NAME: 'John Doe',                 // Merged: NAME, studentName
        NUMBER: '9876543210',             // Merged: NUMBER, phone
        email: 'john.doe@example.com',
        dob: '1995-05-20',
        
        // ========== CONTACT INFORMATION ==========
        whatsappNumber: '9876543210',
        localAddress: '123 Main St, City, State',
        permanentAddress: '123 Main St, City, State',
        
        // ========== EMERGENCY CONTACT ==========
        emergencyContactNumber: '9876543211',
        emergencyName: 'Jane Doe',
        emergencyRelation: 'Mother',
        
        // ========== COURSE INFORMATION (Merged duplicates) ==========
        'New COURSE': 'Graphic Design',   // Merged: New COURSE, COMMON, courseName
        COMMON: 'Graphic Design',         // Alternative name
        courseName: 'Graphic Design',     // Alternative name
        Tyoe: 'Regular',                  // Merged: Tyoe, TYPE, courseType, COURSE
        TYPE: 'Regular',                  // Alternative name
        COURSE: 'Regular',                // Alternative name
        courseType: 'Regular',            // Alternative name
        Status: 'Active',                 // Merged: Status, STATUS, studentStatus
        STATUS: 'Active',                 // Alternative name
        studentStatus: 'Active',          // Alternative name
        'TIME COMMITMENT': '7 to 9',      // Merged: TIME COMMITMENT, TIME, batchTiming
        TIME: '7 to 9',                   // Alternative name
        batchTiming: '7 to 9',            // Alternative name
        PLUS: '',
        
        // ========== BATCH STATUS ==========
        softwaresIncluded: 'Photoshop, Illustrator, InDesign',
        finishedBatches: 'Photoshop, Illustrator',
        currentBatches: 'InDesign',
        pendingBatches: 'After Effects, Premiere Pro',
        
        // ========== FINANCIAL DETAILS ==========
        totalDeal: 50000,
        bookingAmount: 10000,
        balanceAmount: 40000,
        emiPlan: 'Yes',
        emiPlanDate: '2024-02-15',
        
        // ========== ADDITIONAL INFORMATION ==========
        complimentarySoftware: 'Adobe Creative Cloud',
        complimentaryGift: 'Mouse Pad',
        hasReference: 'Yes',
        referenceDetails: 'Referred by friend',
        counselorName: 'Sarah Smith',
        leadSource: 'Walk-in',
        walkinDate: '2024-01-10',
        masterFaculty: 'Dr. John Smith',
        
        // ========== 1ST SOFTWARE SECTION ==========
        '1st Software': 'Photoshop',
        'Start Dt': '2024-01-20',         // Merged: Start Dt, 1st Software START DATE
        '1st Software START DATE': '2024-01-20',
        'End': '2024-03-20',              // Merged: End, 1st Software END DATE
        '1st Software END DATE': '2024-03-20',
        'Batch Time': '7 to 9',           // Merged: Batch Time, 1st Software BATCH TIMING
        '1st Software BATCH TIMING': '7 to 9',
        'Days': 'MWF',                    // Days for 1st Software
        '1st Software FACULTY': 'Dr. Smith',
        '1st Software CURRENT SOFTARE': 'IP',
        '1st Software CURRENT': 'IP',
        
        // ========== 2ND SOFTWARE SECTION ==========
        '2nd Software': 'Illustrator',
        'START DATE': '2024-03-25',       // Merged: START DATE, 2nd Software START DATE
        '2nd Software START DATE': '2024-03-25',
        'END DATE': '2024-05-25',         // Merged: END DATE, 2nd Software END DATE
        '2nd Software END DATE': '2024-05-25',
        'BATCH TIME': '8 to 12',          // Merged: BATCH TIME, 2nd Software BATCH TIMING
        '2nd Software BATCH TIMING': '8 to 12',
        'Days ': 'TTS',                   // Days for 2nd Software (note the space)
        '2nd Software FACULTY': 'Dr. Johnson',
        '2nd Software CURRENT SOFTARE': 'XX',
        '2nd Software CURRENT': 'XX',
        
        // ========== FUTURE BATCH SECTION ==========
        'Future Batch START DATE': '2024-06-01',
        'Future Batch END DATE': '2024-08-01',
        'Future Batch BATCH TIME': '9 to 11',
        'MWF/TTS': 'MWF',
        'Future Batch MWF/TTS': 'MWF',
        'Future Batch FACULTY': 'Dr. Williams',
        'Future Batch CURRENT SOFTARE': 'XX',
        'Future Batch RENT SOFT': '',
        'REMARK': 'Continuing next month',
        'NEXT SOFTWARE': 'After Effects',
        
        // ========== SOFTWARE STATUS COLUMNS (Numeric codes - Use XX, IP, NO, or Finished) ==========
        '6': 'IP',        // PHOTOSHOP
        '7': 'XX',        // ILLUSTRATOR + Indegn
        '8': 'Finished',  // FUME FX
        '10': 'NO',       // FUSION, REAL FLOW, THINKING PARTICAL
        '11': 'XX',       // FCP
        '12': 'XX',       // AFTER EFFECT, HOUDNI, CAD UNITY, Z-BRUSH, SKETCHUP
        '13': 'XX',       // VUE
        '14': 'XX',       // COREL, PREMIERE AUDITION
        '15': 'XX',       // Auto-Cad
        '16': 'XX',       // ILLUSTRATOR + Indegn, AFTER EFFECT
        '23': 'XX',       // PHOTOSHOP
        '24': 'XX',       // HTML Java DW CSS, NUKE, UNITY GAME DESIGN
        '32': 'XX',       // ANIMATE CC
        '33': 'XX',       // UNREAL
        '48': 'XX',       // Ar. MAX + Vray
        '72': 'XX',       // BLENDER PRO, CINEAMA 4D
        '89': 'XX',       // MAX
        '92': 'XX',       // MAYA, Davinci
        
        // ========== ADDITIONAL SOFTWARE NAME COLUMNS ==========
        'PHOTOSHOP': 'IP',
        'ILLUSTRATOR + Indegn': 'XX',
        'COREL': 'XX',
        'Figma ': 'XX',
        'XD': 'XX',
        'ANIMATE CC': 'XX',
        'PREMIERE AUDITION': 'XX',
        'AFTER EFFECT': 'XX',
        'HTML Java DW CSS': 'XX',
        'Ar. MAX + Vray ': 'XX',
        'MAX': 'XX',
        'FUSION': 'XX',
        'REAL FLOW': 'XX',
        'FUME FX': 'XX',
        'NUKE': 'XX',
        'THINKING PARTICAL': 'XX',
        'RAY FIRE': 'XX',
        'MOCHA': 'XX',
        'SILHOUETTE': 'XX',
        'PF TRACK': 'XX',
        'VUE': 'XX',
        'HOUDNI': 'XX',
        'FCP': 'XX',
        'MAYA': 'XX',
        'CAD  UNITY': 'XX',
        'MUDBOX ': 'XX',
        'UNITY GAME DESIGN': 'XX',
        'Z-BRUSH': 'XX',
        'LUMION': 'XX',
        'SKETCHUP': 'XX',
        'UNREAL': 'XX',
        'BLENDER PRO': 'XX',
        'CINEAMA 4D': 'XX',
        'SUBSTANCE PAINTER': 'XX',
        '3D EQUALIZER': 'XX',
        'Photography ': 'XX',
        'Auto-Cad': 'XX',
        'Wordpress': 'XX',
        'Vuforia SDK': 'XX',
        'Davinci ': 'XX',
      },
      {
        // Second example row with different data
        DATE: '2024-02-01',
        NAME: 'Jane Smith',
        NUMBER: '9876543211',
        email: 'jane.smith@example.com',
        dob: '1996-06-15',
        whatsappNumber: '9876543211',
        localAddress: '456 Oak Ave, City, State',
        permanentAddress: '456 Oak Ave, City, State',
        emergencyContactNumber: '9876543212',
        emergencyName: 'John Smith',
        emergencyRelation: 'Father',
        'New COURSE': 'Video Editing',
        COMMON: 'Video Editing',
        courseName: 'Video Editing',
        Tyoe: 'A Plus',
        TYPE: 'A Plus',
        COURSE: 'A Plus',
        courseType: 'A Plus',
        Status: 'Active',
        STATUS: 'Active',
        studentStatus: 'Active',
        'TIME COMMITMENT': '8 to 12',
        TIME: '8 to 12',
        batchTiming: '8 to 12',
        PLUS: '',
        softwaresIncluded: 'After Effects, Premiere Pro',
        finishedBatches: 'After Effects',
        currentBatches: 'Premiere Pro',
        pendingBatches: 'DaVinci Resolve',
        totalDeal: 60000,
        bookingAmount: 15000,
        balanceAmount: 45000,
        emiPlan: 'Yes',
        emiPlanDate: '2024-03-01',
        complimentarySoftware: '',
        complimentaryGift: '',
        hasReference: 'No',
        referenceDetails: '',
        counselorName: 'Mike Johnson',
        leadSource: 'Online',
        walkinDate: '2024-01-25',
        masterFaculty: 'Dr. Brown',
        '1st Software': 'After Effects',
        'Start Dt': '2024-02-05',
        '1st Software START DATE': '2024-02-05',
        'End': '2024-04-05',
        '1st Software END DATE': '2024-04-05',
        'Batch Time': '8 to 12',
        '1st Software BATCH TIMING': '8 to 12',
        'Days': 'TTS',
        '1st Software FACULTY': 'Dr. Brown',
        '1st Software CURRENT SOFTARE': 'IP',
        '1st Software CURRENT': 'IP',
        '2nd Software': 'Premiere Pro',
        'START DATE': '2024-04-10',
        '2nd Software START DATE': '2024-04-10',
        'END DATE': '2024-06-10',
        '2nd Software END DATE': '2024-06-10',
        'BATCH TIME': '8 to 12',
        '2nd Software BATCH TIMING': '8 to 12',
        'Days ': 'MWF',
        '2nd Software FACULTY': 'Dr. Davis',
        '2nd Software CURRENT': 'XX',
        'Future Batch START DATE': '2024-06-15',
        'Future Batch END DATE': '2024-08-15',
        'Future Batch BATCH TIME': '9 to 11',
        'MWF/TTS': 'TTS',
        'Future Batch MWF/TTS': 'TTS',
        'Future Batch FACULTY': 'Dr. Wilson',
        'Future Batch CURRENT SOFTARE': 'XX',
        'Future Batch RENT SOFT': '',
        'REMARK': '',
        'NEXT SOFTWARE': 'DaVinci Resolve',
        '6': 'Finished',
        '7': 'Finished',
        '12': 'IP',
        '13': 'IP',
        '92': 'IP',
        'PHOTOSHOP': 'Finished',
        'ILLUSTRATOR + Indegn': 'Finished',
        'AFTER EFFECT': 'IP',
        'PREMIERE AUDITION': 'IP',
        'Davinci ': 'IP',
      },
    ];

    // Create workbook
    logger.info('Creating workbook...');
    const workbook = XLSX.utils.book_new();
    
    // Reorder columns to ensure DATE is absolutely first
    // Define the exact column order with DATE first, numeric codes LAST
    const columnOrder = [
      // ========== DATE MUST BE FIRST ==========
      'DATE', // FIRST COLUMN - must be first
      
      // ========== BASIC STUDENT INFO ==========
      'NAME', 'NUMBER', 'email', 'dob',
      
      // ========== CONTACT INFO ==========
      'whatsappNumber', 'localAddress', 'permanentAddress',
      'emergencyContactNumber', 'emergencyName', 'emergencyRelation',
      
      // ========== COURSE INFO ==========
      'New COURSE', 'COMMON', 'courseName', 'Tyoe', 'TYPE', 'COURSE', 'courseType',
      'Status', 'STATUS', 'studentStatus', 'TIME COMMITMENT', 'TIME', 'batchTiming', 'PLUS',
      
      // ========== BATCH STATUS ==========
      'softwaresIncluded', 'finishedBatches', 'currentBatches', 'pendingBatches',
      
      // ========== FINANCIAL ==========
      'totalDeal', 'bookingAmount', 'balanceAmount', 'emiPlan', 'emiPlanDate',
      
      // ========== ADDITIONAL INFO ==========
      'complimentarySoftware', 'complimentaryGift', 'hasReference', 'referenceDetails',
      'counselorName', 'leadSource', 'walkinDate', 'masterFaculty',
      
      // ========== 1ST SOFTWARE SECTION ==========
      '1st Software', 'Start Dt', '1st Software START DATE', 'End', '1st Software END DATE',
      'Batch Time', '1st Software BATCH TIMING', 'Days', 'FACULTY', '1st Software FACULTY',
      'CURRENT SOFTARE', '1st Software CURRENT',
      
      // ========== 2ND SOFTWARE SECTION ==========
      '2nd Software', 'START DATE', '2nd Software START DATE', 'END DATE', '2nd Software END DATE',
      'BATCH TIME', '2nd Software BATCH TIMING', 'Days ', '2nd Software FACULTY', '2nd Software CURRENT',
      
      // ========== FUTURE BATCH SECTION ==========
      'Future Batch START DATE', 'Future Batch END DATE', 'Future Batch BATCH TIME',
      'MWF/TTS', 'Future Batch MWF/TTS', 'Future Batch FACULTY', 'Future Batch CURRENT SOFTARE',
      'Future Batch RENT SOFT', 'REMARK', 'NEXT SOFTWARE',
      
      // ========== SOFTWARE NAME COLUMNS (before numeric codes) ==========
      'PHOTOSHOP', 'ILLUSTRATOR + Indegn', 'COREL', 'Figma ', 'XD', 'ANIMATE CC',
      'PREMIERE AUDITION', 'AFTER EFFECT', 'HTML Java DW CSS', 'Ar. MAX + Vray ', 'MAX',
      'FUSION', 'REAL FLOW', 'FUME FX', 'NUKE', 'THINKING PARTICAL', 'RAY FIRE',
      'MOCHA', 'SILHOUETTE', 'PF TRACK', 'VUE', 'HOUDNI', 'FCP', 'MAYA',
      'CAD  UNITY', 'MUDBOX ', 'UNITY GAME DESIGN', 'Z-BRUSH', 'LUMION', 'SKETCHUP',
      'UNREAL', 'BLENDER PRO', 'CINEAMA 4D', 'SUBSTANCE PAINTER', '3D EQUALIZER',
      'Photography ', 'Auto-Cad', 'Wordpress', 'Vuforia SDK', 'Davinci ',
      
      // ========== NUMERIC SOFTWARE CODE COLUMNS (LAST - after all other fields) ==========
      '6', '7', '8', '10', '11', '12', '13', '14', '15', '16', '23', '24', '32', '33', '48', '72', '89', '92'
    ];
    
    // Numeric codes must be added LAST as strings to ensure they come after DATE
    const numericCodes = ['6', '7', '8', '10', '11', '12', '13', '14', '15', '16', '23', '24', '32', '33', '48', '72', '89', '92'];
    
    // Create ordered data with DATE first, numeric codes LAST
    // IMPORTANT: Process DATE first, then all non-numeric columns, then numeric codes last
    const orderedSampleData = sampleData.map((row: any) => {
      const orderedRow: any = {};
      
      // STEP 1: Add DATE FIRST (must be the very first column)
      if (row.DATE !== undefined && row.DATE !== null) {
        orderedRow.DATE = row.DATE;
      }
      
      // STEP 2: Add all non-numeric columns in order (skip DATE and numeric codes)
      columnOrder.forEach(key => {
        if (key !== 'DATE' && !numericCodes.includes(key) && Object.prototype.hasOwnProperty.call(row, key)) {
          orderedRow[key] = row[key];
        }
      });
      
      // STEP 3: Add numeric codes LAST (after all other columns)
      numericCodes.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          orderedRow[key] = row[key];
        }
      });
      
      // STEP 4: Add any remaining keys that weren't in the order list (except numeric codes and DATE)
      Object.keys(row).forEach(key => {
        if (!columnOrder.includes(key) && !numericCodes.includes(key) && key !== 'DATE' && !Object.prototype.hasOwnProperty.call(orderedRow, key)) {
          orderedRow[key] = row[key];
        }
      });
      
      return orderedRow;
    });
    
    // Create worksheet with explicit column order to ensure DATE is first
    // Get all columns in the exact order we want: DATE first, numeric codes last
    // Build column list: DATE first, then all non-numeric columns, then numeric codes last
    const nonNumericColumns = columnOrder.filter(k => k !== 'DATE' && !numericCodes.includes(k));
    const allColumns = ['DATE', ...nonNumericColumns, ...numericCodes];
    
    logger.info(`Creating worksheet with ${allColumns.length} columns. First column: ${allColumns[0]}, Last columns: ${numericCodes.slice(-3).join(', ')}`);
    
    // Create worksheet manually with explicit column order using array-based approach
    // This ensures DATE is column 0 (A), and numeric codes are at the end
    const worksheet: any = {};
    
    // Set headers in correct order (row 0) - DATE will be column A (index 0)
    allColumns.forEach((colName, idx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: idx });
      worksheet[cellAddress] = { t: 's', v: colName };
    });
    
    // Copy data rows in correct column order
    for (let rowIdx = 0; rowIdx < orderedSampleData.length; rowIdx++) {
      allColumns.forEach((colName, colIdx) => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
        const value = orderedSampleData[rowIdx]?.[colName];
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'string') {
            worksheet[cellAddress] = { t: 's', v: value };
          } else if (typeof value === 'number') {
            worksheet[cellAddress] = { t: 'n', v: value };
          } else if (value instanceof Date) {
            worksheet[cellAddress] = { t: 'd', v: value };
          } else {
            worksheet[cellAddress] = { t: 's', v: String(value) };
          }
        }
      });
    }
    
    // Set worksheet range - ensure it covers all columns
    worksheet['!ref'] = XLSX.utils.encode_range({ 
      s: { r: 0, c: 0 }, 
      e: { r: orderedSampleData.length, c: allColumns.length - 1 } 
    });
    
    logger.info(`Worksheet created. Range: ${worksheet['!ref']}, Total columns: ${allColumns.length}`);
    
    // Set column widths for better readability - DATE is FIRST column
    const colWidths = [
      { wch: 12 }, // DATE - FIRST COLUMN
      { wch: 20 }, // NAME
      { wch: 15 }, // NUMBER
      { wch: 25 }, // email
      { wch: 12 }, // dob
      // Contact Info (3)
      { wch: 15 }, // whatsappNumber
      { wch: 30 }, // localAddress
      { wch: 30 }, // permanentAddress
      // Emergency Contact (3)
      { wch: 18 }, // emergencyContactNumber
      { wch: 20 }, // emergencyName
      { wch: 15 }, // emergencyRelation
      // Course Info (9)
      { wch: 20 }, // New COURSE
      { wch: 20 }, // COMMON
      { wch: 20 }, // courseName
      { wch: 12 }, // Tyoe
      { wch: 12 }, // TYPE
      { wch: 12 }, // COURSE
      { wch: 12 }, // courseType
      { wch: 12 }, // Status
      { wch: 12 }, // STATUS
      { wch: 12 }, // studentStatus
      { wch: 15 }, // TIME COMMITMENT
      { wch: 12 }, // TIME
      { wch: 12 }, // batchTiming
      { wch: 10 }, // PLUS
      // Batch Status (3)
      { wch: 30 }, // softwaresIncluded
      { wch: 30 }, // finishedBatches
      { wch: 30 }, // currentBatches
      { wch: 30 }, // pendingBatches
      // Financial (5)
      { wch: 12 }, // totalDeal
      { wch: 12 }, // bookingAmount
      { wch: 12 }, // balanceAmount
      { wch: 10 }, // emiPlan
      { wch: 12 }, // emiPlanDate
      // Additional Info (7)
      { wch: 25 }, // complimentarySoftware
      { wch: 20 }, // complimentaryGift
      { wch: 10 }, // hasReference
      { wch: 25 }, // referenceDetails
      { wch: 20 }, // counselorName
      { wch: 15 }, // leadSource
      { wch: 12 }, // walkinDate
      { wch: 20 }, // masterFaculty
      // 1st Software (11 columns - including merged fields)
      { wch: 20 }, // 1st Software
      { wch: 12 }, // Start Dt
      { wch: 18 }, // 1st Software START DATE
      { wch: 12 }, // End
      { wch: 18 }, // 1st Software END DATE
      { wch: 15 }, // Batch Time
      { wch: 18 }, // 1st Software BATCH TIMING
      { wch: 10 }, // Days
      { wch: 18 }, // FACULTY
      { wch: 18 }, // 1st Software FACULTY
      { wch: 15 }, // CURRENT SOFTARE
      { wch: 15 }, // 1st Software CURRENT
      // 2nd Software (11 columns - including merged fields)
      { wch: 20 }, // 2nd Software
      { wch: 18 }, // START DATE
      { wch: 18 }, // 2nd Software START DATE
      { wch: 18 }, // END DATE
      { wch: 18 }, // 2nd Software END DATE
      { wch: 18 }, // BATCH TIME
      { wch: 18 }, // 2nd Software BATCH TIMING
      { wch: 10 }, // Days (with space)
      { wch: 18 }, // 2nd Software FACULTY
      { wch: 15 }, // 2nd Software CURRENT
      // Future Batch (9 columns)
      { wch: 18 }, // Future Batch START DATE
      { wch: 18 }, // Future Batch END DATE
      { wch: 18 }, // Future Batch BATCH TIME
      { wch: 12 }, // MWF/TTS
      { wch: 12 }, // Future Batch MWF/TTS
      { wch: 18 }, // Future Batch FACULTY
      { wch: 15 }, // Future Batch CURRENT SOFTARE
      { wch: 15 }, // Future Batch RENT SOFT
      { wch: 20 }, // REMARK
      { wch: 20 }, // NEXT SOFTWARE
      // Software Status Codes (18 numeric codes)
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      // Software Name Columns (40 columns)
      { wch: 15 }, // PHOTOSHOP
      { wch: 20 }, // ILLUSTRATOR + Indegn
      { wch: 12 }, // COREL
      { wch: 12 }, // Figma
      { wch: 8 },  // XD
      { wch: 15 }, // ANIMATE CC
      { wch: 20 }, // PREMIERE AUDITION
      { wch: 15 }, // AFTER EFFECT
      { wch: 20 }, // HTML Java DW CSS
      { wch: 18 }, // Ar. MAX + Vray
      { wch: 10 }, // MAX
      { wch: 12 }, // FUSION
      { wch: 12 }, // REAL FLOW
      { wch: 12 }, // FUME FX
      { wch: 10 }, // NUKE
      { wch: 20 }, // THINKING PARTICAL
      { wch: 12 }, // RAY FIRE
      { wch: 10 }, // MOCHA
      { wch: 15 }, // SILHOUETTE
      { wch: 12 }, // PF TRACK
      { wch: 10 }, // VUE
      { wch: 12 }, // HOUDNI
      { wch: 8 },  // FCP
      { wch: 10 }, // MAYA
      { wch: 15 }, // CAD UNITY
      { wch: 12 }, // MUDBOX
      { wch: 20 }, // UNITY GAME DESIGN
      { wch: 12 }, // Z-BRUSH
      { wch: 12 }, // LUMION
      { wch: 12 }, // SKETCHUP
      { wch: 12 }, // UNREAL
      { wch: 15 }, // BLENDER PRO
      { wch: 15 }, // CINEAMA 4D
      { wch: 20 }, // SUBSTANCE PAINTER
      { wch: 15 }, // 3D EQUALIZER
      { wch: 15 }, // Photography
      { wch: 12 }, // Auto-Cad
      { wch: 12 }, // Wordpress
      { wch: 15 }, // Vuforia SDK
      { wch: 12 }, // Davinci
    ];
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Data');

    // Generate buffer
    logger.info('Generating buffer...');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    logger.info(`Buffer generated, size: ${buffer.length} bytes`);

    // Set headers BEFORE sending response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=unified_student_template.xlsx');
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

// GET /students/check-duplicate → Check if email or phone already exists
export const checkDuplicate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { email, phone, excludeId } = req.query;
    const excludeStudentId = excludeId ? parseInt(String(excludeId), 10) : null;
    
    let existingUserByEmail = null;
    let existingUserByPhone = null;
    
    // Check for email duplicate if provided
    if (email) {
      const emailWhereClause: any = db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('email')),
        db.sequelize.fn('LOWER', String(email))
      );
      
      // Add exclude condition if excludeId is provided
      if (excludeStudentId) {
        existingUserByEmail = await db.User.findOne({ 
          where: {
            [Op.and]: [
              emailWhereClause,
              { id: { [Op.ne]: excludeStudentId } }
            ]
          }
        });
      } else {
        existingUserByEmail = await db.User.findOne({ 
          where: emailWhereClause
        });
      }
    }
    
    // Check for phone duplicate if provided
    if (phone) {
      const normalizedPhone = String(phone).replace(/\D/g, '');
      
      // Build where clause for phone (excluding the current student if excludeId is provided)
      const phoneWhereClause: any = { phone: { [Op.ne]: null } };
      if (excludeStudentId) {
        phoneWhereClause.id = { [Op.ne]: excludeStudentId };
      }
      
      // Get all users with phone numbers and check normalized phone numbers
      const allUsersWithPhone = await db.User.findAll({ 
        where: phoneWhereClause,
        attributes: ['id', 'name', 'email', 'phone'],
      });
      
      existingUserByPhone = allUsersWithPhone.find(user => {
        if (!user.phone) return false;
        const userNormalizedPhone = String(user.phone).replace(/\D/g, '');
        const matches = userNormalizedPhone === normalizedPhone && userNormalizedPhone.length > 0;
        return matches;
      });
    }

    const response: { exists: boolean; type?: string; studentId?: number; studentName?: string } = {
      exists: false,
    };

    if (existingUserByEmail) {
      response.exists = true;
      response.type = 'email';
      response.studentId = existingUserByEmail.id;
      response.studentName = existingUserByEmail.name;
    } else if (existingUserByPhone) {
      response.exists = true;
      response.type = 'phone';
      response.studentId = existingUserByPhone.id;
      response.studentName = existingUserByPhone.name;
    }

    res.status(200).json({
      status: 'success',
      data: response,
    });
  } catch (error: any) {
    logger.error('Check duplicate error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while checking for duplicates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

