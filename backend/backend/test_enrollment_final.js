const axios = require('axios');

// Test the enrollment endpoint with authentication
async function testEnrollment() {
  try {
    console.log('Testing enrollment endpoint with authentication...');
    
    // First, try to login or create a test admin user
    console.log('\n--- Attempting to get auth token ---');
    
    // Try to login with default admin credentials (you may need to adjust these)
    let token = null;
    
    try {
      const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
        email: 'admin@example.com',
        password: 'admin123'
      });
      token = loginResponse.data.data.token;
      console.log('✅ Login successful, got token');
    } catch (loginError) {
      console.log('❌ Login failed:', loginError.response?.data?.message || loginError.message);
      console.log('Trying to register admin user...');
      
      // Try to register an admin user
      try {
        const registerResponse = await axios.post('http://localhost:3001/api/auth/register', {
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'admin123',
          role: 'admin',
          phone: '9999999999'
        });
        token = registerResponse.data.data.token;
        console.log('✅ Registration successful, got token');
      } catch (registerError) {
        console.log('❌ Registration failed:', registerError.response?.data?.message || registerError.message);
        console.log('⚠️  Cannot test enrollment without authentication');
        return;
      }
    }
    
    if (!token) {
      console.log('⚠️  No token available, cannot proceed with enrollment tests');
      return;
    }
    
    console.log('\n--- Using token for enrollment tests ---');
    
    // Test 1: Software selected, no course (should be valid)
    console.log('\n--- Test 1: Software selected, no course ---');
    const test1 = {
      email: 'test1@example.com',
      phone: '1234567890',
      fullName: 'Test User 1',
      dateOfBirth: '1990-01-01',
      localAddress: 'Test Address',
      totalDeal: 10000,
      bookingAmount: 1000,
      dateOfAdmission: '2026-12-31', // Future date
      softwaresIncluded: 'Photoshop, Illustrator'
    };
    
    try {
      const response1 = await axios.post('http://localhost:3001/api/students/enroll', test1, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Test 1 PASSED:', response1.data);
    } catch (error) {
      console.log('❌ Test 1 FAILED:', error.response?.data || error.message);
    }
    
    // Test 2: Past date (should fail)
    console.log('\n--- Test 2: Past date ---');
    const test2 = {
      email: 'test2@example.com',
      phone: '1234567891',
      fullName: 'Test User 2',
      dateOfBirth: '1990-01-01',
      localAddress: 'Test Address',
      totalDeal: 10000,
      bookingAmount: 1000,
      dateOfAdmission: '2020-01-01', // Past date
      softwaresIncluded: 'Photoshop'
    };
    
    try {
      const response2 = await axios.post('http://localhost:3001/api/students/enroll', test2, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Test 2 UNEXPECTEDLY PASSED:', response2.data);
    } catch (error) {
      console.log('✅ Test 2 CORRECTLY FAILED:', error.response?.data || error.message);
    }
    
    // Test 3: No course, no software (should fail)
    console.log('\n--- Test 3: No course, no software ---');
    const test3 = {
      email: 'test3@example.com',
      phone: '1234567892',
      fullName: 'Test User 3',
      dateOfBirth: '1990-01-01',
      localAddress: 'Test Address',
      totalDeal: 10000,
      bookingAmount: 1000,
      dateOfAdmission: '2026-12-31'
      // No courseName or softwaresIncluded
    };
    
    try {
      const response3 = await axios.post('http://localhost:3001/api/students/enroll', test3, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Test 3 UNEXPECTEDLY PASSED:', response3.data);
    } catch (error) {
      console.log('✅ Test 3 CORRECTLY FAILED:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testEnrollment();