const axios = require('axios');

const AI_MICROSERVICE_URL = 'http://localhost:8002';

async function testFormAuth() {
  try {
    console.log('🔍 Testing with form-encoded authentication...');
    
    const credentials = [
      { username: 'admin', password: 'password123' },
      { username: 'admin', password: 'admin' },
      { username: 'test', password: 'test' }
    ];
    
    for (const cred of credentials) {
      try {
        console.log(`🔄 Trying ${cred.username}:${cred.password} (form-encoded)...`);
        
        const formData = new URLSearchParams();
        formData.append('grant_type', 'password');
        formData.append('username', cred.username);
        formData.append('password', cred.password);
        
        const tokenResponse = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        return { username: cred.username, password: cred.password };
        
      } catch (e) {
        console.log(`❌ Failed: ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
      }
    }
    
    // Try without credentials (maybe it's open)
    try {
      console.log('🔄 Trying without authentication...');
      const response = await axios.post(`${AI_MICROSERVICE_URL}/performance`, {
        users: [{ role: 'GESTIONNAIRE' }]
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ No auth needed:', response.data);
      return null;
    } catch (e) {
      console.log('❌ No auth failed:', e.response?.status);
    }
    
    console.log('❌ All authentication methods failed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFormAuth().then(result => {
  if (result) {
    console.log('🎉 Working credentials:', result);
  }
});