#!/bin/bash

# COMPLETE FIX - Run this on your VPS
# This fixes ALL the issues found

cd /var/www/primeacademy_backend

echo "=========================================="
echo "FIXING ALL ISSUES"
echo "=========================================="
echo ""

# 1. Fix .env file - Remove PORT=3000 and duplicates
echo "1. Fixing .env file..."
# Backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Remove all PORT and NODE_ENV lines
grep -v "^PORT=" .env > .env.tmp
grep -v "^NODE_ENV=" .env.tmp > .env.tmp2

# Add correct values at the end
echo "NODE_ENV=production" >> .env.tmp2
echo "PORT=3001" >> .env.tmp2

# Replace .env
mv .env.tmp2 .env
rm -f .env.tmp

echo "✓ .env fixed"
echo "Current PORT and NODE_ENV:"
grep -E "^PORT=|^NODE_ENV=" .env
echo ""

# 2. Fix import in index.ts (if wrong)
echo "2. Fixing import statement..."
if grep -q "import runPendingMigrations from" src/index.ts; then
    echo "Fixing wrong import..."
    sed -i 's/import runPendingMigrations from/import { runPendingMigrations } from/g' src/index.ts
    echo "✓ Import fixed"
else
    echo "✓ Import is already correct"
fi
echo ""

# 3. Rebuild
echo "3. Rebuilding backend..."
npm run build
if [ $? -ne 0 ]; then
    echo "✗ Build failed!"
    exit 1
fi
echo "✓ Build successful"
echo ""

# 4. Stop and restart PM2
echo "4. Restarting backend..."
pm2 delete backend-api 2>/dev/null
pm2 start dist/index.js --name backend-api
pm2 save
echo "✓ Backend restarted"
echo ""

# 5. Wait and check
echo "5. Waiting for startup..."
sleep 5

# 6. Check status
echo "6. Checking status..."
pm2 list
echo ""

# 7. Check logs
echo "7. Recent logs..."
pm2 logs backend-api --lines 15 --nostream
echo ""

# 8. Check port
echo "8. Checking port 3001..."
if ss -tlnp 2>/dev/null | grep -q ":3001" || netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    echo "✓ Port 3001 is listening"
    ss -tlnp 2>/dev/null | grep 3001 || netstat -tlnp 2>/dev/null | grep 3001
else
    echo "✗ Port 3001 NOT listening - check logs above"
fi
echo ""

# 9. Test
echo "9. Testing backend..."
curl -s http://localhost:3001/api/health && echo "" || echo "Backend not responding"
echo ""

# 10. Test nginx
echo "10. Testing through nginx..."
curl -s https://api.prashantthakar.com/api/health && echo "" || echo "Still 502"
echo ""

echo "=========================================="
echo "DONE!"
echo "=========================================="
echo ""
echo "If still not working, check:"
echo "  pm2 logs backend-api"
echo "  sudo tail -30 /var/log/nginx/api.prashantthakar.com.error.log"
echo ""

