# Update Existing VPS Deployment

This guide will help you update your existing Prime Academy CRM deployment at `crm.prashantthakar.com` with the new code from GitHub.

**Current Setup:** Backend and Frontend already working  
**Goal:** Update to latest code from GitHub repositories

---

## Step 1: Connect to Your VPS

```bash
ssh user@your-vps-ip
# Or
ssh root@your-vps-ip
```

---

## Step 2: Navigate to Project Directory

```bash
cd /var/www/primeacademy
# Or wherever your project is located
```

Check current location:
```bash
pwd
ls -la
```

---

## Step 3: Backup Current Code (Optional but Recommended)

```bash
# Create backup directory
mkdir -p ~/backups/primeacademy-$(date +%Y%m%d)

# Backup backend
cp -r backend ~/backups/primeacademy-$(date +%Y%m%d)/ 2>/dev/null || echo "Backend backup skipped"

# Backup frontend
cp -r frontend ~/backups/primeacademy-$(date +%Y%m%d)/ 2>/dev/null || echo "Frontend backup skipped"

# Backup .env files
cp backend/.env ~/backups/primeacademy-$(date +%Y%m%d)/backend.env 2>/dev/null || echo ".env backup skipped"
cp frontend/.env ~/backups/primeacademy-$(date +%Y%m%d)/frontend.env 2>/dev/null || echo "Frontend .env backup skipped"
```

---

## Step 4: Update Backend

```bash
cd backend
```

### Check if Git is initialized:
```bash
git status
```

### If Git exists, pull latest code:
```bash
git pull origin main
```

### If Git doesn't exist, clone fresh:
```bash
cd ..
rm -rf backend
git clone https://github.com/serveraddealindia-lab/primeacademy_backend.git backend
cd backend
```

### Restore .env file (if you backed it up):
```bash
# If you have the old .env, restore it:
cp ~/backups/primeacademy-*/backend.env .env

# Or manually check and update .env:
nano .env
```

**Important:** Make sure your `.env` file has:
- Correct database credentials
- Correct JWT_SECRET
- Correct FRONTEND_URL and BACKEND_URL

### Install new dependencies:
```bash
npm install
```

### Build TypeScript:
```bash
npm run build
```

### Check for new directories needed:
```bash
mkdir -p orientations
mkdir -p receipts
mkdir -p certificates
chmod -R 755 uploads orientations receipts certificates
```

### Upload orientation PDFs (if not already there):
```bash
# Check if PDFs exist
ls -la orientations/*.pdf

# If missing, upload them via SCP from your local machine:
# scp "Student Orientation English New.pdf" user@vps:/var/www/primeacademy/backend/orientations/Student_Orientation_English.pdf
# scp "Student Orientation GUJARATI.pdf" user@vps:/var/www/primeacademy/backend/orientations/Student_Orientation_Gujarati.pdf
```

---

## Step 5: Update Database (if needed)

### Check if student_orientations table exists:
```bash
mysql -u primeacademy_user -p primeacademy_db -e "SHOW TABLES LIKE 'student_orientations';"
```

### If table doesn't exist, create it:
```bash
mysql -u primeacademy_user -p primeacademy_db
```

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

### Check if certificates table has declaration columns:
```bash
mysql -u primeacademy_user -p primeacademy_db -e "DESCRIBE certificates;" | grep -i declaration
```

### If missing, add them:
```bash
mysql -u primeacademy_user -p primeacademy_db
```

```sql
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS studentDeclarationAccepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS studentDeclarationDate DATE NULL;

EXIT;
```

---

## Step 6: Restart Backend

```bash
# Check PM2 status
pm2 status

# Restart backend
pm2 restart primeacademy-backend

# Check logs for errors
pm2 logs primeacademy-backend --lines 50
```

If backend is not running with PM2:
```bash
cd /var/www/primeacademy/backend
pm2 start dist/index.js --name primeacademy-backend
pm2 save
```

---

## Step 7: Update Frontend

```bash
cd /var/www/primeacademy/frontend
```

### Check if Git is initialized:
```bash
git status
```

### If Git exists, pull latest code:
```bash
git pull origin main
```

### If Git doesn't exist, clone fresh:
```bash
cd ..
rm -rf frontend
git clone https://github.com/serveraddealindia-lab/primeacademy_frontend.git frontend
cd frontend
```

### Restore .env file:
```bash
# If you have the old .env, restore it:
cp ~/backups/primeacademy-*/frontend.env .env

# Or manually check and update .env:
nano .env
```

**Make sure .env has:**
```env
VITE_API_BASE_URL=https://crm.prashantthakar.com
```

### Install new dependencies:
```bash
npm install
```

### Build frontend:
```bash
npm run build
```

---

## Step 8: Verify Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/primeacademy
```

**Make sure these location blocks exist:**

```nginx
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

# Static files
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
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

### Test and restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 9: Clear Browser Cache

After deployment, users should:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Or use incognito/private mode

---

## Step 10: Verify Everything Works

### Test Backend:
```bash
curl http://localhost:3000/api/health
```

Should return: `{"status":"ok"}`

### Test Frontend:
Open browser: `https://crm.prashantthakar.com`

### Test New Features:
1. ✅ Login works
2. ✅ Student orientation shows (check a student's orientation status)
3. ✅ Payment receipts generate
4. ✅ Certificate declaration form works
5. ✅ All existing features still work

---

## Troubleshooting

### Backend not starting:
```bash
pm2 logs primeacademy-backend --lines 100
# Look for errors
```

Common issues:
- Missing dependencies: `cd backend && npm install`
- TypeScript not built: `npm run build`
- Wrong .env: Check database credentials

### Frontend showing old code:
```bash
# Rebuild frontend
cd /var/www/primeacademy/frontend
rm -rf dist
npm run build

# Clear Nginx cache (if any)
sudo systemctl restart nginx
```

### 502 Bad Gateway:
```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs primeacademy-backend

# Restart backend
pm2 restart primeacademy-backend

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Database errors:
```bash
# Test database connection
mysql -u primeacademy_user -p primeacademy_db -e "SELECT 1;"

# Check .env file
cat backend/.env | grep DB_
```

### Static files not loading:
```bash
# Check if directories exist
ls -la /var/www/primeacademy/backend/orientations/
ls -la /var/www/primeacademy/backend/receipts/
ls -la /var/www/primeacademy/backend/certificates/

# Check permissions
chmod -R 755 /var/www/primeacademy/backend/orientations
chmod -R 755 /var/www/primeacademy/backend/receipts
chmod -R 755 /var/www/primeacademy/backend/certificates
```

---

## Quick Update Commands (Future)

For future updates, use these commands:

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
# Nginx will automatically serve new build
```

---

## Rollback (If Something Goes Wrong)

```bash
# Stop current backend
pm2 stop primeacademy-backend

# Restore from backup
cd /var/www/primeacademy
rm -rf backend frontend
cp -r ~/backups/primeacademy-*/backend .
cp -r ~/backups/primeacademy-*/frontend .

# Restore .env files
cp ~/backups/primeacademy-*/backend.env backend/.env
cp ~/backups/primeacademy-*/frontend.env frontend/.env

# Restart
cd backend
npm install
npm run build
pm2 restart primeacademy-backend
```

---

## Checklist

- [ ] Connected to VPS
- [ ] Backed up current code
- [ ] Updated backend from GitHub
- [ ] Restored backend .env file
- [ ] Installed backend dependencies
- [ ] Built backend TypeScript
- [ ] Created required directories
- [ ] Uploaded orientation PDFs
- [ ] Updated database (student_orientations table)
- [ ] Updated database (certificates declaration columns)
- [ ] Restarted backend with PM2
- [ ] Updated frontend from GitHub
- [ ] Restored frontend .env file
- [ ] Installed frontend dependencies
- [ ] Built frontend
- [ ] Verified Nginx configuration
- [ ] Restarted Nginx
- [ ] Tested backend health endpoint
- [ ] Tested frontend in browser
- [ ] Verified new features work
- [ ] All existing features still work

---

**Update Complete!** 🎉

Your application at `crm.prashantthakar.com` should now have all the latest features!


