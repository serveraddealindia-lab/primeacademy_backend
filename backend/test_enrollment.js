const axios = require('axios');

// Test the enrollment endpoint
async function testEnrollment() {
  try {
    console.log('Testing enrollment endpoint...');
    
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
      const response1 = await axios.post('http://localhost:3002/api/students/enroll', test1, {
        headers: {
          'Content-Type': 'application/json'
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
      const response2 = await axios.post('http://localhost:3002/api/students/enroll', test2, {
        headers: {
          'Content-Type': 'application/json'
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
      const response3 = await axios.post('http://localhost:3002/api/students/enroll', test3, {
        headers: {
          'Content-Type': 'application/json'
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