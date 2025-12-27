#!/bin/bash

# Script to fix nginx configuration for uploads/general path
# This script updates nginx configurations to properly serve uploads

set -e

echo "=========================================="
echo "Fixing Nginx Configuration for Uploads"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Detect backend directory
BACKEND_DIR=""
if [ -d "/var/www/primeacademy_backend" ]; then
    BACKEND_DIR="/var/www/primeacademy_backend"
elif [ -d "/var/www/Primeacademy/backend" ]; then
    BACKEND_DIR="/var/www/Primeacademy/backend"
elif [ -d "/home/$(whoami)/Primeacademy/backend" ]; then
    BACKEND_DIR="/home/$(whoami)/Primeacademy/backend"
else
    echo -e "${YELLOW}Warning: Could not detect backend directory${NC}"
    echo "Please enter the full path to your backend directory:"
    read -r BACKEND_DIR
fi

echo -e "${GREEN}Using backend directory: $BACKEND_DIR${NC}"

# Ensure uploads directory exists
UPLOADS_DIR="$BACKEND_DIR/uploads"
if [ ! -d "$UPLOADS_DIR" ]; then
    echo -e "${YELLOW}Creating uploads directory: $UPLOADS_DIR${NC}"
    mkdir -p "$UPLOADS_DIR"
    mkdir -p "$UPLOADS_DIR/general"
    chmod -R 755 "$UPLOADS_DIR"
    echo -e "${GREEN}Created uploads directory${NC}"
else
    echo -e "${GREEN}Uploads directory exists: $UPLOADS_DIR${NC}"
fi

# Update backend nginx config
echo ""
echo "=========================================="
echo "Updating Backend Nginx Configuration"
echo "=========================================="

BACKEND_NGINX="/etc/nginx/sites-available/api.prashantthakar.com"
if [ ! -f "$BACKEND_NGINX" ]; then
    echo -e "${YELLOW}Backend nginx config not found at $BACKEND_NGINX${NC}"
    echo "Creating from template..."
    
    # Create the config file
    cat > "$BACKEND_NGINX" << EOF
# Nginx configuration for Backend API (api.prashantthakar.com)
server {
    listen 80;
    server_name api.prashantthakar.com;
    return 301 https://\$server_name\$request_uri;
    client_max_body_size 50M;
}

server {
    listen 443 ssl http2;
    server_name api.prashantthakar.com;

    ssl_certificate /etc/letsencrypt/live/api.prashantthakar.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.prashantthakar.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    # Serve uploaded files directly (better performance)
    location /uploads {
        alias $UPLOADS_DIR;
        try_files \$uri @backend;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    location @backend {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Proxy all other requests to backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    access_log /var/log/nginx/api.prashantthakar.com.access.log;
    error_log /var/log/nginx/api.prashantthakar.com.error.log;
}
EOF
    echo -e "${GREEN}Created backend nginx config${NC}"
else
    echo -e "${GREEN}Backend nginx config exists${NC}"
    # Update the uploads alias path in existing config
    sed -i "s|alias /var/www/primeacademy_backend/uploads;|alias $UPLOADS_DIR;|g" "$BACKEND_NGINX"
    echo -e "${GREEN}Updated uploads path in backend nginx config${NC}"
fi

# Enable backend site if not already enabled
if [ ! -L "/etc/nginx/sites-enabled/api.prashantthakar.com" ]; then
    ln -s "$BACKEND_NGINX" /etc/nginx/sites-enabled/
    echo -e "${GREEN}Enabled backend nginx site${NC}"
fi

# Update frontend nginx config
echo ""
echo "=========================================="
echo "Updating Frontend Nginx Configuration"
echo "=========================================="

FRONTEND_NGINX="/etc/nginx/sites-available/crm.prashantthakar.com"
if [ ! -f "$FRONTEND_NGINX" ]; then
    echo -e "${YELLOW}Frontend nginx config not found at $FRONTEND_NGINX${NC}"
    echo "Creating from template..."
    
    # Detect frontend directory
    FRONTEND_DIR=""
    if [ -d "/var/www/crm.prashantthakar.com" ]; then
        FRONTEND_DIR="/var/www/crm.prashantthakar.com"
    elif [ -d "/var/www/html" ]; then
        FRONTEND_DIR="/var/www/html"
    else
        echo "Please enter the full path to your frontend directory:"
        read -r FRONTEND_DIR
    fi
    
    # Create the config file
    cat > "$FRONTEND_NGINX" << EOF
# Nginx configuration for Frontend (crm.prashantthakar.com)
server {
    listen 80;
    server_name crm.prashantthakar.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.prashantthakar.com;

    ssl_certificate /etc/letsencrypt/live/crm.prashantthakar.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.prashantthakar.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root $FRONTEND_DIR;
    index index.html;

    # Proxy /uploads requests to backend API server
    location /uploads {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # Proxy /api requests to backend API server
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy /orientations requests to backend
    location /orientations {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy /receipts requests to backend
    location /receipts {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy /certificates requests to backend
    location /certificates {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Serve frontend static files
    location / {
        try_files \$uri \$uri/ /index.html;
        
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)\$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    client_max_body_size 50M;

    access_log /var/log/nginx/crm.prashantthakar.com.access.log;
    error_log /var/log/nginx/crm.prashantthakar.com.error.log;
}
EOF
    echo -e "${GREEN}Created frontend nginx config${NC}"
else
    echo -e "${GREEN}Frontend nginx config exists${NC}"
    echo -e "${YELLOW}Please manually update it to include /uploads proxy location${NC}"
fi

# Enable frontend site if not already enabled
if [ ! -L "/etc/nginx/sites-enabled/crm.prashantthakar.com" ]; then
    ln -s "$FRONTEND_NGINX" /etc/nginx/sites-enabled/
    echo -e "${GREEN}Enabled frontend nginx site${NC}"
fi

# Test nginx configuration
echo ""
echo "=========================================="
echo "Testing Nginx Configuration"
echo "=========================================="

if nginx -t; then
    echo -e "${GREEN}Nginx configuration is valid${NC}"
    
    # Reload nginx
    echo ""
    echo "Reloading nginx..."
    systemctl reload nginx
    echo -e "${GREEN}Nginx reloaded successfully${NC}"
else
    echo -e "${RED}Nginx configuration test failed!${NC}"
    echo "Please check the configuration files manually."
    exit 1
fi

# Verify backend is running
echo ""
echo "=========================================="
echo "Verifying Backend Status"
echo "=========================================="

if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}Backend is running and accessible${NC}"
else
    echo -e "${YELLOW}Warning: Backend might not be running${NC}"
    echo "Please check: pm2 list or systemctl status primeacademy-backend"
fi

# Test uploads endpoint
echo ""
echo "=========================================="
echo "Testing Uploads Endpoint"
echo "=========================================="

if curl -s -I http://localhost:3001/uploads/test | head -n 1 | grep -q "200\|404"; then
    echo -e "${GREEN}Uploads endpoint is accessible${NC}"
else
    echo -e "${YELLOW}Warning: Could not test uploads endpoint${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test uploads at: https://crm.prashantthakar.com/uploads/general"
echo "2. Test API at: https://api.prashantthakar.com/uploads/test"
echo "3. Check nginx logs if issues persist:"
echo "   - tail -f /var/log/nginx/crm.prashantthakar.com.error.log"
echo "   - tail -f /var/log/nginx/api.prashantthakar.com.error.log"
echo ""
echo "If uploads directory is empty, you may need to:"
echo "1. Upload files through the application"
echo "2. Or copy existing files to: $UPLOADS_DIR/general/"
echo ""

