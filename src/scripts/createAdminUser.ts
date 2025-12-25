import bcrypt from 'bcrypt';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

async function createAdminUser() {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Check if admin already exists
    const existingAdmin = await db.User.findOne({
      where: { email: 'admin@primeacademy.com' },
      transaction,
    });

    if (existingAdmin) {
      console.log('Admin user already exists with email: admin@primeacademy.com');
      await transaction.rollback();
      return;
    }

    // Hash password
    const password = 'Admin@123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const user = await db.User.create(
      {
        name: 'Admin User',
        email: 'admin@primeacademy.com',
        phone: '+1234567899',
        role: UserRole.ADMIN,
        passwordHash,
        isActive: true,
      },
      { transaction }
    );

    console.log(`Created admin user with ID: ${user.id}`);

    await transaction.commit();
    console.log('\n✅ Admin user created successfully!');
    console.log(`\nAdmin Details:`);
    console.log(`- Name: Admin User`);
    console.log(`- Email: admin@primeacademy.com`);
    console.log(`- Phone: +1234567899`);
    console.log(`- Password: ${password}`);
    console.log(`- User ID: ${user.id}`);
    console.log(`- Role: ${user.role}`);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating admin user:', error);
    console.error('❌ Failed to create admin user:', error);
    throw error;
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('\nScript completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });

export default createAdminUser;