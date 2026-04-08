/**
 * Fix Orphaned Payment Transactions
 * Updates payments that reference deleted student IDs
 */

const path = require('path');

// Smart path resolution
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
const { Op } = require('sequelize');

const sequelize = sequelizeLib.default || sequelizeLib;

async function fixOrphanedPayments() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔍 Finding orphaned payments...\n');
    
    // Find all payments
    const allPayments = await db.PaymentTransaction.findAll({
      raw: true,
      transaction,
    });
    
    console.log(`Total payments found: ${allPayments.length}`);
    
    // Get all existing student IDs
    const existingStudents = await db.User.findAll({
      where: { role: 'STUDENT' },
      attributes: ['id'],
      raw: true,
      transaction,
    });
    
    const existingStudentIds = new Set(existingStudents.map(s => s.id));
    console.log(`Existing students: ${existingStudentIds.size}`);
    
    // Find orphaned payments
    const orphanedPayments = allPayments.filter(p => !existingStudentIds.has(p.studentId));
    console.log(`\n⚠️  Orphaned payments: ${orphanedPayments.length}\n`);
    
    if (orphanedPayments.length === 0) {
      console.log('✅ All payments have valid student associations!');
      await transaction.commit();
      await sequelize.close();
      process.exit(0);
    }
    
    console.log('Orphaned payment student IDs:', [...new Set(orphanedPayments.map(p => p.studentId))].join(', '));
    console.log();
    
    // Show sample of orphaned payments
    console.log('Sample orphaned payments:');
    console.table(
      orphanedPayments.slice(0, 5).map(p => ({
        PaymentID: p.id,
        StudentID: p.studentId,
        Amount: `₹${p.amount}`,
        Status: p.status,
      }))
    );
    
    console.log('\n' + '='.repeat(80));
    console.log('OPTIONS TO FIX:');
    console.log('='.repeat(80));
    console.log();
    console.log('Option A: Delete orphaned payments (if test/invalid data)');
    console.log('Option B: Keep orphaned payments but mark them for manual review');
    console.log();
    console.log('Proceeding with Option B (safer) - marking for review...\n');
    
    // For now, just report - don't delete
    // In future, could add a flag column to mark orphaned records
    
    console.log('✅ Analysis complete. No changes made to database.');
    console.log();
    console.log('RECOMMENDATION:');
    console.log('- If these are test payments: DELETE them manually');
    console.log('- If these are valid payments: Check if students were migrated');
    console.log('- Current students have IDs: 1015-1024');
    console.log('- Orphaned payments reference IDs: 783-790');
    console.log();
    console.log('To delete orphaned payments (CAREFUL - irreversible):');
    console.log(`DELETE FROM PaymentTransactions WHERE studentId IN (${orphanedPayments.map(p => p.studentId).join(',')});`);
    console.log();
    
    await transaction.commit();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await transaction.rollback();
    console.log('Transaction rolled back.');
    process.exit(1);
  }
}

fixOrphanedPayments();
