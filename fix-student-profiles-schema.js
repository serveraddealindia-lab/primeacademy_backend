const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'primeacademy_db'
    });

    console.log('Connected to database...');
    
    // Add serialNo column
    await conn.query(`
      ALTER TABLE student_profiles 
      ADD COLUMN IF NOT EXISTS serialNo VARCHAR(50) NULL UNIQUE COMMENT 'Serial number for the student'
    `);
    
    console.log('✓ serialNo column added successfully!');
    
    // Verify
    const [rows] = await conn.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'student_profiles' AND COLUMN_NAME = 'serialNo'
    `, [process.env.DB_NAME || 'primeacademy_db']);
    
    if (rows.length > 0) {
      console.log('✓ Column verified:', rows[0]);
    } else {
      console.log('⚠ Column may not have been added');
    }
    
    await conn.end();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
