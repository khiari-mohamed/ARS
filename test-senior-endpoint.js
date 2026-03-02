const axios = require('axios');

async function testSeniorEndpoint() {
  try {
    // First, login to get token
    console.log('🔐 Logging in as Gestionnaire Senior...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'cyrine.senior',
      password: 'azerty'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test the dashboard-dossiers endpoint
    console.log('\n📊 Testing /bordereaux/gestionnaire-senior/dashboard-dossiers...');
    const dossiersResponse = await axios.get(
      'http://localhost:5000/api/bordereaux/gestionnaire-senior/dashboard-dossiers',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Response received:');
    console.log('📦 Total items:', dossiersResponse.data.length);
    console.log('📦 First 3 items:', JSON.stringify(dossiersResponse.data.slice(0, 3), null, 2));
    
    // Test stats endpoint
    console.log('\n📊 Testing /bordereaux/gestionnaire-senior/dashboard-stats...');
    const statsResponse = await axios.get(
      'http://localhost:5000/api/bordereaux/gestionnaire-senior/dashboard-stats',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Stats received:', JSON.stringify(statsResponse.data, null, 2));
    
    // Test corbeille endpoint
    console.log('\n📊 Testing /bordereaux/gestionnaire-senior/corbeille...');
    const corbeilleResponse = await axios.get(
      'http://localhost:5000/api/bordereaux/gestionnaire-senior/corbeille',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Corbeille received:');
    console.log('En cours:', corbeilleResponse.data.enCours?.length || 0);
    console.log('Traités:', corbeilleResponse.data.traites?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSeniorEndpoint();
