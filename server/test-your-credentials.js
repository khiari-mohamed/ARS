const axios = require('axios');

const AI_MICROSERVICE_URL = 'http://localhost:8002';

async function testYourCredentials() {
  try {
    console.log('🔍 Testing with your credentials...');
    
    const credentials = [
      { username: 'hsmir52311@gmail.com', password: 'Azertyuiop123@' },
      { username: 'hsmir52311', password: 'Azertyuiop123@' },
      { username: 'admin', password: 'Azertyuiop123@' }
    ];
    
    for (const cred of credentials) {
      try {
        console.log(`🔄 Trying ${cred.username}...`);
        
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
    
    console.log('❌ All credentials failed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testYourCredentials().then(result => {
  if (result) {
    console.log('🎉 Working credentials found:', result.username);
  }
});