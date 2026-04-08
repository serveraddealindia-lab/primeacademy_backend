/**
 * Quick Fix: Update all students without names
 * This script finds students with empty/null names and updates them with email prefix
 */

const path = require('path');

// Smart path resolution - works from any directory
let backendRoot;

if (process.cwd().endsWith('backend')) {
  backendRoot = process.cwd();
} else if (process.cwd().includes('Primeacademynew')) {
  backendRoot = path.join(process.cwd(), 'backend');
} else {
  backendRoot = process.cwd();
}

console.log(`Using backend root: ${backendRoot}`);
console.log();

// Use dist folder for compiled JavaScript files
const sequelizeLib = require(path.join(backendRoot, 'dist', 'config', 'database'));
const db = require(path.join(backendRoot, 'dist', 'models', 'index')).default;

// Handle both default export and named export
const sequelize = sequelizeLib.default || sequelizeLib;

async function fixStudentNames() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔍 Finding students with missing or empty names...\n');

    // Find all students with NULL or empty names
    const studentsWithoutNames = await db.User.findAll({
      where: {
        role: 'STUDENT',
        [sequelize.Op.or]: [
          { name: null },
          { name: '' },
          { name: { [sequelize.Op.like]: '%null%' } }
        ]
      },
      attributes: ['id', 'name', 'email'],
      transaction,
    });

    console.log(`Found ${studentsWithoutNames.length} students with name issues\n`);

    if (studentsWithoutNames.length === 0) {
      console.log('✅ All students have valid names!');
      await transaction.commit();
      await sequelize.close();
      process.exit(0);
    }

    console.log('Updating student names...\n');
    
    let updatedCount = 0;
    for (const student of studentsWithoutNames) {
      // Generate name from email (part before @)
      const emailPrefix = student.email.split('@')[0];
      
      // Try to capitalize first letter
      const generatedName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      
      try {
        await student.update({
          name: generatedName
        }, { transaction });
        
        console.log(`✅ Updated Student ID ${student.id}: "${generatedName}" (${student.email})`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update Student ID ${student.id}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Successfully updated ${updatedCount} out of ${studentsWithoutNames.length} students`);
    console.log('='.repeat(80));

    // Commit the transaction
    await transaction.commit();
    console.log('\n✅ Changes committed to database!\n');

    // Verify the fixes
    console.log('🔍 Verifying fixes...\n');
    const verifyStudents = await db.User.findAll({
      where: {
        role: 'STUDENT',
        id: { [sequelize.Op.in]: studentsWithoutNames.map(s => s.id) }
      },
      attributes: ['id', 'name', 'email'],
    });

    let verifiedCount = 0;
    for (const student of verifyStudents) {
      if (student.name && student.name !== '' && !student.name.includes('null')) {
        console.log(`✅ Verified: Student ID ${student.id} - "${student.name}"`);
        verifiedCount++;
      } else {
        console.log(`❌ Still has issue: Student ID ${student.id} - "${student.name}"`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Verified: ${verifiedCount}/${verifyStudents.length} students`);
    console.log('='.repeat(80));

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await transaction.rollback();
    console.log('Transaction rolled back.');
    process.exit(1);
  }
}

// Run the fix
fixStudentNames();
