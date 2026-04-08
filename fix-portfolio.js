const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'controllers', 'attendanceReport.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix Portfolio Status report to include batch information
const oldPortfolio = `    const studentsWithPortfolio = portfolios.map((portfolio: any) => {
      const student = portfolio.student;
      const user = student?.user;
      
      return {
        id: portfolio.id,
        student: {
          name: user?.name || 'Unknown',
        },
        batch: {
          title: 'N/A', // Batch info would need to be fetched separately
        },
        status: portfolio.status,
        filesCount: [portfolio.pdfUrl, portfolio.youtubeUrl].filter(Boolean).length,
        hasPortfolio: !!portfolio.pdfUrl,
        hasYoutube: !!portfolio.youtubeUrl,
      };
    });`;

const newPortfolio = `    const studentsWithPortfolio = portfolios.map((portfolio: any) => {
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
        },
        status: portfolio.status,
        filesCount: [portfolio.pdfUrl, portfolio.youtubeUrl].filter(Boolean).length,
        hasPortfolio: !!portfolio.pdfUrl,
        hasYoutube: !!portfolio.youtubeUrl,
      };
    });`;

content = content.replace(oldPortfolio, newPortfolio);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Portfolio Status report updated successfully!');
console.log('Changes made:');
console.log('1. Added batch name extraction from student.currentBatches');
console.log('2. Added Array.isArray() safety check');
console.log('3. Batch info now shows actual batch names instead of N/A');
