import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import db from '../models';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

interface CreateEnrollmentBody {
  studentId: number;
  batchId: number;
  enrollmentDate?: string;
  status?: string;
  paymentPlan?: Record<string, unknown>;
}

interface UpdateEnrollmentBody {
  status?: string;
  paymentPlan?: Record<string, unknown>;
}

// POST /enrollments → Create enrollment
export const createEnrollment = async (req: AuthRequest & { body: CreateEnrollmentBody }, res: Response): Promise<void> => {
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
        message: 'Only admins can create enrollments',
      });
      return;
    }

    const { studentId, batchId, enrollmentDate, status, paymentPlan } = req.body;

    // Validation
    if (!studentId || !batchId) {
      res.status(400).json({
        status: 'error',
        message: 'studentId and batchId are required',
      });
      return;
    }

    // Verify student exists
    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found',
      });
      return;
    }

    if (!student.isActive) {
      res.status(400).json({
        status: 'error',
        message: 'Student account is inactive',
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

    // Check if student is already enrolled in this batch
    const existingEnrollment = await db.Enrollment.findOne({
      where: {
        studentId,
        batchId,
      },
    });

    if (existingEnrollment) {
      res.status(400).json({
        status: 'error',
        message: 'Student is already enrolled in this batch',
      });
      return;
    }

    // Check batch capacity (only if maxCapacity is set)
    if (batch.maxCapacity) {
      const currentEnrollments = await db.Enrollment.count({
        where: { batchId },
      });

      if (currentEnrollments >= batch.maxCapacity) {
        res.status(400).json({
          status: 'error',
          message: `Batch has reached maximum capacity of ${batch.maxCapacity} students`,
        });
        return;
      }
    }

    // Create enrollment
    const enrollment = await db.Enrollment.create({
      studentId,
      batchId,
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      status: status || 'active',
      paymentPlan: paymentPlan || null,
    });

    // Fetch enrollment with relations
    const enrollmentWithDetails = await db.Enrollment.findByPk(enrollment.id, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode'],
        },
      ],
    });

    logger.info(`Enrollment created: studentId=${studentId}, batchId=${batchId}`);

    res.status(201).json({
      status: 'success',
      message: 'Student enrolled successfully',
      data: enrollmentWithDetails,
    });
  } catch (error) {
    logger.error('Create enrollment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating enrollment',
    });
  }
};

// GET /enrollments → Get all enrollments (with filters)
export const getAllEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { studentId, batchId, status } = req.query;

    const where: any = {};

    if (studentId) {
      where.studentId = parseInt(studentId as string, 10);
    }

    if (batchId) {
      where.batchId = parseInt(batchId as string, 10);
    }

    if (status) {
      where.status = status;
    }

    // If faculty, only show enrollments for batches they're assigned to
    if (req.user.role === UserRole.FACULTY) {
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
      where.batchId = where.batchId
        ? { [Op.and]: [{ [Op.eq]: where.batchId }, { [Op.in]: assignedBatchIds }] }
        : { [Op.in]: assignedBatchIds };
    }

    const enrollments = await db.Enrollment.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
          include: [
            {
              model: db.StudentProfile,
              as: 'studentProfile',
              attributes: ['id', 'documents', 'userId'],
              required: false,
            },
          ],
          required: true,
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode'],
        },
      ],
      order: [['enrollmentDate', 'DESC']],
    });

    // Enrich enrollments with fees from studentProfile if paymentPlan is empty
    const enrichedEnrollments = await Promise.all(enrollments.map(async (enrollment: any) => {
      const enrollmentJson = enrollment.toJSON() as any;
      
      // If paymentPlan is empty or null, try to get fees from studentProfile
      if (!enrollmentJson.paymentPlan || Object.keys(enrollmentJson.paymentPlan).length === 0) {
        let studentProfile = enrollmentJson.student?.studentProfile;
        
        // If studentProfile is not included, fetch it directly
        if (!studentProfile && enrollmentJson.studentId) {
          try {
            const profile = await db.StudentProfile.findOne({
              where: { userId: enrollmentJson.studentId },
              attributes: ['id', 'documents', 'userId'],
            });
            if (profile) {
              studentProfile = profile.toJSON();
            }
          } catch (error) {
            logger.error(`Error fetching studentProfile for enrollment ${enrollmentJson.id}:`, error);
          }
        }
        
        if (studentProfile?.documents) {
          // Handle documents as string (JSON) or object
          let documents = studentProfile.documents;
          if (typeof documents === 'string') {
            try {
              documents = JSON.parse(documents);
            } catch (e) {
              logger.warn(`Failed to parse documents JSON for student ${studentProfile.id}:`, e);
              documents = null;
            }
          }
          
          // Try to get enrollmentMetadata from documents
          const metadata = documents?.enrollmentMetadata;
          if (metadata) {
            const totalDeal = metadata.totalDeal !== undefined && metadata.totalDeal !== null ? Number(metadata.totalDeal) : null;
            const bookingAmount = metadata.bookingAmount !== undefined && metadata.bookingAmount !== null ? Number(metadata.bookingAmount) : null;
            
            // Calculate actual balance from payments
            let balanceAmount = null;
            if (totalDeal !== null && totalDeal !== undefined) {
              // Get all payments for this enrollment
              const payments = await db.PaymentTransaction.findAll({
                where: {
                  studentId: enrollmentJson.studentId,
                  enrollmentId: enrollmentJson.id,
                },
                attributes: ['paidAmount', 'status'],
              });
              
              // Calculate total paid amount
              const totalPaid = payments.reduce((sum, payment: any) => {
                if (payment.status === 'paid' || payment.status === 'partial') {
                  return sum + (payment.paidAmount || 0);
                }
                return sum;
              }, 0);
              
              // Calculate balance: totalDeal - bookingAmount - totalPaid
              const calculatedBalance = totalDeal - (bookingAmount || 0) - totalPaid;
              balanceAmount = Math.max(0, calculatedBalance);
            }
            
            logger.info(`Setting paymentPlan for enrollment ${enrollmentJson.id}: totalDeal=${totalDeal}, bookingAmount=${bookingAmount}, balanceAmount=${balanceAmount}`);
            
            enrollmentJson.paymentPlan = {
              totalDeal,
              bookingAmount,
              balanceAmount: balanceAmount !== null && balanceAmount !== undefined ? balanceAmount : null,
            };
          } else {
            logger.warn(`No enrollmentMetadata found in documents for enrollment ${enrollmentJson.id}, studentProfileId: ${studentProfile.id}, documents keys: ${documents ? Object.keys(documents).join(', ') : 'null'}`);
          }
        } else {
          logger.warn(`No studentProfile or documents found for enrollment ${enrollmentJson.id}, studentId: ${enrollmentJson.studentId}`);
        }
      } else {
        // Even if paymentPlan exists, recalculate balanceAmount from actual payments
        const paymentPlan = enrollmentJson.paymentPlan as any;
        if (paymentPlan.totalDeal !== null && paymentPlan.totalDeal !== undefined) {
          // Get all payments for this enrollment
          const payments = await db.PaymentTransaction.findAll({
            where: {
              studentId: enrollmentJson.studentId,
              enrollmentId: enrollmentJson.id,
            },
            attributes: ['paidAmount', 'status'],
          });
          
          // Calculate total paid amount
          const totalPaid = payments.reduce((sum, payment: any) => {
            if (payment.status === 'paid' || payment.status === 'partial') {
              return sum + (payment.paidAmount || 0);
            }
            return sum;
          }, 0);
          
          // Recalculate balance: totalDeal - bookingAmount - totalPaid
          const bookingAmount = paymentPlan.bookingAmount || 0;
          const calculatedBalance = paymentPlan.totalDeal - bookingAmount - totalPaid;
          paymentPlan.balanceAmount = Math.max(0, calculatedBalance);
        }
      }
      
      return enrollmentJson;
    }));

    res.status(200).json({
      status: 'success',
      data: enrichedEnrollments,
      count: enrichedEnrollments.length,
    });
  } catch (error) {
    logger.error('Get all enrollments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching enrollments',
    });
  }
};

// GET /enrollments/:id → Get single enrollment by ID
export const getEnrollmentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const enrollmentId = parseInt(req.params.id, 10);
    if (isNaN(enrollmentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid enrollment ID',
      });
      return;
    }

    const enrollment = await db.Enrollment.findByPk(enrollmentId, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
          include: [
            {
              model: db.StudentProfile,
              as: 'studentProfile',
              attributes: ['id', 'documents'],
              required: false,
            },
          ],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode'],
        },
      ],
    });

    if (!enrollment) {
      res.status(404).json({
        status: 'error',
        message: 'Enrollment not found',
      });
      return;
    }

    // If faculty, verify they have access to this batch
    if (req.user.role === UserRole.FACULTY) {
      const assignment = await db.BatchFacultyAssignment.findOne({
        where: {
          batchId: enrollment.batchId,
          facultyId: req.user.userId,
        },
      });

      if (!assignment) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have access to this enrollment',
        });
        return;
      }
    }

    // Enrich enrollment with fees from studentProfile if paymentPlan is empty
    const enrollmentJson = enrollment.toJSON() as any;
    if (!enrollmentJson.paymentPlan || Object.keys(enrollmentJson.paymentPlan).length === 0) {
      let studentProfile = enrollmentJson.student?.studentProfile;
      
      // If studentProfile is not included, fetch it directly
      if (!studentProfile && enrollmentJson.studentId) {
        try {
          const profile = await db.StudentProfile.findOne({
            where: { userId: enrollmentJson.studentId },
            attributes: ['id', 'documents', 'userId'],
          });
          if (profile) {
            studentProfile = profile.toJSON();
          }
        } catch (error) {
          logger.error(`Error fetching studentProfile for enrollment ${enrollmentJson.id}:`, error);
        }
      }
      
      if (studentProfile?.documents) {
        // Handle documents as string (JSON) or object
        let documents = studentProfile.documents;
        if (typeof documents === 'string') {
          try {
            documents = JSON.parse(documents);
          } catch (e) {
            logger.warn(`Failed to parse documents JSON for student ${studentProfile.id}:`, e);
            documents = null;
          }
        }
        
        // Try to get enrollmentMetadata from documents
        const metadata = documents?.enrollmentMetadata;
        if (metadata) {
          const totalDeal = metadata.totalDeal !== undefined && metadata.totalDeal !== null ? Number(metadata.totalDeal) : null;
          const bookingAmount = metadata.bookingAmount !== undefined && metadata.bookingAmount !== null ? Number(metadata.bookingAmount) : null;
          
          // Calculate actual balance from payments
          let balanceAmount = null;
          if (totalDeal !== null && totalDeal !== undefined) {
            // Get all payments for this enrollment
            const payments = await db.PaymentTransaction.findAll({
              where: {
                studentId: enrollmentJson.studentId,
                enrollmentId: enrollmentJson.id,
              },
              attributes: ['paidAmount', 'status'],
            });
            
            // Calculate total paid amount
            const totalPaid = payments.reduce((sum, payment: any) => {
              if (payment.status === 'paid' || payment.status === 'partial') {
                return sum + (payment.paidAmount || 0);
              }
              return sum;
            }, 0);
            
            // Calculate balance: totalDeal - bookingAmount - totalPaid
            const calculatedBalance = totalDeal - (bookingAmount || 0) - totalPaid;
            balanceAmount = Math.max(0, calculatedBalance);
          }
          
          logger.info(`Setting paymentPlan for enrollment ${enrollmentJson.id}: totalDeal=${totalDeal}, bookingAmount=${bookingAmount}, balanceAmount=${balanceAmount}`);
          
          enrollmentJson.paymentPlan = {
            totalDeal,
            bookingAmount,
            balanceAmount: balanceAmount !== null && balanceAmount !== undefined ? balanceAmount : null,
          };
        } else {
          logger.warn(`No enrollmentMetadata found in documents for enrollment ${enrollmentJson.id}, studentProfileId: ${studentProfile.id}`);
        }
      } else {
        logger.warn(`No studentProfile or documents found for enrollment ${enrollmentJson.id}, studentId: ${enrollmentJson.studentId}`);
      }
    } else {
      // Even if paymentPlan exists, recalculate balanceAmount from actual payments
      const paymentPlan = enrollmentJson.paymentPlan as any;
      if (paymentPlan.totalDeal !== null && paymentPlan.totalDeal !== undefined) {
        // Get all payments for this enrollment
        const payments = await db.PaymentTransaction.findAll({
          where: {
            studentId: enrollmentJson.studentId,
            enrollmentId: enrollmentJson.id,
          },
          attributes: ['paidAmount', 'status'],
        });
        
        // Calculate total paid amount
        const totalPaid = payments.reduce((sum, payment: any) => {
          if (payment.status === 'paid' || payment.status === 'partial') {
            return sum + (payment.paidAmount || 0);
          }
          return sum;
        }, 0);
        
        // Recalculate balance: totalDeal - bookingAmount - totalPaid
        const bookingAmount = paymentPlan.bookingAmount || 0;
        const calculatedBalance = paymentPlan.totalDeal - bookingAmount - totalPaid;
        paymentPlan.balanceAmount = Math.max(0, calculatedBalance);
      }
    }

    res.status(200).json({
      status: 'success',
      data: enrollmentJson,
    });
  } catch (error) {
    logger.error('Get enrollment by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching enrollment',
    });
  }
};

// PUT /enrollments/:id → Update enrollment
export const updateEnrollment = async (req: AuthRequest & { body: UpdateEnrollmentBody }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can update enrollments
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can update enrollments',
      });
      return;
    }

    const enrollmentId = parseInt(req.params.id, 10);
    if (isNaN(enrollmentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid enrollment ID',
      });
      return;
    }

    const enrollment = await db.Enrollment.findByPk(enrollmentId, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
          include: [
            {
              model: db.StudentProfile,
              as: 'studentProfile',
              attributes: ['id', 'documents'],
              required: false,
            },
          ],
        },
      ],
    });
    
    if (!enrollment) {
      res.status(404).json({
        status: 'error',
        message: 'Enrollment not found',
      });
      return;
    }

    const { status, paymentPlan } = req.body;

    // If paymentPlan is not provided, try to sync from studentProfile
    let finalPaymentPlan = paymentPlan;
    if (paymentPlan === undefined) {
      const enrollmentJson = enrollment.toJSON() as any;
      const studentProfile = enrollmentJson.student?.studentProfile;
      if (studentProfile?.documents) {
        // Handle documents as string (JSON) or object
        let documents = studentProfile.documents;
        if (typeof documents === 'string') {
          try {
            documents = JSON.parse(documents);
          } catch (e) {
            logger.warn(`Failed to parse documents JSON for student ${studentProfile.id}:`, e);
            documents = null;
          }
        }
        
        // Try to get enrollmentMetadata from documents
        const metadata = documents?.enrollmentMetadata;
        if (metadata) {
          finalPaymentPlan = {
            totalDeal: metadata.totalDeal !== undefined && metadata.totalDeal !== null ? metadata.totalDeal : null,
            bookingAmount: metadata.bookingAmount !== undefined && metadata.bookingAmount !== null ? metadata.bookingAmount : null,
            balanceAmount: metadata.balanceAmount !== undefined && metadata.balanceAmount !== null ? metadata.balanceAmount : null,
          };
          // Update enrollment with synced paymentPlan
          await enrollment.update({
            paymentPlan: finalPaymentPlan,
          });
          logger.info(`Synced paymentPlan from studentProfile for enrollment ${enrollmentId}`);
        } else {
          finalPaymentPlan = enrollment.paymentPlan;
        }
      } else {
        finalPaymentPlan = enrollment.paymentPlan;
      }
    }

    // Update enrollment
    await enrollment.update({
      status: status !== undefined ? status : enrollment.status,
      paymentPlan: finalPaymentPlan,
    });

    // Fetch updated enrollment with relations
    const updatedEnrollment = await db.Enrollment.findByPk(enrollment.id, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
          include: [
            {
              model: db.StudentProfile,
              as: 'studentProfile',
              attributes: ['id', 'documents'],
              required: false,
            },
          ],
        },
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'mode'],
        },
      ],
    });

    // Enrich with fees if needed
    const enrollmentJson = updatedEnrollment?.toJSON() as any;
    if (enrollmentJson && (!enrollmentJson.paymentPlan || Object.keys(enrollmentJson.paymentPlan).length === 0)) {
      const studentProfile = enrollmentJson.student?.studentProfile;
      if (studentProfile?.documents) {
        // Handle documents as string (JSON) or object
        let documents = studentProfile.documents;
        if (typeof documents === 'string') {
          try {
            documents = JSON.parse(documents);
          } catch (e) {
            logger.warn(`Failed to parse documents JSON for student ${studentProfile.id}:`, e);
            documents = null;
          }
        }
        
        // Try to get enrollmentMetadata from documents
        const metadata = documents?.enrollmentMetadata;
        if (metadata) {
          enrollmentJson.paymentPlan = {
            totalDeal: metadata.totalDeal !== undefined && metadata.totalDeal !== null ? metadata.totalDeal : null,
            bookingAmount: metadata.bookingAmount !== undefined && metadata.bookingAmount !== null ? metadata.bookingAmount : null,
            balanceAmount: metadata.balanceAmount !== undefined && metadata.balanceAmount !== null ? metadata.balanceAmount : null,
          };
        }
      }
    }

    logger.info(`Enrollment updated: enrollmentId=${enrollmentId}`);

    res.status(200).json({
      status: 'success',
      message: 'Enrollment updated successfully',
      data: enrollmentJson || updatedEnrollment,
    });
  } catch (error) {
    logger.error('Update enrollment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating enrollment',
    });
  }
};

// DELETE /enrollments/:id → Delete enrollment
export const deleteEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only Admin or SuperAdmin can delete enrollments
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can delete enrollments',
      });
      return;
    }

    const enrollmentId = parseInt(req.params.id, 10);
    if (isNaN(enrollmentId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid enrollment ID',
      });
      return;
    }

    const enrollment = await db.Enrollment.findByPk(enrollmentId);
    if (!enrollment) {
      res.status(404).json({
        status: 'error',
        message: 'Enrollment not found',
      });
      return;
    }

    await enrollment.destroy();

    logger.info(`Enrollment deleted: enrollmentId=${enrollmentId}`);

    res.status(200).json({
      status: 'success',
      message: 'Enrollment deleted successfully',
    });
  } catch (error) {
    logger.error('Delete enrollment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting enrollment',
    });
  }
};

export default {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
};





