import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import sequelize from './config/database';
import { runPendingMigrations } from './utils/runMigrations';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import batchRoutes from './routes/batch.routes';
import sessionRoutes from './routes/session.routes';
import attendanceReportRoutes from './routes/attendanceReport.routes';
import portfolioRoutes from './routes/portfolio.routes';
import paymentRoutes from './routes/payment.routes';

// __dirname is available in CommonJS
// import reportRoutes from './routes/report.routes';
import facultyRoutes from './routes/faculty.routes';
// import approvalRoutes from './routes/approval.routes';
import uploadRoutes from './routes/upload.routes';
import employeeRoutes from './routes/employee.routes';
import orientationRoutes from './routes/orientation.routes';
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
import courseRoutes from './routes/course.routes';
import biometricRoutes from './routes/biometric.routes';
import studentSoftwareProgressRoutes from './routes/studentSoftwareProgress.routes';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(helmet());
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
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
// Use process.cwd() as base which should be the backend directory
// This matches where upload.controller.ts saves files: backend/uploads
const backendRoot = process.cwd();
let uploadsStaticPath = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : path.join(backendRoot, 'uploads');

// Fallback: try __dirname if process.cwd() doesn't have uploads
if (!fs.existsSync(uploadsStaticPath)) {
  const fallbackPath = path.resolve(__dirname, '../../uploads');
  if (fs.existsSync(fallbackPath)) {
    uploadsStaticPath = fallbackPath;
    logger.info(`Using fallback uploads path from __dirname: ${uploadsStaticPath}`);
  }
}

if (!fs.existsSync(uploadsStaticPath)) {
  fs.mkdirSync(uploadsStaticPath, { recursive: true });
  logger.info(`Created uploads directory: ${uploadsStaticPath}`);
}
logger.info(`Serving uploads from: ${uploadsStaticPath}`);
logger.info(`Backend root (process.cwd()): ${backendRoot}`);
logger.info(`__dirname: ${__dirname}`);

// Serve uploads with proper headers - MUST be before API routes to avoid auth middleware
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for all upload requests
  const origin = req.headers.origin as string | undefined;
  const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) || [
    'http://localhost:5173',
    'http://crm.prashantthakar.com',
  ];
  
  // Always allow CORS for static files (needed for file:// and localhost)
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
}, express.static(uploadsStaticPath, {
  setHeaders: (res, filePath) => {
    // Set proper content type for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
    // Cache control - allow caching but with revalidation
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate'); // Cache for 1 hour, then revalidate
    // Add CORS headers explicitly here too
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
  index: false,
  dotfiles: 'ignore',
}));

// Test endpoint to verify static file serving (no auth required)
app.get('/uploads/test', (_req, res) => {
  const fs = require('fs');
  const generalDir = path.join(uploadsStaticPath, 'general');
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
let orientationsStaticPath = path.join(process.cwd(), 'orientations');
const altPath1 = path.resolve(__dirname, '../../orientations');
const altPath2 = path.resolve(__dirname, '../orientations');

// Prefer process.cwd() path, but check alternatives if it doesn't exist
if (!fs.existsSync(orientationsStaticPath)) {
  if (fs.existsSync(altPath1)) {
    orientationsStaticPath = altPath1;
    logger.info(`Using orientations path from __dirname/../../: ${orientationsStaticPath}`);
  } else if (fs.existsSync(altPath2)) {
    orientationsStaticPath = altPath2;
    logger.info(`Using orientations path from __dirname/../: ${orientationsStaticPath}`);
  } else {
    // Create in process.cwd() if none exist
    fs.mkdirSync(orientationsStaticPath, { recursive: true });
    logger.info(`Created orientations directory: ${orientationsStaticPath}`);
  }
} else {
  logger.info(`Using orientations path from process.cwd(): ${orientationsStaticPath}`);
}
logger.info(`Serving orientations from: ${orientationsStaticPath}`);

// List existing PDF files for debugging
try {
  const existingFiles = fs.readdirSync(orientationsStaticPath).filter(f => f.endsWith('.pdf'));
  if (existingFiles.length > 0) {
    logger.info(`Found ${existingFiles.length} orientation PDF(s): ${existingFiles.join(', ')}`);
  } else {
    logger.warn(`No PDF files found in orientations directory`);
  }
} catch (err) {
  logger.warn(`Could not list orientation files: ${err}`);
}

// Test endpoint to verify orientation file serving (no auth required)
app.get('/orientations/test', (_req, res) => {
  try {
    const files = fs.readdirSync(orientationsStaticPath).filter(f => f.endsWith('.pdf'));
    res.json({
      status: 'success',
      message: 'Orientations directory is accessible',
      path: orientationsStaticPath,
      files: files,
      note: 'PDFs should be accessible at /orientations/[filename]',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Could not access orientations directory',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.use('/orientations', (req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) || [
    'http://localhost:5173',
    'http://crm.prashantthakar.com',
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
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
}, express.static(orientationsStaticPath, {
  setHeaders: (res, _filePath) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  },
  index: false,
  dotfiles: 'ignore',
}));

// Serve receipts PDFs statically (must be before API routes to avoid conflicts)
let receiptsStaticPath = path.resolve(__dirname, '../../receipts');
const cwdReceiptsPath = path.join(process.cwd(), 'receipts');
if (fs.existsSync(cwdReceiptsPath) && !fs.existsSync(receiptsStaticPath)) {
  receiptsStaticPath = cwdReceiptsPath;
  logger.info(`Using receipts path from process.cwd(): ${receiptsStaticPath}`);
}

if (!fs.existsSync(receiptsStaticPath)) {
  fs.mkdirSync(receiptsStaticPath, { recursive: true });
  logger.info(`Created receipts directory: ${receiptsStaticPath}`);
}
logger.info(`Serving receipts from: ${receiptsStaticPath}`);

app.use('/receipts', (req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) || [
    'http://localhost:5173',
    'http://crm.prashantthakar.com',
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
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
}, express.static(receiptsStaticPath, {
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
  const origin = req.headers.origin as string | undefined;
  const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) || [
    'http://localhost:5173',
    'http://crm.prashantthakar.com',
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
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
    const filepath = path.join(receiptsStaticPath, decodedPath);
    
    // Check if file exists
    if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.sendFile(filepath);
      return;
    }
  }
  
  // Fall back to static middleware for other cases
  next();
}, express.static(receiptsStaticPath, {
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
    // altPath4 would be same as filePath, already tried above
    
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

app.use('/api/faculty', facultyRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/sessions', sessionRoutes);
// app.use('/api/reports', reportRoutes);
app.use('/api', portfolioRoutes);
app.use('/api/payments', paymentRoutes);
// app.use('/api/approvals', approvalRoutes);
app.use('/api/upload', uploadRoutes);
if (process.env.NODE_ENV === 'development') {
  logger.info('Upload routes registered: POST /api/upload');
}
app.use('/api/employees', employeeRoutes);
app.use('/api/orientation', orientationRoutes);
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
app.use('/api/courses', courseRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/student-software-progress', studentSoftwareProgressRoutes);

// Log registered routes for debugging
logger.info('=== Registered API Routes ===');
logger.info('Student routes:');
logger.info('  POST /api/students/unified-import');
logger.info('  GET /api/students/template');
logger.info('  POST /api/students/bulk-enroll');
logger.info('  POST /api/students/enroll');
logger.info('Payment routes:');
logger.info('  POST /api/payments/bulk-upload');
logger.info('  POST /api/payments/:paymentId/generate-receipt');
logger.info('  GET /api/payments');
logger.info('  POST /api/payments');
logger.info('====================');

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Run migrations - but don't crash if they fail
    try {
      await runPendingMigrations();
    } catch (migrationError: unknown) {
      // Log the error but continue server startup
      const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
      logger.error('Migration failed, but continuing server startup:', errorMessage);
      logger.warn('Server will start without applying migrations. Please check and fix migrations manually.');
    }

    // Sync database (use { force: true } only in development to drop and recreate tables)
    // In production, use migrations instead
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized.');
    }

    // Start server - listen on 0.0.0.0 for production (allows external connections via nginx)
    if (process.env.NODE_ENV === 'production') {
      app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Server is running on 0.0.0.0:${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } else {
      app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    }
  } catch (error) {
    logger.error('Unable to start server:', error);
    // Only exit if it's a critical error (database connection failure)
    const errorMessage = String(error);
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('authentication')) {
      logger.error('Critical database connection error. Server cannot start without database.');
      process.exit(1);
    } else {
      logger.warn('Non-critical error. Server will attempt to start anyway.');
      // Try to start server even with non-critical errors
      try {
        app.listen(PORT, '0.0.0.0', () => {
          logger.warn(`Server started with warnings. Some features may not work correctly.`);
        });
      } catch (listenError) {
        logger.error('Failed to start server:', listenError);
        process.exit(1);
      }
    }
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
