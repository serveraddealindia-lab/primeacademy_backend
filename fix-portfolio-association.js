const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'controllers', 'attendanceReport.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix Portfolio query - change from StudentProfile to User
const oldQuery = `    // Get all portfolios with student and user info
    const portfolios = await db.Portfolio.findAll({
      include: [
        {
          model: db.StudentProfile,
          as: 'student',
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone'],
            },
          ],
        },
      ],
    });`;

const newQuery = `    // Get all portfolios with student and user info
    const portfolios = await db.Portfolio.findAll({
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
    });`;

content = content.replace(oldQuery, newQuery);

// Also need to update the mapping since student is now User directly
const oldMapping = `    const studentsWithPortfolio = portfolios.map((portfolio: any) => {
      const student = portfolio.student;
      const user = student?.user;
      
      // Get batch name from student's currentBatches
      const batchName = (student?.currentBatches && Array.isArray(student.currentBatches) && student.currentBatches.length > 0)
        ? student.currentBatches.join(', ')
        : 'No Batch';
      
      return {
        id: portfolio.id,
        student: {
          name: user?.name || 'Unknown',
        },
        batch: {
          title: batchName,
        },`;

const newMapping = `    const studentsWithPortfolio = portfolios.map((portfolio: any) => {
      const user = portfolio.student;
      
      return {
        id: portfolio.id,
        student: {
          name: user?.name || 'Unknown',
        },
        batch: {
          title: 'N/A',
        },`;

content = content.replace(oldMapping, newMapping);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Portfolio Status report fixed!');
console.log('Changes:');
console.log('1. Changed include from StudentProfile to User (correct association)');
console.log('2. Updated mapping to use user directly (portfolio.student is User)');
console.log('3. Removed batch name logic (User model does not have currentBatches)');
