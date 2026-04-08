/**
 * Delete Orphaned Payments
 * Removes payments that reference non-existent students
 */

const path = require('path');

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

async function deleteOrphanedPayments() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔍 Finding orphaned payments...\n');
    
    // Get all payments
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
      console.log('No action needed.');
      await transaction.commit();
      await sequelize.close();
      process.exit(0);
    }
    
    console.log('Orphaned payment student IDs:', [...new Set(orphanedPayments.map(p => p.studentId))].sort((a, b) => a - b).join(', '));
    console.log();
    
    // Show sample of what will be deleted
    console.log('Sample orphaned payments to be DELETED:');
    console.table(
      orphanedPayments.slice(0, 5).map(p => ({
        PaymentID: p.id,
        StudentID: p.studentId,
        Amount: `₹${p.amount}`,
        Status: p.status,
      }))
    );
    
    console.log('\n⚠️  ABOUT TO DELETE THESE ORPHANED PAYMENTS...');
    console.log('This action cannot be undone!\n');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');
    
    // Wait 3 seconds then delete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete orphaned payments
    const deleteResult = await db.PaymentTransaction.destroy({
      where: {
        id: orphanedPayments.map(p => p.id),
      },
      transaction,
    });
    
    console.log(`✅ Deleted ${deleteResult} orphaned payments!`);
    
    // Verify remaining payments
    const remainingPayments = await db.PaymentTransaction.count();
    console.log(`\nRemaining payments: ${remainingPayments}`);
    
    // Check if all remaining payments have valid students
    const validPayments = await db.PaymentTransaction.count({
      include: [{
        model: db.User,
        as: 'student',
        required: true,
      }]
    });
    
    console.log(`Payments with valid student associations: ${validPayments}`);
    
    if (validPayments === remainingPayments) {
      console.log('\n✅ SUCCESS! All remaining payments now have valid student names!');
    }
    
    await transaction.commit();
    console.log('\n✅ Transaction committed successfully.');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await transaction.rollback();
    console.log('\n❌ Transaction rolled back.');
    process.exit(1);
  }
}

deleteOrphanedPayments();
