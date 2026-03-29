const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsersTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'primeacademy_db',
    });

    console.log('Connected to database');

    const [rows] = await connection.query('SHOW CREATE TABLE `users`');
    console.log('Users table structure:');
    console.log(rows[0]['Create Table']);

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsersTable();
