#!/bin/bash

# VPS Diagnostic Commands - Run these on your VPS to find the exact issue
# Copy and paste these commands one by one, or run the entire script

echo "=========================================="
echo "VPS DIAGNOSTIC COMMANDS"
echo "=========================================="
echo ""

BACKEND_DIR="/var/www/primeacademy_backend"

# 1. Check if backend directory exists
echo "1. Checking backend directory..."
cd "$BACKEND_DIR" 2>/dev/null && echo "✓ Backend directory: $BACKEND_DIR" || echo "✗ Backend directory not found!"
pwd
echo ""

# 2. Check .env file
echo "2. Checking .env file..."
if [ -f "$BACKEND_DIR/.env" ]; then
    echo "✓ .env file exists"
    echo "--- .env contents ---"
    cat "$BACKEND_DIR/.env"
    echo "--- end .env ---"
else
    echo "✗ .env file NOT FOUND!"
fi
echo ""

# 3. Check PM2 status
echo "3. Checking PM2 processes..."
pm2 list
echo ""

# 4. Check if backend process is running
echo "4. Checking backend process..."
pm2 describe backend-api 2>/dev/null || echo "✗ backend-api not found in PM2"
echo ""

# 5. Check what's listening on port 3001
echo "5. Checking port 3001..."
echo "--- Port 3001 status ---"
if command -v ss &> /dev/null; then
    ss -tlnp | grep :3001 || echo "✗ Nothing listening on port 3001"
elif command -v netstat &> /dev/null; then
    netstat -tlnp | grep :3001 || echo "✗ Nothing listening on port 3001"
else
    echo "Neither ss nor netstat available"
fi
echo ""

# 6. Check all Node.js processes
echo "6. Checking all Node.js processes..."
ps aux | grep node | grep -v grep || echo "No Node.js processes found"
echo ""

# 7. Check if dist/index.js exists
echo "7. Checking if backend is built..."
if [ -f "$BACKEND_DIR/dist/index.js" ]; then
    echo "✓ dist/index.js exists"
    ls -lh "$BACKEND_DIR/dist/index.js"
else
    echo "✗ dist/index.js NOT FOUND - Backend needs to be built!"
fi
echo ""

# 8. Test backend directly
echo "8. Testing backend on localhost:3001..."
curl -v http://localhost:3001/api/health 2>&1 | head -20
echo ""

# 9. Check backend logs
echo "9. Backend PM2 logs (last 30 lines)..."
pm2 logs backend-api --lines 30 --nostream 2>/dev/null || echo "No logs available"
echo ""

# 10. Check backend error logs
echo "10. Backend PM2 error logs..."
pm2 logs backend-api --err --lines 20 --nostream 2>/dev/null || echo "No error logs"
echo ""

# 11. Check nginx status
echo "11. Checking nginx status..."
sudo systemctl status nginx --no-pager | head -15
echo ""

# 12. Check nginx configuration
echo "12. Testing nginx configuration..."
sudo nginx -t 2>&1
echo ""

# 13. Check nginx proxy configuration
echo "13. Checking nginx proxy_pass configuration..."
sudo grep -r "proxy_pass.*3001" /etc/nginx/sites-available/ 2>/dev/null || echo "No proxy_pass to 3001 found"
echo ""

# 14. Check nginx error logs
echo "14. Recent nginx error logs (last 20 lines)..."
sudo tail -20 /var/log/nginx/api.prashantthakar.com.error.log 2>/dev/null || echo "No error logs found"
echo ""

# 15. Check nginx access logs
echo "15. Recent nginx access logs (last 10 lines)..."
sudo tail -10 /var/log/nginx/api.prashantthakar.com.access.log 2>/dev/null || echo "No access logs found"
echo ""

# 16. Check if backend is listening on correct interface
echo "16. Checking network interface..."
if command -v ss &> /dev/null; then
    PORT_INFO=$(ss -tlnp | grep :3001)
    if echo "$PORT_INFO" | grep -q "0.0.0.0:3001"; then
        echo "✓ Backend listening on 0.0.0.0:3001 (CORRECT)"
    elif echo "$PORT_INFO" | grep -q "127.0.0.1:3001"; then
        echo "✗ Backend listening on 127.0.0.1:3001 (WRONG - nginx can't connect!)"
        echo "  Fix: Set NODE_ENV=production in .env and restart"
    else
        echo "Port 3001 status: $PORT_INFO"
    fi
fi
echo ""

# 17. Check system resources
echo "17. System resources..."
echo "Memory usage:"
free -h | head -2
echo ""
echo "Disk usage:"
df -h / | tail -1
echo ""

# 18. Check firewall (if ufw is installed)
echo "18. Checking firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw status | head -10
else
    echo "ufw not installed"
fi
echo ""

# 19. Test through nginx
echo "19. Testing API through nginx..."
curl -v https://api.prashantthakar.com/api/health 2>&1 | head -30
echo ""

# 20. Check if port 3001 is accessible from localhost
echo "20. Testing port 3001 connectivity..."
timeout 3 bash -c 'echo > /dev/tcp/localhost/3001' 2>/dev/null && echo "✓ Port 3001 is accessible" || echo "✗ Port 3001 is NOT accessible"
echo ""

# 21. Check environment variables
echo "21. Environment variables in PM2..."
pm2 env backend-api 2>/dev/null || echo "Cannot get PM2 environment"
echo ""

# 22. Check if database is accessible (if DB credentials in .env)
echo "22. Checking database connection (if configured)..."
if [ -f "$BACKEND_DIR/.env" ] && grep -q "DB_HOST" "$BACKEND_DIR/.env"; then
    DB_HOST=$(grep "^DB_HOST=" "$BACKEND_DIR/.env" | cut -d'=' -f2)
    if [ -n "$DB_HOST" ]; then
        echo "Database host: $DB_HOST"
        timeout 3 bash -c "echo > /dev/tcp/$DB_HOST/3306" 2>/dev/null && echo "✓ Database port 3306 is accessible" || echo "✗ Database port 3306 is NOT accessible"
    fi
fi
echo ""

# Summary
echo "=========================================="
echo "DIAGNOSTIC SUMMARY"
echo "=========================================="
echo ""

# Check backend status
if pm2 list | grep -q "backend-api.*online"; then
    echo "✓ Backend is running in PM2"
else
    echo "✗ Backend is NOT running in PM2"
fi

# Check port
if ss -tlnp 2>/dev/null | grep -q ":3001" || netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    if ss -tlnp 2>/dev/null | grep ":3001" | grep -q "0.0.0.0" || netstat -tlnp 2>/dev/null | grep ":3001" | grep -q "0.0.0.0"; then
        echo "✓ Port 3001 is listening on 0.0.0.0 (correct)"
    else
        echo "✗ Port 3001 is listening on 127.0.0.1 (wrong - fix NODE_ENV)"
    fi
else
    echo "✗ Port 3001 is NOT listening"
fi

# Check nginx
if sudo systemctl is-active --quiet nginx; then
    echo "✓ Nginx is running"
else
    echo "✗ Nginx is NOT running"
fi

# Check backend response
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3001/api/health 2>/dev/null)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✓ Backend responds on localhost:3001"
else
    echo "✗ Backend does NOT respond on localhost:3001 (HTTP $HEALTH_CHECK)"
fi

echo ""
echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "If backend is not running:"
echo "  cd $BACKEND_DIR"
echo "  pm2 start dist/index.js --name backend-api"
echo "  pm2 save"
echo ""
echo "If backend is listening on 127.0.0.1:"
echo "  echo 'NODE_ENV=production' >> $BACKEND_DIR/.env"
echo "  pm2 restart backend-api"
echo ""
echo "If backend is not built:"
echo "  cd $BACKEND_DIR"
echo "  npm run build"
echo ""
echo "Check detailed logs:"
echo "  pm2 logs backend-api"
echo "  sudo tail -f /var/log/nginx/api.prashantthakar.com.error.log"
echo ""

