const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'controllers', 'attendanceReport.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the payment calculation section
const oldCalc = `    // Calculate pending payments for each student
    const studentsWithPayments = students.map((student: any) => {
      // Use student.userId to match PaymentTransaction.studentId
      const studentPayments = paymentsByStudent[student.userId] || [];
      
      // Filter and calculate total paid
      const paidPayments = studentPayments.filter((p: any) => p.status === 'paid' || p.status === 'partial');
      const totalPaid = paidPayments.reduce((sum: number, p: any) => {
        // Use paidAmount if it exists and is > 0, otherwise use amount
        const amount = (p.paidAmount && p.paidAmount > 0) ? Number(p.paidAmount) : Number(p.amount || 0);
        return sum + amount;
      }, 0);`;

const newCalc = `    // Calculate pending payments for each student
    const studentsWithPayments = students.map((student: any) => {
      // Use student.userId to match PaymentTransaction.studentId
      const studentPayments = paymentsByStudent[student.userId] || [];
      
      // Calculate total amount (all payments)
      const totalAmount = studentPayments.reduce((sum: number, p: any) => {
        return sum + Number(p.amount || 0);
      }, 0);
      
      // Calculate total paid (only paid/partial status)
      const paidPayments = studentPayments.filter((p: any) => p.status === 'paid' || p.status === 'partial');
      const totalPaid = paidPayments.reduce((sum: number, p: any) => {
        const amount = (p.paidAmount && p.paidAmount > 0) ? Number(p.paidAmount) : Number(p.amount || 0);
        return sum + amount;
      }, 0);
      
      // Calculate unpaid/pending amount
      const unpaidAmount = totalAmount - totalPaid;`;

content = content.replace(oldCalc, newCalc);

// Now update the return object to include unpaidAmount
const oldReturn = `        totalAmount: totalPaid,
        totalPaid,`;

const newReturn = `        totalAmount,
        totalPaid,
        unpaidAmount,`;

content = content.replace(oldReturn, newReturn);

// Update summary to show unpaid amounts
const oldSummary = `    // Calculate summary statistics
    const totalStudents = studentsWithPayments.length;
    const totalPendingPayments = studentsWithPayments.filter(s => s.paymentCount > 0).length;
    const totalPendingAmount = studentsWithPayments.reduce((sum, s) => sum + (s.totalPaid || 0), 0);`;

const newSummary = `    // Calculate summary statistics
    const totalStudents = studentsWithPayments.length;
    const totalPendingPayments = studentsWithPayments.filter(s => s.unpaidAmount > 0).length;
    const totalPendingAmount = studentsWithPayments.reduce((sum, s) => sum + (s.unpaidAmount || 0), 0);
    const totalPaidAmount = studentsWithPayments.reduce((sum, s) => sum + (s.totalPaid || 0), 0);`;

content = content.replace(oldSummary, newSummary);

// Update the response to include totalPaidAmount in summary
const oldResponse = `        summary: {
          totalStudents,
          totalPendingPayments,
          totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
          overdue: {
            count: 0, // Can be calculated based on due dates if needed
          },
          upcoming: {
            count: 0, // Can be calculated based on due dates if needed
          },
        },`;

const newResponse = `        summary: {
          totalStudents,
          totalPendingPayments,
          totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
          totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
          overdue: {
            count: 0,
          },
          upcoming: {
            count: 0,
          },
        },`;

content = content.replace(oldResponse, newResponse);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Pending Payments report updated!');
console.log('Changes:');
console.log('1. Added totalAmount calculation (all payments)');
console.log('2. Added unpaidAmount calculation (totalAmount - totalPaid)');
console.log('3. Updated summary to show unpaid amounts');
console.log('4. Added totalPaidAmount to summary');
