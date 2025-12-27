import * as bcrypt from 'bcrypt';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

async function createThreeDummyEmployees() {
  try {
    const password = 'Employee@123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Employee 1: Marketing Department
    const transaction1 = await db.sequelize.transaction();
    try {
      const user1 = await db.User.create(
        {
          name: 'Rajesh Kumar',
          email: 'rajesh.kumar@primeacademy.local',
          phone: '+919876543210',
          role: UserRole.EMPLOYEE,
          passwordHash,
          isActive: true,
          avatarUrl: 'https://ui-avatars.com/api/?name=Rajesh+Kumar&background=orange&color=fff&size=200',
        },
        { transaction: transaction1 }
      );

      if (db.EmployeeProfile) {
        await db.EmployeeProfile.create(
          {
            userId: user1.id,
            employeeId: `EMP-${String(user1.id).padStart(4, '0')}`,
            gender: 'Male',
            dateOfBirth: new Date('1990-05-15'),
            nationality: 'Indian',
            maritalStatus: 'Married',
            department: 'Marketing',
            designation: 'Marketing Manager',
            dateOfJoining: new Date('2022-01-10'),
            employmentType: 'Full-Time',
            reportingManager: 'John Smith',
            workLocation: 'Mumbai Office',
            bankName: 'State Bank of India',
            accountNumber: '1234567890123',
            ifscCode: 'SBIN0001234',
            branch: 'Mumbai Main Branch',
            panNumber: 'ABCDE1234F',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            documents: {
              address: '123, Marine Drive, Colaba, Mumbai - 400001',
              emergencyContactName: 'Priya Kumar',
              emergencyRelationship: 'Spouse',
              emergencyPhoneNumber: '+919876543211',
              emergencyAlternatePhone: '+919876543212',
            },
          },
          { transaction: transaction1 }
        );
      }

      await transaction1.commit();
      console.log(`✅ Created Employee 1: Rajesh Kumar (ID: ${user1.id}) - Marketing Manager`);
    } catch (error) {
      await transaction1.rollback();
      throw error;
    }

    // Employee 2: HR Department
    const transaction2 = await db.sequelize.transaction();
    try {
      const user2 = await db.User.create(
        {
          name: 'Priya Sharma',
          email: 'priya.sharma@primeacademy.local',
          phone: '+919876543220',
          role: UserRole.EMPLOYEE,
          passwordHash,
          isActive: true,
          avatarUrl: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=orange&color=fff&size=200',
        },
        { transaction: transaction2 }
      );

      if (db.EmployeeProfile) {
        await db.EmployeeProfile.create(
          {
            userId: user2.id,
            employeeId: `EMP-${String(user2.id).padStart(4, '0')}`,
            gender: 'Female',
            dateOfBirth: new Date('1992-08-22'),
            nationality: 'Indian',
            maritalStatus: 'Single',
            department: 'Human Resources',
            designation: 'HR Executive',
            dateOfJoining: new Date('2023-03-15'),
            employmentType: 'Full-Time',
            reportingManager: 'Sarah Johnson',
            workLocation: 'Delhi Office',
            bankName: 'HDFC Bank',
            accountNumber: '9876543210987',
            ifscCode: 'HDFC0005678',
            branch: 'Delhi Central Branch',
            panNumber: 'FGHIJ5678K',
            city: 'New Delhi',
            state: 'Delhi',
            postalCode: '110001',
            documents: {
              address: '456, Connaught Place, New Delhi - 110001',
              emergencyContactName: 'Ramesh Sharma',
              emergencyRelationship: 'Father',
              emergencyPhoneNumber: '+919876543221',
              emergencyAlternatePhone: '+919876543222',
            },
          },
          { transaction: transaction2 }
        );
      }

      await transaction2.commit();
      console.log(`✅ Created Employee 2: Priya Sharma (ID: ${user2.id}) - HR Executive`);
    } catch (error) {
      await transaction2.rollback();
      throw error;
    }

    // Employee 3: IT Department
    const transaction3 = await db.sequelize.transaction();
    try {
      const user3 = await db.User.create(
        {
          name: 'Amit Patel',
          email: 'amit.patel@primeacademy.local',
          phone: '+919876543230',
          role: UserRole.EMPLOYEE,
          passwordHash,
          isActive: true,
          avatarUrl: 'https://ui-avatars.com/api/?name=Amit+Patel&background=orange&color=fff&size=200',
        },
        { transaction: transaction3 }
      );

      if (db.EmployeeProfile) {
        await db.EmployeeProfile.create(
          {
            userId: user3.id,
            employeeId: `EMP-${String(user3.id).padStart(4, '0')}`,
            gender: 'Male',
            dateOfBirth: new Date('1988-11-30'),
            nationality: 'Indian',
            maritalStatus: 'Married',
            department: 'Information Technology',
            designation: 'Senior Software Developer',
            dateOfJoining: new Date('2021-06-01'),
            employmentType: 'Full-Time',
            reportingManager: 'David Wilson',
            workLocation: 'Bangalore Office',
            bankName: 'ICICI Bank',
            accountNumber: '5555666677778',
            ifscCode: 'ICIC0009012',
            branch: 'Bangalore IT Park Branch',
            panNumber: 'KLMNO9012P',
            city: 'Bangalore',
            state: 'Karnataka',
            postalCode: '560001',
            documents: {
              address: '789, MG Road, Bangalore - 560001',
              emergencyContactName: 'Meera Patel',
              emergencyRelationship: 'Spouse',
              emergencyPhoneNumber: '+919876543231',
              emergencyAlternatePhone: '+919876543232',
            },
          },
          { transaction: transaction3 }
        );
      }

      await transaction3.commit();
      console.log(`✅ Created Employee 3: Amit Patel (ID: ${user3.id}) - Senior Software Developer`);
    } catch (error) {
      await transaction3.rollback();
      throw error;
    }

    console.log('\n✅ All 3 dummy employees created successfully!');
    console.log('\nEmployee Details:');
    console.log('1. Rajesh Kumar - rajesh.kumar@primeacademy.local (Marketing Manager)');
    console.log('2. Priya Sharma - priya.sharma@primeacademy.local (HR Executive)');
    console.log('3. Amit Patel - amit.patel@primeacademy.local (Senior Software Developer)');
    console.log('\nPassword for all: Employee@123');
    console.log('\nNote: Documents (photo, PAN card, Aadhar card, etc.) are left empty as requested.');
  } catch (error) {
    logger.error('Error creating dummy employees:', error);
    console.error('❌ Failed to create dummy employees:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createThreeDummyEmployees()
    .then(() => {
      console.log('\nScript completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nScript failed:', error);
      process.exit(1);
    });
}

export default createThreeDummyEmployees;



