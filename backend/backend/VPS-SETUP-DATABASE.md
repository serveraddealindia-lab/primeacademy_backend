# Database Setup for VPS (When Migrations are Disabled)

Since migrations are disabled/failing in production, you have **2 options**:

## Option 1: Use SQL File (Recommended for Fresh Setup)

This is the **fastest and most reliable** way to set up your database:

### Steps:

```bash
# 1. SSH into your VPS
ssh root@your-vps-ip

# 2. Navigate to your project
cd /var/www/primeacademy_backend

# 3. Create database (if it doesn't exist)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS primeacademy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Upload database_setup_complete.sql to VPS (if not already there)
# From your local machine:
scp database_setup_complete.sql root@your-vps-ip:/var/www/primeacademy_backend/

# 5. Run the SQL file
mysql -u root -p primeacademy_db < database_setup_complete.sql

# 6. Verify tables were created
mysql -u root -p primeacademy_db -e "SHOW TABLES;"

# 7. Restart backend
pm2 restart backend-api
```

## Option 2: Fix Migrations to Work in Production

If you want migrations to work automatically:

### Step 1: Ensure migrations are copied during build

The build process (`tsc`) might not be copying migration files. Check if `dist/migrations` exists:

```bash
cd /var/www/primeacademy_backend

# Check if migrations directory exists in dist
ls -la dist/migrations/

# If it doesn't exist, create it and copy migrations
mkdir -p dist/migrations
cp -r src/migrations/* dist/migrations/

# Rebuild to ensure migrations are included
npm run build

# Verify migrations are in dist
ls -la dist/migrations/
```

### Step 2: Update package.json to copy migrations

Add a post-build script to copy migrations:

```bash
# Edit package.json and add this script:
# "postbuild": "mkdir -p dist/migrations && cp -r src/migrations/* dist/migrations/"

# Or create a build script that does both:
# "build": "tsc && mkdir -p dist/migrations && cp -r src/migrations/* dist/migrations/"
```

### Step 3: Test migrations

```bash
# Check backend logs to see if migrations run
pm2 logs backend-api | grep -i migration

# You should see:
# Running migrations from /var/www/primeacademy_backend/dist/migrations
# Migrations completed successfully
```

## Option 3: Manual Table Creation (If SQL file doesn't work)

If the SQL file is too large or has issues, you can create tables manually using Sequelize sync (ONLY for initial setup):

```bash
# WARNING: This will recreate all tables - only use on empty database!

# Temporarily modify backend/src/index.ts to enable sync:
# Change line 493-496 to:
# if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
#   await sequelize.sync({ alter: false });
#   logger.info('Database models synchronized.');
# }

# Then rebuild and restart
npm run build
pm2 restart backend-api

# After tables are created, revert the change to disable sync
```

## Recommended Approach

**For production, use Option 1 (SQL file)** because:
- ✅ Most reliable
- ✅ Fastest setup
- ✅ No dependency on build process
- ✅ Can be version controlled
- ✅ Easy to verify

**After initial setup, you can:**
- Keep using SQL file for schema changes, OR
- Fix migrations (Option 2) for automatic updates

## Verify Database Setup

After setup, verify everything works:

```bash
# Check database connection
mysql -u root -p primeacademy_db -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'primeacademy_db';"

# Check backend can connect
pm2 logs backend-api | grep -i "database connection"

# Test API endpoint
curl http://localhost:3001/api/health
```

