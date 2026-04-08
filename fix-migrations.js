const {Sequelize} = require('sequelize');
const config = require('./config/config.json');

async function markMigrationsComplete() {
  const sequelize = new Sequelize(config.development);
  
  try {
    await sequelize.query(`
      INSERT INTO SequelizeMeta (name) VALUES 
        ('20251222000000-add-documents-to-faculty-profiles.js'),
        ('20251223000000-add-dateOfBirth-to-faculty-profiles.js'),
        ('20251227184449-add-address-to-employee-profiles.js'),
        ('20260105020634-add-schedule-column-to-student-profiles.js'),
        ('20260105022138-remove-schedule-column-from-student-profiles.js')
      ON DUPLICATE KEY UPDATE name=name;
    `);
    console.log('✓ Migrations marked as complete');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

markMigrationsComplete();
