# Update Existing Database on VPS

## Quick Commands

### Step 1: Upload SQL File to VPS

**From your local machine (Windows PowerShell or Git Bash):**

```powershell
# Navigate to project directory
cd C:\Users\ADDEAL\Primeacademy

# Upload SQL file to VPS
scp database_setup_complete.sql root@your-vps-ip:/var/www/primeacademy_backend/
```

**Replace `your-vps-ip` with your actual VPS IP address**

### Step 2: Run Update on VPS

**SSH into your VPS and run:**

```bash
# SSH into VPS
ssh root@your-vps-ip

# Navigate to backend directory
cd /var/www/primeacademy_backend

# Option A: Use the automated script (recommended)
chmod +x update-database-vps.sh
./update-database-vps.sh

# Option B: Manual commands
mysql -u primeacademy_user -p primeacademy_db < database_setup_complete.sql
```

## Manual Update Steps (If Script Doesn't Work)

### 1. Backup First (IMPORTANT!)

```bash
cd /var/www/primeacademy_backend

# Create backup
mysqldump -u primeacademy_user -p primeacademy_db > primeacademy_db_backup_$(date +%Y%m%d_%H%M%S).sql

# You'll be prompted for password
```

### 2. Update Database

```bash
# Run SQL file
mysql -u primeacademy_user -p primeacademy_db < database_setup_complete.sql

# You'll be prompted for MySQL password
```

### 3. Verify Update

```bash
# Check tables
mysql -u primeacademy_user -p primeacademy_db -e "SHOW TABLES;"

# Count tables
mysql -u primeacademy_user -p primeacademy_db -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'primeacademy_db';"
```

### 4. Restart Backend

```bash
# Restart backend
pm2 restart backend-api

# Check logs
pm2 logs backend-api

# Test API
curl http://localhost:3001/api/health
```

## If You Get Errors

### Error: "Access denied"
- Check database user has proper permissions
- Verify password is correct
- Try with root user: `mysql -u root -p primeacademy_db < database_setup_complete.sql`

### Error: "Table already exists"
- The SQL file uses `CREATE TABLE IF NOT EXISTS`, so this is usually safe
- If you want to recreate tables, drop them first (BACKUP FIRST!):
  ```bash
  mysql -u primeacademy_user -p primeacademy_db -e "DROP DATABASE primeacademy_db; CREATE DATABASE primeacademy_db;"
  mysql -u primeacademy_user -p primeacademy_db < database_setup_complete.sql
  ```

### Error: "Unknown database"
- Create database first:
  ```bash
  mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  ```

## Using Root User (If primeacademy_user doesn't work)

If you have issues with `primeacademy_user`, you can use root:

```bash
# Update with root user
mysql -u root -p primeacademy_db < database_setup_complete.sql
```

## Verify Database Connection in Backend

After updating, check your `.env` file has correct credentials:

```bash
cd /var/www/primeacademy_backend
cat .env | grep -E "DB_NAME|DB_USER|DB_PASSWORD|DB_HOST"
```

Should show:
```
DB_NAME=primeacademy_db
DB_USER=primeacademy_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
```

## All-in-One Command (If you know the password)

```bash
cd /var/www/primeacademy_backend && \
mysqldump -u primeacademy_user -pYOUR_PASSWORD primeacademy_db > backup_$(date +%Y%m%d_%H%M%S).sql && \
mysql -u primeacademy_user -pYOUR_PASSWORD primeacademy_db < database_setup_complete.sql && \
pm2 restart backend-api
```

**Replace `YOUR_PASSWORD` with actual password**

