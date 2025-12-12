import { Response } from 'express';
// @ts-ignore - pdfmake doesn't have type definitions
import PdfPrinter from 'pdfmake';
import path from 'path';
import fs from 'fs';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { PaymentStatus } from '../models/PaymentTransaction';
import { logger } from '../utils/logger';
import { UserRole } from '../models/User';

// Create receipts directory
const receiptsDir = path.join(__dirname, '../../receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// Helper function to update payment plan balance based on payments
const updatePaymentPlanBalance = async (studentId: number, enrollmentId?: number | null): Promise<void> => {
  try {
    // Get all payments for this student/enrollment
    const whereClause: any = { studentId };
    if (enrollmentId) {
      whereClause.enrollmentId = enrollmentId;
    }
    
    const payments = await db.PaymentTransaction.findAll({
      where: whereClause,
      attributes: ['paidAmount', 'status'],
    });
    
    // Calculate total paid amount (sum of all paidAmounts from paid/partial payments)
    const totalPaid = payments.reduce((sum, payment) => {
      if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.PARTIAL) {
        return sum + (payment.paidAmount || 0);
      }
      return sum;
    }, 0);
    
    // Get enrollment if enrollmentId is provided
    if (enrollmentId) {
      const enrollment = await db.Enrollment.findByPk(enrollmentId, {
        include: [
          {
            model: db.User,
            as: 'student',
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
      
      if (enrollment) {
        const enrollmentJson = enrollment.toJSON() as any;
        let paymentPlan = enrollmentJson.paymentPlan;
        
        // If paymentPlan doesn't exist, try to get from studentProfile
        if (!paymentPlan || Object.keys(paymentPlan).length === 0) {
          const studentProfile = enrollmentJson.student?.studentProfile;
          if (studentProfile?.documents) {
            let documents = studentProfile.documents;
            if (typeof documents === 'string') {
              try {
                documents = JSON.parse(documents);
              } catch (e) {
                logger.warn(`Failed to parse documents JSON:`, e);
                documents = null;
              }
            }
            const metadata = documents?.enrollmentMetadata as any;
            if (metadata) {
              paymentPlan = {
                totalDeal: metadata.totalDeal !== undefined && metadata.totalDeal !== null ? Number(metadata.totalDeal) : null,
                bookingAmount: metadata.bookingAmount !== undefined && metadata.bookingAmount !== null ? Number(metadata.bookingAmount) : null,
                balanceAmount: metadata.balanceAmount !== undefined && metadata.balanceAmount !== null ? Number(metadata.balanceAmount) : null,
              };
            }
          }
        }
        
        if (paymentPlan && (paymentPlan.totalDeal !== null && paymentPlan.totalDeal !== undefined)) {
          const totalDeal = Number(paymentPlan.totalDeal);
          const bookingAmount = Number(paymentPlan.bookingAmount || 0);
          
          // Calculate new balance: totalDeal - bookingAmount - totalPaid
          const newBalance = totalDeal - bookingAmount - totalPaid;
          
          // Update enrollment paymentPlan
          const updatedPaymentPlan = {
            ...paymentPlan,
            balanceAmount: Math.max(0, newBalance), // Ensure balance doesn't go negative
          };
          
          await enrollment.update({ paymentPlan: updatedPaymentPlan });
          logger.info(`Updated enrollment ${enrollmentId} paymentPlan: balanceAmount=${updatedPaymentPlan.balanceAmount}, totalPaid=${totalPaid}`);
          
          // Also update studentProfile documents if it exists
          const studentProfile = enrollmentJson.student?.studentProfile;
          if (studentProfile?.documents) {
            let documents = studentProfile.documents;
            if (typeof documents === 'string') {
              try {
                documents = JSON.parse(documents);
              } catch (e) {
                logger.warn(`Failed to parse documents JSON:`, e);
                documents = {};
              }
            }
            
            if (documents && typeof documents === 'object' && documents.enrollmentMetadata) {
              (documents.enrollmentMetadata as any).balanceAmount = Math.max(0, newBalance);
              await db.StudentProfile.update(
                { documents },
                { where: { id: studentProfile.id } }
              );
              logger.info(`Updated studentProfile ${studentProfile.id} documents: balanceAmount=${Math.max(0, newBalance)}`);
            }
          }
        }
      }
    } else {
      // No enrollmentId - update studentProfile directly
      const student = await db.User.findByPk(studentId, {
        include: [
          {
            model: db.StudentProfile,
            as: 'studentProfile',
            attributes: ['id', 'documents'],
            required: false,
          },
        ],
      });
      
      if (student?.studentProfile?.documents) {
        let documents = student.studentProfile.documents;
        if (typeof documents === 'string') {
          try {
            documents = JSON.parse(documents);
          } catch (e) {
            logger.warn(`Failed to parse documents JSON:`, e);
            documents = {};
          }
        }
        
        if (documents && typeof documents === 'object' && documents.enrollmentMetadata) {
          const metadata: any = documents.enrollmentMetadata as any;
          const totalDeal = metadata?.totalDeal !== undefined && metadata?.totalDeal !== null ? Number(metadata.totalDeal) : null;
          const bookingAmount = metadata?.bookingAmount !== undefined && metadata?.bookingAmount !== null ? Number(metadata.bookingAmount) : 0;
          
          if (totalDeal !== null && totalDeal !== undefined) {
            const newBalance = totalDeal - bookingAmount - totalPaid;
            const enrollmentMetadata: any = documents.enrollmentMetadata as any;
            enrollmentMetadata.balanceAmount = Math.max(0, newBalance);
            
            await db.StudentProfile.update(
              { documents },
              { where: { id: student.studentProfile.id } }
            );
            logger.info(`Updated studentProfile ${student.studentProfile.id} documents: balanceAmount=${Math.max(0, newBalance)}, totalPaid=${totalPaid}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Error updating payment plan balance for student ${studentId}, enrollment ${enrollmentId}:`, error);
    // Don't throw - this is a background update
  }
};

// Generate receipt number
const generateReceiptNumber = (paymentId: number, date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `PA/RCP/${year}${month}${day}/${String(paymentId).padStart(6, '0')}`;
};

// Generate PDF receipt matching the sample format
const generateReceiptPDF = async (
  receiptNumber: string,
  studentName: string,
  studentEmail: string,
  studentPhone: string | null,
  _amount: number,
  paidAmount: number,
  paymentMethod: string | null,
  transactionId: string | null,
  paymentDate: Date,
  courseName: string | null,
  notes: string | null
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique',
        },
      };

      const printer = new PdfPrinter(fonts);

      const filename = `receipt_${receiptNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
      const filepath = path.join(receiptsDir, filename);

      // Format date
      const formattedDate = paymentDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Format amount in words (simplified)
      const formatAmountInWords = (amount: number): string => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        if (amount === 0) return 'Zero';
        if (amount < 10) return ones[amount];
        if (amount < 20) return teens[amount - 10];
        if (amount < 100) return tens[Math.floor(amount / 10)] + (amount % 10 !== 0 ? ' ' + ones[amount % 10] : '');
        if (amount < 1000) {
          const hundreds = Math.floor(amount / 100);
          const remainder = amount % 100;
          return ones[hundreds] + ' Hundred' + (remainder !== 0 ? ' ' + formatAmountInWords(remainder) : '');
        }
        if (amount < 100000) {
          const thousands = Math.floor(amount / 1000);
          const remainder = amount % 1000;
          return formatAmountInWords(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + formatAmountInWords(remainder) : '');
        }
        return amount.toString();
      };

      const amountInWords = formatAmountInWords(Math.floor(paidAmount)) + ' Rupees Only';

      // Document definition matching receipt format
      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 60, 40, 60],
        content: [
          // Header with logo area
          {
            columns: [
              {
                width: '*',
                stack: [
                  {
                    text: 'PRIME ACADEMY',
                    fontSize: 24,
                    bold: true,
                    color: '#1a365d',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: '401, Shilp Square B, Opp. Sales India, Nr. Himalaya Mall',
                    fontSize: 10,
                    color: '#4a5568',
                    margin: [0, 0, 0, 2],
                  },
                  {
                    text: 'Drive-In-Road, Ahmedabad - 380052',
                    fontSize: 10,
                    color: '#4a5568',
                    margin: [0, 0, 0, 2],
                  },
                  {
                    text: 'Phone: +91 1234567890 | Email: info@primeacademy.com',
                    fontSize: 9,
                    color: '#718096',
                    margin: [0, 0, 0, 10],
                  },
                ],
              },
              {
                width: 'auto',
                stack: [
                  {
                    text: 'RECEIPT',
                    fontSize: 20,
                    bold: true,
                    color: '#1a365d',
                    alignment: 'right',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: receiptNumber,
                    fontSize: 11,
                    color: '#4a5568',
                    alignment: 'right',
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 20],
          },
          
          // Horizontal line
          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: 515,
                y2: 0,
                lineWidth: 0.78,
                lineColor: '#cbd5e0',
              },
            ],
            margin: [0, 0, 0, 20],
          },

          // Receipt Details Section
          {
            columns: [
              {
                width: '*',
                stack: [
                  {
                    text: 'Received from:',
                    fontSize: 10,
                    color: '#4a5568',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: studentName,
                    fontSize: 12,
                    bold: true,
                    color: '#1a365d',
                    margin: [0, 0, 0, 2],
                  },
                  {
                    text: studentEmail || '',
                    fontSize: 10,
                    color: '#718096',
                    margin: [0, 0, 0, 2],
                  },
                  {
                    text: studentPhone || '',
                    fontSize: 10,
                    color: '#718096',
                    margin: [0, 0, 0, 10],
                  },
                ],
              },
              {
                width: 'auto',
                stack: [
                  {
                    text: 'Date:',
                    fontSize: 10,
                    color: '#4a5568',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: formattedDate,
                    fontSize: 11,
                    bold: true,
                    color: '#1a365d',
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 20],
          },

          // Payment Details Table
          {
            table: {
              widths: ['*', 120],
              body: [
                [
                  {
                    text: 'Description',
                    fontSize: 11,
                    bold: true,
                    color: '#1a365d',
                    fillColor: '#edf2f7',
                    margin: [8, 6, 8, 6],
                  },
                  {
                    text: 'Amount (₹)',
                    fontSize: 11,
                    bold: true,
                    color: '#1a365d',
                    fillColor: '#edf2f7',
                    alignment: 'right',
                    margin: [8, 6, 8, 6],
                  },
                ],
                [
                  {
                    text: courseName || 'Course Fee Payment',
                    fontSize: 10,
                    color: '#2d3748',
                    margin: [8, 8, 8, 8],
                  },
                  {
                    text: `₹ ${paidAmount.toFixed(2)}`,
                    fontSize: 11,
                    bold: true,
                    color: '#1a365d',
                    alignment: 'right',
                    margin: [8, 8, 8, 8],
                  },
                ],
              ],
            },
            margin: [0, 0, 0, 20],
          },

          // Amount in words
          {
            text: `Amount in Words: ${amountInWords}`,
            fontSize: 10,
            color: '#4a5568',
            italics: true,
            margin: [0, 0, 0, 20],
          },

          // Payment Method and Transaction Details
          {
            columns: [
              {
                width: '*',
                stack: [
                  paymentMethod ? {
                    text: `Payment Method: ${paymentMethod}`,
                    fontSize: 10,
                    color: '#4a5568',
                    margin: [0, 0, 0, 5],
                  } : null,
                  transactionId ? {
                    text: `Transaction ID: ${transactionId}`,
                    fontSize: 10,
                    color: '#4a5568',
                    margin: [0, 0, 0, 5],
                  } : null,
                ].filter(Boolean),
              },
              {
                width: 'auto',
                stack: [
                  {
                    text: 'Total Amount:',
                    fontSize: 10,
                    color: '#4a5568',
                    alignment: 'right',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: `₹ ${paidAmount.toFixed(2)}`,
                    fontSize: 16,
                    bold: true,
                    color: '#1a365d',
                    alignment: 'right',
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 20],
          },

          // Notes if available
          notes ? {
            text: `Notes: ${notes}`,
            fontSize: 9,
            color: '#718096',
            margin: [0, 0, 0, 30],
          } : null,

          // Horizontal line
          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: 515,
                y2: 0,
                lineWidth: 0.78,
                lineColor: '#cbd5e0',
              },
            ],
            margin: [0, 20, 0, 20],
          },

          // Footer
          {
            columns: [
              {
                width: '*',
                stack: [
                  {
                    text: 'Authorized Signature',
                    fontSize: 10,
                    color: '#4a5568',
                    margin: [0, 40, 0, 0],
                  },
                ],
              },
              {
                width: 'auto',
                stack: [
                  {
                    text: 'PRIME ACADEMY',
                    fontSize: 10,
                    bold: true,
                    color: '#1a365d',
                    alignment: 'right',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: 'This is a computer generated receipt.',
                    fontSize: 8,
                    color: '#a0aec0',
                    alignment: 'right',
                    italics: true,
                  },
                ],
              },
            ],
          },
        ].filter(Boolean),
        defaultStyle: {
          font: 'Roboto',
        },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const stream = fs.createWriteStream(filepath);
      pdfDoc.pipe(stream);
      pdfDoc.end();

      stream.on('finish', () => {
        resolve(`/receipts/${filename}`);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const formatPayment = (payment: any) => {
  const json = payment.toJSON();
  return {
    id: json.id,
    studentId: json.studentId,
    enrollmentId: json.enrollmentId,
    amount: Number(json.amount),
    paidAmount: json.paidAmount !== null && json.paidAmount !== undefined ? Number(json.paidAmount) : 0,
    dueDate: json.dueDate,
    paidDate: json.paidAt,
    status: json.status,
    receiptUrl: json.receiptUrl,
    paymentMethod: json.paymentMethod,
    transactionId: json.transactionId,
    notes: json.notes,
    student: json.student || null,
    enrollment: json.enrollment
      ? {
          id: json.enrollment.id,
          batchId: json.enrollment.batchId,
          batch: json.enrollment.batch
            ? {
                id: json.enrollment.batch.id,
                title: json.enrollment.batch.title,
              }
            : null,
        }
      : null,
  };
};

const ensureAdminAccess = (req: AuthRequest, res: Response): boolean => {
  if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN)) {
    res.status(403).json({
      status: 'error',
      message: 'Only admins can manage payments',
    });
    return false;
  }
  return true;
};

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const { studentId, status } = req.query;
    const where: Record<string, any> = {};

    if (studentId) {
      const parsedId = Number(studentId);
      if (Number.isNaN(parsedId)) {
        res.status(400).json({ status: 'error', message: 'Invalid studentId' });
        return;
      }
      where.studentId = parsedId;
    }

    if (status) {
      const normalizedStatus = String(status).toLowerCase() as PaymentStatus;
      if (!Object.values(PaymentStatus).includes(normalizedStatus)) {
        res.status(400).json({
          status: 'error',
          message: `Invalid status. Allowed values: ${Object.values(PaymentStatus).join(', ')}`,
        });
        return;
      }
      where.status = normalizedStatus;
    }

    let payments: any[] = [];
    try {
      payments = await db.PaymentTransaction.findAll({
        where,
        include: [
          { 
            model: db.User, 
            as: 'student', 
            attributes: ['id', 'name', 'email', 'phone'],
            required: false,
          },
          {
            model: db.Enrollment,
            as: 'enrollment',
            required: false,
            include: [{ 
              model: db.Batch, 
              as: 'batch', 
              attributes: ['id', 'title'],
              required: false,
            }],
          },
        ],
        order: [['dueDate', 'DESC'], ['id', 'DESC']],
      });
    } catch (queryError: any) {
      logger.error('Get payments query error:', queryError);
      // Try without includes if query fails
      try {
        payments = await db.PaymentTransaction.findAll({
          where,
          order: [['dueDate', 'DESC'], ['id', 'DESC']],
        });
        logger.warn('Fetched payments without relations due to query error');
      } catch (fallbackError: any) {
        logger.error('Get payments fallback error:', fallbackError);
        throw new Error(`Failed to fetch payments: ${fallbackError.message}`);
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        payments: payments.map(formatPayment),
      },
    });
  } catch (error: any) {
    logger.error('Get payments error:', error);
    logger.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to load payments',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const paymentId = Number(req.params.paymentId);
    if (Number.isNaN(paymentId)) {
      res.status(400).json({ status: 'error', message: 'Invalid payment id' });
      return;
    }

    const payment = await db.PaymentTransaction.findByPk(paymentId, {
      include: [
        { model: db.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'] },
        {
          model: db.Enrollment,
          as: 'enrollment',
          include: [{ model: db.Batch, as: 'batch', attributes: ['id', 'title'] }],
        },
      ],
    });

    if (!payment) {
      res.status(404).json({
        status: 'error',
        message: 'Payment not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        payment: formatPayment(payment),
      },
    });
  } catch (error) {
    logger.error('Get payment error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to load payment',
    });
  }
};

export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const { studentId, enrollmentId, amount, dueDate, notes, paymentMethod, transactionId } = req.body;

    if (!studentId || !dueDate) {
      res.status(400).json({
        status: 'error',
        message: 'studentId and dueDate are required',
      });
      return;
    }

    // Fetch student with profile first to check for fees
    const student = await db.User.findByPk(studentId, {
      include: [
        {
          model: db.StudentProfile,
          as: 'studentProfile',
          attributes: ['id', 'documents'],
          required: false,
        },
      ],
    });
    if (!student || student.role !== UserRole.STUDENT) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student selected',
      });
      return;
    }

    // Validate amount
    if (!amount) {
      res.status(400).json({
        status: 'error',
        message: 'Amount is required',
      });
      return;
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Amount must be greater than zero',
      });
      return;
    }

    let enrollment: any = null;
    if (enrollmentId) {
      try {
        enrollment = await db.Enrollment.findByPk(enrollmentId, {
          include: [{ model: db.Batch, as: 'batch', attributes: ['id', 'title'], required: false }],
        });
        if (!enrollment) {
          res.status(400).json({
            status: 'error',
            message: 'Invalid enrollment selected',
          });
          return;
        }
        
        // If amount is not provided, try to get it from enrollment paymentPlan
        if (!amount && enrollment.paymentPlan) {
          const paymentPlan = enrollment.paymentPlan as any;
          const suggestedAmount = paymentPlan.balanceAmount || paymentPlan.totalDeal || paymentPlan.bookingAmount;
          if (suggestedAmount && suggestedAmount > 0) {
            logger.info(`Auto-suggesting amount ${suggestedAmount} from enrollment ${enrollmentId} paymentPlan`);
            // Don't auto-set, just log - let frontend handle it
          }
        }
      } catch (enrollmentError: any) {
        logger.error('Error fetching enrollment:', enrollmentError);
        res.status(400).json({
          status: 'error',
          message: 'Failed to validate enrollment',
        });
        return;
      }
    }

    const payment = await db.PaymentTransaction.create({
      studentId,
      enrollmentId: enrollmentId || null,
      amount: parsedAmount,
      paidAmount: 0,
      dueDate: new Date(dueDate),
      status: PaymentStatus.PENDING,
      notes: notes || null,
      paymentMethod: paymentMethod || null,
      transactionId: transactionId || null,
    });

    // Try to fetch with relations, but don't fail if associations aren't available
    let paymentWithRelations;
    try {
      paymentWithRelations = await db.PaymentTransaction.findByPk(payment.id, {
        include: [
          { model: db.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'], required: false },
          {
            model: db.Enrollment,
            as: 'enrollment',
            required: false,
            include: [{ model: db.Batch, as: 'batch', attributes: ['id', 'title'], required: false }],
          },
        ],
      });
    } catch (includeError) {
      logger.warn('Failed to fetch payment with relations, using basic payment:', includeError);
      paymentWithRelations = payment;
    }

    // Update payment plan balance synchronously to ensure it's updated
    try {
      await updatePaymentPlanBalance(studentId, enrollmentId || null);
      logger.info(`Payment plan balance updated for student ${studentId}, enrollment ${enrollmentId || 'none'}`);
    } catch (err) {
      logger.error('Payment plan balance update failed:', err);
      // Don't fail the payment creation if balance update fails
    }

    res.status(201).json({
      status: 'success',
      message: 'Payment created successfully',
      data: {
        payment: paymentWithRelations ? formatPayment(paymentWithRelations) : formatPayment(payment),
      },
    });
  } catch (error: any) {
    logger.error('Create payment error', error);
    logger.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create payment',
      ...(process.env.NODE_ENV === 'development' && {
        error: error?.message,
        details: error?.errors || error?.parent?.message,
      }),
    });
  }
};

export const updatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const paymentId = Number(req.params.paymentId);
    if (Number.isNaN(paymentId)) {
      res.status(400).json({ status: 'error', message: 'Invalid payment id' });
      return;
    }

    const payment = await db.PaymentTransaction.findByPk(paymentId);
    if (!payment) {
      res.status(404).json({
        status: 'error',
        message: 'Payment not found',
      });
      return;
    }

    const {
      status,
      paidDate,
      paymentMethod,
      transactionId,
      notes,
      paidAmount,
      receiptUrl,
    }: {
      status?: PaymentStatus;
      paidDate?: string;
      paymentMethod?: string;
      transactionId?: string;
      notes?: string;
      paidAmount?: number;
      receiptUrl?: string;
    } = req.body;

    const updates: Record<string, any> = {};

    if (status) {
      const normalizedStatus = status.toLowerCase() as PaymentStatus;
      if (!Object.values(PaymentStatus).includes(normalizedStatus)) {
        res.status(400).json({
          status: 'error',
          message: `Invalid status. Allowed values: ${Object.values(PaymentStatus).join(', ')}`,
        });
        return;
      }
      updates.status = normalizedStatus;
    }

    if (paidDate !== undefined) {
      updates.paidAt = paidDate ? new Date(paidDate) : null;
    }

    if (paymentMethod !== undefined) {
      updates.paymentMethod = paymentMethod || null;
    }

    if (transactionId !== undefined) {
      updates.transactionId = transactionId || null;
    }

    if (notes !== undefined) {
      updates.notes = notes || null;
    }

    if (paidAmount !== undefined) {
      const parsedPaidAmount = Number(paidAmount);
      if (Number.isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
        res.status(400).json({
          status: 'error',
          message: 'paidAmount must be a positive number',
        });
        return;
      }
      updates.paidAmount = parsedPaidAmount;
    }

    if (receiptUrl !== undefined) {
      updates.receiptUrl = receiptUrl || null;
    }

    // Auto-populate paidAt / paidAmount when marking as paid
    if (updates.status === PaymentStatus.PAID) {
      if (!updates.paidAt && !payment.paidAt) {
        updates.paidAt = new Date();
      }
      if (updates.paidAmount === undefined) {
        updates.paidAmount = payment.amount;
      }
      
      // Generate receipt if payment is being marked as paid and receipt doesn't exist
      if (!payment.receiptUrl) {
        try {
          const student = await db.User.findByPk(payment.studentId, {
            attributes: ['id', 'name', 'email', 'phone'],
          });
          
          const enrollment = payment.enrollmentId
            ? await db.Enrollment.findByPk(payment.enrollmentId, {
                include: [{ model: db.Batch, as: 'batch', attributes: ['id', 'title'] }],
              })
            : null;

          const paidDate = updates.paidAt || payment.paidAt || new Date();
          const receiptNumber = generateReceiptNumber(payment.id, paidDate);
          
          const receiptUrl = await generateReceiptPDF(
            receiptNumber,
            student?.name || 'Student',
            student?.email || '',
            student?.phone || null,
            payment.amount,
            updates.paidAmount || payment.paidAmount || payment.amount,
            updates.paymentMethod || payment.paymentMethod || null,
            updates.transactionId || payment.transactionId || null,
            paidDate,
            (enrollment as any)?.batch?.title || null,
            updates.notes || payment.notes || null
          );
          
          updates.receiptUrl = receiptUrl;
        } catch (receiptError) {
          logger.error('Error generating receipt:', receiptError);
          // Don't fail the payment update if receipt generation fails
        }
      }
    }

    // Auto-set status to partial if paidAmount is less than amount
    if (updates.paidAmount !== undefined && updates.status === undefined) {
      const newPaidAmount = updates.paidAmount;
      const currentAmount = payment.amount;
      if (newPaidAmount > 0 && newPaidAmount < currentAmount) {
        updates.status = PaymentStatus.PARTIAL;
      } else if (newPaidAmount >= currentAmount) {
        updates.status = PaymentStatus.PAID;
        if (!updates.paidAt && !payment.paidAt) {
          updates.paidAt = new Date();
        }
        
        // Generate receipt if payment is fully paid and receipt doesn't exist
        if (!payment.receiptUrl) {
          try {
            const student = await db.User.findByPk(payment.studentId, {
              attributes: ['id', 'name', 'email', 'phone'],
            });
            
            const enrollment = payment.enrollmentId
              ? await db.Enrollment.findByPk(payment.enrollmentId, {
                  include: [{ model: db.Batch, as: 'batch', attributes: ['id', 'title'] }],
                })
              : null;

            const paidDate = updates.paidAt || payment.paidAt || new Date();
            const receiptNumber = generateReceiptNumber(payment.id, paidDate);
            
            const receiptUrl = await generateReceiptPDF(
              receiptNumber,
              student?.name || 'Student',
              student?.email || '',
              student?.phone || null,
              payment.amount,
              newPaidAmount,
              updates.paymentMethod || payment.paymentMethod || null,
              updates.transactionId || payment.transactionId || null,
              paidDate,
              (enrollment as any)?.batch?.title || null,
              updates.notes || payment.notes || null
            );
            
            updates.receiptUrl = receiptUrl;
          } catch (receiptError) {
            logger.error('Error generating receipt:', receiptError);
            // Don't fail the payment update if receipt generation fails
          }
        }
      }
    }

    // If status is set to partial but no paidAmount, keep existing or set to 0
    if (updates.status === PaymentStatus.PARTIAL && updates.paidAmount === undefined) {
      updates.paidAmount = payment.paidAmount || 0;
    }

    await payment.update(updates);

    // Update payment plan balance if paidAmount or status changed
    if (updates.paidAmount !== undefined || updates.status !== undefined) {
      // Refresh payment to get updated enrollmentId
      const refreshedPayment = await db.PaymentTransaction.findByPk(payment.id, {
        attributes: ['studentId', 'enrollmentId'],
      });
      
      if (refreshedPayment) {
        // Update payment plan balance synchronously to ensure it's updated before response
        try {
          await updatePaymentPlanBalance(refreshedPayment.studentId, refreshedPayment.enrollmentId || null);
          logger.info(`Payment plan balance updated for student ${refreshedPayment.studentId}, enrollment ${refreshedPayment.enrollmentId || 'none'}`);
        } catch (err) {
          logger.error('Payment plan balance update failed:', err);
          // Don't fail the payment update if balance update fails
        }
      }
    }

    const updatedPayment = await db.PaymentTransaction.findByPk(payment.id, {
      include: [
        { model: db.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'] },
        {
          model: db.Enrollment,
          as: 'enrollment',
          include: [{ model: db.Batch, as: 'batch', attributes: ['id', 'title'] }],
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      message: 'Payment updated successfully',
      data: {
        payment: updatedPayment ? formatPayment(updatedPayment) : formatPayment(payment),
      },
    });
  } catch (error) {
    logger.error('Update payment error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update payment',
    });
  }
};

// GET /api/payments/:paymentId/receipt - Download receipt PDF
export const downloadReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const paymentId = Number(req.params.paymentId);
    if (Number.isNaN(paymentId)) {
      res.status(400).json({ status: 'error', message: 'Invalid payment id' });
      return;
    }

    const payment = await db.PaymentTransaction.findByPk(paymentId, {
      include: [
        { model: db.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'] },
        {
          model: db.Enrollment,
          as: 'enrollment',
          include: [{ model: db.Batch, as: 'batch', attributes: ['id', 'title'] }],
        },
      ],
    });

    if (!payment) {
      res.status(404).json({
        status: 'error',
        message: 'Payment not found',
      });
      return;
    }

    if (!payment.receiptUrl) {
      res.status(404).json({
        status: 'error',
        message: 'Receipt not generated for this payment',
      });
      return;
    }

    // Extract filename from receiptUrl
    const filename = payment.receiptUrl.split('/').pop() || `receipt_${paymentId}.pdf`;
    const filepath = path.join(receiptsDir, filename);

    if (!fs.existsSync(filepath)) {
      res.status(404).json({
        status: 'error',
        message: 'Receipt file not found',
      });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filepath);
  } catch (error) {
    logger.error('Download receipt error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download receipt',
    });
  }
};

