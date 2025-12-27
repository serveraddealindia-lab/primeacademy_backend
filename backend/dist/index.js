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
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = __importDefault(require("./config/database"));
const runMigrations_1 = require("./utils/runMigrations");
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const batch_routes_1 = __importDefault(require("./routes/batch.routes"));
const session_routes_1 = __importDefault(require("./routes/session.routes"));
const attendanceReport_routes_1 = __importDefault(require("./routes/attendanceReport.routes"));
const portfolio_routes_1 = __importDefault(require("./routes/portfolio.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
// __dirname is available in CommonJS
// import reportRoutes from './routes/report.routes';
const faculty_routes_1 = __importDefault(require("./routes/faculty.routes"));
// import approvalRoutes from './routes/approval.routes';
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
// import employeeAttendanceRoutes from './routes/employeeAttendance.routes';
// import studentRoutes from './routes/student.routes';
const studentAttendance_routes_1 = __importDefault(require("./routes/studentAttendance.routes"));
const enrollment_routes_1 = __importDefault(require("./routes/enrollment.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const certificate_routes_1 = __importDefault(require("./routes/certificate.routes"));
const course_routes_1 = __importDefault(require("./routes/course.routes"));
const biometric_routes_1 = __importDefault(require("./routes/biometric.routes"));
const studentSoftwareProgress_routes_1 = __importDefault(require("./routes/studentSoftwareProgress.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001', 10);
// Middleware
app.use((0, helmet_1.default)());
// CORS configuration - allow frontend domain
const corsOptions = {
    origin: process.env.FRONTEND_URL?.split(',').map((origin) => origin.trim()) || [
        'http://localhost:5173',
        'https://localhost:5173',
        'http://crm.prashantthakar.com',
        'https://crm.prashantthakar.com',
        'https://api.prashantthakar.com',
        'null', // Allow file:// origin for local testing
    ],
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use((0, cors_1.default)(corsOptions));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve uploaded files statically
// Use process.cwd() as base which should be the backend directory
// This matches where upload.controller.ts saves files: backend/uploads
const backendRoot = process.cwd();
let uploadsStaticPath = process.env.UPLOAD_ROOT
    ? path_1.default.resolve(process.env.UPLOAD_ROOT)
    : path_1.default.join(backendRoot, 'uploads');
// Fallback: try __dirname if process.cwd() doesn't have uploads
if (!fs_1.default.existsSync(uploadsStaticPath)) {
    const fallbackPath = path_1.default.resolve(__dirname, '../../uploads');
    if (fs_1.default.existsSync(fallbackPath)) {
        uploadsStaticPath = fallbackPath;
        logger_1.logger.info(`Using fallback uploads path from __dirname: ${uploadsStaticPath}`);
    }
}
if (!fs_1.default.existsSync(uploadsStaticPath)) {
    fs_1.default.mkdirSync(uploadsStaticPath, { recursive: true });
    logger_1.logger.info(`Created uploads directory: ${uploadsStaticPath}`);
}
logger_1.logger.info(`Serving uploads from: ${uploadsStaticPath}`);
logger_1.logger.info(`Backend root (process.cwd()): ${backendRoot}`);
logger_1.logger.info(`__dirname: ${__dirname}`);
// Serve uploads with proper headers - MUST be before API routes to avoid auth middleware
// Set CORS headers for all upload requests
const origin = req.headers.origin;
const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) || [
    'http://localhost:5173',
    'http://crm.prashantthakar.com',
];
// Set CORS headers for all upload requests
const origin = req.headers.origin;
const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) || [
    'http://localhost:5173',
    'http://crm.prashantthakar.com',
];
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
res.setHeader('Access-Control-Allow-Credentials', 'false'); // Must be false when origin is *
if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
}
next();
express_1.default.static(uploadsStaticPath, {
    setHeaders: (res, filePath) => {
        // Set proper content type for images
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        }
        else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        }
        else if (filePath.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
        }
        else if (filePath.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        }
        else if (filePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
        }
        // Cache control - allow caching but with revalidation
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate'); // Cache for 1 hour, then revalidate
        // Add CORS headers explicitly here too
        res.setHeader('Access-Control-Allow-Origin', '*');
    },
    index: false,
    dotfiles: 'ignore',
});
;
// Test endpoint to verify static file serving (no auth required)
app.get('/uploads/test', (_req, res) => {
    const fs = require('fs');
    const generalDir = path_1.default.join(uploadsStaticPath, 'general');
    const generalExists = fs.existsSync(generalDir);
    res.json({
        status: 'success',
        message: 'Static file serving is working',
        uploadsPath: uploadsStaticPath,
        generalDir: generalDir,
        generalExists: generalExists,
        note: 'Images should be accessible at /uploads/general/[filename]',
    });
});
// Serve orientation PDFs statically (must be before API routes to avoid conflicts)
// Try multiple paths to find orientations directory
let orientationsStaticPath = path_1.default.join(process.cwd(), 'orientations');
const altPath1 = path_1.default.resolve(__dirname, '../../orientations');
const altPath2 = path_1.default.resolve(__dirname, '../orientations');
// Prefer process.cwd() path, but check alternatives if it doesn't exist
if (!fs_1.default.existsSync(orientationsStaticPath)) {
    if (fs_1.default.existsSync(altPath1)) {
        orientationsStaticPath = altPath1;
        logger_1.logger.info(`Using orientations path from __dirname/../../: ${orientationsStaticPath}`);
    }
    else if (fs_1.default.existsSync(altPath2)) {
        orientationsStaticPath = altPath2;
        logger_1.logger.info(`Using orientations path from __dirname/../: ${orientationsStaticPath}`);
    }
    else {
        // Create in process.cwd() if none exist
        fs_1.default.mkdirSync(orientationsStaticPath, { recursive: true });
        logger_1.logger.info(`Created orientations directory: ${orientationsStaticPath}`);
    }
}
else {
    logger_1.logger.info(`Using orientations path from process.cwd(): ${orientationsStaticPath}`);
}
logger_1.logger.info(`Serving orientations from: ${orientationsStaticPath}`);
// List existing PDF files for debugging
try {
    const existingFiles = fs_1.default.readdirSync(orientationsStaticPath).filter(f => f.endsWith('.pdf'));
    if (existingFiles.length > 0) {
        logger_1.logger.info(`Found ${existingFiles.length} orientation PDF(s): ${existingFiles.join(', ')}`);
    }
    else {
        logger_1.logger.warn(`No PDF files found in orientations directory`);
    }
}
catch (err) {
    logger_1.logger.warn(`Could not list orientation files: ${err}`);
}
// Test endpoint to verify orientation file serving (no auth required)
app.get('/orientations/test', (_req, res) => {
    try {
        const files = fs_1.default.readdirSync(orientationsStaticPath).filter(f => f.endsWith('.pdf'));
        res.json({
            status: 'success',
            message: 'Orientations directory is accessible',
            path: orientationsStaticPath,
            files: files,
            note: 'PDFs should be accessible at /orientations/[filename]',
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Could not access orientations directory',
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
app.use('/orientations', (req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) || [
        'http://localhost:5173',
        'http://crm.prashantthakar.com',
    ];
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
}, express_1.default.static(orientationsStaticPath, {
    setHeaders: (res, _filePath) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    },
    index: false,
    dotfiles: 'ignore',
}));
// Serve receipts PDFs statically (must be before API routes to avoid conflicts)
let receiptsStaticPath = path_1.default.resolve(__dirname, '../../receipts');
const cwdReceiptsPath = path_1.default.join(process.cwd(), 'receipts');
if (fs_1.default.existsSync(cwdReceiptsPath) && !fs_1.default.existsSync(receiptsStaticPath)) {
    receiptsStaticPath = cwdReceiptsPath;
    logger_1.logger.info(`Using receipts path from process.cwd(): ${receiptsStaticPath}`);
}
if (!fs_1.default.existsSync(receiptsStaticPath)) {
    fs_1.default.mkdirSync(receiptsStaticPath, { recursive: true });
    logger_1.logger.info(`Created receipts directory: ${receiptsStaticPath}`);
}
logger_1.logger.info(`Serving receipts from: ${receiptsStaticPath}`);
app.use('/receipts', (req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) || [
        'http://localhost:5173',
        'http://crm.prashantthakar.com',
    ];
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
}, express_1.default.static(receiptsStaticPath, {
    setHeaders: (res, _filePath) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    },
    index: false,
    dotfiles: 'ignore',
}));
// Also serve receipts through /api/receipts/ for frontend compatibility
// Custom handler to properly decode filenames with special characters
app.use('/api/receipts', (req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) || [
        'http://localhost:5173',
        'http://crm.prashantthakar.com',
    ];
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    // For GET requests, handle filename decoding
    if (req.method === 'GET' && req.path) {
        // Decode the filename from the URL path
        const decodedPath = decodeURIComponent(req.path);
        const filepath = path_1.default.join(receiptsStaticPath, decodedPath);
        // Check if file exists
        if (fs_1.default.existsSync(filepath) && fs_1.default.statSync(filepath).isFile()) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.sendFile(filepath);
            return;
        }
    }
    // Fall back to static middleware for other cases
    next();
}, express_1.default.static(receiptsStaticPath, {
    setHeaders: (res, _filePath) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    },
    index: false,
    dotfiles: 'ignore',
}));
// Serve certificate PDFs statically (must be before API routes to avoid conflicts)
// This allows direct access to PDF files via /certificates/filename.pdf
// Use the same path calculation as certificate controller
// Calculate path: from dist/src or src, go up to backend root, then to certificates
let certificatesStaticPath = path_1.default.resolve(__dirname, '../../certificates');
// Also try process.cwd() as base (more reliable)
const cwdPath = path_1.default.join(process.cwd(), 'certificates');
if (fs_1.default.existsSync(cwdPath) && !fs_1.default.existsSync(certificatesStaticPath)) {
    certificatesStaticPath = cwdPath;
    logger_1.logger.info(`Using certificates path from process.cwd(): ${certificatesStaticPath}`);
}
if (!fs_1.default.existsSync(certificatesStaticPath)) {
    // Create the directory
    fs_1.default.mkdirSync(certificatesStaticPath, { recursive: true });
    logger_1.logger.info(`Created certificates directory: ${certificatesStaticPath}`);
}
logger_1.logger.info(`Serving certificates from: ${certificatesStaticPath}`);
logger_1.logger.info(`__dirname: ${__dirname}`);
logger_1.logger.info(`process.cwd(): ${process.cwd()}`);
// List existing PDF files for debugging
try {
    const existingFiles = fs_1.default.readdirSync(certificatesStaticPath).filter(f => f.endsWith('.pdf'));
    if (existingFiles.length > 0) {
        logger_1.logger.info(`Found ${existingFiles.length} certificate PDF(s): ${existingFiles.slice(0, 3).join(', ')}${existingFiles.length > 3 ? '...' : ''}`);
    }
    else {
        logger_1.logger.warn(`No PDF files found in certificates directory`);
    }
}
catch (err) {
    logger_1.logger.warn(`Could not list certificate files: ${err}`);
}
// Serve certificate PDFs statically
app.use('/certificates', express_1.default.static(certificatesStaticPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
        }
    },
    index: false, // Don't serve index files
    dotfiles: 'ignore', // Ignore dotfiles
}));
// Fallback route handler for PDF files (in case static middleware doesn't match)
// This must be placed AFTER static middleware but BEFORE 404 handler
app.get('/certificates/:filename', (req, res, next) => {
    const filename = req.params.filename;
    if (!filename.endsWith('.pdf')) {
        return next(); // Let other routes handle non-PDF files
    }
    // Try multiple path resolutions
    let filePath = path_1.default.resolve(certificatesStaticPath, filename);
    // If file doesn't exist, try alternative paths
    if (!fs_1.default.existsSync(filePath)) {
        const altPath1 = path_1.default.resolve(__dirname, '../../certificates', filename);
        const altPath2 = path_1.default.resolve(__dirname, '../certificates', filename);
        const altPath3 = path_1.default.join(process.cwd(), 'certificates', filename);
        // altPath4 would be same as filePath, already tried above
        logger_1.logger.warn(`Certificate file not found at primary path: ${filePath}`);
        logger_1.logger.info(`Trying alternative paths...`);
        if (fs_1.default.existsSync(altPath1)) {
            filePath = altPath1;
            logger_1.logger.info(`✓ Found certificate at: ${filePath}`);
        }
        else if (fs_1.default.existsSync(altPath2)) {
            filePath = altPath2;
            logger_1.logger.info(`✓ Found certificate at: ${filePath}`);
        }
        else if (fs_1.default.existsSync(altPath3)) {
            filePath = altPath3;
            logger_1.logger.info(`✓ Found certificate at: ${filePath}`);
        }
        else {
            logger_1.logger.error(`✗ Certificate file not found. Tried all paths:`);
            logger_1.logger.error(`  1. ${filePath}`);
            logger_1.logger.error(`  2. ${altPath1}`);
            logger_1.logger.error(`  3. ${altPath2}`);
            logger_1.logger.error(`  4. ${altPath3}`);
            logger_1.logger.error(`Certificates directory: ${certificatesStaticPath}`);
            logger_1.logger.error(`__dirname: ${__dirname}`);
            logger_1.logger.error(`process.cwd(): ${process.cwd()}`);
            // List files in certificates directory for debugging
            try {
                const files = fs_1.default.readdirSync(certificatesStaticPath);
                logger_1.logger.error(`Files in certificates directory: ${files.join(', ')}`);
            }
            catch (e) {
                logger_1.logger.error(`Could not read certificates directory: ${e}`);
            }
            return res.status(404).json({
                status: 'error',
                message: `Certificate file ${filename} not found`,
            });
        }
    }
    // Serve the file with proper headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath, (err) => {
        if (err) {
            logger_1.logger.error(`Error serving certificate file: ${err.message}`);
            if (!res.headersSent) {
                res.status(500).json({
                    status: 'error',
                    message: 'Error serving certificate file',
                });
            }
        }
        else {
            logger_1.logger.info(`Successfully served certificate: ${filename}`);
        }
    });
});
// Routes
app.use('/api', health_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
// Debug: Log registered routes (development only)
// if (process.env.NODE_ENV === 'development') {
//   logger.info('Registered auth routes: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me, POST /api/auth/impersonate/:userId');
// }
app.use('/api/faculty', faculty_routes_1.default);
app.use('/api/batches', batch_routes_1.default);
app.use('/api/sessions', session_routes_1.default);
// app.use('/api/reports', reportRoutes);
app.use('/api', portfolio_routes_1.default);
app.use('/api/payments', payment_routes_1.default);
// app.use('/api/approvals', approvalRoutes);
app.use('/api/upload', upload_routes_1.default);
if (process.env.NODE_ENV === 'development') {
    logger_1.logger.info('Upload routes registered: POST /api/upload');
}
app.use('/api/employees', employee_routes_1.default);
app.use('/api/orientation', orientation_routes_1.default);
app.use('/api/student-leaves', studentLeave_routes_1.default);
app.use('/api/employee-leaves', employeeLeave_routes_1.default);
app.use('/api/faculty-leaves', facultyLeave_routes_1.default);
app.use('/api/batch-extensions', batchExtension_routes_1.default);
app.use('/api/roles', role_routes_1.default);
app.use('/api/software-completions', softwareCompletion_routes_1.default);
app.use('/api/users', user_routes_1.default);
// app.use('/api/employee-attendance', employeeAttendanceRoutes);
app.use('/api/student-attendance', studentAttendance_routes_1.default);
app.use('/api/attendance-reports', attendanceReport_routes_1.default);
app.use('/api/enrollments', enrollment_routes_1.default);
app.use('/api/students', student_routes_1.default);
// Certificate API routes (must be after static file serving)
app.use('/api/certificates', certificate_routes_1.default);
app.use('/api/courses', course_routes_1.default);
app.use('/api/biometric', biometric_routes_1.default);
app.use('/api/student-software-progress', studentSoftwareProgress_routes_1.default);
// Log registered routes for debugging
logger_1.logger.info('=== Registered API Routes ===');
logger_1.logger.info('Student routes:');
logger_1.logger.info('  POST /api/students/unified-import');
logger_1.logger.info('  GET /api/students/template');
logger_1.logger.info('  POST /api/students/bulk-enroll');
logger_1.logger.info('  POST /api/students/enroll');
logger_1.logger.info('Payment routes:');
logger_1.logger.info('  POST /api/payments/bulk-upload');
logger_1.logger.info('  POST /api/payments/:paymentId/generate-receipt');
logger_1.logger.info('  GET /api/payments');
logger_1.logger.info('  POST /api/payments');
logger_1.logger.info('====================');
// Error handling middleware (must be last)
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
// Database connection and server startup
const startServer = async () => {
    try {
        // Test database connection
        await database_1.default.authenticate();
        logger_1.logger.info('Database connection established successfully.');
        // Run migrations - but don't crash if they fail
        try {
            await (0, runMigrations_1.runPendingMigrations)();
        }
        catch (migrationError) {
            // Log the error but continue server startup
            const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
            logger_1.logger.error('Migration failed, but continuing server startup:', errorMessage);
            logger_1.logger.warn('Server will start without applying migrations. Please check and fix migrations manually.');
        }
        // Sync database (use { force: true } only in development to drop and recreate tables)
        // In production, use migrations instead
        if (process.env.NODE_ENV === 'development') {
            await database_1.default.sync({ alter: false });
            logger_1.logger.info('Database models synchronized.');
        }
        // Start server - listen on 0.0.0.0 for production (allows external connections via nginx)
        if (process.env.NODE_ENV === 'production') {
            app.listen(PORT, '0.0.0.0', () => {
                logger_1.logger.info(`Server is running on 0.0.0.0:${PORT}`);
                logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            });
        }
        else {
            app.listen(PORT, () => {
                logger_1.logger.info(`Server is running on port ${PORT}`);
                logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Unable to start server:', error);
        // Only exit if it's a critical error (database connection failure)
        const errorMessage = String(error);
        if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('authentication')) {
            logger_1.logger.error('Critical database connection error. Server cannot start without database.');
            process.exit(1);
        }
        else {
            logger_1.logger.warn('Non-critical error. Server will attempt to start anyway.');
            // Try to start server even with non-critical errors
            try {
                app.listen(PORT, '0.0.0.0', () => {
                    logger_1.logger.warn(`Server started with warnings. Some features may not work correctly.`);
                });
            }
            catch (listenError) {
                logger_1.logger.error('Failed to start server:', listenError);
                process.exit(1);
            }
        }
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