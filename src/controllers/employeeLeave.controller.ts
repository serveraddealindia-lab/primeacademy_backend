import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { LeaveStatus } from '../models/EmployeeLeave';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

interface CreateLeaveBody {
  employeeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}

interface ApproveLeaveParams {
  id: string;
}

interface ApproveLeaveBody {
  approve: boolean;
  rejectionReason?: string;
}

// POST /api/employee-leaves - Create leave request
export const createLeave = async (
  req: AuthRequest & { body: CreateLeaveBody },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { employeeId, startDate, endDate, reason } = req.body;

    // Validation
    if (!employeeId || !startDate || !endDate) {
      res.status(400).json({
        status: 'error',
        message: 'employeeId, startDate, and endDate are required',
      });
      return;
    }

    // Check if user is the employee or an admin
    if (req.user.userId !== employeeId && req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'You can only create leave requests for yourself unless you are an admin',
      });
      return;
    }

    // Verify employee exists
    const employee = await db.User.findByPk(employeeId);
    if (!employee || employee.role !== UserRole.EMPLOYEE) {
      res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    if (start > end) {
      res.status(400).json({
        status: 'error',
        message: 'Start date must be before or equal to end date',
      });
      return;
    }

    // Create leave request
    const leave = await db.EmployeeLeave.create({
      employeeId,
      startDate: start,
      endDate: end,
      reason: reason || null,
      status: LeaveStatus.PENDING,
    });

    // Fetch with relations
    const leaveWithDetails = await db.EmployeeLeave.findByPk(leave.id, {
      include: [
        {
          model: db.User,
          as: 'employee',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(201).json({
      status: 'success',
      message: 'Leave request created successfully',
      data: {
        leave: leaveWithDetails,
      },
    });
  } catch (error) {
    logger.error('Create leave error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating leave request',
    });
  }
};

// GET /api/employee-leaves - Get all leave requests
export const getLeaves = async (
  req: AuthRequest & { query: { employeeId?: string; status?: string } },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { employeeId, status } = req.query;
    const where: any = {};

    // Employees can only see their own leaves
    if (req.user.role === UserRole.EMPLOYEE) {
      where.employeeId = req.user.userId;
    } else if (employeeId) {
      where.employeeId = parseInt(employeeId, 10);
    }

    if (status) {
      where.status = status;
    }

    const leaves = await db.EmployeeLeave.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: db.User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        leaves,
        count: leaves.length,
      },
    });
  } catch (error) {
    logger.error('Get leaves error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching leave requests',
    });
  }
};

// POST /api/employee-leaves/:id/approve - Approve/Reject leave
export const approveLeave = async (
  req: AuthRequest & { params: ApproveLeaveParams; body: ApproveLeaveBody },
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Only admins and superadmins can approve leaves
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can approve leave requests',
      });
      return;
    }

    const leaveId = parseInt(req.params.id, 10);
    const { approve, rejectionReason } = req.body;

    if (isNaN(leaveId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid leave ID',
      });
      return;
    }

    if (typeof approve !== 'boolean') {
      res.status(400).json({
        status: 'error',
        message: 'approve field is required and must be a boolean',
      });
      return;
    }

    // Find leave
    const leave = await db.EmployeeLeave.findByPk(leaveId);
    if (!leave) {
      res.status(404).json({
        status: 'error',
        message: 'Leave request not found',
      });
      return;
    }

    // Update leave status
    leave.status = approve ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;
    leave.approvedBy = req.user.userId;
    leave.approvedAt = new Date();
    if (!approve && rejectionReason) {
      leave.rejectionReason = rejectionReason;
    }
    await leave.save();

    // Fetch with relations
    const leaveWithDetails = await db.EmployeeLeave.findByPk(leave.id, {
      include: [
        {
          model: db.User,
          as: 'employee',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: db.User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      message: `Leave request ${approve ? 'approved' : 'rejected'} successfully`,
      data: {
        leave: leaveWithDetails,
      },
    });
  } catch (error) {
    logger.error('Approve leave error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing leave request',
    });
  }
};










