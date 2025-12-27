# VPS Setup Guide - Making Login Work

## Required Environment Variables (.env file)

Create or update the `.env` file in your backend directory on the VPS with the following variables:

### 1. Database Configuration (CRITICAL for login)
```env
DB_HOST=your_database_host
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

### 2. JWT Configuration (REQUIRED for authentication)
```env
JWT_SECRET=your-very-secure-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

**⚠️ IMPORTANT:** 
- `JWT_SECRET` must be a strong, random string (at least 32 characters)
- Never use the default 'your-secret-key-change-in-production'
- Generate a secure secret: `openssl rand -base64 32`

### 3. Server Configuration
```env
NODE_ENV=production
PORT=3001
```

### 4. CORS Configuration (for frontend access)
```env
FRONTEND_URL=https://crm.prashantthakar.com,https://api.prashantthakar.com
```

### 5. Email Configuration (Optional - for password reset)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## Step-by-Step VPS Setup

### Step 1: SSH into your VPS
```bash
ssh user@your-vps-ip
```

### Step 2: Navigate to backend directory
```bash
cd /path/to/your/backend
```

### Step 3: Create/Update .env file
```bash
nano .env
```

Paste all the environment variables above and save (Ctrl+X, then Y, then Enter).

### Step 4: Install dependencies (if not already done)
```bash
npm install
```

### Step 5: Build the backend
```bash
npm run build
```

### Step 6: Verify database connection
Test if your database credentials are correct:
```bash
# Test MySQL connection (adjust for your database)
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SELECT 1;"
```

### Step 7: Run database migrations
```bash
# The backend will automatically run migrations on startup
# Or run manually if needed
```

### Step 8: Start the backend server

**Option A: Using PM2 (Recommended for production)**
```bash
# Install PM2 globally if not installed
npm install -g pm2

# Start the backend
pm2 start dist/index.js --name primeacademy-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system reboot
pm2 startup
```

**Option B: Using systemd service**
Create `/etc/systemd/system/primeacademy-backend.service`:
```ini
[Unit]
Description=Prime Academy Backend API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/your/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable primeacademy-backend
sudo systemctl start primeacademy-backend
sudo systemctl status primeacademy-backend
```

### Step 9: Configure Nginx (if using reverse proxy)

Create or update `/etc/nginx/sites-available/api.prashantthakar.com`:
```nginx
server {
    listen 80;
    server_name api.prashantthakar.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.prashantthakar.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/api.prashantthakar.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 10: Verify the setup

1. **Check if backend is running:**
```bash
curl http://localhost:3001/api/health
```

2. **Check if API is accessible externally:**
```bash
curl https://api.prashantthakar.com/api/health
```

3. **Test login endpoint:**
```bash
curl -X POST https://api.prashantthakar.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

## Common Issues and Solutions

### Issue 1: "Cannot connect to database"
- **Solution:** Verify database credentials in `.env`
- Check if database server is running: `sudo systemctl status mysql`
- Check firewall: `sudo ufw allow 3306`

### Issue 2: "JWT_SECRET not set"
- **Solution:** Ensure `JWT_SECRET` is set in `.env` file
- Restart the backend after updating `.env`

### Issue 3: "CORS error"
- **Solution:** Update `FRONTEND_URL` in `.env` to include your frontend domain
- Restart the backend

### Issue 4: "Port already in use"
- **Solution:** Change `PORT` in `.env` or kill the process using the port:
```bash
lsof -i :3001
kill -9 <PID>
```

### Issue 5: "Login returns 401"
- **Check:** 
  - Database connection is working
  - User exists in database
  - Password is correct
  - User is active (`isActive = true`)

## Verify Login is Working

1. **Check backend logs:**
```bash
# If using PM2
pm2 logs primeacademy-backend

# If using systemd
sudo journalctl -u primeacademy-backend -f
```

2. **Test login from frontend:**
- Open browser console
- Try logging in
- Check for errors in console and network tab

3. **Verify JWT token is generated:**
- After successful login, check if token is returned in response
- Token should be stored in localStorage

## Security Checklist

- [ ] `JWT_SECRET` is a strong, random string (32+ characters)
- [ ] Database password is strong
- [ ] `.env` file has proper permissions: `chmod 600 .env`
- [ ] SSL/TLS certificate is configured for HTTPS
- [ ] Firewall is configured properly
- [ ] Backend is running as non-root user
- [ ] Regular backups of database

## Quick Commands Reference

```bash
# View backend logs (PM2)
pm2 logs primeacademy-backend

# Restart backend (PM2)
pm2 restart primeacademy-backend

# Stop backend (PM2)
pm2 stop primeacademy-backend

# View backend logs (systemd)
sudo journalctl -u primeacademy-backend -f

# Restart backend (systemd)
sudo systemctl restart primeacademy-backend

# Check backend status
curl http://localhost:3001/api/health
```

