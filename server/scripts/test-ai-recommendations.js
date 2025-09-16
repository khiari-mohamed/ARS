const axios = require('axios');

async function testAIRecommendations() {
  try {
    console.log('🔍 Testing AI recommendations endpoint...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'fresh@example.com',
      password: 'TestPass123!'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful, token obtained');
    
    // Test AI recommendations
    const response = await axios.get('http://localhost:5000/api/analytics/ai-recommendations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ AI Recommendations Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAIRecommendations();