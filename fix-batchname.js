const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'controllers', 'attendanceReport.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the problematic batchName logic
const oldBatchName = `batchName: student.currentBatches && student.currentBatches.length > 0
          ? student.currentBatches.join(', ') 
          : (student.softwareList && student.softwareList.length > 0 
            ? student.softwareList.join(', ') 
            : 'No Batch'),`;

const newBatchName = `batchName: (student.currentBatches && Array.isArray(student.currentBatches) && student.currentBatches.length > 0) 
          ? student.currentBatches.join(', ') 
          : 'No Batch',`;

content = content.replace(oldBatchName, newBatchName);

// Also fix batchCount
const oldBatchCount = `batchCount: student.currentBatches ? student.currentBatches.length : 0,`;
const newBatchCount = `batchCount: (student.currentBatches && Array.isArray(student.currentBatches)) ? student.currentBatches.length : 0,`;

content = content.replace(oldBatchCount, newBatchCount);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File updated successfully!');
console.log('Changes made:');
console.log('1. Added Array.isArray() check for student.currentBatches in batchName');
console.log('2. Removed problematic student.softwareList.join() call');
console.log('3. Added Array.isArray() check for student.currentBatches in batchCount');
