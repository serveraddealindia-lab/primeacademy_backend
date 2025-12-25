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
const softwareCompletionController = __importStar(require("../controllers/softwareCompletion.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// POST /api/software-completions - Create completion record (Faculty/Admin/SuperAdmin only)
router.post('/', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.FACULTY, User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), softwareCompletionController.createCompletion);
// GET /api/software-completions - Get all completion records
router.get('/', auth_middleware_1.verifyTokenMiddleware, softwareCompletionController.getCompletions);
// PATCH /api/software-completions/:id - Update completion status (Faculty/Admin/SuperAdmin only)
router.patch('/:id', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.FACULTY, User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), softwareCompletionController.updateCompletion);
exports.default = router;
//# sourceMappingURL=softwareCompletion.routes.js.map