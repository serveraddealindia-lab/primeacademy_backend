// Quick diagnostic script to check login issues
require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function checkLogin() {
  console.log('🔍 Checking Login Configuration...\n');
  
  // 1. Check environment variables
  console.log('1. Environment Variables:');
  console.log('   DB_HOST:', process.env.DB_HOST || 'localhost (default)');
  console.log('   DB_PORT:', process.env.DB_PORT || '3306 (default)');
  console.log('   DB_NAME:', process.env.DB_NAME || 'primeacademy_db (default)');
  console.log('   DB_USER:', process.env.DB_USER || 'root (default)');
  console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : '⚠️  NOT SET (empty)');
  console.log('   PORT:', process.env.PORT || '3000 (default)');
  console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '***SET***' : '⚠️  NOT SET');
  console.log('');
  
  // 2. Check if backend is running
  console.log('2. Backend Server Status:');
  try {
    const healthCheck = await axios.get(`${API_BASE.replace('/api', '')}/health`, { timeout: 3000 });
    console.log('   ✅ Backend is running');
    console.log('   Status:', healthCheck.data);
  } catch (error) {
    console.log('   ❌ Backend is NOT running or not accessible');
    console.log('   Error:', error.message);
    console.log('   💡 Start backend with: cd backend && npm run dev');
  }
  console.log('');
  
  // 3. Test login endpoint
  console.log('3. Login Endpoint Test:');
  try {
    const testLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'test123'
    }, { validateStatus: () => true });
    
    if (testLogin.status === 200) {
      console.log('   ✅ Login endpoint is working');
    } else if (testLogin.status === 401) {
      console.log('   ✅ Login endpoint is accessible (authentication failed as expected)');
      console.log('   Response:', testLogin.data.message);
    } else {
      console.log('   ⚠️  Login endpoint returned:', testLogin.status);
      console.log('   Response:', testLogin.data);
    }
  } catch (error) {
    console.log('   ❌ Cannot reach login endpoint');
    console.log('   Error:', error.message);
  }
  console.log('');
  
  // 4. Recommendations
  console.log('4. Recommendations:');
  if (!process.env.DB_PASSWORD) {
    console.log('   ⚠️  Set DB_PASSWORD in backend/.env file');
    console.log('      If MySQL has no password, leave it empty but ensure MySQL allows it');
  }
  if (!process.env.JWT_SECRET) {
    console.log('   ⚠️  Set JWT_SECRET in backend/.env file');
    console.log('      Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  console.log('');
  console.log('📝 See FIX_LOCAL_LOGIN.md for detailed troubleshooting steps');
}

checkLogin().catch(console.error);













