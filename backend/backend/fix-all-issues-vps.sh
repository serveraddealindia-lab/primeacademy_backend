#!/bin/bash

# Complete Fix for All Issues on VPS
# Run this on your VPS: bash fix-all-issues-vps.sh

echo "=========================================="
echo "FIXING ALL BACKEND ISSUES"
echo "=========================================="
echo ""

cd /var/www/primeacademy_backend

# Step 1: Fix .env file - Remove duplicates and set correct values
echo "Step 1: Fixing .env file..."
if [ -f ".env" ]; then
    # Backup original
    cp .env .env.backup
    
    # Remove duplicate NODE_ENV and PORT entries
    # Keep only the last occurrence of each
    awk '!seen[$0]++' .env > .env.tmp
    
    # Remove old PORT entries
    grep -v "^PORT=" .env.tmp > .env.tmp2
    
    # Remove old NODE_ENV entries
    grep -v "^NODE_ENV=" .env.tmp2 > .env.tmp3
    
    # Add correct values at the end
    echo "NODE_ENV=production" >> .env.tmp3
    echo "PORT=3001" >> .env.tmp3
    
    # Replace .env
    mv .env.tmp3 .env
    rm -f .env.tmp .env.tmp2
    
    echo "✓ .env file fixed"
    echo "Current .env PORT and NODE_ENV:"
    grep -E "^PORT=|^NODE_ENV=" .env
else
    echo "Creating .env file..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://crm.prashantthakar.com,http://crm.prashantthakar.com
EOF
    echo "✓ .env file created (PLEASE ADD DATABASE CREDENTIALS!)"
fi
echo ""

# Step 2: Verify import in index.ts is correct
echo "Step 2: Checking import statement..."
if grep -q "import.*runPendingMigrations.*from" src/index.ts; then
    # Check if it's using default import (wrong)
    if grep -q "import runPendingMigrations from" src/index.ts; then
        echo "✗ Wrong import found - fixing..."
        sed -i 's/import runPendingMigrations from/import { runPendingMigrations } from/g' src/index.ts
        echo "✓ Import fixed"
    else
        echo "✓ Import is correct"
    fi
else
    echo "⚠ Could not verify import"
fi
echo ""

# Step 3: Rebuild backend
echo "Step 3: Rebuilding backend..."
npm run build
if [ $? -ne 0 ]; then
    echo "✗ Build failed! Check errors above"
    exit 1
fi
echo "✓ Build successful"
echo ""

# Step 4: Stop old PM2 process
echo "Step 4: Stopping old PM2 process..."
pm2 delete backend-api 2>/dev/null
echo "✓ Old process stopped"
echo ""

# Step 5: Start backend
echo "Step 5: Starting backend..."
pm2 start dist/index.js --name backend-api
pm2 save
echo "✓ Backend started"
echo ""

# Step 6: Wait for startup
echo "Step 6: Waiting for backend to start..."
sleep 5
echo ""

# Step 7: Check PM2 status
echo "Step 7: PM2 status..."
pm2 list
echo ""

# Step 8: Check logs
echo "Step 8: Recent backend logs..."
pm2 logs backend-api --lines 20 --nostream
echo ""

# Step 9: Check if port 3001 is listening
echo "Step 9: Checking port 3001..."
if ss -tlnp 2>/dev/null | grep -q ":3001" || netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    echo "✓ Port 3001 is listening"
    ss -tlnp 2>/dev/null | grep 3001 || netstat -tlnp 2>/dev/null | grep 3001
    
    # Check if it's on correct interface
    if ss -tlnp 2>/dev/null | grep ":3001" | grep -q "0.0.0.0" || netstat -tlnp 2>/dev/null | grep ":3001" | grep -q "0.0.0.0"; then
        echo "✓ Listening on 0.0.0.0 (correct)"
    else
        echo "⚠ Not listening on 0.0.0.0 - check NODE_ENV"
    fi
else
    echo "✗ Port 3001 is NOT listening - backend may have crashed"
    echo "Check logs: pm2 logs backend-api"
fi
echo ""

# Step 10: Test backend
echo "Step 10: Testing backend..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3001/api/health 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✓ Backend responds (HTTP 200)"
    curl -s http://localhost:3001/api/health | head -3
else
    echo "✗ Backend does NOT respond (HTTP $HEALTH_RESPONSE)"
    echo "Check logs: pm2 logs backend-api"
fi
echo ""

# Step 11: Test through nginx
echo "Step 11: Testing through nginx..."
NGINX_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 https://api.prashantthakar.com/api/health 2>/dev/null)
if [ "$NGINX_RESPONSE" = "200" ]; then
    echo "✓ API accessible through nginx (HTTP 200)"
    curl -s https://api.prashantthakar.com/api/health | head -3
else
    echo "✗ API still returns $NGINX_RESPONSE"
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        echo "Backend works but nginx can't connect - check nginx logs"
        echo "sudo tail -20 /var/log/nginx/api.prashantthakar.com.error.log"
    fi
fi
echo ""

echo "=========================================="
echo "FIX COMPLETE"
echo "=========================================="
echo ""
echo "If backend is still not working:"
echo "  1. Check logs: pm2 logs backend-api"
echo "  2. Check if dist/index.js exists: ls -la dist/index.js"
echo "  3. Verify .env: cat .env | grep -E 'NODE_ENV|PORT'"
echo "  4. Check port: ss -tlnp | grep 3001"
echo ""

