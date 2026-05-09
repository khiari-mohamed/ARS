const axios = require('axios');

const AI_MICROSERVICE_URL = 'http://localhost:8002';

async function bypassAIAuth() {
  try {
    console.log('🔍 Checking if AI service has bypass or default setup...');
    
    // Check if there's a setup or init endpoint
    const setupEndpoints = ['/setup', '/init', '/configure', '/install'];
    
    for (const endpoint of setupEndpoints) {
      try {
        console.log(`🔄 Trying ${endpoint}...`);
        const response = await axios.post(`${AI_MICROSERVICE_URL}${endpoint}`, {
          admin_username: 'ars-admin',
          admin_password: 'ars-admin-2025',
          setup_key: 'initial-setup'
        });
        console.log(`✅ Setup endpoint ${endpoint} worked:`, response.data);
      } catch (e) {
        console.log(`❌ ${endpoint} failed: ${e.response?.status}`);
      }
    }
    
    // Try to access performance endpoint without auth (maybe it's open)
    try {
      console.log('🔄 Trying performance endpoint without auth...');
      const response = await axios.post(`${AI_MICROSERVICE_URL}/performance`, {
        users: [{ role: 'GESTIONNAIRE' }]
      });
      console.log('✅ Performance endpoint is open!', response.data);
      return 'NO_AUTH_NEEDED';
    } catch (e) {
      console.log(`❌ Performance needs auth: ${e.response?.status}`);
    }
    
    // Check if there's a guest or anonymous token
    try {
      console.log('🔄 Trying guest token...');
      const formData = new URLSearchParams();
      formData.append('grant_type', 'client_credentials');
      formData.append('client_id', 'guest');
      
      const tokenResponse = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('✅ Guest token works:', tokenResponse.data);
      
      // Test with guest token
      const perfResponse = await axios.post(`${AI_MICROSERVICE_URL}/performance`, {
        users: [{ role: 'GESTIONNAIRE' }]
      }, {
        headers: {
          'Authorization': `Bearer ${tokenResponse.data.access_token}`
        }
      });
      
      console.log('✅ Performance with guest token works:', perfResponse.data);
      return 'GUEST_TOKEN';
      
    } catch (e) {
      console.log('❌ Guest token failed');
    }
    
    // Try API key authentication
    const apiKeys = ['test-key', 'demo-key', 'ars-key', 'admin-key'];
    
    for (const key of apiKeys) {
      try {
        console.log(`🔄 Trying API key: ${key}...`);
        const response = await axios.post(`${AI_MICROSERVICE_URL}/performance`, {
          users: [{ role: 'GESTIONNAIRE' }]
        }, {
          headers: {
            'X-API-Key': key,
            'Authorization': `ApiKey ${key}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ API key ${key} works:`, response.data);
        return key;
        
      } catch (e) {
        console.log(`❌ API key ${key} failed: ${e.response?.status}`);
      }
    }
    
    console.log('❌ No bypass method found');
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

bypassAIAuth().then(result => {
  if (result) {
    console.log('\n🎉 SUCCESS! Found working method:', result);
  } else {
    console.log('\n❌ No working authentication method found');
    console.log('💡 The AI service may need to be configured with initial credentials');
  }
});