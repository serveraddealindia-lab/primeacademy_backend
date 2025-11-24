"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.checkRole = exports.verifyTokenMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const models_1 = __importDefault(require("../models"));
const verifyTokenMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                status: 'error',
                message: 'No token provided. Authorization header must be in format: Bearer <token>',
            });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!token) {
            res.status(401).json({
                status: 'error',
                message: 'Token is required',
            });
            return;
        }
        // Verify token
        const decoded = (0, jwt_1.verifyToken)(token);
        // Check if user exists and is active
        const user = await models_1.default.User.findByPk(decoded.userId);
        if (!user) {
            res.status(401).json({
                status: 'error',
                message: 'User not found',
            });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({
                status: 'error',
                message: 'User account is inactive',
            });
            return;
        }
        // Attach user info to request
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(401).json({
                status: 'error',
                message: error.message || 'Invalid token',
            });
        }
        else {
            res.status(401).json({
                status: 'error',
                message: 'Authentication failed',
            });
        }
    }
};
exports.verifyTokenMiddleware = verifyTokenMiddleware;
const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                status: 'error',
                message: 'Insufficient permissions. Required roles: ' + allowedRoles.join(', '),
            });
            return;
        }
        next();
    };
};
exports.checkRole = checkRole;
// Helper middleware that combines verifyToken and checkRole
const requireAuth = (allowedRoles) => {
    return [
        exports.verifyTokenMiddleware,
        ...(allowedRoles ? [(0, exports.checkRole)(...allowedRoles)] : []),
    ];
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.middleware.js.map