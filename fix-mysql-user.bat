@echo off
echo ========================================
echo Fix MySQL User for Prime Academy
echo ========================================
echo.
echo This script will help you fix the MySQL user.
echo.
echo Step 1: Connect to MySQL as root
echo.
mysql -u root -p -e "DROP USER IF EXISTS 'primeacademy_user'@'localhost'; CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'StrongAppPassword!123'; GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost'; CREATE DATABASE IF NOT EXISTS primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; FLUSH PRIVILEGES; SELECT 'User created successfully!' AS Status;"
echo.
echo ========================================
echo If successful, restart your backend server
echo ========================================
pause



