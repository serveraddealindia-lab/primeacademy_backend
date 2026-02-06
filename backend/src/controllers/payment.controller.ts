import { Response } from 'express';
// @ts-expect-error - pdfmake doesn't have type definitions
import PdfPrinter from 'pdfmake';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
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

// Helper function to update student status based on payment status and other factors
const updateStudentStatus = async (studentId: number): Promise<void> => {
  try {
    // Get student profile to check for special statuses
    const studentProfile = await db.StudentProfile.findOne({
      where: { userId: studentId }
    });
    
    if (!studentProfile) {
      logger.warn(`Student profile not found for student ${studentId}`);
      return;
    }
    
    // Check if student has a specific status set manually (dropped, finished, deactive)
    if (studentProfile.status && ['dropped', 'finished', 'deactive'].includes(studentProfile.status.toLowerCase())) {
      // Keep the special status and don't update based on payment
      logger.info(`Student ${studentId} has special status '${studentProfile.status}', not updating based on payment`);
      return;
    }
    
    // Get all payments for this student
    const payments = await db.PaymentTransaction.findAll({
      where: { studentId },
      attributes: ['amount', 'paidAmount', 'status'],
    });
    
    // Calculate payment status
    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPaid = payments.reduce((sum, payment) => {
      if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.PARTIAL) {
        return sum + (payment.paidAmount || 0);
      }
      return sum;
    }, 0);
    
    // Get student's enrolled batches to determine completion status
    const enrollments = await db.Enrollment.findAll({
      where: { studentId },
      include: [
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'startDate', 'endDate'],
        },
      ],
    }) as any[];
    
    // Check if all enrolled batches are completed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const hasActiveEnrollments = enrollments.some(enrollment => {
      const batch = (enrollment as any).batch;
      if (!batch) return false;
      const batchEndDate = new Date(batch.endDate);
      batchEndDate.setHours(0, 0, 0, 0);
      return batchEndDate >= today; // Batch is ongoing or upcoming
    });
    
    const hasCompletedBatches = enrollments.some(enrollment => {
      const batch = (enrollment as any).batch;
      if (!batch) return false;
      const batchEndDate = new Date(batch.endDate);
      batchEndDate.setHours(0, 0, 0, 0);
      return batchEndDate < today; // Batch is completed
    });
    
    // Determine student status based on payment status and course completion
    let newStatus = 'active'; // default status
    
    if (hasCompletedBatches && !hasActiveEnrollments) {
      // Student has completed all enrolled batches
      newStatus = 'finished';
    } else if (totalAmount > 0) {
      if (totalPaid >= totalAmount) {
        // Student has paid all fees
        newStatus = 'active';
      } else if (totalPaid > 0 && totalPaid < totalAmount) {
        // Student has paid some fees but not all
        newStatus = 'active plus';
      } else {
        // Student has not paid anything
        newStatus = 'deactive'; // student is deactive if no payments made
      }
    } else {
      // No payment obligations - default to active
      newStatus = 'active';
    }
    
    // Update student profile with new status
    await studentProfile.update({ status: newStatus });
    logger.info(`Updated student ${studentId} status to ${newStatus} based on payment status (total: ${totalAmount}, paid: ${totalPaid})`);
  } catch (error) {
    logger.error(`Error updating student status for student ${studentId}:`, error);
    // Don't throw - this is a background update
  }
};

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
const generateReceiptNumber = (paymentId: number, _date: Date): string => {
  // Format: #PRI-PT1570 (matching the invoice format exactly)
  return `#PRI-PT${paymentId}`;
};

// Generate PDF receipt matching the Paid Invoice format exactly
const generateReceiptPDF = async (
  receiptNumber: string,
  studentName: string,
  _studentEmail: string,
  studentPhone: string | null,
  _amount: number,
  paidAmount: number,
  _paymentMethod: string | null,
  _transactionId: string | null,
  paymentDate: Date,
  courseName: string | null,
  notes: string | null
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Ensure paidAmount is a number
      const paidAmountNum = Number(paidAmount) || 0;
      // Use Times-Roman which better supports Unicode characters including rupee symbol
      const fonts = {
        Roboto: {
          normal: 'Times-Roman',
          bold: 'Times-Bold',
          italics: 'Times-Italic',
          bolditalics: 'Times-BoldItalic',
        },
      };

      const printer = new PdfPrinter(fonts);

      // Sanitize receipt number for filename - replace special characters that break URLs
      const sanitizedReceiptNumber = receiptNumber.replace(/\//g, '_').replace(/#/g, 'PRI').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `receipt_${sanitizedReceiptNumber}_${Date.now()}.pdf`;
      const filepath = path.join(receiptsDir, filename);

      // Load rupee symbol image - try multiple formats and paths
      const possiblePaths = [
        // Try PNG first (better quality) - check uploads directory
        path.join(process.cwd(), 'uploads', 'rupee.png'),
        path.join(__dirname, '../../uploads', 'rupee.png'),
        path.join(process.cwd(), 'uploads', 'general', 'rupee.png'),
        path.join(__dirname, '../../uploads', 'general', 'rupee.png'),
        // Try root directories
        path.join(process.cwd(), 'rupee.png'),
        path.join(__dirname, '../../rupee.png'),
        path.join(process.cwd(), 'backend', 'rupee.png'),
        // Then try JPG - check uploads directory
        path.join(process.cwd(), 'uploads', 'rupee.jpg'),
        path.join(__dirname, '../../uploads', 'rupee.jpg'),
        path.join(process.cwd(), 'uploads', 'general', 'rupee.jpg'),
        path.join(__dirname, '../../uploads', 'general', 'rupee.jpg'),
        // Try root directories
        path.join(process.cwd(), 'rupee.jpg'),
        path.join(__dirname, '../../rupee.jpg'),
        path.join(process.cwd(), 'backend', 'rupee.jpg'),
        // Then try SVG - check uploads directory
        path.join(process.cwd(), 'uploads', 'rupee.svg'),
        path.join(__dirname, '../../uploads', 'rupee.svg'),
        path.join(process.cwd(), 'uploads', 'general', 'rupee.svg'),
        path.join(__dirname, '../../uploads', 'general', 'rupee.svg'),
        // Try root directories
        path.join(process.cwd(), 'rupee.svg'),
        path.join(__dirname, '../../rupee.svg'),
        path.join(process.cwd(), 'backend', 'rupee.svg'),
      ];
      
      let rupeeImageDataUri: string | null = null;
      let rupeeImageType: string = 'png'; // default
      
      for (const imagePath of possiblePaths) {
        if (fs.existsSync(imagePath)) {
          try {
            const buffer = fs.readFileSync(imagePath);
            const base64 = buffer.toString('base64');
            // Determine image type from file extension
            if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
              rupeeImageType = 'jpeg';
            } else if (imagePath.endsWith('.png')) {
              rupeeImageType = 'png';
            } else if (imagePath.endsWith('.svg')) {
              rupeeImageType = 'svg';
            }
            // Use data URI format which pdfmake supports better
            rupeeImageDataUri = `data:image/${rupeeImageType};base64,${base64}`;
            logger.info(`✅ Rupee image loaded successfully from: ${imagePath} (${buffer.length} bytes, type: ${rupeeImageType})`);
            break;
          } catch (error) {
            logger.error(`❌ Error reading rupee image from ${imagePath}:`, error);
          }
        }
      }
      
      // If no image found, don't use image - just use text symbol
      if (!rupeeImageDataUri) {
        logger.warn('⚠️ Rupee image file not found, will use text symbol ₹');
      }

      // Helper function to create rupee symbol with amount
      const createRupeeAmount = (amount: string, fontSize: number = 10, bold: boolean = false, margin: number[] = [0, 0, 0, 0]) => {
        // Always use text symbol to avoid image-related errors
        // Images can cause issues with pdfmake in some environments
        return { text: `₹${amount}`, fontSize: fontSize, bold: bold, alignment: 'right', margin: margin };
      };

      // Format date as DD-MM-YYYY
      const day = String(paymentDate.getDate()).padStart(2, '0');
      const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
      const year = paymentDate.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;

      // Format amount in words (improved)
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
        if (amount < 10000000) {
          const lakhs = Math.floor(amount / 100000);
          const remainder = amount % 100000;
          return formatAmountInWords(lakhs) + ' Lakh' + (lakhs > 1 ? 's' : '') + (remainder !== 0 ? ' ' + formatAmountInWords(remainder) : '');
        }
        return amount.toString();
      };

      const amountInWords = formatAmountInWords(Math.floor(paidAmountNum)) + ' Rupees Only';

      // Document definition matching Paid Invoice format exactly
      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 50, 40, 50],
        content: [
          // Title: "Paid Invoice" (centered, dark purple)
          {
            text: 'Paid Invoice',
            fontSize: 18,
            bold: true,
            color: '#4A148C', // Dark purple
            alignment: 'center',
            margin: [0, 0, 0, 20],
          },

          // Header with Logo and Invoice Number
          {
            columns: [
              {
                // Logo - Black background with PRIME (orange/yellow) and "Digital Art With Excellence" (white)
                width: 120,
                table: {
                  widths: [120],
                  body: [
                    [
                      {
                        stack: [
                          {
                            text: 'PRIME',
                            fontSize: 18,
                            bold: true,
                            color: '#FF8C00', // Orange (closest to orange/yellow gradient)
                            alignment: 'center',
                            margin: [5, 8, 5, 2],
                          },
                          {
                            text: 'Digital Art With Excellence',
                            fontSize: 8,
                            color: '#FFFFFF', // White
                            alignment: 'center',
                            margin: [5, 0, 5, 8],
                          },
                        ],
                        fillColor: '#000000', // Black background
                      },
                    ],
                  ],
                },
                layout: 'noBorders',
              },
              {
                width: '*',
                stack: [],
              },
              {
                width: 'auto',
                stack: [
                  {
                    text: `Invoice No: ${receiptNumber}`,
                    fontSize: 11,
                    bold: true,
                    color: '#4A148C', // Dark purple
                    alignment: 'right',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: `Date: ${formattedDate}`,
                    fontSize: 11,
                    alignment: 'right',
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 25],
          },

          // Prime Academy Details (From)
          {
            text: 'Prime Academy',
            fontSize: 12,
            bold: true,
            margin: [0, 0, 0, 5],
          },
          {
            text: 'bd.drivein@gmail.com',
            fontSize: 10,
            margin: [0, 0, 0, 2],
          },
          {
            text: '919033222499',
            fontSize: 10,
            margin: [0, 0, 0, 2],
          },
          {
            text: 'Gala Empire, 601, Opposite Doordarshan Metro Station, Drive in road, Ahmedabad',
            fontSize: 10,
            margin: [0, 0, 0, 20],
          },

          // Invoice To (Recipient)
          {
            text: 'Invoice To:',
            fontSize: 11,
            bold: true,
            margin: [0, 0, 0, 5],
          },
          {
            text: studentName,
            fontSize: 11,
            margin: [0, 0, 0, 2],
          },
          {
            text: studentPhone || '',
            fontSize: 10,
            margin: [0, 0, 0, 20],
          },

          // Itemized Table
          {
            table: {
              headerRows: 1,
              widths: [30, '*', 80, 50, 70, 90],
              body: [
                [
                  { text: '#', fontSize: 10, bold: true, fillColor: '#4A148C', color: '#FFFFFF', alignment: 'center', margin: [5, 5, 5, 5] },
                  { text: 'Product Name', fontSize: 10, bold: true, fillColor: '#4A148C', color: '#FFFFFF', margin: [5, 5, 5, 5] },
                  { text: 'Cost', fontSize: 10, bold: true, fillColor: '#4A148C', color: '#FFFFFF', alignment: 'right', margin: [5, 5, 5, 5] },
                  { text: 'Qty', fontSize: 10, bold: true, fillColor: '#4A148C', color: '#FFFFFF', alignment: 'center', margin: [5, 5, 5, 5] },
                  { text: 'Discount', fontSize: 10, bold: true, fillColor: '#4A148C', color: '#FFFFFF', alignment: 'right', margin: [5, 5, 5, 5] },
                  { text: 'Total Amount', fontSize: 10, bold: true, fillColor: '#4A148C', color: '#FFFFFF', alignment: 'right', margin: [5, 5, 5, 5] },
                ],
                [
                  { text: '1', fontSize: 10, alignment: 'center', margin: [5, 5, 5, 5] },
                  { 
                    text: notes || courseName || 'Course Fee Payment', 
                    fontSize: 10, 
                    margin: [5, 5, 5, 5] 
                  },
                  createRupeeAmount(paidAmountNum.toFixed(2), 10, false, [5, 5, 5, 5]),
                  { text: '1.00', fontSize: 10, alignment: 'center', margin: [5, 5, 5, 5] },
                  createRupeeAmount('0.00', 10, false, [5, 5, 5, 5]),
                  createRupeeAmount(paidAmountNum.toFixed(2), 10, true, [5, 5, 5, 5]),
                ],
              ],
            },
            margin: [0, 0, 0, 20],
          },

          // Payment Details Section
          {
            text: 'Payments Details',
            fontSize: 11,
            bold: true,
            margin: [0, 0, 0, 10],
          },
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: 'Bank Name: Axis Bank', fontSize: 10, margin: [0, 0, 0, 3] },
                  { text: 'Account No: 2147483647', fontSize: 10, margin: [0, 0, 0, 3] },
                  { text: 'IFSC Code: UTIB0000032', fontSize: 10, margin: [0, 0, 0, 15] },
                ],
              },
            ],
          },

          // Summary Section
          {
            columns: [
              {
                width: '*',
                stack: [],
              },
              {
                width: 200,
                stack: [
                  {
                    columns: [
                      { text: 'Sub Total:', fontSize: 10, width: '*', margin: [0, 0, 0, 5] },
                      createRupeeAmount(paidAmountNum.toFixed(2), 10, false),
                    ],
                  },
                  {
                    columns: [
                      { text: 'Discount:', fontSize: 10, width: '*', margin: [0, 0, 0, 5] },
                      createRupeeAmount('0.00', 10, false),
                    ],
                  },
                  {
                    columns: [
                      { text: 'Total:', fontSize: 11, bold: true, width: '*', margin: [0, 5, 0, 5] },
                      createRupeeAmount(paidAmountNum.toFixed(2), 11, true),
                    ],
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 15],
          },

          // Total in Words
          {
            columns: [
              { text: 'IN WORDS: ', fontSize: 10, bold: true },
                { text: `₹ ${amountInWords}`, fontSize: 10, bold: true }
            ],
            columnGap: 2,
            margin: [0, 0, 0, 20],
          },

          // Terms & Condition
          {
            text: 'Terms & Condition',
            fontSize: 11,
            bold: true,
            margin: [0, 0, 0, 5],
          },
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: 'The above Payment is subject to realisation & Non - Refundable / Non-Transferrable',
                    fontSize: 10,
                    fillColor: '#E1BEE7', // Light purple background
                    margin: [8, 8, 8, 8],
                  },
                ],
              ],
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 30],
          },

          // Authorized Signature
          {
            columns: [
              {
                width: '*',
                stack: [],
              },
              {
                width: 150,
                stack: [
                  {
                    canvas: [
                      {
                        type: 'line',
                        x1: 0,
                        y1: 0,
                        x2: 150,
                        y2: 0,
                        lineWidth: 1,
                        lineColor: '#000000',
                      },
                    ],
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: 'Authorized Signature',
                    fontSize: 10,
                    alignment: 'center',
                  },
                ],
              },
            ],
          },
        ],
        defaultStyle: {
          font: 'Roboto',
        },
      };

      // Ensure receipts directory exists
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
        logger.info(`Created receipts directory: ${receiptsDir}`);
      }

      // Create PDF document with error handling
      let pdfDoc;
      try {
        pdfDoc = printer.createPdfKitDocument(docDefinition);
      } catch (createError: any) {
        logger.error('Error creating PDF document:', createError);
        reject(new Error(`Failed to create PDF document: ${createError.message || createError}`));
        return;
      }

      const stream = fs.createWriteStream(filepath);
      
      // Handle PDF generation errors
      pdfDoc.on('error', (error: Error) => {
        logger.error('PDF generation error:', error);
        stream.destroy();
        reject(new Error(`PDF generation failed: ${error.message}`));
      });

      pdfDoc.pipe(stream);
      pdfDoc.end();

      stream.on('finish', () => {
        logger.info(`✅ Receipt PDF generated successfully: ${filepath}`);
        resolve(`/receipts/${filename}`);
      });

      stream.on('error', (error) => {
        logger.error('File stream error:', error);
        reject(new Error(`Failed to write PDF file: ${error.message}`));
      });
    } catch (error: any) {
      logger.error('Unexpected error in generateReceiptPDF:', error);
      reject(new Error(`Unexpected error: ${error.message || error}`));
    }
  });
};

const formatPayment = (payment: any) => {
  const json = payment.toJSON();
  
  // Extract paymentPlan from enrollment or studentProfile
  let paymentPlan = null;
  if (json.enrollment?.paymentPlan) {
    // Use enrollment paymentPlan, ensuring it has all fields
    paymentPlan = {
      totalDeal: json.enrollment.paymentPlan.totalDeal !== undefined && json.enrollment.paymentPlan.totalDeal !== null ? Number(json.enrollment.paymentPlan.totalDeal) : null,
      bookingAmount: json.enrollment.paymentPlan.bookingAmount !== undefined && json.enrollment.paymentPlan.bookingAmount !== null ? Number(json.enrollment.paymentPlan.bookingAmount) : null,
      balanceAmount: json.enrollment.paymentPlan.balanceAmount !== undefined && json.enrollment.paymentPlan.balanceAmount !== null ? Number(json.enrollment.paymentPlan.balanceAmount) : null,
      emiPlan: json.enrollment.paymentPlan.emiPlan !== undefined ? json.enrollment.paymentPlan.emiPlan : null,
      emiPlanDate: json.enrollment.paymentPlan.emiPlanDate || null,
      emiInstallments: json.enrollment.paymentPlan.emiInstallments && Array.isArray(json.enrollment.paymentPlan.emiInstallments) ? json.enrollment.paymentPlan.emiInstallments : null,
    };
  } else if (json.student?.studentProfile?.documents) {
    // Try to get paymentPlan from studentProfile documents
    let documents = json.student.studentProfile.documents;
    if (typeof documents === 'string') {
      try {
        documents = JSON.parse(documents);
      } catch (e) {
        logger.warn(`Failed to parse documents JSON for payment ${json.id}:`, e);
        documents = null;
      }
    }
    const metadata = documents?.enrollmentMetadata;
    if (metadata) {
      paymentPlan = {
        totalDeal: metadata.totalDeal !== undefined && metadata.totalDeal !== null ? Number(metadata.totalDeal) : null,
        bookingAmount: metadata.bookingAmount !== undefined && metadata.bookingAmount !== null ? Number(metadata.bookingAmount) : null,
        balanceAmount: metadata.balanceAmount !== undefined && metadata.balanceAmount !== null ? Number(metadata.balanceAmount) : null,
        emiPlan: metadata.emiPlan !== undefined ? metadata.emiPlan : null,
        emiPlanDate: metadata.emiPlanDate || null,
        emiInstallments: metadata.emiInstallments && Array.isArray(metadata.emiInstallments) ? metadata.emiInstallments : null,
      };
    }
  }
  
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
          paymentPlan: json.enrollment.paymentPlan || null,
        }
      : null,
    paymentPlan: paymentPlan, // Add paymentPlan at payment level for easier access
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
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { studentId, status } = req.query;
    const where: Record<string, any> = {};

    // Check if user is admin/superadmin or student viewing their own payments
    const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERADMIN;
    const isStudent = req.user.role === UserRole.STUDENT;

    // If student, they can only view their own payments
    if (isStudent) {
      // Force studentId to be the logged-in user's ID
      // Use userId if available, otherwise fall back to id
      const studentUserId = req.user.userId || (req.user as any).id;
      if (!studentUserId) {
        res.status(400).json({
          status: 'error',
          message: 'User ID not found',
        });
        return;
      }
      where.studentId = studentUserId;
      logger.info(`Student ${studentUserId} viewing their own payments`);
    } else if (!isAdmin) {
      // Non-admin, non-student users (faculty, employees) cannot view payments
      res.status(403).json({
        status: 'error',
        message: 'Only admins and students can view payments',
      });
      return;
    } else {
      // Admin can view all payments or filter by studentId
      if (studentId) {
        const parsedId = Number(studentId);
        if (Number.isNaN(parsedId)) {
          res.status(400).json({ status: 'error', message: 'Invalid studentId' });
          return;
        }
        where.studentId = parsedId;
        logger.info(`Admin fetching payments for studentId: ${parsedId} (original: ${studentId}, type: ${typeof studentId})`);
      }
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
      logger.info(`Querying payments with where clause:`, JSON.stringify(where));
      if (studentId) {
        logger.info(`Looking for payments with studentId: ${Number(studentId)} (type: ${typeof Number(studentId)})`);
      }
      
      payments = await db.PaymentTransaction.findAll({
        where,
        include: [
          { 
            model: db.User, 
            as: 'student', 
            attributes: ['id', 'name', 'email', 'phone'],
            required: false,
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
      
      logger.info(`Found ${payments.length} payments for query:`, JSON.stringify(where));
      
      // Debug: If no payments found for a specific student, check if any payments exist at all
      if (studentId && payments.length === 0) {
        const totalPayments = await db.PaymentTransaction.count();
        logger.info(`Total payments in database: ${totalPayments}`);
        
        // Check a few sample payments to see their studentId format
        const samplePayments = await db.PaymentTransaction.findAll({
          attributes: ['id', 'studentId'],
          limit: 5,
        });
        logger.info(`Sample payment studentIds:`, samplePayments.map((p: any) => ({
          paymentId: p.id,
          studentId: p.studentId,
          studentIdType: typeof p.studentId,
        })));
      }
    } catch (queryError: any) {
      logger.error('Get payments query error:', queryError);
      logger.error('Error details:', {
        message: queryError?.message,
        code: queryError?.parent?.code,
        errno: queryError?.parent?.errno,
        sql: queryError?.parent?.sql,
      });
      
      // Check if error is about enrollmentId column
      const isEnrollmentIdError = queryError?.message?.includes('enrollmentId') || 
                                  queryError?.parent?.message?.includes('enrollmentId') ||
                                  queryError?.parent?.code === 'ER_BAD_FIELD_ERROR';
      
      // Try without includes if query fails
      try {
        if (isEnrollmentIdError) {
          // Fallback: explicitly specify attributes to exclude enrollmentId if it's causing issues
          logger.info('Attempting fallback query - enrollmentId column issue detected');
          payments = await db.PaymentTransaction.findAll({
            where,
            attributes: {
              exclude: ['enrollmentId'], // Explicitly exclude if causing issues
            },
            include: [
              { 
                model: db.User, 
                as: 'student', 
                attributes: ['id', 'name', 'email', 'phone'],
                required: false,
              },
            ],
            order: [['dueDate', 'DESC'], ['id', 'DESC']],
          });
          logger.info(`Fallback query successful: fetched ${payments.length} payments without enrollmentId`);
        } else {
          // Other error - try without relations
          payments = await db.PaymentTransaction.findAll({
            where,
            order: [['dueDate', 'DESC'], ['id', 'DESC']],
          });
          logger.warn('Fetched payments without relations due to query error');
        }
      } catch (fallbackError: any) {
        logger.error('Get payments fallback error:', fallbackError);
        logger.error('Fallback error details:', {
          message: fallbackError?.message,
          code: fallbackError?.parent?.code,
          errno: fallbackError?.parent?.errno,
          sql: fallbackError?.parent?.sql,
        });
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

    const { studentId, enrollmentId, amount, dueDate, notes, paymentMethod, transactionId, bankName, bankAccount } = req.body;

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
      status: PaymentStatus.UNPAID,
      notes: notes || null,
      paymentMethod: paymentMethod || null,
      transactionId: transactionId || null,
      bankName: bankName || null,
      bankAccount: bankAccount || null,
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
    
    // Update student status based on payment status
    try {
      await updateStudentStatus(studentId);
      logger.info(`Student status updated for student ${studentId} after payment creation`);
    } catch (statusErr) {
      logger.error('Student status update failed:', statusErr);
      // Don't fail the payment creation if status update fails
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
      bankName,
      bankAccount,
      notes,
      paidAmount,
      receiptUrl,
    }: {
      status?: PaymentStatus;
      paidDate?: string;
      paymentMethod?: string;
      transactionId?: string;
      bankName?: string;
      bankAccount?: string;
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

    if (bankName !== undefined) {
      updates.bankName = bankName || null;
    }

    if (bankAccount !== undefined) {
      updates.bankAccount = bankAccount || null;
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
          
          // Ensure amounts are numbers
          const paymentAmount = Number(payment.amount) || 0;
          const paidAmountValue = Number(updates.paidAmount || payment.paidAmount || payment.amount) || paymentAmount;
          
          const receiptUrl = await generateReceiptPDF(
            receiptNumber,
            student?.name || 'Student',
            student?.email || '',
            student?.phone || null,
            paymentAmount,
            paidAmountValue,
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
      
      // Update student status when payment is marked as paid
      try {
        await updateStudentStatus(payment.studentId);
        logger.info(`Student status updated for student ${payment.studentId} after payment marked as paid`);
      } catch (statusErr) {
        logger.error('Student status update failed:', statusErr);
        // Don't fail the payment update if status update fails
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
            
            // Ensure amounts are numbers
            const paymentAmount = Number(payment.amount) || 0;
            const paidAmountValue = Number(newPaidAmount) || paymentAmount;
            
            const receiptUrl = await generateReceiptPDF(
              receiptNumber,
              student?.name || 'Student',
              student?.email || '',
              student?.phone || null,
              paymentAmount,
              paidAmountValue,
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
        
        // Update student status when payment is fully paid
        try {
          await updateStudentStatus(payment.studentId);
          logger.info(`Student status updated for student ${payment.studentId} after payment fully paid`);
        } catch (statusErr) {
          logger.error('Student status update failed:', statusErr);
          // Don't fail the payment update if status update fails
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
        
        // Update student status based on payment status
        try {
          await updateStudentStatus(refreshedPayment.studentId);
          logger.info(`Student status updated for student ${refreshedPayment.studentId} after payment update`);
        } catch (statusErr) {
          logger.error('Student status update failed:', statusErr);
          // Don't fail the payment update if status update fails
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

// POST /api/students/:studentId/update-status - Update student status directly
export const updateStudentStatusManually = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only admins can manually update student status
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can manually update student status',
      });
      return;
    }

    const studentId = Number(req.params.studentId);
    if (Number.isNaN(studentId)) {
      res.status(400).json({ status: 'error', message: 'Invalid student id' });
      return;
    }

    const { status } = req.body;
    
    if (!status) {
      res.status(400).json({ status: 'error', message: 'Status is required' });
      return;
    }
    
    const validStatuses = ['active', 'active plus', 'dropped', 'finished', 'deactive'];
    const normalizedStatus = status.toLowerCase().trim();
    
    if (!validStatuses.includes(normalizedStatus)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`,
      });
      return;
    }

    // Find student profile
    const studentProfile = await db.StudentProfile.findOne({
      where: { userId: studentId },
    });

    if (!studentProfile) {
      res.status(404).json({
        status: 'error',
        message: 'Student profile not found',
      });
      return;
    }

    // Update the student status
    await studentProfile.update({ status: normalizedStatus });
    
    logger.info(`Manually updated student ${studentId} status to ${normalizedStatus} by admin ${req.user.userId || (req.user as any).id}`);

    res.status(200).json({
      status: 'success',
      message: `Student status updated to ${normalizedStatus}`,
      data: { status: normalizedStatus },
    });
  } catch (error) {
    logger.error('Update student status manually error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update student status',
    });
  }
};

// POST /api/payments/:paymentId/generate-receipt - Generate receipt for a payment
export const deletePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Only superadmin can delete payments
    if (!req.user || req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only superadmin can delete payments',
      });
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

    // Store studentId and enrollmentId for payment plan update
    const studentId = payment.studentId;
    const enrollmentId = payment.enrollmentId;

    // Delete the payment
    await payment.destroy();

    // Update payment plan balance after deletion
    try {
      await updatePaymentPlanBalance(studentId, enrollmentId || null);
      logger.info(`Payment plan balance updated after deleting payment ${paymentId} for student ${studentId}`);
    } catch (err) {
      logger.error('Payment plan balance update failed after deletion:', err);
      // Don't fail the deletion if balance update fails
    }

    logger.info(`Payment ${paymentId} deleted by superadmin ${req.user.userId || (req.user as any).id}`);

    res.status(200).json({
      status: 'success',
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    logger.error('Delete payment error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete payment',
    });
  }
};

export const generateReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdminAccess(req, res)) return;

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

    // Only generate receipt for paid or partial payments
    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIAL) {
      res.status(400).json({
        status: 'error',
        message: 'Receipt can only be generated for paid or partial payments',
      });
      return;
    }

    const student = (payment as any).student;
    if (!student) {
      res.status(404).json({
        status: 'error',
        message: 'Student not found for this payment',
      });
      return;
    }

    const enrollment = (payment as any).enrollment;
    const paidDate = payment.paidAt || payment.createdAt || new Date();
    const receiptNumber = generateReceiptNumber(payment.id, paidDate);

    // Ensure amounts are numbers (database might return strings)
    const paymentAmount = Number(payment.amount) || 0;
    const paymentPaidAmount = Number(payment.paidAmount) || paymentAmount;

    try {
      const receiptUrl = await generateReceiptPDF(
        receiptNumber,
        student.name || 'Student',
        student.email || '',
        student.phone || null,
        paymentAmount,
        paymentPaidAmount,
        payment.paymentMethod || null,
        payment.transactionId || null,
        paidDate,
        (enrollment as any)?.batch?.title || null,
        payment.notes || null
      );

      // Update payment with receipt URL
      await payment.update({ receiptUrl });

      res.json({
        status: 'success',
        message: 'Receipt generated successfully',
        data: {
          receiptUrl,
        },
      });
    } catch (receiptError: any) {
      logger.error('Generate receipt PDF error:', receiptError);
      const errorMessage = receiptError.message || 'Failed to generate receipt PDF';
      res.status(500).json({
        status: 'error',
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? receiptError.stack : undefined,
      });
    }
  } catch (error: any) {
    logger.error('Generate receipt error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate receipt',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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

/**
 * Parse date from Excel - handles Excel serial dates, various string formats, and Date objects
 * Supports DD/MM/YYYY format (primary) and other formats
 */
function parseExcelDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      if (!isNaN(dateValue.getTime())) return dateValue;
      return null;
    }
    
    // If it's a number (Excel serial date)
    if (typeof dateValue === 'number') {
      // Excel serial date starts from 1900-01-01
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) return date;
      return null;
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      if (!trimmed) return null;
      
      // Try DD/MM/YYYY format (primary format)
      const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      }
      
      // Try YYYY-MM-DD format
      const yyyymmdd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      }
      
      // Try MM/DD/YYYY format (fallback)
      const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
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

// POST /api/payments/bulk-upload - Bulk upload payments from Excel (student-wise)
export const bulkUploadPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only SuperAdmin and Admin can bulk upload payments
    if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can bulk upload payments',
      });
      return;
    }

    if (!req.file) {
      logger.error('Bulk payment upload: No file received');
      res.status(400).json({
        status: 'error',
        message: 'Excel file is required',
      });
      return;
    }

    logger.info(`Bulk payment upload: File received - name: ${req.file.originalname}, size: ${req.file.size}, mimetype: ${req.file.mimetype}`);

    // Parse Excel file with date parsing enabled
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { 
        type: 'buffer',
        cellDates: true, // Parse dates automatically as Date objects
      });
      logger.info(`Bulk payment upload: Excel file parsed successfully - sheets: ${workbook.SheetNames.join(', ')}`);
    } catch (parseError: any) {
      logger.error('Bulk payment upload: Failed to parse Excel file:', parseError);
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
    
    const rows = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null, blankrows: false });

    if (rows.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Excel file is empty',
      });
      return;
    }

    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // Helper to get column value (case-insensitive, handles variations)
    const getValue = (row: any, names: string[]): any => {
      for (const name of names) {
        const keys = Object.keys(row);
        const key = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
        if (key && row[key] !== null && row[key] !== undefined && row[key] !== '') {
          return row[key];
        }
      }
      return null;
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any;
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header

      try {
        // Get student identifier (email or phone)
        const studentEmail = getValue(row, ['email', 'student email', 'email address', 'studentemail']);
        const studentPhone = getValue(row, ['phone', 'phone number', 'mobile', 'mobile number', 'student phone', 'studentphone']);
        
        if (!studentEmail && !studentPhone) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: 'Student email or phone is required',
          });
          continue;
        }

        // Find student
        let student;
        if (studentEmail) {
          student = await db.User.findOne({
            where: { email: studentEmail.trim(), role: 'student' },
          });
        }
        
        if (!student && studentPhone) {
          student = await db.User.findOne({
            where: { phone: studentPhone.trim().toString(), role: 'student' },
          });
        }

        if (!student) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: `Student not found with email: ${studentEmail || 'N/A'} or phone: ${studentPhone || 'N/A'}`,
          });
          continue;
        }

        // Get amount
        const amountValue = getValue(row, ['amount', 'total amount', 'payment amount', 'totalamount']);
        if (!amountValue) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: 'Amount is required',
          });
          continue;
        }
        const amount = parseFloat(amountValue);
        if (isNaN(amount) || amount <= 0) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: `Invalid amount: ${amountValue}`,
          });
          continue;
        }

        // Get due date
        const dueDateValue = getValue(row, ['due date', 'duedate', 'due_date', 'due']);
        if (!dueDateValue) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: 'Due date is required',
          });
          continue;
        }
        const dueDate = parseExcelDate(dueDateValue);
        if (!dueDate) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: `Invalid due date format: ${dueDateValue}. Please use DD/MM/YYYY format`,
          });
          continue;
        }

        // Optional fields
        const enrollmentIdValue = getValue(row, ['enrollment id', 'enrollmentid', 'enrollment_id', 'enrollment']);
        let enrollmentId: number | null = null;
        if (enrollmentIdValue) {
          const parsed = parseInt(enrollmentIdValue);
          if (!isNaN(parsed)) {
            enrollmentId = parsed;
          }
        }

        const paymentMethod = getValue(row, ['payment method', 'paymentmethod', 'payment_method', 'method']);
        const transactionId = getValue(row, ['transaction id', 'transactionid', 'transaction_id', 'transaction']);
        const notes = getValue(row, ['notes', 'note', 'remarks', 'description']);
        
        // Handle software list (optional - updates student profile if provided)
        const softwareListValue = getValue(row, ['software list', 'softwarelist', 'software_list', 'software', 'softwares', 'softwares included', 'softwaresincluded']);
        if (softwareListValue && typeof softwareListValue === 'string') {
          try {
            // Parse comma-separated software list
            const softwareArray = softwareListValue
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
            
            if (softwareArray.length > 0) {
              // Get or create student profile
              const studentProfile = await db.StudentProfile.findOne({
                where: { userId: student.id },
                attributes: { exclude: ['serialNo'] }, // Exclude serialNo column
              });
              
              if (studentProfile) {
                // Update existing profile with new software list
                await studentProfile.update({
                  softwareList: softwareArray,
                });
                logger.info(`Updated software list for student ${student.id}: ${softwareArray.join(', ')}`);
              } else {
                // Create new profile with software list
                await db.StudentProfile.create({
                  userId: student.id,
                  softwareList: softwareArray,
                });
                logger.info(`Created student profile with software list for student ${student.id}: ${softwareArray.join(', ')}`);
              }
            }
          } catch (softwareError: any) {
            logger.warn(`Failed to process software list for student ${student.id}:`, softwareError);
            // Don't fail the payment creation if software list processing fails
          }
        }

        // Create payment
        await db.PaymentTransaction.create({
          studentId: student.id,
          enrollmentId: enrollmentId || null,
          amount: amount,
          paidAmount: 0,
          dueDate: dueDate,
          status: PaymentStatus.UNPAID,
          paymentMethod: paymentMethod || null,
          transactionId: transactionId || null,
          notes: notes || null,
        });

        result.success++;
      } catch (error: any) {
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
      message: `Bulk payment upload completed. ${result.success} payments created, ${result.failed} failed.`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Bulk payment upload error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to process bulk payment upload',
    });
  }
};

