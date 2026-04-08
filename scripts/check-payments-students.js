/**
 * Check Payments and Student Names
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

async function checkPayments() {
  try {
    console.log('🔍 Checking payments and student data...\n');
    
    // Get all payments
    const payments = await db.PaymentTransaction.findAll({
      raw: true,
      limit: 20,
      order: [['id', 'DESC']],
    });
    
    console.log(`Total payments in database: ${await db.PaymentTransaction.count()}`);
    console.log(`Showing last ${payments.length} payments:\n`);
    
    // Get all students
    const students = await db.User.findAll({
      where: { role: 'STUDENT' },
      attributes: ['id', 'name', 'email'],
      raw: true,
    });
    
    const studentMap = new Map();
    students.forEach(s => studentMap.set(s.id, s));
    
    console.log('Total students:', students.length);
    console.log();
    
    // Check each payment
    console.table(
      payments.map(p => {
        const student = studentMap.get(p.studentId);
        return {
          PaymentID: p.id,
          StudentID: p.studentId,
          Amount: `₹${p.amount}`,
          Status: p.status,
          StudentExists: student ? '✅ YES' : '❌ NO',
          StudentName: student?.name || '(NOT FOUND)',
        };
      })
    );
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    
    const paymentsWithStudents = payments.filter(p => studentMap.has(p.studentId)).length;
    const paymentsWithoutStudents = payments.length - paymentsWithStudents;
    
    console.log(`\nPayments with valid students: ${paymentsWithStudents}/${payments.length}`);
    console.log(`Payments without students (orphaned): ${paymentsWithoutStudents}/${payments.length}`);
    
    if (paymentsWithoutStudents > 0) {
      console.log('\n⚠️  WARNING: Some payments reference non-existent students!');
      console.log('These payments will not show student names in the UI.');
      console.log('\nSOLUTION: Delete orphaned payments or update studentId to valid students.');
    } else {
      console.log('\n✅ All payments have valid student associations!');
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkPayments();
