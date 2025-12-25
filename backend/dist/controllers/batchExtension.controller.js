"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveExtension = exports.getExtensions = exports.createExtension = void 0;
const models_1 = __importDefault(require("../models"));
const BatchExtension_1 = require("../models/BatchExtension");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
// POST /api/batch-extensions - Create extension request
const createExtension = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Only admins and superadmins can create extension requests
        if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
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
        const batch = await models_1.default.Batch.findByPk(batchId);
        if (!batch) {
            res.status(404).json({
                status: 'error',
                message: 'Batch not found',
            });
            return;
        }
        // Create extension request
        const extension = await models_1.default.BatchExtension.create({
            batchId,
            requestedBy: req.user.userId,
            numberOfSessions,
            reason: reason || null,
            status: BatchExtension_1.ExtensionStatus.PENDING,
        });
        // Fetch with relations
        const extensionWithDetails = await models_1.default.BatchExtension.findByPk(extension.id, {
            include: [
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title', 'software', 'startDate', 'endDate'],
                },
                {
                    model: models_1.default.User,
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
    }
    catch (error) {
        logger_1.logger.error('Create extension error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating extension request',
        });
    }
};
exports.createExtension = createExtension;
// GET /api/batch-extensions - Get all extension requests
const getExtensions = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { batchId, status } = req.query;
        const where = {};
        if (batchId) {
            where.batchId = parseInt(batchId, 10);
        }
        if (status) {
            where.status = status;
        }
        const extensions = await models_1.default.BatchExtension.findAll({
            where,
            include: [
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title', 'software', 'startDate', 'endDate'],
                },
                {
                    model: models_1.default.User,
                    as: 'requester',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: models_1.default.User,
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
    }
    catch (error) {
        logger_1.logger.error('Get extensions error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching extension requests',
        });
    }
};
exports.getExtensions = getExtensions;
// POST /api/batch-extensions/:id/approve - Approve/Reject extension
const approveExtension = async (req, res) => {
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
        const extension = await models_1.default.BatchExtension.findByPk(extensionId, {
            include: [
                {
                    model: models_1.default.Batch,
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
                if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
                    res.status(403).json({
                        status: 'error',
                        message: 'Only admins can approve extension requests',
                    });
                    return;
                }
            }
            else {
                // More than 3 sessions requires SuperAdmin
                if (req.user.role !== User_1.UserRole.SUPERADMIN) {
                    res.status(403).json({
                        status: 'error',
                        message: 'Extension requests for more than 3 sessions require SuperAdmin approval',
                    });
                    return;
                }
            }
        }
        else {
            // Rejection can be done by admin or superadmin
            if (req.user.role !== User_1.UserRole.ADMIN && req.user.role !== User_1.UserRole.SUPERADMIN) {
                res.status(403).json({
                    status: 'error',
                    message: 'Only admins can reject extension requests',
                });
                return;
            }
        }
        // Update extension status
        extension.status = approve ? BatchExtension_1.ExtensionStatus.APPROVED : BatchExtension_1.ExtensionStatus.REJECTED;
        extension.approvedBy = req.user.userId;
        extension.approvedAt = new Date();
        if (!approve && rejectionReason) {
            extension.rejectionReason = rejectionReason;
        }
        await extension.save();
        // If approved, extend the batch end date
        const extensionBatch = extension.batch;
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
        const extensionWithDetails = await models_1.default.BatchExtension.findByPk(extension.id, {
            include: [
                {
                    model: models_1.default.Batch,
                    as: 'batch',
                    attributes: ['id', 'title', 'software', 'startDate', 'endDate'],
                },
                {
                    model: models_1.default.User,
                    as: 'requester',
                    attributes: ['id', 'name', 'email'],
                },
                {
                    model: models_1.default.User,
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
    }
    catch (error) {
        logger_1.logger.error('Approve extension error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while processing extension request',
        });
    }
};
exports.approveExtension = approveExtension;
//# sourceMappingURL=batchExtension.controller.js.map