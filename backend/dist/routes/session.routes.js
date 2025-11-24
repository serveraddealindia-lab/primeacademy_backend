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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sessionController = __importStar(require("../controllers/session.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// GET /sessions → get sessions (with optional filters: facultyId, batchId, status)
router.get('/', auth_middleware_1.verifyTokenMiddleware, sessionController.getSessions);
// POST /sessions → create session (faculty/admin)
router.post('/', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.FACULTY, User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), sessionController.createSession);
// POST /sessions/:id/checkin → faculty starts session (faculty-only)
router.post('/:id/checkin', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.FACULTY), sessionController.checkinSession);
// POST /sessions/:id/checkout → faculty ends session (faculty-only)
router.post('/:id/checkout', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.FACULTY), sessionController.checkoutSession);
// POST /sessions/:id/attendance → mark attendance
router.post('/:id/attendance', auth_middleware_1.verifyTokenMiddleware, sessionController.markAttendance);
exports.default = router;
//# sourceMappingURL=session.routes.js.map