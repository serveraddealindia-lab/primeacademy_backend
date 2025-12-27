#!/bin/bash
# Fix Server Build Errors
# Run this on your VPS

cd /var/www/primeacademy_backend

echo "=== Step 1: Pull latest code ==="
git fetch origin
git reset --hard origin/main

echo ""
echo "=== Step 2: Verify faculty.routes.ts ==="
cat src/routes/faculty.routes.ts

echo ""
echo "=== Step 3: Check if runMigrations exists ==="
if [ -f "src/utils/runMigrations.ts" ]; then
    echo "✓ runMigrations.ts exists"
    grep -n "export const runPendingMigrations" src/utils/runMigrations.ts
else
    echo "✗ runMigrations.ts NOT FOUND"
fi

echo ""
echo "=== Step 4: Check index.ts import ==="
grep -n "runPendingMigrations" src/index.ts

echo ""
echo "=== Step 5: Remove any old routes (if they exist) ==="
# Remove lines with getAllFaculty or getFacultyById
sed -i '/getAllFaculty/d' src/routes/faculty.routes.ts
sed -i '/getFacultyById/d' src/routes/faculty.routes.ts

echo ""
echo "=== Step 6: Build ==="
npm run build

echo ""
echo "=== Step 7: If build succeeds, restart ==="
if [ $? -eq 0 ]; then
    pm2 restart backend-api
    echo "✓ Server restarted"
else
    echo "✗ Build failed - check errors above"
fi

