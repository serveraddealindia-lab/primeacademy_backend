# Photo Upload Issue Analysis

## Current Flow

1. **Upload Process:**
   - User selects file → `handlePhotoUpload()` → `uploadPhoto()` hook → `uploadAPI.uploadFile()`
   - POST to `/api/upload` with FormData
   - Backend saves to: `backend/uploads/general/filename.jpg`
   - Backend returns: `{ url: "/uploads/general/filename.jpg" }`
   - Frontend stores URL in state and database

2. **Display Process:**
   - Frontend reads URL from state/database: `/uploads/general/filename.jpg`
   - Calls `getPhotoUrl()` → `getImageUrl()` to construct full URL
   - Displays image: `<img src={getPhotoUrl(photo.url)} />`

## Identified Issues

### Issue 1: `getImageUrl()` is Overly Complex
- The function has 330+ lines of complex domain detection/cleaning logic
- For simple relative paths like `/uploads/general/filename.jpg`, it should just prepend base URL
- The complex logic might be breaking valid URLs

### Issue 2: URL Construction
- Relative path: `/uploads/general/filename.jpg`
- Should become: `https://api.prashantthakar.com/uploads/general/filename.jpg` (production)
- Or: `http://localhost:3001/uploads/general/filename.jpg` (local)
- But `getImageUrl()` might be adding `/api` or wrong domains

### Issue 3: Static File Serving
- Backend serves files from `backend/uploads` via `/uploads` route
- Files are saved to: `backend/uploads/general/filename.jpg`
- Should be accessible at: `/uploads/general/filename.jpg`
- But might not be accessible if path calculation is wrong

### Issue 4: Path Calculation in Upload Controller
- Uses `process.cwd()` which should be `backend/` directory
- Calculates relative path from `uploadsRoot` to `file.path`
- If path calculation fails, URL might be wrong

## Root Cause

The most likely issue is that `getImageUrl()` is breaking simple relative URLs with its complex domain detection logic. For a path like `/uploads/general/filename.jpg`, it should:
1. Detect it's a relative path (starts with `/`)
2. Get base URL (from `getApiBaseUrl()`)
3. Remove `/api` from base URL
4. Construct: `baseUrl + relativePath`

But the current implementation has too many edge cases and might be corrupting the URL.

## Solution

Simplify `getImageUrl()` to handle relative paths correctly:
1. If URL is already full (http/https), return as-is (after cleaning)
2. If URL is relative (starts with `/`), prepend base URL (without `/api`)
3. Remove complex domain detection for simple relative paths

