const path = require('path');

// Smart path resolution
let backendRoot;
if (process.cwd().endsWith('backend')) {
  backendRoot = process.cwd();
} else if (process.cwd().includes('Primeacademynew')) {
  backendRoot = path.join(process.cwd(), 'backend');
} else {
  backendRoot = process.cwd();
}

const db = require(path.join(backendRoot, 'dist', 'models', 'index')).default;
const { Op } = require('sequelize');

async function checkPayments() {
  try {
    console.log('Checking payment data...\n');

    // Get a sample student (Jyoti Kotad or similar)
    const students = await db.StudentProfile.findAll({
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          where: {
            name: { [Op.like]: '%jyoti%' }
          }
        },
      ],
    });

    console.log('Found students:', students.length);
    
    for (const student of students) {
      console.log('\n=== Student Info ===');
      console.log('Student ID:', student.id);
      console.log('User ID:', student.userId);
      console.log('Student Name:', student.user?.name);
      console.log('Email:', student.user?.email);

      // Get all payments for this student
      const payments = await db.PaymentTransaction.findAll({
        where: { studentId: student.userId },
      });

      console.log('\nPayments found:', payments.length);
      
      let totalAmount = 0;
      let totalPaid = 0;

      for (const payment of payments) {
        console.log('\nPayment ID:', payment.id);
        console.log('  Amount:', payment.amount);
        console.log('  Paid Amount:', payment.paidAmount);
        console.log('  Status:', payment.status);
        console.log('  Due Date:', payment.dueDate);

        totalAmount += Number(payment.amount || 0);
        
        if (payment.status === 'paid' || payment.status === 'partial') {
          const paidAmt = (payment.paidAmount && payment.paidAmount > 0) 
            ? Number(payment.paidAmount) 
            : Number(payment.amount || 0);
          totalPaid += paidAmt;
        }
      }

      const unpaidAmount = totalAmount - totalPaid;

      // Parse documents to get totalDeal
      let totalFees = 0;
      try {
        if (student.documents && typeof student.documents === 'string') {
          const docs = JSON.parse(student.documents);
          totalFees = Number(docs.enrollmentMetadata?.totalDeal || 0);
        } else if (student.documents && typeof student.documents === 'object') {
          totalFees = Number(student.documents.enrollmentMetadata?.totalDeal || 0);
        }
      } catch (e) {
        totalFees = 0;
      }

      if (totalFees === 0) {
        totalFees = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      }

      console.log('\n=== Calculations (NEW) ===');
      console.log('Total Fees (from totalDeal):', totalFees);
      console.log('Total Paid:', totalPaid);
      console.log('Unpaid Amount:', totalFees - totalPaid);
    }

    // Also check all payments to see status distribution
    const allPayments = await db.PaymentTransaction.findAll({
      attributes: ['id', 'studentId', 'amount', 'paidAmount', 'status'],
      limit: 10,
    });

    console.log('\n\n=== Sample All Payments ===');
    for (const p of allPayments) {
      console.log(`Payment ${p.id}: studentId=${p.studentId}, amount=${p.amount}, paidAmount=${p.paidAmount}, status=${p.status}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPayments();
