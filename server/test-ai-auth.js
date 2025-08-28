const axios = require('axios');

const AI_MICROSERVICE_URL = 'http://localhost:8002';

async function testAIAuth() {
  try {
    console.log('🔍 Testing AI service authentication...');
    
    // Try to get a token first
    const authEndpoints = ['/auth', '/token', '/login', '/authenticate'];
    
    for (const endpoint of authEndpoints) {
      try {
        console.log(`🔄 Trying ${endpoint}...`);
        const response = await axios.post(`${AI_MICROSERVICE_URL}${endpoint}`, {
          username: 'admin',
          password: 'admin'
        });
        console.log(`✅ ${endpoint} works:`, response.data);
        
        // Try using the token
        if (response.data.access_token) {
          console.log('🔑 Got token, testing performance endpoint...');
          const perfResponse = await axios.post(`${AI_MICROSERVICE_URL}/performance`, {
            users: [{ role: 'GESTIONNAIRE' }]
          }, {
            headers: {
              'Authorization': `Bearer ${response.data.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('✅ Performance with token works:', perfResponse.data);
          return;
        }
        
      } catch (e) {
        console.log(`❌ ${endpoint} failed:`, e.response?.status);
      }
    }
    
    // Check if there's documentation endpoint
    try {
      const docsResponse = await axios.get(`${AI_MICROSERVICE_URL}/docs`);
      console.log('📚 Docs available at /docs');
    } catch (e) {
      console.log('❌ No docs endpoint');
    }
    
    // Check OpenAPI spec
    try {
      const openApiResponse = await axios.get(`${AI_MICROSERVICE_URL}/openapi.json`);
      console.log('📋 OpenAPI spec available');
      
      // Look for auth info in the spec
      const spec = openApiResponse.data;
      if (spec.components?.securitySchemes) {
        console.log('🔐 Security schemes found:', Object.keys(spec.components.securitySchemes));
      }
      
    } catch (e) {
      console.log('❌ No OpenAPI spec');
    }
    
  } catch (error) {
    console.error('❌ Auth test failed:', error.message);
  }
}

testAIAuth();