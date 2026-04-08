const {Sequelize} = require('sequelize');
const config = require('./config/config.json');

async function diagnoseFacultyBatches() {
  const sequelize = new Sequelize(config.development);
  
  try {
    console.log('\n=== Faculty Batch Assignment Diagnosis ===\n');
    
    // Get all faculty users
    const [faculties] = await sequelize.query(`
      SELECT id, name, email FROM users WHERE role = 'faculty' AND isActive = true LIMIT 5
    `);
    
    console.log(`Found ${faculties.length} active faculty members:\n`);
    
    for (const faculty of faculties) {
      console.log(`\n--- Faculty: ${faculty.name} (ID: ${faculty.id}, Email: ${faculty.email}) ---`);
      
      // Check batch assignments
      const [assignments] = await sequelize.query(`
        SELECT bfa.id, bfa.batchId, b.title as batchTitle, b.status as batchStatus
        FROM batch_faculty_assignments bfa
        LEFT JOIN batches b ON bfa.batchId = b.id
        WHERE bfa.facultyId = :facultyId
      `, { replacements: { facultyId: faculty.id } });
      
      console.log(`  Assignments: ${assignments.length}`);
      if (assignments.length > 0) {
        assignments.forEach(a => {
          console.log(`    - Batch ID ${a.batchId}: "${a.batchTitle}" (${a.batchStatus || 'status unknown'})`);
        });
        
        // Check enrollments for each batch
        for (const assignment of assignments) {
          const [enrollments] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM enrollments e
            INNER JOIN users u ON e.studentId = u.id
            WHERE e.batchId = :batchId AND u.role = 'student' AND u.isActive = true
          `, { replacements: { batchId: assignment.batchId } });
          
          console.log(`      Students enrolled: ${enrollments[0].count}`);
        }
      } else {
        console.log('  ⚠️  NO BATCH ASSIGNMENTS FOUND!');
      }
    }
    
    console.log('\n=== End Diagnosis ===\n');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

diagnoseFacultyBatches();
