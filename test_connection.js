// Test frontend-backend connection
fetch('http://localhost:3001/api/health')
  .then(response => response.json())
  .then(data => {
    console.log('Backend health check:', data);
    // Test login
    return fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
  })
  .then(response => response.json())
  .then(data => {
    console.log('Login response:', data);
    if (data.status === 'success') {
      console.log('✅ Frontend can successfully connect to backend!');
    } else {
      console.log('❌ Login failed:', data.message);
    }
  })
  .catch(error => {
    console.error('❌ Connection failed:', error);
  });