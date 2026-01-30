const { Sequelize } = require('sequelize');

// Load environment variables
require('dotenv').config();

// Create database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'primeacademy_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false // Set to console.log to see SQL queries
  }
);

async function updateTiraSchedule() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Find Tira's user ID
    const [users] = await sequelize.query(
      "SELECT id, name FROM users WHERE name LIKE '%Tira%' AND role = 'student'"
    );
    
    if (users.length === 0) {
      console.log('No user found with name containing "Tira"');
      
      // Show all students to help identify the correct name
      const [allStudents] = await sequelize.query(
        "SELECT id, name FROM users WHERE role = 'student' LIMIT 20"
      );
      console.log('Available students:');
      allStudents.forEach(student => {
        console.log(`ID: ${student.id}, Name: ${student.name}`);
      });
      return;
    }

    const tiraUser = users[0];
    console.log(`Found user: ID ${tiraUser.id}, Name: ${tiraUser.name}`);

    // Define the schedule for Thursday and Saturday
    const schedule = [
      { day: "Thursday", startTime: "09:00", endTime: "11:00" },
      { day: "Saturday", startTime: "09:00", endTime: "11:00" }
    ];

    // Update or create student profile with schedule
    const scheduleJson = JSON.stringify(schedule);
    
    // First, check if student profile exists
    const [existingProfile] = await sequelize.query(
      "SELECT id FROM student_profiles WHERE userId = ?",
      { replacements: [tiraUser.id] }
    );

    if (existingProfile.length > 0) {
      // Update existing profile
      await sequelize.query(
        "UPDATE student_profiles SET schedule = ? WHERE userId = ?",
        { replacements: [scheduleJson, tiraUser.id] }
      );
      console.log(`Updated schedule for student ${tiraUser.name} (ID: ${tiraUser.id})`);
    } else {
      // Create new profile
      await sequelize.query(
        "INSERT INTO student_profiles (userId, schedule, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())",
        { replacements: [tiraUser.id, scheduleJson] }
      );
      console.log(`Created profile with schedule for student ${tiraUser.name} (ID: ${tiraUser.id})`);
    }

    console.log('Schedule updated successfully!');
    console.log('Tira now has Thursday and Saturday schedule.');
    console.log('When suggesting for MWF batches, Tira should not appear due to day mismatch.');

  } catch (error) {
    console.error('Error updating Tira\'s schedule:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the function
updateTiraSchedule();