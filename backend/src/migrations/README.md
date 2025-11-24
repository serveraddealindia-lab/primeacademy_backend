# Migrations

This directory contains Sequelize migration files for database schema management.

## Running Migrations

### Option 1: Using the migration utility

Create a script file to run migrations programmatically:

```typescript
import { runMigrations } from './utils/migrate';
runMigrations();
```

### Option 2: Using Sequelize CLI

If you have sequelize-cli installed and configured, you can use:

```bash
npm run migrate
```

### Option 3: Manual execution

You can also import and run migrations manually in your code before starting the server.

## Migration Order

Migrations are ordered by timestamp to ensure proper dependency resolution:

1. `20240101000001-create-users.ts` - Creates users table (base table)
2. `20240101000002-create-student-profiles.ts` - Creates student_profiles (depends on users)
3. `20240101000003-create-faculty-profiles.ts` - Creates faculty_profiles (depends on users)
4. `20240101000004-create-batches.ts` - Creates batches (depends on users)
5. `20240101000005-create-enrollments.ts` - Creates enrollments (depends on users, batches)
6. `20240101000006-create-sessions.ts` - Creates sessions (depends on batches, users)
7. `20240101000007-create-attendances.ts` - Creates attendances (depends on sessions, users)
8. `20240101000008-create-payment-transactions.ts` - Creates payment_transactions (depends on users)
9. `20240101000009-create-portfolios.ts` - Creates portfolios (depends on users, batches)
10. `20240101000010-create-change-requests.ts` - Creates change_requests (depends on users)
11. `20240101000011-create-employee-punches.ts` - Creates employee_punches (depends on users)

## Notes

- All migrations use TypeScript and should be run with ts-node or compiled first
- Foreign key constraints are properly defined with CASCADE or RESTRICT rules
- JSONB columns are used for flexible JSON data storage (PostgreSQL specific)

