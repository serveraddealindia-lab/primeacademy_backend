"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadReceipt = exports.updatePayment = exports.createPayment = exports.getPaymentById = exports.getPayments = void 0;
// @ts-ignore - pdfmake doesn't have type definitions
const pdfmake_1 = __importDefault(require("pdfmake"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const models_1 = __importDefault(require("../models"));
const PaymentTransaction_1 = require("../models/PaymentTransaction");
const logger_1 = require("../utils/logger");
const User_1 = require("../models/User");
// Create receipts directory
const receiptsDir = path_1.default.join(__dirname, '../../receipts');
if (!fs_1.default.existsSync(receiptsDir)) {
    fs_1.default.mkdirSync(receiptsDir, { recursive: true });
}
// Generate receipt number
const generateReceiptNumber = (paymentId, date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `PA/RCP/${year}${month}${day}/${String(paymentId).padStart(6, '0')}`;
};
// Generate PDF receipt matching the sample format
const generateReceiptPDF = async (receiptNumber, studentName, studentEmail, studentPhone, _amount, paidAmount, paymentMethod, transactionId, paymentDate, courseName, notes) => {
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
            const printer = new pdfmake_1.default(fonts);
            const filename = `receipt_${receiptNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
            const filepath = path_1.default.join(receiptsDir, filename);
            // Format date
            const formattedDate = paymentDate.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
            // Format amount in words (simplified)
            const formatAmountInWords = (amount) => {
                const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
                const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
                const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
                if (amount === 0)
                    return 'Zero';
                if (amount < 10)
                    return ones[amount];
                if (amount < 20)
                    return teens[amount - 10];
                if (amount < 100)
                    return tens[Math.floor(amount / 10)] + (amount % 10 !== 0 ? ' ' + ones[amount % 10] : '');
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
            const docDefinition = {
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
            const stream = fs_1.default.createWriteStream(filepath);
            pdfDoc.pipe(stream);
            pdfDoc.end();
            stream.on('finish', () => {
                resolve(`/receipts/${filename}`);
            });
            stream.on('error', (error) => {
                reject(error);
            });
        }
        catch (error) {
            reject(error);
        }
    });
};
const formatPayment = (payment) => {
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
const ensureAdminAccess = (req, res) => {
    if (!req.user || (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN)) {
        res.status(403).json({
            status: 'error',
            message: 'Only admins can manage payments',
        });
        return false;
    }
    return true;
};
const getPayments = async (req, res) => {
    try {
        if (!ensureAdminAccess(req, res)) {
            return;
        }
        const { studentId, status } = req.query;
        const where = {};
        if (studentId) {
            const parsedId = Number(studentId);
            if (Number.isNaN(parsedId)) {
                res.status(400).json({ status: 'error', message: 'Invalid studentId' });
                return;
            }
            where.studentId = parsedId;
        }
        if (status) {
            const normalizedStatus = String(status).toLowerCase();
            if (!Object.values(PaymentTransaction_1.PaymentStatus).includes(normalizedStatus)) {
                res.status(400).json({
                    status: 'error',
                    message: `Invalid status. Allowed values: ${Object.values(PaymentTransaction_1.PaymentStatus).join(', ')}`,
                });
                return;
            }
            where.status = normalizedStatus;
        }
        const payments = await models_1.default.PaymentTransaction.findAll({
            where,
            include: [
                { model: models_1.default.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'] },
                {
                    model: models_1.default.Enrollment,
                    as: 'enrollment',
                    include: [{ model: models_1.default.Batch, as: 'batch', attributes: ['id', 'title'] }],
                },
            ],
            order: [['dueDate', 'DESC'], ['id', 'DESC']],
        });
        res.status(200).json({
            status: 'success',
            data: {
                payments: payments.map(formatPayment),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Get payments error', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to load payments',
        });
    }
};
exports.getPayments = getPayments;
const getPaymentById = async (req, res) => {
    try {
        if (!ensureAdminAccess(req, res)) {
            return;
        }
        const paymentId = Number(req.params.paymentId);
        if (Number.isNaN(paymentId)) {
            res.status(400).json({ status: 'error', message: 'Invalid payment id' });
            return;
        }
        const payment = await models_1.default.PaymentTransaction.findByPk(paymentId, {
            include: [
                { model: models_1.default.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'] },
                {
                    model: models_1.default.Enrollment,
                    as: 'enrollment',
                    include: [{ model: models_1.default.Batch, as: 'batch', attributes: ['id', 'title'] }],
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
    }
    catch (error) {
        logger_1.logger.error('Get payment error', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to load payment',
        });
    }
};
exports.getPaymentById = getPaymentById;
const createPayment = async (req, res) => {
    try {
        if (!ensureAdminAccess(req, res)) {
            return;
        }
        const { studentId, enrollmentId, amount, dueDate, notes, paymentMethod, transactionId } = req.body;
        if (!studentId || !amount || !dueDate) {
            res.status(400).json({
                status: 'error',
                message: 'studentId, amount, and dueDate are required',
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
        const student = await models_1.default.User.findByPk(studentId);
        if (!student || student.role !== User_1.UserRole.STUDENT) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid student selected',
            });
            return;
        }
        if (enrollmentId) {
            const enrollment = await models_1.default.Enrollment.findByPk(enrollmentId);
            if (!enrollment) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid enrollment selected',
                });
                return;
            }
        }
        const payment = await models_1.default.PaymentTransaction.create({
            studentId,
            enrollmentId: enrollmentId || null,
            amount: parsedAmount,
            paidAmount: 0,
            dueDate: new Date(dueDate),
            status: PaymentTransaction_1.PaymentStatus.PENDING,
            notes: notes || null,
            paymentMethod: paymentMethod || null,
            transactionId: transactionId || null,
        });
        // Try to fetch with relations, but don't fail if associations aren't available
        let paymentWithRelations;
        try {
            paymentWithRelations = await models_1.default.PaymentTransaction.findByPk(payment.id, {
                include: [
                    { model: models_1.default.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'], required: false },
                    {
                        model: models_1.default.Enrollment,
                        as: 'enrollment',
                        required: false,
                        include: [{ model: models_1.default.Batch, as: 'batch', attributes: ['id', 'title'], required: false }],
                    },
                ],
            });
        }
        catch (includeError) {
            logger_1.logger.warn('Failed to fetch payment with relations, using basic payment:', includeError);
            paymentWithRelations = payment;
        }
        res.status(201).json({
            status: 'success',
            message: 'Payment created successfully',
            data: {
                payment: paymentWithRelations ? formatPayment(paymentWithRelations) : formatPayment(payment),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Create payment error', error);
        logger_1.logger.error('Error details:', {
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
exports.createPayment = createPayment;
const updatePayment = async (req, res) => {
    try {
        if (!ensureAdminAccess(req, res)) {
            return;
        }
        const paymentId = Number(req.params.paymentId);
        if (Number.isNaN(paymentId)) {
            res.status(400).json({ status: 'error', message: 'Invalid payment id' });
            return;
        }
        const payment = await models_1.default.PaymentTransaction.findByPk(paymentId);
        if (!payment) {
            res.status(404).json({
                status: 'error',
                message: 'Payment not found',
            });
            return;
        }
        const { status, paidDate, paymentMethod, transactionId, notes, paidAmount, receiptUrl, } = req.body;
        const updates = {};
        if (status) {
            const normalizedStatus = status.toLowerCase();
            if (!Object.values(PaymentTransaction_1.PaymentStatus).includes(normalizedStatus)) {
                res.status(400).json({
                    status: 'error',
                    message: `Invalid status. Allowed values: ${Object.values(PaymentTransaction_1.PaymentStatus).join(', ')}`,
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
        if (updates.status === PaymentTransaction_1.PaymentStatus.PAID) {
            if (!updates.paidAt && !payment.paidAt) {
                updates.paidAt = new Date();
            }
            if (updates.paidAmount === undefined) {
                updates.paidAmount = payment.amount;
            }
            // Generate receipt if payment is being marked as paid and receipt doesn't exist
            if (!payment.receiptUrl) {
                try {
                    const student = await models_1.default.User.findByPk(payment.studentId, {
                        attributes: ['id', 'name', 'email', 'phone'],
                    });
                    const enrollment = payment.enrollmentId
                        ? await models_1.default.Enrollment.findByPk(payment.enrollmentId, {
                            include: [{ model: models_1.default.Batch, as: 'batch', attributes: ['id', 'title'] }],
                        })
                        : null;
                    const paidDate = updates.paidAt || payment.paidAt || new Date();
                    const receiptNumber = generateReceiptNumber(payment.id, paidDate);
                    const receiptUrl = await generateReceiptPDF(receiptNumber, student?.name || 'Student', student?.email || '', student?.phone || null, payment.amount, updates.paidAmount || payment.paidAmount || payment.amount, updates.paymentMethod || payment.paymentMethod || null, updates.transactionId || payment.transactionId || null, paidDate, enrollment?.batch?.title || null, updates.notes || payment.notes || null);
                    updates.receiptUrl = receiptUrl;
                }
                catch (receiptError) {
                    logger_1.logger.error('Error generating receipt:', receiptError);
                    // Don't fail the payment update if receipt generation fails
                }
            }
        }
        // Auto-set status to partial if paidAmount is less than amount
        if (updates.paidAmount !== undefined && updates.status === undefined) {
            const newPaidAmount = updates.paidAmount;
            const currentAmount = payment.amount;
            if (newPaidAmount > 0 && newPaidAmount < currentAmount) {
                updates.status = PaymentTransaction_1.PaymentStatus.PARTIAL;
            }
            else if (newPaidAmount >= currentAmount) {
                updates.status = PaymentTransaction_1.PaymentStatus.PAID;
                if (!updates.paidAt && !payment.paidAt) {
                    updates.paidAt = new Date();
                }
                // Generate receipt if payment is fully paid and receipt doesn't exist
                if (!payment.receiptUrl) {
                    try {
                        const student = await models_1.default.User.findByPk(payment.studentId, {
                            attributes: ['id', 'name', 'email', 'phone'],
                        });
                        const enrollment = payment.enrollmentId
                            ? await models_1.default.Enrollment.findByPk(payment.enrollmentId, {
                                include: [{ model: models_1.default.Batch, as: 'batch', attributes: ['id', 'title'] }],
                            })
                            : null;
                        const paidDate = updates.paidAt || payment.paidAt || new Date();
                        const receiptNumber = generateReceiptNumber(payment.id, paidDate);
                        const receiptUrl = await generateReceiptPDF(receiptNumber, student?.name || 'Student', student?.email || '', student?.phone || null, payment.amount, newPaidAmount, updates.paymentMethod || payment.paymentMethod || null, updates.transactionId || payment.transactionId || null, paidDate, enrollment?.batch?.title || null, updates.notes || payment.notes || null);
                        updates.receiptUrl = receiptUrl;
                    }
                    catch (receiptError) {
                        logger_1.logger.error('Error generating receipt:', receiptError);
                        // Don't fail the payment update if receipt generation fails
                    }
                }
            }
        }
        // If status is set to partial but no paidAmount, keep existing or set to 0
        if (updates.status === PaymentTransaction_1.PaymentStatus.PARTIAL && updates.paidAmount === undefined) {
            updates.paidAmount = payment.paidAmount || 0;
        }
        await payment.update(updates);
        const updatedPayment = await models_1.default.PaymentTransaction.findByPk(payment.id, {
            include: [
                { model: models_1.default.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'] },
                {
                    model: models_1.default.Enrollment,
                    as: 'enrollment',
                    include: [{ model: models_1.default.Batch, as: 'batch', attributes: ['id', 'title'] }],
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
    }
    catch (error) {
        logger_1.logger.error('Update payment error', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update payment',
        });
    }
};
exports.updatePayment = updatePayment;
// GET /api/payments/:paymentId/receipt - Download receipt PDF
const downloadReceipt = async (req, res) => {
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
        const payment = await models_1.default.PaymentTransaction.findByPk(paymentId, {
            include: [
                { model: models_1.default.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'] },
                {
                    model: models_1.default.Enrollment,
                    as: 'enrollment',
                    include: [{ model: models_1.default.Batch, as: 'batch', attributes: ['id', 'title'] }],
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
        const filepath = path_1.default.join(receiptsDir, filename);
        if (!fs_1.default.existsSync(filepath)) {
            res.status(404).json({
                status: 'error',
                message: 'Receipt file not found',
            });
            return;
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(filepath);
    }
    catch (error) {
        logger_1.logger.error('Download receipt error', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to download receipt',
        });
    }
};
exports.downloadReceipt = downloadReceipt;
//# sourceMappingURL=payment.controller.js.map