const axios = require('axios');

const AI_MICROSERVICE_URL = 'http://localhost:8002';

async function testTokenEndpoint() {
  try {
    console.log('🔍 Testing /token endpoint with different payloads...');
    
    const payloads = [
      { username: 'admin', password: 'admin' },
      { grant_type: 'client_credentials' },
      { client_id: 'ars-backend', client_secret: 'secret' },
      { username: 'ars-user', password: 'ars-password' },
      { grant_type: 'password', username: 'admin', password: 'admin' }
    ];
    
    for (const payload of payloads) {
      try {
        console.log('🔄 Trying payload:', payload);
        
        const response = await axios.post(`${AI_MICROSERVICE_URL}/token`, payload, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        console.log('✅ Token endpoint success:', response.data);
        
        // Test the token
        if (response.data.access_token) {
          console.log('🔑 Testing token with performance endpoint...');
          const perfResponse = await axios.post(`${AI_MICROSERVICE_URL}/performance`, {
            users: [{ role: 'GESTIONNAIRE' }]
          }, {
            headers: {
              'Authorization': `Bearer ${response.data.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('✅ Performance works with token:', perfResponse.data);
        }
        return;
        
      } catch (e) {
        console.log('❌ Failed:', e.response?.status, e.response?.data);
      }
    }
    
    // Try form-encoded
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('username', 'admin');
    formData.append('password', 'admin');
    
    try {
      console.log('🔄 Trying form-encoded...');
      const response = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      console.log('✅ Form-encoded success:', response.data);
    } catch (e) {
      console.log('❌ Form-encoded failed:', e.response?.status, e.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Token test failed:', error.message);
  }
}

testTokenEndpoint();