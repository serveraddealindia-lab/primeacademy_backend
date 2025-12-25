# MySQL Commands for VPS

## 1. Login to MySQL on VPS

### Option A: If MySQL is on the same VPS
```bash
# Login as root (you'll be prompted for password)
mysql -u root -p

# Or if you have a specific database user
mysql -u your_username -p your_database_name
```

### Option B: If MySQL is on a remote server
```bash
# Login to remote MySQL server
mysql -h your_mysql_host -u your_username -p your_database_name

# Example:
# mysql -h 192.168.1.100 -u root -p primeacademy_db
```

### Option C: Using SSH tunnel (if MySQL port is not publicly accessible)
```bash
# First create SSH tunnel
ssh -L 3306:localhost:3306 user@your_vps_ip

# Then in another terminal, connect to MySQL
mysql -u root -p -h 127.0.0.1
```

## 2. Add dateOfBirth Column to faculty_profiles Table

Once logged into MySQL, run this SQL command:

```sql
-- Check if column already exists (optional)
SHOW COLUMNS FROM faculty_profiles LIKE 'dateOfBirth';

-- Add the dateOfBirth column
ALTER TABLE `faculty_profiles` 
ADD COLUMN `dateOfBirth` DATE NULL 
COMMENT 'Date of birth of the faculty member' 
AFTER `userId`;

-- Verify the column was added
DESCRIBE faculty_profiles;
```

## 3. Verify the Column

```sql
-- Check the table structure
DESCRIBE faculty_profiles;

-- Or
SHOW COLUMNS FROM faculty_profiles;

-- Check if any data exists
SELECT id, userId, dateOfBirth FROM faculty_profiles LIMIT 5;
```

## 4. Exit MySQL

```sql
EXIT;
```

## Quick One-Liner (if you know the password)

```bash
mysql -u root -p'your_password' your_database_name -e "ALTER TABLE faculty_profiles ADD COLUMN dateOfBirth DATE NULL COMMENT 'Date of birth of the faculty member' AFTER userId;"
```

## Troubleshooting

If you get "Column already exists" error:
```sql
-- Check if column exists
SHOW COLUMNS FROM faculty_profiles LIKE 'dateOfBirth';

-- If it exists, you can skip the ALTER TABLE command
```

If you get permission errors:
- Make sure you're using a user with ALTER TABLE privileges
- You may need to use root user or grant privileges:
```sql
GRANT ALTER ON your_database_name.faculty_profiles TO 'your_username'@'localhost';
FLUSH PRIVILEGES;
```

