import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sequelize from './config/database';
import { runPendingMigrations } from './utils/runMigrations';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import batchRoutes from './routes/batch.routes';
import sessionRoutes from './routes/session.routes';
import attendanceReportRoutes from './routes/attendanceReport.routes';
import portfolioRoutes from './routes/portfolio.routes';
import paymentRoutes from './routes/payment.routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// import reportRoutes from './routes/report.routes';
// import facultyRoutes from './routes/faculty.routes';
// import approvalRoutes from './routes/approval.routes';
import uploadRoutes from './routes/upload.routes';
import employeeRoutes from './routes/employee.routes';
// import orientationRoutes from './routes/orientation.routes';
import studentLeaveRoutes from './routes/studentLeave.routes';
import employeeLeaveRoutes from './routes/employeeLeave.routes';
import facultyLeaveRoutes from './routes/facultyLeave.routes';
import batchExtensionRoutes from './routes/batchExtension.routes';
import roleRoutes from './routes/role.routes';
import softwareCompletionRoutes from './routes/softwareCompletion.routes';
import userRoutes from './routes/user.routes';
// import employeeAttendanceRoutes from './routes/employeeAttendance.routes';
// import studentRoutes from './routes/student.routes';
import studentAttendanceRoutes from './routes/studentAttendance.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import studentRoutes from './routes/student.routes';
import certificateRoutes from './routes/certificate.routes';
import biometricRoutes from './routes/biometric.routes';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import path from 'path';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
// CORS configuration - allow frontend domain
const corsOptions = {
  origin: process.env.FRONTEND_URL?.split(',').map((origin) => origin.trim()) || [
    'http://localhost:5173',
    'http://crm.prashantthakar.com',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve certificate PDFs statically (must be before API routes to avoid conflicts)
// This allows direct access to PDF files via /certificates/filename.pdf
// Use the same path calculation as certificate controller
// Calculate path: from dist/src or src, go up to backend root, then to certificates
let certificatesStaticPath = path.resolve(__dirname, '../../certificates');

// Also try process.cwd() as base (more reliable)
const cwdPath = path.join(process.cwd(), 'certificates');
if (fs.existsSync(cwdPath) && !fs.existsSync(certificatesStaticPath)) {
  certificatesStaticPath = cwdPath;
  logger.info(`Using certificates path from process.cwd(): ${certificatesStaticPath}`);
}

if (!fs.existsSync(certificatesStaticPath)) {
  // Create the directory
  fs.mkdirSync(certificatesStaticPath, { recursive: true });
  logger.info(`Created certificates directory: ${certificatesStaticPath}`);
}

logger.info(`Serving certificates from: ${certificatesStaticPath}`);
logger.info(`__dirname: ${__dirname}`);
logger.info(`process.cwd(): ${process.cwd()}`);

// List existing PDF files for debugging
try {
  const existingFiles = fs.readdirSync(certificatesStaticPath).filter(f => f.endsWith('.pdf'));
  if (existingFiles.length > 0) {
    logger.info(`Found ${existingFiles.length} certificate PDF(s): ${existingFiles.slice(0, 3).join(', ')}${existingFiles.length > 3 ? '...' : ''}`);
  } else {
    logger.warn(`No PDF files found in certificates directory`);
  }
} catch (err) {
  logger.warn(`Could not list certificate files: ${err}`);
}
// Serve certificate PDFs statically
app.use('/certificates', express.static(certificatesStaticPath, {
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
  let filePath = path.resolve(certificatesStaticPath, filename);
  
  // If file doesn't exist, try alternative paths
  if (!fs.existsSync(filePath)) {
    const altPath1 = path.resolve(__dirname, '../../certificates', filename);
    const altPath2 = path.resolve(__dirname, '../certificates', filename);
    const altPath3 = path.join(process.cwd(), 'certificates', filename);
    const altPath4 = path.join(certificatesStaticPath, filename); // Already tried, but log it
    
    logger.warn(`Certificate file not found at primary path: ${filePath}`);
    logger.info(`Trying alternative paths...`);
    
    if (fs.existsSync(altPath1)) {
      filePath = altPath1;
      logger.info(`✓ Found certificate at: ${filePath}`);
    } else if (fs.existsSync(altPath2)) {
      filePath = altPath2;
      logger.info(`✓ Found certificate at: ${filePath}`);
    } else if (fs.existsSync(altPath3)) {
      filePath = altPath3;
      logger.info(`✓ Found certificate at: ${filePath}`);
    } else {
      logger.error(`✗ Certificate file not found. Tried all paths:`);
      logger.error(`  1. ${filePath}`);
      logger.error(`  2. ${altPath1}`);
      logger.error(`  3. ${altPath2}`);
      logger.error(`  4. ${altPath3}`);
      logger.error(`Certificates directory: ${certificatesStaticPath}`);
      logger.error(`__dirname: ${__dirname}`);
      logger.error(`process.cwd(): ${process.cwd()}`);
      
      // List files in certificates directory for debugging
      try {
        const files = fs.readdirSync(certificatesStaticPath);
        logger.error(`Files in certificates directory: ${files.join(', ')}`);
      } catch (e) {
        logger.error(`Could not read certificates directory: ${e}`);
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
      logger.error(`Error serving certificate file: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          message: 'Error serving certificate file',
        });
      }
    } else {
      logger.info(`Successfully served certificate: ${filename}`);
    }
  });
});

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);

// Debug: Log registered routes (development only)
// if (process.env.NODE_ENV === 'development') {
//   logger.info('Registered auth routes: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me, POST /api/auth/impersonate/:userId');
// }

// app.use('/api/faculty', facultyRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/sessions', sessionRoutes);
// app.use('/api/reports', reportRoutes);
app.use('/api', portfolioRoutes);
app.use('/api/payments', paymentRoutes);
if (process.env.NODE_ENV === 'development') {
  logger.info('Payment routes registered: GET /api/payments, GET /api/payments/:id, POST /api/payments, PUT /api/payments/:id');
}
// app.use('/api/approvals', approvalRoutes);
app.use('/api/upload', uploadRoutes);
if (process.env.NODE_ENV === 'development') {
  logger.info('Upload routes registered: POST /api/upload');
}
app.use('/api/employees', employeeRoutes);
// app.use('/api/orientation', orientationRoutes);
app.use('/api/student-leaves', studentLeaveRoutes);
app.use('/api/employee-leaves', employeeLeaveRoutes);
app.use('/api/faculty-leaves', facultyLeaveRoutes);
app.use('/api/batch-extensions', batchExtensionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/software-completions', softwareCompletionRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/employee-attendance', employeeAttendanceRoutes);
app.use('/api/student-attendance', studentAttendanceRoutes);
app.use('/api/attendance-reports', attendanceReportRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/students', studentRoutes);
// Certificate API routes (must be after static file serving)
app.use('/api/certificates', certificateRoutes);
app.use('/api/biometric', biometricRoutes);

// Debug: Log registered student routes (development only)
// if (process.env.NODE_ENV === 'development') {
//   logger.info('Registered student routes: POST /api/students/bulk-enroll, GET /api/students/template');
// }

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    await runPendingMigrations();
    logger.info('Database connection established successfully.');

    // Sync database (use { force: true } only in development to drop and recreate tables)
    // In production, use migrations instead
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized.');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

