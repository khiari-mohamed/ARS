const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TOKEN = 'your-jwt-token-here'; // Replace with actual token

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testChefDashboardAPIs() {
  console.log('🔍 Testing Chef d\'équipe Dashboard APIs...\n');

  const endpoints = [
    // Stats endpoints
    '/bordereaux/chef-equipe/dashboard-stats',
    '/bordereaux/chef-equipe/tableau-bord/stats',
    '/bordereaux/chef-equipe/tableau-bord/types-detail',
    
    // Data endpoints
    '/bordereaux/chef-equipe/tableau-bord',
    '/bordereaux/chef-equipe/tableau-bord/derniers-dossiers',
    '/bordereaux/chef-equipe/tableau-bord/dossiers-en-cours',
    '/bordereaux/chef-equipe/tableau-bord/documents-individuels',
    
    // Assignment endpoints
    '/bordereaux/chef-equipe/gestionnaire-assignments-dossiers',
    
    // Workflow endpoints
    '/workflow/chef-equipe/dashboard-stats',
    '/workflow/chef-equipe/corbeille'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);
      const response = await api.get(endpoint);
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Data structure:`, JSON.stringify(response.data, null, 2));
      console.log('─'.repeat(80));
      
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status || 'Network Error'}`);
      console.log(`💬 Message: ${error.response?.data?.message || error.message}`);
      console.log('─'.repeat(80));
    }
  }
}

// Run the test
testChefDashboardAPIs().catch(console.error);