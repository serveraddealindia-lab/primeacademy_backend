const dotenv = require('dotenv');
dotenv.config();
const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });

  // Check ALL tables for any that have a studentId or userId + batchId combo
  const [tables] = await conn.execute('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  
  for (const tbl of tableNames) {
    const [cols] = await conn.execute('DESCRIBE ' + tbl);
    const colNames = cols.map(c => c.Field);
    const hasBatch = colNames.some(c => c.toLowerCase().includes('batch'));
    const hasStudent = colNames.some(c => c.toLowerCase().includes('student') || c === 'userId');
    if (hasBatch && hasStudent) {
      const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM ' + tbl);
      console.log(`TABLE: ${tbl} | cols: ${colNames.join(', ')} | rows: ${cnt[0].c}`);
      if (cnt[0].c > 0) {
        const [sample] = await conn.execute('SELECT * FROM ' + tbl + ' LIMIT 2');
        sample.forEach(r => console.log('  SAMPLE:', JSON.stringify(r)));
      }
    }
  }

  // Also check if batches have a students column or JSON field
  const [batchCols] = await conn.execute('DESCRIBE batches');
  console.log('\nbatches cols:', batchCols.map(c=>c.Field+':'+c.Type).join(', '));
  
  // Check batches with students
  const [batchSample] = await conn.execute('SELECT id, title, software, status FROM batches WHERE status != "active" LIMIT 5');
  console.log('\nNon-active batches:', JSON.stringify(batchSample));

  await conn.end();
}
check().catch(e => console.error(e.message));
