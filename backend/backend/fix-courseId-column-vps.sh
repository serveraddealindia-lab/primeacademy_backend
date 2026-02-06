#!/bin/bash

# Fix courseId column in batches table
# Run this on your VPS

cd /var/www/primeacademy_backend

echo "=========================================="
echo "FIXING courseId COLUMN IN batches TABLE"
echo "=========================================="
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
        DB_USER="primeacademy_user"
    fi
else
    DB_NAME="primeacademy_db"
    DB_USER="primeacademy_user"
    DB_PASSWORD=""
fi

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if courseId column exists
echo "1. Checking if courseId column exists..."
if [ -z "$DB_PASSWORD" ]; then
    COLUMN_EXISTS=$(mysql -u "$DB_USER" "$DB_NAME" -e "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'batches' AND COLUMN_NAME = 'courseId';" -s -N 2>/dev/null)
else
    COLUMN_EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'batches' AND COLUMN_NAME = 'courseId';" -s -N 2>/dev/null)
fi

if [ "$COLUMN_EXISTS" = "1" ]; then
    echo "✓ courseId column already exists"
    exit 0
fi

echo "✗ courseId column not found - adding it..."
echo ""

# Add courseId column
echo "2. Adding courseId column to batches table..."

# Create SQL command
SQL_COMMAND="ALTER TABLE \`batches\` ADD COLUMN \`courseId\` int(11) DEFAULT NULL AFTER \`status\`;"

if [ -z "$DB_PASSWORD" ]; then
    mysql -u "$DB_USER" "$DB_NAME" -e "$SQL_COMMAND" 2>/dev/null
else
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "$SQL_COMMAND" 2>/dev/null
fi

if [ $? -eq 0 ]; then
    echo "✓ Column added successfully"
else
    echo "✗ Failed to add column. Trying alternative method..."
    
    # Alternative: Use a SQL file
    cat > /tmp/add_courseId.sql << EOF
USE $DB_NAME;
ALTER TABLE \`batches\` ADD COLUMN \`courseId\` int(11) DEFAULT NULL AFTER \`status\`;
EOF
    
    if [ -z "$DB_PASSWORD" ]; then
        mysql -u "$DB_USER" < /tmp/add_courseId.sql
    else
        mysql -u "$DB_USER" -p"$DB_PASSWORD" < /tmp/add_courseId.sql
    fi
    
    if [ $? -eq 0 ]; then
        echo "✓ Column added using SQL file method"
    else
        echo "✗ Failed to add column. Please run manually:"
        echo "  mysql -u $DB_USER -p $DB_NAME"
        echo "  ALTER TABLE batches ADD COLUMN courseId int(11) DEFAULT NULL AFTER status;"
        exit 1
    fi
fi
echo ""

# Add foreign key constraint (if courses table exists)
echo "3. Adding foreign key constraint..."
SQL_FK="ALTER TABLE \`batches\` ADD CONSTRAINT \`batches_courseId_fkey\` FOREIGN KEY (\`courseId\`) REFERENCES \`courses\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE;"

if [ -z "$DB_PASSWORD" ]; then
    mysql -u "$DB_USER" "$DB_NAME" -e "$SQL_FK" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Foreign key constraint added"
    else
        echo "⚠ Foreign key constraint failed (courses table might not exist or constraint already exists)"
    fi
else
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "$SQL_FK" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Foreign key constraint added"
    else
        echo "⚠ Foreign key constraint failed (courses table might not exist or constraint already exists)"
    fi
fi
echo ""

# Add index
echo "4. Adding index on courseId..."
SQL_INDEX="ALTER TABLE \`batches\` ADD INDEX \`idx_courseId\` (\`courseId\`);"

if [ -z "$DB_PASSWORD" ]; then
    mysql -u "$DB_USER" "$DB_NAME" -e "$SQL_INDEX" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Index added"
    else
        echo "⚠ Index might already exist"
    fi
else
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "$SQL_INDEX" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Index added"
    else
        echo "⚠ Index might already exist"
    fi
fi
echo ""

# Verify
echo "5. Verifying column was added..."
if [ -z "$DB_PASSWORD" ]; then
    mysql -u "$DB_USER" "$DB_NAME" -e "DESCRIBE batches;" | grep courseId
else
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE batches;" | grep courseId
fi
echo ""

echo "=========================================="
echo "FIX COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart backend: pm2 restart backend-api"
echo "2. Check logs: pm2 logs backend-api"
echo ""

