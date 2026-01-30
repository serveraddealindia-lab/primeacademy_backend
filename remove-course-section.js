const fs = require('fs');

const filePath = 'frontend/src/pages/BatchCreate.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the lines to remove
const lines = content.split('\n');
const startIndex = lines.findIndex(line => line.includes('<div className="md:col-span-2">') && line.includes('Course (Optional)'));
const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes('</div>') && lines[index + 1] && lines[index + 1].includes('<div className="md:col-span-2">') && lines[index + 1].includes('Software'));

if (startIndex !== -1 && endIndex !== -1) {
    // Remove the course selection section
    lines.splice(startIndex, endIndex - startIndex + 1);
    
    const updatedContent = lines.join('\n');
    fs.writeFileSync(filePath, updatedContent);
    console.log('Course selection UI section removed successfully');
} else {
    console.log('Could not find course selection section to remove');
}