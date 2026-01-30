const fs = require('fs');

const filePath = 'frontend/src/pages/BatchCreate.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the course selection section
content = content.replace(/\s*<div className="md:col-span-2">\s*<label[^>]*>Course \(Optional\)<\/label>[\s\S]*?<\/div>\s*(?=\s*<div className="md:col-span-2">\s*<label[^>]*>Software<\/label>)/, '');

fs.writeFileSync(filePath, content);
console.log('Course selection UI section removed successfully');