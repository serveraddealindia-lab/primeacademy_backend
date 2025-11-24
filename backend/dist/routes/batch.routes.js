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
const batchController = __importStar(require("../controllers/batch.controller"));
const batchProgressController = __importStar(require("../controllers/batchProgress.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// GET /batches → list all batches with related faculty and enrolled students
router.get('/', auth_middleware_1.verifyTokenMiddleware, batchController.getAllBatches);
// GET /batches/progress → get batch-wise progress list with search and export
router.get('/progress', auth_middleware_1.verifyTokenMiddleware, batchProgressController.getBatchProgress);
// POST /batches → create batch (admin only)
router.post('/', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), batchController.createBatch);
// IMPORTANT: More specific routes must come before generic :id routes
// GET /batches/:id/candidates/suggest → suggest eligible students
router.get('/:id/candidates/suggest', auth_middleware_1.verifyTokenMiddleware, batchController.suggestCandidates);
// GET /batches/:id/enrollments → get batch enrollments
router.get('/:id/enrollments', auth_middleware_1.verifyTokenMiddleware, batchController.getBatchEnrollments);
// PUT /batches/:id/faculty → assign faculty to batch
router.put('/:id/faculty', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), batchController.assignFacultyToBatch);
// Generic routes for single batch operations (must come after specific routes)
// GET /batches/:id → get single batch by ID
router.get('/:id', auth_middleware_1.verifyTokenMiddleware, batchController.getBatchById);
// PUT /batches/:id → update batch (admin only)
router.put('/:id', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), batchController.updateBatch);
// DELETE /batches/:id → delete batch (admin only)
router.delete('/:id', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), batchController.deleteBatch);
exports.default = router;
//# sourceMappingURL=batch.routes.js.map