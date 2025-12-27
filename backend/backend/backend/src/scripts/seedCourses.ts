import sequelize from '../config/database';
import Course from '../models/Course';

const courses = [
  {
    name: 'Graphics Beginner',
    software: ['Photoshop', 'Illustrator', 'Indesign'],
  },
  {
    name: 'Graphics Advance',
    software: ['Photoshop', 'Illustrator', 'Indesign', 'Corel Draw', 'Figma'],
  },
  {
    name: 'Video Editing',
    software: ['Premiere', 'Audition'],
  },
  {
    name: 'Motion Graphics Beginner',
    software: ['Photoshop', 'Premiere', 'Audition'],
  },
  {
    name: 'Motion Graphics Advance',
    software: ['Photoshop', 'Premiere', 'Audition', 'Aftereffects'],
  },
  {
    name: 'Prime Digital Career',
    software: ['Photoshop', 'Illustrator', 'Indesign', 'Corel Draw', 'Figma', 'Premiere', 'Audition', 'Aftereffects'],
  },
  {
    name: 'Architecture Basic',
    software: ['3ds Max (AR)', 'V-ray'],
  },
  {
    name: 'Architecture Animation Advance',
    software: ['3ds Max (AR)', 'V-ray', 'Sketchup', 'Lumion', 'Autocad'],
  },
];

async function seedCourses() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    let created = 0;
    let skipped = 0;

    for (const courseData of courses) {
      try {
        const [course, createdCourse] = await Course.findOrCreate({
          where: { name: courseData.name },
          defaults: {
            name: courseData.name,
            software: courseData.software,
          },
        });

        if (createdCourse) {
          console.log(`✓ Created: ${courseData.name}`);
          created++;
        } else {
          // Update existing course with correct software
          await course.update({ software: courseData.software });
          console.log(`↻ Updated: ${courseData.name}`);
          skipped++;
        }
      } catch (error: any) {
        console.error(`✗ Error with ${courseData.name}:`, error.message);
      }
    }

    console.log(`\n✅ Seeding complete! Created: ${created}, Updated: ${skipped}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding courses:', error);
    process.exit(1);
  }
}

seedCourses();



