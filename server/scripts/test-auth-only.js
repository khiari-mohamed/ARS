const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function testAuth() {
  console.log('🔐 Testing authentication...');
  console.log('API URL:', API_URL);
  console.log('Credentials: super@mail.com / Azerty123@\n');

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'super@mail.com',
        password: 'Azerty123@'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const text = await response.text();
    console.log('Response body:', text);

    if (response.ok) {
      console.log('\n✅ Authentication successful!');
      const data = JSON.parse(text);
      console.log('Token:', data.access_token || data.token);
    } else {
      console.log('\n❌ Authentication failed!');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n⚠️  Is the server running? Check with: npm run start:dev');
  }
}

testAuth();
