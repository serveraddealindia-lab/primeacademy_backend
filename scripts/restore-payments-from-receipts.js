/**
 * Restore Payments from Receipt PDFs
 * Scans receipts folder and recreates payment transactions
 */

const path = require('path');
const fs = require('fs');

let backendRoot;
if (process.cwd().endsWith('backend')) {
  backendRoot = process.cwd();
} else if (process.cwd().includes('Primeacademynew')) {
  backendRoot = path.join(process.cwd(), 'backend');
} else {
  backendRoot = process.cwd();
}

console.log(`Using backend root: ${backendRoot}`);
console.log();

const sequelizeLib = require(path.join(backendRoot, 'dist', 'config', 'database'));
const db = require(path.join(backendRoot, 'dist', 'models', 'index')).default;
const sequelize = sequelizeLib.default || sequelizeLib;

async function restorePaymentsFromReceipts() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔍 Scanning receipts folder...\n');
    
    const receiptsDir = path.join(backendRoot, '..', 'receipts');
    const files = fs.readdirSync(receiptsDir).filter(f => f.endsWith('.pdf'));
    
    console.log(`Found ${files.length} receipt PDFs:\n`);
    files.forEach(f => console.log(`  - ${f}`));
    console.log();
    
    // Extract payment info from filenames
    // Format: receipt_#PRI-PT373_1766560452376.pdf
    const paymentData = [];
    
    for (const file of files) {
      const match = file.match(/receipt_(.+?)_(\d+)\.pdf/);
      if (match) {
        const receiptNumber = match[1]; // #PRI-PT373
        const timestamp = match[2];
        
        // Extract payment ID from receipt number
        const ptMatch = receiptNumber.match(/PT(\d+)/);
        if (ptMatch) {
          const paymentId = parseInt(ptMatch[1]);
          paymentData.push({
            id: paymentId,
            receiptNumber,
            filename: file,
            timestamp,
          });
        }
      }
    }
    
    console.log(`\n📊 Extracted ${paymentData.length} payment records from receipts:\n`);
    console.table(paymentData);
    
    console.log('\n⚠️  IMPORTANT: Receipt PDFs only contain limited information.');
    console.log('To fully restore payments, we need additional data from:');
    console.log('  - Student IDs (who made each payment)');
    console.log('  - Amounts paid');
    console.log('  - Payment dates');
    console.log('  - Payment status');
    console.log();
    console.log('Without this data, we can only recreate empty payment records.');
    console.log();
    
    // Check which payments already exist
    const existingPayments = await db.PaymentTransaction.findAll({
      raw: true,
      attributes: ['id'],
      transaction,
    });
    
    const existingIds = new Set(existingPayments.map(p => p.id));
    const missingPayments = paymentData.filter(p => !existingIds.has(p.id));
    
    console.log(`\nPayments already in database: ${existingIds.size}`);
    console.log(`Missing payments to restore: ${missingPayments.length}`);
    
    if (missingPayments.length === 0) {
      console.log('\n✅ All payments from receipts already exist in database!');
      await transaction.commit();
      await sequelize.close();
      process.exit(0);
    }
    
    console.log('\n⚠️  To restore missing payments, we need you to provide:');
    console.log('1. Student ID for each payment');
    console.log('2. Amount paid');
    console.log('3. Payment date');
    console.log('4. Payment status (paid/unpaid/pending)');
    console.log();
    console.log('Please check the receipt PDFs manually or provide a CSV/spreadsheet with this data.');
    console.log();
    console.log('Missing payment IDs:', missingPayments.map(p => p.id).join(', '));
    
    await transaction.commit();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await transaction.rollback();
    process.exit(1);
  }
}

restorePaymentsFromReceipts();
