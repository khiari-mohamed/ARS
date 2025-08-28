const axios = require('axios');

const AI_MICROSERVICE_URL = 'http://localhost:8002';

async function testPerformanceEndpoint() {
  try {
    console.log('🔍 Testing Performance endpoint...');
    
    const testPayload = {
      users: [{
        fromDate: '2025-01-01',
        toDate: '2025-01-31',
        teamId: 'team-1',
        userId: 'user-1',
        role: 'GESTIONNAIRE'
      }]
    };
    
    console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await axios.post(`${AI_MICROSERVICE_URL}/performance`, testPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Performance endpoint success:', response.status);
    console.log('📥 Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Performance endpoint error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Headers:', error.response?.headers);
    
    if (error.response?.status === 403) {
      console.log('💡 403 Forbidden - trying without auth...');
      
      // Try different approaches
      const approaches = [
        { headers: {} },
        { headers: { 'Authorization': 'Bearer test-token' } },
        { headers: { 'X-API-Key': 'test-key' } },
        { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
      ];
      
      for (const approach of approaches) {
        try {
          console.log('🔄 Trying with headers:', approach.headers);
          const testResponse = await axios.post(`${AI_MICROSERVICE_URL}/performance`, testPayload, {
            ...approach,
            timeout: 5000
          });
          console.log('✅ Success with approach:', approach.headers);
          console.log('Response:', testResponse.data);
          break;
        } catch (e) {
          console.log('❌ Failed with:', e.response?.status);
        }
      }
    }
  }
}

testPerformanceEndpoint();