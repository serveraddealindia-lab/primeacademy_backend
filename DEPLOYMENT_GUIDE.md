# VPS Deployment Guide for Prime Academy CRM

This guide will help you deploy the Prime Academy CRM application to your VPS.

## Prerequisites

- VPS with Ubuntu 20.04/22.04 (or similar Linux distribution)
- Root or sudo access
- Domain name pointed to your VPS IP (optional but recommended)
- MySQL/MariaDB installed
- Node.js 18+ and npm installed

---

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Required Software
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Git (if not already installed)
sudo apt install git -y
```

### 1.3 Secure MySQL
```bash
sudo mysql_secure_installation
```

---

## Step 2: Database Setup

### 2.1 Create Database and User
```bash
sudo mysql -u root -p
```

In MySQL prompt:
```sql
CREATE DATABASE primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2.2 Run Database Migrations
After deploying the backend, you'll run migrations (see Step 4).

---

## Step 3: Clone and Setup Backend

### 3.1 Clone Repository (or upload files)
```bash
cd /var/www
sudo mkdir -p primeacademy
sudo chown $USER:$USER primeacademy
cd primeacademy

# If using Git:
git clone <your-repo-url> .

# Or upload files via SFTP/SCP to /var/www/primeacademy
```

### 3.2 Setup Backend
```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### 3.3 Create Environment File
```bash
nano .env
```

Add the following (update with your values):
```env
# Server
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=primeacademy_user
DB_PASSWORD=your_strong_password_here

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars

# Frontend URL
FRONTEND_URL=https://yourdomain.com,http://yourdomain.com

# Backend URL (for file serving)
BACKEND_URL=https://yourdomain.com

# Optional: Biometric device settings
BIOMETRIC_DEVICE_IP=
BIOMETRIC_DEVICE_PORT=
```

Generate JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.4 Create Required Directories
```bash
cd /var/www/primeacademy/backend

# Create directories for file uploads
mkdir -p uploads/general
mkdir -p uploads/attendance
mkdir -p orientations
mkdir -p receipts
mkdir -p certificates

# Set permissions
chmod -R 755 uploads orientations receipts certificates
```

### 3.5 Copy Orientation PDFs
```bash
# Copy your PDF files to orientations directory
cp "Student Orientation English New.pdf" orientations/Student_Orientation_English.pdf
cp "Student Orientation GUJARATI.pdf" orientations/Student_Orientation_Gujarati.pdf
```

### 3.6 Run Database Migrations
```bash
# Make sure database is set up first
npm run migrate
# Or if you have a migration script:
# node dist/scripts/runMigrations.js
```

### 3.7 Start Backend with PM2
```bash
# Start the application
pm2 start dist/index.js --name primeacademy-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

---

## Step 4: Setup Frontend

### 4.1 Build Frontend
```bash
cd /var/www/primeacademy/frontend

# Install dependencies
npm install

# Create .env file
nano .env
```

Add to `.env`:
```env
VITE_API_BASE_URL=https://yourdomain.com
# Or if using API subdomain:
# VITE_API_BASE_URL=https://api.yourdomain.com
```

```bash
# Build for production
npm run build
```

### 4.2 Configure Nginx for Frontend
```bash
sudo nano /etc/nginx/sites-available/primeacademy
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (React app)
    root /var/www/primeacademy/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static file serving (uploads, orientations, receipts, certificates)
    location /uploads {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /orientations {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /receipts {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /certificates {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/primeacademy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 5: SSL Certificate (Let's Encrypt)

### 5.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 5.2 Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically update your Nginx configuration.

### 5.3 Auto-renewal (already set up by certbot)
```bash
sudo certbot renew --dry-run
```

---

## Step 6: Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

---

## Step 7: Verify Deployment

### 7.1 Check Backend
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs primeacademy-backend

# Test backend directly
curl http://localhost:3000/api/health
```

### 7.2 Check Nginx
```bash
sudo systemctl status nginx
sudo nginx -t
```

### 7.3 Check Database
```bash
sudo mysql -u primeacademy_user -p primeacademy_db -e "SHOW TABLES;"
```

---

## Step 8: Post-Deployment Tasks

### 8.1 Create Admin User
You may need to create an admin user. Check if you have a script or do it via SQL:

```sql
-- Generate password hash first (use Node.js or bcrypt)
-- Then insert user
INSERT INTO users (name, email, phone, role, passwordHash, isActive, createdAt, updatedAt)
VALUES ('Admin', 'admin@primeacademy.com', '+1234567890', 'superadmin', '$2b$10$...', true, NOW(), NOW());
```

### 8.2 Run SQL Fixes (if needed)
If you had AUTO_INCREMENT issues, run:
```sql
ALTER TABLE employee_profiles MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE batches MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE employee_punches MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE users MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE faculty_profiles MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE payment_transactions MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
```

### 8.3 Create Student Orientations Table
```sql
CREATE TABLE IF NOT EXISTS student_orientations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  studentId INT NOT NULL,
  language ENUM('english', 'gujarati') NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  acceptedAt DATE NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_language (studentId, language),
  FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Step 9: Monitoring and Maintenance

### 9.1 PM2 Monitoring
```bash
# View logs
pm2 logs primeacademy-backend

# Monitor resources
pm2 monit

# Restart application
pm2 restart primeacademy-backend

# Stop application
pm2 stop primeacademy-backend
```

### 9.2 Database Backups
Create a backup script:
```bash
sudo nano /usr/local/bin/backup-primeacademy.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/primeacademy"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u primeacademy_user -p'your_password' primeacademy_db > $BACKUP_DIR/backup_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/backup-primeacademy.sh
```

Add to crontab (daily backup at 2 AM):
```bash
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-primeacademy.sh
```

---

## Step 10: Troubleshooting

### Common Issues:

1. **Backend not starting:**
   - Check PM2 logs: `pm2 logs primeacademy-backend`
   - Verify .env file exists and has correct values
   - Check database connection

2. **502 Bad Gateway:**
   - Check if backend is running: `pm2 status`
   - Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify backend is listening on port 3000

3. **Static files not loading:**
   - Check directory permissions
   - Verify Nginx proxy_pass configuration
   - Check file paths in backend

4. **Database connection errors:**
   - Verify MySQL is running: `sudo systemctl status mysql`
   - Check database credentials in .env
   - Test connection: `mysql -u primeacademy_user -p primeacademy_db`

---

## Quick Deployment Checklist

- [ ] Server updated and required software installed
- [ ] Database created and user configured
- [ ] Backend cloned/uploaded and dependencies installed
- [ ] Backend .env file configured
- [ ] Required directories created (uploads, orientations, receipts, certificates)
- [ ] Orientation PDFs copied
- [ ] Database migrations run
- [ ] Backend started with PM2
- [ ] Frontend built with correct API URL
- [ ] Nginx configured and restarted
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Admin user created
- [ ] Backup script configured
- [ ] Application tested and working

---

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs primeacademy-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system logs: `sudo journalctl -u nginx`
4. Verify all environment variables are set correctly
5. Ensure all directories have proper permissions

Good luck with your deployment! 🚀


