#!/bin/bash

# Check Backend Logs for Batch Creation Error
# Run this on your VPS

echo "=========================================="
echo "CHECKING BATCH CREATION ERROR"
echo "=========================================="
echo ""

cd /var/www/primeacademy_backend

# 1. Check recent backend logs for errors
echo "1. Recent backend error logs..."
pm2 logs backend-api --err --lines 50 --nostream
echo ""

# 2. Check all recent logs
echo "2. All recent backend logs..."
pm2 logs backend-api --lines 50 --nostream
echo ""

# 3. Check if Course table exists in database
echo "3. Checking database..."
echo "Run this SQL query to check if courses table exists:"
echo "  mysql -u root -p -e 'USE primeacademy; SHOW TABLES LIKE \"courses\";'"
echo ""

# 4. Check backend error logs file (if exists)
echo "4. Checking log files..."
if [ -f "logs/error.log" ]; then
    echo "Recent errors from log file:"
    tail -50 logs/error.log
else
    echo "No log file found"
fi
echo ""

# 5. Test database connection
echo "5. Testing database connection..."
node -e "
const db = require('./dist/config/database').default;
db.authenticate()
  .then(() => {
    console.log('✓ Database connection OK');
    process.exit(0);
  })
  .catch(err => {
    console.log('✗ Database connection failed:', err.message);
    process.exit(1);
  });
" 2>&1
echo ""

# 6. Check if Course model is accessible
echo "6. Testing Course model..."
node -e "
const db = require('./dist/models').default;
if (db.Course) {
  console.log('✓ Course model exists');
  db.Course.findAll({ limit: 1 })
    .then(() => console.log('✓ Course model query works'))
    .catch(err => console.log('✗ Course model query failed:', err.message));
} else {
  console.log('✗ Course model NOT found in db object');
}
setTimeout(() => process.exit(0), 2000);
" 2>&1
echo ""

echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "1. Check PM2 logs for the exact error:"
echo "   pm2 logs backend-api --lines 100"
echo ""
echo "2. Try creating a batch again and watch logs in real-time:"
echo "   pm2 logs backend-api"
echo ""
echo "3. Check database:"
echo "   mysql -u root -p primeacademy -e 'SELECT * FROM courses LIMIT 5;'"
echo ""

