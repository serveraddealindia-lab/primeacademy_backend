# VPS Deployment - Step by Step Guide

Complete manual guide to deploy Prime Academy CRM from GitHub to your VPS.

**Repositories:**
- Backend: https://github.com/serveraddealindia-lab/primeacademy_backend.git
- Frontend: https://github.com/serveraddealindia-lab/primeacademy_frontend.git

---

## Step 1: Connect to Your VPS

```bash
ssh user@your-vps-ip
# Or
ssh root@your-vps-ip
```

Enter your password when prompted.

---

## Step 2: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

---

## Step 3: Install Node.js 18.x

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node --version
npm --version
```

---

## Step 4: Install MySQL

```bash
sudo apt install mysql-server -y
```

Secure MySQL:
```bash
sudo mysql_secure_installation
```

Follow the prompts:
- Set root password? **Yes** (or use strong password)
- Remove anonymous users? **Yes**
- Disallow root login remotely? **Yes**
- Remove test database? **Yes**
- Reload privilege tables? **Yes**

---

## Step 5: Create Database and User

```bash
sudo mysql -u root -p
```

Enter your MySQL root password, then run:

```sql
CREATE DATABASE primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'primeacademy_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';

GRANT ALL PRIVILEGES ON primeacademy_db.* TO 'primeacademy_user'@'localhost';

FLUSH PRIVILEGES;

EXIT;
```

**Important:** Replace `'your_strong_password_here'` with a strong password. Save this password - you'll need it for the .env file.

---

## Step 6: Install Nginx

```bash
sudo apt install nginx -y
```

Check status:
```bash
sudo systemctl status nginx
```

---

## Step 7: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## Step 8: Create Project Directory

```bash
sudo mkdir -p /var/www/primeacademy
sudo chown $USER:$USER /var/www/primeacademy
cd /var/www/primeacademy
```

---

## Step 9: Clone Backend Repository

```bash
git clone https://github.com/serveraddealindia-lab/primeacademy_backend.git backend
```

---

## Step 10: Setup Backend

```bash
cd backend
```

Install dependencies:
```bash
npm install
```

Build TypeScript:
```bash
npm run build
```

---

## Step 11: Create Backend .env File

```bash
nano .env
```

Add the following (replace with your actual values):

```env
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=primeacademy_db
DB_USER=primeacademy_user
DB_PASSWORD=your_strong_password_here

JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long

FRONTEND_URL=https://yourdomain.com,http://yourdomain.com
BACKEND_URL=https://yourdomain.com
```

**To generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as JWT_SECRET value.

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 12: Create Required Directories

```bash
mkdir -p uploads/general
mkdir -p uploads/attendance
mkdir -p orientations
mkdir -p receipts
mkdir -p certificates

chmod -R 755 uploads orientations receipts certificates
```

---

## Step 13: Upload Orientation PDFs

You need to upload these files to the VPS:

**Option A: Using SCP from your local machine:**
```bash
# From your local Windows machine (PowerShell):
scp "backend\Student Orientation English New.pdf" user@your-vps-ip:/var/www/primeacademy/backend/orientations/Student_Orientation_English.pdf

scp "backend\Student Orientation GUJARATI.pdf" user@your-vps-ip:/var/www/primeacademy/backend/orientations/Student_Orientation_Gujarati.pdf
```

**Option B: Upload via SFTP client** (FileZilla, WinSCP, etc.)

**Option C: Upload to VPS and move:**
```bash
# On VPS, if you uploaded files to /tmp:
cp /tmp/Student_Orientation_English.pdf orientations/
cp /tmp/Student_Orientation_Gujarati.pdf orientations/
```

---

## Step 14: Run Database Migrations

```bash
cd /var/www/primeacademy/backend

# If you have a migration script:
npm run migrate

# Or manually create the student_orientations table:
mysql -u primeacademy_user -p primeacademy_db
```

In MySQL, run:
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

EXIT;
```

---

## Step 15: Fix AUTO_INCREMENT (if needed)

```bash
mysql -u primeacademy_user -p primeacademy_db
```

Run these SQL commands:
```sql
ALTER TABLE employee_profiles MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE batches MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE employee_punches MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE users MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE faculty_profiles MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE payment_transactions MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE student_profiles MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE enrollments MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;

EXIT;
```

---

## Step 16: Start Backend with PM2

```bash
cd /var/www/primeacademy/backend

pm2 start dist/index.js --name primeacademy-backend
```

Check if it's running:
```bash
pm2 status
pm2 logs primeacademy-backend
```

Save PM2 configuration:
```bash
pm2 save
```

Setup PM2 to start on boot:
```bash
pm2 startup
```

**Important:** Copy and run the command that PM2 outputs (it will look like `sudo env PATH=...`)

---

## Step 17: Clone Frontend Repository

```bash
cd /var/www/primeacademy
git clone https://github.com/serveraddealindia-lab/primeacademy_frontend.git frontend
```

---

## Step 18: Setup Frontend

```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

---

## Step 19: Create Frontend .env File

```bash
nano .env
```

Add:
```env
VITE_API_BASE_URL=https://yourdomain.com
```

**Replace `yourdomain.com` with your actual domain.**

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 20: Build Frontend

```bash
npm run build
```

This creates the `dist` folder with production files.

---

## Step 21: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/primeacademy
```

Paste this configuration (replace `yourdomain.com` with your domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
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

    # Static files - Uploads
    location /uploads {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files - Orientations
    location /orientations {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files - Receipts
    location /receipts {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files - Certificates
    location /certificates {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 22: Enable Nginx Site

```bash
sudo ln -s /etc/nginx/sites-available/primeacademy /etc/nginx/sites-enabled/
```

Test Nginx configuration:
```bash
sudo nginx -t
```

If test passes, restart Nginx:
```bash
sudo systemctl restart nginx
```

---

## Step 23: Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Step 24: Install SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
```

Get SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter your email address
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

Certbot will automatically update your Nginx configuration.

---

## Step 25: Verify Deployment

### Check Backend:
```bash
pm2 status
pm2 logs primeacademy-backend
```

### Check Nginx:
```bash
sudo systemctl status nginx
```

### Test API:
```bash
curl http://localhost:3000/api/health
```

Should return: `{"status":"ok"}`

### Test Frontend:
Open your browser and visit: `https://yourdomain.com`

---

## Step 26: Create Admin User (Optional)

If you need to create an admin user:

```bash
mysql -u primeacademy_user -p primeacademy_db
```

```sql
-- Generate password hash first (use Node.js or bcrypt)
-- Then insert user
INSERT INTO users (name, email, phone, role, passwordHash, isActive, createdAt, updatedAt)
VALUES ('Admin', 'admin@primeacademy.com', '+1234567890', 'superadmin', '$2b$10$...', true, NOW(), NOW());

EXIT;
```

---

## Troubleshooting

### Backend not starting:
```bash
pm2 logs primeacademy-backend
# Check for errors in logs
```

### 502 Bad Gateway:
```bash
# Check if backend is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart backend
pm2 restart primeacademy-backend
```

### Database connection error:
```bash
# Test MySQL connection
mysql -u primeacademy_user -p primeacademy_db

# Check .env file
cat backend/.env
```

### Static files not loading:
```bash
# Check directory permissions
ls -la /var/www/primeacademy/backend/orientations

# Check if files exist
ls -la /var/www/primeacademy/backend/orientations/*.pdf
```

---

## Future Updates

When you make changes and push to GitHub:

### Update Backend:
```bash
cd /var/www/primeacademy/backend
git pull origin main
npm install
npm run build
pm2 restart primeacademy-backend
```

### Update Frontend:
```bash
cd /var/www/primeacademy/frontend
git pull origin main
npm install
npm run build
# Nginx will automatically serve the new build
```

---

## Quick Reference Commands

```bash
# Backend
pm2 status                    # Check backend status
pm2 logs primeacademy-backend # View backend logs
pm2 restart primeacademy-backend # Restart backend

# Nginx
sudo nginx -t                 # Test Nginx config
sudo systemctl restart nginx  # Restart Nginx
sudo tail -f /var/log/nginx/error.log # View Nginx errors

# Database
mysql -u primeacademy_user -p primeacademy_db # Connect to database

# Files
ls -la /var/www/primeacademy/backend/orientations # Check PDFs
```

---

## Checklist

- [ ] System updated
- [ ] Node.js installed
- [ ] MySQL installed and secured
- [ ] Database and user created
- [ ] Nginx installed
- [ ] PM2 installed
- [ ] Backend cloned
- [ ] Backend dependencies installed
- [ ] Backend built
- [ ] Backend .env configured
- [ ] Required directories created
- [ ] Orientation PDFs uploaded
- [ ] Database migrations run
- [ ] Backend started with PM2
- [ ] Frontend cloned
- [ ] Frontend dependencies installed
- [ ] Frontend .env configured
- [ ] Frontend built
- [ ] Nginx configured
- [ ] Nginx restarted
- [ ] Firewall configured
- [ ] SSL certificate installed
- [ ] Application tested and working

---

**Deployment Complete!** 🎉

Your application should now be live at `https://yourdomain.com`


