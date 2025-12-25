import db from '../models';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
// @ts-ignore - pdfmake doesn't have type definitions
import PdfPrinter from 'pdfmake';

// Create receipts directory
const receiptsDir = path.join(__dirname, '../../receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// Generate receipt number
const generateReceiptNumber = (paymentId: number, _date: Date): string => {
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

      const filename = `receipt_${receiptNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
      const filepath = path.join(receiptsDir, filename);

      // Load rupee symbol image
      const possiblePaths = [
        path.join(__dirname, '../../rupee.jpg'), // From dist/controllers
        path.join(process.cwd(), 'rupee.jpg'), // From backend root
        path.join(process.cwd(), 'backend', 'rupee.jpg'), // From project root
      ];
      
      let rupeeImageBase64 = '';
      
      for (const imagePath of possiblePaths) {
        if (fs.existsSync(imagePath)) {
          try {
            const rupeeImageBuffer = fs.readFileSync(imagePath);
            rupeeImageBase64 = rupeeImageBuffer.toString('base64');
            logger.info(`✅ Rupee image loaded successfully from: ${imagePath} (${rupeeImageBuffer.length} bytes)`);
          } catch (error) {
            logger.error(`❌ Error reading rupee image from ${imagePath}:`, error);
          }
          break;
        }
      }
      
      if (!rupeeImageBase64) {
        logger.warn('⚠️ Rupee image not found, will use text symbol as fallback');
      }

      // Helper function to create rupee symbol with amount
      const createRupeeAmount = (amount: string, fontSize: number = 10, bold: boolean = false, margin: number[] = [0, 0, 0, 0]) => {
        if (rupeeImageBase64) {
          const imageSize = Math.max(fontSize * 0.7, 8);
          return {
            columns: [
              {
                image: rupeeImageBase64,
                width: imageSize,
                height: imageSize,
                fit: [imageSize, imageSize],
              },
              {
                text: amount,
                fontSize: fontSize,
                bold: bold,
                alignment: 'right',
                margin: [3, 0, 0, 0],
              },
            ],
            columnGap: 2,
            margin: margin,
          };
        }
        return { text: `₹${amount}`, fontSize: fontSize, bold: bold, alignment: 'right', margin: margin };
      };

      // Format date as DD-MM-YYYY
      const day = String(paymentDate.getDate()).padStart(2, '0');
      const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
      const year = paymentDate.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;

      // Format amount in words
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

      const amountInWords = formatAmountInWords(Math.floor(paidAmount)) + ' Rupees Only';

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
            color: '#4A148C',
            alignment: 'center',
            margin: [0, 0, 0, 20],
          },

          // Header with Logo and Invoice Number
          {
            columns: [
              {
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
                            color: '#FF8C00',
                            alignment: 'center',
                            margin: [5, 8, 5, 2],
                          },
                          {
                            text: 'Digital Art With Excellence',
                            fontSize: 8,
                            color: '#FFFFFF',
                            alignment: 'center',
                            margin: [5, 0, 5, 8],
                          },
                        ],
                        fillColor: '#000000',
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
                    color: '#4A148C',
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
                  createRupeeAmount(paidAmount.toFixed(2), 10, false, [5, 5, 5, 5]),
                  { text: '1.00', fontSize: 10, alignment: 'center', margin: [5, 5, 5, 5] },
                  createRupeeAmount('0.00', 10, false, [5, 5, 5, 5]),
                  createRupeeAmount(paidAmount.toFixed(2), 10, true, [5, 5, 5, 5]),
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
                      createRupeeAmount(paidAmount.toFixed(2), 10, false),
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
                      createRupeeAmount(paidAmount.toFixed(2), 11, true),
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
              ...(rupeeImageBase64 ? [
                { image: rupeeImageBase64, width: 10, height: 10, fit: [10, 10] },
                { text: ` ${amountInWords}`, fontSize: 10, bold: true, margin: [0, 0, 0, 0] }
              ] : [
                { text: `₹ ${amountInWords}`, fontSize: 10, bold: true }
              ]),
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
                    fillColor: '#E1BEE7',
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

// Main function to regenerate all receipts
const regenerateAllReceipts = async () => {
  try {
    logger.info('🔄 Starting receipt regeneration process...');

    // Find all payments with receipts
    const payments = await db.PaymentTransaction.findAll({
      where: {
        receiptUrl: {
          [Op.ne]: null,
        },
      },
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
          attributes: ['id'],
          required: false,
          include: [
            {
              model: db.Batch,
              as: 'batch',
              attributes: ['id', 'title'],
              required: false,
            },
          ],
        },
      ],
      order: [['id', 'ASC']],
    });

    logger.info(`📋 Found ${payments.length} payments with receipts to regenerate`);

    let successCount = 0;
    let errorCount = 0;

    for (const payment of payments) {
      try {
        const student = (payment as any).student;
        const enrollment = (payment as any).enrollment;
        
        if (!student) {
          logger.warn(`⚠️ Payment ${payment.id}: Student not found, skipping...`);
          errorCount++;
          continue;
        }

        const paidDate = payment.paidAt || payment.createdAt || new Date();
        const receiptNumber = generateReceiptNumber(payment.id, paidDate);
        
        logger.info(`🔄 Regenerating receipt for Payment ID: ${payment.id}, Student: ${student.name}`);

        const receiptUrl = await generateReceiptPDF(
          receiptNumber,
          student.name || 'Student',
          student.email || '',
          student.phone || null,
          Number(payment.amount),
          Number(payment.paidAmount),
          payment.paymentMethod || null,
          payment.transactionId || null,
          paidDate,
          (enrollment as any)?.batch?.title || null,
          payment.notes || null
        );

        // Update the receipt URL in database
        await payment.update({ receiptUrl });

        logger.info(`✅ Successfully regenerated receipt for Payment ID: ${payment.id}`);
        successCount++;
      } catch (error) {
        logger.error(`❌ Error regenerating receipt for Payment ID: ${payment.id}:`, error);
        errorCount++;
      }
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`✅ Receipt regeneration completed!`);
    logger.info(`   ✅ Success: ${successCount}`);
    logger.info(`   ❌ Errors: ${errorCount}`);
    logger.info(`   📊 Total: ${payments.length}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Fatal error during receipt regeneration:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  regenerateAllReceipts();
}

export default regenerateAllReceipts;

