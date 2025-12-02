# Fixing Nginx on AlmaLinux

Your system doesn't have `/etc/nginx/sites-available`. AlmaLinux typically uses `/etc/nginx/conf.d/` instead.

## Step 1: Check Nginx Configuration Structure

```bash
# Check nginx configuration directory
ls -la /etc/nginx/

# Check if conf.d exists
ls -la /etc/nginx/conf.d/

# Check main nginx config
cat /etc/nginx/nginx.conf | grep -A 5 "include"
```

## Step 2: Create Nginx Configs in conf.d

```bash
# Create frontend config
sudo nano /etc/nginx/conf.d/crm.prashantthakar.com.conf
```

Paste this content:
```nginx
server {
    listen 80;
    server_name crm.prashantthakar.com;

    root /var/www/crm;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Logging
    access_log /var/log/nginx/crm.prashantthakar.com.access.log;
    error_log /var/log/nginx/crm.prashantthakar.com.error.log;
}
```

Save and exit (Ctrl+X, then Y, then Enter)

```bash
# Create backend config
sudo nano /etc/nginx/conf.d/api.prashantthakar.com.conf
```

Paste this content:
```nginx
server {
    listen 80;
    server_name api.prashantthakar.com;

    # Increase body size for file uploads
    client_max_body_size 50M;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logging
    access_log /var/log/nginx/api.prashantthakar.com.access.log;
    error_log /var/log/nginx/api.prashantthakar.com.error.log;
}
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 3: Test and Reload Nginx

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx
```

## Alternative: Complete Setup Script

Run this all at once:

```bash
# Create frontend config
sudo tee /etc/nginx/conf.d/crm.prashantthakar.com.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name crm.prashantthakar.com;
    root /var/www/crm;
    index index.html;
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    access_log /var/log/nginx/crm.prashantthakar.com.access.log;
    error_log /var/log/nginx/crm.prashantthakar.com.error.log;
}
EOF

# Create backend config
sudo tee /etc/nginx/conf.d/api.prashantthakar.com.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.prashantthakar.com;
    client_max_body_size 50M;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    access_log /var/log/nginx/api.prashantthakar.com.access.log;
    error_log /var/log/nginx/api.prashantthakar.com.error.log;
}
EOF

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```







