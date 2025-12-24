import { Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { BatchMode } from '../models/Batch';
import { UserRole } from '../models/User';
import { PaymentStatus } from '../models/PaymentTransaction';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

// POST /batches → Create batch (admin only)
export const createBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { title, software, mode, startDate, endDate, maxCapacity, schedule, status, facultyIds, studentIds, exceptionStudentIds, courseId } =
      req.body;

    // Validation - All fields required
    if (!title || !title.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Title is required',
      });
      return;
    }

    if (!software || !software.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Software is required',
      });
      return;
    }

    if (!mode) {
      res.status(400).json({
        status: 'error',
        message: 'Mode is required',
      });
      return;
    }

    if (!startDate) {
      res.status(400).json({
        status: 'error',
        message: 'Start date is required',
      });
      return;
    }

    if (!endDate) {
      res.status(400).json({
        status: 'error',
        message: 'End date is required',
      });
      return;
    }

    if (!maxCapacity) {
      res.status(400).json({
        status: 'error',
        message: 'Max capacity is required',
      });
      return;
    }

    // Validate status - required
    if (!status || !status.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Status is required',
      });
      return;
    }
    
    const batchStatus = status.trim();

    // Validate mode
    if (!Object.values(BatchMode).includes(mode)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid mode. Allowed values: ${Object.values(BatchMode).join(', ')}`,
      });
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid date format',
      });
      return;
    }

    if (start >= end) {
      res.status(400).json({
        status: 'error',
        message: 'Start date must be before end date',
      });
      return;
    }

    if (maxCapacity < 1) {
      res.status(400).json({
        status: 'error',
        message: 'Max capacity must be at least 1',
      });
      return;
    }

    // Validate faculty IDs - REQUIRED
    logger.info(`Create batch request - facultyIds received: ${JSON.stringify(facultyIds)}, type: ${typeof facultyIds}, isArray: ${Array.isArray(facultyIds)}`);
    
    if (!facultyIds || !Array.isArray(facultyIds) || facultyIds.length === 0) {
      logger.warn(`Create batch failed - no faculty IDs provided or invalid format`);
      res.status(400).json({
        status: 'error',
        message: 'At least one faculty member must be assigned to the batch',
      });
      return;
    }

    let normalizedFacultyIds = facultyIds
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id) && id > 0);
    
    logger.info(`Create batch - normalized faculty IDs: ${normalizedFacultyIds.join(', ')}`);
    
    if (normalizedFacultyIds.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'At least one valid faculty member must be assigned to the batch',
      });
      return;
    }

    const uniqueFacultyIds = Array.from(new Set(normalizedFacultyIds));
    logger.info(`Create batch - unique faculty IDs: ${uniqueFacultyIds.join(', ')}`);
    
    const facultyMembers = await db.User.findAll({
      where: {
        id: uniqueFacultyIds,
        role: UserRole.FACULTY,
        isActive: true,
      },
      attributes: ['id'],
    });

    if (facultyMembers.length !== uniqueFacultyIds.length) {
      const foundIds = new Set(facultyMembers.map((f) => f.id));
      const missingIds = uniqueFacultyIds.filter((id) => !foundIds.has(id));
      res.status(400).json({
        status: 'error',
        message: `Invalid or inactive faculty IDs: ${missingIds.join(', ')}`,
      });
      return;
    }
    normalizedFacultyIds = uniqueFacultyIds;

    // Validate students if provided
    let normalizedStudentIds: number[] = [];
    if (studentIds !== undefined) {
      if (!Array.isArray(studentIds)) {
        res.status(400).json({
          status: 'error',
          message: 'studentIds must be an array of student IDs',
        });
        return;
      }

      normalizedStudentIds = studentIds
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id) && id > 0);

      if (normalizedStudentIds.length > 0) {
        const uniqueStudentIds = Array.from(new Set(normalizedStudentIds));
        const students = await db.User.findAll({
          where: {
            id: uniqueStudentIds,
            role: UserRole.STUDENT,
            isActive: true,
          },
          attributes: ['id'],
        });

        if (students.length !== uniqueStudentIds.length) {
          const foundIds = new Set(students.map((s) => s.id));
          const missingIds = uniqueStudentIds.filter((id) => !foundIds.has(id));
          res.status(400).json({
            status: 'error',
            message: `Invalid or inactive student IDs: ${missingIds.join(', ')}`,
          });
          return;
        }

        normalizedStudentIds = uniqueStudentIds;
      }
    }

    // Validate courseId if provided
    if (courseId !== undefined && courseId !== null && courseId !== '') {
      const courseIdNum = Number(courseId);
      if (isNaN(courseIdNum) || courseIdNum <= 0) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid course ID',
        });
        return;
      }
      
      // Check if Course model exists
      if (!db.Course) {
        logger.error('Course model not found in db object');
        res.status(500).json({
          status: 'error',
          message: 'Course model not available',
        });
        return;
      }
      
      const course = await db.Course.findByPk(courseIdNum);
      if (!course) {
        res.status(400).json({
          status: 'error',
          message: `Course with ID ${courseIdNum} not found`,
        });
        return;
      }
    }

    // Validate that BatchFacultyAssignment model exists
    if (!db.BatchFacultyAssignment) {
      logger.error('BatchFacultyAssignment model not found in db object');
      res.status(500).json({
        status: 'error',
        message: 'BatchFacultyAssignment model not available',
      });
      return;
    }

    // Validate that Enrollment model exists
    if (!db.Enrollment) {
      logger.error('Enrollment model not found in db object');
      res.status(500).json({
        status: 'error',
        message: 'Enrollment model not available',
      });
      return;
    }

    // Create batch with transaction
    const transaction = await db.sequelize.transaction();
    try {
      logger.info(`Creating batch with data: title=${title}, mode=${mode}, facultyIds=${normalizedFacultyIds.join(',')}, courseId=${courseId || 'null'}`);
      
      const batch = await db.Batch.create(
        {
          title: title.trim(),
          software: software.trim(),
          mode,
          startDate: start,
          endDate: end,
          maxCapacity,
          schedule: schedule || null,
          status: batchStatus,
          createdByAdminId: req.user.userId,
          courseId: (courseId !== undefined && courseId !== null && courseId !== '') ? Number(courseId) : null,
        },
        { transaction }
      );

      logger.info(`Batch created successfully with ID: ${batch.id}`);

      // Assign faculty if provided
      if (normalizedFacultyIds.length > 0) {
        try {
          const facultyAssignments = normalizedFacultyIds.map((facultyId) => ({
            batchId: batch.id,
            facultyId,
          }));
          logger.info(`Creating ${facultyAssignments.length} faculty assignments for batch ${batch.id}`);
          const createdAssignments = await db.BatchFacultyAssignment.bulkCreate(facultyAssignments, { transaction });
          logger.info(`Created ${createdAssignments.length} faculty assignments for batch ${batch.id}: facultyIds=${normalizedFacultyIds.join(', ')}`);
        } catch (facultyError: any) {
          logger.error('Error creating faculty assignments:', facultyError);
          logger.error('Faculty assignment error details:', {
            message: facultyError?.message,
            name: facultyError?.name,
            code: facultyError?.code,
            sqlState: facultyError?.parent?.sqlState,
            sqlMessage: facultyError?.parent?.sqlMessage,
            stack: facultyError?.stack,
          });
          throw new Error(`Failed to assign faculty: ${facultyError?.message || 'Unknown error'}`);
        }
      }

      // Enroll students if provided
      if (normalizedStudentIds.length > 0) {
        try {
          // Normalize exception student IDs
          let normalizedExceptionStudentIds: number[] = [];
          if (exceptionStudentIds !== undefined) {
            if (!Array.isArray(exceptionStudentIds)) {
              normalizedExceptionStudentIds = [];
            } else {
              normalizedExceptionStudentIds = exceptionStudentIds
                .map((id: any) => {
                  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                  return isNaN(numId) ? null : numId;
                })
                .filter((id: any) => id !== null && id !== undefined) as number[];
            }
          }
          
          const enrollmentRows = normalizedStudentIds.map((studentId) => ({
            studentId,
            batchId: batch.id,
            enrollmentDate: new Date(),
            status: normalizedExceptionStudentIds.includes(studentId) ? 'exception' : 'active',
          }));
          logger.info(`Enrolling ${enrollmentRows.length} students into batch ${batch.id} (${normalizedExceptionStudentIds.length} as exceptions)`);
          await db.Enrollment.bulkCreate(enrollmentRows, {
            transaction,
            ignoreDuplicates: true,
          });
          logger.info(`Enrolled ${enrollmentRows.length} students into batch ${batch.id}`);
        } catch (enrollmentError: any) {
          logger.error('Error enrolling students:', enrollmentError);
          logger.error('Enrollment error details:', {
            message: enrollmentError?.message,
            name: enrollmentError?.name,
            code: enrollmentError?.code,
            sqlState: enrollmentError?.parent?.sqlState,
            sqlMessage: enrollmentError?.parent?.sqlMessage,
            stack: enrollmentError?.stack,
          });
          throw new Error(`Failed to enroll students: ${enrollmentError?.message || 'Unknown error'}`);
        }
      }

      await transaction.commit();
      logger.info(`Transaction committed successfully for batch ${batch.id}`);

      // Fetch assigned faculty for response
      const assignedFaculty =
        normalizedFacultyIds.length > 0
          ? await db.User.findAll({
              where: { id: normalizedFacultyIds },
              attributes: ['id', 'name', 'email', 'phone'],
            })
          : [];

      // Fetch course if courseId exists
      const course = batch.courseId
        ? await db.Course.findByPk(batch.courseId, {
            attributes: ['id', 'name', 'software'],
          })
        : null;

      res.status(201).json({
        status: 'success',
        message: 'Batch created successfully',
        data: {
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
            createdByAdminId: batch.createdByAdminId,
            courseId: batch.courseId,
            course: course ? {
              id: course.id,
              name: course.name,
              software: course.software,
            } : null,
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt,
          },
          assignedFaculty,
          enrolledStudents: normalizedStudentIds.length
            ? await db.Enrollment.findAll({
                where: { batchId: batch.id },
                include: [
                  {
                    model: db.User,
                    as: 'student',
                    attributes: ['id', 'name', 'email', 'phone'],
                  },
                ],
              })
            : [],
        },
      });
    } catch (error: any) {
      await transaction.rollback();
      logger.error('Create batch transaction error:', error);
      logger.error('Transaction error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        code: error?.code,
        sqlState: error?.parent?.sqlState,
        sqlMessage: error?.parent?.sqlMessage,
        original: error?.original,
      });
      throw error;
    }
  } catch (error: any) {
    logger.error('Create batch error:', error);
    logger.error('Error stack:', error?.stack);
    logger.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      sqlState: error?.parent?.sqlState,
      sqlMessage: error?.parent?.sqlMessage,
      original: error?.original,
      errors: error?.errors,
    });

    // Provide more specific error messages based on error type
    let errorMessage = 'Internal server error while creating batch';
    if (error?.name === 'SequelizeForeignKeyConstraintError') {
      errorMessage = 'Foreign key constraint violation. Please check that all referenced IDs (faculty, students, course) exist and are valid.';
    } else if (error?.name === 'SequelizeUniqueConstraintError') {
      errorMessage = 'Unique constraint violation. A batch with similar details may already exist.';
    } else if (error?.name === 'SequelizeValidationError') {
      errorMessage = `Validation error: ${error?.message || 'Invalid data provided'}`;
    } else if (error?.name === 'SequelizeDatabaseError') {
      errorMessage = `Database error: ${error?.parent?.sqlMessage || error?.message || 'Database operation failed'}`;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      status: 'error',
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        name: error?.name,
        code: error?.code,
        sqlState: error?.parent?.sqlState,
        sqlMessage: error?.parent?.sqlMessage,
      } : undefined,
    });
  }
};

// GET /batches/:id/candidates/suggest → Suggest eligible students for batch
export const suggestCandidates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    // Find batch
    let batch: any;
    try {
      batch = await db.Batch.findByPk(batchId);
    } catch (batchError: any) {
      logger.error(`Error fetching batch ${batchId}:`, batchError);
      res.status(500).json({
        status: 'error',
        message: 'Error fetching batch information',
        error: process.env.NODE_ENV === 'development' ? batchError.message : undefined,
      });
      return;
    }

    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    if (!batch.software) {
      res.status(400).json({
        status: 'error',
        message: 'Batch must have software specified to suggest candidates',
      });
      return;
    }

    // Handle comma-separated software (e.g., "Photoshop, Illustrator")
    const batchSoftwareList = batch.software
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter((s: string) => s.length > 0);
    
    logger.info(`Suggest candidates for batch ${batchId}: software=${batch.software}, softwareList=${JSON.stringify(batchSoftwareList)}`);
    
    // Validate and parse dates safely
    const batchStartDate = new Date(batch.startDate);
    const batchEndDate = new Date(batch.endDate);
    if (isNaN(batchStartDate.getTime()) || isNaN(batchEndDate.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch dates',
      });
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active students with matching software
    let allStudents: any[] = [];
    try {
      allStudents = await db.User.findAll({
        where: {
          role: UserRole.STUDENT,
          isActive: true,
        },
        include: [
          {
            model: db.StudentProfile,
            as: 'studentProfile',
            required: false, // Changed to false to include students without profiles
            attributes: ['id', 'softwareList', 'pendingBatches', 'currentBatches', 'finishedBatches'],
          },
        ],
        attributes: ['id', 'name', 'email', 'phone'],
      });
    } catch (studentsError: any) {
      logger.error('Error fetching students:', studentsError);
      // Try without the new columns in case migration hasn't been run
      try {
        allStudents = await db.User.findAll({
          where: {
            role: UserRole.STUDENT,
            isActive: true,
          },
          include: [
            {
              model: db.StudentProfile,
              as: 'studentProfile',
              required: false,
              attributes: ['id', 'softwareList'], // Only include softwareList if new columns don't exist
            },
          ],
          attributes: ['id', 'name', 'email', 'phone'],
        });
        logger.info('Fetched students without new batch status columns (migration may not be run)');
      } catch (fallbackError: any) {
        logger.error('Error fetching students even with fallback:', fallbackError);
        throw new Error(`Failed to fetch students: ${fallbackError.message}`);
      }
    }

    logger.info(`Found ${allStudents.length} active students`);

    // Log sample student data for debugging
    if (allStudents.length > 0) {
      const sampleStudent = allStudents[0];
      logger.info(`Sample student: id=${sampleStudent.id}, name=${sampleStudent.name}, hasProfile=${!!sampleStudent.studentProfile}, softwareList=${JSON.stringify(sampleStudent.studentProfile?.softwareList)}`);
    }

    // Filter students who have matching software
    // Priority: pendingBatches > softwareList (for backward compatibility)
    const studentsWithMatchingSoftware = allStudents.filter((student) => {
      try {
        const profile = student.studentProfile;
        
        if (!profile) {
          logger.debug(`Student ${student.id} (${student.name}): No profile found`);
          return false;
        }
        
        // Check pending batches first (primary filter) - if column exists
        let pendingBatchesList: any = null;
        try {
          pendingBatchesList = (profile as any).pendingBatches;
          
          // Handle case where pendingBatches might be a JSON string (MySQL/MariaDB)
          if (pendingBatchesList && typeof pendingBatchesList === 'string') {
            try {
              pendingBatchesList = JSON.parse(pendingBatchesList);
            } catch (e) {
              logger.warn(`Student ${student.id} (${student.name}): Failed to parse pendingBatches as JSON: ${pendingBatchesList}`);
              pendingBatchesList = null;
            }
          }
        } catch (e) {
          // Column might not exist yet (migration not run)
          logger.debug(`Student ${student.id}: pendingBatches column might not exist, using fallback`);
          pendingBatchesList = null;
        }
        
        // If student has pending batches, check if any match
        if (pendingBatchesList && Array.isArray(pendingBatchesList) && pendingBatchesList.length > 0) {
          try {
            const normalizedPendingBatches = pendingBatchesList
              .map((s: any) => String(s).trim().toLowerCase())
              .filter((s: string) => s.length > 0);

            const matches = batchSoftwareList.some((batchSoftware: string) =>
              normalizedPendingBatches.some((pendingSoftware: string) => {
                // Exact match
                if (pendingSoftware === batchSoftware) {
                  logger.info(`✓ Pending batch match: Student ${student.id} (${student.name}) has "${pendingSoftware}" in pending batches matching "${batchSoftware}"`);
                  return true;
                }
                // Partial match
                if (pendingSoftware.includes(batchSoftware) || batchSoftware.includes(pendingSoftware)) {
                  logger.info(`✓ Pending batch partial match: Student ${student.id} (${student.name}) has "${pendingSoftware}" in pending batches matching "${batchSoftware}"`);
                  return true;
                }
                return false;
              })
            );
            
            if (matches) {
              return true; // Found match in pending batches
            }
          } catch (e: any) {
            logger.warn(`Student ${student.id}: Error processing pendingBatches: ${e.message}`);
          }
        }
        
        // Fallback: If no pending batches, check softwareList (for backward compatibility)
        let softwareList: any = null;
        try {
          softwareList = profile.softwareList;
          
          // Handle case where softwareList might be a JSON string (MySQL/MariaDB)
          if (softwareList && typeof softwareList === 'string') {
            try {
              softwareList = JSON.parse(softwareList);
            } catch (e) {
              logger.warn(`Student ${student.id} (${student.name}): Failed to parse softwareList as JSON: ${softwareList}`);
              return false;
            }
          }
        } catch (e) {
          logger.debug(`Student ${student.id}: Error accessing softwareList`);
          return false;
        }
        
        if (!softwareList) {
          logger.debug(`Student ${student.id} (${student.name}): No softwareList or pendingBatches in profile`);
          return false;
        }
        
        if (!Array.isArray(softwareList)) {
          logger.debug(`Student ${student.id} (${student.name}): softwareList is not an array: ${typeof softwareList}, value: ${JSON.stringify(softwareList)}`);
          return false;
        }
        
        if (softwareList.length === 0) {
          logger.debug(`Student ${student.id} (${student.name}): softwareList is empty`);
          return false;
        }

        // Normalize student software list (trim and lowercase)
        const normalizedStudentSoftware = softwareList
          .map((s: any) => {
            try {
              return String(s).trim().toLowerCase();
            } catch (e) {
              return '';
            }
          })
          .filter((s: string) => s.length > 0);

        if (normalizedStudentSoftware.length === 0) {
          logger.debug(`Student ${student.id} (${student.name}): No valid software after normalization`);
          return false;
        }

        // Check if any batch software matches any student software
        // Use flexible matching: exact match or contains match
        const matches = batchSoftwareList.some((batchSoftware: string) =>
          normalizedStudentSoftware.some((studentSoftware: string) => {
            try {
              // Exact match
              if (studentSoftware === batchSoftware) {
                logger.info(`✓ SoftwareList match (fallback): Student ${student.id} (${student.name}) has "${studentSoftware}" matching batch software "${batchSoftware}"`);
                return true;
              }
              // Partial match (student software contains batch software or vice versa)
              if (studentSoftware.includes(batchSoftware) || batchSoftware.includes(studentSoftware)) {
                logger.info(`✓ SoftwareList partial match (fallback): Student ${student.id} (${student.name}) has "${studentSoftware}" matching batch software "${batchSoftware}"`);
                return true;
              }
            } catch (e) {
              logger.warn(`Student ${student.id}: Error comparing software "${studentSoftware}" with "${batchSoftware}"`);
            }
            return false;
          })
        );
        
        if (!matches) {
          logger.debug(`Student ${student.id} (${student.name}): No match. Student has: [${normalizedStudentSoftware.join(', ')}], Batch needs: [${batchSoftwareList.join(', ')}]`);
        }
        
        return matches;
      } catch (studentFilterError: any) {
        logger.error(`Error filtering student ${student.id} (${student.name}): ${studentFilterError.message}`, { error: studentFilterError });
        return false; // Don't include this student if there's an error
      }
    });

    logger.info(`Found ${studentsWithMatchingSoftware.length} students with matching software out of ${allStudents.length} total students`);

    // Fallback: Also check students enrolled in batches with matching software
    // This helps find students who might have software through batch enrollment
    let batchesWithMatchingSoftware: any[] = [];
    try {
      batchesWithMatchingSoftware = await db.Batch.findAll({
        where: {
          software: {
            [Op.not]: null,
          },
        },
        attributes: ['id', 'software'],
      });
    } catch (batchQueryError: any) {
      logger.error('Error fetching batches with matching software:', batchQueryError);
      batchesWithMatchingSoftware = [];
    }

    const batchIdsWithMatchingSoftware = batchesWithMatchingSoftware
      .filter((b) => {
        if (!b.software) return false;
        const otherBatchSoftwareList = b.software
          .split(',')
          .map((s: string) => s.trim().toLowerCase())
          .filter((s: string) => s.length > 0);
        // Check if any software in this batch matches any software in the target batch
        return otherBatchSoftwareList.some((otherSoftware: string) =>
          batchSoftwareList.some((targetSoftware: string) =>
            otherSoftware === targetSoftware || 
            otherSoftware.includes(targetSoftware) || 
            targetSoftware.includes(otherSoftware)
          )
        );
      })
      .map((b) => b.id);

    // Get students enrolled in batches with matching software
    let additionalStudentIds: number[] = [];
    if (batchIdsWithMatchingSoftware.length > 0) {
      try {
        const enrollments = await db.Enrollment.findAll({
          where: {
            batchId: { [Op.in]: batchIdsWithMatchingSoftware },
            status: 'active',
          },
          include: [
            {
              model: db.User,
              as: 'student',
              where: {
                role: UserRole.STUDENT,
                isActive: true,
              },
              attributes: ['id'],
              required: true,
            },
          ],
          attributes: ['studentId'],
        });
        additionalStudentIds = enrollments.map((e: any) => e.studentId).filter((id: any) => id !== null && id !== undefined);
        logger.info(`Found ${additionalStudentIds.length} additional students through batch enrollments`);
      } catch (enrollmentError: any) {
        logger.error('Error fetching enrollments for matching batches:', enrollmentError);
        additionalStudentIds = [];
      }
    }

    // Combine students from profile software and batch enrollments
    const allCandidateStudentIds = new Set([
      ...studentsWithMatchingSoftware.map((s) => s.id),
      ...additionalStudentIds,
    ]);

    // Handle empty candidate list
    if (allCandidateStudentIds.size === 0) {
      logger.info(`No candidate students found for batch ${batchId} with software: ${batch.software}`);
      res.status(200).json({
        status: 'success',
        data: {
          batch: {
            id: batch.id,
            title: batch.title,
            software: batch.software,
            startDate: batch.startDate,
            endDate: batch.endDate,
            schedule: batch.schedule,
          },
          candidates: [],
          totalCount: 0,
          summary: {
            available: 0,
            noOrientation: 0,
            busy: 0,
            feesOverdue: 0,
          },
        },
      });
      return;
    }

    const candidateIdsArray = Array.from(allCandidateStudentIds);

    // Get full student data for all candidates
    let allCandidateStudents: any[] = [];
    try {
      allCandidateStudents = await db.User.findAll({
        where: {
          id: { [Op.in]: candidateIdsArray },
          role: UserRole.STUDENT,
          isActive: true,
        },
        include: [
          {
            model: db.StudentProfile,
            as: 'studentProfile',
            required: false,
            attributes: ['id', 'softwareList', 'pendingBatches', 'currentBatches', 'finishedBatches'],
          },
        ],
        attributes: ['id', 'name', 'email', 'phone'],
      });
    } catch (queryError: any) {
      logger.error('Error fetching candidate students with new columns:', queryError);
      // Try without the new columns in case migration hasn't been run
      try {
        allCandidateStudents = await db.User.findAll({
          where: {
            id: { [Op.in]: candidateIdsArray },
            role: UserRole.STUDENT,
            isActive: true,
          },
          include: [
            {
              model: db.StudentProfile,
              as: 'studentProfile',
              required: false,
              attributes: ['id', 'softwareList'], // Only include softwareList if new columns don't exist
            },
          ],
          attributes: ['id', 'name', 'email', 'phone'],
        });
        logger.info('Fetched candidate students without new batch status columns (migration may not be run)');
      } catch (fallbackError: any) {
        logger.error('Error fetching candidate students even with fallback:', fallbackError);
        throw new Error(`Failed to fetch candidate students: ${fallbackError.message}`);
      }
    }

    logger.info(`Total candidate students: ${allCandidateStudents.length} (${studentsWithMatchingSoftware.length} from profile, ${additionalStudentIds.length} from enrollments)`);

    // Get payment transactions for all candidate students
    const studentIds = allCandidateStudents.map((s) => s.id).filter((id: any) => id !== null && id !== undefined);
    let payments: any[] = [];
    if (studentIds.length > 0) {
      try {
        payments = await db.PaymentTransaction.findAll({
          where: {
            studentId: { [Op.in]: studentIds },
            status: {
              [Op.in]: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE],
            },
          },
          attributes: ['studentId', 'dueDate', 'amount', 'status'],
        });
      } catch (paymentError: any) {
        logger.error('Error fetching payment transactions:', paymentError);
        payments = [];
      }
    }

    // Get orientation status for all candidate students (get all orientations, not just accepted)
    let orientations: any[] = [];
    if (studentIds.length > 0) {
      try {
        orientations = await db.StudentOrientation.findAll({
          where: {
            studentId: { [Op.in]: studentIds },
          },
          attributes: ['studentId', 'accepted'],
        });
      } catch (orientationError: any) {
        logger.error('Error fetching orientation status:', orientationError);
        orientations = [];
      }
    }

    // Students are eligible if they have at least one accepted orientation
    const eligibleStudentIds = new Set(
      orientations.filter((o) => o.accepted).map((o) => o.studentId)
    );

    // Show ALL students with matching software (don't filter by orientation or fees here)
    // We'll mark their status in the response instead
    const eligibleStudents = allCandidateStudents;

    // Get all enrollments for candidate students to check for conflicts
    let existingEnrollments: any[] = [];
    if (studentIds.length > 0) {
      try {
        existingEnrollments = await db.Enrollment.findAll({
          where: {
            studentId: { [Op.in]: studentIds },
          },
          include: [
            {
              model: db.Batch,
              as: 'batch',
              attributes: ['id', 'title', 'startDate', 'endDate', 'status'],
              required: false,
            },
          ],
        });
      } catch (enrollmentError: any) {
        logger.error('Error fetching enrollments:', enrollmentError);
        existingEnrollments = [];
      }
    }

    // Get all sessions in the date range to check for time conflicts
    let existingSessions: any[] = [];
    if (studentIds.length > 0) {
      try {
        // First get sessions in date range
        const sessionsInRange = await db.Session.findAll({
          where: {
            date: {
              [Op.between]: [batchStartDate, batchEndDate],
            },
          },
          include: [
            {
              model: db.Batch,
              as: 'batch',
              attributes: ['id', 'title', 'startDate', 'endDate'],
              required: false,
            },
          ],
        });

        // Then get enrollments for these sessions' batches
        const sessionBatchIds = sessionsInRange
          .map((s: any) => s.batch?.id)
          .filter((id: any) => id !== null && id !== undefined);

        if (sessionBatchIds.length > 0) {
          const enrollmentsForSessions = await db.Enrollment.findAll({
            where: {
              batchId: { [Op.in]: sessionBatchIds },
              studentId: { [Op.in]: studentIds },
            },
            attributes: ['batchId', 'studentId'],
          });

          // Map enrollments to sessions
          existingSessions = sessionsInRange.filter((session: any) => {
            if (!session.batch) return false;
            return enrollmentsForSessions.some(
              (enrollment: any) =>
                enrollment.batchId === session.batch.id &&
                studentIds.includes(enrollment.studentId)
            );
          });
        }
      } catch (sessionError: any) {
        logger.error('Error fetching sessions:', sessionError);
        existingSessions = [];
      }
    }

    // Process each candidate student
    const candidates = eligibleStudents.map((student) => {
      try {
        const studentId = student.id;
        
        // Debug: Log student data to help identify name issues
        const studentData = (student as any).toJSON ? (student as any).toJSON() : student;
        logger.debug(`Processing candidate student ${studentId}: name="${studentData?.name || student.name || 'MISSING'}", email="${studentData?.email || student.email || 'MISSING'}"`);

        // Check for overdue payments
        const overduePayments = payments
          .filter((payment: any) => {
            if (!payment || !payment.dueDate) return false;
            try {
              const dueDate = new Date(payment.dueDate);
              return !isNaN(dueDate.getTime()) && dueDate < today;
            } catch (e) {
              logger.warn(`Invalid dueDate for payment: ${payment.dueDate}`);
              return false;
            }
          })
          .filter((payment: any) => payment.studentId === studentId);

        // Check for pending payments (including EMIs and next batch fees)
        const pendingPayments = payments
          .filter((payment: any) => payment.studentId === studentId);

        const hasOverdueFees = overduePayments.length > 0;
        const hasPendingFees = pendingPayments.length > 0;
        const totalOverdueAmount = overduePayments.reduce((sum: number, payment: any) => {
          const amount = Number(payment.amount) || 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        const totalPendingAmount = pendingPayments.reduce((sum: number, payment: any) => {
          const amount = Number(payment.amount) || 0;
          const paid = Number(payment.paidAmount) || 0;
          return sum + (isNaN(amount) ? 0 : (amount - paid));
        }, 0);

        // Check for conflicting enrollments (overlapping batch dates)
        const conflictingEnrollments = existingEnrollments.filter((enrollment) => {
          if (enrollment.studentId !== studentId) return false;
          const enrollmentBatch = (enrollment as any).batch;
          if (!enrollmentBatch) return false;
          if (enrollmentBatch.id === batchId) return false; // Exclude current batch
          if (enrollmentBatch.status === 'ended' || enrollmentBatch.status === 'cancelled') return false;

          try {
            const otherStart = new Date(enrollmentBatch.startDate);
            const otherEnd = new Date(enrollmentBatch.endDate);
            if (isNaN(otherStart.getTime()) || isNaN(otherEnd.getTime())) return false;

            // Check if date ranges overlap
            return batchStartDate <= otherEnd && batchEndDate >= otherStart;
          } catch (e) {
            logger.warn(`Invalid dates for enrollment batch ${enrollmentBatch.id}`);
            return false;
          }
        });

        // Check for conflicting sessions
        const conflictingSessions = existingSessions.filter((session: any) => {
          if (!session || !session.batch) return false;
          // Check if this student is enrolled in the batch for this session
          const sessionBatchId = session.batch.id;
          return existingEnrollments.some(
            (enrollment: any) =>
              enrollment.studentId === studentId &&
              enrollment.batch?.id === sessionBatchId
          );
        });

        const isBusy = conflictingEnrollments.length > 0 || conflictingSessions.length > 0;
        const hasOrientation = eligibleStudentIds.has(studentId);

        // Determine candidate status
        let status = 'available';
        let statusMessage = 'Available for enrollment';

        // Check orientation first - if no orientation, mark as not eligible
        if (!hasOrientation) {
          status = 'no_orientation';
          statusMessage = 'Orientation not accepted';
        } else if (hasOverdueFees) {
          status = 'fees_overdue';
          statusMessage = `Fees overdue (₹${totalOverdueAmount.toFixed(2)})`;
        } else if (hasPendingFees) {
          // Mark as pending fees (needs exception)
          status = 'pending_fees';
          statusMessage = `Pending fees/EMI (₹${totalPendingAmount.toFixed(2)})`;
        } else if (isBusy) {
          status = 'busy';
          const conflictDetails: string[] = [];
          if (conflictingEnrollments.length > 0) {
            conflictDetails.push(`${conflictingEnrollments.length} batch(es)`);
          }
          if (conflictingSessions.length > 0) {
            conflictDetails.push(`${conflictingSessions.length} session(s)`);
          }
          statusMessage = `Busy - ${conflictDetails.join(', ')}`;
        }

        // Ensure name is properly extracted - handle both direct property and toJSON() cases
        const studentName = (student.name || (student as any).toJSON?.()?.name || 'Unknown').trim();
        const studentEmail = (student.email || (student as any).toJSON?.()?.email || '').trim();
        const studentPhone = (student.phone || (student as any).toJSON?.()?.phone || '-').trim();

        return {
          studentId: student.id,
          name: studentName || `Student #${student.id}`,
          email: studentEmail || '',
          phone: studentPhone || '-',
          status,
          statusMessage,
          hasOverdueFees,
          hasPendingFees,
          totalOverdueAmount: hasOverdueFees ? totalOverdueAmount : 0,
          totalPendingAmount: hasPendingFees ? totalPendingAmount : 0,
          conflictingBatches: conflictingEnrollments
            .map((enrollment) => (enrollment as any).batch)
            .filter((enrollmentBatch): enrollmentBatch is { id: number; title: string; startDate: Date; endDate: Date } => !!enrollmentBatch)
            .map((enrollmentBatch) => enrollmentBatch.title),
          conflictingSessions: conflictingSessions.length > 0 ? [`${conflictingSessions.length} session(s)`] : [],
        };
      } catch (studentError: any) {
        logger.error(`Error processing student ${student.id}:`, studentError);
        // Return a safe default candidate
        const studentName = (student.name || (student as any).toJSON?.()?.name || 'Unknown').trim();
        const studentEmail = (student.email || (student as any).toJSON?.()?.email || '').trim();
        const studentPhone = (student.phone || (student as any).toJSON?.()?.phone || '-').trim();
        
        return {
          studentId: student.id,
          name: studentName || `Student #${student.id}`,
          email: studentEmail || '',
          phone: studentPhone || '-',
          status: 'no_orientation',
          statusMessage: 'Error processing student data',
          hasOverdueFees: false,
          hasPendingFees: false,
          totalOverdueAmount: 0,
          totalPendingAmount: 0,
          conflictingBatches: [],
          conflictingSessions: [],
        };
      }
    }).filter((candidate) => candidate !== null && candidate !== undefined);

    // Sort candidates: available first, then no_orientation, then busy, then pending_fees, then fees_overdue
    const statusOrder: { [key: string]: number } = { 
      available: 1, 
      no_orientation: 2, 
      busy: 3, 
      pending_fees: 4,
      fees_overdue: 5 
    };
    candidates.sort((a, b) => {
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

    logger.info(`Returning ${candidates.length} candidates for batch ${batchId}`);

    res.status(200).json({
      status: 'success',
      data: {
        batch: {
          id: batch.id,
          title: batch.title,
          software: batch.software,
          startDate: batch.startDate,
          endDate: batch.endDate,
          schedule: batch.schedule,
        },
        candidates,
        totalCount: candidates.length,
        summary: {
          available: candidates.filter((c) => c.status === 'available').length,
          noOrientation: candidates.filter((c) => c.status === 'no_orientation').length,
          busy: candidates.filter((c) => c.status === 'busy').length,
          pendingFees: candidates.filter((c) => c.status === 'pending_fees').length,
          feesOverdue: candidates.filter((c) => c.status === 'fees_overdue').length,
        },
      },
    });
  } catch (error: any) {
    logger.error('Suggest candidates error:', error);
    logger.error('Error stack:', error?.stack);
    logger.error('Error details:', {
      message: error?.message,
      name: error?.name,
      batchId: req.params.id,
      batchIdParsed: parseInt(req.params.id, 10),
    });
    
    // Provide more detailed error in development
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        }
      : undefined;
    
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while suggesting candidates',
      ...(errorDetails && { error: errorDetails }),
    });
  }
};

// GET /batches/:id/enrollments → Get batch enrollments
export const getBatchEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    // Verify batch exists
    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    // Get enrollments with student information
    const enrollments = await db.Enrollment.findAll({
      where: { batchId },
      include: [
        {
          model: db.User,
          as: 'student',
          where: {
            role: UserRole.STUDENT,
            isActive: true,
          },
          attributes: ['id', 'name', 'email', 'phone'],
          required: true,
        },
      ],
      order: [['enrollmentDate', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: enrollments,
    });
  } catch (error) {
    logger.error('Get batch enrollments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batch enrollments',
    });
  }
};

// GET /batches → List all batches with related faculty and enrolled students
export const getAllBatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // If faculty, only show batches they're assigned to
    const where: any = {};
    if (req.user?.role === UserRole.FACULTY) {
      const facultyAssignments = await db.BatchFacultyAssignment.findAll({
        where: { facultyId: req.user.userId },
        attributes: ['batchId'],
      });
      const assignedBatchIds = facultyAssignments.map((a: any) => a.batchId);
      if (assignedBatchIds.length === 0) {
        res.status(200).json({
          status: 'success',
          data: [],
          count: 0,
        });
        return;
      }
      where.id = { [Op.in]: assignedBatchIds };
    }

    // Build includes array
    const includes: any[] = [
      {
        model: db.User,
        as: 'admin',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: db.Enrollment,
        as: 'enrollments',
        include: [
          {
            model: db.User,
            as: 'student',
            attributes: ['id', 'name', 'email', 'phone'],
          },
        ],
      },
      {
        model: db.Session,
        as: 'sessions',
        include: [
          {
            model: db.User,
            as: 'faculty',
            attributes: ['id', 'name', 'email'],
          },
        ],
        attributes: ['id', 'facultyId', 'date', 'status'],
      },
      {
        model: db.User,
        as: 'assignedFaculty',
        attributes: ['id', 'name', 'email'],
        through: { attributes: [] },
        required: false,
      },
    ];

    // Add Course include only if model exists
    if (db.Course) {
      includes.push({
        model: db.Course,
        as: 'course',
        attributes: ['id', 'name', 'software'],
        required: false,
      });
    } else {
      logger.warn('Course model not found in db object, skipping course include');
    }

    // Get all batches with related data
    const batches = await db.Batch.findAll({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: includes,
      order: [['createdAt', 'DESC']],
    });

    // Transform the data to show faculty information from sessions
    const batchesWithFaculty = batches.map((batch: any) => {
      const facultyMap = new Map();
      if (batch.assignedFaculty && Array.isArray(batch.assignedFaculty)) {
        batch.assignedFaculty.forEach((faculty: any) => {
          if (faculty?.id) {
            facultyMap.set(faculty.id, faculty);
          }
        });
      }
      if (batch.sessions) {
        batch.sessions
          .filter((s: any) => s.faculty)
          .forEach((session: any) => {
            if (session.faculty?.id) {
              facultyMap.set(session.faculty.id, session.faculty);
            }
          });
      }
      const facultyMembers = Array.from(facultyMap.values());

      return {
        id: batch.id,
        title: batch.title,
        software: batch.software,
        mode: batch.mode,
        startDate: batch.startDate,
        endDate: batch.endDate,
        maxCapacity: batch.maxCapacity,
        currentEnrollment: batch.enrollments?.length || 0,
        schedule: batch.schedule,
        status: batch.status,
        courseId: batch.courseId,
        course: batch.course ? {
          id: batch.course.id,
          name: batch.course.name,
          software: batch.course.software,
        } : null,
        createdBy: batch.admin
          ? {
              id: batch.admin.id,
              name: batch.admin.name,
              email: batch.admin.email,
            }
          : null,
        assignedFaculty: facultyMembers,
        enrollments: batch.enrollments?.map((enrollment: any) => ({
          id: enrollment.student?.id,
          name: enrollment.student?.name,
          email: enrollment.student?.email,
          phone: enrollment.student?.phone,
          enrollmentDate: enrollment.enrollmentDate,
          enrollmentStatus: enrollment.status,
        })) || [],
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      };
    });

    res.status(200).json({
      status: 'success',
      data: batchesWithFaculty,
      count: batchesWithFaculty.length,
    });
  } catch (error: any) {
    logger.error('Get all batches error:', error);
    logger.error('Error stack:', error?.stack);
    logger.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      sqlState: error?.parent?.sqlState,
      sqlMessage: error?.parent?.sqlMessage,
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batches',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
};

// GET /batches/:id → Get single batch by ID
export const getBatchById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    // Build includes array
    const includes: any[] = [
      {
        model: db.User,
        as: 'admin',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: db.Enrollment,
        as: 'enrollments',
        include: [
          {
            model: db.User,
            as: 'student',
            attributes: ['id', 'name', 'email', 'phone'],
          },
        ],
      },
      {
        model: db.Session,
        as: 'sessions',
        include: [
          {
            model: db.User,
            as: 'faculty',
            attributes: ['id', 'name', 'email'],
          },
        ],
        attributes: ['id', 'facultyId', 'date', 'status'],
      },
      {
        model: db.User,
        as: 'assignedFaculty',
        attributes: ['id', 'name', 'email'],
        through: { attributes: [] },
        required: false,
      },
    ];

    // Add Course include only if model exists
    if (db.Course) {
      includes.push({
        model: db.Course,
        as: 'course',
        attributes: ['id', 'name', 'software'],
        required: false,
      });
    }

    const batch = await db.Batch.findByPk(batchId, {
      include: includes,
    });

    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    // Transform the data
    const batchData = {
      id: batch.id,
      title: batch.title,
      software: batch.software,
      mode: batch.mode,
      startDate: batch.startDate,
      endDate: batch.endDate,
      maxCapacity: batch.maxCapacity,
      currentEnrollment: (batch as any).enrollments?.length || 0,
      schedule: batch.schedule,
      status: batch.status,
      courseId: batch.courseId,
      course: (batch as any).course ? {
        id: (batch as any).course.id,
        name: (batch as any).course.name,
        software: (batch as any).course.software,
      } : null,
      createdBy: (batch as any).admin
        ? {
            id: (batch as any).admin.id,
            name: (batch as any).admin.name,
            email: (batch as any).admin.email,
          }
        : null,
      assignedFaculty: (() => {
        const facultyMap = new Map();
        if ((batch as any).assignedFaculty) {
          (batch as any).assignedFaculty.forEach((faculty: any) => {
            if (faculty?.id) {
              facultyMap.set(faculty.id, faculty);
            }
          });
        }
        if ((batch as any).sessions) {
          (batch as any).sessions
            .filter((s: any) => s.faculty)
            .forEach((session: any) => {
              if (session.faculty?.id) {
                facultyMap.set(session.faculty.id, session.faculty);
              }
            });
        }
        return Array.from(facultyMap.values());
      })(),
      enrollments: (batch as any).enrollments?.map((enrollment: any) => ({
        id: enrollment.student?.id,
        name: enrollment.student?.name,
        email: enrollment.student?.email,
        phone: enrollment.student?.phone,
        enrollmentDate: enrollment.enrollmentDate,
        enrollmentStatus: enrollment.status,
      })) || [],
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };

    res.status(200).json({
      status: 'success',
      data: {
        batch: batchData,
      },
    });
  } catch (error: any) {
    logger.error('Get batch by ID error:', error);
    logger.error('Error stack:', error?.stack);
    logger.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      sqlState: error?.parent?.sqlState,
      sqlMessage: error?.parent?.sqlMessage,
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching batch',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
};

// PUT /batches/:id → Update batch (admin only)
export const updateBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can update batches
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can update batches',
      });
      return;
    }

    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    const {
      title,
      software,
      mode,
      startDate,
      endDate,
      maxCapacity,
      schedule,
      status,
      facultyIds,
      studentIds,
      exceptionStudentIds,
    } = req.body;

    // Validation - All fields required for update
    if (title !== undefined && (!title || !title.trim())) {
      res.status(400).json({
        status: 'error',
        message: 'Title is required and cannot be empty',
      });
      return;
    }

    if (software !== undefined && (!software || !software.trim())) {
      res.status(400).json({
        status: 'error',
        message: 'Software is required and cannot be empty',
      });
      return;
    }

    if (status !== undefined && (!status || !status.trim())) {
      res.status(400).json({
        status: 'error',
        message: 'Status is required and cannot be empty',
      });
      return;
    }

    // Validate mode if provided
    if (mode && !Object.values(BatchMode).includes(mode)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid mode. Allowed values: ${Object.values(BatchMode).join(', ')}`,
      });
      return;
    }

    // Validate dates if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(batch.startDate);
      const end = endDate ? new Date(endDate) : new Date(batch.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid date format',
        });
        return;
      }
      if (start >= end) {
        res.status(400).json({
          status: 'error',
          message: 'Start date must be before end date',
        });
        return;
      }
    }

    // Validate maxCapacity if provided
    if (maxCapacity !== undefined && maxCapacity < 1) {
      res.status(400).json({
        status: 'error',
        message: 'Max capacity must be at least 1',
      });
      return;
    }

    // Validate and process faculty IDs if provided
    logger.info(
      `Update batch ${req.params.id} - facultyIds received: ${JSON.stringify(
        facultyIds
      )}, studentIds received: ${JSON.stringify(studentIds)}`
    );
    
    let normalizedFacultyIds: number[] | null = null;
    let normalizedStudentIds: number[] | null = null;
    if (facultyIds !== undefined) {
      if (!Array.isArray(facultyIds) || facultyIds.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'At least one faculty member must be assigned to the batch',
        });
        return;
      }

      const ids = facultyIds
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id) && id > 0);
      
      if (ids.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'At least one valid faculty member must be assigned to the batch',
        });
        return;
      }

      const uniqueFacultyIds = Array.from(new Set(ids));
      const facultyMembers = await db.User.findAll({
        where: {
          id: uniqueFacultyIds,
          role: UserRole.FACULTY,
          isActive: true,
        },
        attributes: ['id'],
      });

      if (facultyMembers.length !== uniqueFacultyIds.length) {
        const foundIds = new Set(facultyMembers.map((f) => f.id));
        const missingIds = uniqueFacultyIds.filter((id) => !foundIds.has(id));
        res.status(400).json({
          status: 'error',
          message: `Invalid or inactive faculty IDs: ${missingIds.join(', ')}`,
        });
        return;
      }
      normalizedFacultyIds = uniqueFacultyIds;
    }

    if (studentIds !== undefined) {
      if (!Array.isArray(studentIds)) {
        res.status(400).json({
          status: 'error',
          message: 'studentIds must be an array of student IDs',
        });
        return;
      }

      const ids = studentIds
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id) && id > 0);

      if (ids.length > 0) {
        const uniqueStudentIds = Array.from(new Set(ids));
        const students = await db.User.findAll({
          where: {
            id: uniqueStudentIds,
            role: UserRole.STUDENT,
            isActive: true,
          },
          attributes: ['id'],
        });

        if (students.length !== uniqueStudentIds.length) {
          const foundIds = new Set(students.map((s) => s.id));
          const missingIds = uniqueStudentIds.filter((id) => !foundIds.has(id));
          res.status(400).json({
            status: 'error',
            message: `Invalid or inactive student IDs: ${missingIds.join(', ')}`,
          });
          return;
        }
        normalizedStudentIds = uniqueStudentIds;
      } else {
        normalizedStudentIds = [];
      }
    }

    // Update batch with transaction
    const transaction = await db.sequelize.transaction();
    try {
      await batch.update(
        {
          title: title !== undefined ? title.trim() : batch.title,
          software: software !== undefined ? software.trim() : batch.software,
          mode: mode !== undefined ? mode : batch.mode,
          startDate: startDate ? new Date(startDate) : batch.startDate,
          endDate: endDate ? new Date(endDate) : batch.endDate,
          maxCapacity: maxCapacity !== undefined ? maxCapacity : batch.maxCapacity,
          schedule: schedule !== undefined ? schedule : batch.schedule,
          status: status !== undefined ? status.trim() : batch.status,
        },
        { transaction }
      );

      // Update faculty assignments if provided
      if (normalizedFacultyIds !== null) {
        const deletedCount = await db.BatchFacultyAssignment.destroy({
          where: { batchId: batch.id },
          transaction,
        });
        logger.info(`Deleted ${deletedCount} existing faculty assignments for batch ${batch.id}`);

        if (normalizedFacultyIds.length > 0) {
          const facultyAssignments = normalizedFacultyIds.map((facultyId) => ({
            batchId: batch.id,
            facultyId,
          }));
          const createdAssignments = await db.BatchFacultyAssignment.bulkCreate(facultyAssignments, { transaction });
          logger.info(`Created ${createdAssignments.length} new faculty assignments for batch ${batch.id}: facultyIds=${normalizedFacultyIds.join(', ')}`);
        } else {
          logger.info(`No faculty assignments to create for batch ${batch.id} (array was empty)`);
        }
      }

      if (normalizedStudentIds !== null) {
        const existingEnrollments = await db.Enrollment.findAll({
          where: { batchId: batch.id },
          attributes: ['studentId'],
          transaction,
        });

        const existingIds = existingEnrollments.map((e) => e.studentId);
        const finalIds = normalizedStudentIds;

        const toRemove = existingIds.filter((id: number) => !finalIds.includes(id));
        if (toRemove.length > 0) {
          await db.Enrollment.destroy({
            where: {
              batchId: batch.id,
              studentId: { [Op.in]: toRemove },
            },
            transaction,
          });
        }

        // Normalize exception student IDs
        let normalizedExceptionStudentIds: number[] = [];
        if (exceptionStudentIds !== undefined) {
          if (!Array.isArray(exceptionStudentIds)) {
            normalizedExceptionStudentIds = [];
          } else {
            normalizedExceptionStudentIds = exceptionStudentIds
              .map((id) => Number(id))
              .filter((id) => !Number.isNaN(id) && id > 0);
          }
        }

        const toAdd = finalIds.filter((id: number) => !existingIds.includes(id));
        if (toAdd.length > 0) {
          const enrollmentRows = toAdd.map((studentId: number) => ({
            studentId,
            batchId: batch.id,
            enrollmentDate: new Date(),
            status: normalizedExceptionStudentIds.includes(studentId) ? 'exception' : 'active',
          }));
          await db.Enrollment.bulkCreate(enrollmentRows, {
            transaction,
            ignoreDuplicates: true,
          });
          logger.info(`Enrolled ${enrollmentRows.length} students into batch ${batch.id} (${normalizedExceptionStudentIds.length} as exceptions)`);
        }

        // Update status for existing enrollments if exceptionStudentIds is provided
        if (exceptionStudentIds !== undefined) {
          const toUpdateException = finalIds.filter((id: number) => existingIds.includes(id) && normalizedExceptionStudentIds.includes(id));
          const toUpdateActive = finalIds.filter((id: number) => existingIds.includes(id) && !normalizedExceptionStudentIds.includes(id));
          
          if (toUpdateException.length > 0) {
            await db.Enrollment.update(
              { status: 'exception' },
              {
                where: {
                  batchId: batch.id,
                  studentId: { [Op.in]: toUpdateException },
                },
                transaction,
              }
            );
          }
          
          if (toUpdateActive.length > 0) {
            await db.Enrollment.update(
              { status: 'active' },
              {
                where: {
                  batchId: batch.id,
                  studentId: { [Op.in]: toUpdateActive },
                },
                transaction,
              }
            );
          }
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    const updatedBatch = await db.Batch.findByPk(batch.id, {
      include: [
        {
          model: db.User,
          as: 'assignedFaculty',
          attributes: ['id', 'name', 'email', 'phone'],
          through: { attributes: [] },
        },
        {
          model: db.Enrollment,
          as: 'enrollments',
          include: [
            {
              model: db.User,
              as: 'student',
              attributes: ['id', 'name', 'email', 'phone'],
            },
          ],
        },
      ],
    });

    const assignedFaculty =
      (updatedBatch as any)?.assignedFaculty?.map((faculty: any) => ({
        id: faculty.id,
        name: faculty.name,
        email: faculty.email,
        phone: faculty.phone,
      })) || [];

    const enrolledStudents =
      (updatedBatch as any)?.enrollments?.map((enrollment: any) => ({
        id: enrollment.student?.id,
        name: enrollment.student?.name,
        email: enrollment.student?.email,
        phone: enrollment.student?.phone,
        enrollmentDate: enrollment.enrollmentDate,
        enrollmentStatus: enrollment.status,
      })) || [];

    res.status(200).json({
      status: 'success',
      message: 'Batch updated successfully',
      data: {
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
          updatedAt: batch.updatedAt,
        },
        assignedFaculty,
        enrolledStudents,
      },
    });
  } catch (error) {
    logger.error('Update batch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating batch',
    });
  }
};

// DELETE /batches/:id → Delete batch (admin only)
export const deleteBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can delete batches
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can delete batches',
      });
      return;
    }

    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    // Check if batch has enrollments
    const enrollments = await db.Enrollment.count({ where: { batchId } });
    if (enrollments > 0) {
      res.status(400).json({
        status: 'error',
        message: `Cannot delete batch with ${enrollments} enrollment(s). Please remove enrollments first.`,
      });
      return;
    }

    await batch.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Batch deleted successfully',
    });
  } catch (error) {
    logger.error('Delete batch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting batch',
    });
  }
};

// PUT /batches/:id/faculty → Assign faculty to batch
export const assignFacultyToBatch = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Only admins can assign faculty to batches',
      });
      return;
    }

    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid batch ID',
      });
      return;
    }

    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      res.status(404).json({
        status: 'error',
        message: 'Batch not found',
      });
      return;
    }

    if (!req.body || !Array.isArray(req.body.facultyIds)) {
      res.status(400).json({
        status: 'error',
        message: 'facultyIds array is required',
      });
      return;
    }

    const facultyIds = req.body.facultyIds as Array<string | number>;
    const normalizedIds = facultyIds.map((value): number => Number(value));
    if (normalizedIds.some((facultyId) => Number.isNaN(facultyId) || facultyId <= 0)) {
      res.status(400).json({
        status: 'error',
        message: 'facultyIds must be an array of valid numeric IDs',
      });
      return;
    }

    const uniqueFacultyIds = Array.from(new Set(normalizedIds));

    if (uniqueFacultyIds.length > 0) {
      const facultyMembers = await db.User.findAll({
        where: {
          id: uniqueFacultyIds,
          role: UserRole.FACULTY,
          isActive: true,
        },
        attributes: ['id', 'name', 'email', 'phone'],
      });

      if (facultyMembers.length !== uniqueFacultyIds.length) {
        const foundIds = new Set(facultyMembers.map((f) => f.id));
        const missingIds = uniqueFacultyIds.filter((id) => !foundIds.has(id));
        res.status(400).json({
          status: 'error',
          message: `Invalid faculty IDs: ${missingIds.join(', ')}`,
        });
        return;
      }
    }

    const transaction = await db.sequelize.transaction();
    try {
      await db.BatchFacultyAssignment.destroy({
        where: { batchId },
        transaction,
      });

      if (uniqueFacultyIds.length > 0) {
        const rows = uniqueFacultyIds.map((facultyId) => ({
          batchId,
          facultyId,
        }));
        await db.BatchFacultyAssignment.bulkCreate(rows, { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    const assignedFaculty =
      uniqueFacultyIds.length > 0
        ? await db.User.findAll({
            where: { id: uniqueFacultyIds },
            attributes: ['id', 'name', 'email', 'phone'],
          })
        : [];

    res.status(200).json({
      status: 'success',
      message: 'Faculty allocation updated successfully',
      data: {
        batch: {
          id: batch.id,
          title: batch.title,
        },
        assignedFaculty,
      },
    });
  } catch (error) {
    logger.error('Assign faculty to batch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while assigning faculty to batch',
    });
  }
};




