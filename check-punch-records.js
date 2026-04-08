const {Sequelize} = require('sequelize');
const config = require('./config/config.json');

async function checkPunchRecords() {
  const sequelize = new Sequelize(config.development);
  
  try {
    console.log('\n=== Checking Today\'s Punch Records ===\n');
    
    const today = new Date().toISOString().split('T')[0];
    console.log('Today\'s date:', today);
    
    // Get all punch records for today
    const [records] = await sequelize.query(`
      SELECT 
        ep.id,
        ep.userId,
        u.name,
        u.email,
        u.role,
        ep.date,
        ep.punchInAt,
        ep.punchOutAt,
        ep.breaks,
        CASE 
          WHEN ep.punchInAt IS NOT NULL AND ep.punchOutAt IS NULL THEN 'CURRENTLY PUNCHED IN'
          WHEN ep.punchInAt IS NOT NULL AND ep.punchOutAt IS NOT NULL THEN 'PUNCHED OUT'
          ELSE 'NOT PUNCHED IN'
        END as status
      FROM employee_punches ep
      INNER JOIN users u ON ep.userId = u.id
      WHERE ep.date = :today
      ORDER BY u.name
    `, { replacements: { today } });
    
    console.log(`\nFound ${records.length} punch record(s) for today:\n`);
    
    if (records.length === 0) {
      console.log('⚠️  No punch records found for today!');
      console.log('Users need to punch in first.\n');
    } else {
      records.forEach((record, index) => {
        console.log(`${index + 1}. ${record.name} (${record.email})`);
        console.log(`   Role: ${record.role}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   Punch In: ${record.punchInAt || 'NULL'}`);
        console.log(`   Punch Out: ${record.punchOutAt || 'NULL'}`);
        
        if (record.breaks) {
          try {
            const breaks = typeof record.breaks === 'string' ? JSON.parse(record.breaks) : record.breaks;
            if (Array.isArray(breaks) && breaks.length > 0) {
              console.log(`   Previous Cycles: ${breaks.length}`);
              breaks.forEach((b, i) => {
                console.log(`     Cycle ${i + 1}: ${b.punchInAt} → ${b.punchOutAt}`);
              });
            }
          } catch (e) {
            console.log(`   Breaks: ${record.breaks}`);
          }
        }
        console.log('');
      });
    }
    
    // Check faculty specifically
    console.log('\n--- Faculty Users ---');
    const [faculties] = await sequelize.query(`
      SELECT id, name, email FROM users WHERE role = 'faculty' AND isActive = true LIMIT 5
    `);
    
    for (const faculty of faculties) {
      const [punch] = await sequelize.query(`
        SELECT punchInAt, punchOutAt, date
        FROM employee_punches
        WHERE userId = :userId AND date = :today
      `, { replacements: { userId: faculty.id, today } });
      
      if (punch.length > 0) {
        console.log(`\n${faculty.name} (${faculty.email})`);
        console.log(`  Date: ${punch[0].date}`);
        console.log(`  Punch In: ${punch[0].punchInAt || 'NULL'}`);
        console.log(`  Punch Out: ${punch[0].punchOutAt || 'NULL'}`);
        console.log(`  Can Start Session: ${punch[0].punchInAt && !punch[0].punchOutAt ? 'YES ✓' : 'NO ✗'}`);
      } else {
        console.log(`\n${faculty.name} (${faculty.email})`);
        console.log(`  ⚠️  No punch record for today`);
      }
    }
    
    console.log('\n=== End Check ===\n');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

checkPunchRecords();
