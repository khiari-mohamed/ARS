const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testChefDashboard() {
  console.log('🧪 Testing Chef d\'équipe Dashboard Endpoints...\n');

  try {
    // Test login first to get token
    console.log('🔐 Logging in as Chef d\'équipe...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'dedeo@mail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Login successful\n');

    // Test dashboard stats endpoint
    console.log('📊 Testing dashboard-stats endpoint...');
    const statsResponse = await axios.get(`${BASE_URL}/bordereaux/chef-equipe/dashboard-stats`, { headers });
    console.log('Stats Response:', JSON.stringify(statsResponse.data, null, 2));
    console.log('✅ Dashboard stats working\n');

    // Test dashboard dossiers endpoint
    console.log('📄 Testing dashboard-dossiers endpoint...');
    const dossiersResponse = await axios.get(`${BASE_URL}/bordereaux/chef-equipe/dashboard-dossiers`, { headers });
    console.log(`Dossiers count: ${dossiersResponse.data.length}`);
    if (dossiersResponse.data.length > 0) {
      console.log('Sample dossier:', JSON.stringify(dossiersResponse.data[0], null, 2));
    }
    console.log('✅ Dashboard dossiers working\n');

    // Test corbeille endpoint
    console.log('📥 Testing corbeille endpoint...');
    const corbeilleResponse = await axios.get(`${BASE_URL}/bordereaux/chef-equipe/corbeille`, { headers });
    console.log('Corbeille stats:', {
      nonAffectes: corbeilleResponse.data.stats.nonAffectes,
      enCours: corbeilleResponse.data.stats.enCours,
      traites: corbeilleResponse.data.stats.traites
    });
    console.log('✅ Corbeille working\n');

    console.log('🎉 All Chef d\'équipe dashboard endpoints are working with real data!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testChefDashboard();