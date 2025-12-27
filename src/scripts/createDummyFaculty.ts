import * as bcrypt from 'bcrypt';
import db from '../models';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

async function createDummyFaculty() {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Check if faculty already exists
    const existingFaculty = await db.User.findOne({
      where: { email: 'prof.john.smith@primeacademy.local' },
      transaction,
    });

    if (existingFaculty) {
      console.log('Dummy faculty already exists with email: prof.john.smith@primeacademy.local');
      await transaction.rollback();
      return;
    }

    // Hash password
    const password = 'Faculty@123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await db.User.create(
      {
        name: 'Prof. John Smith',
        email: 'prof.john.smith@primeacademy.local',
        phone: '+1234567890',
        role: UserRole.FACULTY,
        passwordHash,
        isActive: true,
        avatarUrl: 'https://ui-avatars.com/api/?name=John+Smith&background=orange&color=fff&size=200',
      },
      { transaction }
    );

    console.log(`Created user with ID: ${user.id}`);

    // Create faculty profile with all details except documents
    if (db.FacultyProfile) {
      const facultyProfile = await db.FacultyProfile.create(
        {
          userId: user.id,
          expertise: {
            description: 'Expert in Graphic Design, Digital Art, and Visual Communication with over 10 years of experience. Specialized in Adobe Creative Suite, UI/UX Design, Brand Identity, and Print Design.',
            specializations: [
              'Graphic Design',
              'Digital Art',
              'UI/UX Design',
              'Brand Identity',
              'Print Design',
              'Typography',
              'Logo Design'
            ],
            yearsOfExperience: 10,
            certifications: [
              'Adobe Certified Expert (ACE)',
              'Certified Graphic Designer',
              'UI/UX Design Professional'
            ],
            education: 'MFA in Graphic Design from Art Institute',
            achievements: [
              'Award-winning designer with 50+ projects',
              'Published in Design Magazine',
              'Guest lecturer at design conferences'
            ],
            softwareProficiency: [
              'Photoshop',
              'Illustrator',
              'InDesign',
              'Figma',
              'Adobe XD',
              'Sketch',
              'After Effects',
              'Premiere Pro',
              'CorelDRAW',
              'Canva Pro'
            ]
          },
          availability: {
            schedule: 'Monday-Friday, 9:00 AM - 6:00 PM',
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            timeSlots: [
              {
                day: 'Monday',
                startTime: '09:00',
                endTime: '12:00',
                type: 'Morning Session'
              },
              {
                day: 'Monday',
                startTime: '14:00',
                endTime: '18:00',
                type: 'Afternoon Session'
              },
              {
                day: 'Wednesday',
                startTime: '09:00',
                endTime: '12:00',
                type: 'Morning Session'
              },
              {
                day: 'Wednesday',
                startTime: '14:00',
                endTime: '18:00',
                type: 'Afternoon Session'
              },
              {
                day: 'Friday',
                startTime: '09:00',
                endTime: '12:00',
                type: 'Morning Session'
              }
            ],
            preferredMode: 'Both Online and Offline',
            timezone: 'IST (Indian Standard Time)',
            flexibleHours: true,
            notes: 'Available for both online and offline classes. Can adjust schedule for special workshops.'
          }
        },
        { transaction }
      );

      console.log(`Created faculty profile with ID: ${facultyProfile.id}`);
    }

    await transaction.commit();
    console.log('\n✅ Dummy faculty created successfully!');
    console.log(`\nFaculty Details:`);
    console.log(`- Name: Prof. John Smith`);
    console.log(`- Email: prof.john.smith@primeacademy.local`);
    console.log(`- Phone: +1234567890`);
    console.log(`- Password: ${password}`);
    console.log(`- User ID: ${user.id}`);
    console.log(`- Role: Faculty`);
    console.log(`\nExpertise: Graphic Design, Digital Art, UI/UX Design`);
    console.log(`Availability: Monday-Friday, 9:00 AM - 6:00 PM`);
    console.log(`Software Proficiency: Photoshop, Illustrator, InDesign, Figma, Adobe XD, and more`);
    console.log(`\nNote: All profile details are included except document uploads (personal info, employment info, bank info, emergency contact).`);
    console.log(`\nYou can now use this faculty to test the system.`);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating dummy faculty:', error);
    console.error('❌ Failed to create dummy faculty:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createDummyFaculty()
    .then(() => {
      console.log('\nScript completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nScript failed:', error);
      process.exit(1);
    });
}

export default createDummyFaculty;

