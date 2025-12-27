#!/bin/bash

# Fix Missing Tables on VPS
# This script checks and creates missing tables

cd /var/www/primeacademy_backend

echo "=========================================="
echo "FIXING MISSING TABLES"
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

# Function to check if table exists
check_table() {
    local table_name=$1
    if [ -z "$DB_PASSWORD" ]; then
        mysql -u "$DB_USER" "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME' AND table_name = '$table_name';" -s -N 2>/dev/null
    else
        mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME' AND table_name = '$table_name';" -s -N 2>/dev/null
    fi
}

# Function to run SQL
run_sql() {
    local sql=$1
    if [ -z "$DB_PASSWORD" ]; then
        mysql -u "$DB_USER" "$DB_NAME" -e "$sql" 2>/dev/null
    else
        mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "$sql" 2>/dev/null
    fi
}

# Check enrollments table
echo "1. Checking enrollments table..."
ENROLLMENTS_EXISTS=$(check_table "enrollments")

if [ "$ENROLLMENTS_EXISTS" = "1" ]; then
    echo "✓ enrollments table exists"
else
    echo "✗ enrollments table NOT found - creating it..."
    
    # Create enrollments table
    SQL="CREATE TABLE IF NOT EXISTS \`enrollments\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`studentId\` int(11) NOT NULL,
  \`batchId\` int(11) NOT NULL,
  \`enrollmentDate\` date NOT NULL DEFAULT (curdate()),
  \`status\` varchar(255) DEFAULT NULL,
  \`paymentPlan\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(\`paymentPlan\`)),
  \`createdAt\` datetime NOT NULL DEFAULT current_timestamp(),
  \`updatedAt\` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`),
  KEY \`idx_studentId\` (\`studentId\`),
  KEY \`idx_batchId\` (\`batchId\`),
  KEY \`idx_enrollmentDate\` (\`enrollmentDate\`),
  CONSTRAINT \`enrollments_ibfk_1\` FOREIGN KEY (\`studentId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`enrollments_ibfk_2\` FOREIGN KEY (\`batchId\`) REFERENCES \`batches\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
    
    run_sql "$SQL"
    
    if [ $? -eq 0 ]; then
        echo "✓ enrollments table created"
    else
        echo "✗ Failed to create enrollments table"
        echo "Trying with SQL file method..."
        
        # Use SQL file if direct command fails
        if [ -f "create-enrollments-table.sql" ]; then
            if [ -z "$DB_PASSWORD" ]; then
                mysql -u "$DB_USER" "$DB_NAME" < create-enrollments-table.sql
            else
                mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < create-enrollments-table.sql
            fi
            if [ $? -eq 0 ]; then
                echo "✓ enrollments table created using SQL file"
            else
                echo "✗ Failed to create table. Please run manually."
                exit 1
            fi
        fi
    fi
fi
echo ""

# List all tables to verify
echo "2. Listing all tables in database..."
if [ -z "$DB_PASSWORD" ]; then
    mysql -u "$DB_USER" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null
else
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null
fi
echo ""

# Check for other common missing tables
echo "3. Checking for other common tables..."
TABLES=("users" "batches" "student_profiles" "sessions" "portfolios" "payment_transactions")

for table in "${TABLES[@]}"; do
    EXISTS=$(check_table "$table")
    if [ "$EXISTS" = "1" ]; then
        echo "✓ $table exists"
    else
        echo "✗ $table MISSING - you may need to run the full SQL file"
    fi
done
echo ""

echo "=========================================="
echo "FIX COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart backend: pm2 restart backend-api"
echo "2. Check logs: pm2 logs backend-api"
echo ""

