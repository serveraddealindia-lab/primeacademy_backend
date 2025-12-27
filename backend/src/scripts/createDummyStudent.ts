import * as bcrypt from 'bcrypt';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

async function createDummyStudent() {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Check if student already exists
    const existingStudent = await db.User.findOne({
      where: { email: 'john.doe@primeacademy.local' },
      transaction,
    });

    if (existingStudent) {
      console.log('Dummy student already exists with email: john.doe@primeacademy.local');
      await transaction.rollback();
      return;
    }

    // Hash password
    const password = 'Student@123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await db.User.create(
      {
        name: 'John Doe',
        email: 'john.doe@primeacademy.local',
        phone: '+1234567890',
        role: UserRole.STUDENT,
        passwordHash,
        isActive: true,
        avatarUrl: 'https://ui-avatars.com/api/?name=John+Doe&background=orange&color=fff&size=200',
      },
      { transaction }
    );

    console.log(`Created user with ID: ${user.id}`);

    // Create student profile with all details
    if (db.StudentProfile) {
      const studentProfile = await db.StudentProfile.create(
        {
          userId: user.id,
          dob: new Date('2000-05-15'),
          address: '123 Main Street, City, State, ZIP Code, Country',
          photoUrl: 'https://ui-avatars.com/api/?name=John+Doe&background=orange&color=fff&size=400',
          softwareList: ['Photoshop', 'Illustrator', 'InDesign', 'Premiere Pro', 'After Effects'],
          enrollmentDate: new Date('2024-01-15'),
          status: 'active',
          documents: {
            whatsappNumber: '+1234567890',
            emergencyContactNumber: '+1987654321',
            emergencyName: 'Jane Doe',
            emergencyRelation: 'Mother',
            localAddress: '123 Main Street, City, State, ZIP Code',
            permanentAddress: '123 Main Street, City, State, ZIP Code',
            courseName: 'Graphic Design Master Course',
            totalDeal: 50000,
            bookingAmount: 10000,
            balanceAmount: 40000,
            emiPlan: true,
            emiPlanDate: '2024-02-01',
            complimentarySoftware: 'Adobe Creative Cloud',
            complimentaryGift: 'Design Tablet',
            hasReference: true,
            referenceDetails: 'Referred by friend',
            counselorName: 'Sarah Smith',
            leadSource: 'Website',
            walkinDate: '2024-01-10',
            masterFaculty: 'Prof. Michael Johnson',
          },
        },
        { transaction }
      );

      console.log(`Created student profile with ID: ${studentProfile.id}`);
    }

    // Try to enroll in a batch if any exists
    const firstBatch = await db.Batch.findOne({
      where: { status: 'active' },
      transaction,
    });

    if (firstBatch && db.Enrollment) {
      await db.Enrollment.create(
        {
          studentId: user.id,
          batchId: firstBatch.id,
          enrollmentDate: new Date('2024-01-15'),
          status: 'active',
        },
        { transaction }
      );

      console.log(`Enrolled student in batch: ${firstBatch.title} (ID: ${firstBatch.id})`);
    }

    await transaction.commit();
    console.log('\n✅ Dummy student created successfully!');
    console.log(`\nStudent Details:`);
    console.log(`- Name: John Doe`);
    console.log(`- Email: john.doe@primeacademy.local`);
    console.log(`- Phone: +1234567890`);
    console.log(`- Password: ${password}`);
    console.log(`- User ID: ${user.id}`);
    console.log(`\nYou can now use this student to test the edit functionality.`);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating dummy student:', error);
    console.error('❌ Failed to create dummy student:', error);
    throw error;
  }
}

// Run the script
createDummyStudent()
  .then(() => {
    console.log('\nScript completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });

export default createDummyStudent;

