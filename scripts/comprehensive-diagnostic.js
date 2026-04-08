/**
 * Comprehensive Diagnostic Script
 * Checks: Student names, Payment associations, Task creation
 */

const path = require('path');

// Smart path resolution - works from any directory
let backendRoot;

// Check if we're running from within backend/scripts or just scripts
if (process.cwd().endsWith('backend')) {
  // Running from backend directory
  backendRoot = process.cwd();
} else if (process.cwd().includes('Primeacademynew')) {
  // Running from root directory
  backendRoot = path.join(process.cwd(), 'backend');
} else {
  // Fallback: assume current directory is backend
  backendRoot = process.cwd();
}

console.log(`Using backend root: ${backendRoot}`);
console.log();

// Use dist folder for compiled JavaScript files
const sequelizeLib = require(path.join(backendRoot, 'dist', 'config', 'database'));
const db = require(path.join(backendRoot, 'dist', 'models', 'index')).default;
const { Op } = require('sequelize');

// Handle both default export and named export
const sequelize = sequelizeLib.default || sequelizeLib;

// Debug: Check what's in db object
console.log('Available models:', Object.keys(db).filter(k => !k.startsWith('__')));
console.log();

async function runDiagnostics() {
  try {
    console.log('='.repeat(80));
    console.log('🔍 COMPREHENSIVE SYSTEM DIAGNOSTIC');
    console.log('='.repeat(80));
    console.log();

    // ===== PART 1: Check Students in Users table =====
    console.log('📋 PART 1: STUDENT NAMES IN USERS TABLE');
    console.log('-'.repeat(80));
    
    const students = await db.User.findAll({
      where: { role: 'STUDENT' },
      attributes: ['id', 'name', 'email'],
      order: [['id', 'DESC']],
      limit: 10,
    });

    console.log('\nLast 10 students in Users table:\n');
    console.table(
      students.map(s => ({
        ID: s.id,
        Name: s.name || '(NULL)',
        Email: s.email,
        HasName: s.name ? '✅' : '❌'
      }))
    );

    const totalStudents = await db.User.count({ where: { role: 'STUDENT' } });
    const studentsWithoutNames = await db.User.count({
      where: {
        role: 'STUDENT',
        [Op.or]: [
          { name: null },
          { name: '' },
        ]
      }
    });

    console.log(`\nTotal Students: ${totalStudents}`);
    console.log(`Students without Names: ${studentsWithoutNames}`);
    console.log(`Percentage with names: ${((totalStudents - studentsWithoutNames) / totalStudents * 100).toFixed(2)}%`);

    // ===== PART 2: Check StudentProfiles =====
    console.log('\n\n📋 PART 2: STUDENT PROFILES');
    console.log('-'.repeat(80));

    const studentProfiles = await db.StudentProfile.findAll({
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
        required: false,
      }],
      order: [['id', 'DESC']],
      limit: 10,
    });

    console.log('\nLast 10 StudentProfiles:\n');
    console.table(
      studentProfiles.map(sp => ({
        ProfileID: sp.id,
        UserID: sp.userId,
        StudentName: sp.user?.name || '(NULL)',
        StudentEmail: sp.user?.email || '(NULL)',
        SerialNo: sp.serialNo || '-',
        Status: sp.status || '-'
      }))
    );

    const totalProfiles = await db.StudentProfile.count();
    console.log(`\nTotal StudentProfiles: ${totalProfiles}`);

    // ===== PART 3: Check Payment Transactions =====
    console.log('\n\n📋 PART 3: PAYMENT TRANSACTIONS');
    console.log('-'.repeat(80));

    const payments = await db.PaymentTransaction.findAll({
      include: [{
        model: db.User,
        as: 'student',
        attributes: ['id', 'name', 'email'],
        required: false,
      }],
      order: [['id', 'DESC']],
      limit: 10,
    });

    console.log('\nLast 10 payments:\n');
    console.table(
      payments.map(p => ({
        PaymentID: p.id,
        StudentID: p.studentId,
        StudentName: p.student?.name || '(MISSING)',
        StudentEmail: p.student?.email || '(MISSING)',
        Amount: `₹${p.amount}`,
        Status: p.status,
        HasStudent: p.student ? '✅' : '❌'
      }))
    );

    const totalPayments = await db.PaymentTransaction.count();
    const paymentsWithStudents = await db.PaymentTransaction.count({
      include: [{
        model: db.User,
        as: 'student',
        required: true,
      }]
    });

    console.log(`\nTotal Payments: ${totalPayments}`);
    console.log(`Payments with Student Data: ${paymentsWithStudents}`);
    console.log(`Success Rate: ${(paymentsWithStudents / totalPayments * 100).toFixed(2)}%`);

    // ===== PART 4: Check Tasks =====
    console.log('\n\n📋 PART 4: TASKS SYSTEM');
    console.log('-'.repeat(80));

    let tasks = [];
    let totalTasks = 0;
    
    try {
      if (db.Task) {
        tasks = await db.Task.findAll({
          include: [
            {
              model: db.User,
              as: 'faculty',
              attributes: ['id', 'name', 'email'],
              required: false,
            },
            {
              model: db.TaskStudent,
              as: 'taskStudents',
              include: [{
                model: db.User,
                as: 'student',
                attributes: ['id', 'name', 'email'],
                required: false,
              }],
              required: false,
            }
          ],
          order: [['id', 'DESC']],
          limit: 5,
        });
        
        totalTasks = await db.Task.count();
      } else {
        console.log('⚠️  Task model not found in db object');
      }
    } catch (taskError) {
      console.log('⚠️  Could not fetch tasks:', taskError.message);
      console.log('Task model might not be available or associations missing');
    }

    console.log('\nLast 5 tasks:\n');
    console.table(
      tasks.map(t => ({
        TaskID: t.id,
        Subject: t.subject,
        Faculty: t.faculty?.name || '(Unknown)',
        Date: t.date,
        StartTime: t.startTime || '-',
        EndTime: t.endTime || '-',
        WorkingHours: t.workingHours ? `${t.workingHours}m` : '-',
        StudentsCount: t.taskStudents?.length || 0,
        Status: t.status
      }))
    );

    const totalTasksCount = typeof totalTasks === 'number' ? totalTasks : 'N/A';
    console.log(`\nTotal Tasks: ${totalTasksCount}`);

    // ===== SUMMARY & RECOMMENDATIONS =====
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(80));

    const issues = [];

    if (studentsWithoutNames > 0) {
      issues.push({
        Issue: 'Students without names',
        Count: studentsWithoutNames,
        Impact: 'Payment display shows "Student ID" instead of names',
        Solution: 'Run: node backend\\scripts\\fix-student-names-quick.js'
      });
    }

    if (totalPayments > paymentsWithStudents) {
      issues.push({
        Issue: 'Payments missing student associations',
        Count: totalPayments - paymentsWithStudents,
        Impact: 'Some payments show no student data',
        Solution: 'Check foreign key constraints in database'
      });
    }

    if (issues.length === 0) {
      console.log('\n✅ No critical issues found!\n');
    } else {
      console.log('\n⚠️  ISSUES FOUND:\n');
      console.table(issues);
      
      console.log('\n🔧 RECOMMENDED FIXES:\n');
      console.log('1. For student names:');
      console.log('   node backend\\scripts\\fix-student-names-quick.js\n');
      console.log('2. For payment associations:');
      console.log('   node backend\\scripts\\fix-student-names-in-payments.js\n');
      console.log('3. Restart backend after fixes:');
      console.log('   cd backend && npm start\n');
    }

    console.log('='.repeat(80));

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runDiagnostics();
