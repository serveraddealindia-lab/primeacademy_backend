#!/bin/bash

# Update Existing Database on VPS
# This script updates your existing primeacademy_db database

cd /var/www/primeacademy_backend

echo "=========================================="
echo "UPDATE DATABASE ON VPS"
echo "=========================================="
echo ""

# Database credentials
DB_NAME="primeacademy_db"
DB_USER="primeacademy_user"

echo "Database: $DB_NAME"
echo "User: $DB_USER"
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

# Get password from .env or ask
if [ -f ".env" ]; then
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
fi

# Backup existing database first
echo "1. Creating backup of existing database..."
BACKUP_FILE="primeacademy_db_backup_$(date +%Y%m%d_%H%M%S).sql"
if [ -z "$DB_PASSWORD" ]; then
    mysqldump -u "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null
else
    mysqldump -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null
fi

if [ $? -eq 0 ]; then
    echo "✓ Backup created: $BACKUP_FILE"
    echo "  Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "⚠ Warning: Backup failed, but continuing..."
fi
echo ""

# Run SQL file to update database
echo "2. Updating database with SQL file..."
echo "   This may take a few moments..."
echo ""

if [ -z "$DB_PASSWORD" ]; then
    mysql -u "$DB_USER" "$DB_NAME" < database_setup_complete.sql
else
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database_setup_complete.sql
fi

if [ $? -eq 0 ]; then
    echo "✓ Database updated successfully"
else
    echo "✗ Failed to update database"
    echo ""
    echo "If there were errors, you can restore from backup:"
    echo "  mysql -u $DB_USER -p $DB_NAME < $BACKUP_FILE"
    exit 1
fi
echo ""

# Verify update
echo "3. Verifying database update..."
if [ -z "$DB_PASSWORD" ]; then
    TABLE_COUNT=$(mysql -u "$DB_USER" "$DB_NAME" -e "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '$DB_NAME';" -s -N 2>/dev/null)
else
    TABLE_COUNT=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '$DB_NAME';" -s -N 2>/dev/null)
fi

if [ ! -z "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    echo "✓ Database has $TABLE_COUNT tables"
else
    echo "⚠ Warning: Could not verify table count"
fi
echo ""

# Show tables
echo "4. Current tables in database:"
if [ -z "$DB_PASSWORD" ]; then
    mysql -u "$DB_USER" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | head -20
else
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | head -20
fi
echo ""

echo "=========================================="
echo "DATABASE UPDATE COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart backend: pm2 restart backend-api"
echo "2. Check logs: pm2 logs backend-api"
echo "3. Test API: curl http://localhost:3001/api/health"
echo ""
echo "Backup saved at: $BACKUP_FILE"
echo ""

