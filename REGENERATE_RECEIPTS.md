# Regenerate All Receipts with New Format

This script will regenerate all existing receipts with the new PDF format that includes the rupee symbol image.

## How to Run

### Option 1: Using npm script (Recommended)
```bash
cd backend
npm run regenerate-receipts
```

### Option 2: Direct execution
```bash
cd backend
npx tsx src/scripts/regenerateAllReceipts.ts
```

## What It Does

1. **Finds all payments** that have existing receipts (where `receiptUrl` is not null)
2. **Regenerates each receipt** with the new format including:
   - Rupee symbol image (from `rupee.jpg`)
   - Updated invoice format matching the reference
   - All contact details and styling
3. **Updates the database** with new receipt URLs
4. **Logs progress** showing:
   - Total receipts found
   - Success count
   - Error count (if any)

## Output

The script will show:
```
🔄 Starting receipt regeneration process...
📋 Found X payments with receipts to regenerate
🔄 Regenerating receipt for Payment ID: 1, Student: John Doe
✅ Successfully regenerated receipt for Payment ID: 1
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Receipt regeneration completed!
   ✅ Success: X
   ❌ Errors: 0
   📊 Total: X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Important Notes

- **Backup recommended**: The script updates receipt URLs in the database. Old receipt files are not deleted but new ones are created.
- **Rupee image required**: Make sure `rupee.jpg` is in the `backend` folder for the rupee symbol to appear.
- **No data loss**: If a receipt fails to regenerate, the old receipt URL is kept in the database.
- **Time**: The process may take a few minutes depending on the number of receipts.

## Troubleshooting

If you see errors:
1. Check that `rupee.jpg` exists in the `backend` folder
2. Verify database connection is working
3. Check backend logs for detailed error messages
4. Ensure the receipts directory exists and is writable

