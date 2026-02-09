const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'primeacademy_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false, // Disable SQL logging for cleaner output
  }
);

async function checkDocumentsField() {
  try {
    console.log('Connecting to database...\n');
    await sequelize.authenticate();
    
    // Get the most recent student
    const [users] = await sequelize.query(`
      SELECT id, name, email 
      FROM users 
      WHERE role = 'student' 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);
    
    if (users.length === 0) {
      console.log('❌ No students found in database');
      return;
    }
    
    const userId = users[0].id;
    console.log(`✅ Checking student: ${users[0].name} (ID: ${userId})`);
    console.log(`   Email: ${users[0].email}\n`);
    
    // Get the student profile with documents
    const [profiles] = await sequelize.query(`
      SELECT id, userId, dob, address, photoUrl, softwareList, enrollmentDate, status, documents
      FROM student_profiles 
      WHERE userId = ?
    `, {
      replacements: [userId]
    });
    
    if (profiles.length === 0) {
      console.log('❌ NO student profile found!');
      console.log('   This means the student profile was not created during registration.');
      return;
    }
    
    const profile = profiles[0];
    console.log('✅ Student Profile Found:');
    console.log('   Profile ID:', profile.id);
    console.log('   DOB:', profile.dob);
    console.log('   Address:', profile.address);
    console.log('   Software List:', profile.softwareList);
    console.log('   Enrollment Date:', profile.enrollmentDate);
    console.log('   Status:', profile.status);
    console.log('\n=== DOCUMENTS FIELD (FULL JSON) ===');
    console.log(JSON.stringify(profile.documents, null, 2));
    
    // Check if enrollmentMetadata exists
    if (profile.documents) {
      const docs = typeof profile.documents === 'string' ? JSON.parse(profile.documents) : profile.documents;
      
      if (docs.enrollmentMetadata) {
        console.log('\n✅ enrollmentMetadata FOUND inside documents');
        console.log('   Contains these fields:');
        Object.keys(docs.enrollmentMetadata).forEach(key => {
          console.log(`   - ${key}: ${docs.enrollmentMetadata[key]}`);
        });
      } else {
        console.log('\n❌ enrollmentMetadata NOT FOUND inside documents!');
        console.log('   This is the problem - the frontend expects documents.enrollmentMetadata');
      }
    } else {
      console.log('\n❌ documents field is NULL or empty!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkDocumentsField();
