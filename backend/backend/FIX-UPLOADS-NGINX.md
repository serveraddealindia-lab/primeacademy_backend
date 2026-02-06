# Fix for Uploads/General Path Not Working in Live

## Problem

When accessing `https://crm.prashantthakar.com/uploads/general` in production, it shows a blank page. View, download, and update photo functionality is not working because:

1. **Frontend domain** (`crm.prashantthakar.com`) doesn't have nginx configured to proxy `/uploads` requests to the backend
2. **Backend domain** (`api.prashantthakar.com`) serves uploads, but the frontend tries to access them from the frontend domain
3. The uploads directory might not exist or have incorrect permissions

## Solution

We need to configure nginx to:
1. **Frontend nginx**: Proxy `/uploads` requests from `crm.prashantthakar.com` to the backend API server
2. **Backend nginx**: Ensure `/uploads` requests are properly served (either directly or proxied to Node.js)

## Quick Fix (Automated)

Run the automated script on your VPS:

```bash
# Upload the script to your VPS first, then:
chmod +x fix-uploads-nginx.sh
sudo ./fix-uploads-nginx.sh
```

## Manual Fix

### Step 1: Update Frontend Nginx Configuration

Edit `/etc/nginx/sites-available/crm.prashantthakar.com` and add this location block **before** the main `location /` block:

```nginx
# Proxy /uploads requests to backend API server
location /uploads {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    proxy_cache_valid 200 30d;
    add_header Cache-Control "public, max-age=2592000";
}
```

Also add similar blocks for other static file paths:

```nginx
# Proxy /orientations, /receipts, /certificates to backend
location /orientations {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /receipts {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /certificates {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Step 2: Update Backend Nginx Configuration (Optional - for better performance)

Edit `/etc/nginx/sites-available/api.prashantthakar.com` and add this **before** the main `location /` block:

```nginx
# Serve uploaded files directly (better performance)
location /uploads {
    # Update this path to your actual backend uploads directory
    alias /var/www/primeacademy_backend/uploads;
    
    # If file doesn't exist, proxy to backend
    try_files $uri @backend;
    
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}

location @backend {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Note**: If you're not sure about the uploads directory path, you can skip this step and just proxy everything to the backend (which is what the frontend config does).

### Step 3: Ensure Uploads Directory Exists

```bash
# Find your backend directory
cd /var/www/primeacademy_backend  # or wherever your backend is

# Create uploads directory if it doesn't exist
mkdir -p uploads/general
chmod -R 755 uploads
```

### Step 4: Test and Reload Nginx

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### Step 5: Verify

1. **Test backend uploads directly:**
   ```bash
   curl -I https://api.prashantthakar.com/uploads/test
   ```

2. **Test frontend uploads (should proxy to backend):**
   ```bash
   curl -I https://crm.prashantthakar.com/uploads/test
   ```

3. **Check if uploads directory has files:**
   ```bash
   ls -la /var/www/primeacademy_backend/uploads/general/
   ```

4. **Test in browser:**
   - Open: `https://crm.prashantthakar.com/uploads/general`
   - Should show directory listing or files (not blank)

## Troubleshooting

### Issue: Still showing blank page

1. **Check nginx error logs:**
   ```bash
   tail -f /var/log/nginx/crm.prashantthakar.com.error.log
   tail -f /var/log/nginx/api.prashantthakar.com.error.log
   ```

2. **Check if backend is running:**
   ```bash
   curl http://localhost:3001/api/health
   pm2 list  # or systemctl status primeacademy-backend
   ```

3. **Check if uploads directory exists and has correct permissions:**
   ```bash
   ls -la /var/www/primeacademy_backend/uploads/
   # Should show drwxr-xr-x permissions
   ```

4. **Test backend uploads endpoint directly:**
   ```bash
   curl http://localhost:3001/uploads/test
   ```

### Issue: 502 Bad Gateway

- Backend might not be running
- Check: `pm2 list` or `systemctl status primeacademy-backend`
- Restart backend if needed

### Issue: 404 Not Found

- Uploads directory might not exist
- Check path in nginx config matches actual directory
- Create directory: `mkdir -p /var/www/primeacademy_backend/uploads/general`

### Issue: Permission Denied

- Fix permissions:
  ```bash
  sudo chown -R www-data:www-data /var/www/primeacademy_backend/uploads
  sudo chmod -R 755 /var/www/primeacademy_backend/uploads
  ```

## Files Updated

1. `nginx-frontend.conf` - Complete frontend nginx configuration
2. `nginx-backend.conf` - Updated backend nginx configuration with uploads support
3. `fix-uploads-nginx.sh` - Automated deployment script

## After Fix

Once fixed, you should be able to:
- ✅ Access `https://crm.prashantthakar.com/uploads/general` and see files
- ✅ View images in the application
- ✅ Download documents
- ✅ Update photos through the UI

All uploads will be accessible through both:
- `https://crm.prashantthakar.com/uploads/general/...` (proxied through frontend)
- `https://api.prashantthakar.com/uploads/general/...` (direct backend access)

