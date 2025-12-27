# Upload Nginx Configuration Files - Step by Step

## Files to Upload

1. `nginx-frontend.conf` → Upload to VPS
2. `nginx-backend.conf` → Upload to VPS

## Steps to Fix Uploads Issue

### Step 1: Upload Files to VPS

Upload both files to your VPS (using SCP, SFTP, or any method you prefer).

### Step 2: Update Frontend Nginx Config

```bash
# SSH into your VPS
ssh your-username@your-vps-ip

# Backup existing config (if it exists)
sudo cp /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-available/crm.prashantthakar.com.backup

# Copy the uploaded file to nginx directory
sudo cp nginx-frontend.conf /etc/nginx/sites-available/crm.prashantthakar.com

# Update the root path in the file if needed (line 24)
# Change: root /var/www/crm.prashantthakar.com;
# To match your actual frontend directory path

# Enable the site (if not already enabled)
sudo ln -sf /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-enabled/
```

### Step 3: Update Backend Nginx Config

```bash
# Backup existing config (if it exists)
sudo cp /etc/nginx/sites-available/api.prashantthakar.com /etc/nginx/sites-available/api.prashantthakar.com.backup

# Copy the uploaded file to nginx directory
sudo cp nginx-backend.conf /etc/nginx/sites-available/api.prashantthakar.com

# Update the uploads directory path in the file if needed (line 58)
# Change: alias /var/www/primeacademy_backend/uploads;
# To match your actual backend uploads directory path
# Common paths:
#   - /var/www/primeacademy_backend/uploads
#   - /var/www/Primeacademy/backend/uploads
#   - /home/your-username/Primeacademy/backend/uploads

# Enable the site (if not already enabled)
sudo ln -sf /etc/nginx/sites-available/api.prashantthakar.com /etc/nginx/sites-enabled/
```

### Step 4: Create Uploads Directory (if it doesn't exist)

```bash
# Find your backend directory first
# Then create uploads directory:
sudo mkdir -p /var/www/primeacademy_backend/uploads/general
sudo chmod -R 755 /var/www/primeacademy_backend/uploads
sudo chown -R www-data:www-data /var/www/primeacademy_backend/uploads
```

**Note:** Replace `/var/www/primeacademy_backend` with your actual backend directory path.

### Step 5: Test and Reload Nginx

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### Step 6: Verify It Works

```bash
# Test backend uploads
curl -I https://api.prashantthakar.com/uploads/test

# Test frontend uploads (should proxy to backend)
curl -I https://crm.prashantthakar.com/uploads/test
```

## Important Notes

1. **Update Paths**: Make sure to update these paths in the config files to match your server:
   - Frontend root directory (line 24 in `nginx-frontend.conf`)
   - Backend uploads directory (line 58 in `nginx-backend.conf`)

2. **SSL Certificates**: The configs assume SSL certificates are at:
   - `/etc/letsencrypt/live/crm.prashantthakar.com/`
   - `/etc/letsencrypt/live/api.prashantthakar.com/`
   
   If your certificates are elsewhere, update those paths.

3. **Backend Port**: The configs assume backend runs on port 3001. If different, update `proxy_pass http://localhost:3001;` in both files.

## Quick Commands Summary

```bash
# 1. Upload files to VPS (do this from your local machine)
scp nginx-frontend.conf nginx-backend.conf username@your-vps-ip:~/

# 2. SSH into VPS and run these commands:
sudo cp ~/nginx-frontend.conf /etc/nginx/sites-available/crm.prashantthakar.com
sudo cp ~/nginx-backend.conf /etc/nginx/sites-available/api.prashantthakar.com

# 3. Update paths in the files (use nano or vi)
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
sudo nano /etc/nginx/sites-available/api.prashantthakar.com

# 4. Enable sites
sudo ln -sf /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.prashantthakar.com /etc/nginx/sites-enabled/

# 5. Create uploads directory
sudo mkdir -p /var/www/primeacademy_backend/uploads/general
sudo chmod -R 755 /var/www/primeacademy_backend/uploads

# 6. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

If you get errors:

1. **Check nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Check if backend is running:**
   ```bash
   curl http://localhost:3001/api/health
   pm2 list  # or systemctl status primeacademy-backend
   ```

3. **Verify paths exist:**
   ```bash
   ls -la /var/www/primeacademy_backend/uploads/
   ls -la /var/www/crm.prashantthakar.com/
   ```

