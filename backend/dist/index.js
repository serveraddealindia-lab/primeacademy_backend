"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const batch_routes_1 = __importDefault(require("./routes/batch.routes"));
const session_routes_1 = __importDefault(require("./routes/session.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const portfolio_routes_1 = __importDefault(require("./routes/portfolio.routes"));
const faculty_routes_1 = __importDefault(require("./routes/faculty.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const approval_routes_1 = __importDefault(require("./routes/approval.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const employee_routes_1 = __importDefault(require("./routes/employee.routes"));
const orientation_routes_1 = __importDefault(require("./routes/orientation.routes"));
const studentLeave_routes_1 = __importDefault(require("./routes/studentLeave.routes"));
const employeeLeave_routes_1 = __importDefault(require("./routes/employeeLeave.routes"));
const facultyLeave_routes_1 = __importDefault(require("./routes/facultyLeave.routes"));
const batchExtension_routes_1 = __importDefault(require("./routes/batchExtension.routes"));
const role_routes_1 = __importDefault(require("./routes/role.routes"));
const softwareCompletion_routes_1 = __importDefault(require("./routes/softwareCompletion.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const employeeAttendance_routes_1 = __importDefault(require("./routes/employeeAttendance.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const studentAttendance_routes_1 = __importDefault(require("./routes/studentAttendance.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const path_1 = __importDefault(require("path"));
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve uploaded files statically
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Routes
app.use('/api', health_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
// Debug: Log registered routes (development only)
if (process.env.NODE_ENV === 'development') {
    logger_1.logger.info('Registered auth routes: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me, POST /api/auth/impersonate/:userId');
}
app.use('/api/faculty', faculty_routes_1.default);
app.use('/api/batches', batch_routes_1.default);
app.use('/api/sessions', session_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api', portfolio_routes_1.default);
app.use('/api/payments', payment_routes_1.default);
app.use('/api/approvals', approval_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/employees', employee_routes_1.default);
app.use('/api/orientation', orientation_routes_1.default);
app.use('/api/student-leaves', studentLeave_routes_1.default);
app.use('/api/employee-leaves', employeeLeave_routes_1.default);
app.use('/api/faculty-leaves', facultyLeave_routes_1.default);
app.use('/api/batch-extensions', batchExtension_routes_1.default);
app.use('/api/roles', role_routes_1.default);
app.use('/api/software-completions', softwareCompletion_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/employee-attendance', employeeAttendance_routes_1.default);
app.use('/api/student-attendance', studentAttendance_routes_1.default);
app.use('/api/students', student_routes_1.default);
// Debug: Log registered student routes (development only)
if (process.env.NODE_ENV === 'development') {
    logger_1.logger.info('Registered student routes: POST /api/students/bulk-enroll, GET /api/students/template');
}
// Error handling middleware (must be last)
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
// Database connection and server startup
const startServer = async () => {
    try {
        // Test database connection
        await database_1.default.authenticate();
        logger_1.logger.info('Database connection established successfully.');
        // Sync database (use { force: true } only in development to drop and recreate tables)
        // In production, use migrations instead
        if (process.env.NODE_ENV === 'development') {
            await database_1.default.sync({ alter: false });
            logger_1.logger.info('Database models synchronized.');
        }
        // Start server
        app.listen(PORT, () => {
            logger_1.logger.info(`Server is running on port ${PORT}`);
            logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Unable to start server:', error);
        process.exit(1);
    }
};
startServer();
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM signal received: closing HTTP server');
    await database_1.default.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT signal received: closing HTTP server');
    await database_1.default.close();
    process.exit(0);
});
//# sourceMappingURL=index.js.map