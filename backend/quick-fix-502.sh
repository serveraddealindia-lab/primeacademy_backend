#!/bin/bash

# Quick Fix for 502 Bad Gateway
# Run this on your VPS

cd /var/www/primeacademy_backend

echo "Step 1: Ensuring .env has correct settings..."
if ! grep -q "NODE_ENV=production" .env 2>/dev/null; then
    echo "NODE_ENV=production" >> .env
    echo "✓ Added NODE_ENV=production"
fi

if ! grep -q "^PORT=3001" .env 2>/dev/null; then
    # Remove old PORT line if exists
    sed -i '/^PORT=/d' .env
    echo "PORT=3001" >> .env
    echo "✓ Set PORT=3001"
fi

echo ""
echo "Step 2: Rebuilding backend..."
npm run build

echo ""
echo "Step 3: Restarting backend with PM2..."
pm2 delete backend-api 2>/dev/null
pm2 start dist/index.js --name backend-api
pm2 save

echo ""
echo "Step 4: Waiting for backend to start..."
sleep 5

echo ""
echo "Step 5: Checking status..."
pm2 list
echo ""

echo "Step 6: Testing backend..."
curl -s http://localhost:3001/api/health && echo "" || echo "Backend not responding"
echo ""

echo "Step 7: Checking what port backend is listening on..."
netstat -tlnp 2>/dev/null | grep 3001 || ss -tlnp 2>/dev/null | grep 3001
echo ""

echo "Step 8: Testing through nginx..."
curl -s https://api.prashantthakar.com/api/health && echo "" || echo "Still getting 502"
echo ""

echo "If still 502, check:"
echo "  pm2 logs backend-api"
echo "  sudo tail -f /var/log/nginx/api.prashantthakar.com.error.log"

