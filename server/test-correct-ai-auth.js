const axios = require('axios');

const AI_MICROSERVICE_URL = 'http://localhost:8002';

async function testCorrectAuth() {
  try {
    console.log('🔍 Testing with correct AI service credentials...');
    
    const credentials = [
      { username: 'admin', password: 'secret' },
      { username: 'analyst', password: 'secret' }
    ];
    
    for (const cred of credentials) {
      try {
        console.log(`🔄 Testing ${cred.username}:${cred.password}...`);
        
        const formData = new URLSearchParams();
        formData.append('grant_type', 'password');
        formData.append('username', cred.username);
        formData.append('password', cred.password);
        
        const tokenResponse = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        console.log(`✅ Token obtained for ${cred.username}:`, tokenResponse.data);
        
        // Test performance endpoint
        const perfResponse = await axios.post(`${AI_MICROSERVICE_URL}/performance`, {
          users: [{ role: 'GESTIONNAIRE' }]
        }, {
          headers: {
            'Authorization': `Bearer ${tokenResponse.data.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ Performance endpoint works with ${cred.username}:`, perfResponse.data);
        return cred;
        
      } catch (e) {
        console.log(`❌ Failed with ${cred.username}: ${e.response?.status} - ${e.response?.data?.detail}`);
      }
    }
    
    console.log('❌ All credentials failed');
    return null;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

testCorrectAuth().then(result => {
  if (result) {
    console.log(`\n🎉 SUCCESS! Working credentials: ${result.username}:${result.password}`);
  } else {
    console.log('\n❌ Authentication still failing');
  }
});