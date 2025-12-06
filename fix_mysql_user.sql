-- Fix MySQL User for Prime Academy
-- Run this as MySQL root user: mysql -u root -p < fix_mysql_user.sql
-- Or copy and paste these commands into MySQL

-- Drop the user if it exists (to recreate with correct password)
DROP USER IF EXISTS 'primeacademy_user'@'localhost';

-- Create the user with the password from .env
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'StrongAppPassword!123';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';

-- If database doesn't exist, create it
CREATE DATABASE IF NOT EXISTS primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Verify the user was created
SELECT User, Host FROM mysql.user WHERE User = 'primeacademy_user';

-- Test the connection (this will show if it works)
-- You can test manually: mysql -u primeacademy_user -p primeacademy_db





