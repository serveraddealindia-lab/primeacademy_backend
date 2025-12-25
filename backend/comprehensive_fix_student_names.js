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

async function comprehensiveFixStudentNames() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Find all students with names starting with "Student_" and containing long numeric strings
    console.log('\n=== Finding students with placeholder names ===');
    const [studentsWithPlaceholderNames] = await sequelize.query(`
      SELECT 
        u.id,
        u.name,
        u.phone,
        sp.documents
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.userId
      WHERE u.role = 'student' 
      AND u.name LIKE 'Student\\_%'
      AND CHAR_LENGTH(u.name) > 20
    `);
    
    console.log(`Found ${studentsWithPlaceholderNames.length} students with placeholder names`);
    
    let fixedCount = 0;
    
    for (const student of studentsWithPlaceholderNames) {
      console.log(`\nProcessing student ID ${student.id} with name "${student.name}"...`);
      
      // Extract phone number from the placeholder name
      const phoneNumberMatch = student.name.match(/Student_(\\d+)/);
      const phoneNumber = phoneNumberMatch ? phoneNumberMatch[1] : student.phone;
      
      if (!phoneNumber) {
        console.log(`  No phone number found for student ID ${student.id}`);
        continue;
      }
      
      console.log(`  Checking phone number: ${phoneNumber}`);
      
      // Strategy 1: Look for any other user record with this phone number that has a proper name
      console.log(`  Strategy 1: Searching for other users with phone ${phoneNumber}...`);
      const [otherUsersWithSamePhone] = await sequelize.query(`
        SELECT 
          id,
          name,
          phone,
          role
        FROM users 
        WHERE (phone LIKE '%${phoneNumber}%' OR phone LIKE '%${phoneNumber.substring(-10)}%')
        AND id != ${student.id}
        AND name IS NOT NULL
        AND name != ''
        AND name NOT LIKE 'Student\\_%'
        AND CHAR_LENGTH(name) > 3
        LIMIT 1
      `);
      
      if (otherUsersWithSamePhone.length > 0) {
        const properUser = otherUsersWithSamePhone[0];
        console.log(`    Found proper name "${properUser.name}" from user ID ${properUser.id} with role ${properUser.role}`);
        
        // Update the student name
        await sequelize.query(`
          UPDATE users 
          SET name = '${properUser.name.replace(/'/g, "\\'")}'
          WHERE id = ${student.id}
        `);
        
        console.log(`    Updated student ID ${student.id} name from "${student.name}" to "${properUser.name}"`);
        fixedCount++;
        continue;
      }
      
      // Strategy 2: Check if student profile documents contain a name
      if (student.documents) {
        console.log(`  Strategy 2: Checking student profile documents...`);
        try {
          const documents = typeof student.documents === 'string' 
            ? JSON.parse(student.documents) 
            : student.documents;
          
          let properName = null;
          
          // Look for name in documents
          if (documents.studentName && documents.studentName !== 'undefined') {
            properName = documents.studentName;
          } else if (documents.name && documents.name !== 'undefined') {
            properName = documents.name;
          } else if (documents.fullName && documents.fullName !== 'undefined') {
            properName = documents.fullName;
          } else if (documents.enrollmentMetadata) {
            const meta = documents.enrollmentMetadata;
            if (meta.studentName && meta.studentName !== 'undefined') {
              properName = meta.studentName;
            } else if (meta.name && meta.name !== 'undefined') {
              properName = meta.name;
            } else if (meta.fullName && meta.fullName !== 'undefined') {
              properName = meta.fullName;
            }
          }
          
          if (properName && properName !== 'undefined' && properName.length > 2) {
            console.log(`    Found proper name "${properName}" in documents`);
            
            // Update the student name
            await sequelize.query(`
              UPDATE users 
              SET name = '${properName.replace(/'/g, "\\'")}'
              WHERE id = ${student.id}
            `);
            
            console.log(`    Updated student ID ${student.id} name from "${student.name}" to "${properName}"`);
            fixedCount++;
            continue;
          } else {
            console.log(`    No valid name found in documents`);
          }
        } catch (parseError) {
          console.log(`    Error parsing documents: ${parseError.message}`);
        }
      }
      
      // Strategy 3: Check enrollment records for student name
      console.log(`  Strategy 3: Checking enrollment records...`);
      const [enrollmentRecords] = await sequelize.query(`
        SELECT 
          id,
          paymentPlan
        FROM enrollments 
        WHERE studentId = ${student.id}
        AND paymentPlan IS NOT NULL
        LIMIT 1
      `);
      
      if (enrollmentRecords.length > 0) {
        try {
          const enrollment = enrollmentRecords[0];
          const paymentPlan = typeof enrollment.paymentPlan === 'string' 
            ? JSON.parse(enrollment.paymentPlan) 
            : enrollment.paymentPlan;
          
          if (paymentPlan.studentName && paymentPlan.studentName !== 'undefined' && paymentPlan.studentName.length > 2) {
            console.log(`    Found proper name "${paymentPlan.studentName}" in enrollment payment plan`);
            
            // Update the student name
            await sequelize.query(`
              UPDATE users 
              SET name = '${paymentPlan.studentName.replace(/'/g, "\\'")}'
              WHERE id = ${student.id}
            `);
            
            console.log(`    Updated student ID ${student.id} name from "${student.name}" to "${paymentPlan.studentName}"`);
            fixedCount++;
            continue;
          }
        } catch (parseError) {
          console.log(`    Error parsing enrollment payment plan: ${parseError.message}`);
        }
      }
      
      console.log(`  No proper name found for student ID ${student.id}`);
    }
    
    console.log(`\n=== Fixed ${fixedCount} student names ===`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

comprehensiveFixStudentNames();