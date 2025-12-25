#!/bin/bash

# Quick Backend Status Check
# Run this on your VPS to verify everything is working

echo "=========================================="
echo "BACKEND STATUS CHECK"
echo "=========================================="
echo ""

cd /var/www/primeacademy_backend

# 1. Check .env file
echo "1. Checking .env file..."
if [ -f ".env" ]; then
    echo "✓ .env exists"
    echo "   NODE_ENV: $(grep NODE_ENV .env | head -1 || echo 'NOT SET')"
    echo "   PORT: $(grep '^PORT=' .env | head -1 || echo 'NOT SET')"
else
    echo "✗ .env file NOT FOUND!"
fi
echo ""

# 2. Check PM2 status
echo "2. Checking PM2 status..."
pm2 list
echo ""

# 3. Check if port 3001 is listening
echo "3. Checking if port 3001 is listening..."
if command -v ss &> /dev/null; then
    PORT_INFO=$(ss -tlnp | grep :3001)
elif command -v netstat &> /dev/null; then
    PORT_INFO=$(netstat -tlnp | grep :3001)
else
    PORT_INFO=""
fi

if [ -z "$PORT_INFO" ]; then
    echo "✗ Port 3001 is NOT listening!"
    echo "   Backend is not running or crashed"
else
    echo "✓ Port 3001 is listening"
    echo "   $PORT_INFO"
    
    # Check if it's listening on 0.0.0.0 or 127.0.0.1
    if echo "$PORT_INFO" | grep -q "0.0.0.0:3001"; then
        echo "   ✓ Listening on 0.0.0.0 (correct for nginx)"
    elif echo "$PORT_INFO" | grep -q "127.0.0.1:3001"; then
        echo "   ✗ Listening on 127.0.0.1 (WRONG - nginx can't connect!)"
        echo "   → Fix: Set NODE_ENV=production in .env and restart"
    fi
fi
echo ""

# 4. Test backend directly
echo "4. Testing backend on localhost:3001..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3001/api/health 2>/dev/null)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✓ Backend responds (HTTP 200)"
    curl -s http://localhost:3001/api/health | head -3
elif [ "$HEALTH_CHECK" = "000" ] || [ -z "$HEALTH_CHECK" ]; then
    echo "✗ Backend does NOT respond"
    echo "   Connection refused or timeout"
else
    echo "⚠ Backend responds with HTTP $HEALTH_CHECK"
    curl -s http://localhost:3001/api/health | head -5
fi
echo ""

# 5. Check backend logs
echo "5. Recent backend logs (last 10 lines)..."
pm2 logs backend-api --lines 10 --nostream 2>/dev/null || echo "No logs available"
echo ""

# 6. Check nginx configuration
echo "6. Checking nginx proxy configuration..."
NGINX_PROXY=$(sudo grep -r "proxy_pass.*localhost:3001" /etc/nginx/sites-available/api.prashantthakar.com 2>/dev/null | head -1)
if [ -n "$NGINX_PROXY" ]; then
    echo "✓ Nginx is configured to proxy to localhost:3001"
    echo "   $NGINX_PROXY"
else
    echo "✗ Nginx proxy configuration not found or incorrect"
    echo "   Should have: proxy_pass http://localhost:3001;"
fi
echo ""

# 7. Test through nginx
echo "7. Testing through nginx (https://api.prashantthakar.com/api/health)..."
NGINX_TEST=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 https://api.prashantthakar.com/api/health 2>/dev/null)
if [ "$NGINX_TEST" = "200" ]; then
    echo "✓ API accessible through nginx (HTTP 200)"
    curl -s https://api.prashantthakar.com/api/health | head -3
elif [ "$NGINX_TEST" = "502" ]; then
    echo "✗ 502 Bad Gateway - nginx can't connect to backend"
    echo "   Check nginx error logs: sudo tail -20 /var/log/nginx/api.prashantthakar.com.error.log"
elif [ "$NGINX_TEST" = "000" ] || [ -z "$NGINX_TEST" ]; then
    echo "✗ Connection failed or timeout"
else
    echo "⚠ API responds with HTTP $NGINX_TEST"
fi
echo ""

# 8. Summary
echo "=========================================="
echo "SUMMARY"
echo "=========================================="

if [ "$HEALTH_CHECK" != "200" ]; then
    echo "❌ Backend is not responding on localhost:3001"
    echo "   Action: Check PM2 logs and restart backend"
    echo "   Command: pm2 logs backend-api"
    echo "   Command: pm2 restart backend-api"
fi

if echo "$PORT_INFO" 2>/dev/null | grep -q "127.0.0.1:3001"; then
    echo "❌ Backend is listening on 127.0.0.1 instead of 0.0.0.0"
    echo "   Action: Set NODE_ENV=production in .env and restart"
    echo "   Command: echo 'NODE_ENV=production' >> .env"
    echo "   Command: pm2 restart backend-api"
fi

if [ "$NGINX_TEST" = "502" ] && [ "$HEALTH_CHECK" = "200" ]; then
    echo "❌ Backend works but nginx can't connect"
    echo "   Action: Check nginx configuration and error logs"
    echo "   Command: sudo nginx -t"
    echo "   Command: sudo tail -f /var/log/nginx/api.prashantthakar.com.error.log"
fi

if [ "$NGINX_TEST" = "200" ]; then
    echo "✅ Everything is working! API is accessible."
fi

echo ""

