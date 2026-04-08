const axios = require('axios');

async function testTaskRoutes() {
  const baseURL = 'http://localhost:3001/api';
  
  console.log('Testing Task Routes...\n');
  
  // Test 1: Try to create a task (will fail without auth, but should give us info about route existence)
  try {
    console.log('Test 1: POST /tasks/create (without auth - expecting 401)');
    await axios.post(`${baseURL}/tasks/create`, {
      subject: 'Test',
      date: '2024-01-01',
      startTime: '10:00',
      studentIds: [1]
    });
  } catch (error) {
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Message: ${error.response.data?.message || 'No message'}`);
      if (error.response.status === 401) {
        console.log('  ✓ Route exists (auth required)\n');
      } else if (error.response.status === 404) {
        console.log('  ✗ Route NOT FOUND\n');
      }
    } else {
      console.log(`  Error: ${error.message}\n`);
    }
  }
  
  // Test 2: Try faculty dashboard
  try {
    console.log('Test 2: GET /tasks/faculty-dashboard (without auth - expecting 401)');
    await axios.get(`${baseURL}/tasks/faculty-dashboard`);
  } catch (error) {
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Message: ${error.response.data?.message || 'No message'}`);
      if (error.response.status === 401) {
        console.log('  ✓ Route exists (auth required)\n');
      } else if (error.response.status === 404) {
        console.log('  ✗ Route NOT FOUND\n');
      }
    } else {
      console.log(`  Error: ${error.message}\n`);
    }
  }
}

testTaskRoutes();
