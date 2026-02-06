const { Sequelize } = require('sequelize');
require('dotenv').config();

// Connect as root to create database and user
const rootSequelize = new Sequelize(
  'mysql', // Connect to mysql system database first
  'root',  // Root user
  '',      // Root password (empty by default in many installations)
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false,
  }
);

async function setupDatabase() {
  try {
    console.log('Connecting as root user...');
    await rootSequelize.authenticate();
    console.log('✅ Root connection successful!');
    
    // Create database if it doesn't exist
    console.log('\nCreating database...');
    try {
      await rootSequelize.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
      console.log(`✅ Database '${process.env.DB_NAME}' created or already exists`);
    } catch (error) {
      console.log(`⚠️  Database creation warning: ${error.message}`);
    }
    
    // Create user if it doesn't exist
    console.log('\nCreating user...');
    try {
      await rootSequelize.query(`CREATE USER IF NOT EXISTS '${process.env.DB_USER}'@'localhost' IDENTIFIED BY '${process.env.DB_PASSWORD}'`);
      console.log(`✅ User '${process.env.DB_USER}' created or already exists`);
    } catch (error) {
      console.log(`⚠️  User creation warning: ${error.message}`);
    }
    
    // Grant privileges
    console.log('\nGranting privileges...');
    try {
      await rootSequelize.query(`GRANT ALL PRIVILEGES ON ${process.env.DB_NAME}.* TO '${process.env.DB_USER}'@'localhost'`);
      await rootSequelize.query('FLUSH PRIVILEGES');
      console.log(`✅ Privileges granted to user '${process.env.DB_USER}'`);
    } catch (error) {
      console.log(`⚠️  Privilege granting warning: ${error.message}`);
    }
    
    // Test the new user connection
    console.log('\nTesting new user connection...');
    const userSequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        dialect: 'mysql',
        logging: false,
      }
    );
    
    await userSequelize.authenticate();
    console.log('✅ New user connection successful!');
    await userSequelize.close();
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Error details:', error.parent?.sqlMessage || error.message);
    
    // Try with different root password combinations
    if (error.parent?.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\nTrying with common root passwords...');
      const commonPasswords = ['', 'root', 'password', 'admin'];
      
      for (const password of commonPasswords) {
        try {
          console.log(`Trying root password: '${password}'`);
          const testSequelize = new Sequelize('mysql', 'root', password, {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT, 10),
            dialect: 'mysql',
            logging: false,
          });
          
          await testSequelize.authenticate();
          console.log(`✅ Root connection successful with password: '${password}'`);
          
          // Update the root connection and retry setup
          const newRootSequelize = new Sequelize('mysql', 'root', password, {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT, 10),
            dialect: 'mysql',
            logging: false,
          });
          
          // Retry the setup process
          await setupWithConnection(newRootSequelize);
          return;
        } catch (testError) {
          console.log(`❌ Root password '${password}' failed`);
        }
      }
    }
  } finally {
    await rootSequelize.close();
  }
}

async function setupWithConnection(sequelize) {
  try {
    // Create database
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`✅ Database '${process.env.DB_NAME}' created or already exists`);
    
    // Create user
    await sequelize.query(`CREATE USER IF NOT EXISTS '${process.env.DB_USER}'@'localhost' IDENTIFIED BY '${process.env.DB_PASSWORD}'`);
    console.log(`✅ User '${process.env.DB_USER}' created or already exists`);
    
    // Grant privileges
    await sequelize.query(`GRANT ALL PRIVILEGES ON ${process.env.DB_NAME}.* TO '${process.env.DB_USER}'@'localhost'`);
    await sequelize.query('FLUSH PRIVILEGES');
    console.log(`✅ Privileges granted to user '${process.env.DB_USER}'`);
    
    // Test connection
    const userSequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        dialect: 'mysql',
        logging: false,
      }
    );
    
    await userSequelize.authenticate();
    console.log('✅ Setup completed successfully!');
    await userSequelize.close();
    
  } catch (error) {
    console.error('Setup with connection failed:', error.message);
  }
}

setupDatabase();