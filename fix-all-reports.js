const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'controllers', 'attendanceReport.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find and replace lines 1705-1709 (0-indexed: 1704-1708)
// Looking for the batchName line with softwareList
let foundIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('batchName:') && lines[i].includes('student.currentBatches') && i + 4 < lines.length) {
    if (lines[i+2] && lines[i+2].includes('softwareList')) {
      foundIndex = i;
      break;
    }
  }
}

if (foundIndex !== -1) {
  console.log(`Found problematic batchName at line ${foundIndex + 1}`);
  
  // Replace the 5 lines (batchName through 'No Batch'),)
  lines.splice(foundIndex, 5, 
    '        batchName: (student.currentBatches && Array.isArray(student.currentBatches) && student.currentBatches.length > 0)',
    '          ? student.currentBatches.join(\', \')',
    '          : \'No Batch\','
  );
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('✅ Fixed batchName - removed softwareList.join()');
} else {
  console.log('❌ Could not find the problematic batchName code');
}

// Now fix portfolio - find and add batchName extraction
let portfolioIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const studentsWithPortfolio = portfolios.map")) {
    portfolioIndex = i;
    break;
  }
}

if (portfolioIndex !== -1) {
  console.log(`Found portfolio map at line ${portfolioIndex + 1}`);
  
  // Find the line with "const user = student?.user;"
  let userLineIndex = -1;
  for (let i = portfolioIndex; i < portfolioIndex + 10; i++) {
    if (lines[i].includes('const user = student?.user;')) {
      userLineIndex = i;
      break;
    }
  }
  
  if (userLineIndex !== -1 && !lines[userLineIndex + 1].includes('Get batch name')) {
    // Insert batch name extraction after user line
    lines.splice(userLineIndex + 1, 0,
      '      ',
      '      // Get batch name from student\'s currentBatches',
      '      const batchName = (student?.currentBatches && Array.isArray(student.currentBatches) && student.currentBatches.length > 0)',
      '        ? student.currentBatches.join(\', \')',
      '        : \'No Batch\';'
    );
    
    // Now find and replace the 'N/A' line
    for (let i = userLineIndex; i < userLineIndex + 15; i++) {
      if (lines[i].includes("title: 'N/A'")) {
        lines[i] = '          title: batchName,';
        console.log(`Fixed portfolio batch title at line ${i + 1}`);
        break;
      }
    }
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('✅ Fixed Portfolio Status - added batch name extraction');
  } else {
    console.log('Portfolio already fixed or user line not found');
  }
} else {
  console.log('❌ Could not find portfolio map code');
}

console.log('\n✅ All fixes applied!');
