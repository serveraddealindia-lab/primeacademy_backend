#!/bin/bash

# Comprehensive Backend Fix Script for Live Server
# Run this on your VPS: bash fix-backend-live.sh

echo "=========================================="
echo "BACKEND DIAGNOSTIC AND FIX SCRIPT"
echo "=========================================="
echo ""

BACKEND_DIR="/var/www/primeacademy_backend"

# Step 1: Check if backend directory exists
echo "Step 1: Checking backend directory..."
if [ ! -d "$BACKEND_DIR" ]; then
    echo "ERROR: Backend directory not found at $BACKEND_DIR"
    echo "Please update BACKEND_DIR in this script"
    exit 1
fi
echo "✓ Backend directory found: $BACKEND_DIR"
cd "$BACKEND_DIR"
echo ""

# Step 2: Check if package.json exists
echo "Step 2: Checking package.json..."
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found!"
    exit 1
fi
echo "✓ package.json found"
echo ""

# Step 3: Check if node_modules exists
echo "Step 3: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "✓ node_modules exists"
fi
echo ""

# Step 4: Check if .env exists
echo "Step 4: Checking environment variables..."
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found!"
    echo "Creating .env file with defaults..."
    cat > .env << EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=primeacademy
FRONTEND_URL=https://crm.prashantthakar.com,http://crm.prashantthakar.com
EOF
    echo "✓ Created .env file - PLEASE UPDATE WITH YOUR ACTUAL VALUES!"
else
    echo "✓ .env file exists"
    # Check if PORT is set
    if ! grep -q "PORT=" .env; then
        echo "Adding PORT=3001 to .env..."
        echo "PORT=3001" >> .env
    fi
fi
echo ""

# Step 5: Build the backend
echo "Step 5: Building backend..."
if [ ! -d "dist" ] || [ "src/index.ts" -nt "dist/index.js" ]; then
    echo "Building TypeScript..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "ERROR: Build failed!"
        exit 1
    fi
    echo "✓ Build successful"
else
    echo "✓ Build is up to date"
fi

# Verify dist/index.js exists
if [ ! -f "dist/index.js" ]; then
    echo "ERROR: dist/index.js not found after build!"
    exit 1
fi
echo "✓ dist/index.js exists"
echo ""

# Step 6: Stop old PM2 processes
echo "Step 6: Managing PM2 processes..."
pm2 delete backend-api 2>/dev/null
pm2 delete all 2>/dev/null
echo "✓ Cleared old PM2 processes"
echo ""

# Step 7: Start backend with PM2
echo "Step 7: Starting backend with PM2..."
pm2 start dist/index.js --name backend-api
pm2 save
echo "✓ Backend started with PM2"
echo ""

# Step 8: Wait a moment for startup
echo "Step 8: Waiting for backend to start..."
sleep 3
echo ""

# Step 9: Check PM2 status
echo "Step 9: Checking PM2 status..."
pm2 list
echo ""

# Step 10: Check backend logs
echo "Step 10: Recent backend logs..."
pm2 logs backend-api --lines 20 --nostream
echo ""

# Step 11: Check if backend is listening on port 3001
echo "Step 11: Checking if backend is listening on port 3001..."
if netstat -tlnp 2>/dev/null | grep -q ":3001" || ss -tlnp 2>/dev/null | grep -q ":3001"; then
    echo "✓ Backend is listening on port 3001"
else
    echo "✗ Backend is NOT listening on port 3001"
    echo "Check PM2 logs: pm2 logs backend-api"
fi
echo ""

# Step 12: Test backend directly
echo "Step 12: Testing backend directly..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✓ Backend health check passed (HTTP $HEALTH_RESPONSE)"
    curl -s http://localhost:3001/api/health | head -5
else
    echo "✗ Backend health check failed (HTTP $HEALTH_RESPONSE)"
    echo "Backend might be starting or there's an error"
fi
echo ""

# Step 13: Check nginx configuration
echo "Step 13: Checking nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✓ Nginx configuration is valid"
    sudo systemctl reload nginx
    echo "✓ Nginx reloaded"
else
    echo "✗ Nginx configuration has errors:"
    sudo nginx -t
fi
echo ""

# Step 14: Test through nginx
echo "Step 14: Testing API through nginx..."
NGINX_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.prashantthakar.com/api/health 2>/dev/null)
if [ "$NGINX_RESPONSE" = "200" ]; then
    echo "✓ API is accessible through nginx (HTTP $NGINX_RESPONSE)"
    curl -s https://api.prashantthakar.com/api/health | head -5
else
    echo "✗ API is NOT accessible through nginx (HTTP $NGINX_RESPONSE)"
    echo "Checking nginx error logs..."
    sudo tail -10 /var/log/nginx/api.prashantthakar.com.error.log
fi
echo ""

# Step 15: Final status
echo "=========================================="
echo "FINAL STATUS"
echo "=========================================="
echo "PM2 Status:"
pm2 list
echo ""
echo "Backend Logs (last 10 lines):"
pm2 logs backend-api --lines 10 --nostream
echo ""
echo "Port Status:"
netstat -tlnp 2>/dev/null | grep 3001 || ss -tlnp 2>/dev/null | grep 3001 || echo "Port 3001 not found"
echo ""
echo "=========================================="
echo "If backend is still not working:"
echo "1. Check PM2 logs: pm2 logs backend-api"
echo "2. Check nginx logs: sudo tail -f /var/log/nginx/api.prashantthakar.com.error.log"
echo "3. Verify .env file has correct database credentials"
echo "4. Check if database is running and accessible"
echo "=========================================="

