import * as bcrypt from 'bcrypt';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

async function createSuperAdminUser() {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Check if superadmin already exists
    const existingSuperAdmin = await db.User.findOne({
      where: { email: 'superadmin@primeacademy.com' },
      transaction,
    });

    if (existingSuperAdmin) {
      console.log('SuperAdmin user already exists with email: superadmin@primeacademy.com');
      await transaction.rollback();
      return;
    }

    // Hash password
    const password = 'SuperAdmin@123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create superadmin user
    const user = await db.User.create(
      {
        name: 'Super Admin User',
        email: 'superadmin@primeacademy.com',
        phone: '+1234567888',
        role: UserRole.SUPERADMIN,
        passwordHash,
        isActive: true,
      },
      { transaction }
    );

    console.log(`Created superadmin user with ID: ${user.id}`);

    await transaction.commit();
    console.log('\n✅ SuperAdmin user created successfully!');
    console.log(`\nSuperAdmin Details:`);
    console.log(`- Name: Super Admin User`);
    console.log(`- Email: superadmin@primeacademy.com`);
    console.log(`- Phone: +1234567888`);
    console.log(`- Password: ${password}`);
    console.log(`- User ID: ${user.id}`);
    console.log(`- Role: ${user.role}`);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating superadmin user:', error);
    console.error('❌ Failed to create superadmin user:', error);
    throw error;
  }
}

// Run the script
createSuperAdminUser()
  .then(() => {
    console.log('\nScript completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });

export default createSuperAdminUser;