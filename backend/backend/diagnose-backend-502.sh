#!/bin/bash

# Comprehensive 502 Bad Gateway Diagnostic Script
# Run this on your VPS to find the exact issue

echo "=========================================="
echo "502 BAD GATEWAY DIAGNOSTIC SCRIPT"
echo "=========================================="
echo ""

BACKEND_DIR="/var/www/primeacademy_backend"

# Step 1: Check if backend directory exists
echo "Step 1: Checking backend directory..."
if [ ! -d "$BACKEND_DIR" ]; then
    echo "ERROR: Backend directory not found at $BACKEND_DIR"
    exit 1
fi
cd "$BACKEND_DIR"
echo "✓ Backend directory: $BACKEND_DIR"
echo ""

# Step 2: Check .env file
echo "Step 2: Checking .env file..."
if [ ! -f ".env" ]; then
    echo "✗ .env file NOT FOUND!"
    echo "Creating .env file..."
    cat > .env << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://crm.prashantthakar.com,http://crm.prashantthakar.com
EOF
    echo "✓ Created .env file - PLEASE UPDATE WITH YOUR DATABASE CREDENTIALS!"
else
    echo "✓ .env file exists"
    echo "Current PORT setting:"
    grep PORT .env || echo "PORT not found in .env"
    echo "Current NODE_ENV setting:"
    grep NODE_ENV .env || echo "NODE_ENV not found in .env"
fi
echo ""

# Step 3: Check if backend is built
echo "Step 3: Checking if backend is built..."
if [ ! -f "dist/index.js" ]; then
    echo "✗ dist/index.js NOT FOUND - Backend needs to be built!"
    echo "Building backend..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "ERROR: Build failed!"
        exit 1
    fi
else
    echo "✓ dist/index.js exists"
fi
echo ""

# Step 4: Check PM2 status
echo "Step 4: Checking PM2 status..."
pm2 list
echo ""

# Step 5: Check if backend process is running
echo "Step 5: Checking if backend process is running..."
BACKEND_PID=$(pm2 jlist | jq -r '.[] | select(.name=="backend-api") | .pid' 2>/dev/null)
if [ -z "$BACKEND_PID" ]; then
    echo "✗ Backend is NOT running in PM2!"
    echo "Starting backend..."
    pm2 delete backend-api 2>/dev/null
    pm2 start dist/index.js --name backend-api
    pm2 save
    sleep 3
else
    echo "✓ Backend is running in PM2 (PID: $BACKEND_PID)"
fi
echo ""

# Step 6: Check if port 3001 is listening
echo "Step 6: Checking if port 3001 is listening..."
if netstat -tlnp 2>/dev/null | grep -q ":3001" || ss -tlnp 2>/dev/null | grep -q ":3001"; then
    echo "✓ Port 3001 is listening"
    echo "Details:"
    netstat -tlnp 2>/dev/null | grep ":3001" || ss -tlnp 2>/dev/null | grep ":3001"
else
    echo "✗ Port 3001 is NOT listening!"
    echo "Backend might have crashed. Check logs:"
    pm2 logs backend-api --lines 50 --nostream
fi
echo ""

# Step 7: Check what's listening on port 3001
echo "Step 7: What's listening on port 3001?"
if command -v lsof &> /dev/null; then
    sudo lsof -i :3001 || echo "Nothing found with lsof"
elif command -v netstat &> /dev/null; then
    sudo netstat -tlnp | grep :3001 || echo "Nothing found with netstat"
elif command -v ss &> /dev/null; then
    sudo ss -tlnp | grep :3001 || echo "Nothing found with ss"
fi
echo ""

# Step 8: Test backend directly
echo "Step 8: Testing backend directly on localhost:3001..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:3001/api/health 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✓ Backend responds on localhost:3001 (HTTP $HEALTH_RESPONSE)"
    curl -s http://localhost:3001/api/health | head -3
elif [ "$HEALTH_RESPONSE" = "000" ] || [ -z "$HEALTH_RESPONSE" ]; then
    echo "✗ Backend does NOT respond on localhost:3001"
    echo "Connection refused or timeout"
else
    echo "⚠ Backend responds but with error (HTTP $HEALTH_RESPONSE)"
    curl -s http://localhost:3001/api/health | head -5
fi
echo ""

# Step 9: Test backend on 0.0.0.0
echo "Step 9: Testing backend on 0.0.0.0:3001..."
HEALTH_RESPONSE_0=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://0.0.0.0:3001/api/health 2>/dev/null)
if [ "$HEALTH_RESPONSE_0" = "200" ]; then
    echo "✓ Backend responds on 0.0.0.0:3001"
else
    echo "✗ Backend does NOT respond on 0.0.0.0:3001"
fi
echo ""

# Step 10: Check nginx configuration
echo "Step 10: Checking nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✓ Nginx configuration is valid"
    echo "Nginx proxy_pass setting:"
    sudo grep -r "proxy_pass" /etc/nginx/sites-available/api.prashantthakar.com | grep localhost
else
    echo "✗ Nginx configuration has errors:"
    sudo nginx -t
fi
echo ""

# Step 11: Check nginx error logs
echo "Step 11: Recent nginx error logs..."
sudo tail -20 /var/log/nginx/api.prashantthakar.com.error.log 2>/dev/null || echo "No error logs found"
echo ""

# Step 12: Check backend logs
echo "Step 12: Recent backend logs from PM2..."
pm2 logs backend-api --lines 30 --nostream
echo ""

# Step 13: Check if backend is listening on correct interface
echo "Step 13: Checking network interfaces..."
echo "Backend should listen on 0.0.0.0 (all interfaces) in production"
if netstat -tlnp 2>/dev/null | grep ":3001" | grep -q "0.0.0.0"; then
    echo "✓ Backend is listening on 0.0.0.0:3001 (correct for production)"
elif netstat -tlnp 2>/dev/null | grep ":3001" | grep -q "127.0.0.1"; then
    echo "✗ Backend is listening on 127.0.0.1:3001 (WRONG - nginx can't connect!)"
    echo "Fix: Set NODE_ENV=production in .env file"
elif ss -tlnp 2>/dev/null | grep ":3001" | grep -q "0.0.0.0"; then
    echo "✓ Backend is listening on 0.0.0.0:3001 (correct for production)"
elif ss -tlnp 2>/dev/null | grep ":3001" | grep -q "127.0.0.1"; then
    echo "✗ Backend is listening on 127.0.0.1:3001 (WRONG - nginx can't connect!)"
    echo "Fix: Set NODE_ENV=production in .env file"
fi
echo ""

# Step 14: Test through nginx
echo "Step 14: Testing API through nginx..."
NGINX_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 https://api.prashantthakar.com/api/health 2>/dev/null)
if [ "$NGINX_RESPONSE" = "200" ]; then
    echo "✓ API is accessible through nginx (HTTP $NGINX_RESPONSE)"
    curl -s https://api.prashantthakar.com/api/health | head -3
else
    echo "✗ API is NOT accessible through nginx (HTTP $NGINX_RESPONSE)"
    echo "This is the 502 Bad Gateway error"
fi
echo ""

# Step 15: Summary and recommendations
echo "=========================================="
echo "DIAGNOSTIC SUMMARY"
echo "=========================================="
echo ""

if [ "$HEALTH_RESPONSE" != "200" ]; then
    echo "❌ ISSUE: Backend is not responding on localhost:3001"
    echo "   → Check PM2 logs: pm2 logs backend-api"
    echo "   → Restart backend: pm2 restart backend-api"
    echo ""
fi

if netstat -tlnp 2>/dev/null | grep ":3001" | grep -q "127.0.0.1" || ss -tlnp 2>/dev/null | grep ":3001" | grep -q "127.0.0.1"; then
    echo "❌ ISSUE: Backend is listening on 127.0.0.1 instead of 0.0.0.0"
    echo "   → Fix: Make sure .env has NODE_ENV=production"
    echo "   → Then rebuild and restart: npm run build && pm2 restart backend-api"
    echo ""
fi

if [ "$NGINX_RESPONSE" != "200" ] && [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "❌ ISSUE: Backend works but nginx can't connect"
    echo "   → Check nginx proxy_pass points to http://localhost:3001"
    echo "   → Check nginx error logs: sudo tail -f /var/log/nginx/api.prashantthakar.com.error.log"
    echo ""
fi

echo "=========================================="
echo "QUICK FIX COMMANDS"
echo "=========================================="
echo ""
echo "1. Make sure .env has NODE_ENV=production:"
echo "   echo 'NODE_ENV=production' >> .env"
echo "   echo 'PORT=3001' >> .env"
echo ""
echo "2. Rebuild and restart:"
echo "   npm run build"
echo "   pm2 delete backend-api"
echo "   pm2 start dist/index.js --name backend-api"
echo "   pm2 save"
echo ""
echo "3. Verify it's listening on 0.0.0.0:"
echo "   netstat -tlnp | grep 3001"
echo "   # Should show 0.0.0.0:3001, NOT 127.0.0.1:3001"
echo ""
echo "4. Test:"
echo "   curl http://localhost:3001/api/health"
echo "   curl https://api.prashantthakar.com/api/health"
echo ""

