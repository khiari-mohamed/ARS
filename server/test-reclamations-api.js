const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testReclamationsAPI() {
  try {
    console.log('🔍 Testing Reclamations API...\n');
    
    // Test 1: Get all reclamations
    console.log('📋 Testing GET /reclamations');
    try {
      const response = await axios.get(`${API_BASE_URL}/reclamations`, {
        headers: {
          'Authorization': 'Bearer test-token' // You might need a real token
        }
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Found ${response.data.length} reclamations`);
      
      if (response.data.length > 0) {
        const sample = response.data[0];
        console.log(`📝 Sample reclamation:`, {
          id: sample.id?.substring(0, 8) + '...',
          type: sample.type,
          status: sample.status,
          severity: sample.severity,
          client: sample.client?.name || 'No client'
        });
      }
      
    } catch (error) {
      console.log(`❌ GET /reclamations failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
    // Test 2: Get with filters
    console.log('\\n🔍 Testing GET /reclamations with filters');
    try {
      const response = await axios.get(`${API_BASE_URL}/reclamations?status=OPEN&take=5`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      console.log(`✅ Filtered results: ${response.data.length} open reclamations`);
      
    } catch (error) {
      console.log(`❌ Filtered request failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
    // Test 3: Check if server is running
    console.log('\\n🌐 Testing server health');
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      console.log(`✅ Server is healthy: ${response.status}`);
    } catch (error) {
      console.log(`❌ Server health check failed: ${error.code}`);
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 Make sure the backend server is running on port 3001');
        console.log('   Run: npm run start:dev in the server directory');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testReclamationsAPI();