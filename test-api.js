// Simple test to verify API endpoints
const axios = require('axios');

async function testGestionnaireAPI() {
  try {
    console.log('🧪 Testing Gestionnaire API endpoints...');
    
    // Test login first
    const loginResponse = await axios.post('http://localhost:3001/auth/login', {
      email: 'gestionnaire@test.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful, token received');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test global basket
    const globalBasketResponse = await axios.get('http://localhost:3001/workflow/gestionnaire/global-basket', { headers });
    console.log('✅ Global basket API working:', globalBasketResponse.data);
    
    // Test corbeille
    const corbeilleResponse = await axios.get('http://localhost:3001/workflow/gestionnaire/corbeille', { headers });
    console.log('✅ Corbeille API working:', corbeilleResponse.data);
    
    // Test search
    const searchResponse = await axios.get('http://localhost:3001/workflow/gestionnaire/search?q=BDX', { headers });
    console.log('✅ Search API working:', searchResponse.data);
    
    console.log('🎉 All APIs working correctly!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

testGestionnaireAPI();