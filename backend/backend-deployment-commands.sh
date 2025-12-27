#!/bin/bash

# Backend Deployment and Startup Commands for VPS
# Run these commands on your VPS server

echo "=== Step 1: Finding Backend Directory ==="
# Find where the backend is located
find /root -name "package.json" -type f 2>/dev/null | grep -i backend
find /home -name "package.json" -type f 2>/dev/null | grep -i backend
find /var/www -name "package.json" -type f 2>/dev/null | grep -i backend

echo ""
echo "=== Step 2: Navigate to Backend Directory ==="
# Replace /path/to/backend with actual path found above
# cd /root/backend
# OR
# cd /var/www/backend
# OR wherever your backend is located

echo ""
echo "=== Step 3: Check if Backend is Built ==="
# Check if dist directory exists
# ls -la dist/

echo ""
echo "=== Step 4: Build Backend (if needed) ==="
# npm run build

echo ""
echo "=== Step 5: Check Backend Port ==="
# Check what port backend should run on
# cat .env | grep PORT
# OR check package.json start script

echo ""
echo "=== Step 6: Start Backend with PM2 ==="
# pm2 start dist/index.js --name backend-api
# pm2 save
# pm2 startup

echo ""
echo "=== Step 7: Check PM2 Status ==="
# pm2 list
# pm2 logs backend-api

echo ""
echo "=== Step 8: Test Backend Directly ==="
# curl http://localhost:3001/api/health

echo ""
echo "=== Step 9: Check Nginx Configuration ==="
# sudo nginx -t
# sudo systemctl reload nginx

echo ""
echo "=== Step 10: Test API Endpoint ==="
# curl https://api.prashantthakar.com/api/health

