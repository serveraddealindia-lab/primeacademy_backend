# Fix "Table 'primeacademy_db.enrollments' doesn't exist" Error

## Quick Fix - Run on VPS

### Option 1: One-Liner (Fastest)

```bash
# SSH into VPS
ssh root@your-vps-ip

# Run this command (you'll be prompted for MySQL password)
mysql -u primeacademy_user -p primeacademy_db << 'EOF'
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `studentId` int(11) NOT NULL,
  `batchId` int(11) NOT NULL,
  `enrollmentDate` date NOT NULL DEFAULT (curdate()),
  `status` varchar(255) DEFAULT NULL,
  `paymentPlan` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`paymentPlan`)),
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_studentId` (`studentId`),
  KEY `idx_batchId` (`batchId`),
  KEY `idx_enrollmentDate` (`enrollmentDate`),
  CONSTRAINT `enrollments_ibfk_1` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `enrollments_ibfk_2` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF
```

### Option 2: Manual SQL

```bash
# Connect to MySQL
mysql -u primeacademy_user -p primeacademy_db
```

Then run:
```sql
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `studentId` int(11) NOT NULL,
  `batchId` int(11) NOT NULL,
  `enrollmentDate` date NOT NULL DEFAULT (curdate()),
  `status` varchar(255) DEFAULT NULL,
  `paymentPlan` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`paymentPlan`)),
  `createdAt` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedAt` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_studentId` (`studentId`),
  KEY `idx_batchId` (`batchId`),
  KEY `idx_enrollmentDate` (`enrollmentDate`),
  CONSTRAINT `enrollments_ibfk_1` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `enrollments_ibfk_2` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify
SHOW TABLES LIKE 'enrollments';
DESCRIBE enrollments;
EXIT;
```

### Option 3: Using SQL File

```bash
# Upload SQL file to VPS (from local machine)
scp create-enrollments-table.sql root@your-vps-ip:/var/www/primeacademy_backend/

# On VPS, run:
cd /var/www/primeacademy_backend
mysql -u primeacademy_user -p primeacademy_db < create-enrollments-table.sql
```

### Option 4: Automated Script

```bash
# Upload script to VPS
scp fix-missing-tables-vps.sh root@your-vps-ip:/var/www/primeacademy_backend/

# On VPS, run:
cd /var/www/primeacademy_backend
chmod +x fix-missing-tables-vps.sh
./fix-missing-tables-vps.sh
```

## After Fixing

```bash
# Restart backend
pm2 restart backend-api

# Check logs
pm2 logs backend-api

# Test enrollment
# Try enrolling a student from the frontend
```

## Verify It Worked

```bash
# Check if table exists
mysql -u primeacademy_user -p primeacademy_db -e "SHOW TABLES LIKE 'enrollments';"

# Check table structure
mysql -u primeacademy_user -p primeacademy_db -e "DESCRIBE enrollments;"
```

## Why This Happened

The `enrollments` table might not have been created because:
1. The SQL file execution was interrupted
2. There was an error during table creation
3. Foreign key constraints failed (users or batches tables didn't exist)
4. The table was accidentally dropped

## Check for Other Missing Tables

```bash
# List all tables
mysql -u primeacademy_user -p primeacademy_db -e "SHOW TABLES;"

# Common tables that should exist:
# - users
# - batches
# - enrollments
# - student_profiles
# - sessions
# - portfolios
# - payment_transactions
```

If other tables are missing, you may need to re-run the full SQL file:
```bash
mysql -u primeacademy_user -p primeacademy_db < database_setup_complete.sql
```

