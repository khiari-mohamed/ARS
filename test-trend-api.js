async function testTrendAPI() {
  try {
    console.log('🔍 Testing Reclamation Trend API...');
    
    const response = await fetch('http://localhost:3001/reclamations/trend', {
      headers: {
        'Authorization': 'Bearer demo-token'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    const data = await response.json();
    console.log('📊 Trend Data:', JSON.stringify(data, null, 2));
    console.log('📈 Data Length:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('✅ Trend data is available');
      data.forEach((item, index) => {
        console.log(`   ${index + 1}. Date: ${item.date}, Count: ${item.count}`);
      });
    } else {
      console.log('❌ No trend data returned');
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
  }
}

testTrendAPI();