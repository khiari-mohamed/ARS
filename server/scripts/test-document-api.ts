import axios from 'axios';

async function testDocumentAPI() {
  console.log('🔍 Testing Document Types API...\n');
  
  try {
    const baseURL = 'http://localhost:3001/api';
    
    // Test types breakdown
    const typesResponse = await axios.get(`${baseURL}/analytics/documents/types-breakdown`);
    console.log('📊 Types Breakdown Response:');
    console.log(JSON.stringify(typesResponse.data, null, 2));
    
    const total = Object.values(typesResponse.data).reduce((sum: number, val: any) => sum + val, 0);
    console.log(`\n📈 Total Documents: ${total}`);
    
    // Test status by type
    const statusResponse = await axios.get(`${baseURL}/analytics/documents/status-by-type`);
    console.log('\n\n📊 Status By Type Response:');
    console.log(JSON.stringify(statusResponse.data, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testDocumentAPI();
