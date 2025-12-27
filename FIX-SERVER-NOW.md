# IMMEDIATE FIX FOR SERVER BUILD ERRORS

The server has old code that references functions that don't exist. Here's how to fix it:

## Quick Fix (Run on VPS):

```bash
cd /var/www/primeacademy_backend

# 1. Pull latest code
git fetch origin
git reset --hard origin/main

# 2. Manually fix faculty.routes.ts if it still has old routes
# Edit the file and make sure it ONLY has these 3 routes:
cat > src/routes/faculty.routes.ts << 'EOF'
import { Router } from 'express';
import * as facultyController from '../controllers/faculty.controller';
import { verifyTokenMiddleware } from '../middleware/auth.middleware';

const router = Router();

// POST /api/faculty - Create faculty profile
router.post(
  '/',
  verifyTokenMiddleware,
  facultyController.createFaculty
);

// GET /api/faculty/:userId - Get faculty profile by user ID
router.get(
  '/:userId',
  verifyTokenMiddleware,
  facultyController.getFacultyProfile
);

// PUT /api/faculty/:id - Update faculty profile
router.put(
  '/:id',
  verifyTokenMiddleware,
  facultyController.updateFacultyProfile
);

export default router;
EOF

# 3. Verify runMigrations file exists
ls -la src/utils/runMigrations.ts

# 4. If runMigrations.ts doesn't exist, pull again or check git status
git status

# 5. Build
npm run build

# 6. If build succeeds, restart
pm2 restart backend-api
```

## What to Check:

1. **faculty.routes.ts** should ONLY have:
   - `createFaculty`
   - `getFacultyProfile` 
   - `updateFacultyProfile`

2. **NO** references to:
   - `getAllFaculty` ❌
   - `getFacultyById` ❌

3. **runMigrations.ts** should exist at `src/utils/runMigrations.ts`

4. **index.ts** should import: `import { runPendingMigrations } from './utils/runMigrations';`

## If errors persist:

Check what the server actually has:
```bash
# Check routes file
cat src/routes/faculty.routes.ts | grep -n "facultyController"

# Check if functions exist in controller
grep -n "export const" src/controllers/faculty.controller.ts

# Check runMigrations
grep -n "runPendingMigrations" src/utils/runMigrations.ts
```

