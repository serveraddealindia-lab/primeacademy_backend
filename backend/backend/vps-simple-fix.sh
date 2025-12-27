#!/bin/bash

# SIMPLE VPS FIX - Run this on your VPS
# This uses sed to make quick fixes

cd /var/www/primeacademy_backend

echo "Creating backup..."
cp src/controllers/batch.controller.ts src/controllers/batch.controller.ts.backup.$(date +%Y%m%d_%H%M%S)

echo "Applying fixes..."

# Fix 1: Make Course includes conditional by wrapping them
# This is a simpler approach - we'll just make the includes conditional

# For getAllBatches - replace the Course include section
sed -i '/\/\/ Get all batches with related data/,/order: \[\[.createdAt/{
  /model: db\.Course,/{
    i\
    // Add Course include only if model exists\
    if (db.Course) {\
      includes.push({
    }
  }
}' src/controllers/batch.controller.ts

# Actually, the simplest way is to use a Python script or just edit manually
# Let me provide the simplest solution:

cat > /tmp/quick-fix.sh << 'EOF'
#!/bin/bash
cd /var/www/primeacademy_backend

# The simplest fix: Just comment out Course includes temporarily
# This will prevent the 500 error

sed -i 's/model: db\.Course,/\/\/ model: db.Course,  # Temporarily disabled/g' src/controllers/batch.controller.ts
sed -i 's/as: '\''course'\'',/\/\/ as: '\''course'\'',/g' src/controllers/batch.controller.ts

echo "Course includes commented out. Rebuild and restart."
EOF

chmod +x /tmp/quick-fix.sh
echo ""
echo "Run: /tmp/quick-fix.sh"
echo "Then: npm run build && pm2 restart backend-api"

