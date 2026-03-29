import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { Op } from 'sequelize';
import * as path from 'path';
import * as fs from 'fs';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { PaymentStatus } from '../models/PaymentTransaction';
import db from '../models';
import { Response } from 'express';
import { checkDuplicateEmailOrPhone } from './user.controller';
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
  dateOfBirth?: string;    // Add this field for student date of birth
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
  lumpSumPayment?: boolean;
  lumpSumPayments?: Array<{
    date: string;
    amount: number;
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
      lumpSumPayment,
      nextPayDate,
      lumpSumPayments,
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
    
    // Either course name or direct software selection is required
    if (isEmptyString(courseName) && isEmptyString(softwaresIncluded)) {
      validationErrors.push('Either Course Name or Software List is required');
    }
    
    // Batch ID is optional - student can be enrolled without being assigned to a batch
    // But if provided, it must be valid
    if (batchId !== null && batchId !== undefined) {
      const batchIdNum = typeof batchId === 'string' ? parseInt(batchId, 10) : Number(batchId);
      if (isNaN(batchIdNum) || batchIdNum <= 0) {
        validationErrors.push('Batch ID must be a valid positive number');
      }
    }
    
    // If course name is provided but doesn't exist in the system, we need to handle that case
    if (!isEmptyString(courseName)) {
      // We'll validate the course exists later when fetching the software list
      logger.info(`Course name provided (${courseName}), software list will be fetched from course definition if course exists`);
    }
    // If no course name provided, software list must be specified directly
    else if (isEmptyString(courseName) && isEmptyString(softwaresIncluded)) {
      validationErrors.push('At least one software must be selected when no course is specified');
    }
    
    // Handle number fields - they might come as strings or numbers
    // Total Deal Amount is COMPULSORY - student registration not possible without it
    let totalDealNum = 0;
    if (totalDeal === null || totalDeal === undefined) {
      validationErrors.push('Total Deal Amount is required. Student registration cannot proceed without a deal amount.');
    } else {
      totalDealNum = typeof totalDeal === 'string' 
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
    
    // Validate mutual exclusivity between EMI and Lump Sum payment
    if (emiPlan && lumpSumPayment) {
      validationErrors.push('EMI Plan and Lump Sum Payment cannot both be selected');
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
    
    if (lumpSumPayment) {
      // If lumpSumPayments array is provided, validate it
      if (lumpSumPayments && Array.isArray(lumpSumPayments) && lumpSumPayments.length > 0) {
        for (let i = 0; i < lumpSumPayments.length; i++) {
          const payment = lumpSumPayments[i];
          if (!payment.date || !payment.amount) {
            validationErrors.push(`Lump Sum Payment ${i + 1} must have both date and amount`);
          } else {
            const paymentDateStr = String(payment.date).trim();
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(paymentDateStr)) {
              validationErrors.push(`Lump Sum Payment ${i + 1} date must be in valid format`);
            } else {
              // Validate that payment date is not in the past
              const paymentDateObj = new Date(paymentDateStr);
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Set to start of day for comparison
              if (paymentDateObj < today) {
                validationErrors.push(`Lump Sum Payment ${i + 1} date cannot be in the past`);
              }
            }
            
            if (typeof payment.amount !== 'number' || payment.amount <= 0) {
              validationErrors.push(`Lump Sum Payment ${i + 1} amount must be a positive number`);
            }
          }
        }
      } else {
        // If no lumpSumPayments array, fall back to single nextPayDate and amount
        if (isEmptyString(nextPayDate)) {
          validationErrors.push('Next Pay Date is required when Lump Sum Payment is selected');
        } else {
          const nextPayDateStr = String(nextPayDate).trim();
          const nextPayDateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!nextPayDateRegex.test(nextPayDateStr)) {
            validationErrors.push('Next Pay Date must be in valid format');
          } else {
            // Validate that next pay date is not in the past
            const nextPayDateObj = new Date(nextPayDateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for comparison
            if (nextPayDateObj < today) {
              validationErrors.push('Next Pay Date cannot be in the past');
            }
          }
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
    
    // Validate date of birth format if provided
    if (req.body.dateOfBirth) {
      const dobStr = String(req.body.dateOfBirth).trim();
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(dobStr)) {
        validationErrors.push('Date of Birth must be in valid format (YYYY-MM-DD)');
      }
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

    // Check for duplicate email or phone across all users
    const duplicateCheck = await checkDuplicateEmailOrPhone(trimmedEmail, trimmedPhone);
    
    // If duplicate found, return error with existing user info
    if (duplicateCheck.isDuplicate && duplicateCheck.existingUser && duplicateCheck.duplicateFields) {
      await transaction.rollback();
      const conflictType = duplicateCheck.duplicateFields.join(' and ');
      
      logger.warn(`Enrollment blocked: Student "${trimmedStudentName}" tried to register with existing ${conflictType}. Existing user ID: ${duplicateCheck.existingUser.id}`);
      
      res.status(409).json({
        status: 'error',
        message: `A user with this ${conflictType} already exists. Please edit the existing profile instead of creating a new one.`,
        existingStudentId: duplicateCheck.existingUser.id,
        existingStudentName: duplicateCheck.existingUser.name,
        conflictType: conflictType,
        conflictFields: duplicateCheck.duplicateFields,
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

      // If course name is provided but no software list, fetch software list from the course
      let finalSoftwareList = null;
      if (courseName && (!softwaresIncluded || String(softwaresIncluded).trim() === '')) {
        // Fetch course from database to get its software list
        const course = await db.Course.findOne({ where: { name: courseName } });
        if (course) {
          finalSoftwareList = Array.isArray(course.software) ? course.software : [];
          logger.info(`Fetched software list from course ${courseName}: ${finalSoftwareList.join(', ')}`);
        } else {
          // If course doesn't exist, we'll still allow enrollment but log a warning
          logger.warn(`Course '${courseName}' not found in database. Proceeding with empty software list.`);
          finalSoftwareList = [];
        }
      } else if (softwaresIncluded && String(softwaresIncluded).trim()) {
        finalSoftwareList = softwaresIncluded.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      }
      
      const profileData: any = {
        userId: user.id,
        dob: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null, // Use date of birth instead of admission date
        address: localAddress || permanentAddress || null,
        photoUrl: photoUrl, // Set photoUrl from extracted photo
        softwareList: finalSoftwareList,
        enrollmentDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
        status: 'active', // Initially set to active, will be updated based on payment and completion status
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
      // Add software list to metadata - use the final software list (either from request or from course)
      if (finalSoftwareList && finalSoftwareList.length > 0) {
        enrollmentMetadata.softwareList = finalSoftwareList.join(', ');
      } else if (softwaresIncluded) {
        enrollmentMetadata.softwareList = softwaresIncluded; // Fallback to original if no final list
      }
      if (totalDeal !== undefined) enrollmentMetadata.totalDeal = totalDeal;
      if (bookingAmount !== undefined) enrollmentMetadata.bookingAmount = bookingAmount;
      if (balanceAmount !== undefined) enrollmentMetadata.balanceAmount = balanceAmount;
      if (emiPlan !== undefined) enrollmentMetadata.emiPlan = emiPlan;
      if (emiPlanDate) enrollmentMetadata.emiPlanDate = emiPlanDate;
      if (emiInstallments && Array.isArray(emiInstallments) && emiInstallments.length > 0) {
        enrollmentMetadata.emiInstallments = emiInstallments;
      }
      if (lumpSumPayment !== undefined) enrollmentMetadata.lumpSumPayment = lumpSumPayment;
      if (lumpSumPayments && Array.isArray(lumpSumPayments) && lumpSumPayments.length > 0) {
        enrollmentMetadata.lumpSumPayments = lumpSumPayments;
      } else {
        if (nextPayDate) enrollmentMetadata.nextPayDate = nextPayDate;
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
      if (req.body.dateOfBirth) enrollmentMetadata.dateOfBirth = req.body.dateOfBirth; // Add date of birth to metadata
      if (enrollmentDocuments && Array.isArray(enrollmentDocuments) && enrollmentDocuments.length > 0) {
        enrollmentMetadata.enrollmentDocuments = enrollmentDocuments;
      }
      
      // Add additional payment-related fields that may be referenced later
      if (req.body.paymentMode) enrollmentMetadata.paymentMode = req.body.paymentMode;
      if (req.body.paymentDate) enrollmentMetadata.paymentDate = req.body.paymentDate;
      if (req.body.paymentStatus) enrollmentMetadata.paymentStatus = req.body.paymentStatus;
      if (req.body.receiptNumber) enrollmentMetadata.receiptNumber = req.body.receiptNumber;
      if (req.body.emiAmount) enrollmentMetadata.emiAmount = req.body.emiAmount;
      if (req.body.nextPaymentDate) enrollmentMetadata.nextPaymentDate = req.body.nextPaymentDate;
      if (req.body.discountAmount) enrollmentMetadata.discountAmount = req.body.discountAmount;
      if (req.body.taxAmount) enrollmentMetadata.taxAmount = req.body.taxAmount;
      if (req.body.admissionFee) enrollmentMetadata.admissionFee = req.body.admissionFee;
      if (req.body.cautionDeposit) enrollmentMetadata.cautionDeposit = req.body.cautionDeposit;
      if (req.body.registrationFee) enrollmentMetadata.registrationFee = req.body.registrationFee;

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
        if (lumpSumPayment !== undefined) paymentPlan.lumpSumPayment = lumpSumPayment;
        if (lumpSumPayments && Array.isArray(lumpSumPayments) && lumpSumPayments.length > 0) {
          paymentPlan.lumpSumPayments = lumpSumPayments;
        } else {
          if (nextPayDate) paymentPlan.nextPayDate = nextPayDate;
        }
        
        // Add additional payment fields from request body or local variables
        if (req.body.paymentMode) paymentPlan.paymentMode = req.body.paymentMode;
        if (req.body.paymentDate) paymentPlan.paymentDate = req.body.paymentDate;
        if (req.body.paymentStatus) paymentPlan.paymentStatus = req.body.paymentStatus;
        if (req.body.receiptNumber) paymentPlan.receiptNumber = req.body.receiptNumber;
        if (req.body.emiAmount) paymentPlan.emiAmount = req.body.emiAmount;
        if (req.body.nextPaymentDate) paymentPlan.nextPaymentDate = req.body.nextPaymentDate;
        if (req.body.discountAmount) paymentPlan.discountAmount = req.body.discountAmount;
        if (req.body.taxAmount) paymentPlan.taxAmount = req.body.taxAmount;
        if (req.body.admissionFee) paymentPlan.admissionFee = req.body.admissionFee;
        if (req.body.cautionDeposit) paymentPlan.cautionDeposit = req.body.cautionDeposit;
        if (req.body.registrationFee) paymentPlan.registrationFee = req.body.registrationFee;

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
        if (enrollment) {
          // Create payment for booking amount (compulsory field) - this is always required
          if (bookingAmount !== undefined && bookingAmount !== null && bookingAmount >= 0) {
            try {
              await db.PaymentTransaction.create(
                {
                  studentId: user.id,
                  enrollmentId: enrollment.id,
                  amount: bookingAmount,
                  paidAmount: bookingAmount, // Booking amount is considered as paid
                  dueDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
                  status: bookingAmount > 0 ? PaymentStatus.PAID : PaymentStatus.UNPAID, // If booking amount is 0, mark as unpaid
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

          // For EMI plan - create payment transactions for installments
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
                      status: PaymentStatus.UNPAID,
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
          
          // For Lump Sum payment - create payment transactions
          else if (lumpSumPayment) {
            // Case 1: Balance amount > 0 (partial payment made, remaining balance exists)
            if (balanceAmount && balanceAmount > 0) {
              try {
                // If multiple lump sum payments are provided, create each one
                if (lumpSumPayments && Array.isArray(lumpSumPayments) && lumpSumPayments.length > 0) {
                  let totalLumpSumAmount = 0;
                  
                  for (const payment of lumpSumPayments) {
                    if (payment.amount && payment.date) {
                      totalLumpSumAmount += payment.amount;
                      
                      await db.PaymentTransaction.create(
                        {
                          studentId: user.id,
                          enrollmentId: enrollment.id,
                          amount: payment.amount,
                          paidAmount: 0, // Lump sum amount is initially unpaid
                          dueDate: new Date(payment.date),
                          status: PaymentStatus.UNPAID,
                          notes: `Lump Sum payment - Date: ${payment.date}, Amount: ${payment.amount}`,
                        },
                        { transaction }
                      );
                      logger.info(`Created lump sum payment: studentId=${user.id}, enrollmentId=${enrollment.id}, amount=${payment.amount}, dueDate=${payment.date}`);
                    }
                  }
                
                  // Validate that the total lump sum payments match the balance amount
                  if (Math.abs(totalLumpSumAmount - balanceAmount) > 0.01) {
                    logger.warn(`Lump sum payment total (${totalLumpSumAmount}) does not match balance amount (${balanceAmount}) for student ${user.id}`);
                  }
                } else {
                  // Create single lump sum payment (backward compatibility)
                  const dueDate = nextPayDate ? new Date(nextPayDate) : new Date();
                  
                  await db.PaymentTransaction.create(
                    {
                      studentId: user.id,
                      enrollmentId: enrollment.id,
                      amount: balanceAmount,
                      paidAmount: 0, // Lump sum amount is initially unpaid
                      dueDate: dueDate,
                      status: PaymentStatus.UNPAID,
                      notes: 'Lump Sum payment with next payment date',
                    },
                    { transaction }
                  );
                  logger.info(`Created lump sum payment: studentId=${user.id}, enrollmentId=${enrollment.id}, amount=${balanceAmount}, dueDate=${dueDate.toISOString()}`);
                }
              } catch (paymentError: any) {
                logger.error('Error creating lump sum payment:', paymentError);
                // Don't fail enrollment if payment creation fails, but log it
              }
            }
            // Case 2: Balance amount = 0 (full payment received upfront)
            else if (balanceAmount === 0 && totalDeal && totalDeal > 0) {
              try {
                // Create a PAID transaction showing full payment was received
                await db.PaymentTransaction.create(
                  {
                    studentId: user.id,
                    enrollmentId: enrollment.id,
                    amount: totalDeal,
                    paidAmount: totalDeal, // Full amount paid upfront
                    dueDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
                    paidAt: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
                    status: PaymentStatus.PAID,
                    notes: 'Full payment received - Lump sum (Balance: ₹0)',
                  },
                  { transaction }
                );
                logger.info(`Created full payment record: studentId=${user.id}, enrollmentId=${enrollment.id}, amount=${totalDeal}, balanceAmount=0`);
              } catch (paymentError: any) {
                logger.error('Error creating full payment record:', paymentError);
                // Don't fail enrollment if payment creation fails, but log it
              }
            }
          }
          
          // If neither EMI nor Lump Sum is selected, create a single payment for the remaining balance
          else if (balanceAmount && balanceAmount > 0) {
            try {
              await db.PaymentTransaction.create(
                {
                  studentId: user.id,
                  enrollmentId: enrollment.id,
                  amount: balanceAmount,
                  paidAmount: 0, // Balance amount is initially unpaid
                  dueDate: dateOfAdmission ? new Date(dateOfAdmission) : new Date(),
                  status: PaymentStatus.UNPAID,
                  notes: 'Balance amount from enrollment',
                },
                { transaction }
              );
              logger.info(`Created balance payment: studentId=${user.id}, enrollmentId=${enrollment.id}, amount=${balanceAmount}`);
            } catch (paymentError: any) {
              logger.error('Error creating balance payment:', paymentError);
              // Don't fail enrollment if payment creation fails, but log it
            }
          }
          // If balance amount is 0 and neither EMI nor Lump Sum is selected, no payment transaction is needed
          else if (balanceAmount === 0 || balanceAmount === null || balanceAmount === undefined) {
            logger.info(`No balance payment needed: studentId=${user.id}, enrollmentId=${enrollment.id}, balanceAmount=${balanceAmount}`);
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
      normalized = normalized.replace(/[\s\-()./+]/g, '');
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
        
        // Validate compulsory payment fields
        const paymentMode = getValue(row, ['paymentMode', 'Payment Mode', 'payment_mode']);
        const paymentDate = getValue(row, ['paymentDate', 'Payment Date', 'payment_date']);
        const bookingAmount = getValue(row, ['bookingAmount', 'Booking Amount', 'booking_amount']);
        
        if (!paymentMode) {
          await transaction.rollback();
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: 'Payment Mode is required',
          });
          continue;
        }
        
        if (!paymentDate) {
          await transaction.rollback();
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: 'Payment Date is required',
          });
          continue;
        }
        
        if (!bookingAmount) {
          await transaction.rollback();
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: 'Booking Amount is required',
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

          // Check for duplicate email or phone across all users
          const duplicateCheck = await checkDuplicateEmailOrPhone(finalEmail, finalPhone);
          
          if (duplicateCheck.isDuplicate && duplicateCheck.existingUser && duplicateCheck.duplicateFields) {
            await transaction.rollback();
            result.failed++;
            result.errors.push({
              row: rowNumber,
              error: `A user with this ${duplicateCheck.duplicateFields.join(' and ')} already exists.`
            });
            continue;
          }

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
          
          // Compulsory payment information
          paymentMode: getValue(row, ['paymentMode', 'Payment Mode', 'payment_mode']) || null,
          paymentDate: getValue(row, ['paymentDate', 'Payment Date', 'payment_date']) ?
            (parseExcelDate(getValue(row, ['paymentDate', 'Payment Date']))?.toISOString().split('T')[0] || null) : null,
          bookingAmount: getValue(row, ['bookingAmount', 'Booking Amount', 'booking_amount']) ?
            (typeof getValue(row, ['bookingAmount', 'Booking Amount']) === 'string' ?
              parseFloat(getValue(row, ['bookingAmount', 'Booking Amount'])) :
              getValue(row, ['bookingAmount', 'Booking Amount'])) : null,
          totalDeal: getValue(row, ['totalDeal', 'Total Deal', 'total_deal']) ? 
            (typeof getValue(row, ['totalDeal', 'Total Deal']) === 'string' ? 
              parseFloat(getValue(row, ['totalDeal', 'Total Deal'])) : 
              getValue(row, ['totalDeal', 'Total Deal'])) : null,
          balanceAmount: getValue(row, ['balanceAmount', 'Balance Amount', 'balance_amount']) ?
            (typeof getValue(row, ['balanceAmount', 'Balance Amount']) === 'string' ?
              parseFloat(getValue(row, ['balanceAmount', 'Balance Amount'])) :
              getValue(row, ['balanceAmount', 'Balance Amount'])) : null,
          paymentStatus: getValue(row, ['paymentStatus', 'Payment Status', 'payment_status']) || null,
          receiptNumber: getValue(row, ['receiptNumber', 'Receipt Number', 'receipt_number']) || null,
          
          // Course vs individual software enrollment
          enrollmentType: getValue(row, ['enrollmentType', 'Enrollment Type', 'enrollment_type']) || 'Course',
          softwaresIncluded: getValue(row, ['softwaresIncluded', 'Softwares Included', 'softwares_included']),
          
          // Schedule information
          scheduleType: getValue(row, ['scheduleType', 'Schedule Type', 'schedule_type']) || null,
          startTime: getValue(row, ['startTime', 'Start Time', 'start_time']) || null,
          endTime: getValue(row, ['endTime', 'End Time', 'end_time']) || null,
          classDays: getValue(row, ['classDays', 'Class Days', 'class_days']) || null,
          batchName: getValue(row, ['batchName', 'Batch Name', 'batch_name']) || null,
          
          // Financial details
          emiPlan: parseBoolean(getValue(row, ['emiPlan', 'EMI Plan', 'emi_plan'])),
          emiPlanDate: getValue(row, ['emiPlanDate', 'EMI Plan Date', 'emi_plan_date']) ?
            (parseExcelDate(getValue(row, ['emiPlanDate', 'EMI Plan Date']))?.toISOString().split('T')[0] || null) : null,
          emiInstallments: getValue(row, ['emiInstallments', 'EMI Installments', 'emi_installments']) ?
            (typeof getValue(row, ['emiInstallments', 'EMI Installments']) === 'string' ?
              parseInt(getValue(row, ['emiInstallments', 'EMI Installments'])) :
              getValue(row, ['emiInstallments', 'EMI Installments'])) : null,
          emiAmount: getValue(row, ['emiAmount', 'EMI Amount', 'emi_amount']) ?
            (typeof getValue(row, ['emiAmount', 'EMI Amount']) === 'string' ?
              parseFloat(getValue(row, ['emiAmount', 'EMI Amount'])) :
              getValue(row, ['emiAmount', 'EMI Amount'])) : null,
          nextPaymentDate: getValue(row, ['nextPaymentDate', 'Next Payment Date', 'next_payment_date']) ?
            (parseExcelDate(getValue(row, ['nextPaymentDate', 'Next Payment Date']))?.toISOString().split('T')[0] || null) : null,
          lumpSumPayment: parseBoolean(getValue(row, ['lumpSumPayment', 'Lump Sum Payment', 'lump_sum_payment'])),
          discountAmount: getValue(row, ['discountAmount', 'Discount Amount', 'discount_amount']) ?
            (typeof getValue(row, ['discountAmount', 'Discount Amount']) === 'string' ?
              parseFloat(getValue(row, ['discountAmount', 'Discount Amount'])) :
              getValue(row, ['discountAmount', 'Discount Amount'])) : null,
          taxAmount: getValue(row, ['taxAmount', 'Tax Amount', 'tax_amount']) ?
            (typeof getValue(row, ['taxAmount', 'Tax Amount']) === 'string' ?
              parseFloat(getValue(row, ['taxAmount', 'Tax Amount'])) :
              getValue(row, ['taxAmount', 'Tax Amount'])) : null,
          admissionFee: getValue(row, ['admissionFee', 'Admission Fee', 'admission_fee']) ?
            (typeof getValue(row, ['admissionFee', 'Admission Fee']) === 'string' ?
              parseFloat(getValue(row, ['admissionFee', 'Admission Fee'])) :
              getValue(row, ['admissionFee', 'Admission Fee'])) : null,
          cautionDeposit: getValue(row, ['cautionDeposit', 'Caution Deposit', 'caution_deposit']) ?
            (typeof getValue(row, ['cautionDeposit', 'Caution Deposit']) === 'string' ?
              parseFloat(getValue(row, ['cautionDeposit', 'Caution Deposit'])) :
              getValue(row, ['cautionDeposit', 'Caution Deposit'])) : null,
          registrationFee: getValue(row, ['registrationFee', 'Registration Fee', 'registration_fee']) ?
            (typeof getValue(row, ['registrationFee', 'Registration Fee']) === 'string' ?
              parseFloat(getValue(row, ['registrationFee', 'Registration Fee'])) :
              getValue(row, ['registrationFee', 'Registration Fee'])) : null,
          
          // Additional information
          complimentarySoftware: getValue(row, ['complimentarySoftware', 'Complimentary Software']),
          complimentaryGift: getValue(row, ['complimentaryGift', 'Complimentary Gift']),
          hasReference: parseBoolean(getValue(row, ['hasReference', 'Has Reference', 'has_reference'])),
          referenceDetails: getValue(row, ['referenceDetails', 'Reference Details', 'reference_details']),
          counselorName: getValue(row, ['counselorName', 'Counselor Name', 'counselor_name']),
          leadSource: getValue(row, ['leadSource', 'Lead Source', 'lead_source']),
          walkinDate: getValue(row, ['walkinDate', 'Walk-in Date', 'walkin_date']) ?
            (parseExcelDate(getValue(row, ['walkinDate', 'Walk-in Date']))?.toISOString().split('T')[0] || null) : null,
          masterFaculty: getValue(row, ['masterFaculty', 'Master Faculty', 'master_faculty']),
          studentStatus: getValue(row, ['studentStatus', 'Student Status', 'student_status']) || 'active',
          enrollmentDate: getValue(row, ['enrollmentDate', 'Enrollment Date', 'enrollment_date']) ?
            (parseExcelDate(getValue(row, ['enrollmentDate', 'Enrollment Date']))?.toISOString().split('T')[0] || null) : null,
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
        const softwareList = [];

        // Define software status columns for extracting software names
        const softwareStatusColumns = [
          'SOFTWARE_PHOTOSHOP_STATUS', 'SOFTWARE_ILLUSTRATOR_STATUS', 'SOFTWARE_INDESIGN_STATUS',
          'SOFTWARE_AFTEREFFECTS_STATUS', 'SOFTWARE_PREMIEREPRO_STATUS', 'SOFTWARE_ANIMATECC_STATUS',
          'SOFTWARE_FIGMA_STATUS', 'SOFTWARE_XD_STATUS', 'SOFTWARE_COREL_STATUS',
          'SOFTWARE_AUTOCAD_STATUS', 'SOFTWARE_3DSMAX_STATUS', 'SOFTWARE_MAYA_STATUS',
          'SOFTWARE_BLENDER_STATUS', 'SOFTWARE_UNREAL_STATUS', 'SOFTWARE_CINEMA4D_STATUS',
          'SOFTWARE_HOUDINI_STATUS', 'SOFTWARE_ZBRUSH_STATUS', 'SOFTWARE_SUBSTANCEPAINTER_STATUS',
          'SOFTWARE_FUSION_STATUS', 'SOFTWARE_NUKE_STATUS', 'SOFTWARE_DAVINCIRESOLVE_STATUS',
          'SOFTWARE_SKETCHUP_STATUS', 'SOFTWARE_LUMION_STATUS', 'SOFTWARE_VUE_STATUS'
        ];

        // Extract software from softwaresIncluded field
        if (getValue(row, ['softwaresIncluded', 'Softwares Included', 'softwares_included'])) {
          const softwaresFromField = String(getValue(row, ['softwaresIncluded', 'Softwares Included'])).split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          softwareList.push(...softwaresFromField);
        }

        // Extract software names from the new software status columns
        for (const statusColumn of softwareStatusColumns) {
          const statusValue = row[statusColumn];
          if (statusValue) { // If there's any status value for this software
            const softwareNameMatch = statusColumn.match(/^SOFTWARE_(.+)_STATUS$/);
            if (softwareNameMatch) {
              const softwareName = softwareNameMatch[1]
                .replace(/_/g, ' ')
                .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
              
              if (!softwareList.includes(softwareName)) {
                softwareList.push(softwareName);
              }
            }
          }
        }



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
          const studentProfile = await db.StudentProfile.findOne({
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

        // Create Enrollment record if not exists
        const existingEnrollment = await db.Enrollment.findOne({
          where: { studentId: student.id },
          transaction
        });

        if (!existingEnrollment && enrollmentMetadata.totalDeal && enrollmentMetadata.bookingAmount !== undefined) {
          try {
            await db.Enrollment.create({
              studentId: student.id,
              batchId: 1, // Default batch
              enrollmentDate: parsedDateOfAdmission || new Date(),
              status: 'active',
              paymentPlan: {
                totalDeal: enrollmentMetadata.totalDeal,
                bookingAmount: enrollmentMetadata.bookingAmount,
                balanceAmount: enrollmentMetadata.balanceAmount || (enrollmentMetadata.totalDeal - enrollmentMetadata.bookingAmount),
                paymentStatus: enrollmentMetadata.paymentStatus || 'Partial Paid'
              }
            }, { transaction });
            logger.info(`Created enrollment record for student ${student.id}`);
          } catch (enrollError: any) {
            logger.warn(`Failed to create enrollment for student ${student.id}:`, enrollError.message);
            // Continue without enrollment if batch constraint fails
          }
        }

        // Create PaymentTransaction records if not exists
        const existingPayments = await db.PaymentTransaction.findAll({
          where: { studentId: student.id },
          transaction
        });

        if (existingPayments.length === 0 && enrollmentMetadata.totalDeal && enrollmentMetadata.bookingAmount !== undefined) {
          // Create booking payment (paid)
          await db.PaymentTransaction.create({
            studentId: student.id,
            amount: enrollmentMetadata.bookingAmount,
            paidAmount: enrollmentMetadata.bookingAmount,
            dueDate: parsedDateOfAdmission || new Date(),
            paidAt: parsedDateOfAdmission || new Date(),
            status: PaymentStatus.PAID,
            notes: 'Initial booking amount from Excel import'
          }, { transaction });
          logger.info(`Created booking payment for student ${student.id}`);

          // Create balance payment (unpaid) if there's a balance
          const balanceAmount = enrollmentMetadata.balanceAmount || (enrollmentMetadata.totalDeal - enrollmentMetadata.bookingAmount);
          if (balanceAmount > 0) {
            await db.PaymentTransaction.create({
              studentId: student.id,
              amount: balanceAmount,
              paidAmount: 0,
              dueDate: new Date(new Date(parsedDateOfAdmission || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from enrollment
              status: PaymentStatus.UNPAID,
              notes: 'Balance amount from Excel import'
            }, { transaction });
            logger.info(`Created balance payment for student ${student.id}`);
          }
        }

        // ========== PROCESS SOFTWARE PROGRESS DATA ==========
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

        // Get course info - support all field name variations
        const courseName = getValue(row, ['courseName', 'Course Name', 'COMMON', 'Common', 'New COURSE', 'New Course']);
        const courseType = getValue(row, ['courseType', 'Course Type', 'TYPE', 'Type', 'COURSE', 'Course', 'Tyoe']);
        const studentStatus = getValue(row, ['studentStatus', 'Student Status', 'STATUS', 'Status']);
        const batchTiming = getValue(row, ['batchTiming', 'Batch Timing', 'TIME', 'Time', 'TIME COMMITMENT', 'Time Commitment']);

        // Extract from first and second software fields
        if (firstSoftwareName && !softwareList.includes(firstSoftwareName.trim())) {
          softwareList.push(firstSoftwareName.trim());
        }
        if (secondSoftwareName && !softwareList.includes(secondSoftwareName.trim())) {
          softwareList.push(secondSoftwareName.trim());
        }

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

        // Process new software status columns (SOFTWARE_PHOTOSHOP_STATUS, SOFTWARE_ILLUSTRATOR_STATUS, etc.)
        // Use the same softwareStatusColumns defined earlier (around line 1887) to avoid duplication
        for (const statusColumn of softwareStatusColumns) {
          const statusValue = row[statusColumn];
          if (statusValue && (statusValue === 'Pending' || statusValue === 'In Progress' || statusValue === 'Finished' || statusValue === 'XX' || statusValue === 'IP' || statusValue === 'NO')) {
            // Extract software name from the column name (e.g., SOFTWARE_PHOTOSHOP_STATUS -> Photoshop)
            const softwareNameMatch = statusColumn.match(/^SOFTWARE_(.+)_STATUS$/);
            if (softwareNameMatch) {
              const softwareName = softwareNameMatch[1]
                .replace(/_/g, ' ')
                .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
              
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
        const dobValue = getColumnValue(row, ['dob', 'DOB', 'dateOfBirth', 'Date of Birth', 'date_of_birth', 'DateOfBirth']);
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
    logger.info('Download enhanced unified template request received');
    
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

    logger.info('Creating enhanced unified Excel template with software status tracking...');

    // Create enhanced sample data with individual software status tracking
    const sampleData = [
      {
        // ========== COMPULSORY BASIC INFORMATION ==========
        DATE: '15/01/2024',              // COMPULSORY: Date of admission (DD/MM/YYYY)
        NAME: 'John Doe',                // COMPULSORY: Student name
        NUMBER: '9876543210',            // COMPULSORY: Phone number
        EMAIL: 'john.doe@example.com',   // COMPULSORY: Email address
        WHATSAPP_NUMBER: '9876543210',   // COMPULSORY: WhatsApp number

        // ========== PERSONAL INFORMATION (Some Compulsory) ==========
        DOB: '20/05/1995',               // OPTIONAL: Date of birth (DD/MM/YYYY)
        LOCAL_ADDRESS: '123 Main St, City, State',     // COMPULSORY: Local address
        PERMANENT_ADDRESS: '123 Main St, City, State', // COMPULSORY: Permanent address

        // ========== COMPULSORY EMERGENCY CONTACT ==========
        EMERGENCY_CONTACT_NUMBER: '9876543211',  // COMPULSORY: Emergency contact number
        EMERGENCY_CONTACT_NAME: 'Jane Doe',       // COMPULSORY: Emergency contact name
        EMERGENCY_RELATION: 'Mother',             // COMPULSORY: Relationship

        // ========== ENROLLMENT INFORMATION ==========
        COURSE_NAME: 'Graphic Design',            // OPTIONAL: Course name
        SOFTWARES_INCLUDED: 'Photoshop, Illustrator, InDesign, After Effects', // OPTIONAL: Comma-separated software list
        ENROLLMENT_TYPE: 'Course',               // OPTIONAL: Course or Individual software

        // ========== COMPULSORY PAYMENT INFORMATION ==========
        PAYMENT_MODE: 'Cash',                    // COMPULSORY: Cash, Online, Cheque, NEFT, RTGS, UPI
        PAYMENT_DATE: '15/01/2024',             // COMPULSORY: Date of payment (DD/MM/YYYY)
        BOOKING_AMOUNT: 10000,                  // COMPULSORY: Initial booking amount paid
        TOTAL_DEAL: 50000,                      // COMPULSORY: Total deal amount
        BALANCE_AMOUNT: 40000,                  // COMPULSORY: Balance amount
        PAYMENT_STATUS: 'Partial Paid',         // COMPULSORY: Unpaid, Partial Paid, Fully Paid
        RECEIPT_NUMBER: 'REC001',               // OPTIONAL: Receipt number

        // ========== SOFTWARE STATUS TRACKING (24+ Software) ==========
        SOFTWARE_PHOTOSHOP_STATUS: 'In Progress',     // Pending/In Progress/Finished
        SOFTWARE_ILLUSTRATOR_STATUS: 'Pending',       // Pending/In Progress/Finished
        SOFTWARE_INDESIGN_STATUS: 'Finished',         // Pending/In Progress/Finished
        SOFTWARE_AFTEREFFECTS_STATUS: 'Pending',      // Pending/In Progress/Finished
        SOFTWARE_PREMIEREPRO_STATUS: 'Pending',       // Pending/In Progress/Finished
        SOFTWARE_ANIMATECC_STATUS: 'Pending',         // Pending/In Progress/Finished
        SOFTWARE_FIGMA_STATUS: 'Pending',             // Pending/In Progress/Finished
        SOFTWARE_XD_STATUS: 'Pending',                // Pending/In Progress/Finished
        SOFTWARE_COREL_STATUS: 'Pending',             // Pending/In Progress/Finished
        SOFTWARE_AUTOCAD_STATUS: 'Pending',            // Pending/In Progress/Finished
        SOFTWARE_3DSMAX_STATUS: 'Pending',            // Pending/In Progress/Finished
        SOFTWARE_MAYA_STATUS: 'Pending',              // Pending/In Progress/Finished
        SOFTWARE_BLENDER_STATUS: 'Pending',           // Pending/In Progress/Finished
        SOFTWARE_UNREAL_STATUS: 'Pending',            // Pending/In Progress/Finished
        SOFTWARE_CINEMA4D_STATUS: 'Pending',           // Pending/In Progress/Finished
        SOFTWARE_HOUDINI_STATUS: 'Pending',            // Pending/In Progress/Finished
        SOFTWARE_ZBRUSH_STATUS: 'Pending',             // Pending/In Progress/Finished
        SOFTWARE_SUBSTANCEPAINTER_STATUS: 'Pending',  // Pending/In Progress/Finished
        SOFTWARE_FUSION_STATUS: 'Pending',            // Pending/In Progress/Finished
        SOFTWARE_NUKE_STATUS: 'Pending',              // Pending/In Progress/Finished
        SOFTWARE_DAVINCIRESOLVE_STATUS: 'Pending',    // Pending/In Progress/Finished
        SOFTWARE_SKETCHUP_STATUS: 'Pending',           // Pending/In Progress/Finished
        SOFTWARE_LUMION_STATUS: 'Pending',             // Pending/In Progress/Finished
        SOFTWARE_VUE_STATUS: 'Pending',                // Pending/In Progress/Finished

        // ========== SCHEDULE INFORMATION ==========
        SCHEDULE_TYPE: 'MWF',                   // OPTIONAL: MWF or TTS
        START_TIME: '7:00 AM',                  // OPTIONAL: Start time
        END_TIME: '9:00 AM',                    // OPTIONAL: End time
        CLASS_DAYS: 'Mon, Wed, Fri',            // OPTIONAL: Class days
        BATCH_NAME: 'Morning Batch 1',          // OPTIONAL: Batch name

        // ========== ADDITIONAL INFORMATION ==========
        COMPLIMENTARY_SOFTWARE: 'Adobe Creative Cloud, Figma, XD', // OPTIONAL: Complimentary software package
        INDIVIDUAL_COMPLIMENTARY_SOFTWARE: 'Figma, XD, CorelDRAW', // OPTIONAL: Individual complimentary software list
        COMPLIMENTARY_GIFT: 'Mouse Pad, Notebook',         // OPTIONAL: Complimentary gift
        HAS_REFERENCE: 'Yes',                    // OPTIONAL: Has reference (Yes/No)
        REFERENCE_DETAILS: 'Referred by friend', // OPTIONAL: Reference details
        COUNSELOR_NAME: 'Sarah Smith',           // COMPULSORY: Counselor name
        LEAD_SOURCE: 'Walk-in',                  // COMPULSORY: Lead source
        WALKIN_DATE: '10/01/2024',              // OPTIONAL: Walk-in date (DD/MM/YYYY)
        MASTER_FACULTY: 'Dr. John Smith',        // COMPULSORY: Master faculty
        STUDENT_STATUS: 'Active',                // OPTIONAL: Student status
      },
      {
        // Second example row with different software status
        DATE: '01/02/2024',                     // COMPULSORY: Date of admission (DD/MM/YYYY)
        NAME: 'Jane Smith',                      // COMPULSORY: Student name
        NUMBER: '9876543211',                   // COMPULSORY: Phone number
        EMAIL: 'jane.smith@example.com',        // COMPULSORY: Email address
        WHATSAPP_NUMBER: '9876543211',          // COMPULSORY: WhatsApp number

        // ========== PERSONAL INFORMATION ==========
        DOB: '15/06/1996',                      // OPTIONAL: Date of birth (DD/MM/YYYY)
        LOCAL_ADDRESS: '456 Oak Ave, City, State',    // COMPULSORY: Local address
        PERMANENT_ADDRESS: '456 Oak Ave, City, State',// COMPULSORY: Permanent address

        // ========== COMPULSORY EMERGENCY CONTACT ==========
        EMERGENCY_CONTACT_NUMBER: '9876543212', // COMPULSORY: Emergency contact number
        EMERGENCY_CONTACT_NAME: 'John Smith',    // COMPULSORY: Emergency contact name
        EMERGENCY_RELATION: 'Father',            // COMPULSORY: Relationship

        // ========== ENROLLMENT INFORMATION ==========
        COURSE_NAME: 'Video Editing',            // OPTIONAL: Course name
        SOFTWARES_INCLUDED: 'After Effects, Premiere Pro, Photoshop', // OPTIONAL: Comma-separated software list
        ENROLLMENT_TYPE: 'Individual',           // OPTIONAL: Course or Individual software

        // ========== COMPULSORY PAYMENT INFORMATION ==========
        PAYMENT_MODE: 'Online',                  // COMPULSORY: Cash, Online, Cheque, NEFT, RTGS, UPI
        PAYMENT_DATE: '01/02/2024',             // COMPULSORY: Date of payment (DD/MM/YYYY)
        BOOKING_AMOUNT: 15000,                  // COMPULSORY: Initial booking amount paid
        TOTAL_DEAL: 60000,                      // COMPULSORY: Total deal amount
        BALANCE_AMOUNT: 45000,                  // COMPULSORY: Balance amount
        PAYMENT_STATUS: 'Partial Paid',         // COMPULSORY: Unpaid, Partial Paid, Fully Paid
        RECEIPT_NUMBER: 'REC002',               // OPTIONAL: Receipt number

        // ========== SOFTWARE STATUS TRACKING (24+ Software) ==========
        SOFTWARE_PHOTOSHOP_STATUS: 'Finished',       // Pending/In Progress/Finished
        SOFTWARE_ILLUSTRATOR_STATUS: 'In Progress',   // Pending/In Progress/Finished
        SOFTWARE_INDESIGN_STATUS: 'Pending',          // Pending/In Progress/Finished
        SOFTWARE_AFTEREFFECTS_STATUS: 'In Progress',   // Pending/In Progress/Finished
        SOFTWARE_PREMIEREPRO_STATUS: 'In Progress',    // Pending/In Progress/Finished
        SOFTWARE_ANIMATECC_STATUS: 'Pending',          // Pending/In Progress/Finished
        SOFTWARE_FIGMA_STATUS: 'Pending',              // Pending/In Progress/Finished
        SOFTWARE_XD_STATUS: 'Pending',                 // Pending/In Progress/Finished
        SOFTWARE_COREL_STATUS: 'Pending',              // Pending/In Progress/Finished
        SOFTWARE_AUTOCAD_STATUS: 'Pending',             // Pending/In Progress/Finished
        SOFTWARE_3DSMAX_STATUS: 'Pending',             // Pending/In Progress/Finished
        SOFTWARE_MAYA_STATUS: 'Pending',               // Pending/In Progress/Finished
        SOFTWARE_BLENDER_STATUS: 'Pending',            // Pending/In Progress/Finished
        SOFTWARE_UNREAL_STATUS: 'Pending',             // Pending/In Progress/Finished
        SOFTWARE_CINEMA4D_STATUS: 'Pending',            // Pending/In Progress/Finished
        SOFTWARE_HOUDINI_STATUS: 'Pending',             // Pending/In Progress/Finished
        SOFTWARE_ZBRUSH_STATUS: 'Pending',              // Pending/In Progress/Finished
        SOFTWARE_SUBSTANCEPAINTER_STATUS: 'Pending',   // Pending/In Progress/Finished
        SOFTWARE_FUSION_STATUS: 'Pending',              // Pending/In Progress/Finished
        SOFTWARE_NUKE_STATUS: 'Pending',                // Pending/In Progress/Finished
        SOFTWARE_DAVINCIRESOLVE_STATUS: 'In Progress', // Pending/In Progress/Finished
        SOFTWARE_SKETCHUP_STATUS: 'Pending',            // Pending/In Progress/Finished
        SOFTWARE_LUMION_STATUS: 'Pending',              // Pending/In Progress/Finished
        SOFTWARE_VUE_STATUS: 'Pending',                 // Pending/In Progress/Finished

        // ========== SCHEDULE INFORMATION ==========
        SCHEDULE_TYPE: 'TTS',                    // OPTIONAL: MWF or TTS
        START_TIME: '8:00 AM',                   // OPTIONAL: Start time
        END_TIME: '12:00 PM',                   // OPTIONAL: End time
        CLASS_DAYS: 'Tue, Thu, Sat',            // OPTIONAL: Class days
        BATCH_NAME: 'Daytime Batch 2',          // OPTIONAL: Batch name

        // ========== ADDITIONAL INFORMATION ==========
        COMPLIMENTARY_SOFTWARE: 'Adobe Suite, Blender', // OPTIONAL: Complimentary software package
        INDIVIDUAL_COMPLIMENTARY_SOFTWARE: 'Blender, Maya, ZBrush', // OPTIONAL: Individual complimentary software list
        COMPLIMENTARY_GIFT: 'Graphics Tablet, Stylus',   // OPTIONAL: Complimentary gift
        HAS_REFERENCE: 'No',                     // OPTIONAL: Has reference
        REFERENCE_DETAILS: '',                   // OPTIONAL: Reference details
        COUNSELOR_NAME: 'Mike Johnson',          // COMPULSORY: Counselor name
        LEAD_SOURCE: 'Online',                   // COMPULSORY: Lead source
        WALKIN_DATE: '25/01/2024',              // OPTIONAL: Walk-in date (DD/MM/YYYY)
        MASTER_FACULTY: 'Dr. Brown',             // COMPULSORY: Master faculty
        STUDENT_STATUS: 'Active',                // OPTIONAL: Student status
      },
    ];

    // Create workbook
    logger.info('Creating enhanced workbook with color coding...');
    const workbook = XLSX.utils.book_new();
    
    // Define column order with software status columns
    const columnOrder = [
      // ========== COMPULSORY BASIC INFORMATION ==========
      'DATE', 'NAME', 'NUMBER', 'EMAIL', 'WHATSAPP_NUMBER',
      
      // ========== PERSONAL INFORMATION (Some Compulsory) ==========
      'DOB', 'LOCAL_ADDRESS', 'PERMANENT_ADDRESS',
      
      // ========== COMPULSORY EMERGENCY CONTACT ==========
      'EMERGENCY_CONTACT_NUMBER', 'EMERGENCY_CONTACT_NAME', 'EMERGENCY_RELATION',
      
      // ========== ENROLLMENT INFORMATION ==========
      'COURSE_NAME', 'SOFTWARES_INCLUDED', 'ENROLLMENT_TYPE',
      
      // ========== COMPULSORY PAYMENT INFORMATION ==========
      'PAYMENT_MODE', 'PAYMENT_DATE', 'BOOKING_AMOUNT', 'TOTAL_DEAL', 'BALANCE_AMOUNT', 'PAYMENT_STATUS', 'RECEIPT_NUMBER',
      
      // ========== SOFTWARE STATUS TRACKING (24+ Software) ==========
      'SOFTWARE_PHOTOSHOP_STATUS', 'SOFTWARE_ILLUSTRATOR_STATUS', 'SOFTWARE_INDESIGN_STATUS',
      'SOFTWARE_AFTEREFFECTS_STATUS', 'SOFTWARE_PREMIEREPRO_STATUS', 'SOFTWARE_ANIMATECC_STATUS',
      'SOFTWARE_FIGMA_STATUS', 'SOFTWARE_XD_STATUS', 'SOFTWARE_COREL_STATUS', 'SOFTWARE_AUTOCAD_STATUS',
      'SOFTWARE_3DSMAX_STATUS', 'SOFTWARE_MAYA_STATUS', 'SOFTWARE_BLENDER_STATUS', 'SOFTWARE_UNREAL_STATUS',
      'SOFTWARE_CINEMA4D_STATUS', 'SOFTWARE_HOUDINI_STATUS', 'SOFTWARE_ZBRUSH_STATUS', 'SOFTWARE_SUBSTANCEPAINTER_STATUS',
      'SOFTWARE_FUSION_STATUS', 'SOFTWARE_NUKE_STATUS', 'SOFTWARE_DAVINCIRESOLVE_STATUS', 'SOFTWARE_SKETCHUP_STATUS',
      'SOFTWARE_LUMION_STATUS', 'SOFTWARE_VUE_STATUS',
      
      // ========== SCHEDULE INFORMATION ==========
      'SCHEDULE_TYPE', 'START_TIME', 'END_TIME', 'CLASS_DAYS', 'BATCH_NAME',
      
      // ========== ADDITIONAL INFORMATION ==========
      'COMPLIMENTARY_SOFTWARE', 'INDIVIDUAL_COMPLIMENTARY_SOFTWARE', 'COMPLIMENTARY_GIFT', 'HAS_REFERENCE', 'REFERENCE_DETAILS',
      'COUNSELOR_NAME', 'LEAD_SOURCE', 'WALKIN_DATE', 'MASTER_FACULTY', 'STUDENT_STATUS',
    ];
    
    // Create worksheet with explicit column order
    const worksheet: any = {};
    
    // Set headers in correct order (row 0)
    columnOrder.forEach((colName, idx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: idx });
      worksheet[cellAddress] = { t: 's', v: colName };
    });

    // Copy data rows in correct column order
    for (let rowIdx = 0; rowIdx < sampleData.length; rowIdx++) {
      columnOrder.forEach((colName, colIdx) => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
        const value = (sampleData[rowIdx] as any)?.[colName];
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
    
    // Set worksheet range
    worksheet['!ref'] = XLSX.utils.encode_range({ 
      s: { r: 0, c: 0 }, 
      e: { r: sampleData.length, c: columnOrder.length - 1 } 
    });
    
    logger.info(`Enhanced worksheet created. Range: ${worksheet['!ref']}, Total columns: ${columnOrder.length}`);
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 12 }, // DATE
      { wch: 20 }, // NAME
      { wch: 15 }, // NUMBER
      { wch: 25 }, // EMAIL
      { wch: 15 }, // WHATSAPP_NUMBER
      { wch: 12 }, // DOB
      { wch: 30 }, // LOCAL_ADDRESS
      { wch: 30 }, // PERMANENT_ADDRESS
      { wch: 18 }, // EMERGENCY_CONTACT_NUMBER
      { wch: 20 }, // EMERGENCY_CONTACT_NAME
      { wch: 15 }, // EMERGENCY_RELATION
      { wch: 20 }, // COURSE_NAME
      { wch: 30 }, // SOFTWARES_INCLUDED
      { wch: 15 }, // ENROLLMENT_TYPE
      { wch: 12 }, // PAYMENT_MODE
      { wch: 12 }, // PAYMENT_DATE
      { wch: 12 }, // BOOKING_AMOUNT
      { wch: 12 }, // TOTAL_DEAL
      { wch: 12 }, // BALANCE_AMOUNT
      { wch: 15 }, // PAYMENT_STATUS
      { wch: 12 }, // RECEIPT_NUMBER
      
      // Software Status Columns (24 columns)
      { wch: 20 }, // SOFTWARE_PHOTOSHOP_STATUS
      { wch: 22 }, // SOFTWARE_ILLUSTRATOR_STATUS
      { wch: 20 }, // SOFTWARE_INDESIGN_STATUS
      { wch: 24 }, // SOFTWARE_AFTEREFFECTS_STATUS
      { wch: 22 }, // SOFTWARE_PREMIEREPRO_STATUS
      { wch: 20 }, // SOFTWARE_ANIMATECC_STATUS
      { wch: 15 }, // SOFTWARE_FIGMA_STATUS
      { wch: 12 }, // SOFTWARE_XD_STATUS
      { wch: 15 }, // SOFTWARE_COREL_STATUS
      { wch: 17 }, // SOFTWARE_AUTOCAD_STATUS
      { wch: 17 }, // SOFTWARE_3DSMAX_STATUS
      { wch: 14 }, // SOFTWARE_MAYA_STATUS
      { wch: 17 }, // SOFTWARE_BLENDER_STATUS
      { wch: 16 }, // SOFTWARE_UNREAL_STATUS
      { wch: 18 }, // SOFTWARE_CINEMA4D_STATUS
      { wch: 18 }, // SOFTWARE_HOUDINI_STATUS
      { wch: 17 }, // SOFTWARE_ZBRUSH_STATUS
      { wch: 26 }, // SOFTWARE_SUBSTANCEPAINTER_STATUS
      { wch: 16 }, // SOFTWARE_FUSION_STATUS
      { wch: 14 }, // SOFTWARE_NUKE_STATUS
      { wch: 26 }, // SOFTWARE_DAVINCIRESOLVE_STATUS
      { wch: 19 }, // SOFTWARE_SKETCHUP_STATUS
      { wch: 16 }, // SOFTWARE_LUMION_STATUS
      { wch: 13 }, // SOFTWARE_VUE_STATUS
      
      // Schedule Information
      { wch: 12 }, // SCHEDULE_TYPE
      { wch: 12 }, // START_TIME
      { wch: 12 }, // END_TIME
      { wch: 15 }, // CLASS_DAYS
      { wch: 15 }, // BATCH_NAME
      
      // Additional Information
      { wch: 25 }, // COMPLIMENTARY_SOFTWARE
      { wch: 30 }, // INDIVIDUAL_COMPLIMENTARY_SOFTWARE
      { wch: 20 }, // COMPLIMENTARY_GIFT
      { wch: 10 }, // HAS_REFERENCE
      { wch: 25 }, // REFERENCE_DETAILS
      { wch: 20 }, // COUNSELOR_NAME
      { wch: 15 }, // LEAD_SOURCE
      { wch: 12 }, // WALKIN_DATE
      { wch: 20 }, // MASTER_FACULTY
      { wch: 12 }, // STUDENT_STATUS
    ];
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Data');

    // Generate buffer
    logger.info('Generating enhanced buffer...');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    logger.info(`Enhanced buffer generated, size: ${buffer.length} bytes`);

    // Set headers BEFORE sending response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=enhanced_student_template_with_software_status.xlsx');
    res.setHeader('Content-Length', buffer.length.toString());

    // Send file
    logger.info('Sending enhanced template file...');
    res.send(buffer);
    logger.info('Enhanced template sent successfully');
  } catch (error: any) {
    logger.error('Download enhanced template error:', error);
    logger.error('Download enhanced template error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Make sure to clear any headers that were set for file download
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        status: 'error',
        message: 'Internal server error while generating enhanced template',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    } else {
      logger.error('Headers already sent, cannot send error response');
    }
  }
};
// PUT /students/:id/profile - Update student profile including schedule
export const updateStudentProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student ID',
      });
      return;
    }

    // Check if user has permission to update this student
    const student = await db.User.findByPk(studentId);
    if (!student) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    // Only admin/superadmin can update student profile
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Permission denied',
      });
      return;
    }

    const { schedule, email, phone } = req.body;

    // Check if email or phone is being updated and validate for duplicates
    if (email !== undefined || phone !== undefined) {
      // Get the current user to compare with new values
      const currentUser = await db.User.findByPk(studentId);
      if (!currentUser) {
        res.status(404).json({
          status: 'error',
          message: 'Student not found',
        });
        return;
      }
      
      const newEmail = email !== undefined ? email : currentUser.email;
      const newPhone = phone !== undefined ? phone : currentUser.phone;
      
      const duplicateCheck = await checkDuplicateEmailOrPhone(
        newEmail,
        newPhone,
        studentId // Exclude current user from duplicate check
      );
      
      if (duplicateCheck.isDuplicate && duplicateCheck.existingUser && duplicateCheck.duplicateFields) {
        const conflictFields = duplicateCheck.duplicateFields.join(' and ');
        res.status(409).json({
          status: 'error',
          message: `A user with this ${conflictFields} already exists.`,
          existingUser: {
            id: duplicateCheck.existingUser.id,
            name: duplicateCheck.existingUser.name,
            email: duplicateCheck.existingUser.email,
            phone: duplicateCheck.existingUser.phone,
            role: duplicateCheck.existingUser.role,
          },
          conflictFields: duplicateCheck.duplicateFields,
        });
        return;
      }
      
      // Update the user's email and phone if they are provided
      if (email !== undefined) {
        currentUser.email = email;
      }
      if (phone !== undefined) {
        currentUser.phone = phone;
      }
      
      await currentUser.save();
    }

    // Find or create student profile
    let studentProfile = await db.StudentProfile.findOne({
      where: { userId: studentId },
    });

    if (!studentProfile) {
      // Create profile if it doesn't exist
      studentProfile = await db.StudentProfile.create({
        userId: studentId,
        schedule: schedule || null,
      });
    } else {
      // Update existing profile
      await studentProfile.update({
        schedule: schedule || null,
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Student profile updated successfully',
      data: {
        studentId,
        schedule: studentProfile.schedule,
      },
    });
  } catch (error: any) {
    logger.error('Update student profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


// GET /students/check-duplicate → Check for duplicate email or phone
export const checkDuplicate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { email, phone, excludeStudentId } = req.query;
    
    // Validation
    if (!email && !phone) {
      res.status(400).json({
        status: 'error',
        message: 'Either email or phone number is required',
      });
      return;
    }

    const emailStr = email ? String(email).trim().toLowerCase() : null;
    const phoneStr = phone ? String(phone).trim() : null;
    
    // Normalize phone number (remove all non-digit characters)
    const normalizedPhone = phoneStr ? phoneStr.replace(/\D/g, '') : null;
    
    // Build query conditions
    const whereConditions: any[] = [];
    
    if (emailStr) {
      // Case-insensitive email check using LOWER function
      whereConditions.push(db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('email')),
        emailStr
      ));
    }
    
    if (normalizedPhone && normalizedPhone.length >= 10) {
      // Phone check using REPLACE to remove non-digits
      whereConditions.push(db.sequelize.where(
        db.sequelize.fn('REPLACE', 
          db.sequelize.fn('REPLACE', 
            db.sequelize.fn('REPLACE', 
              db.sequelize.fn('REPLACE', db.sequelize.col('phone'), '-', ''), 
              ' ', ''), 
            '+', ''), 
          ')', ''),
        normalizedPhone
      ));
    }
    
    // Exclude current student if editing
    if (excludeStudentId) {
      whereConditions.push({ id: { [Op.ne]: Number(excludeStudentId) } });
    }
    
    // Combine conditions with OR for email/phone, AND for exclusion
    let finalWhere;
    if (whereConditions.length === 1) {
      finalWhere = whereConditions[0];
    } else if (whereConditions.length === 2) {
      // Email OR Phone condition
      finalWhere = {
        [Op.or]: [whereConditions[0], whereConditions[1]]
      };
    } else if (whereConditions.length === 3) {
      // Email OR Phone AND NOT excludeStudentId
      finalWhere = {
        [Op.and]: [
          {
            [Op.or]: [whereConditions[0], whereConditions[1]]
          },
          whereConditions[2]
        ]
      };
    }
    
    // Query database
    const existingStudent = await db.User.findOne({
      where: finalWhere,
      attributes: ['id', 'name', 'email', 'phone'],
    });
    
    if (existingStudent) {
      let conflictMessage = '';
      let conflictType = '';
      
      // Determine which field caused the conflict
      const existingEmail = existingStudent.email ? existingStudent.email.toLowerCase() : '';
      const existingPhone = existingStudent.phone ? existingStudent.phone.replace(/\D/g, '') : '';
      
      if (emailStr && existingEmail === emailStr) {
        conflictType = 'email';
        conflictMessage = `A student with email "${email}" already exists.`;
      } else if (normalizedPhone && existingPhone === normalizedPhone) {
        conflictType = 'phone';
        conflictMessage = `A student with phone number "${phone}" already exists.`;
      } else if (emailStr && normalizedPhone && existingEmail === emailStr && existingPhone === normalizedPhone) {
        conflictType = 'both';
        conflictMessage = `A student with both email "${email}" and phone number "${phone}" already exists.`;
      }
      
      res.status(409).json({
        status: 'error',
        message: conflictMessage,
        conflictType: conflictType,
        existingStudentId: existingStudent.id,
        existingStudentName: existingStudent.name,
      });
      return;
    }
    
    // No duplicates found
    res.status(200).json({
      status: 'success',
      message: 'No duplicates found',
      isDuplicate: false,
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

/**
 * Approve corrected balance amount and update payment transaction
 */
export const approveCorrectedBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const { correctedBalance } = req.body;

    if (!correctedBalance || correctedBalance <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid corrected balance amount',
      });
      return;
    }

    await db.sequelize.transaction(async (transaction) => {
      // Get the student's enrollment metadata
      const studentProfile = await db.StudentProfile.findOne({
        where: { userId: studentId },
        transaction,
      });

      if (!studentProfile) {
        throw new Error('Student profile not found');
      }

      // documents can be object or JSON string depending on DB dialect/config
      let documents: any = studentProfile.documents || {};
      if (typeof documents === 'string') {
        try {
          documents = JSON.parse(documents);
        } catch {
          documents = {};
        }
      }
      const enrollmentMetadata: any = documents.enrollmentMetadata || (documents.enrollmentMetadata = {});

      if (!enrollmentMetadata.hasPaymentMismatch) {
        throw new Error('No payment mismatch flagged for this student');
      }

      // Update the balance amount to the corrected value
      enrollmentMetadata.balanceAmount = correctedBalance;
      enrollmentMetadata.hasPaymentMismatch = false;
      enrollmentMetadata.paymentMismatchResolved = true;
      enrollmentMetadata.paymentMismatchResolvedAt = new Date().toISOString();
      enrollmentMetadata.approvedBy = req.user?.userId;

      studentProfile.documents = documents;
      await studentProfile.save({ transaction });

      // Update or create the payment transaction with the corrected amount
      const existingPayment = await db.PaymentTransaction.findOne({
        where: {
          studentId,
          notes: { [Op.like]: '%Balance payment from Excel import%' },
        },
        transaction,
      });

      if (existingPayment) {
        existingPayment.amount = correctedBalance;
        existingPayment.notes = `Balance payment from Excel import (APPROVED) - Total Deal: ${enrollmentMetadata.totalDeal || 0}, Corrected by: ${req.user?.email}`;
        await existingPayment.save({ transaction });

        logger.info(
          `✅ Approved corrected balance for student ${studentId}: ${correctedBalance} (was: ${enrollmentMetadata.originalBalanceAmount || 'N/A'})`
        );
      } else {
        // Create new payment transaction if it doesn't exist
        const enrollment = await db.Enrollment.findOne({
          where: { studentId },
          transaction,
        });

        await db.PaymentTransaction.create(
          {
            studentId,
            enrollmentId: enrollment?.id || null,
            amount: correctedBalance,
            dueDate: enrollmentMetadata.emiPlanDate ? new Date(enrollmentMetadata.emiPlanDate) : new Date(),
            status: enrollmentMetadata.emiPlan ? PaymentStatus.PENDING : PaymentStatus.UNPAID,
            notes: `Balance payment from Excel import (APPROVED) - Total Deal: ${enrollmentMetadata.totalDeal || 0}, Corrected by: ${req.user?.email}`,
          },
          { transaction }
        );
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Corrected balance amount approved and payment updated successfully',
    });
  } catch (error: any) {
    logger.error('Approve corrected balance error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Reject corrected balance (keep original amount)
 */
export const rejectCorrectedBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const { keepOriginal, originalBalance } = req.body;

    await db.sequelize.transaction(async (transaction) => {
      // Get the student's enrollment metadata
      const studentProfile = await db.StudentProfile.findOne({
        where: { userId: studentId },
        transaction,
      });

      if (!studentProfile) {
        throw new Error('Student profile not found');
      }

      let documents: any = studentProfile.documents || {};
      if (typeof documents === 'string') {
        try {
          documents = JSON.parse(documents);
        } catch {
          documents = {};
        }
      }
      const enrollmentMetadata: any = documents.enrollmentMetadata || (documents.enrollmentMetadata = {});

      if (!enrollmentMetadata.hasPaymentMismatch) {
        throw new Error('No payment mismatch flagged for this student');
      }

      // Mark mismatch as resolved, keeping original amount
      enrollmentMetadata.hasPaymentMismatch = false;
      enrollmentMetadata.paymentMismatchResolved = true;
      enrollmentMetadata.paymentMismatchResolvedAt = new Date().toISOString();
      enrollmentMetadata.rejectedBy = req.user?.userId;
      enrollmentMetadata.keptOriginalAmount = keepOriginal !== false;

      studentProfile.documents = documents;
      await studentProfile.save({ transaction });

      // Update the payment transaction notes to reflect rejection
      const existingPayment = await db.PaymentTransaction.findOne({
        where: {
          studentId,
          notes: { [Op.like]: '%Balance payment from Excel import%' },
        },
        transaction,
      });

      if (existingPayment) {
        existingPayment.notes = `Balance payment from Excel import (REJECTED CORRECTION) - Total Deal: ${enrollmentMetadata.totalDeal || 0}, Kept original: ${originalBalance || enrollmentMetadata.balanceAmount}, Rejected by: ${req.user?.email}`;
        await existingPayment.save({ transaction });

        logger.info(
          `❌ Rejected correction for student ${studentId}: Kept original balance ${originalBalance || enrollmentMetadata.balanceAmount}`
        );
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Original balance amount retained',
    });
  } catch (error: any) {
    logger.error('Reject corrected balance error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
};

