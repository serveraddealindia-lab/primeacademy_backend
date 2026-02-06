# Fix Server Build Errors

## Errors on Server:
1. `runPendingMigrations` not found (line 509 in index.ts)
2. `getAllFaculty` doesn't exist (line 25 in faculty.routes.ts)
3. `getFacultyById` doesn't exist (line 32 in faculty.routes.ts)

## Solution:

The server has old code. Run these commands on VPS:

```bash
cd /var/www/primeacademy_backend

# Pull latest code
git fetch origin
git reset --hard origin/main

# Verify the files are correct
cat src/routes/faculty.routes.ts
# Should only have: createFaculty, getFacultyProfile, updateFacultyProfile

# Check if runMigrations file exists
ls -la src/utils/runMigrations.ts

# Rebuild
npm run build

# If build succeeds, restart
pm2 restart backend-api
```

## If runMigrations file is missing:

The file should exist at `src/utils/runMigrations.ts`. If it doesn't, the server needs to pull the latest code.

## If faculty.routes.ts has old routes:

The server version might have:
```typescript
router.get('/', facultyController.getAllFaculty);  // ❌ Doesn't exist
router.get('/:id', facultyController.getFacultyById);  // ❌ Doesn't exist
```

Should be:
```typescript
router.get('/:userId', facultyController.getFacultyProfile);  // ✅ Exists
```

