import { QueryInterface, Op, QueryTypes } from 'sequelize';
import bcrypt from 'bcrypt';

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    try {
      console.log('\n=== Starting Demo Data Seeder ===\n');
      const saltRounds = 10;
      const defaultPassword = 'password123';
      const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
      const now = new Date();

    // ============================================
    // 1. Create 5 Employees
    // ============================================
    const employees = [
      {
        name: 'John Employee',
        email: 'employee1@primeacademy.com',
        phone: '+1234567900',
        role: 'employee',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Sarah Employee',
        email: 'employee2@primeacademy.com',
        phone: '+1234567901',
        role: 'employee',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Mike Employee',
        email: 'employee3@primeacademy.com',
        phone: '+1234567902',
        role: 'employee',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Emily Employee',
        email: 'employee4@primeacademy.com',
        phone: '+1234567903',
        role: 'employee',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'David Employee',
        email: 'employee5@primeacademy.com',
        phone: '+1234567904',
        role: 'employee',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Insert employees
    const employeeEmails = employees.map(e => e.email);
    const employeePlaceholders = employeeEmails.map(() => '?').join(',');
    const [existingEmployees] = await queryInterface.sequelize.query(
      `SELECT email FROM users WHERE email IN (${employeePlaceholders})`,
      {
        replacements: employeeEmails,
        type: QueryTypes.SELECT,
      }
    );

    const existingEmployeeEmails = new Set(
      Array.isArray(existingEmployees) ? existingEmployees.map((e: any) => e.email) : []
    );
    const employeesToInsert = employees.filter(e => !existingEmployeeEmails.has(e.email));

    let employeeUserIds: number[] = [];
    if (employeesToInsert.length > 0) {
      await queryInterface.bulkInsert('users', employeesToInsert);
      console.log(`✓ Inserted ${employeesToInsert.length} employee(s)`);

      // Get the inserted employee IDs
      const [insertedEmployees] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email IN (${employeePlaceholders})`,
        {
          replacements: employeeEmails,
          type: QueryTypes.SELECT,
        }
      );
      employeeUserIds = Array.isArray(insertedEmployees)
        ? insertedEmployees.map((e: any) => e.id)
        : [];
    } else {
      // Get existing employee IDs
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email IN (${employeePlaceholders})`,
        {
          replacements: employeeEmails,
          type: QueryTypes.SELECT,
        }
      );
      employeeUserIds = Array.isArray(existing) ? existing.map((e: any) => e.id) : [];
      console.log(`✓ ${employeesToInsert.length === 0 ? 'All' : 'Some'} employees already exist`);
    }

    // Create employee profiles
    const employeeProfiles = employeeUserIds.map((userId, index) => ({
      userId,
      employeeId: `EMP${String(userId).padStart(4, '0')}`,
      department: ['HR', 'IT', 'Finance', 'Operations', 'Marketing'][index],
      designation: ['HR Manager', 'IT Support', 'Accountant', 'Operations Manager', 'Marketing Specialist'][index],
      dateOfJoining: new Date(2024, 0, 1 + index * 10),
      employmentType: 'Full-Time',
      createdAt: now,
      updatedAt: now,
    }));

    if (employeeProfiles.length > 0) {
      try {
        await queryInterface.bulkInsert('employee_profiles', employeeProfiles);
        console.log(`✓ Created ${employeeProfiles.length} employee profile(s)`);
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠ Some employee profiles already exist, skipping duplicates`);
        } else {
          throw error;
        }
      }
    }

    // ============================================
    // 2. Create 5 Faculty
    // ============================================
    const faculty = [
      {
        name: 'Dr. Alice Faculty',
        email: 'faculty3@primeacademy.com',
        phone: '+1234567896',
        role: 'faculty',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Prof. Bob Faculty',
        email: 'faculty4@primeacademy.com',
        phone: '+1234567897',
        role: 'faculty',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Dr. Carol Faculty',
        email: 'faculty5@primeacademy.com',
        phone: '+1234567898',
        role: 'faculty',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Prof. Daniel Faculty',
        email: 'faculty6@primeacademy.com',
        phone: '+1234567899',
        role: 'faculty',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Dr. Eva Faculty',
        email: 'faculty7@primeacademy.com',
        phone: '+1234567905',
        role: 'faculty',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const facultyEmails = faculty.map(f => f.email);
    const facultyPlaceholders = facultyEmails.map(() => '?').join(',');
    const [existingFaculty] = await queryInterface.sequelize.query(
      `SELECT email FROM users WHERE email IN (${facultyPlaceholders})`,
      {
        replacements: facultyEmails,
        type: QueryTypes.SELECT,
      }
    );

    const existingFacultyEmails = new Set(
      Array.isArray(existingFaculty) ? existingFaculty.map((f: any) => f.email) : []
    );
    const facultyToInsert = faculty.filter(f => !existingFacultyEmails.has(f.email));

    let facultyUserIds: number[] = [];
    if (facultyToInsert.length > 0) {
      await queryInterface.bulkInsert('users', facultyToInsert);
      console.log(`✓ Inserted ${facultyToInsert.length} faculty member(s)`);

      const [insertedFaculty] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email IN (${facultyPlaceholders})`,
        {
          replacements: facultyEmails,
          type: QueryTypes.SELECT,
        }
      );
      facultyUserIds = Array.isArray(insertedFaculty) ? insertedFaculty.map((f: any) => f.id) : [];
    } else {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email IN (${facultyPlaceholders})`,
        {
          replacements: facultyEmails,
          type: QueryTypes.SELECT,
        }
      );
      facultyUserIds = Array.isArray(existing) ? existing.map((f: any) => f.id) : [];
      console.log(`✓ ${facultyToInsert.length === 0 ? 'All' : 'Some'} faculty already exist`);
    }

    // Create faculty profiles
    const softwareList = [
      ['Photoshop', 'Illustrator', 'InDesign'],
      ['AutoCAD', 'SketchUp', 'Revit'],
      ['Premiere Pro', 'After Effects', 'DaVinci Resolve'],
      ['Blender', 'Maya', '3ds Max'],
      ['Figma', 'Adobe XD', 'Sketch'],
    ];

    const facultyProfiles = facultyUserIds.map((userId, index) => ({
      userId,
      expertise: JSON.stringify({
        software: softwareList[index],
        specializations: ['Digital Art', 'Architecture', 'Video Editing', '3D Animation', 'UI/UX Design'][index],
      }),
      availability: JSON.stringify({
        days: ['Monday', 'Wednesday', 'Friday'],
        timeSlots: ['10:00-12:00', '14:00-16:00'],
      }),
      createdAt: now,
      updatedAt: now,
    }));

    if (facultyProfiles.length > 0) {
      try {
        await queryInterface.bulkInsert('faculty_profiles', facultyProfiles);
        console.log(`✓ Created ${facultyProfiles.length} faculty profile(s)`);
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠ Some faculty profiles already exist, skipping duplicates`);
        } else {
          throw error;
        }
      }
    }

    // ============================================
    // 3. Create 5 Students
    // ============================================
    const students = [
      {
        name: 'Alex Student',
        email: 'student3@primeacademy.com',
        phone: '+1234567896',
        role: 'student',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Maria Student',
        email: 'student4@primeacademy.com',
        phone: '+1234567897',
        role: 'student',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'James Student',
        email: 'student5@primeacademy.com',
        phone: '+1234567898',
        role: 'student',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Lisa Student',
        email: 'student6@primeacademy.com',
        phone: '+1234567899',
        role: 'student',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Tom Student',
        email: 'student7@primeacademy.com',
        phone: '+1234567906',
        role: 'student',
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const studentEmails = students.map(s => s.email);
    const studentPlaceholders = studentEmails.map(() => '?').join(',');
    const [existingStudents] = await queryInterface.sequelize.query(
      `SELECT email FROM users WHERE email IN (${studentPlaceholders})`,
      {
        replacements: studentEmails,
        type: QueryTypes.SELECT,
      }
    );

    const existingStudentEmails = new Set(
      Array.isArray(existingStudents) ? existingStudents.map((s: any) => s.email) : []
    );
    const studentsToInsert = students.filter(s => !existingStudentEmails.has(s.email));

    let studentUserIds: number[] = [];
    if (studentsToInsert.length > 0) {
      await queryInterface.bulkInsert('users', studentsToInsert);
      console.log(`✓ Inserted ${studentsToInsert.length} student(s)`);

      const [insertedStudents] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email IN (${studentPlaceholders})`,
        {
          replacements: studentEmails,
          type: QueryTypes.SELECT,
        }
      );
      studentUserIds = Array.isArray(insertedStudents) ? insertedStudents.map((s: any) => s.id) : [];
    } else {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email IN (${studentPlaceholders})`,
        {
          replacements: studentEmails,
          type: QueryTypes.SELECT,
        }
      );
      studentUserIds = Array.isArray(existing) ? existing.map((s: any) => s.id) : [];
      console.log(`✓ ${studentsToInsert.length === 0 ? 'All' : 'Some'} students already exist`);
    }

    // Create student profiles
    const studentProfiles = studentUserIds.map((userId, index) => ({
      userId,
      enrollmentDate: new Date(2024, 0, 15 + index * 5),
      softwareList: JSON.stringify(softwareList[index]),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }));

    if (studentProfiles.length > 0) {
      try {
        await queryInterface.bulkInsert('student_profiles', studentProfiles);
        console.log(`✓ Created ${studentProfiles.length} student profile(s)`);
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠ Some student profiles already exist, skipping duplicates`);
        } else {
          throw error;
        }
      }
    }

    // ============================================
    // 4. Get Admin User ID for creating batches
    // ============================================
    const [adminResult] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'admin@primeacademy.com' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );
    const adminId = adminResult && typeof adminResult === 'object' && 'id' in adminResult
      ? (adminResult as any).id
      : 2; // Fallback to ID 2

    // ============================================
    // 5. Create 5 Batches
    // ============================================
    const batchTitles = [
      'Digital Art Fundamentals - Batch 1',
      'Architecture & Design - Batch 1',
      'Video Production Masterclass - Batch 1',
      '3D Animation & Modeling - Batch 1',
      'UI/UX Design Bootcamp - Batch 1',
    ];

    const batchSoftware = [
      'Photoshop, Illustrator, InDesign',
      'AutoCAD, SketchUp, Revit',
      'Premiere Pro, After Effects, DaVinci Resolve',
      'Blender, Maya, 3ds Max',
      'Figma, Adobe XD, Sketch',
    ];

    const batches = batchTitles.map((title, index) => {
      const startDate = new Date(2024, 2, 1 + index * 7); // March 1, 8, 15, 22, 29
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 3); // 3 months duration

      return {
        title,
        software: batchSoftware[index],
        mode: index % 2 === 0 ? 'online' : 'offline',
        startDate,
        endDate,
        maxCapacity: 25 + index * 5,
        schedule: JSON.stringify({
          days: ['Monday', 'Wednesday', 'Friday'],
          timeSlots: [
            {
              startTime: '10:00',
              endTime: '12:00',
              durationMinutes: 120,
            },
            {
              startTime: '14:00',
              endTime: '16:00',
              durationMinutes: 120,
            },
          ],
        }),
        createdByAdminId: adminId,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
    });

    try {
      await queryInterface.bulkInsert('batches', batches);
      console.log(`✓ Created ${batches.length} batch(es)`);
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
        console.log(`⚠ Some batches already exist, skipping duplicates`);
      } else {
        throw error;
      }
    }

    // Get batch IDs (get all batches and filter by titles)
    const [batchResults] = await queryInterface.sequelize.query(
      `SELECT id FROM batches WHERE title IN (${batchTitles.map(() => '?').join(',')}) ORDER BY createdAt DESC LIMIT 5`,
      {
        replacements: batchTitles,
        type: QueryTypes.SELECT,
      }
    );
    const batchIds = Array.isArray(batchResults) && batchResults.length > 0
      ? batchResults.map((b: any) => b.id)
      : [];
    
    if (batchIds.length === 0) {
      console.log('⚠ Warning: No batches found. Enrollments and sessions will be skipped.');
    }

    // ============================================
    // 6. Create Enrollments (students in batches)
    // ============================================
    if (batchIds.length > 0 && studentUserIds.length > 0) {
      const enrollments = [];
      for (let i = 0; i < studentUserIds.length; i++) {
        const batchId = batchIds[i % batchIds.length];
        enrollments.push({
          studentId: studentUserIds[i],
          batchId,
          enrollmentDate: new Date(2024, 1, 15 + i * 3),
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
      }

      if (enrollments.length > 0) {
        try {
          await queryInterface.bulkInsert('enrollments', enrollments);
          console.log(`✓ Created ${enrollments.length} enrollment(s)`);
        } catch (error: any) {
          if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
            console.log(`⚠ Some enrollments already exist, skipping duplicates`);
          } else {
            throw error;
          }
        }
      }
    } else {
      console.log('⚠ Skipping enrollments: No batches or students available');
    }

    // ============================================
    // 7. Create Some Sessions for Batches
    // ============================================
    if (batchIds.length > 0 && facultyUserIds.length > 0) {
      const sessions = [];
      for (let batchIndex = 0; batchIndex < batchIds.length; batchIndex++) {
        const batchId = batchIds[batchIndex];
        const facultyId = facultyUserIds[batchIndex % facultyUserIds.length];
        const startDate = new Date(2024, 2, 1 + batchIndex * 7);

        // Create 10 sessions per batch
        for (let sessionIndex = 0; sessionIndex < 10; sessionIndex++) {
          const sessionDate = new Date(startDate);
          sessionDate.setDate(sessionDate.getDate() + sessionIndex * 3); // Every 3 days

          sessions.push({
            batchId,
            facultyId,
            date: sessionDate,
            startTime: '10:00:00',
            endTime: '12:00:00',
            topic: `Session ${sessionIndex + 1}: ${batchTitles[batchIndex].split(' - ')[0]}`,
            isBackup: false,
            status: sessionIndex < 3 ? 'completed' : sessionIndex < 5 ? 'ongoing' : 'scheduled',
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      if (sessions.length > 0) {
        try {
          await queryInterface.bulkInsert('sessions', sessions);
          console.log(`✓ Created ${sessions.length} session(s)`);
        } catch (error: any) {
          if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
            console.log(`⚠ Some sessions already exist, skipping duplicates`);
          } else {
            throw error;
          }
        }
      }
    } else {
      console.log('⚠ Skipping sessions: No batches or faculty available');
    }

      console.log('\n=== Demo Data Seeding Complete ===');
      console.log('\n=== Login Credentials (Password: password123) ===');
      console.log('\nEmployees:');
      employees.forEach((emp, i) => {
        console.log(`  ${i + 1}. ${emp.name} - ${emp.email}`);
      });
      console.log('\nFaculty:');
      faculty.forEach((fac, i) => {
        console.log(`  ${i + 1}. ${fac.name} - ${fac.email}`);
      });
      console.log('\nStudents:');
      students.forEach((stu, i) => {
        console.log(`  ${i + 1}. ${stu.name} - ${stu.email}`);
      });
      console.log('\nBatches Created:');
      batchTitles.forEach((title, i) => {
        console.log(`  ${i + 1}. ${title}`);
      });
      console.log('\n✓ All demo data seeded successfully!');
    } catch (error: any) {
      console.error('\n✗ Error seeding demo data:', error);
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    // Remove demo data
    const demoEmails = [
      // Employees
      'employee1@primeacademy.com',
      'employee2@primeacademy.com',
      'employee3@primeacademy.com',
      'employee4@primeacademy.com',
      'employee5@primeacademy.com',
      // Faculty
      'faculty3@primeacademy.com',
      'faculty4@primeacademy.com',
      'faculty5@primeacademy.com',
      'faculty6@primeacademy.com',
      'faculty7@primeacademy.com',
      // Students
      'student3@primeacademy.com',
      'student4@primeacademy.com',
      'student5@primeacademy.com',
      'student6@primeacademy.com',
      'student7@primeacademy.com',
    ];

    await queryInterface.bulkDelete('users', {
      email: {
        [Op.in]: demoEmails,
      },
    });

    await queryInterface.bulkDelete('batches', {
      title: {
        [Op.like]: '%Batch 1%',
      },
    });

    console.log('✓ Removed demo data');
  },
};

