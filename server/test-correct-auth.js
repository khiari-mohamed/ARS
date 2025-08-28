const axios = require('axios');

const AI_MICROSERVICE_URL = 'http://localhost:8002';

async function testCorrectAuth() {
  try {
    console.log('🔍 Testing with default credentials...');
    
    // Try common default credentials
    const credentials = [
      { username: 'admin', password: 'password123' },
      { username: 'admin', password: 'admin123' },
      { username: 'admin', password: 'secret' },
      { username: 'user', password: 'password' },
      { username: 'test', password: 'test' },
      { username: 'ars', password: 'ars123' }
    ];
    
    for (const cred of credentials) {
      try {
        console.log(`🔄 Trying ${cred.username}:${cred.password}...`);
        
        const tokenResponse = await axios.post(`${AI_MICROSERVICE_URL}/token`, {
          grant_type: 'password',
          username: cred.username,
          password: cred.password
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Token success:', tokenResponse.data);
        
        // Test performance endpoint
        const perfResponse = await axios.post(`${AI_MICROSERVICE_URL}/performance`, {
          users: [{ role: 'GESTIONNAIRE' }]
        }, {
          headers: {
            'Authorization': `Bearer ${tokenResponse.data.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Performance success:', perfResponse.data);
        return;
        
      } catch (e) {
        console.log(`❌ Failed: ${e.response?.status} - ${e.response?.data?.detail}`);
      }
    }
    
    console.log('❌ All credentials failed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCorrectAuth();