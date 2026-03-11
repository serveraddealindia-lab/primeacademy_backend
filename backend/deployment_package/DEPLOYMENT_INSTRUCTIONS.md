# Backend Deployment Instructions

## Contents
- `dist/` - Compiled backend files (ready to run)
- `package.json` - Dependencies and scripts
- `.env.example` - Environment variables template

## Deployment Steps

### 1. Server Setup
```bash
# Upload the deployment_package contents to your server
# Extract to your desired deployment directory
```

### 2. Install Dependencies
```bash
npm install --production
```

### 3. Configure Environment
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your actual values:
# - Database connection details
# - PORT (recommend 3001)
# - FRONTEND_URL (your frontend domain)
# - Email service credentials (if needed)
```

### 4. Start Server
```bash
# Using node directly
node dist/index.js

# Or using PM2 for production
npm install -g pm2
pm2 start dist/index.js --name "backend-api"
```

## Validation Features Included

✅ **Date of Admission Validation** - Prevents past dates
✅ **Software-only Selection** - No course required  
✅ **All TypeScript Errors Fixed** - Clean build
✅ **Proper CORS Configuration** - Frontend integration ready

## Testing After Deployment

Test the endpoints to verify everything works:
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login  
- POST `/api/students/enroll` - Student enrollment (with validation)

## Common Issues

1. **Port conflicts** - Change PORT in .env if 3001 is occupied
2. **Database connection** - Verify database credentials in .env
3. **CORS errors** - Ensure FRONTEND_URL matches your frontend domain

## Health Check

Visit `http://your-server:port/api/health` to verify server is running.