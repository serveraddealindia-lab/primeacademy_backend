// For testing purposes, we'll use require syntax
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
    logging: false
  }
);

// Function to check day matching (similar to what's in the backend)
function checkDayMatching(studentSchedule, batchSchedule) {
  try {
    // Extract day names from student schedule
    let studentDays = [];
    if (Array.isArray(studentSchedule)) {
      studentDays = studentSchedule.map(item => item.day).filter(day => day);
    } else if (typeof studentSchedule === 'object' && studentSchedule !== null) {
      studentDays = Object.keys(studentSchedule).filter(day => 
        studentSchedule[day].startTime && studentSchedule[day].endTime
      );
    }
    
    // Extract day names from batch schedule
    let batchDays = [];
    if (Array.isArray(batchSchedule)) {
      batchDays = batchSchedule.map(item => item.day).filter(day => day);
    } else if (typeof batchSchedule === 'object' && batchSchedule !== null) {
      batchDays = Object.keys(batchSchedule).filter(day => 
        batchSchedule[day].startTime && batchSchedule[day].endTime
      );
    }
    
    // Convert to lowercase for case-insensitive comparison
    studentDays = studentDays.map(day => day.toLowerCase());
    batchDays = batchDays.map(day => day.toLowerCase());
    
    console.log('Student days:', studentDays);
    console.log('Batch days:', batchDays);
    
    // Check if there's at least one matching day
    const hasMatchingDay = studentDays.some(studentDay => 
      batchDays.includes(studentDay)
    );
    
    console.log('Has matching day:', hasMatchingDay);
    
    return hasMatchingDay;
  } catch (error) {
    console.error('Error in checkDayMatching:', error);
    return true; // Default to true if there's an error (allow the candidate)
  }
}

async function testDayMatching() {
  try {
    console.log('Testing day matching logic...');
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Get Tira's schedule from database
    const [tiraResult] = await sequelize.query(`
      SELECT u.id, u.name, sp.schedule as profile_schedule
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.userId
      WHERE u.name LIKE '%tira%'
    `);
    
    if (tiraResult.length === 0) {
      console.log('Tira not found in database');
      return;
    }
    
    const tira = tiraResult[0];
    console.log(`Found Tira: ID ${tira.id}, Name: ${tira.name}`);
    
    if (!tira.profile_schedule) {
      console.log('Tira has no schedule in profile');
      return;
    }
    
    // Parse Tira's schedule
    let tiraSchedule;
    try {
      tiraSchedule = JSON.parse(tira.profile_schedule);
      console.log('Tira\'s schedule from profile:', tiraSchedule);
    } catch (e) {
      console.log('Could not parse Tira\'s schedule:', tira.profile_schedule);
      return;
    }
    
    // Test with MWF batch schedule
    const mwfBatchSchedule = [
      { day: "Monday", startTime: "09:00", endTime: "11:00" },
      { day: "Wednesday", startTime: "09:00", endTime: "11:00" },
      { day: "Friday", startTime: "09:00", endTime: "11:00" }
    ];
    
    console.log('\n--- Testing MWF Batch ---');
    const hasMatch = checkDayMatching(tiraSchedule, mwfBatchSchedule);
    
    if (hasMatch) {
      console.log('❌ PROBLEM: Tira should NOT match MWF batch (Thursday/Saturday vs Monday/Wednesday/Friday)');
    } else {
      console.log('✅ CORRECT: Tira does NOT match MWF batch (Thursday/Saturday vs Monday/Wednesday/Friday)');
    }
    
    // Test with TTS batch schedule
    const ttsBatchSchedule = [
      { day: "Tuesday", startTime: "09:00", endTime: "11:00" },
      { day: "Thursday", startTime: "09:00", endTime: "11:00" },
      { day: "Saturday", startTime: "09:00", endTime: "11:00" }
    ];
    
    console.log('\n--- Testing TTS Batch ---');
    const hasMatchTTS = checkDayMatching(tiraSchedule, ttsBatchSchedule);
    
    if (hasMatchTTS) {
      console.log('✅ CORRECT: Tira DOES match TTS batch (Thursday/Saturday vs Tuesday/Thursday/Saturday)');
    } else {
      console.log('❌ PROBLEM: Tira should match TTS batch (Thursday/Saturday vs Tuesday/Thursday/Saturday)');
    }

  } catch (error) {
    console.error('Error testing day matching:', error);
  } finally {
    await sequelize.close();
  }
}

testDayMatching();