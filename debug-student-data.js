const { Sequelize } = require('sequelize');
require('dotenv').config();

// Test database connection and check student data
const sequelize = new Sequelize(
  process.env.DB_NAME || 'primeacademy_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: console.log,
  }
);

async function checkStudentData() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!\n');
    
    // Check users table
    console.log('=== CHECKING USERS TABLE ===');
    const [users] = await sequelize.query(`
      SELECT id, name, email, phone, role, isActive, createdAt 
      FROM users 
      WHERE role = 'student' 
      ORDER BY createdAt DESC 
      LIMIT 5
    `);
    console.log(`Found ${users.length} students in users table:`);
    console.table(users);
    
    if (users.length > 0) {
      const userId = users[0].id;
      console.log(`\n=== CHECKING STUDENT PROFILE FOR USER ID: ${userId} ===`);
      
      // Check student_profiles table
      const [profiles] = await sequelize.query(`
        SELECT * FROM student_profiles WHERE userId = ?
      `, {
        replacements: [userId]
      });
      
      if (profiles.length > 0) {
        console.log('✅ Student profile found:');
        console.log('Profile ID:', profiles[0].id);
        console.log('User ID:', profiles[0].userId);
        console.log('DOB:', profiles[0].dob);
        console.log('Address:', profiles[0].address);
        console.log('Software List:', profiles[0].softwareList);
        console.log('Enrollment Date:', profiles[0].enrollmentDate);
        console.log('Status:', profiles[0].status);
        console.log('Documents (first 500 chars):', JSON.stringify(profiles[0].documents).substring(0, 500));
      } else {
        console.log('❌ NO student profile found for this user!');
      }
      
      // Check enrollments
      console.log(`\n=== CHECKING ENROLLMENTS FOR USER ID: ${userId} ===`);
      const [enrollments] = await sequelize.query(`
        SELECT * FROM enrollments WHERE studentId = ?
      `, {
        replacements: [userId]
      });
      
      if (enrollments.length > 0) {
        console.log(`✅ Found ${enrollments.length} enrollment(s):`);
        console.table(enrollments);
      } else {
        console.log('❌ NO enrollments found for this user!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error);
  } finally {
    await sequelize.close();
  }
}

checkStudentData();
