import db from '../models';
import { PaymentStatus } from '../models/PaymentTransaction';
import { BatchMode } from '../models/Batch';

/**
 * Service to handle payment synchronization for students
 */
export class PaymentSyncService {
  
  /**
   * Sync payment data for a specific student
   */
  static async syncStudentPaymentData(studentId: number): Promise<void> {
    try {
      console.log(`Syncing payment data for student ${studentId}`);
      
      // Get student profile to access enrollment metadata
      const profile = await db.StudentProfile.findOne({
        where: { userId: studentId },
        attributes: ['documents']
      });

      if (!profile || !profile.documents) {
        console.log(`No profile or documents found for student ${studentId}`);
        return;
      }

      let parsedDocuments: any = {};
      if (typeof profile.documents === 'string') {
        try {
          parsedDocuments = JSON.parse(profile.documents);
        } catch (e) {
          console.error(`Error parsing documents for student ${studentId}:`, e);
          return;
        }
      } else {
        parsedDocuments = profile.documents;
      }

      const enrollmentMetadata: any = parsedDocuments?.enrollmentMetadata || {};
      
      if (!enrollmentMetadata || Object.keys(enrollmentMetadata).length === 0) {
        console.log(`No enrollment metadata found for student ${studentId}`);
        return;
      }

      // Check if student already has payments
      const existingPayments = await db.PaymentTransaction.findAll({
        where: { studentId }
      });

      if (existingPayments.length > 0) {
        console.log(`Student ${studentId} already has ${existingPayments.length} payment(s), skipping creation`);
        // Still update balances if needed
        await this.updatePaymentPlanBalancesForStudent(studentId);
        return;
      }

      // Check if student has an enrollment
      let enrollment = await db.Enrollment.findOne({
        where: { studentId }
      });

      // Create enrollment if it doesn't exist
      if (!enrollment) {
        console.log(`Creating enrollment for student ${studentId}`);
        
        // Find a batch to assign the student to (using the first available batch)
        let batch = await db.Batch.findOne();
        if (!batch) {
          console.log(`No batches found, creating a default batch for student ${studentId}`);
          batch = await db.Batch.create({
            title: 'Default Batch',
            courseId: null,
            mode: BatchMode.OFFLINE, // Required field
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
            maxCapacity: 50,
            status: 'active',
            schedule: [],
          });
        }

        enrollment = await db.Enrollment.create({
          studentId,
          batchId: batch.id,
          enrollmentDate: enrollmentMetadata.dateOfAdmission ? new Date(enrollmentMetadata.dateOfAdmission) : new Date(),
          status: 'active',
          paymentPlan: {
            totalDeal: enrollmentMetadata.totalDeal || null,
            bookingAmount: enrollmentMetadata.bookingAmount || null,
            balanceAmount: enrollmentMetadata.balanceAmount || null,
            emiPlan: enrollmentMetadata.emiPlan || null,
            emiPlanDate: enrollmentMetadata.emiPlanDate || null,
            lumpSumPayment: enrollmentMetadata.lumpSumPayment || null,
          }
        });
      }

      // Create payment transactions based on enrollment metadata
      const { bookingAmount, balanceAmount, totalDeal, emiPlan, emiInstallments, lumpSumPayment, lumpSumPayments } = enrollmentMetadata;

      // Create booking amount payment if exists
      if (bookingAmount !== undefined && bookingAmount !== null && bookingAmount >= 0) {
        await db.PaymentTransaction.create({
          studentId,
          enrollmentId: enrollment.id,
          amount: bookingAmount,
          paidAmount: bookingAmount, // Booking amount is typically considered as paid
          dueDate: enrollmentMetadata.dateOfAdmission ? new Date(enrollmentMetadata.dateOfAdmission) : new Date(),
          status: bookingAmount > 0 ? PaymentStatus.PAID : PaymentStatus.UNPAID,
          notes: 'Initial booking amount from enrollment',
        });
        console.log(`Created booking payment: Amount ${bookingAmount}, Status: ${bookingAmount > 0 ? 'PAID' : 'UNPAID'}`);
      }

      // Create EMI payments if applicable
      if (emiPlan && emiInstallments && Array.isArray(emiInstallments) && emiInstallments.length > 0) {
        for (const installment of emiInstallments) {
          if (installment.amount && installment.amount > 0) {
            await db.PaymentTransaction.create({
              studentId,
              enrollmentId: enrollment.id,
              amount: installment.amount,
              paidAmount: 0,
              dueDate: installment.dueDate ? new Date(installment.dueDate) : new Date(),
              status: PaymentStatus.UNPAID,
              notes: `EMI Installment - Month ${installment.month || 'N/A'}`,
            });
            console.log(`Created EMI payment: Amount ${installment.amount}, Due: ${installment.dueDate || 'N/A'}`);
          }
        }
      }
      // Create lump sum payments if applicable
      else if (lumpSumPayment) {
        if (balanceAmount && balanceAmount > 0) {
          if (lumpSumPayments && Array.isArray(lumpSumPayments) && lumpSumPayments.length > 0) {
            for (const payment of lumpSumPayments) {
              if (payment.amount && payment.date) {
                await db.PaymentTransaction.create({
                  studentId,
                  enrollmentId: enrollment.id,
                  amount: payment.amount,
                  paidAmount: 0,
                  dueDate: new Date(payment.date),
                  status: PaymentStatus.UNPAID,
                  notes: `Lump Sum payment - Date: ${payment.date}, Amount: ${payment.amount}`,
                });
                console.log(`Created lump sum payment: Amount ${payment.amount}, Due: ${payment.date}`);
              }
            }
          } else {
            // Create single lump sum payment
            const dueDate = enrollmentMetadata.nextPayDate ? new Date(enrollmentMetadata.nextPayDate) : new Date();
            
            await db.PaymentTransaction.create({
              studentId,
              enrollmentId: enrollment.id,
              amount: balanceAmount,
              paidAmount: 0,
              dueDate,
              status: PaymentStatus.UNPAID,
              notes: 'Lump Sum payment with next payment date',
            });
            console.log(`Created lump sum payment: Amount ${balanceAmount}, Due: ${dueDate.toISOString()}`);
          }
        } else if (balanceAmount === 0 && totalDeal && totalDeal > 0) {
          // Full payment received upfront
          await db.PaymentTransaction.create({
            studentId,
            enrollmentId: enrollment.id,
            amount: totalDeal,
            paidAmount: totalDeal,
            dueDate: enrollmentMetadata.dateOfAdmission ? new Date(enrollmentMetadata.dateOfAdmission) : new Date(),
            paidAt: enrollmentMetadata.dateOfAdmission ? new Date(enrollmentMetadata.dateOfAdmission) : new Date(),
            status: PaymentStatus.PAID,
            notes: 'Full payment received - Lump sum (Balance: ₹0)',
          });
          console.log(`Created full payment record: Amount ${totalDeal}, Status: PAID`);
        }
      }
      // Create balance payment if neither EMI nor Lump Sum is selected
      else if (balanceAmount && balanceAmount > 0) {
        await db.PaymentTransaction.create({
          studentId,
          enrollmentId: enrollment.id,
          amount: balanceAmount,
          paidAmount: 0,
          dueDate: enrollmentMetadata.dateOfAdmission ? new Date(enrollmentMetadata.dateOfAdmission) : new Date(),
          status: PaymentStatus.UNPAID,
          notes: 'Balance amount from enrollment',
        });
        console.log(`Created balance payment: Amount ${balanceAmount}`);
      }

      // Update payment plan balances after creating payments
      await this.updatePaymentPlanBalancesForStudent(studentId);
    } catch (error) {
      console.error(`Error syncing payment data for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Update payment plan balances for all students
   */
  static async syncAllStudentsPaymentData(): Promise<void> {
    try {
      console.log('Syncing payment data for all students...');
      
      const students = await db.User.findAll({
        where: { role: 'student' },
        attributes: ['id']
      });

      for (const student of students) {
        await this.syncStudentPaymentData(student.id);
      }

      console.log(`Successfully synced payment data for ${students.length} students`);
    } catch (error) {
      console.error('Error syncing all students payment data:', error);
      throw error;
    }
  }

  /**
   * Update payment plan balances for a specific student
   */
  static async updatePaymentPlanBalancesForStudent(studentId: number): Promise<void> {
    try {
      console.log(`Updating payment plan balances for student ${studentId}`);

      // Get all enrollments for the student
      const enrollments = await db.Enrollment.findAll({
        where: { studentId }
      });

      for (const enrollment of enrollments) {
        // Update payment plan balance based on actual payments
        await this.updatePaymentPlanBalanceFromPayments(studentId, enrollment.id);
      }
    } catch (error) {
      console.error(`Error updating payment plan balances for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Update payment plan balance based on actual payments for a specific enrollment
   */
  private static async updatePaymentPlanBalanceFromPayments(studentId: number, enrollmentId: number): Promise<void> {
    try {
      console.log(`Updating payment plan balance for student ${studentId}, enrollment ${enrollmentId} based on actual payments...`);
      
      // Get all payments for this student/enrollment
      const payments = await db.PaymentTransaction.findAll({
        where: { studentId, enrollmentId },
        attributes: ['amount', 'paidAmount', 'status'],
      });

      // Calculate total paid amount (sum of all paidAmounts from paid/partial payments)
      const totalPaid = payments.reduce((sum, payment) => {
        if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.PARTIAL) {
          return sum + (Number(payment.paidAmount) || 0);
        }
        return sum;
      }, 0);

      // Calculate total amount due
      const totalAmount = payments.reduce((sum, payment) => {
        return sum + (Number(payment.amount) || 0);
      }, 0);

      // Calculate remaining balance
      const balanceAmount = totalAmount - totalPaid;

      // Get enrollment to update its payment plan
      const enrollment = await db.Enrollment.findByPk(enrollmentId);
      if (enrollment) {
        const currentPaymentPlan = enrollment.paymentPlan || {};
        
        // Update the payment plan with the calculated balance
        const updatedPaymentPlan = {
          ...currentPaymentPlan,
          balanceAmount: Math.max(0, balanceAmount), // Ensure balance doesn't go negative
        };

        await enrollment.update({ paymentPlan: updatedPaymentPlan });
        console.log(`Updated enrollment ${enrollmentId} paymentPlan: total=${totalAmount}, paid=${totalPaid}, balance=${balanceAmount}`);
      }

      // Also update student profile if it exists
      const studentProfile = await db.StudentProfile.findOne({
        where: { userId: studentId }
      });

      if (studentProfile && studentProfile.documents) {
        let documents = studentProfile.documents;
        if (typeof documents === 'string') {
          try {
            documents = JSON.parse(documents);
          } catch (e) {
            console.warn(`Failed to parse documents JSON for student ${studentId}:`, e);
            documents = {};
          }
        }

        if (documents && typeof documents === 'object' && documents.enrollmentMetadata) {
          (documents.enrollmentMetadata as any).balanceAmount = Math.max(0, balanceAmount);
          await db.StudentProfile.update(
            { documents },
            { where: { userId: studentId } }
          );
          console.log(`Updated studentProfile ${studentId} documents: balanceAmount=${Math.max(0, balanceAmount)}`);
        }
      }

    } catch (error) {
      console.error(`Error updating payment plan balance for student ${studentId}, enrollment ${enrollmentId}:`, error);
      throw error;
    }
  }

  /**
   * Verify that payment data is properly synchronized for a student
   */
  static async verifyPaymentSync(studentId: number): Promise<boolean> {
    try {
      // Check if student has payment transactions
      const payments = await db.PaymentTransaction.findAll({
        where: { studentId },
        include: [
          {
            model: db.User,
            as: 'student',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: db.Enrollment,
            as: 'enrollment',
            include: [
              {
                model: db.Batch,
                as: 'batch',
                attributes: ['id', 'title']
              }
            ]
          }
        ]
      });

      console.log(`Student ${studentId} has ${payments.length} payment(s)`);
      
      // Log payment details
      for (const payment of payments) {
        console.log(`  Payment ID: ${payment.id}, Amount: ${payment.amount}, Paid: ${payment.paidAmount}, Status: ${payment.status}, Due: ${payment.dueDate}`);
      }

      return payments.length > 0;
    } catch (error) {
      console.error(`Error verifying payment sync for student ${studentId}:`, error);
      return false;
    }
  }
}