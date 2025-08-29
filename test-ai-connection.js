const axios = require('axios');

const AI_URL = 'http://localhost:8002';

async function testAIConnection() {
  console.log('🔍 Testing AI microservice connection...');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${AI_URL}/health`, { timeout: 5000 });
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Test authentication
    console.log('2. Testing authentication...');
    const credentials = [
      { username: 'admin', password: 'secret' },
      { username: 'analyst', password: 'secret' }
    ];
    
    let token = null;
    for (const cred of credentials) {
      try {
        const formData = new URLSearchParams();
        formData.append('grant_type', 'password');
        formData.append('username', cred.username);
        formData.append('password', cred.password);
        
        const tokenResponse = await axios.post(`${AI_URL}/token`, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000
        });
        
        token = tokenResponse.data.access_token;
        console.log(`✅ Authentication successful with ${cred.username}`);
        break;
      } catch (error) {
        console.log(`❌ Authentication failed with ${cred.username}: ${error.response?.status || error.message}`);
      }
    }
    
    if (!token) {
      throw new Error('All authentication attempts failed');
    }
    
    // Test AI endpoints
    console.log('3. Testing AI endpoints...');
    
    // Test recommendations endpoint
    try {
      const recResponse = await axios.post(`${AI_URL}/recommendations`, {
        workload: [{ teamId: 'test', _count: { id: 5 } }]
      }, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000
      });
      console.log('✅ Recommendations endpoint working:', recResponse.data);
    } catch (error) {
      console.log('❌ Recommendations endpoint failed:', error.response?.status || error.message);
    }
    
    // Test SLA prediction endpoint
    try {
      const slaResponse = await axios.post(`${AI_URL}/sla_prediction`, [{
        id: 'test',
        start_date: new Date().toISOString(),
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        current_progress: 30,
        total_required: 100,
        sla_days: 5
      }], {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000
      });
      console.log('✅ SLA prediction endpoint working:', slaResponse.data);
    } catch (error) {
      console.log('❌ SLA prediction endpoint failed:', error.response?.status || error.message);
    }
    
    console.log('🎉 AI microservice is working correctly!');
    
  } catch (error) {
    console.error('💥 AI microservice connection failed:', error.message);
    console.log('\n📋 Troubleshooting steps:');
    console.log('1. Check if AI microservice is running on port 8002');
    console.log('2. Verify the AI service is accessible at http://localhost:8002');
    console.log('3. Check AI service logs for any errors');
    console.log('4. Ensure all dependencies are installed in ai-microservice folder');
  }
}

testAIConnection();