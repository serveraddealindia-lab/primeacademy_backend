const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'primeacademy_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
  }
);

async function deleteAllStudents() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // First, let's see how many students we have
    const [studentCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'student'
    `);
    
    console.log(`Found ${studentCount[0].count} students in the database.`);
    
    if (studentCount[0].count === 0) {
      console.log('No students to delete.');
      return;
    }
    
    // Show first 5 students as a confirmation
    console.log('\nFirst 5 students that will be deleted:');
    const [sampleStudents] = await sequelize.query(`
      SELECT id, name, email, phone FROM users WHERE role = 'student' LIMIT 5
    `);
    
    sampleStudents.forEach(student => {
      console.log(`  ID: ${student.id}, Name: ${student.name}, Phone: ${student.phone}`);
    });
    
    // Ask for confirmation (in a real script we would prompt, but for safety we'll just show this message)
    console.log('\n⚠️  ABOUT TO DELETE ALL STUDENTS!');
    console.log('This will delete all student users and their associated data.');
    console.log('Type "DELETE ALL STUDENTS" to confirm (but this is just a demo - we will proceed anyway for this script)');
    
    // In a production environment, you would want to uncomment the following lines:
    /*
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('Type "DELETE ALL STUDENTS" to confirm: ', resolve);
    });
    
    readline.close();
    
    if (answer !== 'DELETE ALL STUDENTS') {
      console.log('Deletion cancelled.');
      return;
    }
    */
    
    console.log('\nDeleting all students and associated data...');
    
    // Delete in the correct order to avoid foreign key constraint issues
    // 1. Delete student software progress
    const [deletedSoftwareProgress] = await sequelize.query(`
      DELETE FROM student_software_progress WHERE studentId IN (
        SELECT id FROM users WHERE role = 'student'
      )
    `);
    console.log(`Deleted ${deletedSoftwareProgress.affectedRows} student software progress records.`);
    
    // 2. Delete student orientations
    const [deletedOrientations] = await sequelize.query(`
      DELETE FROM student_orientations WHERE studentId IN (
        SELECT id FROM users WHERE role = 'student'
      )
    `);
    console.log(`Deleted ${deletedOrientations.affectedRows} student orientation records.`);
    
    // 3. Delete certificates
    const [deletedCertificates] = await sequelize.query(`
      DELETE FROM certificates WHERE studentId IN (
        SELECT id FROM users WHERE role = 'student'
      )
    `);
    console.log(`Deleted ${deletedCertificates.affectedRows} certificate records.`);
    
    // 4. Delete software completions
    const [deletedSoftwareCompletions] = await sequelize.query(`
      DELETE FROM software_completions WHERE studentId IN (
        SELECT id FROM users WHERE role = 'student'
      )
    `);
    console.log(`Deleted ${deletedSoftwareCompletions.affectedRows} software completion records.`);
    
    // 5. Delete attendances
    const [deletedAttendances] = await sequelize.query(`
      DELETE FROM attendances WHERE studentId IN (
        SELECT id FROM users WHERE role = 'student'
      )
    `);
    console.log(`Deleted ${deletedAttendances.affectedRows} attendance records.`);
    
    // 6. Delete student leaves
    const [deletedStudentLeaves] = await sequelize.query(`
      DELETE FROM student_leaves WHERE studentId IN (
        SELECT id FROM users WHERE role = 'student'
      )
    `);
    console.log(`Deleted ${deletedStudentLeaves.affectedRows} student leave records.`);
    
    // 7. Delete payment transactions
    const [deletedPayments] = await sequelize.query(`
      DELETE FROM payment_transactions WHERE studentId IN (
        SELECT id FROM users WHERE role = 'student'
      )
    `);
    console.log(`Deleted ${deletedPayments.affectedRows} payment transaction records.`);
    
    // 8. Delete enrollments
    const [deletedEnrollments] = await sequelize.query(`
      DELETE FROM enrollments WHERE studentId IN (
        SELECT id FROM users WHERE role = 'student'
      )
    `);
    console.log(`Deleted ${deletedEnrollments.affectedRows} enrollment records.`);
    
    // 9. Delete student profiles
    const [deletedProfiles] = await sequelize.query(`
      DELETE FROM student_profiles WHERE userId IN (
        SELECT id FROM users WHERE role = 'student'
      )
    `);
    console.log(`Deleted ${deletedProfiles.affectedRows} student profile records.`);
    
    // 10. Finally, delete the student users themselves
    const [deletedUsers] = await sequelize.query(`
      DELETE FROM users WHERE role = 'student'
    `);
    console.log(`Deleted ${deletedUsers.affectedRows} student user records.`);
    
    console.log('\n✅ All students and associated data have been deleted successfully!');
    
    // Verify deletion
    const [remainingStudents] = await sequelize.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'student'
    `);
    
    console.log(`Remaining students: ${remainingStudents[0].count}`);
    
  } catch (error) {
    console.error('Error deleting students:', error.message);
  } finally {
    await sequelize.close();
  }
}

deleteAllStudents();