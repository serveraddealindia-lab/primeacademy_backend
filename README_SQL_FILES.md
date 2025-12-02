# SQL Files for Creating 3 Dummy Students

## Files Created

1. **CREATE_THREE_DUMMY_STUDENTS.sql** - Complete SQL script with all details
2. **QUICK_SETUP.sql** - Simplified version for quick setup
3. **UPDATE_PASSWORD_HASHES.sql** - Helper script to update password hashes
4. **GENERATE_PASSWORD_HASH.sql** - Instructions for generating password hashes

## Quick Start

### Option 1: Complete Setup (Recommended)
Run `CREATE_THREE_DUMMY_STUDENTS.sql` - This creates everything with full details.

### Option 2: Quick Setup
Run `QUICK_SETUP.sql` - This creates minimal data for testing.

## Password

All students use password: **Student@123**

The password hash is already included: `$2b$10$BzYYn1zUHeiL1PRDKlylLOUB7KJq0uxwTz2WtTWUg46/YPlK6zT8C`

## Students Created

1. **Alice Johnson** (alice.johnson@primeacademy.local)
   - Scenario: Enrolled in future batch (not started)
   - Will appear in: "Enrolled - Batch Not Started" tab

2. **Bob Smith** (bob.smith@primeacademy.local)
   - Scenario: Multiple enrollments (2 courses)
   - Will appear in: "Multiple Courses Conflict" tab

3. **Carol Williams** (carol.williams@primeacademy.local)
   - Scenario: On leave with pending batches
   - Will appear in: "On Leave - Pending Batches" tab

## How to Run

1. Connect to your MySQL database:
   ```bash
   mysql -u root -p primeacademy_db
   ```

2. Run the SQL file:
   ```sql
   source CREATE_THREE_DUMMY_STUDENTS.sql
   ```
   
   Or copy-paste the contents directly into MySQL.

3. Verify the data:
   ```sql
   SELECT * FROM users WHERE email LIKE '%@primeacademy.local';
   ```

## Notes

- All dates are relative to NOW() - batches will be created with dates relative to current date
- Make sure AUTO_INCREMENT is enabled on all id columns
- Check that foreign key constraints are satisfied
- The password hash is a proper bcrypt hash for "Student@123"

## Troubleshooting

If you get errors:
1. Make sure all tables exist (users, student_profiles, batches, enrollments, student_leaves)
2. Check that AUTO_INCREMENT is set on id columns
3. Verify foreign key constraints
4. Ensure dates are valid (MySQL date format)


