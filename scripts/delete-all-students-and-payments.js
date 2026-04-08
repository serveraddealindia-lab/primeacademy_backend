/**
 * Delete All Students and Payment Data
 * WARNING: This will permanently delete all student data!
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
console.log('⚠️  ⚠️  ⚠️  DANGER  ⚠️  ⚠️  ⚠️');
console.log('='.repeat(60));
console.log('This script will DELETE:');
console.log('  - All students (users with role=STUDENT)');
console.log('  - All student profiles');
console.log('  - All task-student associations');
console.log('='.repeat(60));
console.log();
console.log('This action CANNOT be undone!');
console.log();
console.log('NOTE: Payments, attendance, sessions, enrollments will be KEPT.');
console.log('      They will reference non-existent students (orphaned).');
console.log();
console.log('Press Ctrl+C now to cancel, or wait 5 seconds to proceed...');
console.log();

setTimeout(async () => {
  const sequelizeLib = require(path.join(backendRoot, 'dist', 'config', 'database'));
  const db = require(path.join(backendRoot, 'dist', 'models', 'index')).default;
  const sequelize = sequelizeLib.default || sequelizeLib;
  
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔍 Starting deletion process...\n');
    
    // Count what will be deleted
    const studentCount = await db.User.count({ where: { role: 'STUDENT' } });
    const taskStudentCount = db.TaskStudent ? await db.TaskStudent.count() : 0;
    
    console.log('📊 Data to be deleted:');
    console.log(`   - Students: ${studentCount}`);
    console.log(`   - Student Profiles: Will be deleted with students`);
    console.log(`   - Task-Student Associations: ${taskStudentCount}`);
    console.log();
    console.log('💾 Data that will be KEPT:');
    console.log(`   - Payments: ${await db.PaymentTransaction.count()}`);
    console.log(`   - Enrollments: ${await db.Enrollment.count()}`);
    console.log(`   - Attendance: ${await db.Attendance.count()}`);
    console.log(`   - Sessions: ${await db.Session.count()}`);
    console.log(`   - Portfolios: ${await db.Portfolio.count()}`);
    console.log();
    
    console.log('⚠️  WARNING: Kept data will reference deleted students (orphaned)!');
    console.log('⚠️  Final warning - deleting in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete in order to respect foreign key constraints
    
    // 1. Delete task-student associations first (they reference students)
    console.log('1/3 Deleting task-student associations...');
    if (db.TaskStudent) {
      await db.TaskStudent.destroy({ where: {}, transaction });
    }
    
    // 2. Delete student profiles (they reference users)
    console.log('2/3 Deleting student profiles...');
    const studentProfiles = await db.StudentProfile.findAll({ 
      include: [{
        model: db.User,
        as: 'user',
        where: { role: 'STUDENT' },
      }],
      transaction,
    });
    
    for (const profile of studentProfiles) {
      await profile.destroy({ transaction });
    }
    
    // 3. Delete students
    console.log('3/3 Deleting students...');
    await db.User.destroy({ 
      where: { role: 'STUDENT' },
      transaction,
    });
    
    await transaction.commit();
    
    console.log('\n✅ SUCCESS! All student and payment data has been deleted.');
    console.log();
    console.log('You can now upload fresh data from your Excel file.');
    console.log();
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await transaction.rollback();
    console.log('\n❌ Transaction rolled back. No data was deleted.');
    process.exit(1);
  }
}, 5000);
