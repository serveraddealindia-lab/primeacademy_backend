const { Sequelize } = require('sequelize');
require('dotenv').config();

// Test connection with various root configurations
async function testRootConnections() {
  const configs = [
    { name: 'Root with empty password', user: 'root', password: '' },
    { name: 'Root with "root" password', user: 'root', password: 'root' },
    { name: 'Root with "password" password', user: 'root', password: 'password' },
    { name: 'Root with "admin" password', user: 'root', password: 'admin' },
    { name: 'Root with "mysql" password', user: 'root', password: 'mysql' }
  ];
  
  for (const config of configs) {
    console.log(`\n=== Testing ${config.name} ===`);
    const sequelize = new Sequelize(
      'mysql', // System database
      config.user,
      config.password,
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        dialect: 'mysql',
        logging: false,
      }
    );
    
    try {
      await sequelize.authenticate();
      console.log(`✅ ${config.name} - SUCCESS`);
      
      // If successful, test database operations
      try {
        const [databases] = await sequelize.query('SHOW DATABASES');
        console.log(`Available databases: ${databases.length}`);
        
        // Check if our database exists
        const dbExists = databases.some(db => db.Database === process.env.DB_NAME);
        console.log(`Our database exists: ${dbExists}`);
        
        if (!dbExists) {
          await sequelize.query(`CREATE DATABASE ${process.env.DB_NAME}`);
          console.log('✅ Database created');
        }
        
        // Test using our database
        const dbSequelize = new Sequelize(
          process.env.DB_NAME,
          config.user,
          config.password,
          {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT, 10),
            dialect: 'mysql',
            logging: false,
          }
        );
        
        await dbSequelize.authenticate();
        console.log('✅ Database connection successful');
        await dbSequelize.close();
        
        console.log(`\n🎉 SUCCESS: Using ${config.name}`);
        console.log('Configuration that works:');
        console.log(`DB_USER=${config.user}`);
        console.log(`DB_PASSWORD=${config.password}`);
        return { user: config.user, password: config.password };
        
      } catch (dbError) {
        console.log(`❌ Database operations failed: ${dbError.message}`);
      }
      
    } catch (error) {
      console.log(`❌ ${config.name} - FAILED: ${error.message}`);
    } finally {
      await sequelize.close();
    }
  }
  
  console.log('\n❌ No working configuration found');
  return null;
}

testRootConnections().then(result => {
  if (result) {
    console.log('\n✅ Working configuration found!');
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n❌ Could not find working MySQL configuration');
  }
});