const axios = require('axios');

const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002';

async function checkAIService() {
  try {
    console.log('🔍 Checking AI microservice at:', AI_MICROSERVICE_URL);
    
    // Test basic connection
    const response = await axios.get(`${AI_MICROSERVICE_URL}/health`, {
      timeout: 5000
    });
    
    console.log('✅ AI Service is running:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ AI Service Error:', error.code, error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 AI Service is not running. Start it with:');
      console.log('   cd ai-microservice && python -m uvicorn main:app --host 0.0.0.0 --port 8002');
    }
    
    // Test the performance endpoint specifically
    try {
      const testPayload = {
        users: [{
          fromDate: '2025-01-01',
          toDate: '2025-01-31',
          role: 'GESTIONNAIRE'
        }]
      };
      
      const perfResponse = await axios.post(`${AI_MICROSERVICE_URL}/performance`, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ai-service-token'
        },
        timeout: 5000
      });
      
      console.log('✅ Performance endpoint works:', perfResponse.status);
      
    } catch (perfError) {
      console.error('❌ Performance endpoint error:', perfError.response?.status, perfError.response?.data);
    }
  }
}

checkAIService();