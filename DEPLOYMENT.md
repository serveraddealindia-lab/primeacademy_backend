# Deployment Guide for AlmaLinux VPS

This guide will help you deploy the Prime Academy application to your AlmaLinux VPS.

## Prerequisites

- AlmaLinux VPS with root/sudo access
- Domain names configured:
  - `crm.prashantthakar.com` (Frontend)
  - `api.prashantthakar.com` (Backend)
- Node.js and npm installed
- Nginx installed
- MySQL/MariaDB installed
- PM2 installed (for process management)

## Step 1: Install Required Software

```bash
# Update system
sudo dnf update -y

# Install Node.js (if not installed)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Install Nginx
sudo dnf install -y nginx

# Install MySQL/MariaDB
sudo dnf install -y mariadb-server mariadb
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Install PM2 globally
sudo npm install -g pm2

# Install Git (if not installed)
sudo dnf install -y git
```

## Step 2: Clone/Upload Your Project

```bash
# Create project directory
sudo mkdir -p /var/www/primeacademy
sudo chown -R $USER:$USER /var/www/primeacademy

# Upload your project files or clone from repository
cd /var/www/primeacademy
# ... upload your files here ...
```

## Step 3: Backend Setup

```bash
cd /var/www/primeacademy/backend

# Install dependencies
npm install

# Create .env file
nano .env
```

Add the following to `.env`:
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
FRONTEND_URL=http://crm.prashantthakar.com

# JWT Secret (generate a strong random string)
JWT_SECRET=your_jwt_secret_here

# Add other environment variables as needed
```

```bash
# Build the backend
npm run build

# Run database migrations (if you have them)
# npm run migrate

# Test the build
npm start
# Press Ctrl+C to stop
```

## Step 4: Frontend Setup

```bash
cd /var/www/primeacademy/frontend

# Install dependencies
npm install

# Create .env file for production
nano .env.production
```

Add the following to `.env.production`:
```env
VITE_API_BASE_URL=http://api.prashantthakar.com/api
```

```bash
# Build the frontend
npm run build

# The dist folder will be created in frontend/dist
```

## Step 5: Configure Nginx

### Frontend Configuration

```bash
# Copy the nginx config
sudo cp /var/www/primeacademy/nginx-frontend.conf /etc/nginx/sites-available/crm.prashantthakar.com

# Edit the config to set the correct path
sudo nano /etc/nginx/sites-available/crm.prashantthakar.com
```

Update the `root` directive to point to your actual dist folder:
```nginx
root /var/www/primeacademy/frontend/dist;
```

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/crm.prashantthakar.com /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Backend Configuration

```bash
# Copy the nginx config
sudo cp /var/www/primeacademy/nginx-backend.conf /etc/nginx/sites-available/api.prashantthakar.com

# Create symlink
sudo ln -s /etc/nginx/sites-available/api.prashantthakar.com /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 6: Start Backend with PM2

```bash
cd /var/www/primeacademy/backend

# Start the application with PM2
pm2 start dist/index.js --name primeacademy-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command
```

## Step 7: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Or if using firewalld with specific ports:
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## Step 8: SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d crm.prashantthakar.com
sudo certbot --nginx -d api.prashantthakar.com

# Auto-renewal is set up automatically
```

After SSL setup, uncomment the HTTPS sections in both nginx config files.

## Step 9: Verify Deployment

1. Check backend is running:
   ```bash
   pm2 status
   pm2 logs primeacademy-backend
   ```

2. Check nginx is running:
   ```bash
   sudo systemctl status nginx
   ```

3. Test frontend: Visit `http://crm.prashantthakar.com`
4. Test backend: Visit `http://api.prashantthakar.com/api/health`

## Troubleshooting

### Frontend not loading
- Check nginx error logs: `sudo tail -f /var/log/nginx/crm.prashantthakar.com.error.log`
- Verify dist folder path in nginx config
- Check file permissions: `sudo chown -R nginx:nginx /var/www/primeacademy/frontend/dist`

### Backend not responding
- Check PM2 logs: `pm2 logs primeacademy-backend`
- Check if backend is running: `pm2 status`
- Check nginx error logs: `sudo tail -f /var/log/nginx/api.prashantthakar.com.error.log`
- Verify backend is listening on port 3000: `sudo netstat -tlnp | grep 3000`

### CORS errors
- Verify `FRONTEND_URL` in backend `.env` matches your frontend domain
- Check browser console for specific CORS error messages

### Database connection issues
- Verify database credentials in `.env`
- Check MySQL is running: `sudo systemctl status mariadb`
- Test connection: `mysql -u your_db_user -p`

## Useful Commands

```bash
# Restart backend
pm2 restart primeacademy-backend

# View backend logs
pm2 logs primeacademy-backend

# Restart nginx
sudo systemctl restart nginx

# Check nginx status
sudo systemctl status nginx

# Reload nginx config
sudo nginx -t && sudo systemctl reload nginx
```

## File Structure on Server

```
/var/www/primeacademy/
├── backend/
│   ├── dist/          # Compiled backend code
│   ├── src/           # Source code
│   ├── .env           # Backend environment variables
│   └── package.json
├── frontend/
│   ├── dist/          # Built frontend (served by nginx)
│   ├── src/           # Source code
│   └── package.json
└── nginx-*.conf       # Nginx configuration files
```







