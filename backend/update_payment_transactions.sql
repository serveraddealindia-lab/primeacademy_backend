-- Update payment_transactions table
-- Run these SQL statements in your MySQL database

-- 1. Add paidAmount column
ALTER TABLE payment_transactions 
ADD COLUMN paidAmount DECIMAL(10, 2) NOT NULL DEFAULT 0 
AFTER amount;

-- 2. Add enrollmentId column with foreign key
ALTER TABLE payment_transactions 
ADD COLUMN enrollmentId INT NULL 
AFTER studentId;

-- Add foreign key constraint for enrollmentId
ALTER TABLE payment_transactions 
ADD CONSTRAINT fk_payment_enrollment 
FOREIGN KEY (enrollmentId) REFERENCES enrollments(id) 
ON UPDATE CASCADE ON DELETE SET NULL;

-- 3. Add paymentMethod column
ALTER TABLE payment_transactions 
ADD COLUMN paymentMethod VARCHAR(255) NULL 
AFTER status;

-- 4. Add transactionId column
ALTER TABLE payment_transactions 
ADD COLUMN transactionId VARCHAR(255) NULL 
AFTER paymentMethod;

-- 5. Add notes column
ALTER TABLE payment_transactions 
ADD COLUMN notes TEXT NULL 
AFTER transactionId;

-- 6. Update status ENUM to include new values
ALTER TABLE payment_transactions 
MODIFY COLUMN status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') 
NOT NULL DEFAULT 'pending';

-- Verify the changes
DESCRIBE payment_transactions;




