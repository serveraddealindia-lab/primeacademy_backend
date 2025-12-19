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

async function viewAllStudentData() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.\n');

    // Main student information with all related data
    console.log('=== MAIN STUDENT INFORMATION ===');
    const [mainStudentData] = await sequelize.query(`
      SELECT 
        u.id AS user_id,
        u.name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone,
        u.isActive AS is_active,
        u.createdAt AS user_created_at,
        sp.id AS profile_id,
        sp.dob AS date_of_birth,
        sp.address AS student_address,
        sp.enrollmentDate AS enrollment_date,
        sp.status AS profile_status,
        sp.documents AS profile_documents,
        sp.softwareList AS software_list,
        sp.finishedBatches AS finished_batches,
        sp.currentBatches AS current_batches,
        sp.pendingBatches AS pending_batches
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.userId
      WHERE u.role = 'student'
      ORDER BY u.createdAt DESC
      LIMIT 20
    `);
    
    mainStudentData.forEach(student => {
      console.log(`ID: ${student.user_id}, Name: ${student.student_name}, Phone: ${student.student_phone}, Email: ${student.student_email}`);
      console.log(`  Status: ${student.is_active ? 'Active' : 'Inactive'}, Created: ${student.user_created_at}`);
      if (student.profile_id) {
        console.log(`  Profile ID: ${student.profile_id}, DOB: ${student.date_of_birth}, Status: ${student.profile_status}`);
      }
      console.log('');
    });
    
    console.log(`Total students found: ${mainStudentData.length}\n`);

    // Student software progress information
    console.log('=== STUDENT SOFTWARE PROGRESS ===');
    const [softwareProgressData] = await sequelize.query(`
      SELECT 
        ssp.id AS progress_id,
        u.name AS student_name,
        u.phone AS student_phone,
        ssp.softwareName AS software_name,
        ssp.softwareCode AS software_code,
        ssp.status AS progress_status,
        ssp.enrollmentDate AS enrollment_date,
        ssp.courseName AS course_name,
        ssp.courseType AS course_type,
        ssp.studentStatus AS student_status,
        ssp.batchTiming AS batch_timing,
        ssp.createdAt AS progress_created_at
      FROM student_software_progress ssp
      JOIN users u ON ssp.studentId = u.id
      WHERE u.role = 'student'
      ORDER BY u.name, ssp.softwareName
      LIMIT 20
    `);
    
    softwareProgressData.forEach(progress => {
      console.log(`Student: ${progress.student_name}`);
      console.log(`  Software: ${progress.software_name} (${progress.software_code}), Status: ${progress.progress_status}`);
      console.log(`  Course: ${progress.course_name}, Type: ${progress.course_type}`);
      console.log('');
    });
    
    console.log(`Total software progress records: ${softwareProgressData.length}\n`);

    // Student enrollment information
    console.log('=== STUDENT ENROLLMENTS ===');
    const [enrollmentData] = await sequelize.query(`
      SELECT 
        e.id AS enrollment_id,
        u.name AS student_name,
        u.phone AS student_phone,
        b.title AS batch_title,
        e.enrollmentDate AS enrollment_date,
        e.status AS enrollment_status,
        e.paymentPlan AS payment_plan,
        e.createdAt AS enrollment_created_at
      FROM enrollments e
      JOIN users u ON e.studentId = u.id
      JOIN batches b ON e.batchId = b.id
      WHERE u.role = 'student'
      ORDER BY u.name, e.enrollmentDate
      LIMIT 20
    `);
    
    enrollmentData.forEach(enrollment => {
      console.log(`Student: ${enrollment.student_name}`);
      console.log(`  Batch: ${enrollment.batch_title}, Status: ${enrollment.enrollment_status}`);
      console.log(`  Enrollment Date: ${enrollment.enrollment_date}`);
      if (enrollment.payment_plan) {
        console.log(`  Payment Plan: ${enrollment.payment_plan.substring(0, 50)}...`);
      }
      console.log('');
    });
    
    console.log(`Total enrollments: ${enrollmentData.length}\n`);

    // Students with placeholder names (those starting with "Student_")
    console.log('=== STUDENTS WITH PLACEHOLDER NAMES ===');
    const [placeholderNames] = await sequelize.query(`
      SELECT 
        u.id AS user_id,
        u.name AS student_name,
        u.phone AS student_phone,
        u.createdAt AS created_at
      FROM users u
      WHERE u.role = 'student' 
      AND u.name LIKE 'Student_%'
      ORDER BY u.createdAt DESC
    `);
    
    placeholderNames.forEach(student => {
      console.log(`ID: ${student.user_id}, Name: ${student.student_name}, Phone: ${student.student_phone}`);
    });
    
    console.log(`Total students with placeholder names: ${placeholderNames.length}\n`);

    // Count of students by status
    console.log('=== STUDENT COUNT BY STATUS ===');
    const [statusCounts] = await sequelize.query(`
      SELECT 
        sp.status AS profile_status,
        COUNT(*) AS student_count
      FROM student_profiles sp
      GROUP BY sp.status
      ORDER BY student_count DESC
    `);
    
    statusCounts.forEach(status => {
      console.log(`${status.profile_status}: ${status.student_count} students`);
    });
    
    console.log('');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

viewAllStudentData();