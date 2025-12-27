#!/bin/bash

# Database Setup Script for VPS
# Run this on your VPS when migrations are disabled

cd /var/www/primeacademy_backend

echo "=========================================="
echo "DATABASE SETUP FOR VPS"
echo "=========================================="
echo ""

# Check if SQL file exists
if [ ! -f "database_setup_complete.sql" ]; then
    echo "✗ ERROR: database_setup_complete.sql not found!"
    echo ""
    echo "Please upload the SQL file first:"
    echo "  scp database_setup_complete.sql root@your-vps-ip:/var/www/primeacademy_backend/"
    exit 1
fi

echo "✓ SQL file found"
echo ""

# Get database credentials from .env
if [ -f ".env" ]; then
    DB_NAME=$(grep "^DB_NAME=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_USER=$(grep "^DB_USER=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    if [ -z "$DB_NAME" ]; then
        DB_NAME="primeacademy_db"
    fi
    if [ -z "$DB_USER" ]; then
        DB_USER="root"
    fi
else
    DB_NAME="primeacademy_db"
    DB_USER="root"
    DB_PASSWORD=""
fi

echo "Database Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Create database if it doesn't exist
echo "1. Creating database (if it doesn't exist)..."
if [ -z "$DB_PASSWORD" ]; then
    mysql -u "$DB_USER" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
else
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
fi

if [ $? -eq 0 ]; then
    echo "✓ Database created/verified"
else
    echo "✗ Failed to create database. Please check credentials."
    exit 1
fi
echo ""

# Run SQL file
echo "2. Running database setup SQL file..."
if [ -z "$DB_PASSWORD" ]; then
    mysql -u "$DB_USER" "$DB_NAME" < database_setup_complete.sql
else
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database_setup_complete.sql
fi

if [ $? -eq 0 ]; then
    echo "✓ SQL file executed successfully"
else
    echo "✗ Failed to execute SQL file. Check MySQL credentials and file permissions."
    exit 1
fi
echo ""

# Verify tables were created
echo "3. Verifying tables..."
if [ -z "$DB_PASSWORD" ]; then
    TABLE_COUNT=$(mysql -u "$DB_USER" "$DB_NAME" -e "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '$DB_NAME';" -s -N 2>/dev/null)
else
    TABLE_COUNT=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '$DB_NAME';" -s -N 2>/dev/null)
fi

if [ ! -z "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    echo "✓ Found $TABLE_COUNT tables in database"
else
    echo "⚠ Warning: Could not verify tables. Please check manually."
fi
echo ""

# List tables
echo "4. Listing tables..."
if [ -z "$DB_PASSWORD" ]; then
    mysql -u "$DB_USER" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null
else
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null
fi
echo ""

echo "=========================================="
echo "DATABASE SETUP COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart backend: pm2 restart backend-api"
echo "2. Check logs: pm2 logs backend-api"
echo "3. Test API: curl http://localhost:3001/api/health"
echo ""

