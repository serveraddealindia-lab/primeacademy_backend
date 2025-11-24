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
const userController = __importStar(require("../controllers/user.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// GET /api/users - Get all users (Admin/SuperAdmin only)
router.get('/', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), userController.getAllUsers);
// PUT /api/users/:id/student-profile - Update student profile (must be before /:id)
router.put('/:id/student-profile', auth_middleware_1.verifyTokenMiddleware, userController.updateStudentProfile);
// PUT /api/users/:id/faculty-profile - Update faculty profile (must be before /:id)
router.put('/:id/faculty-profile', auth_middleware_1.verifyTokenMiddleware, userController.updateFacultyProfile);
// PUT /api/users/:id/employee-profile - Update employee profile (must be before /:id)
router.put('/:id/employee-profile', auth_middleware_1.verifyTokenMiddleware, userController.updateEmployeeProfile);
// POST /api/users/:id/login-as → login as user (superadmin only) - Must be before /:id route
router.post('/:id/login-as', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.SUPERADMIN), userController.loginAsUser);
// GET /api/users/:id - Get user by ID
router.get('/:id', auth_middleware_1.verifyTokenMiddleware, userController.getUserById);
// PUT /api/users/:id - Update user
router.put('/:id', auth_middleware_1.verifyTokenMiddleware, userController.updateUser);
// DELETE /api/users/:id - Delete user (Admin/SuperAdmin only)
router.delete('/:id', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), userController.deleteUser);
exports.default = router;
//# sourceMappingURL=user.routes.js.map