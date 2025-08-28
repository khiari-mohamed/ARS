const axios = require('axios');

const AI_MICROSERVICE_URL = 'http://localhost:8002';

async function testCorrectPayload() {
  try {
    console.log('🔍 Testing with correct payload format...');
    
    // Get token first
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', 'admin');
    formData.append('password', 'secret');
    
    const tokenResponse = await axios.post(`${AI_MICROSERVICE_URL}/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('✅ Token obtained:', tokenResponse.data.access_token.substring(0, 20) + '...');
    
    // Test performance endpoint with correct format
    const correctPayload = {
      users: [
        { id: 'user-1', actual: 85, expected: 80 },
        { id: 'user-2', actual: 72, expected: 80 },
        { id: 'user-3', actual: 95, expected: 90 }
      ],
      period: 'current_month'
    };
    
    console.log('📤 Sending correct payload:', JSON.stringify(correctPayload, null, 2));
    
    const perfResponse = await axios.post(`${AI_MICROSERVICE_URL}/performance`, correctPayload, {
      headers: {
        'Authorization': `Bearer ${tokenResponse.data.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Performance endpoint success:', perfResponse.data);
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data);
    return false;
  }
}

testCorrectPayload().then(success => {
  if (success) {
    console.log('\n🎉 SUCCESS! AI service is working with correct payload format');
  } else {
    console.log('\n❌ Still having issues');
  }
});