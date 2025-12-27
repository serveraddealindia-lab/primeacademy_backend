# Direct Upload Nginx Config Files to VPS

## Method 1: Using SCP (Secure Copy) - Recommended

From your local machine (Windows PowerShell or Command Prompt):

```bash
# Upload frontend config
scp nginx-frontend.conf username@your-vps-ip:/tmp/nginx-frontend.conf

# Upload backend config
scp nginx-backend.conf username@your-vps-ip:/tmp/nginx-backend.conf
```

**Example:**
```bash
scp nginx-frontend.conf root@123.456.789.0:/tmp/nginx-frontend.conf
scp nginx-backend.conf root@123.456.789.0:/tmp/nginx-backend.conf
```

Then SSH into VPS and move them:
```bash
ssh username@your-vps-ip
sudo mv /tmp/nginx-frontend.conf /etc/nginx/sites-available/crm.prashantthakar.com
sudo mv /tmp/nginx-backend.conf /etc/nginx/sites-available/api.prashantthakar.com
```

## Method 2: Direct Copy-Paste via SSH

1. **SSH into your VPS:**
   ```bash
   ssh username@your-vps-ip
   ```

2. **Create/edit frontend config:**
   ```bash
   sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
   ```
   - Copy entire content from `nginx-frontend.conf` file
   - Paste into nano
   - Press `Ctrl+X`, then `Y`, then `Enter` to save

3. **Create/edit backend config:**
   ```bash
   sudo nano /etc/nginx/sites-available/api.prashantthakar.com
   ```
   - Copy entire content from `nginx-backend.conf` file
   - Paste into nano
   - Press `Ctrl+X`, then `Y`, then `Enter` to save

## Method 3: Using WinSCP (Windows GUI Tool)

1. Download and install WinSCP: https://winscp.net/
2. Connect to your VPS using WinSCP
3. Navigate to `/etc/nginx/sites-available/` on the VPS
4. Drag and drop `nginx-frontend.conf` and `nginx-backend.conf` files
5. Rename them:
   - `nginx-frontend.conf` → `crm.prashantthakar.com`
   - `nginx-backend.conf` → `api.prashantthakar.com`

## After Uploading - Complete Setup

Once files are uploaded, run these commands on VPS:

```bash
# 1. Update paths in frontend config (if needed)
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
# Change line 24: root /var/www/crm.prashantthakar.com;
# To match your actual frontend directory

# 2. Update paths in backend config (if needed)
sudo nano /etc/nginx/sites-available/api.prashantthakar.com
# No changes needed - it just proxies to backend

# 3. Enable sites
sudo ln -sf /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.prashantthakar.com /etc/nginx/sites-enabled/

# 4. Create uploads directory (if it doesn't exist)
# First, find your backend directory:
# Common locations: /var/www/primeacademy_backend or /var/www/Primeacademy/backend
sudo mkdir -p /var/www/primeacademy_backend/uploads/general
sudo chmod -R 755 /var/www/primeacademy_backend/uploads
sudo chown -R www-data:www-data /var/www/primeacademy_backend/uploads

# 5. Test nginx configuration
sudo nginx -t

# 6. If test passes, reload nginx
sudo systemctl reload nginx
```

## Quick One-Liner (After Files Are Uploaded)

If you uploaded files to `/tmp/` directory:

```bash
sudo mv /tmp/nginx-frontend.conf /etc/nginx/sites-available/crm.prashantthakar.com && \
sudo mv /tmp/nginx-backend.conf /etc/nginx/sites-available/api.prashantthakar.com && \
sudo ln -sf /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-enabled/ && \
sudo ln -sf /etc/nginx/sites-available/api.prashantthakar.com /etc/nginx/sites-enabled/ && \
sudo nginx -t && \
sudo systemctl reload nginx
```

## Verify It Works

```bash
# Test backend
curl -I https://api.prashantthakar.com/uploads/test

# Test frontend (should proxy to backend)
curl -I https://crm.prashantthakar.com/uploads/test
```

## Important Paths to Update

After uploading, you may need to update these paths in the config files:

1. **Frontend config** (`/etc/nginx/sites-available/crm.prashantthakar.com`):
   - Line 24: `root /var/www/crm.prashantthakar.com;`
   - Change to your actual frontend directory path

2. **Backend config** (`/etc/nginx/sites-available/api.prashantthakar.com`):
   - No path updates needed - it proxies everything to backend

## Troubleshooting

If nginx test fails:
```bash
# Check error
sudo nginx -t

# View detailed error log
sudo tail -20 /var/log/nginx/error.log
```

If uploads still don't work:
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check nginx error logs
sudo tail -f /var/log/nginx/crm.prashantthakar.com.error.log
sudo tail -f /var/log/nginx/api.prashantthakar.com.error.log
```

