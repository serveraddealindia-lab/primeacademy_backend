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
    logging: console.log,
  }
);

async function checkStudents() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');

    // Check 1: Count all users
    console.log('=== CHECK 1: Total Users ===');
    const [totalUsers] = await sequelize.query(`SELECT COUNT(*) as count FROM users`);
    console.log(`Total users in database: ${totalUsers[0].count}\n`);

    // Check 2: Count students by role (exact match)
    console.log('=== CHECK 2: Students with role = "student" (exact) ===');
    const [exactStudents] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'student'
    `);
    console.log(`Students with role='student': ${exactStudents[0].count}\n`);

    // Check 3: Count students by role (case-insensitive)
    console.log('=== CHECK 3: Students with role LIKE "student" (case-insensitive) ===');
    const [caseInsensitive] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE LOWER(role) = 'student'
    `);
    console.log(`Students with LOWER(role)='student': ${caseInsensitive[0].count}\n`);

    // Check 4: Show all roles in database
    console.log('=== CHECK 4: All roles in database ===');
    const [allRoles] = await sequelize.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    allRoles.forEach(row => {
      console.log(`  Role: "${row.role}" (${row.count} users)`);
    });
    console.log('');

    // Check 5: Show recent students (last 10)
    console.log('=== CHECK 5: Recent Students (last 10) ===');
    const [recentStudents] = await sequelize.query(`
      SELECT 
        id,
        name,
        email,
        phone,
        role,
        isActive,
        createdAt
      FROM users 
      WHERE LOWER(role) = 'student'
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    
    if (recentStudents.length === 0) {
      console.log('❌ No students found!\n');
    } else {
      console.log(`Found ${recentStudents.length} students:\n`);
      recentStudents.forEach((student, index) => {
        console.log(`${index + 1}. ID: ${student.id}`);
        console.log(`   Name: ${student.name}`);
        console.log(`   Email: ${student.email}`);
        console.log(`   Phone: ${student.phone}`);
        console.log(`   Role: "${student.role}"`);
        console.log(`   Active: ${student.isActive ? 'Yes' : 'No'}`);
        console.log(`   Created: ${student.createdAt}`);
        console.log('');
      });
    }

    // Check 6: Check student profiles
    console.log('=== CHECK 6: Student Profiles ===');
    const [profiles] = await sequelize.query(`
      SELECT 
        sp.id as profile_id,
        sp.userId,
        u.name as student_name,
        u.role as user_role,
        sp.status as profile_status,
        sp.enrollmentDate
      FROM student_profiles sp
      LEFT JOIN users u ON sp.userId = u.id
      ORDER BY sp.createdAt DESC
      LIMIT 10
    `);
    
    if (profiles.length === 0) {
      console.log('❌ No student profiles found!\n');
    } else {
      console.log(`Found ${profiles.length} profiles:\n`);
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. Profile ID: ${profile.profile_id}`);
        console.log(`   User ID: ${profile.userId}`);
        console.log(`   Student Name: ${profile.student_name || 'N/A'}`);
        console.log(`   User Role: "${profile.user_role || 'N/A'}"`);
        console.log(`   Profile Status: ${profile.profile_status || 'N/A'}`);
        console.log(`   Enrollment Date: ${profile.enrollmentDate || 'N/A'}`);
        console.log('');
      });
    }

    // Check 7: Check for orphaned profiles (profiles without users)
    console.log('=== CHECK 7: Orphaned Profiles (profiles without users) ===');
    const [orphaned] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM student_profiles sp
      LEFT JOIN users u ON sp.userId = u.id
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned profiles: ${orphaned[0].count}\n`);

    // Check 8: Check for users without profiles
    console.log('=== CHECK 8: Students without Profiles ===');
    const [noProfile] = await sequelize.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.createdAt
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.userId
      WHERE LOWER(u.role) = 'student' AND sp.id IS NULL
      ORDER BY u.createdAt DESC
      LIMIT 10
    `);
    
    if (noProfile.length === 0) {
      console.log('✅ All students have profiles\n');
    } else {
      console.log(`Found ${noProfile.length} students without profiles:\n`);
      noProfile.forEach((student, index) => {
        console.log(`${index + 1}. ID: ${student.id}, Name: ${student.name}, Email: ${student.email}`);
      });
      console.log('');
    }

    await sequelize.close();
    console.log('✅ Database connection closed.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStudents();

