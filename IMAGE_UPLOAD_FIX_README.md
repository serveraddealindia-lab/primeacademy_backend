# Image Upload Fix - SQL Scripts

This document explains how to fix image upload issues in the Prime Academy database.

## Problem
Image uploads and updates are not working because:
1. The `avatarUrl` column in `users` table may be missing or too small
2. The `photoUrl` column in `student_profiles` table may be missing or too small
3. Columns might have incorrect data types

## Solution

### Option 1: Automated Fix (Recommended)
Run the automated SQL script that checks and fixes both columns automatically:

```bash
mysql -u your_username -p primeacademy_db < backend/fix_image_upload_columns_simple.sql
```

Or open MySQL and run:
```sql
SOURCE backend/fix_image_upload_columns_simple.sql;
```

This script will:
- Check if columns exist
- Add them if missing, or modify them if they exist
- Set them to VARCHAR(1000) to accommodate long URLs
- Show verification results

### Option 2: Manual Fix
If you prefer manual control, use `backend/fix_image_upload_columns.sql` which has step-by-step instructions.

### What Gets Fixed

1. **users.avatarUrl**
   - Column type: VARCHAR(1000)
   - Allows NULL values
   - Used for user profile avatars

2. **student_profiles.photoUrl**
   - Column type: VARCHAR(1000)
   - Allows NULL values
   - Used for student profile photos

## Verification

After running the fix script, verify the columns are correct:

```sql
-- Check users.avatarUrl
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'primeacademy_db' 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'avatarUrl';

-- Check student_profiles.photoUrl
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'primeacademy_db' 
AND TABLE_NAME = 'student_profiles' 
AND COLUMN_NAME = 'photoUrl';
```

Expected results:
- **DATA_TYPE**: `varchar`
- **CHARACTER_MAXIMUM_LENGTH**: `1000`
- **IS_NULLABLE**: `YES`

## Testing Image Upload

After running the SQL fix:

1. **Upload a new image**: Should work and save the URL to the database
2. **Update an existing image**: Should replace the old URL with the new one
3. **Check the database**: Verify the URLs are being saved correctly

## Notes

- The fix scripts are **idempotent** - safe to run multiple times
- VARCHAR(1000) is sufficient for most image URLs (including long paths)
- If you need even longer URLs, you can change to TEXT type, but VARCHAR(1000) is recommended for performance

## Troubleshooting

If image uploads still don't work after running the SQL:

1. **Check backend logs** for upload errors
2. **Verify upload directory exists**: `backend/uploads/general/`
3. **Check file permissions** on the upload directory
4. **Verify API endpoint**: `POST /api/upload` should return success
5. **Check frontend console** for JavaScript errors

## Files

- `fix_image_upload_columns_simple.sql` - Automated fix (recommended)
- `fix_image_upload_columns.sql` - Manual fix with instructions
- `create_database_tables.sql` - Updated with correct column sizes




