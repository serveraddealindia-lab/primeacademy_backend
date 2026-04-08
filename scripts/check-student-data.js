/**
 * Quick Diagnostic: Check student data in database
 */

const path = require('path');

// Smart path resolution - works from any directory
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

// Use dist folder for compiled JavaScript files
const sequelizeLib = require(path.join(backendRoot, 'dist', 'config', 'database'));
const db = require(path.join(backendRoot, 'dist', 'models', 'index')).default;

// Handle both default export and named export
const sequelize = sequelizeLib.default || sequelizeLib;

async function checkStudentData() {
  try {
    console.log('🔍 Checking Students in Database...\n');

    // Get all students
    const students = await db.User.findAll({
      where: { role: 'STUDENT' },
      attributes: ['id', 'name', 'email'],
      order: [['id', 'DESC']],
      limit: 20,
    });

    console.log('Last 20 students in database:\n');
    console.table(
      students.map(s => ({
        ID: s.id,
        Name: s.name || '(NULL)',
        Email: s.email,
        HasName: s.name ? '✅' : '❌'
      }))
    );

    // Count students with missing names
    const totalStudents = await db.User.count({
      where: { role: 'STUDENT' }
    });

    const studentsWithoutNames = await db.User.count({
      where: {
        role: 'STUDENT',
        [sequelize.Op.or]: [
          { name: null },
          { name: '' },
        ]
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log(`Total Students: ${totalStudents}`);
    console.log(`Students without Names: ${studentsWithoutNames}`);
    console.log(`Percentage with names: ${((totalStudents - studentsWithoutNames) / totalStudents * 100).toFixed(2)}%`);
    console.log('='.repeat(80));

    // Check a specific payment transaction
    console.log('\n🔍 Checking Payment Transactions...\n');
    
    const payments = await db.PaymentTransaction.findAll({
      include: [{
        model: db.User,
        as: 'student',
        attributes: ['id', 'name', 'email'],
        required: false,
      }],
      order: [['id', 'DESC']],
      limit: 10,
    });

    console.log('Last 10 payments:\n');
    console.table(
      payments.map(p => ({
        PaymentID: p.id,
        StudentID: p.studentId,
        StudentName: p.student?.name || '(MISSING)',
        StudentEmail: p.student?.email || '(MISSING)',
        Amount: p.amount,
        Status: p.status
      }))
    );

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentData();
