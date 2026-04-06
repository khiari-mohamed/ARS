const axios = require('axios');

async function testCompleteScan() {
  const bordereauId = 'YOUR_BORDEREAU_ID_HERE'; // Replace with actual ID
  const token = 'YOUR_TOKEN_HERE'; // Replace with actual token
  
  try {
    console.log('🧪 Testing complete-scan endpoint...');
    console.log('Bordereau ID:', bordereauId);
    
    const response = await axios.post(
      `http://localhost:3000/bordereaux/${bordereauId}/complete-scan`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Response:', response.data);
    console.log('Status:', response.data.statut);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCompleteScan();
