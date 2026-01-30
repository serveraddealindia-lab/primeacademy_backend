const { Sequelize } = require('sequelize');
require('dotenv').config();

// Connect as root to check users and privileges
const rootSequelize = new Sequelize(
  'mysql',
  'root',
  '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: console.log,
  }
);

async function checkUsersAndPrivileges() {
  try {
    console.log('Connecting as root...');
    await rootSequelize.authenticate();
    console.log('✅ Connected successfully\n');
    
    // Show all users
    console.log('=== CURRENT USERS ===');
    const [users] = await rootSequelize.query('SELECT User, Host FROM mysql.user');
    users.forEach(user => {
      console.log(`${user.User}@${user.Host}`);
    });
    
    console.log('\n=== CHECKING OUR USER ===');
    const [ourUser] = await rootSequelize.query(
      `SELECT User, Host FROM mysql.user WHERE User = '${process.env.DB_USER}'`
    );
    console.log('Our user exists:', ourUser.length > 0);
    if (ourUser.length > 0) {
      ourUser.forEach(u => console.log(`  ${u.User}@${u.Host}`));
    }
    
    console.log('\n=== CHECKING DATABASE ===');
    const [databases] = await rootSequelize.query('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === process.env.DB_NAME);
    console.log(`Database '${process.env.DB_NAME}' exists: ${dbExists}`);
    
    if (dbExists) {
      console.log('\n=== CHECKING PRIVILEGES ===');
      const [privileges] = await rootSequelize.query(
        `SHOW GRANTS FOR '${process.env.DB_USER}'@'localhost'`
      );
      console.log('Current privileges:');
      privileges.forEach(priv => {
        console.log(`  ${priv['Grants for primeacademy_user@localhost']}`);
      });
    }
    
    console.log('\n=== RESETTING USER PRIVILEGES ===');
    // Drop user and recreate with proper privileges
    try {
      await rootSequelize.query(`DROP USER IF EXISTS '${process.env.DB_USER}'@'localhost'`);
      console.log('✅ Old user dropped');
    } catch (error) {
      console.log('⚠️  Could not drop user:', error.message);
    }
    
    // Recreate user
    await rootSequelize.query(
      `CREATE USER '${process.env.DB_USER}'@'localhost' IDENTIFIED BY '${process.env.DB_PASSWORD}'`
    );
    console.log('✅ User recreated');
    
    // Grant all privileges
    await rootSequelize.query(
      `GRANT ALL PRIVILEGES ON ${process.env.DB_NAME}.* TO '${process.env.DB_USER}'@'localhost'`
    );
    console.log('✅ Privileges granted');
    
    // Flush privileges
    await rootSequelize.query('FLUSH PRIVILEGES');
    console.log('✅ Privileges flushed');
    
    console.log('\n=== TESTING CONNECTION ===');
    // Test the connection
    const testSequelize = new Sequelize(
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
    
    await testSequelize.authenticate();
    console.log('✅ Connection test successful!');
    await testSequelize.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error.parent?.sqlMessage || error.message);
  } finally {
    await rootSequelize.close();
  }
}

checkUsersAndPrivileges();