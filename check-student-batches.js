const {Sequelize} = require('sequelize');
const config = require('./config/config.json');

async function checkStudentProfiles() {
  const sequelize = new Sequelize(config.development);
  
  try {
    console.log('\n=== Checking Student Profiles ===\n');
    
    // Get student profiles with currentBatches
    const [profiles] = await sequelize.query(`
      SELECT sp.id, sp.userId, u.name, u.email, sp.currentBatches, sp.finishedBatches
      FROM student_profiles sp
      INNER JOIN users u ON sp.userId = u.id
      WHERE u.isActive = true
      LIMIT 10
    `);
    
    console.log(`Found ${profiles.length} student profiles:\n`);
    
    for (const profile of profiles) {
      console.log(`Student: ${profile.name} (ID: ${profile.userId})`);
      console.log(`  Current Batches: ${profile.currentBatches || 'none'}`);
      console.log(`  Finished Batches: ${profile.finishedBatches || 'none'}\n`);
    }
    
    // Check if any students have batch 232 (the one with enrollments)
    console.log('\n--- Students in Batch 232 (Ar Max) ---');
    const [batch232Students] = await sequelize.query(`
      SELECT u.id, u.name, u.email
      FROM enrollments e
      INNER JOIN users u ON e.studentId = u.id
      WHERE e.batchId = 232 AND u.role = 'student' AND u.isActive = true
    `);
    
    console.log(`Found ${batch232Students.length} students:`);
    batch232Students.forEach(s => {
      console.log(`  - ${s.name} (${s.email})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkStudentProfiles();
