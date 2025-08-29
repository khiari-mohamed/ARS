const axios = require('axios');

const AI_URL = 'http://localhost:8002';

async function testRecommendations() {
  console.log('🔍 Testing AI recommendations endpoint...');
  
  try {
    // 1. Get authentication token
    console.log('1. Getting authentication token...');
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', 'admin');
    formData.append('password', 'secret');
    
    const tokenResponse = await axios.post(`${AI_URL}/token`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000
    });
    
    const token = tokenResponse.data.access_token;
    console.log('✅ Token obtained successfully');
    
    // 2. Test recommendations endpoint
    console.log('2. Testing recommendations endpoint...');
    const payload = {
      workload: [
        { teamId: 'team1', _count: { id: 15 } },
        { teamId: 'team2', _count: { id: 8 } },
        { teamId: 'team3', _count: { id: 12 } }
      ]
    };
    
    const recResponse = await axios.post(`${AI_URL}/recommendations`, payload, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('✅ Recommendations endpoint working!');
    console.log('📊 Response:', JSON.stringify(recResponse.data, null, 2));
    
    // 3. Test health endpoint
    console.log('3. Testing health endpoint...');
    const healthResponse = await axios.get(`${AI_URL}/health`, { timeout: 3000 });
    console.log('✅ Health check:', healthResponse.data.status);
    
    console.log('🎉 All AI endpoints are working correctly!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      console.log('🔒 Authentication issue detected');
    } else if (error.response?.status === 422) {
      console.log('📝 Request format issue detected');
    }
  }
}

testRecommendations();