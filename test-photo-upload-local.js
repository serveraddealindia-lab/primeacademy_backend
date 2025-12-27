/**
 * Photo Upload Local Testing Script
 * Run this in browser console after logging in
 */

console.log('=== PHOTO UPLOAD LOCAL TEST ===\n');

// Test 1: Check Authentication
console.log('1. Checking Authentication...');
const token = localStorage.getItem('token');
if (!token) {
  console.error('❌ No token found! Please login first.');
} else {
  console.log('✅ Token found:', token.substring(0, 20) + '...');
}

// Test 2: Check Upload Endpoint
console.log('\n2. Testing Upload Endpoint...');
fetch('http://localhost:3001/api/upload', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => {
  if (data.status === 'success') {
    console.log('✅ Upload endpoint is accessible');
    console.log('   Response:', data);
  } else {
    console.error('❌ Upload endpoint error:', data);
  }
})
.catch(err => {
  console.error('❌ Cannot connect to upload endpoint:', err.message);
  console.error('   Make sure backend is running on http://localhost:3001');
});

// Test 3: Check Static File Serving
console.log('\n3. Testing Static File Serving...');
fetch('http://localhost:3001/uploads/test')
.then(r => r.json())
.then(data => {
  if (data.status === 'success') {
    console.log('✅ Static file serving is working');
    console.log('   Uploads path:', data.uploadsPath);
    console.log('   General dir exists:', data.exists);
  } else {
    console.error('❌ Static file serving error:', data);
  }
})
.catch(err => {
  console.error('❌ Cannot connect to static serving:', err.message);
});

// Test 4: Test URL Construction
console.log('\n4. Testing URL Construction...');
// Import getImageUrl if available (or test manually)
const testRelativeUrl = '/uploads/general/test.jpg';
console.log('   Input URL:', testRelativeUrl);

// Manual URL construction (matching getImageUrl logic)
const apiBase = 'http://localhost:3001/api';
const baseUrl = apiBase.replace('/api', '').replace(/\/$/, '');
const fullUrl = `${baseUrl}${testRelativeUrl}`;
console.log('   Expected full URL:', fullUrl);
console.log('   Should be: http://localhost:3001/uploads/general/test.jpg');

if (fullUrl === 'http://localhost:3001/uploads/general/test.jpg') {
  console.log('✅ URL construction is correct');
} else {
  console.error('❌ URL construction is wrong!');
}

// Test 5: Check Axios Configuration
console.log('\n5. Checking Axios Configuration...');
console.log('   Base URL should be: http://localhost:3001/api');
console.log('   Check Network tab when uploading to verify');

// Test 6: Instructions
console.log('\n=== NEXT STEPS ===');
console.log('1. Open DevTools → Network tab');
console.log('2. Try uploading a photo');
console.log('3. Check for:');
console.log('   - POST http://localhost:3001/api/upload → Should be 200');
console.log('   - GET http://localhost:3001/uploads/general/... → Should be 200');
console.log('4. Check backend console logs for:');
console.log('   - "Serving uploads from: ..."');
console.log('   - "File uploaded: ..."');
console.log('   - "File saved to: ..."');
console.log('   - "Final URL: ..."');

