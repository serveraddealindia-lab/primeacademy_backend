# VPS Update: Frontend and SQL Database

## 🎯 Current Status
- ✅ Backend code updated (you're in `/var/www/primeacademy_backend`)
- ⏭️ Next: Update Frontend
- ⏭️ Then: Update SQL Database

---

## 📦 Step 1: Update Frontend

### Navigate to Frontend Directory
```bash
# From backend directory, go to frontend
cd /var/www/primeacademy_frontend

# Or if frontend is in same parent directory
cd ../primeacademy_frontend

# Verify you're in frontend
pwd
ls -la
```

### Pull Latest Code from GitHub
```bash
# Check current status
git status

# Pull latest code
git pull origin main

# If you get "unrelated histories" error:
# git pull origin main --allow-unrelated-histories
```

### Install/Update Dependencies
```bash
npm install
```

### Build Frontend for Production
```bash
npm run build

# Verify build was successful
ls -la dist/
```

### Update Environment Variables (if needed)
```bash
nano .env.production
```

Make sure it has:
```env
VITE_API_URL=https://api.prashantthakar.com/api
```

---

## 🗄️ Step 2: Update SQL Database

### Option A: Run SQL Scripts Manually

#### 1. Connect to MySQL
```bash
mysql -u your_db_user -p primeacademy_db
# Enter your database password when prompted
```

#### 2. Run SQL Scripts

**Update Payment Transactions:**
```sql
-- Run this in MySQL
SOURCE /var/www/primeacademy_backend/update_payment_transactions.sql;
```

**Or copy and paste the SQL commands:**

```sql
-- 1. Add paidAmount column
ALTER TABLE payment_transactions
ADD COLUMN paidAmount DECIMAL(10, 2) NOT NULL DEFAULT 0
AFTER amount;

-- 2. Add enrollmentId column with foreign key
ALTER TABLE payment_transactions
ADD COLUMN enrollmentId INT NULL
AFTER studentId;

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
```

**Create Certificates Table:**
```sql
-- Create certificates table
CREATE TABLE IF NOT EXISTS `certificates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` INT NOT NULL,
  `courseName` VARCHAR(255) NOT NULL,
  `softwareCovered` JSON,
  `grade` VARCHAR(10) NOT NULL,
  `monthOfCompletion` VARCHAR(50) NOT NULL,
  `certificateNumber` VARCHAR(255) NOT NULL UNIQUE,
  `pdfUrl` VARCHAR(255) NULL,
  `issuedBy` INT NULL,
  `issuedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`issuedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_certificateNumber` (`certificateNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Exit MySQL:**
```sql
EXIT;
```

### Option B: Run SQL Scripts from Command Line

```bash
# Update payment transactions
mysql -u your_db_user -p primeacademy_db < /var/www/primeacademy_backend/update_payment_transactions.sql

# Create certificates table (if you have a script)
mysql -u your_db_user -p primeacademy_db < /var/www/primeacademy_backend/create_database_tables.sql
```

### Option C: Use Sequelize Migrations (if configured)

```bash
cd /var/www/primeacademy_backend

# Run migrations
npm run migrate

# Or if using Sequelize CLI directly
npx sequelize-cli db:migrate
```

---

## ✅ Step 3: Verify Everything Works

### Check Backend
```bash
# Test API
curl https://api.prashantthakar.com/api/health

# Check backend logs
pm2 logs primeacademy-backend --lines 20
```

### Check Frontend
1. Visit: https://crm.prashantthakar.com
2. Open browser console (F12)
3. Check for errors
4. Test login
5. Test certificate generation

### Check Database
```bash
# Connect to MySQL
mysql -u your_db_user -p primeacademy_db

# Check payment_transactions table structure
DESCRIBE payment_transactions;

# Check certificates table exists
SHOW TABLES LIKE 'certificates';

# Check certificates table structure
DESCRIBE certificates;

# Exit
EXIT;
```

---

## 🔄 Complete Update Sequence

Here's the complete sequence to run:

```bash
# ============================================
# FRONTEND UPDATE
# ============================================

# 1. Navigate to frontend
cd /var/www/primeacademy_frontend

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm install

# 4. Build frontend
npm run build

# 5. Verify build
ls -la dist/

# ============================================
# SQL DATABASE UPDATE
# ============================================

# 6. Update payment transactions table
mysql -u your_db_user -p primeacademy_db < /var/www/primeacademy_backend/update_payment_transactions.sql

# 7. Create certificates table (if needed)
mysql -u your_db_user -p primeacademy_db << EOF
CREATE TABLE IF NOT EXISTS \`certificates\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`studentId\` INT NOT NULL,
  \`courseName\` VARCHAR(255) NOT NULL,
  \`softwareCovered\` JSON,
  \`grade\` VARCHAR(10) NOT NULL,
  \`monthOfCompletion\` VARCHAR(50) NOT NULL,
  \`certificateNumber\` VARCHAR(255) NOT NULL UNIQUE,
  \`pdfUrl\` VARCHAR(255) NULL,
  \`issuedBy\` INT NULL,
  \`issuedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`studentId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (\`issuedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX \`idx_studentId\` (\`studentId\`),
  INDEX \`idx_certificateNumber\` (\`certificateNumber\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF

# ============================================
# RESTART SERVICES
# ============================================

# 8. Restart backend (if needed)
pm2 restart primeacademy-backend

# 9. Reload nginx
sudo systemctl reload nginx

# ============================================
# VERIFY
# ============================================

# 10. Test API
curl https://api.prashantthakar.com/api/health

# 11. Check services
pm2 status
```

---

## 🐛 Troubleshooting

### Frontend Build Fails
```bash
# Clear cache and rebuild
cd /var/www/primeacademy_frontend
rm -rf node_modules dist
npm install
npm run build
```

### SQL Script Fails
```bash
# Check if table already has columns
mysql -u your_db_user -p primeacademy_db
DESCRIBE payment_transactions;
EXIT;

# If columns exist, you might need to modify the script
# Or skip those ALTER TABLE commands that already exist
```

### Database Connection Error
```bash
# Verify database credentials in backend/.env
cat /var/www/primeacademy_backend/.env | grep DB_

# Test connection
mysql -u your_db_user -p -h localhost primeacademy_db
```

---

## 📝 Quick Reference

### Frontend Update
```bash
cd /var/www/primeacademy_frontend
git pull origin main
npm install
npm run build
```

### SQL Update
```bash
mysql -u your_db_user -p primeacademy_db < /var/www/primeacademy_backend/update_payment_transactions.sql
```

### Restart Services
```bash
pm2 restart primeacademy-backend
sudo systemctl reload nginx
```




