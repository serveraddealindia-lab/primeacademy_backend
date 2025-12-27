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

async function checkStudentData() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Check users table for students
    console.log('\n=== Users Table (Students) ===');
    const [usersResults] = await sequelize.query(`
      SELECT 
        id,
        name,
        email,
        phone,
        role,
        isActive,
        createdAt
      FROM users 
      WHERE role = 'student'
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    
    console.log('Students found:', usersResults.length);
    usersResults.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Phone: ${user.phone}, Email: ${user.email}`);
    });

    // Check student profiles
    console.log('\n=== Student Profiles ===');
    const [profilesResults] = await sequelize.query(`
      SELECT 
        sp.id,
        sp.userId,
        u.name as student_name,
        u.phone as student_phone,
        sp.dob,
        sp.address,
        sp.enrollmentDate,
        sp.status,
        sp.documents
      FROM student_profiles sp
      JOIN users u ON sp.userId = u.id
      WHERE u.role = 'student'
      ORDER BY sp.createdAt DESC
      LIMIT 10
    `);
    
    console.log('Student profiles found:', profilesResults.length);
    profilesResults.forEach(profile => {
      console.log(`Profile ID: ${profile.id}, Student: ${profile.student_name}, Status: ${profile.status}`);
      if (profile.documents) {
        console.log(`  Documents: ${JSON.stringify(profile.documents).substring(0, 100)}...`);
      }
    });

    // Check student software progress
    console.log('\n=== Student Software Progress ===');
    const [softwareResults] = await sequelize.query(`
      SELECT 
        ssp.id,
        ssp.studentId,
        u.name as student_name,
        u.phone as student_phone,
        ssp.softwareName,
        ssp.softwareCode,
        ssp.status,
        ssp.enrollmentDate,
        ssp.courseName
      FROM student_software_progress ssp
      JOIN users u ON ssp.studentId = u.id
      WHERE u.role = 'student'
      ORDER BY ssp.createdAt DESC
      LIMIT 10
    `);
    
    console.log('Software progress records found:', softwareResults.length);
    softwareResults.forEach(record => {
      console.log(`Record ID: ${record.id}, Student: ${record.student_name}, Software: ${record.softwareName}, Status: ${record.status}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkStudentData();