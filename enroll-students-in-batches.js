const {Sequelize} = require('sequelize');
const config = require('./config/config.json');

async function enrollStudentsInBatches() {
  const sequelize = new Sequelize(config.development);
  
  try {
    console.log('\n=== Enrolling Students in Faculty Batches ===\n');
    
    // Get all active students
    const [students] = await sequelize.query(`
      SELECT u.id, u.name, u.email
      FROM users u
      INNER JOIN student_profiles sp ON u.id = sp.userId
      WHERE u.role = 'student' AND u.isActive = true
      LIMIT 20
    `);
    
    console.log(`Found ${students.length} active students\n`);
    
    if (students.length === 0) {
      console.log('No students found. Please create students first.');
      process.exit(0);
      return;
    }
    
    // Get faculty assignments
    const [assignments] = await sequelize.query(`
      SELECT 
        bfa.id,
        bfa.batchId,
        bfa.facultyId,
        b.title as batchTitle,
        u.name as facultyName
      FROM batch_faculty_assignments bfa
      INNER JOIN batches b ON bfa.batchId = b.id
      INNER JOIN users u ON bfa.facultyId = u.id
      WHERE b.status = 'active'
      ORDER BY b.title
    `);
    
    console.log(`Found ${assignments.length} active batch assignments\n`);
    
    if (assignments.length === 0) {
      console.log('No active batch assignments found.');
      process.exit(0);
      return;
    }
    
    // Enroll students in batches (distribute them)
    let enrollmentCount = 0;
    const studentIndex = 0;
    
    for (const assignment of assignments) {
      // Enroll 3-5 students per batch
      const studentsToEnroll = Math.min(3, students.length);
      
      for (let i = 0; i < studentsToEnroll; i++) {
        const student = students[(studentIndex + i) % students.length];
        
        // Check if already enrolled
        const [existing] = await sequelize.query(`
          SELECT id FROM enrollments 
          WHERE batchId = :batchId AND studentId = :studentId
        `, { 
          replacements: { 
            batchId: assignment.batchId, 
            studentId: student.id 
          } 
        });
        
        if (existing.length === 0) {
          // Enroll the student
          await sequelize.query(`
            INSERT INTO enrollments (studentId, batchId, enrollmentDate, status, createdAt, updatedAt)
            VALUES (:studentId, :batchId, NOW(), 'active', NOW(), NOW())
          `, {
            replacements: {
              studentId: student.id,
              batchId: assignment.batchId
            }
          });
          
          console.log(`✓ Enrolled ${student.name} in "${assignment.batchTitle}" (Faculty: ${assignment.facultyName})`);
          enrollmentCount++;
        }
      }
    }
    
    console.log(`\n=== Enrollment Complete ===`);
    console.log(`Total new enrollments: ${enrollmentCount}`);
    
    // Show summary by faculty
    console.log('\n--- Summary by Faculty ---\n');
    const [facultySummary] = await sequelize.query(`
      SELECT 
        u.name as facultyName,
        u.email as facultyEmail,
        COUNT(DISTINCT bfa.batchId) as totalBatches,
        COUNT(DISTINCT e.studentId) as totalStudents
      FROM batch_faculty_assignments bfa
      INNER JOIN users u ON bfa.facultyId = u.id
      LEFT JOIN enrollments e ON bfa.batchId = e.batchId
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name
    `);
    
    facultySummary.forEach(f => {
      console.log(`${f.facultyName} (${f.facultyEmail})`);
      console.log(`  Batches: ${f.totalBatches}, Students: ${f.totalStudents}\n`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

enrollStudentsInBatches();
