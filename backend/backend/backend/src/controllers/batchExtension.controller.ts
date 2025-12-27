import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import db from '../models';
import { ExtensionStatus } from '../models/BatchExtension';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

interface CreateExtensionBody {
  batchId: number;
  numberOfSessions: number;
  reason?: string;
}

interface ApproveExtensionParams {
  id: string;
}

interface ApproveExtensionBody {
  approve: boolean;
  rejectionReason?: string;
}

// POST /api/batch-extensions - Create extension request
export const createExtension = async (
  req: AuthRequest & { body: CreateExtensionBody },
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

    // Only admins and superadmins can create extension requests
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
      res.status(403).json({
        status: 'error',
        message: 'Only admins can create batch extension requests',
      });
      return;
    }

    const { batchId, numberOfSessions, reason } = req.body;

    // Validation
    if (!batchId || !numberOfSessions) {
      res.status(400).json({
        status: 'error',
        message: 'batchId and numberOfSessions are required',
      });
      return;
    }

    if (numberOfSessions < 1) {
      res.status(400).json({
        status: 'error',
        message: 'numberOfSessions must be at least 1',
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

    // Create extension request
    const extension = await db.BatchExtension.create({
      batchId,
      requestedBy: req.user.userId,
      numberOfSessions,
      reason: reason || null,
      status: ExtensionStatus.PENDING,
    });

    // Fetch with relations
    const extensionWithDetails = await db.BatchExtension.findByPk(extension.id, {
      include: [
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'startDate', 'endDate'],
        },
        {
          model: db.User,
          as: 'requester',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(201).json({
      status: 'success',
      message: 'Batch extension request created successfully',
      data: {
        extension: extensionWithDetails,
      },
    });
  } catch (error) {
    logger.error('Create extension error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating extension request',
    });
  }
};

// GET /api/batch-extensions - Get all extension requests
export const getExtensions = async (
  req: AuthRequest & { query: { batchId?: string; status?: string } },
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

    const { batchId, status } = req.query;
    const where: any = {};

    if (batchId) {
      where.batchId = parseInt(batchId, 10);
    }

    if (status) {
      where.status = status;
    }

    const extensions = await db.BatchExtension.findAll({
      where,
      include: [
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'startDate', 'endDate'],
        },
        {
          model: db.User,
          as: 'requester',
          attributes: ['id', 'name', 'email'],
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
        extensions,
        count: extensions.length,
      },
    });
  } catch (error) {
    logger.error('Get extensions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching extension requests',
    });
  }
};

// POST /api/batch-extensions/:id/approve - Approve/Reject extension
export const approveExtension = async (
  req: AuthRequest & { params: ApproveExtensionParams; body: ApproveExtensionBody },
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

    const extensionId = parseInt(req.params.id, 10);
    const { approve, rejectionReason } = req.body;

    if (isNaN(extensionId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid extension ID',
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

    // Find extension
    const extension = await db.BatchExtension.findByPk(extensionId, {
      include: [
        {
          model: db.Batch,
          as: 'batch',
        },
      ],
    });

    if (!extension) {
      res.status(404).json({
        status: 'error',
        message: 'Extension request not found',
      });
      return;
    }

    // Check approval rules: 3 sessions or less can be approved by admin, more requires superadmin
    if (approve) {
      if (extension.numberOfSessions <= 3) {
        // Admin or SuperAdmin can approve
        if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
          res.status(403).json({
            status: 'error',
            message: 'Only admins can approve extension requests',
          });
          return;
        }
      } else {
        // More than 3 sessions requires SuperAdmin
        if (req.user.role !== UserRole.SUPERADMIN) {
          res.status(403).json({
            status: 'error',
            message: 'Extension requests for more than 3 sessions require SuperAdmin approval',
          });
          return;
        }
      }
    } else {
      // Rejection can be done by admin or superadmin
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPERADMIN) {
        res.status(403).json({
          status: 'error',
          message: 'Only admins can reject extension requests',
        });
        return;
      }
    }

    // Update extension status
    extension.status = approve ? ExtensionStatus.APPROVED : ExtensionStatus.REJECTED;
    extension.approvedBy = req.user.userId;
    extension.approvedAt = new Date();
    if (!approve && rejectionReason) {
      extension.rejectionReason = rejectionReason;
    }
    await extension.save();

    // If approved, extend the batch end date
    const extensionBatch = (extension as any).batch;
    if (approve && extensionBatch) {
      // Calculate new end date (assuming each session is roughly a week apart)
      // In a real scenario, you might want to add the actual session dates
      const currentEndDate = new Date(extensionBatch.endDate);
      const daysToAdd = extension.numberOfSessions * 7; // Approximate: 1 session per week
      currentEndDate.setDate(currentEndDate.getDate() + daysToAdd);
      
      extensionBatch.endDate = currentEndDate;
      await extensionBatch.save();
    }

    // Fetch with relations
    const extensionWithDetails = await db.BatchExtension.findByPk(extension.id, {
      include: [
        {
          model: db.Batch,
          as: 'batch',
          attributes: ['id', 'title', 'software', 'startDate', 'endDate'],
        },
        {
          model: db.User,
          as: 'requester',
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
      message: `Extension request ${approve ? 'approved' : 'rejected'} successfully`,
      data: {
        extension: extensionWithDetails,
      },
    });
  } catch (error) {
    logger.error('Approve extension error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while processing extension request',
    });
  }
};






