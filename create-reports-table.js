const mysql = require('mysql2/promise');
require('dotenv').config();

async function createReportsTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'primeacademy_db',
    });

    console.log('Connected to database');

    const sql = `
      CREATE TABLE IF NOT EXISTS \`reports\` (
        \`id\` INT(11) AUTO_INCREMENT PRIMARY KEY,
        \`reportType\` VARCHAR(100) NOT NULL COMMENT 'Type of report (e.g., batch-attendance, pending-payments)',
        \`reportName\` VARCHAR(255) NOT NULL COMMENT 'Human-readable report name',
        \`generatedBy\` INT(11) NOT NULL COMMENT 'User ID who generated the report',
        \`parameters\` JSON NULL COMMENT 'Query parameters used for generating the report',
        \`data\` JSON NOT NULL COMMENT 'Complete report data',
        \`summary\` JSON NULL COMMENT 'Summary statistics of the report',
        \`recordCount\` INT(11) NULL COMMENT 'Number of records in the report',
        \`fileUrl\` VARCHAR(500) NULL COMMENT 'URL to exported file if any (CSV, PDF, etc.)',
        \`status\` ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'completed' COMMENT 'Report generation status',
        \`errorMessage\` TEXT NULL COMMENT 'Error message if report generation failed',
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        CONSTRAINT \`fk_reports_user\` FOREIGN KEY (\`generatedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        INDEX \`idx_reportType\` (\`reportType\`),
        INDEX \`idx_generatedBy\` (\`generatedBy\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_createdAt\` (\`createdAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(sql);
    console.log('Reports table created successfully!');

    await connection.end();
  } catch (error) {
    console.error('Error creating reports table:', error.message);
    process.exit(1);
  }
}

createReportsTable();
