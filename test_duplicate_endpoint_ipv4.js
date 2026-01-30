const axios = require('axios');

async function testDuplicateEndpoint() {
  try {
    // First, login to get auth token
    const loginResponse = await axios.post('http://127.0.0.1:3001/api/auth/login', {
      email: 'admin@primeacademy.com',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('Login successful, token received');
    
    // Test the duplicate check endpoint
    const duplicateResponse = await axios.get('http://127.0.0.1:3001/api/students/check-duplicate?email=test@example.com&phone=1234567890', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Duplicate check response:', duplicateResponse.data);
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testDuplicateEndpoint();