const { Sequelize, Op } = require('sequelize');
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

async function fixStudentNames() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Find all students with names starting with "Student_" and containing long numeric strings
    console.log('\n=== Finding students with placeholder names ===');
    const [studentsWithPlaceholderNames] = await sequelize.query(`
      SELECT 
        id,
        name,
        phone
      FROM users 
      WHERE role = 'student' 
      AND name LIKE 'Student\\_%'
      AND CHAR_LENGTH(name) > 20
    `);
    
    console.log(`Found ${studentsWithPlaceholderNames.length} students with placeholder names`);
    
    let fixedCount = 0;
    
    for (const student of studentsWithPlaceholderNames) {
      // Extract phone number from the placeholder name
      const phoneNumberMatch = student.name.match(/Student_(\\d+)/);
      if (!phoneNumberMatch) continue;
      
      const phoneNumber = phoneNumberMatch[1];
      console.log(`\nChecking student ID ${student.id} with phone ${phoneNumber}...`);
      
      // Look for any other user record with this phone number that has a proper name
      const [otherUsersWithSamePhone] = await sequelize.query(`
        SELECT 
          id,
          name,
          phone,
          role
        FROM users 
        WHERE phone LIKE '%${phoneNumber}%'
        AND id != ${student.id}
        AND name IS NOT NULL
        AND name != ''
        AND name NOT LIKE 'Student\\_%'
        LIMIT 1
      `);
      
      if (otherUsersWithSamePhone.length > 0) {
        const properUser = otherUsersWithSamePhone[0];
        console.log(`  Found proper name "${properUser.name}" from user ID ${properUser.id} with role ${properUser.role}`);
        
        // Update the student name
        await sequelize.query(`
          UPDATE users 
          SET name = '${properUser.name}'
          WHERE id = ${student.id}
        `);
        
        console.log(`  Updated student ID ${student.id} name from "${student.name}" to "${properUser.name}"`);
        fixedCount++;
      } else {
        console.log(`  No proper name found for phone ${phoneNumber}`);
      }
    }
    
    console.log(`\n=== Fixed ${fixedCount} student names ===`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixStudentNames();