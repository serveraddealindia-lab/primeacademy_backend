"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const paymentController = __importStar(require("../controllers/payment.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) and CSV files are allowed.'));
        }
    },
});
// GET routes
// Allow students to view their own payments - access control handled in controller
router.get('/', auth_middleware_1.verifyTokenMiddleware, paymentController.getPayments);
router.get('/:paymentId/receipt', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), paymentController.downloadReceipt);
router.get('/:paymentId', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), paymentController.getPaymentById);
// POST routes - specific routes before parameterized ones
router.post('/bulk-upload', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), upload.single('file'), paymentController.bulkUploadPayments);
router.post('/:paymentId/generate-receipt', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), paymentController.generateReceipt);
router.post('/', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), paymentController.createPayment);
// PUT routes
router.put('/:paymentId', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), paymentController.updatePayment);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map