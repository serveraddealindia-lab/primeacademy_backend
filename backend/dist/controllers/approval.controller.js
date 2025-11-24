"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondToApproval = exports.createApproval = void 0;
const models_1 = __importDefault(require("../models"));
const ChangeRequest_1 = require("../models/ChangeRequest");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const createApproval = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        const { entityType, entityId, reason } = req.body;
        // Validation
        if (!entityType || !entityId) {
            res.status(400).json({
                status: 'error',
                message: 'entityType and entityId are required',
            });
            return;
        }
        if (typeof entityId !== 'number' || entityId <= 0) {
            res.status(400).json({
                status: 'error',
                message: 'entityId must be a positive number',
            });
            return;
        }
        // Create change request
        const changeRequest = await models_1.default.ChangeRequest.create({
            entityType,
            entityId,
            requestedBy: req.user.userId,
            reason: reason || null,
            status: ChangeRequest_1.ChangeRequestStatus.PENDING,
        });
        // Fetch with requester information
        const changeRequestWithDetails = await models_1.default.ChangeRequest.findByPk(changeRequest.id, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'requester',
                    attributes: ['id', 'name', 'email'],
                },
            ],
        });
        res.status(201).json({
            status: 'success',
            message: 'Change request created successfully',
            data: {
                changeRequest: {
                    id: changeRequestWithDetails?.id,
                    entityType: changeRequestWithDetails?.entityType,
                    entityId: changeRequestWithDetails?.entityId,
                    reason: changeRequestWithDetails?.reason,
                    status: changeRequestWithDetails?.status,
                    requestedBy: changeRequestWithDetails?.requester
                        ? {
                            id: changeRequestWithDetails.requester.id,
                            name: changeRequestWithDetails.requester.name,
                            email: changeRequestWithDetails.requester.email,
                        }
                        : null,
                    createdAt: changeRequestWithDetails?.createdAt,
                    updatedAt: changeRequestWithDetails?.updatedAt,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Create approval error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while creating change request',
        });
    }
};
exports.createApproval = createApproval;
const respondToApproval = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        // Check if user is SuperAdmin
        if (req.user.role !== User_1.UserRole.SUPERADMIN) {
            res.status(403).json({
                status: 'error',
                message: 'Only SuperAdmin can respond to approval requests',
            });
            return;
        }
        const changeRequestId = parseInt(req.params.id, 10);
        const { approve } = req.body;
        if (isNaN(changeRequestId)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid change request ID',
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
        // Find change request
        const changeRequest = await models_1.default.ChangeRequest.findByPk(changeRequestId, {
            include: [
                {
                    model: models_1.default.User,
                    as: 'requester',
                    attributes: ['id', 'name', 'email'],
                },
            ],
        });
        if (!changeRequest) {
            res.status(404).json({
                status: 'error',
                message: 'Change request not found',
            });
            return;
        }
        // Check if already processed
        if (changeRequest.status !== ChangeRequest_1.ChangeRequestStatus.PENDING) {
            res.status(400).json({
                status: 'error',
                message: `Change request has already been ${changeRequest.status}`,
            });
            return;
        }
        // Update change request
        changeRequest.status = approve ? ChangeRequest_1.ChangeRequestStatus.APPROVED : ChangeRequest_1.ChangeRequestStatus.REJECTED;
        changeRequest.approverId = req.user.userId;
        changeRequest.updatedAt = new Date(); // Response timestamp
        await changeRequest.save();
        // Fetch with approver information
        const updatedChangeRequest = await models_1.default.ChangeRequest.findByPk(changeRequest.id, {
            include: [
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
            message: `Change request ${approve ? 'approved' : 'rejected'} successfully`,
            data: {
                changeRequest: {
                    id: updatedChangeRequest?.id,
                    entityType: updatedChangeRequest?.entityType,
                    entityId: updatedChangeRequest?.entityId,
                    reason: updatedChangeRequest?.reason,
                    status: updatedChangeRequest?.status,
                    requestedBy: updatedChangeRequest?.requester
                        ? {
                            id: updatedChangeRequest.requester.id,
                            name: updatedChangeRequest.requester.name,
                            email: updatedChangeRequest.requester.email,
                        }
                        : null,
                    approver: updatedChangeRequest?.approver
                        ? {
                            id: updatedChangeRequest.approver.id,
                            name: updatedChangeRequest.approver.name,
                            email: updatedChangeRequest.approver.email,
                        }
                        : null,
                    createdAt: updatedChangeRequest?.createdAt,
                    updatedAt: updatedChangeRequest?.updatedAt, // Response timestamp
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Respond to approval error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while responding to approval',
        });
    }
};
exports.respondToApproval = respondToApproval;
//# sourceMappingURL=approval.controller.js.map