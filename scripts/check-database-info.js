/**
 * Check Database Tables and Data
 */

const path = require('path');

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

const sequelizeLib = require(path.join(backendRoot, 'dist', 'config', 'database'));
const db = require(path.join(backendRoot, 'dist', 'models', 'index')).default;
const { Op } = require('sequelize');
const sequelize = sequelizeLib.default || sequelizeLib;

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    console.log();
    
    // Get database name
    const config = sequelize.config;
    console.log(`Database: ${config.database}`);
    console.log(`Host: ${config.host}`);
    console.log(`Port: ${config.port}`);
    console.log();
    
    // List all tables
    console.log('📋 Tables in database:');
    const [tables] = await sequelize.query('SHOW TABLES');
    console.table(tables);
    console.log();
    
    // Count records in key tables
    console.log('📊 Record counts:');
    
    const studentCount = await db.User.count({ where: { role: 'STUDENT' } });
    console.log(`- Students (Users with role=STUDENT): ${studentCount}`);
    
    try {
      const paymentCount = await db.PaymentTransaction.count();
      console.log(`- Payment Transactions: ${paymentCount}`);
      
      // Check payments with valid students
      const validPayments = await db.PaymentTransaction.count({
        include: [{
          model: db.User,
          as: 'student',
          required: true,
        }]
      });
      console.log(`- Payments with valid student links: ${validPayments}`);
    } catch (err) {
      console.log(`- Payment Transactions: ERROR - ${err.message}`);
    }
    
    try {
      const taskCount = await db.Task ? await db.Task.count() : 'N/A';
      console.log(`- Tasks: ${taskCount}`);
    } catch (err) {
      console.log(`- Tasks: Model not available`);
    }
    
    console.log();
    console.log('='.repeat(80));
    console.log('NEXT STEPS:');
    console.log('='.repeat(80));
    console.log();
    console.log('1. Open MySQL Workbench or phpMyAdmin');
    console.log(`2. Connect to database: ${config.database}`);
    console.log('3. Run this query to see orphaned payments:');
    console.log();
    console.log('SELECT COUNT(*) as orphaned_payments');
    console.log('FROM payment_transactions pt');
    console.log('LEFT JOIN users u ON pt.studentId = u.id');
    console.log('WHERE u.id IS NULL;');
    console.log();
    console.log('4. To delete orphaned payments:');
    console.log();
    console.log('DELETE pt FROM payment_transactions pt');
    console.log('LEFT JOIN users u ON pt.studentId = u.id');
    console.log('WHERE u.id IS NULL;');
    console.log();
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

checkDatabase();
