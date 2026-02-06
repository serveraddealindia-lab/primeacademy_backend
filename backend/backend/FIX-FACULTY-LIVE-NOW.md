# 🔧 Fix Faculty Not Showing in Live - Complete Solution

## 🚨 The Problem

Faculty data is not showing properly in live even after uploading files. This is likely because:

1. **JSON fields not parsed** - MySQL JSON columns return as strings, need parsing
2. **Backend not rebuilt** - Old code still running
3. **Frontend not rebuilt** - Old frontend code cached
4. **Missing JSON parsing** in `user.controller.ts`

## ✅ Complete Fix

### Step 1: Update user.controller.ts (CRITICAL)

The `getUserById` function needs to parse JSON fields from faculty profile. 

**File to update:** `src/controllers/user.controller.ts`

**Find this section (around line 360-375):**
```typescript
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
```

**Replace with:**
```typescript
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Parse JSON fields for faculty profile if it exists (MySQL JSON columns sometimes return as strings)
    const userJson = user.toJSON ? user.toJSON() : user;
    if (userJson.facultyProfile) {
      const profile = userJson.facultyProfile;
      
      // Parse documents if it's a string
      if (profile.documents && typeof profile.documents === 'string') {
        try {
          profile.documents = JSON.parse(profile.documents);
        } catch (e) {
          logger.warn(`Failed to parse documents JSON for faculty ${user.id}:`, e);
          profile.documents = null;
        }
      }
      
      // Parse expertise if it's a string
      if (profile.expertise && typeof profile.expertise === 'string') {
        try {
          profile.expertise = JSON.parse(profile.expertise);
        } catch (e) {
          logger.warn(`Failed to parse expertise JSON for faculty ${user.id}:`, e);
        }
      }
      
      // Parse availability if it's a string
      if (profile.availability && typeof profile.availability === 'string') {
        try {
          profile.availability = JSON.parse(profile.availability);
        } catch (e) {
          logger.warn(`Failed to parse availability JSON for faculty ${user.id}:`, e);
        }
      }
      
      userJson.facultyProfile = profile;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: userJson,
      },
    });
```

### Step 2: Also Update Fallback Query (around line 324)

**Find:**
```typescript
              const facultyProfile = await db.FacultyProfile.findOne({ where: { userId: user.id } });
              if (facultyProfile) {
                (user as any).facultyProfile = facultyProfile;
              }
```

**Replace with:**
```typescript
              const facultyProfile = await db.FacultyProfile.findOne({ where: { userId: user.id } });
              if (facultyProfile) {
                // Parse JSON fields if they are strings (MySQL JSON columns sometimes return as strings)
                const profileJson = facultyProfile.toJSON ? facultyProfile.toJSON() : facultyProfile;
                
                // Parse documents if it's a string
                if (profileJson.documents && typeof profileJson.documents === 'string') {
                  try {
                    profileJson.documents = JSON.parse(profileJson.documents);
                  } catch (e) {
                    logger.warn(`Failed to parse documents JSON for faculty ${user.id}:`, e);
                    profileJson.documents = null;
                  }
                }
                
                // Parse expertise if it's a string
                if (profileJson.expertise && typeof profileJson.expertise === 'string') {
                  try {
                    profileJson.expertise = JSON.parse(profileJson.expertise);
                  } catch (e) {
                    logger.warn(`Failed to parse expertise JSON for faculty ${user.id}:`, e);
                  }
                }
                
                // Parse availability if it's a string
                if (profileJson.availability && typeof profileJson.availability === 'string') {
                  try {
                    profileJson.availability = JSON.parse(profileJson.availability);
                  } catch (e) {
                    logger.warn(`Failed to parse availability JSON for faculty ${user.id}:`, e);
                  }
                }
                
                (user as any).facultyProfile = profileJson;
              }
```

### Step 3: On VPS - Rebuild and Restart

```bash
cd /var/www/primeacademy_backend

# Upload the updated user.controller.ts file first
# Then:

npm run build
pm2 restart backend-api
pm2 logs backend-api --lines 50
```

### Step 4: Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
4. Or use Ctrl+Shift+Delete to clear cache

### Step 5: Test

1. Go to Faculty Management
2. Click View on any faculty
3. Check if all details show
4. Click Edit on any faculty
5. Check if all fields populate

---

## 🔍 Debugging Commands on VPS

```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs backend-api --lines 100

# Test API endpoint
curl -X GET http://localhost:3001/api/users/247 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" | jq

# Check if faculty profile exists in database
mysql -u your_user -p primeacademy -e "SELECT id, userId, dateOfBirth FROM faculty_profiles WHERE userId = 247;"
```

---

## 📝 Files That MUST Be Updated

1. ✅ `src/controllers/user.controller.ts` - **CRITICAL - Add JSON parsing**
2. ✅ `src/controllers/faculty.controller.ts` - Already has parsing
3. ✅ `frontend/src/pages/FacultyEdit.tsx` - Already uploaded
4. ✅ `frontend/src/pages/FacultyManagement.tsx` - Already uploaded
5. ✅ `frontend/src/pages/FacultyRegistration.tsx` - Already uploaded

---

## ⚠️ Most Common Issue

**JSON fields are strings instead of objects!**

MySQL JSON columns sometimes return as strings in production. The fix above parses them into objects before sending to frontend.

