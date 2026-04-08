const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'controllers', 'attendanceReport.controller.ts');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find line 1770-1785 (0-indexed: 1769-1784) and replace
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Get all portfolios with student and user info')) {
    startLine = i;
  }
  if (startLine !== -1 && lines[i].includes('});') && i > startLine && i < startLine + 20) {
    endLine = i;
    break;
  }
}

if (startLine !== -1 && endLine !== -1) {
  console.log(`Found portfolio query at lines ${startLine + 1}-${endLine + 1}`);
  
  // Replace the query
  const newQuery = [
    '    // Get all portfolios with student and user info',
    '    const portfolios = await db.Portfolio.findAll({',
    '      include: [',
    '        {',
    '          model: db.User,',
    '          as: \'student\',',
    '          attributes: [\'id\', \'name\', \'email\', \'phone\'],',
    '        },',
    '      ],',
    '    });'
  ];
  
  lines.splice(startLine, endLine - startLine + 1, ...newQuery);
  console.log('✅ Fixed portfolio query');
}

// Now fix the mapping - find "const studentsWithPortfolio = portfolios.map"
let mapStart = -1;
let mapEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const studentsWithPortfolio = portfolios.map')) {
    mapStart = i;
  }
  if (mapStart !== -1 && lines[i].trim() === '});' && i > mapStart && i < mapStart + 25) {
    mapEnd = i;
    break;
  }
}

if (mapStart !== -1 && mapEnd !== -1) {
  console.log(`Found portfolio mapping at lines ${mapStart + 1}-${mapEnd + 1}`);
  
  const newMapping = [
    '    const studentsWithPortfolio = portfolios.map((portfolio: any) => {',
    '      const user = portfolio.student;',
    '      ',
    '      return {',
    '        id: portfolio.id,',
    '        student: {',
    '          name: user?.name || \'Unknown\',',
    '        },',
    '        batch: {',
    '          title: \'N/A\',',
    '        },',
    '        status: portfolio.status,',
    '        filesCount: [portfolio.pdfUrl, portfolio.youtubeUrl].filter(Boolean).length,',
    '        hasPortfolio: !!portfolio.pdfUrl,',
    '        hasYoutube: !!portfolio.youtubeUrl,',
    '      };',
    '    });'
  ];
  
  lines.splice(mapStart, mapEnd - mapStart + 1, ...newMapping);
  console.log('✅ Fixed portfolio mapping');
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('\n✅ Portfolio Status report completely fixed!');
