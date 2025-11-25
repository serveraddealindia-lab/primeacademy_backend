import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import sequelize from './config/database';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import batchRoutes from './routes/batch.routes';
// import sessionRoutes from './routes/session.routes';
// import reportRoutes from './routes/report.routes';
// import portfolioRoutes from './routes/portfolio.routes';
// import facultyRoutes from './routes/faculty.routes';
// import paymentRoutes from './routes/payment.routes';
// import approvalRoutes from './routes/approval.routes';
// import uploadRoutes from './routes/upload.routes';
// import employeeRoutes from './routes/employee.routes';
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

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);

// Debug: Log registered routes (development only)
// if (process.env.NODE_ENV === 'development') {
//   logger.info('Registered auth routes: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me, POST /api/auth/impersonate/:userId');
// }

// app.use('/api/faculty', facultyRoutes);
app.use('/api/batches', batchRoutes);
// app.use('/api/sessions', sessionRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api', portfolioRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/approvals', approvalRoutes);
// app.use('/api/upload', uploadRoutes);
// app.use('/api/employees', employeeRoutes);
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
// app.use('/api/students', studentRoutes);

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

