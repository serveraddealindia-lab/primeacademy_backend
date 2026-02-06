const fs = require('fs');

// Read the file
const content = fs.readFileSync('frontend/src/pages/BatchCreate.tsx', 'utf8');

// Remove the course selection section using a simpler approach
const updatedContent = content.replace(
  /<div className="md:col-span-2">\s*<label[^>]*>Course \(Optional\)[\s\S]*?<\/div>\s*(?=<div className="md:col-span-2">\s*<label[^>]*>Software)/,
  ''
);

// Write the updated content back to the file
fs.writeFileSync('frontend/src/pages/BatchCreate.tsx', updatedContent);

console.log('Course selection section removed successfully');