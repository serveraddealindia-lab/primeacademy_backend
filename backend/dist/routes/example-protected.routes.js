"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// Example: Protected route that requires authentication (any role)
router.get('/protected', auth_middleware_1.verifyTokenMiddleware, (req, res) => {
    res.json({
        status: 'success',
        message: 'This is a protected route',
        user: req.user,
    });
});
// Example: Admin-only route
router.get('/admin-only', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.ADMIN, User_1.UserRole.SUPERADMIN), (req, res) => {
    res.json({
        status: 'success',
        message: 'This route is only accessible to admins',
        user: req.user,
    });
});
// Example: Faculty-only route
router.get('/faculty-only', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.FACULTY), (req, res) => {
    res.json({
        status: 'success',
        message: 'This route is only accessible to faculty',
        user: req.user,
    });
});
// Example: Student-only route
router.get('/student-only', auth_middleware_1.verifyTokenMiddleware, (0, auth_middleware_1.checkRole)(User_1.UserRole.STUDENT), (req, res) => {
    res.json({
        status: 'success',
        message: 'This route is only accessible to students',
        user: req.user,
    });
});
exports.default = router;
//# sourceMappingURL=example-protected.routes.js.map