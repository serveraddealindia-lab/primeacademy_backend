# Deploy Backend Changes to VPS

## Option 1: Using Git (Recommended - Safest)

This is the recommended method as it maintains version control and is safer.

### Steps:

```bash
# SSH into your VPS
ssh your_username@your_vps_ip

# Navigate to backend directory
cd /var/www/primeacademy_backend

# Pull latest changes from GitHub
git fetch origin
git pull origin main

# Install any new dependencies (if any)
npm install

# Build the TypeScript code
npm run build

# Restart the backend service
pm2 restart backend-api

# Check if it's running
pm2 status
pm2 logs backend-api --lines 50
```

## Option 2: Direct File Edit on VPS

If you prefer to edit directly on the VPS:

### Steps:

```bash
# SSH into your VPS
ssh your_username@your_vps_ip

# Navigate to backend directory
cd /var/www/primeacademy_backend

# Edit the file
nano src/controllers/student.controller.ts
# OR
vi src/controllers/student.controller.ts
```

### Find and update this section (around line 304-310):

**OLD CODE:**
```typescript
  totalDeal?: number;
```

**NEW CODE:**
```typescript
  totalDeal: number; // Required - student registration not possible without deal amount
```

### Then update the validation section (around line 304-310):

**OLD CODE:**
```typescript
    // Handle number fields - they might come as strings or numbers
    const totalDealNum = totalDeal !== null && totalDeal !== undefined 
      ? (typeof totalDeal === 'string' ? parseFloat(String(totalDeal).replace(/[^\d.-]/g, '')) : Number(totalDeal))
      : 0;
    if (totalDeal === null || totalDeal === undefined || isNaN(totalDealNum) || totalDealNum <= 0) {
      validationErrors.push('Total Deal Amount is required and must be greater than 0');
    }
```

**NEW CODE:**
```typescript
    // Handle number fields - they might come as strings or numbers
    // Total Deal Amount is COMPULSORY - student registration not possible without it
    if (totalDeal === null || totalDeal === undefined) {
      validationErrors.push('Total Deal Amount is required. Student registration cannot proceed without a deal amount.');
    } else {
      const totalDealNum = typeof totalDeal === 'string' 
        ? parseFloat(String(totalDeal).replace(/[^\d.-]/g, '')) 
        : Number(totalDeal);
      if (isNaN(totalDealNum) || totalDealNum <= 0) {
        validationErrors.push('Total Deal Amount must be greater than 0');
      }
    }
```

### After editing:

```bash
# Build the TypeScript code
npm run build

# Restart the backend service
pm2 restart backend-api

# Check if it's running
pm2 status
```

## Verify the Changes

After deployment, test by trying to register a student without a deal amount - it should be rejected with the error message.

## Troubleshooting

If the build fails:
```bash
# Check for TypeScript errors
npm run build

# If there are errors, check the output and fix them
# Then rebuild
npm run build

# Restart
pm2 restart backend-api
```

If PM2 restart fails:
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs backend-api --lines 100

# If needed, stop and start
pm2 stop backend-api
pm2 start backend-api
```

