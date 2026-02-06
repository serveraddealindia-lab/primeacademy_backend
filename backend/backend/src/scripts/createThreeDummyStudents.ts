import * as bcrypt from 'bcrypt';
import db from '../models';
import { UserRole } from '../models/User';
import { BatchMode } from '../models/Batch';
import { LeaveStatus } from '../models/StudentLeave';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

async function createThreeDummyStudents() {
  try {
    // Student 1: Enrolled but batch not started (future batch)
    const transaction1 = await db.sequelize.transaction();
    try {
      const password = 'Student@123';
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user1 = await db.User.create(
        {
          name: 'Alice Johnson',
          email: 'alice.johnson@primeacademy.local',
          phone: '+1234567891',
          role: UserRole.STUDENT,
          passwordHash,
          isActive: true,
          avatarUrl: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=orange&color=fff&size=200',
        },
        { transaction: transaction1 }
      );

      // Create student profile
      if (db.StudentProfile) {
        await db.StudentProfile.create(
          {
            userId: user1.id,
            dob: new Date('2001-03-20'),
            address: '456 Oak Avenue, City, State',
            softwareList: ['Photoshop', 'Illustrator', 'Figma'],
            enrollmentDate: new Date('2024-12-01'),
            status: 'active',
          },
          { transaction: transaction1 }
        );
      }

      // Find or create a future batch (start date in future)
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2); // 2 months from now
      const endDate = new Date(futureDate);
      endDate.setMonth(endDate.getMonth() + 3); // 3 months duration

      let futureBatch = await db.Batch.findOne({
        where: {
          startDate: { [Op.gt]: new Date() },
        },
        transaction: transaction1,
      });

      if (!futureBatch) {
        futureBatch = await db.Batch.create(
          {
            title: 'Future Graphic Design Batch - Jan 2025',
            software: 'Photoshop, Illustrator, Figma',
            mode: BatchMode.ONLINE,
            startDate: futureDate,
            endDate: endDate,
            maxCapacity: 30,
            status: 'active',
            schedule: {
              Monday: { startTime: '10:00 AM', endTime: '1:00 PM' },
              Wednesday: { startTime: '10:00 AM', endTime: '1:00 PM' },
              Friday: { startTime: '10:00 AM', endTime: '1:00 PM' },
            },
          },
          { transaction: transaction1 }
        );
      }

      // Enroll student in future batch
      if (db.Enrollment) {
        await db.Enrollment.create(
          {
            studentId: user1.id,
            batchId: futureBatch.id,
            enrollmentDate: new Date('2024-12-01'),
            status: 'active',
          },
          { transaction: transaction1 }
        );
      }

      await transaction1.commit();
      console.log(`✅ Created Student 1: Alice Johnson (ID: ${user1.id}) - Enrolled in future batch`);
    } catch (error) {
      await transaction1.rollback();
      throw error;
    }

    // Student 2: Multiple courses conflict (2+ enrollments)
    const transaction2 = await db.sequelize.transaction();
    try {
      const password = 'Student@123';
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const user2 = await db.User.create(
        {
          name: 'Bob Smith',
          email: 'bob.smith@primeacademy.local',
          phone: '+1234567892',
          role: UserRole.STUDENT,
          passwordHash,
          isActive: true,
          avatarUrl: 'https://ui-avatars.com/api/?name=Bob+Smith&background=orange&color=fff&size=200',
        },
        { transaction: transaction2 }
      );

      if (db.StudentProfile) {
        await db.StudentProfile.create(
          {
            userId: user2.id,
            dob: new Date('2000-07-15'),
            address: '789 Pine Street, City, State',
            softwareList: ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Blender'],
            enrollmentDate: new Date('2024-11-01'),
            status: 'active',
          },
          { transaction: transaction2 }
        );
      }

      // Find or create batches for multiple enrollments
      const today = new Date();
      const batch1Start = new Date(today);
      batch1Start.setDate(batch1Start.getDate() - 30); // Started 30 days ago
      const batch1End = new Date(batch1Start);
      batch1End.setMonth(batch1End.getMonth() + 4);

      const batch2Start = new Date(today);
      batch2Start.setDate(batch2Start.getDate() + 15); // Starts in 15 days
      const batch2End = new Date(batch2Start);
      batch2End.setMonth(batch2End.getMonth() + 3);

      let batch1 = await db.Batch.findOne({
        where: {
          title: { [Op.like]: '%Video Editing%' },
        },
        transaction: transaction2,
      });

      if (!batch1) {
        batch1 = await db.Batch.create(
          {
            title: 'Video Editing Masterclass - Running',
            software: 'Premiere Pro, After Effects',
            mode: BatchMode.OFFLINE,
            startDate: batch1Start,
            endDate: batch1End,
            maxCapacity: 25,
            status: 'active',
            schedule: {
              Tuesday: { startTime: '2:00 PM', endTime: '5:00 PM' },
              Thursday: { startTime: '2:00 PM', endTime: '5:00 PM' },
            },
          },
          { transaction: transaction2 }
        );
      }

      let batch2 = await db.Batch.findOne({
        where: {
          title: { [Op.like]: '%3D Animation%' },
        },
        transaction: transaction2,
      });

      if (!batch2) {
        batch2 = await db.Batch.create(
          {
            title: '3D Animation Course - Upcoming',
            software: 'Blender, Maya',
            mode: BatchMode.HYBRID,
            startDate: batch2Start,
            endDate: batch2End,
            maxCapacity: 20,
            status: 'active',
            schedule: {
              Monday: { startTime: '2:00 PM', endTime: '5:00 PM' },
              Wednesday: { startTime: '2:00 PM', endTime: '5:00 PM' },
            },
          },
          { transaction: transaction2 }
        );
      }

      // Enroll in both batches
      if (db.Enrollment) {
        await db.Enrollment.create(
          {
            studentId: user2.id,
            batchId: batch1.id,
            enrollmentDate: new Date('2024-11-01'),
            status: 'active',
          },
          { transaction: transaction2 }
        );

        await db.Enrollment.create(
          {
            studentId: user2.id,
            batchId: batch2.id,
            enrollmentDate: new Date('2024-11-15'),
            status: 'active',
          },
          { transaction: transaction2 }
        );
      }

      await transaction2.commit();
      console.log(`✅ Created Student 2: Bob Smith (ID: ${user2.id}) - Multiple enrollments`);
    } catch (error) {
      await transaction2.rollback();
      throw error;
    }

    // Student 3: On leave with pending batches
    const transaction3 = await db.sequelize.transaction();
    try {
      const password = 'Student@123';
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const user3 = await db.User.create(
        {
          name: 'Carol Williams',
          email: 'carol.williams@primeacademy.local',
          phone: '+1234567893',
          role: UserRole.STUDENT,
          passwordHash,
          isActive: true,
          avatarUrl: 'https://ui-avatars.com/api/?name=Carol+Williams&background=orange&color=fff&size=200',
        },
        { transaction: transaction3 }
      );

      if (db.StudentProfile) {
        await db.StudentProfile.create(
          {
            userId: user3.id,
            dob: new Date('1999-11-10'),
            address: '321 Elm Drive, City, State',
            softwareList: ['InDesign', 'Photoshop', 'Illustrator'],
            enrollmentDate: new Date('2024-10-01'),
            status: 'active',
          },
          { transaction: transaction3 }
        );
      }

      // Create batches - one for leave, one pending
      const today = new Date();
      const leaveBatchStart = new Date(today);
      leaveBatchStart.setDate(leaveBatchStart.getDate() - 20);
      const leaveBatchEnd = new Date(leaveBatchStart);
      leaveBatchEnd.setMonth(leaveBatchEnd.getMonth() + 4);

      const pendingBatchStart = new Date(today);
      pendingBatchStart.setDate(pendingBatchStart.getDate() + 10);
      const pendingBatchEnd = new Date(pendingBatchStart);
      pendingBatchEnd.setMonth(pendingBatchEnd.getMonth() + 3);

      let leaveBatch = await db.Batch.findOne({
        where: {
          title: { [Op.like]: '%Print Design%' },
        },
        transaction: transaction3,
      });

      if (!leaveBatch) {
        leaveBatch = await db.Batch.create(
          {
            title: 'Print Design Course - Running',
            software: 'InDesign, Photoshop',
            mode: BatchMode.OFFLINE,
            startDate: leaveBatchStart,
            endDate: leaveBatchEnd,
            maxCapacity: 30,
            status: 'active',
            schedule: {
              Monday: { startTime: '9:00 AM', endTime: '12:00 PM' },
              Wednesday: { startTime: '9:00 AM', endTime: '12:00 PM' },
            },
          },
          { transaction: transaction3 }
        );
      }

      let pendingBatch = await db.Batch.findOne({
        where: {
          title: { [Op.like]: '%Web Design%' },
        },
        transaction: transaction3,
      });

      if (!pendingBatch) {
        pendingBatch = await db.Batch.create(
          {
            title: 'Web Design Course - Upcoming',
            software: 'Figma, Adobe XD',
            mode: BatchMode.ONLINE,
            startDate: pendingBatchStart,
            endDate: pendingBatchEnd,
            maxCapacity: 25,
            status: 'active',
            schedule: {
              Tuesday: { startTime: '10:00 AM', endTime: '1:00 PM' },
              Thursday: { startTime: '10:00 AM', endTime: '1:00 PM' },
            },
          },
          { transaction: transaction3 }
        );
      }

      // Enroll in both batches
      if (db.Enrollment) {
        await db.Enrollment.create(
          {
            studentId: user3.id,
            batchId: leaveBatch.id,
            enrollmentDate: new Date('2024-10-01'),
            status: 'active',
          },
          { transaction: transaction3 }
        );

        await db.Enrollment.create(
          {
            studentId: user3.id,
            batchId: pendingBatch.id,
            enrollmentDate: new Date('2024-10-15'),
            status: 'active',
          },
          { transaction: transaction3 }
        );
      }

      // Create approved leave for the leaveBatch
      const leaveStart = new Date(today);
      leaveStart.setDate(leaveStart.getDate() - 5);
      const leaveEnd = new Date(today);
      leaveEnd.setDate(leaveEnd.getDate() + 10);

      if (db.StudentLeave) {
        await db.StudentLeave.create(
          {
            studentId: user3.id,
            batchId: leaveBatch.id,
            startDate: leaveStart,
            endDate: leaveEnd,
            reason: 'Family emergency',
            status: LeaveStatus.APPROVED,
            approvedBy: null, // Can be set to admin user ID if available
            approvedAt: new Date(),
          },
          { transaction: transaction3 }
        );
      }

      await transaction3.commit();
      console.log(`✅ Created Student 3: Carol Williams (ID: ${user3.id}) - On leave with pending batch`);
    } catch (error) {
      await transaction3.rollback();
      throw error;
    }

    console.log('\n✅ All 3 dummy students created successfully!');
    console.log('\nStudent Details:');
    console.log('1. Alice Johnson - alice.johnson@primeacademy.local (Enrolled in future batch)');
    console.log('2. Bob Smith - bob.smith@primeacademy.local (Multiple enrollments)');
    console.log('3. Carol Williams - carol.williams@primeacademy.local (On leave with pending batch)');
    console.log('\nPassword for all: Student@123');
  } catch (error) {
    logger.error('Error creating dummy students:', error);
    console.error('❌ Failed to create dummy students:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createThreeDummyStudents()
    .then(() => {
      console.log('\nScript completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nScript failed:', error);
      process.exit(1);
    });
}

export default createThreeDummyStudents;

