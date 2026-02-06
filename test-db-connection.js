const { Sequelize } = require('sequelize');
require('dotenv').config();

// Test database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'primeacademy_db',
  process.env.DB_USER || 'primeacademy_user',
  process.env.DB_PASSWORD || 'StrongAppPassword!123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: console.log,
  }
);

async function testConnection() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    console.log('\nTesting simple query...');
    const [results] = await sequelize.query('SELECT 1 as test');
    console.log('✅ Query successful:', results);
    
    // Check if database exists
    console.log('\nChecking if database exists...');
    const [databases] = await sequelize.query('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === process.env.DB_NAME);
    console.log(`Database '${process.env.DB_NAME}' exists: ${dbExists}`);
    
    if (!dbExists) {
      console.log('\n❌ Database does not exist. Creating database...');
      await sequelize.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log('✅ Database created successfully!');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await sequelize.close();
  }
}

testConnection();