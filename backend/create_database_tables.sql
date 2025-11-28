-- Prime Academy Database Setup Script
-- Run this script in your MySQL database to create all necessary tables

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE primeacademy_db;

-- Table: users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `phone` VARCHAR(255) NULL,
  `role` ENUM('superadmin', 'admin', 'faculty', 'student', 'employee') NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `avatarUrl` VARCHAR(1000) NULL,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`),
  INDEX `idx_isActive` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: student_profiles
CREATE TABLE IF NOT EXISTS `student_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL UNIQUE,
  `dob` DATE NULL,
  `address` TEXT NULL,
  `documents` JSON NULL,
  `photoUrl` VARCHAR(1000) NULL,
  `softwareList` JSON NULL,
  `enrollmentDate` DATE NULL,
  `status` VARCHAR(50) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_userId` (`userId`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: batches
CREATE TABLE IF NOT EXISTS `batches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `software` VARCHAR(255) NULL,
  `mode` VARCHAR(50) NULL,
  `status` VARCHAR(50) DEFAULT 'active',
  `capacity` INT DEFAULT 0,
  `startDate` DATE NULL,
  `endDate` DATE NULL,
  `schedule` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_software` (`software`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: enrollments
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `batchId` INT NOT NULL,
  `enrollmentDate` DATE NULL,
  `status` VARCHAR(50) DEFAULT 'active',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_batchId` (`batchId`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: employee_profiles
CREATE TABLE IF NOT EXISTS `employee_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL UNIQUE,
  `employeeId` VARCHAR(255) NOT NULL UNIQUE,
  `gender` ENUM('Male', 'Female', 'Other') NULL,
  `dateOfBirth` DATE NULL,
  `nationality` VARCHAR(255) NULL,
  `maritalStatus` ENUM('Single', 'Married', 'Other') NULL,
  `department` VARCHAR(255) NULL,
  `designation` VARCHAR(255) NULL,
  `dateOfJoining` DATE NULL,
  `employmentType` ENUM('Full-Time', 'Part-Time', 'Contract', 'Intern') NULL,
  `reportingManager` VARCHAR(255) NULL,
  `workLocation` VARCHAR(255) NULL,
  `bankName` VARCHAR(255) NULL,
  `accountNumber` VARCHAR(255) NULL,
  `ifscCode` VARCHAR(255) NULL,
  `branch` VARCHAR(255) NULL,
  `panNumber` VARCHAR(255) NULL,
  `city` VARCHAR(255) NULL,
  `state` VARCHAR(255) NULL,
  `postalCode` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_userId` (`userId`),
  INDEX `idx_employeeId` (`employeeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: payment_transactions
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NULL,
  `enrollmentId` INT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `paidAmount` DECIMAL(10, 2) DEFAULT 0,
  `status` ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending',
  `paymentMethod` VARCHAR(100) NULL,
  `transactionId` VARCHAR(255) NULL,
  `dueDate` DATE NULL,
  `paidDate` DATE NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`enrollmentId`) REFERENCES `enrollments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_enrollmentId` (`enrollmentId`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: SequelizeMeta (for migration tracking)
CREATE TABLE IF NOT EXISTS `SequelizeMeta` (
  `name` VARCHAR(255) NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert a dummy student (optional - uncomment if needed)
-- Password hash for 'Student@123' (bcrypt, salt rounds: 10)
-- INSERT INTO `users` (`name`, `email`, `phone`, `role`, `passwordHash`, `isActive`) 
-- VALUES ('John Doe', 'john.doe@primeacademy.local', '+1234567890', 'student', '$2b$10$rQ8K8K8K8K8K8K8K8K8K8uK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K', TRUE);

-- Note: To generate password hash, use: bcrypt.hash('Student@123', 10)
-- Or use the API endpoint POST /api/students/create-dummy to create a student with proper password hashing

-- Create certificates table
CREATE TABLE IF NOT EXISTS `certificates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `courseName` VARCHAR(255) NOT NULL,
  `softwareCovered` JSON NOT NULL,
  `grade` VARCHAR(10) NOT NULL,
  `monthOfCompletion` VARCHAR(50) NOT NULL,
  `certificateNumber` VARCHAR(255) NOT NULL UNIQUE,
  `pdfUrl` VARCHAR(500) NULL,
  `issuedBy` INT NULL,
  `issuedAt` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`issuedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_certificateNumber` (`certificateNumber`),
  INDEX `idx_issuedBy` (`issuedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: biometric_devices
CREATE TABLE IF NOT EXISTS `biometric_devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `deviceName` VARCHAR(255) NOT NULL,
  `deviceType` ENUM('push-api', 'pull-api') NOT NULL,
  `ipAddress` VARCHAR(255) NULL,
  `port` INT NULL,
  `apiUrl` VARCHAR(500) NULL,
  `authKey` VARCHAR(255) NULL,
  `lastSyncAt` DATETIME NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'inactive',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_deviceType` (`deviceType`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: attendance_logs
CREATE TABLE IF NOT EXISTS `attendance_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employeeId` INT NOT NULL,
  `deviceId` INT NOT NULL,
  `punchTime` DATETIME NOT NULL,
  `punchType` ENUM('in', 'out') NOT NULL,
  `rawPayload` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`deviceId`) REFERENCES `biometric_devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_employeeId_punchTime` (`employeeId`, `punchTime`),
  INDEX `idx_deviceId` (`deviceId`),
  INDEX `idx_punchTime` (`punchTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

