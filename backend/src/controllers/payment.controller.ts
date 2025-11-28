import { Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { PaymentStatus } from '../models/PaymentTransaction';
import { logger } from '../utils/logger';
import { UserRole } from '../models/User';

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

    const payments = await db.PaymentTransaction.findAll({
      where,
      include: [
        { model: db.User, as: 'student', attributes: ['id', 'name', 'email', 'phone'] },
        {
          model: db.Enrollment,
          as: 'enrollment',
          include: [{ model: db.Batch, as: 'batch', attributes: ['id', 'title'] }],
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
  } catch (error) {
    logger.error('Get payments error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to load payments',
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

    const student = await db.User.findByPk(studentId);
    if (!student || student.role !== UserRole.STUDENT) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid student selected',
      });
      return;
    }

    if (enrollmentId) {
      const enrollment = await db.Enrollment.findByPk(enrollmentId);
      if (!enrollment) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid enrollment selected',
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
      }
    }

    // If status is set to partial but no paidAmount, keep existing or set to 0
    if (updates.status === PaymentStatus.PARTIAL && updates.paidAmount === undefined) {
      updates.paidAmount = payment.paidAmount || 0;
    }

    await payment.update(updates);

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

