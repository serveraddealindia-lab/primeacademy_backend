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
const roleController = __importStar(require("../controllers/role.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// POST /api/roles - Create role (SuperAdmin only)
router.post('/', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.SUPERADMIN), roleController.createRole);
// GET /api/roles - Get all roles (Admin/SuperAdmin only)
router.get('/', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), roleController.getRoles);
// GET /api/roles/:id - Get single role (Admin/SuperAdmin only)
router.get('/:id', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), roleController.getRole);
// PUT /api/roles/:id - Update role (SuperAdmin only)
router.put('/:id', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.SUPERADMIN), roleController.updateRole);
// DELETE /api/roles/:id - Delete role (SuperAdmin only)
router.delete('/:id', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.SUPERADMIN), roleController.deleteRole);
// User role assignment routes
// POST /api/roles/users/:id/assign - Assign role to user
router.post('/users/:id/assign', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), roleController.assignRoleToUser);
// DELETE /api/roles/users/:id/roles/:roleId - Unassign role from user
router.delete('/users/:id/roles/:roleId', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), roleController.unassignRoleFromUser);
// GET /api/roles/users/:id/roles - Get user roles
router.get('/users/:id/roles', auth_middleware_1.verifyTokenMiddleware, roleController.getUserRoles);
exports.default = router;
//# sourceMappingURL=role.routes.js.map