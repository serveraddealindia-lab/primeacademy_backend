import { QueryInterface } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    const courses = [
      {
        name: 'Graphics Beginner',
        software: JSON.stringify(['Photoshop', 'Illustrator', 'Indesign']),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Graphics Advance',
        software: JSON.stringify(['Photoshop', 'Illustrator', 'Indesign', 'Corel Draw', 'Figma']),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Video Editing',
        software: JSON.stringify(['Premiere', 'Audition']),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Motion Graphics Beginner',
        software: JSON.stringify(['Photoshop', 'Premiere', 'Audition']),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Motion Graphics Advance',
        software: JSON.stringify(['Photoshop', 'Premiere', 'Audition', 'Aftereffects']),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Prime Digital Career',
        software: JSON.stringify(['Photoshop', 'Illustrator', 'Indesign', 'Corel Draw', 'Figma', 'Premiere', 'Audition', 'Aftereffects']),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Architecture Basic',
        software: JSON.stringify(['3ds Max (AR)', 'V-ray']),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Architecture Animation Advance',
        software: JSON.stringify(['3ds Max (AR)', 'V-ray', 'Sketchup', 'Lumion', 'Autocad']),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Insert courses, ignoring duplicates
    for (const course of courses) {
      try {
        await queryInterface.bulkInsert('courses', [course]);
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
          console.log(`Course "${course.name}" already exists, skipping`);
        } else {
          throw error;
        }
      }
    }

    console.log(`✓ Seeded ${courses.length} courses`);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.bulkDelete('courses', {}, {});
  },
};



