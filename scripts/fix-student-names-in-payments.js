/**
 * Script to fix student names in Payment Transactions
 * This script ensures all payment transactions have proper student associations
 */

const { sequelize } = require('./config/database');
const db = require('./models');

async function fixStudentNamesInPayments() {
  try {
    console.log('Starting to fix student names in Payment Transactions...\n');

    // Get all payment transactions with their associated student data
    const payments = await db.PaymentTransaction.findAll({
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
      ],
    });

    console.log(`Found ${payments.length} total payment transactions\n`);

    let fixedCount = 0;
    let missingStudentCount = 0;
    const issues = [];

    for (const payment of payments) {
      if (!payment.student) {
        missingStudentCount++;
        issues.push({
          paymentId: payment.id,
          studentId: payment.studentId,
          issue: 'No student association found',
        });
        console.log(`❌ Payment ID ${payment.id}: No student association (studentId: ${payment.studentId})`);
      } else if (!payment.student.name) {
        issues.push({
          paymentId: payment.id,
          studentId: payment.studentId,
          studentEmail: payment.student.email,
          issue: 'Student has no name',
        });
        console.log(`⚠️  Payment ID ${payment.id}: Student ${payment.student.email} has no name`);
      } else {
        console.log(`✅ Payment ID ${payment.id}: Student "${payment.student.name}"`);
        fixedCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log(`Total Payments: ${payments.length}`);
    console.log(`With Student Data: ${fixedCount}`);
    console.log(`Missing Student Association: ${missingStudentCount}`);
    console.log('='.repeat(80));

    if (issues.length > 0) {
      console.log('\n📋 ISSUES FOUND:\n');
      console.table(issues);

      // Try to fix missing student associations
      console.log('\n🔧 Attempting to fix issues...\n');

      for (const issue of issues) {
        if (issue.studentId) {
          try {
            // Check if student exists
            const student = await db.User.findOne({
              where: { id: issue.studentId, role: 'STUDENT' },
              attributes: ['id', 'name', 'email'],
            });

            if (student) {
              console.log(`✅ Found student ${student.name} (${student.email}) for payment ${issue.paymentId}`);
              
              // Update payment to ensure association
              await payment.setStudent(student);
              await payment.save();
              
              console.log(`   Fixed association for payment ${issue.paymentId}`);
            } else {
              console.log(`❌ Student ID ${issue.studentId} does not exist in database`);
            }
          } catch (error) {
            console.error(`❌ Error fixing payment ${issue.paymentId}:`, error.message);
          }
        }
      }
    }

    // Verify fixes
    console.log('\n🔍 Verifying fixes...\n');
    const verifyPayments = await db.PaymentTransaction.findAll({
      where: { id: payments.map(p => p.id) },
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
      ],
    });

    let verifiedCount = 0;
    let stillMissingCount = 0;

    for (const payment of verifyPayments) {
      if (payment.student && payment.student.name) {
        verifiedCount++;
      } else {
        stillMissingCount++;
        console.log(`❌ Payment ID ${payment.id} still missing student name`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION:');
    console.log(`Fixed Successfully: ${verifiedCount}`);
    console.log(`Still Missing: ${stillMissingCount}`);
    console.log('='.repeat(80));

    if (stillMissingCount > 0) {
      console.log('\n⚠️  Some payments still have missing student associations.');
      console.log('These may need manual investigation.\n');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fixStudentNamesInPayments();
